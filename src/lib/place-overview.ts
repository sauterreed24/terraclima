// ============================================================
// Terraclima — Place experience ("what it actually feels like")
// ============================================================
// Composes a humanistic, season-by-season overview for every place from
// its structured climate record, so the dossier can lead with a vivid
// "what does this place feel like?" spotlight rather than a chart wall.
//
// Authored `Place.experience` fields (optional) win field-by-field over the
// derived read, letting flagship places carry deeper, voice-driven prose
// without forcing all 226 entries to be hand-written.
//
// Prose convention: temperatures are emitted in °C and localized at render
// by `localizeProse`. Most season detail is kept qualitative; the precise
// high/low numbers are surfaced by the spotlight component via `fmtTemp`.
// ============================================================

import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import {
  RISK_VALUE,
  annualComfortMonthCount,
  meanAnnualHumidityPct,
  meanJanLow,
  meanSummerHigh,
} from "./climate-metrics";

export type SeasonKey = "winter" | "spring" | "summer" | "autumn";

export interface SeasonReading {
  key: SeasonKey;
  label: string;
  /** Human month span, e.g. "Dec–Feb". */
  monthsLabel: string;
  glyph: string;
  /** Mean daily high across the season (°C). */
  highC: number;
  /** Mean daily low across the season (°C). */
  lowC: number;
  /** Coarse warmth band — drives card tinting. */
  tone: SeasonTone;
  /** 2–4 word descriptor, e.g. "Hot & sun-baked". */
  headline: string;
  /** One to two sentence sensory read (may contain °C, localized at render). */
  detail: string;
  /** True when the season detail came from authored prose. */
  authored: boolean;
}

export interface PlaceExperienceReading {
  /** Evocative one-liner (the de-quoted short summary). */
  lede: string;
  /** The rich immersive paragraph from the corpus. */
  immersive: string;
  /** Derived/authored skin-level "what it feels like" headline line. */
  feelLine: string;
  /** Four-season walkthrough, always in Winter→Autumn order. */
  seasons: SeasonReading[];
  /** What draws travelers, in human terms. */
  travelerFit: string;
  /** What full-time residency rewards. */
  residentFit: string;
  /** Who tends to bounce off the place. */
  wouldNotFit: string;
  /** Honest "what to expect / what to weigh" texture. */
  texture: string;
  /** True when any authored override contributed. */
  authored: boolean;
}

type SeasonTone = "frigid" | "cold" | "cool" | "mild" | "warm" | "hot";

interface SeasonDef {
  key: SeasonKey;
  label: string;
  monthsLabel: string;
  glyph: string;
  /** Month indices (0=Jan). Northern-hemisphere; the corpus is all NA. */
  idx: readonly [number, number, number];
}

const SEASON_DEFS: readonly SeasonDef[] = [
  { key: "winter", label: "Winter", monthsLabel: "Dec–Feb", glyph: "❄️", idx: [11, 0, 1] },
  { key: "spring", label: "Spring", monthsLabel: "Mar–May", glyph: "🌱", idx: [2, 3, 4] },
  { key: "summer", label: "Summer", monthsLabel: "Jun–Aug", glyph: "☀️", idx: [5, 6, 7] },
  { key: "autumn", label: "Autumn", monthsLabel: "Sep–Nov", glyph: "🍂", idx: [8, 9, 10] },
] as const;

function meanOf(values: readonly number[] | undefined, idx: readonly number[]): number | null {
  if (!values) return null;
  let sum = 0;
  for (const i of idx) sum += values[i];
  return sum / idx.length;
}

function toneForHigh(highC: number): SeasonTone {
  if (highC >= 31) return "hot";
  if (highC >= 24) return "warm";
  if (highC >= 16) return "mild";
  if (highC >= 8) return "cool";
  if (highC >= 1) return "cold";
  return "frigid";
}

function dayPhrase(tone: SeasonTone): string {
  switch (tone) {
    case "hot": return "Afternoons turn genuinely hot";
    case "warm": return "Afternoons land warm and shirtsleeve-easy";
    case "mild": return "Daytime is mild and open-window pleasant";
    case "cool": return "Days stay cool and brisk";
    case "cold": return "Days run cold";
    case "frigid": return "Daylight barely climbs above freezing";
  }
}

function nightPhrase(lowC: number, humidityMean: number | null): string {
  if (lowC <= -12) return "and nights turn bitterly cold";
  if (lowC <= -4) return "and nights drop hard below freezing";
  if (lowC <= 0.5) return "and nights settle around frost";
  if (lowC <= 7) return "and nights cool off crisply";
  if (lowC <= 15) return "and evenings stay mild";
  if (humidityMean != null && humidityMean >= 68) return "and nights stay warm and muggy";
  return "and nights stay warm";
}

interface SeasonConditions {
  snowy: boolean;
  wet: boolean;
  dry: boolean;
  humid: boolean;
  sunny: boolean;
  gray: boolean;
}

function seasonConditions(
  precipMean: number,
  snowMean: number | null,
  humidityMean: number | null,
  sunshineMean: number | null,
): SeasonConditions {
  return {
    snowy: (snowMean ?? 0) >= 12,
    wet: precipMean >= 95,
    dry: precipMean < 25,
    humid: humidityMean != null && humidityMean >= 70,
    sunny: sunshineMean != null && sunshineMean >= 68,
    gray: sunshineMean != null && sunshineMean < 42,
  };
}

function weatherPhrase(c: SeasonConditions, precipMean: number, snowMean: number | null): string {
  let base: string;
  if ((snowMean ?? 0) >= 28) base = "Heavy snow defines the season";
  else if (c.snowy) base = "Snow is a regular part of the picture";
  else if (precipMean < 18) base = "Skies stay mostly dry";
  else if (precipMean < 45) base = "Rain passes through now and then";
  else if (precipMean < 95) base = "Expect a healthy share of rain";
  else base = "Rain is frequent and can be heavy";

  // Snowy seasons read cleaner without sky/humidity tag-stacking.
  if (c.snowy) return base;

  const tags: string[] = [];
  if (c.sunny) tags.push("under lots of sun");
  else if (c.gray) tags.push("under often-gray skies");
  if (c.humid) tags.push("in soft, humid air");
  else if (c.dry) tags.push("with notably dry air");

  return tags.length ? `${base} ${tags.join(", ")}` : base;
}

const RISK_HUMAN: Record<string, string> = {
  wildfire: "wildfire",
  smoke: "summer smoke",
  extremeHeat: "summer heat",
  extremeCold: "deep winter cold",
  drought: "long-run drought",
  flood: "flooding",
  storm: "storms",
  coastal: "coastal and sea-level exposure",
  landslide: "slope stability",
};

function seasonRiskPhrase(place: Place, key: SeasonKey): string | null {
  const r = place.risks;
  const candidates: Array<keyof typeof r> =
    key === "summer" ? ["extremeHeat", "wildfire", "smoke", "storm"]
    : key === "winter" ? ["extremeCold", "storm"]
    : key === "spring" ? ["storm", "flood"]
    : ["storm", "wildfire", "coastal"];

  let best: keyof typeof r | null = null;
  let bestVal = 2; // require >= "elevated" (3)
  for (const k of candidates) {
    const v = RISK_VALUE[r[k].level];
    if (v > bestVal) { bestVal = v; best = k; }
  }
  if (!best) return null;

  switch (best) {
    case "extremeHeat": return "Heat waves are the thing to plan around";
    case "wildfire": return key === "summer" ? "Wildfire is the summer wildcard" : "Late-season fire risk lingers";
    case "smoke": return "Wildfire smoke can settle in for stretches";
    case "extremeCold": return "Arctic outbreaks can still bite";
    case "storm":
      return key === "winter" ? "Winter storms roll through" : key === "summer" ? "Afternoon thunderstorms build often" : "Storm systems can be lively";
    case "flood": return "Snowmelt and spring rain can swell rivers";
    case "coastal": return "Tropical systems are a fall-season risk";
    default: return null;
  }
}

function seasonHeadline(tone: SeasonTone, c: SeasonConditions): string {
  const toneAdj =
    tone === "hot" ? "Hot" :
    tone === "warm" ? "Warm" :
    tone === "mild" ? "Mild" :
    tone === "cool" ? "Cool" :
    tone === "cold" ? "Cold" : "Frigid";

  let texture: string;
  if (c.snowy) texture = "snow-blanketed";
  else if (c.wet) texture = "wet";
  else if (c.gray) texture = "often gray";
  else if (c.dry && (tone === "hot" || tone === "warm")) texture = "sun-baked";
  else if (c.dry) texture = "dry";
  else if (c.humid) texture = "humid";
  else if (c.sunny) texture = "sun-filled";
  else texture = "settled";

  return `${toneAdj} & ${texture}`;
}

function lowerFirst(text: string): string {
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}

function joinHumanList(items: readonly string[], max = 4): string {
  const clean = Array.from(new Set(items.map(s => s.trim()).filter(Boolean))).slice(0, max);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : text).trim();
}

function dequote(text: string): string {
  return text.replace(/^["“”']+|["“”']+$/g, "").trim();
}

function buildSeason(place: Place, def: SeasonDef): SeasonReading {
  const highC = meanOf(place.climate.tempHighC, def.idx) ?? 0;
  const lowC = meanOf(place.climate.tempLowC, def.idx) ?? 0;
  const precipMean = meanOf(place.climate.precipMm, def.idx) ?? 0;
  const snowMean = meanOf(place.climate.snowCm, def.idx);
  const humidityMean = meanOf(place.climate.humidity, def.idx);
  const sunshineMean = meanOf(place.climate.sunshinePct, def.idx);

  const tone = toneForHigh(highC);
  const conditions = seasonConditions(precipMean, snowMean, humidityMean, sunshineMean);

  const sentences: string[] = [
    `${dayPhrase(tone)}, ${nightPhrase(lowC, humidityMean)}.`,
    `${weatherPhrase(conditions, precipMean, snowMean)}.`,
  ];
  const risk = seasonRiskPhrase(place, def.key);
  if (risk) sentences.push(`${risk}.`);

  const authoredDetail = place.experience?.seasons?.[def.key];

  return {
    key: def.key,
    label: def.label,
    monthsLabel: def.monthsLabel,
    glyph: def.glyph,
    highC,
    lowC,
    tone,
    headline: seasonHeadline(tone, conditions),
    detail: authoredDetail ?? sentences.join(" "),
    authored: Boolean(authoredDetail),
  };
}

function summerWord(highC: number): string {
  const tone = toneForHigh(highC);
  return tone === "hot" ? "hot" : tone === "warm" ? "warm" : tone === "mild" ? "mild" : "cool";
}

function winterWord(janLowC: number): string {
  if (janLowC <= -12) return "bitterly cold";
  if (janLowC <= -4) return "cold";
  if (janLowC <= 2) return "chilly";
  if (janLowC <= 8) return "cool";
  if (janLowC <= 15) return "mild";
  return "warm";
}

function airWord(place: Place): string {
  const humidity = meanAnnualHumidityPct(place);
  if (humidity != null) {
    if (humidity >= 74) return "humid";
    if (humidity >= 60) return "moderately humid";
    if (humidity >= 46) return "balanced";
    return "dry and clear";
  }
  const k = place.koppen.trim().toUpperCase();
  if (k.startsWith("B")) return "dry and clear";
  if (k.startsWith("A")) return "humid";
  return "balanced";
}

function deriveFeelLine(place: Place): string {
  const easy = annualComfortMonthCount(place);
  const sh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const hook = ARCHETYPE_BY_ID[place.archetypes[0]]?.label?.toLowerCase() ?? "distinct microclimate";
  const easyClause =
    easy >= 12 ? `Nearly every month of the year lands in the easy-comfort zone`
    : easy >= 9 ? `Most of the year — about ${easy} months in 12 — sits in the easy-comfort zone`
    : easy >= 5 ? `Roughly ${easy} of the year's 12 months land in the easy-comfort zone`
    : easy >= 2 ? `Only about ${easy} months a year sit squarely in the easy-comfort zone`
    : `Genuine comfort is a short window here — barely ${easy} month${easy === 1 ? "" : "s"} a year`;
  return `${easyClause}. Summers run ${summerWord(sh)}, winters ${winterWord(jl)}, and the air tends ${airWord(place)} — textbook ${hook}.`;
}

/** Cadence-only travel tags ("year-round", "summer") don't read as draws. */
const CADENCE_TRAVEL_TAGS = new Set([
  "year-round", "year round", "summer", "winter", "spring", "fall", "autumn",
  "shoulder seasons", "shoulder season", "all seasons",
]);

function deriveTravelerFit(place: Place): string {
  const draws = place.travelFit.filter(t => !CADENCE_TRAVEL_TAGS.has(t.trim().toLowerCase()));
  if (draws.length) {
    return `Travelers come for ${joinHumanList(draws, 4)}.`;
  }
  const hook = ARCHETYPE_BY_ID[place.archetypes[0]]?.label?.toLowerCase() ?? "the microclimate";
  return `Visitors come to experience the ${hook} firsthand and the landscape that shapes it.`;
}

function deriveTexture(place: Place): string {
  const tradeoff = place.scores.tradeoff;
  const base =
    tradeoff >= 60 ? "This is a real-tradeoff place"
    : tradeoff >= 45 ? "It asks for a few compromises"
    : "It is an easy place to settle into";

  const ranked = (Object.keys(place.risks) as Array<keyof typeof place.risks>)
    .map(k => ({ k, v: RISK_VALUE[place.risks[k].level] }))
    .filter(r => r.v >= 3 && RISK_HUMAN[r.k as string])
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map(r => RISK_HUMAN[r.k as string]!);

  const riskClause = ranked.length
    ? `the main things to weigh are ${joinHumanList(ranked, 2)}`
    : "no single hazard dominates the picture";

  let livedCue = "";
  const ls = place.liveSignals;
  if (ls) {
    if ((ls.costPressure ?? 0) >= 70) livedCue = " Housing runs expensive, so budget is part of the calculus.";
    else if ((ls.accessFriction ?? 0) >= 65) livedCue = " Day-to-day services sit a real drive away.";
    else if ((ls.socialStress ?? 0) >= 65) livedCue = " Local social-fabric stress is worth checking in person.";
  }

  return `${base}: ${riskClause}.${livedCue}`;
}

const _experienceCache = new WeakMap<Place, PlaceExperienceReading>();

/**
 * Build the humanistic overview read for a place. Deterministic and cached by
 * place identity. Authored `place.experience` fields override the derived
 * equivalents field-by-field.
 */
export function composePlaceExperience(place: Place): PlaceExperienceReading {
  const cached = _experienceCache.get(place);
  if (cached) return cached;

  const seasons = SEASON_DEFS.map(def => buildSeason(place, def));
  const authoredFeel = place.experience?.feel;
  const authoredTraveler = place.experience?.travelerFit;
  const authoredResident = place.experience?.residentFit;
  const authoredTexture = place.experience?.texture;

  const result: PlaceExperienceReading = {
    lede: dequote(place.summaryShort),
    immersive: place.summaryImmersive,
    feelLine: authoredFeel ?? deriveFeelLine(place),
    seasons,
    travelerFit: authoredTraveler ?? deriveTravelerFit(place),
    residentFit: authoredResident ?? place.whoWouldLove,
    wouldNotFit: place.whoMightNot,
    texture: authoredTexture ?? deriveTexture(place),
    authored: Boolean(
      authoredFeel || authoredTraveler || authoredResident || authoredTexture ||
      seasons.some(s => s.authored),
    ),
  };

  _experienceCache.set(place, result);
  return result;
}

/** Convenience for prose helpers that want the resident-fit sentence lower-cased. */
export function residentFitClause(place: Place): string {
  return lowerFirst(firstSentence(composePlaceExperience(place).residentFit));
}
