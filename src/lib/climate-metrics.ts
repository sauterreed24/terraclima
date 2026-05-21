// ============================================================
// Terraclima — Shared climate metric primitives
// ============================================================
// Pure helpers used by scoring, climate-analog, geospatial analysis,
// corpus-stats, and detail components. Lives outside scoring.ts
// to break the previous scoring → geospatial-analysis →
// atlas-corpus-stats → scoring import cycle (see atlas-corpus-stats
// header for the prior workaround). All functions are deterministic
// and assume metric inputs (°C / mm / m) per the schema.
// ============================================================

import type { Place, RiskLevel } from "../types";

export const RISK_VALUE: Record<RiskLevel, number> = {
  "very-low": 0,
  "low": 1,
  "moderate": 2,
  "elevated": 3,
  "high": 4,
  "very-high": 5,
};

const RISK_KEYS = [
  "wildfire",
  "flood",
  "drought",
  "extremeHeat",
  "extremeCold",
  "smoke",
  "storm",
  "landslide",
  "coastal",
] as const;

/** Mean of all nine risk axes on the 0..5 RISK_VALUE scale. */
export function avgRisk(p: Place): number {
  const r = p.risks;
  let sum = 0;
  for (const k of RISK_KEYS) sum += RISK_VALUE[r[k].level];
  return sum / RISK_KEYS.length;
}

/** Mean Jun–Aug daily high (°C). */
export function meanSummerHigh(p: Place): number {
  return (p.climate.tempHighC[5] + p.climate.tempHighC[6] + p.climate.tempHighC[7]) / 3;
}

/** Mean Dec–Feb daily low (°C). */
export function meanJanLow(p: Place): number {
  return (p.climate.tempLowC[11] + p.climate.tempLowC[0] + p.climate.tempLowC[1]) / 3;
}

/** Summer diurnal swing (°C); falls back to July high − low. */
export function summerDiurnalC(p: Place): number {
  if (p.climate.diurnalSummerC != null) return p.climate.diurnalSummerC;
  return p.climate.tempHighC[6] - p.climate.tempLowC[6];
}

export function meanAnnualHumidityPct(p: Place): number | null {
  const humidity = p.climate.humidity;
  if (!humidity) return null;
  return humidity.reduce((sum, value) => sum + value, 0) / humidity.length;
}

export function meanSummerHumidityPct(p: Place): number | null {
  const humidity = p.climate.humidity;
  if (!humidity) return null;
  return (humidity[5] + humidity[6] + humidity[7]) / 3;
}

export function meanAnnualSunshinePct(p: Place): number | null {
  const sunshine = p.climate.sunshinePct;
  if (!sunshine) return null;
  return sunshine.reduce((sum, value) => sum + value, 0) / sunshine.length;
}

export const SEASONAL_USABILITY = {
  dayComfortC: [16, 28] as const,
  sleepComfortC: [4, 19] as const,
  dayPerDegC: 4.2,
  sleepPerDegC: 3.0,
  monthlyPrecipSoftMm: 110,
  monthlyPrecipHardMm: 240,
  monthlySnowSoftCm: 3,
  monthlySnowHardCm: 32,
  pleasantMonthScore: 70,
  usableMonthScore: 55,
} as const;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function bandScore(value: number, lo: number, hi: number, perUnit: number): number {
  if (value >= lo && value <= hi) return 100;
  if (value < lo) return clamp100(100 - (lo - value) * perUnit);
  return clamp100(100 - (value - hi) * perUnit);
}

function monthlyPrecipEase(p: Place, monthIndex: number): number {
  const precip = p.climate.precipMm[monthIndex];
  const snow = p.climate.snowCm?.[monthIndex] ?? 0;
  const precipRange = SEASONAL_USABILITY.monthlyPrecipHardMm - SEASONAL_USABILITY.monthlyPrecipSoftMm;
  const snowRange = SEASONAL_USABILITY.monthlySnowHardCm - SEASONAL_USABILITY.monthlySnowSoftCm;
  const rainEase = precip <= SEASONAL_USABILITY.monthlyPrecipSoftMm
    ? 100
    : 100 - ((precip - SEASONAL_USABILITY.monthlyPrecipSoftMm) / precipRange) * 100;
  const snowEase = snow <= SEASONAL_USABILITY.monthlySnowSoftCm
    ? 100
    : 100 - ((snow - SEASONAL_USABILITY.monthlySnowSoftCm) / snowRange) * 100;
  return clamp100(Math.min(rainEase, snowEase));
}

/** Per-month lived-comfort utility score, 0..100. */
export function monthlyUsabilityScore(p: Place, monthIndex: number): number {
  const day = bandScore(
    p.climate.tempHighC[monthIndex],
    SEASONAL_USABILITY.dayComfortC[0],
    SEASONAL_USABILITY.dayComfortC[1],
    SEASONAL_USABILITY.dayPerDegC,
  );
  const sleep = bandScore(
    p.climate.tempLowC[monthIndex],
    SEASONAL_USABILITY.sleepComfortC[0],
    SEASONAL_USABILITY.sleepComfortC[1],
    SEASONAL_USABILITY.sleepPerDegC,
  );
  const precip = monthlyPrecipEase(p, monthIndex);
  return clamp100(day * 0.54 + sleep * 0.34 + precip * 0.12);
}

export function monthlyUsabilityScores(p: Place): number[] {
  return p.climate.tempHighC.map((_, index) => monthlyUsabilityScore(p, index));
}

export function annualComfortMonthCount(p: Place): number {
  return monthlyUsabilityScores(p).filter(score => score >= SEASONAL_USABILITY.pleasantMonthScore).length;
}

export function annualUsableMonthCount(p: Place): number {
  return monthlyUsabilityScores(p).filter(score => score >= SEASONAL_USABILITY.usableMonthScore).length;
}

/**
 * Year-round livability runway. Rewards both the number of pleasant months
 * and a tolerable shoulder around them, rather than letting one perfect season
 * erase a brutal rest of year.
 */
export function seasonalUsabilityScore(p: Place): number {
  const monthly = monthlyUsabilityScores(p);
  const mean = monthly.reduce((sum, value) => sum + value, 0) / monthly.length;
  const pleasant = monthly.filter(score => score >= SEASONAL_USABILITY.pleasantMonthScore).length;
  const usable = monthly.filter(score => score >= SEASONAL_USABILITY.usableMonthScore).length;
  return clamp100(mean * 0.50 + (pleasant / 12) * 35 + (usable / 12) * 15);
}

/**
 * Annual precipitation (mm) for a place. Uses authored value when present,
 * otherwise sums monthlies. Components and scoring should call this rather
 * than re-implementing the `??`-chain.
 */
export function getAnnualPrecipMm(p: Place): number {
  if (p.climate.annualPrecipMm != null) return p.climate.annualPrecipMm;
  let s = 0;
  for (const v of p.climate.precipMm) s += v;
  return s;
}
