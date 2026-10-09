import { describe, expect, it } from "vitest";
import raw from "../../data/geo/na-hydrography.json";
import {
  decodeHydroLine,
  decodeHydrography,
  riverTier,
  riverTierOpacity,
  type EncodedHydrography,
} from "../atlas-map-hydrography";

describe("atlas hydrography", () => {
  it("decodes delta-encoded hundredths back into lon/lat positions", () => {
    expect(decodeHydroLine([-9012, 4501, 3, -2, -10, 5])).toEqual([
      [-90.12, 45.01],
      [-90.09, 44.99],
      [-90.19, 45.04],
    ]);
  });

  it("ships the major North American rivers and lakes inside the atlas box", () => {
    const hydro = decodeHydrography(raw as EncodedHydrography);
    const riverNames = new Set(hydro.rivers.map(r => r.name));
    for (const name of ["Mississippi", "Missouri", "Columbia", "Rio Grande", "Yukon", "Mackenzie", "St. Lawrence"]) {
      expect(riverNames.has(name), name).toBe(true);
    }
    const lakeNames = new Set(hydro.lakes.map(l => l.name));
    for (const name of ["Lake Superior", "Great Bear Lake", "Great Salt Lake", "Lago de Chapala"]) {
      expect(lakeNames.has(name), name).toBe(true);
    }
    for (const river of hydro.rivers) {
      for (const line of river.geometry.coordinates) {
        expect(line.length).toBeGreaterThanOrEqual(2);
        for (const [lon, lat] of line) {
          expect(lon).toBeGreaterThan(-180);
          expect(lon).toBeLessThan(-40);
          expect(lat).toBeGreaterThan(5);
          expect(lat).toBeLessThan(80);
        }
      }
    }
  });

  it("rejects an unknown encoding instead of drawing garbage", () => {
    expect(() => decodeHydrography({ ...(raw as EncodedHydrography), encoding: "raw" as never })).toThrow(/encoding/);
  });

  it("keeps trunk rivers visible at continent scale and fades tributaries in with zoom", () => {
    expect(riverTier(1)).toBe("trunk");
    expect(riverTier(4)).toBe("major");
    expect(riverTier(6)).toBe("regional");
    expect(riverTierOpacity("trunk", 0.5)).toBeGreaterThan(0.5);
    expect(riverTierOpacity("regional", 0.9)).toBe(0);
    expect(riverTierOpacity("regional", 2)).toBeGreaterThan(0.7);
    expect(riverTierOpacity("major", 1.6)).toBeGreaterThan(riverTierOpacity("major", 0.6));
  });
});
