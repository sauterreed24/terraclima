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
  it("parses an explicit ?theme= but ignores invalid values", () => {
    expect(parseAppSearch("?theme=dark")).toEqual({ theme: "dark" });
    expect(parseAppSearch("?theme=light")).toEqual({ theme: "light" });
    expect(parseAppSearch("?theme=auto")).toEqual({ theme: "auto" });
    expect(parseAppSearch("?theme=nope")).toEqual({});
  });
  it("parses the climate scenario layer but drops the default and unknowns", () => {
    expect(parseAppSearch("?scn=ssp245")).toEqual({ scenario: "ssp245" });
    expect(parseAppSearch("?scn=ssp585")).toEqual({ scenario: "ssp585" });
    expect(parseAppSearch("?scn=now")).toEqual({}); // implicit default, never written
    expect(parseAppSearch("?scn=rcp99")).toEqual({});
  });
  it("parses the comparison priority lens but drops the default and unknowns", () => {
    expect(parseAppSearch("?clens=move")).toEqual({ comparisonLens: "move" });
    expect(parseAppSearch("?clens=travel")).toEqual({ comparisonLens: "travel" });
    expect(parseAppSearch("?clens=balanced")).toEqual({});
    expect(parseAppSearch("?clens=fastest")).toEqual({});
  });
  it("captures hb (home-base place id)", () => {
    expect(parseAppSearch("?hb=sequim-wa")).toEqual({ homeBaseId: "sequim-wa" });
    expect(parseAppSearch("?hb=")).toEqual({});
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
  it("validates and canonicalizes the home-base id", () => {
    expect(validatedStateFromSearch("?hb=foo", places, collections).homeBaseId).toBe("foo");
    expect(validatedStateFromSearch("?hb=missing", places, collections).homeBaseId).toBeNull();
    expect(validatedStateFromSearch("", places, collections).homeBaseId).toBeNull();
    const resolve = (id: string) => id === "old-foo" ? "foo" : places[id as keyof typeof places] ? id : null;
    expect(validatedStateFromSearch("?hb=old-foo", places, collections, undefined, resolve).homeBaseId).toBe("foo");
  });
  it("validates the comparison priority lens with balanced fallback", () => {
    expect(validatedStateFromSearch("?clens=garden", places, collections).comparisonLens).toBe("garden");
    expect(validatedStateFromSearch("?clens=not-real", places, collections).comparisonLens).toBe("balanced");
    expect(validatedStateFromSearch("", places, collections).comparisonLens).toBe("balanced");
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
  it("writes ?scn= only for non-default climate scenarios and round-trips", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, scenario: "now", collectionExists: ce }),
    ).toBe("/");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, scenario: "ssp585", collectionExists: ce }),
    ).toBe("/?scn=ssp585");
    expect(parseAppSearch("/?scn=ssp245".replace("/", "")).scenario).toBe("ssp245");
  });
  it("writes ?clens= only for non-default comparison lenses and round-trips", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, comparisonLens: "balanced", collectionExists: ce }),
    ).toBe("/");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, comparisonLens: "risk", collectionExists: ce }),
    ).toBe("/?clens=risk");
    expect(parseAppSearch("?clens=remote").comparisonLens).toBe("remote");
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
  it("omits the default most-unique ranking from the URL", () => {
    expect(
      formatAppRelativeUrl({
        view: "explorer",
        placeId: null,
        collectionId: null,
        temp: "F",
        dist: "imperial",
        ranking: "most-unique",
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
    expect(
      formatAppRelativeUrl({
        view: "explorer",
        placeId: null,
        collectionId: null,
        ranking: "live-fit",
        collectionExists: ce,
      }),
    ).toBe("/?r=live-fit");
  });
  it("omits live-fit URL params when explorer state has no live-fit signals", () => {
    const url = formatAppRelativeUrl({
      view: "explorer",
      placeId: null,
      collectionId: null,
      ranking: "most-unique",
      fitPresets: [],
      maxSummerHighC: null,
      minWinterLowC: null,
      minGrowability: null,
      maxFireRisk: null,
      maxOverallRisk: null,
      search: "",
      collectionExists: ce,
    });
    expect(url).toBe("/");
    expect(url).not.toContain("fit=");
    expect(url).not.toContain("sh=");
    expect(url).not.toContain("wl=");
    expect(url).not.toContain("grow=");
    expect(url).not.toContain("fire=");
    expect(url).not.toContain("risk=");
    expect(url).not.toContain("q=");
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
  it("writes ?hb= last, only when the place exists, and round-trips", () => {
    const pe = (id: string) => id === "sequim-wa";
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, homeBaseId: "sequim-wa", placeExists: pe, collectionExists: ce }),
    ).toBe("/?hb=sequim-wa");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, homeBaseId: "ghost-town", placeExists: pe, collectionExists: ce }),
    ).toBe("/");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, homeBaseId: null, placeExists: pe, collectionExists: ce }),
    ).toBe("/");
    const url = formatAppRelativeUrl({
      view: "explorer",
      placeId: "sequim-wa",
      collectionId: null,
      compareIds: ["sequim-wa"],
      homeBaseId: "sequim-wa",
      placeExists: pe,
      collectionExists: ce,
    });
    expect(url).toBe("/?p=sequim-wa&cmp=sequim-wa&hb=sequim-wa");
    expect(parseAppSearch(url.slice(1)).homeBaseId).toBe("sequim-wa");
  });
  it("emits ?theme= for explicit light/dark but omits auto (the implicit default)", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, theme: "dark", collectionExists: ce }),
    ).toBe("/?theme=dark");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, theme: "light", collectionExists: ce }),
    ).toBe("/?theme=light");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, theme: "auto", collectionExists: ce }),
    ).toBe("/");
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
