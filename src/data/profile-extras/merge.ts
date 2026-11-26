// ============================================================
// Terraclima — put a place's profile-only fields back on it
// ============================================================
// The same steps the atlas used to run at start-up for every place, now run
// for one place when its profile, Compare or an export needs it:
//   1. authored fields; In depth chapters fall back to the Tier C polish;
//   2. polish citations appended, never repeating a URL already cited;
//   3. the research citation projection first, then authored citations whose
//      URL it does not already carry.
// ============================================================

import type { Citation, Place } from "../../types";
import type { AuthoredProfileExtras, PolishProfileFields } from "./types";

export function mergeProfileExtras(
  place: Place,
  authored: AuthoredProfileExtras | undefined,
  polish: PolishProfileFields | undefined,
  researchCitations: readonly Citation[] | undefined,
): Place {
  if (!authored) return place;
  let citations = authored.citations;
  if (polish?.additionalCitations) {
    const existingUrls = new Set(citations.map(c => c.url ?? ""));
    citations = [...citations, ...polish.additionalCitations.filter(c => !existingUrls.has(c.url ?? ""))];
  }
  if (researchCitations?.length) {
    const projectedUrls = new Set(researchCitations.map(c => (c.url ?? "").toLowerCase()));
    const authoredExtras = citations.filter(c => {
      const url = (c.url ?? "").toLowerCase();
      return !url || !projectedUrls.has(url);
    });
    citations = [...researchCitations, ...authoredExtras];
  }
  const deepSections = authored.deepSections ?? polish?.deepSections;
  return {
    ...place,
    climateChange: authored.climateChange,
    ...(authored.confidenceNotes !== undefined ? { confidenceNotes: authored.confidenceNotes } : {}),
    citations,
    ...(deepSections !== undefined ? { deepSections } : {}),
  };
}
