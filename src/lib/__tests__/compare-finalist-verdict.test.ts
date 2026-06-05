import { describe, expect, it } from "vitest";
import {
  blendedCompareScore,
  buildCompareDecisionProfiles,
  buildCompareDecisionRead,
  type CompareDecisionProfile,
} from "../compare-finalist-verdict";
import { PLACES } from "../../data/places";
import { makePlace } from "./test-fixtures";

function profile(
  name: string,
  overrides: Partial<Omit<CompareDecisionProfile, "place">> & {
    growability?: number;
    id?: string;
  },
): CompareDecisionProfile {
  const id = overrides.id ?? name.toLowerCase().replace(/\s+/g, "-");
  return {
    place: makePlace({
      id,
      name,
      scores: {
        hiddenGem: 60,
        microclimateUniqueness: 60,
        comfort: 70,
        resilience: 70,
        growability: overrides.growability ?? 70,
        tradeoff: 30,
      },
    }),
    liveFitScore: overrides.liveFitScore ?? 75,
    livabilityScore: overrides.livabilityScore ?? 75,
    feltComfort: overrides.feltComfort ?? 75,
    livedEase: overrides.livedEase ?? 75,
    easyMonths: overrides.easyMonths ?? 7,
    riskLoad: overrides.riskLoad ?? 25,
  };
}

describe("compare finalist verdict", () => {
  it("names the broadest finalist, counterweight, caution, and next dossier action", () => {
    const broad = profile("Broad Town", {
      liveFitScore: 92,
      livabilityScore: 88,
      feltComfort: 84,
      livedEase: 86,
      riskLoad: 28,
      growability: 76,
      easyMonths: 8,
    });
    const lowerRisk = profile("Quiet Basin", {
      liveFitScore: 80,
      livabilityScore: 80,
      feltComfort: 78,
      livedEase: 78,
      riskLoad: 10,
      growability: 72,
      easyMonths: 7,
    });
    const highRisk = profile("Heat Bluff", {
      liveFitScore: 70,
      livabilityScore: 72,
      feltComfort: 68,
      livedEase: 70,
      riskLoad: 42,
      growability: 68,
      easyMonths: 6,
    });

    const read = buildCompareDecisionRead([lowerRisk, highRisk, broad]);

    expect(read?.primary.place.name).toBe("Broad Town");
    expect(read?.counterweight).toMatchObject({ label: "Lower risk", place: lowerRisk.place });
    expect(read?.summary).toContain("Broad Town is the first finalist to pressure-test");
    expect(read?.summary).toContain("Quiet Basin is the counterweight");
    expect(read?.caution).toContain("Heat Bluff carries the heaviest risk load");
    expect(read?.nextAction).toContain("Open Broad Town's dossier first");
    expect(read?.lanes.map(lane => lane.label)).toEqual(["Broadest fit", "Lowest risk", "Comfort leader", "Garden edge"]);
  });

  it("uses stable name/id tie-breakers for equal blended scores", () => {
    const beta = profile("Beta Place", { id: "b", liveFitScore: 80, livabilityScore: 80, feltComfort: 80, livedEase: 80, riskLoad: 20 });
    const alpha = profile("Alpha Place", { id: "a", liveFitScore: 80, livabilityScore: 80, feltComfort: 80, livedEase: 80, riskLoad: 20 });

    expect(blendedCompareScore(alpha)).toBe(blendedCompareScore(beta));
    expect(buildCompareDecisionRead([beta, alpha])?.primary.place.id).toBe("a");
  });

  it("returns no verdict until at least two places are saved", () => {
    expect(buildCompareDecisionRead([profile("Solo Place", {})])).toBeNull();
  });

  it("builds decision profiles from the real corpus and active Live Finder filters", () => {
    const profiles = buildCompareDecisionProfiles(PLACES.slice(0, 2), { maxSummerHighC: 22 });

    expect(profiles).toHaveLength(2);
    expect(profiles[0].place.id).toBe(PLACES[0].id);
    expect(profiles.every(row => row.liveFitScore >= 0 && row.liveFitScore <= 100)).toBe(true);
    expect(profiles.every(row => row.riskLoad >= 0 && row.riskLoad <= 100)).toBe(true);
  });
});
