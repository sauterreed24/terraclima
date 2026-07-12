/**
 * Stable section anchors for the place detail drawer — used by the sticky
 * reading nav and scroll-margin layout. IDs must match `PlaceDetailBody`.
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

/** Reading-nav acts — mirror the in-dossier ZoneDividers. */
export const PD_NAV_GROUP = {
  lived: "The lived read",
  data: "The data lab",
  land: "Land & growing",
  fit: "Fit & sources",
} as const;

export interface PlaceNavItem {
  id: string;
  label: string;
  /** Act this item belongs to (renders as a group header in the desktop nav). */
  group: string;
}

/** Builds the table of contents for the current place (conditional sections omitted). */
export function buildPlaceDetailNavItems(place: Place): PlaceNavItem[] {
  const nearbyRows = buildNearbyContextRows(place);
  const settlementAnchors = buildSettlementAnchors(place);
  const activities = buildPracticalActivities(place);
  const items: PlaceNavItem[] = [
    { id: PD.overview, label: "Overview", group: PD_NAV_GROUP.lived },
    { id: PD.whyHere, label: "Why it differs", group: PD_NAV_GROUP.lived },
    { id: PD.evidence, label: "Evidence", group: PD_NAV_GROUP.lived },
    { id: PD.vsHome, label: "Versus home", group: PD_NAV_GROUP.lived },
    { id: PD.similarTeaser, label: "Climate twins", group: PD_NAV_GROUP.lived },
    { id: PD.residency, label: "Residency brief", group: PD_NAV_GROUP.lived },
    { id: PD.seasons, label: "Season by season", group: PD_NAV_GROUP.lived },
    { id: PD.atAGlance, label: "At a glance", group: PD_NAV_GROUP.lived },
    { id: PD.placeFeel, label: "Place feel", group: PD_NAV_GROUP.lived },
    { id: PD.comfortPrecision, label: "Comfort precision", group: PD_NAV_GROUP.lived },
    { id: PD.bioclimaticIndices, label: "Bioclimatic indices", group: PD_NAV_GROUP.lived },
    { id: PD.livability, label: "Livability lens", group: PD_NAV_GROUP.lived },
  ];

  if (place.liveSignals) {
    items.push({ id: PD.livedSignals, label: "Lived signals", group: PD_NAV_GROUP.lived });
  }

  items.push(
    { id: PD.liveHereFit, label: "Live-here fit", group: PD_NAV_GROUP.lived },
    { id: PD.practical, label: "Practical read", group: PD_NAV_GROUP.lived },
    { id: PD.tourism, label: "Climate tourism", group: PD_NAV_GROUP.lived },
    { id: PD.fieldStory, label: "Field story", group: PD_NAV_GROUP.lived },
  );

  if (mergeDeepSections(place).length > 0) {
    items.push({ id: PD.deepDives, label: "Field dossier", group: PD_NAV_GROUP.lived });
  }

  items.push(
    { id: PD.rhythm, label: "Seasonal rhythm", group: PD_NAV_GROUP.data },
  );

  if (getBestMonths(place).length > 0) {
    items.push({ id: PD.bestMonths, label: "Best months", group: PD_NAV_GROUP.data });
  }

  items.push(
    { id: PD.numbersTogether, label: "Numbers together", group: PD_NAV_GROUP.data },
    { id: PD.corpus, label: "Full atlas context", group: PD_NAV_GROUP.data },
    { id: PD.geospatial, label: "Geospatial analysis", group: PD_NAV_GROUP.data },
    { id: PD.signature, label: "Climate signature", group: PD_NAV_GROUP.data },
  );

  if (nearbyRows.length) {
    items.push({ id: PD.contrast, label: "Local contrast", group: PD_NAV_GROUP.data });
  }

  items.push(
    { id: PD.soil, label: "Agriculture & soil", group: PD_NAV_GROUP.land },
    { id: PD.risk, label: "Climate risk", group: PD_NAV_GROUP.land },
    { id: PD.outlook, label: "Climate outlook", group: PD_NAV_GROUP.land },
    { id: PD.who, label: "Who fits", group: PD_NAV_GROUP.fit },
  );

  if (settlementAnchors.length) {
    items.push({ id: PD.settlements, label: "Scouting bases", group: PD_NAV_GROUP.fit });
  }
  if (activities.length) {
    items.push({ id: PD.activities, label: "Things to do", group: PD_NAV_GROUP.fit });
  }

  items.push({ id: PD.similar, label: "Twins detail", group: PD_NAV_GROUP.fit });
  items.push({ id: PD.verdict, label: "Scores & sources", group: PD_NAV_GROUP.fit });

  return items;
}
