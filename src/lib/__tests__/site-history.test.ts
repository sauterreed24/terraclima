import { describe, expect, it } from "vitest";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import { SITE_HISTORY, withSiteHistoryDeepSections } from "../../data/places.site-history";
import { composePlaceExperience } from "../place-overview";
import { mergeDeepSections } from "../place-appendix-sections";

describe("site-history overlay", () => {
  it("covers every corpus place with unique researched history", () => {
    const missing: string[] = [];
    for (const place of PLACES) {
      const entry = SITE_HISTORY[place.id];
      if (!entry) {
        missing.push(place.id);
        continue;
      }
      expect(entry.history.length, `${place.id} overview history`).toBeGreaterThanOrEqual(3);
      expect(entry.deep.length, `${place.id} deep history`).toBeGreaterThanOrEqual(3);
      expect(entry.deepTitle.trim().length, `${place.id} deepTitle`).toBeGreaterThan(3);
      expect(entry.deepTitle.length, `${place.id} deepTitle length`).toBeLessThanOrEqual(22);
      for (const para of entry.history) {
        expect(para.trim().length, `${place.id} history para`).toBeGreaterThan(80);
      }
      for (const para of entry.deep) {
        expect(para.trim().length, `${place.id} deep para`).toBeGreaterThan(80);
      }
      const overviewBlob = entry.history.join(" ");
      const deepBlob = entry.deep.join(" ");
      expect(deepBlob.slice(0, 80), `${place.id} deep duplicates overview`).not.toBe(overviewBlob.slice(0, 80));
    }
    expect(missing, `missing site history: ${missing.slice(0, 12).join(", ")}`).toEqual([]);
    expect(Object.keys(SITE_HISTORY)).toHaveLength(PLACES.length);
  });

  it("marks overlay history as authored on live places and yields to explicit experience.history", () => {
    const sequim = composePlaceExperience(PLACES_BY_ID["sequim-wa"]!);
    expect(sequim.historyAuthored).toBe(true);
    expect(sequim.historyParagraphs.join(" ")).toMatch(/Klallam|S'Klallam|Dungeness|lavender/i);

    const base = PLACES_BY_ID["yuma-az"]!;
    const authored = composePlaceExperience({
      ...base,
      experience: {
        history: ["AUTHORED history paragraph one is long enough.", "AUTHORED history paragraph two is also long enough."],
      },
    });
    expect(authored.historyParagraphs[0]).toMatch(/^AUTHORED history paragraph one/);
  });

  it("still isolates the derived read when experience is cleared", () => {
    const base = PLACES_BY_ID["yuma-az"]!;
    const derived = composePlaceExperience({ ...base, experience: undefined });
    expect(derived.authored).toBe(false);
    expect(derived.historyAuthored).toBe(false);
  });

  it("prepends a site-history dossier chapter without dropping curated sections", () => {
    const portal = PLACES_BY_ID["portal-az"]!;
    const enriched = withSiteHistoryDeepSections(portal, SITE_HISTORY[portal.id]);
    const merged = mergeDeepSections(enriched);
    expect(merged[0]?.id).toBe("portal-az-site-history");
    expect(merged.some(s => s.id === "portal-monsoon")).toBe(true);
  });
});
