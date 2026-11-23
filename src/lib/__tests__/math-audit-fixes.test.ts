import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { buildComfortPrecisionProfile, dewPointC, heatIndexC, relativeHumidityAtTempC } from "../comfort-precision";
import { classifyKoppen } from "../koppen";
import { rankPlaces } from "../scoring";
import { estimateGdd10, projectClimateProfile } from "../climate-projection";
import { meanJanLow } from "../climate-metrics";

describe("afternoon humidity for heat index", () => {
  it("conserves dew point when moving mean-temperature RH to the afternoon high", () => {
    const dew = dewPointC(30, 60);
    const rhAtHigh = relativeHumidityAtTempC(dew, 36);
    expect(rhAtHigh).toBeLessThan(60);
    expect(dewPointC(36, rhAtHigh)).toBeCloseTo(dew, 6);
  });

  it("matches the NWS reference value", () => {
    expect((heatIndexC((90 - 32) * 5 / 9, 70) * 9) / 5 + 32).toBeCloseTo(105.9, 0);
  });

  it("keeps apparent highs physical across the atlas", () => {
    for (const place of PLACES) {
      for (const month of buildComfortPrecisionProfile(place).months) {
        // Nothing in North America has a normal-month heat index above 125°F.
        expect(month.apparentHighC).toBeLessThan(52);
        if (month.wetBulbC != null) expect(month.wetBulbC).toBeLessThanOrEqual(month.highC + 0.01);
      }
    }
  });
});

describe("saturated rankings", () => {
  it("orders frost-free winters by the winter low itself", () => {
    const ranked = rankPlaces("mildest-winters");
    const tied = ranked.filter(r => r.score === 100);
    expect(tied.length).toBeGreaterThan(10);
    for (let i = 1; i < tied.length; i += 1) {
      expect(meanJanLow(tied[i - 1]!.place)).toBeGreaterThanOrEqual(meanJanLow(tied[i]!.place));
    }
  });

  it("never returns a negative score", () => {
    for (const profile of ["best-shoulder-seasons", "best-for-remote-work", "best-retirement"] as const) {
      for (const r of rankPlaces(profile)) expect(r.score).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Köppen dry-season tie-break", () => {
  it("calls a summer-rain highland Cw, not Cs", () => {
    const creel = PLACES.find(p => p.id === "creel-mx")!;
    const result = classifyKoppen(creel.climate.tempHighC, creel.climate.tempLowC, creel.climate.precipMm);
    expect(result?.code.startsWith("Cw")).toBe(true);
  });
});

describe("projected growing degree days", () => {
  it("rise with the projected temperatures", () => {
    const place = PLACES.find(p => p.climate.gdd10 != null && estimateGdd10(p.climate.tempHighC, p.climate.tempLowC) > 500)!;
    const projected = projectClimateProfile(place.climate, { deltaJJAHighC: 3, deltaJANLowC: 3, deltaPrecipPct: 0 });
    expect(projected.gdd10!).toBeGreaterThan(place.climate.gdd10!);
  });
});
