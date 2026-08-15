import type { Place, PlaceDeepSection } from "../../types";
import type { SiteHistoryEntry } from "./types";

export function siteHistoryDeepSection(placeId: string, entry: SiteHistoryEntry): PlaceDeepSection {
  return {
    id: `${placeId}-site-history`,
    title: entry.deepTitle,
    paragraphs: [...entry.deep],
  };
}

export function hasSiteHistorySection(sections: readonly PlaceDeepSection[] | undefined, placeId: string): boolean {
  return (sections ?? []).some(s => s.id === `${placeId}-site-history` || /(?:^|-)site-history$/.test(s.id));
}

/**
 * Prepend the researched site-history dossier chapter. Existing curated
 * history chapters win; this never overwrites them.
 */
export function withSiteHistoryDeepSections(
  place: Place,
  entry: SiteHistoryEntry | undefined,
): Place {
  if (!entry?.deep.length) return place;
  if (hasSiteHistorySection(place.deepSections, place.id)) return place;
  return {
    ...place,
    deepSections: [siteHistoryDeepSection(place.id, entry), ...(place.deepSections ?? [])],
  };
}
