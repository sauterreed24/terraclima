import { describe, expect, it } from "vitest";
// Chapters load with the profile; the full list carries them for every place.
import { PLACES_FULL as PLACES, PLACES_FULL_BY_ID as PLACES_BY_ID } from "../../data/places.full";
import { SITE_HISTORY, withSiteHistoryDeepSections } from "../../data/places.site-history";
import { composePlaceExperience } from "../place-overview";
import { mergeDeepSections } from "../place-appendix-sections";
import { SITE_HISTORY_GROUP_BY_ID } from "../../data/site-history/group-index";
import * as groups from "../../data/site-history/registry";

describe("site-history per-profile loading", () => {
  it("the id → file index matches the files exactly", async () => {
    const files = ["usa-1", "usa-2", "usa-3", "usa-4", "usa-5", "usa-6", "canada-1", "canada-2", "mexico-1", "mexico-2"] as const;
    const actual: Record<string, string> = {};
    for (const f of files) {
      const mod = await import(`../../data/site-history/${f}.ts`) as Record<string, Record<string, unknown>>;
      for (const id of Object.keys(Object.values(mod)[0]!)) actual[id] = f;
    }
    // If this fails, regenerate group-index.ts from the files (one line per id).
    expect(SITE_HISTORY_GROUP_BY_ID).toEqual(actual);
  });

  it("loads the entry for a place and serves it synchronously afterwards", async () => {
    const id = "bishop-ca";
    const entry = await groups.loadSiteHistory(id);
    expect(entry).toBe(SITE_HISTORY[id]);
    expect(groups.siteHistoryFor(id)).toBe(SITE_HISTORY[id]);
    const thenable = groups.siteHistoryThenable(id) as Promise<unknown> & { status?: string };
    expect(thenable.status).toBe("fulfilled");
    expect(groups.siteHistoryThenable(id)).toBe(thenable);
    expect(groups.siteHistoryFor("not-a-place")).toBeNull();
    expect(await groups.loadSiteHistory("not-a-place")).toBeNull();
  });
});

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
