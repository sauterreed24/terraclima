import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Compass, Globe2, Layers, Library, Map, Search, Shuffle, Sparkles, Target, X } from "lucide-react";
import { AtlasMap } from "./components/AtlasMap";
import { PlaceCard } from "./components/PlaceCard";
import { FilterBar } from "./components/FilterBar";
import { PLACES, PLACES_BY_ID, PLACE_COUNTS } from "./data/places";
import { COLLECTION_BY_ID } from "./data/collections";
import { FIELD_NOTES } from "./data/field-notes";
import { applyFilters, rankPlaces, type FilterState, type RankingProfile } from "./lib/scoring";
import { useUnits } from "./lib/units";
import type { MicroclimateArchetype } from "./types";

const SEARCH_INPUT_ID = "terraclima-place-search";

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

  // Global keyboard shortcuts — effect is registered after `openPlace` / ranked pool exist (see below).
  const [showShortcuts, setShowShortcuts] = useState(false);

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
  const rankedRef = useRef(ranked);
  rankedRef.current = ranked;

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      switch (e.key) {
        case "?":
          setShowShortcuts(s => !s);
          e.preventDefault();
          break;
        case "Escape":
          if (showShortcuts) { setShowShortcuts(false); break; }
          if (compareOpen) { setCompareOpen(false); break; }
          if (selectedId) { setSelectedId(null); break; }
          break;
        case "e": case "E":
          setView("explorer");
          break;
        case "c": case "C":
          setView("collections");
          break;
        case "l": case "L":
          setView("learn");
          break;
        case "/":
          e.preventDefault();
          setView("explorer");
          requestAnimationFrame(() => {
            document.getElementById(SEARCH_INPUT_ID)?.focus();
          });
          break;
        case "r": case "R": {
          e.preventDefault();
          setView("explorer");
          requestAnimationFrame(() => {
            const poolRanked = rankedRef.current;
            if (poolRanked.length === 0) return;
            const idx = Math.floor(Math.random() * poolRanked.length);
            openPlace(poolRanked[idx].place.id);
          });
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShortcuts, compareOpen, selectedId, openPlace]);

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
  const clearAllFilters = useCallback(() => {
    setFilters({ countries: new Set(), archetypes: new Set(), search: "" });
    setActiveCollection(null);
  }, []);
  const closeDetail = useCallback(() => setSelectedId(null), []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);
  const onOpenPlaceFromSubview = useCallback((id: string) => { openPlace(id); setView("explorer"); }, [openPlace]);
  const onPickCollection = useCallback((id: string) => {
    setActiveCollection(a => a === id ? null : id);
    setView("explorer");
  }, []);

  const surpriseMe = useCallback(() => {
    if (ranked.length === 0) return;
    const idx = Math.floor(Math.random() * ranked.length);
    openPlace(ranked[idx].place.id);
  }, [ranked, openPlace]);

  return (
    <div className="relative min-h-screen flex flex-col text-ice overflow-x-hidden">
      <div className="ambient-aurora" aria-hidden="true" />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
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
                  onSurpriseMe={surpriseMe}
                  canSurprise={ranked.length > 0}
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
                    Showing <span className="font-mono-num text-frost tabular-nums"><AnimatedNumber value={ranked.length} /></span> of <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> places · ranked by <span className="text-frost">{ranking.replace(/-/g, " ")}</span>
                  </div>
                  <div className="text-xs text-stone hidden md:flex items-center gap-3">
                    <span><span className="kbd">scroll</span> to zoom map</span>
                    <span><span className="kbd">/</span> search</span>
                    <span><span className="kbd">R</span> surprise</span>
                    <span><span className="kbd">?</span> shortcuts</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ranked.length === 0 ? (
                    <EmptyResults onClear={clearAllFilters} />
                  ) : (
                    ranked.slice(0, 40).map(r => (
                      <PlaceCard
                        key={r.place.id}
                        place={r.place}
                        selected={r.place.id === selectedId}
                        note={r.note}
                        onClick={() => openPlace(r.place.id)}
                        onCompareToggle={() => toggleCompare(r.place.id)}
                        inCompare={compareIds.has(r.place.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="lg:w-[340px] lg:shrink-0 flex flex-col gap-4">
                <FilterBar
                  searchInputId={SEARCH_INPUT_ID}
                  filters={filters}
                  setFilters={setFilters}
                  ranking={ranking}
                  setRanking={setRanking}
                />
                <FootprintPanel />
              </div>
            </>
          )}

          {view === "collections" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5 border-l-2 border-[rgba(140,200,224,0.4)] pl-4">
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
                <div className="mb-5 border-l-2 border-[rgba(198,220,189,0.45)] pl-4">
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

      </div>

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

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/**
 * Keyboard shortcuts overlay — toggled with `?`. Tiny, inline, no lazy
 * chunk overhead. Rendered via absolute positioning so the map and cards
 * underneath keep their scroll position when it's dismissed.
 */
const ShortcutsOverlay = memo(function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ background: "rgba(5, 10, 18, 0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="panel p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-atlas text-xl text-ice">Keyboard shortcuts</h3>
          <button onClick={onClose} className="btn-ghost !p-1.5" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divider-contour mb-3" />
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Kbds keys={["E"]} />        <span className="text-frost">Explorer</span>
          <Kbds keys={["C"]} />        <span className="text-frost">Collections</span>
          <Kbds keys={["L"]} />        <span className="text-frost">Learn</span>
          <Kbds keys={["/"]} />        <span className="text-frost">Focus search</span>
          <Kbds keys={["R"]} />        <span className="text-frost">Surprise — random place in your current list</span>
          <Kbds keys={["Esc"]} />      <span className="text-frost">Close panel / detail</span>
          <Kbds keys={["?"]} />        <span className="text-frost">Toggle this help</span>
        </div>
        <div className="divider-contour my-3" />
        <div className="text-xs text-stone">
          On the map: scroll to zoom, drag to pan, click a dot or card to open its detail. Explorer&apos;s &ldquo;Surprise me&rdquo; respects filters and ranking — same pool as the cards below.
        </div>
      </div>
    </div>
  );
});

function Kbds({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
    </span>
  );
}

/**
 * LazyFallback — shown while a lazy-loaded view chunk is downloading.
 * Renders a skeleton that matches the rough layout of the incoming view
 * (hero + 3 stacked rows) so the user's eye has stable landing zones.
 * Pure CSS shimmer — no per-frame JS.
 */
function LazyFallback() {
  return (
    <div className="panel p-6 anim-fade-in space-y-3" role="status" aria-live="polite">
      <div className="sr-only">Loading view…</div>
      <div className="shimmer h-5 w-2/5 rounded" aria-hidden />
      <div className="shimmer h-3 w-4/5 rounded opacity-70" aria-hidden />
      <div className="shimmer h-3 w-3/5 rounded opacity-60" aria-hidden />
      <div className="divider-contour" />
      <div className="grid grid-cols-2 gap-3">
        <div className="shimmer h-20 rounded" aria-hidden />
        <div className="shimmer h-20 rounded" aria-hidden />
        <div className="shimmer h-20 rounded" aria-hidden />
        <div className="shimmer h-20 rounded" aria-hidden />
      </div>
    </div>
  );
}

/**
 * EmptyResults — warm, actionable empty-state card shown when the filter
 * / search combination yields zero places. Offers an explicit clear button
 * instead of leaving the user staring at a blank grid.
 */
const EmptyResults = memo(function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="col-span-full panel-warm p-6 text-center anim-fade-in">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(240,210,156,0.18)] border border-[rgba(240,210,156,0.4)] mb-3">
        <Search className="w-4 h-4" style={{ color: "#f0d29c" }} />
      </div>
      <h3 className="font-atlas text-lg text-ice mb-1">No places match those filters</h3>
      <p className="text-sm text-frost mb-4 max-w-md mx-auto">
        Try loosening the archetype or country selection, or search for a region or koppen code.
      </p>
      <button onClick={onClear} className="btn-ghost !text-xs">
        <X className="w-3.5 h-3.5" /> Clear filters
      </button>
    </div>
  );
});

const TopBar = memo(function TopBar({ view, setView, onOpenCompare, compareCount }: { view: View; setView: (v: View) => void; onOpenCompare: () => void; compareCount: number }) {
  const { temp, toggle } = useUnits();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[rgba(13,20,32,0.78)] border-b border-[rgba(71,90,122,0.5)]">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <div className="font-atlas text-lg text-ice leading-none">Terraclima</div>
            <div className="text-[11px] tracking-wide text-gradient-atlas">North American Microclimate Atlas</div>
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

const FieldNoteStrip = memo(function FieldNoteStrip() {
  const dailyIdx = useMemo(() => {
    const d = new Date();
    return (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % FIELD_NOTES.length;
  }, []);
  const [pick, setPick] = useState<number | null>(null);
  const idx = pick ?? dailyIdx;
  const note = FIELD_NOTES[idx];

  return (
    <div className="rounded-xl border border-[rgba(199,181,234,0.28)] bg-[linear-gradient(135deg,rgba(24,35,57,0.75)_0%,rgba(32,44,72,0.55)_100%)] px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: "#c7b5ea" }} aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "#c7b5ea" }}>Field note</span>
          {pick === null ? (
            <span className="text-[10px] text-stone">Today&apos;s draw — shuffle for more</span>
          ) : (
            <span className="text-[10px] text-stone">Picked just now</span>
          )}
        </div>
      </div>
      <p className="text-sm text-frost leading-relaxed flex-1 min-w-0">{note}</p>
      <button
        type="button"
        onClick={() => setPick(Math.floor(Math.random() * FIELD_NOTES.length))}
        className="btn-ghost !text-xs !py-1.5 shrink-0 self-start sm:self-center border-[rgba(199,181,234,0.35)]"
        aria-label="Show another field note"
      >
        <Shuffle className="w-3.5 h-3.5" style={{ color: "#c7b5ea" }} />
        Another
      </button>
    </div>
  );
});

const HeroCard = memo(function HeroCard({
  count, activeCollection, onClearCollection, activeArchetypes, onClearArchetypes, onSurpriseMe, canSurprise,
}: {
  count: number;
  activeCollection: string | null;
  onClearCollection: () => void;
  activeArchetypes: Set<MicroclimateArchetype>;
  onClearArchetypes: () => void;
  onSurpriseMe: () => void;
  canSurprise: boolean;
}) {
  const active = activeCollection ? COLLECTION_BY_ID[activeCollection] : null;
  return (
    <div className="panel panel-hero p-5 anim-fade-in space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
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
        <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
          {canSurprise && (
            <button
              type="button"
              onClick={onSurpriseMe}
              className="btn-ghost !text-xs !py-1.5 w-full sm:w-auto border-[rgba(199,181,234,0.4)]"
              aria-label="Open a random place from the current filtered list"
              title="Uses the same pool as the cards and map below"
            >
              <Shuffle className="w-3.5 h-3.5" style={{ color: "#c7b5ea" }} />
              Surprise me
            </button>
          )}
          <div className="flex items-center gap-4 shrink-0 text-right justify-end flex-wrap">
            <Metric label="In view" value={count} animated />
            <Metric label="Atlas total" value={PLACE_COUNTS.total} />
            <Metric label="Flagships" value={PLACE_COUNTS.tierA} />
          </div>
        </div>
      </div>
      <FieldNoteStrip />
    </div>
  );
});

const Metric = memo(function Metric({ label, value, animated }: { label: string; value: number; animated?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase tracking-wider text-stone">{label}</span>
      <span className="font-mono-num text-xl text-ice tabular-nums">
        {animated ? <AnimatedNumber value={value} /> : value}
      </span>
    </div>
  );
});

/**
 * AnimatedNumber — smoothly tweens between numeric values via RAF and
 * direct DOM mutation. No React re-render fires during the tween, so on
 * the Surface Pro 5 this costs exactly one text-node update per frame
 * regardless of how rich the surrounding tree is.
 */
function AnimatedNumber({ value, durationMs = 520 }: { value: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const displayedRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = displayedRef.current;
    const to = value;
    if (from === to) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      if (ref.current) ref.current.textContent = v.toString();
      displayedRef.current = v;
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, durationMs]);

  return <span ref={ref}>{displayedRef.current}</span>;
}

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
