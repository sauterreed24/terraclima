import { describe, expect, it } from "vitest";
import { runScenarioRanking } from "../climate-processor";
import { PLACES } from "../../data/places";
import type { ValidatedFilterInput } from "../scoring";

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

describe("runScenarioRanking", () => {
  it("ranks the full corpus under 'now' (descending) and echoes the requestId", () => {
    const res = runScenarioRanking({
      type: "scenario-rank", requestId: 7, scenario: "now", ranking: "coolest-summers", filters: emptyFilters,
    });
    expect(res.requestId).toBe(7);
    expect(res.scenario).toBe("now");
    expect(res.rows).toHaveLength(PLACES.length);
    for (let i = 1; i < res.rows.length; i += 1) {
      expect(res.rows[i - 1]!.score).toBeGreaterThanOrEqual(res.rows[i]!.score);
    }
  });

  it("lowers coolest-summers scores under SSP5-8.5 warming (never raises them)", () => {
    const now = runScenarioRanking({ type: "scenario-rank", requestId: 1, scenario: "now", ranking: "coolest-summers", filters: emptyFilters });
    const hot = runScenarioRanking({ type: "scenario-rank", requestId: 2, scenario: "ssp585", ranking: "coolest-summers", filters: emptyFilters });
    const nowById = new Map(now.rows.map(r => [r.id, r.score]));
    let dropped = 0;
    for (const r of hot.rows) {
      const baseline = nowById.get(r.id)!;
      expect(r.score).toBeLessThanOrEqual(baseline + 1e-9);
      if (r.score < baseline - 1e-9) dropped += 1;
    }
    expect(dropped).toBeGreaterThan(0);
  });

  it("restricts ranking to poolIds", () => {
    const ids = PLACES.slice(0, 5).map(p => p.id);
    const res = runScenarioRanking({
      type: "scenario-rank", requestId: 3, scenario: "now", ranking: "most-comfortable", filters: emptyFilters, poolIds: ids,
    });
    expect(res.rows).toHaveLength(5);
    expect(new Set(res.rows.map(r => r.id))).toEqual(new Set(ids));
  });

  it("applies filters (country narrows the pool)", () => {
    const res = runScenarioRanking({
      type: "scenario-rank", requestId: 4, scenario: "now", ranking: "most-comfortable",
      filters: { ...emptyFilters, countries: ["Canada"] },
    });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.length).toBeLessThan(PLACES.length);
  });

  it("supports the live-fit ranking profile under a projected scenario", () => {
    const res = runScenarioRanking({ type: "scenario-rank", requestId: 5, scenario: "ssp245", ranking: "live-fit", filters: emptyFilters });
    expect(res.rows).toHaveLength(PLACES.length);
  });
});
