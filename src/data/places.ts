// ============================================================
// Terraclima — Unified Places Corpus
// ============================================================

import type { Place } from "../types";
import { mergeDeepSections } from "../lib/place-appendix-sections";
import { PLACES_USA } from "./places.usa";
import { PLACES_CANADA } from "./places.canada";
import { PLACES_MEXICO } from "./places.mexico";
import { TIER_C_POLISH, TIER_C_POLISH_GENERATED, TIER_C_POLISH_SOURCES } from "./places.tier-c-polish";

const TIER_C_POLISH_ALL: Record<string, typeof TIER_C_POLISH[keyof typeof TIER_C_POLISH]> = {
  ...TIER_C_POLISH,
  ...TIER_C_POLISH_GENERATED,
};

// Layer the targeted source-additions on top of the merged polish map.
// Places without an existing polish entry get a minimal entry that only
// carries the additional sources; places with an existing entry get the
// sources appended via the liveSignalsAdditionalSources field.
for (const [id, sources] of Object.entries(TIER_C_POLISH_SOURCES)) {
  const existing = TIER_C_POLISH_ALL[id];
  TIER_C_POLISH_ALL[id] = {
    ...existing,
    liveSignalsAdditionalSources: [
      ...(existing?.liveSignalsAdditionalSources ?? []),
      ...sources,
    ],
  };
}

/**
 * Apply Tier C polish (humidity, sunshinePct, liveSignals, deepSections,
 * additional citations) into a base authored place. Polish is layered
 * *under* the authored fields so any hand-curated value in the original
 * data files wins. Citations and liveSignals sources are concatenated
 * (authored first, polish second) with URL de-duplication so the polish
 * never introduces a duplicate citation URL.
 */
function applyPolish(p: Place): Place {
  const polish = TIER_C_POLISH_ALL[p.id];
  if (!polish) return p;
  const climate = polish.climate
    ? {
        ...p.climate,
        ...(polish.climate.humidity != null && p.climate.humidity == null
          ? { humidity: polish.climate.humidity }
          : {}),
        ...(polish.climate.sunshinePct != null && p.climate.sunshinePct == null
          ? { sunshinePct: polish.climate.sunshinePct }
          : {}),
      }
    : p.climate;

  // liveSignals: prefer the authored value. If the authored value exists
  // but the polish supplies additional sources, merge them in (URL-deduped).
  let liveSignals = p.liveSignals ?? polish.liveSignals;
  if (p.liveSignals && polish.liveSignalsAdditionalSources?.length) {
    const existing = p.liveSignals.sources ?? [];
    const existingUrls = new Set(existing.map(s => s.url ?? ""));
    const merged = [
      ...existing,
      ...polish.liveSignalsAdditionalSources.filter(s => !existingUrls.has(s.url ?? "")),
    ];
    liveSignals = { ...p.liveSignals, sources: merged };
  }

  const deepSections = p.deepSections ?? polish.deepSections;

  // Citations: concatenate authored + polish, deduping by URL so a polish
  // entry never introduces a duplicate of an existing source URL.
  const citations = polish.additionalCitations
    ? (() => {
        const existingUrls = new Set(p.citations.map(c => c.url ?? ""));
        const additions = polish.additionalCitations.filter(c => !existingUrls.has(c.url ?? ""));
        return [...p.citations, ...additions];
      })()
    : p.citations;

  return { ...p, climate, liveSignals, deepSections, citations };
}

const POLISHED_USA = PLACES_USA.map(applyPolish);
const POLISHED_CANADA = PLACES_CANADA.map(applyPolish);
const POLISHED_MEXICO = PLACES_MEXICO.map(applyPolish);

export const PLACES: Place[] = [
  ...POLISHED_USA,
  ...POLISHED_CANADA,
  ...POLISHED_MEXICO,
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
