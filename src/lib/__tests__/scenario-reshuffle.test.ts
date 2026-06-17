import { describe, expect, it } from "vitest";
import { projectPlace } from "../climate-projection";
import { buildScenarioReshuffleSummary } from "../scenario-reshuffle";
import { makePlace } from "./test-fixtures";
import type { RankingResult } from "../scoring";

describe("buildScenarioReshuffleSummary", () => {
  it("returns null for the present-day layer", () => {
    const place = makePlace();
    const rows: RankingResult[] = [{ place, score: 80 }];

    expect(buildScenarioReshuffleSummary({
      scenario: "now",
      baselineRanked: rows,
      projectedRanked: rows,
    })).toBeNull();
  });

  it("compares projected leaders against their present-day ranks and deltas", () => {
    const a = makePlace({ id: "a", name: "Alpha", lat: 20, country: "Mexico" });
    const b = makePlace({ id: "b", name: "Bravo", lat: 55, country: "Canada" });
    const c = makePlace({ id: "c", name: "Charlie", lat: 40, country: "USA" });
    const projectedB = projectPlace(b, "ssp245");
    const projectedA = projectPlace(a, "ssp245");
    const projectedC = projectPlace(c, "ssp245");

    const summary = buildScenarioReshuffleSummary({
      scenario: "ssp245",
      baselineRanked: [
        { place: a, score: 91 },
        { place: b, score: 84 },
        { place: c, score: 80 },
      ],
      projectedRanked: [
        { place: projectedB, score: 87 },
        { place: projectedA, score: 83 },
        { place: projectedC, score: 79 },
      ],
      limit: 2,
    });

    expect(summary).not.toBeNull();
    expect(summary!.leaderChanged).toBe(true);
    expect(summary!.baselineLeaderName).toBe("Alpha");
    expect(summary!.projectedLeaderName).toBe("Bravo");
    expect(summary!.rows[0]).toMatchObject({
      projectedRank: 1,
      currentRank: 2,
      projectedScore: 87,
      currentScore: 84,
      scoreDelta: 3,
      rankDelta: 1,
    });
    expect(summary!.rows[0]!.summerHighDeltaC).toBeGreaterThan(0);
    expect(summary!.rows[0]!.winterLowDeltaC).toBeGreaterThan(summary!.rows[0]!.summerHighDeltaC);
    expect(summary!.rows[1]!.precipDeltaPct).toBeLessThan(0);
  });
});

