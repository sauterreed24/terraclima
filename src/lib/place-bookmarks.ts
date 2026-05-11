// ============================================================
// Terraclima — Place bookmarks (pinned places)
// ============================================================
//
// Lightweight localStorage layer for "pinned" places: a flat list of
// place ids the user has saved across sessions. Kept deliberately
// minimal — no folders, no tags. The same ergonomic curve as a
// browser bookmark: one click, persistent, scannable.
//
// Stored as a JSON array of ids, ordered most-recent-first. We cap
// the list so a runaway tab can't bloat localStorage; older entries
// drop off the tail.

const STORAGE_KEY = "terraclima.bookmarks.v1";

/** Hard cap. Plenty for hand-pinning a relocation shortlist. */
export const BOOKMARK_LIMIT = 50;

type Storage = Pick<typeof window.localStorage, "getItem" | "setItem"> | null;

function safeStorage(): Storage {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRaw(storage: Storage): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of parsed) {
      if (typeof v !== "string") continue;
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
      if (out.length >= BOOKMARK_LIMIT) break;
    }
    return out;
  } catch {
    return [];
  }
}

function writeRaw(storage: Storage, ids: readonly string[]): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, BOOKMARK_LIMIT)));
  } catch {
    /* quota exceeded or storage denied — silently drop */
  }
}

/** Snapshot read. Returns empty list on SSR or quota errors. */
export function loadBookmarks(): string[] {
  return readRaw(safeStorage());
}

export function hasBookmark(id: string): boolean {
  return loadBookmarks().includes(id);
}

/**
 * Toggle a bookmark id and persist. Returns the new full list and
 * whether the id is now pinned. The id moves to the head of the list
 * when newly added — pinned-first ordering is the most useful default
 * for a "your shortlist" rail.
 */
export function toggleBookmark(id: string): { ids: string[]; pinned: boolean } {
  const storage = safeStorage();
  const current = readRaw(storage);
  const idx = current.indexOf(id);
  let next: string[];
  let pinned: boolean;
  if (idx >= 0) {
    next = current.filter(v => v !== id);
    pinned = false;
  } else {
    next = [id, ...current].slice(0, BOOKMARK_LIMIT);
    pinned = true;
  }
  writeRaw(storage, next);
  return { ids: next, pinned };
}

/** Force-set the bookmark list (used by tests + import flows). */
export function setBookmarks(ids: readonly string[]): string[] {
  const storage = safeStorage();
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const v of ids) {
    if (typeof v !== "string" || !v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    cleaned.push(v);
    if (cleaned.length >= BOOKMARK_LIMIT) break;
  }
  writeRaw(storage, cleaned);
  return cleaned;
}

/** Remove a single id. No-op if absent. Returns the new list. */
export function removeBookmark(id: string): string[] {
  const storage = safeStorage();
  const current = readRaw(storage);
  if (!current.includes(id)) return current;
  const next = current.filter(v => v !== id);
  writeRaw(storage, next);
  return next;
}

/** Clear all bookmarks. Returns the empty list. */
export function clearBookmarks(): string[] {
  const storage = safeStorage();
  writeRaw(storage, []);
  return [];
}

export const BOOKMARKS_STORAGE_KEY = STORAGE_KEY;
