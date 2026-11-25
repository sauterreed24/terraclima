import type { Place, ScenarioId } from "../types";
import { scenarioMeta } from "./climate-projection";
import { ARCHETYPE_LABELS } from "../types";
import { getVisitWindow } from "./best-months";
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
import { possessive } from "./place-name";

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
  advisorRead: {
    verdict: string;
    why: string;
    checkFirst: string;
    nextAction: string;
    confidence: string;
  };
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
  fieldCheck: {
    label: string;
    place: Place;
    target: string;
    action: string;
    detail: string;
    source: "nearby-contrast" | "local-contrast" | "settlement-anchor" | "derived";
  };
  scoutPlan: {
    label: string;
    place: Place;
    action: string;
    detail: string;
    kind: "leader" | "field-check" | "tradeoff";
  }[];
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
    return `Watch ${RISK_LABELS[key].toLowerCase()} exposure (${riskText}) before you save it.`;
  }
  return "No single major risk for the top place. Still read its risk section before deciding.";
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
    detail: `${place.name} leads the top places on ${label.toLowerCase()} at ${value}${valueSuffix}.`,
  };
}

function pickLowRiskSignal(places: Place[]): ExplorerScoutBrief["decisionSignals"][number] {
  const place = [...places].sort((a, b) => avgRisk(a) - avgRisk(b) || a.name.localeCompare(b.name))[0]!;
  const value = Math.round(avgRisk(place) * 20);
  return {
    label: "Lowest risk",
    place,
    value: `${value}/100`,
    detail: `${place.name} has the lowest overall risk among the top places.`,
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
  if (!top) return "No scores are available for this view.";
  if (winners.length === 1) {
    return `${top.place.name} leads on every priority in this list; still read risk and local access before deciding.`;
  }
  if (top.count >= 3) {
    return `${top.place.name} leads on ${top.count} of ${signals.length} priorities; use the remaining split to check tradeoffs.`;
  }
  return `No single place dominates: ${top.place.name} leads ${top.count} priorities, while ${winners[1]!.place.name} keeps at least one priority in play.`;
}

function signalWinCount(signals: ExplorerScoutBrief["decisionSignals"], place: Place): number {
  return signals.filter(signal => signal.place.id === place.id).length;
}

function trimTerminalPunctuation(value: string): string {
  return value.replace(/[.!?]+$/, "").trim();
}

function lowerFirst(value: string): string {
  if (!value) return value;
  return `${value[0].toLowerCase()}${value.slice(1)}`;
}

function checkObject(value: string): string {
  return lowerFirst(trimTerminalPunctuation(value)).replace(/^check\s+/i, "");
}

const PRESET_AUDIENCE: Record<LiveFitPresetId, string> = {
  "cool-summers": "heat-sensitive movers",
  "mild-winters": "mild-winter seekers",
  "sunny-winters": "gray-winter escapees",
  "dry-air": "dry-air seekers",
  "gardenable": "gardeners",
  "low-fire-smoke": "smoke-sensitive movers",
  "four-seasons": "four-season households",
  "snow-country": "snow-country people",
  "coastal-buffer": "coastal-buffer seekers",
  "quiet-small-town": "people who want a quiet town",
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
  if (filters.maxSummerHighC != null) thresholdAudiences.push("people escaping heat");
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
  const bestFor = leaderRow?.bestFor.split(";")[0]?.trim() || leader.place.relocationFit[0]?.replace(/\s+/g, " ").trim() || "people choosing by climate";
  const liveFit = leaderRow ? `fit ${leaderRow.liveFitScore}` : `score ${Math.round(leader.score)}`;
  const love = `${audience} should start here${preference}: ${leader.place.name} leads the list with ${liveFit}, and ${bestFor.toLowerCase()} is the clearest match.`;

  let pause: string;
  if (leaderRow?.watch) {
    pause = `${lowerFirst(trimTerminalPunctuation(leaderRow.watch))} would be a deal-breaker; verify that in the profile before you save it.`;
  } else {
    pause = "you need address-level certainty; this summary narrows a list; it does not replace checking the exact location.";
  }

  if (leaderRow && leaderRow.liveFitScore < 68) {
    pause = `you need a clean all-around fit; ${leader.place.name} only reaches ${leaderRow.liveFitScore}/100 on your must-haves, so read the profile before you save it.`;
  } else if (avgRisk(leader.place) * 20 >= 45) {
    pause = `risk tolerance is low; the leader's overall risk is ${Math.round(avgRisk(leader.place) * 20)}/100, so read the profile before you save it.`;
  } else if (annualComfortMonthCount(leader.place) <= 4) {
    pause = `you need year-round outdoor ease; only ${annualComfortMonthCount(leader.place)} months clear the comfort threshold, so read the profile before you save it.`;
  }

  return { love, pause };
}

function buildScoutNextStep(
  leader: RankingResult,
  decisionRows: readonly ShortlistDecisionRow[],
): ExplorerScoutBrief["nextStep"] {
  const leaderRow = decisionRows.find(row => row.place.id === leader.place.id);
  const runnerUp = decisionRows.find(row => row.place.id !== leader.place.id)?.place;
  const firstWindow = getVisitWindow(leader.place);
  const watch = leaderRow?.watch
    ? `First caveat: ${lowerFirst(trimTerminalPunctuation(leaderRow.watch))}.`
    : "First caveat: read the risk and practical sections.";
  const compare = runnerUp
    ? `Then compare it with ${runnerUp.name}.`
    : "Then save it or compare it against another candidate.";

  if (firstWindow) {
    return {
      label: "Visit next",
      place: leader.place,
      action: `Visit ${leader.place.name} in its ${firstWindow.label.toLowerCase()} months: ${firstWindow.range}.`,
      detail: `${firstWindow.label}: ${trimTerminalPunctuation(firstWindow.note ?? "the best first window, from monthly averages")}. ${watch} ${compare}`,
    };
  }

  return {
    label: "Visit next",
    place: leader.place,
    action: `Read ${possessive(leader.place.name)} profile before you save it.`,
    detail: `${watch} ${compare}`,
  };
}

function buildFieldCheck(leader: Place): ExplorerScoutBrief["fieldCheck"] {
  const nearby = leader.nearbyContrasts?.find(contrast => contrast.note.trim());
  if (nearby) {
    return {
      label: "Check in person",
      place: leader,
      target: nearby.label,
      action: `Compare ${leader.name} with ${nearby.label}.`,
      detail: `${nearby.note.trim()} Visit both to confirm the difference in person.`,
      source: "nearby-contrast",
    };
  }

  const local = leader.localContrast?.find(contrast => contrast.note?.trim());
  if (local?.note) {
    return {
      label: "Check in person",
      place: leader,
      target: `Within ${local.radiusKm} km`,
      action: `Drive or walk the ${local.radiusKm} km contrast around ${leader.name}.`,
      detail: `${local.note.trim()} The change over that distance shows how local the climate is.`,
      source: "local-contrast",
    };
  }

  const anchor = leader.settlementsWithinZone?.find(settlement => settlement.name.trim());
  if (anchor) {
    return {
      label: "Check in person",
      place: leader,
      target: anchor.name,
      action: `Base the visit in ${anchor.name}.`,
      detail: `${anchor.note?.trim() || `${anchor.name} is a practical base inside the area.`} Compare services, exposure, roads, shade, and drainage before widening the search.`,
      source: "settlement-anchor",
    };
  }

  return {
    label: "Check in person",
    place: leader,
    target: "Sun, shade and slope nearby",
    action: `Walk or drive ${possessive(leader.name)} nearby sun, shade and slope.`,
    detail: "Compare sun, shade, slope, drainage, and wind over a short route; the atlas describes the area, not a specific property.",
    source: "derived",
  };
}

function buildScoutPlan(
  leader: RankingResult,
  nextStep: ExplorerScoutBrief["nextStep"],
  fieldCheck: ExplorerScoutBrief["fieldCheck"],
  decisionRows: readonly ShortlistDecisionRow[],
): ExplorerScoutBrief["scoutPlan"] {
  const plan: ExplorerScoutBrief["scoutPlan"] = [
    {
      label: "Start here",
      place: nextStep.place,
      action: nextStep.action,
      detail: nextStep.detail,
      kind: "leader",
    },
    {
      label: "Check in person",
      place: fieldCheck.place,
      action: fieldCheck.action,
      detail: fieldCheck.detail,
      kind: "field-check",
    },
  ];

  const runnerUp = decisionRows.find(row => row.place.id !== leader.place.id);
  if (runnerUp) {
    plan.push({
      label: "Second read",
      place: runnerUp.place,
      action: `Read ${runnerUp.place.name} as the tradeoff check after ${leader.place.name}.`,
      detail: `Compare against the leader; ${lowerFirst(trimTerminalPunctuation(runnerUp.watch))}.`,
      kind: "tradeoff",
    });
  }

  return plan;
}

function buildAdvisorRead(
  leader: RankingResult,
  decisionRows: readonly ShortlistDecisionRow[],
  decisionSignals: ExplorerScoutBrief["decisionSignals"],
  nextStep: ExplorerScoutBrief["nextStep"],
  fieldCheck: ExplorerScoutBrief["fieldCheck"],
): ExplorerScoutBrief["advisorRead"] {
  const leaderRow = decisionRows.find(row => row.place.id === leader.place.id);
  const signalWins = signalWinCount(decisionSignals, leader.place);
  const signalLine = signalWins > 0
    ? ` and leads ${signalWins} of ${decisionSignals.length} priorities`
    : "";
  const rankingNote = leader.note?.replace(/\s+/g, " ").trim();
  const bestFor = leaderRow?.bestFor.split(";")[0]?.trim() || leader.place.relocationFit[0] || "people choosing by climate";
  const watch = leaderRow?.watch
    ? checkObject(leaderRow.watch)
    : "the risk and practical notes sections of the profile";
  const liveFitRead = leaderRow
    ? `fit ${leaderRow.liveFitScore}/100`
    : `ranking score ${Math.round(leader.score)}/100`;

  let confidence = "Confidence: rough. Compare at least one other place before you save one.";
  if (leaderRow && decisionRows.length >= 3 && leaderRow.liveFitScore >= 78 && signalWins >= 2) {
    confidence = "Confidence: strong for this ranking. Still check the exact location yourself.";
  } else if (leaderRow && leaderRow.liveFitScore >= 68) {
    confidence = "Confidence: fair, with one tradeoff to check before you save it.";
  } else if (decisionRows.length < 3) {
    confidence = "Confidence: low, because few places match. Widen the search or compare more places.";
  }

  return {
    verdict: `${leader.place.name} is the place to look at first in this view. That is not a recommendation to move.`,
    why: `Best suited to ${bestFor}; ${liveFitRead}${signalLine}.${rankingNote ? ` ${rankingNote}` : ""}`,
    checkFirst: `Verify ${watch} first, then run the ${fieldCheck.target} in-person check.`,
    nextAction: nextStep.action,
    confidence,
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
  const nextStep = buildScoutNextStep(leader, decisionRows);
  const fieldCheck = buildFieldCheck(leader.place);
  const scoutPlan = buildScoutPlan(leader, nextStep, fieldCheck, decisionRows);
  const advisorRead = buildAdvisorRead(leader, decisionRows, decisionSignals, nextStep, fieldCheck);

  const scenarioClause = scenario === "now"
    ? ""
    : ` under ${scenarioMeta(scenario).label} (illustrative regional projection)`;

  return {
    leader,
    compareIds,
    summary: `${leader.place.name} leads this view by ${rankingLabel}${scenarioClause}; the top ${shortlist.length} span ${countries.join(", ")} and ${archetypes.size} climate types.`,
    fitLine: leaderNote ? leaderNote : `${leader.place.koppen} climate, with a score of ${Math.round(leader.score)}.`,
    advisorRead,
    decisionLine: decisionLine(decisionSignals),
    cautionLine: topRiskLine(leader.place),
    audienceRead: buildAudienceRead(leader, decisionRows, liveFitFilters),
    nextStep,
    fieldCheck,
    scoutPlan,
    decisionSignals,
    decisionRows,
    metrics: [
      {
        label: "Summer highs",
        value: formatRange(places.map(meanSummerHigh), "°C"),
        detail: "Average Jun–Aug high across the top places",
      },
      {
        label: "Winter lows",
        value: formatRange(places.map(meanJanLow), "°C"),
        detail: "Average Dec–Feb low across the top places",
      },
      {
        label: "Easy months",
        value: formatRange(places.map(annualComfortMonthCount), " mo"),
        detail: "Months with comfortable days and nights and no heavy rain",
      },
      {
        label: "Place feel",
        value: formatRange(places.map(placeFeelScore), "/100"),
        detail: "Comfort, ease of daily life, character and how well documented the place is, 0–100; higher is better",
      },
      {
        label: "Precip range",
        value: formatRange(places.map(getAnnualPrecipMm), " mm"),
        detail: "Lowest to highest annual precipitation among the top places",
      },
      {
        label: "Overall risk",
        value: formatRange(places.map(place => avgRisk(place) * 20), "/100"),
        detail: "The average of nine hazard ratings, 0–100; lower is better",
      },
      {
        label: "Most common type",
        value: topArchetypeLabel(places),
        detail: "The climate type most of the top places share",
      },
    ],
  };
}
