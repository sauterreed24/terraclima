// ============================================================
// Terraclima - Livability scoring (v3)
// ============================================================
//
// A transparent, audit-able livability lens. Each component is a
// pure function of well-defined climate inputs and returns 0..100.
// Components are then blended by published weights to a single
// 0..100 score, with the per-component breakdown returned so the UI
// can surface drivers and drags alongside the score.
//
// Design notes
// ------------
// • **Bidirectional thermal comfort.** The v1 model penalised cold
//   winters and hot summers but gave full marks to tropical winters
//   and arctic summers. That's not how livability actually trades —
//   chill-hour loss, mosquito persistence, and seasonal monotony are
//   genuine downsides at the warm tail, and Arctic summers are not
//   universally pleasant. We use a plateau (full score in a band)
//   with asymmetric per-°C slopes that fall away on both sides.
//
// • **Humidity-aware summer.** A 26°C summer in Boulder ≠ 26°C in
//   Houston. When monthly humidity is available we apply a heat-index
//   proxy penalty proportional to summer high × (humidity − 50)% so
//   the penalty only kicks in when there's actual heat to amplify.
//
// • **Diurnal recovery credit.** Big day–night swings let bodies and
//   buildings recover from peak heat. Up to +8 pts of credit gets
//   added back to the summer comfort sub-score when diurnal > 8°C.
//
// • **Felt comfort, not means-only comfort.** The livability blend now
//   uses a felt-comfort component that mixes summer/winter envelope,
//   usable-month runway, sunshine/fog/dampness, and the curated corpus
//   comfort score. This
//   prevents thermally mild summit, rain-forest, and fog-belt entries
//   from ranking as more comfortable than they feel on the ground.
//
// • **Tail-risk-aware hazard cushion.** Most places sit on a
//   reasonable risk floor; livability is dominated by tail axes (one
//   high-fire site is concerning even when the other eight axes look
//   tame). We blend 60% mean-of-9 with 40% max-of-9, which acts as a
//   soft min and matches a common-sense reading of risk profiles.
//
// • **Precipitation moderation.** Both very low (<300 mm/yr) and very
//   high (>2500 mm/yr) annual precip are livability frictions
//   (irrigation strain vs mold/rot/landslide). We define a U-shaped
//   penalty around a 700..1500 mm/yr plateau.
//
// • **Bounded outputs everywhere.** Each component clamps to [0,100]
//   and the final blended score also clamps so a runaway penalty
//   can't produce a negative atlas-wide.
//
// What the function *doesn't* claim
// ---------------------------------
// This is editorial triage for exploration, not appraisal, insurance
// underwriting, or medical heat-stress advice. The footer copy still
// surfaces that caveat.

import type { MicroclimateArchetype, Place, TopographicDriver } from "../types";
import {
  avgRisk,
  annualComfortMonthCount,
  getAnnualPrecipMm,
  meanAnnualHumidityPct,
  meanAnnualSunshinePct,
  meanJanLow,
  meanSummerHigh,
  meanSummerHumidityPct,
  RISK_VALUE,
  seasonalUsabilityScore,
  summerDiurnalC,
} from "./climate-metrics";
import { countLivedSourceEvidence } from "./lived-sources";
import { dominantPlaceFeelDrag, placeFeelScore } from "./place-feel";

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

/** Plateau bands and slopes for thermal comfort. */
export const THERMAL_COMFORT = {
  /** Summer high (°C) range that earns full marks. */
  summerPlateauC: [18, 26] as const,
  /** Per-°C deduction above the plateau (hot side). */
  summerPerDegHotC: 4.0,
  /** Per-°C deduction below the plateau (cool side — softer because cool summers are inconvenient, not unsafe). */
  summerPerDegCoolC: 1.5,
  /** Winter low (°C) range that earns full marks. */
  winterPlateauC: [-4, 12] as const,
  /** Per-°C deduction below the plateau (cold side). */
  winterPerDegColdC: 4.0,
  /** Per-°C deduction above the plateau (warm-winter side — softer). */
  winterPerDegWarmC: 1.5,
  /** Diurnal recovery: per-°C credit above this floor, capped. */
  diurnalCreditFloorC: 8,
  diurnalCreditPerDegC: 0.4,
  diurnalCreditMaxPts: 8,
  /** Humidity tax: pts per % above this floor, only when summerHigh > 22°C. */
  humidityComfortFloorPct: 50,
  humidityHeatThresholdC: 22,
  humidityPerPct: 0.6,
  /** Warm nights erase recovery even when afternoon highs look acceptable. */
  summerNightHeatFloorC: 20,
  summerNightHeatPerDegC: 2.15,
  /** Hot, very dry, high-sun climates carry radiant load beyond air temperature. */
  aridSolarBurdenHighC: 33,
  aridSolarBurdenPenaltyMaxPts: 14,
} as const;

/** Sky / dampness modifiers for lived comfort, independent from mean temperature. */
export const SKY_COMFORT = {
  /** Atlas-neutral value when sunshine and humidity are missing. */
  missingDataNeutral: 66,
  /** US-like annual sunshine baseline; values above lift, below drag. */
  annualSunBaselinePct: 58,
  sunshinePerPct: 1.35,
  /** Summer humidity above this, paired with small diurnal range, suggests fog/marine-layer drag. */
  summerFogHumidityPct: 72,
  fogDiurnalCeilingC: 12,
  fogPenaltyMaxPts: 36,
  /**
   * Tier-A fog-signature penalty: when monthly summer sunshine collapses
   * (Eureka / Point Reyes / Fort Bragg pattern) the marine-layer impact on
   * lived sky is sharper than the summer-humidity proxy alone can capture.
   */
  summerSunshineCollapsePct: 55,
  summerSunshineCollapsePenaltyMaxPts: 18,
  /** High-precip climates can be thermally mild but damp, dark, and mold-prone. */
  dampPrecipStartMm: 1800,
  dampPrecipPenaltyMaxPts: 22,
} as const;

/** Human atmospheric comfort beyond temperature normals. */
export const ATMOSPHERIC_COMFORT = {
  /** Mugginess thresholds use estimated summer dew point (C). */
  muggyDewPointStartC: 15,
  oppressiveDewPointC: 22,
  /** Very dry air plus heat and wind also feels harsh. */
  aridHumidityFloorPct: 28,
  aridPenaltyMaxPts: 18,
  /** Component blend. Must sum to 1. */
  skyWeight: 0.30,
  windWeight: 0.20,
  mugginessWeight: 0.18,
  airQualityWeight: 0.18,
  solarWeight: 0.14,
} as const;

/** Hazard cushion blending. */
export const HAZARD_CUSHION = {
  /** Mean-of-nine multiplier (per 0..5 unit). */
  meanPerUnit: 13,
  /** Max-of-nine multiplier (per 0..5 unit). */
  maxPerUnit: 20,
  /** Weight on the mean component. The remainder (1 − meanWeight) goes to max. */
  meanWeight: 0.55,
} as const;

/**
 * Lived-friction parameters. The component starts near a neutral baseline, but
 * places without curated `liveSignals` now receive a small coverage penalty so
 * an unresearched housing/services/safety read cannot look as decision-ready as
 * a sourced one. Graded places then deduct on each of the three lived axes.
 * The relative weights reflect the strongest signals
 * surfaced by resident-review and cost-of-living research: affordability is
 * the dominant filter for most relocators, social fabric is the dominant
 * filter for places that look "perfect" on paper but read poorly in lived
 * reports (Eureka), and access friction sets a ceiling on how rural a place
 * can be before its livability suffers (Tofino, Forks, Point Reyes).
 */
export const LIVED_FRICTION = {
  /** Neutral baseline when the lived axes are graded. */
  neutralBaseline: 70,
  /** Conservative coverage penalty when lived reality is not yet source-backed. */
  unratedCoveragePenalty: 4,
  /** Per-point weight on the three friction axes (0..100 input → 0..100 deduction). */
  costWeight: 0.45,
  socialWeight: 0.35,
  accessWeight: 0.20,
  /** Below this friction value, no penalty applies — only credit for known-easy places. */
  benignFloor: 35,
  /** Per-point credit applied when an axis grades below `benignFloor`. */
  creditPerPoint: 0.18,
  /** Above this friction value, the per-point penalty escalates. */
  severeFloor: 65,
  /** Per-point penalty above the friction axis itself contributes. */
  severeMultiplier: 1.35,
} as const;

/** Precipitation moderation parameters. */
export const PRECIP_MODERATION = {
  /** Annual precip plateau (mm/yr) earning full marks. */
  plateauMm: [700, 1500] as const,
  /** Hard floor (mm/yr) below which the component is 0. */
  floorMm: 100,
  /** Hard ceiling (mm/yr) above which the component is 0. */
  ceilingMm: 3500,
} as const;

/**
 * Final blend weights. Must sum to 1.0; asserted in tests.
 *
 * v3 - Adds a `placeFeel` component so authored corpus texture, daily ease,
 * identity, and scouting clarity contribute to the blended read. Core thermal,
 * atmosphere, hazard, and resilience components still dominate the score.
 */
export const LIVABILITY_BLEND_WEIGHTS = {
  thermalComfort: 0.28,
  atmosphericEase: 0.15,
  hazardCushion: 0.16,
  resilience: 0.14,
  growability: 0.08,
  precipModeration: 0.04,
  livedFriction: 0.08,
  placeFeel: 0.07,
} as const;

const COMPONENT_KEYS = [
  "thermalComfort",
  "atmosphericEase",
  "hazardCushion",
  "resilience",
  "growability",
  "precipModeration",
  "livedFriction",
  "placeFeel",
] as const;
type ComponentKey = (typeof COMPONENT_KEYS)[number];

export type LivabilityComponent = {
  key: ComponentKey;
  /** 0..100 component score. */
  value: number;
  /** Weight contribution (component × weight). */
  contribution: number;
  /** Human-readable label for tooltips. */
  label: string;
  /** One-line summary of why this component scored what it did. */
  rationale: string;
};

export interface LivabilityResult {
  /** Place this result is for. */
  place: Place;
  /** 0..100 blended score. */
  score: number;
  /** Per-component breakdown. */
  components: LivabilityComponent[];
  /** Two strongest positive drivers (component values >= 70). */
  drivers: ComponentKey[];
  /** Two strongest drags (component values <= 50). */
  drags: ComponentKey[];
}

export interface HumanComfortNarrative {
  headline: string;
  summary: string;
  strengths: string[];
  frictions: string[];
}

export interface LivedRealityCoverage {
  axes: number;
  sourceCount: number;
  confidence: "source-backed" | "partial" | "unrated";
}

const COMPONENT_LABEL: Record<ComponentKey, string> = {
  resilience: "Climate resilience",
  thermalComfort: "Felt comfort",
  atmosphericEase: "Atmospheric ease",
  hazardCushion: "Hazard cushion",
  growability: "Growability",
  precipModeration: "Precip moderation",
  livedFriction: "Lived friction",
  placeFeel: "Place feel",
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
}

function hasArchetype(p: Place, ids: readonly MicroclimateArchetype[]): boolean {
  return ids.some(id => p.archetypes.includes(id));
}

function hasDriver(p: Place, ids: readonly TopographicDriver[]): boolean {
  return ids.some(id => p.drivers.includes(id));
}

function meanSummerLow(p: Place): number {
  return (p.climate.tempLowC[5] + p.climate.tempLowC[6] + p.climate.tempLowC[7]) / 3;
}

function meanWinterPrecipMm(p: Place): number {
  return (p.climate.precipMm[11] + p.climate.precipMm[0] + p.climate.precipMm[1]) / 3;
}

function estimatedSummerHumidityPct(p: Place): number | null {
  const measured = meanSummerHumidityPct(p);
  if (measured != null) return measured;
  if (hasArchetype(p, ["cloud-forest", "tropical-isothermal", "hurricane-coast"])) return 82;
  if (hasArchetype(p, ["hyper-maritime", "fog-belt-coast", "fjord-inlet"])) return 80;
  if (hasArchetype(p, ["cool-summer-maritime", "coastal-upwelling", "lake-moderated"])) return 72;
  if (hasArchetype(p, ["high-desert-escape", "rain-shadow-sanctuary", "desert-oasis", "badland-steppe", "tropical-dry"])) return 34;
  if (hasArchetype(p, ["sky-island-refuge", "volcanic-upland", "monsoon-edge"])) return 42;
  return null;
}

function estimatedAnnualHumidityPct(p: Place): number | null {
  const measured = meanAnnualHumidityPct(p);
  if (measured != null) return measured;
  if (hasArchetype(p, ["cloud-forest", "tropical-isothermal", "hurricane-coast"])) return 80;
  if (hasArchetype(p, ["hyper-maritime", "fog-belt-coast", "fjord-inlet"])) return 78;
  if (hasArchetype(p, ["cool-summer-maritime", "coastal-upwelling", "lake-moderated"])) return 70;
  if (hasArchetype(p, ["high-desert-escape", "rain-shadow-sanctuary", "desert-oasis", "badland-steppe", "tropical-dry"])) return 32;
  if (hasArchetype(p, ["sky-island-refuge", "volcanic-upland", "monsoon-edge"])) return 42;
  return null;
}

function inferredAnnualSunshinePct(p: Place): number | null {
  const measured = meanAnnualSunshinePct(p);
  if (measured != null) return measured;

  let inferred: number | null = null;
  if (hasArchetype(p, ["hyper-maritime", "fog-belt-coast"])) inferred = 46;
  else if (hasArchetype(p, ["cloud-forest"])) inferred = 48;
  else if (hasArchetype(p, ["coastal-upwelling"])) inferred = 54;
  else if (hasArchetype(p, ["cool-summer-maritime", "fjord-inlet"])) inferred = 56;
  else if (hasArchetype(p, ["subarctic-continental", "alpine-tundra"])) inferred = 50;
  else if (hasArchetype(p, ["high-desert-escape", "rain-shadow-sanctuary", "desert-oasis", "badland-steppe"])) inferred = 78;
  else if (hasArchetype(p, ["sky-island-refuge", "volcanic-upland", "monsoon-edge"])) inferred = 72;
  else if (hasArchetype(p, ["tropical-dry", "mild-winter-foothills", "eternal-spring-highland"])) inferred = 68;

  if (inferred == null) return null;
  const latitudeDim = Math.max(0, Math.abs(p.lat) - 48) * 0.85;
  return clamp(inferred - latitudeDim, 30, 90);
}

function coastalFogSignature(p: Place): number {
  let s = 0;
  if (hasArchetype(p, ["fog-belt-coast"])) s += 34;
  if (hasArchetype(p, ["hyper-maritime"])) s += 26;
  if (hasArchetype(p, ["coastal-upwelling"])) s += 20;
  if (hasArchetype(p, ["cool-summer-maritime"])) s += 10;
  if (hasDriver(p, ["marine-layer"])) s += 18;
  if (hasDriver(p, ["upwelling"])) s += 16;
  if (summerDiurnalC(p) < 8) s += 14;
  else if (summerDiurnalC(p) < 11) s += 7;
  return clamp(s);
}

function riskAxisPenalty(p: Place, key: keyof Place["risks"], perStep: number): number {
  return RISK_VALUE[p.risks[key].level] * perStep;
}

function dewPointC(tempC: number, relativeHumidityPct: number): number {
  const rh = clamp(relativeHumidityPct, 1, 100);
  const a = 17.625;
  const b = 243.04;
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

/**
 * Summer thermal sub-score 0..100. Plateau scores 100; falls away on
 * either side at different rates. Adds humidity tax and diurnal credit.
 */
export function summerComfortScore(p: Place): number {
  const [loBand, hiBand] = THERMAL_COMFORT.summerPlateauC;
  const sh = meanSummerHigh(p);
  let base: number;
  if (sh >= loBand && sh <= hiBand) base = 100;
  else if (sh > hiBand) base = 100 - (sh - hiBand) * THERMAL_COMFORT.summerPerDegHotC;
  else base = 100 - (loBand - sh) * THERMAL_COMFORT.summerPerDegCoolC;

  // Humidity tax (only when summer high implies actual heat). Missing humidity
  // is inferred from the local archetype so humid coasts and tropical entries
  // do not get a free neutral score while measured desert entries stay dry.
  const summerHum = estimatedSummerHumidityPct(p);
  if (summerHum != null && sh > THERMAL_COMFORT.humidityHeatThresholdC) {
    const excess = Math.max(0, summerHum - THERMAL_COMFORT.humidityComfortFloorPct);
    base -= excess * THERMAL_COMFORT.humidityPerPct;
  }

  const summerLow = meanSummerLow(p);
  if (summerLow > THERMAL_COMFORT.summerNightHeatFloorC) {
    base -= (summerLow - THERMAL_COMFORT.summerNightHeatFloorC) * THERMAL_COMFORT.summerNightHeatPerDegC;
  }

  const annualSun = inferredAnnualSunshinePct(p);
  if (
    sh > THERMAL_COMFORT.aridSolarBurdenHighC &&
    getAnnualPrecipMm(p) < 300 &&
    (annualSun ?? 70) > 70
  ) {
    base -= Math.min(
      THERMAL_COMFORT.aridSolarBurdenPenaltyMaxPts,
      (sh - THERMAL_COMFORT.aridSolarBurdenHighC) * 1.8 + ((annualSun ?? 70) - 70) * 0.22,
    );
  }

  // Diurnal credit (clamped).
  const diurnal = summerDiurnalC(p);
  const credit = Math.min(
    THERMAL_COMFORT.diurnalCreditMaxPts,
    Math.max(0, diurnal - THERMAL_COMFORT.diurnalCreditFloorC) * THERMAL_COMFORT.diurnalCreditPerDegC,
  );
  base += credit;

  return clamp(base);
}

/** Winter thermal sub-score 0..100, plateau-with-asymmetric-slopes. */
export function winterComfortScore(p: Place): number {
  const [loBand, hiBand] = THERMAL_COMFORT.winterPlateauC;
  const jl = meanJanLow(p);
  let base: number;
  if (jl >= loBand && jl <= hiBand) base = 100;
  else if (jl < loBand) base = 100 - (loBand - jl) * THERMAL_COMFORT.winterPerDegColdC;
  else base = 100 - (jl - hiBand) * THERMAL_COMFORT.winterPerDegWarmC;

  const winterPrecip = meanWinterPrecipMm(p);
  const wind = windExposureScore(p);
  if (jl < 7 && winterPrecip > 110 && wind < 70) {
    base -= Math.min(14, (winterPrecip - 110) / 18 + (70 - wind) * 0.10);
  }
  return clamp(base);
}

/** Composite thermal comfort: average of summer & winter sub-scores. */
export function thermalComfortScore(p: Place): number {
  return (summerComfortScore(p) + winterComfortScore(p)) / 2;
}

/**
 * Sky comfort catches a gap in pure high/low scoring: foggy, dark, or very
 * damp places can look perfect thermally while feeling less comfortable to
 * live in. Missing sky data stays neutral rather than punitive.
 */
export function skyComfortScore(p: Place): number {
  const annualSun = inferredAnnualSunshinePct(p);
  const annualHumidity = estimatedAnnualHumidityPct(p);
  const summerHumidity = estimatedSummerHumidityPct(p);
  const diurnal = summerDiurnalC(p);
  const annualPrecip = getAnnualPrecipMm(p);
  let score = annualSun == null
    ? SKY_COMFORT.missingDataNeutral
    : clamp(50 + (annualSun - SKY_COMFORT.annualSunBaselinePct) * SKY_COMFORT.sunshinePerPct);

  if (summerHumidity != null && summerHumidity > SKY_COMFORT.summerFogHumidityPct && diurnal < SKY_COMFORT.fogDiurnalCeilingC) {
    score -= Math.min(
      SKY_COMFORT.fogPenaltyMaxPts,
      (summerHumidity - SKY_COMFORT.summerFogHumidityPct) * 0.9 +
        (SKY_COMFORT.fogDiurnalCeilingC - diurnal) * 1.4,
    );
  } else if (annualHumidity != null && annualHumidity > 78 && diurnal < 10) {
    score -= Math.min(18, (annualHumidity - 78) * 0.5 + (10 - diurnal) * 0.9);
  }

  // Summer-sunshine collapse: even when the humidity proxy understates the
  // fog deck, a real measurement of dim summers should pull sky comfort down.
  const sunshine = p.climate.sunshinePct;
  if (sunshine) {
    const summerSun = (sunshine[5] + sunshine[6] + sunshine[7]) / 3;
    if (summerSun < SKY_COMFORT.summerSunshineCollapsePct) {
      score -= Math.min(
        SKY_COMFORT.summerSunshineCollapsePenaltyMaxPts,
        (SKY_COMFORT.summerSunshineCollapsePct - summerSun) * 0.85,
      );
    }
  }

  const fogSignature = coastalFogSignature(p);
  if (fogSignature > 0) {
    score -= Math.min(24, fogSignature * 0.24 + Math.max(0, 10 - diurnal) * 1.2);
  }

  if (annualPrecip > SKY_COMFORT.dampPrecipStartMm) {
    score -= Math.min(
      SKY_COMFORT.dampPrecipPenaltyMaxPts,
      (annualPrecip - SKY_COMFORT.dampPrecipStartMm) / 80,
    );
  }

  return clamp(score);
}

/** Wind and exposure score: 100 = calm/easy, 0 = consistently punishing. */
export function windExposureScore(p: Place): number {
  let score = 100;
  const driverPenalty: Partial<Record<TopographicDriver, number>> = {
    "gap-winds": 20,
    "polar-jet-exposure": 18,
    "katabatic-flow": 12,
    "chinook-foehn": 12,
    upwelling: 8,
    "marine-layer": 6,
    "sea-breeze": 4,
  };
  for (const d of p.drivers) score -= driverPenalty[d] ?? 0;

  if (hasArchetype(p, ["gap-wind-corridor"])) score -= 18;
  if (hasArchetype(p, ["alpine-tundra", "subarctic-continental"])) score -= 14;
  if (hasArchetype(p, ["hyper-maritime", "fjord-inlet", "hurricane-coast"])) score -= 12;
  if (hasArchetype(p, ["fog-belt-coast", "coastal-upwelling"])) score -= 7;
  if (p.elevationM > 2300) score -= Math.min(16, (p.elevationM - 2300) / 85);
  score -= riskAxisPenalty(p, "storm", 3.2);
  score -= riskAxisPenalty(p, "coastal", 1.6);
  return clamp(score);
}

/** Humid heat plus very dry irritation, scored as lived comfort. */
export function mugginessScore(p: Place): number {
  const sh = meanSummerHigh(p);
  const summerLow = meanSummerLow(p);
  const summerMean = (sh + summerLow) / 2;
  const hum = estimatedSummerHumidityPct(p);
  if (hum == null) return 72;

  const dp = dewPointC(summerMean, hum);
  let score = 100;
  if (dp > ATMOSPHERIC_COMFORT.muggyDewPointStartC) {
    const span = ATMOSPHERIC_COMFORT.oppressiveDewPointC - ATMOSPHERIC_COMFORT.muggyDewPointStartC;
    score -= Math.min(55, ((dp - ATMOSPHERIC_COMFORT.muggyDewPointStartC) / span) * 55);
  }
  if (summerLow > 21) score -= Math.min(18, (summerLow - 21) * 3);

  const annualHumidity = estimatedAnnualHumidityPct(p);
  if (
    annualHumidity != null &&
    annualHumidity < ATMOSPHERIC_COMFORT.aridHumidityFloorPct &&
    (sh > 30 || windExposureScore(p) < 70)
  ) {
    score -= Math.min(
      ATMOSPHERIC_COMFORT.aridPenaltyMaxPts,
      (ATMOSPHERIC_COMFORT.aridHumidityFloorPct - annualHumidity) * 0.7 + Math.max(0, sh - 30) * 1.0,
    );
  }
  return clamp(score);
}

/** Smoke, wildfire, drought dust, and heat-event proxy. */
export function airQualityComfortScore(p: Place): number {
  return clamp(
    100 -
      riskAxisPenalty(p, "smoke", 9.5) -
      riskAxisPenalty(p, "wildfire", 5.0) -
      riskAxisPenalty(p, "drought", 3.4) -
      riskAxisPenalty(p, "extremeHeat", 3.0),
  );
}

/** Sunshine is beneficial until it pairs with brutal heat, aridity, or altitude. */
export function solarComfortScore(p: Place): number {
  const annualSun = inferredAnnualSunshinePct(p);
  const sh = meanSummerHigh(p);
  let score = annualSun == null
    ? 72
    : clamp(64 + (annualSun - SKY_COMFORT.annualSunBaselinePct) * 0.82);

  if (annualSun != null && annualSun < 52) score -= (52 - annualSun) * 0.7;
  if (annualSun != null && annualSun > 78 && sh > 31) {
    score -= Math.min(18, (annualSun - 78) * 0.35 + (sh - 31) * 2.4);
  }
  if (p.elevationM > 1800 && Math.abs(p.lat) < 35 && (annualSun ?? 70) > 70) {
    score -= Math.min(8, (p.elevationM - 1800) / 250);
  }
  if (coastalFogSignature(p) > 35) score -= 8;
  return clamp(score);
}

/** Composite atmosphere: sky, wind, mugginess, smoke/air, and solar burden. */
export function atmosphericComfortScore(p: Place): number {
  const w = ATMOSPHERIC_COMFORT;
  return clamp(
    skyComfortScore(p) * w.skyWeight +
    windExposureScore(p) * w.windWeight +
    mugginessScore(p) * w.mugginessWeight +
    airQualityComfortScore(p) * w.airQualityWeight +
    solarComfortScore(p) * w.solarWeight -
    Math.min(
      30,
      Math.max(0, meanSummerHigh(p) - 34) * 1.65 +
        Math.max(0, meanSummerLow(p) - 22) * 1.55 +
        riskAxisPenalty(p, "extremeHeat", 1.8),
    ),
  );
}

/**
 * Final comfort signal used by livability ranking. It blends the objective
 * high/low envelope, year-round usable-month runway, sky/dampness, and the
 * curated corpus comfort score so one pleasant season cannot erase a hard
 * rest-of-year livability burden.
 *
 * v3: Adds atmosphere as a first-class felt-comfort input so fog, wind,
 * humidity, smoke exposure, and radiant heat can move comfort ranking even
 * when the raw high/low envelope looks mild on paper.
 */
export function feltComfortScore(p: Place): number {
  return clamp(
    thermalComfortScore(p) * 0.38 +
    seasonalUsabilityScore(p) * 0.22 +
    clamp(p.scores.comfort) * 0.12 +
    skyComfortScore(p) * 0.18 +
    atmosphericComfortScore(p) * 0.10,
  );
}

/** Pure "how it feels to be there" ranking signal for comfort-first sorting. */
export function humanComfortScore(p: Place): number {
  return clamp(
    feltComfortScore(p) * 0.48 +
    atmosphericComfortScore(p) * 0.26 +
    seasonalUsabilityScore(p) * 0.14 +
    hazardCushionScore(p) * 0.07 +
    livedFrictionScore(p) * 0.05,
  );
}

function pushLimited(list: string[], value: string, max = 3): void {
  if (list.length >= max || list.includes(value)) return;
  list.push(value);
}

function comfortBand(score: number): string {
  if (score >= 84) return "Exceptional";
  if (score >= 74) return "Easy";
  if (score >= 62) return "Mixed";
  if (score >= 48) return "Hard-edged";
  return "Severe";
}

/** Plain-language comfort read generated from the same score components. */
export function describeHumanComfort(p: Place): HumanComfortNarrative {
  const score = humanComfortScore(p);
  const felt = feltComfortScore(p);
  const atmosphere = atmosphericComfortScore(p);
  const summer = summerComfortScore(p);
  const winter = winterComfortScore(p);
  const sky = skyComfortScore(p);
  const wind = windExposureScore(p);
  const muggy = mugginessScore(p);
  const air = airQualityComfortScore(p);
  const solar = solarComfortScore(p);
  const months = annualComfortMonthCount(p);
  const summerHigh = meanSummerHigh(p);
  const winterLow = meanJanLow(p);
  const diurnal = summerDiurnalC(p);
  const strengths: string[] = [];
  const frictions: string[] = [];

  if (felt >= 82) pushLimited(strengths, `${months}/12 months feel broadly usable, not just one perfect shoulder season.`);
  else if (months <= 5) pushLimited(frictions, `Only ${months}/12 months clear the easy day-night-precip screen.`);

  if (summer >= 82 && summerHigh <= 30) pushLimited(strengths, `Summer heat is restrained enough for normal afternoon routines (${summerHigh.toFixed(1)}°C mean high).`);
  else if (summer < 55) pushLimited(frictions, `Summer heat load is a dominant constraint (${summerHigh.toFixed(1)}°C mean high).`);

  if (winter >= 82 && winterLow >= -6) pushLimited(strengths, `Winter lows stay within a manageable daily-life band (${winterLow.toFixed(1)}°C mean).`);
  else if (winter < 55) pushLimited(frictions, `Winter cold is not cosmetic; it changes transport, housing, and outdoor rhythm (${winterLow.toFixed(1)}°C mean low).`);

  if (diurnal >= 12 && summerHigh < 34) pushLimited(strengths, `Night recovery is strong: summer diurnal swing of ${Math.round(diurnal)}°C lifts sleep quality.`);
  if (sky >= 70) pushLimited(strengths, "Sky and light support outdoor time rather than just mild thermometer readings.");
  if (atmosphere >= 76) pushLimited(strengths, "Wind, humidity, smoke, and solar load combine into an easy atmospheric read.");

  if (sky < 45) pushLimited(frictions, "Fog, low sun, or damp sky cuts into the lived feel even when temperatures look mild.");
  if (wind < 55) pushLimited(frictions, "Wind exposure is strong enough to affect walking, patios, sleep noise, and perceived cold.");
  if (muggy < 55) pushLimited(frictions, "Humidity or arid-air stress changes how the heat feels on skin and during sleep.");
  if (air < 55) pushLimited(frictions, "Smoke, fire, drought dust, or heat-event air quality lowers the comfort ceiling.");
  if (solar < 55) pushLimited(frictions, "Sun angle, altitude, or desert radiant load makes shade and timing matter.");

  if (strengths.length === 0) pushLimited(strengths, "The comfort case is balanced rather than spectacular; read the component bars.");
  if (frictions.length === 0) pushLimited(frictions, "No single atmospheric drag dominates the comfort read.");

  const headline = `${comfortBand(score)} human comfort (${Math.round(score)}/100)`;
  const summary = `${strengths[0]} ${frictions[0]}`;
  return { headline, summary, strengths, frictions };
}

/**
 * Lived-friction sub-score 0..100 (higher = more lived comfort).
 *
 * When `liveSignals` is absent or fully unmarked the score returns a slightly
 * conservative screening baseline rather than a full neutral. Each graded axis
 * either lifts (axis < `benignFloor`) or drags (axis > `benignFloor`) the score
 * by a weighted, escalating penalty.
 */
export function livedFrictionScore(p: Place): number {
  const ls = p.liveSignals;
  if (!ls) return LIVED_FRICTION.neutralBaseline - LIVED_FRICTION.unratedCoveragePenalty;

  const axes: [number | undefined, number][] = [
    [ls.costPressure, LIVED_FRICTION.costWeight],
    [ls.socialStress, LIVED_FRICTION.socialWeight],
    [ls.accessFriction, LIVED_FRICTION.accessWeight],
  ];

  let totalWeight = 0;
  let weightedFriction = 0;
  for (const [value, weight] of axes) {
    if (value == null) continue;
    totalWeight += weight;
    weightedFriction += clamp(value) * weight;
  }
  if (totalWeight === 0) return LIVED_FRICTION.neutralBaseline - LIVED_FRICTION.unratedCoveragePenalty;

  // Normalise to a 0..100 friction reading across the graded axes.
  const friction = weightedFriction / totalWeight;

  if (friction <= LIVED_FRICTION.benignFloor) {
    const credit = (LIVED_FRICTION.benignFloor - friction) * LIVED_FRICTION.creditPerPoint;
    return clamp(LIVED_FRICTION.neutralBaseline + credit);
  }
  if (friction <= LIVED_FRICTION.severeFloor) {
    return clamp(LIVED_FRICTION.neutralBaseline - (friction - LIVED_FRICTION.benignFloor));
  }
  const baseDeduction = LIVED_FRICTION.severeFloor - LIVED_FRICTION.benignFloor;
  const severeDeduction = (friction - LIVED_FRICTION.severeFloor) * LIVED_FRICTION.severeMultiplier;
  return clamp(LIVED_FRICTION.neutralBaseline - (baseDeduction + severeDeduction));
}

export function livedRealityCoverage(p: Place): LivedRealityCoverage {
  const ls = p.liveSignals;
  if (!ls) return { axes: 0, sourceCount: 0, confidence: "unrated" };
  const axes = [ls.costPressure, ls.socialStress, ls.accessFriction].filter(v => v != null).length;
  const sourceCount = countLivedSourceEvidence(ls.sources);
  if (axes >= 3 && sourceCount > 0 && ls.note?.trim()) {
    return { axes, sourceCount, confidence: "source-backed" };
  }
  return { axes, sourceCount, confidence: "partial" };
}

/**
 * Public accessor for the dominant lived-friction driver, used by the UI
 * and live-fit reasons/cautions so the score is never opaque.
 */
export function dominantLivedFriction(p: Place): { axis: "cost" | "social" | "access"; value: number } | null {
  const ls = p.liveSignals;
  if (!ls) return null;
  let best: { axis: "cost" | "social" | "access"; value: number } | null = null;
  if (ls.costPressure != null) best = { axis: "cost", value: ls.costPressure };
  if (ls.socialStress != null && (!best || ls.socialStress > best.value)) best = { axis: "social", value: ls.socialStress };
  if (ls.accessFriction != null && (!best || ls.accessFriction > best.value)) best = { axis: "access", value: ls.accessFriction };
  return best;
}

/** Maximum risk value across the nine axes. 0..5. */
export function maxRisk(p: Place): number {
  let max = 0;
  for (const k of RISK_KEYS) {
    const v = RISK_VALUE[p.risks[k].level];
    if (v > max) max = v;
  }
  return max;
}

/**
 * Hazard cushion: a soft-min over the nine risk axes. Blends 60%
 * mean-of-nine with 40% max-of-nine so a single severe axis is
 * visible without dominating.
 */
export function hazardCushionScore(p: Place): number {
  const meanComp = clamp(100 - avgRisk(p) * HAZARD_CUSHION.meanPerUnit);
  const maxComp = clamp(100 - maxRisk(p) * HAZARD_CUSHION.maxPerUnit);
  return clamp(HAZARD_CUSHION.meanWeight * meanComp + (1 - HAZARD_CUSHION.meanWeight) * maxComp);
}

/** Precipitation moderation: U-shaped penalty around the plateau band. */
export function precipModerationScore(p: Place): number {
  const ann = getAnnualPrecipMm(p);
  const [lo, hi] = PRECIP_MODERATION.plateauMm;
  if (ann >= lo && ann <= hi) return 100;
  if (ann < lo) {
    const range = lo - PRECIP_MODERATION.floorMm;
    if (range <= 0 || ann <= PRECIP_MODERATION.floorMm) return 0;
    return clamp(((ann - PRECIP_MODERATION.floorMm) / range) * 100);
  }
  // ann > hi
  const range = PRECIP_MODERATION.ceilingMm - hi;
  if (range <= 0 || ann >= PRECIP_MODERATION.ceilingMm) return 0;
  return clamp(((PRECIP_MODERATION.ceilingMm - ann) / range) * 100);
}

function makeRationale(p: Place, key: ComponentKey, value: number): string {
  switch (key) {
    case "resilience":
      return `Curator resilience ${Math.round(p.scores.resilience)}/100`;
    case "thermalComfort": {
      const sh = meanSummerHigh(p);
      const jl = meanJanLow(p);
      return `Summer ${sh.toFixed(1)}°C · winter ${jl.toFixed(1)}°C · ${annualComfortMonthCount(p)}/12 easy months · sky ${Math.round(skyComfortScore(p))}/100 · curator ${Math.round(p.scores.comfort)}/100 → felt comfort ${Math.round(value)}/100`;
    }
    case "atmosphericEase":
      return `Sky ${Math.round(skyComfortScore(p))}/100 | wind ${Math.round(windExposureScore(p))}/100 | humidity ${Math.round(mugginessScore(p))}/100 | air ${Math.round(airQualityComfortScore(p))}/100 | solar ${Math.round(solarComfortScore(p))}/100`;
    case "hazardCushion":
      return `Risk: mean ${avgRisk(p).toFixed(2)} · max ${maxRisk(p).toFixed(0)}/5 → cushion ${Math.round(value)}/100`;
    case "growability":
      return `Growability ${Math.round(p.scores.growability)}/100`;
    case "precipModeration": {
      const ann = getAnnualPrecipMm(p);
      return `Annual precip ${ann.toFixed(0)} mm → moderation ${Math.round(value)}/100`;
    }
    case "livedFriction": {
      const dom = dominantLivedFriction(p);
      if (!dom) return `Lived reality unrated → conservative screening ${Math.round(value)}/100`;
      const axis = dom.axis === "cost" ? "Cost pressure" : dom.axis === "social" ? "Social stress" : "Access friction";
      return `${axis} ${Math.round(dom.value)}/100 (lower is easier) → lived comfort ${Math.round(value)}/100`;
    }
    case "placeFeel": {
      const drag = dominantPlaceFeelDrag(p);
      return `Place feel ${Math.round(value)}/100; verify ${drag.label.toLowerCase()} first (${Math.round(drag.value)}/100)`;
    }
  }
}

// WeakMap cache — Place objects from data/places are module-level singletons, so
// the same reference always maps to the same result. Test fixtures create fresh
// objects per call, so there is no risk of stale data across test cases.
const _scoreCache = new WeakMap<Place, LivabilityResult>();

/**
 * Score a single place. Returns the blended 0..100 score plus its
 * per-component breakdown so the UI can surface why a place ranked
 * where it did. Results are cached by object identity.
 */
export function scoreLivability(p: Place): LivabilityResult {
  const cached = _scoreCache.get(p);
  if (cached) return cached;
  const w = LIVABILITY_BLEND_WEIGHTS;
  const values: Record<ComponentKey, number> = {
    thermalComfort: feltComfortScore(p),
    atmosphericEase: atmosphericComfortScore(p),
    hazardCushion: hazardCushionScore(p),
    resilience: clamp(p.scores.resilience),
    growability: clamp(p.scores.growability),
    precipModeration: precipModerationScore(p),
    livedFriction: livedFrictionScore(p),
    placeFeel: placeFeelScore(p),
  };
  const components: LivabilityComponent[] = COMPONENT_KEYS.map(key => ({
    key,
    value: values[key],
    contribution: values[key] * w[key],
    label: COMPONENT_LABEL[key],
    rationale: makeRationale(p, key, values[key]),
  }));
  const blended = components.reduce((sum, c) => sum + c.contribution, 0);
  const score = Math.round(clamp(blended));

  const sorted = [...components].sort((a, b) => b.value - a.value);
  const drivers = sorted.filter(c => c.value >= 70).slice(0, 2).map(c => c.key);
  const drags = [...components]
    .filter(c => c.value <= 50)
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map(c => c.key);

  const result: LivabilityResult = { place: p, score, components, drivers, drags };
  _scoreCache.set(p, result);
  return result;
}

/** Rank a pool by livability v3, returning the per-place breakdown alongside the score. */
export function rankLivabilityWithBreakdown(pool: Place[]): LivabilityResult[] {
  if (pool.length === 0) return [];
  // Name tiebreaker gives a total order so tied livability scores rank
  // identically regardless of corpus insertion order — matching the
  // tiebreakers used by rankLaces (scoring.ts) and rankLiveFit (live-fit.ts),
  // and keeping the hero top-ten livability preview stable as the corpus grows.
  return pool
    .map(scoreLivability)
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
}

/**
 * Atlas-wide percentile bands for a livability score. Used to answer
 * "is this place better than the median Terraclima entry?" in the UI.
 *
 * Caller is expected to memoize this across the corpus — it costs O(n log n).
 */
export function livabilityPercentiles(pool: Place[]): { p25: number; p50: number; p75: number; p90: number } {
  if (pool.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 };
  const scores = pool.map(p => scoreLivability(p).score).sort((a, b) => a - b);
  const pick = (q: number): number => {
    if (scores.length === 1) return scores[0]!;
    const pos = q * (scores.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const t = pos - lo;
    return Math.round(scores[lo]! + (scores[hi]! - scores[lo]!) * t);
  };
  return { p25: pick(0.25), p50: pick(0.5), p75: pick(0.75), p90: pick(0.9) };
}

export const LIVABILITY_COMPONENT_KEYS = COMPONENT_KEYS;
export const LIVABILITY_COMPONENT_LABELS = COMPONENT_LABEL;
