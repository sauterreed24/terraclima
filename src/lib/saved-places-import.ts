// ============================================================
// Terraclima — Import saved places from an export file
// ============================================================
//
// Loaded only when someone picks a file (More → Import saved places), so the
// parsing stays out of the first-load bundle.

import { BOOKMARK_LIMIT, loadBookmarks, readRaw, safeStorage, writeRaw } from "./place-bookmarks";

/**
 * Add saved places brought in from a file after the ones already saved, in the
 * file's order. Never removes or reorders an existing save; at the cap the
 * rest are left out (`capped`).
 */
export function importBookmarks(
  ids: readonly string[],
  /** Maps a stored id (possibly an older alias) to its current id, so an alias counts as already saved. */
  resolve: (id: string) => string | null = id => id,
): { ids: string[]; added: string[]; alreadySaved: number; capped: boolean } {
  const storage = safeStorage();
  const current = readRaw(storage);
  const saved = new Set(current.map(id => resolve(id) ?? id));
  const fresh: string[] = [];
  const seen = new Set<string>();
  let alreadySaved = 0;
  for (const v of ids) {
    if (typeof v !== "string" || !v || seen.has(v)) continue;
    seen.add(v);
    if (saved.has(v)) alreadySaved += 1;
    else fresh.push(v);
  }
  const room = Math.max(0, BOOKMARK_LIMIT - current.length);
  const added = fresh.slice(0, room);
  const next = [...current, ...added];
  if (added.length > 0) writeRaw(storage, next);
  return { ids: next, added, alreadySaved, capped: added.length < fresh.length };
}

/** Largest import file read, in characters (an export of every place is ~1 MB). */
export const SAVED_PLACES_IMPORT_MAX_CHARS = 8_000_000;

/**
 * Place ids from a file made by "Export saved places" (JSON or GeoJSON), or a
 * plain JSON list of ids. `resolve` maps an id (or an old alias) to a current
 * place id, or null when the atlas has no such place. Nothing but ids is read.
 */
export function parseSavedPlacesFile(
  text: string,
  resolve: (id: string) => string | null,
): { ok: true; ids: string[]; unknown: number } | { ok: false } {
  if (text.length > SAVED_PLACES_IMPORT_MAX_CHARS) return { ok: false };
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return { ok: false };
  }
  let raw: unknown[] | null = null;
  if (Array.isArray(data)) raw = data;
  else if (data && typeof data === "object") {
    const obj = data as { places?: unknown; features?: unknown };
    if (Array.isArray(obj.places)) raw = obj.places;
    else if (Array.isArray(obj.features)) raw = obj.features.map(f => (f && typeof f === "object" ? (f as { properties?: unknown }).properties : null));
  }
  if (!raw) return { ok: false };
  const ids: string[] = [];
  const seen = new Set<string>();
  let unknown = 0;
  for (const item of raw) {
    const candidate = typeof item === "string"
      ? item
      : item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : null;
    if (candidate == null) continue;
    const id = resolve(candidate);
    if (!id) {
      unknown += 1;
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (ids.length === 0 && unknown === 0) return { ok: false };
  return { ok: true, ids, unknown };
}

/** One sentence describing an import, for the status line. */
function describeImport(result: ReturnType<typeof importBookmarks>, unknown: number): string {
  const n = result.added.length;
  const parts = [n === 0 ? "No new places to add" : `Added ${n} saved place${n === 1 ? "" : "s"}`];
  if (result.alreadySaved > 0) parts.push(`${result.alreadySaved} ${result.alreadySaved === 1 ? "was" : "were"} already saved`);
  if (unknown > 0) parts.push(`${unknown} ${unknown === 1 ? "is" : "are"} no longer in the atlas`);
  if (result.capped) parts.push(`this browser keeps up to ${BOOKMARK_LIMIT}, so the rest were not added`);
  return `${parts.join("; ")}.`;
}

/**
 * Read a picked file, add its places to the saved list, and describe what
 * happened in one sentence for the status line. `ids` is the saved list after.
 */
export async function importSavedPlacesFile(
  file: Pick<File, "name" | "text"> & { size?: number },
  resolve: (id: string) => string | null,
): Promise<{ ids: string[]; message: string }> {
  let text = "";
  try {
    // Check the size before reading: a huge file is not read into memory at all.
    text = (file.size ?? 0) > SAVED_PLACES_IMPORT_MAX_CHARS * 4 ? "" : await file.text();
  } catch {
    text = "";
  }
  const parsed = parseSavedPlacesFile(text, resolve);
  if (!parsed.ok) {
    return {
      ids: loadBookmarks(),
      message: `Nothing imported: ${file.name} is not a saved-places file. Use a JSON or GeoJSON file made with Export saved places.`,
    };
  }
  const result = importBookmarks(parsed.ids, resolve);
  return { ids: result.ids, message: describeImport(result, parsed.unknown) };
}

/** Add places from a "Link to these places" link (ids already resolved). */
export function importSavedIds(ids: readonly string[], resolve: (id: string) => string | null): { ids: string[]; message: string } {
  const result = importBookmarks(ids, resolve);
  return { ids: result.ids, message: describeImport(result, 0) };
}
