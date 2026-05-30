// ============================================================
// Terraclima — useClimateProcessor
// ============================================================
//
// React binding for the scenario re-rank pipeline. Computes a synchronous
// SEED immediately (so the first paint and tests never see an empty list),
// and — when a real module Worker is available — mirrors the same request
// off the main thread, adopting the worker's rows when they arrive for the
// current request signature.
//
// HONEST SCALE NOTE: for the current 226-place corpus the synchronous compute
// is ~1 ms, so the worker is architectural headroom (and keeps the heavy path
// off-thread if the corpus grows), not a measured win today. The pure
// orchestrator is the single source of truth for both paths, so they cannot
// diverge. The hook degrades cleanly to the synchronous path under jsdom /
// SSR / unsupported browsers.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import type { RankedRow, ScenarioRankRequest } from "../types/worker";
import { isWorkerError, isWorkerResponse } from "../types/worker";
import { runScenarioRanking } from "../lib/climate-processor";
import type { RankingProfile, ValidatedFilterInput } from "../lib/scoring";
import type { ScenarioId } from "../types";

export type ProcessorStatus = "sync" | "ready" | "projecting";

export interface UseClimateProcessorInput {
  scenario: ScenarioId;
  ranking: RankingProfile;
  filters: ValidatedFilterInput;
  /** Restrict ranking to these ids (curated collection view). */
  poolIds?: readonly string[];
  /** Deterministic month override (tests). */
  nowEpochMs?: number;
  /** Force the synchronous path (tests / opt-out). */
  disableWorker?: boolean;
}

export interface UseClimateProcessorResult {
  rows: RankedRow[];
  status: ProcessorStatus;
  /** True while a worker recompute for the latest input is in flight. */
  projecting: boolean;
}

function createWorker(): Worker | null {
  if (typeof Worker === "undefined" || typeof URL === "undefined") return null;
  try {
    return new Worker(new URL("../workers/climate-processor.worker.ts", import.meta.url), {
      type: "module",
      name: "climate-processor",
    });
  } catch {
    return null;
  }
}

function buildRequest(input: UseClimateProcessorInput, requestId: number): ScenarioRankRequest {
  return {
    type: "scenario-rank",
    requestId,
    scenario: input.scenario,
    ranking: input.ranking,
    filters: input.filters,
    ...(input.poolIds ? { poolIds: input.poolIds } : {}),
    ...(input.nowEpochMs != null ? { nowEpochMs: input.nowEpochMs } : {}),
  };
}

export function useClimateProcessor(input: UseClimateProcessorInput): UseClimateProcessorResult {
  const { scenario, ranking, filters, poolIds, nowEpochMs, disableWorker } = input;

  // Stable signature of the request so memo/effect only refire on real change.
  const signature = useMemo(
    () => JSON.stringify({ scenario, ranking, filters, poolIds, nowEpochMs }),
    [scenario, ranking, filters, poolIds, nowEpochMs],
  );

  // Synchronous seed — always correct, instant, and what tests observe. This
  // is the source of truth; the worker only mirrors it off-thread.
  const syncRows = useMemo<RankedRow[]>(
    () => runScenarioRanking(buildRequest({ scenario, ranking, filters, poolIds, nowEpochMs }, -1)).rows,
    // signature captures every input that affects the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  // The worker is created LAZILY and only when enabled — so the default
  // present-day view never downloads the (corpus-carrying) worker chunk. It
  // spins up the first time the caller engages a future scenario.
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  type WorkerOutcome = { signature: string; rows: RankedRow[] } | { signature: string; failed: true };
  const [workerOutcome, setWorkerOutcome] = useState<WorkerOutcome | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (disableWorker) return;
    if (!workerRef.current) workerRef.current = createWorker();
    const worker = workerRef.current;
    if (!worker) return; // unsupported env → synchronous seed stands
    const requestId = ++requestIdRef.current;
    const onMessage = (event: MessageEvent) => {
      if (isWorkerError(event.data)) {
        if (event.data.requestId !== requestIdRef.current) return;
        console.warn("[climate-processor] worker error:", event.data.message);
        setWorkerOutcome({ signature, failed: true });
        return;
      }
      if (!isWorkerResponse(event.data)) return;
      if (event.data.requestId !== requestIdRef.current) return; // ignore stale
      setWorkerOutcome({ signature, rows: event.data.rows });
    };
    const onTransportError = () => {
      if (requestIdRef.current !== requestId) return;
      console.warn("[climate-processor] worker transport error");
      setWorkerOutcome({ signature, failed: true });
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onTransportError);
    worker.addEventListener("messageerror", onTransportError);
    worker.postMessage(buildRequest({ scenario, ranking, filters, poolIds, nowEpochMs }, requestId));
    return () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onTransportError);
      worker.removeEventListener("messageerror", onTransportError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disableWorker, signature]);

  if (disableWorker || workerRef.current == null) {
    return { rows: syncRows, status: "sync", projecting: false };
  }

  const settled = workerOutcome?.signature === signature;
  const workerRows = settled && "rows" in workerOutcome ? workerOutcome.rows : null;
  return {
    // The synchronous seed guarantees correctness on the first frame and while
    // the worker recompute is in flight; the worker rows replace it on arrival.
    rows: workerRows ?? syncRows,
    status: settled && workerRows ? "ready" : settled ? "sync" : "projecting",
    projecting: !settled,
  };
}
