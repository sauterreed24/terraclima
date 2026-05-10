import type { Place, RiskLevel } from "../types";
import type { FilterState, RankingResult } from "./scoring";
import { LIVE_FIT_PRESET_BY_ID, type LiveFitPresetId } from "./live-fit";

export const TERRACLIMA_SALES_EMAIL = "sauterreed24@yahoo.com";

export type CommercialOfferId =
  | "personal-brief"
  | "relocation-deep-brief"
  | "advisor-pack"
  | "data-license";

export interface CommercialOffer {
  id: CommercialOfferId;
  name: string;
  price: string;
  audience: string;
  promise: string;
  deliverables: string[];
  cta: string;
}

export const COMMERCIAL_OFFERS: readonly CommercialOffer[] = [
  {
    id: "personal-brief",
    name: "Personal Climate Fit Brief",
    price: "$29",
    audience: "Relocating households and climate-curious travelers",
    promise: "Turn the current shortlist into a concise, human-readable place brief.",
    deliverables: [
      "3-place climate shortlist",
      "fit reasons and cautions",
      "shareable search URL",
      "next scouting questions",
    ],
    cta: "Request a $29 brief",
  },
  {
    id: "relocation-deep-brief",
    name: "Relocation Deep Brief",
    price: "$149",
    audience: "People actively narrowing where to live",
    promise: "A deeper, decision-ready comparison for one household profile.",
    deliverables: [
      "up to 8 place comparisons",
      "risk and seasonality notes",
      "garden and daily-life screen",
      "field-check itinerary",
    ],
    cta: "Start a deep brief",
  },
  {
    id: "advisor-pack",
    name: "Advisor / Agent Pack",
    price: "$499/mo",
    audience: "Relocation advisors, recruiters, climate-aware agents",
    promise: "Reusable shortlist packets for clients who ask climate-fit questions.",
    deliverables: [
      "white-label brief templates",
      "client-ready shortlist exports",
      "transparent methodology notes",
      "monthly atlas refresh notes",
    ],
    cta: "Ask about advisor access",
  },
  {
    id: "data-license",
    name: "Corpus + Signal License",
    price: "from $1,200/mo",
    audience: "Publishers, research teams, civic tools, proptech pilots",
    promise: "License the structured microclimate corpus and deterministic signals.",
    deliverables: [
      "typed place corpus",
      "ranking and live-fit signals",
      "citation and confidence metadata",
      "integration support",
    ],
    cta: "Discuss licensing",
  },
];

export interface CommercialLeadInput {
  ranked: readonly RankingResult[];
  comparePlaces?: readonly Place[];
  filters: FilterState;
  rankingLabel: string;
  appUrl?: string;
  offerId?: CommercialOfferId;
}

export interface CommercialLead {
  offer: CommercialOffer;
  shortlist: Place[];
  filterLines: string[];
  subject: string;
  body: string;
  mailtoHref: string;
}

const OFFER_BY_ID: Record<CommercialOfferId, CommercialOffer> =
  Object.fromEntries(COMMERCIAL_OFFERS.map(offer => [offer.id, offer])) as Record<CommercialOfferId, CommercialOffer>;

const RISK_LABEL: Record<RiskLevel, string> = {
  "very-low": "very low",
  low: "low",
  moderate: "moderate",
  elevated: "elevated",
  high: "high",
  "very-high": "very high",
};

function placeLine(place: Place, index: number): string {
  const location = place.municipality
    ? `${place.municipality}, ${place.region}, ${place.country}`
    : `${place.region}, ${place.country}`;
  return `${index + 1}. ${place.name} - ${location} - ${place.koppen} - ${place.confidence} confidence`;
}

function fitPresetLabel(id: LiveFitPresetId): string {
  return LIVE_FIT_PRESET_BY_ID[id]?.label ?? id.replace(/-/g, " ");
}

export function selectCommercialShortlist(
  ranked: readonly RankingResult[],
  comparePlaces: readonly Place[] = [],
  limit = 4,
): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];

  for (const place of comparePlaces) {
    if (seen.has(place.id)) continue;
    seen.add(place.id);
    out.push(place);
    if (out.length >= limit) return out;
  }

  for (const row of ranked) {
    if (seen.has(row.place.id)) continue;
    seen.add(row.place.id);
    out.push(row.place);
    if (out.length >= limit) return out;
  }

  return out;
}

export function describeCommercialFilters(filters: FilterState, rankingLabel: string): string[] {
  const lines: string[] = [`Ranking lens: ${rankingLabel}`];
  const fitPresets = [...(filters.fitPresets ?? new Set<LiveFitPresetId>())];

  if (fitPresets.length > 0) {
    lines.push(`Live Finder presets: ${fitPresets.map(fitPresetLabel).join(", ")}`);
  }
  if (filters.countries.size > 0) {
    lines.push(`Countries: ${[...filters.countries].sort().join(", ")}`);
  }
  if (filters.archetypes.size > 0) {
    lines.push(`Archetypes: ${[...filters.archetypes].sort().join(", ")}`);
  }
  if (filters.search?.trim()) {
    lines.push(`Search: ${filters.search.trim()}`);
  }
  if (filters.maxSummerHighC != null) {
    lines.push(`Mean summer high cap: <= ${filters.maxSummerHighC}C`);
  }
  if (filters.minWinterLowC != null) {
    lines.push(`Mean winter low floor: >= ${filters.minWinterLowC}C`);
  }
  if (filters.minGrowability != null) {
    lines.push(`Growability floor: ${filters.minGrowability}+`);
  }
  if (filters.maxFireRisk) {
    lines.push(`Wildfire ceiling: ${RISK_LABEL[filters.maxFireRisk]}`);
  }
  if (filters.maxOverallRisk) {
    lines.push(`Overall risk ceiling: ${RISK_LABEL[filters.maxOverallRisk]}`);
  }

  if (lines.length === 1) {
    lines.push("No extra filters yet; use this as a broad atlas shortlist.");
  }

  return lines;
}

export function buildCommercialLead(input: CommercialLeadInput): CommercialLead {
  const offer = input.offerId ? OFFER_BY_ID[input.offerId] : OFFER_BY_ID["personal-brief"];
  const shortlist = selectCommercialShortlist(input.ranked, input.comparePlaces);
  const filterLines = describeCommercialFilters(input.filters, input.rankingLabel);
  const shortlistLines = shortlist.length
    ? shortlist.map(placeLine)
    : ["No shortlist captured yet. I need help choosing places from the atlas."];
  const urlLine = input.appUrl ? `\nCurrent Terraclima URL:\n${input.appUrl}\n` : "";
  const subject = `Terraclima ${offer.name} request`;
  const body = [
    `I want to start the ${offer.name} (${offer.price}).`,
    "",
    "Current shortlist:",
    ...shortlistLines,
    "",
    "Current filters:",
    ...filterLines.map(line => `- ${line}`),
    urlLine,
    "What I need help deciding:",
    "- ",
    "",
    "Notes:",
    "- I understand Terraclima is screening-grade climate intelligence, not appraisal, insurance, medical, or parcel advice.",
  ].join("\n");
  const mailtoHref = `mailto:${TERRACLIMA_SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { offer, shortlist, filterLines, subject, body, mailtoHref };
}
