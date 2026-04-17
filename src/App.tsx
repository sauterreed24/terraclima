import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Compass, Globe2, Layers, Library, Map, Search, Sparkles, Target, X } from "lucide-react";
import { AtlasMap } from "./components/AtlasMap";
import { PlaceCard } from "./components/PlaceCard";
import { FilterBar } from "./components/FilterBar";
import { PLACES, PLACES_BY_ID, PLACE_COUNTS } from "./data/places";
import { COLLECTION_BY_ID } from "./data/collections";
import { applyFilters, rankPlaces, type FilterState, type RankingProfile } from "./lib/scoring";
import { useUnits } from "./lib/units";
import type { MicroclimateArchetype } from "./types";

// Lazy-loaded secondary views and heavy panels. Keeping them out of the main
// bundle trims ~40 % off the initial JS parse, which is the single biggest
// win on memory-constrained hardware.
//
// We hold onto the raw `import()` factories as well as the `lazy()` wrappers
// so that we can warm them up during browser idle time — that way clicking a
// card / opening Compare after the app has settled feels instant rather than
// hitting a chunk-download delay on the first interaction.
const importPlaceDetail    = () => import("./components/PlaceDetail");
const importCompareView    = () => import("./components/CompareView");
const importCollectionsView = () => import("./components/CollectionsView");
const importLearnMode      = () => import("./components/LearnMode");

const PlaceDetail = lazy(() => importPlaceDetail().then(m => ({ default: m.PlaceDetail })));
const CompareView = lazy(() => importCompareView().then(m => ({ default: m.CompareView })));
const CollectionsView = lazy(() => importCollectionsView().then(m => ({ default: m.CollectionsView })));
const LearnMode = lazy(() => importLearnMode().then(m => ({ default: m.LearnMode })));

/**
 * Warm up the lazy chunks during the browser's idle time. This fires once
 * on app mount, ~1–2 seconds after the main thread settles, so the initial
 * first-paint isn't penalised but subsequent interactions (clicking a card,
 * opening Compare, visiting Collections / Learn) are instant.
 *
 * Safe to call repeatedly — module imports are cached by the bundler.
 */
function scheduleIdlePrefetch(): void {
  const ric = (cb: () => void) => {
    const anyWin = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof anyWin.requestIdleCallback === "function") {
      anyWin.requestIdleCallback(cb, { timeout: 2500 });
    } else {
      setTimeout(cb, 1200);
    }
  };
  ric(() => {
    void importPlaceDetail();
    void importCollectionsView();
    // Defer the heaviest (LearnMode + CompareView pull in extra charts) to a
    // second idle slice so we never block.
    ric(() => {
      void importCompareView();
      void importLearnMode();
    });
  });
}

type View = "explorer" | "collections" | "learn";

export default function App() {
  const [view, setView] = useState<View>("explorer");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ countries: new Set(), archetypes: new Set(), search: "" });
  const [ranking, setRanking] = useState<RankingProfile>("hidden-gems");
  // Track whether each heavy lazy panel has ever been opened. Once opened we
  // keep it mounted so its internal AnimatePresence can play the exit
  // animation (unmounting kills the animation). Before first open we skip
  // it entirely so the lazy chunk never downloads.
  const [detailEverOpened, setDetailEverOpened] = useState(false);
  const [compareEverOpened, setCompareEverOpened] = useState(false);

  // Prefetch lazy chunks during idle time so first click / navigation is
  // instant. This runs exactly once and is a no-op after the chunks are
  // cached.
  useEffect(() => { scheduleIdlePrefetch(); }, []);

  const pool = useMemo(() => {
    if (activeCollection) {
      const c = COLLECTION_BY_ID[activeCollection];
      if (c) return c.placeIds.map(id => PLACES_BY_ID[id]).filter(Boolean);
    }
    return PLACES;
  }, [activeCollection]);

  // Defer the filter object so typing in the search box stays responsive
  // even while the list/map recompute. React yields the heavy filter+rank
  // work to a lower priority, which is exactly what we want on low-spec
  // hardware.
  const deferredFilters = useDeferredValue(filters);
  const filtered = useMemo(() => applyFilters(pool, deferredFilters), [pool, deferredFilters]);
  const ranked = useMemo(() => rankPlaces(ranking, filtered), [ranking, filtered]);

  const selectedPlace = selectedId ? PLACES_BY_ID[selectedId] ?? null : null;

  // Callbacks are stabilised with useCallback so memoized children (TopBar,
  // HeroCard, FootprintPanel, Footer) do not re-render on unrelated state
  // changes — notably every keystroke in the search box.
  const toggleCompare = useCallback((id: string) => {
    setCompareIds(s => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      if (ns.size > 4) {
        const arr = [...ns];
        return new Set(arr.slice(arr.length - 4));
      }
      return ns;
    });
  }, []);

  const openPlace = useCallback((id: string) => {
    setSelectedId(id);
    setDetailEverOpened(true);
  }, []);

  const openCompare = useCallback(() => {
    setCompareOpen(true);
    setCompareEverOpened(true);
  }, []);

  const pickArchetype = useCallback((a: MicroclimateArchetype) => {
    setFilters(f => ({ ...f, archetypes: new Set([a]) }));
    setActiveCollection(null);
    setView("explorer");
  }, []);

  const clearCollection = useCallback(() => setActiveCollection(null), []);
  const clearArchetypes = useCallback(() => setFilters(f => ({ ...f, archetypes: new Set() })), []);
  const closeDetail = useCallback(() => setSelectedId(null), []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);
  const onOpenPlaceFromSubview = useCallback((id: string) => { openPlace(id); setView("explorer"); }, [openPlace]);
  const onPickCollection = useCallback((id: string) => {
    setActiveCollection(a => a === id ? null : id);
    setView("explorer");
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-ice">
      <TopBar view={view} setView={setView} onOpenCompare={openCompare} compareCount={compareIds.size} />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] w-full mx-auto">
        {/* View transition: instead of AnimatePresence (which drags in the
            ~36 kB gz framer-motion runtime), we re-key the container and
            rely on a CSS-only fade-in. The browser handles the animation on
            the compositor, so view switches cost zero React work beyond the
            normal unmount/mount of the branch. */}
        <div key={view} className="view-enter flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
          {view === "explorer" && (
            <>
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <HeroCard
                  count={ranked.length}
                  activeCollection={activeCollection}
                  onClearCollection={clearCollection}
                  activeArchetypes={filters.archetypes}
                  onClearArchetypes={clearArchetypes}
                />

                <div className="h-[52vh] min-h-[460px] relative">
                  <AtlasMap
                    places={filtered}
                    selectedId={selectedId ?? undefined}
                    onSelect={openPlace}
                  />
                  <MapLegend />
                </div>

                <div className="panel-thin p-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-stone">
                    Showing <span className="font-mono-num text-frost">{ranked.length}</span> of <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> places · ranked by <span className="text-frost">{ranking.replace(/-/g, " ")}</span>
                  </div>
                  <div className="text-xs text-stone hidden md:flex items-center gap-3">
                    <span><span className="kbd">scroll</span> to zoom map</span>
                    <span><span className="kbd">click</span> a dot or card</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ranked.slice(0, 40).map(r => (
                    <PlaceCard
                      key={r.place.id}
                      place={r.place}
                      selected={r.place.id === selectedId}
                      note={r.note}
                      onClick={() => openPlace(r.place.id)}
                      onCompareToggle={() => toggleCompare(r.place.id)}
                      inCompare={compareIds.has(r.place.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="lg:w-[340px] lg:shrink-0 flex flex-col gap-4">
                <FilterBar filters={filters} setFilters={setFilters} ranking={ranking} setRanking={setRanking} />
                <FootprintPanel />
              </div>
            </>
          )}

          {view === "collections" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider text-stone">Curated</div>
                  <h2 className="font-atlas text-3xl text-ice">Collections</h2>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    Hand-assembled thematic bundles — the rain shadows, the sky islands, the eternal springs. Pin a collection to constrain the explorer map to just those places.
                  </p>
                </div>
                <Suspense fallback={<LazyFallback />}>
                  <CollectionsView
                    onOpenPlace={onOpenPlaceFromSubview}
                    onPick={onPickCollection}
                    activeId={activeCollection ?? undefined}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {view === "learn" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider text-stone">Learn</div>
                  <h2 className="font-atlas text-3xl text-ice">Field guide</h2>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    The vocabulary of microclimate — concepts like lapse rate, cold-air pooling, orographic lift, and thermal belts — gives you the language to read a landscape and understand why the weather there is the way it is.
                  </p>
                </div>
                <Suspense fallback={<LazyFallback />}>
                  <LearnMode onOpenPlace={onOpenPlaceFromSubview} />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Heavy panels load on first open, then stay mounted so their internal
          AnimatePresence can play the exit animation on close. The chunks
          themselves never download until the user interacts. */}
      {detailEverOpened && (
        <Suspense fallback={null}>
          <PlaceDetail
            place={selectedPlace}
            onClose={closeDetail}
            onCompareToggle={toggleCompare}
            inCompareIds={compareIds}
            onPickArchetype={pickArchetype}
            onOpenPlace={openPlace}
          />
        </Suspense>
      )}
      {compareEverOpened && (
        <Suspense fallback={null}>
          <CompareView
            places={[...compareIds].map(id => PLACES_BY_ID[id]).filter(Boolean)}
            open={compareOpen}
            onClose={closeCompare}
            onRemove={toggleCompare}
          />
        </Suspense>
      )}
    </div>
  );
}

function LazyFallback() {
  return (
    <div className="panel p-6 text-sm text-stone text-center anim-fade-in">
      Loading…
    </div>
  );
}

const TopBar = memo(function TopBar({ view, setView, onOpenCompare, compareCount }: { view: View; setView: (v: View) => void; onOpenCompare: () => void; compareCount: number }) {
  const { temp, toggle } = useUnits();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[rgba(13,20,32,0.78)] border-b border-[rgba(71,90,122,0.5)]">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <div className="font-atlas text-lg text-ice leading-none">Terraclima</div>
            <div className="text-[11px] text-stone tracking-wide">North American Microclimate Atlas</div>
          </div>
        </div>

        <nav className="flex items-center gap-1.5">
          <NavBtn active={view === "explorer"} onClick={() => setView("explorer")} icon={<Map className="w-3.5 h-3.5" />} label="Explorer" />
          <NavBtn active={view === "collections"} onClick={() => setView("collections")} icon={<Library className="w-3.5 h-3.5" />} label="Collections" />
          <NavBtn active={view === "learn"} onClick={() => setView("learn")} icon={<Compass className="w-3.5 h-3.5" />} label="Learn" />

          <div className="ml-1 inline-flex rounded-lg border border-[rgba(71,90,122,0.6)] overflow-hidden" role="group" aria-label="Temperature unit">
            <button
              onClick={() => temp === "C" && toggle()}
              className={`px-2.5 py-1.5 text-xs font-mono-num transition-colors ${temp === "F" ? "bg-[rgba(79,170,205,0.22)] text-ice" : "text-stone hover:text-ice"}`}
              aria-pressed={temp === "F"}
              title="Use Fahrenheit"
            >°F</button>
            <button
              onClick={() => temp === "F" && toggle()}
              className={`px-2.5 py-1.5 text-xs font-mono-num transition-colors border-l border-[rgba(71,90,122,0.6)] ${temp === "C" ? "bg-[rgba(79,170,205,0.22)] text-ice" : "text-stone hover:text-ice"}`}
              aria-pressed={temp === "C"}
              title="Use Celsius"
            >°C</button>
          </div>

          {compareCount > 0 && (
            <button onClick={onOpenCompare} className="btn-primary !text-xs !py-1.5">
              <Target className="w-3.5 h-3.5" /> Compare · {compareCount}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
});

const NavBtn = memo(function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`btn-ghost !text-xs ${active ? "!border-[rgba(140,200,224,0.7)] !text-ice bg-[rgba(79,170,205,0.18)]" : ""}`}
    >
      {icon} {label}
    </button>
  );
});

function LogoMark() {
  return (
    <svg viewBox="0 0 64 64" width="36" height="36">
      <defs>
        <radialGradient id="logoGlow" cx="50%" cy="35%" r="60%">
          <stop offset="0" stopColor="#1f2c44" />
          <stop offset="1" stopColor="#0d1420" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#logoGlow)" stroke="rgba(140,200,224,0.25)" />
      <path d="M6 44 Q16 28 24 32 T40 26 T60 20" fill="none" stroke="#8cc8e0" strokeWidth="2.5" />
      <path d="M6 50 Q16 36 24 40 T40 34 T60 28" fill="none" stroke="#c6dcbd" strokeWidth="1.8" opacity="0.9" />
      <path d="M6 56 Q16 44 24 48 T40 42 T60 36" fill="none" stroke="#f0d29c" strokeWidth="1.3" opacity="0.85" />
      <circle cx="32" cy="22" r="3.2" fill="#f0d29c" />
    </svg>
  );
}

const HeroCard = memo(function HeroCard({
  count, activeCollection, onClearCollection, activeArchetypes, onClearArchetypes,
}: {
  count: number;
  activeCollection: string | null;
  onClearCollection: () => void;
  activeArchetypes: Set<MicroclimateArchetype>;
  onClearArchetypes: () => void;
}) {
  const active = activeCollection ? COLLECTION_BY_ID[activeCollection] : null;
  return (
    <div className="panel p-5 anim-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />
            <span className="text-xs uppercase tracking-wider text-stone">
              {active ? "Collection pinned" : activeArchetypes.size > 0 ? `Filtered by ${activeArchetypes.size} archetype${activeArchetypes.size > 1 ? "s" : ""}` : "Explorer"}
            </span>
            {active && (
              <button onClick={onClearCollection} className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice">
                <X className="w-3 h-3" /> Clear collection
              </button>
            )}
            {!active && activeArchetypes.size > 0 && (
              <button onClick={onClearArchetypes} className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice">
                <X className="w-3 h-3" /> Clear archetypes
              </button>
            )}
          </div>
          <h1 className="font-atlas text-2xl md:text-3xl text-ice leading-tight">
            {active ? active.title : "Scout the continent, one microclimate at a time"}
          </h1>
          <p className="text-sm text-frost mt-1 max-w-2xl leading-relaxed">
            {active
              ? active.description
              : "Find rain shadows, sky islands, cool-summer coasts, eternal-spring highlands, orchard valleys, chinook corridors, and more — with the mechanisms that shape each place made explicit."}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-right">
          <Metric label="In view" value={count.toString()} />
          <Metric label="Atlas total" value={PLACE_COUNTS.total.toString()} />
          <Metric label="Flagships" value={PLACE_COUNTS.tierA.toString()} />
        </div>
      </div>
    </div>
  );
});

const Metric = memo(function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase tracking-wider text-stone">{label}</span>
      <span className="font-mono-num text-xl text-ice">{value}</span>
    </div>
  );
});

const MapLegend = memo(function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 panel-thin px-3 py-2 text-[11px] text-stone backdrop-blur-md">
      <div className="flex items-center gap-3 flex-wrap">
        <LegendDot color="#f0d29c" label="Orographic / orchard / chinook" />
        <LegendDot color="#c6dcbd" label="Highland / sky-island / cloud" />
        <LegendDot color="#8cc8e0" label="Maritime / fog / rain-shadow" />
        <LegendDot color="#c7b5ea" label="Rare / sky-island / aurora" />
      </div>
    </div>
  );
});

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}

const FootprintPanel = memo(function FootprintPanel() {
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Globe2 className="w-4 h-4" style={{ color: "#c6dcbd" }} />
        <h3 className="font-atlas text-base text-ice">Corpus at a glance</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBlock label="USA" value={PLACE_COUNTS.usa} />
        <StatBlock label="Canada" value={PLACE_COUNTS.canada} />
        <StatBlock label="Mexico" value={PLACE_COUNTS.mexico} />
      </div>
      <div className="divider-contour" />
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBlock label="Flagship" value={PLACE_COUNTS.tierA} />
        <StatBlock label="Spotlight" value={PLACE_COUNTS.tierB} />
        <StatBlock label="Index" value={PLACE_COUNTS.tierC} />
      </div>
      <p className="text-xs text-stone leading-relaxed">
        Flagship places carry deep narrative and risk/climate-change briefs. Spotlight places are structured for real comparison. The index tier is designed to scale to hundreds — the schema and charts already support it.
      </p>
    </div>
  );
});

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-thin p-2">
      <div className="font-mono-num text-xl text-ice">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-stone">{label}</div>
    </div>
  );
}

const Footer = memo(function Footer() {
  return (
    <footer className="mt-10 border-t border-[rgba(71,90,122,0.5)] bg-[rgba(13,20,32,0.7)]">
      <div className="max-w-[1600px] mx-auto px-6 py-6 text-xs text-stone flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-3.5 h-3.5" />
          <span>
            Terraclima is a research-grade exploration tool. Climate values draw on NOAA / PRISM / ECCC / SMN normals (1991–2020 where available) and WorldClim downscaling. Soil notes use SoilGrids plus regional references. All scores reflect methodology documented per-place; sparse data are labeled.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Search className="w-3.5 h-3.5" />
          <span>Seeded dataset · {PLACE_COUNTS.total} places · structured to scale</span>
        </div>
      </div>
    </footer>
  );
});
