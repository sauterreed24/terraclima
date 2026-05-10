import { describe, expect, it } from "vitest";
import { avgRisk, meanSummerHigh, meanJanLow, applyFilters, RISK_VALUE } from "../scoring";
import type { FilterState } from "../scoring";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";

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
  it("filters by country", () => {
    expect(applyFilters(pool, f({ countries: new Set(["Canada"]) })).map(p => p.id)).toEqual(["b"]);
  });
  it("filters by archetype intersection (any-of)", () => {
    expect(
      applyFilters(pool, f({ archetypes: new Set(["chinook-corridor", "eternal-spring-highland"]) })).map(p => p.id),
    ).toEqual(["b", "c"]);
  });
  it("filters by elevation range (inclusive)", () => {
    expect(applyFilters(pool, f({ minElevation: 1000, maxElevation: 2000 })).map(p => p.id)).toEqual(["b"]);
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
