import type { Place } from "../types";
import { ARCHETYPE_LABELS } from "../types";
import {
  annualComfortMonthCount,
  avgRisk,
  getAnnualPrecipMm,
  meanJanLow,
  meanSummerHigh,
  RISK_VALUE,
} from "./climate-metrics";
import { feltComfortScore } from "./livability-score";
import { buildShortlistDecisionRows, type ShortlistDecisionRow } from "./decision-matrix";
import type { LiveFitFilters } from "./live-fit";
import type { RankingResult } from "./scoring";

const RISK_LABELS: Record<keyof Place["risks"], string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke",
  storm: "Storm",
  landslide: "Landslide",
  coastal: "Coastal",
};

export interface ExplorerScoutBrief {
  leader: RankingResult;
  compareIds: string[];
  summary: string;
  fitLine: string;
  decisionLine: string;
  cautionLine: string;
  decisionSignals: {
    label: string;
    place: Place;
    value: string;
    detail: string;
  }[];
  decisionRows: ShortlistDecisionRow[];
  metrics: {
    label: string;
    value: string;
    detail: string;
  }[];
}

function range(values: number[]): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

function formatRange(values: number[], suffix = ""): string {
  const [min, max] = range(values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "n/a";
  if (Math.round(min) === Math.round(max)) return `${Math.round(min)}${suffix}`;
  return `${Math.round(min)} to ${Math.round(max)}${suffix}`;
}

function topRiskLine(place: Place): string {
  const entries = Object.entries(place.risks) as Array<[keyof Place["risks"], Place["risks"][keyof Place["risks"]]]>;
  const [key, risk] = entries.sort((a, b) => RISK_VALUE[b[1].level] - RISK_VALUE[a[1].level])[0];
  const riskText = risk.level.replace(/-/g, " ");
  if (place.scores.tradeoff >= 70) {
    return `Tradeoffs are high; start with ${RISK_LABELS[key].toLowerCase()} (${riskText}).`;
  }
  if (RISK_VALUE[risk.level] >= 3) {
    return `Watch ${RISK_LABELS[key].toLowerCase()} exposure (${riskText}) before shortlisting.`;
  }
  return "No dominant red flag in the leader; still read the risk section before deciding.";
}

function countryShort(country: Place["country"]): string {
  if (country === "USA") return "US";
  if (country === "Canada") return "CA";
  return "MX";
}

function topArchetypeLabel(places: Place[]): string {
  const counts = new Map<string, number>();
  for (const place of places) {
    const first = place.archetypes[0];
    if (!first) continue;
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  const [id] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [];
  return id ? ARCHETYPE_LABELS[id as keyof typeof ARCHETYPE_LABELS] : "Mixed terrain";
}

function pickMaxSignal(
  places: Place[],
  label: string,
  valueOf: (place: Place) => number,
  valueSuffix = "/100",
): ExplorerScoutBrief["decisionSignals"][number] {
  const place = [...places].sort((a, b) => valueOf(b) - valueOf(a) || a.name.localeCompare(b.name))[0]!;
  const value = Math.round(valueOf(place));
  return {
    label,
    place,
    value: `${value}${valueSuffix}`,
    detail: `${place.name} leads the current shortlist on ${label.toLowerCase()} at ${value}${valueSuffix}.`,
  };
}

function pickLowRiskSignal(places: Place[]): ExplorerScoutBrief["decisionSignals"][number] {
  const place = [...places].sort((a, b) => avgRisk(a) - avgRisk(b) || a.name.localeCompare(b.name))[0]!;
  const value = Math.round(avgRisk(place) * 20);
  return {
    label: "Low risk load",
    place,
    value: `${value}/100`,
    detail: `${place.name} has the lowest composite risk load among current leaders; lower is easier.`,
  };
}

function buildDecisionSignals(places: Place[]): ExplorerScoutBrief["decisionSignals"] {
  return [
    pickMaxSignal(places, "Felt comfort", place => feltComfortScore(place)),
    pickLowRiskSignal(places),
    pickMaxSignal(places, "Garden / land", place => place.scores.growability),
    pickMaxSignal(places, "Climate resilience", place => place.scores.resilience),
    pickMaxSignal(places, "Distinctive terrain", place => place.scores.microclimateUniqueness),
  ];
}

function decisionLine(signals: ExplorerScoutBrief["decisionSignals"]): string {
  const counts = new Map<string, { place: Place; count: number }>();
  for (const signal of signals) {
    const current = counts.get(signal.place.id) ?? { place: signal.place, count: 0 };
    current.count += 1;
    counts.set(signal.place.id, current);
  }
  const winners = [...counts.values()].sort((a, b) => b.count - a.count || a.place.name.localeCompare(b.place.name));
  const top = winners[0];
  if (!top) return "Decision signals are unavailable for this view.";
  if (winners.length === 1) {
    return `${top.place.name} leads every living signal in this shortlist; still read risk and local access before deciding.`;
  }
  if (top.count >= 3) {
    return `${top.place.name} is the consensus leader across ${top.count} of ${signals.length} living signals; use the remaining split to check tradeoffs.`;
  }
  return `No single place dominates: ${top.place.name} leads ${top.count} living signals, while ${winners[1]!.place.name} keeps at least one priority in play.`;
}

export function buildExplorerScoutBrief(
  ranked: RankingResult[],
  rankingLabel: string,
  liveFitFilters: LiveFitFilters = {},
): ExplorerScoutBrief | null {
  if (ranked.length === 0) return null;

  const shortlist = ranked.slice(0, Math.min(5, ranked.length));
  const places = shortlist.map(row => row.place);
  const leader = shortlist[0];
  const countries = [...new Set(places.map(place => countryShort(place.country)))];
  const archetypes = new Set(places.flatMap(place => place.archetypes.slice(0, 2)));
  const compareIds = ranked.slice(0, 4).map(row => row.place.id);
  const leaderNote = leader.note?.replace(/\s+/g, " ").trim();
  const decisionSignals = buildDecisionSignals(places);
  const decisionRows = buildShortlistDecisionRows(shortlist, liveFitFilters);

  return {
    leader,
    compareIds,
    summary: `${leader.place.name} leads this view by ${rankingLabel}; the top ${shortlist.length} span ${countries.join(", ")} and ${archetypes.size} microclimate families.`,
    fitLine: leaderNote ? leaderNote : `${leader.place.koppen} climate signal with ${Math.round(leader.score)} score.`,
    decisionLine: decisionLine(decisionSignals),
    cautionLine: topRiskLine(leader.place),
    decisionSignals,
    decisionRows,
    metrics: [
      {
        label: "Summer highs",
        value: formatRange(places.map(meanSummerHigh), "°C"),
        detail: "Mean Jun-Aug high across the current leaders",
      },
      {
        label: "Winter lows",
        value: formatRange(places.map(meanJanLow), "°C"),
        detail: "Mean Dec-Feb low across the current leaders",
      },
      {
        label: "Easy months",
        value: formatRange(places.map(annualComfortMonthCount), " mo"),
        detail: "Months that clear the day/night/precip easy-living screen",
      },
      {
        label: "Precip spread",
        value: formatRange(places.map(getAnnualPrecipMm), " mm"),
        detail: "Annual precipitation range across the current leaders",
      },
      {
        label: "Avg risk",
        value: formatRange(places.map(place => avgRisk(place) * 20), "/100"),
        detail: "Composite risk load, lower is easier",
      },
      {
        label: "Dominant family",
        value: topArchetypeLabel(places),
        detail: "Most common leading archetype",
      },
    ],
  };
}
