import { describe, expect, it } from "vitest";
import {
  ATLAS_EDITORIAL_SNAPSHOT,
  CLIMATE_NORMALS_PERIOD,
  EARTH_OBSERVATION_SOURCES,
  GEOSPATIAL_ANALYSIS_METHOD,
  STRUCTURAL_BASELINE_NOTE,
} from "../atlas-metadata";

describe("atlas-metadata constants", () => {
  it("CLIMATE_NORMALS_PERIOD names the rolling Now window", () => {
    expect(CLIMATE_NORMALS_PERIOD).toMatch(/\d{4}.{1,3}\d{4}/);
    expect(CLIMATE_NORMALS_PERIOD).toBe("1996–2025");
  });

  it("ATLAS_EDITORIAL_SNAPSHOT reflects data-through year", () => {
    expect(ATLAS_EDITORIAL_SNAPSHOT).toMatch(/Data through \d{4}/);
  });

  it("EARTH_OBSERVATION_SOURCES enumerates both Sentinel-2 and Landsat", () => {
    const ids = EARTH_OBSERVATION_SOURCES.map(s => s.id).sort();
    expect(ids).toEqual(["landsat", "sentinel-2"]);
    for (const src of EARTH_OBSERVATION_SOURCES) {
      expect(src.label.length).toBeGreaterThan(0);
      expect(src.operator.length).toBeGreaterThan(0);
      expect(src.nominalResolutionM).toBeGreaterThan(0);
      expect(src.revisitDays.length).toBeGreaterThan(0);
      expect(src.role.length).toBeGreaterThan(0);
    }
  });

  it("GEOSPATIAL_ANALYSIS_METHOD describes a deterministic, non-ML pipeline", () => {
    expect(GEOSPATIAL_ANALYSIS_METHOD).toMatch(/deterministic/);
    expect(GEOSPATIAL_ANALYSIS_METHOD).toMatch(/not ML/i);
  });

  it("STRUCTURAL_BASELINE_NOTE flags lidar as out-of-scope, not in-pipeline", () => {
    expect(STRUCTURAL_BASELINE_NOTE).toMatch(/lidar/i);
    expect(STRUCTURAL_BASELINE_NOTE).toMatch(/not ingest/i);
  });
});
