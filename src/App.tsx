import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, Compass, HelpCircle, Layers, Library, Map, Menu, Search, Shuffle, Sparkles, Target, X } from "lucide-react";
import { AtlasMap } from "./components/AtlasMap";
import { VirtualPlaceGrid } from "./components/VirtualPlaceGrid";
import { ExplorerFilterSheet, type ExplorerFilterSheetHandle } from "./components/ExplorerFilterSheet";
import { FilterBar, RANKING_OPTIONS } from "./components/FilterBar";
import { FootprintPanel } from "./components/FootprintPanel";
import { TempToggle } from "./components/TempToggle";
import { PlaceDetail } from "./components/PlaceDetail";
import { CompareView } from "./components/CompareView";
import { CollectionsView } from "./components/CollectionsView";
import { LearnMode } from "./components/LearnMode";
import { useFocusTrap } from "./hooks/use-focus-trap";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useMediaQuery } from "./hooks/use-media-query";
import { PLACES, PLACES_BY_ID, PLACE_COUNTS } from "./data/places";
import { COLLECTION_BY_ID } from "./data/collections";
import { ARCHETYPE_BY_ID } from "./data/archetypes";
import { FIELD_NOTES } from "./data/field-notes";
import { applyFilters, rankLivabilityPreview, rankPlaces, LIVABILITY_WEIGHTS, type FilterState, type RankingProfile, type RankingResult } from "./lib/scoring";
import { resonantWindowFor } from "./lib/best-months";
import { ATLAS_EDITORIAL_SNAPSHOT, CLIMATE_NORMALS_PERIOD } from "./lib/atlas-metadata";
import { prefersReducedMotion, useRichVisualEffects } from "./lib/device-profile";
import { useProse } from "./lib/units";
import {
  loadPersistedRanking,
  persistRankingProfile,
} from "./lib/app-ranking-preference";
import {
  type AppHistoryState,
  COMPARE_LIMIT,
  formatAppRelativeUrl,
  pushAppUrl,
  readInitialAppState,
  replaceAppUrl,
  validatedStateFromSearch,
} from "./lib/app-url";
import type { Country, MicroclimateArchetype, Place } from "./types";

const SEARCH_INPUT_ID = "terraclima-place-search";
const SHORTCUTS_SEEN_KEY = "terraclima.shortcuts-seen.v1";
const DOC_TITLE_BASE = "Terraclima — North American Microclimate Atlas";

function placeForId(id: string): Place | undefined {
  return PLACES_BY_ID[id];
}

function isPlace(p: Place | undefined): p is Place {
  return p != null;
}

const URL_INIT = readInitialAppState(
  PLACES_BY_ID,
  COLLECTION_BY_ID,
  ARCHETYPE_BY_ID,
);

type View = "explorer" | "collections" | "learn";

export default function App() {
  const richVisualEffects = useRichVisualEffects();
  useEffect(() => {
    document.documentElement.classList.toggle("tc-low-power", !richVisualEffects);
    return () => document.documentElement.classList.remove("tc-low-power");
  }, [richVisualEffects]);

  const [view, setView] = useState<View>(URL_INIT.view);
  const [selectedId, setSelectedId] = useState<string | null>(URL_INIT.placeId);
  const [compareIds, setCompareIds] = useState<Set<string>>(() => new Set(URL_INIT.compareIds));
  const [compareOpen, setCompareOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(URL_INIT.collectionId);
  const [filters, setFilters] = useState<FilterState>(() => ({
    countries: new Set<string>(URL_INIT.countries),
    archetypes: new Set<MicroclimateArchetype>(URL_INIT.archetypes),
    search: URL_INIT.search,
  }));
  const [ranking, setRankingRaw] = useState<RankingProfile>(loadPersistedRanking);
  /** One-shot transient feedback for actions like pressing R on an empty pool or hitting the compare cap. */
  const [transientFeedback, setTransientFeedback] = useState<string | null>(null);
  /** Latest place id to be auto-evicted from compare so the feedback can name it. */
  const [evictedComparePlaceId, setEvictedComparePlaceId] = useState<string | null>(null);
  /** Hide the "?" first-run pulse once the user has seen / opened it. */
  const [shortcutsSeen, setShortcutsSeen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return Boolean(window.localStorage.getItem(SHORTCUTS_SEEN_KEY));
    } catch { return false; }
  });
  const setRanking = useCallback((profile: RankingProfile) => {
    setRankingRaw(profile);
    persistRankingProfile(profile);
  }, []);
  const prevPlaceIdRef = useRef<string | null>(URL_INIT.placeId);
  /**
   * First-paint URL sync flag. A useRef instead of a module-level mutable
   * so the contract is explicit and there's no shared mutable state across
   * a hypothetical second App instance. StrictMode dev double-mount may run
   * the initial replaceAppUrl twice, but replaceAppUrl is idempotent for the
   * same target URL so the user-visible behaviour matches.
   */
  const initialUrlSyncDoneRef = useRef(false);
  const explorerDockLg = useMediaQuery("(min-width: 1024px)");
  const explorerFilterSheetRef = useRef<ExplorerFilterSheetHandle | null>(null);
  /** Reference to the trigger that opened the place detail, so we can return focus on close. */
  const detailTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedId) {
      document.title = DOC_TITLE_BASE;
      return;
    }
    const p = PLACES_BY_ID[selectedId];
    document.title = p ? `${p.name} · Terraclima` : DOC_TITLE_BASE;
  }, [selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = {
      view,
      placeId: selectedId,
      collectionId: activeCollection,
      countries: [...filters.countries] as Country[],
      archetypes: [...filters.archetypes],
      search: filters.search ?? "",
      compareIds: [...compareIds],
      collectionExists: (id: string) => Boolean(COLLECTION_BY_ID[id]),
      archetypeExists: (id: string) => Object.prototype.hasOwnProperty.call(ARCHETYPE_BY_ID, id),
      placeExists: (id: string) => Object.prototype.hasOwnProperty.call(PLACES_BY_ID, id),
    };
    const wantUrl = formatAppRelativeUrl(state);
    const haveUrl = `${window.location.pathname}${window.location.search}`;
    const haveHist = window.history.state as AppHistoryState | null;
    const wantTc = Boolean(selectedId);
    const haveTc = Boolean(haveHist?.tcPlace);

    if (!initialUrlSyncDoneRef.current) {
      initialUrlSyncDoneRef.current = true;
      replaceAppUrl(null, state);
      prevPlaceIdRef.current = selectedId;
      return;
    }

    if (haveUrl === wantUrl && haveTc === wantTc) {
      prevPlaceIdRef.current = selectedId;
      return;
    }

    const prev = prevPlaceIdRef.current;
    const opening = !prev && !!selectedId;

    if (opening) {
      pushAppUrl({ tcPlace: true }, state);
    } else {
      replaceAppUrl(selectedId ? { tcPlace: true } : null, state);
    }
    prevPlaceIdRef.current = selectedId;
  }, [view, selectedId, activeCollection, filters, compareIds]);

  useEffect(() => {
    const onPop = () => {
      const v = validatedStateFromSearch(
        window.location.search,
        PLACES_BY_ID as Record<string, unknown>,
        COLLECTION_BY_ID as Record<string, unknown>,
        ARCHETYPE_BY_ID as Record<string, unknown>,
      );
      setView(v.view);
      setSelectedId(v.placeId);
      setActiveCollection(v.collectionId);
      setFilters({
        countries: new Set<string>(v.countries),
        archetypes: new Set<MicroclimateArchetype>(v.archetypes),
        search: v.search,
      });
      setCompareIds(new Set(v.compareIds));
      prevPlaceIdRef.current = v.placeId;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Pause expensive CSS animations while the tab is backgrounded (battery / CPU).
  useEffect(() => {
    const sync = () => {
      document.documentElement.classList.toggle("tc-tab-inactive", document.visibilityState === "hidden");
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Scroll the window to the top when switching between top-level views.
  // Users deep on Explorer cards should land at the top of the next view
  // instead of mid-scroll. Respect prefers-reduced-motion.
  const firstViewRender = useRef(true);
  useEffect(() => {
    if (firstViewRender.current) { firstViewRender.current = false; return; }
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [view]);

  const [showShortcuts, setShowShortcuts] = useState(false);

  const pool = useMemo(() => {
    if (activeCollection) {
      const c = COLLECTION_BY_ID[activeCollection];
      if (c) return c.placeIds.map(placeForId).filter(isPlace);
    }
    return PLACES;
  }, [activeCollection]);

  const deferredFilters = useDeferredValue(filters);
  const filtered = useMemo(() => applyFilters(pool, deferredFilters), [pool, deferredFilters]);
  const ranked = useMemo(() => rankPlaces(ranking, filtered), [ranking, filtered]);
  const livabilityTopTen = useMemo(() => rankLivabilityPreview(filtered).slice(0, 10), [filtered]);
  const sortTopFive = useMemo(() => ranked.slice(0, 5), [ranked]);
  const rankingLabel = useMemo(
    () => RANKING_OPTIONS.find(o => o.id === ranking)?.label ?? ranking.replace(/-/g, " "),
    [ranking],
  );
  const resonantWindow = useMemo(() => resonantWindowFor(ranking), [ranking]);
  const rankedRef = useRef(ranked);
  rankedRef.current = ranked;

  const selectedPlace = selectedId ? PLACES_BY_ID[selectedId] ?? null : null;

  const toggleCompare = useCallback((id: string) => {
    setCompareIds(s => {
      const ns = new Set(s);
      if (ns.has(id)) {
        ns.delete(id);
        return ns;
      }
      ns.add(id);
      if (ns.size > COMPARE_LIMIT) {
        const arr = [...ns];
        const dropped = arr[0];
        if (dropped) setEvictedComparePlaceId(dropped);
        return new Set(arr.slice(arr.length - COMPARE_LIMIT));
      }
      return ns;
    });
  }, []);

  const openPlace = useCallback((id: string, opts?: { trigger?: HTMLElement | null }) => {
    if (opts?.trigger) {
      detailTriggerRef.current = opts.trigger;
    } else if (typeof document !== "undefined") {
      detailTriggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    }
    setSelectedId(id);
  }, []);

  const closeDetail = useCallback(() => {
    if (typeof window !== "undefined" && selectedId) {
      const st = window.history.state as AppHistoryState | null;
      if (st?.tcPlace) {
        window.history.back();
        return;
      }
    }
    setSelectedId(null);
  }, [selectedId]);

  // Return focus to the place's opening trigger after the detail panel closes.
  // Without this, focus drops to <body> and keyboard users lose context.
  useEffect(() => {
    if (selectedId !== null) return;
    const trigger = detailTriggerRef.current;
    if (!trigger) return;
    const id = window.requestAnimationFrame(() => {
      try { trigger.focus({ preventScroll: true }); } catch { /* noop */ }
    });
    return () => window.cancelAnimationFrame(id);
  }, [selectedId]);

  // Auto-clear transient feedback after 4s (5s is too long, 3s too short for
  // longer messages). Cleared early when a new message arrives.
  useEffect(() => {
    if (!transientFeedback) return;
    const t = window.setTimeout(() => setTransientFeedback(null), 4000);
    return () => window.clearTimeout(t);
  }, [transientFeedback]);

  // When the compare cap auto-evicts a place, surface a feedback strip naming it.
  useEffect(() => {
    if (!evictedComparePlaceId) return;
    const place = PLACES_BY_ID[evictedComparePlaceId];
    setTransientFeedback(
      `Compare holds ${COMPARE_LIMIT} places — replaced ${place?.name ?? "the oldest"} with the new pick.`,
    );
    setEvictedComparePlaceId(null);
  }, [evictedComparePlaceId]);

  const openCompare = useCallback(() => {
    setCompareOpen(true);
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
  const closeCompare = useCallback(() => setCompareOpen(false), []);

  const focusSearchInput = useCallback(() => {
    document.getElementById(SEARCH_INPUT_ID)?.focus();
  }, []);

  const openFilterSheet = useCallback(() => {
    explorerFilterSheetRef.current?.open();
  }, []);

  const pickRandomPlace = useCallback((): boolean => {
    const poolRanked = rankedRef.current;
    if (poolRanked.length === 0) return false;
    const idx = Math.floor(Math.random() * poolRanked.length);
    openPlace(poolRanked[idx].place.id);
    return true;
  }, [openPlace]);

  const onRandomEmpty = useCallback(() => {
    setTransientFeedback("No places match your filters — clear one to enable Surprise / R.");
  }, []);

  const openShortcutsHelp = useCallback(() => {
    setShowShortcuts(true);
    setShortcutsSeen(true);
    try { window.localStorage.setItem(SHORTCUTS_SEEN_KEY, "1"); } catch { /* noop */ }
  }, []);

  useKeyboardShortcuts({
    view,
    showShortcuts,
    compareOpen,
    selectedId,
    explorerDockLg,
    setView,
    setShowShortcuts,
    setCompareOpen,
    closeDetail,
    focusSearchInput,
    openFilterSheet,
    pickRandomPlace,
    onRandomEmpty,
  });
  const onOpenPlaceFromSubview = useCallback((id: string) => { openPlace(id); setView("explorer"); }, [openPlace]);
  const onPickCollection = useCallback((id: string) => {
    setActiveCollection(a => a === id ? null : id);
    setView("explorer");
  }, []);

  const surpriseMe = useCallback(() => {
    if (ranked.length === 0) {
      onRandomEmpty();
      return;
    }
    const idx = Math.floor(Math.random() * ranked.length);
    openPlace(ranked[idx].place.id);
  }, [ranked, openPlace, onRandomEmpty]);

  return (
    <div className="relative min-h-screen flex flex-col text-ice overflow-x-hidden">
      <a
        href="#main-content"
        className="skip-to-main focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,143,168,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffefb]"
      >
        Skip to main content
      </a>
      <div className="ambient-aurora" aria-hidden="true" />
      <div id="main-content" role="main" tabIndex={-1} className="relative z-10 flex flex-col flex-1 min-h-0 outline-none">
      <TopBar view={view} setView={setView} onOpenCompare={openCompare} compareCount={compareIds.size} />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] w-full mx-auto">
        <div key={view} className="view-enter flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
          {view === "explorer" && (
            <>
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <HeroCard
                  count={ranked.length}
                  livabilityTopTen={livabilityTopTen}
                  sortTopFive={sortTopFive}
                  rankingLabel={rankingLabel}
                  onOpenPlace={openPlace}
                  activeCollection={activeCollection}
                  onClearCollection={clearCollection}
                  activeArchetypes={filters.archetypes}
                  onClearArchetypes={clearArchetypes}
                  onSurpriseMe={surpriseMe}
                  canSurprise={ranked.length > 0}
                />

                <div className="relative h-[clamp(300px,48svh,520px)] md:h-[52dvh] md:min-h-[min(460px,44dvh)]">
                  <AtlasMap
                    places={filtered}
                    selectedId={selectedId ?? undefined}
                    onSelect={openPlace}
                  />
                </div>

                <div className="hidden md:block text-[11px] text-stone leading-relaxed px-0.5 max-w-3xl space-y-2.5 tc-page-intro">
                  <p>
                    <span className="font-medium text-frost">How you learn each place:</span>{" "}
                    tap any pin or card. A profile opens on the right — that is the full write-up for that microclimate. Scroll it like an article, or use <span className="text-frost font-medium">On this page</span> (snap chips on your phone, a soft rail on wider screens) to jump between sections: opening story, <span className="text-frost font-medium">field dossier</span> (stacked chapters + in-dossier jumps), seasons, geospatial analysis, soil, risks, who it fits, similar stops, and data sources.
                  </p>
                  <p>
                    <span className="font-medium text-frost">Depth you will always see:</span>{" "}
                    many stops include extra <span className="text-frost font-medium">field notes</span> (longer essays where we have written them). Every stop also gets a <span className="text-frost font-medium">field dossier</span> — one editorial column of chapters (season rhythm, drivers, soil pocket, nearby contrasts when we have them, scouting wrap) with quick jumps at the top, all generated from the same structured data as the charts, so the profile stays one coherent story.
                  </p>
                  <p>
                    <span className="font-medium text-frost">Reading the map:</span>{" "}
                    fill colour follows the main climate driver; the thin outer ring shows country (US, Canada, Mexico). Scale and driver legend sit in the lower-left on the map frame. Zoom with the controls or scroll — the scale bar updates with zoom.
                  </p>
                </div>

                <div className="panel-thin p-3 flex items-center justify-between flex-wrap gap-2">
                  {/* Visual count is animated via raf-driven textContent mutation,
                      which would spam any enclosing aria-live region. The
                      authoritative announcement lives in the sr-only sibling
                      below so screen readers hear only the final value. */}
                  <div className="text-xs text-stone" aria-hidden="true">
                    Showing <span className="font-mono-num text-frost tabular-nums"><AnimatedNumber value={ranked.length} /></span> of <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> places · ranked by <span className="text-frost">{rankingLabel}</span>
                  </div>
                  <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {`Showing ${ranked.length} of ${PLACE_COUNTS.total} places, ranked by ${rankingLabel}.`}
                  </div>
                  <div className="text-xs text-stone hidden md:flex items-center gap-2 flex-wrap">
                    <span><span className="tc-tip-pill">Scroll</span> zooms the map</span>
                    <span><span className="tc-tip-pill">/</span> focuses search</span>
                    <span><span className="tc-tip-pill">R</span> surprise pick</span>
                    <button
                      type="button"
                      onClick={openShortcutsHelp}
                      className={`inline-flex items-center gap-1 text-xs text-frost rounded-md border border-[rgba(180,160,140,0.45)] bg-white/85 px-2 py-1 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgba(26,143,168,0.55)] ${shortcutsSeen ? "" : "tc-shortcuts-pulse"}`}
                      aria-label="Show keyboard shortcuts"
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden /> Shortcuts
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={openShortcutsHelp}
                    className={`md:hidden inline-flex items-center gap-1 text-xs text-frost rounded-md border border-[rgba(180,160,140,0.45)] bg-white/85 px-2 py-1.5 min-h-[36px] ${shortcutsSeen ? "" : "tc-shortcuts-pulse"}`}
                    aria-label="Show keyboard shortcuts and tips"
                  >
                    <HelpCircle className="w-3.5 h-3.5" aria-hidden /> Tips
                  </button>
                </div>

                {transientFeedback ? (
                  <div role="status" aria-live="polite" className="tc-toast panel-warm flex items-center justify-between gap-3 px-3 py-2 anim-fade-in">
                    <span className="text-sm text-frost">{transientFeedback}</span>
                    <button
                      type="button"
                      onClick={() => setTransientFeedback(null)}
                      className="btn-ghost !text-xs !py-1"
                      aria-label="Dismiss message"
                    >
                      <X className="w-3 h-3" aria-hidden /> Dismiss
                    </button>
                  </div>
                ) : null}

                {ranked.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <EmptyResults onClear={clearAllFilters} />
                  </div>
                ) : (
                  <section className="flex flex-col gap-3 min-w-0" aria-labelledby="ranked-places-heading">
                    <div className="tc-section-heading pt-1">
                      <div className="tc-section-heading__line opacity-80" aria-hidden />
                      <span id="ranked-places-heading" className="tc-section-heading__label">Ranked places</span>
                      <div className="tc-section-heading__line opacity-80" aria-hidden />
                    </div>
                    <VirtualPlaceGrid
                      ranked={ranked}
                      selectedId={selectedId}
                      openPlace={openPlace}
                      toggleCompare={toggleCompare}
                      compareIds={compareIds}
                      resonantWindow={resonantWindow}
                    />
                    <div className="panel-thin p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-stone">
                        Showing <span className="font-mono-num text-frost">{ranked.length}</span> places in this filtered set — scroll to browse
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {explorerDockLg ? (
                <aside className="w-[340px] shrink-0 flex flex-col gap-4" aria-label="Explorer filters and atlas footprint">
                  <FilterBar
                    searchInputId={SEARCH_INPUT_ID}
                    filters={filters}
                    setFilters={setFilters}
                    ranking={ranking}
                    setRanking={setRanking}
                  />
                  <FootprintPanel />
                </aside>
              ) : (
                <ExplorerFilterSheet
                  ref={explorerFilterSheetRef}
                  searchInputId={SEARCH_INPUT_ID}
                  filters={filters}
                  setFilters={setFilters}
                  ranking={ranking}
                  setRanking={setRanking}
                  footer={<FootprintPanel />}
                  detailOpen={Boolean(selectedId)}
                />
              )}
            </>
          )}

          {view === "collections" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5 tc-page-intro">
                  <div className="text-xs uppercase tracking-wider text-stone">Curated</div>
                  <h2 className="font-atlas text-3xl text-ice text-depth-hero mt-0.5">Collections</h2>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    Hand-assembled thematic bundles — the rain shadows, the sky islands, the eternal springs. Pin a collection to constrain the explorer map to just those places.
                  </p>
                </div>
                <CollectionsView
                  onOpenPlace={onOpenPlaceFromSubview}
                  onPick={onPickCollection}
                  activeId={activeCollection ?? undefined}
                />
              </div>
            </div>
          )}

          {view === "learn" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5 tc-page-intro tc-page-intro--sage">
                  <div className="text-xs uppercase tracking-wider text-stone">Learn</div>
                  <h2 className="font-atlas text-3xl text-ice text-depth-hero mt-0.5">Field guide</h2>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    The vocabulary of microclimate — concepts like lapse rate, cold-air pooling, orographic lift, and thermal belts — gives you the language to read a landscape and understand why the weather there is the way it is.
                  </p>
                </div>
                <LearnMode onOpenPlace={onOpenPlaceFromSubview} />
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      </div>

      <PlaceDetail
        place={selectedPlace}
        onClose={closeDetail}
        onCompareToggle={toggleCompare}
        inCompareIds={compareIds}
        onPickArchetype={pickArchetype}
        onOpenPlace={openPlace}
      />
      <CompareView
        places={[...compareIds].map(placeForId).filter(isPlace)}
        open={compareOpen}
        onClose={closeCompare}
        onRemove={toggleCompare}
      />

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

const ShortcutsOverlay = memo(function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 anim-fade-in">
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default border-0 p-0"
        style={{
          background: "rgba(62, 38, 24, 0.22)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kbd-shortcuts-title"
        className="relative z-10 panel p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="kbd-shortcuts-title" className="font-atlas text-xl text-ice">Keyboard shortcuts</h3>
          <button ref={closeBtnRef} type="button" onClick={onClose} className="btn-ghost !p-1.5" aria-label="Close keyboard shortcuts help">
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
        <div className="divider-contour mb-3" />
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Kbds keys={["E"]} />        <span className="text-frost">Explorer</span>
          <Kbds keys={["C"]} />        <span className="text-frost">Collections</span>
          <Kbds keys={["L"]} />        <span className="text-frost">Learn</span>
          <Kbds keys={["/"]} />        <span className="text-frost">Explorer: focus search (on narrow screens also opens the filter sheet)</span>
          <Kbds keys={["F"]} />        <span className="text-frost">Explorer: open filter sheet (narrow screens only)</span>
          <Kbds keys={["R"]} />        <span className="text-frost">Surprise — random place in your current list</span>
          <Kbds keys={["Esc"]} />      <span className="text-frost">Close shortcuts, compare, filter sheet, site menu, or place detail</span>
          <Kbds keys={["?"]} />        <span className="text-frost">Toggle this help</span>
        </div>
        <div className="divider-contour my-3" />
        <div className="space-y-2 text-xs text-stone leading-relaxed">
          <p>
            Phone map: the page scrolls normally first. Tap <strong className="text-frost font-normal">Use map</strong> on the map to pan or pinch zoom, then tap <strong className="text-frost font-normal">Scroll page</strong> to return to reading.
          </p>
          <p>
            Place profiles: tap any pin or card to open the full write-up. The profile includes the field dossier, seasons, geospatial analysis, soils, risks, similar stops, and data sources.
          </p>
          <p>
            Share a place: open it, then use <strong className="text-frost font-normal">Copy link</strong> in the panel header — the URL encodes which place and view to open. Surprise uses the same filtered pool as the cards.
          </p>
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

const EmptyResults = memo(function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="col-span-full panel-warm p-6 text-center anim-fade-in">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(240,210,156,0.18)] border border-[rgba(240,210,156,0.4)] mb-3">
        <Search className="w-4 h-4" style={{ color: "#f0d29c" }} />
      </div>
      <h3 className="font-atlas text-lg text-ice mb-1">Nothing matches all those filters at once</h3>
      <p className="text-sm text-frost mb-2 max-w-md mx-auto">
        That's a tight intersection — try loosening one. Drop a country, drop one of the archetypes, or shorten the search. Names, regions, archetypes, and Köppen codes all match.
      </p>
      <p className="text-xs text-stone mb-4 max-w-md mx-auto">
        Nothing is broken: the atlas still holds <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> curated stops behind the filters.
      </p>
      <button type="button" onClick={onClear} className="btn-primary !text-xs">
        <X className="w-3.5 h-3.5" aria-hidden /> Clear all filters
      </button>
    </div>
  );
});

const TopBar = memo(function TopBar({ view, setView, onOpenCompare, compareCount }: { view: View; setView: (v: View) => void; onOpenCompare: () => void; compareCount: number }) {
  const menuRef = useRef<HTMLDialogElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useFocusTrap(menuPanelRef, menuOpen);

  useEffect(() => {
    if (!menuOpen) return;
    let alive = true;
    const id = window.requestAnimationFrame(() => {
      if (!alive) return;
      menuPanelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
    return () => {
      alive = false;
      window.cancelAnimationFrame(id);
    };
  }, [menuOpen]);

  useEffect(() => {
    const d = menuRef.current;
    if (!d) return;
    const sync = () => setMenuOpen(d.open);
    d.addEventListener("toggle", sync);
    sync();
    return () => d.removeEventListener("toggle", sync);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = useCallback(() => {
    menuRef.current?.close();
  }, []);

  const openMenu = useCallback(() => {
    menuRef.current?.showModal();
  }, []);

  const pickView = useCallback(
    (v: View) => {
      setView(v);
      closeMenu();
    },
    [setView, closeMenu],
  );

  return (
    <header className="sticky top-0 z-30 tc-header-bar">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between min-[560px]:gap-4">
        <div className="flex items-center justify-between gap-3 min-w-0 min-[560px]:contents">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <div className="drop-shadow-[0_2px_14px_rgba(255,196,214,0.45)] shrink-0">
              <LogoMark />
            </div>
            <div className="min-w-0">
              <div className="font-atlas text-lg text-ice leading-none">Terraclima</div>
              <div className="text-[11px] tracking-wide text-gradient-atlas leading-snug">North American Microclimate Atlas</div>
            </div>
          </div>

          <button
            type="button"
            onClick={openMenu}
            className="tc-header-menu-trigger min-[560px]:hidden"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="tc-site-menu"
          >
            <Menu className="w-5 h-5" aria-hidden />
            <span className="sr-only">Open site menu</span>
          </button>
        </div>

        <nav className="hidden min-[560px]:flex flex-wrap items-center gap-1.5 min-[560px]:justify-end" aria-label="Primary">
          <NavBtn active={view === "explorer"} onClick={() => setView("explorer")} icon={<Map className="w-3.5 h-3.5" />} label="Explorer" />
          <NavBtn active={view === "collections"} onClick={() => setView("collections")} icon={<Library className="w-3.5 h-3.5" />} label="Collections" />
          <NavBtn active={view === "learn"} onClick={() => setView("learn")} icon={<Compass className="w-3.5 h-3.5" />} label="Learn" />

          <TempToggle className="ml-1" />

          {compareCount > 0 && (
            <button type="button" onClick={onOpenCompare} className="btn-primary !text-xs !py-1.5" aria-label={`Open compare (${compareCount} places)`}>
              <Target className="w-3.5 h-3.5" aria-hidden /> Compare · {compareCount}
            </button>
          )}
        </nav>

        <dialog
          ref={menuRef}
          id="tc-site-menu"
          className="tc-site-menu-dialog tc-glass-dialog-motion"
          aria-labelledby="tc-site-menu-title"
        >
          <button
            type="button"
            className="fixed inset-0 z-0 min-h-[100dvh] min-w-[100vw] cursor-default border-0 bg-transparent p-0"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div ref={menuPanelRef} className="relative z-10 tc-site-menu-dialog__inner">
            <div className="tc-site-menu-dialog__head">
              <h2 id="tc-site-menu-title" className="font-atlas text-lg text-ice m-0">
                Navigate
              </h2>
              <button type="button" onClick={closeMenu} className="btn-ghost !p-2 rounded-lg" aria-label="Close menu">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <NavBtn stretch active={view === "explorer"} onClick={() => pickView("explorer")} icon={<Map className="w-4 h-4" />} label="Explorer" />
              <NavBtn stretch active={view === "collections"} onClick={() => pickView("collections")} icon={<Library className="w-4 h-4" />} label="Collections" />
              <NavBtn stretch active={view === "learn"} onClick={() => pickView("learn")} icon={<Compass className="w-4 h-4" />} label="Learn" />

              <div className="pt-1">
                <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5 px-0.5">Temperature units</div>
                <TempToggle stretch onAfterChange={closeMenu} />
              </div>

              {compareCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onOpenCompare();
                  }}
                  className="btn-primary w-full justify-center !py-2.5 mt-1"
                  aria-label={`Open compare (${compareCount} places)`}
                >
                  <Target className="w-4 h-4" aria-hidden /> Compare · {compareCount}
                </button>
              ) : null}
            </div>
          </div>
        </dialog>
      </div>
    </header>
  );
});

const NavBtn = memo(function NavBtn({
  active,
  onClick,
  icon,
  label,
  stretch,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  stretch?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg transition-all duration-200 ${
        stretch
          ? "w-full justify-center min-h-[2.75rem] px-3 py-2.5 text-sm"
          : "gap-1.5 px-3 py-2 text-xs min-h-[2.25rem]"
      } ${
        active
          ? "text-ice bg-[rgba(94,196,220,0.18)] shadow-[inset_0_-2px_0_0_rgba(26,143,168,0.85)] ring-1 ring-[rgba(26,143,168,0.22)]"
          : stretch
            ? "text-stone border border-[rgba(180,150,120,0.42)] hover:text-frost hover:bg-[rgba(255,248,236,0.95)]"
            : "text-stone border border-transparent hover:text-frost hover:bg-[rgba(255,248,236,0.95)]"
      }`}
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
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#f3ebe0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#logoGlow)" stroke="rgba(232,155,32,0.45)" />
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
    <div className="rounded-xl border border-[rgba(61,143,85,0.28)] bg-[linear-gradient(135deg,rgba(255,253,248,0.98)_0%,rgba(236,248,232,0.55)_100%)] px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <BookOpen className="w-3.5 h-3.5 shrink-0 text-sage-700" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-sage-700">Field note</span>
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
        className="btn-ghost !text-xs !py-1.5 shrink-0 self-start sm:self-center border-[rgba(61,143,85,0.28)]"
        aria-label="Show another field note"
      >
        <Shuffle className="w-3.5 h-3.5 text-sage-700" aria-hidden />
        Another
      </button>
    </div>
  );
});

const HeroCard = memo(function HeroCard({
  count,
  livabilityTopTen,
  sortTopFive,
  rankingLabel,
  onOpenPlace,
  activeCollection,
  onClearCollection,
  activeArchetypes,
  onClearArchetypes,
  onSurpriseMe,
  canSurprise,
}: {
  count: number;
  livabilityTopTen: RankingResult[];
  sortTopFive: RankingResult[];
  rankingLabel: string;
  onOpenPlace: (id: string) => void;
  activeCollection: string | null;
  onClearCollection: () => void;
  activeArchetypes: Set<MicroclimateArchetype>;
  onClearArchetypes: () => void;
  onSurpriseMe: () => void;
  canSurprise: boolean;
}) {
  const prose = useProse();
  const active = activeCollection ? COLLECTION_BY_ID[activeCollection] ?? null : null;
  return (
    <div className="panel panel-hero p-5 anim-fade-in space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />
            <span className="text-xs uppercase tracking-wider text-stone-readable">
              {active ? "Collection pinned" : activeArchetypes.size > 0 ? `Filtered by ${activeArchetypes.size} archetype${activeArchetypes.size > 1 ? "s" : ""}` : "Explorer"}
            </span>
            {active && (
              <button type="button" onClick={onClearCollection} className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice">
                <X className="w-3 h-3" aria-hidden /> Clear collection
              </button>
            )}
            {!active && activeArchetypes.size > 0 && (
              <button type="button" onClick={onClearArchetypes} className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice">
                <X className="w-3 h-3" aria-hidden /> Clear archetypes
              </button>
            )}
          </div>
          <h1 className="font-atlas text-2xl md:text-3xl text-ice leading-tight text-depth-hero">
            {active ? active.title : "Scout the continent, one microclimate at a time"}
          </h1>
          <p className="text-sm text-frost mt-1 max-w-2xl leading-relaxed">
            {active
              ? active.description
              : "Rain shadows, sky islands, orchard valleys, chinook corridors, and cool-summer coasts — each write-up ties weather to terrain so you can read a place the way locals do, not just scan numbers."}
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
          {canSurprise && (
            <button
              type="button"
              onClick={onSurpriseMe}
              className="btn-ghost !text-xs !py-1.5 w-full sm:w-auto border-[rgba(122,212,240,0.35)]"
              aria-label="Open a random place from the current filtered list"
              title="Uses the same pool as the cards and map below"
            >
              <Shuffle className="w-3.5 h-3.5 text-[rgba(122,212,240,0.9)]" aria-hidden />
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

      {livabilityTopTen.length > 0 ? (
        <div className="hero-top-ten px-3 py-3 sm:px-4 space-y-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-sage-700">Livability lens · top ten</div>
            <p className="text-xs text-stone-readable mt-1 leading-relaxed max-w-3xl">
              Same filtered pool as the map and cards. This row is <span className="font-medium text-frost">always</span> sorted by our published blend — not by whatever you picked in Rank by.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-readable" aria-label="Livability blend weights">
              <span className="livability-weight-pill">Resilience {Math.round(LIVABILITY_WEIGHTS.resilience * 100)}%</span>
              <span className="livability-weight-pill">Winter ease {Math.round(LIVABILITY_WEIGHTS.winterEase * 100)}%</span>
              <span className="livability-weight-pill">Summer ease {Math.round(LIVABILITY_WEIGHTS.summerEase * 100)}%</span>
              <span className="livability-weight-pill">Hazard cushion {Math.round(LIVABILITY_WEIGHTS.hazardEase * 100)}%</span>
              <span className="livability-weight-pill">Growability {Math.round(LIVABILITY_WEIGHTS.growability * 100)}%</span>
            </div>
            <p className="mt-1.5 text-[10px] text-stone-readable/85 italic">
              Editorial triage for exploration — not appraisal, insurance, civil engineering, or medical heat-stress advice.
            </p>
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]"
            aria-label="Top ten places by livability blend in the current filtered list"
          >
            {livabilityTopTen.map((row, i) => (
              <button
                key={row.place.id}
                type="button"
                onClick={() => onOpenPlace(row.place.id)}
                aria-label={`Livability rank ${i + 1}. ${row.place.name}, ${row.place.koppen}. Open place profile.`}
                className="hero-top-ten__chip snap-start shrink-0 px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-atlas text-lg text-ice/90 tabular-nums leading-none" aria-hidden>{i + 1}</span>
                  <span className="text-[10px] uppercase tracking-wider text-stone-readable truncate">{row.place.country === "USA" ? "US" : row.place.country === "Canada" ? "CA" : "MX"}</span>
                </div>
                <div className="font-atlas text-sm text-ice leading-tight mt-1 truncate" title={row.place.name}>{row.place.name}</div>
                <div className="text-[11px] text-stone-readable mt-0.5 truncate">{row.place.koppen}</div>
                <div className="text-[10px] text-stone-readable mt-1 font-mono-num tabular-nums">
                  Blend <span className="text-frost">{Math.round(row.score)}</span>
                </div>
                {row.note ? (
                  <div className="text-[10px] text-stone-readable mt-0.5 leading-snug line-clamp-2" title={prose(row.note)}>{prose(row.note)}</div>
                ) : null}
              </button>
            ))}
          </div>

          {sortTopFive.length > 0 ? (
            <div className="pt-2 border-t border-[rgba(200,170,140,0.35)]">
              <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Your Rank by · leading five</div>
              <p className="text-[11px] text-stone-readable mb-2 leading-relaxed">
                Matches the long ranked list below — currently <span className="font-medium text-frost">{rankingLabel}</span>.
              </p>
              <div className="flex flex-wrap gap-1.5" aria-label="Top five places for the selected ranking profile">
                {sortTopFive.map((row, i) => (
                  <button
                    key={row.place.id}
                    type="button"
                    onClick={() => onOpenPlace(row.place.id)}
                    aria-label={`${i + 1}. ${row.place.name}. Open place profile.`}
                    className="inline-flex items-baseline gap-1.5 rounded-full border border-[rgba(180,160,140,0.5)] bg-white/85 px-2.5 py-1 text-left text-[11px] text-frost hover:border-[rgba(26,143,168,0.5)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgba(26,143,168,0.55)]"
                  >
                    <span className="font-mono-num text-stone tabular-nums" aria-hidden>{i + 1}.</span>
                    <span className="font-medium truncate max-w-[9rem]">{row.place.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <FieldNoteStrip />
    </div>
  );
});

const Metric = memo(function Metric({ label, value, animated }: { label: string; value: number; animated?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase tracking-wider text-stone-readable">{label}</span>
      <span className="font-mono-num text-xl text-ice tabular-nums">
        {animated ? <AnimatedNumber value={value} /> : value}
      </span>
    </div>
  );
});

function AnimatedNumber({ value, durationMs = 520 }: { value: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const displayedRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = displayedRef.current;
    const to = value;
    if (from === to) return;
    if (prefersReducedMotion()) {
      if (ref.current) ref.current.textContent = to.toString();
      displayedRef.current = to;
      return;
    }
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

const Footer = memo(function Footer() {
  return (
    <footer className="mt-10 tc-footer">
      <div className="max-w-[1600px] mx-auto px-6 py-6 text-xs text-stone flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-3.5 h-3.5" />
          <span>
            Terraclima is built for curious travelers and serious readers alike. Climate numbers lean on NOAA, PRISM, ECCC, and SMN normals ({CLIMATE_NORMALS_PERIOD} where we have them), with WorldClim where we need a wider net. Geospatial screening uses the same terrain–climate framework across the atlas, with Sentinel-2 and Landsat as reference EO families and a relief-texture proxy for where lidar-grade topography would matter most in field work — not live satellite or lidar feeds. Soil sketches lean on SoilGrids and regional soil surveys. Every score ties back to notes on that place; if data are thin, we say so. This is a curated atlas — not a live weather or appraisal feed.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Search className="w-3.5 h-3.5" />
          <span>
            {PLACE_COUNTS.total} hand-picked places · editorial refresh {ATLAS_EDITORIAL_SNAPSHOT}
          </span>
        </div>
      </div>
    </footer>
  );
});
