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
    expect(season?.paragraphs.join(" ")).toMatch(/Rain peaks sharply around Dec/i);
    expect(season?.paragraphs.join(" ")).toMatch(/bottoms out around Jul/i);
    expect(season?.paragraphs.join(" ")).toMatch(/Snow turns up in the normals in Jan, Feb, Mar/i);
    expect(season?.paragraphs.join(" ")).toMatch(/about 146/i);
  });

  it("leaves nearby contrasts to the Overview and Local contrast sections", () => {
    const place = makePlace({
      localContrast: [
        { radiusKm: 20, note: "South-facing slopes run warmer and drier than the shaded creek bottoms." },
      ],
      nearbyContrasts: [
        { label: "Valley floor", note: "Hotter afternoons and weaker night recovery." },
      ],
    });

    expect(buildDerivedDeepSections(place).map(section => section.id)).not.toContain("appendix-nearby-differences");
  });

  it("hides the templated overlay chapters from the reading", () => {
    const place = makePlace({
      id: "demo",
      deepSections: [
        { id: "demo-site-history", title: "Rail and timber", paragraphs: ["Researched history."] },
        { id: "demo-terrain-mechanism", title: "Elevation, airflow, and the Dfb classification here", paragraphs: ["Template."] },
        { id: "demo-risk-and-ground-truth", title: "Housing, access, and who this place actually fits", paragraphs: ["Template."] },
      ],
    });

    const ids = mergeDeepSections(place).map(section => section.id);
    expect(ids[0]).toBe("demo-site-history");
    expect(ids).not.toContain("demo-terrain-mechanism");
    expect(ids).not.toContain("demo-risk-and-ground-truth");
  });

  it("does not read a missing snowfall series as no snow in a cold winter", () => {
    const place = makePlace({
      climate: makeClimate({
        tempHighC: monthly(-9, -6, 1, 10, 18, 23, 26, 25, 18, 10, 0, -7),
        tempLowC: monthly(-20, -18, -11, -2, 4, 10, 13, 11, 6, 0, -8, -16),
        snowCm: undefined,
      }),
    });

    const text = buildDerivedDeepSections(place).find(section => section.id === "appendix-season-pocket")?.paragraphs.join(" ") ?? "";
    expect(text).toMatch(/no monthly snowfall series/);
    expect(text).toMatch(/expect a real snow season/);
    expect(text).not.toMatch(/minor or absent|little or no part/);
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
});
