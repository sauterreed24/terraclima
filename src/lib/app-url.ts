/**
 * Serialises explorer state into the query string so links are copy-pasteable.
 * Defaults stay out of the URL (?p=id rather than ?v=explorer&p=id).
 *
 * URL parameters
 *   v       view: "explorer" (default) | "collections" | "learn"
 *   p       selected place id
 *   col     active collection id
 *   c       country filter list (comma-separated, e.g. "USA,Canada")
 *   a       archetype filter list (comma-separated)
 *   q       search query (raw)
 *   cmp     compare set, comma-separated place ids (capped at COMPARE_LIMIT)
 */

import type { Country, MicroclimateArchetype } from "../types";

export type AppView = "explorer" | "collections" | "learn";

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
}

const VIEWS = new Set<AppView>(["explorer", "collections", "learn"]);
const COUNTRY_VALUES = new Set<Country>(["USA", "Canada", "Mexico"]);

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
}

export function validatedStateFromSearch(
  search: string,
  placesById: Record<string, unknown>,
  collectionById: Record<string, unknown>,
  archetypesById?: Record<string, unknown>,
): ValidatedAppState {
  const p = parseAppSearch(search);
  const view: AppView =
    p.view === "collections" || p.view === "learn" ? p.view : "explorer";
  const placeId = p.placeId && placesById[p.placeId] ? p.placeId : null;
  const collectionId = p.collectionId && collectionById[p.collectionId] ? p.collectionId : null;
  const countries = p.countries ?? [];
  const archetypes = archetypesById
    ? (p.archetypes ?? []).filter(
        (a): a is MicroclimateArchetype => Object.prototype.hasOwnProperty.call(archetypesById, a),
      )
    : (p.archetypes ?? []) as MicroclimateArchetype[];
  const search_ = p.search ?? "";
  const compareIds = (p.compareIds ?? []).filter(id => placesById[id]).slice(0, COMPARE_LIMIT);
  return { view, placeId, collectionId, countries, archetypes, search: search_, compareIds };
}

/** One-shot hydration from the address bar (sync, before first paint). */
export function readInitialAppState(
  placesById: Record<string, unknown>,
  collectionById: Record<string, unknown>,
  archetypesById?: Record<string, unknown>,
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
    };
  }
  return validatedStateFromSearch(window.location.search, placesById, collectionById, archetypesById);
}
