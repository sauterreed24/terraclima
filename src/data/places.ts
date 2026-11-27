// ============================================================
// Terraclima — Unified Places Corpus
// ============================================================

import type { Place } from "../types";
import type { PolishProfileFields } from "./profile-extras/types";
import { ARCHETYPE_LABELS, DRIVER_LABELS } from "../types";
import { applyClimateV2Overlay } from "../lib/climate-v2/overlay";
import { sanitizeLivedSignals } from "../lib/research/lived-indicators";
import { PLACES_USA } from "./places.usa";
import { PLACES_CANADA } from "./places.canada";
import { PLACES_MEXICO } from "./places.mexico";
import { TIER_C_POLISH, TIER_C_POLISH_SOURCES } from "./places.tier-c-polish";
import { TIER_C_INDICATORS } from "./places.tier-c-indicators";
import { EXPERIENCE_AUTHORED } from "./places.experience-authored";
import { CLIMATE_V2_OVERLAY_BY_ID } from "./generated/climate-v2";
import housingPressureJson from "./generated/research/housing-pressure-by-id.json";

const HOUSING_PRESSURE_BY_ID = (housingPressureJson as { byId: Record<string, number> }).byId;

const TIER_C_POLISH_ALL: Record<string, typeof TIER_C_POLISH[keyof typeof TIER_C_POLISH]> = {
  ...TIER_C_POLISH,
  ...TIER_C_INDICATORS,
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

  // In depth chapters and citations (polish included) are profile-only:
  // src/data/profile-extras puts them back when a profile needs them.
  return { ...p, climate, liveSignals };
}

/** Tier C polish fields that belong with a place's profile (merged lazily). */
export function polishProfileFields(id: string): PolishProfileFields | undefined {
  const polish = TIER_C_POLISH_ALL[id];
  if (!polish || (!polish.deepSections && !polish.additionalCitations)) return undefined;
  return { deepSections: polish.deepSections, additionalCitations: polish.additionalCitations };
}

const POLISHED_USA = PLACES_USA.map(applyPolish);
const POLISHED_CANADA = PLACES_CANADA.map(applyPolish);
const POLISHED_MEXICO = PLACES_MEXICO.map(applyPolish);

/**
 * Overlay generated Climate V2 Daymet normals onto Place.climate.
 * When the generated bundle is empty (bootstrap), authored climate is kept.
 */
function applyClimateV2(p: Place): Place {
  return applyClimateV2Overlay(p, CLIMATE_V2_OVERLAY_BY_ID[p.id]);
}

/** Strip socialStress and attach transparent housing/access indices. */
function applyLivedIndicators(p: Place): Place {
  const ls = sanitizeLivedSignals(p.liveSignals);
  if (!ls) return p;
  const housingPressureIndex = HOUSING_PRESSURE_BY_ID[p.id] ?? ls.housingPressureIndex ?? ls.costPressure;
  const accessRemotenessIndex = ls.accessRemotenessIndex ?? ls.accessFriction;
  return {
    ...p,
    liveSignals: {
      ...ls,
      housingPressureIndex,
      accessRemotenessIndex,
    },
  };
}

/**
 * Layer authored experience copy onto places that shipped with a partial or
 * missing `experience` block. Authored experience already present in the
 * base data files always wins — this only fills fields that are absent, so
 * a hand-curated place never gets a generated field overwritten underneath
 * it. Season sub-fields are filled independently of one another.
 */
function applyExperienceAuthored(p: Place): Place {
  const authored = EXPERIENCE_AUTHORED[p.id];
  if (!authored) return p;
  const existing = p.experience;
  const seasons = {
    winter: existing?.seasons?.winter ?? authored.seasons?.winter,
    spring: existing?.seasons?.spring ?? authored.seasons?.spring,
    summer: existing?.seasons?.summer ?? authored.seasons?.summer,
    autumn: existing?.seasons?.autumn ?? authored.seasons?.autumn,
  };
  return {
    ...p,
    experience: {
      feel: existing?.feel ?? authored.feel,
      seasons,
      travelerFit: existing?.travelerFit ?? authored.travelerFit,
      residentFit: existing?.residentFit ?? authored.residentFit,
      texture: existing?.texture ?? authored.texture,
      history: existing?.history ?? authored.history,
      why: existing?.why ?? authored.why,
    },
  };
}

export const PLACES: Place[] = [
  ...POLISHED_USA,
  ...POLISHED_CANADA,
  ...POLISHED_MEXICO,
].map(p => applyLivedIndicators(applyClimateV2(applyExperienceAuthored(p))));

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
 * Fold text into the space-padded token form the search matcher tests
 * against: accents and case folded, apostrophes dropped ("Coeur d'Alene" →
 * "coeur dalene"), every other non-alphanumeric run a single space. The
 * leading/trailing space lets `" " + token` test a word prefix and
 * `" " + token + " "` a whole word with one `includes`.
 */
export function normalizeSearchText(input: string): string {
  const folded = foldDiacritics(input)
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return folded ? ` ${folded} ` : " ";
}

/**
 * Per-place search text, split by how strongly a hit says "this is the place
 * you meant". Every field is in {@link normalizeSearchText} form.
 */
export interface PlaceSearchFields {
  /** Display name. */
  name: string;
  /** Name without its parenthetical / "& the …" qualifier ("Oaxaca City (Valles Centrales)" → "oaxaca city"). */
  nameCore: string;
  /** Municipality, region (state / province), country and its aliases, and the towns inside the zone. */
  locality: string;
  /** Archetype labels, topographic drivers, biome and Köppen class. */
  classification: string;
  /** The one-sentence summary and the why-distinct mechanism: what the place is about. */
  headline: string;
  /** The immersive summary paragraph. */
  summary: string;
  /** Other authored descriptive prose (fit lines, activities, experience copy, authored deep sections). */
  prose: string;
  /** Mentions of OTHER places (nearby contrasts). Lowest tier: never outranks the place itself. */
  crossReference: string;
}

const COUNTRY_SEARCH_ALIASES: Record<Place["country"], string> = {
  USA: "USA United States of America US",
  Canada: "Canada",
  Mexico: "Mexico",
};

/** Common names a place's own fields never use (searched as locality). */
const PLACE_SEARCH_ALIASES: Readonly<Record<string, string>> = {
  // Hilo is the main town of Hawaiʻi Island, widely called the Big Island.
  "hilo-hi": "Big Island, Hawaii Island",
};

/**
 * Postal and common abbreviations for states, provinces and territories, so
 * "kelowna bc", "la paz bcs" or "yellowknife nwt" find their place whatever
 * the place id happens to end with. Keyed by `Place.region`.
 */
export const REGION_SEARCH_ALIASES: Readonly<Record<string, string>> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY",
  Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
  "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
  Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL Newfoundland Labrador NFLD", "Northwest Territories": "NT NWT",
  "Nova Scotia": "NS", Nunavut: "NU", Ontario: "ON", "Prince Edward Island": "PE PEI", Quebec: "QC",
  Saskatchewan: "SK", Yukon: "YT",
  "Baja California": "BC", "Baja California Sur": "BCS", Campeche: "Camp", Chiapas: "Chis",
  Chihuahua: "Chih", Coahuila: "Coah", Durango: "Dgo", "Estado de México": "Edomex Mex",
  Guanajuato: "Gto", Guerrero: "Gro", Jalisco: "Jal", Michoacán: "Mich", Morelos: "Mor",
  "Nuevo León": "NL", Oaxaca: "Oax", Puebla: "Pue", Querétaro: "Qro", "Quintana Roo": "Q Roo",
  "San Luis Potosí": "SLP", Sinaloa: "Sin", Sonora: "Son", Veracruz: "Ver", Yucatán: "Yuc", Zacatecas: "Zac",
};

/**
 * Runtime indexes.
 *
 * Annual precipitation stays eager because it is a small numeric lookup used
 * across cards, ranking, and detail panels. Full-prose search text is lazy:
 * building it folds every authored paragraph for every place, so doing that at
 * module initialization hurts cold Explorer load even when the user never
 * searches. App warms it opportunistically after first paint.
 *
 * Deliberately NOT indexed: citations / research receipts, confidence notes,
 * settlement populations and the derived deep sections that
 * `mergeDeepSections` generates from structured fields. That boilerplate is
 * near-identical across the atlas, so it made every common word match
 * everywhere.
 */
const PLACE_SEARCH_FIELDS = new WeakMap<Place, PlaceSearchFields>();
const PLACE_SEARCH_TEXT = new WeakMap<Place, string>();
export const PLACE_ANNUAL_PRECIP: Record<string, number> = {};

for (const p of PLACES) {
  PLACE_ANNUAL_PRECIP[p.id] = p.climate.annualPrecipMm ?? p.climate.precipMm.reduce((a, b) => a + b, 0);
}

function runtimeNowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Join separately normalized parts. Each part keeps its own space padding, so
 * parts are divided by a double space and a quoted phrase can never match
 * across two unrelated values (an archetype label and the next one, say).
 */
function searchField(parts: readonly string[]): string {
  const out = parts.map(normalizeSearchText).filter(part => part !== " ").join("");
  return out || " ";
}

/**
 * In depth chapters load with the profile (`profile-extras/registry`); once a
 * group's file arrives its chapter text joins those places' search prose.
 * Cached fields carry the version they were built at, so every copy of a
 * place (scenario-projected ones included) picks the text up.
 */
const DEFERRED_SEARCH_PROSE = new Map<string, readonly string[]>();
let deferredProseVersion = 0;
export function addDeferredSearchProse(id: string, parts: readonly string[]): void {
  if (parts.length === 0 || DEFERRED_SEARCH_PROSE.has(id)) return;
  DEFERRED_SEARCH_PROSE.set(id, parts);
  deferredProseVersion++;
}
const FIELDS_VERSION = new WeakMap<PlaceSearchFields, number>();

export function getPlaceSearchFields(place: Place): PlaceSearchFields {
  const cached = PLACE_SEARCH_FIELDS.get(place);
  if (cached !== undefined && FIELDS_VERSION.get(cached) === deferredProseVersion) return cached;

  // "boulder-co" → "co": lets "boulder co" / "sequim wa" work without a state-abbreviation table.
  const idSuffix = /-([a-z]{2})$/.exec(place.id)?.[1] ?? "";
  const settlements = place.settlementsWithinZone ?? [];
  const activities = place.thingsToDo ?? [];
  const experience = place.experience;
  const history = experience?.history;
  const fields: PlaceSearchFields = {
    name: normalizeSearchText(place.name),
    nameCore: normalizeSearchText(place.name.split(/\s*[(&—]|\s+and the\s+/i)[0] ?? place.name),
    locality: searchField([
      place.municipality ?? "",
      place.region,
      COUNTRY_SEARCH_ALIASES[place.country] ?? place.country,
      REGION_SEARCH_ALIASES[place.region] ?? "",
      PLACE_SEARCH_ALIASES[place.id] ?? "",
      idSuffix,
      ...settlements.map(s => s.name),
    ]),
    classification: searchField([
      ...place.archetypes.flatMap(a => [a, ARCHETYPE_LABELS[a] ?? ""]),
      ...place.drivers.flatMap(d => [d, DRIVER_LABELS[d] ?? ""]),
      place.biome,
      place.koppen,
    ]),
    headline: searchField([place.summaryShort ?? "", place.whyDistinct]),
    summary: normalizeSearchText(place.summaryImmersive),
    prose: searchField([
      place.reliefContext,
      ...place.relocationFit,
      ...place.travelFit,
      place.whoWouldLove,
      place.whoMightNot,
      ...settlements.map(s => s.note ?? ""),
      ...activities.map(a => `${a.label} ${a.note ?? ""}`),
      experience?.feel ?? "",
      ...Object.values(experience?.seasons ?? {}),
      experience?.travelerFit ?? "",
      experience?.residentFit ?? "",
      experience?.texture ?? "",
      ...(typeof history === "string" ? [history] : history ?? []),
      experience?.why ?? "",
      ...(place.deepSections ?? []).map(s => `${s.title} ${s.paragraphs.join(" ")}`),
      ...(place.deepSections ? [] : DEFERRED_SEARCH_PROSE.get(place.id) ?? []),
    ]),
    crossReference: searchField((place.nearbyContrasts ?? []).map(c => `${c.label} ${c.note}`)),
  };
  PLACE_SEARCH_FIELDS.set(place, fields);
  FIELDS_VERSION.set(fields, deferredProseVersion);
  return fields;
}

/**
 * Everything the search index holds for a place as one folded string, best
 * tier first. Matching goes through {@link getPlaceSearchFields} (see
 * `src/lib/place-search.ts`); this flat form is for diagnostics and tests.
 */
export function getPlaceSearchText(place: Place): string {
  const cached = PLACE_SEARCH_TEXT.get(place);
  if (cached !== undefined) return cached;
  const f = getPlaceSearchFields(place);
  const text = [f.name, f.locality, f.classification, f.headline, f.summary, f.prose, f.crossReference]
    .map(part => part.trim().replace(/ {2,}/g, " "))
    .filter(Boolean)
    .join(" ");
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
    getPlaceSearchFields(places[i]!);
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
