/**
 * Serialises explorer state into the query string so links are copy-pasteable.
 * Defaults stay out of the URL (?p=id rather than ?v=explorer&p=id).
 */

export type AppView = "explorer" | "collections" | "learn";

export interface ParsedAppUrl {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
}

const VIEWS = new Set<AppView>(["explorer", "collections", "learn"]);

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
  return out;
}

/** `tcPlace: true` means this history entry was created by opening a place in-app — browser Back should close the panel. */
export type AppHistoryState = { tcPlace?: boolean } | null;

/** Pathname + search for the given explorer state — used to compare with `window.location` and dedupe history writes. */
export function formatAppRelativeUrl(state: {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
  collectionExists: (id: string) => boolean;
}): string {
  const params = new URLSearchParams();
  if (state.view !== "explorer") params.set("v", state.view);
  if (state.placeId) params.set("p", state.placeId);
  if (state.collectionId && state.collectionExists(state.collectionId)) {
    params.set("col", state.collectionId);
  }
  const qs = params.toString();
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return qs ? `${path}?${qs}` : path;
}

export function replaceAppUrl(historyState: AppHistoryState, state: {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
  collectionExists: (id: string) => boolean;
}): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(historyState, "", formatAppRelativeUrl(state));
}

export function pushAppUrl(historyState: AppHistoryState, state: {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
  collectionExists: (id: string) => boolean;
}): void {
  if (typeof window === "undefined") return;
  window.history.pushState(historyState, "", formatAppRelativeUrl(state));
}

/** @deprecated use replaceAppUrl — kept for any external callers expecting replace-only */
export function writeAppUrl(state: {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
  collectionExists: (id: string) => boolean;
}): void {
  replaceAppUrl(null, state);
}

export function validatedStateFromSearch(
  search: string,
  placesById: Record<string, unknown>,
  collectionById: Record<string, unknown>,
): { view: AppView; placeId: string | null; collectionId: string | null } {
  const p = parseAppSearch(search);
  const view: AppView =
    p.view === "collections" || p.view === "learn" ? p.view : "explorer";
  const placeId = p.placeId && placesById[p.placeId] ? p.placeId : null;
  const collectionId = p.collectionId && collectionById[p.collectionId] ? p.collectionId : null;
  return { view, placeId, collectionId };
}

/** One-shot hydration from the address bar (sync, before first paint). */
export function readInitialAppState(placesById: Record<string, unknown>, collectionById: Record<string, unknown>): {
  view: AppView;
  placeId: string | null;
  collectionId: string | null;
} {
  if (typeof window === "undefined") {
    return { view: "explorer", placeId: null, collectionId: null };
  }
  const p = parseAppSearch(window.location.search);
  const view: AppView =
    p.view === "collections" || p.view === "learn" ? p.view : "explorer";
  const placeId = p.placeId && placesById[p.placeId] ? p.placeId : null;
  const collectionId = p.collectionId && collectionById[p.collectionId] ? p.collectionId : null;
  return {
    view,
    placeId,
    collectionId,
  };
}
