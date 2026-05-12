import type { Place } from "../types";
import {
  annualComfortMonthCount,
  avgRisk,
  meanJanLow,
  meanSummerHigh,
  RISK_VALUE,
  seasonalUsabilityScore,
  summerDiurnalC,
} from "./climate-metrics";

export type PlaceFeelComponentKey =
  | "sensoryComfort"
  | "dailyEase"
  | "placeIdentity"
  | "scoutingClarity";

export interface PlaceFeelComponent {
  key: PlaceFeelComponentKey;
  label: string;
  value: number;
  contribution: number;
  rationale: string;
}

export interface PlaceFeelResult {
  place: Place;
  score: number;
  band: "Exceptional" | "Easy" | "Textured" | "Demanding" | "Hard";
  headline: string;
  summary: string;
  components: PlaceFeelComponent[];
  strengths: string[];
  frictions: string[];
}

export const PLACE_FEEL_WEIGHTS: Record<PlaceFeelComponentKey, number> = {
  sensoryComfort: 0.34,
  dailyEase: 0.30,
  placeIdentity: 0.20,
  scoutingClarity: 0.16,
};

const COMPONENT_LABEL: Record<PlaceFeelComponentKey, string> = {
  sensoryComfort: "Sensory comfort",
  dailyEase: "Daily ease",
  placeIdentity: "Place identity",
  scoutingClarity: "Scouting clarity",
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
}

function placeBand(score: number): PlaceFeelResult["band"] {
  if (score >= 84) return "Exceptional";
  if (score >= 74) return "Easy";
  if (score >= 62) return "Textured";
  if (score >= 48) return "Demanding";
  return "Hard";
}

function pushLimited(list: string[], value: string, max = 3): void {
  if (list.length >= max || list.includes(value)) return;
  list.push(value);
}

function compact(text: string, max = 128): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(" ", max - 1);
  return `${clean.slice(0, cut > 64 ? cut : max).replace(/[;,:.\s]+$/, "")}...`;
}

function sourceCount(place: Place): number {
  const liveSources = place.liveSignals?.sources?.length ?? 0;
  return place.citations.length + liveSources;
}

function authoredTextureScore(place: Place): number {
  const deep = place.deepSections?.length ?? 0;
  const settlements = place.settlementsWithinZone?.length ?? 0;
  const activities = place.thingsToDo?.length ?? 0;
  const local = (place.localContrast?.length ?? 0) + (place.nearbyContrasts?.length ?? 0);
  const proseDepth =
    Math.min(22, place.summaryImmersive.length / 36) +
    Math.min(16, place.whyDistinct.length / 32) +
    Math.min(10, place.whoWouldLove.length / 22) +
    Math.min(10, place.whoMightNot.length / 22);

  return clamp(
    proseDepth +
      Math.min(18, deep * 7) +
      Math.min(12, settlements * 4) +
      Math.min(12, activities * 3) +
      Math.min(10, local * 3),
  );
}

function confidenceScore(place: Place): number {
  if (place.confidence === "high") return 92;
  if (place.confidence === "moderate") return 74;
  return 54;
}

function serviceAnchorScore(place: Place): number {
  const settlementCount = place.settlementsWithinZone?.length ?? 0;
  const isCityLike =
    /\b(city|metro|urban|capital|college|university)\b/i.test(`${place.name} ${place.summaryImmersive}`) ||
    place.relocationFit.some(tag => /urban|professionals|students|families|retirees|remote/i.test(tag));
  const access = place.liveSignals?.accessFriction;
  const authored = clamp(54 + Math.min(22, settlementCount * 7) + (isCityLike ? 14 : 0));
  const accessEase = access == null ? 66 : 100 - clamp(access);
  return clamp(authored * 0.55 + accessEase * 0.45);
}

function livedAxisEase(place: Place): number {
  const ls = place.liveSignals;
  if (!ls) return 68;
  const axes = [ls.costPressure, ls.socialStress, ls.accessFriction].filter((v): v is number => v != null);
  if (axes.length === 0) return 68;
  const friction = axes.reduce((sum, v) => sum + clamp(v), 0) / axes.length;
  return clamp(100 - friction);
}

function skyAirCue(place: Place): number {
  let score = 68;
  if (place.climate.sunshinePct) {
    const annualSun = place.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12;
    score += (annualSun - 58) * 0.55;
  }
  if (place.climate.humidity) {
    const summerHumidity = (place.climate.humidity[5] + place.climate.humidity[6] + place.climate.humidity[7]) / 3;
    if (summerHumidity > 74 && summerDiurnalC(place) < 11) score -= (summerHumidity - 74) * 0.7;
  }
  score -= RISK_VALUE[place.risks.smoke.level] * 4;
  score -= RISK_VALUE[place.risks.storm.level] * 2.2;
  return clamp(score);
}

function thermalEnvelopeScore(place: Place): number {
  const summer = meanSummerHigh(place);
  const winter = meanJanLow(place);
  let score = 82;
  if (summer > 30) score -= (summer - 30) * 4.2;
  if (summer < 16) score -= (16 - summer) * 1.8;
  if (winter < -8) score -= (-8 - winter) * 3.4;
  if (winter > 16) score -= (winter - 16) * 1.7;
  if (summerDiurnalC(place) >= 12 && summer < 33) score += 5;
  return clamp(score);
}

function sensoryComfort(place: Place): number {
  return clamp(
    place.scores.comfort * 0.38 +
      seasonalUsabilityScore(place) * 0.24 +
      thermalEnvelopeScore(place) * 0.24 +
      skyAirCue(place) * 0.14,
  );
}

function dailyEase(place: Place): number {
  const riskEase = clamp(100 - avgRisk(place) * 17);
  return clamp(
    livedAxisEase(place) * 0.34 +
      serviceAnchorScore(place) * 0.26 +
      riskEase * 0.24 +
      confidenceScore(place) * 0.16,
  );
}

function placeIdentity(place: Place): number {
  const identityTags = new Set([
    ...place.archetypes,
    ...place.drivers,
    ...place.relocationFit.map(s => s.toLowerCase()),
    ...place.travelFit.map(s => s.toLowerCase()),
  ]);
  return clamp(
    authoredTextureScore(place) * 0.46 +
      place.scores.microclimateUniqueness * 0.22 +
      place.scores.hiddenGem * 0.16 +
      Math.min(100, identityTags.size * 8) * 0.16,
  );
}

function scoutingClarity(place: Place): number {
  const anchors =
    (place.settlementsWithinZone?.length ?? 0) +
    (place.thingsToDo?.length ?? 0) +
    (place.localContrast?.length ?? 0) +
    (place.nearbyContrasts?.length ?? 0);
  return clamp(
    confidenceScore(place) * 0.30 +
      Math.min(100, sourceCount(place) * 14) * 0.24 +
      Math.min(100, anchors * 10) * 0.28 +
      authoredTextureScore(place) * 0.18,
  );
}

function componentRationale(place: Place, key: PlaceFeelComponentKey): string {
  switch (key) {
    case "sensoryComfort":
      return `${annualComfortMonthCount(place)}/12 easy months, summer ${meanSummerHigh(place).toFixed(1)}C, winter ${meanJanLow(place).toFixed(1)}C, sky/air cue ${Math.round(skyAirCue(place))}/100`;
    case "dailyEase":
      return `Services/access ${Math.round(serviceAnchorScore(place))}/100, lived axes ${Math.round(livedAxisEase(place))}/100, risk ease ${Math.round(clamp(100 - avgRisk(place) * 17))}/100`;
    case "placeIdentity":
      return `Authored texture ${Math.round(authoredTextureScore(place))}/100, uniqueness ${Math.round(place.scores.microclimateUniqueness)}/100, hidden-gem ${Math.round(place.scores.hiddenGem)}/100`;
    case "scoutingClarity":
      return `${sourceCount(place)} sources, ${(place.settlementsWithinZone?.length ?? 0)} settlements, ${(place.thingsToDo?.length ?? 0)} activities, ${place.confidence} confidence`;
  }
}

const _feelCache = new WeakMap<Place, PlaceFeelResult>();

export function scorePlaceFeel(place: Place): PlaceFeelResult {
  const cached = _feelCache.get(place);
  if (cached) return cached;

  const values: Record<PlaceFeelComponentKey, number> = {
    sensoryComfort: sensoryComfort(place),
    dailyEase: dailyEase(place),
    placeIdentity: placeIdentity(place),
    scoutingClarity: scoutingClarity(place),
  };
  const components: PlaceFeelComponent[] = (Object.keys(values) as PlaceFeelComponentKey[]).map(key => ({
    key,
    label: COMPONENT_LABEL[key],
    value: values[key],
    contribution: values[key] * PLACE_FEEL_WEIGHTS[key],
    rationale: componentRationale(place, key),
  }));
  const score = Math.round(clamp(components.reduce((sum, c) => sum + c.contribution, 0)));
  const band = placeBand(score);
  const sorted = [...components].sort((a, b) => b.value - a.value);
  const weak = [...components].sort((a, b) => a.value - b.value);
  const strengths: string[] = [];
  const frictions: string[] = [];

  if (values.sensoryComfort >= 72) pushLimited(strengths, "The climate reads easy at skin level, not only on annual averages.");
  if (values.dailyEase >= 72) pushLimited(strengths, "Daily-life signals look workable: access, risk load, and lived friction do not dominate.");
  if (values.placeIdentity >= 72) pushLimited(strengths, "The place has a legible identity in the corpus: terrain, culture, and activity cues reinforce each other.");
  if (values.scoutingClarity >= 72) pushLimited(strengths, "The entry gives enough anchors to scout the place in the real world instead of guessing from a map.");
  if (strengths.length === 0) pushLimited(strengths, `${sorted[0]!.label} is the strongest part of the feel read.`);

  if (values.sensoryComfort < 55) pushLimited(frictions, "Sensory comfort is mixed: temperature, sky, storm, smoke, or dampness can change the mood fast.");
  if (values.dailyEase < 55) pushLimited(frictions, "Daily ease needs verification before shortlisting: access, social/cost friction, or risk load can bite.");
  if (values.placeIdentity < 55) pushLimited(frictions, "The corpus still reads thin here; treat the feel score as a scouting prompt, not a finished portrait.");
  if (values.scoutingClarity < 55) pushLimited(frictions, "Scouting clarity is limited; there are fewer authored anchors, activities, or contrasts than stronger entries.");
  if (frictions.length === 0) pushLimited(frictions, `${weak[0]!.label} is the first thing to verify in person.`);

  const headline = `${band} place feel (${score}/100)`;
  const summary = `${strengths[0]} ${frictions[0]}`;
  const result: PlaceFeelResult = {
    place,
    score,
    band,
    headline,
    summary: compact(summary, 220),
    components,
    strengths,
    frictions,
  };
  _feelCache.set(place, result);
  return result;
}

export function placeFeelScore(place: Place): number {
  return scorePlaceFeel(place).score;
}

export function dominantPlaceFeelDrag(place: Place): PlaceFeelComponent {
  return [...scorePlaceFeel(place).components].sort((a, b) => a.value - b.value)[0]!;
}

export function dominantPlaceFeelStrength(place: Place): PlaceFeelComponent {
  return [...scorePlaceFeel(place).components].sort((a, b) => b.value - a.value)[0]!;
}
