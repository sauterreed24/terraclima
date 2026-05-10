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
 *   r       ranking profile
 *   fit     live-fit preset ids, comma-separated
 *   sh      max mean Jun-Aug high (C)
 *   wl      min mean Dec-Feb low (C)
 *   grow    min growability score
 *   fire    max wildfire risk
 *   risk    max average risk level
 */

import type { Country, MicroclimateArchetype, RiskLevel } from "../types";
import type { RankingProfile } from "./scoring";
import { ALL_RANKING_PROFILES } from "./ranking-options";
import { LIVE_FIT_PRESET_BY_ID, type LiveFitPresetId } from "./live-fit";

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
}

const VIEWS = new Set<AppView>(["explorer", "trips", "collections", "learn"]);
const COUNTRY_VALUES = new Set<Country>(["USA", "Canada", "Mexico"]);
const RANKING_VALUES = new Set<string>(ALL_RANKING_PROFILES);
const RISK_VALUES = new Set<RiskLevel>(["very-low", "low", "moderate", "elevated", "high", "very-high"]);

function parseFiniteNumber(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
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
  const r = params.get("r");
  if (r && RANKING_VALUES.has(r)) out.ranking = r as RankingProfile;
  const fit = params.get("fit");
  if (fit) {
    out.fitPresets = fit
      .split(",")
      .map(t => t.trim())
      .filter((id): id is LiveFitPresetId => Object.prototype.hasOwnProperty.call(LIVE_FIT_PRESET_BY_ID, id));
  }
  const sh = parseFiniteNumber(params.get("sh"));
  if (sh !== undefined) out.maxSummerHighC = sh;
  const wl = parseFiniteNumber(params.get("wl"));
  if (wl !== undefined) out.minWinterLowC = wl;
  const grow = parseFiniteNumber(params.get("grow"));
  if (grow !== undefined) out.minGrowability = grow;
  const fire = params.get("fire");
  if (fire && RISK_VALUES.has(fire as RiskLevel)) out.maxFireRisk = fire as RiskLevel;
  const risk = params.get("risk");
  if (risk && RISK_VALUES.has(risk as RiskLevel)) out.maxOverallRisk = risk as RiskLevel;
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
  ranking?: RankingProfile | null;
  fitPresets?: readonly string[];
  maxSummerHighC?: number | null;
  minWinterLowC?: number | null;
  minGrowability?: number | null;
  maxFireRisk?: RiskLevel | null;
  maxOverallRisk?: RiskLevel | null;
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
  if (state.ranking && RANKING_VALUES.has(state.ranking)) {
    params.set("r", state.ranking);
  }
  const fitPresets = state.fitPresets ?? [];
  if (fitPresets.length > 0) {
    const allowed = fitPresets.filter(id => Object.prototype.hasOwnProperty.call(LIVE_FIT_PRESET_BY_ID, id));
    if (allowed.length > 0) params.set("fit", allowed.slice().sort().join(","));
  }
  if (state.maxSummerHighC != null) params.set("sh", String(state.maxSummerHighC));
  if (state.minWinterLowC != null) params.set("wl", String(state.minWinterLowC));
  if (state.minGrowability != null) params.set("grow", String(state.minGrowability));
  if (state.maxFireRisk) params.set("fire", state.maxFireRisk);
  if (state.maxOverallRisk) params.set("risk", state.maxOverallRisk);
  const compareIds = state.compareIds ?? [];
  if (compareIds.length > 0) {
    const validate = state.placeExists ?? (() => true);
    const ids = [...compareIds].filter(validate).slice(0, COMPARE_LIMIT);
    if (ids.length > 0) params.set("cmp", ids.join(","));
  }
  const qs = params.toString();
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return qs ? `${path}?${qs}` : path;
}

export function replaceAppUrl(historyState: AppHistoryState, state: AppUrlState): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(historyState, "", formatAppRelativeUrl(state));
}

export function pushAppUrl(historyState: AppHistoryState, state: AppUrlState): void {
  if (typeof window === "undefined") return;
  window.history.pushState(historyState, "", formatAppRelativeUrl(state));
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
    };
  }
  return validatedStateFromSearch(window.location.search, placesById, collectionById, archetypesById, resolvePlaceId);
}
