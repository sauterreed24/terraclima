import type { Dispatch, SetStateAction } from "react";
import type { Country, MicroclimateArchetype, RiskLevel } from "../types";
import type { RankingProfile, FilterState } from "./scoring";
import type { LiveFitPresetId } from "./live-fit";

export type LifestyleBundleGroupId = "escape" | "daily-life" | "terrain-season";

export interface LifestyleBundleGroup {
  id: LifestyleBundleGroupId;
  label: string;
  cue: string;
}

export interface LifestyleBundle {
  id: string;
  group: LifestyleBundleGroupId;
  tone: "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora";
  label: string;
  cue: string;
  description: string;
  ranking: RankingProfile;
  presets: LiveFitPresetId[];
  countries?: Country[];
  archetypes?: MicroclimateArchetype[];
  maxSummerHighC?: number;
  minWinterLowC?: number;
  minGrowability?: number;
  maxFireRisk?: RiskLevel;
  maxOverallRisk?: RiskLevel;
}

export const LIFESTYLE_BUNDLE_GROUPS: readonly LifestyleBundleGroup[] = [
  {
    id: "escape",
    label: "Get away from",
    cue: "Heat, gray winters, smoke, humidity.",
  },
  {
    id: "daily-life",
    label: "Daily life",
    cue: "Work, retirement, gardens, quiet towns.",
  },
  {
    id: "terrain-season",
    label: "Terrain & seasons",
    cue: "Coasts, snow, shoulder seasons, Mexico / Southwest.",
  },
] as const;

export const LIFESTYLE_BUNDLES: readonly LifestyleBundle[] = [
  {
    id: "cool-summer-refuge",
    group: "escape",
    tone: "glacier",
    label: "Cool Summer Refuge",
    cue: "Escape heat",
    description: "Cool summer afternoons, without requiring a snowy winter.",
    ranking: "coolest-summers",
    presets: ["cool-summers"],
    maxSummerHighC: 26,
  },
  {
    id: "remote-work",
    group: "daily-life",
    tone: "glacier",
    label: "Remote Work",
    cue: "Work from home",
    description: "Cool summers, low fire and smoke risk, mild winters. Ranked by the remote-work score.",
    ranking: "best-for-remote-work",
    presets: ["cool-summers", "low-fire-smoke"],
    maxSummerHighC: 26,
  },
  {
    id: "retirement",
    group: "daily-life",
    tone: "ochre",
    label: "Retirement",
    cue: "Easy year-round living",
    description: "Mild all year, low overall hazard risk, good for gardening. Ranked by the retirement score.",
    ranking: "best-retirement",
    presets: ["mild-winters"],
    minWinterLowC: 2,
    maxOverallRisk: "moderate",
  },
  {
    id: "winter-sun",
    group: "escape",
    tone: "ochre",
    label: "Winter Sun",
    cue: "Less gray winter",
    description: "Sunny winters with lows that stay tolerable, for people leaving gray winters.",
    ranking: "sunniest-winters",
    presets: ["sunny-winters", "mild-winters"],
    minWinterLowC: -5,
  },
  {
    id: "garden",
    group: "daily-life",
    tone: "sage",
    label: "Garden & Grow",
    cue: "Gardens and orchards",
    description: "Long growing season, good soils, few frosts. Ranked by the growability score.",
    ranking: "best-growability",
    presets: ["gardenable"],
    minGrowability: 65,
  },
  {
    id: "dry-air",
    group: "escape",
    tone: "ochre",
    label: "Dry Air",
    cue: "Avoid muggy climates",
    description: "Low humidity and nights that cool off, for people who struggle with sticky heat.",
    ranking: "driest-air",
    presets: ["dry-air"],
  },
  {
    id: "mexico-southwest",
    group: "terrain-season",
    tone: "ochre",
    label: "Mexico / Southwest",
    cue: "Dry highland options",
    description: "Highlands of Mexico and the U.S. Southwest with dry air, comfortable spring and fall, and winters that are not severe.",
    ranking: "best-shoulder-seasons",
    presets: ["dry-air", "mild-winters"],
    countries: ["USA", "Mexico"],
    archetypes: [
      "eternal-spring-highland",
      "volcanic-upland",
      "sky-island-refuge",
      "high-desert-escape",
      "monsoon-edge",
      "mild-winter-foothills",
    ],
    maxSummerHighC: 26,
    minWinterLowC: -5,
  },
  {
    id: "coastal-buffer",
    group: "terrain-season",
    tone: "aurora",
    label: "Coastal Buffer",
    cue: "Water-moderated weather",
    description: "Places beside an ocean or large lake, with cooler summers and a smaller swing between seasons.",
    ranking: "live-fit",
    presets: ["coastal-buffer", "cool-summers"],
    maxSummerHighC: 26,
  },
  {
    id: "quiet-town",
    group: "daily-life",
    tone: "sage",
    label: "Quiet Towns",
    cue: "Small, lesser-known places",
    description: "Lesser-known small towns that still have basic services.",
    ranking: "live-fit",
    presets: ["quiet-small-town"],
  },
  {
    id: "snow-ski",
    group: "terrain-season",
    tone: "ice",
    label: "Snow & Ski",
    cue: "Want real winter",
    description: "A real winter with reliable snow and four distinct seasons. Ranked by coolest summers.",
    ranking: "coolest-summers",
    presets: ["snow-country", "four-seasons"],
  },
  {
    id: "fire-safe",
    group: "escape",
    tone: "ember",
    label: "Low Fire / Smoke",
    cue: "Reduce smoke season",
    description: "Low wildfire and smoke exposure, and a climate outlook that holds up. Ranked by the resilience score.",
    ranking: "climate-resilient",
    presets: ["low-fire-smoke"],
    maxFireRisk: "moderate",
    maxOverallRisk: "moderate",
  },
  {
    id: "shoulder-season",
    group: "terrain-season",
    tone: "aurora",
    label: "Best Shoulder",
    cue: "Spring/fall comfort",
    description: "Comfortable springs and autumns, mild winters and dry air.",
    ranking: "best-shoulder-seasons",
    presets: ["mild-winters", "dry-air"],
  },
] as const;

/** Hero quick-picks that map to a full lifestyle bundle (ranking + Live Finder). */
export const HERO_BUNDLE_BY_RANKING: Partial<Record<RankingProfile, LifestyleBundle["id"]>> = {
  "coolest-summers": "cool-summer-refuge",
  "best-for-remote-work": "remote-work",
  "best-retirement": "retirement",
  "best-growability": "garden",
  "climate-resilient": "fire-safe",
};

function samePresetSet(actual: Set<LiveFitPresetId> | undefined, expected: readonly LiveFitPresetId[]): boolean {
  if ((actual?.size ?? 0) !== expected.length) return false;
  return expected.every(preset => actual?.has(preset));
}

function sameStringSet(actual: ReadonlySet<string>, expected: readonly string[] | undefined): boolean {
  if (!expected) return actual.size === 0;
  if (actual.size !== expected.length) return false;
  return expected.every(value => actual.has(value));
}

export function isBundleActive(bundle: LifestyleBundle, ranking: RankingProfile, filters: FilterState): boolean {
  return ranking === bundle.ranking &&
    sameStringSet(filters.countries, bundle.countries) &&
    sameStringSet(filters.archetypes, bundle.archetypes) &&
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
    countries: bundle.countries ? new Set(bundle.countries) : new Set(),
    archetypes: bundle.archetypes ? new Set(bundle.archetypes) : new Set(),
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
