import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { buildCompareDecisionProfiles } from "../compare-finalist-verdict";
import { buildCompareCoachRecommendations } from "../compare-workbench-coach";

describe("compare workbench coach", () => {
  it("recommends unique inactive candidates for a crowded workbench tray", () => {
    const activePlaces = PLACES.slice(0, 4);
    const candidateProfiles = buildCompareDecisionProfiles(PLACES.slice(0, 10));
    const activeIds = new Set(activePlaces.map(place => place.id));

    const recommendations = buildCompareCoachRecommendations({
      activePlaces,
      candidateProfiles,
      lens: "risk",
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBeLessThanOrEqual(3);
    expect(new Set(recommendations.map(row => row.place.id)).size).toBe(recommendations.length);
    expect(recommendations.every(row => !activeIds.has(row.place.id))).toBe(true);
    expect(recommendations.map(row => row.lane)).toContain("lens");
    expect(recommendations.some(row => row.metric.length > 0 && row.detail.length > 0)).toBe(true);
  });

  it("returns no recommendations when every candidate is already active", () => {
    const activePlaces = PLACES.slice(0, 4);
    const candidateProfiles = buildCompareDecisionProfiles(activePlaces);

    expect(buildCompareCoachRecommendations({
      activePlaces,
      candidateProfiles,
      lens: "balanced",
    })).toEqual([]);
  });
});
