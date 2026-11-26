// ============================================================
// Terraclima — Place bookmarks (saved places)
// ============================================================
//
// Lightweight localStorage layer for "pinned" places: a flat list of
// place ids the user has saved across sessions. Kept deliberately
// minimal — no folders, no tags. The same ergonomic curve as a
// browser bookmark: one click, persistent, scannable.
//
// Stored as a JSON array of ids, ordered most-recent-first. The cap sits far
// above the corpus size so a runaway tab can't bloat localStorage, and a save
// never pushes an older one out: at the cap a new save is refused instead.

const STORAGE_KEY = "terraclima.bookmarks.v1";

/**
 * Hard cap, well above the number of places in the atlas (226), so every place
 * can be saved. Reaching it refuses a new save; it never drops an old one.
 */
export const BOOKMARK_LIMIT = 500;

type Storage = Pick<typeof window.localStorage, "getItem" | "setItem"> | null;

export function safeStorage(): Storage {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRaw(storage: Storage): string[] {
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

export function writeRaw(storage: Storage, ids: readonly string[]): void {
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
 * for a "your saved places" rail.
 */
export function toggleBookmark(id: string): { ids: string[]; pinned: boolean; full: boolean } {
  const storage = safeStorage();
  const current = readRaw(storage);
  const idx = current.indexOf(id);
  if (idx < 0 && current.length >= BOOKMARK_LIMIT) {
    // Full: refuse the new save rather than drop one the user kept.
    return { ids: current, pinned: false, full: true };
  }
  const next = idx >= 0 ? current.filter(v => v !== id) : [id, ...current];
  writeRaw(storage, next);
  return { ids: next, pinned: idx < 0, full: false };
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

/**
 * Add a ranked set of ids to the head of the saved shortlist without toggling
 * existing pins off. This is used for "save these finalists" flows where the
 * current rank order matters more than single-click recency. Places already
 * saved are never dropped: when the list is full, only the incoming ids that
 * fit are added (`capped` says some did not).
 */
export function addBookmarksToFront(ids: readonly string[]): { ids: string[]; added: string[]; capped: boolean } {
  const storage = safeStorage();
  const current = readRaw(storage);
  const incoming: string[] = [];
  const incomingSeen = new Set<string>();
  for (const v of ids) {
    if (typeof v !== "string" || !v) continue;
    if (incomingSeen.has(v)) continue;
    incomingSeen.add(v);
    incoming.push(v);
  }

  const currentSet = new Set(current);
  const room = Math.max(0, BOOKMARK_LIMIT - current.length);
  const fresh = incoming.filter(id => !currentSet.has(id));
  const added = fresh.slice(0, room);
  const addedSet = new Set(added);
  const kept = incoming.filter(id => currentSet.has(id) || addedSet.has(id));
  const keptSet = new Set(kept);
  const next = [...kept, ...current.filter(id => !keptSet.has(id))];

  writeRaw(storage, next);
  return {
    ids: next,
    added,
    capped: added.length < fresh.length,
  };
}

/**
 * Undo a removal: put `id` back between the neighbours it had (`before` is the
 * list as it was), leaving later changes in place. Returns null when it could
 * not be restored (the list is full).
 */
export function restoreBookmark(id: string, before: readonly string[]): string[] | null {
  const storage = safeStorage();
  const current = readRaw(storage);
  if (current.includes(id)) return current;
  if (current.length >= BOOKMARK_LIMIT) return null;
  const at = before.indexOf(id);
  const prev = at > 0 ? before[at - 1] : undefined;
  const next = at >= 0 ? before[at + 1] : undefined;
  let index: number;
  if (prev !== undefined && current.includes(prev)) index = current.indexOf(prev) + 1;
  else if (next !== undefined && current.includes(next)) index = current.indexOf(next);
  else index = Math.min(Math.max(at, 0), current.length);
  const out = [...current.slice(0, index), id, ...current.slice(index)];
  writeRaw(storage, out);
  return out;
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
