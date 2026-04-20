/**
 * Keeps `?p=…` (and other query params) intact while syncing or clearing
 * `#deep-…` dossier chapter fragments via `history.replaceState`.
 */

const DEEP_PREFIX = "#deep-";

export function replaceUrlPreservingQuery(nextHref: string): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", nextHref);
}

/** Sets `#deep-{sectionId}` when it differs from the current hash. */
export function replaceDossierHash(sectionId: string): void {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  const next = `${DEEP_PREFIX}${sectionId}`;
  if (u.hash === next) return;
  u.hash = `deep-${sectionId}`;
  replaceUrlPreservingQuery(u.toString());
}

/** Removes `#deep-…` only; leaves pathname and search unchanged. */
export function clearDossierHash(): void {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  if (!u.hash.startsWith(DEEP_PREFIX)) return;
  u.hash = "";
  replaceUrlPreservingQuery(`${u.pathname}${u.search}`);
}
