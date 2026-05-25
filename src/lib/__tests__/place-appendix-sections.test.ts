import { describe, expect, it } from "vitest";
import { makeClimate, makePlace } from "./test-fixtures";
import type { Monthly12 } from "../../types";
import { buildDerivedDeepSections, mergeDeepSections } from "../place-appendix-sections";

const monthly = (...values: number[]): Monthly12 => values as unknown as Monthly12;

describe("place appendix sections", () => {
  it("preserves authored deep sections and appends derived sections without duplicate ids", () => {
    const place = makePlace({
      deepSections: [
        {
          id: "appendix-ground-garden",
          title: "Authored garden read",
          paragraphs: ["Curator-authored soil context stays first."],
        },
      ],
    });

    const sections = mergeDeepSections(place);

    expect(sections[0]).toMatchObject({
      id: "appendix-ground-garden",
      title: "Authored garden read",
    });
    expect(sections.filter(section => section.id === "appendix-ground-garden")).toHaveLength(1);
    expect(sections.map(section => section.id)).toContain("appendix-season-pocket");
    expect(sections.map(section => section.id)).toContain("appendix-scouting-diligence");
  });

  it("derives season rhythm, snow, and frost-free notes from monthly normals", () => {
    const place = makePlace({
      climate: makeClimate({
        precipMm: monthly(90, 82, 70, 55, 35, 20, 12, 14, 24, 48, 76, 96),
        snowCm: monthly(24, 18, 8, 0, 0, 0, 0, 0, 0, 2, 10, 22),
        frostFreeDays: 146,
        annualPrecipMm: 622,
      }),
    });

    const season = buildDerivedDeepSections(place).find(section => section.id === "appendix-season-pocket");

    expect(season).toBeTruthy();
    expect(season?.paragraphs.join(" ")).toMatch(/wettest signal in Dec/i);
    expect(season?.paragraphs.join(" ")).toMatch(/driest stretch around Jul/i);
    expect(season?.paragraphs.join(" ")).toMatch(/Snow shows in normals across Jan, Feb, Mar/i);
    expect(season?.paragraphs.join(" ")).toMatch(/about 146/i);
  });

  it("builds nearby contrast chapters only from curated local and nearby contrast fields", () => {
    const place = makePlace({
      localContrast: [
        { radiusKm: 20, note: "South-facing slopes run warmer and drier than the shaded creek bottoms." },
        { radiusKm: 45, note: "A higher bench keeps late snow while the town floor greens first." },
      ],
      nearbyContrasts: [
        { label: "Valley floor", note: "Hotter afternoons and weaker night recovery." },
        { label: "Ridge crest", note: "Windier, colder, and more exposed in storms." },
      ],
    });

    const nearby = buildDerivedDeepSections(place).find(section => section.id === "appendix-nearby-differences");

    expect(nearby).toBeTruthy();
    expect(nearby?.paragraphs).toHaveLength(3);
    expect(nearby?.paragraphs[0]).toContain("Within roughly 20 km");
    expect(nearby?.paragraphs[2]).toContain("Valley floor");
  });

  it("orders scouting risk diligence by severity before low-note richness", () => {
    const base = makePlace();
    const place = makePlace({
      risks: {
        ...base.risks,
        drought: { level: "high", note: "Irrigation cutoffs matter in dry years." },
        smoke: { level: "elevated", note: "Regional smoke can pool during stagnant late-summer nights." },
        flood: { level: "low", note: "Flood exposure is localized to the creek bottom." },
      },
    });

    const scouting = buildDerivedDeepSections(place).find(section => section.id === "appendix-scouting-diligence");
    const diligence = scouting?.paragraphs.find(paragraph => paragraph.startsWith("Risk diligence"));

    expect(diligence).toBeTruthy();
    expect(diligence).toContain("Drought (high)");
    expect(diligence).toContain("Smoke / air quality (elevated)");
    expect(diligence).toContain("Flood (low)");
    expect(diligence?.indexOf("Drought (high)")).toBeLessThan(diligence?.indexOf("Smoke / air quality (elevated)") ?? Infinity);
    expect(diligence?.indexOf("Smoke / air quality (elevated)")).toBeLessThan(diligence?.indexOf("Flood (low)") ?? Infinity);
  });

  it("omits optional nearby contrast chapters when the place has no contrast fields", () => {
    const place = makePlace({ localContrast: undefined, nearbyContrasts: undefined });

    expect(buildDerivedDeepSections(place).map(section => section.id)).not.toContain("appendix-nearby-differences");
  });
});
