import type { Country, Place, Tier } from "../types";

export type CoverageIssueId =
  | "liveSignals"
  | "humidity"
  | "solarEnergyMjM2Day"
  | "deepSections"
  | "multipleHttpsCitations";

export interface PlaceCoverageRead {
  id: string;
  name: string;
  country: Country;
  region: string;
  tier: Tier;
  missing: CoverageIssueId[];
  httpsCitationCount: number;
  deepSectionCount: number;
  thinness: number;
}

export interface CoverageGroupSummary {
  key: string;
  label: string;
  country?: Country;
  region?: string;
  tier?: Tier;
  total: number;
  thin: number;
  issueCounts: Record<CoverageIssueId, number>;
}

export interface CorpusCoverageReport {
  places: PlaceCoverageRead[];
  byTier: CoverageGroupSummary[];
  byCountry: CoverageGroupSummary[];
  byRegion: CoverageGroupSummary[];
  thinPlaces: PlaceCoverageRead[];
}

export const COVERAGE_ISSUES: readonly { id: CoverageIssueId; label: string }[] = [
  { id: "liveSignals", label: "missing liveSignals" },
  { id: "humidity", label: "missing humidity" },
  { id: "solarEnergyMjM2Day", label: "missing solarEnergyMjM2Day" },
  { id: "deepSections", label: "missing deepSections" },
  { id: "multipleHttpsCitations", label: "under 2 HTTPS citations" },
];

function emptyIssueCounts(): Record<CoverageIssueId, number> {
  return {
    liveSignals: 0,
    humidity: 0,
    solarEnergyMjM2Day: 0,
    deepSections: 0,
    multipleHttpsCitations: 0,
  };
}

export function normalizeCoverageRegion(country: Country, region: string): string {
  if (country === "Mexico" && (region === "Estado de Mexico" || region === "Estado de México")) {
    return "Estado de México";
  }
  if (country === "Canada" && (region === "Quebec" || region === "Québec")) {
    return "Québec";
  }
  return region;
}

export function analyzePlaceCoverage(place: Place): PlaceCoverageRead {
  const missing: CoverageIssueId[] = [];
  const httpsCitationCount = place.citations.filter(citation => citation.url?.startsWith("https://")).length;
  const deepSectionCount = place.deepSections?.length ?? 0;

  if (!place.liveSignals) missing.push("liveSignals");
  if (place.climate.humidity == null) missing.push("humidity");
  if (place.climate.solarEnergyMjM2Day == null && place.climate.sunshinePct == null) {
    missing.push("solarEnergyMjM2Day");
  }
  if (deepSectionCount === 0) missing.push("deepSections");
  if (httpsCitationCount < 2) missing.push("multipleHttpsCitations");

  return {
    id: place.id,
    name: place.name,
    country: place.country,
    region: normalizeCoverageRegion(place.country, place.region),
    tier: place.tier,
    missing,
    httpsCitationCount,
    deepSectionCount,
    thinness: missing.length,
  };
}

function touchGroup(
  groups: Map<string, CoverageGroupSummary>,
  key: string,
  label: string,
  place: PlaceCoverageRead,
  extra: Partial<Pick<CoverageGroupSummary, "country" | "region" | "tier">> = {},
): CoverageGroupSummary {
  let group = groups.get(key);
  if (!group) {
    group = {
      key,
      label,
      total: 0,
      thin: 0,
      issueCounts: emptyIssueCounts(),
      ...extra,
    };
    groups.set(key, group);
  }
  group.total += 1;
  if (place.thinness > 0) group.thin += 1;
  for (const issue of place.missing) group.issueCounts[issue] += 1;
  return group;
}

function groupSort(a: CoverageGroupSummary, b: CoverageGroupSummary): number {
  return b.thin - a.thin || b.total - a.total || a.label.localeCompare(b.label);
}

export function buildCorpusCoverageReport(places: readonly Place[]): CorpusCoverageReport {
  const placeReads = places.map(analyzePlaceCoverage);
  const byTier = new Map<string, CoverageGroupSummary>();
  const byCountry = new Map<string, CoverageGroupSummary>();
  const byRegion = new Map<string, CoverageGroupSummary>();

  for (const place of placeReads) {
    touchGroup(byTier, place.tier, `Tier ${place.tier}`, place, { tier: place.tier });
    touchGroup(byCountry, place.country, place.country, place, { country: place.country });
    touchGroup(
      byRegion,
      `${place.country}|${place.region}`,
      `${place.region}, ${place.country}`,
      place,
      { country: place.country, region: place.region },
    );
  }

  return {
    places: placeReads,
    byTier: [...byTier.values()].sort((a, b) => a.label.localeCompare(b.label)),
    byCountry: [...byCountry.values()].sort(groupSort),
    byRegion: [...byRegion.values()].sort(groupSort),
    thinPlaces: placeReads
      .filter(place => place.thinness > 0)
      .sort((a, b) => b.thinness - a.thinness || a.name.localeCompare(b.name)),
  };
}

