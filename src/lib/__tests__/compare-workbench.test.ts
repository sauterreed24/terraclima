import { describe, expect, it } from "vitest";
import { buildCompareCandidates } from "../compare-workbench";
import { projectPlace } from "../climate-projection";
import { meanSummerHigh } from "../climate-metrics";
import { makePlace } from "./test-fixtures";

describe("buildCompareCandidates", () => {
  it("projects shortlist and recent candidates outside the narrowed Explorer pool when scn≠now", () => {
    const inPool = makePlace({ id: "in-pool", lat: 45 });
    const outside = makePlace({ id: "outside-pool", lat: 45 });
    const poolById = { [inPool.id]: projectPlace(inPool, "ssp585") };

    const candidates = buildCompareCandidates({
      bookmarkIds: [outside.id],
      recentIds: [],
      ranked: [],
      placesById: poolById,
      scenario: "ssp585",
      scenarioRankingLabel: "2050 high · Most unique",
      resolveCorpusPlace: id => (id === outside.id ? outside : id === inPool.id ? inPool : undefined),
    });

    const shortlist = candidates.find(candidate => candidate.source === "Shortlist");
    expect(shortlist?.place.id).toBe(outside.id);
    expect(meanSummerHigh(shortlist!.place)).toBe(meanSummerHigh(projectPlace(outside, "ssp585")));
    expect(meanSummerHigh(shortlist!.place)).toBeGreaterThan(meanSummerHigh(outside));
  });

  it("keeps present-day corpus places for shortlist candidates when scn=now", () => {
    const outside = makePlace({ id: "outside-pool", lat: 45 });
    const candidates = buildCompareCandidates({
      bookmarkIds: [outside.id],
      recentIds: [],
      ranked: [],
      placesById: {},
      scenario: "now",
      scenarioRankingLabel: "Most unique",
      resolveCorpusPlace: id => (id === outside.id ? outside : undefined),
    });

    expect(candidates[0]?.place).toBe(outside);
  });
});
