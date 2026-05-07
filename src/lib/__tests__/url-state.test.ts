// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { COMPARE_LIMIT, formatAppRelativeUrl, parseAppSearch, validatedStateFromSearch } from "../app-url";

describe("app-url state", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("parses filters and compare from query string", () => {
    const p = parseAppSearch("?v=collections&p=sequim-wa&col=rainshadow&c=USA,Canada&a=fog-belt-coast,rain-shadow-sanctuary&q=san+jose&cmp=a,b,c");
    expect(p.view).toBe("collections");
    expect(p.placeId).toBe("sequim-wa");
    expect(p.collectionId).toBe("rainshadow");
    expect(p.countries).toEqual(["USA", "Canada"]);
    expect(p.archetypes).toEqual(["fog-belt-coast", "rain-shadow-sanctuary"]);
    // URLSearchParams decodes "+" as a space.
    expect(p.search).toBe("san jose");
    expect(p.compareIds).toEqual(["a", "b", "c"]);
  });

  it("validates against unknown ids and drops them", () => {
    const places = { foo: 1, bar: 1 } as Record<string, unknown>;
    const collections = {} as Record<string, unknown>;
    const archetypes = { "fog-belt-coast": 1 } as Record<string, unknown>;
    const v = validatedStateFromSearch(
      "?p=missing&col=missing&a=fog-belt-coast,not-real&cmp=foo,bar,zzz,yyy,xxx,www",
      places, collections, archetypes,
    );
    expect(v.placeId).toBeNull();
    expect(v.collectionId).toBeNull();
    expect(v.archetypes).toEqual(["fog-belt-coast"]);
    // cmp was 6 ids, only "foo"/"bar" exist in placesById; capped by COMPARE_LIMIT.
    expect(v.compareIds).toEqual(["foo", "bar"]);
    expect(v.compareIds.length).toBeLessThanOrEqual(COMPARE_LIMIT);
  });

  it("formatAppRelativeUrl round-trips filters and compare", () => {
    const url = formatAppRelativeUrl({
      view: "explorer",
      placeId: "sequim-wa",
      collectionId: null,
      countries: ["USA", "Canada"],
      archetypes: ["rain-shadow-sanctuary"],
      search: "  fog  ",
      compareIds: ["a", "b"],
      collectionExists: () => false,
      archetypeExists: () => true,
      placeExists: () => true,
    });
    expect(url).toMatch(/p=sequim-wa/);
    expect(url).toMatch(/c=Canada%2CUSA/);
    expect(url).toMatch(/a=rain-shadow-sanctuary/);
    expect(url).toMatch(/q=fog/);
    expect(url).toMatch(/cmp=a%2Cb/);
  });

  it("omits defaults from the URL", () => {
    const url = formatAppRelativeUrl({
      view: "explorer",
      placeId: null,
      collectionId: null,
      countries: [],
      archetypes: [],
      search: "",
      compareIds: [],
      collectionExists: () => true,
    });
    expect(url).not.toMatch(/[?&]v=/);
    expect(url).not.toMatch(/[?&]c=/);
    expect(url).not.toMatch(/[?&]a=/);
    expect(url).not.toMatch(/[?&]q=/);
    expect(url).not.toMatch(/[?&]cmp=/);
  });

  it("caps compare set at COMPARE_LIMIT on parse", () => {
    const p = parseAppSearch("?cmp=a,b,c,d,e,f,g");
    expect(p.compareIds!.length).toBe(COMPARE_LIMIT);
    expect(p.compareIds).toEqual(["a", "b", "c", "d"]);
  });
});
