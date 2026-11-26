// ============================================================
// Terraclima — counts from a place's profile-only fields
// ============================================================
// Atlas places do not carry their sources, chapters or outlook (they load with
// the profile). Rankings and lists only need a few figures from them, which
// ship here in a small generated table (`npm run corpus:profile-stats`). A place
// that does carry the fields (an open profile, Compare, tests) answers from them.
// ============================================================

import statsJson from "../data/profile-extras/stats.json";
import type { Place } from "../types";
import type { ProfileStatsRow } from "./profile-stats-compute";

const STATS = statsJson as unknown as Record<string, ProfileStatsRow>;

type Counted = Pick<Place, "id" | "citations" | "deepSections" | "climateChange">;

export function citationCount(place: Counted): number {
  return place.citations?.length ?? STATS[place.id]?.[0] ?? 0;
}

export function httpsCitationCount(place: Counted): number {
  return place.citations
    ? place.citations.filter(c => c.url?.startsWith("https://")).length
    : STATS[place.id]?.[1] ?? 0;
}

/** Authored In depth chapters (the site-history chapter is counted separately). */
export function deepSectionCount(place: Counted): number {
  return place.deepSections?.length ?? STATS[place.id]?.[2] ?? 0;
}

export function outlook2050(place: Counted): string | null {
  return place.climateChange?.outlook2050 ?? (STATS[place.id]?.[3] || null);
}
