// ============================================================
// Terraclima — Place experience ("what it actually feels like")
// ============================================================
// Composes a humanistic, season-by-season overview for every place from
// its structured climate record, so the dossier can lead with a vivid
// "what does this place feel like?" spotlight rather than a chart wall.
// The same engine also supplies the mechanism explanation, nearby contrast,
// and a short settlement/land-use history so the first screen has depth.
//
// Authored `Place.experience` fields (optional) win field-by-field over the
// derived read. Researched site-history overlays (`SITE_HISTORY`) fill Overview
// history / why / immersive when those experience fields are absent, without
// shipping that prose in the initial Explorer bundle.
//
// Prose convention: temperatures are emitted in °C and localized at render
// by `localizeProse`. Most season detail is kept qualitative; the precise
// high/low numbers are surfaced by the spotlight component via `fmtTemp`.
// ============================================================

import type { Place } from "../types";
import { DRIVER_LABELS } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { SITE_HISTORY } from "../data/places.site-history";
import type { SiteHistoryEntry } from "../data/site-history/types";
import {
  RISK_VALUE,
  annualComfortMonthCount,
  meanAnnualHumidityPct,
  meanJanLow,
  meanSummerHigh,
} from "./climate-metrics";

/**
 * Research overlay for Overview history / why / immersive. Skipped when a
 * test (or caller) explicitly clears `experience` to isolate the derived read.
 */
function siteHistoryOverlay(place: Place): SiteHistoryEntry | null {
  if (place.experience === undefined) return null;
  return SITE_HISTORY[place.id] ?? null;
}

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
  /** Mechanism explanation — why this pin does not feel like the surrounding region. */
  whyDifferent: string;
  /** Quiet driver line, e.g. "Shaped by rain shadow and marine layer." */
  whyDrivers: string;
  /** Nearby / local contrast cards for the overview. Always at least one item. */
  contrastItems: PlaceContrastItem[];
  /** 2–4 paragraph human history (settlement, land use, people). */
  historyParagraphs: string[];
  /** True when history came from an authored override. */
  historyAuthored: boolean;
  /** True when any authored override contributed. */
  authored: boolean;
}

export interface PlaceContrastItem {
  label: string;
  note: string;
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

function terrainSeasonContext(place: Place, key: SeasonKey): string | null {
  if (key !== "spring" && key !== "summer") return null;
  const relief = place.reliefContext?.trim();
  if (relief) return firstSentence(relief);
  const contrast = place.localContrast?.[0]?.note?.trim();
  if (contrast) return firstSentence(contrast);
  return null;
}

const SEASON_ACTIVITY_HINT: Record<SeasonKey, RegExp> = {
  winter: /\bwinter\b|\bsnow\b|\bski|\bice\b|\bstorm-watch/i,
  spring: /\bspring\b|\bbloom\b|\bwildflower|\bbird/i,
  summer: /\bsummer\b|\bmonsoon\b|\bhike\b|\bswim|\bfestival/i,
  autumn: /\bautumn\b|\bfall\b|\bharvest\b|\bfoliage|\bwine/i,
};

function seasonActivityCue(place: Place, key: SeasonKey): string | null {
  const hint = SEASON_ACTIVITY_HINT[key];
  const acts = (place.thingsToDo ?? []).filter(t => {
    const blob = `${t.label} ${t.season ?? ""} ${t.note ?? ""}`;
    return hint.test(blob);
  });
  const top = acts[0];
  if (!top) return null;
  const note = top.note?.trim();
  if (note) return ensurePeriod(`${top.label} — ${firstSentence(note).replace(/\.$/, "")}`);
  return ensurePeriod(`${top.label} is part of the ${key} rhythm here`);
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
  const terrain = terrainSeasonContext(place, def.key);
  if (terrain) sentences.push(terrain.endsWith(".") ? terrain : `${terrain}.`);
  else {
    const activity = seasonActivityCue(place, def.key);
    if (activity) sentences.push(activity);
  }
  const risk = seasonRiskPhrase(place, def.key);
  if (risk) sentences.push(`${risk}.`);

  const authoredDetail = place.experience?.seasons?.[def.key];
  const useAuthored = Boolean(authoredDetail) && !isGeneratedSeasonDetail(authoredDetail!);

  return {
    key: def.key,
    label: def.label,
    monthsLabel: def.monthsLabel,
    glyph: def.glyph,
    highC,
    lowC,
    tone,
    headline: seasonHeadline(tone, conditions),
    detail: useAuthored ? authoredDetail! : sentences.join(" "),
    authored: useAuthored,
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
  const driverId = place.drivers[0];
  const driverLabel = driverId ? driverPlain(driverId) : null;
  const shapeClause = driverLabel ? `, shaped mainly by ${driverLabel}` : "";
  const easyClause =
    easy >= 12 ? `Nearly every month feels easy to be outside`
    : easy >= 9 ? `Most of the year — about ${easy} months in 12 — feels easy to be outside`
    : easy >= 5 ? `Roughly ${easy} of the year's 12 months feel easy to be outside`
    : easy >= 2 ? `Only about ${easy} months a year feel truly easy to be outside`
    : `Genuine outdoor comfort is a short window here — barely ${easy} month${easy === 1 ? "" : "s"} a year`;
  return `${easyClause}. Summers run ${summerWord(sh)}, winters ${winterWord(jl)}, and the air tends ${airWord(place)}${shapeClause}.`;
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
  const activities = (place.thingsToDo ?? [])
    .map(t => t.label.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);
  if (activities.length) {
    return `Travelers come for ${joinHumanList(activities, 3)}.`;
  }
  const hook = ARCHETYPE_BY_ID[place.archetypes[0]]?.label?.toLowerCase() ?? "the microclimate";
  return `Visitors come to experience the ${hook} firsthand and the landscape that shapes it.`;
}

function deriveResidentFit(place: Place): string {
  const love = place.whoWouldLove.replace(/\.$/, "").trim();
  const tags = place.relocationFit
    .map(t => t.trim())
    .filter(t => t && !CADENCE_TRAVEL_TAGS.has(t.toLowerCase()))
    .slice(0, 3);
  if (love.length > 48) return ensurePeriod(love);
  if (tags.length) {
    return `${ensurePeriod(love)} It tends to fit ${joinHumanList(tags, 3)}.`;
  }
  return ensurePeriod(love);
}

function deriveTexture(place: Place): string {
  const tradeoff = place.scores.tradeoff;
  const base =
    tradeoff >= 60 ? "This is a place of real tradeoffs"
    : tradeoff >= 45 ? "It asks for a few honest compromises"
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
    const housing = ls.housingPressureIndex ?? ls.costPressure ?? 0;
    const access = ls.accessRemotenessIndex ?? ls.accessFriction ?? 0;
    if (housing >= 70) livedCue = " Housing pressure is high, so budget is part of the calculus.";
    else if (access >= 65) livedCue = " Hospital or airport access sits a real drive away.";
    if (ls.note?.trim()) {
      const note = firstSentence(ls.note);
      livedCue += livedCue ? ` ${note}` : ` ${note}`;
    }
  }

  return `${base}: ${riskClause}.${livedCue}`;
}

function hashPick<T>(id: string, options: readonly T[]): T {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return options[(h >>> 0) % options.length]!;
}

function countryPhrase(place: Place): string {
  if (place.country === "USA") return "the United States";
  if (place.country === "Canada") return "Canada";
  return "Mexico";
}

function namedCenter(place: Place): string {
  const muni = place.municipality?.split("/")[0]?.replace(/\(.*\)/, "").trim();
  return muni || place.name;
}

function ensurePeriod(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

const DRIVER_PLAIN: Record<string, string> = {
  "orographic-lift": "mountains wringing moisture out of passing storms",
  "rain-shadow": "a rain shadow",
  "elevation-lapse-rate": "elevation — cooler as you climb",
  "cold-air-drainage": "cold air draining downhill at night",
  "marine-layer": "a marine layer",
  "upwelling": "cold coastal upwelling",
  "chinook-foehn": "chinook / downslope warm wind",
  "lake-effect": "the lake",
  "gap-winds": "gap winds through the terrain",
  "inversion": "valley inversions",
  "aspect-slope": "slope and aspect",
  "monsoon-lift": "summer monsoon storms",
  "karst-infiltration": "limestone and underground drainage",
  "river-moderation": "the river corridor",
  "santa-ana": "downslope desert wind",
  "katabatic-flow": "downslope drainage flow",
  "sea-breeze": "a daily sea breeze",
  "continentality": "distance from the ocean",
  "polar-jet-exposure": "arctic air when the jet stream dips",
  "tropical-convection": "tropical downpours",
  "trade-wind": "trade winds",
  "hurricane-track": "tropical-storm tracks",
};

function driverPlain(id: string): string {
  return DRIVER_PLAIN[id] ?? DRIVER_LABELS[id as keyof typeof DRIVER_LABELS]?.toLowerCase() ?? id.replace(/-/g, " ");
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isGeneratedSeasonDetail(text: string): boolean {
  return /highs near .+°C|keeps winter highs near|climbs toward .+°C spring|in summer means about .+°C heat|cold months stay close to|winter afternoons settle near|asks for .+°C summer-day|holds winter light near|summer highs near .+°C at -?\d+ m still leave|afternoon climate; nights to|shoulder season sits near .+°C days|autumn light means .+°C afternoons|autumn stays usable at .+°C days|autumn highs near .+°C and lows near|in winter is a .+°C daytime story|daytime story; nights to|.°C daytime story|winters run near|shaped by marine layer across|overnight lows test housing|summer afternoons land near .+°C|fall holds about .+°C afternoons|opens spring under roughly|spring feels workable at .+°C days|spring highs near .+°C and lows near|summer is an honest .+°C afternoon|autumn returns to roughly .+°C days|warm season centers on .+°C days|often the clearest travel window|nights are the practical relief/.test(text);
}

function isGeneratedFeel(text: string): boolean {
  return /occupies a specific piece of ground|that is the short version of why|The setting comes first in |Elevation does the early work|sets the tone, and the .+ signature shows up|The give-away is |the defining fact about .+ is geography|feel earned rather than a marketing line|read less like a textbook|Step outside in .+ and the terrain announces/.test(text);
}

function isGeneratedTexture(text: string): boolean {
  return /None of that erases the appeal of the|the decision should be made with eyes open|sits in the middle — some give, some take|is a genuine tradeoff, not a settled question|Where it costs you back:|What a scouting trip should actually check first/.test(text);
}

function cleanAuthoredFit(text: string | undefined): string | null {
  if (!text?.trim()) return null;
  const original = text.trim();
  const generated = /most leave surprised by how much the|stay a day longer than planned once the local rhythm|climate mostly reads as a bonus until you notice|, provided the day-to-day realities| — the kind of household that treats the |since year-round living means absorbing the |the group most likely to find the tradeoffs of living here|The draw for visitors is straightforward|that pulls most visitors to|Short stays here revolve around|Most people show up in .+ for /.test(original);
  if (!generated) return original;
  let t = original;
  t = t.replace(/^The draw for visitors is straightforward:\s*/i, "Visitors come for ");
  t = t.replace(/^It is (.+) that pulls most visitors to [^,.]+,?\s*/i, "Visitors come for $1. ");
  t = t.replace(/^Most people show up in [A-ZÁÉÍÓÚÑ][\w'’.\- ]+ for /i, "People come for ");
  t = t.replace(/^Short stays here revolve around /i, "Visitors come for ");
  t = t.replace(/, and most leave surprised by how much the .+$/i, ".");
  t = t.replace(/; the .+ climate mostly reads as a bonus.+$/i, ".");
  t = t.replace(/ and stay a day longer than planned.+$/i, ".");
  t = t.replace(/, and the [A-Z][a-z]{1,3}-class weather turns out.+$/i, ".");
  t = t.replace(/\s*and the [A-Z][a-z]{1,3}-class weather turns out.+$/i, ".");
  t = t.replace(/, provided the day-to-day realities.+$/i, ".");
  t = t.replace(/ — the kind of household that treats the .+$/i, ".");
  t = t.replace(/ since year-round living means absorbing the .+$/i, ".");
  t = t.replace(/ the group most likely to find the tradeoffs of living here worth the climate on offer\.?$/i, ".");
  t = t.replace(/, set inside a .+ climate that is easy to underestimate from a distance\.?$/i, ".");
  t = t.replace(/\s+\./g, ".").replace(/\.\s+\./g, ". ").replace(/[,;]+(?=\.)/g, "").replace(/[,;:\s]+$/g, "");
  t = ensurePeriod(t);
  if (t.length < 24) return original;
  return t;
}

const GENERATED_IMMERSIVE_MARKERS: readonly RegExp[] = [
  / The rhythm holds most years:/,
  / The Köppen [A-Za-z0-9]+ label is the broad-stroke/,
  / is doing quiet work behind the numbers/,
  / rewards people who plan around the /,
  / It suits .+ more than casual visitors chasing a postcard/,
  / The honest tradeoff is /,
  / No single hazard dominates the risk picture here/,
  / Expect summer afternoons near .+ as the baseline/,
  / The draw for most visitors is straightforward/,
  / Annual precipitation runs close to /,
  / layering a .+ pattern onto the /,
  / two risk lines worth checking/,
  / treating the climate numbers as the whole story/,
  / the numbers a scouting trip should actually check/,
  / and that biome is as much a product of the local climate/,
  / sits inside highland subtropical lake basin/,
];

function stripGeneratedImmersiveTail(text: string): string {
  let cut = text.length;
  for (const re of GENERATED_IMMERSIVE_MARKERS) {
    const m = text.search(re);
    if (m >= 0 && m < cut) cut = m;
  }
  if (cut === text.length) return text.trim();
  const head = text.slice(0, cut).trim();
  if (/[.!?]$/.test(head)) return head;
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  return (sentenceEnd >= 0 ? head.slice(0, sentenceEnd + 1) : head).trim();
}

function overlapsExisting(existing: string, next: string): boolean {
  const needle = next.slice(0, 36).toLowerCase();
  return needle.length >= 12 && existing.toLowerCase().includes(needle);
}

function enrichImmersive(place: Place, base: string): string {
  const lead = stripGeneratedImmersiveTail(base);
  if (wordCount(lead) >= 80) return lead;
  const extra: string[] = [lead];
  const add = (sentence: string | null | undefined) => {
    if (!sentence?.trim()) return;
    const next = ensurePeriod(sentence.trim());
    if (wordCount(extra.join(" ")) >= 110) return;
    if (overlapsExisting(extra.join(" "), next)) return;
    extra.push(next);
  };

  const why = firstSentence(place.whyDistinct);
  if (why.length > 72 && /[a-z]\s+[a-z]/i.test(why) && !why.includes(";")) add(why);
  if (wordCount(extra.join(" ")) < 80) add(landUseParagraph(place, { allowCrops: false }));
  if (wordCount(extra.join(" ")) < 85) {
    const contrast = place.nearbyContrasts?.[0];
    if (contrast?.note?.trim()) {
      add(`${contrast.label}: ${firstSentence(contrast.note)}`);
    }
  }
  if (wordCount(extra.join(" ")) < 85) {
    const noted = place.settlementsWithinZone?.find(s => s.note?.trim());
    if (noted?.note) {
      add(`${noted.name} — ${firstSentence(noted.note)}`);
    }
  }
  return extra.filter(Boolean).join(" ");
}

function authoredHistoryParagraphs(place: Place): string[] | null {
  const raw = place.experience?.history;
  if (!raw) return null;
  const list = (typeof raw === "string" ? [raw] : [...raw])
    .map(s => s.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

function deriveWhyDrivers(place: Place): string {
  const labels = place.drivers.map(d => driverPlain(d)).filter(Boolean);
  if (!labels.length) return "Local terrain — not the regional average — is what makes this place worth opening.";
  const list = joinHumanList(labels, 5);
  return hashPick(place.id, [
    `Most of the work here comes from ${list}.`,
    `What sets the weather apart is ${list}.`,
    `The local climate is shaped by ${list}.`,
  ]);
}

function contrastDeltaClause(lc: NonNullable<Place["localContrast"]>[number]): string | null {
  const bits: string[] = [];
  if (lc.summerHighDeltaC != null && lc.summerHighDeltaC !== 0) {
    const mag = Math.abs(lc.summerHighDeltaC);
    bits.push(lc.summerHighDeltaC > 0
      ? `about ${mag}°C warmer in summer`
      : `about ${mag}°C cooler in summer`);
  }
  if (lc.winterLowDeltaC != null && lc.winterLowDeltaC !== 0) {
    const mag = Math.abs(lc.winterLowDeltaC);
    bits.push(lc.winterLowDeltaC > 0
      ? `about ${mag}°C milder in winter`
      : `about ${mag}°C colder in winter`);
  }
  if (lc.precipDeltaPct != null && Math.abs(lc.precipDeltaPct) >= 8) {
    const mag = Math.abs(Math.round(lc.precipDeltaPct));
    bits.push(lc.precipDeltaPct > 0
      ? `about ${mag}% more annual precipitation`
      : `about ${mag}% less annual precipitation`);
  }
  if (lc.growingSeasonDeltaDays != null && Math.abs(lc.growingSeasonDeltaDays) >= 8) {
    const mag = Math.abs(Math.round(lc.growingSeasonDeltaDays));
    bits.push(lc.growingSeasonDeltaDays > 0
      ? `roughly ${mag} extra frost-free days`
      : `roughly ${mag} fewer frost-free days`);
  }
  if (!bits.length) return null;
  return bits.length === 1 ? bits[0]! : `${bits.slice(0, -1).join(", ")}, and ${bits.at(-1)}`;
}

function deriveContrastItems(place: Place): PlaceContrastItem[] {
  const items: PlaceContrastItem[] = [];
  const seen = new Set<string>();
  const push = (label: string, note: string) => {
    const n = note.trim();
    if (!n) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ label: label.trim() || "Nearby", note: ensurePeriod(n) });
  };

  for (const nc of place.nearbyContrasts ?? []) {
    if (items.length >= 4) break;
    push(nc.label, nc.note);
  }
  for (const lc of place.localContrast ?? []) {
    if (items.length >= 4) break;
    const delta = contrastDeltaClause(lc);
    const note = [lc.note?.trim(), delta ? `${delta.charAt(0).toUpperCase()}${delta.slice(1)}.` : ""]
      .filter(Boolean)
      .join(" ");
    push(`Within ${lc.radiusKm} km`, note);
  }

  if (items.length === 0) {
    push(
      "The surrounding country",
      `${place.reliefContext.replace(/\.$/, "")} — that difference from the surrounding country is why this place belongs in the atlas.`,
    );
  }
  return items.slice(0, 4);
}

const HISTORY_SKIP = /method|station|how we know|confidence|prism|normals|residual uncertainty|growability scores|hardiness zone|the case for treating|justifies this entry|microclimate-uniqueness figure|housing pressure|plants here live inside|for relocation, this entry|the record works out as follows|worth walking through in order|numbers break down like this|editorial shorthand|risk diligence here starts|comfort sits at|this atlas rather than|unremarkable .+ waypoint|station record files under|air masses/;
const HISTORY_BOOST = /histor|settlement|people|cultur|indigenous|colonial|mining|pueblo|mission|ranch|orchard|farm|wine|lavender|irrigation|land use|ecology|community|cabin/;

function isGeneratedDeepSection(sec: NonNullable<Place["deepSections"]>[number]): boolean {
  return /terrain-mechanism$|risk-and-ground-truth$/.test(sec.id)
    || /risk matrix and growability|housing, access, and who this place|honest ledger|the Dfb record|Terrain, lake effect/i.test(`${sec.id} ${sec.title}`);
}

function deepHistoryParagraphs(place: Place): string[] {
  const sections = place.deepSections ?? [];
  const ranked = sections
    .map(sec => {
      if (isGeneratedDeepSection(sec)) return { sec, score: -1 };
      const blob = `${sec.id} ${sec.title}`.toLowerCase();
      if (HISTORY_SKIP.test(blob)) return { sec, score: -1 };
      let score = 0;
      if (HISTORY_BOOST.test(blob)) score += 3;
      if (/hydrology|land use|living|town/.test(blob)) score += 1;
      return { sec, score };
    })
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const whyHead = firstSentence(place.whyDistinct).slice(0, 48).toLowerCase();
  const out: string[] = [];
  for (const row of ranked) {
    for (const para of row.sec.paragraphs) {
      const t = para.trim();
      if (t.length < 80) continue;
      if (HISTORY_SKIP.test(t.toLowerCase())) continue;
      if (t.slice(0, 48).toLowerCase() === whyHead) continue;
      if (out.some(p => p.slice(0, 40) === t.slice(0, 40))) continue;
      out.push(t);
      if (out.length >= 2) return out;
    }
  }
  return out;
}

function settlementHistoryParagraph(place: Place): string | null {
  const settlements = place.settlementsWithinZone;
  if (!settlements?.length) return null;
  const slice = settlements.slice(0, 4);
  const named = slice.map(s => {
    const pop = s.population ? ` (${s.population})` : "";
    return `${s.name}${pop}`;
  });
  const more =
    settlements.length > slice.length
      ? `, plus ${settlements.length - slice.length} more communities sharing the same air mass`
      : "";
  const noted = slice.find(s => s.note?.trim())?.note?.trim();
  const ghost = settlements.find(s => s.role === "ghost-town" || s.role === "tribal");
  const lead = hashPick(place.id, [
    `The lived map is anchored by ${joinHumanList(named, 4)}${more}.`,
    `People actually on the ground cluster around ${joinHumanList(named, 4)}${more}.`,
    `${namedCenter(place)} sits inside a small constellation of places — ${joinHumanList(named, 4)}${more}.`,
  ]);
  const extra = noted ? ` ${ensurePeriod(noted)}` : "";
  const ghostBit = ghost?.note && ghost.note !== noted
    ? ` ${ghost.name}: ${ensurePeriod(ghost.note)}`
    : "";
  return `${lead}${extra}${ghostBit}`;
}

function historicActivityParagraph(place: Place): string | null {
  const acts = (place.thingsToDo ?? []).filter(t =>
    t.kind === "historic" || /histor|museum|pueblo|mission|fort|mine|railway|heritage|ruins/i.test(t.label),
  );
  if (!acts.length) return null;
  const top = acts.slice(0, 2);
  const bits = top.map(t => {
    const note = t.note?.trim();
    return note ? `${t.label} — ${note.replace(/\.$/, "")}` : t.label;
  });
  return `You can still walk the older story of the place: ${bits.join("; ")}.`;
}

function landscapeHistoryLead(place: Place): string {
  const relief = place.reliefContext.replace(/\.$/, "");
  const center = namedCenter(place);
  const country = countryPhrase(place);
  return hashPick(place.id, [
      `${place.name} sits in ${place.region}, ${country}, on this ground: ${relief}.`,
      `${center} grew up where the land does this: ${relief}.`,
      `${center} sits in ${place.region}, ${country}. ${ensurePeriod(relief)}`,
      `${place.name} is a lived place first: ${center}, ${place.region}, ${country}. ${ensurePeriod(relief)}`,
  ]);
}

function landUseParagraph(place: Place, opts: { allowCrops?: boolean } = {}): string | null {
  const soil = place.soil.notes?.trim();
  if (soil && soil.length > 70) return ensurePeriod(soil);
  const orchard = place.growability.orchard?.trim();
  if (orchard && orchard.length > 40) return ensurePeriod(orchard);
  const garden = place.growability.homeGarden?.trim();
  if (garden && garden.length > 50) return ensurePeriod(garden);
  if (!opts.allowCrops) return null;
  const crops = (place.growability.growsWell ?? [])
    .map(c => c.replace(/\(.*\)/g, "").trim())
    .filter(c => c.length > 2)
    .slice(0, 3);
  if (crops.length >= 2) {
    return `${namedCenter(place)} can grow ${joinHumanList(crops, 3)} when the season cooperates.`;
  }
  return null;
}

function knownForParagraph(place: Place): string | null {
  const acts = (place.thingsToDo ?? []).filter(t => t.kind !== "urban");
  if (!acts.length) return null;
  const labels = acts.slice(0, 3).map(t => t.label.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!labels.length) return null;
  const lead = hashPick(place.id, [
    `On the ground, people come for ${joinHumanList(labels, 3)}.`,
    `What people actually do here: ${joinHumanList(labels, 3)}.`,
  ]);
  const note = acts.find(t => t.note && t.note.trim().length > 40)?.note?.trim();
  return note ? `${lead} ${ensurePeriod(firstSentence(note))}` : lead;
}

function peopleHistoryParagraph(place: Place): string {
  const love = place.whoWouldLove.replace(/\.$/, "").trim();
  const biome = place.biome.split("/")[0]!.trim().toLowerCase();
  const draws = place.travelFit.filter(t => !CADENCE_TRAVEL_TAGS.has(t.trim().toLowerCase())).slice(0, 3);
  const drawBit = draws.length ? ` Visitors still come for ${joinHumanList(draws, 3)}.` : "";
  if (love.length > 40) return ensurePeriod(`${love}.${drawBit}`.replace(/\.\./g, "."));
  if (/^people who /i.test(love)) {
    return `${love} — matching themselves to ${biome} rather than a generic ${place.region} average.${drawBit}`;
  }
  return `${place.name} has always collected ${love.toLowerCase()} — people matching themselves to ${biome}, not to a generic ${place.region} average.${drawBit}`;
}

function overlayHistoryParagraphs(place: Place): string[] | null {
  const list = (siteHistoryOverlay(place)?.history ?? [])
    .map(s => s.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

function deriveHistoryParagraphs(place: Place): string[] {
  const authored = authoredHistoryParagraphs(place);
  if (authored) return authored.slice(0, 4);
  const overlay = overlayHistoryParagraphs(place);
  if (overlay) return overlay.slice(0, 4);

  const paras: string[] = [landscapeHistoryLead(place)];
  const settlement = settlementHistoryParagraph(place);
  if (settlement) paras.push(settlement);
  const historic = historicActivityParagraph(place);
  if (historic) paras.push(historic);
  const known = knownForParagraph(place);
  if (known && !historic && !paras.some(p => overlapsExisting(p, known))) {
    paras.push(known);
  }
  const land = landUseParagraph(place, { allowCrops: true });
  if (land && !paras.some(p => p.slice(0, 40) === land.slice(0, 40))) {
    paras.push(land);
  }
  for (const deep of deepHistoryParagraphs(place)) {
    if (paras.length >= 4) break;
    if (!paras.some(p => p.slice(0, 40) === deep.slice(0, 40))) paras.push(deep);
  }

  if (paras.length < 2) {
    paras.push(peopleHistoryParagraph(place));
  }

  return paras.slice(0, 4);
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
  const authoredFeelRaw = place.experience?.feel;
  const authoredFeel = authoredFeelRaw && !isGeneratedFeel(authoredFeelRaw) ? authoredFeelRaw : undefined;
  const authoredTraveler = cleanAuthoredFit(place.experience?.travelerFit);
  const authoredResident = cleanAuthoredFit(place.experience?.residentFit);
  const authoredTextureRaw = place.experience?.texture;
  const authoredTexture = authoredTextureRaw && !isGeneratedTexture(authoredTextureRaw) ? authoredTextureRaw : undefined;
  const overlay = siteHistoryOverlay(place);
  const authoredWhy = place.experience?.why?.trim();
  const overlayWhy = overlay?.why?.trim();
  const authoredHistory = Boolean(authoredHistoryParagraphs(place));
  const overlayHistory = Boolean(overlayHistoryParagraphs(place));
  const historyParagraphs = deriveHistoryParagraphs(place);
  const immersiveBase = overlay?.immersive?.trim() || place.summaryImmersive;

  const result: PlaceExperienceReading = {
    lede: dequote(place.summaryShort),
    immersive: enrichImmersive(place, immersiveBase),
    feelLine: authoredFeel ?? deriveFeelLine(place),
    seasons,
    travelerFit: authoredTraveler ?? deriveTravelerFit(place),
    residentFit: authoredResident ?? deriveResidentFit(place),
    wouldNotFit: place.whoMightNot,
    texture: authoredTexture ?? deriveTexture(place),
    whyDifferent: authoredWhy || overlayWhy || place.whyDistinct,
    whyDrivers: deriveWhyDrivers(place),
    contrastItems: deriveContrastItems(place),
    historyParagraphs,
    historyAuthored: authoredHistory || overlayHistory,
    authored: Boolean(
      authoredFeel || authoredTraveler || authoredResident || authoredTexture ||
      authoredWhy || overlayWhy || authoredHistory || overlayHistory || overlay?.immersive?.trim() ||
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
