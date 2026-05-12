import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import type { RiskLevel } from "../../types";
import { makePlace } from "./test-fixtures";
import { buildExplorerScoutBrief } from "../explorer-scout-brief";
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
  });

  it("returns null for an empty ranked set", () => {
    expect(buildExplorerScoutBrief([], "Hidden gems")).toBeNull();
  });
});
