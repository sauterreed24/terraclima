// ============================================================
// Terraclima — Climate compute orchestrator (worker-shared core)
// ============================================================
//
// The single pure function that both the dedicated worker
// (`src/workers/climate-processor.worker.ts`) and the synchronous fallback in
// `useClimateProcessor` call. Keeping ALL business logic here (and none in the
// worker) means the heavy path stays fully unit-testable on the main thread
// and the two execution surfaces can never diverge.
//
// Pipeline: project the pool to the requested scenario → hydrate the filter
// state from the serialized request → filter → rank by profile (live-fit uses
// `rankLiveFit`, everything else `rankPlaces`). Returns only `{ id, score,
// note }` rows so the response payload stays tiny across `postMessage`.
// ============================================================

import type { Place } from "../types";
import type { RankedRow, ScenarioRankRequest, ScenarioRankResult } from "../types/worker";
import { PLACES } from "../data/places";
import { applyFilters, filterStateFromValidated, rankPlaces } from "./scoring";
import { rankLiveFit } from "./live-fit";
import { projectPool } from "./climate-projection";

function basePool(poolIds: readonly string[] | undefined): readonly Place[] {
  if (!poolIds || poolIds.length === 0) return PLACES;
  const wanted = new Set(poolIds);
  return PLACES.filter(p => wanted.has(p.id));
}

/** Project → filter → rank for one scenario request. Pure + deterministic. */
export function runScenarioRanking(req: ScenarioRankRequest): ScenarioRankResult {
  const projected = projectPool(basePool(req.poolIds), req.scenario);
  const filters = filterStateFromValidated(req.filters);
  const filtered = applyFilters(projected, filters);
  const now = req.nowEpochMs != null ? new Date(req.nowEpochMs) : new Date();
  const ranked = req.ranking === "live-fit"
    ? rankLiveFit(filtered, filters)
    : rankPlaces(req.ranking, filtered, now);

  const rows: RankedRow[] = ranked.map(r => (
    r.note != null
      ? { id: r.place.id, score: r.score, note: r.note }
      : { id: r.place.id, score: r.score }
  ));

  return {
    type: "scenario-rank-result",
    requestId: req.requestId,
    scenario: req.scenario,
    rows,
  };
}
