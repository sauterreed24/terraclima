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
} from "./climate-metrics";
import { assessLiveFit, liveFitFilterPass, type LiveFitPresetId } from "./live-fit";
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

export interface RankingResult { place: Place; score: number; note?: string }

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
  const sunny = p.climate.sunshinePct;
  const hum = p.climate.humidity;
  const diurnal = p.climate.diurnalSummerC ?? (p.climate.tempHighC[6] - p.climate.tempLowC[6]);

  let bonus = 0;

  // Direct sunshine reward — calibrated to US avg (58% = neutral, 80% ≈ +7.3 pts, 95%+ ≈ +15)
  if (sunny) {
    const annualSun = sunny.reduce((a, b) => a + b, 0) / 12;
    bonus += Math.min(15, Math.max(0, (annualSun - 45) * 0.33));
  }

  // Summer marine-layer penalty: check May–Aug (indices 4–7) specifically.
  // Summer gray is more damaging than winter gray — it violates seasonal expectations
  // and eliminates the serotonin/circadian benefit people rely on in peak activity season.
  if (hum) {
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
        return { place: p, score: s, note: `Mean summer high ${summerHigh.toFixed(1)}°C` };
      }
      case "mildest-winters": {
        const s = Math.max(0, 100 - Math.max(0, -janLow) * k.mildWinterPerDegC);
        return { place: p, score: s, note: `Mean winter low ${janLow.toFixed(1)}°C` };
      }
      case "best-shoulder-seasons": {
        const shoulder = (p.climate.tempHighC[3] + p.climate.tempHighC[4] + p.climate.tempHighC[8] + p.climate.tempHighC[9]) / 4;
        const base = Math.max(0, 100 - Math.abs(shoulder - k.shoulderIdealHighC) * k.shoulderPerDegC);
        const sunBonus = sunshineComfortBonus(p);
        const s = Math.min(100, base + sunBonus);
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
        // "Annual range" triggers delta detection in localizeProse so the
        // value is converted as a Δ (×9/5), not as an absolute reading.
        return { place: p, score: s, note: `Annual range ${range.toFixed(0)}°C` };
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
      case "most-continental": {
        const bio = computeBioclim(p);
        if (!bio || bio.conrad.value == null) return { place: p, score: 0, note: "Bioclim unavailable" };
        return { place: p, score: bio.conrad.value, note: `Conrad K ${bio.conrad.value.toFixed(1)} · ${bio.conrad.classLabel}` };
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
        return { place: p, score: s, note: `${MONTH_NAMES[mi]}: ${monthHigh.toFixed(0)}°C day · ${monthLow.toFixed(0)}°C night · ${monthPrecip.toFixed(0)} mm` };
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
        const s = Math.min(100, coolSummer + mildWinter + fireScore + smokeScore + sunBonus + livedBonus + feelBonus - accessPenalty);
        return { place: p, score: s, note: `${summerHigh.toFixed(0)}°C summers · fire ${p.risks.wildfire.level} · smoke ${p.risks.smoke.level}` };
      }
      case "best-retirement": {
        // Mild all-year, low aggregate risk, good growability, and a livable
        // cost / social / access reality (retirees are highly sensitive to
        // specialty-care distance and to neighbourhood social-fabric stress).
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
        const s = Math.min(100, winterScore + summerScore + riskScore + growScore + sunBonus + livedBonus + feelBonus - costPenalty - accessPenalty);
        return { place: p, score: s, note: `Mild all-year · grow ${p.scores.growability}/100 · avg risk ${avgRisk(p).toFixed(1)}` };
      }
    }
  });

  // Name → id tiebreakers give a total order so tied scores rank identically
  // regardless of corpus insertion order (matches rankLivabilityWithBreakdown
  // and rankLiveFit).
  return scored.sort(
    (a, b) =>
      b.score - a.score ||
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
