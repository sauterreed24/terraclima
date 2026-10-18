import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { SITE_HISTORY } from "../../data/places.site-history";
import { chapterCountLabel, hasThinChapterDepth, researchedChapterCount } from "../research-chapters";

describe("researched chapter count", () => {
  it("counts authored deep sections plus the site-history chapter every place carries", () => {
    for (const place of PLACES) {
      expect(SITE_HISTORY[place.id]?.deep.length, place.id).toBeGreaterThan(0);
      expect(researchedChapterCount(place)).toBe((place.deepSections?.length ?? 0) + 1);
    }
  });

  it("flags places whose only researched reading is the site history", () => {
    const thin = PLACES.find(p => !p.deepSections?.length)!;
    const deep = PLACES.find(p => (p.deepSections?.length ?? 0) >= 2)!;
    expect(hasThinChapterDepth(thin)).toBe(true);
    expect(hasThinChapterDepth(deep)).toBe(false);
    expect(chapterCountLabel(1)).toBe("1 researched chapter");
    expect(chapterCountLabel(3)).toBe("3 researched chapters");
  });

  it("ships no templated filler chapters", () => {
    for (const place of PLACES) {
      for (const section of place.deepSections ?? []) {
        expect(section.id, place.id).not.toMatch(/-(?:terrain-mechanism|risk-and-ground-truth)$/);
      }
    }
  });
});
