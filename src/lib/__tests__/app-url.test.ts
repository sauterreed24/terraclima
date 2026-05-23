// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  parseAppSearch,
  validatedStateFromSearch,
  formatAppRelativeUrl,
  pushAppUrl,
  replaceAppUrl,
} from "../app-url";

describe("parseAppSearch", () => {
  it("returns an empty object for an empty search", () => {
    expect(parseAppSearch("")).toEqual({});
    expect(parseAppSearch("?")).toEqual({});
  });
  it("rejects unknown view values", () => {
    expect(parseAppSearch("?v=spaceship")).toEqual({});
  });
  it("treats the retired pro view as an unknown view", () => {
    expect(parseAppSearch("?v=pro")).toEqual({});
  });
  it("accepts 'trips', 'collections', and 'learn' as views", () => {
    expect(parseAppSearch("?v=trips")).toEqual({ view: "trips" });
    expect(parseAppSearch("?v=collections")).toEqual({ view: "collections" });
    expect(parseAppSearch("?v=learn")).toEqual({ view: "learn" });
  });
  it("captures p (place) and col (collection)", () => {
    expect(parseAppSearch("?p=foo&col=bar")).toEqual({ placeId: "foo", collectionId: "bar" });
  });
  it("parses Live Finder state without disturbing legacy params", () => {
    expect(parseAppSearch("?p=foo&r=live-fit&fit=cool-summers,dry-air,unknown&sh=22&wl=-5&grow=65&fire=moderate&risk=elevated&temp=C&dist=metric")).toEqual({
      placeId: "foo",
      ranking: "live-fit",
      fitPresets: ["cool-summers", "dry-air"],
      maxSummerHighC: 22,
      minWinterLowC: -5,
      minGrowability: 65,
      maxFireRisk: "moderate",
      maxOverallRisk: "elevated",
      temp: "C",
      dist: "metric",
    });
  });
  it("drops unit params the UI cannot represent", () => {
    expect(parseAppSearch("?temp=K&dist=nautical")).toEqual({});
  });
  it("drops Live Finder constraints the UI cannot represent", () => {
    expect(parseAppSearch("?sh=25&wl=-3&grow=99&fire=high&risk=very-high")).toEqual({});
  });
  it("tolerates a missing leading ?", () => {
    expect(parseAppSearch("p=foo")).toEqual({ placeId: "foo" });
  });
});

describe("validatedStateFromSearch", () => {
  const places = { foo: {}, bar: {} };
  const collections = { trip: {} };

  it("falls back to explorer when view is missing or invalid", () => {
    expect(validatedStateFromSearch("", places, collections).view).toBe("explorer");
    expect(validatedStateFromSearch("?v=garbage", places, collections).view).toBe("explorer");
    expect(validatedStateFromSearch("?v=pro", places, collections).view).toBe("explorer");
  });
  it("validates trips as a top-level view", () => {
    expect(validatedStateFromSearch("?v=trips", places, collections).view).toBe("trips");
  });
  it("returns null placeId when the id is unknown", () => {
    expect(validatedStateFromSearch("?p=missing", places, collections).placeId).toBeNull();
    expect(validatedStateFromSearch("?p=foo", places, collections).placeId).toBe("foo");
  });
  it("returns null collectionId when the id is unknown", () => {
    expect(validatedStateFromSearch("?col=nope", places, collections).collectionId).toBeNull();
    expect(validatedStateFromSearch("?col=trip", places, collections).collectionId).toBe("trip");
  });
  it("canonicalizes legacy place aliases in selected place URLs", () => {
    const resolve = (id: string) => id === "old-foo" ? "foo" : places[id as keyof typeof places] ? id : null;
    expect(validatedStateFromSearch("?p=old-foo", places, collections, undefined, resolve).placeId).toBe("foo");
    expect(validatedStateFromSearch("?p=missing", places, collections, undefined, resolve).placeId).toBeNull();
  });
  it("canonicalizes, dedupes, and filters aliases in compare URLs", () => {
    const resolve = (id: string) => id === "old-foo" ? "foo" : places[id as keyof typeof places] ? id : null;
    expect(
      validatedStateFromSearch("?cmp=old-foo,bar,missing,old-foo", places, collections, undefined, resolve).compareIds,
    ).toEqual(["foo", "bar"]);
  });
});

describe("formatAppRelativeUrl", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  const ce = (id: string) => id === "trip";

  it("omits ?v=explorer (default view)", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, collectionExists: ce }),
    ).toBe("/");
  });
  it("includes ?v= for non-default views", () => {
    expect(
      formatAppRelativeUrl({ view: "trips", placeId: null, collectionId: null, collectionExists: ce }),
    ).toBe("/?v=trips");
    expect(
      formatAppRelativeUrl({ view: "collections", placeId: null, collectionId: null, collectionExists: ce }),
    ).toBe("/?v=collections");
  });
  it("includes ?p= when set", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: "foo", collectionId: null, collectionExists: ce }),
    ).toBe("/?p=foo");
  });
  it("only includes ?col= when collectionExists returns true", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: "ghost", collectionExists: ce }),
    ).toBe("/");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: "trip", collectionExists: ce }),
    ).toBe("/?col=trip");
  });
  it("preserves order: v then p then col", () => {
    const url = formatAppRelativeUrl({
      view: "collections",
      placeId: "foo",
      collectionId: "trip",
      collectionExists: ce,
    });
    expect(url).toBe("/?v=collections&p=foo&col=trip");
  });
  it("formats Live Finder params after legacy view/place/filter state", () => {
    const url = formatAppRelativeUrl({
      view: "explorer",
      placeId: "foo",
      collectionId: null,
      countries: ["USA"],
      archetypes: ["rain-shadow-sanctuary"],
      search: "garden town",
      ranking: "live-fit",
      fitPresets: ["dry-air", "cool-summers"],
      maxSummerHighC: 22,
      minWinterLowC: -5,
      minGrowability: 65,
      maxFireRisk: "moderate",
      maxOverallRisk: "elevated",
      temp: "C",
      dist: "metric",
      collectionExists: ce,
      archetypeExists: () => true,
    });
    expect(url).toBe("/?p=foo&c=USA&a=rain-shadow-sanctuary&q=garden+town&r=live-fit&fit=cool-summers%2Cdry-air&sh=22&wl=-5&grow=65&fire=moderate&risk=elevated&temp=C&dist=metric");
  });
  it("omits the default live-fit ranking until live-fit constraints are present", () => {
    expect(
      formatAppRelativeUrl({
        view: "explorer",
        placeId: null,
        collectionId: null,
        temp: "F",
        dist: "imperial",
        ranking: "live-fit",
        collectionExists: ce,
      }),
    ).toBe("/");
    expect(
      formatAppRelativeUrl({
        view: "explorer",
        placeId: null,
        collectionId: null,
        ranking: "hidden-gems",
        collectionExists: ce,
      }),
    ).toBe("/?r=hidden-gems");
  });
  it("omits Live Finder constraints the UI cannot represent", () => {
    const url = formatAppRelativeUrl({
      view: "explorer",
      placeId: null,
      collectionId: null,
      maxSummerHighC: 25,
      minWinterLowC: -3,
      minGrowability: 99,
      maxFireRisk: "high",
      maxOverallRisk: "very-high",
      collectionExists: ce,
    });
    expect(url).toBe("/");
  });
});

describe("parseAppSearch compare cap", () => {
  it("parses at most COMPARE_LIMIT comma-separated ids", () => {
    const ids = ["a", "b", "c", "d", "e", "f"].join(",");
    expect(parseAppSearch(`?cmp=${ids}`).compareIds).toEqual(["a", "b", "c", "d"]);
  });
});

describe("validatedStateFromSearch compare cap", () => {
  it("keeps only known place ids up to COMPARE_LIMIT", () => {
    const places = { a: {}, b: {}, c: {}, d: {}, e: {}, f: {} };
    const out = validatedStateFromSearch(
      "?cmp=a,b,c,d,e,f",
      places,
      {},
    );
    expect(out.compareIds).toEqual(["a", "b", "c", "d"]);
  });
});

describe("history writers", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  const ce = (_id: string) => true;

  it("pushAppUrl adds an entry to history", () => {
    const before = window.history.length;
    pushAppUrl({ tcPlace: true }, { view: "explorer", placeId: "foo", collectionId: null, collectionExists: ce });
    expect(window.location.search).toBe("?p=foo");
    expect(window.history.state).toEqual({ tcPlace: true });
    expect(window.history.length).toBeGreaterThanOrEqual(before);
  });

  it("replaceAppUrl mutates without growing history", () => {
    const before = window.history.length;
    replaceAppUrl(null, { view: "collections", placeId: null, collectionId: null, collectionExists: ce });
    expect(window.location.search).toBe("?v=collections");
    expect(window.history.length).toBe(before);
  });

  it("replaceAppUrl preserves a dossier hash when p= stays on the same place", () => {
    window.history.replaceState(null, "", "/?p=sequim-wa#deep-sequim-hydrology");

    replaceAppUrl(null, {
      view: "explorer",
      placeId: "sequim-wa",
      collectionId: null,
      countries: ["USA"],
      temp: "C",
      dist: "metric",
      collectionExists: ce,
    });

    expect(window.location.search).toBe("?p=sequim-wa&c=USA&temp=C&dist=metric");
    expect(window.location.hash).toBe("#deep-sequim-hydrology");
  });

  it("pushAppUrl preserves a dossier hash for same-place query-only entries", () => {
    const before = window.history.length;
    window.history.replaceState({ tcPlace: true }, "", "/?p=sequim-wa#deep-sequim-ecology");

    pushAppUrl({ tcPlace: true }, {
      view: "explorer",
      placeId: "sequim-wa",
      collectionId: null,
      compareIds: ["sequim-wa", "port-townsend-wa"],
      collectionExists: ce,
    });

    expect(window.location.search).toBe("?p=sequim-wa&cmp=sequim-wa%2Cport-townsend-wa");
    expect(window.location.hash).toBe("#deep-sequim-ecology");
    expect(window.history.state).toEqual({ tcPlace: true });
    expect(window.history.length).toBeGreaterThanOrEqual(before);
  });

  it("replaceAppUrl drops a dossier hash when the selected place changes", () => {
    window.history.replaceState(null, "", "/?p=sequim-wa#deep-sequim-hydrology");

    replaceAppUrl(null, { view: "explorer", placeId: "portal-az", collectionId: null, collectionExists: ce });

    expect(window.location.search).toBe("?p=portal-az");
    expect(window.location.hash).toBe("");
  });
});
