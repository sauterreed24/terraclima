import type { Place } from "../types";

/**
 * Researched reading chapters a place carries: its authored `deepSections`
 * plus the site-history chapter every place has (src/data/site-history;
 * site-history.test.ts holds that coverage). Chapters derived from the
 * record's own fields (place-appendix-sections.ts) are not research and are
 * not counted.
 */
export function researchedChapterCount(place: Place): number {
  return (place.deepSections?.length ?? 0) + 1;
}

/** Fewer than two means the site-history chapter is the only researched reading. */
export function hasThinChapterDepth(place: Place): boolean {
  return researchedChapterCount(place) < 2;
}

export function chapterCountLabel(count: number): string {
  return `${count} researched chapter${count === 1 ? "" : "s"}`;
}
