/**
 * Stable section anchors for the place detail drawer — used by the sticky
 * reading nav and scroll-margin layout. IDs must match `PlaceDetailBody`.
 *
 * These id strings are load-bearing: they are also the DOM ids that legacy
 * shared links (`#pd-risk`, `#pd-evidence`, …) resolve against, so they must
 * never change even when a section moves to a different chapter or gets a
 * new reading-nav label.
 */
export const PD = {
  overview: "pd-overview",
  whyHere: "pd-why-here",
  vsHome: "pd-vs-home",
  similarTeaser: "pd-similar-teaser",
  residency: "pd-residency-brief",
  seasons: "pd-seasons",
  atAGlance: "pd-at-a-glance",
  placeFeel: "pd-place-feel",
  comfortPrecision: "pd-comfort-precision",
  bioclimaticIndices: "pd-bioclimatic-indices",
  livability: "pd-livability",
  livedSignals: "pd-lived-signals",
  liveHereFit: "pd-live-here-fit",
  practical: "pd-practical-read",
  tourism: "pd-climate-tourism",
  fieldStory: "pd-field-story",
  deepDives: "pd-deep-dives",
  rhythm: "pd-seasonal-rhythm",
  bestMonths: "pd-best-months",
  numbersTogether: "pd-numbers-together",
  corpus: "pd-atlas-corpus",
  geospatial: "pd-geospatial",
  signature: "pd-signature",
  contrast: "pd-contrast",
  soil: "pd-soil-grow",
  risk: "pd-risk",
  outlook: "pd-outlook",
  who: "pd-who-fits",
  settlements: "pd-settlements",
  activities: "pd-activities",
  similar: "pd-similar",
  evidence: "pd-evidence",
  verdict: "pd-verdict",
} as const;

import type { Place } from "../../types";
import { mergeDeepSections } from "../../lib/place-appendix-sections";
import { getBestMonths } from "../../lib/best-months";
import { buildNearbyContextRows, buildPracticalActivities, buildSettlementAnchors } from "../../lib/practical-read";

/**
 * The five reading chapters the dossier is organized into. Replaces the
 * previous four "acts" — every section belongs to exactly one chapter, and
 * the reading nav shows only these five links until a chapter is active.
 */
export const PD_NAV_GROUP = {
  portrait: "Portrait",
  liveOrVisit: "Live or Visit",
  climateLand: "Climate & Land",
  risksFuture: "Risks & Future",
  evidenceMethods: "Evidence & Methods",
} as const;

export type PdChapterKey = keyof typeof PD_NAV_GROUP;

/** Reading order of the five chapters. */
export const PD_CHAPTER_ORDER: PdChapterKey[] = [
  "portrait",
  "liveOrVisit",
  "climateLand",
  "risksFuture",
  "evidenceMethods",
];

export interface PlaceNavItem {
  id: string;
  label: string;
  /** Chapter this item belongs to (renders as the top-level nav entry). */
  group: string;
}

interface PdSectionDef {
  id: string;
  label: string;
  group: PdChapterKey;
  /** Sections that only exist for some places (matches DetailBody's conditionals). */
  optional?: "livedSignals" | "settlements" | "activities" | "bestMonths" | "contrast" | "deepDives";
}

/**
 * Canonical chapter membership for every section id, independent of any one
 * place's conditional content. This is the single source of truth for both
 * `buildPlaceDetailNavItems` and legacy hash → chapter resolution.
 */
const PD_SECTION_DEFS: PdSectionDef[] = [
  // Portrait — story first: overview, mechanism, authored dossier, contrast, field story.
  { id: PD.overview, label: "Overview", group: "portrait" },
  { id: PD.seasons, label: "Season by season", group: "portrait" },
  { id: PD.whyHere, label: "Why it differs", group: "portrait" },
  { id: PD.deepDives, label: "Field dossier", group: "portrait", optional: "deepDives" },
  { id: PD.contrast, label: "Local contrast", group: "portrait", optional: "contrast" },
  { id: PD.fieldStory, label: "Field story", group: "portrait" },

  // Live or Visit — resident/traveler fit, lived indicators, settlements,
  // activities, and the consolidated decision lens.
  { id: PD.vsHome, label: "Versus home", group: "liveOrVisit" },
  { id: PD.similarTeaser, label: "Climate twins", group: "liveOrVisit" },
  { id: PD.similar, label: "Twins detail", group: "liveOrVisit" },
  { id: PD.residency, label: "Decision lens", group: "liveOrVisit" },
  { id: PD.liveHereFit, label: "Full fit detail", group: "liveOrVisit" },
  { id: PD.livability, label: "Livability breakdown", group: "liveOrVisit" },
  { id: PD.livedSignals, label: "Lived indicators", group: "liveOrVisit", optional: "livedSignals" },
  { id: PD.settlements, label: "Scouting bases", group: "liveOrVisit", optional: "settlements" },
  { id: PD.activities, label: "Things to do", group: "liveOrVisit", optional: "activities" },
  { id: PD.practical, label: "Practical read", group: "liveOrVisit" },
  { id: PD.tourism, label: "Climate tourism", group: "liveOrVisit" },
  { id: PD.who, label: "Who fits", group: "liveOrVisit" },

  // Climate & Land — monthly climate, screening scores, terrain, soil.
  { id: PD.atAGlance, label: "At a glance", group: "climateLand" },
  { id: PD.placeFeel, label: "Place feel", group: "climateLand" },
  { id: PD.signature, label: "Climate signature", group: "climateLand" },
  { id: PD.rhythm, label: "Seasonal rhythm", group: "climateLand" },
  { id: PD.bestMonths, label: "Best months", group: "climateLand", optional: "bestMonths" },
  { id: PD.comfortPrecision, label: "Comfort precision", group: "climateLand" },
  { id: PD.bioclimaticIndices, label: "Bioclimatic indices", group: "climateLand" },
  { id: PD.numbersTogether, label: "Numbers together", group: "climateLand" },
  { id: PD.corpus, label: "Full atlas context", group: "climateLand" },
  { id: PD.geospatial, label: "Geospatial analysis", group: "climateLand" },
  { id: PD.soil, label: "Agriculture & soil", group: "climateLand" },

  // Risks & Future — hazards, observed recent shift, climate-change
  // language, and scenario availability/limitations.
  { id: PD.risk, label: "Climate risk", group: "risksFuture" },
  { id: PD.outlook, label: "Climate outlook", group: "risksFuture" },

  // Evidence & Methods — confidence, claim-mapped sources, review date,
  // formulas, raw-data/export links, and methodology.
  { id: PD.evidence, label: "Evidence", group: "evidenceMethods" },
  { id: PD.verdict, label: "Scores & sources", group: "evidenceMethods" },
];

/** Chapter label for every known section id — used to resolve legacy hashes. */
export const PD_GROUP_BY_ID: Record<string, PdChapterKey> = Object.fromEntries(
  PD_SECTION_DEFS.map(def => [def.id, def.group]),
);

/** Every stable PD.* anchor id, for legacy-hash detection. */
export const PD_ALL_IDS: readonly string[] = PD_SECTION_DEFS.map(def => def.id);

/** Chapter for a section id, including `deep-…` / `appendix-…` field-dossier hashes. */
export function chapterForAnchorId(id: string): PdChapterKey | null {
  if (id in PD_GROUP_BY_ID) return PD_GROUP_BY_ID[id]!;
  if (id.startsWith("deep-") || id.startsWith("appendix-")) return "portrait";
  return null;
}

/** Builds the table of contents for the current place (conditional sections omitted). */
export function buildPlaceDetailNavItems(place: Place): PlaceNavItem[] {
  const nearbyRows = buildNearbyContextRows(place);
  const settlementAnchors = buildSettlementAnchors(place);
  const activities = buildPracticalActivities(place);
  const bestMonths = getBestMonths(place);
  const deepSections = mergeDeepSections(place);

  const optionalOk: Record<NonNullable<PdSectionDef["optional"]>, boolean> = {
    livedSignals: Boolean(place.liveSignals),
    settlements: settlementAnchors.length > 0,
    activities: activities.length > 0,
    bestMonths: bestMonths.length > 0,
    contrast: nearbyRows.length > 0,
    deepDives: deepSections.length > 0,
  };

  return PD_SECTION_DEFS
    .filter(def => !def.optional || optionalOk[def.optional])
    .map(def => ({ id: def.id, label: def.label, group: PD_NAV_GROUP[def.group] }));
}
