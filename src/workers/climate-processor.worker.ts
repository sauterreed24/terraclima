// ============================================================
// Terraclima — Climate compute worker (dedicated, module worker)
// ============================================================
//
// Thin transport ONLY. All ranking/projection logic lives in the pure
// `runScenarioRanking` orchestrator so it stays unit-testable on the main
// thread and the worker can never drift from the synchronous fallback.
//
// Instantiated by `src/hooks/use-climate-processor.ts` via
//   new Worker(new URL("../workers/climate-processor.worker.ts", import.meta.url), { type: "module" })
// which Vite recognises and bundles as a separate worker chunk.
// ============================================================

import { isWorkerRequest, type WorkerResponse } from "../types/worker";
import { runScenarioRanking } from "../lib/climate-processor";

// `self` is typed via the DOM lib here; cast to the minimal worker surface we
// use so we don't have to add the "webworker" lib (which would clash with DOM
// global declarations during `tsc --noEmit`).
interface WorkerScope {
  addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  postMessage: (message: WorkerResponse) => void;
}

const ctx = self as unknown as WorkerScope;

ctx.addEventListener("message", (event: MessageEvent) => {
  if (!isWorkerRequest(event.data)) return;
  try {
    ctx.postMessage(runScenarioRanking(event.data));
  } catch (err) {
    ctx.postMessage({
      type: "scenario-rank-error",
      requestId: event.data.requestId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
