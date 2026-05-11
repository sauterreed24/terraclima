import type { Place, RiskLevel } from "../types";
import { avgRisk, meanJanLow, meanSummerHigh, RISK_VALUE } from "./climate-metrics";

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

export const LIVE_FIT_SUMMER_CAPS_C = [22, 26] as const;
export const LIVE_FIT_WINTER_FLOORS_C = [-5, 0] as const;
export const LIVE_FIT_GROWABILITY_FLOORS = [65, 75] as const;
export const LIVE_FIT_RISK_CEILINGS = ["low", "moderate", "elevated"] as const satisfies readonly RiskLevel[];

const LIVE_FIT_DEFAULT_WEIGHTS = {
  comfort: 0.22,
  resilience: 0.22,
  uniqueness: 0.17,
  growability: 0.13,
  hazardEase: 0.11,
  hiddenGem: 0.08,
  sunshine: 0.07,   // sunshine/fog-free comfort: rewards open sunny places, penalises fog-belt coasts
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
 * Returns 50 when no data is available (neutral — no penalty/reward).
 * Rewards high sunshine percentage (e.g. Bisbee AZ, Silver City NM at 60–75%+)
 * and penalises persistent marine-layer conditions: high humidity combined with
 * suppressed summer diurnal swing — the signature of NorCal / PNW fog-belt coasts
 * that feel cold and grey despite mild mean temperatures.
 */
function sunshineScore(place: Place): number {
  const sunny = place.climate.sunshinePct;
  const hum = place.climate.humidity;
  const diurnal = place.climate.diurnalSummerC ?? (place.climate.tempHighC[6] - place.climate.tempLowC[6]);

  if (!sunny && !hum) return 50; // no data — neutral

  let score = 55; // slight positive baseline

  if (sunny) {
    const annualSun = sunny.reduce((a, b) => a + b, 0) / 12;
    // 0% = 0 pts, 60% = 50 pts, 80% = 75 pts, 100% = 100 pts
    score = clamp100(annualSun * 1.2);
  }

  // Marine-layer fog penalty: high mean humidity + suppressed diurnal swing
  // Even if mean temp is mild, persistent fog & cold feel are a real quality-of-life drag
  if (hum) {
    const annualHum = hum.reduce((a, b) => a + b, 0) / 12;
    if (annualHum > 70 && diurnal < 12) {
      const fogPenalty = Math.min(20, (annualHum - 70) * 0.4 + Math.max(0, 12 - diurnal) * 0.6);
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
    place.scores.comfort * w.comfort +
    place.scores.resilience * w.resilience +
    place.scores.microclimateUniqueness * w.uniqueness +
    place.scores.growability * w.growability +
    hazardEase * w.hazardEase +
    place.scores.hiddenGem * w.hiddenGem +
    sunshineScore(place) * w.sunshine,
  ));
}

function pushUnique(list: string[], value: string, max: number): void {
  if (list.length >= max || list.includes(value)) return;
  list.push(value);
}

export function assessLiveFit(place: Place, filters: LiveFitFilters = {}): LiveFitAssessment {
  const presets = [...(filters.fitPresets ?? new Set<LiveFitPresetId>())];
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
  if (place.scores.growability >= 72) pushUnique(reasons, "Growability is strong enough for serious garden or orchard scouting.", 3);
  if (place.scores.microclimateUniqueness >= 78) pushUnique(reasons, "The terrain signal is distinctive, not generic regional weather.", 3);
  if (place.settlementsWithinZone?.length) pushUnique(reasons, "Nearby settlement anchors make the climate easier to picture on the ground.", 3);
  if (reasons.length === 0) pushUnique(reasons, "Balanced climate, risk, and terrain scores make it worth a closer look.", 3);

  if (place.scores.tradeoff >= 65) pushUnique(cautions, "Tradeoffs are substantial; read the risk and fit sections before shortlisting.", 2);
  if (RISK_VALUE[place.risks.wildfire.level] >= 3) pushUnique(cautions, `Wildfire risk is ${place.risks.wildfire.level}.`, 2);
  if (RISK_VALUE[place.risks.smoke.level] >= 3) pushUnique(cautions, `Smoke risk is ${place.risks.smoke.level}.`, 2);
  if (RISK_VALUE[place.risks.coastal.level] >= 3) pushUnique(cautions, `Coastal exposure is ${place.risks.coastal.level}.`, 2);
  if (winter < -12) pushUnique(cautions, "Winter cold is a real lifestyle filter.", 2);
  if (summer > 31) pushUnique(cautions, "Peak summer heat will matter for daily routines.", 2);
  if (annualRange > 36) pushUnique(cautions, "Annual temperature range is large; expect harder seasonal swings.", 2);

  // Marine-fog / low-sunshine caution
  const diurnal = place.climate.diurnalSummerC ?? (place.climate.tempHighC[6] - place.climate.tempLowC[6]);
  if (place.climate.humidity) {
    const annualHum = place.climate.humidity.reduce((a, b) => a + b, 0) / 12;
    if (annualHum > 72 && diurnal < 12) {
      pushUnique(cautions, "Persistent marine layer or fog belt likely — mild temperatures can feel colder and greyer than the numbers suggest.", 2);
    }
  }
  if (place.climate.sunshinePct) {
    const annualSun = place.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12;
    if (annualSun < 45) pushUnique(cautions, `Low mean sunshine (~${Math.round(annualSun)}% of possible) — overcast conditions are common.`, 2);
  }

  if (place.scores.resilience >= 72) badges.push("Resilient");
  if (place.scores.hiddenGem >= 78) badges.push("Hidden");
  if (place.scores.comfort >= 72) badges.push("Comfort");
  if (place.confidence === "high") badges.push("High confidence");

  return { score, reasons, cautions, badges: [...new Set(badges)].slice(0, 5) };
}

export function rankLiveFit(pool: Place[], filters: LiveFitFilters = {}) {
  return pool
    .map(place => {
      const fit = assessLiveFit(place, filters);
      return {
        place,
        score: fit.score,
        note: `${fit.score}/100 live-here fit · ${fit.reasons[0] ?? "Balanced scouting signal."}`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function liveFitFilterPass(place: Place, filters: LiveFitFilters = {}): boolean {
  if (filters.maxSummerHighC != null && meanSummerHigh(place) > filters.maxSummerHighC) return false;
  if (filters.minWinterLowC != null && meanJanLow(place) < filters.minWinterLowC) return false;
  if (filters.minGrowability != null && place.scores.growability < filters.minGrowability) return false;
  if (filters.maxFireRisk && RISK_VALUE[place.risks.wildfire.level] > RISK_VALUE[filters.maxFireRisk]) return false;
  if (filters.maxOverallRisk && avgRisk(place) > RISK_VALUE[filters.maxOverallRisk]) return false;
  return true;
}
