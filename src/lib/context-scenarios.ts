import type { RiskLevel } from "../types";
import { buildShortlistDecisionRows, type ShortlistDecisionRow } from "./decision-matrix";
import { rankLiveFit, type LiveFitPresetId } from "./live-fit";
import { applyFilters, rankPlaces, type FilterState, type RankingProfile, type RankingResult } from "./scoring";
import type { Place } from "../types";

type LiveConstraintKey =
  | "maxSummerHighC"
  | "minWinterLowC"
  | "minGrowability"
  | "maxFireRisk"
  | "maxOverallRisk";

export type ContextScenarioId =
  | "comfort-first"
  | "cool-summers"
  | "mild-winters"
  | "garden-life"
  | "low-fire-smoke"
  | "dry-air"
  | "quiet-small-town"
  | "coastal-buffer";

export interface ContextScenario {
  id: ContextScenarioId;
  label: string;
  shortLabel: string;
  description: string;
  ranking: RankingProfile;
  rankingLabel: string;
  fitPresets: readonly LiveFitPresetId[];
  maxSummerHighC?: number;
  minWinterLowC?: number;
  minGrowability?: number;
  maxFireRisk?: RiskLevel;
  maxOverallRisk?: RiskLevel;
}

export const CONTEXT_SCENARIOS = [
  {
    id: "comfort-first",
    label: "Comfort-first",
    shortLabel: "Comfort",
    description: "Re-sort the same search around felt comfort and atmospheric ease.",
    ranking: "most-comfortable",
    rankingLabel: "Most comfortable",
    fitPresets: [],
  },
  {
    id: "cool-summers",
    label: "Cool summers",
    shortLabel: "Cool",
    description: "Favor places where peak-season afternoons stay restrained.",
    ranking: "live-fit",
    rankingLabel: "Live-here fit",
    fitPresets: ["cool-summers"],
    maxSummerHighC: 26,
  },
  {
    id: "mild-winters",
    label: "Mild winters",
    shortLabel: "Mild",
    description: "Look for easier winter lows without losing the current place context.",
    ranking: "live-fit",
    rankingLabel: "Live-here fit",
    fitPresets: ["mild-winters"],
    minWinterLowC: 0,
  },
  {
    id: "garden-life",
    label: "Garden life",
    shortLabel: "Garden",
    description: "Put soils, season length, and growability ahead of novelty.",
    ranking: "live-fit",
    rankingLabel: "Live-here fit",
    fitPresets: ["gardenable"],
    minGrowability: 65,
  },
  {
    id: "low-fire-smoke",
    label: "Low fire / smoke",
    shortLabel: "Low fire",
    description: "Screen for easier wildfire, smoke, and aggregate risk exposure.",
    ranking: "live-fit",
    rankingLabel: "Live-here fit",
    fitPresets: ["low-fire-smoke"],
    maxFireRisk: "moderate",
    maxOverallRisk: "moderate",
  },
  {
    id: "dry-air",
    label: "Dry air",
    shortLabel: "Dry",
    description: "Favor lower humidity and crisp daily cooling.",
    ranking: "live-fit",
    rankingLabel: "Live-here fit",
    fitPresets: ["dry-air"],
  },
  {
    id: "quiet-small-town",
    label: "Quiet small-town",
    shortLabel: "Quiet",
    description: "Lift lesser-known places with settlement anchors and low sprawl feel.",
    ranking: "live-fit",
    rankingLabel: "Live-here fit",
    fitPresets: ["quiet-small-town"],
  },
  {
    id: "coastal-buffer",
    label: "Coastal buffer",
    shortLabel: "Coast",
    description: "Reward ocean or large-lake moderation and tempered annual range.",
    ranking: "live-fit",
    rankingLabel: "Live-here fit",
    fitPresets: ["coastal-buffer"],
  },
] as const satisfies readonly ContextScenario[];

export const CONTEXT_SCENARIO_BY_ID: Record<ContextScenarioId, ContextScenario> =
  CONTEXT_SCENARIOS.reduce((acc, scenario) => {
    acc[scenario.id] = scenario;
    return acc;
  }, {} as Record<ContextScenarioId, ContextScenario>);

export interface ContextStressRow {
  id: "current" | ContextScenarioId;
  label: string;
  shortLabel: string;
  description: string;
  ranking: RankingProfile;
  rankingLabel: string;
  leader: RankingResult;
  decision: ShortlistDecisionRow;
  shiftLabel: string;
  poolCount: number;
  scenario?: ContextScenario;
}

const LIVE_CONSTRAINT_KEYS: readonly LiveConstraintKey[] = [
  "maxSummerHighC",
  "minWinterLowC",
  "minGrowability",
  "maxFireRisk",
  "maxOverallRisk",
];

export function clearLiveScenarioFilters(filters: FilterState): FilterState {
  const cleared: FilterState = {
    ...filters,
    fitPresets: new Set(),
  };
  for (const key of LIVE_CONSTRAINT_KEYS) {
    cleared[key] = undefined;
  }
  return cleared;
}

export function filtersForContextScenario(filters: FilterState, scenario: ContextScenario): FilterState {
  return {
    ...clearLiveScenarioFilters(filters),
    fitPresets: new Set(scenario.fitPresets),
    maxSummerHighC: scenario.maxSummerHighC,
    minWinterLowC: scenario.minWinterLowC,
    minGrowability: scenario.minGrowability,
    maxFireRisk: scenario.maxFireRisk,
    maxOverallRisk: scenario.maxOverallRisk,
  };
}

function rankedForScenario(pool: Place[], scenario: ContextScenario, filters: FilterState): RankingResult[] {
  const scenarioPool = applyFilters(pool, filters);
  return scenario.ranking === "live-fit"
    ? rankLiveFit(scenarioPool, filters)
    : rankPlaces(scenario.ranking, scenarioPool);
}

function rowFromRanking(
  input: {
    id: ContextStressRow["id"];
    label: string;
    shortLabel: string;
    description: string;
    ranking: RankingProfile;
    rankingLabel: string;
    ranked: RankingResult[];
    filters: FilterState;
    currentLeaderId: string | null;
    poolCount: number;
    scenario?: ContextScenario;
  },
): ContextStressRow | null {
  const leader = input.ranked[0];
  if (!leader) return null;
  const decision = buildShortlistDecisionRows(input.ranked, input.filters, 1)[0];
  if (!decision) return null;

  return {
    id: input.id,
    label: input.label,
    shortLabel: input.shortLabel,
    description: input.description,
    ranking: input.ranking,
    rankingLabel: input.rankingLabel,
    leader,
    decision,
    shiftLabel: input.currentLeaderId === leader.place.id ? "Same leader" : `Shifts to ${leader.place.name}`,
    poolCount: input.poolCount,
    scenario: input.scenario,
  };
}

export function buildContextStressRows({
  pool,
  currentRanked,
  currentFilters,
  currentRanking,
  currentRankingLabel,
}: {
  pool: readonly Place[];
  currentRanked: readonly RankingResult[];
  currentFilters: FilterState;
  currentRanking: RankingProfile;
  currentRankingLabel: string;
}): ContextStressRow[] {
  const currentLeaderId = currentRanked[0]?.place.id ?? null;
  const baseFilters = clearLiveScenarioFilters(currentFilters);
  const basePool = applyFilters([...pool], baseFilters);
  const rows: ContextStressRow[] = [];

  const currentRow = rowFromRanking({
    id: "current",
    label: "Current setup",
    shortLabel: "Now",
    description: "Your active search, filters, ranking, and Live Finder settings.",
    ranking: currentRanking,
    rankingLabel: currentRankingLabel,
    ranked: [...currentRanked],
    filters: currentFilters,
    currentLeaderId,
    poolCount: currentRanked.length,
  });
  if (currentRow) rows.push({ ...currentRow, shiftLabel: "Baseline leader" });

  for (const scenario of CONTEXT_SCENARIOS) {
    const scenarioFilters = filtersForContextScenario(baseFilters, scenario);
    const ranked = rankedForScenario(basePool, scenario, scenarioFilters);
    const row = rowFromRanking({
      id: scenario.id,
      label: scenario.label,
      shortLabel: scenario.shortLabel,
      description: scenario.description,
      ranking: scenario.ranking,
      rankingLabel: scenario.rankingLabel,
      ranked,
      filters: scenarioFilters,
      currentLeaderId,
      poolCount: ranked.length,
      scenario,
    });
    if (row) rows.push(row);
  }

  return rows;
}
