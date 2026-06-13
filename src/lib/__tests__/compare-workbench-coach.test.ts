import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { buildCompareDecisionProfiles, type CompareDecisionProfile } from "../compare-finalist-verdict";
import { buildCompareCandidateSwapInsight, buildCompareCoachRecommendations } from "../compare-workbench-coach";

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

  it("explains why an inactive candidate is worth swapping into the active set", () => {
    const activeProfiles: CompareDecisionProfile[] = [
      {
        place: PLACES[0]!,
        liveFitScore: 54,
        livabilityScore: 55,
        feltComfort: 56,
        livedEase: 50,
        easyMonths: 5,
        riskLoad: 38,
      },
      {
        place: PLACES[1]!,
        liveFitScore: 58,
        livabilityScore: 58,
        feltComfort: 59,
        livedEase: 54,
        easyMonths: 6,
        riskLoad: 34,
      },
    ];
    const candidateProfile: CompareDecisionProfile = {
      place: PLACES[2]!,
      liveFitScore: 82,
      livabilityScore: 80,
      feltComfort: 76,
      livedEase: 78,
      easyMonths: 9,
      riskLoad: 21,
    };

    const insight = buildCompareCandidateSwapInsight({
      activeProfiles,
      candidateProfile,
      lens: "move",
    });

    expect(insight.label).toBe("Move upgrade");
    expect(insight.tone).toBe("upgrade");
    expect(insight.detail).toContain("active move read");
    expect(insight.score).toBeGreaterThan(0);
  });
});
