import type { Place } from "../types";
import { annualComfortMonthCount, avgRisk, meanJanLow, meanSummerHigh, RISK_VALUE } from "./climate-metrics";
import { feltComfortScore, livedFrictionScore, dominantLivedFriction } from "./livability-score";
import { dominantPlaceFeelDrag, placeFeelScore } from "./place-feel";
import { assessLiveFit, type LiveFitFilters } from "./live-fit";

export interface DecisionMatrixInput {
  place: Place;
  score: number;
  note?: string;
}

export interface ShortlistDecisionRow {
  place: Place;
  rank: number;
  rankingScore: number;
  rankingNote: string;
  liveFitScore: number;
  comfortScore: number;
  easyMonths: number;
  riskLoad: number;
  growability: number;
  livedEase: number;
  placeFeelScore: number;
  bestFor: string;
  watch: string;
  decisionCue: string;
}

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

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function titleCase(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function compactSentence(s: string, max = 92): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(" ", max - 1);
  const head = clean.slice(0, cut > 48 ? cut : max).replace(/[;,:.\s]+$/, "");
  return `${head}...`;
}

function highestRisk(place: Place): { label: string; level: string; value: number } {
  const [key, risk] = (Object.entries(place.risks) as Array<[keyof Place["risks"], Place["risks"][keyof Place["risks"]]]>)
    .sort((a, b) => RISK_VALUE[b[1].level] - RISK_VALUE[a[1].level] || RISK_LABELS[a[0]].localeCompare(RISK_LABELS[b[0]]))[0];
  return {
    label: RISK_LABELS[key],
    level: risk.level.replace(/-/g, " "),
    value: RISK_VALUE[risk.level],
  };
}

function bestForLine(place: Place, comfortScore: number, riskEase: number, feelScore: number): string {
  const topSignal = [
    { label: "felt comfort", value: comfortScore },
    { label: "place feel", value: feelScore },
    { label: "low-risk living", value: riskEase },
    { label: "garden life", value: place.scores.growability },
    { label: "climate resilience", value: place.scores.resilience },
    { label: "quiet discovery", value: place.scores.hiddenGem },
    { label: "distinctive terrain", value: place.scores.microclimateUniqueness },
  ].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))[0]!;

  const audience = place.relocationFit[0] ? titleCase(place.relocationFit[0]) : "Climate scouts";
  return `${audience}; ${topSignal.label} is the edge.`;
}

function watchLine(place: Place, livedEase: number, feelScore: number): string {
  const risk = highestRisk(place);
  if (risk.value >= 3) return `${risk.label}: ${risk.level}`;

  const dominantFriction = dominantLivedFriction(place);
  if (dominantFriction && dominantFriction.value >= 55) {
    const axis = dominantFriction.axis === "cost"
      ? "Cost"
      : dominantFriction.axis === "social"
        ? "Social fabric"
        : "Daily access";
    return `${axis}: ${Math.round(dominantFriction.value)}/100 friction`;
  }

  const summerHigh = meanSummerHigh(place);
  if (summerHigh >= 31) return "Peak summer heat";

  const winterLow = meanJanLow(place);
  if (winterLow <= -12) return "Winter cold";

  if (place.scores.tradeoff >= 60) return "Tradeoff load is high";
  if (livedEase < 55) return "Lived friction needs checking";
  if (feelScore < 58) return `${dominantPlaceFeelDrag(place).label} needs checking`;
  return compactSentence(place.whoMightNot, 82);
}

export function buildShortlistDecisionRows(
  ranked: readonly DecisionMatrixInput[],
  liveFitFilters: LiveFitFilters = {},
  limit = 5,
): ShortlistDecisionRow[] {
  return ranked.slice(0, Math.max(0, limit)).map((row, index) => {
    const liveFit = assessLiveFit(row.place, liveFitFilters);
    const comfortScore = Math.round(feltComfortScore(row.place));
    const riskLoad = Math.round(avgRisk(row.place) * 20);
    const livedEase = Math.round(livedFrictionScore(row.place));
    const feelScore = Math.round(placeFeelScore(row.place));
    const bestFor = bestForLine(row.place, comfortScore, clamp100(100 - riskLoad), feelScore);
    const watch = watchLine(row.place, livedEase, feelScore);
    const watchCue = watch.replace(/[.!?]+$/, "");
    const rankingNote = row.note?.replace(/\s+/g, " ").trim() || `${Math.round(row.score)}/100 current ranking score`;

    return {
      place: row.place,
      rank: index + 1,
      rankingScore: Math.round(row.score),
      rankingNote,
      liveFitScore: liveFit.score,
      comfortScore,
      easyMonths: annualComfortMonthCount(row.place),
      riskLoad,
      growability: Math.round(row.place.scores.growability),
      livedEase,
      placeFeelScore: feelScore,
      bestFor,
      watch,
      decisionCue: `${bestFor} Watch ${watchCue.toLowerCase()}.`,
    };
  });
}
