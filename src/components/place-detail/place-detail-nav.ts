/**
 * Stable section anchors for the place detail drawer — used by the sticky
 * reading nav and scroll-margin layout. IDs must match `PlaceDetailBody`.
 */
export const PD = {
  overview: "pd-overview",
  fieldStory: "pd-field-story",
  deepDives: "pd-deep-dives",
  whyHere: "pd-why-here",
  rhythm: "pd-seasonal-rhythm",
  bestMonths: "pd-best-months",
  numbersTogether: "pd-numbers-together",
  signature: "pd-signature",
  contrast: "pd-contrast",
  soil: "pd-soil-grow",
  risk: "pd-risk",
  outlook: "pd-outlook",
  who: "pd-who-fits",
  settlements: "pd-settlements",
  activities: "pd-activities",
  similar: "pd-similar",
  verdict: "pd-verdict",
} as const;

import type { Place } from "../../types";
import { mergeDeepSections } from "../../lib/place-appendix-sections";
import { computeBestMonths } from "../../lib/best-months";

export interface PlaceNavItem {
  id: string;
  label: string;
}

/** Builds the table of contents for the current place (conditional sections omitted). */
export function buildPlaceDetailNavItems(place: Place): PlaceNavItem[] {
  const items: PlaceNavItem[] = [
    { id: PD.overview, label: "Opening" },
    { id: PD.fieldStory, label: "Field story" },
  ];

  if (mergeDeepSections(place).length > 0) {
    items.push({ id: PD.deepDives, label: "Field dossier" });
  }

  items.push(
    { id: PD.whyHere, label: "Why it differs" },
    { id: PD.rhythm, label: "Seasonal rhythm" },
  );

  if (computeBestMonths(place).length > 0) {
    items.push({ id: PD.bestMonths, label: "Best months" });
  }

  items.push(
    { id: PD.numbersTogether, label: "Numbers together" },
    { id: PD.signature, label: "Climate signature" },
  );

  if (place.localContrast?.length || place.nearbyContrasts?.length) {
    items.push({ id: PD.contrast, label: "Local contrast" });
  }

  items.push(
    { id: PD.soil, label: "Soil & growability" },
    { id: PD.risk, label: "Risk" },
    { id: PD.outlook, label: "Climate outlook" },
    { id: PD.who, label: "Who fits" },
  );

  if (place.settlementsWithinZone?.length) {
    items.push({ id: PD.settlements, label: "Settlements" });
  }
  if (place.thingsToDo?.length) {
    items.push({ id: PD.activities, label: "Things to do" });
  }

  items.push({ id: PD.similar, label: "Similar places" });
  items.push({ id: PD.verdict, label: "Scores & sources" });

  return items;
}
