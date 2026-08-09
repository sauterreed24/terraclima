/**
 * Aggregate Daymet daily rows into 30-year monthly normals and derived indices.
 */

import type { Monthly12 } from "../../../src/types";
import type { ClimatePeriodId, ClimatePeriodNormals } from "../../../src/lib/climate-v2/contracts";
import { PERIOD_LABELS } from "../../../src/lib/climate-v2/contracts";
import { assertExactly365, daymetYdayToMonthIndex } from "./calendar";
import type { DaymetDailyRow } from "./daymet-parse";
import { relativeHumidityFromVp, solarEnergyMjM2Day } from "./rh-solar";

export interface AggregateOptions {
  period: ClimatePeriodId;
  startYear: number;
  endYear: number;
}

export interface AggregateDiagnostics {
  rhImpossibleInputDays: number;
  includedYears: number[];
}

function empty12(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function asMonthly12(values: number[]): Monthly12 {
  if (values.length !== 12 || values.some(v => !Number.isFinite(v))) {
    throw new Error("Invalid Monthly12");
  }
  return values.map(v => round1(v)) as Monthly12;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

function mean(nums: number[]): number {
  if (nums.length === 0) return Number.NaN;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function periodYearRange(period: ClimatePeriodId): { startYear: number; endYear: number } {
  if (period === "rolling-1996-2025") return { startYear: 1996, endYear: 2025 };
  return { startYear: 1991, endYear: 2020 };
}

/**
 * Build period normals from daily Daymet rows. Requires exactly 365 rows for
 * every included year. Monthly precip = mean of yearly monthly totals.
 * annualPrecipMm is always the sum of the 12 monthly normals.
 */
export function aggregateDaymetPeriod(
  rows: DaymetDailyRow[],
  options: AggregateOptions,
): { normals: ClimatePeriodNormals; diagnostics: AggregateDiagnostics } {
  const { period, startYear, endYear } = options;
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  for (const y of years) assertExactly365(rows, y);

  const yearRows = new Map<number, DaymetDailyRow[]>();
  for (const y of years) yearRows.set(y, []);
  for (const row of rows) {
    if (row.year < startYear || row.year > endYear) continue;
    yearRows.get(row.year)!.push(row);
  }

  // Per-year monthly means (temps/RH/solar) and totals (precip)
  const monthlyHighSums = empty12();
  const monthlyLowSums = empty12();
  const monthlyRhSums = empty12();
  const monthlySolarSums = empty12();
  const monthlyDayCounts = empty12();
  const monthlyPrecipYearTotals: number[][] = Array.from({ length: 12 }, () => []);

  let rhImpossibleInputDays = 0;

  // Derived daily indices accumulators
  let gdd10Sum = 0;
  let frostDaysSum = 0;
  let warmNightsSum = 0;
  let heatDays35Sum = 0;
  let snowpackDaysSum = 0;
  let sweSum = 0;
  let maxSwe = 0;
  const wetDayAmounts: number[] = [];
  const yearlyRx5: number[] = [];
  const yearlyMaxDry: number[] = [];
  const yearlyMeanDry: number[] = [];
  let yearCount = 0;

  for (const y of years) {
    const yrows = yearRows.get(y)!;
    yearCount += 1;
    const monthPrecip = empty12();
    const monthHigh = empty12();
    const monthLow = empty12();
    const monthRh = empty12();
    const monthSolar = empty12();
    const monthN = empty12();

    let dryRun = 0;
    let dryRunSum = 0;
    let dryRunEvents = 0;
    let maxDry = 0;
    let max5 = 0;
    const ring: number[] = [];

    for (const row of yrows) {
      const m = daymetYdayToMonthIndex(y, row.yday);
      monthHigh[m]! += row.tmax;
      monthLow[m]! += row.tmin;
      monthPrecip[m]! += row.prcp;
      monthN[m]! += 1;

      const tmean = (row.tmax + row.tmin) / 2;
      const rh = relativeHumidityFromVp(row.vp, tmean);
      if (rh.flaggedImpossibleInput) rhImpossibleInputDays += 1;
      if (Number.isFinite(rh.rhPct)) monthRh[m]! += rh.rhPct;

      const solar = solarEnergyMjM2Day(row.srad, row.dayl);
      if (Number.isFinite(solar)) monthSolar[m]! += solar;

      // GDD10: max(0, tmean - 10)
      gdd10Sum += Math.max(0, tmean - 10);
      if (row.tmin < 0) frostDaysSum += 1;
      if (row.tmin >= 20) warmNightsSum += 1;
      if (row.tmax >= 35) heatDays35Sum += 1;
      if (row.swe > 0) snowpackDaysSum += 1;
      sweSum += row.swe;
      if (row.swe > maxSwe) maxSwe = row.swe;

      if (row.prcp >= 1) wetDayAmounts.push(row.prcp);

      // dry spell (days with prcp < 1 mm)
      if (row.prcp < 1) {
        dryRun += 1;
        maxDry = Math.max(maxDry, dryRun);
      } else if (dryRun > 0) {
        dryRunSum += dryRun;
        dryRunEvents += 1;
        dryRun = 0;
      }

      ring.push(row.prcp);
      if (ring.length > 5) ring.shift();
      if (ring.length === 5) {
        const s = ring.reduce((a, b) => a + b, 0);
        if (s > max5) max5 = s;
      }
    }
    if (dryRun > 0) {
      dryRunSum += dryRun;
      dryRunEvents += 1;
      maxDry = Math.max(maxDry, dryRun);
    }
    yearlyRx5.push(max5);
    yearlyMaxDry.push(maxDry);
    yearlyMeanDry.push(dryRunEvents > 0 ? dryRunSum / dryRunEvents : 0);

    for (let m = 0; m < 12; m++) {
      const n = monthN[m]!;
      if (n === 0) throw new Error(`Year ${y} month ${m + 1} has zero days`);
      monthlyHighSums[m]! += monthHigh[m]! / n;
      monthlyLowSums[m]! += monthLow[m]! / n;
      monthlyRhSums[m]! += monthRh[m]! / n;
      monthlySolarSums[m]! += monthSolar[m]! / n;
      monthlyDayCounts[m]! += 1;
      monthlyPrecipYearTotals[m]!.push(monthPrecip[m]!);
    }
  }

  const tempHighC = asMonthly12(monthlyHighSums.map((s, i) => s / monthlyDayCounts[i]!));
  const tempLowC = asMonthly12(monthlyLowSums.map((s, i) => s / monthlyDayCounts[i]!));
  const humidity = asMonthly12(monthlyRhSums.map((s, i) => s / monthlyDayCounts[i]!));
  const solarEnergy = asMonthly12(monthlySolarSums.map((s, i) => s / monthlyDayCounts[i]!));
  const precipMm = asMonthly12(
    monthlyPrecipYearTotals.map(totals => mean(totals)),
  );
  const annualPrecipMm = round1(precipMm.reduce((a, b) => a + b, 0));

  // Identity check (floating tolerance after rounding)
  const precipSum = precipMm.reduce((a, b) => a + b, 0);
  if (Math.abs(precipSum - annualPrecipMm) > 0.15) {
    throw new Error(`annualPrecipMm identity failed: sum=${precipSum} annual=${annualPrecipMm}`);
  }

  const diurnalSummerC = round1(
    ((tempHighC[5]! - tempLowC[5]!) + (tempHighC[6]! - tempLowC[6]!) + (tempHighC[7]! - tempLowC[7]!)) / 3,
  );
  const diurnalWinterC = round1(
    ((tempHighC[11]! - tempLowC[11]!) + (tempHighC[0]! - tempLowC[0]!) + (tempHighC[1]! - tempLowC[1]!)) / 3,
  );

  const wetSorted = [...wetDayAmounts].sort((a, b) => a - b);

  const normals: ClimatePeriodNormals = {
    period,
    label: PERIOD_LABELS[period],
    isWmoStandardNormal: period === "wmo-1991-2020",
    tempHighC,
    tempLowC,
    precipMm,
    annualPrecipMm,
    humidity,
    solarEnergyMjM2Day: solarEnergy,
    // snowCm intentionally omitted — Daymet SWE is not snowfall cm
    frostFreeDays: round0(365 - frostDaysSum / yearCount),
    gdd10: round0(gdd10Sum / yearCount),
    diurnalSummerC,
    diurnalWinterC,
    heatDays35C: round1(heatDays35Sum / yearCount),
    warmNights20C: round1(warmNightsSum / yearCount),
    frostDays: round1(frostDaysSum / yearCount),
    meanDrySpellDays: round1(mean(yearlyMeanDry)),
    maxDrySpellDays: round1(mean(yearlyMaxDry)),
    wetDayP95Mm: round1(percentile(wetSorted, 0.95)),
    rx5dayMm: round1(mean(yearlyRx5)),
    snowpackDays: round1(snowpackDaysSum / yearCount),
    meanSweMm: round1(sweSum / (yearCount * 365)),
    maxSweMm: round1(maxSwe),
    chillHours: null,
  };

  return {
    normals,
    diagnostics: { rhImpossibleInputDays, includedYears: years },
  };
}

export function recentShiftReceipt(
  recent: ClimatePeriodNormals,
  wmo: ClimatePeriodNormals,
): { jjaHighDeltaC: number; janLowDeltaC: number; annualPrecipDeltaPct: number } {
  const jja = (a: Monthly12) => (a[5]! + a[6]! + a[7]!) / 3;
  const janLow = (a: Monthly12) => a[0]!;
  const jjaHighDeltaC = round1(jja(recent.tempHighC) - jja(wmo.tempHighC));
  const janLowDeltaC = round1(janLow(recent.tempLowC) - janLow(wmo.tempLowC));
  const base = wmo.annualPrecipMm;
  const annualPrecipDeltaPct =
    base > 0 ? round1(((recent.annualPrecipMm - base) / base) * 100) : 0;
  return { jjaHighDeltaC, janLowDeltaC, annualPrecipDeltaPct };
}
