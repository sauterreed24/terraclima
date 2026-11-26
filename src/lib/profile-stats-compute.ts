import type { Place } from "../types";

/** [citations, https citations, In depth chapters, 2050 outlook] per place id. */
export type ProfileStatsRow = [number, number, number, string];

export function computeProfileStats(places: readonly Place[]): Record<string, ProfileStatsRow> {
  return Object.fromEntries(places.map(p => {
    const citations = p.citations ?? [];
    return [p.id, [
      citations.length,
      citations.filter(c => c.url?.startsWith("https://")).length,
      p.deepSections?.length ?? 0,
      p.climateChange?.outlook2050 ?? "",
    ]];
  }));
}

import { SITE_HISTORY_GROUP_BY_ID } from "../data/site-history/group-index";

/** A place's finished profile-only fields, keys present only when the place has them. */
export type ProfileFields = Pick<Place, "citations" | "confidenceNotes" | "climateChange" | "deepSections">;

export function profileFieldsOf(place: Place): ProfileFields {
  const out: ProfileFields = {};
  if (place.citations !== undefined) out.citations = place.citations;
  if (place.confidenceNotes !== undefined) out.confidenceNotes = place.confidenceNotes;
  if (place.climateChange !== undefined) out.climateChange = place.climateChange;
  if (place.deepSections !== undefined) out.deepSections = place.deepSections;
  return out;
}

/** Fields grouped like the site-history files (≈23 places a file). */
export function computeProfileFieldGroups(places: readonly Place[]): Record<string, Record<string, ProfileFields>> {
  const groups: Record<string, Record<string, ProfileFields>> = {};
  for (const place of places) {
    const group = SITE_HISTORY_GROUP_BY_ID[place.id];
    if (!group) throw new Error(`${place.id} has no site-history group`);
    (groups[group] ??= {})[place.id] = profileFieldsOf(place);
  }
  return groups;
}
