import { describe, it, expect } from "vitest";
import {
  annualComfortMonthCount,
  annualUsableMonthCount,
  avgRisk,
  getAnnualPrecipMm,
  meanAnnualHumidityPct,
  meanAnnualSunshinePct,
  meanJanLow,
  meanSummerHigh,
  meanSummerHumidityPct,
  meanWinterSunshinePct,
  monthlyUsabilityScore,
  RISK_VALUE,
  scoringSunshinePct,
  seasonalUsabilityScore,
  summerDiurnalC,
} from "../climate-metrics";
import { makePlace, makeClimate } from "./test-fixtures";

describe("climate-metrics", () => {
  it("RISK_VALUE is monotonic", () => {
    const order: Array<keyof typeof RISK_VALUE> = [
      "very-low", "low", "moderate", "elevated", "high", "very-high",
    ];
    for (let i = 1; i < order.length; i++) {
      expect(RISK_VALUE[order[i]]).toBeGreaterThan(RISK_VALUE[order[i - 1]]);
    }
  });

  it("avgRisk averages all 9 risk axes", () => {
    const p = makePlace({
      risks: {
        wildfire: { level: "moderate" },
        flood: { level: "moderate" },
        drought: { level: "moderate" },
        extremeHeat: { level: "moderate" },
        extremeCold: { level: "moderate" },
        smoke: { level: "moderate" },
        storm: { level: "moderate" },
        landslide: { level: "moderate" },
        coastal: { level: "moderate" },
      },
    });
    expect(avgRisk(p)).toBe(2);
  });

  it("meanSummerHigh is the JJA mean of tempHighC[5..7]", () => {
    const p = makePlace({ climate: makeClimate({ tempHighC: [10, 12, 14, 16, 18, 20, 22, 24, 22, 20, 16, 12] }) });
    expect(meanSummerHigh(p)).toBeCloseTo(22, 6);
  });

  it("meanJanLow is the DJF mean of tempLowC", () => {
    const p = makePlace({ climate: makeClimate({ tempLowC: [-5, -4, 0, 4, 8, 12, 14, 13, 9, 4, -1, -3] }) });
    expect(meanJanLow(p)).toBeCloseTo((-3 + -5 + -4) / 3, 6);
  });

  it("summerDiurnalC prefers authored value, falls back to July high-low", () => {
    const authored = makePlace({ climate: makeClimate({ diurnalSummerC: 17 }) });
    expect(summerDiurnalC(authored)).toBe(17);
    const fallback = makePlace({ climate: makeClimate({ diurnalSummerC: undefined, tempHighC: [10,10,10,10,10,10,30,10,10,10,10,10], tempLowC: [0,0,0,0,0,0,5,0,0,0,0,0] }) });
    expect(summerDiurnalC(fallback)).toBe(25);
  });

  it("getAnnualPrecipMm: prefers authored value, falls back to monthly sum", () => {
    const authored = makePlace({ climate: makeClimate({ annualPrecipMm: 999, precipMm: [1,1,1,1,1,1,1,1,1,1,1,1] }) });
    expect(getAnnualPrecipMm(authored)).toBe(999);
    const fallback = makePlace({ climate: makeClimate({ annualPrecipMm: undefined, precipMm: [10,20,30,40,50,60,70,80,90,100,110,120] }) });
    expect(getAnnualPrecipMm(fallback)).toBe(780);
  });

  it("summarizes optional humidity and sunshine fields without punishing missing data", () => {
    const withFields = makePlace({
      climate: makeClimate({
        humidity: [80, 78, 72, 66, 60, 54, 48, 54, 62, 70, 76, 82],
        sunshinePct: [40, 45, 50, 55, 60, 70, 80, 75, 65, 55, 45, 40],
      }),
    });
    expect(meanAnnualHumidityPct(withFields)).toBeCloseTo(66.83, 2);
    expect(meanSummerHumidityPct(withFields)).toBeCloseTo((54 + 48 + 54) / 3, 6);
    expect(meanAnnualSunshinePct(withFields)).toBeCloseTo(56.67, 2);
    expect(meanWinterSunshinePct(withFields)).toBeCloseTo((40 + 40 + 45) / 3, 6);

    const missing = makePlace({ climate: makeClimate({ humidity: undefined, sunshinePct: undefined }) });
    expect(meanAnnualHumidityPct(missing)).toBeNull();
    expect(meanSummerHumidityPct(missing)).toBeNull();
    expect(meanAnnualSunshinePct(missing)).toBeNull();
    expect(meanWinterSunshinePct(missing)).toBeNull();
  });

  it("keeps scoring on Daymet solar when authored sunshinePct is also present", () => {
    const both = makePlace({
      climate: makeClimate({
        sunshinePct: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90],
        solarEnergyMjM2Day: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      }),
    });
    // 10 + 10*3.75 = 47.5 — must not jump to the 90% sunshine series.
    expect(meanAnnualSunshinePct(both)).toBeCloseTo(47.5, 6);
    expect(scoringSunshinePct(both)).toBeUndefined();
  });

  it("scores monthly usability from day comfort, sleep comfort, and precip burden", () => {
    const easy = makePlace({
      climate: makeClimate({
        tempHighC: [22,22,22,22,22,22,22,22,22,22,22,22],
        tempLowC: [12,12,12,12,12,12,12,12,12,12,12,12],
        precipMm: [40,40,40,40,40,40,40,40,40,40,40,40],
        snowCm: [0,0,0,0,0,0,0,0,0,0,0,0],
      }),
    });
    const wetSnowy = makePlace({
      climate: makeClimate({
        tempHighC: [22,22,22,22,22,22,22,22,22,22,22,22],
        tempLowC: [12,12,12,12,12,12,12,12,12,12,12,12],
        precipMm: [260,260,260,260,260,260,260,260,260,260,260,260],
        snowCm: [40,40,40,40,40,40,40,40,40,40,40,40],
      }),
    });

    expect(monthlyUsabilityScore(easy, 0)).toBe(100);
    expect(monthlyUsabilityScore(wetSnowy, 0)).toBeLessThan(monthlyUsabilityScore(easy, 0));
  });

  it("counts year-round comfort months instead of only peak season comfort", () => {
    const yearRound = makePlace({
      climate: makeClimate({
        tempHighC: [22,22,22,22,22,22,22,22,22,22,22,22],
        tempLowC: [12,12,12,12,12,12,12,12,12,12,12,12],
        precipMm: [40,40,40,40,40,40,40,40,40,40,40,40],
        snowCm: [0,0,0,0,0,0,0,0,0,0,0,0],
      }),
    });
    const oneSeason = makePlace({
      climate: makeClimate({
        tempHighC: [-8,-4,2,10,18,24,26,24,16,8,0,-6],
        tempLowC: [-22,-18,-12,-4,4,10,12,10,5,-2,-10,-20],
        precipMm: [40,40,40,40,40,40,40,40,40,40,40,40],
        snowCm: [25,20,10,4,0,0,0,0,0,4,14,24],
      }),
    });

    expect(annualComfortMonthCount(yearRound)).toBe(12);
    expect(annualUsableMonthCount(yearRound)).toBe(12);
    expect(annualComfortMonthCount(oneSeason)).toBeLessThan(annualComfortMonthCount(yearRound));
    expect(seasonalUsabilityScore(oneSeason)).toBeLessThan(seasonalUsabilityScore(yearRound));
  });
});
