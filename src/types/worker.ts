// ============================================================
// Terraclima — Climate compute worker messaging contract
// ============================================================
// Typed, serializable request/response channel between the main thread
// (see `src/hooks/use-climate-processor.ts`) and the compute worker
// (`src/workers/climate-processor.worker.ts`).
//
// Design notes:
//   • The worker imports the corpus directly, so requests carry only the
//     small scenario / ranking / filter description — never 226 cloned
//     `Place` objects across `postMessage`.
//   • Filters travel as the already-URL-validated array shape
//     (`ValidatedFilterInput`) so both the worker and the synchronous
//     fallback rebuild an identical `FilterState` via
//     `filterStateFromValidated()` — no `Set` cloning ambiguity.
//   • `requestId` lets the hook ignore out-of-order / stale responses when
//     the user scrubs the scenario slider faster than the worker drains.
// ============================================================

import type { RankingProfile, ValidatedFilterInput } from "../lib/scoring";
import type { ScenarioId } from "../types";

/** Re-exported for callers that only import the worker contract. */
export type { ScenarioId } from "../types";

/** Project all places to `scenario`, filter, and rank by `ranking`. */
export interface ScenarioRankRequest {
  type: "scenario-rank";
  /** Monotonic correlation id assigned by the hook. */
  requestId: number;
  scenario: ScenarioId;
  ranking: RankingProfile;
  /** URL-validated filter fields (JSON-serializable; no `Set`s). */
  filters: ValidatedFilterInput;
  /** Restrict ranking to these place ids (curated collection view). */
  poolIds?: readonly string[];
  /** Optional month override for deterministic "best-this-month" tests. */
  nowEpochMs?: number;
}

export type WorkerRequest = ScenarioRankRequest;

/** One ranked place, reduced to the fields the UI needs to re-order. */
export interface RankedRow {
  id: string;
  score: number;
  note?: string;
}

export interface ScenarioRankResult {
  type: "scenario-rank-result";
  requestId: number;
  scenario: ScenarioId;
  rows: RankedRow[];
}

export interface ScenarioRankError {
  type: "scenario-rank-error";
  requestId: number;
  message: string;
}

export type WorkerResponse = ScenarioRankResult | ScenarioRankError;

/** Narrowing guard for inbound worker messages (worker side). */
export function isWorkerRequest(value: unknown): value is WorkerRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "scenario-rank"
  );
}

/** Narrowing guard for inbound responses (main-thread side). */
export function isWorkerResponse(value: unknown): value is ScenarioRankResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "scenario-rank-result"
  );
}

/** Narrowing guard for worker-side failures posted back to the main thread. */
export function isWorkerError(value: unknown): value is ScenarioRankError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "scenario-rank-error"
  );
}
