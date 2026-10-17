/**
 * Reviewed humidity corrections for the Daymet grid
 * (data/climate-v2/stations/humidity-bias.json).
 *
 * Daymet derives vapour pressure from the daily minimum temperature with an
 * aridity correction, which runs far too dry wherever moist air persists
 * through a rainless season (fog coasts, the tropical coasts' dry season, the
 * Mexican highlands' dry winter, the subarctic's early summer). Where a
 * representative ISD station reports hourly dew points, the grid's daily
 * vapour pressure is scaled by the station/grid ratio for that calendar month
 * (scripts/climate-data/station-humidity.ts) before relative humidity is
 * derived; temperatures and precipitation are untouched.
 */

import { daymetYdayToMonthIndex } from "./calendar";
import type { DaymetDailyRow } from "./daymet-parse";

export interface HumidityCorrection {
  station: {
    network: "ISD";
    stationId: string;
    name: string;
    lat: number;
    lon: number;
    elevationM: number;
    distanceKm: number;
    elevationDeltaM: number;
    usableYears: number;
  };
  /** Station ÷ grid mean vapour pressure, Jan..Dec. */
  vpRatio: number[];
  /** Months filled by interpolation from their neighbours (1-based). */
  interpolatedMonths?: number[];
  /**
   * A reviewed stand-in beyond 40 km (up to 130 km) sharing the place's air
   * mass and setting, used where no station is in range.
   */
  regional?: boolean;
}

export interface HumidityCorrectionFile {
  version: number;
  notes: string[];
  period: string;
  corrections: Record<string, HumidityCorrection>;
}

export function validateHumidityCorrection(placeId: string, c: HumidityCorrection): void {
  if (c.vpRatio.length !== 12 || c.vpRatio.some(v => !Number.isFinite(v) || v < 0.4 || v > 5)) {
    throw new Error(`${placeId}: vpRatio needs 12 monthly ratios within 0.4–5`);
  }
}

/** Daily rows with vapour pressure scaled by the month's ratio (input is not mutated). */
export function applyHumidityCorrection(rows: DaymetDailyRow[], c: HumidityCorrection): DaymetDailyRow[] {
  return rows.map(row => ({ ...row, vp: row.vp * c.vpRatio[daymetYdayToMonthIndex(row.year, row.yday)]! }));
}

export function humidityCorrectionNote(c: HumidityCorrection): string {
  const kind = c.regional ? "regional ISD station" : "ISD";
  return `vapour pressure scaled month by month to ${kind} ${c.station.stationId} (${c.station.name}, ${c.station.distanceKm} km) hourly dew points`;
}
