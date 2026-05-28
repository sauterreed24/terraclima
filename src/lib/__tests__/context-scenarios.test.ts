import { describe, expect, it } from "vitest";
import { buildContextStressRows, CONTEXT_SCENARIO_BY_ID, filtersForContextScenario, summarizeContextStressRows } from "../context-scenarios";
import { createEmptyFilterState, rankPlaces, type FilterState } from "../scoring";
import { makeClimate, makePlace } from "./test-fixtures";

describe("context scenarios", () => {
  it("preserves text and geography filters while replacing stale live-fit state", () => {
    const filters: FilterState = {
      countries: new Set(["USA"]),
      archetypes: new Set(["mediterranean-pocket"]),
      fitPresets: new Set(["cool-summers"]),
      maxSummerHighC: 22,
      minWinterLowC: -5,
      maxOverallRisk: "elevated",
      search: "garden",
    };

    const next = filtersForContextScenario(filters, CONTEXT_SCENARIO_BY_ID["garden-life"]);

    expect([...next.countries]).toEqual(["USA"]);
    expect([...next.archetypes]).toEqual(["mediterranean-pocket"]);
    expect(next.search).toBe("garden");
    expect([...next.fitPresets!]).toEqual(["gardenable"]);
    expect(next.minGrowability).toBe(65);
    expect(next.maxSummerHighC).toBeUndefined();
    expect(next.minWinterLowC).toBeUndefined();
    expect(next.maxOverallRisk).toBeUndefined();
  });

  it("builds actionable leaders for several alternate living contexts", () => {
    const coolPlace = makePlace({
      id: "cool-place",
      name: "Cool Place",
      climate: makeClimate({ tempHighC: [8, 10, 12, 15, 18, 20, 21, 21, 19, 15, 11, 8] }),
      scores: { hiddenGem: 62, microclimateUniqueness: 64, comfort: 82, resilience: 76, growability: 70, tradeoff: 24 },
    });
    const gardenPlace = makePlace({
      id: "garden-place",
      name: "Garden Place",
      scores: { hiddenGem: 74, microclimateUniqueness: 58, comfort: 68, resilience: 72, growability: 96, tradeoff: 20 },
      relocationFit: ["gardeners"],
    });
    const dryPlace = makePlace({
      id: "dry-place",
      name: "Dry Place",
      climate: makeClimate({ humidity: [38, 36, 34, 31, 28, 24, 22, 23, 26, 30, 34, 37] }),
      scores: { hiddenGem: 70, microclimateUniqueness: 73, comfort: 76, resilience: 78, growability: 66, tradeoff: 18 },
    });
    const pool = [coolPlace, gardenPlace, dryPlace];
    const currentRanked = rankPlaces("hidden-gems", pool);

    const rows = buildContextStressRows({
      pool,
      currentRanked,
      currentFilters: createEmptyFilterState(),
      currentRanking: "hidden-gems",
      currentRankingLabel: "Hidden gems",
    });

    expect(rows[0]).toMatchObject({
      id: "current",
      label: "Current setup",
      shiftLabel: "Baseline leader",
    });
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.find(row => row.id === "cool-summers")?.leader.place).toBe(coolPlace);
    expect(rows.find(row => row.id === "garden-life")?.decision.bestFor).toContain("Gardeners");
    expect(rows.every(row => row.decision.watch.length > 0)).toBe(true);
  });

  it("summarizes distinct context leaders for compare", () => {
    const coolPlace = makePlace({
      id: "cool-place",
      name: "Cool Place",
      climate: makeClimate({ tempHighC: [8, 10, 12, 15, 18, 20, 21, 21, 19, 15, 11, 8] }),
      scores: { hiddenGem: 62, microclimateUniqueness: 64, comfort: 82, resilience: 76, growability: 70, tradeoff: 24 },
    });
    const gardenPlace = makePlace({
      id: "garden-place",
      name: "Garden Place",
      scores: { hiddenGem: 74, microclimateUniqueness: 58, comfort: 68, resilience: 72, growability: 96, tradeoff: 20 },
      relocationFit: ["gardeners"],
    });
    const dryPlace = makePlace({
      id: "dry-place",
      name: "Dry Place",
      climate: makeClimate({ humidity: [38, 36, 34, 31, 28, 24, 22, 23, 26, 30, 34, 37] }),
      scores: { hiddenGem: 70, microclimateUniqueness: 73, comfort: 76, resilience: 78, growability: 66, tradeoff: 18 },
    });
    const pool = [coolPlace, gardenPlace, dryPlace];
    const rows = buildContextStressRows({
      pool,
      currentRanked: rankPlaces("hidden-gems", pool),
      currentFilters: createEmptyFilterState(),
      currentRanking: "hidden-gems",
      currentRankingLabel: "Hidden gems",
    });

    const summary = summarizeContextStressRows(rows, 2);

    expect(summary).not.toBeNull();
    expect(summary!.compareIds).toHaveLength(2);
    expect(summary!.uniqueLeaderCount).toBeGreaterThan(1);
    expect(summary!.summary).toContain("distinct leaders");
    expect(summary!.leaders[0].wins).toBeGreaterThanOrEqual(summary!.leaders[1].wins);
  });
});
