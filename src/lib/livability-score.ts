// ============================================================
// Terraclima — Livability scoring (v2)
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

import type { Place } from "../types";
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
} as const;

/** Sky / dampness modifiers for lived comfort, independent from mean temperature. */
export const SKY_COMFORT = {
  /** Atlas-neutral value when sunshine and humidity are missing. */
  missingDataNeutral: 70,
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
 * Lived-friction parameters. The component starts at a neutral baseline so
 * places without curated `liveSignals` are not penalised, then deducts on each
 * of the three lived axes. The relative weights reflect the strongest signals
 * surfaced by resident-review and cost-of-living research: affordability is
 * the dominant filter for most relocators, social fabric is the dominant
 * filter for places that look "perfect" on paper but read poorly in lived
 * reports (Eureka), and access friction sets a ceiling on how rural a place
 * can be before its livability suffers (Tofino, Forks, Point Reyes).
 */
export const LIVED_FRICTION = {
  /** Neutral baseline when no axis is graded. Keeps unannotated places stable. */
  neutralBaseline: 70,
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
 * v2.1 — Adds an explicit `livedFriction` component so curated affordability /
 * social-fabric / access signals can move the final blended score directly,
 * rather than being trapped behind the thermal-comfort gate. Resilience and
 * precipitation moderation were both slightly down-weighted; the freed weight
 * went into thermal comfort (so sky/dampness corrections register more
 * clearly) and the new lived-friction axis.
 */
export const LIVABILITY_BLEND_WEIGHTS = {
  resilience: 0.22,
  thermalComfort: 0.26,
  hazardCushion: 0.20,
  growability: 0.12,
  precipModeration: 0.08,
  livedFriction: 0.12,
} as const;

const COMPONENT_KEYS = [
  "resilience",
  "thermalComfort",
  "hazardCushion",
  "growability",
  "precipModeration",
  "livedFriction",
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

const COMPONENT_LABEL: Record<ComponentKey, string> = {
  resilience: "Climate resilience",
  thermalComfort: "Felt comfort",
  hazardCushion: "Hazard cushion",
  growability: "Growability",
  precipModeration: "Precip moderation",
  livedFriction: "Lived friction",
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
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

  // Humidity tax (only when summer high implies actual heat).
  if (p.climate.humidity && sh > THERMAL_COMFORT.humidityHeatThresholdC) {
    const summerHum = (p.climate.humidity[5] + p.climate.humidity[6] + p.climate.humidity[7]) / 3;
    const excess = Math.max(0, summerHum - THERMAL_COMFORT.humidityComfortFloorPct);
    base -= excess * THERMAL_COMFORT.humidityPerPct;
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
  if (jl >= loBand && jl <= hiBand) return 100;
  if (jl < loBand) return clamp(100 - (loBand - jl) * THERMAL_COMFORT.winterPerDegColdC);
  return clamp(100 - (jl - hiBand) * THERMAL_COMFORT.winterPerDegWarmC);
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
  const annualSun = meanAnnualSunshinePct(p);
  const annualHumidity = meanAnnualHumidityPct(p);
  const summerHumidity = meanSummerHumidityPct(p);
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

  if (annualPrecip > SKY_COMFORT.dampPrecipStartMm) {
    score -= Math.min(
      SKY_COMFORT.dampPrecipPenaltyMaxPts,
      (annualPrecip - SKY_COMFORT.dampPrecipStartMm) / 80,
    );
  }

  return clamp(score);
}

/**
 * Final comfort signal used by livability ranking. It blends the objective
 * high/low envelope, year-round usable-month runway, sky/dampness, and the
 * curated corpus comfort score so one pleasant season cannot erase a hard
 * rest-of-year livability burden.
 *
 * v2.1 — Increases sky-comfort weight from 0.12 → 0.20 and reduces curator
 * comfort weight from 0.24 → 0.16. Fog-belt coasts were inheriting the bulk
 * of their felt-comfort score from a curator note that read the mild thermal
 * envelope as universally pleasant, when resident reports describe the
 * persistent stratus deck as a real day-to-day drag. Sky comfort is now the
 * stronger anchor on the lived side of the blend.
 */
export function feltComfortScore(p: Place): number {
  return clamp(
    thermalComfortScore(p) * 0.42 +
    seasonalUsabilityScore(p) * 0.22 +
    clamp(p.scores.comfort) * 0.16 +
    skyComfortScore(p) * 0.20,
  );
}

/**
 * Lived-friction sub-score 0..100 (higher = more lived comfort).
 *
 * When `liveSignals` is absent or fully unmarked the score returns the
 * neutral baseline (~70) so most of the atlas is unchanged. Each graded axis
 * either lifts (axis < `benignFloor`) or drags (axis > `benignFloor`) the
 * score by a weighted, escalating penalty.
 */
export function livedFrictionScore(p: Place): number {
  const ls = p.liveSignals;
  if (!ls) return LIVED_FRICTION.neutralBaseline;

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
  if (totalWeight === 0) return LIVED_FRICTION.neutralBaseline;

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
      if (!dom) return `Lived friction unrated → neutral ${Math.round(value)}/100`;
      const axis = dom.axis === "cost" ? "Cost pressure" : dom.axis === "social" ? "Social stress" : "Access friction";
      return `${axis} ${Math.round(dom.value)}/100 (lower is easier) → lived comfort ${Math.round(value)}/100`;
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
    resilience: clamp(p.scores.resilience),
    thermalComfort: feltComfortScore(p),
    hazardCushion: hazardCushionScore(p),
    growability: clamp(p.scores.growability),
    precipModeration: precipModerationScore(p),
    livedFriction: livedFrictionScore(p),
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

/** Rank a pool by livability v2, returning the per-place breakdown alongside the score. */
export function rankLivabilityWithBreakdown(pool: Place[]): LivabilityResult[] {
  if (pool.length === 0) return [];
  return pool.map(scoreLivability).sort((a, b) => b.score - a.score);
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
