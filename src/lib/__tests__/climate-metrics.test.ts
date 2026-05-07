import { describe, it, expect } from "vitest";
import { avgRisk, getAnnualPrecipMm, meanJanLow, meanSummerHigh, RISK_VALUE, summerDiurnalC } from "../climate-metrics";
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
});
