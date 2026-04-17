// ============================================================
// Terraclima — Scoring & Ranking Logic
// ============================================================

import type { Place, MicroclimateArchetype, RiskLevel } from "../types";
import { PLACES, PLACE_SEARCH_INDEX, PLACE_ANNUAL_PRECIP } from "../data/places";

export const RISK_VALUE: Record<RiskLevel, number> = {
  "very-low": 0,
  "low": 1,
  "moderate": 2,
  "elevated": 3,
  "high": 4,
  "very-high": 5,
};

export function avgRisk(p: Place): number {
  const r = p.risks;
  const vals = [r.wildfire, r.flood, r.drought, r.extremeHeat, r.extremeCold, r.smoke, r.storm, r.landslide, r.coastal];
  return vals.reduce((s, a) => s + RISK_VALUE[a.level], 0) / vals.length;
}

export function meanJulyHigh(p: Place): number {
  return (p.climate.tempHighC[5] + p.climate.tempHighC[6] + p.climate.tempHighC[7]) / 3;
}
export function meanJanLow(p: Place): number {
  return (p.climate.tempLowC[11] + p.climate.tempLowC[0] + p.climate.tempLowC[1]) / 3;
}

export type RankingProfile =
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
  | "mediterranean-like"
  | "wet-forest-refuges"
  | "monsoon-drama";

export interface RankingResult { place: Place; score: number; note?: string }

export function rankPlaces(profile: RankingProfile, pool: Place[] = PLACES): RankingResult[] {
  const scored: RankingResult[] = pool.map(p => {
    const julyHigh = meanJulyHigh(p);
    const janLow = meanJanLow(p);
    const annualPrecip = PLACE_ANNUAL_PRECIP[p.id] ?? p.climate.annualPrecipMm ?? p.climate.precipMm.reduce((a, b) => a + b, 0);
    const diurnal = p.climate.diurnalSummerC ?? (p.climate.tempHighC[6] - p.climate.tempLowC[6]);

    switch (profile) {
      case "coolest-summers": {
        const s = Math.max(0, 100 - Math.max(0, julyHigh - 14) * 5);
        return { place: p, score: s, note: `Mean summer high ${julyHigh.toFixed(1)}°C` };
      }
      case "mildest-winters": {
        const s = Math.max(0, 100 - Math.max(0, -janLow) * 5);
        return { place: p, score: s, note: `Mean winter low ${janLow.toFixed(1)}°C` };
      }
      case "best-shoulder-seasons": {
        const shoulder = (p.climate.tempHighC[3] + p.climate.tempHighC[4] + p.climate.tempHighC[8] + p.climate.tempHighC[9]) / 4;
        const s = Math.max(0, 100 - Math.abs(shoulder - 20) * 6);
        return { place: p, score: s, note: `Spring/fall highs near ${shoulder.toFixed(1)}°C` };
      }
      case "driest-air": {
        const hum = p.climate.humidity ? p.climate.humidity.reduce((a, b) => a + b, 0) / 12 : 65;
        const s = Math.max(0, 100 - Math.max(0, hum - 35) * 2);
        return { place: p, score: s, note: `Mean humidity ~${hum.toFixed(0)}%` };
      }
      case "best-growability":
        return { place: p, score: p.scores.growability, note: p.growability.hardinessZone };
      case "hidden-gems":
        return { place: p, score: p.scores.hiddenGem, note: `Uniqueness ${p.scores.microclimateUniqueness}` };
      case "most-unique":
        return { place: p, score: p.scores.microclimateUniqueness };
      case "lowest-fire-risk": {
        const fire = RISK_VALUE[p.risks.wildfire.level];
        const s = Math.max(0, 100 - fire * 18);
        return { place: p, score: s, note: p.risks.wildfire.level };
      }
      case "climate-resilient":
        return { place: p, score: p.scores.resilience };
      case "best-four-season": {
        const range = julyHigh - janLow;
        const sweetSpot = Math.abs(range - 26);
        const s = Math.max(0, 100 - sweetSpot * 3);
        return { place: p, score: s, note: `Seasonal range ${range.toFixed(0)}°C` };
      }
      case "best-diurnal-sleep": {
        const s = Math.min(100, Math.max(0, (diurnal - 6) * 10));
        return { place: p, score: s, note: `Summer diurnal swing ${diurnal.toFixed(0)}°C` };
      }
      case "mediterranean-like": {
        // Dry summers + mild winters + Csa/Csb
        const koppen = p.koppen;
        const bonus = koppen.startsWith("Cs") ? 30 : 0;
        const wint = Math.max(0, 30 - Math.max(0, -janLow) * 4);
        const dry = Math.max(0, 30 - (p.climate.precipMm[6] + p.climate.precipMm[7]) * 0.3);
        return { place: p, score: bonus + wint + dry };
      }
      case "wet-forest-refuges": {
        const s = Math.min(100, annualPrecip / 30);
        return { place: p, score: s, note: `${annualPrecip.toFixed(0)} mm / yr` };
      }
      case "monsoon-drama": {
        const monsoon = p.climate.precipMm[6] + p.climate.precipMm[7] + p.climate.precipMm[8];
        const winter = p.climate.precipMm[11] + p.climate.precipMm[0] + p.climate.precipMm[1];
        const ratio = monsoon / Math.max(1, winter);
        const s = Math.min(100, ratio * 18);
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
  minElevation?: number;
  maxElevation?: number;
  maxFireRisk?: RiskLevel;
  minGrowability?: number;
  search?: string;
}

export function applyFilters(places: Place[], f: FilterState): Place[] {
  // Precompute the query lowercased once, not per-place.
  const q = f.search ? f.search.trim().toLowerCase() : "";
  const hasCountries = f.countries.size > 0;
  const hasArchetypes = f.archetypes.size > 0;
  const hasMaxFire = !!f.maxFireRisk;
  const maxFireVal = f.maxFireRisk ? RISK_VALUE[f.maxFireRisk] : 0;

  const out: Place[] = [];
  for (const p of places) {
    if (hasCountries && !f.countries.has(p.country)) continue;
    if (hasArchetypes && !p.archetypes.some(a => f.archetypes.has(a))) continue;
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
