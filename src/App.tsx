import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, BookmarkCheck, BookOpen, CalendarDays, Clock, Compass, HelpCircle, Home, Laptop, Library, Link2, Map, Menu, Route, Search, ShieldAlert, ShieldCheck, Shuffle, Snowflake, Sparkles, Sprout, Sun, Sunrise, Target, X, type LucideIcon } from "lucide-react";
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
import { CLIMATE_TRIP_THEME_BY_ID, type ClimateTripTheme } from "./data/climate-trip-themes";
import { ARCHETYPE_BY_ID } from "./data/archetypes";
import { FIELD_NOTES } from "./data/field-notes";
import {
  anyLifestyleBundleActive,
  applyLifestyleBundle,
  countLiveFinderConstraintSignals,
  HERO_BUNDLE_BY_RANKING,
  isBundleActive,
  LIFESTYLE_BUNDLES,
  lifestyleBundleById,
  type LifestyleBundle,
} from "./lib/lifestyle-bundles";
import { applyFilters, createEmptyFilterState, filterStateFromValidated, hasNonSearchExplorerFilters, rankLivabilityPreview, scoreLivability, toValidatedFilterInput, LIVABILITY_WEIGHTS, type FilterState, type LivabilityResult, type RankingProfile, type RankingResult } from "./lib/scoring";
import { assessLiveFit, LIVE_FIT_PRESET_BY_ID } from "./lib/live-fit";
import { loadHomeBaseId, persistHomeBaseId } from "./lib/home-base";
import { projectPlace, projectPool, scenarioMeta } from "./lib/climate-projection";
import { runScenarioRanking } from "./lib/climate-processor";
import { useClimateProcessor } from "./hooks/use-climate-processor";
import { ClimateScenarioControl } from "./components/chrome/ClimateScenarioControl";
import { CompareLoadingFallback } from "./components/CompareLoadingFallback";
import { LazyRouteErrorBoundary } from "./components/LazyRouteErrorBoundary";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback";
import { resonantWindowFor } from "./lib/best-months";
import { buildExplorerScoutBrief, type ExplorerScoutBrief } from "./lib/explorer-scout-brief";
import { buildShortlistPacketCue } from "./lib/shortlist-packet";
import { buildShortlistReadiness } from "./lib/shortlist-readiness";
import { buildScenarioReshuffleSummary, type ScenarioReshuffleSummary, type ScenarioReshuffleRow } from "./lib/scenario-reshuffle";
import { getPlaceVisualSignature, type PlaceVisualSignature } from "./lib/place-visual-signature";
import { buildContextStressRows, CONTEXT_SCENARIO_BY_ID, filtersForContextScenario, summarizeContextStressRows, type ContextScenarioId, type ContextStressRow } from "./lib/context-scenarios";
import { getClimateTourismProfile, type ClimateTourismProfile } from "./lib/climate-tourism";
import { motionPolicy, prefersReducedMotion, useRichVisualEffects } from "./lib/device-profile";
import { placeDocumentTitle } from "./lib/site-metadata";
import { fmtDelta, fmtTemp, useProse, useUnits, type UnitState } from "./lib/units";
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
import { SEARCH_INPUT_ID, SEARCH_SHORTCUT_HINT, SHORTCUTS_SEEN_KEY, type ShareStatus } from "./lib/app-constants";
import { LogoMark } from "./components/chrome/LogoMark";
import { Footer } from "./components/chrome/Footer";
import { ShortcutsOverlay } from "./components/chrome/ShortcutsOverlay";
import { ShortlistExportMenu } from "./components/chrome/ShortlistExportMenu";
import { PlaceDetailLoadingFallback } from "./components/place-detail/PlaceDetailLoadingFallback";
import {
  DEFAULT_RANKING,
  loadPersistedRanking,
  persistRankingProfile,
} from "./lib/app-ranking-preference";
import {
  BOOKMARK_LIMIT,
  addBookmarksToFront,
  loadBookmarks,
  toggleBookmark as toggleBookmarkPersist,
} from "./lib/place-bookmarks";
import {
  DEFAULT_COMPARISON_LENS,
  type CompareCandidate,
  type ComparisonLensId,
} from "./lib/compare-workbench";
import {
  clearRecentPlaces,
  loadRecentPlaces,
  recordRecentPlace,
} from "./lib/place-history";
import {
  type AppHistoryState,
  COMPARE_LIMIT,
  formatAppRelativeUrl,
  parseAppSearch,
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

type TripRouteRow = {
  place: Place;
  profile: ClimateTourismProfile;
};

function buildTripRouteRows(theme: ClimateTripTheme, visiblePlaces: readonly Place[]): TripRouteRow[] {
  const visibleById: Record<string, Place> = {};
  for (const place of visiblePlaces) visibleById[place.id] = place;
  return theme.placeIds
    .map(id => visibleById[id])
    .filter(isPlace)
    .map(place => ({ place, profile: getClimateTourismProfile(place) }))
    .sort((a, b) => b.profile.scores.tourismAppeal - a.profile.scores.tourismAppeal);
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
type OpenPlaceHandler = (id: string, opts?: { trigger?: HTMLElement | null }) => void;
type OpenCompareHandler = (opts?: { trigger?: HTMLElement | null }) => void;
type ComparePlacesHandler = (ids: string[], opts?: { trigger?: HTMLElement | null }) => void;

interface MapStageContext {
  mode: "rank" | "fit-path";
  eyebrow: string;
  headline: string;
  detail: string | null;
  title: string;
  ariaLabel: string;
}

function buildMapStageContext({
  activeBundle,
  rankingLabel,
  scoutBrief,
  featuredCount,
}: {
  activeBundle: LifestyleBundle | null;
  rankingLabel: string;
  scoutBrief: ExplorerScoutBrief | null;
  featuredCount: number;
}): MapStageContext {
  const rankTitle = `${rankingLabel} \u00b7 top ${featuredCount}`;
  if (!activeBundle) {
    return {
      mode: "rank",
      eyebrow: "Rank trail",
      headline: rankTitle,
      detail: null,
      title: rankTitle,
      ariaLabel: `Map highlights the top ${featuredCount} places for ${rankingLabel}.`,
    };
  }

  const scoutLead = scoutBrief?.leader.place.name ?? null;
  const finalistCount = scoutBrief?.compareIds.length ?? featuredCount;
  const detail = scoutLead
    ? `Scout lead ${scoutLead} / ${finalistCount} finalist${finalistCount === 1 ? "" : "s"}`
    : `${rankingLabel} / top ${featuredCount}`;
  const title = `${activeBundle.label} / ${activeBundle.cue} / ${rankingLabel}`;
  return {
    mode: "fit-path",
    eyebrow: "Fit path map",
    headline: activeBundle.label,
    detail,
    title,
    ariaLabel: scoutLead
      ? `Map follows the active ${activeBundle.label} Fit Finder path. Scout lead ${scoutLead}. ${finalistCount} finalists are highlighted.`
      : `Map follows the active ${activeBundle.label} Fit Finder path for ${rankingLabel}.`,
  };
}

const ClimateTripsView = lazy(loadClimateTripsView);
const CollectionsView = lazy(loadCollectionsView);
const LearnMode = lazy(loadLearnMode);
const PlaceDetail = lazy(loadPlaceDetail);
const CompareView = lazy(loadCompareView);

if (typeof window !== "undefined" && (parseAppSearch(window.location.search).compareIds?.length ?? 0) > 0) {
  preloadCompareView();
}

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
  const [comparisonLens, setComparisonLens] = useState<ComparisonLensId>(() => initialAppState.comparisonLens ?? DEFAULT_COMPARISON_LENS);
  const [activeCollection, setActiveCollection] = useState<string | null>(initialAppState.collectionId);
  const [filters, setFilters] = useState<FilterState>(() => filterStateFromValidated(initialAppState));
  const [ranking, setRankingRaw] = useState<RankingProfile>(() => initialAppState.ranking ?? loadPersistedRanking());
  const [rankingExplicitInUrl, setRankingExplicitInUrl] = useState(() => initialAppState.ranking != null);
  const [suppressPersistedRankingInUrl, setSuppressPersistedRankingInUrl] = useState(
    () => initialAppState.placeId != null && initialAppState.ranking == null,
  );
  const [climateScenario, setClimateScenario] = useState<ScenarioId>(() => initialAppState.scenario ?? "now");
  // Home-base climate anchor. URL ?hb= wins on first paint (shareable
  // "vs our home" links); otherwise the last explicit choice from
  // localStorage, re-validated against the current corpus.
  const [homeBaseId, setHomeBaseIdRaw] = useState<string | null>(() => {
    if (initialAppState.homeBaseId) return initialAppState.homeBaseId;
    const stored = loadHomeBaseId();
    return stored ? resolvePlaceId(stored) : null;
  });
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set(loadBookmarks()));
  const [recentIds, setRecentIds] = useState<readonly string[]>(() => loadRecentPlaces());
  const [animatePlaceDetailEntry, setAnimatePlaceDetailEntry] = useState(false);
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
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null);
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
    setRankingExplicitInUrl(true);
    setSuppressPersistedRankingInUrl(false);
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
    const sharePayloadUrl = url.toString();
    if (shareResetRef.current !== null) {
      window.clearTimeout(shareResetRef.current);
      shareResetRef.current = null;
    }
    setShareStatus("idle");
    setShareFallbackUrl(null);
    // Use the native share sheet when available (iOS / Android / modern
    // Safari). The helper transparently falls back to clipboard so
    // desktop browsers and older mobile browsers still copy the URL.
    void shareUrl({
      title: document.title || "Terraclima",
      text: "Terraclima view",
      url: sharePayloadUrl,
    }).then(outcome => {
      if (outcome === "dismissed") {
        setShareStatus("idle");
        setShareFallbackUrl(null);
        shareResetRef.current = null;
        return;
      }
      setShareStatus(outcome);
      if (outcome === "failed") {
        setShareFallbackUrl(sharePayloadUrl);
        shareResetRef.current = null;
        return;
      }
      setShareFallbackUrl(null);
      shareResetRef.current = window.setTimeout(() => {
        setShareStatus("idle");
        setShareFallbackUrl(null);
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
  // Phones need the map immediately after the hero scout controls. The dense
  // decision workbench still mounts from tablet width upward, where it no
  // longer pushes the map several screens down.
  const explorerHeroPanelsMd = useMediaQuery("(min-width: 768px)");
  // Matches the styles.css `.desktop-scout-board` reveal breakpoint (line ~2170);
  // gating the JSX avoids mounting a 200+ LOC subtree that is `display: none`.
  const scoutBoardLg = useMediaQuery("(min-width: 1180px)");
  const explorerFilterSheetRef = useRef<ExplorerFilterSheetHandle | null>(null);
  const appShellRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const topBarRegionRef = useRef<HTMLDivElement>(null);
  const appContentRef = useRef<HTMLDivElement>(null);
  const appViewContentRef = useRef<HTMLDivElement>(null);
  const footerRegionRef = useRef<HTMLDivElement>(null);
  /** Reference to the trigger that opened the place detail, so we can return focus on close. */
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  /** Tracks whether a profile was actually open so first paint never steals focus. */
  const detailWasOpenRef = useRef(Boolean(initialAppState.placeId));
  const detailCloseFallbackRef = useRef<number | null>(null);
  /** Reference to the trigger that opened Compare, so closing the modal returns keyboard users to context. */
  const compareTriggerRef = useRef<HTMLElement | null>(null);
  const compareTriggerLabelRef = useRef<string | null>(null);
  const compareWasOpenRef = useRef(compareOpen);
  /** Reference to the trigger that opened shortcuts help, so closing returns users to context. */
  const shortcutsTriggerRef = useRef<HTMLElement | null>(null);
  const shortcutsTriggerLabelRef = useRef<string | null>(null);
  /** One-shot flag for route switches that should land on the active trip/collection clear affordance. */
  const activeScopeFocusPendingRef = useRef(false);

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
    const shouldSuppressPersistedRanking = suppressPersistedRankingInUrl &&
      !rankingExplicitInUrl &&
      !hasLiveFitState;
    const shouldWriteRanking = ranking !== DEFAULT_RANKING &&
      !shouldSuppressPersistedRanking &&
      (rankingExplicitInUrl || !selectedId || hasLiveFitState);
    const rankingForUrl = hasLiveFitState ? ranking : shouldWriteRanking ? ranking : null;
    const state = {
      view,
      placeId: selectedId,
      collectionId: activeCollection,
      countries: [...filters.countries] as Country[],
      archetypes: [...filters.archetypes],
      search: filters.search ?? "",
      compareIds: [...compareIds],
      ranking: rankingForUrl,
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
      comparisonLens,
      homeBaseId,
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
  }, [view, selectedId, activeCollection, filters, compareIds, ranking, rankingExplicitInUrl, suppressPersistedRankingInUrl, temp, dist, themePreference, climateScenario, comparisonLens, homeBaseId]);

  useEffect(() => {
    const onPop = () => {
      const v = validatedStateFromSearch(
        window.location.search,
        PLACES_BY_ID as Record<string, unknown>,
        CURATED_SET_BY_ID as Record<string, unknown>,
        ARCHETYPE_BY_ID as Record<string, unknown>,
        resolvePlaceId,
      );
      setAnimatePlaceDetailEntry(false);
      setView(v.view);
      setSelectedId(v.placeId);
      setActiveCollection(v.collectionId);
      setFilters(filterStateFromValidated(v));
      setCompareIds(new Set(v.compareIds));
      setComparisonLens(v.comparisonLens);
      setRankingExplicitInUrl(v.ranking != null);
      setSuppressPersistedRankingInUrl(v.placeId != null && v.ranking == null);
      setRankingRaw(v.ranking ?? loadPersistedRanking());
      setClimateScenario(v.scenario ?? "now");
      // Home base is a sticky preference like theme: an explicit ?hb= on the
      // target entry wins; otherwise fall back to the persisted choice so
      // Back/Forward through pre-home entries doesn't silently clear it.
      setHomeBaseIdRaw(() => {
        if (v.homeBaseId) return v.homeBaseId;
        const stored = loadHomeBaseId();
        return stored ? resolvePlaceId(stored) : null;
      });
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
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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
  const activeTripTheme = useMemo(
    () => activeCollection ? CLIMATE_TRIP_THEME_BY_ID[activeCollection] ?? null : null,
    [activeCollection],
  );
  const activeTripRows = useMemo(
    () => activeTripTheme ? buildTripRouteRows(activeTripTheme, filtered) : [],
    [activeTripTheme, filtered],
  );

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
  const baselineRanked = useMemo<RankingResult[]>(() => {
    if (climateScenario === "now") return ranked;
    const rows = runScenarioRanking({
      type: "scenario-rank",
      requestId: -2050,
      scenario: "now",
      ranking,
      filters: validatedFilters,
      ...(scenarioPoolIds ? { poolIds: scenarioPoolIds } : {}),
    }).rows;
    return rows
      .map(row => {
        const place = placeForId(row.id);
        if (!place) return null;
        return row.note != null ? { place, score: row.score, note: row.note } : { place, score: row.score };
      })
      .filter((row): row is RankingResult => row != null);
  }, [climateScenario, ranked, ranking, scenarioPoolIds, validatedFilters]);
  // The hero top-ten is decorative (lives below the map + cards). Defer it
  // so React can drop a stale render and let the higher-value updates above
  // commit first when the user is rapidly changing filters.
  const deferredFiltered = useDeferredValue(filtered);
  const livabilityTopTen = useMemo(
    () => rankLivabilityPreview(deferredFiltered).slice(0, 10),
    [deferredFiltered],
  );
  const sortTopFive = useMemo(() => ranked.slice(0, 5), [ranked]);
  const signatureLeaders = useMemo<SignatureLeader[]>(
    () => sortTopFive.map(row => ({ ...row, signature: getPlaceVisualSignature(row.place) })),
    [sortTopFive],
  );
  const topRankedPlaceIds = useMemo(
    () => sortTopFive.map(row => row.place.id),
    [sortTopFive],
  );
  const rankingLabel = useMemo(
    () => RANKING_OPTIONS.find(o => o.id === ranking)?.label ?? ranking.replace(/-/g, " "),
    [ranking],
  );
  const scenarioRankingLabel = useMemo(
    () => climateScenario === "now" ? rankingLabel : `${scenarioMeta(climateScenario).short} · ${rankingLabel}`,
    [climateScenario, rankingLabel],
  );
  const scenarioReshuffle = useMemo(
    () => buildScenarioReshuffleSummary({
      scenario: climateScenario,
      baselineRanked,
      projectedRanked: ranked,
      limit: COMPARE_LIMIT,
    }),
    [baselineRanked, climateScenario, ranked],
  );
  const activeDossierFitBundle = useMemo(
    () => LIFESTYLE_BUNDLES.find(bundle => isBundleActive(bundle, ranking, filters)) ?? null,
    [ranking, filters],
  );
  const dossierFitContext = useMemo(
    () => ({
      rankingLabel: scenarioRankingLabel,
      bundleLabel: activeDossierFitBundle?.label ?? null,
      bundleCue: activeDossierFitBundle?.cue ?? null,
    }),
    [scenarioRankingLabel, activeDossierFitBundle],
  );
  const scoutBrief = useMemo(
    () => buildExplorerScoutBrief(ranked, scenarioRankingLabel, deferredFilters, climateScenario),
    [ranked, scenarioRankingLabel, deferredFilters, climateScenario],
  );
  const mapStageContext = useMemo(
    () => buildMapStageContext({
      activeBundle: activeDossierFitBundle,
      rankingLabel: scenarioRankingLabel,
      scoutBrief,
      featuredCount: topRankedPlaceIds.length,
    }),
    [activeDossierFitBundle, scenarioRankingLabel, scoutBrief, topRankedPlaceIds.length],
  );
  const contextStressRows = useMemo(
    () => buildContextStressRows({
      pool,
      currentRanked: ranked,
      currentFilters: deferredFilters,
      currentRanking: ranking,
      currentRankingLabel: scenarioRankingLabel,
    }),
    [pool, ranked, deferredFilters, ranking, scenarioRankingLabel],
  );
  const resonantWindow = useMemo(() => resonantWindowFor(ranking), [ranking]);
  const rankedRef = useRef(ranked);
  rankedRef.current = ranked;

  const selectedPlace = selectedId ? placeForId(selectedId) ?? null : null;
  const activeComparePlaces = useMemo(
    () => [...compareIds].map(id => placesById[id] ?? placeForId(id)).filter(isPlace),
    [compareIds, placesById],
  );
  // Present-day home base for the dossier (which always shows present-day
  // normals) and a scenario-consistent twin for the Explorer grid and
  // Compare, so deltas never mix projected places with a present-day home.
  const homeBasePlace = homeBaseId ? placeForId(homeBaseId) ?? null : null;
  const homeBaseClearLabel = homeBasePlace ? `Stop comparing against ${homeBasePlace.name} (clear home base)` : "";
  const homeBasePlaceForScenario = useMemo(
    () => (homeBasePlace && climateScenario !== "now" ? projectPlace(homeBasePlace, climateScenario) : homeBasePlace),
    [homeBasePlace, climateScenario],
  );
  const compareCandidates = useMemo<CompareCandidate[]>(() => {
    const seen = new Set<string>();
    const candidates: CompareCandidate[] = [];
    const push = (place: Place | undefined, source: CompareCandidate["source"], note: string) => {
      if (!place || seen.has(place.id)) return;
      seen.add(place.id);
      candidates.push({ place, source, note });
    };

    for (const id of bookmarkIds) {
      push(placesById[id] ?? placeForId(id), "Shortlist", "Pinned to your shortlist");
    }
    for (const id of recentIds) {
      push(placesById[id] ?? placeForId(id), "Recent", "Recently opened dossier");
    }
    for (const row of ranked.slice(0, 12)) {
      push(row.place, "Ranked", `${scenarioRankingLabel} leader`);
    }

    return candidates;
  }, [bookmarkIds, placesById, ranked, scenarioRankingLabel, recentIds]);
  const appShellOccluded = Boolean(selectedPlace) || compareOpen || showShortcuts;
  const placeDetailOccluded = compareOpen || showShortcuts;
  const compareViewOccluded = showShortcuts;
  useElementIsolation(appShellRef, appShellOccluded);
  useElementIsolation(skipLinkRef, siteMenuOpen);
  useElementIsolation(appContentRef, siteMenuOpen);
  useElementIsolation(topBarRegionRef, filterSheetOpen);
  useElementIsolation(appViewContentRef, filterSheetOpen);
  useElementIsolation(footerRegionRef, filterSheetOpen || siteMenuOpen);

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
    setAnimatePlaceDetailEntry(true);
    setSelectedId(id);
  }, []);

  const focusMainContentNextFrame = useCallback(() => {
    const focusMain = () => {
      const main = document.getElementById("main-content");
      if (!main) return;
      try { main.focus({ preventScroll: true }); } catch { /* noop */ }
    };
    window.setTimeout(focusMain, 0);
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(focusMain);
      });
    }
  }, []);

  const focusShortlistRemoveNextFrame = useCallback((placeId: string) => {
    let focused = false;
    const focusTarget = (fallbackToMain: boolean) => {
      if (focused) return;
      const target = Array.from(
        document.querySelectorAll<HTMLButtonElement>("[data-shortlist-remove-id]"),
      ).find(button => button.getAttribute("data-shortlist-remove-id") === placeId);
      if (target) {
        try {
          target.focus({ preventScroll: true });
          focused = true;
          return;
        } catch {
          // Fall through to the main-content recovery path below.
        }
      }
      if (fallbackToMain) {
        focusMainContentNextFrame();
      }
    };
    window.setTimeout(() => focusTarget(false), 0);
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => focusTarget(true));
      });
    } else {
      window.setTimeout(() => focusTarget(true), 50);
    }
  }, [focusMainContentNextFrame]);

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

  const removePinnedRailPlace = useCallback((id: string, nextFocusId: string | null = null) => {
    const canonical = resolvePlaceId(id) ?? id;
    toggleBookmark(canonical);
    if (nextFocusId) {
      focusShortlistRemoveNextFrame(nextFocusId);
    } else {
      focusMainContentNextFrame();
    }
  }, [focusMainContentNextFrame, focusShortlistRemoveNextFrame, toggleBookmark]);

  const toggleHomeBase = useCallback((id: string) => {
    const canonical = resolvePlaceId(id);
    if (!canonical) return;
    const place = PLACES_BY_ID[canonical];
    const next = homeBaseId === canonical ? null : canonical;
    persistHomeBaseId(next);
    setHomeBaseIdRaw(next);
    setTransientFeedback(next
      ? `${place.name} is now your home base — cards, dossiers, and Compare read climate deltas against it.`
      : `Cleared your home base — cards and dossiers return to absolute readings.`);
  }, [homeBaseId]);

  const clearHomeBase = useCallback(() => {
    persistHomeBaseId(null);
    setHomeBaseIdRaw(null);
    setTransientFeedback("Cleared your home base — cards and dossiers return to absolute readings.");
    focusMainContentNextFrame();
  }, [focusMainContentNextFrame]);

  const saveScoutFinalists = useCallback((ids: readonly string[]) => {
    const seen = new Set<string>();
    const finalists: string[] = [];
    for (const id of ids) {
      const canonical = resolvePlaceId(id) ?? id;
      if (!PLACES_BY_ID[canonical] || seen.has(canonical)) continue;
      seen.add(canonical);
      finalists.push(canonical);
      if (finalists.length >= COMPARE_LIMIT) break;
    }
    if (finalists.length === 0) {
      setTransientFeedback("No Scout finalists are available to save yet.");
      return;
    }

    const saved = addBookmarksToFront(finalists);
    setBookmarkIds(new Set(saved.ids));
    const savedCount = finalists.filter(id => saved.ids.includes(id)).length;
    if (saved.added.length === 0) {
      setTransientFeedback(`${savedCount} Scout finalists are already in your shortlist.`);
    } else if (saved.capped) {
      setTransientFeedback(
        `Saved ${saved.added.length} new finalist${saved.added.length === 1 ? "" : "s"}; shortlist cap kept the top ${BOOKMARK_LIMIT}.`,
      );
    } else {
      setTransientFeedback(
        `Saved ${saved.added.length} new finalist${saved.added.length === 1 ? "" : "s"}; ${savedCount} Scout finalists are ready to compare or export.`,
      );
    }
  }, []);

  const clearRecents = useCallback(() => {
    setRecentIds(clearRecentPlaces());
    focusMainContentNextFrame();
  }, [focusMainContentNextFrame]);

  const closeDetail = useCallback(() => {
    setAnimatePlaceDetailEntry(false);
    if (typeof window !== "undefined" && selectedId) {
      const st = window.history.state as AppHistoryState | null;
      if (st?.tcPlace) {
        const closingPlaceId = selectedId;
        window.history.back();
        if (detailCloseFallbackRef.current !== null) {
          window.clearTimeout(detailCloseFallbackRef.current);
        }
        detailCloseFallbackRef.current = window.setTimeout(() => {
          detailCloseFallbackRef.current = null;
          setSelectedId(current => current === closingPlaceId ? null : current);
        }, 250);
        return;
      }
    }
    setSelectedId(null);
  }, [selectedId]);

  useEffect(() => () => {
    if (detailCloseFallbackRef.current !== null) {
      window.clearTimeout(detailCloseFallbackRef.current);
      detailCloseFallbackRef.current = null;
    }
  }, []);

  // Return focus after the detail panel closes. In-app opens go back to their
  // launcher; shared profile links have no launcher, so land on main content.
  useEffect(() => {
    if (selectedId !== null) {
      detailWasOpenRef.current = true;
      return;
    }
    if (!detailWasOpenRef.current) return;
    detailWasOpenRef.current = false;
    const trigger = detailTriggerRef.current;
    const target =
      trigger && trigger.isConnected && trigger !== document.body
        ? trigger
        : document.getElementById("main-content");
    if (!target) return;
    const restoreFocus = () => {
      try { target.focus({ preventScroll: true }); } catch { /* noop */ }
    };
    restoreFocus();
    const id = window.requestAnimationFrame(restoreFocus);
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

  const openCompare = useCallback((opts?: { trigger?: HTMLElement | null }) => {
    preloadCompareView();
    if (opts?.trigger) {
      compareTriggerRef.current = opts.trigger;
      compareTriggerLabelRef.current = opts.trigger.getAttribute("aria-label") ?? null;
    } else if (typeof document !== "undefined") {
      const active = (document.activeElement as HTMLElement | null) ?? null;
      compareTriggerRef.current = active;
      compareTriggerLabelRef.current = active?.getAttribute("aria-label") ?? null;
    }
    setCompareOpen(true);
  }, []);

  const comparePlaces = useCallback((ids: string[], opts?: { trigger?: HTMLElement | null }) => {
    if (ids.length > 0) preloadCompareView();
    if (opts?.trigger) {
      compareTriggerRef.current = opts.trigger;
      compareTriggerLabelRef.current = opts.trigger.getAttribute("aria-label") ?? null;
    } else if (typeof document !== "undefined") {
      const active = (document.activeElement as HTMLElement | null) ?? null;
      compareTriggerRef.current = active;
      compareTriggerLabelRef.current = active?.getAttribute("aria-label") ?? null;
    }
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

  const clearCollection = useCallback(() => {
    setActiveCollection(null);
    focusMainContentNextFrame();
  }, [focusMainContentNextFrame]);
  const clearArchetypes = useCallback(() => {
    setFilters(f => ({ ...f, archetypes: new Set() }));
    focusMainContentNextFrame();
  }, [focusMainContentNextFrame]);
  const clearAllFilters = useCallback(() => {
    setFilters(createEmptyFilterState());
    setActiveCollection(null);
  }, []);
  const relaxLiveFinderFilters = useCallback(() => {
    setFilters(f => {
      const {
        maxSummerHighC: _maxSummerHighC,
        minWinterLowC: _minWinterLowC,
        minGrowability: _minGrowability,
        maxFireRisk: _maxFireRisk,
        maxOverallRisk: _maxOverallRisk,
        ...rest
      } = f;
      return { ...rest, fitPresets: new Set() };
    });
  }, []);
  const clearGeographyFilters = useCallback(() => {
    setFilters(f => ({ ...f, countries: new Set(), archetypes: new Set() }));
    setActiveCollection(null);
  }, []);
  const closeCompare = useCallback((opts?: { restoreFocus?: boolean }) => {
    if (opts?.restoreFocus === false) {
      compareTriggerRef.current = null;
      compareTriggerLabelRef.current = null;
    }
    if (shareResetRef.current !== null) {
      window.clearTimeout(shareResetRef.current);
      shareResetRef.current = null;
    }
    setShareStatus("idle");
    setShareFallbackUrl(null);
    setCompareOpen(false);
  }, []);

  useEffect(() => {
    if (compareOpen) {
      compareWasOpenRef.current = true;
      return;
    }
    if (!compareWasOpenRef.current) return;
    compareWasOpenRef.current = false;
    const focusCompareTrigger = () => {
      const hasLayoutSignals = [...document.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")]
        .some(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 || rect.height > 0 || el.getClientRects().length > 0;
        });
      const canRestoreFocus = (el: HTMLElement | null): el is HTMLElement => {
        if (!el || !el.isConnected || el === document.body) return false;
        if (el.closest("dialog:not([open])")) return false;
        if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
        if (!hasLayoutSignals) return true;
        const rect = el.getBoundingClientRect();
        return (rect.width > 0 || rect.height > 0 || el.getClientRects().length > 0) && rect.bottom >= 0 && rect.top <= window.innerHeight;
      };
      const trigger = compareTriggerRef.current;
      const label = compareTriggerLabelRef.current;
      const labelTarget = label
        ? [...document.querySelectorAll<HTMLButtonElement>("button")]
          .find(button => button.getAttribute("aria-label") === label && canRestoreFocus(button))
        : null;
      const target = canRestoreFocus(trigger)
        ? trigger
        : labelTarget ?? document.getElementById("main-content");
      if (!target) return;
      try { target.focus({ preventScroll: true }); } catch { /* noop */ }
    };
    const rafId = window.requestAnimationFrame(focusCompareTrigger);
    const retryId = window.setTimeout(focusCompareTrigger, 80);
    const settledRetryId = window.setTimeout(focusCompareTrigger, 240);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(retryId);
      window.clearTimeout(settledRetryId);
    };
  }, [compareOpen]);

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

  const pickRandomPlace = useCallback((opts?: { trigger?: HTMLElement | null }): boolean => {
    const poolRanked = rankedRef.current;
    if (poolRanked.length === 0) return false;
    const idx = Math.floor(Math.random() * poolRanked.length);
    openPlace(poolRanked[idx].place.id, opts);
    return true;
  }, [openPlace]);

  const onRandomEmpty = useCallback(() => {
    setTransientFeedback("No places match your filters — clear one to enable Surprise / R.");
  }, []);

  const openShortcutsHelp = useCallback((trigger?: HTMLElement | null) => {
    if (trigger) {
      shortcutsTriggerRef.current = trigger;
      shortcutsTriggerLabelRef.current = trigger.getAttribute("aria-label") ?? null;
    } else {
      const active = (document.activeElement as HTMLElement | null) ?? null;
      shortcutsTriggerRef.current = active;
      shortcutsTriggerLabelRef.current = active?.getAttribute("aria-label") ?? null;
    }
    setShowShortcuts(true);
    setShortcutsSeen(true);
    try { window.localStorage.setItem(SHORTCUTS_SEEN_KEY, "1"); } catch { /* noop */ }
  }, []);

  const closeShortcutsHelp = useCallback(() => {
    setShowShortcuts(false);
  }, []);

  useEffect(() => {
    if (showShortcuts) return;
    const focusShortcutsTrigger = () => {
      const trigger = shortcutsTriggerRef.current;
      const label = shortcutsTriggerLabelRef.current;
      const target = trigger?.isConnected
        ? trigger
        : label
        ? [...document.querySelectorAll<HTMLButtonElement>("button")]
          .find(button => button.getAttribute("aria-label") === label && !button.disabled)
        : null;
      if (!target) return;
      try { target.focus({ preventScroll: true }); } catch { /* noop */ }
    };
    const rafId = window.requestAnimationFrame(focusShortcutsTrigger);
    const retryId = window.setTimeout(focusShortcutsTrigger, 80);
    const settledRetryId = window.setTimeout(focusShortcutsTrigger, 240);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(retryId);
      window.clearTimeout(settledRetryId);
    };
  }, [showShortcuts]);

  const toggleBookmarkSelected = useCallback(() => {
    if (!selectedId) return;
    toggleBookmark(selectedId);
  }, [selectedId, toggleBookmark]);

  const toggleHomeBaseSelected = useCallback(() => {
    if (!selectedId) return;
    toggleHomeBase(selectedId);
  }, [selectedId, toggleHomeBase]);

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
    toggleHomeBaseSelected,
    searchInputId: SEARCH_INPUT_ID,
    clearSearch,
  });
  const onOpenPlaceFromCollections = useCallback((id: string, opts?: { trigger?: HTMLElement | null }) => {
    openPlace(id, opts);
  }, [openPlace]);
  const onOpenPlaceFromLearn = useCallback((id: string, opts?: { trigger?: HTMLElement | null }) => {
    openPlace(id, opts);
  }, [openPlace]);
  const onOpenPlaceFromTrips = useCallback((id: string, opts?: { trigger?: HTMLElement | null }) => {
    openPlace(id, opts);
  }, [openPlace]);
  const onPickCollection = useCallback((id: string) => {
    activeScopeFocusPendingRef.current = true;
    setActiveCollection(a => a === id ? null : id);
    setViewFluid("explorer");
  }, [setViewFluid]);
  const onPickTripTheme = onPickCollection;

  useEffect(() => {
    if (!activeScopeFocusPendingRef.current || view !== "explorer") return;
    const focusActiveScopeTarget = () => {
      const target =
        document.querySelector<HTMLButtonElement>("[data-active-scope-clear]") ??
        document.getElementById("main-content");
      if (!target) return;
      try {
        target.scrollIntoView?.({ block: "center", inline: "nearest" });
        target.focus();
      } catch { /* noop */ }
      activeScopeFocusPendingRef.current = false;
    };
    const rafId = window.requestAnimationFrame(focusActiveScopeTarget);
    const retryId = window.setTimeout(focusActiveScopeTarget, 80);
    const settledRetryId = window.setTimeout(focusActiveScopeTarget, 240);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(retryId);
      window.clearTimeout(settledRetryId);
    };
  }, [activeCollection, view]);

  const surpriseMe = useCallback((opts?: { trigger?: HTMLElement | null }) => {
    if (!pickRandomPlace(opts)) onRandomEmpty();
  }, [pickRandomPlace, onRandomEmpty]);

  return (
    <div className="tc-app-shell relative min-h-screen flex flex-col text-ice">
      <div ref={appShellRef} data-app-shell className="relative z-10 flex flex-col flex-1 min-h-0">
        <a
          ref={skipLinkRef}
          href="#main-content"
          className="skip-to-main focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,143,168,0.55)] focus-visible:ring-offset-2"
        >
          Skip to main content
        </a>
        <div className="ambient-aurora" aria-hidden="true" />
        <main id="main-content" tabIndex={-1} className="relative z-10 flex flex-col flex-1 min-h-0 outline-none">
      <div ref={topBarRegionRef} data-topbar-region>
        <TopBar
          view={view}
          setView={setViewFluid}
          onOpenCompare={openCompare}
          onPreloadCompare={preloadCompareView}
          compareCount={compareIds.size}
          themePreference={themePreference}
          onThemeChange={setTheme}
          onMenuOpenChange={setSiteMenuOpen}
        />
      </div>

      <div ref={appContentRef} data-app-content className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-[1760px] w-full mx-auto">
        <div ref={appViewContentRef} data-app-view-content key={view} className="view-enter flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
          {view === "explorer" && (
            <>
              <div className="tc-explorer-main flex-1 min-w-0 flex flex-col gap-4">
                <HeroCard
                  count={ranked.length}
                  livabilityTopTen={livabilityTopTen}
                  signatureLeaders={signatureLeaders}
                  ranking={ranking}
                  rankingLabel={scenarioRankingLabel}
                  onOpenPlace={openPlace}
                  onClearAll={clearAllFilters}
                  onClearSearch={clearSearch}
                  activeCollection={activeCollection}
                  activeTripTheme={activeTripTheme}
                  activeTripRows={activeTripRows}
                  onClearCollection={clearCollection}
                  activeArchetypes={filters.archetypes}
                  onClearArchetypes={clearArchetypes}
                  onSurpriseMe={surpriseMe}
                  canSurprise={ranked.length > 0}
                  filters={filters}
                  onCopyView={copyCurrentView}
                  shareStatus={shareStatus}
                  shareFallbackUrl={compareOpen ? null : shareFallbackUrl}
                  homeBasePlace={homeBasePlace}
                  onFindHomeBase={focusSearchInput}
                  onClearHomeBase={clearHomeBase}
                  compareCount={compareIds.size}
                  onOpenCompare={openCompare}
                  scoutBrief={scoutBrief}
                  contextStressRows={contextStressRows}
                  onCompareLeaders={comparePlaces}
                  onCompareContextLeaders={comparePlaces}
                  onPreloadCompare={preloadCompareView}
                  onSaveScoutFinalists={saveScoutFinalists}
                  onApplyContextScenario={applyContextScenario}
                  bookmarkIds={bookmarkIds}
                  recentIds={recentIds}
                  onToggleBookmark={toggleBookmark}
                  onRemovePinnedPlace={removePinnedRailPlace}
                  onClearRecents={clearRecents}
                  onApplyQuickPick={applyHeroQuickPick}
                  isQuickPickActive={isHeroQuickPickActive}
                  showHeroSignalRail={!scoutBoardLg}
                  showDetailedHeroPanels={explorerHeroPanelsMd && !scoutBoardLg}
                  showDesktopScoutBoard={scoutBoardLg}
                />

                <div className="tc-map-stage relative h-[clamp(320px,50svh,560px)] md:h-[54dvh] md:min-h-[min(480px,46dvh)]">
                  <div
                    className="tc-map-stage__caption"
                    role="note"
                    data-mode={mapStageContext.mode}
                    aria-label={mapStageContext.ariaLabel}
                  >
                    <span>{mapStageContext.eyebrow}</span>
                    <strong title={mapStageContext.title}>
                      {mapStageContext.headline}
                    </strong>
                    {mapStageContext.detail ? <em>{mapStageContext.detail}</em> : null}
                  </div>
                  <AtlasMap
                    places={filtered}
                    selectedId={selectedId ?? undefined}
                    featuredIds={topRankedPlaceIds}
                    featuredLabel={scenarioRankingLabel}
                    liveFitFilters={filters}
                    onSelect={openPlace}
                  />
                </div>

                <ClimateScenarioControl
                  scenario={climateScenario}
                  onChange={setClimateScenario}
                  projecting={processor.projecting}
                />
                {scenarioReshuffle ? (
                  <ScenarioRemapPanel
                    summary={scenarioReshuffle}
                    rankingLabel={rankingLabel}
                    onOpenPlace={openPlace}
                  />
                ) : null}

                {scoutBoardLg || !explorerHeroPanelsMd ? (
                  <>
                    <ExplorerHeroDetailPanels
                      signatureLeaders={signatureLeaders}
                      ranking={ranking}
                      rankingLabel={scenarioRankingLabel}
                      filters={filters}
                      scoutBrief={scoutBrief}
                      contextStressRows={contextStressRows}
                      onOpenPlace={openPlace}
                      onCompareLeaders={comparePlaces}
                      onCompareContextLeaders={comparePlaces}
                      onPreloadCompare={preloadCompareView}
                      onSaveScoutFinalists={saveScoutFinalists}
                      onApplyContextScenario={applyContextScenario}
                      bookmarkIds={bookmarkIds}
                      onToggleBookmark={toggleBookmark}
                      showDesktopScoutBoard={scoutBoardLg}
                      includeSignalRail={scoutBoardLg}
                    />
                    {!explorerHeroPanelsMd ? (
                      <MobileLivabilityTopTenStrip
                        rows={livabilityTopTen}
                        onOpenPlace={openPlace}
                      />
                    ) : null}
                  </>
                ) : null}

                <section className="hidden md:grid grid-cols-3 gap-3 tc-reader-path" aria-labelledby="reader-path-heading">
                  <h2 id="reader-path-heading" className="sr-only">How to read Terraclima</h2>
                  <div>
                    <div className="tc-reader-path__label">Fit</div>
                    <p>Start with Live-here fit or a quick pick to screen places by comfort, terrain, risk, and lived ease before opening the map wider.</p>
                  </div>
                  <div>
                    <div className="tc-reader-path__label">Compare</div>
                    <p>Move from a continental scan to a shortlist with filters, map clusters, Scout Brief, and four-place compare.</p>
                  </div>
                  <div>
                    <div className="tc-reader-path__label">Scout</div>
                    <p>Read the dossier, caveats, sources, twins, and Scout day plan before treating any place as a real-world finalist.</p>
                  </div>
                </section>

                <div className="panel-thin p-3 flex items-center justify-between flex-wrap gap-2">
                  {/* Visual count is animated via raf-driven textContent mutation,
                      which would spam any enclosing aria-live region. The
                      authoritative announcement lives in the sr-only sibling
                      below so screen readers hear only the final value. */}
                  <div className="text-xs text-stone" aria-hidden="true">
                    Showing <span className="font-mono-num text-frost tabular-nums"><AnimatedNumber value={ranked.length} /></span> of <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> places · ranked by <span className="text-frost">{scenarioRankingLabel}</span>
                  </div>
                  <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {`Showing ${ranked.length} of ${PLACE_COUNTS.total} places, ranked by ${scenarioRankingLabel}.${homeBasePlace ? ` Cards show climate deltas against your home base, ${homeBasePlace.name}.` : ""}`}
                  </div>
                  {homeBasePlace ? (
                    <div className="text-xs text-stone flex items-center gap-1.5 min-w-0">
                      <span className="truncate">
                        vs home <span className="text-frost">{homeBasePlace.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={clearHomeBase}
                        className="btn-ghost tc-home-base-clear !p-1 !text-[10px]"
                        aria-label={homeBaseClearLabel}
                        title={homeBaseClearLabel}
                      >
                        <X className="w-3 h-3" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                  <div className="tc-header-help-desktop text-xs text-stone">
                    <span><span className="tc-tip-pill">Scroll</span> zooms the map</span>
                    <span><span className="tc-tip-pill">{SEARCH_SHORTCUT_HINT}</span> or <span className="tc-tip-pill">/</span> search</span>
                    <span><span className="tc-tip-pill">R</span> surprise pick</span>
                    <button
                      type="button"
                      onClick={event => openShortcutsHelp(event.currentTarget)}
                      className={`tc-header-help-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgba(26,143,168,0.55)] ${shortcutsSeen ? "" : "tc-shortcuts-pulse"}`}
                      aria-label="Show keyboard shortcuts"
                      title="Show keyboard shortcuts"
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden /> Shortcuts
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={event => openShortcutsHelp(event.currentTarget)}
                    className={`tc-header-help-mobile tc-header-help-btn tc-header-help-btn--touch ${shortcutsSeen ? "" : "tc-shortcuts-pulse"}`}
                    aria-label="Show keyboard shortcuts and tips"
                    title="Show keyboard shortcuts and tips"
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
                      title="Dismiss message"
                    >
                      <X className="w-3 h-3" aria-hidden /> Dismiss
                    </button>
                  </div>
                ) : null}

                {ranked.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <EmptyResults
                      filters={filters}
                      onClearAll={clearAllFilters}
                      onClearSearch={clearSearch}
                      onRelaxLiveFinder={relaxLiveFinderFilters}
                      onClearGeography={clearGeographyFilters}
                      searchTerm={(filters.search ?? "").trim()}
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
                      homePlace={homeBasePlaceForScenario}
                      rankingLabel={scenarioRankingLabel}
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
                    scenario={climateScenario}
                    onScenarioChange={setClimateScenario}
                  />
                  <FootprintPanel />
                </aside>
              ) : null}
            </>
          )}

          {view === "trips" && (
            <div className="flex-1 min-w-0">
              <div className="max-w-6xl mx-auto">
                <LazyRouteErrorBoundary routeLabel="Climate Trips">
                  <Suspense fallback={<RouteLoadingFallback label="Climate Trips" />}>
                    <ClimateTripsView
                      onOpenPlace={onOpenPlaceFromTrips}
                      onPickTripTheme={onPickTripTheme}
                      onComparePlaces={comparePlaces}
                      onPreloadPlaceDetail={preloadPlaceDetail}
                      onPreloadCompare={preloadCompareView}
                      activeThemeId={activeCollection && CLIMATE_TRIP_THEME_BY_ID[activeCollection] ? activeCollection : undefined}
                    />
                  </Suspense>
                </LazyRouteErrorBoundary>
              </div>
            </div>
          )}

          {view === "collections" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5 tc-page-intro">
                  <div className="text-xs uppercase tracking-wider text-stone">Curated</div>
                  <h1 className="font-atlas text-3xl text-ice text-depth-hero mt-0.5">Collections</h1>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    Hand-assembled routes through the atlas: rain shadows, sky islands, eternal springs, lake snowbelts, and other climate families. Pin one to narrow the map.
                  </p>
                </div>
                <LazyRouteErrorBoundary routeLabel="Collections">
                  <Suspense fallback={<RouteLoadingFallback label="Collections" />}>
                    <CollectionsView
                      onOpenPlace={onOpenPlaceFromCollections}
                      onPick={onPickCollection}
                      activeId={activeCollection ?? undefined}
                    />
                  </Suspense>
                </LazyRouteErrorBoundary>
              </div>
            </div>
          )}

          {view === "learn" && (
            <div className="flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5 tc-page-intro tc-page-intro--sage">
                  <div className="text-xs uppercase tracking-wider text-stone">Learn</div>
                  <h1 className="font-atlas text-3xl text-ice text-depth-hero mt-0.5">Field guide</h1>
                  <p className="text-sm text-frost mt-1 max-w-2xl">
                    Microclimate has a grammar. Lapse rate, cold-air pooling, orographic lift, and thermal belts give readers and agents the words to explain why a place feels unlike its neighbors.
                  </p>
                </div>
                <LazyRouteErrorBoundary routeLabel="Learn">
                  <Suspense fallback={<RouteLoadingFallback label="Learn" />}>
                    <LearnMode onOpenPlace={onOpenPlaceFromLearn} />
                  </Suspense>
                </LazyRouteErrorBoundary>
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
            scenario={climateScenario}
            onScenarioChange={setClimateScenario}
            projecting={processor.projecting}
            footer={<FootprintPanel />}
            detailOpen={Boolean(selectedId)}
            onOpenChange={setFilterSheetOpen}
          />
        ) : null}
      </div>

      <div ref={footerRegionRef} data-footer-region>
        <Footer />
      </div>

        </main>
      </div>

      {selectedPlace ? (
        <LazyRouteErrorBoundary routeLabel="Place profile">
          <Suspense
            fallback={(
              <PlaceDetailLoadingFallback
                placeName={selectedPlace.name}
                onClose={closeDetail}
                occluded={placeDetailOccluded}
              />
            )}
          >
            <PlaceDetail
              place={selectedPlace}
              onClose={closeDetail}
              onCompareToggle={toggleCompare}
              inCompareIds={compareIds}
              onPickArchetype={pickArchetype}
              onOpenPlace={openPlace}
              liveFitFilters={filters}
              residencyFitContext={dossierFitContext}
              bookmarked={selectedPlace ? bookmarkIds.has(selectedPlace.id) : false}
              onBookmarkToggle={toggleBookmark}
              homePlace={homeBasePlace}
              onHomeBaseToggle={toggleHomeBase}
              occluded={placeDetailOccluded}
              scenario={climateScenario}
              animateEntry={animatePlaceDetailEntry}
            />
          </Suspense>
        </LazyRouteErrorBoundary>
      ) : null}
      {compareOpen ? (
        <LazyRouteErrorBoundary routeLabel="Compare">
          <Suspense fallback={<CompareLoadingFallback places={activeComparePlaces} onClose={closeCompare} />}>
            <CompareView
            places={activeComparePlaces}
            open={compareOpen}
            onClose={closeCompare}
            onRemove={toggleCompare}
            onOpenPlace={id => {
              closeCompare();
              openPlace(id);
            }}
            onCopyView={copyCurrentView}
            shareStatus={shareStatus}
            shareFallbackUrl={shareFallbackUrl}
            liveFitFilters={filters}
            homePlace={homeBasePlaceForScenario}
            onAddPlace={toggleCompare}
            candidates={compareCandidates}
            comparisonLens={comparisonLens}
            onComparisonLensChange={setComparisonLens}
            scenario={climateScenario}
            occluded={compareViewOccluded}
          />
          </Suspense>
        </LazyRouteErrorBoundary>
      ) : null}

      {showShortcuts && <ShortcutsOverlay onClose={closeShortcutsHelp} />}
    </div>
  );
}

const EmptyResults = memo(function EmptyResults({
  filters,
  onClearAll,
  onClearSearch,
  onRelaxLiveFinder,
  onClearGeography,
  searchTerm,
}: {
  filters: FilterState;
  onClearAll: () => void;
  onClearSearch: () => void;
  onRelaxLiveFinder: () => void;
  onClearGeography: () => void;
  searchTerm: string;
}) {
  // Tailor the message to what is actually narrowing the set so the guidance
  // points at the right control instead of always blaming "filters".
  const liveSignalCount = countLiveFinderConstraintSignals(filters);
  const geographyCount = filters.countries.size + filters.archetypes.size;
  const hasOtherFilters = hasNonSearchExplorerFilters(filters);
  const searchOnly = searchTerm.length > 0 && !hasOtherFilters;
  const filtersOnly = searchTerm.length === 0 && hasOtherFilters;

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
  const recoveryActions: Array<{
    key: string;
    label: string;
    detail: string;
    onClick: () => void;
    primary?: boolean;
  }> = [];

  if (searchTerm.length > 0) {
    recoveryActions.push({
      key: "search",
      label: "Clear search",
      detail: `Remove “${searchTerm}” and keep the climate-fit filters intact.`,
      onClick: onClearSearch,
      primary: searchOnly,
    });
  }
  if (liveSignalCount > 0) {
    recoveryActions.push({
      key: "live",
      label: "Relax Live Finder",
      detail: `Drop ${liveSignalCount} comfort, risk, or growability limit${liveSignalCount === 1 ? "" : "s"} while keeping search and geography.`,
      onClick: onRelaxLiveFinder,
      primary: filtersOnly && geographyCount === 0,
    });
  }
  if (geographyCount > 0) {
    recoveryActions.push({
      key: "geography",
      label: "Clear region / terrain",
      detail: `Drop ${geographyCount} region or terrain filter${geographyCount === 1 ? "" : "s"} while keeping search and Live Finder signals.`,
      onClick: onClearGeography,
      primary: filtersOnly && liveSignalCount === 0,
    });
  }
  recoveryActions.push({
    key: "all",
    label: "Reset Explorer",
    detail: "Return to the full atlas and restart the fit search.",
    onClick: onClearAll,
    primary: !recoveryActions.some(action => action.primary),
  });

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
      <div className="tc-empty-results__recovery" role="group" aria-label="Ways to recover matching places">
        <div className="tc-empty-results__recovery-head">
          <span>Try next</span>
          <p>Loosen one part of the screen instead of losing the whole scouting context.</p>
        </div>
        <div className="tc-empty-results__actions">
          {recoveryActions.map(action => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className="tc-empty-results__action"
              data-primary={action.primary || undefined}
            >
              <span>{action.label}</span>
              <small>{action.detail}</small>
            </button>
          ))}
        </div>
      </div>
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
  onMenuOpenChange,
}: {
  view: View;
  setView: (v: View) => void;
  onOpenCompare: OpenCompareHandler;
  onPreloadCompare: () => void;
  compareCount: number;
  themePreference: ThemePreference;
  onThemeChange: (next: ThemePreference) => void;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const menuRef = useRef<HTMLDialogElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useFocusTrap(menuPanelRef, menuOpen);

  useEffect(() => {
    if (!menuOpen) return;
    let alive = true;
    const id = window.requestAnimationFrame(() => {
      if (!alive) return;
      menuCloseRef.current?.focus({ preventScroll: true });
    });
    return () => {
      alive = false;
      window.cancelAnimationFrame(id);
    };
  }, [menuOpen]);

  useEffect(() => {
    const d = menuRef.current;
    if (!d) return;
    const sync = () => {
      setMenuOpen(d.open);
      onMenuOpenChange(d.open);
    };
    d.addEventListener("toggle", sync);
    sync();
    return () => {
      d.removeEventListener("toggle", sync);
      onMenuOpenChange(false);
    };
  }, [onMenuOpenChange]);

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

  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return;
    const closeFromBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) closeMenu();
    };
    dialog.addEventListener("click", closeFromBackdrop);
    return () => dialog.removeEventListener("click", closeFromBackdrop);
  }, [closeMenu]);

  const openMenu = useCallback(() => {
    menuRef.current?.showModal();
    menuCloseRef.current?.focus({ preventScroll: true });
  }, []);

  const pickView = useCallback(
    (v: View) => {
      setView(v);
      closeMenu();
    },
    [setView, closeMenu],
  );
  const compareAriaLabel = `Open compare (${compareCount} ${compareCount === 1 ? "place" : "places"})`;
  const menuTriggerLabel = menuOpen ? "Close site menu" : "Open site menu";

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
            ref={menuTriggerRef}
            type="button"
            onClick={menuOpen ? closeMenu : openMenu}
            className="tc-header-menu-trigger min-[560px]:hidden"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="tc-site-menu"
            title={menuTriggerLabel}
          >
            <Menu className="w-5 h-5" aria-hidden />
            <span className="sr-only">{menuTriggerLabel}</span>
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
              onClick={event => onOpenCompare({ trigger: event.currentTarget })}
              onPointerEnter={onPreloadCompare}
              onFocus={onPreloadCompare}
              onPointerDown={onPreloadCompare}
              className="btn-primary tc-compare-open-trigger !text-xs !py-1.5"
              aria-label={compareAriaLabel}
              title={compareAriaLabel}
            >
              <Target className="w-3.5 h-3.5" aria-hidden /> Compare · {compareCount}
            </button>
          )}
        </nav>

        <dialog
          ref={menuRef}
          id="tc-site-menu"
          aria-modal="true"
          className="tc-site-menu-dialog tc-glass-dialog-motion"
          aria-labelledby="tc-site-menu-title"
        >
          <div
            ref={menuPanelRef}
            className="relative z-10 tc-site-menu-dialog__inner"
          >
            <div className="tc-site-menu-dialog__head">
              <h2 id="tc-site-menu-title" className="font-atlas text-lg text-ice m-0">
                Navigate
              </h2>
              <button ref={menuCloseRef} type="button" onClick={closeMenu} className="btn-ghost tc-site-menu-dialog__close !p-2 rounded-lg" aria-label="Close menu" title="Close menu">
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
                  onClick={event => {
                    closeMenu();
                    onOpenCompare({ trigger: menuTriggerRef.current ?? event.currentTarget });
                  }}
                  className="btn-primary tc-compare-open-trigger w-full justify-center !py-2.5 mt-1"
                  aria-label={compareAriaLabel}
                  title={compareAriaLabel}
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

const QuickPick = memo(function QuickPick({
  icon: Icon,
  label,
  description,
  onClick,
  active,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  active: boolean;
}) {
  const accessibleLabel = `${label}: ${description}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`hero-quick-pick${active ? " hero-quick-pick--active" : ""}`}
      aria-label={accessibleLabel}
      aria-pressed={active}
      title={accessibleLabel}
    >
      <Icon className="hero-quick-pick__icon" aria-hidden />
      <span>{label}</span>
    </button>
  );
});

const COUNTRY_LABELS: Record<Country, string> = {
  USA: "U.S.",
  Canada: "Canada",
  Mexico: "Mexico",
};

function rankingOptionLabel(id: RankingProfile): string {
  return RANKING_OPTIONS.find(option => option.id === id)?.label ?? id.replace(/-/g, " ");
}

function fitJourneySignals(bundle: LifestyleBundle, temp: UnitState["temp"]): string {
  const parts = bundle.presets.map(preset => LIVE_FIT_PRESET_BY_ID[preset]?.shortLabel ?? preset);
  if (bundle.maxSummerHighC != null) parts.push(`summer <= ${fmtTemp(bundle.maxSummerHighC, temp)}`);
  if (bundle.minWinterLowC != null) parts.push(`winter >= ${fmtTemp(bundle.minWinterLowC, temp)}`);
  if (bundle.minGrowability != null) parts.push(`growability ${bundle.minGrowability}+`);
  if (bundle.maxFireRisk) parts.push(`fire <= ${bundle.maxFireRisk.replace(/-/g, " ")}`);
  if (bundle.maxOverallRisk) parts.push(`risk <= ${bundle.maxOverallRisk.replace(/-/g, " ")}`);
  return parts.length ? parts.join(" / ") : "ranking only";
}

function fitJourneyScope(bundle: LifestyleBundle): string | null {
  const parts: string[] = [];
  if (bundle.countries?.length) {
    parts.push(bundle.countries.map(country => COUNTRY_LABELS[country]).join(" + "));
  }
  if (bundle.archetypes?.length) {
    parts.push(`${bundle.archetypes.length} terrain families`);
  }
  return parts.length ? parts.join(" / ") : null;
}

function ActiveFitJourneyReceipt({
  bundle,
  scoutBrief,
  onOpenPlace,
  onCompareLeaders,
  onPreloadCompare,
}: {
  bundle: LifestyleBundle;
  scoutBrief: ExplorerScoutBrief | null;
  onOpenPlace: OpenPlaceHandler;
  onCompareLeaders: ComparePlacesHandler;
  onPreloadCompare: () => void;
}) {
  const prose = useProse();
  const { temp } = useUnits();
  const signals = fitJourneySignals(bundle, temp);
  const scope = fitJourneyScope(bundle);
  const rankingRead = rankingOptionLabel(bundle.ranking);
  const canCompare = (scoutBrief?.compareIds.length ?? 0) >= 2;

  return (
    <section className="fit-journey-receipt" aria-label={`Active Fit Finder path: ${bundle.label}`}>
      <div className="fit-journey-receipt__main">
        <div className="fit-journey-receipt__head">
          <span className="fit-journey-receipt__eyebrow">Fit Finder path active</span>
          <strong className="fit-journey-receipt__title">{bundle.label}</strong>
        </div>
        <p className="fit-journey-receipt__copy">{bundle.description}</p>
        <div className="fit-journey-receipt__chips" aria-label={`${bundle.label} applied lens`}>
          <span>Rank by {rankingRead}</span>
          <span>{signals}</span>
          {scope ? <span>{scope}</span> : null}
        </div>
        <p className="fit-journey-receipt__next">
          <span>Next</span>{" "}
          {scoutBrief
            ? prose(scoutBrief.advisorRead.nextAction)
            : "No shortlist yet. Ease one constraint or clear the search before opening dossiers."}
        </p>
      </div>
      {scoutBrief ? (
        <div className="fit-journey-receipt__actions" aria-label={`${bundle.label} next actions`}>
          <button
            type="button"
            className="fit-journey-receipt__action"
            onClick={event => onOpenPlace(scoutBrief.leader.place.id, { trigger: event.currentTarget })}
            aria-label={`Open first scout dossier: ${scoutBrief.leader.place.name}`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden />
            Open first scout
          </button>
          <button
            type="button"
            className="fit-journey-receipt__action"
            onPointerEnter={onPreloadCompare}
            onFocus={onPreloadCompare}
            onPointerDown={onPreloadCompare}
            onClick={event => onCompareLeaders(scoutBrief.compareIds, { trigger: event.currentTarget })}
            aria-label={`Compare ${scoutBrief.compareIds.length} Fit Finder leaders`}
            disabled={!canCompare}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
            Compare leaders
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ActiveTripRouteReceipt({
  theme,
  rows,
  count,
  onOpenPlace,
  onCompareLeaders,
  onPreloadCompare,
}: {
  theme: ClimateTripTheme;
  rows: TripRouteRow[];
  count: number;
  onOpenPlace: OpenPlaceHandler;
  onCompareLeaders: ComparePlacesHandler;
  onPreloadCompare: () => void;
}) {
  const prose = useProse();
  const lead = rows[0];
  if (!lead) return null;
  const compareIds = rows.slice(0, COMPARE_LIMIT).map(row => row.place.id);
  const canCompare = compareIds.length >= 2;
  const windowRead = `${lead.profile.bestVisitWindow.label}: ${lead.profile.bestVisitWindow.range}`;

  return (
    <section
      className="fit-journey-receipt fit-journey-receipt--trip"
      aria-label={`Active trip route: ${theme.title}`}
    >
      <div className="fit-journey-receipt__main">
        <div className="fit-journey-receipt__head">
          <span className="fit-journey-receipt__eyebrow">Trip route active</span>
          <strong className="fit-journey-receipt__title">{lead.place.name}</strong>
        </div>
        <p className="fit-journey-receipt__copy">
          {prose(lead.profile.climateStory)}
        </p>
        <div className="fit-journey-receipt__chips" aria-label={`${theme.title} trip route signals`}>
          <span>{lead.profile.scores.tourismAppeal}/100 tourism appeal</span>
          <span>{count} stop{count === 1 ? "" : "s"} in view</span>
          <span>{windowRead}</span>
        </div>
        <p className="fit-journey-receipt__next">
          <span>Field check</span>{" "}
          {prose(theme.seasonHint)}
        </p>
      </div>
      <div className="fit-journey-receipt__actions" aria-label={`${theme.title} trip route actions`}>
        <button
          type="button"
          className="fit-journey-receipt__action"
          onClick={event => onOpenPlace(lead.place.id, { trigger: event.currentTarget })}
          aria-label={`Open trip lead: ${lead.place.name}`}
        >
          <Route className="w-3.5 h-3.5" aria-hidden />
          Open trip lead
        </button>
        <button
          type="button"
          className="fit-journey-receipt__action"
          onPointerEnter={onPreloadCompare}
          onFocus={onPreloadCompare}
          onPointerDown={onPreloadCompare}
          onClick={event => onCompareLeaders(compareIds, { trigger: event.currentTarget })}
          aria-label={`Compare ${compareIds.length} trip stops for ${theme.title}`}
          disabled={!canCompare}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
          Compare trip stops
        </button>
      </div>
    </section>
  );
}

function CurrentScoutReadReceipt({
  scoutBrief,
  rankingLabel,
  count,
  onOpenPlace,
  onCompareLeaders,
  onPreloadCompare,
}: {
  scoutBrief: ExplorerScoutBrief;
  rankingLabel: string;
  count: number;
  onOpenPlace: OpenPlaceHandler;
  onCompareLeaders: ComparePlacesHandler;
  onPreloadCompare: () => void;
}) {
  const prose = useProse();
  const canCompare = scoutBrief.compareIds.length >= 2;
  const leader = scoutBrief.leader;
  const leaderScore = Math.round(leader.score);

  return (
    <section
      className="fit-journey-receipt fit-journey-receipt--scout"
      aria-label={`Current scout read: ${leader.place.name}`}
    >
      <div className="fit-journey-receipt__main">
        <div className="fit-journey-receipt__head">
          <span className="fit-journey-receipt__eyebrow">Current scout read</span>
          <strong className="fit-journey-receipt__title">{leader.place.name}</strong>
        </div>
        <p className="fit-journey-receipt__copy">
          {prose(scoutBrief.advisorRead.why)}
        </p>
        <div className="fit-journey-receipt__chips" aria-label={`${leader.place.name} current scout signals`}>
          <span>{leaderScore}/100 {rankingLabel}</span>
          <span>{count} in view</span>
          <span>{scoutBrief.compareIds.length} compare-ready finalists</span>
        </div>
        <p className="fit-journey-receipt__next">
          <span>Verify first</span>{" "}
          {prose(scoutBrief.advisorRead.checkFirst)}
        </p>
      </div>
      <div className="fit-journey-receipt__actions" aria-label={`Current scout actions for ${leader.place.name}`}>
        <button
          type="button"
          className="fit-journey-receipt__action"
          onClick={event => onOpenPlace(leader.place.id, { trigger: event.currentTarget })}
          aria-label={`Open current scout dossier: ${leader.place.name}`}
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden />
          Open dossier
        </button>
        <button
          type="button"
          className="fit-journey-receipt__action"
          onPointerEnter={onPreloadCompare}
          onFocus={onPreloadCompare}
          onPointerDown={onPreloadCompare}
          onClick={event => onCompareLeaders(scoutBrief.compareIds, { trigger: event.currentTarget })}
          aria-label={`Compare ${scoutBrief.compareIds.length} current scout finalists`}
          disabled={!canCompare}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
          Compare leaders
        </button>
      </div>
    </section>
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

type SignatureLeader = RankingResult & { signature: PlaceVisualSignature };

const ClimateSignalRail = memo(function ClimateSignalRail({
  rows,
  rankingLabel,
  onOpenPlace,
}: {
  rows: readonly SignatureLeader[];
  rankingLabel: string;
  onOpenPlace: OpenPlaceHandler;
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
      aria-describedby="climate-signal-rail-scroll-hint"
    >
      <p id="climate-signal-rail-scroll-hint" className="sr-only">
        Swipe or scroll horizontally to browse more current climate signal leaders.
      </p>
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
        {visibleRows.map((row, i) => {
          const openLabel = `Open ${row.place.name}, climate signal rank ${i + 1} by ${rankingLabel}`;
          return (
            <button
              key={row.place.id}
              type="button"
              onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
              className="climate-signal-rail__chip"
              style={{ ["--signature-rgb" as string]: row.signature.mapAccentRgb }}
              aria-label={openLabel}
              title={openLabel}
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
          );
        })}
      </div>
    </section>
  );
});

const HeroCard = memo(function HeroCard({
  count,
  livabilityTopTen,
  signatureLeaders,
  ranking,
  rankingLabel,
  onOpenPlace,
  onClearAll,
  onClearSearch,
  activeCollection,
  activeTripTheme,
  activeTripRows,
  onClearCollection,
  activeArchetypes,
  onClearArchetypes,
  onSurpriseMe,
  canSurprise,
  filters,
  onCopyView,
  shareStatus,
  shareFallbackUrl,
  homeBasePlace,
  onFindHomeBase,
  onClearHomeBase,
  compareCount,
  onOpenCompare,
  scoutBrief,
  contextStressRows,
  onCompareLeaders,
  onCompareContextLeaders,
  onPreloadCompare,
  onSaveScoutFinalists,
  onApplyContextScenario,
  bookmarkIds,
  recentIds,
  onToggleBookmark,
  onRemovePinnedPlace,
  onClearRecents,
  onApplyQuickPick,
  isQuickPickActive,
  showHeroSignalRail,
  showDetailedHeroPanels,
  showDesktopScoutBoard,
}: {
  count: number;
  livabilityTopTen: RankingResult[];
  signatureLeaders: SignatureLeader[];
  ranking: RankingProfile;
  rankingLabel: string;
  onOpenPlace: OpenPlaceHandler;
  onClearAll: () => void;
  onClearSearch: () => void;
  activeCollection: string | null;
  activeTripTheme: ClimateTripTheme | null;
  activeTripRows: TripRouteRow[];
  onClearCollection: () => void;
  activeArchetypes: Set<MicroclimateArchetype>;
  onClearArchetypes: () => void;
  onSurpriseMe: (opts?: { trigger?: HTMLElement | null }) => void;
  canSurprise: boolean;
  filters: FilterState;
  onCopyView: () => void;
  shareStatus: ShareStatus;
  shareFallbackUrl: string | null;
  homeBasePlace: Place | null;
  onFindHomeBase: () => void;
  onClearHomeBase: () => void;
  compareCount: number;
  onOpenCompare: OpenCompareHandler;
  scoutBrief: ExplorerScoutBrief | null;
  contextStressRows: ContextStressRow[];
  onCompareLeaders: ComparePlacesHandler;
  onCompareContextLeaders: ComparePlacesHandler;
  onPreloadCompare: () => void;
  onSaveScoutFinalists: (ids: readonly string[]) => void;
  onApplyContextScenario: (id: ContextScenarioId) => void;
  bookmarkIds: Set<string>;
  recentIds: readonly string[];
  onToggleBookmark: (id: string) => void;
  onRemovePinnedPlace: (id: string, nextFocusId?: string | null) => void;
  onClearRecents: () => void;
  onApplyQuickPick: (r: RankingProfile) => void;
  isQuickPickActive: (r: RankingProfile) => boolean;
  showHeroSignalRail: boolean;
  showDetailedHeroPanels: boolean;
  showDesktopScoutBoard: boolean;
}) {
  const prose = useProse();
  const shareFallbackInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (shareStatus !== "failed" || !shareFallbackUrl) return;
    const focusId = window.setTimeout(() => {
      const input = shareFallbackInputRef.current;
      if (!input) return;
      try {
        input.focus({ preventScroll: true });
        input.select();
      } catch {
        // The URL remains visible even if an embedded browser blocks selection.
      }
    }, 0);
    return () => window.clearTimeout(focusId);
  }, [shareFallbackUrl, shareStatus]);
  const active = activeCollection ? CURATED_SET_BY_ID[activeCollection] ?? null : null;
  const compareHeroLabel = `Open compare setup from Explorer hero (${compareCount} ${compareCount === 1 ? "place" : "places"})`;
  const liveSignalCount = (filters.fitPresets?.size ?? 0) + [
    filters.maxSummerHighC,
    filters.minWinterLowC,
    filters.minGrowability,
    filters.maxFireRisk,
    filters.maxOverallRisk,
  ].filter(v => v != null).length;
  const activeFitBundle = active ? null : LIFESTYLE_BUNDLES.find(bundle => isBundleActive(bundle, ranking, filters)) ?? null;
  const heroAccentRgb = signatureLeaders[0]?.signature.mapAccentRgb ?? "94, 196, 220";
  const prioritizeDesktopScoutBoard = showDetailedHeroPanels && showDesktopScoutBoard && scoutBrief !== null;
  const activeScopeClearLabel = active ? `Clear ${active.title} ${active.kind === "trip" ? "trip" : "collection"} filter` : "";
  const searchTerm = (filters.search ?? "").trim();
  const copyViewLabel =
    shareStatus === "shared"
      ? "Shared current Explorer view"
      : shareStatus === "copied"
        ? "Copied current Explorer view link"
        : shareStatus === "failed"
          ? "Retry copy or use the selected manual Explorer URL"
          : "Copy or share current Explorer view";
  const surpriseLabel = "Open a random place from the current filtered list";
  const scoutBriefJumpLabel = "Jump to Scout Brief synthesis";
  const findHomeBaseLabel = "Find your home-base analog using Explorer search";
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
                    : "Live Finder"}
            </span>
            {active && (
              <button
                type="button"
                onClick={onClearCollection}
                className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice"
                data-active-scope-clear
                aria-label={activeScopeClearLabel}
                title={activeScopeClearLabel}
              >
                <X className="w-3 h-3" aria-hidden /> Clear {active.kind === "trip" ? "trip" : "collection"}
              </button>
            )}
            {!active && activeArchetypes.size > 0 && (
              <button type="button" onClick={onClearArchetypes} className="inline-flex items-center gap-1 text-xs text-stone hover:text-ice" data-active-scope-clear>
                <X className="w-3 h-3" aria-hidden /> Clear archetypes
              </button>
            )}
          </div>
          <h1 className="font-atlas text-2xl min-[1400px]:text-3xl text-ice leading-tight text-depth-hero">
            {active ? active.title : "Find your climate fit before you scout"}
          </h1>
          <p className="text-sm text-frost mt-1 max-w-2xl leading-relaxed line-clamp-4 min-[1400px]:line-clamp-none">
            {active
              ? active.description
              : "Screen cool coasts, dry highlands, garden valleys, and lower-risk towns by comfort, terrain, risk, and lived ease before you plan a visit."}
          </p>

        </div>
        <div className="hero-action-stack">
          <button
            type="button"
            onClick={onCopyView}
            className={`btn-ghost !text-xs !py-1.5 w-full sm:w-auto border-[rgba(122,212,240,0.35)] ${shareStatus === "failed" ? "!border-[rgba(232,90,50,0.45)] !text-ember-700" : ""}`}
            aria-label={copyViewLabel}
            title={copyViewLabel}
          >
            <Link2 className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
            <span aria-live="polite">
              {shareStatus === "shared" ? "Shared" : shareStatus === "copied" ? "Link copied" : shareStatus === "failed" ? "Manual copy" : "Copy view"}
            </span>
          </button>
          {canSurprise && (
            <button
              type="button"
              onClick={event => onSurpriseMe({ trigger: event.currentTarget })}
              className="btn-ghost !text-xs !py-1.5 w-full sm:w-auto border-[rgba(122,212,240,0.35)]"
              aria-label={surpriseLabel}
              title={surpriseLabel}
            >
              <Shuffle className="w-3.5 h-3.5 text-[rgba(122,212,240,0.9)]" aria-hidden />
              Surprise me
            </button>
          )}
          {!homeBasePlace && !activeTripTheme ? (
            <button
              type="button"
              onClick={onFindHomeBase}
              className="btn-ghost !text-xs !py-1.5 w-full sm:w-auto border-[rgba(122,212,240,0.35)]"
              aria-label={findHomeBaseLabel}
              title={findHomeBaseLabel}
            >
              <Home className="w-3.5 h-3.5 text-[rgba(61,143,85,0.9)]" aria-hidden />
              Find home base
            </button>
          ) : null}
          {scoutBrief ? (
            <a
              href="#explorer-scout-brief"
              className="btn-ghost hero-action-stack__scout !text-xs !py-1.5 w-full sm:w-auto border-[rgba(122,212,240,0.35)]"
              aria-label={scoutBriefJumpLabel}
              title={scoutBriefJumpLabel}
            >
              <Compass className="w-3.5 h-3.5 text-[rgba(61,143,85,0.9)]" aria-hidden />
              Scout brief
            </a>
          ) : null}
          {compareCount > 0 ? (
            <button
              type="button"
              onClick={event => onOpenCompare({ trigger: event.currentTarget })}
              onPointerEnter={onPreloadCompare}
              onFocus={onPreloadCompare}
              onPointerDown={onPreloadCompare}
              className="btn-primary hero-action-stack__compare min-[560px]:hidden !text-xs !py-1.5 w-full justify-center"
              aria-label={compareHeroLabel}
              title={compareHeroLabel}
            >
              <Target className="w-3.5 h-3.5" aria-hidden /> Compare &middot; {compareCount}
            </button>
          ) : null}
          {shareStatus === "failed" && shareFallbackUrl ? (
            <div className="tc-share-fallback" role="group" aria-label="Manual Explorer share link">
              <span className="tc-share-fallback__label">Shareable link</span>
              <input
                ref={shareFallbackInputRef}
                type="text"
                readOnly
                value={shareFallbackUrl}
                className="tc-share-fallback__input"
                aria-label="Shareable Explorer URL for manual copy"
                onFocus={event => event.currentTarget.select()}
                onClick={event => event.currentTarget.select()}
              />
            </div>
          ) : null}
          <div className="flex items-center gap-4 shrink-0 text-right justify-end flex-wrap">
            <Metric label="In view" value={count} animated />
            <Metric label="Atlas total" value={PLACE_COUNTS.total} />
            <Metric label="Flagships" value={PLACE_COUNTS.tierA} />
          </div>
        </div>
      </div>

      {homeBasePlace ? (
        <div className="tc-hero-home-receipt" role="status" aria-label={`Explorer home base: ${homeBasePlace.name}`}>
          <Home className="tc-hero-home-receipt__icon" aria-hidden />
          <div className="tc-hero-home-receipt__copy">
            <strong>Home base: {homeBasePlace.name}</strong>
            <span>Cards, dossiers, and Compare read climate deltas against this anchor.</span>
          </div>
          <button
            type="button"
            className="tc-hero-home-receipt__action"
            onClick={onClearHomeBase}
            aria-label={`Stop comparing against ${homeBasePlace.name} from the Explorer hero (clear home base)`}
            title={`Stop comparing against ${homeBasePlace.name} from the Explorer hero (clear home base)`}
          >
            Clear
          </button>
        </div>
      ) : null}

      {activeTripTheme && activeTripRows.length > 0 ? (
        <ActiveTripRouteReceipt
          theme={activeTripTheme}
          rows={activeTripRows}
          count={count}
          onOpenPlace={onOpenPlace}
          onCompareLeaders={onCompareLeaders}
          onPreloadCompare={onPreloadCompare}
        />
      ) : !activeFitBundle && scoutBrief && count > 0 ? (
        <CurrentScoutReadReceipt
          scoutBrief={scoutBrief}
          rankingLabel={rankingLabel}
          count={count}
          onOpenPlace={onOpenPlace}
          onCompareLeaders={onCompareLeaders}
          onPreloadCompare={onPreloadCompare}
        />
      ) : null}

      {/* Climate-fit quick-picks — instant one-click ranking presets */}
      {!active && (
        <div
          className="hero-quick-picks"
          role="group"
          aria-label="Climate-fit quick picks"
          aria-describedby="hero-quick-picks-scroll-hint"
        >
          <span id="hero-quick-picks-scroll-hint" className="sr-only">
            Swipe or scroll horizontally to browse more Fit Finder paths.
          </span>
          <QuickPick icon={CalendarDays} label="Visit now" description="Rank places by the current month's scouting weather." onClick={() => onApplyQuickPick("best-this-month")} active={isQuickPickActive("best-this-month")} />
          <QuickPick icon={Sun} label="Comfort fit" description="Surface places with the easiest human-felt comfort." onClick={() => onApplyQuickPick("most-comfortable")} active={isQuickPickActive("most-comfortable")} />
          <QuickPick icon={Laptop} label="Remote work" description="Prioritize mild, livable places for remote-worker scouting." onClick={() => onApplyQuickPick("best-for-remote-work")} active={isQuickPickActive("best-for-remote-work")} />
          <QuickPick icon={Sunrise} label="Retirement" description="Look for mild all-year places with lower risk and daily ease." onClick={() => onApplyQuickPick("best-retirement")} active={isQuickPickActive("best-retirement")} />
          <QuickPick icon={Sprout} label="Garden life" description="Lift places with stronger yard, orchard, and growing-season signals." onClick={() => onApplyQuickPick("best-growability")} active={isQuickPickActive("best-growability")} />
          <QuickPick icon={Snowflake} label="Cool summers" description="Find places where peak-season afternoons stay restrained." onClick={() => onApplyQuickPick("coolest-summers")} active={isQuickPickActive("coolest-summers")} />
          <QuickPick icon={ShieldCheck} label="Low risk" description="Favor places with stronger climate-resilience and hazard cushions." onClick={() => onApplyQuickPick("climate-resilient")} active={isQuickPickActive("climate-resilient")} />
        </div>
      )}

      {count === 0 ? (
        <div className="tc-hero-empty-recovery" role="group" aria-label="Immediate zero-result recovery">
          <Search className="tc-hero-empty-recovery__icon" aria-hidden />
          <div className="tc-hero-empty-recovery__copy">
            <strong>{searchTerm ? `No matches for "${searchTerm}"` : "No places in this screen"}</strong>
            <span>Recover here before scrolling: clear the search or reset the full Explorer.</span>
          </div>
          <div className="tc-hero-empty-recovery__actions">
            {searchTerm ? (
              <button
                type="button"
                className="tc-hero-empty-recovery__action"
                onClick={onClearSearch}
                aria-label="Clear search from hero recovery"
                title="Clear search from hero recovery"
              >
                Clear search
              </button>
            ) : null}
            <button
              type="button"
              className="tc-hero-empty-recovery__action"
              data-primary={searchTerm ? undefined : true}
              onClick={onClearAll}
              aria-label="Reset Explorer from hero recovery"
              title="Reset Explorer from hero recovery"
            >
              Reset Explorer
            </button>
          </div>
        </div>
      ) : null}

      {activeFitBundle ? (
        <ActiveFitJourneyReceipt
          bundle={activeFitBundle}
          scoutBrief={scoutBrief}
          onOpenPlace={onOpenPlace}
          onCompareLeaders={onCompareLeaders}
          onPreloadCompare={onPreloadCompare}
        />
      ) : null}

      {prioritizeDesktopScoutBoard ? (
        <DesktopScoutBoard
          brief={scoutBrief}
          onOpenPlace={onOpenPlace}
          onCompareLeaders={onCompareLeaders}
          onPreloadCompare={onPreloadCompare}
          onSaveScoutFinalists={onSaveScoutFinalists}
          bookmarkIds={bookmarkIds}
          onToggleBookmark={onToggleBookmark}
        />
      ) : null}

      {showHeroSignalRail && signatureLeaders.length > 0 ? (
        <ClimateSignalRail
          rows={signatureLeaders}
          rankingLabel={rankingLabel}
          onOpenPlace={onOpenPlace}
        />
      ) : null}

      {showDetailedHeroPanels ? (
        <ExplorerHeroDetailPanels
          signatureLeaders={signatureLeaders}
          ranking={ranking}
          rankingLabel={rankingLabel}
          filters={filters}
          scoutBrief={scoutBrief}
          contextStressRows={contextStressRows}
          onOpenPlace={onOpenPlace}
          onCompareLeaders={onCompareLeaders}
          onCompareContextLeaders={onCompareContextLeaders}
          onPreloadCompare={onPreloadCompare}
          onSaveScoutFinalists={onSaveScoutFinalists}
          onApplyContextScenario={onApplyContextScenario}
          bookmarkIds={bookmarkIds}
          onToggleBookmark={onToggleBookmark}
          showDesktopScoutBoard={showDesktopScoutBoard}
          includeScoutBrief={!prioritizeDesktopScoutBoard}
        />
      ) : null}

      {showDetailedHeroPanels && livabilityTopTen.length > 0 ? (
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
            {livabilityTopTen.map((row, i) => {
              const openLabel = `Livability rank ${i + 1}. ${row.place.name}, ${row.place.koppen}. Open place profile.`;
              return (
                <button
                  key={row.place.id}
                  type="button"
                  onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
                  aria-label={openLabel}
                  title={openLabel}
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
              );
            })}
          </div>

        </div>
      ) : null}

      <PinnedAndRecentRails
        bookmarkIds={bookmarkIds}
        recentIds={recentIds}
        onOpenPlace={onOpenPlace}
        onRemovePinnedPlace={onRemovePinnedPlace}
        onClearRecents={onClearRecents}
        onComparePinned={onCompareLeaders}
        onPreloadCompare={onPreloadCompare}
      />

      <div className="hidden min-[1400px]:block">
        <FieldNoteStrip />
      </div>
    </div>
  );
});

const ExplorerHeroDetailPanels = memo(function ExplorerHeroDetailPanels({
  signatureLeaders,
  ranking,
  rankingLabel,
  filters,
  scoutBrief,
  contextStressRows,
  onOpenPlace,
  onCompareLeaders,
  onCompareContextLeaders,
  onPreloadCompare,
  onSaveScoutFinalists,
  onApplyContextScenario,
  bookmarkIds,
  onToggleBookmark,
  showDesktopScoutBoard,
  includeSignalRail = false,
  includeScoutBrief = true,
}: {
  signatureLeaders: SignatureLeader[];
  ranking: RankingProfile;
  rankingLabel: string;
  filters: FilterState;
  scoutBrief: ExplorerScoutBrief | null;
  contextStressRows: ContextStressRow[];
  onOpenPlace: OpenPlaceHandler;
  onCompareLeaders: ComparePlacesHandler;
  onCompareContextLeaders: ComparePlacesHandler;
  onPreloadCompare: () => void;
  onSaveScoutFinalists: (ids: readonly string[]) => void;
  onApplyContextScenario: (id: ContextScenarioId) => void;
  bookmarkIds: Set<string>;
  onToggleBookmark: (id: string) => void;
  showDesktopScoutBoard: boolean;
  includeSignalRail?: boolean;
  includeScoutBrief?: boolean;
}) {
  const desktopScoutBoard = includeScoutBrief && scoutBrief && showDesktopScoutBoard ? (
    <DesktopScoutBoard
      brief={scoutBrief}
      onOpenPlace={onOpenPlace}
      onCompareLeaders={onCompareLeaders}
      onPreloadCompare={onPreloadCompare}
      onSaveScoutFinalists={onSaveScoutFinalists}
      bookmarkIds={bookmarkIds}
      onToggleBookmark={onToggleBookmark}
    />
  ) : null;
  const signalRail = includeSignalRail && signatureLeaders.length > 0 ? (
    <ClimateSignalRail
      rows={signatureLeaders}
      rankingLabel={rankingLabel}
      onOpenPlace={onOpenPlace}
    />
  ) : null;
  const livingCompass = signatureLeaders.length > 0 ? (
    <LivingCompassWorkbench
      rows={signatureLeaders}
      ranking={ranking}
      rankingLabel={rankingLabel}
      filters={filters}
      scoutBrief={scoutBrief}
      onOpenPlace={onOpenPlace}
    />
  ) : null;
  return (
    <>
      {desktopScoutBoard}
      {signalRail}
      {livingCompass}

      {includeScoutBrief && scoutBrief && !showDesktopScoutBoard ? (
        <ScoutBriefPanel
          brief={scoutBrief}
          onOpenPlace={onOpenPlace}
          onCompareLeaders={onCompareLeaders}
          onPreloadCompare={onPreloadCompare}
          onSaveScoutFinalists={onSaveScoutFinalists}
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
    </>
  );
});

const MobileLivabilityTopTenStrip = memo(function MobileLivabilityTopTenStrip({
  rows,
  onOpenPlace,
}: {
  rows: RankingResult[];
  onOpenPlace: OpenPlaceHandler;
}) {
  const prose = useProse();
  if (rows.length === 0) return null;

  return (
    <div className="hero-top-ten px-3 py-2.5 sm:px-4 space-y-2.5">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-sage-700">Livability lens - top ten</div>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]"
        aria-label="Top ten places by livability blend in the current filtered list"
      >
        {rows.map((row, i) => {
          const openLabel = `Livability rank ${i + 1}. ${row.place.name}, ${row.place.koppen}. Open place profile.`;
          return (
            <button
              key={row.place.id}
              type="button"
              onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
              aria-label={openLabel}
              title={openLabel}
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
          );
        })}
      </div>
    </div>
  );
});

function scenarioRankMoveLabel(row: ScenarioReshuffleRow): string {
  if (row.currentRank == null) return "new to this future top set";
  if (row.rankDelta == null || row.rankDelta === 0) return `holds #${row.currentRank}`;
  return row.rankDelta > 0 ? `up ${row.rankDelta} from #${row.currentRank}` : `down ${Math.abs(row.rankDelta)} from #${row.currentRank}`;
}

function scenarioScoreLabel(row: ScenarioReshuffleRow): string {
  const projected = Math.round(row.projectedScore);
  if (row.currentScore == null || row.scoreDelta == null) return `${projected} projected`;
  const delta = Math.round(row.scoreDelta);
  const signed = delta > 0 ? `+${delta}` : `${delta}`;
  return `${projected} projected · ${signed} vs now`;
}

const ScenarioRemapPanel = memo(function ScenarioRemapPanel({
  summary,
  rankingLabel,
  onOpenPlace,
}: {
  summary: ScenarioReshuffleSummary;
  rankingLabel: string;
  onOpenPlace: OpenPlaceHandler;
}) {
  const { temp } = useUnits();
  const prose = useProse();
  const meta = scenarioMeta(summary.scenario);
  const leaderLine = summary.leaderChanged
    ? `${summary.projectedLeaderName ?? "A new leader"} overtakes ${summary.baselineLeaderName ?? "the present-day leader"}.`
    : `${summary.projectedLeaderName ?? "The leader"} still leads, but the margins are recalculated against projected normals.`;
  const churnLine = summary.newTopCount === 0
    ? "Projected top-four places are already present-day leaders; use the deltas to judge how their comfort margin changes."
    : `${summary.newTopCount} projected top-four ${summary.newTopCount === 1 ? "place is" : "places are"} new compared with the present-day top four.`;
  const newTopFact = summary.newTopCount === 1 ? "1 new top-four place" : `${summary.newTopCount} new top-four places`;

  return (
    <section className="scenario-remap panel-thin" aria-labelledby="scenario-remap-title">
      <div className="scenario-remap__head">
        <div className="min-w-0">
          <h2 id="scenario-remap-title" className="scenario-remap__eyebrow">
            2050 remap
          </h2>
          <p className="scenario-remap__headline">
            {meta.short} reranks {rankingLabel.toLowerCase()} against projected 2041-2060 normals.
          </p>
          <p className="scenario-remap__copy">
            {leaderLine} {churnLine} Deltas compare each projected place card with its 1991-2020 baseline.
          </p>
        </div>
        <div className="scenario-remap__facts" aria-label={`${meta.short} remap summary`}>
          <span>{meta.label}</span>
          <span>{summary.leaderChanged ? "new #1" : "leader holds"}</span>
          <span>{newTopFact}</span>
        </div>
      </div>

      <div className="scenario-remap__rows" aria-label={`${meta.short} projected leaders`}>
        {summary.rows.map(row => {
          const openLabel = `Open ${row.place.name}, projected ${meta.short} rank ${row.projectedRank}`;
          return (
            <button
              key={row.place.id}
              type="button"
              className="scenario-remap__row"
              onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
              aria-label={openLabel}
              title={prose(row.place.climateChange.outlook2050)}
            >
              <span className="scenario-remap__rank" aria-hidden>{row.projectedRank}</span>
              <span className="scenario-remap__main">
                <span className="scenario-remap__place">{row.place.name}</span>
                <span className="scenario-remap__move">{scenarioRankMoveLabel(row)}</span>
                <span className="scenario-remap__score">{scenarioScoreLabel(row)}</span>
              </span>
              <span className="scenario-remap__deltas" aria-label={`${row.place.name} projected climate deltas`}>
                <span>Summer {fmtDelta(row.summerHighDeltaC, temp, { digits: 1 })}</span>
                <span>Winter {fmtDelta(row.winterLowDeltaC, temp, { digits: 1 })}</span>
                <span>Precip {row.precipDeltaPct > 0 ? "+" : ""}{row.precipDeltaPct.toFixed(0)}%</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
  onOpenPlace: OpenPlaceHandler;
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
          {rankRows.map((row, i) => {
            const openLabel = `Rank ${i + 1}. ${row.place.name}. Score ${Math.round(row.score)}. Open place profile.`;
            return (
              <button
                key={row.place.id}
                type="button"
                className="living-compass__rank-row"
                style={{ ["--signature-rgb" as string]: row.signature.mapAccentRgb }}
                onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
                aria-label={openLabel}
                title={openLabel}
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
            );
          })}
        </div>
      </div>
    </section>
  );
});

const PinnedAndRecentRails = memo(function PinnedAndRecentRails({
  bookmarkIds,
  recentIds,
  onOpenPlace,
  onRemovePinnedPlace,
  onClearRecents,
  onComparePinned,
  onPreloadCompare,
}: {
  bookmarkIds: Set<string>;
  recentIds: readonly string[];
  onOpenPlace: OpenPlaceHandler;
  onRemovePinnedPlace: (id: string, nextFocusId?: string | null) => void;
  onClearRecents: () => void;
  onComparePinned: ComparePlacesHandler;
  onPreloadCompare: () => void;
}) {
  const prose = useProse();
  const pinnedPlaces = useMemo(
    () => [...bookmarkIds].map(placeForId).filter(isPlace),
    [bookmarkIds],
  );
  const pinnedCompareIds = useMemo(
    () => pinnedPlaces.slice(0, COMPARE_LIMIT).map(place => place.id),
    [pinnedPlaces],
  );
  const shortlistReadiness = useMemo(
    () => buildShortlistReadiness(pinnedPlaces.length),
    [pinnedPlaces.length],
  );
  const shortlistPacketCue = useMemo(
    () => buildShortlistPacketCue(pinnedPlaces, COMPARE_LIMIT),
    [pinnedPlaces],
  );
  const shortlistPacketCounterweight = shortlistPacketCue?.counterweight ?? null;
  const shortlistPacketPrimaryLabel = shortlistPacketCue
    ? `Open first shortlist dossier: ${shortlistPacketCue.primary.name}`
    : "";
  const shortlistPacketCounterweightLabel = shortlistPacketCounterweight
    ? `Open shortlist contrast dossier: ${shortlistPacketCounterweight.name}`
    : "";
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
  const recentClearLabel = `Clear recently viewed list (${recentPlaces.length} ${recentPlaces.length === 1 ? "place" : "places"} shown)`;
  const pinnedCompareLabel = pinnedCompareIds.length === 1
    ? `Open Compare Workbench setup for ${pinnedPlaces[0]?.name ?? "this place"} from your shortlist`
    : `Open Compare Workbench for ${pinnedCompareIds.length} pinned places from your shortlist`;

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
            <div className="hero-mini-rail__actions">
              {pinnedCompareIds.length > 0 ? (
                <button
                  type="button"
                  className="btn-ghost hero-mini-rail__compare !text-xs !py-1 !px-2"
                  onPointerEnter={onPreloadCompare}
                  onFocus={onPreloadCompare}
                  onPointerDown={onPreloadCompare}
                  onClick={event => onComparePinned(pinnedCompareIds, { trigger: event.currentTarget })}
                  aria-label={pinnedCompareLabel}
                  title={pinnedCompareLabel}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
                  {pinnedCompareIds.length === 1 ? "Workbench setup" : "Workbench"}
                </button>
              ) : null}
              <ShortlistExportMenu places={pinnedPlaces} />
            </div>
          </div>
          {shortlistReadiness ? (
            <p className="hero-mini-rail__readiness" aria-label="Shortlist scout packet status">
              <span>{shortlistReadiness.label}</span>
              {shortlistReadiness.detail}
            </p>
          ) : null}
          {shortlistPacketCue ? (
            <div className="hero-shortlist-packet" aria-label="Shortlist packet decision cue">
              <div className="hero-shortlist-packet__head">
                <span>Scout packet</span>
                <strong>Start with {shortlistPacketCue.primary.name}</strong>
              </div>
              <p className="hero-shortlist-packet__summary">
                {prose(shortlistPacketCue.summary)}
              </p>
              <div className="hero-shortlist-packet__actions">
                <button
                  type="button"
                  className="hero-shortlist-packet__action"
                  onClick={event => onOpenPlace(shortlistPacketCue.primary.id, { trigger: event.currentTarget })}
                  aria-label={shortlistPacketPrimaryLabel}
                  title={shortlistPacketPrimaryLabel}
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden />
                  Start dossier
                </button>
                {shortlistPacketCounterweight ? (
                  <button
                    type="button"
                    className="hero-shortlist-packet__action"
                    onClick={event => onOpenPlace(shortlistPacketCounterweight.id, { trigger: event.currentTarget })}
                    aria-label={shortlistPacketCounterweightLabel}
                    title={shortlistPacketCounterweightLabel}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
                    Contrast
                  </button>
                ) : null}
              </div>
              <p className="hero-shortlist-packet__watch">
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden />
                <span><strong>Watch:</strong> {prose(shortlistPacketCue.watch)}</span>
              </p>
            </div>
          ) : null}
          <p id="hero-pinned-rail-scroll-hint" className="sr-only">
            Swipe or scroll horizontally to browse saved shortlist places; each place also has an unpin control.
          </p>
          <ul
            className="hero-mini-rail"
            aria-label="Pinned places — click to open, × to remove"
            aria-describedby="hero-pinned-rail-scroll-hint"
          >
            {pinnedPlaces.map((p, index) => {
              const nextPinnedFocusId = pinnedPlaces[index + 1]?.id ?? pinnedPlaces[index - 1]?.id ?? null;
              return (
                <li key={p.id} className="hero-mini-rail__chip" data-tone="ochre">
                  <button
                    type="button"
                    className="hero-mini-rail__chip-open bg-transparent border-0 p-0 m-0 inline-flex items-center gap-1.5 cursor-pointer text-left min-w-0"
                    onClick={event => onOpenPlace(p.id, { trigger: event.currentTarget })}
                    aria-label={`Open ${p.name} from your shortlist`}
                    title={`Open ${p.name} from your shortlist`}
                  >
                    <span className="hero-mini-rail__chip-name">{p.name}</span>
                    <span className="hero-mini-rail__chip-meta">{p.country === "USA" ? "US" : p.country === "Canada" ? "CA" : "MX"}</span>
                  </button>
                  <button
                    type="button"
                    className="hero-mini-rail__chip-remove bg-transparent border-0 cursor-pointer"
                    onClick={() => onRemovePinnedPlace(p.id, nextPinnedFocusId)}
                    aria-label={`Unpin ${p.name} from your shortlist`}
                    title={`Unpin ${p.name} from your shortlist`}
                    data-shortlist-remove-id={p.id}
                  >
                    ×
                  </button>
                </li>
              );
            })}
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
              aria-label={recentClearLabel}
              title={recentClearLabel}
            >
              Clear
            </button>
          </div>
          <p id="hero-recent-rail-scroll-hint" className="sr-only">
            Swipe or scroll horizontally to browse recently opened place profiles.
          </p>
          <ul
            className="hero-mini-rail"
            aria-label="Recently opened place profiles"
            aria-describedby="hero-recent-rail-scroll-hint"
          >
            {recentPlaces.map(p => (
              <li key={p.id} className="contents">
                <button
                  type="button"
                  className="hero-mini-rail__chip"
                  onClick={event => onOpenPlace(p.id, { trigger: event.currentTarget })}
                  aria-label={`Open ${p.name} (recently viewed)`}
                  title={`Open ${p.name} (recently viewed)`}
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
  onOpenPlace: OpenPlaceHandler;
  onCompareContextLeaders: ComparePlacesHandler;
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
              onClick={event => onCompareContextLeaders(leaderSummary.compareIds, { trigger: event.currentTarget })}
              aria-label={`Compare context top picks: ${leaderSummary.compareIds.length} places`}
              title={leaderSummary.summary}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
              Compare top picks
            </button>
          ) : null}
        </div>
      </div>

      <p id="context-stress-scroll-hint" className="sr-only">
        Swipe or scroll horizontally to browse alternate context leaders and apply a different scouting lens.
      </p>
      <div
        className="context-stress__rail"
        aria-label="Scenario leaders for the current place context"
        aria-describedby="context-stress-scroll-hint"
      >
        {rows.map(row => {
          const openLabel = `Open ${row.leader.place.name} from ${row.label}`;
          return (
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
              onClick={event => onOpenPlace(row.leader.place.id, { trigger: event.currentTarget })}
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
                onClick={event => onOpenPlace(row.leader.place.id, { trigger: event.currentTarget })}
                aria-label={openLabel}
                title={openLabel}
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
          );
        })}
      </div>
    </section>
  );
});

const ScoutBriefPanel = memo(function ScoutBriefPanel({
  brief,
  onOpenPlace,
  onCompareLeaders,
  onPreloadCompare,
  onSaveScoutFinalists,
}: {
  brief: ExplorerScoutBrief;
  onOpenPlace: OpenPlaceHandler;
  onCompareLeaders: ComparePlacesHandler;
  onPreloadCompare: () => void;
  onSaveScoutFinalists: (ids: readonly string[]) => void;
}) {
  const prose = useProse();
  const canSaveFinalists = brief.compareIds.length >= 2;
  const openLeaderLabel = `Open scout brief leader ${brief.leader.place.name}`;
  const compareLeadersLabel = `Compare current leaders: ${brief.compareIds.length} places`;
  const saveFinalistsLabel = `Save ${brief.compareIds.length} Scout Brief finalists to your shortlist`;
  return (
    <section id="explorer-scout-brief" className="scout-brief" aria-labelledby="explorer-scout-brief-title">
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
            onClick={event => onOpenPlace(brief.leader.place.id, { trigger: event.currentTarget })}
            aria-label={openLeaderLabel}
            title={openLeaderLabel}
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
              onClick={event => onCompareLeaders(brief.compareIds, { trigger: event.currentTarget })}
              aria-label={compareLeadersLabel}
              title={compareLeadersLabel}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
              Compare leaders
            </button>
          ) : null}
          {canSaveFinalists ? (
            <button
              type="button"
              className="btn-ghost !text-xs !py-1.5"
              onClick={() => onSaveScoutFinalists(brief.compareIds)}
              aria-label={saveFinalistsLabel}
              title={saveFinalistsLabel}
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-ochre-700" aria-hidden />
              Save finalists
            </button>
          ) : null}
        </div>
      </div>

      <div className="scout-brief__body">
        <div className="scout-brief__lead-stack">
          <button
            type="button"
            className="scout-brief__leader"
            onClick={event => onOpenPlace(brief.leader.place.id, { trigger: event.currentTarget })}
            aria-label={`Open ${brief.leader.place.name}, current best match`}
            title={`Open ${brief.leader.place.name}, current best match`}
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
          <div className="scout-brief__advisor" aria-label="Advisor verdict">
            <div className="scout-brief__advisor-head">
              <span className="scout-brief__advisor-title">Advisor verdict</span>
              <span className="scout-brief__advisor-confidence">{prose(brief.advisorRead.confidence)}</span>
            </div>
            <p><span>Read</span> {prose(brief.advisorRead.verdict)}</p>
            <p><span>Why</span> {prose(brief.advisorRead.why)}</p>
            <p><span>Check</span> {prose(brief.advisorRead.checkFirst)}</p>
            <p><span>Next</span> {prose(brief.advisorRead.nextAction)}</p>
          </div>
          <div className="scout-brief__visit-plan" role="group" aria-label="Scout day plan">
            <div className="scout-brief__visit-plan-head">
              <span className="scout-brief__visit-plan-title">Scout day plan</span>
              <span className="scout-brief__visit-plan-copy">Visit order, field check, then the first tradeoff read.</span>
            </div>
            <div className="scout-brief__visit-plan-list">
              {brief.scoutPlan.map((step, index) => {
                const Icon = step.kind === "field-check" ? Compass : step.kind === "tradeoff" ? ArrowLeftRight : Target;
                const labelClass = step.kind === "field-check" ? "scout-brief__field-check-label" : "scout-brief__next-step-label";
                const actionClass = step.kind === "field-check" ? "scout-brief__field-check-action" : "scout-brief__next-step-action";
                const detailClass = step.kind === "field-check" ? "scout-brief__field-check-detail" : "scout-brief__next-step-detail";
                const toneClass = step.kind === "field-check" ? "scout-brief__field-check" : "scout-brief__next-step";
                const action = prose(step.action);
                const detail = prose(step.detail);
                return (
                  <button
                    key={`${step.kind}-${step.place.id}-${index}`}
                    type="button"
                    className={`${toneClass} scout-brief__visit-plan-step`}
                    onClick={event => onOpenPlace(step.place.id, { trigger: event.currentTarget })}
                    title={detail}
                    aria-label={`Scout day plan step ${index + 1}. ${step.label}: ${action} ${detail} Open place profile.`}
                  >
                    <span className="scout-brief__visit-plan-index" aria-hidden>{index + 1}</span>
                    <span className="min-w-0">
                      <span className={labelClass}><Icon className="w-3.5 h-3.5" aria-hidden />{step.label}</span>
                      <span className={actionClass}>{action}</span>
                      <span className={detailClass}>{detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="scout-brief__audience" aria-label="Who this shortlist fits and who should pause">
            <div>
              <span className="scout-brief__audience-label">Best for</span>{" "}
              <p>{prose(brief.audienceRead.love)}</p>
            </div>
            <div>
              <span className="scout-brief__audience-label">Pause if</span>{" "}
              <p>{prose(brief.audienceRead.pause)}</p>
            </div>
          </div>
        </div>

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
                onClick={event => onOpenPlace(signal.place.id, { trigger: event.currentTarget })}
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
                  onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
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
  onCompareLeaders,
  onPreloadCompare,
  onSaveScoutFinalists,
  bookmarkIds,
  onToggleBookmark,
}: {
  brief: ExplorerScoutBrief;
  onOpenPlace: OpenPlaceHandler;
  onCompareLeaders: ComparePlacesHandler;
  onPreloadCompare: () => void;
  onSaveScoutFinalists: (ids: readonly string[]) => void;
  bookmarkIds: Set<string>;
  onToggleBookmark: (id: string) => void;
}) {
  const prose = useProse();
  const leaderPinned = bookmarkIds.has(brief.leader.place.id);
  const canSaveFinalists = brief.compareIds.length >= 2;
  const leaderOpenLabel = `Open ${brief.leader.place.name} from the desktop relocation workbench`;
  const dossierLabel = `Open ${brief.leader.place.name} climate dossier from the Scout Board`;
  const compareLabel = `Compare current Scout Board finalists: ${brief.compareIds.length} places`;
  const saveFinalistsLabel = `Save ${brief.compareIds.length} Scout Board finalists to your shortlist`;
  const pinLabel = leaderPinned
    ? `Unpin ${brief.leader.place.name} from your shortlist`
    : `Pin ${brief.leader.place.name} to your shortlist`;
  return (
    <section className="desktop-scout-board" aria-label="Desktop relocation workbench">
      <div className="desktop-scout-board__leader">
        <div>
          <div className="desktop-scout-board__eyebrow">Relocation read</div>
          <button
            type="button"
            className="desktop-scout-board__leader-button"
            onClick={event => onOpenPlace(brief.leader.place.id, { trigger: event.currentTarget })}
            aria-label={leaderOpenLabel}
            title={leaderOpenLabel}
          >
            <span className="desktop-scout-board__place">{brief.leader.place.name}</span>
            <span className="desktop-scout-board__note">{prose(brief.fitLine)}</span>
          </button>
          <div className="desktop-scout-board__actions" aria-label={`Scout actions for ${brief.leader.place.name}`}>
            <button
              type="button"
              className="desktop-scout-board__action"
              onClick={event => onOpenPlace(brief.leader.place.id, { trigger: event.currentTarget })}
              aria-label={dossierLabel}
              title={dossierLabel}
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden />
              Dossier
            </button>
            <button
              type="button"
              className="desktop-scout-board__action"
              onPointerEnter={onPreloadCompare}
              onFocus={onPreloadCompare}
              onPointerDown={onPreloadCompare}
              onClick={event => onCompareLeaders(brief.compareIds, { trigger: event.currentTarget })}
              aria-label={compareLabel}
              title={compareLabel}
              disabled={brief.compareIds.length < 2}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
              Compare {brief.compareIds.length}
            </button>
            <button
              type="button"
              className="desktop-scout-board__action"
              onClick={() => onSaveScoutFinalists(brief.compareIds)}
              aria-label={saveFinalistsLabel}
              title={saveFinalistsLabel}
              disabled={!canSaveFinalists}
            >
              <BookmarkCheck className="w-3.5 h-3.5" aria-hidden />
              Save {brief.compareIds.length}
            </button>
            <button
              type="button"
              className="desktop-scout-board__action"
              data-active={leaderPinned}
              aria-pressed={leaderPinned}
              onClick={() => onToggleBookmark(brief.leader.place.id)}
              aria-label={pinLabel}
              title={pinLabel}
            >
              <BookmarkCheck className="w-3.5 h-3.5" aria-hidden />
              {leaderPinned ? "Pinned" : "Pin"}
            </button>
          </div>
          <div className="desktop-scout-board__advisor" aria-label="Advisor verdict">
            <div className="desktop-scout-board__advisor-title">Advisor verdict</div>
            <p><span>Read</span> {prose(brief.advisorRead.verdict)}</p>
            <p><span>Why</span> {prose(brief.advisorRead.why)}</p>
            <p><span>Check</span> {prose(brief.advisorRead.checkFirst)}</p>
            <p><span>Next</span> {prose(brief.advisorRead.nextAction)}</p>
            <p><span>Confidence</span> {prose(brief.advisorRead.confidence)}</p>
          </div>
          <div className="desktop-scout-board__visit-plan" role="group" aria-label="Desktop scout day plan">
            <div className="desktop-scout-board__visit-plan-title">Scout day plan</div>
            {brief.scoutPlan.slice(0, 3).map((step, index) => {
              const Icon = step.kind === "field-check" ? Compass : step.kind === "tradeoff" ? ArrowLeftRight : Target;
              const labelClass = step.kind === "field-check" ? "desktop-scout-board__field-check-label" : "desktop-scout-board__next-step-label";
              const actionClass = step.kind === "field-check" ? "desktop-scout-board__field-check-action" : "desktop-scout-board__next-step-action";
              const toneClass = step.kind === "field-check" ? "desktop-scout-board__field-check" : "desktop-scout-board__next-step";
              const action = prose(step.action);
              const detail = prose(step.detail);
              return (
                <button
                  key={`${step.kind}-${step.place.id}-${index}`}
                  type="button"
                  className={`${toneClass} desktop-scout-board__visit-plan-step`}
                  onClick={event => onOpenPlace(step.place.id, { trigger: event.currentTarget })}
                  title={detail}
                  aria-label={`Desktop scout day plan step ${index + 1}. ${step.label}: ${action} ${detail} Open place profile.`}
                >
                  <span className="desktop-scout-board__visit-plan-index" aria-hidden>{index + 1}</span>
                  <span className="min-w-0">
                    <span className={labelClass}><Icon className="w-3 h-3" aria-hidden />{step.label}</span>
                    <span className={actionClass}>{action}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="desktop-scout-board__audience" aria-label="Who this shortlist fits and who should pause">
            <p><span>Best for</span> {prose(brief.audienceRead.love)}</p>
            <p><span>Pause if</span> {prose(brief.audienceRead.pause)}</p>
          </div>
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

      <div className="desktop-scout-board__evidence" aria-label="Compact desktop shortlist evidence">
        <div className="desktop-scout-board__signals" aria-label="Priority leaders in the current shortlist">
          {brief.decisionSignals.slice(0, 3).map(signal => (
            <button
              key={signal.label}
              type="button"
              className="desktop-scout-board__signal"
              onClick={event => onOpenPlace(signal.place.id, { trigger: event.currentTarget })}
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
            onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
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

