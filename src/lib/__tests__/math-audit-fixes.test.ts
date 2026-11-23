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

  it("lets very dry heat read below the thermometer, as the NWS chart does", () => {
    const f = (c: number) => (c * 9) / 5 + 32;
    expect(f(heatIndexC(((100 - 32) * 5) / 9, 10))).toBeCloseTo(94.1, 0);
    // Humid heat still reads above it, and mild air is returned unchanged.
    expect(f(heatIndexC(((100 - 32) * 5) / 9, 40))).toBeCloseTo(109.3, 0);
    expect(heatIndexC(20, 30)).toBe(20);
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
  it("orders every winter by the winter low itself, with no plateau", () => {
    const ranked = rankPlaces("mildest-winters");
    for (let i = 1; i < ranked.length; i += 1) {
      expect(meanJanLow(ranked[i - 1]!.place)).toBeGreaterThanOrEqual(meanJanLow(ranked[i]!.place));
    }
    expect(ranked[0]!.place.id).toBe("key-west-fl");
    expect(ranked.filter(r => r.score === 100).length).toBeLessThan(15);
  });

  it("keeps the leaders of each climate ranking from piling up on one score", () => {
    for (const profile of [
      "best-four-season", "best-diurnal-sleep", "monsoon-drama", "wet-forest-refuges",
      "best-shoulder-seasons", "driest-air", "mediterranean-like",
    ] as const) {
      const ranked = rankPlaces(profile);
      const top = ranked[0]!.score;
      expect(ranked.filter(r => r.score === top).length, profile).toBeLessThanOrEqual(8);
      for (const r of ranked) {
        expect(r.score, profile).toBeGreaterThanOrEqual(0);
        expect(r.score, profile).toBeLessThanOrEqual(100);
      }
    }
  });

  it("asks four seasons for a real winter and monsoon drama for real rain", () => {
    const fourSeason = rankPlaces("best-four-season");
    const rank = (list: typeof fourSeason, id: string) => list.findIndex(r => r.place.id === id);
    // The Gulf coast has no winter; upstate New York has all four.
    expect(rank(fourSeason, "ithaca-ny")).toBeLessThan(20);
    expect(rank(fourSeason, "apalachicola-fl")).toBeGreaterThan(100);
    const monsoon = rankPlaces("monsoon-drama");
    // Death Valley's dry winter is not a monsoon.
    expect(rank(monsoon, "death-valley-ca")).toBeGreaterThan(60);
    expect(rank(monsoon, "alamos-mx")).toBeLessThan(10);
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

describe("clearness-based sunshine estimate", () => {
  it("matches the FAO-56 top-of-atmosphere reference", async () => {
    const { extraterrestrialRadiationMjM2Day } = await import("../climate-metrics");
    // FAO-56 example 8: 20°S on 3 September (day 246) = 32.2 MJ/m²/day.
    expect(extraterrestrialRadiationMjM2Day(-20, 246)).toBeCloseTo(32.2, 1);
  });

  it("does not read a short bright northern winter day as gloom", async () => {
    const { estimatedSunshinePct } = await import("../climate-metrics");
    const boulder = PLACES.find(p => p.id === "boulder-co")!;
    // Station record is ~67% in winter; the old energy mapping said 43%.
    expect(estimatedSunshinePct(boulder, 0)!).toBeGreaterThan(55);
  });
});
