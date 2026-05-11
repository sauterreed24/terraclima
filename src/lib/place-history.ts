// ============================================================
// Terraclima — Recently viewed places
// ============================================================
//
// A small, capped most-recent-first stack of place ids the user has
// opened. Used by the command palette and the Explorer hero "Recent"
// rail so returning users can jump back to where they were without
// remembering the exact name.
//
// Storage shape: JSON array of ids, head = most recent. Unlike
// bookmarks this list is fully managed by the app — adding an id
// already in the list moves it to the head rather than duplicating.

const STORAGE_KEY = "terraclima.recent-places.v1";

/** Plenty for the "where was I" rail. */
export const RECENT_LIMIT = 10;

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
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of parsed) {
      if (typeof v !== "string" || !v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
      if (out.length >= RECENT_LIMIT) break;
    }
    return out;
  } catch {
    return [];
  }
}

function writeRaw(storage: Storage, ids: readonly string[]): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, RECENT_LIMIT)));
  } catch {
    /* quota exceeded — silently drop */
  }
}

export function loadRecentPlaces(): string[] {
  return readRaw(safeStorage());
}

/**
 * Record that the user opened this place. Moves an existing id to
 * the head; appends if new. Returns the resulting list.
 */
export function recordRecentPlace(id: string): string[] {
  if (!id) return loadRecentPlaces();
  const storage = safeStorage();
  const current = readRaw(storage);
  const next = [id, ...current.filter(v => v !== id)].slice(0, RECENT_LIMIT);
  writeRaw(storage, next);
  return next;
}

export function clearRecentPlaces(): string[] {
  const storage = safeStorage();
  writeRaw(storage, []);
  return [];
}

export const RECENT_STORAGE_KEY = STORAGE_KEY;
