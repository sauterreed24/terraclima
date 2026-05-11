import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { buildExplorerScoutBrief } from "../explorer-scout-brief";
import { rankPlaces } from "../scoring";

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
      "Precip spread",
      "Avg risk",
      "Dominant family",
    ]);
    expect(brief!.cautionLine.length).toBeGreaterThan(20);
  });

  it("returns null for an empty ranked set", () => {
    expect(buildExplorerScoutBrief([], "Hidden gems")).toBeNull();
  });
});
