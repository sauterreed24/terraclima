// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BOOKMARK_LIMIT,
  BOOKMARKS_STORAGE_KEY,
  addBookmarksToFront,
  clearBookmarks,
  hasBookmark,
  loadBookmarks,
  removeBookmark,
  setBookmarks,
  toggleBookmark,
} from "../place-bookmarks";

describe("place-bookmarks", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty list when storage is empty", () => {
    expect(loadBookmarks()).toEqual([]);
    expect(hasBookmark("anything-mx")).toBe(false);
  });

  it("toggles a bookmark on and off", () => {
    const onAdd = toggleBookmark("creel-mx");
    expect(onAdd.pinned).toBe(true);
    expect(onAdd.ids).toEqual(["creel-mx"]);
    expect(loadBookmarks()).toEqual(["creel-mx"]);
    expect(hasBookmark("creel-mx")).toBe(true);

    const onRemove = toggleBookmark("creel-mx");
    expect(onRemove.pinned).toBe(false);
    expect(onRemove.ids).toEqual([]);
    expect(hasBookmark("creel-mx")).toBe(false);
  });

  it("places newly pinned ids at the head", () => {
    toggleBookmark("a");
    toggleBookmark("b");
    toggleBookmark("c");
    expect(loadBookmarks()).toEqual(["c", "b", "a"]);
  });

  it("caps total bookmarks at BOOKMARK_LIMIT", () => {
    const ids = Array.from({ length: BOOKMARK_LIMIT + 5 }, (_, i) => `p-${i}`);
    setBookmarks(ids);
    const stored = loadBookmarks();
    expect(stored.length).toBe(BOOKMARK_LIMIT);
    expect(stored[0]).toBe("p-0");
  });

  it("dedupes ids when setting", () => {
    setBookmarks(["a", "b", "a", "c", "b"]);
    expect(loadBookmarks()).toEqual(["a", "b", "c"]);
  });

  it("adds ranked finalists to the head without toggling existing pins off", () => {
    setBookmarks(["sequim-wa", "portal-az", "creel-mx"]);

    const result = addBookmarksToFront(["port-townsend-wa", "sequim-wa", "port-townsend-wa"]);

    expect(result.added).toEqual(["port-townsend-wa"]);
    expect(result.capped).toBe(false);
    expect(result.ids).toEqual(["port-townsend-wa", "sequim-wa", "portal-az", "creel-mx"]);
    expect(loadBookmarks()).toEqual(["port-townsend-wa", "sequim-wa", "portal-az", "creel-mx"]);
  });

  it("never drops an existing save to make room for finalists", () => {
    const existing = Array.from({ length: BOOKMARK_LIMIT - 1 }, (_, i) => `existing-${i}`);
    setBookmarks(existing);

    const result = addBookmarksToFront(["leader-1", "existing-5", "leader-2"]);

    expect(result.capped).toBe(true);
    expect(result.added).toEqual(["leader-1"]);
    expect(result.ids).toHaveLength(BOOKMARK_LIMIT);
    expect(result.ids.slice(0, 3)).toEqual(["leader-1", "existing-5", "existing-0"]);
    for (const id of existing) expect(result.ids).toContain(id);
  });

  it("refuses a new save when full instead of dropping the oldest", () => {
    const existing = Array.from({ length: BOOKMARK_LIMIT }, (_, i) => `existing-${i}`);
    setBookmarks(existing);
    const result = toggleBookmark("one-more");
    expect(result).toMatchObject({ pinned: false, full: true });
    expect(loadBookmarks()).toEqual(existing);
    // Removing still works at the cap.
    expect(toggleBookmark("existing-3")).toMatchObject({ pinned: false, full: false });
    expect(loadBookmarks()).toHaveLength(BOOKMARK_LIMIT - 1);
  });

  it("keeps every place in the atlas savable at once", async () => {
    const { PLACES } = await import("../../data/places");
    expect(BOOKMARK_LIMIT).toBeGreaterThanOrEqual(PLACES.length);
  });

  it("never loses a saved id across random toggle / finalist sequences", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let run = 0; run < 40; run++) {
      window.localStorage.clear();
      const model = new Set<string>();
      for (let step = 0; step < 200; step++) {
        const id = `p-${Math.floor(rand() * 30)}`;
        if (rand() < 0.8) {
          const r = toggleBookmark(id);
          if (r.pinned) model.add(id); else if (!r.full) model.delete(id);
        } else {
          const batch = [id, `p-${Math.floor(rand() * 30)}`];
          addBookmarksToFront(batch).added.forEach(a => model.add(a));
        }
        expect(new Set(loadBookmarks())).toEqual(model);
      }
    }
  });

  it("ignores malformed storage payloads gracefully", () => {
    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, "not-json");
    expect(loadBookmarks()).toEqual([]);
    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify({ foo: 1 }));
    expect(loadBookmarks()).toEqual([]);
    window.localStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify(["good-id", 123, null, "good-id", ""]),
    );
    expect(loadBookmarks()).toEqual(["good-id"]);
  });

  it("removes specific bookmarks without touching others", () => {
    setBookmarks(["a", "b", "c"]);
    expect(removeBookmark("b")).toEqual(["a", "c"]);
    expect(removeBookmark("not-there")).toEqual(["a", "c"]);
    expect(loadBookmarks()).toEqual(["a", "c"]);
  });

  it("clears all bookmarks", () => {
    setBookmarks(["a", "b"]);
    expect(clearBookmarks()).toEqual([]);
    expect(loadBookmarks()).toEqual([]);
  });
});
