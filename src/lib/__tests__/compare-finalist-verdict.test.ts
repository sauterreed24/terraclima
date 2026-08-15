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
    expect(read?.scoutSequence.map(step => step.label)).toEqual(["Start here", "Counterweight", "Risk check"]);
    expect(read?.scoutSequence.map(step => step.place.name)).toEqual(["Broad Town", "Quiet Basin", "Heat Bluff"]);
    expect(read?.scoutSequence[0].visitWindow).toContain("Gardening window");
    expect(read?.scoutSequence[0].why).toContain("Best all-around finalist");
    expect(read?.scoutSequence[2].caveat).toContain("Risk load: 42/100");
    expect(read?.verificationChecklist.map(item => item.label)).toEqual([
      "Scout window",
      "Tradeoff check",
      "Hazard check",
      "Daily-life friction",
      "Source gap",
    ]);
    expect(read?.verificationChecklist[0]).toMatchObject({
      place: broad.place,
      tone: "book",
    });
    expect(read?.verificationChecklist[1]).toMatchObject({
      place: lowerRisk.place,
      tone: "book",
    });
    expect(read?.verificationChecklist[2]).toMatchObject({
      place: highRisk.place,
      tone: "verify",
    });
    expect(read?.verificationChecklist[3].proof).toContain("70/100 lived-ease read");
    expect(read?.verificationChecklist[4].proof).toContain("second HTTPS source");
    expect(read?.lanes.map(lane => lane.label)).toEqual(["Broadest fit", "Lowest risk", "Comfort leader", "Garden edge"]);
    expect(read?.tableRows.map(row => row.role)).toEqual(["Start here", "Counterweight", "Risk check"]);
    expect(read?.tableRows.map(row => row.place.name)).toEqual(["Broad Town", "Quiet Basin", "Heat Bluff"]);
    expect(read?.tableRows[0]).toMatchObject({
      decisionScore: blendedCompareScore(broad),
      fitSummary: "92/100 fit · 8/12 easy months",
      riskSummary: "28/100 risk",
    });
    expect(read?.tableRows[2].watch).toContain("Risk load: 42/100");
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

  it("keeps the scouting sequence unique and bounded for real finalists", () => {
    const read = buildCompareDecisionRead(buildCompareDecisionProfiles(PLACES.slice(0, 4)));

    expect(read?.scoutSequence.length).toBeGreaterThanOrEqual(2);
    expect(read?.scoutSequence.length).toBeLessThanOrEqual(3);
    expect(new Set(read?.scoutSequence.map(step => step.place.id)).size).toBe(read?.scoutSequence.length);
    expect(read?.scoutSequence.every(step => step.visitWindow.length > 0)).toBe(true);
    expect(read?.scoutSequence.every(step => step.caveat.length > 0)).toBe(true);
    expect(read?.verificationChecklist.length).toBeGreaterThanOrEqual(4);
    expect(read?.verificationChecklist.every(item => item.action.length > 0)).toBe(true);
    expect(read?.verificationChecklist.every(item => item.proof.length > 0)).toBe(true);
    expect(read?.tableRows).toHaveLength(4);
    expect(read?.tableRows.every(row => row.fitSummary.includes("/100 fit"))).toBe(true);
    expect(read?.tableRows.every(row => row.riskSummary.includes("/100 risk"))).toBe(true);
    expect(read?.tableRows.every(row => row.visitWindow.length > 0)).toBe(true);
    expect(read?.tableRows.every(row => row.watch.length > 0)).toBe(true);
  });

  it("builds decision profiles from the real corpus and active Live Finder filters", () => {
    const profiles = buildCompareDecisionProfiles(PLACES.slice(0, 2), { maxSummerHighC: 22 });

    expect(profiles).toHaveLength(2);
    expect(profiles[0].place.id).toBe(PLACES[0].id);
    expect(profiles.every(row => row.liveFitScore >= 0 && row.liveFitScore <= 100)).toBe(true);
    expect(profiles.every(row => row.riskLoad >= 0 && row.riskLoad <= 100)).toBe(true);
  });

  it("does not treat Daymet solar as a missing sunshine-normal gap", () => {
    const sequim = PLACES.find(place => place.id === "sequim-wa")!;
    const yuma = PLACES.find(place => place.id === "yuma-az")!;
    const forks = PLACES.find(place => place.id === "forks-wa")!;
    const read = buildCompareDecisionRead(buildCompareDecisionProfiles([sequim, yuma, forks]));
    const sourceGap = read?.verificationChecklist.find(item => item.id === "source-gap");

    expect(sourceGap?.proof).not.toMatch(/sunshine normals/i);
  });
});
