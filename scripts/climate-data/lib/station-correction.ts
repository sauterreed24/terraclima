/**
 * Reviewed station corrections for the Daymet grid
 * (data/climate-v2/stations/station-bias.json).
 *
 * The 1 km grid smooths over the local effects this atlas is about: cold-air
 * pools, fog coasts, lake shores and rain shadows. Where a representative
 * GHCN-Daily station sits beside a place, the mean station-minus-grid
 * difference for each calendar month (over every day both reported) is added
 * to the grid's daily Tmax/Tmin, and its precipitation is scaled by the
 * station/grid ratio, before the normals are aggregated. Everything derived
 * from daily values (frost days, GDD, heat days, dry spells) then follows.
 */

import type { ClimateStationRef, ClimateValidation } from "../../../src/lib/climate-v2/contracts";
import { daymetYdayToMonthIndex } from "./calendar";
import type { DaymetDailyRow } from "./daymet-parse";

export interface StationCorrection {
  station: Omit<ClimateStationRef, "monthCompletenessMin"> & { name: string };
  reason: string;
  /** Station minus grid, °C, Jan..Dec. */
  tmaxDeltaC?: number[];
  tminDeltaC?: number[];
  /** Station total ÷ grid total over the same days; scales every month. */
  precipRatio?: number;
  /**
   * Apply precipRatio only from this year on: for a grid that tracked its
   * station until the station stopped feeding it, then drifted.
   */
  precipFromYear?: number;
}

export interface StationCorrectionFile {
  version: number;
  notes: string[];
  period: string;
  corrections: Record<string, StationCorrection>;
}

function assertMonthly(values: number[] | undefined, label: string): void {
  if (values === undefined) return;
  if (values.length !== 12 || values.some(v => !Number.isFinite(v) || Math.abs(v) > 8)) {
    throw new Error(`${label}: expected 12 finite monthly deltas within ±8°C`);
  }
}

export function validateStationCorrection(placeId: string, c: StationCorrection): void {
  assertMonthly(c.tmaxDeltaC, `${placeId} tmaxDeltaC`);
  assertMonthly(c.tminDeltaC, `${placeId} tminDeltaC`);
  if ((c.tmaxDeltaC === undefined) !== (c.tminDeltaC === undefined)) {
    throw new Error(`${placeId}: tmaxDeltaC and tminDeltaC must be given together`);
  }
  if (c.precipRatio !== undefined && !(c.precipRatio >= 0.3 && c.precipRatio <= 3)) {
    throw new Error(`${placeId}: precipRatio ${c.precipRatio} outside 0.3–3`);
  }
  if (c.precipFromYear !== undefined && (c.precipRatio === undefined || !Number.isInteger(c.precipFromYear))) {
    throw new Error(`${placeId}: precipFromYear needs a precipRatio and a whole year`);
  }
  if (c.tmaxDeltaC === undefined && c.precipRatio === undefined) {
    throw new Error(`${placeId}: correction changes nothing`);
  }
}

/** Daily rows with the station correction applied (input is not mutated). */
export function applyStationCorrection(rows: DaymetDailyRow[], c: StationCorrection): DaymetDailyRow[] {
  return rows.map(row => {
    const m = daymetYdayToMonthIndex(row.year, row.yday);
    let tmax = row.tmax + (c.tmaxDeltaC?.[m] ?? 0);
    let tmin = row.tmin + (c.tminDeltaC?.[m] ?? 0);
    if (tmin > tmax) {
      // Opposite-signed deltas on a near-isothermal day: keep the day's mean.
      const mid = (tmax + tmin) / 2;
      tmax = mid;
      tmin = mid;
    }
    const scalePrecip = c.precipFromYear === undefined || row.year >= c.precipFromYear;
    return { ...row, tmax, tmin, prcp: scalePrecip ? row.prcp * (c.precipRatio ?? 1) : row.prcp };
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Validation receipt for a corrected place. */
export function stationValidation(c: StationCorrection): ClimateValidation {
  const parts: string[] = [];
  const temps = [...(c.tmaxDeltaC ?? []), ...(c.tminDeltaC ?? [])];
  if (temps.length) parts.push("temperature");
  if (c.precipRatio !== undefined) parts.push(c.precipFromYear === undefined ? "precipitation" : `precipitation from ${c.precipFromYear}`);
  return {
    status: "validated",
    stations: [{ ...c.station, monthCompletenessMin: 0.8 }],
    bias: {
      ...(temps.length ? { annualTempMaeC: round1(temps.reduce((a, v) => a + Math.abs(v), 0) / temps.length) } : {}),
      ...(c.precipRatio !== undefined && c.precipFromYear === undefined ? { annualPrecipBiasPct: round1((1 / c.precipRatio - 1) * 100) } : {}),
    },
    notes:
      `Daymet ${parts.join(" and ")} corrected to GHCN-Daily ${c.station.stationId} (${c.station.name}, ` +
      `${c.station.distanceKm} km, ${c.station.usableYears} overlapping years): ${c.reason}`,
  };
}
