import type { Place, ScenarioId } from "../types";
import { scenarioMeta } from "./climate-projection";
import { ARCHETYPE_LABELS } from "../types";
import { getBestMonths } from "./best-months";
import {
  annualComfortMonthCount,
  avgRisk,
  getAnnualPrecipMm,
  meanJanLow,
  meanSummerHigh,
  RISK_VALUE,
} from "./climate-metrics";
import { feltComfortScore } from "./livability-score";
import { placeFeelScore } from "./place-feel";
import { buildShortlistDecisionRows, type ShortlistDecisionRow } from "./decision-matrix";
import { LIVE_FIT_PRESET_BY_ID, LIVE_FIT_PRESETS, type LiveFitFilters, type LiveFitPresetId } from "./live-fit";
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
  audienceRead: {
    love: string;
    pause: string;
  };
  nextStep: {
    label: string;
    place: Place;
    action: string;
    detail: string;
  };
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
  // Label tiebreaker mirrors decision-matrix.highestRisk so the scout brief and
  // the decision matrix never name a different "top risk" for the same place.
  const [key, risk] = entries.sort((a, b) =>
    RISK_VALUE[b[1].level] - RISK_VALUE[a[1].level] || RISK_LABELS[a[0]].localeCompare(RISK_LABELS[b[0]]),
  )[0];
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
    pickMaxSignal(places, "Place feel", place => placeFeelScore(place)),
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

function trimTerminalPunctuation(value: string): string {
  return value.replace(/[.!?]+$/, "").trim();
}

function lowerFirst(value: string): string {
  if (!value) return value;
  return `${value[0].toLowerCase()}${value.slice(1)}`;
}

const PRESET_AUDIENCE: Record<LiveFitPresetId, string> = {
  "cool-summers": "heat-sensitive movers",
  "mild-winters": "mild-winter seekers",
  "dry-air": "dry-air seekers",
  "gardenable": "gardeners and land scouts",
  "low-fire-smoke": "smoke-sensitive movers",
  "four-seasons": "four-season households",
  "snow-country": "snow-country people",
  "coastal-buffer": "coastal-buffer seekers",
  "quiet-small-town": "quiet-town scouts",
};

function activePresetIds(filters: LiveFitFilters): LiveFitPresetId[] {
  if (!filters.fitPresets?.size) return [];
  const rank = new Map<LiveFitPresetId, number>(LIVE_FIT_PRESETS.map((preset, index) => [preset.id, index]));
  return [...filters.fitPresets].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}

function joinReadable(values: readonly string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function audienceFromFilters(filters: LiveFitFilters, leader: Place): string {
  const presetAudiences = activePresetIds(filters).map(id => PRESET_AUDIENCE[id]);
  const thresholdAudiences: string[] = [];
  if (filters.maxSummerHighC != null) thresholdAudiences.push("heat-escape scouts");
  if (filters.minWinterLowC != null) thresholdAudiences.push("cold-avoidant movers");
  if (filters.minGrowability != null) thresholdAudiences.push("garden planners");
  if (filters.maxFireRisk || filters.maxOverallRisk) thresholdAudiences.push("risk-sensitive households");

  const audiences = [...presetAudiences, ...thresholdAudiences];
  if (audiences.length) return joinReadable([...new Set(audiences)].slice(0, 3));
  return leader.relocationFit[0]?.replace(/\s+/g, " ").trim() || "climate-sensitive movers";
}

function preferencePhrase(filters: LiveFitFilters): string {
  const presetLabels = activePresetIds(filters).map(id => LIVE_FIT_PRESET_BY_ID[id].label.toLowerCase());
  const thresholds: string[] = [];
  if (filters.maxSummerHighC != null) thresholds.push(`summer highs at or below ${filters.maxSummerHighC}°C`);
  if (filters.minWinterLowC != null) thresholds.push(`winter lows near ${filters.minWinterLowC}°C or milder`);
  if (filters.minGrowability != null) thresholds.push(`growability at ${filters.minGrowability}/100 or better`);
  if (filters.maxFireRisk) thresholds.push(`wildfire risk no higher than ${filters.maxFireRisk.replace(/-/g, " ")}`);
  if (filters.maxOverallRisk) thresholds.push(`overall risk no higher than ${filters.maxOverallRisk.replace(/-/g, " ")}`);
  const parts = [...presetLabels, ...thresholds];
  return parts.length ? ` for ${joinReadable(parts.slice(0, 3))}` : "";
}

function buildAudienceRead(
  leader: RankingResult,
  decisionRows: readonly ShortlistDecisionRow[],
  liveFitFilters: LiveFitFilters,
): ExplorerScoutBrief["audienceRead"] {
  const leaderRow = decisionRows.find(row => row.place.id === leader.place.id);
  const audience = audienceFromFilters(liveFitFilters, leader.place);
  const preference = preferencePhrase(liveFitFilters);
  const bestFor = leaderRow?.bestFor.split(";")[0]?.trim() || leader.place.relocationFit[0]?.replace(/\s+/g, " ").trim() || "climate scouts";
  const liveFit = leaderRow ? `fit ${leaderRow.liveFitScore}` : `score ${Math.round(leader.score)}`;
  const love = `${audience} should start here${preference}: ${leader.place.name} leads the shortlist with ${liveFit}, and ${bestFor.toLowerCase()} is the clearest match.`;

  let pause: string;
  if (leaderRow?.watch) {
    pause = `${lowerFirst(trimTerminalPunctuation(leaderRow.watch))} would be a deal-breaker; verify that in the dossier before shortlisting.`;
  } else {
    pause = "you need parcel-level certainty; this is a screening brief, not local due diligence.";
  }

  if (leaderRow && leaderRow.liveFitScore < 68) {
    pause = `you need a clean all-around fit; ${leader.place.name} only reaches ${leaderRow.liveFitScore}/100 on the active Live Finder read, so read the dossier before shortlisting.`;
  } else if (avgRisk(leader.place) * 20 >= 45) {
    pause = `risk tolerance is low; the leader's composite risk load is ${Math.round(avgRisk(leader.place) * 20)}/100, so read the dossier before shortlisting.`;
  } else if (annualComfortMonthCount(leader.place) <= 4) {
    pause = `you need year-round outdoor ease; only ${annualComfortMonthCount(leader.place)} months clear the easy-living screen, so read the dossier before shortlisting.`;
  }

  return { love, pause };
}

function buildScoutNextStep(
  leader: RankingResult,
  decisionRows: readonly ShortlistDecisionRow[],
): ExplorerScoutBrief["nextStep"] {
  const leaderRow = decisionRows.find(row => row.place.id === leader.place.id);
  const runnerUp = decisionRows.find(row => row.place.id !== leader.place.id)?.place;
  const firstWindow = getBestMonths(leader.place).find(window => window.kind === "good");
  const watch = leaderRow?.watch
    ? `First caveat: ${lowerFirst(trimTerminalPunctuation(leaderRow.watch))}.`
    : "First caveat: read the risk and practical sections.";
  const compare = runnerUp
    ? `Then compare it with ${runnerUp.name}.`
    : "Then save it or compare it against another candidate.";

  if (firstWindow) {
    return {
      label: "Scout next",
      place: leader.place,
      action: `Scout ${leader.place.name}'s ${firstWindow.label.toLowerCase()}: ${firstWindow.range}.`,
      detail: `${firstWindow.label}: ${trimTerminalPunctuation(firstWindow.note ?? "best initial window from monthly normals")}. ${watch} ${compare}`,
    };
  }

  return {
    label: "Scout next",
    place: leader.place,
    action: `Read ${leader.place.name}'s dossier before treating it as a finalist.`,
    detail: `${watch} ${compare}`,
  };
}

export function buildExplorerScoutBrief(
  ranked: RankingResult[],
  rankingLabel: string,
  liveFitFilters: LiveFitFilters = {},
  scenario: ScenarioId = "now",
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

  const scenarioClause = scenario === "now"
    ? ""
    : ` under ${scenarioMeta(scenario).label} (illustrative regional projection)`;

  return {
    leader,
    compareIds,
    summary: `${leader.place.name} leads this view by ${rankingLabel}${scenarioClause}; the top ${shortlist.length} span ${countries.join(", ")} and ${archetypes.size} microclimate families.`,
    fitLine: leaderNote ? leaderNote : `${leader.place.koppen} climate signal with ${Math.round(leader.score)} score.`,
    decisionLine: decisionLine(decisionSignals),
    cautionLine: topRiskLine(leader.place),
    audienceRead: buildAudienceRead(leader, decisionRows, liveFitFilters),
    nextStep: buildScoutNextStep(leader, decisionRows),
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
        label: "Place feel",
        value: formatRange(places.map(placeFeelScore), "/100"),
        detail: "Derived feel rating across sensory comfort, daily ease, identity, and scouting clarity",
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
