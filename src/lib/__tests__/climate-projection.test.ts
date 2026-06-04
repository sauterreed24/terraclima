import { describe, expect, it } from "vitest";
import type { Monthly12 } from "../../types";
import {
  estimateFrostFreeDays,
  latBand,
  projectClimateProfile,
  projectPlace,
  projectPool,
  regionalDelta,
  resolveComparePlace,
  resolveDelta,
} from "../climate-projection";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh } from "../climate-metrics";
import { makeClimate, makePlace } from "./test-fixtures";

const month = (value: number): Monthly12 => Array(12).fill(value) as Monthly12;

describe("climate projection — scenario engine", () => {
  it("treats 'now' as identity (same object, no morph)", () => {
    const p = makePlace();
    expect(projectPlace(p, "now")).toBe(p);
    expect(projectPool([p], "now")).toContain(p);
  });

  it("is deterministic and cached per (place, scenario)", () => {
    const p = makePlace();
    const a = projectPlace(p, "ssp585");
    const b = projectPlace(p, "ssp585");
    expect(a).toBe(b); // memoized identity keeps bioclim/analog caches warm
  });

  it("warms summers monotonically: now < SSP2-4.5 < SSP5-8.5", () => {
    const p = makePlace({ lat: 40 }); // mid-latitude USA
    const now = meanSummerHigh(projectPlace(p, "now"));
    const mid = meanSummerHigh(projectPlace(p, "ssp245"));
    const high = meanSummerHigh(projectPlace(p, "ssp585"));
    expect(mid).toBeGreaterThan(now);
    expect(high).toBeGreaterThan(mid);
  });

  it("amplifies high-latitude winters more than summers (Arctic amplification)", () => {
    const arctic = makePlace({ lat: 70, climate: makeClimate({ tempHighC: month(5), tempLowC: month(-15) }) });
    const projected = projectPlace(arctic, "ssp245");
    const winterWarming = projected.climate.tempLowC[0] - arctic.climate.tempLowC[0];
    const summerWarming = projected.climate.tempHighC[6] - arctic.climate.tempHighC[6];
    expect(winterWarming).toBeGreaterThan(summerWarming);
  });

  it("dries the subtropical/Mexican south and wets the north", () => {
    const mxTropical = makePlace({ country: "Mexico", lat: 20 });
    const usNorthern = makePlace({ country: "USA", lat: 50 });
    expect(getAnnualPrecipMm(projectPlace(mxTropical, "ssp245"))).toBeLessThan(getAnnualPrecipMm(mxTropical));
    expect(getAnnualPrecipMm(projectPlace(usNorthern, "ssp245"))).toBeGreaterThan(getAnnualPrecipMm(usNorthern));
  });

  it("lets an authored per-place projection override the regional table", () => {
    const override = makePlace({
      lat: 40,
      projection: { ssp245: { deltaJJAHighC: 10, deltaJANLowC: 10, deltaPrecipPct: 50 } },
    });
    expect(resolveDelta(override, "ssp245")).toEqual({ deltaJJAHighC: 10, deltaJANLowC: 10, deltaPrecipPct: 50 });
    const projected = projectPlace(override, "ssp245");
    expect(meanSummerHigh(projected) - meanSummerHigh(override)).toBeGreaterThan(9);
    expect(meanJanLow(projected) - meanJanLow(override)).toBeGreaterThan(9);
  });

  it("carries humidity and sunshine through unchanged (not projected)", () => {
    const climate = makeClimate({ humidity: month(64), sunshinePct: month(55) });
    const projected = projectClimateProfile(climate, { deltaJJAHighC: 3, deltaJANLowC: 3, deltaPrecipPct: 10 });
    expect(projected.humidity).toEqual(climate.humidity);
    expect(projected.sunshinePct).toEqual(climate.sunshinePct);
  });

  it("returns the same climate object for an all-zero delta", () => {
    const climate = makeClimate();
    expect(projectClimateProfile(climate, { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 })).toBe(climate);
  });

  it("recomputes frost-free days from projected lows", () => {
    expect(estimateFrostFreeDays(month(10))).toBe(365);
    expect(estimateFrostFreeDays(month(-10))).toBe(0);
    const warmed = projectClimateProfile(
      makeClimate({ tempLowC: month(-1) }),
      { deltaJJAHighC: 4, deltaJANLowC: 4, deltaPrecipPct: 0 },
    );
    const baseline = estimateFrostFreeDays(month(-1));
    expect(warmed.frostFreeDays!).toBeGreaterThan(baseline);
  });

  it("maps latitude to bands with Arctic amplification at the poles", () => {
    expect(latBand(20)).toBe("tropical");
    expect(latBand(30)).toBe("subtropical");
    expect(latBand(40)).toBe("midlat");
    expect(latBand(50)).toBe("northern");
    expect(latBand(60)).toBe("boreal");
    expect(latBand(70)).toBe("arctic");
    expect(regionalDelta(makePlace({ lat: 70 }), "ssp585").deltaJANLowC).toBeGreaterThan(
      regionalDelta(makePlace({ lat: 40 }), "ssp585").deltaJANLowC,
    );
  });

  it("resolveComparePlace projects canonical fallbacks outside the active pool", () => {
    const inPool = makePlace({ id: "in-pool", lat: 40 });
    const outside = makePlace({ id: "outside", lat: 40 });
    const projectedPool = projectPool([inPool], "ssp585");
    const projectedById = Object.fromEntries(projectedPool.map(p => [p.id, p]));

    expect(resolveComparePlace("in-pool", projectedById, "ssp585", () => inPool)).toBe(projectedById["in-pool"]);
    const resolvedOutside = resolveComparePlace("outside", projectedById, "ssp585", id =>
      id === "outside" ? outside : undefined,
    );
    expect(resolvedOutside).not.toBe(outside);
    expect(meanSummerHigh(resolvedOutside!)).toBeGreaterThan(meanSummerHigh(outside));
    expect(resolveComparePlace("outside", projectedById, "now", () => outside)).toBe(outside);
  });
});
