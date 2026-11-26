// ============================================================
// Terraclima — every place with its profile-only fields, eagerly
// ============================================================
// For tests, scripts and audits, which read sources, chapters and outlooks
// for all places at once. The app never imports this on first load: it
// fetches one country's profile fields when a profile, Compare or an export
// needs them (`profile-extras/registry.ts`).
// ============================================================

import type { Citation, Place } from "../types";
import { PLACES, polishProfileFields } from "./places";
import { PROFILE_EXTRAS_USA } from "./profile-extras/usa";
import { PROFILE_EXTRAS_CANADA } from "./profile-extras/canada";
import { PROFILE_EXTRAS_MEXICO } from "./profile-extras/mexico";
import { mergeProfileExtras } from "./profile-extras/merge";
import { primeProfileExtras } from "./profile-extras/registry";
import { profileFieldsOf } from "../lib/profile-stats-compute";
import citationsOverlayJson from "./generated/research/citations-overlay.json";

const RESEARCH_CITATIONS = (citationsOverlayJson as { byId: Record<string, Citation[]> }).byId;
const AUTHORED = { ...PROFILE_EXTRAS_USA, ...PROFILE_EXTRAS_CANADA, ...PROFILE_EXTRAS_MEXICO };

export const PLACES_FULL: Place[] = PLACES.map(p =>
  mergeProfileExtras(p, AUTHORED[p.id], polishProfileFields(p.id), RESEARCH_CITATIONS[p.id]),
);

export const PLACES_FULL_BY_ID: Record<string, Place> = Object.fromEntries(PLACES_FULL.map(p => [p.id, p]));

// Anything that imports the full list also sees the fields through the registry.
primeProfileExtras(Object.fromEntries(PLACES_FULL.map(p => [p.id, profileFieldsOf(p)])));
