// ============================================================
// Terraclima — Scoring & Ranking Logic
// ============================================================

import type { Place, MicroclimateArchetype, RiskLevel } from "../types";
import { PLACES, foldDiacritics, getPlaceSearchText } from "../data/places";
import { buildGeospatialAnalysis } from "./geospatial-analysis";
import { CORPUS_MEAN_HUMIDITY } from "./atlas-corpus-stats";
import {
  RISK_VALUE,
  avgRisk,
  meanSummerHigh,
  meanJanLow,
  getAnnualPrecipMm,
  meanAnnualSunshinePct,
  winterSunshineIsMeasured,
  coolSummer,
} from "./climate-metrics";
import { assessLiveFit, liveFitFilterPass, meanWinterSunshinePct, winterSunshineScore, type LiveFitPresetId } from "./live-fit";
import {
  atmosphericComfortScore,
  describeHumanComfort,
  feltComfortScore,
  humanComfortScore,
  LIVABILITY_BLEND_WEIGHTS,
  livedFrictionScore,
  rankLivabilityWithBreakdown,
  type LivabilityResult,
} from "./livability-score";
import { placeFeelScore } from "./place-feel";
import { computeKoppen, parseAuthoredKoppen } from "./koppen";
import { computeBioclim } from "./bioclim";
import { toFixedClean } from "./units";
import { dewPointC } from "./comfort-precision";

// Re-exported so the public surface of scoring.ts stays unchanged for callers
// (components, charts, tests) that previously imported these from here.
export { RISK_VALUE, avgRisk, meanSummerHigh, meanJanLow, getAnnualPrecipMm };

/**
 * Public weights for the hero "livability lens". Aliased to the v2 blend so
 * the UI and tests have one source of truth. The shape is the v2 5-component
 * one (resilience / thermalComfort / hazardCushion / growability /
 * precipModeration); legacy markup that pulled this in by name now consumes
 * the same constants.
 */
export const LIVABILITY_WEIGHTS = LIVABILITY_BLEND_WEIGHTS;

export type RankingProfile =
  | "live-fit"
  | "most-comfortable"
  | "coolest-summers"
  | "mildest-winters"
  | "sunniest-winters"
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
  | "most-continental"
  | "driest-growing-season"
  | "lowest-evaporative-demand"
  | "mediterranean-like"
  | "wet-forest-refuges"
  | "monsoon-drama"
  | "best-this-month"
  | "best-for-remote-work"
  | "best-retirement";

export interface RankingResult {
  place: Place;
  score: number;
  note?: string;
  /** Raw metric (higher ranks first) that orders places whose score saturates. */
  tiebreak?: number;
}

/**
 * Fixed "livability lens" for the hero — **not** a hidden-gems or novelty sort.
 * Defers the heavy lifting to ./livability-score, which computes a per-place
 * 5-component breakdown (resilience, thermal comfort, hazard cushion,
 * growability, precip moderation), blends it with published weights, and
 * returns drivers/drags. We keep this wrapper so older call sites that only
 * need `{ place, score, note }[]` (`RankingResult`) keep working.
 *
 * The `note` surfaces the top driver from the underlying breakdown so the
 * sorted list reads like a quick rationale rather than a bare integer.
 */
export function rankLivabilityPreview(pool: Place[]): RankingResult[] {
  if (pool.length === 0) return [];
  const detailed = rankLivabilityWithBreakdown(pool);
  return detailed.map(r => ({
    place: r.place,
    score: r.score,
    note: liveabilityNoteFromResult(r),
  }));
}

function liveabilityNoteFromResult(r: LivabilityResult): string {
  const sorted = [...r.components].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const drag = [...r.components].sort((a, b) => a.value - b.value)[0];
  if (!top) return `Livability blend ${r.score}/100`;
  if (drag && drag.value < 55 && drag.key !== top.key) {
    return `${top.label} ${Math.round(top.value)} · ${drag.label} ${Math.round(drag.value)}`;
  }
  return `${top.label} ${Math.round(top.value)}/100`;
}

// Re-export so consumers that already import from scoring.ts can opt into the
// richer per-place breakdown without learning a second module path.
export { rankLivabilityWithBreakdown, scoreLivability, livabilityPercentiles, LIVABILITY_BLEND_WEIGHTS } from "./livability-score";
export type { LivabilityResult, LivabilityComponent } from "./livability-score";

/**
 * Tunables for the secondary ranking profiles. Each value here is documented
 * inline so the scoring math stays auditable; constants stay co-located with
 * the function that uses them rather than scattered across magic literals.
 */
export const RANKING_PARAMS = {
  /** "coolest-summers": ideal mean Jun–Aug high (°C); each °C above subtracts 5. */
  coolSummerIdealHighC: 14,
  coolSummerPerDegC: 5,
  /**
   * "mildest-winters": linear in the mean Dec–Feb low, from 0 at −25°C to 100
   * at 18°C. No plateau: the old rule gave every frost-free winter 100, so 93
   * places tied.
   */
  mildWinterFloorC: -25,
  mildWinterCeilingC: 18,
  /**
   * "best-shoulder-seasons": Apr/May + Sep/Oct mean high against a 20°C ideal
   * (75 points), a dry-month share (10) and the sunshine bonus (−12…+15).
   */
  shoulderIdealHighC: 20,
  shoulderPerDegC: 6,
  shoulderTempWeight: 0.75,
  shoulderDryBudget: 10,
  shoulderDryFreeMm: 60,
  shoulderDryPerMm: 0.1,
  /** "driest-air": linear in mean annual relative humidity, 100 at 20% to 0 at 82.5%. */
  dryAirFloorPct: 20,
  dryAirPerPct: 1.6,
  /** "lowest-fire-risk": each wildfire step subtracts 18, each smoke step 4. */
  fireRiskPerStep: 18,
  fireSmokePerStep: 4,
  /**
   * "best-four-season": a real winter, a warm summer and distinct shoulders.
   * Each term is 100 inside its band and falls off per °C outside it.
   */
  fourSeasonWinterMeanBandC: [-7, 2] as const,
  fourSeasonSummerHighBandC: [24, 30] as const,
  fourSeasonShoulderHighBandC: [11, 22] as const,
  fourSeasonPerDegC: 8,
  /**
   * "best-diurnal-sleep": summer nights in the 10–17°C sleeping band (60%),
   * a day-to-night swing from 8°C (0) to 18°C (100) (40%), less a muggy-night
   * penalty per °C of dew point above 16°C.
   */
  sleepNightBandC: [10, 17] as const,
  sleepNightPerDegC: 7,
  sleepSwingFloorC: 8,
  sleepSwingCeilingC: 18,
  sleepMuggyDewPointC: 16,
  sleepMuggyPerDegC: 4,
  /** "mediterranean-like": class match 34 (Csb) / 24 (Csa), mild winter 33, dry summer after a wet winter 33. */
  mediterraneanCsbBonus: 34,
  mediterraneanCsaBonus: 24,
  mediterraneanWinterBudget: 33,
  mediterraneanWinterPerDegC: 4,
  mediterraneanSummerBudget: 33,
  mediterraneanJulAugDryMm: 100,
  mediterraneanWinterHalfShare: 0.65,
  mediterraneanMinAnnualMm: 300,
  /** "wet-forest-refuges": annual total (70%, full at 3,000 mm) and the driest month (30%, full at 120 mm). */
  wetForestPrecipDivisor: 30,
  wetForestDriestMonthFullMm: 120,
  /**
   * "monsoon-drama": share of the year's rain that falls Jul–Sep (70 points,
   * from an even 25% up to 75%) and its amount (30 points, full at 400 mm).
   */
  monsoonEvenShare: 0.25,
  monsoonFullShare: 0.75,
  monsoonFullMm: 400,
} as const;

function bandScore100(value: number, band: readonly [number, number], perUnit: number): number {
  const miss = value < band[0] ? band[0] - value : value > band[1] ? value - band[1] : 0;
  return Math.max(0, 100 - miss * perUnit);
}

/** Like bandScore100, but leans gently toward the middle of the band so in-band places still order. */
function peakedBandScore100(value: number, band: readonly [number, number], perUnit: number): number {
  const centre = (band[0] + band[1]) / 2;
  if (value >= band[0] && value <= band[1]) return 100 - Math.abs(value - centre) * 1.5;
  const edge = 100 - ((band[1] - band[0]) / 2) * 1.5;
  const miss = value < band[0] ? band[0] - value : value - band[1];
  return Math.max(0, edge - miss * perUnit);
}

function meanOf(values: readonly number[], indices: readonly number[]): number {
  return indices.reduce((sum, i) => sum + values[i]!, 0) / indices.length;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Sunshine comfort bonus (range −12 to +15 pts).
 *
 * Research baseline (PMC12272345, Frontiers Public Health 2025): sunshine is
 * the most underweighted factor in commercial ranking indices relative to its
 * actual wellbeing impact. 58% possible sunshine = US national average.
 * Bisbee AZ / Silver City NM (~80%, 285-295 sunny days) should score well above
 * fog-belt coasts (Eureka CA ~48%, Half Moon Bay ~55-60%) that share mild mean
 * temperatures but rarely reach the 70-80°F comfort band and have suppressed
 * diurnal swings that prevent quality sleep cooling.
 */
function sunshineComfortBonus(p: Place): number {
  const annualSun = meanAnnualSunshinePct(p);
  const hum = p.climate.humidity;
  const diurnal = p.climate.diurnalSummerC ?? (p.climate.tempHighC[6] - p.climate.tempLowC[6]);

  let bonus = 0;

  // Direct sunshine reward: nothing below 45% of possible, +0.33 per point
  // above it (58% ≈ +4, 80% ≈ +11.5), capped at +15. This term went silent
  // for every place when Daymet solar replaced authored sunshine; it now
  // reads the clearness-based estimate.
  if (annualSun != null) {
    bonus += Math.min(15, Math.max(0, (annualSun - 45) * 0.33));
  }

  // Summer marine-layer penalty: check May–Aug (indices 4–7) specifically.
  // Summer gray is more damaging than winter gray — it violates seasonal expectations
  // and eliminates the serotonin/circadian benefit people rely on in peak activity season.
  // Fog coasts keep summer afternoons cool; humid, hot summers (the Gulf) are not fog.
  if (hum && coolSummer(p)) {
    const summerHum = hum.length >= 8
      ? (hum[4] + hum[5] + hum[6] + hum[7]) / 4
      : hum.reduce((a, b) => a + b, 0) / 12;
    if (summerHum > 72 && diurnal < 12) {
      bonus -= Math.min(12, (summerHum - 72) * 0.5 + Math.max(0, (12 - diurnal)) * 0.4);
    }
  }

  return bonus;
}

export function rankPlaces(profile: RankingProfile, pool: Place[] = PLACES, now: Date = new Date()): RankingResult[] {
  const k = RANKING_PARAMS;
  const scored: RankingResult[] = pool.map(p => {
    const summerHigh = meanSummerHigh(p);
    const janLow = meanJanLow(p);
    const annualPrecip = getAnnualPrecipMm(p);
    const diurnal = p.climate.diurnalSummerC ?? (p.climate.tempHighC[6] - p.climate.tempLowC[6]);

    switch (profile) {
      case "live-fit": {
        // Production Explorer uses `rankLiveFit(filtered, filters)` via climate-processor.
        // This branch is a filter-less fallback for generic `rankPlaces("live-fit")` callers
        // (scripts / goldens). Prefer `rankLiveFit` when Live Finder constraints matter.
        const fit = assessLiveFit(p);
        return { place: p, score: fit.score, note: `${fit.score}/100 live-here fit · ${fit.reasons[0]}` };
      }
      case "most-comfortable": {
        const s = humanComfortScore(p);
        const comfort = describeHumanComfort(p);
        return {
          place: p,
          score: s,
          note: `${comfort.headline} | felt ${Math.round(feltComfortScore(p))}/100 | atmosphere ${Math.round(atmosphericComfortScore(p))}/100`,
        };
      }
      case "coolest-summers": {
        const s = Math.max(0, 100 - Math.max(0, summerHigh - k.coolSummerIdealHighC) * k.coolSummerPerDegC);
        return { place: p, score: s, note: `Mean summer high ${toFixedClean(summerHigh, 1)}°C`, tiebreak: -summerHigh };
      }
      case "mildest-winters": {
        const s = 100 * clamp01((janLow - k.mildWinterFloorC) / (k.mildWinterCeilingC - k.mildWinterFloorC));
        return { place: p, score: s, note: `Mean winter low ${toFixedClean(janLow, 1)}°C`, tiebreak: janLow };
      }
      case "sunniest-winters": {
        const winterSun = meanWinterSunshinePct(p);
        if (winterSun == null) return { place: p, score: 0, note: "Winter sunshine unavailable" };
        const s = winterSunshineScore(p);
        const basis = winterSunshineIsMeasured(p) ? "station record" : "estimated from solar energy";
        return { place: p, score: s, note: `Winter sunshine ~${Math.round(winterSun)}% of possible (${basis})`, tiebreak: winterSun };
      }
      case "best-shoulder-seasons": {
        const shoulder = (p.climate.tempHighC[3] + p.climate.tempHighC[4] + p.climate.tempHighC[8] + p.climate.tempHighC[9]) / 4;
        const base = Math.max(0, 100 - Math.abs(shoulder - k.shoulderIdealHighC) * k.shoulderPerDegC);
        const shoulderRain = meanOf(p.climate.precipMm, [3, 4, 8, 9]);
        const dry = Math.max(0, k.shoulderDryBudget - Math.max(0, shoulderRain - k.shoulderDryFreeMm) * k.shoulderDryPerMm);
        const sunBonus = sunshineComfortBonus(p);
        const s = Math.max(0, Math.min(100, base * k.shoulderTempWeight + dry + sunBonus));
        return { place: p, score: s, note: `Spring/fall highs near ${toFixedClean(shoulder, 1)}°C · ${shoulderRain.toFixed(0)} mm of rain a month`, tiebreak: -Math.abs(shoulder - k.shoulderIdealHighC) };
      }
      case "driest-air": {
        const hum = p.climate.humidity
          ? p.climate.humidity.reduce((a, b) => a + b, 0) / 12
          : CORPUS_MEAN_HUMIDITY;
        const s = Math.max(0, Math.min(100, 100 - (hum - k.dryAirFloorPct) * k.dryAirPerPct));
        const noteSuffix = p.climate.humidity ? "" : " (atlas mean)";
        return { place: p, score: s, note: `Mean humidity ~${hum.toFixed(0)}%${noteSuffix}`, tiebreak: -hum };
      }
      case "best-growability":
        return { place: p, score: p.scores.growability, note: p.growability.hardinessZone };
      case "hidden-gems":
        return { place: p, score: p.scores.hiddenGem, note: `Uniqueness ${p.scores.microclimateUniqueness}` };
      case "most-unique":
        return { place: p, score: p.scores.microclimateUniqueness };
      case "lowest-fire-risk": {
        const fire = RISK_VALUE[p.risks.wildfire.level];
        const smoke = RISK_VALUE[p.risks.smoke.level];
        const s = Math.max(0, 100 - fire * k.fireRiskPerStep - smoke * k.fireSmokePerStep);
        // Equal risk grades are ordered by warm-season rain: a wetter May–Sep
        // leaves less cured fuel.
        const warmSeasonRain = [4, 5, 6, 7, 8].reduce((sum, i) => sum + p.climate.precipMm[i]!, 0);
        return { place: p, score: s, note: `Wildfire ${p.risks.wildfire.level} · smoke ${p.risks.smoke.level}`, tiebreak: warmSeasonRain };
      }
      case "climate-resilient":
        return { place: p, score: p.scores.resilience };
      case "best-four-season": {
        // Four seasons means each one shows up: a winter that freezes without
        // being brutal, a warm summer, and a spring and autumn that sit between
        // them. The old rule scored only the summer-to-winter range, which put
        // the Gulf coast (Apalachicola, Ocean Springs) at the top.
        const winterMean = (meanOf(p.climate.tempHighC, [11, 0, 1]) + janLow) / 2;
        const spring = meanOf(p.climate.tempHighC, [2, 3, 4]);
        const autumn = meanOf(p.climate.tempHighC, [8, 9, 10]);
        const winter = peakedBandScore100(winterMean, k.fourSeasonWinterMeanBandC, k.fourSeasonPerDegC);
        const summer = peakedBandScore100(summerHigh, k.fourSeasonSummerHighBandC, k.fourSeasonPerDegC);
        const shoulders = (peakedBandScore100(spring, k.fourSeasonShoulderHighBandC, k.fourSeasonPerDegC)
          + peakedBandScore100(autumn, k.fourSeasonShoulderHighBandC, k.fourSeasonPerDegC)) / 2;
        // The weakest season holds the score back: three good seasons and no
        // winter is not four seasons.
        const blend = 0.35 * winter + 0.3 * summer + 0.35 * shoulders;
        const s = blend * (0.5 + 0.5 * (Math.min(winter, summer, shoulders) / 100));
        return { place: p, score: s, note: `Winter days average ${toFixedClean(winterMean)}°C · summer highs ${toFixedClean(summerHigh)}°C` };
      }
      case "best-diurnal-sleep": {
        // Sleep needs a cool bedroom, and a dry one: summer nights in the
        // 10–17°C band, a real drop from the afternoon, and no muggy air. The
        // old rule scored the swing alone and tied 46 places at 100.
        const summerNight = meanOf(p.climate.tempLowC, [5, 6, 7]);
        const night = bandScore100(summerNight, k.sleepNightBandC, k.sleepNightPerDegC);
        const swing = 100 * clamp01((diurnal - k.sleepSwingFloorC) / (k.sleepSwingCeilingC - k.sleepSwingFloorC));
        const hum = p.climate.humidity;
        const nightDew = hum
          ? dewPointC((meanOf(p.climate.tempHighC, [5, 6, 7]) + summerNight) / 2, meanOf(hum, [5, 6, 7]))
          : null;
        const muggy = nightDew == null ? 0 : Math.max(0, nightDew - k.sleepMuggyDewPointC) * k.sleepMuggyPerDegC;
        const s = Math.max(0, Math.min(100, 0.6 * night + 0.4 * swing - muggy));
        return { place: p, score: s, note: `Summer nights near ${toFixedClean(summerNight)}°C; summer diurnal swing ${diurnal.toFixed(0)}°C`, tiebreak: diurnal };
      }
      case "strongest-geospatial-signal": {
        const g = buildGeospatialAnalysis(p);
        return {
          place: p,
          score: g.geospatialSignalScore,
          note: `EO ${g.eoObservabilityScore}/100 · ${g.analysisConfidence} confidence`,
        };
      }
      case "most-continental": {
        const bio = computeBioclim(p);
        if (!bio || bio.conrad.value == null) return { place: p, score: 0, note: "Bioclim unavailable" };
        return { place: p, score: Math.max(0, bio.conrad.value), note: `Conrad K ${bio.conrad.value.toFixed(1)} · ${bio.conrad.classLabel}` };
      }
      case "driest-growing-season": {
        const bio = computeBioclim(p);
        if (!bio) return { place: p, score: 0, note: "Bioclim unavailable" };
        if (bio.selianinov.value == null) {
          return { place: p, score: 0, note: "No growing season; Selianinov HTC undefined." };
        }
        const s = Math.max(0, 100 - bio.selianinov.value * 40);
        return { place: p, score: s, note: `Selianinov HTC ${bio.selianinov.value.toFixed(2)} · ${bio.selianinov.classLabel}` };
      }
      case "lowest-evaporative-demand": {
        const bio = computeBioclim(p);
        if (!bio) return { place: p, score: 0, note: "Bioclim unavailable" };
        const pet = bio.thornthwaitePet.value;
        const s = Math.max(0, 100 - pet / 20);
        return { place: p, score: s, note: `Thornthwaite PET ${Math.round(pet)} mm/yr` };
      }
      case "mediterranean-like": {
        // Csb (warm-summer Mediterranean — coastal CA, Pacific NW pockets) is the
        // canonical match; Csa (hot-summer — interior valleys) gets a smaller bonus.
        // Match on the class computed from the normals OR any authored zone, so a
        // multi-zone label like "BSk (valley) / Csb analog (summit)" is not missed
        // by a brittle string prefix.
        const computedCode = computeKoppen(p)?.code;
        const zones = parseAuthoredKoppen(p.koppen);
        const isCsb = computedCode === "Csb" || zones.includes("Csb");
        const isCsa = computedCode === "Csa" || zones.includes("Csa");
        const bonus = isCsb
          ? k.mediterraneanCsbBonus
          : isCsa
            ? k.mediterraneanCsaBonus
            : 0;
        const wint = Math.max(0, k.mediterraneanWinterBudget - Math.max(0, -janLow) * k.mediterraneanWinterPerDegC);
        // A Mediterranean year is a dry summer after a wet winter. Dry summers
        // alone also describe deserts, so the term needs most of the year's
        // rain to fall Oct–Mar and enough rain for it to matter.
        const julAug = p.climate.precipMm[6] + p.climate.precipMm[7];
        const winterHalf = [9, 10, 11, 0, 1, 2].reduce((sum, i) => sum + p.climate.precipMm[i]!, 0);
        const winterShare = annualPrecip > 0 ? winterHalf / annualPrecip : 0;
        const dry = k.mediterraneanSummerBudget
          * clamp01(1 - julAug / k.mediterraneanJulAugDryMm)
          * clamp01(winterShare / k.mediterraneanWinterHalfShare)
          * clamp01(annualPrecip / k.mediterraneanMinAnnualMm);
        return {
          place: p,
          score: bonus + wint + dry,
          note: `${Math.round(winterShare * 100)}% of the year's rain falls Oct–Mar · ${julAug.toFixed(0)} mm in Jul–Aug`,
          tiebreak: -julAug,
        };
      }
      case "wet-forest-refuges": {
        // A forest refuge is wet all year, not just in total: a dry month
        // stresses the canopy however much falls in winter.
        const driest = Math.min(...p.climate.precipMm);
        const s = 0.7 * Math.min(100, annualPrecip / k.wetForestPrecipDivisor)
          + 0.3 * Math.min(100, (driest / k.wetForestDriestMonthFullMm) * 100);
        return { place: p, score: s, note: `${annualPrecip.toFixed(0)} mm of rain a year · driest month ${driest.toFixed(0)} mm`, tiebreak: annualPrecip };
      }
      case "monsoon-drama": {
        const monsoon = p.climate.precipMm[6] + p.climate.precipMm[7] + p.climate.precipMm[8];
        const winter = p.climate.precipMm[11] + p.climate.precipMm[0] + p.climate.precipMm[1];
        const ratio = monsoon / Math.max(1, winter);
        // Drama is a summer that carries the year: its share of the annual
        // total, and enough rain to be felt. The old ratio to winter rain hit
        // its cap for 43 places, so a dry winter alone was enough to tie first.
        const share = annualPrecip > 0 ? monsoon / annualPrecip : 0;
        const s = 70 * clamp01((share - k.monsoonEvenShare) / (k.monsoonFullShare - k.monsoonEvenShare))
          + 30 * clamp01(monsoon / k.monsoonFullMm);
        return { place: p, score: s, note: `${monsoon.toFixed(0)} mm in Jul–Sep vs ${winter.toFixed(0)} mm in Dec–Feb`, tiebreak: ratio };
      }
      case "best-this-month": {
        const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
        const mi = now.getMonth();
        const monthHigh = p.climate.tempHighC[mi];
        const monthLow = p.climate.tempLowC[mi];
        const monthPrecip = p.climate.precipMm[mi];
        const monthSnow = p.climate.snowCm?.[mi] ?? 0;
        // Research: comfort band is 18–28°C (64–82°F) highs; nights 13–19°C (55–67°F) for sleep
        // Penalty above/below band; reward for nights in sleep-ideal zone
        const highScore = monthHigh >= 18 && monthHigh <= 28
          ? 45
          : Math.max(0, 45 - Math.min(Math.abs(monthHigh - 18), Math.abs(monthHigh - 28)) * 3.5);
        const nightScore = monthLow >= 13 && monthLow <= 19 ? 18 : Math.max(0, 18 - Math.min(Math.abs(monthLow - 13), Math.abs(monthLow - 19)) * 2.5);
        const precipScore = Math.max(0, 22 - Math.max(0, monthPrecip - 55) * 0.16);
        const snowScore = Math.max(0, 15 - Math.min(15, monthSnow * 0.5));
        const s = Math.min(100, highScore + nightScore + precipScore + snowScore);
        return { place: p, score: s, note: `${MONTH_NAMES[mi]}: ${toFixedClean(monthHigh)}°C day · ${toFixedClean(monthLow)}°C night · ${monthPrecip.toFixed(0)} mm` };
      }
      case "best-for-remote-work": {
        // Cool productive summers + mild winters + low fire + low smoke +
        // reliable daily-services access. A remote worker needs broadband,
        // dependable air travel for client meetings, and same-day specialty
        // services; ferry-only Pacific outposts that score 16°C summers cannot
        // run a calendar around weather closures, so we apply both a generic
        // lived-comfort bonus and an explicit access-friction deduction.
        const coolSummer = Math.max(0, 28 - Math.max(0, summerHigh - 22) * 2.8);
        const mildWinter = Math.max(0, 18 - Math.max(0, -(janLow + 4)) * 2.2);
        const fireScore = Math.max(0, 16 - RISK_VALUE[p.risks.wildfire.level] * 5);
        const smokeScore = Math.max(0, 12 - RISK_VALUE[p.risks.smoke.level] * 4);
        const sunBonus = sunshineComfortBonus(p);
        const livedBonus = (livedFrictionScore(p) - 50) * 0.22;
        const feelBonus = (placeFeelScore(p) - 60) * 0.18;
        const access = p.liveSignals?.accessFriction;
        const accessPenalty = access != null ? Math.max(0, (access - 40)) * 0.32 : 0;
        const s = Math.max(0, Math.min(100, coolSummer + mildWinter + fireScore + smokeScore + sunBonus + livedBonus + feelBonus - accessPenalty));
        return { place: p, score: s, note: `${summerHigh.toFixed(0)}°C summers · fire ${p.risks.wildfire.level} · smoke ${p.risks.smoke.level}` };
      }
      case "best-retirement": {
        // Mild all-year, low aggregate risk, good growability, and a livable
        // housing pressure / access remoteness (retirees are highly sensitive to
        // specialty-care distance and hospital/airport route times).
        const winterScore = Math.max(0, 24 - Math.max(0, -(janLow + 1)) * 3.8);
        const summerScore = Math.max(0, 20 - Math.max(0, summerHigh - 28) * 2.5);
        const riskScore = Math.max(0, 18 - avgRisk(p) * 5.2);
        const growScore = p.scores.growability * 0.16;
        const sunBonus = sunshineComfortBonus(p);
        const livedBonus = (livedFrictionScore(p) - 50) * 0.28;
        const feelBonus = (placeFeelScore(p) - 60) * 0.20;
        // Retirees specifically dislike high cost pressure and high access friction.
        const cost = p.liveSignals?.costPressure;
        const access = p.liveSignals?.accessFriction;
        const costPenalty = cost != null ? Math.max(0, (cost - 50)) * 0.18 : 0;
        const accessPenalty = access != null ? Math.max(0, (access - 45)) * 0.24 : 0;
        const s = Math.max(0, Math.min(100, winterScore + summerScore + riskScore + growScore + sunBonus + livedBonus + feelBonus - costPenalty - accessPenalty));
        return { place: p, score: s, note: `Mild all-year · grow ${p.scores.growability}/100 · avg risk ${avgRisk(p).toFixed(1)}` };
      }
    }
  });

  // Name + id tiebreakers give a total order so tied scores (including
  // same-name corpus pairs like the two Durango entries, and score-0 clusters
  // for profiles that lack optional climate fields) rank identically
  // regardless of corpus insertion order — matching live-fit / livability.
  return scored.sort((a, b) =>
    b.score - a.score ||
    (b.tiebreak ?? 0) - (a.tiebreak ?? 0) ||
    a.place.name.localeCompare(b.place.name) ||
    a.place.id.localeCompare(b.place.id),
  );
}

// Filters
export interface FilterState {
  countries: Set<string>;
  archetypes: Set<MicroclimateArchetype>;
  fitPresets?: Set<LiveFitPresetId>;
  maxSummerHighC?: number;
  minWinterLowC?: number;
  maxFireRisk?: RiskLevel;
  maxOverallRisk?: RiskLevel;
  minGrowability?: number;
  search?: string;
}

/** Canonical empty filter state — omits optional constraint fields so clears cannot leave stale limits. */
export function createEmptyFilterState(): FilterState {
  return {
    countries: new Set(),
    archetypes: new Set(),
    fitPresets: new Set(),
    search: "",
  };
}

/** URL-validated explorer filter fields — shared by first paint and popstate hydration. */
export interface ValidatedFilterInput {
  countries: readonly string[];
  archetypes: readonly MicroclimateArchetype[];
  fitPresets: readonly LiveFitPresetId[];
  search: string;
  maxSummerHighC?: number | null;
  minWinterLowC?: number | null;
  minGrowability?: number | null;
  maxFireRisk?: RiskLevel | null;
  maxOverallRisk?: RiskLevel | null;
}

/** Serialize a live `FilterState` back to the validated array shape (worker transport). */
export function toValidatedFilterInput(f: FilterState): ValidatedFilterInput {
  return {
    countries: [...f.countries],
    archetypes: [...f.archetypes],
    fitPresets: [...(f.fitPresets ?? [])],
    search: f.search ?? "",
    maxSummerHighC: f.maxSummerHighC ?? null,
    minWinterLowC: f.minWinterLowC ?? null,
    minGrowability: f.minGrowability ?? null,
    maxFireRisk: f.maxFireRisk ?? null,
    maxOverallRisk: f.maxOverallRisk ?? null,
  };
}

/** Build explorer filter state from validated URL/search fields without stale optional keys. */
export function filterStateFromValidated(v: ValidatedFilterInput): FilterState {
  const state: FilterState = {
    countries: new Set(v.countries),
    archetypes: new Set(v.archetypes),
    fitPresets: new Set(v.fitPresets),
    search: v.search,
  };
  if (v.maxSummerHighC != null) state.maxSummerHighC = v.maxSummerHighC;
  if (v.minWinterLowC != null) state.minWinterLowC = v.minWinterLowC;
  if (v.minGrowability != null) state.minGrowability = v.minGrowability;
  if (v.maxFireRisk != null) state.maxFireRisk = v.maxFireRisk;
  if (v.maxOverallRisk != null) state.maxOverallRisk = v.maxOverallRisk;
  return state;
}

/** Count active Explorer filter signals (for mobile sheet badge). */
export function countActiveExplorerFilterSignals(filters: FilterState): number {
  let n = 0;
  n += filters.countries.size;
  n += filters.archetypes.size;
  n += filters.fitPresets?.size ?? 0;
  if ((filters.search?.length ?? 0) > 0) n += 1;
  if (filters.maxSummerHighC != null) n += 1;
  if (filters.minWinterLowC != null) n += 1;
  if (filters.minGrowability != null) n += 1;
  if (filters.maxFireRisk != null) n += 1;
  if (filters.maxOverallRisk != null) n += 1;
  return n;
}

export function hasActiveExplorerFilters(filters: FilterState): boolean {
  return countActiveExplorerFilterSignals(filters) > 0;
}

/**
 * True when any non-search Explorer filter is active — country, archetype,
 * Live-Finder preset, or a hard constraint (summer high / winter low /
 * growability / fire / overall risk). Keeps the "what counts as a filter vs. a
 * search" rule beside {@link countActiveExplorerFilterSignals} so callers (e.g.
 * the empty-results message) don't re-derive it by subtracting the search term.
 */
export function hasNonSearchExplorerFilters(filters: FilterState): boolean {
  return (
    filters.countries.size > 0 ||
    filters.archetypes.size > 0 ||
    (filters.fitPresets?.size ?? 0) > 0 ||
    filters.maxSummerHighC != null ||
    filters.minWinterLowC != null ||
    filters.minGrowability != null ||
    filters.maxFireRisk != null ||
    filters.maxOverallRisk != null
  );
}

export function applyFilters(places: Place[], f: FilterState): Place[] {
  // Precompute the diacritic-folded query once, not per-place. The search
  // index is built with the same fold so "san jose" matches "San José".
  const q = f.search ? foldDiacritics(f.search.trim()) : "";
  const hasCountries = f.countries.size > 0;
  const hasArchetypes = f.archetypes.size > 0;

  const out: Place[] = [];
  for (const p of places) {
    if (hasCountries && !f.countries.has(p.country)) continue;
    if (hasArchetypes && !p.archetypes.some(a => f.archetypes.has(a))) continue;
    if (!liveFitFilterPass(p, f)) continue;
    if (q) {
      if (!getPlaceSearchText(p).includes(q)) continue;
    }
    out.push(p);
  }
  return out;
}
