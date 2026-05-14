import type { MicroclimateArchetype, Place } from "../types";
import {
  annualComfortMonthCount,
  annualUsableMonthCount,
  meanSummerHumidityPct,
  monthlyUsabilityScores,
} from "./climate-metrics";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type ComfortConfidence = "high" | "medium" | "screening";

export interface ComfortPrecisionMonth {
  index: number;
  label: string;
  highC: number;
  lowC: number;
  humidityPct: number | null;
  humiditySource: "measured" | "archetype" | "missing";
  dewPointC: number | null;
  wetBulbC: number | null;
  apparentHighC: number;
  usabilityScore: number;
  sleepRecoveryScore: number;
  heatStressScore: number;
}

export interface ComfortPrecisionProfile {
  months: ComfortPrecisionMonth[];
  peakMonth: ComfortPrecisionMonth;
  sleepRecoveryMonth: ComfortPrecisionMonth;
  easiestMonths: ComfortPrecisionMonth[];
  hardestMonths: ComfortPrecisionMonth[];
  annualComfortMonths: number;
  annualUsableMonths: number;
  summerHumidityPct: number | null;
  confidence: ComfortConfidence;
  confidenceNote: string;
  methodNote: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function cToF(c: number): number {
  return c * 9 / 5 + 32;
}

export function fToC(f: number): number {
  return (f - 32) * 5 / 9;
}

export function dewPointC(tempC: number, relativeHumidityPct: number): number {
  const rh = clamp(relativeHumidityPct, 1, 100);
  const a = 17.625;
  const b = 243.04;
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

/** Stull wet-bulb approximation for a shade humidity/heat guardrail. */
export function wetBulbStullC(tempC: number, relativeHumidityPct: number): number | null {
  const rh = clamp(relativeHumidityPct, 1, 100);
  if (tempC < 0 || tempC > 50 || rh < 5 || rh > 99) return null;
  return (
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** NWS heat-index equation with the sub-80F simple-formula guardrail. */
export function heatIndexC(tempC: number, relativeHumidityPct: number): number {
  const t = cToF(tempC);
  const rh = clamp(relativeHumidityPct, 1, 100);
  const simple = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
  if ((simple + t) / 2 < 80) return tempC;

  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    0.00683783 * t * t -
    0.05481717 * rh * rh +
    0.00122874 * t * t * rh +
    0.00085282 * t * rh * rh -
    0.00000199 * t * t * rh * rh;

  if (rh < 13 && t >= 80 && t <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  } else if (rh > 85 && t >= 80 && t <= 87) {
    hi += ((rh - 85) / 10) * ((87 - t) / 5);
  }

  return fToC(Math.max(t, hi));
}

function hasArchetype(p: Place, ids: readonly MicroclimateArchetype[]): boolean {
  return ids.some(id => p.archetypes.includes(id));
}

function inferredHumidityForMonth(p: Place, monthIndex: number): number | null {
  const summer = monthIndex >= 5 && monthIndex <= 7;
  let annual: number | null = null;

  if (hasArchetype(p, ["cloud-forest", "tropical-isothermal", "hurricane-coast"])) annual = 82;
  else if (hasArchetype(p, ["hyper-maritime", "fog-belt-coast", "fjord-inlet"])) annual = 80;
  else if (hasArchetype(p, ["cool-summer-maritime", "coastal-upwelling", "lake-moderated"])) annual = 72;
  else if (hasArchetype(p, ["high-desert-escape", "rain-shadow-sanctuary", "desert-oasis", "badland-steppe", "tropical-dry"])) annual = 34;
  else if (hasArchetype(p, ["sky-island-refuge", "volcanic-upland", "monsoon-edge", "eternal-spring-highland"])) annual = 46;

  if (annual == null) return null;
  if (summer && hasArchetype(p, ["tropical-dry", "monsoon-edge"])) return clamp(annual + 8, 20, 92);
  if (summer && hasArchetype(p, ["high-desert-escape", "rain-shadow-sanctuary", "badland-steppe"])) return clamp(annual - 4, 12, 80);
  return annual;
}

function monthHumidity(p: Place, monthIndex: number): Pick<ComfortPrecisionMonth, "humidityPct" | "humiditySource"> {
  const measured = p.climate.humidity?.[monthIndex];
  if (measured != null) return { humidityPct: measured, humiditySource: "measured" };
  const inferred = inferredHumidityForMonth(p, monthIndex);
  if (inferred != null) return { humidityPct: inferred, humiditySource: "archetype" };
  return { humidityPct: null, humiditySource: "missing" };
}

function sleepRecoveryScore(highC: number, lowC: number, humidityPct: number | null): number {
  const diurnal = highC - lowC;
  const nightPenalty = lowC <= 19 ? 0 : (lowC - 19) * 7.5;
  const coldPenalty = lowC >= 5 ? 0 : (5 - lowC) * 3.5;
  const humidityPenalty = humidityPct == null ? 4 : Math.max(0, humidityPct - 72) * 0.42;
  const recoveryCredit = Math.min(18, Math.max(0, diurnal - 8) * 1.5);
  return clamp(86 + recoveryCredit - nightPenalty - coldPenalty - humidityPenalty, 0, 100);
}

function heatStressScore(apparentHighC: number, wetBulbC: number | null): number {
  const apparentPenalty = Math.max(0, apparentHighC - 28) * 5.5;
  const wetBulbPenalty = wetBulbC == null ? 0 : Math.max(0, wetBulbC - 20) * 4.8;
  return clamp(100 - apparentPenalty - wetBulbPenalty, 0, 100);
}

function confidenceForPlace(p: Place, humiditySource: ComfortPrecisionMonth["humiditySource"]): { confidence: ComfortConfidence; note: string } {
  if (p.climate.humidity && p.climate.sunshinePct && p.climate.diurnalSummerC != null) {
    return { confidence: "high", note: "Monthly humidity, sunshine, and authored diurnal recovery are present." };
  }
  if (humiditySource === "measured" || humiditySource === "archetype") {
    return { confidence: "medium", note: humiditySource === "measured" ? "Monthly humidity is present; sunshine or diurnal detail is partial." : "Humidity is archetype-estimated; verify with local station normals before committing." };
  }
  return { confidence: "screening", note: "Humidity is missing, so this is a thermal and precip screen that needs local humidity verification." };
}

export function buildComfortPrecisionProfile(p: Place): ComfortPrecisionProfile {
  const usability = monthlyUsabilityScores(p);
  const months = p.climate.tempHighC.map((highC, index): ComfortPrecisionMonth => {
    const lowC = p.climate.tempLowC[index]!;
    const { humidityPct, humiditySource } = monthHumidity(p, index);
    const dew = humidityPct == null ? null : dewPointC((highC + lowC) / 2, humidityPct);
    const wetBulb = humidityPct == null ? null : wetBulbStullC(highC, humidityPct);
    const apparentHigh = humidityPct == null ? highC : heatIndexC(highC, humidityPct);
    const sleep = sleepRecoveryScore(highC, lowC, humidityPct);
    return {
      index,
      label: MONTHS[index],
      highC,
      lowC,
      humidityPct,
      humiditySource,
      dewPointC: dew,
      wetBulbC: wetBulb,
      apparentHighC: apparentHigh,
      usabilityScore: usability[index]!,
      sleepRecoveryScore: sleep,
      heatStressScore: heatStressScore(apparentHigh, wetBulb),
    };
  });

  const peakMonth = [...months].sort((a, b) => b.apparentHighC - a.apparentHighC)[0]!;
  const sleepRecoveryMonth = [...months].sort((a, b) => b.sleepRecoveryScore - a.sleepRecoveryScore)[0]!;
  const easiestMonths = [...months].sort((a, b) => b.usabilityScore - a.usabilityScore).slice(0, 3);
  const hardestMonths = [...months].sort((a, b) => a.usabilityScore - b.usabilityScore).slice(0, 3);
  const anySource = months.find(m => m.humiditySource !== "missing")?.humiditySource ?? "missing";
  const confidence = confidenceForPlace(p, anySource);

  return {
    months,
    peakMonth,
    sleepRecoveryMonth,
    easiestMonths,
    hardestMonths,
    annualComfortMonths: annualComfortMonthCount(p),
    annualUsableMonths: annualUsableMonthCount(p),
    summerHumidityPct: meanSummerHumidityPct(p) ?? (
      (months[5]!.humidityPct != null && months[6]!.humidityPct != null && months[7]!.humidityPct != null)
        ? (months[5]!.humidityPct + months[6]!.humidityPct + months[7]!.humidityPct) / 3
        : null
    ),
    confidence: confidence.confidence,
    confidenceNote: confidence.note,
    methodNote: `Peak feel uses NWS-style heat index only when heat and humidity warrant it; wet-bulb is a shade proxy, not WBGT, because this atlas does not model sun angle, cloud cover, or wind speed.`,
  };
}
