import { describe, expect, it } from "vitest";
import { PLACES, PLACES_BY_ID, REGION_SEARCH_ALIASES, getPlaceSearchFields, getPlaceSearchText } from "../../data/places";
import { ARCHETYPE_LABELS, type Place } from "../../types";
import {
  SEARCH_TIER,
  distinctiveLimit,
  editDistance,
  parseSearchQuery,
  searchPlaces,
  searchTierOfRank,
  suggestPlaceSearches,
  typoBudget,
} from "../place-search";
import { applyFilters, createEmptyFilterState, orderBySearchMatch } from "../scoring";
import { runScenarioRanking } from "../climate-processor";
import type { RankingProfile, ValidatedFilterInput } from "../scoring";
import { makePlace } from "./test-fixtures";

const HALF = PLACES.length / 2;

function filtersFor(search: string): ValidatedFilterInput {
  return {
    countries: [], archetypes: [], fitPresets: [], search,
    maxSummerHighC: null, minWinterLowC: null, minGrowability: null, maxFireRisk: null, maxOverallRisk: null,
  };
}

/** Ids in the order the Explorer shows them: through the ranking pipeline. */
function rankedIds(search: string, ranking: RankingProfile = "coolest-summers"): string[] {
  return runScenarioRanking({
    type: "scenario-rank", requestId: 1, scenario: "now", ranking, filters: filtersFor(search), nowEpochMs: Date.UTC(2026, 5, 15),
  }).rows.map(r => r.id);
}

function tierOf(place: Place, query: string): number | null {
  const rank = searchPlaces(PLACES, query).rankByPlace.get(place);
  return rank == null ? null : searchTierOfRank(rank);
}

describe("parseSearchQuery", () => {
  it("treats empty and whitespace-only queries as no query", () => {
    for (const q of ["", "   ", "\t\n", null, undefined, " - , . "]) {
      expect(parseSearchQuery(q).tokens).toEqual([]);
    }
  });

  it("folds accents, case and punctuation; drops function words; keeps quoted phrases", () => {
    expect(parseSearchQuery("  Mérida,  YUCATÁN ").tokens.map(t => t.text)).toEqual(["merida", "yucatan"]);
    expect(parseSearchQuery("places in the Oregon").tokens.map(t => t.text)).toEqual(["places", "oregon"]);
    expect(parseSearchQuery("Coeur d'Alene").tokens.map(t => t.text)).toEqual(["coeur", "dalene"]);
    expect(parseSearchQuery('"rain shadow" sunny')).toMatchObject({
      tokens: [{ text: "rain shadow", phrase: true }, { text: "sunny", phrase: false }],
    });
    expect(parseSearchQuery("the").tokens.map(t => t.text)).toEqual(["the"]);
  });
});

describe("searchPlaces — blank query", () => {
  it("empty / whitespace query filters nothing and leaves ranking order alone", () => {
    for (const q of ["", "   "]) {
      expect(searchPlaces(PLACES, q)).toMatchObject({ mode: "none" });
      expect(applyFilters(PLACES, { ...createEmptyFilterState(), search: q })).toHaveLength(PLACES.length);
      expect(rankedIds(q)).toEqual(rankedIds(""));
    }
    expect(rankedIds("")).toHaveLength(PLACES.length);
  });
});

describe("searchPlaces — named places come first", () => {
  it.each([
    ["boulder", "boulder-co"],
    ["Boulder", "boulder-co"],
    ["oaxaca", "oaxaca-mx"],
    ["Oaxaca", "oaxaca-mx"],
    ["flagstaff", "flagstaff-az"],
    ["sequim", "sequim-wa"],
    ["san miguel", "san-miguel-de-allende-mx"],
    ["boulder co", "boulder-co"],
  ])("%s → %s first under every ranking", (query, id) => {
    for (const ranking of ["coolest-summers", "live-fit", "sunniest-winters", "best-growability"] as RankingProfile[]) {
      expect(rankedIds(query, ranking)[0]).toBe(id);
    }
  });

  it("boulder no longer drags in places that only mention boulders in prose ahead of Boulder", () => {
    const ids = rankedIds("boulder");
    expect(ids[0]).toBe("boulder-co");
    expect(ids).not.toContain("gunnison-co");
  });

  it("oaxaca: the city (name) outranks La Ventosa and Puerto Escondido (region)", () => {
    const ids = rankedIds("oaxaca");
    expect(ids[0]).toBe("oaxaca-mx");
    expect(ids).toContain("la-ventosa-mx");
    expect(tierOf(PLACES_BY_ID["oaxaca-mx"]!, "oaxaca")).toBe(SEARCH_TIER.nameStart);
    expect(tierOf(PLACES_BY_ID["la-ventosa-mx"]!, "oaxaca")).toBe(SEARCH_TIER.locality);
  });

  it("a cross-reference to another place never outranks that place", () => {
    const yuma = PLACES_BY_ID["yuma-az"]!;
    expect(getPlaceSearchFields(yuma).crossReference).toContain(" flagstaff ");
    const ids = rankedIds("flagstaff");
    expect(ids[0]).toBe("flagstaff-az");
    const yumaAt = ids.indexOf("yuma-az");
    if (yumaAt !== -1) {
      expect(tierOf(yuma, "flagstaff")).toBe(SEARCH_TIER.crossReference);
      expect(yumaAt).toBe(ids.length - 1);
    }
  });

  it("matches accent-insensitively: merida finds Mérida, queretaro finds Querétaro", () => {
    expect(rankedIds("merida")[0]).toBe("merida-mx");
    expect(rankedIds("MÉRIDA")[0]).toBe("merida-mx");
    expect(rankedIds("queretaro")[0]).toBe("queretaro-mx");
  });

  it("finds a zone by a town inside it", () => {
    expect(rankedIds("sierra vista")).toEqual(["huachuca-az"]);
  });
});

describe("searchPlaces — regions", () => {
  it("oregon lists every Oregon place first, before any place that only mentions Oregon", () => {
    const ids = rankedIds("oregon");
    const oregonIds = PLACES.filter(p => p.region === "Oregon").map(p => p.id);
    expect(oregonIds.length).toBeGreaterThan(3);
    expect(new Set(ids.slice(0, oregonIds.length))).toEqual(new Set(oregonIds));
    for (const id of ids.slice(oregonIds.length)) {
      expect(tierOf(PLACES_BY_ID[id]!, "oregon")).toBeGreaterThan(SEARCH_TIER.locality);
    }
    expect(ids.length).toBeLessThan(oregonIds.length + 10);
  });

  it("within one tier the active ranking decides the order", () => {
    const oregon = new Set(PLACES.filter(p => p.region === "Oregon").map(p => p.id));
    for (const ranking of ["coolest-summers", "sunniest-winters"] as RankingProfile[]) {
      const searched = rankedIds("oregon", ranking).filter(id => oregon.has(id));
      const unsearched = rankedIds("", ranking).filter(id => oregon.has(id));
      expect(searched).toEqual(unsearched);
    }
  });
});

describe("searchPlaces — concept words stay characteristic", () => {
  it.each([
    ["snow", ["lake-effect-snowbelt", "alpine-tundra", "subarctic-continental"]],
    ["fog", ["fog-belt-coast"]],
    ["desert", ["high-desert-escape", "desert-oasis"]],
  ] as const)("%s returns well under half the atlas and leads with matching archetypes", (query, archetypes) => {
    const ids = rankedIds(query);
    expect(ids.length).toBeGreaterThan(5);
    expect(ids.length).toBeLessThan(HALF * 0.6);
    // The first results are classified as that kind of place (name, archetype, driver or biome)…
    for (const id of ids.slice(0, 8)) {
      const place = PLACES_BY_ID[id]!;
      expect(tierOf(place, query)).toBeLessThanOrEqual(SEARCH_TIER.classification);
      const labels = [place.name, place.biome, ...place.archetypes.map(a => ARCHETYPE_LABELS[a])].join(" ").toLowerCase();
      expect(labels).toContain(query);
    }
    // …and the archetypes a person means by the word are all in the result.
    const top = new Set(ids);
    const expected = PLACES.filter(p => p.archetypes.some(a => (archetypes as readonly string[]).includes(a)) &&
      getPlaceSearchFields(p).classification.includes(` ${query}`));
    expect(expected.length).toBeGreaterThan(0);
    for (const p of expected) expect(top.has(p.id)).toBe(true);
  });

  it.each(["snow", "humid", "desert", "fog", "rain", "dry", "cold", "mild", "hot", "sunny", "wind"])(
    "%s never returns half the atlas",
    query => {
      const n = searchPlaces(PLACES, query).rankByPlace.size;
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThan(HALF);
    },
  );

  it("drops common-word matches that exist only in long prose, but keeps distinctive ones", () => {
    const snow = searchPlaces(PLACES, "snow");
    for (const rank of snow.rankByPlace.values()) expect(searchTierOfRank(rank)).toBeLessThanOrEqual(SEARCH_TIER.headline);
    // A term found in one place's deep prose is distinctive and still searchable.
    expect(rankedIds("bandelier")).toEqual(["los-alamos-pajarito-plateau-nm"]);
    expect(tierOf(PLACES_BY_ID["los-alamos-pajarito-plateau-nm"]!, "bandelier")).toBe(SEARCH_TIER.prose);
  });

  it("does not index citations, receipts or generated boilerplate", () => {
    expect(searchPlaces(PLACES, "ncei").rankByPlace.size).toBe(0);
    expect(searchPlaces(PLACES, "daymet").rankByPlace.size).toBeLessThan(5);
  });

  it("admits a gated tier whatever its size when nothing better matches", () => {
    const pool = Array.from({ length: 40 }, (_, i) =>
      makePlace({ id: `p${i}`, name: `Place ${i}`, summaryImmersive: "A quokka lives here." }));
    expect(distinctiveLimit(pool.length)).toBe(12);
    expect(searchPlaces(pool, "quokka").rankByPlace.size).toBe(40);
    // Once one place carries the word in its headline, the 39 summary-only mentions are noise.
    pool[7] = makePlace({ id: "p7", name: "Place 7", summaryShort: "Quokka capital." });
    const narrowed = searchPlaces(pool, "quokka");
    expect([...narrowed.rankByPlace.keys()].map(p => p.id)).toEqual(["p7"]);
  });
});

describe("searchPlaces — multi-token queries", () => {
  it("cool summer oregon: every token must match, each in its own field", () => {
    const ids = rankedIds("cool summer oregon");
    expect(ids.length).toBeGreaterThan(0);
    const first = PLACES_BY_ID[ids[0]!]!;
    expect(first.region).toBe("Oregon");
    expect(first.archetypes).toContain("cool-summer-maritime");
    // AND semantics: a subset of each single-token result.
    for (const token of ["cool", "summer", "oregon"]) {
      const single = searchPlaces(PLACES, token).rankByPlace;
      for (const id of ids.slice(0, 4)) expect(single.has(PLACES_BY_ID[id]!)).toBe(true);
    }
    expect(ids.length).toBeLessThan(searchPlaces(PLACES, "oregon").rankByPlace.size + 1);
    // Token order does not matter.
    expect(new Set(rankedIds("oregon summer cool"))).toEqual(new Set(ids));
  });

  it("returns nothing when one token matches nowhere", () => {
    expect(rankedIds("oregon xyzzyq")).toEqual([]);
  });

  it("quoted phrases must appear as whole words in order", () => {
    const phrase = searchPlaces(PLACES, '"rain shadow"').rankByPlace;
    expect(phrase.size).toBeGreaterThan(0);
    for (const place of phrase.keys()) expect(getPlaceSearchText(place)).toContain("rain shadow");
    expect(searchPlaces(PLACES, '"shadow rain"').rankByPlace.size).toBe(0);
  });
});

describe("searchPlaces — matching rules on fixtures", () => {
  const pool = [
    makePlace({ id: "a", name: "Rainier Vista", region: "Washington", summaryShort: "Volcano views." }),
    makePlace({ id: "b", name: "Dry Gulch", region: "Nevada", summaryShort: "Sits on rough terrain with a train depot." }),
    makePlace({ id: "c", name: "Port Lorraine", region: "Maine", summaryShort: "Harbour town." }),
  ];
  const ids = (q: string) => orderBySearchMatch(pool.map(place => ({ place })), pool, q)
    .filter(r => searchPlaces(pool, q).rankByPlace.has(r.place)).map(r => r.place.id);

  it("matches word prefixes, not arbitrary substrings of prose", () => {
    // "rain" is inside "terrain" and "train" in b's summary: not a match. Inside a NAME word it is (lowest name tier).
    expect(ids("rain")).toEqual(["a", "c"]);
    expect(ids("lorr")).toEqual(["c"]);
    expect(ids("terr")).toEqual(["b"]);
  });

  it("two-letter tokens need a whole word in prose", () => {
    expect(ids("wi")).toEqual([]);
    expect(ids("on")).toEqual(["b"]);
  });

  it("orderBySearchMatch is stable within a tier and a no-op without a query", () => {
    const rows = pool.map(place => ({ place }));
    expect(orderBySearchMatch(rows, pool, " ")).toBe(rows);
    const reversed = [...rows].reverse();
    expect(orderBySearchMatch(reversed, pool, "test").map(r => r.place.id)).toEqual(["c", "b", "a"]);
  });
});

describe("typo tolerance", () => {
  it("budget: none under 5 letters, 1 for 5–7, 2 for 8+ (plus two dropped letters at 7)", () => {
    expect(["taos", "seqim", "sequimm", "flagstaf"].map(typoBudget)).toEqual([0, 1, 1, 2]);
  });

  it("editDistance counts insertions, deletions, substitutions and transpositions", () => {
    expect(editDistance("sequim", "sequim")).toBe(0);
    expect(editDistance("seqim", "sequim")).toBe(1);
    expect(editDistance("sequmi", "sequim")).toBe(1);
    expect(editDistance("flagstaf", "flagstaff")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("kitten", "sitting", 1)).toBeGreaterThan(1);
  });

  it("seqim finds Sequim through the fuzzy fallback", () => {
    const result = searchPlaces(PLACES, "seqim");
    expect(result.mode).toBe("fuzzy");
    expect(rankedIds("seqim")).toEqual(["sequim-wa"]);
    expect(rankedIds("Seqim")[0]).toBe("sequim-wa");
  });

  it("tolerates typos in names and regions, two edits for long tokens", () => {
    expect(rankedIds("flagstaf")[0]).toBe("flagstaff-az");
    expect(rankedIds("port townsnd")[0]).toBe("port-townsend-wa");
    expect(rankedIds("albuqerqe").every(id => id.includes("albuquerque"))).toBe(true);
    const oregonIds = new Set(PLACES.filter(p => p.region === "Oregon").map(p => p.id));
    const fuzzy = rankedIds("oregn");
    expect(fuzzy.length).toBeGreaterThan(0);
    for (const id of fuzzy) expect(oregonIds.has(id)).toBe(true);
  });

  it("a 7-letter token may drop two letters of a name, but no other two-edit slip", () => {
    expect(rankedIds("ashvile")[0]).toBe("asheville-nc");
    // Two edits that are not dropped letters stay out at this length.
    expect(rankedIds("houston")).toEqual([]);
    expect(rankedIds("sequoia")).toEqual([]);
  });

  it("is only a fallback: an exact hit is never widened by near-miss names", () => {
    expect(searchPlaces(PLACES, "sequim").mode).toBe("exact");
    expect(rankedIds("taos")[0]).toBe("taos-nm");
    // Short tokens get no tolerance, and typos are not matched against prose.
    expect(rankedIds("taoz")).toEqual([]);
    expect(rankedIds("xyzzyq")).toEqual([]);
    expect(searchPlaces(PLACES, "xyzzyq").mode).toBe("exact");
  });
});

describe("abbreviations", () => {
  it("mt / ft / pt / st and saint match the spelled-out word, and the reverse", () => {
    expect(rankedIds("mt. charleston")[0]).toBe("mount-charleston-nv");
    expect(rankedIds("Mt Charleston NV")[0]).toBe("mount-charleston-nv");
    expect(rankedIds("ft davis")[0]).toBe("fort-davis-tx");
    expect(rankedIds("pt reyes")[0]).toBe("point-reyes-ca");
    expect(rankedIds("pt townsend")[0]).toBe("port-townsend-wa");
    expect(rankedIds("saint john's")[0]).toBe("st-johns-nl");
    expect(rankedIds("st johns")[0]).toBe("st-johns-nl");
  });

  it("matches a variant only as a whole word", () => {
    const parsed = parseSearchQuery("pt reyes");
    expect(parsed.tokens[0]).toEqual({ text: "pt", phrase: false, variants: ["point", "port"] });
    // Whole word only: "mt" must not reach a name that merely contains "mount…".
    const fixture = [makePlace({ id: "mountainview-xx", name: "Mountainview" })];
    expect(searchPlaces(fixture, "mt").rankByPlace.size).toBe(0);
  });
});

describe("state, province and Mexican state abbreviations", () => {
  it("find places whose id does not end in the code", () => {
    expect(rankedIds("la paz bcs")[0]).toBe("la-paz-mx");
    expect(rankedIds("yellowknife nwt")[0]).toBe("yellowknife-nt");
    expect(rankedIds("charlottetown pei")[0]).toBe("charlottetown-pei");
    expect(rankedIds("niagara on")[0]).toBe("niagara-on-the-lake");
    expect(rankedIds("san miguel gto")[0]).toBe("san-miguel-de-allende-mx");
  });

  it("every region in the atlas has an abbreviation", () => {
    for (const place of PLACES) expect(REGION_SEARCH_ALIASES[place.region], place.region).toBeTruthy();
  });
});

describe("typo matches prefer whole words", () => {
  it("'sante fe' puts Santa Fe ahead of Felton", () => {
    expect(rankedIds("sante fe")[0]).toBe("santa-fe-nm");
  });
});

describe("suggestPlaceSearches", () => {
  it("seqim → Sequim", () => {
    const suggestions = suggestPlaceSearches("seqim");
    expect(suggestions[0]).toEqual({ text: "Sequim", kind: "place", placeId: "sequim-wa" });
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("returns at most `limit` distinct names, best first, and regions too", () => {
    const s = suggestPlaceSearches("oaxca", PLACES, 3);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(s[0]!.text).toMatch(/^Oaxaca/);
    expect(new Set(s.map(x => `${x.kind}:${x.text}`)).size).toBe(s.length);
    expect(suggestPlaceSearches("oregn").map(x => x.text)).toContain("Oregon");
    expect(suggestPlaceSearches("seqim", PLACES, 1)).toHaveLength(1);
  });

  it("suggests for near-misses the fallback itself is too strict for", () => {
    expect(rankedIds("taoz")).toEqual([]);
    expect(suggestPlaceSearches("taoz").map(x => x.text)).toContain("Taos");
  });

  it("returns nothing for blank queries, exact hits and hopeless strings", () => {
    expect(suggestPlaceSearches("")).toEqual([]);
    expect(suggestPlaceSearches("   ")).toEqual([]);
    expect(suggestPlaceSearches("sequim")).toEqual([]);
    expect(suggestPlaceSearches("snow")).toEqual([]);
    expect(suggestPlaceSearches("xyzzyqwv")).toEqual([]);
  });
});

describe("search performance", () => {
  it("answers a query over the whole atlas in a few milliseconds once warm", () => {
    searchPlaces(PLACES, "warm");
    const start = performance.now();
    for (const q of ["snow", "cool summer oregon", "seqim", "boulder", "fog"]) {
      for (let i = 0; i < 20; i++) searchPlaces(PLACES, q);
    }
    expect((performance.now() - start) / 100).toBeLessThan(10);
  });
});
