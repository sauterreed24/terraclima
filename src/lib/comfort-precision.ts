import type { MicroclimateArchetype, Monthly12, Place } from "../types";
import {
  annualComfortMonthCount,
  annualUsableMonthCount,
  getAnnualPrecipMm,
  meanSummerHumidityPct,
  monthlyUsabilityScores,
} from "./climate-metrics";
import { computeKoppen } from "./koppen";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type ComfortConfidence = "high" | "medium" | "screening";

export interface ComfortPrecisionMonth {
  index: number;
  label: string;
  highC: number;
  lowC: number;
  humidityPct: number | null;
  humiditySource: "measured" | "analog" | "archetype" | "missing";
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
  humidityBasisNote: string;
  methodNote: string;
}

interface HumidityAnalog {
  id: string;
  name: string;
  score: number;
  humidity: Monthly12;
}

interface HumidityAnalogSeries {
  monthly: Monthly12;
  analogs: readonly HumidityAnalog[];
}

export interface ComfortPrecisionOptions {
  humidityAnalogPool?: readonly Place[];
}

const MIN_ANALOG_SCORE = 0.35;
const MIN_ANALOG_COUNT = 3;
const MAX_ANALOG_COUNT = 5;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function jaccard<T>(a: readonly T[], b: readonly T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const seen = new Set(a);
  let inter = 0;
  for (const item of b) if (seen.has(item)) inter += 1;
  const union = seen.size + b.length - inter;
  return union === 0 ? 0 : inter / union;
}

function decay(diff: number, scale: number): number {
  return Math.exp(-(diff * diff) / (scale * scale));
}

function rmse(a: readonly number[], b: readonly number[], transform: (value: number) => number = value => value): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = transform(a[i]!) - transform(b[i]!);
    sum += diff * diff;
  }
  return Math.sqrt(sum / a.length);
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

function humidityAnalogScore(target: Place, analog: Place): number {
  const high = decay(rmse(target.climate.tempHighC, analog.climate.tempHighC), 9);
  const low = decay(rmse(target.climate.tempLowC, analog.climate.tempLowC), 9);
  const precip = decay(rmse(target.climate.precipMm, analog.climate.precipMm, value => Math.log1p(value)), 1.25);
  const annualPrecip = decay(Math.abs(Math.log1p(getAnnualPrecipMm(target)) - Math.log1p(getAnnualPrecipMm(analog))), 1.2);
  const elevation = decay(Math.abs(target.elevationM - analog.elevationM), 1800);
  const archetypes = jaccard(target.archetypes, analog.archetypes);
  const drivers = jaccard(target.drivers, analog.drivers);
  // Compare the class computed from the normals (falls back to the authored
  // first letter) so the family signal is robust to free-form label formatting.
  const targetFamily = computeKoppen(target)?.family ?? target.koppen[0];
  const analogFamily = computeKoppen(analog)?.family ?? analog.koppen[0];
  const koppenFamily = targetFamily === analogFamily ? 1 : 0;

  return (
    high * 0.24 +
    low * 0.15 +
    precip * 0.18 +
    annualPrecip * 0.12 +
    archetypes * 0.12 +
    drivers * 0.08 +
    elevation * 0.07 +
    koppenFamily * 0.04
  );
}

function buildHumidityAnalogSeries(target: Place, pool: readonly Place[] | undefined): HumidityAnalogSeries | null {
  if (!pool || target.climate.humidity) return null;
  const analogs = pool
    .filter((place): place is Place & { climate: Place["climate"] & { humidity: Monthly12 } } => place.id !== target.id && place.climate.humidity != null)
    .map(place => ({
      id: place.id,
      name: place.name,
      score: humidityAnalogScore(target, place),
      humidity: place.climate.humidity,
    }))
    .filter(analog => analog.score >= MIN_ANALOG_SCORE)
    .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id))
    .slice(0, MAX_ANALOG_COUNT);

  if (analogs.length < MIN_ANALOG_COUNT) return null;

  const monthly = target.climate.tempHighC.map((_, monthIndex) => {
    let weighted = 0;
    let weights = 0;
    for (const analog of analogs) {
      const weight = analog.score * analog.score;
      weighted += analog.humidity[monthIndex]! * weight;
      weights += weight;
    }
    return Math.round(clamp(weighted / weights, 10, 96));
  }) as Monthly12;

  return { monthly, analogs };
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

function monthHumidity(
  p: Place,
  monthIndex: number,
  analogHumidity: HumidityAnalogSeries | null,
): Pick<ComfortPrecisionMonth, "humidityPct" | "humiditySource"> {
  const measured = p.climate.humidity?.[monthIndex];
  if (measured != null) return { humidityPct: measured, humiditySource: "measured" };
  const analog = analogHumidity?.monthly[monthIndex];
  if (analog != null) return { humidityPct: analog, humiditySource: "analog" };
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
  if (humiditySource === "measured") {
    return { confidence: "medium", note: "Monthly humidity is present; sunshine or diurnal detail is partial." };
  }
  if (humiditySource === "analog") {
    return { confidence: "medium", note: "Humidity is inferred from measured climate analogs; verify with local station normals before committing." };
  }
  if (humiditySource === "archetype") {
    return { confidence: "medium", note: "Humidity is archetype-estimated; verify with local station normals before committing." };
  }
  return { confidence: "screening", note: "Humidity is missing, so this is a thermal and precip screen that needs local humidity verification." };
}

function humidityBasisNote(analogHumidity: HumidityAnalogSeries | null, source: ComfortPrecisionMonth["humiditySource"]): string {
  if (source === "measured") return "Monthly humidity normals are authored directly for this place.";
  if (source === "analog" && analogHumidity) {
    return `Humidity inferred from measured analogs: ${analogHumidity.analogs.slice(0, 3).map(analog => analog.name).join(", ")}.`;
  }
  if (source === "archetype") return "Humidity inferred from this place's microclimate archetype set.";
  return "No humidity basis yet; field-check dew point and wet-bulb values locally.";
}

export function buildComfortPrecisionProfile(p: Place, options: ComfortPrecisionOptions = {}): ComfortPrecisionProfile {
  const usability = monthlyUsabilityScores(p);
  const analogHumidity = buildHumidityAnalogSeries(p, options.humidityAnalogPool);
  const months = p.climate.tempHighC.map((highC, index): ComfortPrecisionMonth => {
    const lowC = p.climate.tempLowC[index]!;
    const { humidityPct, humiditySource } = monthHumidity(p, index, analogHumidity);
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

  // Calendar-order (`a.index - b.index`) is the explicit tiebreaker on every
  // pick below, so two months that tie on the sort metric always resolve to the
  // earlier month rather than relying on the engine's (stable) sort order.
  const peakMonth = [...months].sort((a, b) => b.apparentHighC - a.apparentHighC || a.index - b.index)[0]!;
  const sleepRecoveryMonth = [...months].sort((a, b) => b.sleepRecoveryScore - a.sleepRecoveryScore || a.index - b.index)[0]!;
  const easiestMonths = [...months].sort((a, b) => b.usabilityScore - a.usabilityScore || a.index - b.index).slice(0, 3);
  const hardestMonths = [...months].sort((a, b) => a.usabilityScore - b.usabilityScore || a.index - b.index).slice(0, 3);
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
    humidityBasisNote: humidityBasisNote(analogHumidity, anySource),
    methodNote: `Peak feel uses NWS-style heat index only when heat and humidity warrant it; when monthly humidity is absent, the model prefers measured-corpus climate analogs before archetype estimates. Wet-bulb is a shade proxy, not WBGT, because this atlas does not model sun angle, cloud cover, or wind speed.`,
  };
}

// ---- Apparent-comfort index (UTCI-style approximation) ----------------------
//
// HONEST SCOPE: true UTCI is a polynomial regression on air temperature, mean
// radiant temperature, wind speed (10 m), and water-vapour pressure. This atlas
// carries air temperature and relative humidity but NO wind, solar load, or
// radiant-temperature inputs, so a literal UTCI is not computable without
// inventing data. This proxy therefore reuses the same heat-index / wet-bulb
// shade math as the comfort-precision profile and reports a UTCI-*style*
// warm-season thermal-strain band — a heat-and-humidity screen, explicitly not
// a true UTCI value. The band thresholds mirror the published UTCI heat-stress
// breakpoints (26 / 32 / 38 °C) applied to the apparent ("feels-like") high.

export type ThermalStrainBand =
  | "cold"
  | "slight"
  | "no-strain"
  | "moderate"
  | "strong"
  | "very-strong";

export interface ApparentComfortIndex {
  /** Mean Jun–Aug apparent ("feels-like") daily high (°C); heat-index based. */
  warmSeasonApparentHighC: number;
  /** Hottest month apparent high (°C). */
  peakApparentHighC: number;
  /** Coldest monthly mean low (°C). No wind-chill input on the cold side. */
  coldSeasonLowC: number;
  /** Mean Jun–Aug wet-bulb shade proxy (°C) when humidity is available. */
  warmSeasonWetBulbC: number | null;
  /** 0..100 — higher = less physiological thermal strain across the warm season. */
  score: number;
  /** UTCI-style warm-season strain band. */
  band: ThermalStrainBand;
  /** Human-readable band label. */
  bandLabel: string;
  /** Inherited from the comfort-precision humidity confidence ladder. */
  confidence: ComfortConfidence;
  /** Honest scope note (no wind / radiant inputs). */
  methodNote: string;
}

const STRAIN_BAND_LABEL: Record<ThermalStrainBand, string> = {
  "cold": "Cold strain",
  "slight": "Slight cool",
  "no-strain": "No thermal strain",
  "moderate": "Moderate heat strain",
  "strong": "Strong heat strain",
  "very-strong": "Very strong heat strain",
};

/** UTCI-style band from the warm-season apparent high (mirrors UTCI heat breakpoints). */
function strainBand(warmApparentHighC: number): ThermalStrainBand {
  if (warmApparentHighC >= 38) return "very-strong";
  if (warmApparentHighC >= 32) return "strong";
  if (warmApparentHighC >= 26) return "moderate";
  if (warmApparentHighC >= 9) return "no-strain";
  if (warmApparentHighC >= 0) return "slight";
  return "cold";
}

const APPARENT_COMFORT_METHOD_NOTE =
  "UTCI-style approximation from air temperature + relative humidity (with the wet-bulb shade proxy). " +
  "It does NOT use wind speed, solar load, or mean radiant temperature, which this atlas does not carry — " +
  "read it as a warm-season heat-and-humidity strain screen, not a true UTCI value.";

/** Derive the apparent-comfort index from a prebuilt comfort-precision profile. */
export function apparentComfortIndexFromProfile(profile: ComfortPrecisionProfile): ApparentComfortIndex {
  const warm = [profile.months[5]!, profile.months[6]!, profile.months[7]!];
  const warmApparent = warm.reduce((sum, m) => sum + m.apparentHighC, 0) / warm.length;
  const coldLow = Math.min(...profile.months.map(m => m.lowC));
  const wetBulbs = warm.map(m => m.wetBulbC).filter((v): v is number => v != null);
  const warmWetBulb = wetBulbs.length > 0 ? wetBulbs.reduce((sum, v) => sum + v, 0) / wetBulbs.length : null;

  // Strain accrues above UTCI's 26 °C "moderate heat stress" ceiling and below
  // its 9 °C "no thermal stress" floor; a muggy warm season (high wet-bulb)
  // adds an extra penalty on top of the dry apparent-temperature read.
  const heatStrain = Math.max(0, warmApparent - 26);
  const coolStrain = Math.max(0, 9 - warmApparent);
  const wetBulbPenalty = warmWetBulb == null ? 0 : Math.max(0, warmWetBulb - 20) * 3;
  const score = clamp(100 - heatStrain * 4.5 - coolStrain * 2.2 - wetBulbPenalty, 0, 100);
  const band = strainBand(warmApparent);

  return {
    warmSeasonApparentHighC: round1(warmApparent),
    peakApparentHighC: round1(profile.peakMonth.apparentHighC),
    coldSeasonLowC: round1(coldLow),
    warmSeasonWetBulbC: warmWetBulb == null ? null : round1(warmWetBulb),
    score: Math.round(score),
    band,
    bandLabel: STRAIN_BAND_LABEL[band],
    confidence: profile.confidence,
    methodNote: APPARENT_COMFORT_METHOD_NOTE,
  };
}

/** Apparent-comfort (UTCI-style) index for a place. Pure + deterministic. */
export function apparentComfortIndex(p: Place, options: ComfortPrecisionOptions = {}): ApparentComfortIndex {
  return apparentComfortIndexFromProfile(buildComfortPrecisionProfile(p, options));
}
