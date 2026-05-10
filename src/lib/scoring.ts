// ============================================================
// Terraclima — Scoring & Ranking Logic
// ============================================================

import type { Place, MicroclimateArchetype, RiskLevel } from "../types";
import { PLACES, PLACE_SEARCH_INDEX, foldDiacritics } from "../data/places";
import { buildGeospatialAnalysis } from "./geospatial-analysis";
import { CORPUS_MEAN_HUMIDITY } from "./atlas-corpus-stats";
import {
  RISK_VALUE,
  avgRisk,
  meanSummerHigh,
  meanJanLow,
  getAnnualPrecipMm,
} from "./climate-metrics";
import { assessLiveFit, liveFitFilterPass, type LiveFitPresetId } from "./live-fit";

// Re-exported so the public surface of scoring.ts stays unchanged for callers
// (components, charts, tests) that previously imported these from here.
export { RISK_VALUE, avgRisk, meanSummerHigh, meanJanLow, getAnnualPrecipMm };

/**
 * Transparent weights for the hero "livability lens". Exposed so the UI can
 * surface them and so a skeptical reader can sanity-check the formula.
 */
export const LIVABILITY_WEIGHTS = {
  resilience: 0.34,
  winterEase: 0.22,
  summerEase: 0.18,
  hazardEase: 0.14,
  growability: 0.12,
} as const;

/** Penalty scales used by the hero ranking. Calibrated against the corpus. */
export const LIVABILITY_PENALTIES = {
  /** Each °C below 0 in mean Jan low subtracts this many points from winterEase. */
  winterPerDegC: 4.5,
  /** Threshold above which summerEase starts dropping (mean Jun–Aug high, °C). */
  summerComfortHighC: 26,
  /** Each °C above the threshold subtracts this many points. */
  summerPerDegC: 5,
  /** Each unit of avgRisk subtracts this many points from hazardEase. */
  hazardPerRiskUnit: 14,
} as const;

export type RankingProfile =
  | "live-fit"
  | "coolest-summers"
  | "mildest-winters"
  | "best-shoulder-seasons"
  | "driest-air"
  | "best-growability"
  | "hidden-gems"
  | "most-unique"
  | "lowest-fire-risk"
  | "climate-resilient"
  | "best-four-season"
  | "best-diurnal-sleep"
  | "strongest-geospatial-signal"
  | "mediterranean-like"
  | "wet-forest-refuges"
  | "monsoon-drama";

export interface RankingResult { place: Place; score: number; note?: string }

/**
 * Fixed “livability lens” for the hero — **not** a hidden-gems or novelty sort.
 * Transparent weights so a skeptical reader can sanity-check the list.
 * Uses only fields already shown elsewhere in the atlas (resilience, risks, temps, growability).
 */
export function rankLivabilityPreview(pool: Place[]): RankingResult[] {
  if (pool.length === 0) return [];
  const w = LIVABILITY_WEIGHTS;
  const pen = LIVABILITY_PENALTIES;
  const scored: RankingResult[] = pool.map(p => {
    const resilience = p.scores.resilience;
    const grow = p.scores.growability;
    const risk = avgRisk(p);
    const jh = meanSummerHigh(p);
    const jl = meanJanLow(p);
    const winterEase = Math.max(0, 100 - Math.max(0, -jl) * pen.winterPerDegC);
    const summerEase = Math.max(0, 100 - Math.max(0, jh - pen.summerComfortHighC) * pen.summerPerDegC);
    const hazardEase = Math.max(0, 100 - risk * pen.hazardPerRiskUnit);
    const s =
      w.resilience * resilience +
      w.winterEase * winterEase +
      w.summerEase * summerEase +
      w.hazardEase * hazardEase +
      w.growability * grow;
    const rounded = Math.round(Math.max(0, Math.min(100, s)));
    return {
      place: p,
      score: rounded,
      note: `Resilience ${resilience} · hazard cushion ${Math.round(hazardEase)}`,
    };
  });
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Tunables for the secondary ranking profiles. Each value here is documented
 * inline so the scoring math stays auditable; constants stay co-located with
 * the function that uses them rather than scattered across magic literals.
 */
export const RANKING_PARAMS = {
  /** "coolest-summers": ideal mean Jun–Aug high (°C); each °C above subtracts 5. */
  coolSummerIdealHighC: 14,
  coolSummerPerDegC: 5,
  /** "mildest-winters": each °C below 0 in mean Jan low subtracts 5. */
  mildWinterPerDegC: 5,
  /** "best-shoulder-seasons": ideal Apr/May + Sep/Oct mean high (°C). */
  shoulderIdealHighC: 20,
  shoulderPerDegC: 6,
  /** "driest-air": comfort threshold (%). Each % above subtracts 2. */
  dryAirComfortPct: 35,
  dryAirPerPct: 2,
  /** "lowest-fire-risk": each step on RISK_VALUE subtracts 18. */
  fireRiskPerStep: 18,
  /** "best-four-season": sweet-spot seasonal range (°C); each °C off subtracts 3. */
  fourSeasonIdealRangeC: 26,
  fourSeasonPerDegC: 3,
  /** "best-diurnal-sleep": baseline diurnal °C; each °C above adds 10. */
  diurnalSleepBaselineC: 6,
  diurnalSleepPerDegC: 10,
  /** "mediterranean-like": warm-summer Csb gets a clean +30; hot-summer Csa gets +20. */
  mediterraneanCsbBonus: 30,
  mediterraneanCsaBonus: 20,
  mediterraneanWinterBudget: 30,
  mediterraneanWinterPerDegC: 4,
  mediterraneanSummerBudget: 30,
  mediterraneanPerMmJulAug: 0.3,
  /** "wet-forest-refuges": annual precip divided by 30 capped at 100. */
  wetForestPrecipDivisor: 30,
  /** "monsoon-drama": JJA / DJF precip ratio multiplied by 18, capped at 100. */
  monsoonRatioMultiplier: 18,
} as const;

export function rankPlaces(profile: RankingProfile, pool: Place[] = PLACES): RankingResult[] {
  const k = RANKING_PARAMS;
  const scored: RankingResult[] = pool.map(p => {
    const summerHigh = meanSummerHigh(p);
    const janLow = meanJanLow(p);
    const annualPrecip = getAnnualPrecipMm(p);
    const diurnal = p.climate.diurnalSummerC ?? (p.climate.tempHighC[6] - p.climate.tempLowC[6]);

    switch (profile) {
      case "live-fit": {
        const fit = assessLiveFit(p);
        return { place: p, score: fit.score, note: `${fit.score}/100 live-here fit · ${fit.reasons[0]}` };
      }
      case "coolest-summers": {
        const s = Math.max(0, 100 - Math.max(0, summerHigh - k.coolSummerIdealHighC) * k.coolSummerPerDegC);
        return { place: p, score: s, note: `Mean summer high ${summerHigh.toFixed(1)}°C` };
      }
      case "mildest-winters": {
        const s = Math.max(0, 100 - Math.max(0, -janLow) * k.mildWinterPerDegC);
        return { place: p, score: s, note: `Mean winter low ${janLow.toFixed(1)}°C` };
      }
      case "best-shoulder-seasons": {
        const shoulder = (p.climate.tempHighC[3] + p.climate.tempHighC[4] + p.climate.tempHighC[8] + p.climate.tempHighC[9]) / 4;
        const s = Math.max(0, 100 - Math.abs(shoulder - k.shoulderIdealHighC) * k.shoulderPerDegC);
        return { place: p, score: s, note: `Spring/fall highs near ${shoulder.toFixed(1)}°C` };
      }
      case "driest-air": {
        const hum = p.climate.humidity
          ? p.climate.humidity.reduce((a, b) => a + b, 0) / 12
          : CORPUS_MEAN_HUMIDITY;
        const s = Math.max(0, 100 - Math.max(0, hum - k.dryAirComfortPct) * k.dryAirPerPct);
        const noteSuffix = p.climate.humidity ? "" : " (atlas mean)";
        return { place: p, score: s, note: `Mean humidity ~${hum.toFixed(0)}%${noteSuffix}` };
      }
      case "best-growability":
        return { place: p, score: p.scores.growability, note: p.growability.hardinessZone };
      case "hidden-gems":
        return { place: p, score: p.scores.hiddenGem, note: `Uniqueness ${p.scores.microclimateUniqueness}` };
      case "most-unique":
        return { place: p, score: p.scores.microclimateUniqueness };
      case "lowest-fire-risk": {
        const fire = RISK_VALUE[p.risks.wildfire.level];
        const s = Math.max(0, 100 - fire * k.fireRiskPerStep);
        return { place: p, score: s, note: p.risks.wildfire.level };
      }
      case "climate-resilient":
        return { place: p, score: p.scores.resilience };
      case "best-four-season": {
        const range = summerHigh - janLow;
        const sweetSpot = Math.abs(range - k.fourSeasonIdealRangeC);
        const s = Math.max(0, 100 - sweetSpot * k.fourSeasonPerDegC);
        return { place: p, score: s, note: `Seasonal range ${range.toFixed(0)}°C` };
      }
      case "best-diurnal-sleep": {
        const s = Math.min(100, Math.max(0, (diurnal - k.diurnalSleepBaselineC) * k.diurnalSleepPerDegC));
        return { place: p, score: s, note: `Summer diurnal swing ${diurnal.toFixed(0)}°C` };
      }
      case "strongest-geospatial-signal": {
        const g = buildGeospatialAnalysis(p);
        return {
          place: p,
          score: g.geospatialSignalScore,
          note: `EO ${g.eoObservabilityScore}/100 · ${g.analysisConfidence} confidence`,
        };
      }
      case "mediterranean-like": {
        // Csb (warm-summer Mediterranean — coastal CA, Pacific NW pockets) is the
        // canonical match; Csa (hot-summer — interior valleys) gets a smaller bonus.
        const koppen = p.koppen;
        const bonus = koppen.startsWith("Csb")
          ? k.mediterraneanCsbBonus
          : koppen.startsWith("Csa")
            ? k.mediterraneanCsaBonus
            : 0;
        const wint = Math.max(0, k.mediterraneanWinterBudget - Math.max(0, -janLow) * k.mediterraneanWinterPerDegC);
        const dry = Math.max(0, k.mediterraneanSummerBudget - (p.climate.precipMm[6] + p.climate.precipMm[7]) * k.mediterraneanPerMmJulAug);
        return { place: p, score: bonus + wint + dry };
      }
      case "wet-forest-refuges": {
        const s = Math.min(100, annualPrecip / k.wetForestPrecipDivisor);
        return { place: p, score: s, note: `${annualPrecip.toFixed(0)} mm / yr` };
      }
      case "monsoon-drama": {
        const monsoon = p.climate.precipMm[6] + p.climate.precipMm[7] + p.climate.precipMm[8];
        const winter = p.climate.precipMm[11] + p.climate.precipMm[0] + p.climate.precipMm[1];
        const ratio = monsoon / Math.max(1, winter);
        const s = Math.min(100, ratio * k.monsoonRatioMultiplier);
        return { place: p, score: s, note: `${monsoon.toFixed(0)} mm in JJA vs ${winter.toFixed(0)} DJF` };
      }
    }
  });

  return scored.sort((a, b) => b.score - a.score);
}

// Filters
export interface FilterState {
  countries: Set<string>;
  archetypes: Set<MicroclimateArchetype>;
  fitPresets?: Set<LiveFitPresetId>;
  minElevation?: number;
  maxElevation?: number;
  maxSummerHighC?: number;
  minWinterLowC?: number;
  maxFireRisk?: RiskLevel;
  maxOverallRisk?: RiskLevel;
  minGrowability?: number;
  search?: string;
}

export function applyFilters(places: Place[], f: FilterState): Place[] {
  // Precompute the diacritic-folded query once, not per-place. The search
  // index is built with the same fold so "san jose" matches "San José".
  const q = f.search ? foldDiacritics(f.search.trim()) : "";
  const hasCountries = f.countries.size > 0;
  const hasArchetypes = f.archetypes.size > 0;
  const hasMaxFire = !!f.maxFireRisk;
  const maxFireVal = f.maxFireRisk ? RISK_VALUE[f.maxFireRisk] : 0;

  const out: Place[] = [];
  for (const p of places) {
    if (hasCountries && !f.countries.has(p.country)) continue;
    if (hasArchetypes && !p.archetypes.some(a => f.archetypes.has(a))) continue;
    if (!liveFitFilterPass(p, f)) continue;
    if (f.minElevation !== undefined && p.elevationM < f.minElevation) continue;
    if (f.maxElevation !== undefined && p.elevationM > f.maxElevation) continue;
    if (hasMaxFire && RISK_VALUE[p.risks.wildfire.level] > maxFireVal) continue;
    if (f.minGrowability !== undefined && p.scores.growability < f.minGrowability) continue;
    if (q) {
      const hay = PLACE_SEARCH_INDEX[p.id];
      if (!hay || !hay.includes(q)) continue;
    }
    out.push(p);
  }
  return out;
}
