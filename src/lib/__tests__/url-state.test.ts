// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { COMPARE_LIMIT, formatAppRelativeUrl, parseAppSearch, validatedStateFromSearch } from "../app-url";

describe("app-url state", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("parses filters and compare from query string", () => {
    const p = parseAppSearch("?v=trips&p=sequim-wa&col=rainshadow&c=USA,Canada&a=fog-belt-coast,rain-shadow-sanctuary&q=san+jose&cmp=a,b,c&r=live-fit&fit=cool-summers,quiet-small-town&sh=22&wl=-5&grow=65&fire=moderate&risk=elevated&temp=C&dist=metric");
    expect(p.view).toBe("trips");
    expect(p.placeId).toBe("sequim-wa");
    expect(p.collectionId).toBe("rainshadow");
    expect(p.countries).toEqual(["USA", "Canada"]);
    expect(p.archetypes).toEqual(["fog-belt-coast", "rain-shadow-sanctuary"]);
    // URLSearchParams decodes "+" as a space.
    expect(p.search).toBe("san jose");
    expect(p.compareIds).toEqual(["a", "b", "c"]);
    expect(p.ranking).toBe("live-fit");
    expect(p.fitPresets).toEqual(["cool-summers", "quiet-small-town"]);
    expect(p.maxSummerHighC).toBe(22);
    expect(p.minWinterLowC).toBe(-5);
    expect(p.minGrowability).toBe(65);
    expect(p.maxFireRisk).toBe("moderate");
    expect(p.maxOverallRisk).toBe("elevated");
    expect(p.temp).toBe("C");
    expect(p.dist).toBe("metric");
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

  it("falls retired view URLs back to Explorer", () => {
    const v = validatedStateFromSearch("?v=pro", {}, {});
    expect(v.view).toBe("explorer");
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
      ranking: "live-fit",
      fitPresets: ["quiet-small-town", "cool-summers"],
      maxSummerHighC: 22,
      minWinterLowC: -5,
      minGrowability: 65,
      maxFireRisk: "moderate",
      maxOverallRisk: "elevated",
      temp: "C",
      dist: "metric",
      collectionExists: () => false,
      archetypeExists: () => true,
      placeExists: () => true,
    });
    expect(url).toMatch(/p=sequim-wa/);
    expect(url).toMatch(/c=Canada%2CUSA/);
    expect(url).toMatch(/a=rain-shadow-sanctuary/);
    expect(url).toMatch(/q=fog/);
    expect(url).toMatch(/r=live-fit/);
    expect(url).toMatch(/fit=cool-summers%2Cquiet-small-town/);
    expect(url).toMatch(/sh=22/);
    expect(url).toMatch(/wl=-5/);
    expect(url).toMatch(/grow=65/);
    expect(url).toMatch(/fire=moderate/);
    expect(url).toMatch(/risk=elevated/);
    expect(url).toMatch(/temp=C/);
    expect(url).toMatch(/dist=metric/);
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
    expect(url).not.toMatch(/[?&]r=/);
    expect(url).not.toMatch(/[?&]fit=/);
    expect(url).not.toMatch(/[?&]sh=/);
    expect(url).not.toMatch(/[?&]wl=/);
    expect(url).not.toMatch(/[?&]grow=/);
    expect(url).not.toMatch(/[?&]fire=/);
    expect(url).not.toMatch(/[?&]risk=/);
    expect(url).not.toMatch(/[?&]temp=/);
    expect(url).not.toMatch(/[?&]dist=/);
    expect(url).not.toMatch(/[?&]cmp=/);
  });

  it("keeps default live-fit URLs clean unless live-fit controls are active", () => {
    expect(formatAppRelativeUrl({
      view: "explorer",
      placeId: null,
      collectionId: null,
      ranking: "live-fit",
      collectionExists: () => true,
    })).toBe("/");
    expect(formatAppRelativeUrl({
      view: "explorer",
      placeId: null,
      collectionId: null,
      ranking: "live-fit",
      fitPresets: ["cool-summers"],
      collectionExists: () => true,
    })).toMatch(/[?&]r=live-fit/);
  });

  it("round-trips the sunny-winter Live Finder preset through shared URLs", () => {
    const parsed = parseAppSearch("?r=sunniest-winters&fit=sunny-winters,mild-winters&wl=-5&temp=C&dist=metric");
    expect(parsed.ranking).toBe("sunniest-winters");
    expect(parsed.fitPresets).toEqual(["sunny-winters", "mild-winters"]);
    expect(parsed.minWinterLowC).toBe(-5);

    const url = formatAppRelativeUrl({
      view: "explorer",
      placeId: null,
      collectionId: null,
      ranking: "sunniest-winters",
      fitPresets: ["mild-winters", "sunny-winters"],
      minWinterLowC: -5,
      temp: "C",
      dist: "metric",
      collectionExists: () => true,
    });

    expect(url).toMatch(/r=sunniest-winters/);
    expect(url).toMatch(/fit=mild-winters%2Csunny-winters/);
    expect(url).toMatch(/wl=-5/);
    expect(url).toMatch(/temp=C/);
    expect(url).toMatch(/dist=metric/);
  });

  it("caps compare set at COMPARE_LIMIT on parse", () => {
    const p = parseAppSearch("?cmp=a,b,c,d,e,f,g");
    expect(p.compareIds!.length).toBe(COMPARE_LIMIT);
    expect(p.compareIds).toEqual(["a", "b", "c", "d"]);
  });
});
