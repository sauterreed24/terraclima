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
    label: "Escape discomfort",
    cue: "Heat, gray winters, smoke, humidity.",
  },
  {
    id: "daily-life",
    label: "Daily life fit",
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
    description: "Cooler peak-season afternoons without forcing a snow-country lifestyle.",
    ranking: "coolest-summers",
    presets: ["cool-summers"],
    maxSummerHighC: 26,
  },
  {
    id: "remote-work",
    group: "daily-life",
    tone: "glacier",
    label: "Remote Work",
    cue: "Screen work days",
    description: "Cool, productive summers. Low fire & smoke. Mild winters. Ranked by remote-work readiness.",
    ranking: "best-for-remote-work",
    presets: ["cool-summers", "low-fire-smoke"],
    maxSummerHighC: 26,
  },
  {
    id: "retirement",
    group: "daily-life",
    tone: "ochre",
    label: "Retirement",
    cue: "Lower-friction daily life",
    description: "Mild all-year, low aggregate risk, good growability. Ranked by year-round comfort.",
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
    description: "Brighter cold-season light with tolerable winter lows for gray-season escape.",
    ranking: "sunniest-winters",
    presets: ["sunny-winters", "mild-winters"],
    minWinterLowC: -5,
  },
  {
    id: "garden",
    group: "daily-life",
    tone: "sage",
    label: "Garden & Grow",
    cue: "Yard and orchard screen",
    description: "Long growing season, good soils, frost-free nights. Ranked by growability.",
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
    description: "Lower humidity and bigger day-night relief for people who struggle with sticky heat.",
    ranking: "driest-air",
    presets: ["dry-air"],
  },
  {
    id: "mexico-southwest",
    group: "terrain-season",
    tone: "ochre",
    label: "Mexico / Southwest",
    cue: "Dry highland options",
    description: "Mexico highlands and Southwest uplifts with dry air, shoulder-season comfort, and moderated winter lows.",
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
    cue: "Moderated extremes",
    description: "Ocean or large-lake moderation with restrained summer heat and smoother annual range.",
    ranking: "live-fit",
    presets: ["coastal-buffer", "cool-summers"],
    maxSummerHighC: 26,
  },
  {
    id: "quiet-town",
    group: "daily-life",
    tone: "sage",
    label: "Quiet Towns",
    cue: "Less sprawl, more anchors",
    description: "Lesser-known places with settlement anchors and a calmer small-town read.",
    ranking: "live-fit",
    presets: ["quiet-small-town"],
  },
  {
    id: "snow-ski",
    group: "terrain-season",
    tone: "ice",
    label: "Snow & Ski",
    cue: "Want real winter",
    description: "Real winter with reliable snowpack. Four-season drama. Ranked by coolest summers.",
    ranking: "coolest-summers",
    presets: ["snow-country", "four-seasons"],
  },
  {
    id: "fire-safe",
    group: "escape",
    tone: "ember",
    label: "Low Fire / Smoke",
    cue: "Reduce smoke season",
    description: "Low wildfire and smoke exposure. Climate-resilient trajectory. Ranked by resilience.",
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
    description: "Ideal spring and autumn conditions. Mild winters, dry air, comfortable year-round.",
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
