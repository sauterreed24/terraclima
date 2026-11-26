// ============================================================
// Terraclima — saved places carried in a link
// ============================================================
// "Link to these places" puts the saved list in the address (`?saved=a,b,c`).
// Opening such a link never changes the reader's list by itself: the app asks
// first, then removes the parameter from the address.
// ============================================================

import { shareUrl } from "./share";

export const SAVED_LINK_PARAM = "saved";
/** More than the atlas holds (226); longer lists are cut. */
export const SAVED_LINK_MAX = 300;

/** A link to the app's start page that carries these place ids, in order. */
export function savedPlacesLink(pageHref: string, ids: readonly string[]): string {
  const url = new URL(pageHref);
  const base = `${url.origin}${url.pathname}`;
  return `${base}?${SAVED_LINK_PARAM}=${ids.slice(0, SAVED_LINK_MAX).map(encodeURIComponent).join(",")}`;
}

/**
 * Place ids carried by a `?saved=` link, resolved to current ids (old aliases
 * included), unknown ones dropped, duplicates removed, order kept.
 */
export function readSharedSavedIds(search: string, resolve: (id: string) => string | null): string[] {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get(SAVED_LINK_PARAM);
  } catch {
    return [];
  }
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = resolve(part.trim());
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= SAVED_LINK_MAX) break;
  }
  return out;
}

/** The same address without the `saved` parameter. */
export function withoutSavedParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(SAVED_LINK_PARAM);
  return url.toString();
}

/**
 * Share (or copy) a link carrying these ids, from the current page's address.
 * Called straight from the click, so the browser still counts it as the
 * reader's action (Safari refuses share and clipboard otherwise).
 */
export function shareSavedPlacesLink(ids: readonly string[]) {
  return shareUrl({ title: "Saved places · Terraclima", url: savedPlacesLink(window.location.href, ids) });
}
