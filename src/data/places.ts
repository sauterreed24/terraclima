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

export const PLACE_ID_ALIASES: Record<string, string> = {
  "san-miguel-mx": "san-miguel-de-allende-mx",
  "parras-mx": "parras-de-la-fuente-mx",
};

export function resolvePlaceId(id: string | null | undefined): string | null {
  if (!id) return null;
  const canonical = PLACE_ID_ALIASES[id] ?? id;
  return Object.prototype.hasOwnProperty.call(PLACES_BY_ID, canonical) ? canonical : null;
}

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
 * Runtime indexes.
 *
 * Annual precipitation stays eager because it is a small numeric lookup used
 * across cards, ranking, and detail panels. Full-prose search text is lazy:
 * building it walks derived deep sections for every place, so doing that at
 * module initialization hurts cold Explorer load even when the user never
 * searches. App warms it opportunistically after first paint.
 */
const PLACE_SEARCH_TEXT = new WeakMap<Place, string>();
export const PLACE_ANNUAL_PRECIP: Record<string, number> = {};

for (const p of PLACES) {
  PLACE_ANNUAL_PRECIP[p.id] = p.climate.annualPrecipMm ?? p.climate.precipMm.reduce((a, b) => a + b, 0);
}

function runtimeNowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function getPlaceSearchText(place: Place): string {
  const cached = PLACE_SEARCH_TEXT.get(place);
  if (cached !== undefined) return cached;

  const deepIdx = mergeDeepSections(place).map(s => `${s.title} ${s.paragraphs.join(" ")}`).join(" ");
  const settlementsIdx = (place.settlementsWithinZone ?? [])
    .map(s => `${s.name} ${s.role} ${s.population ?? ""} ${s.note ?? ""}`)
    .join(" ");
  const activitiesIdx = (place.thingsToDo ?? [])
    .map(a => `${a.label} ${a.kind} ${a.season ?? ""} ${a.note ?? ""}`)
    .join(" ");
  const citationsIdx = place.citations.map(c => `${c.label} ${c.kind} ${c.note ?? ""}`).join(" ");
  const text = foldDiacritics(
    place.name + " " +
    place.region + " " +
    (place.municipality ?? "") + " " +
    place.archetypes.join(" ") + " " +
    place.drivers.join(" ") + " " +
    place.koppen + " " +
    (place.summaryShort ?? "") +
    " " + place.summaryImmersive +
    " " + place.whyDistinct +
    " " + place.relocationFit.join(" ") +
    " " + place.travelFit.join(" ") +
    " " + place.whoWouldLove +
    " " + place.whoMightNot +
    " " + (place.confidenceNotes ?? "") +
    " " + settlementsIdx +
    " " + activitiesIdx +
    " " + citationsIdx +
    " " + deepIdx,
  );
  PLACE_SEARCH_TEXT.set(place, text);
  return text;
}

export function warmPlaceSearchIndex(
  places: readonly Place[] = PLACES,
  startIndex = 0,
  budgetMs = 6,
): number {
  const start = runtimeNowMs();
  let i = Math.max(0, startIndex);
  while (i < places.length) {
    getPlaceSearchText(places[i]!);
    i += 1;
    if (runtimeNowMs() - start >= budgetMs) break;
  }
  return i;
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
