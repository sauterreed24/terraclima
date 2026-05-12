import { describe, expect, it } from "vitest";
import { buildShortlistDecisionRows } from "../decision-matrix";
import { makeClimate, makePlace } from "./test-fixtures";

describe("buildShortlistDecisionRows", () => {
  it("turns ranked places into concrete decision rows", () => {
    const heatPlace = makePlace({
      id: "heat-place",
      name: "Heat Place",
      climate: makeClimate({ tempHighC: [22, 24, 28, 32, 36, 39, 41, 40, 36, 31, 26, 22] }),
      scores: { hiddenGem: 60, microclimateUniqueness: 70, comfort: 42, resilience: 54, growability: 36, tradeoff: 72 },
      whoMightNot: "people who cannot build summer routines around shade and early starts",
    });
    const gardenPlace = makePlace({
      id: "garden-place",
      name: "Garden Place",
      scores: { hiddenGem: 68, microclimateUniqueness: 58, comfort: 74, resilience: 78, growability: 96, tradeoff: 22 },
      relocationFit: ["gardeners"],
    });

    const rows = buildShortlistDecisionRows([
      { place: heatPlace, score: 88, note: "Ranking note." },
      { place: gardenPlace, score: 84 },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      place: heatPlace,
      rank: 1,
      rankingScore: 88,
      rankingNote: "Ranking note.",
    });
    expect(rows[0].watch).toBe("Peak summer heat");
    expect(rows[1].bestFor).toContain("Gardeners");
    expect(rows[1].decisionCue).toContain("Watch");
    expect(rows[1].liveFitScore).toBeGreaterThan(0);
    expect(rows[1].easyMonths).toBeGreaterThanOrEqual(0);
  });

  it("honors the requested output limit", () => {
    const ranked = Array.from({ length: 7 }, (_, index) => ({
      place: makePlace({ id: `place-${index}`, name: `Place ${index}` }),
      score: 90 - index,
    }));

    expect(buildShortlistDecisionRows(ranked, {}, 3).map(row => row.rank)).toEqual([1, 2, 3]);
  });
});
