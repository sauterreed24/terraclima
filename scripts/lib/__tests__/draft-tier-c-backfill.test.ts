import { describe, expect, it } from "vitest";
import { PLACES } from "../../src/data/places";
import { draftHumidityPct, draftSunshinePct } from "../lib/draft-climate-atmosphere";
import { draftDeepSections } from "../lib/draft-deep-section";

describe("draft-climate-atmosphere", () => {
  it("drafts 12-month humidity and sunshine within bounds", () => {
    const place = PLACES.find(p => p.id === "austin-tx")!;
    const hum = draftHumidityPct(place);
    const sun = draftSunshinePct(place);
    expect(hum).toHaveLength(12);
    expect(sun).toHaveLength(12);
    for (const v of hum) expect(v).toBeGreaterThanOrEqual(10);
    for (const v of hum) expect(v).toBeLessThanOrEqual(98);
    for (const v of sun) expect(v).toBeGreaterThanOrEqual(12);
    for (const v of sun) expect(v).toBeLessThanOrEqual(92);
  });
});

describe("draft-deep-section", () => {
  it("drafts two auditable sections with minimum paragraph length", () => {
    const place = PLACES.find(p => p.id === "spokane-wa")!;
    const sections = draftDeepSections(place);
    expect(sections).toHaveLength(2);
    for (const s of sections) {
      expect(s.id.length).toBeGreaterThan(3);
      expect(s.title.length).toBeGreaterThan(5);
      expect(s.paragraphs.length).toBeGreaterThanOrEqual(2);
      for (const p of s.paragraphs) expect(p.length).toBeGreaterThanOrEqual(80);
    }
  });
});
