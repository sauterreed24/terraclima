import { describe, expect, it } from "vitest";
import { aggregateDaymetPeriod, recentShiftReceipt } from "../lib/aggregate";
import { daymetYdayToMonthIndex, isGregorianLeapYear, assertExactly365 } from "../lib/calendar";
import { relativeHumidityFromVp, solarEnergyMjM2Day, saturationVaporPressurePa } from "../lib/rh-solar";
import { parseDaymetCsv, detectCorruptDaymetPayload } from "../lib/daymet-parse";
import type { DaymetDailyRow } from "../lib/daymet-parse";
import { sha256Hex, stableJsonHash } from "../lib/hash";

function syntheticYear(year: number, opts?: { tmax?: number; tmin?: number; prcp?: number }): DaymetDailyRow[] {
  const rows: DaymetDailyRow[] = [];
  for (let yday = 1; yday <= 365; yday++) {
    rows.push({
      year,
      yday,
      tmax: opts?.tmax ?? 20,
      tmin: opts?.tmin ?? 10,
      prcp: opts?.prcp ?? 1,
      vp: 1200,
      srad: 200,
      dayl: 43200,
      swe: yday < 60 ? 5 : 0,
    });
  }
  return rows;
}

describe("Daymet calendar", () => {
  it("marks leap years and maps Feb 29", () => {
    expect(isGregorianLeapYear(2020)).toBe(true);
    expect(isGregorianLeapYear(2021)).toBe(false);
    expect(daymetYdayToMonthIndex(2020, 60)).toBe(1); // Feb 29
    expect(daymetYdayToMonthIndex(2020, 365)).toBe(11); // Dec 30 in leap years
    expect(daymetYdayToMonthIndex(2021, 365)).toBe(11); // Dec 31 non-leap
  });

  it("requires exactly 365 rows", () => {
    const rows = syntheticYear(2000);
    expect(() => assertExactly365(rows, 2000)).not.toThrow();
    expect(() => assertExactly365(rows.slice(0, 364), 2000)).toThrow(/365/);
  });
});

describe("RH and solar", () => {
  it("computes saturation vapor pressure and RH", () => {
    const es = saturationVaporPressurePa(20);
    expect(es).toBeGreaterThan(2000);
    expect(es).toBeLessThan(3000);
    const rh = relativeHumidityFromVp(1500, 20);
    expect(rh.rhPct).toBeGreaterThan(40);
    expect(rh.rhPct).toBeLessThan(80);
    expect(rh.flaggedImpossibleInput).toBe(false);
  });

  it("flags impossible RH inputs before clamp", () => {
    const rh = relativeHumidityFromVp(-10, 20);
    expect(rh.flaggedImpossibleInput).toBe(true);
    expect(rh.rhPct).toBe(0);
  });

  it("computes solar energy MJ/m2/day", () => {
    expect(solarEnergyMjM2Day(200, 43200)).toBeCloseTo(8.64, 5);
  });
});

describe("aggregation", () => {
  it("counts non-freezing days across interrupted spells, not growing-season length", () => {
    const rows = syntheticYear(2001, { tmin: -2 });
    for (const row of rows) if (row.yday % 2 === 0) row.tmin = 0;
    const { normals } = aggregateDaymetPeriod(rows, {
      period: "rolling-1996-2025", startYear: 2001, endYear: 2001,
    });
    expect(normals.frostFreeDays).toBe(182);
    expect(normals.frostDays).toBe(183);
  });
  it("averages monthly precip as yearly totals then mean", () => {
    const rows = [
      ...syntheticYear(1996, { prcp: 2 }),
      ...syntheticYear(1997, { prcp: 0 }),
    ];
    const { normals } = aggregateDaymetPeriod(rows, {
      period: "rolling-1996-2025",
      startYear: 1996,
      endYear: 1997,
    });
    const janDays1996 = rows.filter(r => r.year === 1996 && r.yday <= 31).length;
    expect(normals.precipMm[0]).toBeCloseTo((janDays1996 * 2 + 0) / 2, 5);
    const sum = normals.precipMm.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - normals.annualPrecipMm)).toBeLessThan(0.15);
  });

  it("never treats rolling window as WMO standard normal", () => {
    const rows = [];
    for (let y = 1991; y <= 2020; y++) rows.push(...syntheticYear(y));
    const wmo = aggregateDaymetPeriod(rows, {
      period: "wmo-1991-2020",
      startYear: 1991,
      endYear: 2020,
    });
    expect(wmo.normals.isWmoStandardNormal).toBe(true);
    const recentRows = [];
    for (let y = 1996; y <= 2025; y++) recentRows.push(...syntheticYear(y));
    const recent = aggregateDaymetPeriod(recentRows, {
      period: "rolling-1996-2025",
      startYear: 1996,
      endYear: 2025,
    });
    expect(recent.normals.isWmoStandardNormal).toBe(false);
    const shift = recentShiftReceipt(recent.normals, wmo.normals);
    expect(shift.jjaHighDeltaC).toBe(0);
  });

  it("rejects missing years", () => {
    const rows = syntheticYear(2000);
    expect(() =>
      aggregateDaymetPeriod(rows, { period: "wmo-1991-2020", startYear: 2000, endYear: 2001 }),
    ).toThrow(/365/);
  });
});

describe("Daymet CSV parse", () => {
  const sample = `Latitude: 48.079  Longitude: -123.108
X & Y on Lambert Conformal Conic: 0 0
Tile: 1
Elevation: 65 meters
All years; all variables; Daymet Software Version 4.0
How to cite: Daymet V4 R1
year,yday,dayl (s),prcp (mm/day),srad (W/m^2),swe (kg/m^2),tmax (deg c),tmin (deg c),vp (Pa)
${Array.from({ length: 365 }, (_, i) => `2025,${i + 1},43200,1.00,200.0,0.0,10.0,2.0,1000.0`).join("\n")}
`;

  it("parses header metadata and 365 rows", () => {
    const parsed = parseDaymetCsv(sample);
    expect(parsed.header.elevationM).toBe(65);
    expect(parsed.header.softwareVersion).toBe("4.0");
    expect(parsed.rows).toHaveLength(365);
  });

  it("detects corrupt payloads", () => {
    expect(detectCorruptDaymetPayload("")).toBeTruthy();
    expect(detectCorruptDaymetPayload("Internal Server Error")).toBeTruthy();
    expect(detectCorruptDaymetPayload(sample)).toBeNull();
  });
});

describe("hashing", () => {
  it("is deterministic for object key order", () => {
    expect(stableJsonHash({ b: 1, a: 2 })).toBe(stableJsonHash({ a: 2, b: 1 }));
    expect(sha256Hex("abc")).toHaveLength(64);
  });
});
