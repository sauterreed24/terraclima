import { describe, it, expect } from "vitest";
import { buildGeospatialAnalysis, GEOSPATIAL_WEIGHTS } from "../geospatial-analysis";
import { makeClimate, makePlace } from "./test-fixtures";

describe("buildGeospatialAnalysis", () => {
  it("clamps geospatialSignalScore to [0, 100]", () => {
    const p = makePlace();
    const g = buildGeospatialAnalysis(p);
    expect(g.geospatialSignalScore).toBeGreaterThanOrEqual(0);
    expect(g.geospatialSignalScore).toBeLessThanOrEqual(100);
    expect(g.eoObservabilityScore).toBeGreaterThanOrEqual(0);
    expect(g.eoObservabilityScore).toBeLessThanOrEqual(100);
    expect(g.structuralTextureScore).toBeGreaterThanOrEqual(0);
    expect(g.structuralTextureScore).toBeLessThanOrEqual(100);
  });

  it("survives a malformed localContrast.radiusKm = 0 (E7 guard)", () => {
    const p = makePlace({ localContrast: [{ radiusKm: 0, note: "boom" }] });
    const g = buildGeospatialAnalysis(p);
    // Floor kicks in: radiusKm becomes 8, so reliefEnergy = elevation/8 = 1000/8 = 125.
    expect(Number.isFinite(g.reliefEnergyMPerKm)).toBe(true);
    expect(g.reliefEnergyMPerKm).toBeGreaterThan(0);
  });

  it("returns memoised result for the same place reference", () => {
    const p = makePlace();
    const a = buildGeospatialAnalysis(p);
    const b = buildGeospatialAnalysis(p);
    expect(a).toBe(b);
  });

  it("yields between 2 and 5 spectral signals", () => {
    const p = makePlace();
    const g = buildGeospatialAnalysis(p);
    expect(g.spectralSignals.length).toBeGreaterThanOrEqual(2);
    expect(g.spectralSignals.length).toBeLessThanOrEqual(5);
  });

  it("structure weights and final-signal weights each sum to 1.0", () => {
    const s = GEOSPATIAL_WEIGHTS.structure;
    const sumS = s.relief + s.elevation + s.thermalAmplitude + s.hydroSeasonality + s.uniqueness + s.canopy;
    expect(sumS).toBeCloseTo(1.0, 5);

    const f = GEOSPATIAL_WEIGHTS.signal;
    const sumF = f.relief + f.thermalAmplitude + f.hydroSeasonality + f.terrainExposure + f.eoObservability + f.uniqueness + f.structuralTexture;
    expect(sumF).toBeCloseTo(1.0, 5);

    const eo = GEOSPATIAL_WEIGHTS.eoObservability;
    expect(eo.sentinel + eo.landsat).toBeCloseTo(1.0, 5);
  });

  it("a constant-precip place still yields finite hydroseasonality", () => {
    const p = makePlace({ climate: makeClimate({ precipMm: [40,40,40,40,40,40,40,40,40,40,40,40], annualPrecipMm: 480 }) });
    const g = buildGeospatialAnalysis(p);
    expect(Number.isFinite(g.hydroSeasonalityRatio)).toBe(true);
    expect(g.hydroSeasonalityRatio).toBeGreaterThan(0);
  });
});
