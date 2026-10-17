import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aggregateDaymetPeriod } from "../lib/aggregate";
import type { DaymetDailyRow } from "../lib/daymet-parse";
import {
  applyHumidityCorrection,
  validateHumidityCorrection,
  type HumidityCorrection,
  type HumidityCorrectionFile,
} from "../lib/humidity-correction";

function syntheticYears(from: number, to: number): DaymetDailyRow[] {
  const rows: DaymetDailyRow[] = [];
  for (let year = from; year <= to; year++) {
    for (let yday = 1; yday <= 365; yday++) {
      rows.push({ year, yday, tmax: 24, tmin: 12, prcp: 0, vp: 600, srad: 250, dayl: 45000, swe: 0 });
    }
  }
  return rows;
}

const correction: HumidityCorrection = {
  station: { network: "ISD", stationId: "724915-23259", name: "TEST AIRPORT", lat: 1, lon: 2, elevationM: 20, distanceKm: 4.6, elevationDeltaM: 27, usableYears: 15 },
  vpRatio: [1, 1, 1, 1, 1.2, 1.6, 2.4, 2.6, 2.5, 2, 1.3, 1],
};

describe("humidity correction", () => {
  it("scales each month's vapour pressure, raising relative humidity and nothing else", () => {
    const rows = syntheticYears(1991, 2020);
    const opts = { period: "wmo-1991-2020" as const, startYear: 1991, endYear: 2020 };
    const before = aggregateDaymetPeriod(rows, opts).normals;
    const after = aggregateDaymetPeriod(applyHumidityCorrection(rows, correction), opts).normals;
    for (let m = 0; m < 12; m++) {
      expect(after.humidity![m]! / before.humidity![m]!).toBeCloseTo(correction.vpRatio[m]!, 1);
      expect(after.tempHighC[m]).toBe(before.tempHighC[m]);
      expect(after.tempLowC[m]).toBe(before.tempLowC[m]);
      expect(after.precipMm[m]).toBe(before.precipMm[m]);
    }
    expect(rows[0]!.vp).toBe(600); // input untouched
  });

  it("rejects malformed ratio series", () => {
    expect(() => validateHumidityCorrection("x", { ...correction, vpRatio: [1, 1] })).toThrow();
    expect(() => validateHumidityCorrection("x", { ...correction, vpRatio: Array(12).fill(5) })).toThrow();
    expect(() => validateHumidityCorrection("x", correction)).not.toThrow();
  });

  it("keeps the reviewed file well formed", () => {
    const path = new URL("../../../data/climate-v2/stations/humidity-bias.json", import.meta.url);
    if (!existsSync(path)) return;
    const file = JSON.parse(readFileSync(path, "utf8")) as HumidityCorrectionFile;
    for (const [placeId, c] of Object.entries(file.corrections)) {
      validateHumidityCorrection(placeId, c);
      expect(c.station.distanceKm).toBeLessThanOrEqual(c.regional ? 130 : 40);
      expect(Math.abs(c.station.elevationDeltaM)).toBeLessThanOrEqual(300);
      expect(c.station.usableYears).toBeGreaterThanOrEqual(5);
    }
  });
});
