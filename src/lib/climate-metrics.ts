// ============================================================
// Terraclima — Shared climate metric primitives
// ============================================================
// Pure helpers used by scoring, similarity, geospatial analysis,
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
