import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aggregateDaymetPeriod } from "../lib/aggregate";
import type { DaymetDailyRow } from "../lib/daymet-parse";
import {
  applyStationCorrection,
  stationValidation,
  validateStationCorrection,
  type StationCorrection,
  type StationCorrectionFile,
} from "../lib/station-correction";

function syntheticYears(from: number, to: number): DaymetDailyRow[] {
  const rows: DaymetDailyRow[] = [];
  for (let year = from; year <= to; year++) {
    for (let yday = 1; yday <= 365; yday++) {
      rows.push({ year, yday, tmax: 10, tmin: -2, prcp: 2, vp: 600, srad: 200, dayl: 40000, swe: 0 });
    }
  }
  return rows;
}

const correction: StationCorrection = {
  station: { network: "GHCNd", stationId: "USC00000001", name: "TEST TOWN", lat: 1, lon: 2, elevationM: 1000, distanceKm: 1.5, elevationDeltaM: -10, usableYears: 30 },
  reason: "Cold-air pool.",
  tmaxDeltaC: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  tminDeltaC: [-4, -3, -2, -1, 0, 0, 0, 0, 0, -1, -2, -3],
  precipRatio: 0.75,
};

describe("station correction", () => {
  it("shifts each month's normals by its delta and scales precipitation", () => {
    const rows = syntheticYears(1991, 2020);
    const before = aggregateDaymetPeriod(rows, { period: "wmo-1991-2020", startYear: 1991, endYear: 2020 }).normals;
    const after = aggregateDaymetPeriod(applyStationCorrection(rows, correction), {
      period: "wmo-1991-2020",
      startYear: 1991,
      endYear: 2020,
    }).normals;
    for (let m = 0; m < 12; m++) {
      expect(after.tempHighC[m]).toBeCloseTo(before.tempHighC[m]! + correction.tmaxDeltaC![m]!, 5);
      expect(after.tempLowC[m]).toBeCloseTo(before.tempLowC[m]! + correction.tminDeltaC![m]!, 5);
    }
    expect(after.annualPrecipMm).toBeCloseTo(before.annualPrecipMm * 0.75, 0);
    // Derived daily indices follow the corrected days: colder nights, more frost.
    expect(after.frostDays!).toBeGreaterThanOrEqual(before.frostDays!);
  });

  it("never leaves a day with Tmin above Tmax", () => {
    const rows = syntheticYears(2000, 2000).map(r => ({ ...r, tmax: 5, tmin: 4.5 }));
    const warmNights = { ...correction, tmaxDeltaC: Array(12).fill(-1), tminDeltaC: Array(12).fill(1) };
    for (const row of applyStationCorrection(rows, warmNights)) expect(row.tmin).toBeLessThanOrEqual(row.tmax);
  });

  it("rejects malformed corrections", () => {
    expect(() => validateStationCorrection("x", { ...correction, tmaxDeltaC: [1, 2] })).toThrow(/12 finite/);
    expect(() => validateStationCorrection("x", { ...correction, tminDeltaC: undefined })).toThrow(/together/);
    expect(() => validateStationCorrection("x", { ...correction, precipRatio: 9 })).toThrow(/precipRatio/);
  });

  it("records the station as the validation receipt", () => {
    const v = stationValidation(correction);
    expect(v.status).toBe("validated");
    expect(v.stations[0]!.stationId).toBe("USC00000001");
    expect(v.bias?.annualPrecipBiasPct).toBeCloseTo(33.3, 1);
    expect(v.notes).toContain("temperature and precipitation corrected to GHCN-Daily USC00000001");
  });

  it("keeps the reviewed corrections file well-formed", () => {
    const file = JSON.parse(
      readFileSync(new URL("../../../data/climate-v2/stations/station-bias.json", import.meta.url), "utf8"),
    ) as StationCorrectionFile;
    const ids = Object.keys(file.corrections);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const c = file.corrections[id]!;
      expect(() => validateStationCorrection(id, c)).not.toThrow();
      expect(c.station.distanceKm, id).toBeLessThanOrEqual(15);
      expect(Math.abs(c.station.elevationDeltaM ?? 0), id).toBeLessThanOrEqual(100);
    }
  });
});
