import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { buildCorpusCoverageReport, normalizeCoverageRegion } from "../corpus-coverage";

describe("corpus coverage helper", () => {
  it("normalizes common imported region variants", () => {
    expect(normalizeCoverageRegion("Mexico", "Estado de Mexico")).toBe("Estado de México");
    expect(normalizeCoverageRegion("Mexico", "Estado de México")).toBe("Estado de México");
    expect(normalizeCoverageRegion("Canada", "Quebec")).toBe("Québec");
    expect(normalizeCoverageRegion("Canada", "Québec")).toBe("Québec");
  });

  it("reports thinness by place, tier, country, and region", () => {
    const report = buildCorpusCoverageReport(PLACES);

    expect(report.places).toHaveLength(PLACES.length);
    expect(report.byTier.map(group => group.tier)).toEqual(["A", "B", "C"]);
    expect(report.byCountry.length).toBeGreaterThanOrEqual(3);
    expect(report.byRegion.length).toBeGreaterThan(20);
    expect(report.thinPlaces[0]?.thinness).toBeGreaterThanOrEqual(report.thinPlaces.at(-1)?.thinness ?? 0);
  });

  it("keeps Mexico State under one canonical region label", () => {
    expect(PLACES.filter(place => place.country === "Mexico" && place.region === "Estado de Mexico")).toHaveLength(0);
    const report = buildCorpusCoverageReport(PLACES);
    const mexicoStateRegions = report.byRegion.filter(group => group.country === "Mexico" && group.region === "Estado de México");

    expect(mexicoStateRegions).toHaveLength(1);
    expect(mexicoStateRegions[0]?.total).toBeGreaterThanOrEqual(2);
  });

  it("keeps the first promotion pack out of the thinnest-place queue", () => {
    const report = buildCorpusCoverageReport(PLACES);
    const promotedIds = new Set(["anchorage-ak", "beverly-shores-in", "bismarck-nd", "boone-nc", "charlottetown-pei"]);

    for (const id of promotedIds) {
      const place = report.places.find(row => row.id === id);
      expect(place).toBeDefined();
      expect(place?.missing).not.toContain("liveSignals");
      expect(place?.missing).not.toContain("deepSections");
      expect(place?.missing).not.toContain("multipleHttpsCitations");
    }
    const boone = report.places.find(row => row.id === "boone-nc");
    expect(boone?.missing).not.toContain("humidity");
    expect(boone?.missing).not.toContain("sunshinePct");
    const anchorage = report.places.find(row => row.id === "anchorage-ak");
    expect(anchorage?.missing).not.toContain("humidity");
    expect(anchorage?.missing).not.toContain("sunshinePct");
    expect(report.thinPlaces.slice(0, 12).some(place => promotedIds.has(place.id))).toBe(false);
  });
});
