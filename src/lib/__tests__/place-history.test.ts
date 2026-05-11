// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RECENT_LIMIT,
  RECENT_STORAGE_KEY,
  clearRecentPlaces,
  loadRecentPlaces,
  recordRecentPlace,
} from "../place-history";

describe("place-history", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("is empty by default", () => {
    expect(loadRecentPlaces()).toEqual([]);
  });

  it("records places in most-recent-first order", () => {
    recordRecentPlace("a");
    recordRecentPlace("b");
    recordRecentPlace("c");
    expect(loadRecentPlaces()).toEqual(["c", "b", "a"]);
  });

  it("moves an already-recorded id to the head without duplicating", () => {
    recordRecentPlace("a");
    recordRecentPlace("b");
    recordRecentPlace("c");
    recordRecentPlace("a");
    expect(loadRecentPlaces()).toEqual(["a", "c", "b"]);
  });

  it("caps the list at RECENT_LIMIT", () => {
    for (let i = 0; i < RECENT_LIMIT + 5; i++) {
      recordRecentPlace(`p-${i}`);
    }
    const list = loadRecentPlaces();
    expect(list.length).toBe(RECENT_LIMIT);
    expect(list[0]).toBe(`p-${RECENT_LIMIT + 4}`);
  });

  it("ignores empty ids", () => {
    recordRecentPlace("a");
    recordRecentPlace("");
    expect(loadRecentPlaces()).toEqual(["a"]);
  });

  it("clears the list", () => {
    recordRecentPlace("a");
    recordRecentPlace("b");
    expect(clearRecentPlaces()).toEqual([]);
    expect(loadRecentPlaces()).toEqual([]);
  });

  it("tolerates malformed storage", () => {
    window.localStorage.setItem(RECENT_STORAGE_KEY, "{}");
    expect(loadRecentPlaces()).toEqual([]);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["a", 1, null, "a", "b"]));
    expect(loadRecentPlaces()).toEqual(["a", "b"]);
  });
});
