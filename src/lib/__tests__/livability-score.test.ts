import { describe, it, expect } from "vitest";
import {
  LIVABILITY_BLEND_WEIGHTS,
  PRECIP_MODERATION,
  feltComfortScore,
  hazardCushionScore,
  livabilityPercentiles,
  maxRisk,
  precipModerationScore,
  rankLivabilityWithBreakdown,
  scoreLivability,
  skyComfortScore,
  summerComfortScore,
  thermalComfortScore,
  winterComfortScore,
} from "../livability-score";
import { seasonalUsabilityScore } from "../climate-metrics";
import { makeClimate, makePlace } from "./test-fixtures";
import type { Monthly12 } from "../../types";

// Build a climate that hits a flat target high/low across the year, for tests
// that want full control of the JJA/DJF means.
function uniformClimate(opts: { high: number; low: number; humidity?: number; precipMm?: Monthly12; diurnalSummerC?: number }) {
  const month = (v: number): Monthly12 => [v, v, v, v, v, v, v, v, v, v, v, v];
  return makeClimate({
    tempHighC: month(opts.high),
    tempLowC: month(opts.low),
    humidity: opts.humidity != null ? month(opts.humidity) : undefined,
    precipMm: opts.precipMm ?? month(80),
    diurnalSummerC: opts.diurnalSummerC,
  });
}

describe("summerComfortScore", () => {
  it("returns ~100 inside the comfort plateau", () => {
    const p = makePlace({ climate: uniformClimate({ high: 22, low: 10, humidity: 50, diurnalSummerC: 8 }) });
    expect(summerComfortScore(p)).toBeGreaterThanOrEqual(99);
  });

  it("penalises hot summers (above plateau)", () => {
    const p = makePlace({ climate: uniformClimate({ high: 34, low: 20, humidity: 50, diurnalSummerC: 8 }) });
    // 34°C is 8°C above the 26°C cap. With 4 pts/°C that's −32 from 100 = 68.
    expect(summerComfortScore(p)).toBeCloseTo(68, 0);
  });

  it("penalises cool summers (below plateau) more gently", () => {
    const p = makePlace({ climate: uniformClimate({ high: 14, low: 4, humidity: 50, diurnalSummerC: 8 }) });
    // 14°C is 4°C below the 18°C floor, 1.5 pts/°C → 94.
    expect(summerComfortScore(p)).toBeCloseTo(94, 0);
  });

  it("adds humidity tax only when summer high implies real heat", () => {
    const hot = makePlace({ climate: uniformClimate({ high: 30, low: 22, humidity: 75, diurnalSummerC: 8 }) });
    const dry = makePlace({ climate: uniformClimate({ high: 30, low: 22, humidity: 30, diurnalSummerC: 8 }) });
    expect(summerComfortScore(hot)).toBeLessThan(summerComfortScore(dry));
  });

  it("adds diurnal recovery credit", () => {
    const flat = makePlace({ climate: uniformClimate({ high: 28, low: 22, diurnalSummerC: 6 }) });
    const swing = makePlace({ climate: uniformClimate({ high: 28, low: 12, diurnalSummerC: 16 }) });
    expect(summerComfortScore(swing)).toBeGreaterThan(summerComfortScore(flat));
  });

  it("never returns more than 100 or less than 0", () => {
    const arctic = makePlace({ climate: uniformClimate({ high: -5, low: -20 }) });
    const sahara = makePlace({ climate: uniformClimate({ high: 50, low: 32, humidity: 90 }) });
    expect(summerComfortScore(arctic)).toBeGreaterThanOrEqual(0);
    expect(summerComfortScore(sahara)).toBeGreaterThanOrEqual(0);
    expect(summerComfortScore(arctic)).toBeLessThanOrEqual(100);
    expect(summerComfortScore(sahara)).toBeLessThanOrEqual(100);
  });
});

describe("winterComfortScore", () => {
  it("scores the plateau as 100", () => {
    // mean Jan low needs to be inside the plateau band, e.g. 0°C.
    const p = makePlace({
      climate: makeClimate({
        tempLowC: [0, 0, 5, 8, 12, 16, 18, 18, 14, 8, 4, 0],
      }),
    });
    expect(winterComfortScore(p)).toBe(100);
  });

  it("penalises freezing winters harshly", () => {
    const p = makePlace({
      climate: makeClimate({
        tempLowC: [-20, -22, -10, 0, 8, 14, 16, 16, 10, 0, -10, -22],
      }),
    });
    // mean Jan low = (-22 + -20 + -22)/3 = -21.33°C. 17.33 below the −4 plateau,
    // 4 pts/°C → 100 − 69.33 ≈ 30.66.
    expect(winterComfortScore(p)).toBeCloseTo(30.67, 1);
  });

  it("penalises tropical-warm winters mildly", () => {
    const p = makePlace({
      climate: makeClimate({
        tempLowC: [22, 23, 24, 25, 26, 26, 26, 26, 26, 25, 23, 22],
      }),
    });
    // mean Jan low = 22.33°C, plateau cap = 12°C → 10.33 above, 1.5 pts/°C → 84.5
    expect(winterComfortScore(p)).toBeCloseTo(84.5, 1);
  });

  it("clamps to 0 at extreme cold", () => {
    const p = makePlace({
      climate: makeClimate({
        tempLowC: [-60, -60, -50, -30, -10, 5, 8, 8, 0, -20, -45, -60],
      }),
    });
    expect(winterComfortScore(p)).toBe(0);
  });
});

describe("thermalComfortScore", () => {
  it("equals the average of summer and winter scores", () => {
    const p = makePlace({
      climate: makeClimate({
        tempHighC: [-5, 0, 5, 12, 18, 23, 25, 24, 18, 12, 5, -2] as Monthly12,
        tempLowC: [-12, -8, -3, 4, 9, 13, 15, 14, 9, 3, -3, -10] as Monthly12,
        humidity: undefined,
      }),
    });
    const s = summerComfortScore(p);
    const w = winterComfortScore(p);
    expect(thermalComfortScore(p)).toBeCloseTo((s + w) / 2, 6);
  });
});

describe("skyComfortScore + feltComfortScore", () => {
  it("penalises foggy, low-diurnal summer dampness against otherwise mild thermal scores", () => {
    const bright = makePlace({
      climate: uniformClimate({ high: 21, low: 12, humidity: 45, diurnalSummerC: 14, precipMm: Array(12).fill(45) as unknown as Monthly12 }),
    });
    const foggy = makePlace({
      climate: uniformClimate({ high: 21, low: 12, humidity: 86, diurnalSummerC: 6, precipMm: Array(12).fill(220) as unknown as Monthly12 }),
    });

    expect(thermalComfortScore(foggy)).toBeCloseTo(thermalComfortScore(bright), 0);
    expect(skyComfortScore(foggy)).toBeLessThan(skyComfortScore(bright));
    expect(feltComfortScore(foggy)).toBeLessThan(feltComfortScore(bright));
  });

  it("uses the curated corpus comfort anchor when thermal averages alone are misleading", () => {
    const easy = makePlace({
      scores: { hiddenGem: 50, microclimateUniqueness: 50, comfort: 82, resilience: 70, growability: 70, tradeoff: 30 },
      climate: uniformClimate({ high: 21, low: 3, humidity: 55, precipMm: Array(12).fill(65) as unknown as Monthly12 }),
    });
    const harshSummit = makePlace({
      scores: { hiddenGem: 50, microclimateUniqueness: 90, comfort: 8, resilience: 60, growability: 12, tradeoff: 90 },
      climate: uniformClimate({ high: 21, low: 3, humidity: 85, diurnalSummerC: 5, precipMm: Array(12).fill(190) as unknown as Monthly12 }),
    });

    expect(thermalComfortScore(harshSummit)).toBeCloseTo(thermalComfortScore(easy), 0);
    expect(feltComfortScore(harshSummit)).toBeLessThan(thermalComfortScore(harshSummit));
    expect(feltComfortScore(harshSummit)).toBeLessThan(feltComfortScore(easy));
  });

  it("penalises a short livable season even when JJA and DJF thermal means match", () => {
    const allYear = makePlace({
      scores: { hiddenGem: 50, microclimateUniqueness: 50, comfort: 72, resilience: 70, growability: 70, tradeoff: 30 },
      climate: makeClimate({
        tempHighC: [22,22,22,22,22,22,22,22,22,22,22,22] as Monthly12,
        tempLowC: [12,12,12,12,12,12,12,12,12,12,12,12] as Monthly12,
        precipMm: [45,45,45,45,45,45,45,45,45,45,45,45] as Monthly12,
        snowCm: [0,0,0,0,0,0,0,0,0,0,0,0] as Monthly12,
      }),
    });
    const shortSeason = makePlace({
      scores: { hiddenGem: 50, microclimateUniqueness: 50, comfort: 72, resilience: 70, growability: 70, tradeoff: 30 },
      climate: makeClimate({
        tempHighC: [22,22,2,6,10,22,22,22,10,6,2,22] as Monthly12,
        tempLowC: [12,12,-10,-6,0,12,12,12,0,-6,-10,12] as Monthly12,
        precipMm: [45,45,45,45,45,45,45,45,45,45,45,45] as Monthly12,
        snowCm: [0,0,8,4,0,0,0,0,0,4,8,0] as Monthly12,
      }),
    });

    expect(thermalComfortScore(shortSeason)).toBeCloseTo(thermalComfortScore(allYear), 0);
    expect(seasonalUsabilityScore(shortSeason)).toBeLessThan(seasonalUsabilityScore(allYear));
    expect(feltComfortScore(shortSeason)).toBeLessThan(feltComfortScore(allYear));
  });
});

describe("hazardCushionScore", () => {
  it("returns 100 when every axis is very-low", () => {
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
    expect(hazardCushionScore(p)).toBe(100);
  });

  it("pulls down a place with a single severe axis (tail-risk awareness)", () => {
    const evenlyLow = makePlace({
      risks: {
        wildfire: { level: "low" },
        flood: { level: "low" },
        drought: { level: "low" },
        extremeHeat: { level: "low" },
        extremeCold: { level: "low" },
        smoke: { level: "low" },
        storm: { level: "low" },
        landslide: { level: "low" },
        coastal: { level: "low" },
      },
    });
    const oneSpike = makePlace({
      risks: {
        wildfire: { level: "very-high" }, // 5 → max
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
    expect(maxRisk(oneSpike)).toBe(5);
    // Even though oneSpike has lower mean risk (~0.55) than evenlyLow (mean=1),
    // the tail-aware blend should put the spiked place behind because the
    // single very-high axis still matters to livability.
    expect(hazardCushionScore(oneSpike)).toBeLessThan(hazardCushionScore(evenlyLow));
  });

  it("stays bounded in [0, 100] under extreme inputs", () => {
    const allMax = makePlace({
      risks: {
        wildfire: { level: "very-high" },
        flood: { level: "very-high" },
        drought: { level: "very-high" },
        extremeHeat: { level: "very-high" },
        extremeCold: { level: "very-high" },
        smoke: { level: "very-high" },
        storm: { level: "very-high" },
        landslide: { level: "very-high" },
        coastal: { level: "very-high" },
      },
    });
    expect(hazardCushionScore(allMax)).toBeGreaterThanOrEqual(0);
    expect(hazardCushionScore(allMax)).toBeLessThanOrEqual(100);
  });
});

describe("precipModerationScore", () => {
  function withPrecip(annualMm: number) {
    const monthly = Array.from({ length: 12 }, () => annualMm / 12) as unknown as Monthly12;
    return makePlace({ climate: makeClimate({ precipMm: monthly, annualPrecipMm: annualMm }) });
  }

  it("scores plateau range at 100", () => {
    expect(precipModerationScore(withPrecip(900))).toBe(100);
    expect(precipModerationScore(withPrecip(1200))).toBe(100);
  });

  it("falls off below the plateau", () => {
    expect(precipModerationScore(withPrecip(400))).toBeGreaterThan(0);
    expect(precipModerationScore(withPrecip(400))).toBeLessThan(100);
    expect(precipModerationScore(withPrecip(50))).toBe(0);
  });

  it("falls off above the plateau", () => {
    expect(precipModerationScore(withPrecip(2200))).toBeGreaterThan(0);
    expect(precipModerationScore(withPrecip(2200))).toBeLessThan(100);
    expect(precipModerationScore(withPrecip(4000))).toBe(0);
  });

  it("uses the plateau symmetrically", () => {
    const aboveDistance = 1000; // 1500 + 1000 = 2500 mm
    const belowDistance = 600;  // 700 - 600 = 100 mm
    expect(precipModerationScore(withPrecip(PRECIP_MODERATION.plateauMm[1] + aboveDistance))).toBeLessThan(
      precipModerationScore(withPrecip(PRECIP_MODERATION.plateauMm[1] + 100)),
    );
    expect(precipModerationScore(withPrecip(PRECIP_MODERATION.plateauMm[0] - belowDistance))).toBeLessThanOrEqual(
      precipModerationScore(withPrecip(PRECIP_MODERATION.plateauMm[0] - 100)),
    );
  });
});

describe("scoreLivability + rankLivabilityWithBreakdown", () => {
  it("blends components by published weights", () => {
    const p = makePlace({});
    const r = scoreLivability(p);
    const reconstructed = r.components.reduce((sum, c) => sum + c.value * LIVABILITY_BLEND_WEIGHTS[c.key], 0);
    expect(r.score).toBeCloseTo(Math.round(reconstructed), 0);
  });

  it("orders places by their blended score", () => {
    const mild = makePlace({ id: "mild" });
    const harsh = makePlace({
      id: "harsh",
      climate: makeClimate({
        tempHighC: [-25, -20, -10, 0, 12, 22, 28, 26, 15, 0, -10, -22] as Monthly12,
        tempLowC: [-40, -38, -30, -15, -2, 8, 12, 11, 2, -10, -25, -36] as Monthly12,
      }),
      scores: { hiddenGem: 50, microclimateUniqueness: 50, comfort: 30, resilience: 20, growability: 20, tradeoff: 80 },
      risks: {
        wildfire: { level: "high" },
        flood: { level: "high" },
        drought: { level: "high" },
        extremeHeat: { level: "moderate" },
        extremeCold: { level: "very-high" },
        smoke: { level: "high" },
        storm: { level: "high" },
        landslide: { level: "moderate" },
        coastal: { level: "very-low" },
      },
    });
    const ranked = rankLivabilityWithBreakdown([harsh, mild]);
    expect(ranked[0].place.id).toBe("mild");
    expect(ranked[1].place.id).toBe("harsh");
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it("surfaces drivers and drags from the component breakdown", () => {
    const p = makePlace({
      scores: { hiddenGem: 50, microclimateUniqueness: 50, comfort: 30, resilience: 90, growability: 25, tradeoff: 40 },
      climate: makeClimate({ tempHighC: [10, 10, 14, 18, 22, 24, 24, 22, 18, 14, 10, 10], tempLowC: [-2, -2, 2, 6, 10, 13, 14, 14, 10, 6, 2, -2] }),
    });
    const r = scoreLivability(p);
    expect(r.drivers).toContain("resilience");
    expect(r.drags).toContain("growability");
  });
});

describe("livabilityPercentiles", () => {
  it("returns 0 for an empty pool", () => {
    expect(livabilityPercentiles([])).toEqual({ p25: 0, p50: 0, p75: 0, p90: 0 });
  });

  it("returns monotone-increasing quartiles for a real pool", () => {
    const pool = Array.from({ length: 20 }, (_, i) =>
      makePlace({
        id: `p-${i}`,
        scores: {
          hiddenGem: 50,
          microclimateUniqueness: 50,
          comfort: 50,
          resilience: i * 5,
          growability: 100 - i * 5,
          tradeoff: 50,
        },
      }),
    );
    const q = livabilityPercentiles(pool);
    expect(q.p25).toBeLessThanOrEqual(q.p50);
    expect(q.p50).toBeLessThanOrEqual(q.p75);
    expect(q.p75).toBeLessThanOrEqual(q.p90);
  });
});
