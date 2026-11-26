// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearRecentPlaces, loadRecentPlaces, recordRecentPlace, restoreRecentPlaces } from "../place-history";

describe("undo of clearing recently viewed", () => {
  beforeEach(() => window.localStorage.clear());

  it("brings back the list in its order", () => {
    for (const id of ["c", "b", "a"]) recordRecentPlace(id);
    const before = loadRecentPlaces();
    clearRecentPlaces();
    expect(restoreRecentPlaces(before)).toEqual(before);
    expect(loadRecentPlaces()).toEqual(["a", "b", "c"]);
  });

  it("keeps a place viewed after the clear, first, without duplicates", () => {
    for (const id of ["c", "b", "a"]) recordRecentPlace(id);
    const before = loadRecentPlaces();
    clearRecentPlaces();
    recordRecentPlace("b");
    expect(restoreRecentPlaces(before)).toEqual(["b", "a", "c"]);
    // A second Undo changes nothing.
    expect(restoreRecentPlaces(before)).toEqual(["b", "a", "c"]);
  });
});
