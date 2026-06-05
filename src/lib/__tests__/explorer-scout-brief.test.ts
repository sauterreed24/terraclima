import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import type { RiskLevel } from "../../types";
import { makePlace } from "./test-fixtures";
import { buildExplorerScoutBrief } from "../explorer-scout-brief";
import { buildShortlistDecisionRows } from "../decision-matrix";
import { rankPlaces, type RankingResult } from "../scoring";

function risks(level: RiskLevel) {
  return {
    wildfire: { level },
    flood: { level },
    drought: { level },
    extremeHeat: { level },
    extremeCold: { level },
    smoke: { level },
    storm: { level },
    landslide: { level },
    coastal: { level },
  };
}

describe("buildExplorerScoutBrief", () => {
  it("summarizes the current ranked shortlist and preserves compare order", () => {
    const ranked = rankPlaces("hidden-gems", PLACES).slice(0, 8);

    const brief = buildExplorerScoutBrief(ranked, "Hidden gems");

    expect(brief).not.toBeNull();
    expect(brief!.leader.place.id).toBe(ranked[0].place.id);
    expect(brief!.compareIds).toEqual(ranked.slice(0, 4).map(row => row.place.id));
    expect(brief!.summary).toContain(ranked[0].place.name);
    expect(brief!.summary).toContain("Hidden gems");
    expect(brief!.metrics.map(metric => metric.label)).toEqual([
      "Summer highs",
      "Winter lows",
      "Easy months",
      "Place feel",
      "Precip spread",
      "Avg risk",
      "Dominant family",
    ]);
    expect(brief!.metrics.find(metric => metric.label === "Summer highs")!.value).toMatch(/°C$/);
    expect(brief!.decisionSignals.map(signal => signal.label)).toEqual([
      "Felt comfort",
      "Place feel",
      "Low risk load",
      "Garden / land",
      "Climate resilience",
      "Distinctive terrain",
    ]);
    expect(brief!.decisionRows).toHaveLength(5);
    expect(brief!.decisionRows[0]).toMatchObject({
      place: ranked[0].place,
      rank: 1,
      rankingScore: Math.round(ranked[0].score),
    });
    expect(brief!.decisionRows[0].bestFor).toMatch(/; .+ is the edge\./);
    expect(brief!.decisionRows[0].watch.length).toBeGreaterThan(6);
    expect(brief!.decisionLine).toContain("living signals");
    expect(brief!.cautionLine.length).toBeGreaterThan(20);
    expect(brief!.audienceRead.love).toContain(ranked[0].place.name);
    expect(brief!.audienceRead.pause.length).toBeGreaterThan(20);
    expect(brief!.nextStep).toMatchObject({
      label: "Scout next",
      place: ranked[0].place,
    });
    expect(brief!.nextStep.action).toContain(`Scout ${ranked[0].place.name}'s`);
    expect(brief!.nextStep.action).toContain(":");
    expect(brief!.nextStep.detail).toContain("First caveat:");
    expect(brief!.fieldCheck).toMatchObject({
      label: "Field check",
      place: ranked[0].place,
    });
    expect(brief!.fieldCheck.action.length).toBeGreaterThan(20);
    expect(["nearby-contrast", "local-contrast", "settlement-anchor", "derived"]).toContain(brief!.fieldCheck.source);
    expect(brief!.fieldCheck.detail.length).toBeGreaterThan(40);
  });

  it("shows which shortlisted place wins each living-priority signal", () => {
    const comfortTown = makePlace({
      id: "comfort-town",
      name: "Comfort Town",
      risks: risks("moderate"),
      scores: {
        hiddenGem: 40,
        microclimateUniqueness: 55,
        comfort: 96,
        resilience: 60,
        growability: 58,
        tradeoff: 35,
      },
    });
    const riskCove = makePlace({
      id: "risk-cove",
      name: "Risk Cove",
      risks: risks("very-low"),
      scores: {
        hiddenGem: 52,
        microclimateUniqueness: 60,
        comfort: 76,
        resilience: 70,
        growability: 63,
        tradeoff: 12,
      },
    });
    const gardenRidge = makePlace({
      id: "garden-ridge",
      name: "Garden Ridge",
      risks: risks("low"),
      scores: {
        hiddenGem: 65,
        microclimateUniqueness: 97,
        comfort: 74,
        resilience: 94,
        growability: 99,
        tradeoff: 25,
      },
    });
    const ranked: RankingResult[] = [
      { place: comfortTown, score: 93, note: "Comfort leader." },
      { place: riskCove, score: 89, note: "Risk leader." },
      { place: gardenRidge, score: 84, note: "Land leader." },
    ];

    const brief = buildExplorerScoutBrief(ranked, "Test rank");

    expect(brief!.decisionSignals.map(signal => [signal.label, signal.place.id])).toEqual([
      ["Felt comfort", "comfort-town"],
      ["Place feel", "garden-ridge"],
      ["Low risk load", "risk-cove"],
      ["Garden / land", "garden-ridge"],
      ["Climate resilience", "garden-ridge"],
      ["Distinctive terrain", "garden-ridge"],
    ]);
    expect(brief!.decisionLine).toContain("Garden Ridge");
    expect(brief!.decisionLine).toContain("4 of 6");
    expect(brief!.decisionRows.map(row => row.place.id)).toEqual(["comfort-town", "risk-cove", "garden-ridge"]);
    expect(brief!.decisionRows[0].decisionCue).toContain("Watch");
    expect(brief!.nextStep.action).toContain("Comfort Town");
    expect(brief!.nextStep.detail).toContain("Gardening window");
    expect(brief!.nextStep.detail).toContain("First caveat:");
    expect(brief!.nextStep.detail).toContain("Risk Cove");
  });

  it("turns authored nearby contrast into a scouting field check", () => {
    const leader = makePlace({
      id: "contrast-leader",
      name: "Contrast Leader",
      nearbyContrasts: [
        {
          label: "Lower basin",
          note: "Hotter and drier within a short drive.",
        },
      ],
      localContrast: [
        {
          radiusKm: 20,
          note: "Cooler along the ridge.",
        },
      ],
    });
    const ranked: RankingResult[] = [
      { place: leader, score: 91, note: "Contrast-aware leader." },
    ];

    const brief = buildExplorerScoutBrief(ranked, "Test rank")!;

    expect(brief.fieldCheck).toMatchObject({
      label: "Field check",
      place: leader,
      target: "Lower basin",
      source: "nearby-contrast",
    });
    expect(brief.fieldCheck.action).toBe("Compare Contrast Leader with Lower basin.");
    expect(brief.fieldCheck.detail).toContain("Hotter and drier within a short drive.");
    expect(brief.fieldCheck.detail).toContain("confirm the ranked climate signal");
  });

  it("translates active Fit Finder preferences into a who-fits / who-pauses read", () => {
    const coolGarden = makePlace({
      id: "cool-garden",
      name: "Cool Garden",
      relocationFit: ["gardeners"],
      scores: {
        hiddenGem: 62,
        microclimateUniqueness: 70,
        comfort: 88,
        resilience: 82,
        growability: 91,
        tradeoff: 20,
      },
    });
    const riskyGarden = makePlace({
      id: "risky-garden",
      name: "Risky Garden",
      relocationFit: ["gardeners"],
      risks: {
        ...risks("low"),
        wildfire: { level: "high" },
      },
      scores: {
        hiddenGem: 64,
        microclimateUniqueness: 75,
        comfort: 80,
        resilience: 78,
        growability: 94,
        tradeoff: 35,
      },
    });
    const ranked: RankingResult[] = [
      { place: coolGarden, score: 94, note: "Cool garden leader." },
      { place: riskyGarden, score: 87, note: "Riskier garden runner-up." },
    ];

    const brief = buildExplorerScoutBrief(
      ranked,
      "Test rank",
      { fitPresets: new Set(["cool-summers", "gardenable"]), maxSummerHighC: 26, minGrowability: 75 },
    )!;

    expect(brief.audienceRead.love).toContain("heat-sensitive movers");
    expect(brief.audienceRead.love).toContain("gardeners and land scouts");
    expect(brief.audienceRead.love).toContain("summer highs at or below 26°C");
    expect(brief.audienceRead.love).toContain("Cool Garden");
    expect(brief.audienceRead.pause).toContain("dossier");
  });

  it("returns null for an empty ranked set", () => {
    expect(buildExplorerScoutBrief([], "Hidden gems")).toBeNull();
  });

  it("annotates the summary when a future climate scenario is active", () => {
    const ranked = rankPlaces("hidden-gems", PLACES).slice(0, 5);
    const brief = buildExplorerScoutBrief(ranked, "Hidden gems", {}, "ssp585");
    expect(brief!.summary).toContain("SSP5-8.5");
    expect(brief!.summary).toContain("illustrative regional projection");
  });

  it("names the same top risk as the decision matrix when risk levels tie", () => {
    // wildfire + coastal both peak at "high". Their labels (Wildfire vs Coastal)
    // sort opposite to the corpus field order, so without a shared tiebreaker the
    // scout-brief caution and the decision-matrix watch line disagree.
    const place = makePlace({
      id: "tied-risk-bay",
      name: "Tied Risk Bay",
      risks: {
        wildfire: { level: "high" },
        flood: { level: "low" },
        drought: { level: "low" },
        extremeHeat: { level: "low" },
        extremeCold: { level: "low" },
        smoke: { level: "low" },
        storm: { level: "low" },
        landslide: { level: "low" },
        coastal: { level: "high" },
      },
    });
    const ranked = rankPlaces("hidden-gems", [place]);
    const brief = buildExplorerScoutBrief(ranked, "Hidden gems")!;
    const rows = buildShortlistDecisionRows(ranked);

    // decision-matrix breaks the tie by label → "Coastal".
    expect(rows[0].watch.toLowerCase()).toContain("coastal");
    // the scout-brief caution must agree, not pick the corpus-order-first axis.
    expect(brief.cautionLine.toLowerCase()).toContain("coastal");
    expect(brief.cautionLine.toLowerCase()).not.toContain("wildfire");
  });
});
