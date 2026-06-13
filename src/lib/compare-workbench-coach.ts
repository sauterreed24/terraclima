import type { Place } from "../types";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh } from "./climate-metrics";
import { compareLensScore, type CompareDecisionProfile } from "./compare-finalist-verdict";
import { comparisonLensLabel, type ComparisonLensId } from "./compare-workbench";

export type CompareCoachLaneId = "lens" | "climate-contrast" | "risk" | "evidence";

export interface CompareCoachRecommendation {
  lane: CompareCoachLaneId;
  label: string;
  place: Place;
  metric: string;
  detail: string;
  score: number;
}

interface CompareCoachInput {
  activePlaces: readonly Place[];
  candidateProfiles: readonly CompareDecisionProfile[];
  lens: ComparisonLensId;
}

interface ActiveClimateAverages {
  summerHighC: number;
  janLowC: number;
  annualPrecipMm: number;
  elevationM: number;
}

function byProfileName(a: CompareDecisionProfile, b: CompareDecisionProfile): number {
  return a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id);
}

function pickMax(
  profiles: readonly CompareDecisionProfile[],
  score: (profile: CompareDecisionProfile) => number,
): CompareDecisionProfile | null {
  return [...profiles].sort((a, b) => score(b) - score(a) || byProfileName(a, b))[0] ?? null;
}

function pickMin(
  profiles: readonly CompareDecisionProfile[],
  score: (profile: CompareDecisionProfile) => number,
): CompareDecisionProfile | null {
  return [...profiles].sort((a, b) => score(a) - score(b) || byProfileName(a, b))[0] ?? null;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function activeClimateAverages(activePlaces: readonly Place[]): ActiveClimateAverages {
  return {
    summerHighC: average(activePlaces.map(meanSummerHigh)),
    janLowC: average(activePlaces.map(meanJanLow)),
    annualPrecipMm: average(activePlaces.map(getAnnualPrecipMm)),
    elevationM: average(activePlaces.map(place => place.elevationM)),
  };
}

function climateContrastScore(place: Place, active: ActiveClimateAverages): number {
  return Math.round(
    Math.abs(meanSummerHigh(place) - active.summerHighC) * 4 +
    Math.abs(meanJanLow(place) - active.janLowC) * 3 +
    Math.abs(getAnnualPrecipMm(place) - active.annualPrecipMm) / 22 +
    Math.abs(place.elevationM - active.elevationM) / 85,
  );
}

function evidenceScore(place: Place): number {
  const confidence = place.confidence === "high" ? 32 : place.confidence === "moderate" ? 20 : 8;
  const httpsCitations = place.citations.filter(citation => citation.url?.startsWith("https://")).length;
  return (
    confidence +
    Math.min(httpsCitations * 8, 32) +
    Math.min((place.deepSections?.length ?? 0) * 8, 24) +
    (place.liveSignals ? 12 : 0) +
    (place.climate.humidity?.length ? 5 : 0) +
    (place.climate.sunshinePct?.length ? 5 : 0)
  );
}

function evidenceDetail(place: Place): string {
  const citations = place.citations.filter(citation => citation.url?.startsWith("https://")).length;
  const deepSections = place.deepSections?.length ?? 0;
  const sourceBacked = place.liveSignals ? "source-backed lived signals" : "limited lived signals";
  return `${place.confidence} confidence, ${citations} HTTPS citation${citations === 1 ? "" : "s"}, ${deepSections} deep section${deepSections === 1 ? "" : "s"}, ${sourceBacked}.`;
}

function pushUnique(
  rows: CompareCoachRecommendation[],
  recommendation: CompareCoachRecommendation | null,
  limit: number,
) {
  if (!recommendation || rows.length >= limit) return;
  if (rows.some(row => row.place.id === recommendation.place.id)) return;
  rows.push(recommendation);
}

export function buildCompareCoachRecommendations({
  activePlaces,
  candidateProfiles,
  lens,
}: CompareCoachInput): CompareCoachRecommendation[] {
  const activeIds = new Set(activePlaces.map(place => place.id));
  const inactive = candidateProfiles.filter(profile => !activeIds.has(profile.place.id));
  if (inactive.length === 0 || activePlaces.length === 0) return [];

  const activeProfiles = candidateProfiles.filter(profile => activeIds.has(profile.place.id));
  const rows: CompareCoachRecommendation[] = [];
  const lensLabel = comparisonLensLabel(lens);
  const bestLens = pickMax(inactive, profile => compareLensScore(profile, lens));
  const weakestActiveLens = activeProfiles.length
    ? Math.min(...activeProfiles.map(profile => compareLensScore(profile, lens)))
    : null;

  pushUnique(rows, bestLens ? {
    lane: "lens",
    label: `${lensLabel} upgrade`,
    place: bestLens.place,
    metric: `${compareLensScore(bestLens, lens)}/100`,
    detail: weakestActiveLens != null && compareLensScore(bestLens, lens) > weakestActiveLens
      ? `Scores above the weakest active slot for the ${lensLabel.toLowerCase()} lens.`
      : `Keeps the strongest inactive ${lensLabel.toLowerCase()} candidate within reach.`,
    score: compareLensScore(bestLens, lens),
  } : null, 3);

  const climateAverages = activeClimateAverages(activePlaces);
  const climateContrast = pickMax(inactive, profile => climateContrastScore(profile.place, climateAverages));
  pushUnique(rows, climateContrast ? {
    lane: "climate-contrast",
    label: "Climate contrast",
    place: climateContrast.place,
    metric: `contrast ${climateContrastScore(climateContrast.place, climateAverages)}`,
    detail: "Adds the strongest temperature, precipitation, or elevation contrast outside the active slots.",
    score: climateContrastScore(climateContrast.place, climateAverages),
  } : null, 3);

  const riskCounterweight = pickMin(inactive, profile => profile.riskLoad);
  const bestActiveRisk = activeProfiles.length
    ? Math.min(...activeProfiles.map(profile => profile.riskLoad))
    : null;
  pushUnique(rows, riskCounterweight ? {
    lane: "risk",
    label: "Risk counterweight",
    place: riskCounterweight.place,
    metric: `${riskCounterweight.riskLoad}/100 risk`,
    detail: bestActiveRisk != null && riskCounterweight.riskLoad < bestActiveRisk
      ? `Lower composite risk than every active slot; useful before a relocation decision.`
      : "Keeps the lowest-risk inactive candidate ready for a caution pass.",
    score: 100 - riskCounterweight.riskLoad,
  } : null, 3);

  const evidenceAnchor = pickMax(inactive, profile => evidenceScore(profile.place));
  pushUnique(rows, evidenceAnchor ? {
    lane: "evidence",
    label: "Evidence anchor",
    place: evidenceAnchor.place,
    metric: `${evidenceScore(evidenceAnchor.place)} evidence`,
    detail: evidenceDetail(evidenceAnchor.place),
    score: evidenceScore(evidenceAnchor.place),
  } : null, 3);

  return rows;
}
