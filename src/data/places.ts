// ============================================================
// Terraclima — Unified Places Corpus
// ============================================================

import type { Place } from "../types";
import { mergeDeepSections } from "../lib/place-appendix-sections";
import { PLACES_USA } from "./places.usa";
import { PLACES_CANADA } from "./places.canada";
import { PLACES_MEXICO } from "./places.mexico";

export const PLACES: Place[] = [
  ...PLACES_USA,
  ...PLACES_CANADA,
  ...PLACES_MEXICO,
];

export const PLACES_BY_ID: Record<string, Place> = Object.fromEntries(
  PLACES.map(p => [p.id, p]),
);

/**
 * Strip diacritics so "san jose" can match "San José" and "queretaro" can
 * match "Querétaro". Used both to build the search index and to fold the
 * runtime query before substring matching. NFD splits combining marks; the
 * regex drops them. Also lowercases for case-insensitive comparison.
 */
export function foldDiacritics(input: string): string {
  return input.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Precomputed runtime indexes.
 *
 * These are built once at module initialization so hot paths (search filter,
 * annual-precip formatting, card rendering) don't have to rebuild them on
 * every keystroke. This is the single largest interactive win on
 * memory-constrained hardware: search goes from O(places × prose length)
 * string concatenation per keystroke to an O(places) substring check.
 */
export const PLACE_SEARCH_INDEX: Record<string, string> = {};
export const PLACE_ANNUAL_PRECIP: Record<string, number> = {};

for (const p of PLACES) {
  const deepIdx = mergeDeepSections(p).map(s => `${s.title} ${s.paragraphs.join(" ")}`).join(" ");
  PLACE_SEARCH_INDEX[p.id] = foldDiacritics(
    p.name + " " +
    p.region + " " +
    (p.municipality ?? "") + " " +
    p.archetypes.join(" ") + " " +
    p.koppen + " " +
    (p.summaryShort ?? "") +
    " " + deepIdx,
  );
  PLACE_ANNUAL_PRECIP[p.id] = p.climate.annualPrecipMm ?? p.climate.precipMm.reduce((a, b) => a + b, 0);
}

export const PLACE_COUNTS = {
  total: PLACES.length,
  usa: PLACES_USA.length,
  canada: PLACES_CANADA.length,
  mexico: PLACES_MEXICO.length,
  tierA: PLACES.filter(p => p.tier === "A").length,
  tierB: PLACES.filter(p => p.tier === "B").length,
  tierC: PLACES.filter(p => p.tier === "C").length,
};
