import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, BookmarkCheck, BookOpen, CalendarDays, Clock, Compass, HelpCircle, Laptop, Library, Link2, Map, Menu, Route, Search, ShieldAlert, ShieldCheck, Shuffle, Snowflake, Sparkles, Sprout, Sun, Sunrise, Target, X, type LucideIcon } from "lucide-react";
import { AtlasMap } from "./components/AtlasMap";
import { VirtualPlaceGrid } from "./components/VirtualPlaceGrid";
import { ExplorerFilterSheet, type ExplorerFilterSheetHandle } from "./components/ExplorerFilterSheet";
import { FilterBar, RANKING_OPTIONS } from "./components/FilterBar";
import { FootprintPanel } from "./components/FootprintPanel";
import { TempToggle } from "./components/TempToggle";
import { useElementIsolation } from "./hooks/use-element-isolation";
import { useFocusTrap } from "./hooks/use-focus-trap";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useMediaQuery } from "./hooks/use-media-query";
import { PLACES, PLACES_BY_ID, PLACE_COUNTS, resolvePlaceId, warmPlaceSearchIndex } from "./data/places";
import { COLLECTION_BY_ID } from "./data/collections";
import { CLIMATE_TRIP_THEME_BY_ID } from "./data/climate-trip-themes";
import { ARCHETYPE_BY_ID } from "./data/archetypes";
import { FIELD_NOTES } from "./data/field-notes";
import {
  anyLifestyleBundleActive,
  applyLifestyleBundle,
  countLiveFinderConstraintSignals,
  HERO_BUNDLE_BY_RANKING,
  isBundleActive,
  lifestyleBundleById,
} from "./lib/lifestyle-bundles";
import { applyFilters, countActiveExplorerFilterSignals, createEmptyFilterState, filterStateFromValidated, rankLivabilityPreview, scoreLivability, toValidatedFilterInput, LIVABILITY_WEIGHTS, type FilterState, type LivabilityResult, type RankingProfile, type RankingResult } from "./lib/scoring";
import { assessLiveFit } from "./lib/live-fit";
import { projectPool } from "./lib/climate-projection";
import { useClimateProcessor } from "./hooks/use-climate-processor";
import { ClimateScenarioControl } from "./components/chrome/ClimateScenarioControl";
import { resonantWindowFor } from "./lib/best-months";
import { buildExplorerScoutBrief, type ExplorerScoutBrief } from "./lib/explorer-scout-brief";
import { getPlaceVisualSignature, type PlaceVisualSignature } from "./lib/place-visual-signature";
import { buildContextStressRows, CONTEXT_SCENARIO_BY_ID, filtersForContextScenario, summarizeContextStressRows, type ContextScenarioId, type ContextStressRow } from "./lib/context-scenarios";
import { motionPolicy, prefersReducedMotion, useRichVisualEffects } from "./lib/device-profile";
import { placeDocumentTitle } from "./lib/site-metadata";
import { useProse, useUnits } from "./lib/units";
import { shareUrl } from "./lib/share";
import { runViewTransition } from "./lib/view-transition";
import {
  loadClimateTripsView,
  loadCollectionsView,
  loadCompareView,
  loadLearnMode,
  loadPlaceDetail,
  preloadCompareView,
  preloadPlaceDetail,
} from "./lib/lazy-views";
import { SEARCH_INPUT_ID, SHORTCUTS_SEEN_KEY, type ShareStatus } from "./lib/app-constants";
import { LogoMark } from "./components/chrome/LogoMark";
import { Footer } from "./components/chrome/Footer";
import { ShortcutsOverlay } from "./components/chrome/ShortcutsOverlay";
import { ShortlistExportMenu } from "./components/chrome/ShortlistExportMenu";
import {
  DEFAULT_RANKING,
  loadPersistedRanking,
  persistRankingProfile,
} from "./lib/app-ranking-preference";
import {
  BOOKMARK_LIMIT,
  loadBookmarks,
  toggleBookmark as toggleBookmarkPersist,
} from "./lib/place-bookmarks";
import {
  clearRecentPlaces,
  loadRecentPlaces,
  recordRecentPlace,
} from "./lib/place-history";
import {
  type AppHistoryState,
  COMPARE_LIMIT,
  formatAppRelativeUrl,
  pushAppUrl,
  readInitialAppState,
  replaceAppUrl,
  validatedStateFromSearch,
} from "./lib/app-url";
import type { Country, MicroclimateArchetype, Place, ScenarioId } from "./types";
import {
  applyTheme,
  persistThemePreference,
  prefersDarkScheme,
  resolveInitialTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./lib/theme";
import { ThemeToggle } from "./components/chrome/ThemeToggle";

const CURATED_SET_BY_ID = {
  ...Object.fromEntries(Object.entries(COLLECTION_BY_ID).map(([id, c]) => [id, { ...c, kind: "collection" as const }])),
  ...Object.fromEntries(Object.entries(CLIMATE_TRIP_THEME_BY_ID).map(([id, t]) => [id, { ...t, kind: "trip" as const }])),
};

function placeForId(id: string): Place | undefined {
  const canonical = resolvePlaceId(id);
  return canonical ? PLACES_BY_ID[canonical] : undefined;
}

function isPlace(p: Place | undefined): p is Place {
  return p != null;
}

function readCurrentAppState() {
  return readInitialAppState(
    PLACES_BY_ID,
    CURATED_SET_BY_ID,
    ARCHETYPE_BY_ID,
    resolvePlaceId,
  );
}

type View = "explorer" | "trips" | "collections" | "learn";

const ClimateTripsView = lazy(loadClimateTripsView);
const CollectionsView = lazy(loadCollectionsView);
const LearnMode = lazy(loadLearnMode);
const PlaceDetail = lazy(loadPlaceDetail);
const CompareView = lazy(loadCompareView);

export default function App() {
  const richVisualEffects = useRichVisualEffects();
  const { temp, dist, setTemp, setDist } = useUnits();
  useEffect(() => {
    document.documentElement.classList.toggle("tc-low-power", !richVisualEffects);
    return () => document.documentElement.classList.remove("tc-low-power");
  }, [richVisualEffects]);

  useEffect(() => {
    const applyMotionTier = () => {
      document.documentElement.dataset.motion = motionPolicy();
    };
    applyMotionTier();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", applyMotionTier);
    return () => mq.removeEventListener("change", applyMotionTier);
  }, [richVisualEffects]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    type IdleDeadlineLike = { timeRemaining?: () => number };
    const w = window as Window & {
      requestIdleCallback?: (cb: (deadline: IdleDeadlineLike) => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let nextIndex = 0;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    let cancelled = false;

    const cancelPending = () => {
      if (idleId !== null && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      idleId = null;
      timeoutId = null;
    };

    const schedule = () => {
      if (cancelled) return;
      if (w.requestIdleCallback) {
        idleId = w.requestIdleCallback(run, { timeout: richVisualEffects ? 1500 : 3000 });
      } else {
        timeoutId = window.setTimeout(() => run(), richVisualEffects ? 250 : 600);
      }
    };

    const run = (deadline?: IdleDeadlineLike) => {
      if (cancelled) return;
      idleId = null;
      timeoutId = null;
      const remaining = deadline?.timeRemaining?.();
      const minBudget = richVisualEffects ? 3 : 1;
      const maxBudget = richVisualEffects ? 12 : 5;
      const fallbackBudget = richVisualEffects ? 6 : 3;
      const budgetMs = remaining == null ? fallbackBudget : Math.max(minBudget, Math.min(maxBudget, remaining));
      nextIndex = warmPlaceSearchIndex(PLACES, nextIndex, budgetMs);
      if (nextIndex < PLACES.length) schedule();
    };

    schedule();
    return () => {
      cancelled = true;
      cancelPending();
    };
  }, [richVisualEffects]);

  const initialAppStateRef = useRef<ReturnType<typeof readCurrentAppState> | null>(null);
  if (initialAppStateRef.current === null) {
    initialAppStateRef.current = readCurrentAppState();
  }
  const initialAppState = initialAppStateRef.current;

  const [view, setView] = useState<View>(initialAppState.view);
  const setViewFluid = useCallback((next: View) => {
    runViewTransition(() => setView(next));
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(initialAppState.placeId);
  const [compareIds, setCompareIds] = useState<Set<string>>(() => new Set(initialAppState.compareIds));
  const [compareOpen, setCompareOpen] = useState(() => initialAppState.compareIds.length >= 2);
  const [activeCollection, setActiveCollection] = useState<string | null>(initialAppState.collectionId);
  const [filters, setFilters] = useState<FilterState>(() => filterStateFromValidated(initialAppState));
  const [ranking, setRankingRaw] = useState<RankingProfile>(() => initialAppState.ranking ?? loadPersistedRanking());
  const [climateScenario, setClimateScenario] = useState<ScenarioId>(() => initialAppState.scenario ?? "now");
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set(loadBookmarks()));
  const [recentIds, setRecentIds] = useState<readonly string[]>(() => loadRecentPlaces());
  // Theme preference (auto/light/dark). URL ?theme=... wins on first paint;
  // otherwise we read the last explicit choice from localStorage; otherwise
  // default to "auto" so the OS preference drives the resolved theme.
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return initialAppState.theme ?? "auto";
    if (initialAppState.theme) return initialAppState.theme;
    let persisted: string | null = null;
    try { persisted = window.localStorage.getItem(THEME_STORAGE_KEY); }
    catch { /* ignore */ }
    return resolveInitialTheme(window.location.search, persisted);
  });
  /** One-shot transient feedback for actions like pressing R on an empty pool or hitting the compare cap. */
  const [transientFeedback, setTransientFeedback] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const shareResetRef = useRef<number | null>(null);
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

  useEffect(() => () => {
    if (shareResetRef.current !== null) window.clearTimeout(shareResetRef.current);
  }, []);

  // Apply theme on mount and whenever the preference changes. When the
  // preference is "auto" we also subscribe to prefers-color-scheme changes
  // so the page tracks system Dark Mode toggles without a reload.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const apply = () => applyTheme(document, themePreference, resolveTheme(themePreference, prefersDarkScheme(window)));
    apply();
    if (themePreference !== "auto" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    // Legacy fallback (Safari < 14).
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [themePreference]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemePreference(next);
    if (typeof window !== "undefined") {
      try { persistThemePreference(window.localStorage, next); }
      catch { /* private browsing — runtime + URL still work */ }
    }
  }, []);

  const copyCurrentView = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    // Use the native share sheet when available (iOS / Android / modern
    // Safari). The helper transparently falls back to clipboard so
    // desktop browsers and older mobile browsers still copy the URL.
    void shareUrl({
      title: document.title || "Terraclima",
      text: "Terraclima view",
      url: url.toString(),
    }).then(outcome => {
      setShareStatus(outcome === "failed" ? "failed" : "copied");
      if (shareResetRef.current !== null) window.clearTimeout(shareResetRef.current);
      shareResetRef.current = window.setTimeout(() => {
        setShareStatus("idle");
        shareResetRef.current = null;
      }, 2200);
    });
  }, []);

  const prevPlaceIdRef = useRef<string | null>(initialAppState.placeId);
  /**
   * First-paint URL sync flag. A useRef instead of a module-level mutable
   * so the contract is explicit and there's no shared mutable state across
   * a hypothetical second App instance. StrictMode dev double-mount may run
   * the initial replaceAppUrl twice, but replaceAppUrl is idempotent for the
   * same target URL so the user-visible behaviour matches.
   */
  const initialUrlSyncDoneRef = useRef(false);
  const explorerDockLg = useMediaQuery("(min-width: 1024px)");
  // Matches the styles.css `.desktop-scout-board` reveal breakpoint (line ~2170);
  // gating the JSX avoids mounting a 200+ LOC subtree that is `display: none`.
  const scoutBoardLg = useMediaQuery("(min-width: 1180px)");
  const explorerFilterSheetRef = useRef<ExplorerFilterSheetHandle | null>(null);
  const appShellRef = useRef<HTMLDivElement>(null);
  /** Reference to the trigger that opened the place detail, so we can return focus on close. */
  const detailTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedId) {
      document.title = placeDocumentTitle(null);
      return;
    }
    const p = PLACES_BY_ID[selectedId];
    document.title = placeDocumentTitle(p?.name);
  }, [selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasLiveFitState = (filters.fitPresets?.size ?? 0) > 0 ||
      filters.maxSummerHighC != null ||
      filters.minWinterLowC != null ||
      filters.minGrowability != null ||
      filters.maxFireRisk != null ||
      filters.maxOverallRisk != null;
    const state = {
      view,
      placeId: selectedId,
      collectionId: activeCollection,
      countries: [...filters.countries] as Country[],
      archetypes: [...filters.archetypes],
      search: filters.search ?? "",
      compareIds: [...compareIds],
      ranking: ranking === DEFAULT_RANKING && !hasLiveFitState ? null : ranking,
      fitPresets: [...(filters.fitPresets ?? new Set())],
      maxSummerHighC: filters.maxSummerHighC ?? null,
      minWinterLowC: filters.minWinterLowC ?? null,
      minGrowability: filters.minGrowability ?? null,
      maxFireRisk: filters.maxFireRisk ?? null,
      maxOverallRisk: filters.maxOverallRisk ?? null,
      temp,
      dist,
      theme: themePreference === "auto" ? null : themePreference,
      scenario: climateScenario === "now" ? null : climateScenario,
      collectionExists: (id: string) => Boolean(CURATED_SET_BY_ID[id]),
      archetypeExists: (id: string) => Object.prototype.hasOwnProperty.call(ARCHETYPE_BY_ID, id),
      placeExists: (id: string) => resolvePlaceId(id) != null,
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
      const st = window.history.state as AppHistoryState | null;
      // Only preserve tcPlace on entries that were created by an in-app place open.
      // Deep-linked profiles must close in place instead of sending Back outside the app.
      replaceAppUrl(selectedId && st?.tcPlace ? { tcPlace: true } : null, state);
    }
    prevPlaceIdRef.current = selectedId;
  }, [view, selectedId, activeCollection, filters, compareIds, ranking, temp, dist, themePreference, climateScenario]);

  useEffect(() => {
    const onPop = () => {
      const v = validatedStateFromSearch(
        window.location.search,
        PLACES_BY_ID as Record<string, unknown>,
        CURATED_SET_BY_ID as Record<string, unknown>,
        ARCHETYPE_BY_ID as Record<string, unknown>,
        resolvePlaceId,
      );
      setView(v.view);
      setSelectedId(v.placeId);
      setActiveCollection(v.collectionId);
      setFilters(filterStateFromValidated(v));
      setCompareIds(new Set(v.compareIds));
      setRankingRaw(v.ranking ?? loadPersistedRanking());
      setClimateScenario(v.scenario ?? "now");
      // Units are a sticky global preference persisted by the UnitProvider.
      // Only honour an explicit unit param on the target entry — otherwise
      // Back/Forward to an entry created before a toggle (no temp/dist param)
      // would silently revert the user's choice and overwrite the saved value.
      if (v.temp) setTemp(v.temp);
      if (v.dist) setDist(v.dist);
      // Theme: an explicit ?theme= on the target entry wins. When the entry
      // doesn't carry one, fall back to localStorage / auto, mirroring the
      // first-paint resolution.
      if (v.theme) {
        setTheme(v.theme);
      } else {
        let persisted: string | null = null;
        try { persisted = window.localStorage.getItem(THEME_STORAGE_KEY); }
        catch { /* ignore */ }
        setTheme(resolveInitialTheme("", persisted));
      }
      setCompareOpen(v.compareIds.length >= 2);
      prevPlaceIdRef.current = v.placeId;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setTemp, setDist, setTheme]);

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

  const baselinePool = useMemo(() => {
    if (activeCollection) {
      const c = CURATED_SET_BY_ID[activeCollection];
      if (c) return c.placeIds.map(placeForId).filter(isPlace);
    }
    return PLACES;
  }, [activeCollection]);
  // The active climate-scenario layer reshapes the entire Explorer: ranking,
  // map, cards, compass, and analogs all run against the projected pool. `now`
  // returns the baseline pool unchanged (identity), so default behavior and the
  // bioclim/analog identity caches are untouched.
  const pool = useMemo(() => projectPool(baselinePool, climateScenario), [baselinePool, climateScenario]);

  const applyHeroQuickPick = useCallback((profile: RankingProfile) => {
    const bundleId = HERO_BUNDLE_BY_RANKING[profile];
    if (bundleId) {
      const bundle = lifestyleBundleById(bundleId);
      if (bundle) {
        applyLifestyleBundle(bundle, setRanking, setFilters);
        return;
      }
    }
    setRanking(profile);
  }, [setRanking, setFilters]);

  const isHeroQuickPickActive = useCallback((profile: RankingProfile) => {
    const bundleId = HERO_BUNDLE_BY_RANKING[profile];
    if (bundleId) {
      const bundle = lifestyleBundleById(bundleId);
      return bundle ? isBundleActive(bundle, ranking, filters) : ranking === profile;
    }
    return ranking === profile;
  }, [ranking, filters]);

  useEffect(() => {
    if (anyLifestyleBundleActive(ranking, filters)) return;
    if (countLiveFinderConstraintSignals(filters) > 0 && ranking !== "live-fit") {
      setRanking("live-fit");
    }
  }, [filters, ranking, setRanking]);

  const deferredFilters = useDeferredValue(filters);
  const filtered = useMemo(() => applyFilters(pool, deferredFilters), [pool, deferredFilters]);

  // Scenario-aware ranking runs through the climate-processor worker subsystem
  // (with a synchronous fallback). Both paths call the same pure orchestrator,
  // so the result is identical whether it lands on the worker or the main
  // thread; `rows` are mapped back onto the projected pool for display.
  const validatedFilters = useMemo(() => toValidatedFilterInput(deferredFilters), [deferredFilters]);
  const scenarioPoolIds = useMemo(
    () => activeCollection ? baselinePool.map(p => p.id) : undefined,
    [activeCollection, baselinePool],
  );
  const processor = useClimateProcessor({
    scenario: climateScenario,
    ranking,
    filters: validatedFilters,
    poolIds: scenarioPoolIds,
    // Present-day is the default view; only spin up the (corpus-carrying)
    // worker once the user engages a future-climate layer.
    disableWorker: climateScenario === "now",
  });
  // NB: `Map` is shadowed by the lucide-react `Map` icon imported above, so a
  // plain record is used to index the projected pool by id.
  const placesById = useMemo(() => {
    const rec: Record<string, Place> = {};
    for (const p of pool) rec[p.id] = p;
    return rec;
  }, [pool]);
  const ranked = useMemo<RankingResult[]>(() => {
    const out: RankingResult[] = [];
    for (const row of processor.rows) {
      const place = placesById[row.id];
      if (!place) continue;
      out.push(row.note != null ? { place, score: row.score, note: row.note } : { place, score: row.score });
    }
    return out;
  }, [processor.rows, placesById]);
  // The hero top-ten is decorative (lives below the map + cards). Defer it
  // so React can drop a stale render and let the higher-value updates above
  // commit first when the user is rapidly changing filters.
  const deferredFiltered = useDeferredValue(filtered);
  const livabilityTopTen = useMemo(
    () => rankLivabilityPreview(deferredFiltered).slice(0, 10),
    [deferredFiltered],
  );
  const sortTopFive = useMemo(() => ranked.slice(0, 5), [ranked]);
  const topRankedPlaceIds = useMemo(
    () => sortTopFive.map(row => row.place.id),
    [sortTopFive],
  );
  const rankingLabel = useMemo(
    () => RANKING_OPTIONS.find(o => o.id === ranking)?.label ?? ranking.replace(/-/g, " "),
    [ranking],
  );
  const scoutBrief = useMemo(
    () => buildExplorerScoutBrief(ranked, rankingLabel, deferredFilters),
    [ranked, rankingLabel, deferredFilters],
  );
  const contextStressRows = useMemo(
    () => buildContextStressRows({
      pool,
      currentRanked: ranked,
      currentFilters: deferredFilters,
      currentRanking: ranking,
      currentRankingLabel: rankingLabel,
    }),
    [pool, ranked, deferredFilters, ranking, rankingLabel],
  );
  const resonantWindow = useMemo(() => resonantWindowFor(ranking), [ranking]);
  const rankedRef = useRef(ranked);
  rankedRef.current = ranked;

  const selectedPlace = selectedId ? placeForId(selectedId) ?? null : null;
  const appShellOccluded = Boolean(selectedPlace) || compareOpen || showShortcuts;
  const placeDetailOccluded = compareOpen || showShortcuts;
  const compareViewOccluded = showShortcuts;
  useElementIsolation(appShellRef, appShellOccluded);

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
    preloadPlaceDetail();
    if (opts?.trigger) {
      detailTriggerRef.current = opts.trigger;
    } else if (typeof document !== "undefined") {
      detailTriggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    }
    const canonical = resolvePlaceId(id);
    if (canonical) {
      setRecentIds(recordRecentPlace(canonical));
    }
    setSelectedId(id);
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    const canonical = resolvePlaceId(id) ?? id;
    const { ids, pinned } = toggleBookmarkPersist(canonical);
    setBookmarkIds(new Set(ids));
    const place = PLACES_BY_ID[canonical];
    const placeName = place?.name ?? "Place";
    if (pinned && ids.length === BOOKMARK_LIMIT) {
      setTransientFeedback(
        `Pinned ${placeName}. Shortlist is at the ${BOOKMARK_LIMIT}-place cap — older pins drop off the tail.`,
      );
    } else if (pinned) {
      setTransientFeedback(`Pinned ${placeName} to your shortlist.`);
    } else {
      setTransientFeedback(`Removed ${placeName} from your shortlist.`);
    }
  }, []);

  const clearRecents = useCallback(() => {
    setRecentIds(clearRecentPlaces());
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
    preloadCompareView();
    setCompareOpen(true);
  }, []);

  const comparePlaces = useCallback((ids: string[]) => {
    if (ids.length > 0) preloadCompareView();
    setCompareIds(new Set(ids.slice(0, COMPARE_LIMIT)));
    setCompareOpen(ids.length > 0);
  }, []);

  const applyContextScenario = useCallback((id: ContextScenarioId) => {
    const scenario = CONTEXT_SCENARIO_BY_ID[id];
    setRanking(scenario.ranking);
    setFilters(f => filtersForContextScenario(f, scenario));
  }, [setRanking]);

  const pickArchetype = useCallback((a: MicroclimateArchetype) => {
    setFilters(f => ({ ...f, archetypes: new Set([a]) }));
    setActiveCollection(null);
    setViewFluid("explorer");
  }, [setViewFluid]);

  const clearCollection = useCallback(() => setActiveCollection(null), []);
  const clearArchetypes = useCallback(() => setFilters(f => ({ ...f, archetypes: new Set() })), []);
  const clearAllFilters = useCallback(() => {
    setFilters(createEmptyFilterState());
    setActiveCollection(null);
  }, []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);

  const focusSearchInput = useCallback(() => {
    const el = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    // Pre-select an existing query so a follow-up keystroke replaces it —
    // matches the standard command-palette / search-bar select-on-focus pattern.
    if (el.value && el.value.length > 0) {
      try { el.select(); } catch { /* noop */ }
    }
  }, []);

  const clearSearch = useCallback(() => {
    setFilters(f => (f.search ? { ...f, search: "" } : f));
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

  const toggleBookmarkSelected = useCallback(() => {
    if (!selectedId) return;
    toggleBookmark(selectedId);
  }, [selectedId, toggleBookmark]);

  useKeyboardShortcuts({
    view,
    showShortcuts,
    compareOpen,
    selectedId,
    explorerDockLg,
    setView: setViewFluid,
    setShowShortcuts,
    setCompareOpen,
    closeDetail,
    focusSearchInput,
    openFilterSheet,
    pickRandomPlace,
    onRandomEmpty,
    toggleBookmarkSelected,
    searchInputId: SEARCH_INPUT_ID,
    clearSearch,
  });
  const onOpenPlaceFromSubview = useCallback((id: string) => { openPlace(id); setViewFluid("explorer"); }, [openPlace, setViewFluid]);
  const onOpenPlaceFromTrips = useCallback((id: string, opts?: { trigger?: HTMLElement | null }) => {
    openPlace(id, opts);
  }, [openPlace]);
  const onPickCollection = useCallback((id: string) => {
    setActiveCollection(a => a === id ? null : id);
    setViewFluid("explorer");
  }, [setViewFluid]);
  const onPickTripTheme = onPickCollection;

  const surpriseMe = useCallback(() => {
    if (!pickRandomPlace()) onRandomEmpty();
  }, [pickRandomPlace, onRandomEmpty]);

  return (
    <div className="relative min-h-screen flex flex-col text-ice overflow-x-hidden">
      <div ref={appShellRef} data-app-shell className="relative z-10 flex flex-col flex-1 min-h-0">
        <a
          href="#main-content"
          className="skip-to-main focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,143,168,0.55)] focus-visible:ring-offset-2"
        >
          Skip to main content
        </a>
        <div className="ambient-aurora" aria-hidden="true" />
        <div id="main-content" role="main" tabIndex={-1} className="relative z-10 flex flex-col flex-1 min-h-0 outline-none">
      <TopBar
        view={view}
        setView={setViewFluid}
        onOpenCompare={openCompare}
        onPreloadCompare={preloadCompareView}
        compareCount={compareIds.size}
        themePreference={themePreference}
        onThemeChange={setTheme}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] w-full mx-auto">
        <div key={view} className="view-enter flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
          {view === "explorer" && (
            <>
              <div className="tc-explorer-main flex-1 min-w-0 flex flex-col gap-4">
                <HeroCard
                  count={ranked.length}
                  livabilityTopTen={livabilityTopTen}
                  sortTopFive={sortTopFive}
                  ranking={ranking}
                  rankingLabel={rankingLabel}
                  onOpenPlace={openPlace}
                  activeCollection={activeCollection}
                  onClearCollection={clearCollection}
                  activeArchetypes={filters.archetypes}
                  onClearArchetypes={clearArchetypes}
                  onSurpriseMe={surpriseMe}
                  canSurprise={ranked.length > 0}
                  filters={filters}
                  onCopyView={copyCurrentView}
                  shareStatus={shareStatus}
                  scoutBrief={scoutBrief}
                  contextStressRows={contextStressRows}
                  onCompareLeaders={comparePlaces}
                  onCompareContextLeaders={comparePlaces}
                  onPreloadCompare={preloadCompareView}
                  onApplyContextScenario={applyContextScenario}
                  bookmarkIds={bookmarkIds}
                  recentIds={recentIds}
                  onToggleBookmark={toggleBookmark}
                  onClearRecents={clearRecents}
                  onApplyQuickPick={applyHeroQuickPick}
                  isQuickPickActive={isHeroQuickPickActive}
                  showDesktopScoutBoard={scoutBoardLg}
                />

                <div className="tc-map-stage relative h-[clamp(320px,50svh,560px)] md:h-[54dvh] md:min-h-[min(480px,46dvh)]">
                  <div className="tc-map-stage__caption" aria-hidden="true">
                    <span>Rank trail</span>
                    <strong title={`${rankingLabel} · top ${topRankedPlaceIds.length}`}>
                      {rankingLabel} · top {topRankedPlaceIds.length}
                    </strong>
                  </div>
                  <AtlasMap
                    places={filtered}
                    selectedId={selectedId ?? undefined}
                    featuredIds={topRankedPlaceIds}
                    onSelect={openPlace}
                  />
                </div>

                <section className="hidden md:grid grid-cols-3 gap-3 tc-reader-path" aria-labelledby="reader-path-heading">
                  <h2 id="reader-path-heading" className="sr-only">How to read Terraclima</h2>
                  <div>
                    <div className="tc-reader-path__label">Scout</div>
                    <p>Open any pin or card for a profile that reads like a field notebook: story first, then charts, risks, soil, sources, and similar places.</p>
                  </div>
                  <div>
                    <div className="tc-reader-path__label">Compare</div>
                    <p>Use Rank by, filters, Surprise, and four-place compare to move from a continental view to a short list worth reading closely.</p>
                  </div>
                  <div>
                    <div className="tc-reader-path__label">Trust</div>
                    <p>Scores are screening signals. Confidence notes, citations, and geospatial methods stay visible so readers and agents can audit the trail.</p>
                  </div>
                </section>

                <ClimateScenarioControl
                  scenario={climateScenario}
                  onChange={setClimateScenario}
                  projecting={processor.projecting}
                />

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
                      className={`tc-header-help-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgba(26,143,168,0.55)] ${shortcutsSeen ? "" : "tc-shortcuts-pulse"}`}
                      aria-label="Show keyboard shortcuts"
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden /> Shortcuts
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={openShortcutsHelp}
                    className={`md:hidden tc-header-help-btn tc-header-help-btn--touch ${shortcutsSeen ? "" : "tc-shortcuts-pulse"}`}
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
                    <EmptyResults
                      onClear={clearAllFilters}
                      searchTerm={(filters.search ?? "").trim()}
                      otherFilterCount={
                        countActiveExplorerFilterSignals(filters) - ((filters.search?.length ?? 0) > 0 ? 1 : 0)
                      }
                    />
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
                      onPreloadPlaceDetail={preloadPlaceDetail}
                      onPreloadCompare={preloadCompareView}
                      compareIds={compareIds}
                      resonantWindow={resonantWindow}
                      liveFitFilters={filters}
                      rankingLabel={rankingLabel}
                      bookmarkIds={bookmarkIds}
                      onBookmarkToggle={toggleBookmark}
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
                <aside className="tc-explorer-dock w-[340px] shrink-0 flex flex-col gap-4" aria-label="Explorer filters and atlas footprint">
                  <FilterBar
                    searchInputId={SEARCH_INPUT_ID}
                    filters={filters}
                    setFilters={setFilters}
                    ranking={ranking}
                    setRanking={setRanking}
                  />
                  <FootprintPanel />
                </aside>
              ) : null}
            </>
          )}

          {view === "trips" && (
            <div className="flex-1 min-w-0">
              <div className="max-w-6xl mx-auto">
                <Suspense fallback={<RouteLoadingFallback label="Loading Climate Trips" />}>
                  <ClimateTripsView
                    onOpenPlace={onOpenPlaceFromTrips}
                    onPickTripTheme={onPickTripTheme}
                    onComparePlaces={comparePlaces}
                    onPreloadPlaceDetail={preloadPlaceDetail}
                    onPreloadCompare={preloadCompareView}
                    activeThemeId={activeCollection && CLIMATE_TRIP_THEME_BY_ID[activeCollection] ? activeCollection : undefined}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {view === "collections" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5 tc-page-intro">
                  <div className="text-xs uppercase tracking-wider text-stone">Curated</div>
                  <h2 className="font-atlas text-3xl text-ice text-depth-hero mt-0.5">Collections</h2>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    Hand-assembled routes through the atlas: rain shadows, sky islands, eternal springs, lake snowbelts, and other climate families. Pin one to narrow the map.
                  </p>
                </div>
                <Suspense fallback={<RouteLoadingFallback label="Loading Collections" />}>
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
                <div className="mb-5 tc-page-intro tc-page-intro--sage">
                  <div className="text-xs uppercase tracking-wider text-stone">Learn</div>
                  <h2 className="font-atlas text-3xl text-ice text-depth-hero mt-0.5">Field guide</h2>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    Microclimate has a grammar. Lapse rate, cold-air pooling, orographic lift, and thermal belts give readers and agents the words to explain why a place feels unlike its neighbors.
                  </p>
                </div>
                <Suspense fallback={<RouteLoadingFallback label="Loading Learn" />}>
                  <LearnMode onOpenPlace={onOpenPlaceFromSubview} />
                </Suspense>
              </div>
            </div>
          )}
        </div>
        {view === "explorer" && !explorerDockLg ? (
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
        ) : null}
      </div>

      <Footer />

        </div>
      </div>

      {selectedPlace ? (
        <Suspense fallback={<OverlayLoadingFallback label={`Loading ${selectedPlace.name}`} />}>
          <PlaceDetail
            place={selectedPlace}
            onClose={closeDetail}
            onCompareToggle={toggleCompare}
            inCompareIds={compareIds}
            onPickArchetype={pickArchetype}
            onOpenPlace={openPlace}
            liveFitFilters={filters}
            bookmarked={selectedPlace ? bookmarkIds.has(selectedPlace.id) : false}
            onBookmarkToggle={toggleBookmark}
            occluded={placeDetailOccluded}
          />
        </Suspense>
      ) : null}
      {compareOpen ? (
        <Suspense fallback={<OverlayLoadingFallback label="Loading compare" />}>
          <CompareView
            places={[...compareIds].map(placeForId).filter(isPlace)}
            open={compareOpen}
            onClose={closeCompare}
            onRemove={toggleCompare}
            onOpenPlace={id => {
              closeCompare();
              openPlace(id);
            }}
            onCopyView={copyCurrentView}
            shareStatus={shareStatus}
            liveFitFilters={filters}
            occluded={compareViewOccluded}
          />
        </Suspense>
      ) : null}

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

function RouteLoadingFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="panel-thin p-4 text-sm text-stone-readable">
      {label}...
    </div>
  );
}

function OverlayLoadingFallback({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none" aria-live="polite">
      <div role="status" className="panel p-4 text-sm text-stone-readable shadow-2xl">
        {label}...
      </div>
    </div>
  );
}

const EmptyResults = memo(function EmptyResults({
  onClear,
  searchTerm,
  otherFilterCount,
}: {
  onClear: () => void;
  searchTerm: string;
  otherFilterCount: number;
}) {
  // Tailor the message to what is actually narrowing the set so the guidance
  // points at the right control instead of always blaming "filters".
  const searchOnly = searchTerm.length > 0 && otherFilterCount === 0;
  const filtersOnly = searchTerm.length === 0 && otherFilterCount > 0;

  const heading = searchOnly
    ? `No places match “${searchTerm}”`
    : filtersOnly
      ? "Nothing matches those filters at once"
      : "Nothing matches that search and those filters";

  const body = searchOnly
    ? "Try a shorter or different term — names, regions, archetypes, and Köppen codes all match, and accents are forgiving (“san jose” finds San José)."
    : filtersOnly
      ? "That's a tight intersection — try loosening one. Drop a country, drop one of the archetypes, or relax a Live-Finder limit."
      : "That's a tight combination — try shortening the search or loosening one filter. Names, regions, archetypes, and Köppen codes all match.";

  return (
    <div className="col-span-full panel-warm tc-empty-results p-6 sm:p-7 text-center anim-fade-in">
      <div className="tc-empty-results__icon">
        <Search className="w-4 h-4 tc-icon-ochre" aria-hidden />
      </div>
      <h3 className="font-atlas text-lg text-ice mb-1">{heading}</h3>
      <p className="text-sm text-frost mb-2 max-w-md mx-auto">{body}</p>
      <p className="text-xs text-stone mb-4 max-w-md mx-auto">
        Nothing is broken: the atlas still holds <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> curated stops behind the filters.
      </p>
      <button type="button" onClick={onClear} className="btn-primary !text-xs">
        <X className="w-3.5 h-3.5" aria-hidden /> {searchOnly ? "Clear search" : "Clear all filters"}
      </button>
    </div>
  );
});

const TopBar = memo(function TopBar({
  view,
  setView,
  onOpenCompare,
  onPreloadCompare,
  compareCount,
  themePreference,
  onThemeChange,
}: {
  view: View;
  setView: (v: View) => void;
  onOpenCompare: () => void;
  onPreloadCompare: () => void;
  compareCount: number;
  themePreference: ThemePreference;
  onThemeChange: (next: ThemePreference) => void;
}) {
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
  const compareAriaLabel = `Open compare (${compareCount} ${compareCount === 1 ? "place" : "places"})`;

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
          <NavBtn active={view === "trips"} onClick={() => setView("trips")} icon={<Route className="w-3.5 h-3.5" />} label="Trips" />
          <NavBtn active={view === "collections"} onClick={() => setView("collections")} icon={<Library className="w-3.5 h-3.5" />} label="Collections" />
          <NavBtn active={view === "learn"} onClick={() => setView("learn")} icon={<Compass className="w-3.5 h-3.5" />} label="Learn" />

          <TempToggle className="ml-1" />
          <ThemeToggle preference={themePreference} onChange={onThemeChange} compact />

          {compareCount > 0 && (
            <button
              type="button"
              onClick={onOpenCompare}
              onPointerEnter={onPreloadCompare}
              onFocus={onPreloadCompare}
              onPointerDown={onPreloadCompare}
              className="btn-primary !text-xs !py-1.5"
              aria-label={compareAriaLabel}
            >
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
            aria-hidden="true"
            tabIndex={-1}
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
              <NavBtn stretch active={view === "trips"} onClick={() => pickView("trips")} icon={<Route className="w-4 h-4" />} label="Trips" />
              <NavBtn stretch active={view === "collections"} onClick={() => pickView("collections")} icon={<Library className="w-4 h-4" />} label="Collections" />
              <NavBtn stretch active={view === "learn"} onClick={() => pickView("learn")} icon={<Compass className="w-4 h-4" />} label="Learn" />

              <div className="pt-1">
                <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5 px-0.5">Units</div>
                <TempToggle stretch onAfterChange={closeMenu} />
              </div>

              <div className="pt-1">
                <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5 px-0.5">Theme</div>
                <ThemeToggle preference={themePreference} onChange={onThemeChange} />
              </div>

              {compareCount > 0 ? (
                <button
                  type="button"
                  onPointerEnter={onPreloadCompare}
                  onFocus={onPreloadCompare}
                  onPointerDown={onPreloadCompare}
                  onClick={() => {
                    closeMenu();
                    onOpenCompare();
                  }}
                  className="btn-primary w-full justify-center !py-2.5 mt-1"
                  aria-label={compareAriaLabel}
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
      className={`tc-nav-btn${stretch ? " tc-nav-btn--stretch" : ""}${active ? " tc-nav-btn--active" : ""}`}
    >
      {icon} {label}
    </button>
  );
});

const QuickPick = memo(function QuickPick({ icon: Icon, label, onClick, active }: { icon: LucideIcon; label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hero-quick-pick${active ? " hero-quick-pick--active" : ""}`}
      aria-pressed={active}
    >
      <Icon className="hero-quick-pick__icon" aria-hidden />
      <span>{label}</span>
    </button>
  );
});


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

type SignatureLeader = RankingResult & { signature: PlaceVisualSignature };

const ClimateSignalRail = memo(function ClimateSignalRail({
  rows,
  rankingLabel,
  onOpenPlace,
}: {
  rows: readonly SignatureLeader[];
  rankingLabel: string;
  onOpenPlace: (id: string) => void;
}) {
  const prose = useProse();
  const visibleRows = rows.slice(0, 5);
  const leader = visibleRows[0];
  if (!leader) return null;

  return (
    <section
      className="climate-signal-rail"
      style={{ ["--signature-rgb" as string]: leader.signature.mapAccentRgb }}
      aria-label={`Current ${rankingLabel} climate signal leaders`}
    >
      <div className="climate-signal-rail__head">
        <span>Climate signal</span>
        <strong>{rankingLabel}</strong>
      </div>
      <div className="climate-signal-rail__beam" aria-hidden="true">
        {visibleRows.map(row => (
          <span
            key={row.place.id}
            style={{ ["--signature-rgb" as string]: row.signature.mapAccentRgb }}
          />
        ))}
      </div>
      <div className="climate-signal-rail__grid">
        {visibleRows.map((row, i) => (
          <button
            key={row.place.id}
            type="button"
            onClick={() => onOpenPlace(row.place.id)}
            className="climate-signal-rail__chip"
            style={{ ["--signature-rgb" as string]: row.signature.mapAccentRgb }}
            aria-label={`Open ${row.place.name}, climate signal rank ${i + 1} by ${rankingLabel}`}
          >
            <span className="climate-signal-rail__rank" aria-hidden>{i + 1}</span>
            <span className="climate-signal-rail__copy">
              <span className="climate-signal-rail__place" title={row.place.name}>{row.place.name}</span>
              <span className="climate-signal-rail__note" title={row.note ? prose(row.note) : row.signature.primaryBlurb}>
                {row.note ? prose(row.note) : row.signature.primaryLabel}
              </span>
            </span>
            <span className="climate-signal-rail__score font-mono-num" aria-hidden>{Math.round(row.score)}</span>
          </button>
        ))}
      </div>
    </section>
  );
});

const HeroCard = memo(function HeroCard({
  count,
  livabilityTopTen,
  sortTopFive,
  ranking,
  rankingLabel,
  onOpenPlace,
  activeCollection,
  onClearCollection,
  activeArchetypes,
  onClearArchetypes,
  onSurpriseMe,
  canSurprise,
  filters,
  onCopyView,
  shareStatus,
  scoutBrief,
  contextStressRows,
  onCompareLeaders,
  onCompareContextLeaders,
  onPreloadCompare,
  onApplyContextScenario,
  bookmarkIds,
  recentIds,
  onToggleBookmark,
  onClearRecents,
  onApplyQuickPick,
  isQuickPickActive,
  showDesktopScoutBoard,
}: {
  count: number;
  livabilityTopTen: RankingResult[];
  sortTopFive: RankingResult[];
  ranking: RankingProfile;
  rankingLabel: string;
  onOpenPlace: (id: string) => void;
  activeCollection: string | null;
  onClearCollection: () => void;
  activeArchetypes: Set<MicroclimateArchetype>;
  onClearArchetypes: () => void;
  onSurpriseMe: () => void;
  canSurprise: boolean;
  filters: FilterState;
  onCopyView: () => void;
  shareStatus: ShareStatus;
  scoutBrief: ExplorerScoutBrief | null;
  contextStressRows: ContextStressRow[];
  onCompareLeaders: (ids: string[]) => void;
  onCompareContextLeaders: (ids: string[]) => void;
  onPreloadCompare: () => void;
  onApplyContextScenario: (id: ContextScenarioId) => void;
  bookmarkIds: Set<string>;
  recentIds: readonly string[];
  onToggleBookmark: (id: string) => void;
  onClearRecents: () => void;
  onApplyQuickPick: (r: RankingProfile) => void;
  isQuickPickActive: (r: RankingProfile) => boolean;
  showDesktopScoutBoard: boolean;
}) {
  const prose = useProse();
  const active = activeCollection ? CURATED_SET_BY_ID[activeCollection] ?? null : null;
  const liveSignalCount = (filters.fitPresets?.size ?? 0) + [
    filters.maxSummerHighC,
    filters.minWinterLowC,
    filters.minGrowability,
    filters.maxFireRisk,
    filters.maxOverallRisk,
  ].filter(v => v != null).length;
  const signatureLeaders = useMemo<SignatureLeader[]>(
    () => sortTopFive.map(row => ({ ...row, signature: getPlaceVisualSignature(row.place) })),
    [sortTopFive],
  );
  const heroAccentRgb = signatureLeaders[0]?.signature.mapAccentRgb ?? "94, 196, 220";
  return (
    <div
      className="panel panel-hero p-4 sm:p-5 anim-fade-in space-y-3 min-[1400px]:space-y-4"
      style={{ ["--hero-accent-rgb" as string]: heroAccentRgb }}
    >
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 min-[1400px]:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Sparkles className="w-3.5 h-3.5 tc-icon-ochre" aria-hidden />
            <span className="text-xs uppercase tracking-wider text-stone-readable">
              {active
                ? active.kind === "trip" ? "Trip pinned" : "Collection pinned"
                : liveSignalCount > 0
                  ? `Live Finder · ${liveSignalCount} signal${liveSignalCount > 1 ? "s" : ""}`
                  : activeArchetypes.size > 0
                    ? `Filtered by ${activeArchetypes.size} archetype${activeArchetypes.size > 1 ? "s" : ""}`
                    : "Explorer"}
            </span>
            {active && (
              <button type="button" onClick={onClearCollection} className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice">
                <X className="w-3 h-3" aria-hidden /> Clear {active.kind === "trip" ? "trip" : "collection"}
              </button>
            )}
            {!active && activeArchetypes.size > 0 && (
              <button type="button" onClick={onClearArchetypes} className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice">
                <X className="w-3 h-3" aria-hidden /> Clear archetypes
              </button>
            )}
          </div>
          <h1 className="font-atlas text-2xl min-[1400px]:text-3xl text-ice leading-tight text-depth-hero">
            {active ? active.title : "Read the continent by its microclimates"}
          </h1>
          <p className="text-sm text-frost mt-1 max-w-2xl leading-relaxed line-clamp-4 min-[1400px]:line-clamp-none">
            {active
              ? active.description
              : "Trace rain shadows, sky islands, orchard valleys, and cool coasts. Each profile ties weather to terrain, season, and lived place."}
          </p>

          {/* Lifestyle quick-picks — instant one-click ranking presets */}
          {!active && (
            <div className="hero-quick-picks mt-3" role="group" aria-label="Quick ranking presets">
              <QuickPick icon={CalendarDays} label="Best this month" onClick={() => onApplyQuickPick("best-this-month")} active={isQuickPickActive("best-this-month")} />
              <QuickPick icon={Sun} label="Comfort" onClick={() => onApplyQuickPick("most-comfortable")} active={isQuickPickActive("most-comfortable")} />
              <QuickPick icon={Laptop} label="Remote work" onClick={() => onApplyQuickPick("best-for-remote-work")} active={isQuickPickActive("best-for-remote-work")} />
              <QuickPick icon={Sunrise} label="Retirement" onClick={() => onApplyQuickPick("best-retirement")} active={isQuickPickActive("best-retirement")} />
              <QuickPick icon={Sprout} label="Garden life" onClick={() => onApplyQuickPick("best-growability")} active={isQuickPickActive("best-growability")} />
              <QuickPick icon={Snowflake} label="Snow country" onClick={() => onApplyQuickPick("coolest-summers")} active={isQuickPickActive("coolest-summers")} />
              <QuickPick icon={ShieldCheck} label="Low risk" onClick={() => onApplyQuickPick("climate-resilient")} active={isQuickPickActive("climate-resilient")} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onCopyView}
            className={`btn-ghost !text-xs !py-1.5 w-full sm:w-auto border-[rgba(122,212,240,0.35)] ${shareStatus === "failed" ? "!border-[rgba(232,90,50,0.45)] !text-ember-700" : ""}`}
            aria-label="Copy current Explorer view"
            title="Copy a URL with the current filters, ranking, and selected place"
          >
            <Link2 className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
            <span aria-live="polite">
              {shareStatus === "copied" ? "Link copied" : shareStatus === "failed" ? "Copy failed" : "Copy view"}
            </span>
          </button>
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

      {signatureLeaders.length > 0 ? (
        <ClimateSignalRail
          rows={signatureLeaders}
          rankingLabel={rankingLabel}
          onOpenPlace={onOpenPlace}
        />
      ) : null}

      {signatureLeaders.length > 0 ? (
        <LivingCompassWorkbench
          rows={signatureLeaders}
          ranking={ranking}
          rankingLabel={rankingLabel}
          filters={filters}
          scoutBrief={scoutBrief}
          onOpenPlace={onOpenPlace}
        />
      ) : null}

      {scoutBrief && showDesktopScoutBoard ? (
        <DesktopScoutBoard
          brief={scoutBrief}
          onOpenPlace={onOpenPlace}
        />
      ) : null}

      {scoutBrief ? (
        <ScoutBriefPanel
          brief={scoutBrief}
          onOpenPlace={onOpenPlace}
          onCompareLeaders={onCompareLeaders}
          onPreloadCompare={onPreloadCompare}
        />
      ) : null}

      {contextStressRows.length > 1 ? (
        <ContextStressPanel
          rows={contextStressRows}
          onOpenPlace={onOpenPlace}
          onCompareContextLeaders={onCompareContextLeaders}
          onPreloadCompare={onPreloadCompare}
          onApplyContextScenario={onApplyContextScenario}
        />
      ) : null}

      {livabilityTopTen.length > 0 ? (
        <div className="hero-top-ten px-3 py-2.5 sm:px-4 min-[1400px]:py-3 space-y-2.5 min-[1400px]:space-y-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-sage-700">Livability lens · top ten</div>
            <p className="hidden min-[1400px]:block text-xs text-stone-readable mt-1 leading-relaxed max-w-3xl">
              Same filtered pool as the map and cards. This row is <span className="font-medium text-frost">always</span> sorted by our published blend — not by whatever you picked in Rank by.
            </p>
            <div className="mt-2 hidden min-[1400px]:flex flex-wrap items-center gap-1.5 text-[10px] text-stone-readable" aria-label="Livability blend weights (v3)">
              <span className="livability-weight-pill" title="Blends the thermal plateau, warm-night recovery, year-round usable-month runway, sky/dampness, and curated comfort.">Felt comfort {Math.round(LIVABILITY_WEIGHTS.thermalComfort * 100)}%</span>
              <span className="livability-weight-pill" title="Sky, wind exposure, humidity or arid-air strain, smoke/air, and solar burden.">Atmosphere {Math.round(LIVABILITY_WEIGHTS.atmosphericEase * 100)}%</span>
              <span className="livability-weight-pill" title="0.6 × mean-of-9 + 0.4 × max-of-9 — surfaces tail risk that an averaged hazard score would hide.">Hazard cushion {Math.round(LIVABILITY_WEIGHTS.hazardCushion * 100)}%</span>
              <span className="livability-weight-pill">Resilience {Math.round(LIVABILITY_WEIGHTS.resilience * 100)}%</span>
              <span className="livability-weight-pill">Growability {Math.round(LIVABILITY_WEIGHTS.growability * 100)}%</span>
              <span className="livability-weight-pill" title="U-shaped penalty: full marks 700..1500 mm/yr; both arid (<300) and saturated (>2500) reduce the score.">Precip moderation {Math.round(LIVABILITY_WEIGHTS.precipModeration * 100)}%</span>
              <span className="livability-weight-pill" title="Curated cost, social-fabric, and daily-services friction.">Lived friction {Math.round(LIVABILITY_WEIGHTS.livedFriction * 100)}%</span>
              <span className="livability-weight-pill" title="Derived actual-place read from sensory comfort, daily ease, place identity, and scouting clarity.">Place feel {Math.round(LIVABILITY_WEIGHTS.placeFeel * 100)}%</span>
            </div>
            <p className="hidden min-[1400px]:block mt-1.5 text-[10px] text-stone-readable/85 italic">
              v3 livability lens — felt comfort, atmosphere, usable-month runway, hazard cushion, precip moderation, lived friction, and place feel. Editorial triage for exploration, not appraisal or medical heat-stress advice.
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

        </div>
      ) : null}

      <PinnedAndRecentRails
        bookmarkIds={bookmarkIds}
        recentIds={recentIds}
        onOpenPlace={onOpenPlace}
        onToggleBookmark={onToggleBookmark}
        onClearRecents={onClearRecents}
      />

      <div className="hidden min-[1400px]:block">
        <FieldNoteStrip />
      </div>
    </div>
  );
});

type LivabilityComponentKey = LivabilityResult["components"][number]["key"];

const COMPASS_AXIS_KEYS: Array<{ key: LivabilityComponentKey; label: string }> = [
  { key: "thermalComfort", label: "Comfort" },
  { key: "atmosphericEase", label: "Air" },
  { key: "hazardCushion", label: "Risk" },
  { key: "resilience", label: "Resilience" },
  { key: "growability", label: "Land" },
  { key: "placeFeel", label: "Feel" },
];

function livabilityComponentValue(result: LivabilityResult, key: LivabilityComponentKey): number {
  return result.components.find(component => component.key === key)?.value ?? 0;
}

function radarPoint(index: number, total: number, value: number, radius = 42): string {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  const scaled = radius * Math.max(0, Math.min(100, value)) / 100;
  const x = 50 + Math.cos(angle) * scaled;
  const y = 50 + Math.sin(angle) * scaled;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function radarPolygon(values: readonly number[]): string {
  return values.map((value, index) => radarPoint(index, values.length, value)).join(" ");
}

function scoreTone(score: number): "great" | "good" | "mixed" | "hard" {
  if (score >= 84) return "great";
  if (score >= 72) return "good";
  if (score >= 58) return "mixed";
  return "hard";
}

const LivingCompassWorkbench = memo(function LivingCompassWorkbench({
  rows,
  ranking,
  rankingLabel,
  filters,
  scoutBrief,
  onOpenPlace,
}: {
  rows: SignatureLeader[];
  ranking: RankingProfile;
  rankingLabel: string;
  filters: FilterState;
  scoutBrief: ExplorerScoutBrief | null;
  onOpenPlace: (id: string) => void;
}) {
  const prose = useProse();
  const leader = scoutBrief?.leader ?? rows[0] ?? null;
  const leaderSignature = useMemo(() => {
    if (!leader) return null;
    return rows.find(row => row.place.id === leader.place.id)?.signature ?? getPlaceVisualSignature(leader.place);
  }, [leader, rows]);
  const leaderLivability = useMemo(() => leader ? scoreLivability(leader.place) : null, [leader]);
  const leaderLiveFit = useMemo(() => leader ? assessLiveFit(leader.place, filters) : null, [leader, filters]);
  const leaderDecision = useMemo(
    () => leader ? scoutBrief?.decisionRows.find(row => row.place.id === leader.place.id) ?? null : null,
    [leader, scoutBrief],
  );
  const axes = useMemo(() => {
    if (!leaderLivability) return [];
    return COMPASS_AXIS_KEYS.map(axis => ({
      ...axis,
      value: Math.round(livabilityComponentValue(leaderLivability, axis.key)),
    }));
  }, [leaderLivability]);
  const rankRows = useMemo(() => rows.map(row => ({
    ...row,
    liveFit: assessLiveFit(row.place, filters),
    decision: scoutBrief?.decisionRows.find(decision => decision.place.id === row.place.id) ?? null,
  })), [rows, filters, scoutBrief]);

  if (!leader || !leaderSignature || !leaderLivability || !leaderLiveFit) return null;

  const radarValues = axes.map(axis => axis.value);
  const leaderReason = leaderLiveFit.reasons[0] ?? leader.note ?? `${Math.round(leader.score)}/100 current ranking signal.`;
  const leaderWatch = leaderDecision?.watch ?? leaderLiveFit.cautions[0] ?? `Verify ${leaderSignature.verify.shortLabel.toLowerCase()} before deciding.`;
  const leaderBestFor = leaderDecision?.bestFor ?? leaderReason;

  return (
    <section
      className="living-compass"
      style={{ ["--signature-rgb" as string]: leaderSignature.mapAccentRgb }}
      aria-labelledby="living-compass-title"
    >
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {ranking === "live-fit"
          ? `Live-fit leader: ${leader.place.name}, score ${leaderLiveFit.score} out of 100.`
          : `Top match for ${rankingLabel}: ${leader.place.name}, ranking score ${Math.round(leader.score)}.`}
      </p>
      <div className="living-compass__leader">
        <div className="living-compass__leader-copy">
          <div id="living-compass-title" className="living-compass__eyebrow">Would I live here?</div>
          <h2 className="living-compass__place">{leader.place.name}</h2>
          <p className="living-compass__best-for">{prose(leaderBestFor)}</p>
          <div className="living-compass__meta-row" aria-label={`${leader.place.name} live-here summary`}>
            <span>{leaderSignature.primaryLabel}</span>
            <span>{leaderSignature.feelBand} feel {leaderSignature.feelScore}</span>
            <span>{leader.place.country === "USA" ? "US" : leader.place.country === "Canada" ? "CA" : "MX"} · {leader.place.koppen}</span>
          </div>
        </div>

        <div
          className="living-compass__score-ring"
          data-tone={scoreTone(leaderLiveFit.score)}
          style={{ ["--score" as string]: `${leaderLiveFit.score}%` }}
          aria-label={`Live-here fit ${leaderLiveFit.score} out of 100`}
        >
          <span>{leaderLiveFit.score}</span>
          <small>fit</small>
        </div>
      </div>

      <div className="living-compass__body">
        <div className="living-compass__radar-panel">
          <svg className="living-compass__radar" viewBox="0 0 100 100" aria-hidden="true">
            {[25, 50, 75, 100].map(value => (
              <polygon key={value} points={radarPolygon(axes.map(() => value))} />
            ))}
            {axes.map((_axis, index) => {
              const [x, y] = radarPoint(index, axes.length, 100).split(",").map(Number);
              return <line key={index} x1="50" y1="50" x2={x} y2={y} />;
            })}
            <polygon className="living-compass__radar-fill" points={radarPolygon(radarValues)} />
            <circle cx="50" cy="50" r="2.2" />
          </svg>
          <div className="living-compass__axis-list">
            {axes.map(axis => (
              <div key={axis.key} className="living-compass__axis">
                <span>{axis.label}</span>
                <span className="font-mono-num">{axis.value}</span>
                <i aria-hidden><b style={{ width: `${axis.value}%` }} /></i>
              </div>
            ))}
          </div>
        </div>

        <div className="living-compass__watch">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span><strong>Watch:</strong> {prose(leaderWatch)}</span>
        </div>
      </div>

      <div className="living-compass__shortlist">
        <div className="living-compass__shortlist-head">
          <div className="living-compass__eyebrow">Current rank</div>
          <p>Leading matches by <span>{rankingLabel}</span>.</p>
        </div>

        <div
          className="living-compass__rank-list"
          aria-label={`Top five places for the selected ranking profile: ${rankingLabel}`}
        >
          {rankRows.map((row, i) => (
            <button
              key={row.place.id}
              type="button"
              className="living-compass__rank-row"
              style={{ ["--signature-rgb" as string]: row.signature.mapAccentRgb }}
              onClick={() => onOpenPlace(row.place.id)}
              aria-label={`Rank ${i + 1}. ${row.place.name}. Score ${Math.round(row.score)}. Open place profile.`}
            >
              <span className="living-compass__rank-number" aria-hidden>{i + 1}</span>
              <span className="living-compass__rank-main">
                <span className="living-compass__rank-name" title={row.place.name}>{row.place.name}</span>
                <span className="living-compass__rank-note" title={row.note ? prose(row.note) : undefined}>
                  {row.note ? prose(row.note) : row.signature.primaryLabel}
                </span>
                <span className="living-compass__rank-caveat">
                  Watch {prose(row.decision?.watch ?? row.signature.verify.shortLabel)}
                </span>
              </span>
              <span className="living-compass__rank-meter" aria-hidden>
                <span className="font-mono-num">{row.liveFit.score}</span>
                <i><b style={{ width: `${row.liveFit.score}%` }} /></i>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});

const PinnedAndRecentRails = memo(function PinnedAndRecentRails({
  bookmarkIds,
  recentIds,
  onOpenPlace,
  onToggleBookmark,
  onClearRecents,
}: {
  bookmarkIds: Set<string>;
  recentIds: readonly string[];
  onOpenPlace: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onClearRecents: () => void;
}) {
  const pinnedPlaces = useMemo(
    () => [...bookmarkIds].map(placeForId).filter(isPlace),
    [bookmarkIds],
  );
  const recentPlaces = useMemo(
    () =>
      recentIds
        .map(placeForId)
        .filter(isPlace)
        // Don't repeat a pinned place in the recent rail — pins already live
        // in the row above and visual duplication makes the surface noisier.
        .filter(p => !bookmarkIds.has(p.id))
        .slice(0, 6),
    [recentIds, bookmarkIds],
  );

  if (pinnedPlaces.length === 0 && recentPlaces.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {pinnedPlaces.length > 0 ? (
        <section aria-labelledby="hero-pinned-title">
          <div className="hero-mini-rail__header flex items-center justify-between gap-2">
            <span id="hero-pinned-title" className="hero-mini-rail__title flex items-center gap-1.5">
              <BookmarkCheck className="w-3 h-3 text-ochre-700" aria-hidden />
              Your shortlist · {pinnedPlaces.length}
            </span>
            <ShortlistExportMenu places={pinnedPlaces} />
          </div>
          <ul
            className="hero-mini-rail"
            aria-label="Pinned places — click to open, × to remove"
          >
            {pinnedPlaces.map(p => (
              <li key={p.id} className="hero-mini-rail__chip" data-tone="ochre">
                <button
                  type="button"
                  className="bg-transparent border-0 p-0 m-0 inline-flex items-center gap-1.5 cursor-pointer text-left min-w-0"
                  onClick={() => onOpenPlace(p.id)}
                  aria-label={`Open ${p.name} from your shortlist`}
                >
                  <span className="hero-mini-rail__chip-name">{p.name}</span>
                  <span className="hero-mini-rail__chip-meta">{p.country === "USA" ? "US" : p.country === "Canada" ? "CA" : "MX"}</span>
                </button>
                <button
                  type="button"
                  className="hero-mini-rail__chip-remove bg-transparent border-0 cursor-pointer"
                  onClick={() => onToggleBookmark(p.id)}
                  aria-label={`Unpin ${p.name} from your shortlist`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentPlaces.length > 0 ? (
        <section aria-labelledby="hero-recent-title">
          <div className="hero-mini-rail__header">
            <span id="hero-recent-title" className="hero-mini-rail__title flex items-center gap-1.5">
              <Clock className="w-3 h-3" aria-hidden />
              Recently viewed · {recentPlaces.length}
            </span>
            <button
              type="button"
              className="hero-mini-rail__action"
              onClick={onClearRecents}
              aria-label="Clear recently viewed list"
            >
              Clear
            </button>
          </div>
          <ul className="hero-mini-rail" aria-label="Recently opened place profiles">
            {recentPlaces.map(p => (
              <li key={p.id} className="contents">
                <button
                  type="button"
                  className="hero-mini-rail__chip"
                  onClick={() => onOpenPlace(p.id)}
                  aria-label={`Open ${p.name} (recently viewed)`}
                >
                  <span className="hero-mini-rail__chip-name">{p.name}</span>
                  <span className="hero-mini-rail__chip-meta">{p.koppen}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});

const ContextStressPanel = memo(function ContextStressPanel({
  rows,
  onOpenPlace,
  onCompareContextLeaders,
  onPreloadCompare,
  onApplyContextScenario,
}: {
  rows: ContextStressRow[];
  onOpenPlace: (id: string) => void;
  onCompareContextLeaders: (ids: string[]) => void;
  onPreloadCompare: () => void;
  onApplyContextScenario: (id: ContextScenarioId) => void;
}) {
  const prose = useProse();
  const leaderSummary = useMemo(() => summarizeContextStressRows(rows, COMPARE_LIMIT), [rows]);
  return (
    <section className="context-stress" aria-labelledby="context-stress-title">
      <div className="context-stress__head">
        <div className="min-w-0">
          <div id="context-stress-title" className="context-stress__eyebrow">
            Context stress test
          </div>
          <p className="context-stress__summary">
            Same place context, rerun through different living priorities so leader shifts and caveats surface before you dig into cards.
            {leaderSummary ? (
              <span className="context-stress__split">{leaderSummary.summary}</span>
            ) : null}
          </p>
        </div>
        <div className="context-stress__head-actions">
          <div className="context-stress__count" aria-label={`${rows.length} context reads`}>
            {rows.length} reads
          </div>
          {leaderSummary && leaderSummary.compareIds.length >= 2 ? (
            <button
              type="button"
              className="btn-ghost !text-xs !py-1.5"
              onPointerEnter={onPreloadCompare}
              onFocus={onPreloadCompare}
              onPointerDown={onPreloadCompare}
              onClick={() => onCompareContextLeaders(leaderSummary.compareIds)}
              aria-label={`Compare context top picks: ${leaderSummary.compareIds.length} places`}
              title={leaderSummary.summary}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
              Compare top picks
            </button>
          ) : null}
        </div>
      </div>

      <div className="context-stress__rail" aria-label="Scenario leaders for the current place context">
        {rows.map(row => (
          <div key={row.id} className="context-stress__card" data-current={row.id === "current" ? "true" : undefined}>
            <div className="context-stress__card-head">
              <div className="min-w-0">
                <div className="context-stress__label">{row.label}</div>
                <div className="context-stress__shift">{row.shiftLabel}</div>
              </div>
              <span className="context-stress__score" aria-label={`Score ${Math.round(row.leader.score)}`}>
                {Math.round(row.leader.score)}
              </span>
            </div>

            <button
              type="button"
              className="context-stress__leader"
              onClick={() => onOpenPlace(row.leader.place.id)}
              aria-label={`${row.label}: open ${row.leader.place.name}, score ${Math.round(row.leader.score)}`}
              title={prose(row.description)}
            >
              <span className="context-stress__leader-name">{row.leader.place.name}</span>
              <span className="context-stress__leader-note">
                {row.leader.note ? prose(row.leader.note) : row.leader.place.koppen}
              </span>
            </button>

            <div className="context-stress__stats" aria-label={`${row.label} decision metrics`}>
              <span>Fit {row.decision.liveFitScore}</span>
              <span>Comfort {row.decision.comfortScore}</span>
              <span>Feel {row.decision.placeFeelScore}</span>
              <span>Easy {row.decision.easyMonths} mo</span>
              <span>Risk {row.decision.riskLoad}</span>
            </div>

            <div className="context-stress__watch">
              <span>Watch:</span> {prose(row.decision.watch)}
            </div>

            <div className="context-stress__actions">
              <button
                type="button"
                className="btn-ghost !text-xs !py-1.5"
                onClick={() => onOpenPlace(row.leader.place.id)}
                aria-label={`Open ${row.leader.place.name} from ${row.label}`}
              >
                <Target className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
                Open
              </button>
              {row.scenario ? (
                <button
                  type="button"
                  className="btn-primary !text-xs !py-1.5"
                  onClick={() => onApplyContextScenario(row.scenario!.id)}
                  aria-label={`Apply context: ${row.label}`}
                  title={prose(row.description)}
                >
                  Apply
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

const ScoutBriefPanel = memo(function ScoutBriefPanel({
  brief,
  onOpenPlace,
  onCompareLeaders,
  onPreloadCompare,
}: {
  brief: ExplorerScoutBrief;
  onOpenPlace: (id: string) => void;
  onCompareLeaders: (ids: string[]) => void;
  onPreloadCompare: () => void;
}) {
  const prose = useProse();
  return (
    <section className="scout-brief" aria-labelledby="explorer-scout-brief-title">
      <div className="scout-brief__head">
        <div className="min-w-0">
          <div id="explorer-scout-brief-title" className="scout-brief__eyebrow">
            Scout brief
          </div>
          <p className="scout-brief__summary">{prose(brief.summary)}</p>
        </div>
        <div className="scout-brief__actions">
          <button
            type="button"
            className="btn-ghost !text-xs !py-1.5"
            onClick={() => onOpenPlace(brief.leader.place.id)}
            aria-label={`Open scout brief leader ${brief.leader.place.name}`}
          >
            <Target className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
            Open leader
          </button>
          {brief.compareIds.length >= 2 ? (
            <button
              type="button"
              className="btn-primary !text-xs !py-1.5"
              onPointerEnter={onPreloadCompare}
              onFocus={onPreloadCompare}
              onPointerDown={onPreloadCompare}
              onClick={() => onCompareLeaders(brief.compareIds)}
              aria-label={`Compare current leaders: ${brief.compareIds.length} places`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
              Compare leaders
            </button>
          ) : null}
        </div>
      </div>

      <div className="scout-brief__body">
        <button
          type="button"
          className="scout-brief__leader"
          onClick={() => onOpenPlace(brief.leader.place.id)}
          aria-label={`Open ${brief.leader.place.name}, current best match`}
        >
          <span className="scout-brief__leader-rank" aria-hidden>1</span>
          <span className="min-w-0">
            <span className="scout-brief__leader-kicker">Best current match</span>
            <span className="scout-brief__leader-name">{brief.leader.place.name}</span>
            <span className="scout-brief__leader-note">{prose(brief.fitLine)}</span>
          </span>
          <span className="scout-brief__score" aria-label={`Score ${Math.round(brief.leader.score)}`}>
            {Math.round(brief.leader.score)}
          </span>
        </button>

        <div className="scout-brief__metrics" aria-label="Current shortlist climate and risk summary">
          {brief.metrics.map(metric => (
            <div key={metric.label} className="scout-brief__metric" title={metric.detail}>
              <span className="scout-brief__metric-label">{metric.label}</span>
              <span className="scout-brief__metric-value">{prose(metric.value)}</span>
            </div>
          ))}
        </div>

        <div className="scout-brief__signals" aria-label="Where current leaders win across living priorities">
          <div className="scout-brief__signals-head">
            <span className="scout-brief__signals-title">Where leaders win</span>
            <span className="scout-brief__signals-line">{prose(brief.decisionLine)}</span>
          </div>
          <div className="scout-brief__signal-grid">
            {brief.decisionSignals.map(signal => (
              <button
                key={signal.label}
                type="button"
                className="scout-brief__signal"
                onClick={() => onOpenPlace(signal.place.id)}
                title={prose(signal.detail)}
                aria-label={`${signal.label}: ${signal.place.name}, ${signal.value}. Open place profile.`}
              >
                <span className="scout-brief__signal-label">{signal.label}</span>
                <span className="scout-brief__signal-place">{signal.place.name}</span>
                <span className="scout-brief__signal-value">{signal.value}</span>
              </button>
            ))}
          </div>
        </div>

        {brief.decisionRows.length > 0 ? (
          <div className="scout-brief__matrix" aria-label="Shortlist decision matrix">
            <div className="scout-brief__matrix-head">
              <span className="scout-brief__matrix-title">Decision matrix</span>
              <span className="scout-brief__matrix-line">Top places, translated into fit, comfort, risk, land, and the first caveat to check.</span>
            </div>
            <div className="scout-brief__matrix-grid">
              {brief.decisionRows.map(row => (
                <button
                  key={row.place.id}
                  type="button"
                  className="scout-brief__matrix-row"
                  onClick={() => onOpenPlace(row.place.id)}
                  title={prose(row.decisionCue)}
                  aria-label={`Decision matrix rank ${row.rank}. ${row.place.name}. ${row.decisionCue} Open place profile.`}
                >
                  <span className="scout-brief__matrix-rank" aria-hidden>{row.rank}</span>
                  <span className="scout-brief__matrix-main">
                    <span className="scout-brief__matrix-name">{row.place.name}</span>
                    <span className="scout-brief__matrix-fit">{prose(row.bestFor)}</span>
                  </span>
                  <span className="scout-brief__matrix-stats" aria-hidden>
                    <span>Fit {row.liveFitScore}</span>
                    <span>Comfort {row.comfortScore}</span>
                    <span>Feel {row.placeFeelScore}</span>
                    <span>Easy {row.easyMonths} mo</span>
                    <span>Risk {row.riskLoad}</span>
                    <span>Land {row.growability}</span>
                  </span>
                  <span className="scout-brief__matrix-watch">Watch: {prose(row.watch)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="scout-brief__caution">
          <ShieldAlert className="w-3.5 h-3.5 text-ember-700 shrink-0" aria-hidden />
          <span>{prose(brief.cautionLine)}</span>
        </div>
      </div>
    </section>
  );
});

const DesktopScoutBoard = memo(function DesktopScoutBoard({
  brief,
  onOpenPlace,
}: {
  brief: ExplorerScoutBrief;
  onOpenPlace: (id: string) => void;
}) {
  const prose = useProse();
  return (
    <section className="desktop-scout-board" aria-label="Desktop relocation workbench">
      <div className="desktop-scout-board__leader">
        <div>
          <div className="desktop-scout-board__eyebrow">Relocation read</div>
          <button
            type="button"
            className="desktop-scout-board__leader-button"
            onClick={() => onOpenPlace(brief.leader.place.id)}
            aria-label={`Open ${brief.leader.place.name} from the desktop relocation workbench`}
          >
            <span className="desktop-scout-board__place">{brief.leader.place.name}</span>
            <span className="desktop-scout-board__note">{prose(brief.fitLine)}</span>
          </button>
        </div>
        <div className="desktop-scout-board__score" aria-label={`Score ${Math.round(brief.leader.score)}`}>
          {Math.round(brief.leader.score)}
        </div>
      </div>

      <div className="desktop-scout-board__metrics" aria-label="Current shortlist desktop metrics">
        {brief.metrics.slice(0, 4).map(metric => (
          <div key={metric.label} className="desktop-scout-board__metric" title={metric.detail}>
            <span className="desktop-scout-board__metric-label">{metric.label}</span>
            <span className="desktop-scout-board__metric-value">{prose(metric.value)}</span>
          </div>
        ))}
      </div>

      <div className="desktop-scout-board__signals" aria-label="Priority leaders in the current shortlist">
        {brief.decisionSignals.slice(0, 3).map(signal => (
          <button
            key={signal.label}
            type="button"
            className="desktop-scout-board__signal"
            onClick={() => onOpenPlace(signal.place.id)}
            title={prose(signal.detail)}
            aria-label={`${signal.label}: ${signal.place.name}, ${signal.value}. Open place profile.`}
          >
            <span className="desktop-scout-board__signal-label">{signal.label}</span>
            <span className="desktop-scout-board__signal-place">{signal.place.name}</span>
            <span className="desktop-scout-board__signal-value">{signal.value}</span>
          </button>
        ))}
      </div>

      <div className="desktop-scout-board__matrix" aria-label="Desktop decision matrix">
        <div className="desktop-scout-board__matrix-title">Decision matrix</div>
        {brief.decisionRows.slice(0, 3).map(row => (
          <button
            key={row.place.id}
            type="button"
            className="desktop-scout-board__matrix-row"
            onClick={() => onOpenPlace(row.place.id)}
            title={prose(row.decisionCue)}
            aria-label={`Open ${row.place.name} from the desktop decision matrix`}
          >
            <span className="desktop-scout-board__matrix-rank" aria-hidden>{row.rank}</span>
            <span className="desktop-scout-board__matrix-name">{row.place.name}</span>
            <span className="desktop-scout-board__matrix-stats">
              Fit {row.liveFitScore} · comfort {row.comfortScore} · feel {row.placeFeelScore} · risk {row.riskLoad}
            </span>
            <span className="desktop-scout-board__matrix-watch">Watch: {prose(row.watch)}</span>
          </button>
        ))}
      </div>

      <div className="desktop-scout-board__caution">
        <ShieldAlert className="w-3.5 h-3.5 text-ember-700 shrink-0" aria-hidden />
        <span>{prose(brief.cautionLine)}</span>
      </div>
    </section>
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

