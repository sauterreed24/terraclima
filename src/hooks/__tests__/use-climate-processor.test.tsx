// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClimateProcessor, type UseClimateProcessorInput } from "../use-climate-processor";
import { PLACES } from "../../data/places";
import type { ValidatedFilterInput } from "../../lib/scoring";

const emptyFilters: ValidatedFilterInput = {
  countries: [],
  archetypes: [],
  fitPresets: [],
  search: "",
  maxSummerHighC: null,
  minWinterLowC: null,
  minGrowability: null,
  maxFireRisk: null,
  maxOverallRisk: null,
};

describe("useClimateProcessor (synchronous fallback)", () => {
  it("returns a synchronous ranking when the worker is disabled", () => {
    const { result } = renderHook(() =>
      useClimateProcessor({ scenario: "now", ranking: "most-comfortable", filters: emptyFilters, disableWorker: true }),
    );
    expect(result.current.status).toBe("sync");
    expect(result.current.projecting).toBe(false);
    expect(result.current.rows).toHaveLength(PLACES.length);
  });

  it("reprojects scores when the scenario changes", () => {
    const initialProps: UseClimateProcessorInput = {
      scenario: "now", ranking: "coolest-summers", filters: emptyFilters, disableWorker: true,
    };
    const { result, rerender } = renderHook(
      (props: UseClimateProcessorInput) => useClimateProcessor(props),
      { initialProps },
    );
    const baseline = new Map(result.current.rows.map(r => [r.id, r.score]));

    rerender({ scenario: "ssp585", ranking: "coolest-summers", filters: emptyFilters, disableWorker: true });

    let changed = false;
    for (const r of result.current.rows) {
      if (Math.abs((baseline.get(r.id) ?? 0) - r.score) > 1e-9) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it("updates best-this-month rows when nowEpochMs changes", () => {
    const janEpoch = Date.UTC(2026, 0, 1);
    const mayEpoch = Date.UTC(2026, 4, 1);
    const { result, rerender } = renderHook(
      (props: UseClimateProcessorInput) => useClimateProcessor(props),
      {
        initialProps: {
          scenario: "now",
          ranking: "best-this-month",
          filters: emptyFilters,
          nowEpochMs: janEpoch,
          disableWorker: true,
        },
      },
    );
    const janNotes = new Map(result.current.rows.map(r => [r.id, r.note]));

    rerender({
      scenario: "now",
      ranking: "best-this-month",
      filters: emptyFilters,
      nowEpochMs: mayEpoch,
      disableWorker: true,
    });

    let noteChanged = false;
    for (const r of result.current.rows) {
      if (janNotes.get(r.id) !== r.note) {
        noteChanged = true;
        break;
      }
    }
    expect(noteChanged).toBe(true);
  });

  it("clears projecting when the worker posts an error response", async () => {
    class MockWorker {
      static instances: MockWorker[] = [];
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onmessageerror: (() => void) | null = null;
      constructor(_url: URL | string, _opts?: WorkerOptions) {
        MockWorker.instances.push(this);
      }
      addEventListener(type: string, listener: EventListener) {
        if (type === "message") this.onmessage = listener as (event: MessageEvent) => void;
        if (type === "error") this.onerror = listener as () => void;
        if (type === "messageerror") this.onmessageerror = listener as () => void;
      }
      removeEventListener() {}
      postMessage(_msg: unknown) {
        queueMicrotask(() => {
          this.onmessage?.({
            data: { type: "scenario-rank-error", requestId: 1, message: "boom" },
          } as MessageEvent);
        });
      }
      terminate() {}
    }

    const OriginalWorker = globalThis.Worker;
    // @ts-expect-error test double
    globalThis.Worker = MockWorker;

    try {
      const { result, rerender } = renderHook(
        (props: UseClimateProcessorInput) => useClimateProcessor(props),
        {
          initialProps: {
            scenario: "ssp585",
            ranking: "most-comfortable",
            filters: emptyFilters,
            disableWorker: false,
          },
        },
      );

      rerender({
        scenario: "ssp585",
        ranking: "most-comfortable",
        filters: emptyFilters,
        disableWorker: false,
      });

      await vi.waitFor(() => {
        expect(result.current.projecting).toBe(false);
      });
      expect(result.current.rows.length).toBeGreaterThan(0);
    } finally {
      globalThis.Worker = OriginalWorker;
    }
  });
});
