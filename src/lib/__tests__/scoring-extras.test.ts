import { describe, it, expect } from "vitest";
import {
  LIVABILITY_BLEND_WEIGHTS,
  LIVABILITY_WEIGHTS,
  RANKING_PARAMS,
  rankLivabilityPreview,
  rankPlaces,
} from "../scoring";
import { HAZARD_CUSHION, PRECIP_MODERATION, THERMAL_COMFORT } from "../livability-score";
import { makeClimate, makePlace } from "./test-fixtures";

describe("scoring constants", () => {
  it("LIVABILITY_WEIGHTS aliases LIVABILITY_BLEND_WEIGHTS", () => {
    expect(LIVABILITY_WEIGHTS).toBe(LIVABILITY_BLEND_WEIGHTS);
  });

  it("LIVABILITY_BLEND_WEIGHTS (v2.1) sums to 1.0", () => {
    const w = LIVABILITY_BLEND_WEIGHTS;
    const sum =
      w.resilience +
      w.thermalComfort +
      w.hazardCushion +
      w.growability +
      w.precipModeration +
      w.livedFriction;
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("thermal-comfort plateau is ordered & slopes are positive", () => {
    expect(THERMAL_COMFORT.summerPlateauC[0]).toBeLessThan(THERMAL_COMFORT.summerPlateauC[1]);
    expect(THERMAL_COMFORT.winterPlateauC[0]).toBeLessThan(THERMAL_COMFORT.winterPlateauC[1]);
    expect(THERMAL_COMFORT.summerPerDegHotC).toBeGreaterThan(0);
    expect(THERMAL_COMFORT.summerPerDegCoolC).toBeGreaterThan(0);
    expect(THERMAL_COMFORT.winterPerDegColdC).toBeGreaterThan(0);
    expect(THERMAL_COMFORT.winterPerDegWarmC).toBeGreaterThan(0);
    // Sanity: cold-side slope is harsher than warm-winter slope.
    expect(THERMAL_COMFORT.winterPerDegColdC).toBeGreaterThan(THERMAL_COMFORT.winterPerDegWarmC);
  });

  it("hazard cushion blends mean and max with sensible weight bounds", () => {
    expect(HAZARD_CUSHION.meanWeight).toBeGreaterThan(0);
    expect(HAZARD_CUSHION.meanWeight).toBeLessThan(1);
    expect(HAZARD_CUSHION.maxPerUnit).toBeGreaterThanOrEqual(HAZARD_CUSHION.meanPerUnit);
  });

  it("precip moderation plateau is ordered", () => {
    expect(PRECIP_MODERATION.plateauMm[0]).toBeLessThan(PRECIP_MODERATION.plateauMm[1]);
    expect(PRECIP_MODERATION.floorMm).toBeLessThan(PRECIP_MODERATION.plateauMm[0]);
    expect(PRECIP_MODERATION.ceilingMm).toBeGreaterThan(PRECIP_MODERATION.plateauMm[1]);
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
