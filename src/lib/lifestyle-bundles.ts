import type { Dispatch, SetStateAction } from "react";
import type { RiskLevel } from "../types";
import type { RankingProfile, FilterState } from "./scoring";
import type { LiveFitPresetId } from "./live-fit";

export interface LifestyleBundle {
  id: string;
  tone: "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora";
  label: string;
  description: string;
  ranking: RankingProfile;
  presets: LiveFitPresetId[];
  maxSummerHighC?: number;
  minWinterLowC?: number;
  minGrowability?: number;
  maxFireRisk?: RiskLevel;
  maxOverallRisk?: RiskLevel;
}

export const LIFESTYLE_BUNDLES: readonly LifestyleBundle[] = [
  {
    id: "remote-work",
    tone: "glacier",
    label: "Remote Work",
    description: "Cool, productive summers. Low fire & smoke. Mild winters. Ranked by remote-work readiness.",
    ranking: "best-for-remote-work",
    presets: ["cool-summers", "low-fire-smoke"],
    maxSummerHighC: 26,
  },
  {
    id: "retirement",
    tone: "ochre",
    label: "Retirement",
    description: "Mild all-year, low aggregate risk, good growability. Ranked by year-round comfort.",
    ranking: "best-retirement",
    presets: ["mild-winters"],
    minWinterLowC: 2,
    maxOverallRisk: "moderate",
  },
  {
    id: "garden",
    tone: "sage",
    label: "Garden & Grow",
    description: "Long growing season, good soils, frost-free nights. Ranked by growability.",
    ranking: "best-growability",
    presets: ["gardenable"],
    minGrowability: 65,
  },
  {
    id: "snow-ski",
    tone: "ice",
    label: "Snow & Ski",
    description: "Real winter with reliable snowpack. Four-season drama. Ranked by coolest summers.",
    ranking: "coolest-summers",
    presets: ["snow-country", "four-seasons"],
  },
  {
    id: "fire-safe",
    tone: "ember",
    label: "Fire-Safe",
    description: "Low wildfire and smoke exposure. Climate-resilient trajectory. Ranked by resilience.",
    ranking: "climate-resilient",
    presets: ["low-fire-smoke"],
    maxFireRisk: "moderate",
    maxOverallRisk: "moderate",
  },
  {
    id: "shoulder-season",
    tone: "aurora",
    label: "Best Shoulder",
    description: "Ideal spring and autumn conditions. Mild winters, dry air, comfortable year-round.",
    ranking: "best-shoulder-seasons",
    presets: ["mild-winters", "dry-air"],
  },
] as const;

/** Hero quick-picks that map to a full lifestyle bundle (ranking + Live Finder). */
export const HERO_BUNDLE_BY_RANKING: Partial<Record<RankingProfile, LifestyleBundle["id"]>> = {
  "best-for-remote-work": "remote-work",
  "best-retirement": "retirement",
  "best-growability": "garden",
  "coolest-summers": "snow-ski",
  "climate-resilient": "fire-safe",
};

function samePresetSet(actual: Set<LiveFitPresetId> | undefined, expected: readonly LiveFitPresetId[]): boolean {
  if ((actual?.size ?? 0) !== expected.length) return false;
  return expected.every(preset => actual?.has(preset));
}

export function isBundleActive(bundle: LifestyleBundle, ranking: RankingProfile, filters: FilterState): boolean {
  return ranking === bundle.ranking &&
    samePresetSet(filters.fitPresets, bundle.presets) &&
    filters.maxSummerHighC === bundle.maxSummerHighC &&
    filters.minWinterLowC === bundle.minWinterLowC &&
    filters.minGrowability === bundle.minGrowability &&
    filters.maxFireRisk === bundle.maxFireRisk &&
    filters.maxOverallRisk === bundle.maxOverallRisk;
}

export function applyLifestyleBundle(
  bundle: LifestyleBundle,
  setRanking: (r: RankingProfile) => void,
  setFilters: Dispatch<SetStateAction<FilterState>>,
): void {
  setRanking(bundle.ranking);
  setFilters(f => ({
    ...f,
    fitPresets: new Set(bundle.presets),
    maxSummerHighC: bundle.maxSummerHighC,
    minWinterLowC: bundle.minWinterLowC,
    minGrowability: bundle.minGrowability,
    maxFireRisk: bundle.maxFireRisk,
    maxOverallRisk: bundle.maxOverallRisk,
  }));
}

export function lifestyleBundleById(id: string): LifestyleBundle | undefined {
  return LIFESTYLE_BUNDLES.find(b => b.id === id);
}

/** Live Finder presets + numeric/risk constraints (excludes search/country/archetype). */
export function countLiveFinderConstraintSignals(filters: FilterState): number {
  return (filters.fitPresets?.size ?? 0) + [
    filters.maxSummerHighC,
    filters.minWinterLowC,
    filters.minGrowability,
    filters.maxFireRisk,
    filters.maxOverallRisk,
  ].filter(v => v != null).length;
}

export function anyLifestyleBundleActive(ranking: RankingProfile, filters: FilterState): boolean {
  return LIFESTYLE_BUNDLES.some(b => isBundleActive(b, ranking, filters));
}
