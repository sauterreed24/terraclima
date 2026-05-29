import type { Place, RiskLevel } from "../types";
import {
  annualComfortMonthCount,
  avgRisk,
  meanJanLow,
  meanSummerHigh,
  RISK_VALUE,
  seasonalUsabilityScore,
} from "./climate-metrics";
import {
  atmosphericComfortScore,
  dominantLivedFriction,
  feltComfortScore,
  livedRealityCoverage,
  livedFrictionScore,
  mugginessScore,
  windExposureScore,
} from "./livability-score";
import { dominantPlaceFeelDrag, placeFeelScore, scorePlaceFeel } from "./place-feel";

export type LiveFitPresetId =
  | "cool-summers"
  | "mild-winters"
  | "dry-air"
  | "gardenable"
  | "low-fire-smoke"
  | "four-seasons"
  | "snow-country"
  | "coastal-buffer"
  | "quiet-small-town";

export interface LiveFitPreset {
  id: LiveFitPresetId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface LiveFitFilters {
  fitPresets?: Set<LiveFitPresetId>;
  maxSummerHighC?: number;
  minWinterLowC?: number;
  minGrowability?: number;
  maxFireRisk?: RiskLevel;
  maxOverallRisk?: RiskLevel;
}

export interface LiveFitAssessment {
  score: number;
  reasons: string[];
  cautions: string[];
  badges: string[];
}

const LIVE_FIT_CACHE_LIMIT_PER_PLACE = 96;
const LIVE_FIT_KEY_SEP = "\u001f";
const liveFitAssessmentCache = new WeakMap<Place, Map<string, LiveFitAssessment>>();

export const LIVE_FIT_PRESETS: readonly LiveFitPreset[] = [
  {
    id: "cool-summers",
    label: "Cool summers",
    shortLabel: "Cool",
    description: "Reward places where peak-season afternoons stay restrained.",
  },
  {
    id: "mild-winters",
    label: "Mild winters",
    shortLabel: "Mild",
    description: "Favor winter lows that stay easier for daily life.",
  },
  {
    id: "dry-air",
    label: "Dry air",
    shortLabel: "Dry",
    description: "Prefer lower humidity and crisp diurnal cooling.",
  },
  {
    id: "gardenable",
    label: "Gardenable",
    shortLabel: "Garden",
    description: "Lift places with usable soils, growing season, and crop potential.",
  },
  {
    id: "low-fire-smoke",
    label: "Low fire / smoke",
    shortLabel: "Low fire",
    description: "Screen down wildfire and smoke exposure.",
  },
  {
    id: "four-seasons",
    label: "Four seasons",
    shortLabel: "Seasons",
    description: "Look for real seasonal contrast without punishing extremes.",
  },
  {
    id: "snow-country",
    label: "Snow country",
    shortLabel: "Snow",
    description: "Find winter places where snow is part of the identity.",
  },
  {
    id: "coastal-buffer",
    label: "Coastal buffering",
    shortLabel: "Coast",
    description: "Favor ocean or large-lake moderation and tempered annual range.",
  },
  {
    id: "quiet-small-town",
    label: "Quiet / small-town",
    shortLabel: "Quiet",
    description: "Favor lesser-known places with settlement anchors and low sprawl feel.",
  },
];

export const LIVE_FIT_PRESET_BY_ID: Record<LiveFitPresetId, LiveFitPreset> =
  Object.fromEntries(LIVE_FIT_PRESETS.map(p => [p.id, p])) as Record<LiveFitPresetId, LiveFitPreset>;

const PRESET_CANONICAL_RANK = new Map<LiveFitPresetId, number>(
  LIVE_FIT_PRESETS.map((p, i) => [p.id, i]),
);

/**
 * Order a preset set by its canonical position in {@link LIVE_FIT_PRESETS}.
 *
 * A `Set<LiveFitPresetId>` carries whatever insertion order its source used —
 * URL `fit=` order, a lifestyle bundle's authored order, or the order a user
 * toggled chips. Two logically-identical sets could therefore differ, which
 * destabilized both the live-fit cache key and the surfaced badge order
 * (`presets.slice(0, 3)`). Canonicalizing makes the assessment a pure function
 * of the *set's contents*, so the cache always hits and badges read in the
 * same intentional order the preset list uses in the UI.
 */
function canonicalPresetOrder(
  presets: ReadonlySet<LiveFitPresetId> | undefined,
): LiveFitPresetId[] {
  if (!presets || presets.size === 0) return [];
  return [...presets].sort(
    (a, b) => (PRESET_CANONICAL_RANK.get(a) ?? 0) - (PRESET_CANONICAL_RANK.get(b) ?? 0),
  );
}

export const LIVE_FIT_SUMMER_CAPS_C = [22, 26] as const;
export const LIVE_FIT_WINTER_FLOORS_C = [-5, 0, 2] as const;
export const LIVE_FIT_GROWABILITY_FLOORS = [65, 75] as const;
export const LIVE_FIT_RISK_CEILINGS = ["low", "moderate", "elevated"] as const satisfies readonly RiskLevel[];

/**
 * v3 - Relocation-first blend. Raw novelty is now only a tie-breaker, while
 * place feel gets a direct lane so authored daily texture, scouting anchors,
 * and practical ease can move the live-here ranking without overpowering
 * felt comfort, hazards, and resilience.
 */
const LIVE_FIT_DEFAULT_WEIGHTS = {
  feltComfort: 0.31,
  seasonalRunway: 0.12,
  atmosphericEase: 0.14,
  hazardEase: 0.12,
  resilience: 0.09,
  growability: 0.07,
  livedFriction: 0.04,
  placeFeel: 0.10,
  uniqueness: 0.01,
} as const;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function scoreNear(value: number, ideal: number, perUnitPenalty: number): number {
  return clamp100(100 - Math.abs(value - ideal) * perUnitPenalty);
}

function riskEase(level: RiskLevel): number {
  return clamp100(100 - RISK_VALUE[level] * 20);
}

function snowScore(place: Place): number {
  const snow = place.climate.snowCm;
  if (!snow) return 0;
  const annual = snow.reduce((a, b) => a + b, 0);
  const months = snow.filter(v => v >= 2).length;
  return clamp100(annual / 3 + months * 7);
}

function humidityScore(place: Place): number {
  if (!place.climate.humidity) return 55;
  const mean = place.climate.humidity.reduce((a, b) => a + b, 0) / 12;
  return clamp100(100 - Math.max(0, mean - 35) * 2.2);
}

/**
 * Sunshine + fog-free comfort score (0–100).
 *
 * Calibrated to research baselines (PMC12272345, Frontiers Public Health 2025):
 * - 58% possible sunshine = US national average → neutral (50 pts)
 * - Eureka CA: ~48% → ~35 pts; Bisbee AZ: ~80% → ~83 pts
 * - Summer marine layer (May–Aug) penalised more heavily than winter grayness:
 *   "June Gloom" / "Fogust" pattern where the gray season coincides with peak
 *   cultural outdoor expectations is the most mood-damaging pattern.
 */
function sunshineScore(place: Place): number {
  const sunny = place.climate.sunshinePct;
  const hum = place.climate.humidity;
  const diurnal = place.climate.diurnalSummerC ?? (place.climate.tempHighC[6] - place.climate.tempLowC[6]);

  if (!sunny && !hum) return 50; // no data — neutral

  let score = 50; // neutral baseline tied to US average

  if (sunny) {
    const annualSun = sunny.reduce((a, b) => a + b, 0) / 12;
    // 58% = US avg = 50 pts; +1.5 pts per % above, -1.5 below; capped 0–100
    score = clamp100(50 + (annualSun - 58) * 1.5);
  }

  if (hum) {
    // Summer months (May–Aug = indices 4–7) are the most damaging for marine-layer coasts.
    // A place with fog in winter only (Portland pattern) is less harmful than one where
    // summer is the gray season (Eureka, Half Moon Bay "June Gloom" pattern).
    const summerHum = (hum[4] + hum[5] + hum[6] + hum[7]) / 4;
    const annualHum = hum.reduce((a, b) => a + b, 0) / 12;

    if (summerHum > 72 && diurnal < 12) {
      // Summer fog-belt signature — strongest penalty
      const fogPenalty = Math.min(25, (summerHum - 72) * 0.65 + Math.max(0, 12 - diurnal) * 0.75);
      score = clamp100(score - fogPenalty);
    } else if (annualHum > 76 && diurnal < 12) {
      // Year-round overcast without a strong summer peak
      const fogPenalty = Math.min(15, (annualHum - 76) * 0.4 + Math.max(0, 12 - diurnal) * 0.5);
      score = clamp100(score - fogPenalty);
    }
  }

  return score;
}

function coastalModerationScore(place: Place): number {
  const archetypeHit = place.archetypes.some(a =>
    a === "cool-summer-maritime" ||
    a === "fog-belt-coast" ||
    a === "coastal-upwelling" ||
    a === "lake-moderated" ||
    a === "hyper-maritime" ||
    a === "fjord-inlet" ||
    a === "tropical-isothermal",
  );
  const summer = meanSummerHigh(place);
  const winter = meanJanLow(place);
  const range = summer - winter;
  const rangeScore = clamp100(100 - Math.max(0, range - 18) * 4);
  return clamp100(rangeScore + (archetypeHit ? 22 : 0));
}

function quietScore(place: Place): number {
  const anchors = place.settlementsWithinZone?.length ?? 0;
  const isMajorCity =
    /\b(city|metro|urban)\b/i.test(place.name) ||
    place.relocationFit.some(t => /urban|nightlife|major|big-city/i.test(t));
  const hidden = place.scores.hiddenGem;
  const tierLift = place.tier === "B" ? 8 : place.tier === "C" ? 10 : 0;
  return clamp100(hidden + anchors * 4 + tierLift - (isMajorCity ? 24 : 0));
}

/** Minimum presetScore for a place to remain in the Explorer pool when a preset is active in filters/URL. */
export const LIVE_FIT_PRESET_POOL_THRESHOLD = 50;

export function liveFitPresetsPoolPass(place: Place, presets?: Set<LiveFitPresetId>): boolean {
  if (!presets?.size) return true;
  for (const id of presets) {
    if (presetScore(place, id) < LIVE_FIT_PRESET_POOL_THRESHOLD) return false;
  }
  return true;
}

function presetScore(place: Place, preset: LiveFitPresetId): number {
  const summer = meanSummerHigh(place);
  const winter = meanJanLow(place);
  switch (preset) {
    case "cool-summers":
      return clamp100(100 - Math.max(0, summer - 22) * 7);
    case "mild-winters":
      return clamp100(100 - Math.max(0, -winter) * 5);
    case "dry-air":
      return humidityScore(place);
    case "gardenable":
      return place.scores.growability;
    case "low-fire-smoke":
      return Math.round((riskEase(place.risks.wildfire.level) + riskEase(place.risks.smoke.level)) / 2);
    case "four-seasons":
      return scoreNear(summer - winter, 25, 3.6);
    case "snow-country":
      return snowScore(place);
    case "coastal-buffer":
      return coastalModerationScore(place);
    case "quiet-small-town":
      return quietScore(place);
  }
}

function defaultLiveScore(place: Place): number {
  const hazardEase = clamp100(100 - avgRisk(place) * 16);
  const w = LIVE_FIT_DEFAULT_WEIGHTS;
  return Math.round(clamp100(
    feltComfortScore(place) * w.feltComfort +
    seasonalUsabilityScore(place) * w.seasonalRunway +
    atmosphericComfortScore(place) * w.atmosphericEase +
    hazardEase * w.hazardEase +
    place.scores.resilience * w.resilience +
    place.scores.growability * w.growability +
    livedFrictionScore(place) * w.livedFriction +
    placeFeelScore(place) * w.placeFeel +
    place.scores.microclimateUniqueness * w.uniqueness,
  ));
}

function pushUnique(list: string[], value: string, max: number): void {
  if (list.length >= max || list.includes(value)) return;
  list.push(value);
}

function pushPinnedUnique(list: string[], value: string, max: number): void {
  if (list.includes(value)) return;
  if (list.length >= max) {
    list.splice(max - 1, 1, value);
    return;
  }
  list.push(value);
}

function liveFitFilterKey(filters: LiveFitFilters = {}): string {
  return [
    canonicalPresetOrder(filters.fitPresets).join(","),
    filters.maxSummerHighC ?? "",
    filters.minWinterLowC ?? "",
    filters.minGrowability ?? "",
    filters.maxFireRisk ?? "",
    filters.maxOverallRisk ?? "",
  ].join(LIVE_FIT_KEY_SEP);
}

function cloneLiveFitAssessment(fit: LiveFitAssessment): LiveFitAssessment {
  return {
    score: fit.score,
    reasons: [...fit.reasons],
    cautions: [...fit.cautions],
    badges: [...fit.badges],
  };
}

function getCachedLiveFitAssessment(place: Place, filters: LiveFitFilters = {}): LiveFitAssessment {
  const key = liveFitFilterKey(filters);
  let placeCache = liveFitAssessmentCache.get(place);
  if (!placeCache) {
    placeCache = new Map();
    liveFitAssessmentCache.set(place, placeCache);
  }
  const cached = placeCache.get(key);
  if (cached) return cached;

  const fit = computeLiveFitAssessment(place, filters);
  if (placeCache.size >= LIVE_FIT_CACHE_LIMIT_PER_PLACE) placeCache.clear();
  placeCache.set(key, fit);
  return fit;
}

function computeLiveFitAssessment(place: Place, filters: LiveFitFilters = {}): LiveFitAssessment {
  const presets = canonicalPresetOrder(filters.fitPresets);
  const presetScores = presets.map(id => presetScore(place, id));
  let score = presetScores.length
    ? Math.round((defaultLiveScore(place) * 0.35) + (presetScores.reduce((a, b) => a + b, 0) / presetScores.length) * 0.65)
    : defaultLiveScore(place);

  if (filters.maxSummerHighC != null && meanSummerHigh(place) > filters.maxSummerHighC) score -= 18;
  if (filters.minWinterLowC != null && meanJanLow(place) < filters.minWinterLowC) score -= 14;
  if (filters.minGrowability != null && place.scores.growability < filters.minGrowability) score -= 12;
  if (filters.maxFireRisk && RISK_VALUE[place.risks.wildfire.level] > RISK_VALUE[filters.maxFireRisk]) score -= 18;
  if (filters.maxOverallRisk && avgRisk(place) > RISK_VALUE[filters.maxOverallRisk]) score -= 14;
  score = Math.round(clamp100(score));

  const reasons: string[] = [];
  const cautions: string[] = [];
  const badges: string[] = [];
  const summer = meanSummerHigh(place);
  const winter = meanJanLow(place);
  const annualRange = summer - winter;
  const comfortMonths = annualComfortMonthCount(place);
  const atmosphere = atmosphericComfortScore(place);
  const windEase = windExposureScore(place);
  const humidityEase = mugginessScore(place);
  const sunEase = sunshineScore(place);
  const feel = scorePlaceFeel(place);

  if (presets.length) {
    for (const id of presets
      .map(id => ({ id, s: presetScore(place, id) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)) {
      if (id.s >= 68) pushUnique(reasons, `${LIVE_FIT_PRESET_BY_ID[id.id].label} match (${Math.round(id.s)}/100).`, 3);
    }
    badges.push(...presets.slice(0, 3).map(id => LIVE_FIT_PRESET_BY_ID[id].shortLabel));
  }

  if (summer <= 23) pushUnique(reasons, "Summer afternoons stay comparatively cool for the atlas.", 3);
  if (winter >= -2) pushUnique(reasons, "Winter lows are relatively easy compared with colder inland basins.", 3);
  if (atmosphere >= 74) pushUnique(reasons, "Sun, humidity, wind, and smoke signals read easy for daily outdoor time.", 3);
  if (place.scores.growability >= 72) pushUnique(reasons, "Growability is strong enough for serious garden or orchard scouting.", 3);
  if (comfortMonths >= 8) pushUnique(reasons, `${comfortMonths} months clear the easy-living comfort screen.`, 3);
  if (feel.score >= 74) pushUnique(reasons, `Place feel is ${feel.band.toLowerCase()}: ${feel.strengths[0]}`, 3);
  if (place.scores.microclimateUniqueness >= 78) pushUnique(reasons, "The terrain signal is distinctive, not generic regional weather.", 3);
  if (place.settlementsWithinZone?.length) pushUnique(reasons, "Nearby settlement anchors make the climate easier to picture on the ground.", 3);
  if (reasons.length === 0) pushUnique(reasons, "Balanced climate, risk, and terrain scores make it worth a closer look.", 3);

  if (place.scores.tradeoff >= 65) pushUnique(cautions, "Tradeoffs are substantial; read the risk and fit sections before shortlisting.", 3);
  if (RISK_VALUE[place.risks.wildfire.level] >= 3) pushUnique(cautions, `Wildfire risk is ${place.risks.wildfire.level}.`, 3);
  if (RISK_VALUE[place.risks.smoke.level] >= 3) pushUnique(cautions, `Smoke risk is ${place.risks.smoke.level}.`, 3);
  if (RISK_VALUE[place.risks.coastal.level] >= 3) pushUnique(cautions, `Coastal exposure is ${place.risks.coastal.level}.`, 3);
  if (winter < -12) pushUnique(cautions, "Winter cold is a real lifestyle filter.", 3);
  if (summer > 31) pushUnique(cautions, "Peak summer heat will matter for daily routines.", 3);
  if (atmosphere < 48) pushUnique(cautions, "Atmospheric comfort is the main drag: sky, wind, humidity, smoke, or solar load reduce the lived feel.", 3);
  if (windEase < 55) pushUnique(cautions, `Wind exposure is a real comfort filter (${Math.round(windEase)}/100).`, 3);
  if (humidityEase < 55) pushUnique(cautions, `Humidity or arid-air strain pulls down the comfort read (${Math.round(humidityEase)}/100).`, 3);
  if (comfortMonths <= 4) pushUnique(cautions, `Only ${comfortMonths} months clear the easy-living comfort screen.`, 3);
  if (annualRange > 36) pushUnique(cautions, "Annual temperature range is large; expect harder seasonal swings.", 3);
  if (feel.score < 58) {
    const drag = dominantPlaceFeelDrag(place);
    pushUnique(cautions, `Place feel is ${feel.band.toLowerCase()}; verify ${drag.label.toLowerCase()} before shortlisting.`, 3);
  }

  // Lived-friction cautions — surface curated affordability, social-fabric and
  // access drags so a climatically perfect coast cannot bury its lived reality.
  const lived = place.liveSignals;
  const livedCoverage = livedRealityCoverage(place);
  if (lived) {
    const dom = dominantLivedFriction(place);
    if (lived.costPressure != null && lived.costPressure >= 70) {
      pushUnique(cautions, `Affordability is a real filter — cost pressure ${Math.round(lived.costPressure)}/100${lived.note && dom?.axis === "cost" ? ` (${lived.note})` : ""}.`, 3);
    }
    if (lived.socialStress != null && lived.socialStress >= 55) {
      pushUnique(cautions, `Resident reports describe social-fabric stress — graded ${Math.round(lived.socialStress)}/100${lived.note && dom?.axis === "social" ? ` (${lived.note})` : ""}.`, 3);
    }
    if (lived.accessFriction != null && lived.accessFriction >= 60) {
      pushUnique(cautions, `Daily-services access is limited — friction ${Math.round(lived.accessFriction)}/100${lived.note && dom?.axis === "access" ? ` (${lived.note})` : ""}.`, 3);
    }
    if ((lived.costPressure ?? 100) <= 35 && (lived.socialStress ?? 100) <= 35 && (lived.accessFriction ?? 100) <= 40) {
      pushUnique(reasons, "Lived signals are easy: cost, social fabric, and daily-services access all read benign.", 3);
    }
    if (livedCoverage.confidence === "partial") {
      pushPinnedUnique(cautions, "Lived-reality coverage is partial; verify housing, services, safety, and insurance before shortlisting.", 3);
    }
  } else {
    pushPinnedUnique(cautions, "Lived-reality signals are not source-backed yet; verify housing, services, safety, and insurance before shortlisting.", 3);
  }

  // Marine-fog / low-sunshine caution
  const diurnal = place.climate.diurnalSummerC ?? (place.climate.tempHighC[6] - place.climate.tempLowC[6]);
  if (place.climate.humidity) {
    const hum = place.climate.humidity;
    const summerHum = (hum[4] + hum[5] + hum[6] + hum[7]) / 4;
    const annualHum = hum.reduce((a, b) => a + b, 0) / 12;
    if (summerHum > 72 && diurnal < 12) {
      pushUnique(cautions, "Summer marine layer likely (\"June Gloom\" pattern) — temperatures feel colder and greyer than they appear on paper.", 3);
    } else if (annualHum > 76 && diurnal < 12) {
      pushUnique(cautions, "Persistent overcast or fog — mild temperatures can feel colder and greyer than the numbers suggest.", 3);
    }
  }
  if (place.climate.sunshinePct) {
    const annualSun = place.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12;
    // US average is ~58%; below 48% (Eureka's level) is a clear quality-of-life drag per research
    if (annualSun < 48) pushUnique(cautions, `Below-average sunshine (~${Math.round(annualSun)}% of possible; US avg 58%) — expect frequent overcast days.`, 3);
    else if (annualSun < 55) pushUnique(cautions, `Sunshine is below the US average of 58% (~${Math.round(annualSun)}%) — overcast days are common.`, 3);
  }

  if (sunEase < 40) pushUnique(cautions, `Sunlight and fog score poorly (${Math.round(sunEase)}/100), so mild temperatures may still feel gloomy.`, 3);

  if (place.scores.resilience >= 72) badges.push("Resilient");
  if (place.scores.hiddenGem >= 78) badges.push("Hidden");
  if (place.scores.comfort >= 72) badges.push("Comfort");
  if (comfortMonths >= 8) badges.push("Long season");
  if (feel.score >= 74) badges.push("Good feel");
  if (place.confidence === "high") badges.push("High confidence");

  return { score, reasons, cautions, badges: [...new Set(badges)].slice(0, 5) };
}

export function assessLiveFit(place: Place, filters: LiveFitFilters = {}): LiveFitAssessment {
  return cloneLiveFitAssessment(getCachedLiveFitAssessment(place, filters));
}

export function rankLiveFit(pool: Place[], filters: LiveFitFilters = {}) {
  return pool
    .map(place => {
      const fit = getCachedLiveFitAssessment(place, filters);
      return {
        place,
        score: fit.score,
        note: `${fit.score}/100 live-here fit · ${fit.reasons[0] ?? "Balanced scouting signal."}`,
      };
    })
    .sort((a, b) =>
      b.score - a.score ||
      a.place.name.localeCompare(b.place.name) ||
      a.place.id.localeCompare(b.place.id),
    );
}

export function liveFitFilterPass(place: Place, filters: LiveFitFilters = {}): boolean {
  if (!liveFitPresetsPoolPass(place, filters.fitPresets)) return false;
  if (filters.maxSummerHighC != null && meanSummerHigh(place) > filters.maxSummerHighC) return false;
  if (filters.minWinterLowC != null && meanJanLow(place) < filters.minWinterLowC) return false;
  if (filters.minGrowability != null && place.scores.growability < filters.minGrowability) return false;
  if (filters.maxFireRisk && RISK_VALUE[place.risks.wildfire.level] > RISK_VALUE[filters.maxFireRisk]) return false;
  if (filters.maxOverallRisk && avgRisk(place) > RISK_VALUE[filters.maxOverallRisk]) return false;
  return true;
}
