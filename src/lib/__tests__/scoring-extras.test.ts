import { describe, it, expect } from "vitest";
import {
  LIVABILITY_PENALTIES,
  LIVABILITY_WEIGHTS,
  RANKING_PARAMS,
  rankLivabilityPreview,
  rankPlaces,
} from "../scoring";
import { makeClimate, makePlace } from "./test-fixtures";

describe("scoring constants", () => {
  it("LIVABILITY_WEIGHTS sums to 1.0", () => {
    const w = LIVABILITY_WEIGHTS;
    const sum = w.resilience + w.winterEase + w.summerEase + w.hazardEase + w.growability;
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("livability penalties are positive (no accidental sign flips)", () => {
    expect(LIVABILITY_PENALTIES.winterPerDegC).toBeGreaterThan(0);
    expect(LIVABILITY_PENALTIES.summerPerDegC).toBeGreaterThan(0);
    expect(LIVABILITY_PENALTIES.hazardPerRiskUnit).toBeGreaterThan(0);
  });

  it("Csb gets a larger Mediterranean bonus than Csa (F3)", () => {
    expect(RANKING_PARAMS.mediterraneanCsbBonus).toBeGreaterThan(RANKING_PARAMS.mediterraneanCsaBonus);
  });
});

describe("rankLivabilityPreview", () => {
  it("returns [] for an empty pool", () => {
    expect(rankLivabilityPreview([])).toEqual([]);
  });

  it("scores stay bounded in [0, 100]", () => {
    const harsh = makePlace({
      id: "harsh",
      climate: makeClimate({ tempLowC: [-40,-38,-30,-15,-2,8,12,11,2,-10,-25,-36], tempHighC: [-25,-20,-10,2,12,22,26,24,15,2,-10,-22] }),
      scores: { hiddenGem: 50, microclimateUniqueness: 50, comfort: 30, resilience: 20, growability: 20, tradeoff: 80 },
      risks: {
        wildfire: { level: "high" },
        flood: { level: "high" },
        drought: { level: "high" },
        extremeHeat: { level: "high" },
        extremeCold: { level: "very-high" },
        smoke: { level: "high" },
        storm: { level: "high" },
        landslide: { level: "moderate" },
        coastal: { level: "very-low" },
      },
    });
    const mild = makePlace({ id: "mild" });
    const out = rankLivabilityPreview([harsh, mild]);
    for (const r of out) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
    // The mild place should outrank the harsh one.
    expect(out[0].place.id).toBe("mild");
  });
});

describe("rankPlaces — empty pool", () => {
  it("returns [] for every profile", () => {
    const profiles = [
      "live-fit",
      "coolest-summers", "mildest-winters", "best-shoulder-seasons",
      "driest-air", "best-growability", "hidden-gems", "most-unique",
      "lowest-fire-risk", "climate-resilient", "best-four-season",
      "best-diurnal-sleep", "strongest-geospatial-signal",
      "mediterranean-like", "wet-forest-refuges", "monsoon-drama",
    ] as const;
    for (const p of profiles) {
      expect(rankPlaces(p, [])).toEqual([]);
    }
  });
});
