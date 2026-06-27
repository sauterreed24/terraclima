// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
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
  it("falls back to synchronous rows when the worker is disabled", () => {
    const { result } = renderHook(() =>
      useClimateProcessor({ scenario: "now", ranking: "most-comfortable", filters: emptyFilters, disableWorker: true }),
    );
    expect(result.current.status).toBe("sync");
    expect(result.current.projecting).toBe(false);
    expect(result.current.rows).toHaveLength(PLACES.length);
  });

  it("mirrors disableWorker parity when workerBroken would be set", () => {
    const { result } = renderHook(() =>
      useClimateProcessor({
        scenario: "ssp245",
        ranking: "most-comfortable",
        filters: emptyFilters,
        disableWorker: true,
      }),
    );
    expect(result.current.status).toBe("sync");
    expect(result.current.projecting).toBe(false);
    expect(result.current.rows.length).toBeGreaterThan(0);
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
});
