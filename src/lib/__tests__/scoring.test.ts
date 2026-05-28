import { describe, expect, it } from "vitest";
import {
  avgRisk,
  meanSummerHigh,
  meanJanLow,
  applyFilters,
  createEmptyFilterState,
  filterStateFromValidated,
  hasActiveExplorerFilters,
  countActiveExplorerFilterSignals,
  rankPlaces,
  RISK_VALUE,
  type FilterState,
} from "../scoring";
import { PLACES } from "../../data/places";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";

const flat = (v: number): Monthly12 => Array(12).fill(v) as Monthly12;
const annual = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0);

function climateForRanking(overrides: Parameters<typeof makeClimate>[0]) {
  const climate = makeClimate(overrides);
  return makeClimate({
    ...overrides,
    annualPrecipMm: annual(climate.precipMm),
  });
}

describe("avgRisk", () => {
  it("returns 0 for an all-very-low place", () => {
    const p = makePlace({
      risks: {
        wildfire: { level: "very-low" },
        flood: { level: "very-low" },
        drought: { level: "very-low" },
        extremeHeat: { level: "very-low" },
        extremeCold: { level: "very-low" },
        smoke: { level: "very-low" },
        storm: { level: "very-low" },
        landslide: { level: "very-low" },
        coastal: { level: "very-low" },
      },
    });
    expect(avgRisk(p)).toBe(0);
  });
  it("returns the mean of nine risk levels", () => {
    const p = makePlace({
      risks: {
        wildfire: { level: "high" }, // 4
        flood: { level: "low" }, // 1
        drought: { level: "moderate" }, // 2
        extremeHeat: { level: "elevated" }, // 3
        extremeCold: { level: "very-low" }, // 0
        smoke: { level: "low" }, // 1
        storm: { level: "moderate" }, // 2
        landslide: { level: "low" }, // 1
        coastal: { level: "very-low" }, // 0
      },
    });
    expect(avgRisk(p)).toBeCloseTo(14 / 9, 6);
  });
});

describe("meanSummerHigh / meanJanLow", () => {
  it("meanSummerHigh = JJA mean of tempHighC", () => {
    const p = makePlace({
      climate: makeClimate({
        tempHighC: [0, 0, 0, 0, 0, 30, 32, 28, 0, 0, 0, 0] as Monthly12,
      }),
    });
    expect(meanSummerHigh(p)).toBeCloseTo(30, 6);
  });
  it("meanJanLow = DJF mean of tempLowC", () => {
    const p = makePlace({
      climate: makeClimate({
        tempLowC: [-10, -8, 0, 0, 0, 0, 0, 0, 0, 0, 0, -12] as Monthly12,
      }),
    });
    expect(meanJanLow(p)).toBeCloseTo((-12 + -10 + -8) / 3, 6);
  });
});

describe("RISK_VALUE", () => {
  it("is monotone increasing across the levels", () => {
    const order: Array<keyof typeof RISK_VALUE> = [
      "very-low",
      "low",
      "moderate",
      "elevated",
      "high",
      "very-high",
    ];
    for (let i = 1; i < order.length; i++) {
      expect(RISK_VALUE[order[i]]).toBeGreaterThan(RISK_VALUE[order[i - 1]]);
    }
  });
});

describe("applyFilters", () => {
  const a = makePlace({ id: "a", country: "USA", elevationM: 100, archetypes: ["mediterranean-pocket"] });
  const b = makePlace({ id: "b", country: "Canada", elevationM: 1500, archetypes: ["chinook-corridor"] });
  const c = makePlace({ id: "c", country: "Mexico", elevationM: 2200, archetypes: ["eternal-spring-highland"] });
  const pool = [a, b, c];

  function f(overrides: Partial<FilterState> = {}): FilterState {
    return {
      countries: new Set<string>(),
      archetypes: new Set(),
      ...overrides,
    };
  }

  it("returns all places with empty filter sets", () => {
    expect(applyFilters(pool, f()).map(p => p.id)).toEqual(["a", "b", "c"]);
  });

  it("filterStateFromValidated matches createEmptyFilterState when URL has no filter params", () => {
    expect(
      filterStateFromValidated({
        countries: [],
        archetypes: [],
        fitPresets: [],
        search: "",
        maxSummerHighC: null,
        minWinterLowC: null,
        minGrowability: null,
        maxFireRisk: null,
        maxOverallRisk: null,
      }),
    ).toEqual(createEmptyFilterState());
  });

  it("filterStateFromValidated omits absent optional constraint keys", () => {
    const state = filterStateFromValidated({
      countries: ["USA"],
      archetypes: ["mediterranean-pocket"],
      fitPresets: ["cool-summers"],
      search: "garden",
      maxSummerHighC: 22,
      minWinterLowC: null,
      minGrowability: 75,
      maxFireRisk: "low",
      maxOverallRisk: null,
    });
    expect(state.minWinterLowC).toBeUndefined();
    expect(state.maxOverallRisk).toBeUndefined();
    expect(hasActiveExplorerFilters(state)).toBe(true);
    expect(countActiveExplorerFilterSignals(state)).toBeGreaterThan(0);
  });

  it("createEmptyFilterState drops stale constraints so applyFilters matches an unfiltered pool", () => {
    const polluted: FilterState = {
      ...createEmptyFilterState(),
      countries: new Set(["Mexico"]),
      maxSummerHighC: 22,
      minWinterLowC: 2,
      minGrowability: 75,
      maxFireRisk: "low",
      maxOverallRisk: "moderate",
    };
    expect(applyFilters(pool, polluted).length).toBeLessThan(pool.length);
    expect(applyFilters(pool, createEmptyFilterState()).map(p => p.id)).toEqual(["a", "b", "c"]);
  });
  it("filters by country", () => {
    expect(applyFilters(pool, f({ countries: new Set(["Canada"]) })).map(p => p.id)).toEqual(["b"]);
  });
  it("filters by archetype intersection (any-of)", () => {
    expect(
      applyFilters(pool, f({ archetypes: new Set(["chinook-corridor", "eternal-spring-highland"]) })).map(p => p.id),
    ).toEqual(["b", "c"]);
  });
  it("filters by live-fit preset pool threshold", () => {
    const hot = makePlace({
      id: "hot",
      climate: makeClimate({
        tempHighC: [12, 15, 20, 25, 31, 36, 38, 37, 32, 25, 18, 13] as Monthly12,
      }),
    });
    const cool = makePlace({
      id: "cool",
      climate: makeClimate({
        tempHighC: [5, 7, 10, 14, 18, 20, 21, 20, 17, 12, 8, 5] as Monthly12,
      }),
    });
    expect(
      applyFilters([hot, cool], { ...f(), fitPresets: new Set(["cool-summers"]) }).map(p => p.id),
    ).toEqual(["cool"]);
  });

  it("filters by live-fit climate and risk constraints", () => {
    const coolLowRisk = makePlace({
      id: "cool-low-risk",
      climate: makeClimate({ tempHighC: [5, 7, 10, 14, 18, 20, 21, 20, 17, 12, 8, 5] as Monthly12 }),
      risks: {
        ...a.risks,
        wildfire: { level: "low" },
      },
    });
    const hotHighRisk = makePlace({
      id: "hot-high-risk",
      climate: makeClimate({ tempHighC: [12, 15, 20, 25, 31, 36, 38, 37, 32, 25, 18, 13] as Monthly12 }),
      risks: {
        ...a.risks,
        wildfire: { level: "high" },
      },
    });
    expect(
      applyFilters(
        [coolLowRisk, hotHighRisk],
        f({ maxSummerHighC: 24, maxFireRisk: "moderate" }),
      ).map(p => p.id),
    ).toEqual(["cool-low-risk"]);
  });
  it("preserves input order", () => {
    expect(applyFilters([c, a, b], f()).map(p => p.id)).toEqual(["c", "a", "b"]);
  });
});

describe("rankPlaces — mediterranean-like credits the computed/parsed Köppen class", () => {
  const med = makePlace({
    id: "med",
    // Multi-zone label: the old `koppen.startsWith("Csb")` check missed this
    // because the string begins with "BSk". The computed/parsed class catches it.
    koppen: "BSk (valley) / Csb analog (summit)",
    climate: makeClimate({
      tempHighC: [7.8, 9.2, 11.1, 13.4, 16.3, 18.8, 21.6, 21.8, 19.6, 14.8, 10.3, 7.9] as Monthly12,
      tempLowC: [1.2, 1.6, 2.8, 4.6, 7.2, 9.8, 11.6, 11.4, 9.6, 6.7, 3.6, 1.6] as Monthly12,
      precipMm: [65, 48, 42, 28, 22, 18, 14, 18, 28, 48, 72, 72] as Monthly12,
    }),
  });
  const cont = makePlace({
    id: "cont",
    koppen: "Dfb",
    climate: makeClimate({
      tempHighC: [-4, -2, 4, 12, 19, 24, 26, 25, 19, 12, 4, -2] as Monthly12,
      tempLowC: [-12, -10, -4, 2, 8, 13, 16, 15, 9, 3, -3, -9] as Monthly12,
      precipMm: [40, 35, 45, 60, 80, 95, 100, 90, 70, 55, 50, 45] as Monthly12,
    }),
  });

  it("credits a Csb summit hidden inside a multi-zone label, ranking it above a continental place", () => {
    const ranked = rankPlaces("mediterranean-like", [cont, med]);
    expect(ranked[0]!.place.id).toBe("med");
    const medScore = ranked.find(r => r.place.id === "med")!.score;
    const contScore = ranked.find(r => r.place.id === "cont")!.score;
    expect(medScore).toBeGreaterThan(contScore);
  });
});

describe("rankPlaces — bioclim ranking presets", () => {
  it("ranks higher Conrad continentality first", () => {
    const continental = makePlace({
      id: "continental",
      lat: 48,
      climate: climateForRanking({
        tempHighC: [-8, -5, 4, 14, 23, 29, 32, 30, 22, 12, 2, -6] as Monthly12,
        tempLowC: [-22, -19, -10, -1, 7, 13, 16, 14, 7, -2, -11, -20] as Monthly12,
        precipMm: flat(45),
      }),
    });
    const maritime = makePlace({
      id: "maritime",
      lat: 48,
      climate: climateForRanking({
        tempHighC: [8, 9, 11, 13, 16, 18, 20, 20, 18, 14, 10, 8] as Monthly12,
        tempLowC: [3, 4, 5, 7, 9, 11, 13, 13, 11, 8, 5, 3] as Monthly12,
        precipMm: flat(45),
      }),
    });

    const ranked = rankPlaces("most-continental", [maritime, continental]);
    expect(ranked[0]!.place.id).toBe("continental");
    expect(ranked[0]!.note).toContain("Conrad K");
  });

  it("ranks lower Selianinov HTC as the drier growing season", () => {
    const dry = makePlace({
      id: "dry-grow",
      climate: climateForRanking({
        precipMm: [6, 5, 6, 8, 10, 8, 4, 4, 6, 8, 7, 6] as Monthly12,
      }),
    });
    const wet = makePlace({
      id: "wet-grow",
      climate: climateForRanking({
        precipMm: [80, 75, 90, 95, 110, 95, 85, 80, 90, 95, 85, 80] as Monthly12,
      }),
    });

    const ranked = rankPlaces("driest-growing-season", [wet, dry]);
    expect(ranked[0]!.place.id).toBe("dry-grow");
    expect(ranked[0]!.note).toContain("Selianinov HTC");
  });

  it("ranks lower Thornthwaite PET as lower evaporative demand", () => {
    const lowDemand = makePlace({
      id: "low-demand",
      lat: 60,
      climate: climateForRanking({
        tempHighC: [-12, -10, -3, 4, 10, 15, 18, 16, 10, 3, -5, -11] as Monthly12,
        tempLowC: [-22, -20, -13, -5, 1, 6, 9, 7, 2, -4, -14, -21] as Monthly12,
        precipMm: flat(40),
      }),
    });
    const highDemand = makePlace({
      id: "high-demand",
      lat: 33,
      climate: climateForRanking({
        tempHighC: [20, 22, 27, 32, 37, 41, 42, 41, 38, 32, 25, 20] as Monthly12,
        tempLowC: [7, 9, 12, 16, 21, 26, 29, 28, 24, 17, 10, 7] as Monthly12,
        precipMm: flat(20),
      }),
    });

    const ranked = rankPlaces("lowest-evaporative-demand", [highDemand, lowDemand]);
    expect(ranked[0]!.place.id).toBe("low-demand");
    expect(ranked[0]!.note).toContain("Thornthwaite PET");
  });

  it("keeps the most-continental corpus leaders in the interior-north pool", () => {
    const ids = rankPlaces("most-continental", PLACES).slice(0, 8).map(r => r.place.id);
    expect(ids).toEqual(expect.arrayContaining(["inuvik-nt", "yellowknife-nt", "dawson-city-yt"]));
  });

  it("keeps the driest-growing-season corpus leaders in the hot desert / Owens Valley pool", () => {
    const ids = rankPlaces("driest-growing-season", PLACES).slice(0, 8).map(r => r.place.id);
    expect(ids).toEqual(expect.arrayContaining(["death-valley-ca", "yuma-az", "bishop-ca", "lone-pine-ca"]));
  });

  it("keeps the lowest-evaporative-demand corpus leaders in Arctic or alpine low-PET places", () => {
    const ids = rankPlaces("lowest-evaporative-demand", PLACES).slice(0, 8).map(r => r.place.id);
    expect(ids).toEqual(expect.arrayContaining(["mount-washington-nh", "iqaluit-nu", "churchill-mb", "leadville-co"]));
  });
});
