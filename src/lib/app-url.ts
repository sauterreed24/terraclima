/**
 * Serialises explorer state into the query string so links are copy-pasteable.
 * Defaults stay out of the URL (?p=id rather than ?v=explorer&p=id).
 *
 * URL parameters
 *   v       view: "explorer" (default) | "trips" | "collections" | "learn"
 *   p       selected place id
 *   col     active collection id
 *   c       country filter list (comma-separated, e.g. "USA,Canada")
 *   a       archetype filter list (comma-separated)
 *   q       search query (raw)
 *   cmp     compare set, comma-separated place ids (capped at COMPARE_LIMIT)
 *   cmpopen "0" when a compare set of 2+ is queued but the Compare dialog is
 *           closed (absent: a 2+ set opens Compare, as shared links expect)
 *   r       ranking profile
 *   fit     live-fit preset ids, comma-separated
 *   sh      max mean Jun-Aug high (C)
 *   wl      min mean Dec-Feb low (C)
 *   grow    min growability score
 *   fire    max wildfire risk
 *   risk    max average risk level
 *   theme   color theme: "auto" (default) | "light" | "dark"
 *   scn     climate scenario layer: "now" (default) | "ssp245" | "ssp585"
 *   clens   comparison priority lens: "balanced" (default) | "travel" | "move" | "remote" | "garden" | "risk"
 *   hb      home-base place id (cards/dossiers read climate deltas against it)
 */

import type { Country, MicroclimateArchetype, RiskLevel, ScenarioId } from "../types";
import type { RankingProfile } from "./scoring";
import { DEFAULT_RANKING } from "./app-ranking-preference";
import { ALL_RANKING_PROFILES } from "./ranking-options";
import type { ThemePreference } from "./theme";
import { isThemePreference } from "./theme";
import {
  LIVE_FIT_GROWABILITY_FLOORS,
  LIVE_FIT_PRESET_BY_ID,
  LIVE_FIT_RISK_CEILINGS,
  LIVE_FIT_SUMMER_CAPS_C,
  LIVE_FIT_WINTER_FLOORS_C,
  type LiveFitPresetId,
} from "./live-fit";
import {
  DEFAULT_COMPARISON_LENS,
  isComparisonLensId,
  type ComparisonLensId,
} from "./compare-workbench";

export type AppView = "explorer" | "trips" | "collections" | "learn";

/** Hard cap on compared places — kept here so URL parsing and toggleCompare share a single source. */
export const COMPARE_LIMIT = 4;

export interface ParsedAppUrl {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
  countries: Country[];
  archetypes: string[];
  search: string;
  compareIds: string[];
  ranking: RankingProfile | null;
  fitPresets: LiveFitPresetId[];
  maxSummerHighC: number | null;
  minWinterLowC: number | null;
  minGrowability: number | null;
  maxFireRisk: RiskLevel | null;
  maxOverallRisk: RiskLevel | null;
  theme: ThemePreference | null;
  scenario: ScenarioId | null;
  comparisonLens: ComparisonLensId | null;
  homeBaseId: string | null;
  compareClosed: boolean;
}

const VIEWS = new Set<AppView>(["explorer", "trips", "collections", "learn"]);
const COUNTRY_VALUES = new Set<Country>(["USA", "Canada", "Mexico"]);
const RANKING_VALUES = new Set<string>(ALL_RANKING_PROFILES);
// "now" is the implicit default and is never written to the URL.
const SCENARIO_VALUES = new Set<ScenarioId>(["ssp245", "ssp585"]);

function parseFiniteNumber(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseAllowedNumber(raw: string | null, allowed: readonly number[]): number | undefined {
  const n = parseFiniteNumber(raw);
  return n !== undefined && allowed.includes(n) ? n : undefined;
}

function isAllowedNumber(value: number | null | undefined, allowed: readonly number[]): value is number {
  return value != null && allowed.includes(value);
}

function isLiveFitRiskCeiling(value: RiskLevel | string | null | undefined): value is RiskLevel {
  return value != null && (LIVE_FIT_RISK_CEILINGS as readonly string[]).includes(value);
}

function hasLiveFitSpecificState(state: AppUrlState): boolean {
  return (state.fitPresets?.length ?? 0) > 0 ||
    state.maxSummerHighC != null ||
    state.minWinterLowC != null ||
    state.minGrowability != null ||
    state.maxFireRisk != null ||
    state.maxOverallRisk != null;
}

export function parseAppSearch(search: string): Partial<ParsedAppUrl> {
  let s = search;
  if (s.startsWith("?")) s = s.slice(1);
  const params = new URLSearchParams(s);
  const out: Partial<ParsedAppUrl> = {};
  const v = params.get("v");
  if (v && VIEWS.has(v as AppView)) out.view = v as AppView;
  const p = params.get("p");
  if (p) out.placeId = p;
  const col = params.get("col");
  if (col) out.collectionId = col;
  const c = params.get("c");
  if (c) {
    const parts = c.split(",").map(t => t.trim()).filter(Boolean);
    out.countries = parts.filter((x): x is Country => COUNTRY_VALUES.has(x as Country));
  }
  const a = params.get("a");
  if (a) {
    out.archetypes = a.split(",").map(t => t.trim()).filter(Boolean);
  }
  const q = params.get("q");
  if (q) out.search = q;
  const cmp = params.get("cmp");
  if (cmp) {
    out.compareIds = cmp.split(",").map(t => t.trim()).filter(Boolean).slice(0, COMPARE_LIMIT);
  }
  if (params.get("cmpopen") === "0") out.compareClosed = true;
  const r = params.get("r");
  if (r && RANKING_VALUES.has(r)) out.ranking = r as RankingProfile;
  const fit = params.get("fit");
  if (fit) {
    out.fitPresets = fit
      .split(",")
      .map(t => t.trim())
      .filter((id): id is LiveFitPresetId => Object.prototype.hasOwnProperty.call(LIVE_FIT_PRESET_BY_ID, id));
  }
  const sh = parseAllowedNumber(params.get("sh"), LIVE_FIT_SUMMER_CAPS_C);
  if (sh !== undefined) out.maxSummerHighC = sh;
  const wl = parseAllowedNumber(params.get("wl"), LIVE_FIT_WINTER_FLOORS_C);
  if (wl !== undefined) out.minWinterLowC = wl;
  const grow = parseAllowedNumber(params.get("grow"), LIVE_FIT_GROWABILITY_FLOORS);
  if (grow !== undefined) out.minGrowability = grow;
  const fire = params.get("fire");
  if (isLiveFitRiskCeiling(fire)) out.maxFireRisk = fire;
  const risk = params.get("risk");
  if (isLiveFitRiskCeiling(risk)) out.maxOverallRisk = risk;
  const theme = params.get("theme");
  if (isThemePreference(theme)) out.theme = theme;
  const scn = params.get("scn");
  if (scn && SCENARIO_VALUES.has(scn as ScenarioId)) out.scenario = scn as ScenarioId;
  const clens = params.get("clens");
  if (isComparisonLensId(clens) && clens !== DEFAULT_COMPARISON_LENS) out.comparisonLens = clens;
  const hb = params.get("hb");
  if (hb) out.homeBaseId = hb;
  return out;
}

/** `tcPlace: true` means this history entry was created by opening a place in-app — browser Back should close the panel. */
export type AppHistoryState = { tcPlace?: boolean } | null;

/**
 * Full canonical state used to format URLs. The `*Exists` callbacks are
 * passed in so this module stays free of corpus imports (and therefore free
 * of `data/places` initialisation cost when the URL is unused). The filter
 * and compare fields are optional for backward compatibility with the
 * minimal call-site shape used pre-D1/D2.
 */
export interface AppUrlState {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
  countries?: readonly Country[];
  archetypes?: readonly string[];
  search?: string;
  compareIds?: readonly string[];
  /** Compare dialog is closed while a 2+ set is queued (written as cmpopen=0). */
  compareClosed?: boolean;
  ranking?: RankingProfile | null;
  fitPresets?: readonly string[];
  maxSummerHighC?: number | null;
  minWinterLowC?: number | null;
  minGrowability?: number | null;
  maxFireRisk?: RiskLevel | null;
  maxOverallRisk?: RiskLevel | null;
  theme?: ThemePreference | null;
  scenario?: ScenarioId | null;
  comparisonLens?: ComparisonLensId | null;
  homeBaseId?: string | null;
  collectionExists: (id: string) => boolean;
  archetypeExists?: (id: string) => boolean;
  placeExists?: (id: string) => boolean;
}

/** Pathname + search for the given explorer state — used to compare with `window.location` and dedupe history writes. */
export function formatAppRelativeUrl(state: AppUrlState): string {
  const params = new URLSearchParams();
  if (state.view !== "explorer") params.set("v", state.view);
  if (state.placeId) params.set("p", state.placeId);
  if (state.collectionId && state.collectionExists(state.collectionId)) {
    params.set("col", state.collectionId);
  }
  const countries = state.countries ?? [];
  if (countries.length > 0) {
    const ordered = [...countries].slice().sort();
    params.set("c", ordered.join(","));
  }
  const archetypes = state.archetypes ?? [];
  if (archetypes.length > 0) {
    const allowed = state.archetypeExists
      ? archetypes.filter(state.archetypeExists)
      : [...archetypes];
    if (allowed.length > 0) {
      params.set("a", allowed.slice().sort().join(","));
    }
  }
  const search = state.search ?? "";
  if (search.trim()) {
    params.set("q", search.trim());
  }
  if (
    state.ranking &&
    RANKING_VALUES.has(state.ranking) &&
    (state.ranking !== DEFAULT_RANKING || hasLiveFitSpecificState(state))
  ) {
    params.set("r", state.ranking);
  }
  const fitPresets = state.fitPresets ?? [];
  if (fitPresets.length > 0) {
    const allowed = fitPresets.filter(id => Object.prototype.hasOwnProperty.call(LIVE_FIT_PRESET_BY_ID, id));
    if (allowed.length > 0) params.set("fit", allowed.slice().sort().join(","));
  }
  if (isAllowedNumber(state.maxSummerHighC, LIVE_FIT_SUMMER_CAPS_C)) params.set("sh", String(state.maxSummerHighC));
  if (isAllowedNumber(state.minWinterLowC, LIVE_FIT_WINTER_FLOORS_C)) params.set("wl", String(state.minWinterLowC));
  if (isAllowedNumber(state.minGrowability, LIVE_FIT_GROWABILITY_FLOORS)) params.set("grow", String(state.minGrowability));
  if (isLiveFitRiskCeiling(state.maxFireRisk)) params.set("fire", state.maxFireRisk);
  if (isLiveFitRiskCeiling(state.maxOverallRisk)) params.set("risk", state.maxOverallRisk);
  if (state.theme === "light" || state.theme === "dark") {
    // "auto" is the implicit default; omit so a link doesn't force a theme.
    params.set("theme", state.theme);
  }
  if (state.scenario && SCENARIO_VALUES.has(state.scenario)) {
    // "now" is the implicit default; omit so a link doesn't force a projection.
    params.set("scn", state.scenario);
  }
  const compareIds = state.compareIds ?? [];
  if (compareIds.length > 0) {
    const validate = state.placeExists ?? (() => true);
    const ids = [...compareIds].filter(validate).slice(0, COMPARE_LIMIT);
    if (ids.length > 0) params.set("cmp", ids.join(","));
    if (ids.length >= 2 && state.compareClosed) params.set("cmpopen", "0");
  }
  // The comparison lens only means something while places are being compared.
  if (state.comparisonLens && state.comparisonLens !== DEFAULT_COMPARISON_LENS && (state.compareIds?.length ?? 0) > 0) {
    params.set("clens", state.comparisonLens);
  }
  if (state.homeBaseId) {
    const validate = state.placeExists ?? (() => true);
    if (validate(state.homeBaseId)) params.set("hb", state.homeBaseId);
  }
  const qs = params.toString();
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return qs ? `${path}?${qs}` : path;
}

function withPreservedDossierHash(state: AppUrlState, relativeUrl: string): string {
  if (typeof window === "undefined" || !state.placeId) return relativeUrl;

  // `#deep-…` dossier chapters and `#pd-…` section links both survive URL
  // syncs while the same place stays open; the lazy profile resolves them
  // once it mounts, which is after the first sync.
  const hash = window.location.hash;
  if (!hash.startsWith("#deep-") && !hash.startsWith("#pd-")) return relativeUrl;

  const currentPlaceId = new URLSearchParams(window.location.search).get("p");
  if (currentPlaceId !== state.placeId) return relativeUrl;

  return `${relativeUrl}${hash}`;
}

export function replaceAppUrl(historyState: AppHistoryState, state: AppUrlState): void {
  if (typeof window === "undefined") return;
  const url = withPreservedDossierHash(state, formatAppRelativeUrl(state));
  window.history.replaceState(historyState, "", url);
}

export function pushAppUrl(historyState: AppHistoryState, state: AppUrlState): void {
  if (typeof window === "undefined") return;
  const url = withPreservedDossierHash(state, formatAppRelativeUrl(state));
  window.history.pushState(historyState, "", url);
}

export interface ValidatedAppState {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
  countries: Country[];
  archetypes: MicroclimateArchetype[];
  search: string;
  compareIds: string[];
  ranking: RankingProfile | null;
  fitPresets: LiveFitPresetId[];
  maxSummerHighC: number | null;
  minWinterLowC: number | null;
  minGrowability: number | null;
  maxFireRisk: RiskLevel | null;
  maxOverallRisk: RiskLevel | null;
  theme: ThemePreference | null;
  scenario: ScenarioId | null;
  comparisonLens: ComparisonLensId;
  homeBaseId: string | null;
  /** True when a 2+ compare set should open the Compare dialog. */
  compareOpen: boolean;
}

export function validatedStateFromSearch(
  search: string,
  placesById: Record<string, unknown>,
  collectionById: Record<string, unknown>,
  archetypesById?: Record<string, unknown>,
  resolvePlaceId?: (id: string) => string | null,
): ValidatedAppState {
  const p = parseAppSearch(search);
  const view: AppView =
    p.view === "trips" || p.view === "collections" || p.view === "learn" ? p.view : "explorer";
  const resolveId = resolvePlaceId ?? ((id: string) => placesById[id] ? id : null);
  const placeId = p.placeId ? resolveId(p.placeId) : null;
  const collectionId = p.collectionId && collectionById[p.collectionId] ? p.collectionId : null;
  const countries = p.countries ?? [];
  const archetypes = archetypesById
    ? (p.archetypes ?? []).filter(
        (a): a is MicroclimateArchetype => Object.prototype.hasOwnProperty.call(archetypesById, a),
      )
    : (p.archetypes ?? []) as MicroclimateArchetype[];
  const search_ = p.search ?? "";
  const compareIds = [...new Set((p.compareIds ?? []).map(resolveId).filter((id): id is string => id != null))]
    .slice(0, COMPARE_LIMIT);
  const homeBaseId = p.homeBaseId ? resolveId(p.homeBaseId) : null;
  return {
    view,
    placeId,
    collectionId,
    countries,
    archetypes,
    search: search_,
    compareIds,
    ranking: p.ranking ?? null,
    fitPresets: p.fitPresets ?? [],
    maxSummerHighC: p.maxSummerHighC ?? null,
    minWinterLowC: p.minWinterLowC ?? null,
    minGrowability: p.minGrowability ?? null,
    maxFireRisk: p.maxFireRisk ?? null,
    maxOverallRisk: p.maxOverallRisk ?? null,
    theme: p.theme ?? null,
    scenario: p.scenario ?? null,
    comparisonLens: p.comparisonLens ?? DEFAULT_COMPARISON_LENS,
    homeBaseId,
    compareOpen: compareIds.length >= 2 && !p.compareClosed,
  };
}

/** One-shot hydration from the address bar (sync, before first paint). */
export function readInitialAppState(
  placesById: Record<string, unknown>,
  collectionById: Record<string, unknown>,
  archetypesById?: Record<string, unknown>,
  resolvePlaceId?: (id: string) => string | null,
): ValidatedAppState {
  if (typeof window === "undefined") {
    return {
      view: "explorer",
      placeId: null,
      collectionId: null,
      countries: [],
      archetypes: [],
      search: "",
      compareIds: [],
      ranking: null,
      fitPresets: [],
      maxSummerHighC: null,
      minWinterLowC: null,
      minGrowability: null,
      maxFireRisk: null,
      maxOverallRisk: null,
      theme: null,
      scenario: null,
      comparisonLens: DEFAULT_COMPARISON_LENS,
      homeBaseId: null,
      compareOpen: false,
    };
  }
  return validatedStateFromSearch(window.location.search, placesById, collectionById, archetypesById, resolvePlaceId);
}
