import type { Place, ScenarioId } from "../types";
import type { RankingResult } from "./scoring";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh } from "./climate-metrics";

export interface ScenarioReshuffleRow {
  place: Place;
  projectedRank: number;
  currentRank: number | null;
  projectedScore: number;
  currentScore: number | null;
  scoreDelta: number | null;
  rankDelta: number | null;
  summerHighDeltaC: number;
  winterLowDeltaC: number;
  precipDeltaPct: number;
}

export interface ScenarioReshuffleSummary {
  scenario: Exclude<ScenarioId, "now">;
  leaderChanged: boolean;
  newTopCount: number;
  baselineLeaderName: string | null;
  projectedLeaderName: string | null;
  rows: ScenarioReshuffleRow[];
}

function byId(rows: readonly RankingResult[]): Map<string, { row: RankingResult; rank: number }> {
  const map = new Map<string, { row: RankingResult; rank: number }>();
  rows.forEach((row, index) => map.set(row.place.id, { row, rank: index + 1 }));
  return map;
}

function percentChange(nowValue: number, projectedValue: number): number {
  if (!Number.isFinite(nowValue) || Math.abs(nowValue) < 1e-9) return 0;
  return ((projectedValue - nowValue) / nowValue) * 100;
}

export function buildScenarioReshuffleSummary({
  scenario,
  baselineRanked,
  projectedRanked,
  limit = 4,
}: {
  scenario: ScenarioId;
  baselineRanked: readonly RankingResult[];
  projectedRanked: readonly RankingResult[];
  limit?: number;
}): ScenarioReshuffleSummary | null {
  if (scenario === "now" || projectedRanked.length === 0) return null;

  const baseline = byId(baselineRanked);
  const baselineTopIds = new Set(baselineRanked.slice(0, limit).map(row => row.place.id));
  const rows: ScenarioReshuffleRow[] = projectedRanked.slice(0, limit).map((row, index) => {
    const base = baseline.get(row.place.id);
    const basePlace = base?.row.place ?? row.place;
    const currentScore = base?.row.score ?? null;
    const currentRank = base?.rank ?? null;
    const projectedRank = index + 1;
    return {
      place: row.place,
      projectedRank,
      currentRank,
      projectedScore: row.score,
      currentScore,
      scoreDelta: currentScore == null ? null : row.score - currentScore,
      rankDelta: currentRank == null ? null : currentRank - projectedRank,
      summerHighDeltaC: meanSummerHigh(row.place) - meanSummerHigh(basePlace),
      winterLowDeltaC: meanJanLow(row.place) - meanJanLow(basePlace),
      precipDeltaPct: percentChange(getAnnualPrecipMm(basePlace), getAnnualPrecipMm(row.place)),
    };
  });

  const baselineLeaderName = baselineRanked[0]?.place.name ?? null;
  const projectedLeaderName = projectedRanked[0]?.place.name ?? null;
  const newTopCount = rows.filter(row => !baselineTopIds.has(row.place.id)).length;

  return {
    scenario,
    leaderChanged: baselineRanked[0]?.place.id !== projectedRanked[0]?.place.id,
    newTopCount,
    baselineLeaderName,
    projectedLeaderName,
    rows,
  };
}

