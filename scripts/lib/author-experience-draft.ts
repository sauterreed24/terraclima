/**
 * Draft authored `Place.experience` blocks from structured corpus fields.
 * Used by backfill/refresh scripts to reach 100% coverage while
 * keeping voice aligned with hand-authored Tier A/B exemplars.
 */
import type { Place } from "../../src/types";
import { ARCHETYPE_BY_ID } from "../../src/data/archetypes";
import { getAnnualPrecipMm } from "../../src/lib/climate-metrics";

type SeasonKey = "winter" | "spring" | "summer" | "autumn";

const SEASON_IDX: Record<SeasonKey, readonly [number, number, number]> = {
  winter: [11, 0, 1],
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  autumn: [8, 9, 10],
};

function meanOf(values: readonly number[] | undefined, idx: readonly number[]): number | null {
  if (!values) return null;
  let sum = 0;
  for (const i of idx) sum += values[i];
  return sum / idx.length;
}

function roundC(n: number): number {
  return Math.round(n * 10) / 10;
}

function dequote(text: string): string {
  return text.replace(/^["“”']+|["“”']+$/g, "").trim();
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : text).trim();
}

function joinHumanList(items: readonly string[], max = 4): string {
  const clean = Array.from(new Set(items.map(s => s.trim()).filter(Boolean))).slice(0, max);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

function shortName(place: Place): string {
  return place.name.split("(")[0]!.trim();
}

function archetypeLabel(place: Place): string {
  return ARCHETYPE_BY_ID[place.archetypes[0]]?.label?.toLowerCase() ?? "distinct microclimate";
}

function seasonWeather(
  precipMean: number,
  snowMean: number | null,
  humidityMean: number | null,
  sunshineMean: number | null,
  koppen: string,
): string {
  if ((snowMean ?? 0) >= 28) return "heavy snow defines the rhythm";
  if ((snowMean ?? 0) >= 10) return "snow is a regular part of the picture";
  if (precipMean >= 95) return "rain is frequent and can be heavy";
  if (precipMean >= 45) return "showers pass through regularly";
  if (precipMean < 18) {
    if (sunshineMean != null && sunshineMean >= 75) return "skies stay relentlessly clear and dry";
    if (/^B/.test(koppen)) return "skies stay mostly dry with intense sun";
    return "skies stay mostly dry";
  }
  if (humidityMean != null && humidityMean >= 72) return "humid air keeps everything soft and close";
  if (sunshineMean != null && sunshineMean < 42) return "gray skies dominate";
  if (/^Cfa|^Cwa|^Am|^Af/.test(koppen) && precipMean >= 35) return "humid showers and convection pass through";
  if (/^Csb|^Csc|^Cfb/.test(koppen)) return "cool, changeable marine-influenced weather";
  return "weather stays moderate and changeable";
}

function topRiskPhrase(place: Place, season: SeasonKey): string | null {
  const r = place.risks;
  const winterSnow = meanOf(place.climate.snowCm, SEASON_IDX.winter) ?? 0;
  const hasSnowSeason = winterSnow >= 8 || (place.climate.frostFreeDays ?? 200) < 160;
  const keys: Array<keyof typeof r> =
    season === "summer" ? ["extremeHeat", "wildfire", "smoke", "drought", "storm"]
    : season === "winter" ? ["extremeCold", "storm", "coastal"]
    : season === "spring" ? ["flood", "storm"]
    : ["storm", "wildfire", "coastal", "flood"];

  const order = { "very-low": 1, low: 2, moderate: 3, elevated: 4, high: 5, "very-high": 6 } as const;
  let best: keyof typeof r | null = null;
  let bestVal = 3;
  for (const k of keys) {
    const v = order[r[k].level as keyof typeof order] ?? 0;
    if (v > bestVal) { bestVal = v; best = k; }
  }
  if (!best) return null;
  switch (best) {
    case "extremeHeat": return "Plan around heat that can turn genuinely dangerous";
    case "wildfire": return season === "summer" ? "Wildfire and smoke are summer wildcards" : "Fire season lingers into shoulder months";
    case "smoke": return "Wildfire smoke can settle in for stretches";
    case "extremeCold": return "Arctic outbreaks can still bite hard";
    case "drought": return "Water supply and irrigation stress matter";
    case "flood":
      if (season === "spring" && hasSnowSeason) return "Snowmelt and spring rain can swell rivers fast";
      if (season === "spring") {
        const arid = /^(B|Csa|Csb)/.test(place.koppen) || place.archetypes.some(a => ["high-desert-escape", "monsoon-edge", "rain-shadow-sanctuary"].includes(a));
        return arid ? "Spring rains can swell rivers and arroyos quickly" : "Spring rains can swell rivers and low districts quickly";
      }
      return "Flash-flood and surge diligence is part of daily life";
    case "storm": return season === "summer" ? "Afternoon convection and storms build often" : "Storm systems roll through with real force";
    case "coastal": return season === "autumn" ? "Hurricane and coastal surge exposure shapes fall planning" : "Coastal surge and wind events belong in the planning stack";
    default: return null;
  }
}

function seasonContext(place: Place, key: SeasonKey): string {
  const annualPrecip = getAnnualPrecipMm(place);
  const summerHigh = meanOf(place.climate.tempHighC, SEASON_IDX.summer) ?? 0;
  const winterSnow = meanOf(place.climate.snowCm, SEASON_IDX.winter) ?? 0;

  if (key === "autumn" && place.archetypes.includes("hurricane-coast")) {
    return "Tropical systems can still reshape the calendar deep into fall";
  }
  if (key === "spring" && annualPrecip >= 900) {
    return `Green-up arrives against a wet ${Math.round(annualPrecip)} mm annual backdrop`;
  }
  if (key === "summer" && summerHigh >= 36) {
    return "Midday outdoor life often shifts to dawn and dusk";
  }
  if (key === "winter" && winterSnow >= 28) {
    return "Snow removal and road access matter as much as thermometer readings";
  }
  return "";
}

function seasonHeadline(place: Place, key: SeasonKey, highC: number, snowMean: number | null): string {
  if (key === "winter") {
    if (highC <= -8) return "Deep freeze";
    if (highC <= 2 && (snowMean ?? 0) >= 12) return "Cold and snowy";
    if (highC <= 5) return "Cold and sharp";
    if (highC <= 12) return "Mild by northern standards";
    if (highC <= 18) return "Mild and workable";
    return "Warm winter window";
  }
  if (key === "spring") {
    if ((snowMean ?? 0) >= 8) return "Late thaw";
    if (highC >= 28) return "Heating up fast";
    if (getAnnualPrecipMm(place) >= 900) return "Green-up and storms";
    return "Spring opens";
  }
  if (key === "summer") {
    if (highC >= 36) return "Peak desert heat";
    if (highC >= 32) return "Hot and humid";
    if (highC >= 26) return "Warm season peak";
    return "Cool summer by latitude";
  }
  if (highC <= 8) return "Autumn fade";
  if (place.archetypes.includes("hurricane-coast") || place.risks.coastal.level === "high" || place.risks.coastal.level === "very-high") {
    return "Hurricane-season tail";
  }
  return "Shoulder season";
}

function buildSeasonDetail(place: Place, key: SeasonKey): string {
  const idx = SEASON_IDX[key];
  const highC = roundC(meanOf(place.climate.tempHighC, idx) ?? 0);
  const lowC = roundC(meanOf(place.climate.tempLowC, idx) ?? 0);
  const precipMean = meanOf(place.climate.precipMm, idx) ?? 0;
  const snowMean = meanOf(place.climate.snowCm, idx);
  const humidityMean = meanOf(place.climate.humidity, idx);
  const sunshineMean = meanOf(place.climate.sunshinePct, idx);

  const weather = seasonWeather(precipMean, snowMean, humidityMean, sunshineMean, place.koppen);
  const risk = topRiskPhrase(place, key);
  const context = seasonContext(place, key);
  const headline = seasonHeadline(place, key, highC, snowMean);

  const parts = [
    `${headline} — afternoons near ${highC}°C, nights near ${lowC}°C — ${weather}.`,
  ];
  if (context) parts.push(`${context.endsWith(".") ? context : `${context}.`}`);
  if (risk) parts.push(`${risk}.`);
  return parts.join(" ");
}

function truncateImmersive(text: string, max = 300): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean.endsWith(".") ? clean : `${clean}.`;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  if (lastStop > 80) return clean.slice(0, lastStop + 1).trim();
  return `${cut.replace(/\s+\S*$/, "")}.`;
}

function buildFeel(place: Place): string {
  const name = shortName(place);
  const immersive = dequote(place.summaryImmersive);
  const short = dequote(place.summaryShort);

  // Use full immersive prose — avoid naive firstSentence (breaks on D.C., St., etc.).
  let lead = immersive.length >= 80 ? truncateImmersive(immersive) : short;
  if (lead.length < 48 && immersive.length > lead.length) {
    lead = truncateImmersive(immersive, 400);
  }

  if (lead.toLowerCase().startsWith(name.toLowerCase())) {
    return lead.endsWith(".") ? lead : `${lead}.`;
  }
  if (lead.toLowerCase().includes(name.toLowerCase())) {
    return lead.endsWith(".") ? lead : `${lead}.`;
  }
  // Abbreviation-led immersive (e.g. "D.C.'s climate…") — colon reads cleaner than em dash lowercasing.
  if (/^[A-Z]{1,4}\./.test(lead) || /\bD\.C\./.test(lead)) {
    return `${name}: ${lead.endsWith(".") ? lead : `${lead}.`}`;
  }
  const body = lead.endsWith(".") ? lead.slice(0, -1) : lead;
  return `${name} — ${body.charAt(0).toLowerCase()}${body.slice(1)}.`;
}

function buildTravelerFit(place: Place): string {
  const draws = place.travelFit.filter(t => !/^(year-round|summer|winter|spring|fall|autumn|shoulder seasons?)$/i.test(t.trim()));
  if (draws.length) {
    return `Visitors come for ${joinHumanList(draws, 4)} — the practical way to experience ${archetypeLabel(place)} terrain in ${place.region}.`;
  }
  const hook = truncateImmersive(place.summaryImmersive, 160).replace(/\.$/, "");
  return `Visitors come to experience ${archetypeLabel(place)} firsthand — ${hook.charAt(0).toLowerCase()}${hook.slice(1)}.`;
}

function buildResidentFit(place: Place): string {
  const who = place.whoWouldLove.replace(/\.$/, "");
  const fit = place.relocationFit[0];
  if (fit) {
    return `It rewards ${who.charAt(0).toLowerCase()}${who.slice(1)} — especially ${fit} — if the local tradeoffs still feel acceptable after a full season in ${place.municipality ?? place.region}.`;
  }
  return `It rewards ${who.charAt(0).toLowerCase()}${who.slice(1)} who can live with the hazards and service map that come with ${place.region}.`;
}

function buildTexture(place: Place): string {
  const tradeoff = place.scores.tradeoff;
  const base =
    tradeoff >= 60 ? "A real-tradeoff place"
    : tradeoff >= 45 ? "A place that asks for a few compromises"
    : "An easier place to settle into";

  const riskOrder = { "very-low": 1, low: 2, moderate: 3, elevated: 4, high: 5, "very-high": 6 } as const;
  const riskLabels: Partial<Record<keyof Place["risks"], string>> = {
    wildfire: "wildfire exposure",
    smoke: "smoke-season air quality",
    extremeHeat: "extreme summer heat",
    extremeCold: "deep winter cold",
    drought: "long-run drought",
    flood: "flood and surge risk",
    storm: "storm exposure",
    coastal: "coastal and sea-level pressure",
    landslide: "slope stability",
  };
  const ranked = (Object.keys(place.risks) as Array<keyof Place["risks"]>)
    .map(k => ({ k, v: riskOrder[place.risks[k].level as keyof typeof riskOrder] ?? 0 }))
    .filter(r => r.v >= 4 && riskLabels[r.k])
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map(r => riskLabels[r.k]!);

  let lived = "";
  const ls = place.liveSignals;
  if (ls) {
    if ((ls.costPressure ?? 0) >= 70) lived = " Housing runs expensive relative to regional medians.";
    else if ((ls.accessFriction ?? 0) >= 65) lived = " Specialty care and major-airport access require real planning.";
    else if ((ls.socialStress ?? 0) >= 65) lived = " Local social-fabric stress is worth checking in person.";
    else if (ls.note && !/\bscreening\b/i.test(ls.note)) lived = ` ${firstSentence(ls.note)}`;
  }

  const riskClause = ranked.length
    ? `the main things to weigh are ${joinHumanList(ranked, 2)}`
    : "no single hazard dominates the picture";

  const elev =
    place.elevationM >= 1500 ? ` at ${Math.round(place.elevationM)} m elevation`
    : place.elevationM <= 30 && place.risks.coastal.level !== "very-low" ? " at sea level"
    : "";

  return `${base}${elev} — ${riskClause}.${lived}`;
}

export interface AuthoredExperienceDraft {
  feel: string;
  seasons: Record<SeasonKey, string>;
  travelerFit: string;
  residentFit: string;
  texture: string;
}

export function draftAuthoredExperience(place: Place): AuthoredExperienceDraft {
  return {
    feel: buildFeel(place),
    seasons: {
      winter: buildSeasonDetail(place, "winter"),
      spring: buildSeasonDetail(place, "spring"),
      summer: buildSeasonDetail(place, "summer"),
      autumn: buildSeasonDetail(place, "autumn"),
    },
    travelerFit: buildTravelerFit(place),
    residentFit: buildResidentFit(place),
    texture: buildTexture(place),
  };
}

/** Detect auto-drafted blocks (safe to refresh without touching hand-authored prose). */
export function isAutoDraftedExperience(place: Place): boolean {
  const exp = place.experience;
  if (!exp) return false;
  const joined = [
    exp.feel,
    ...Object.values(exp.seasons ?? {}),
    exp.travelerFit ?? "",
    exp.residentFit ?? "",
    exp.texture ?? "",
  ].join(" ");
  const seasons = Object.values(exp.seasons ?? {}).join(" ");
  // Legacy template: "Winter settles in with afternoons near…"
  if (/with afternoons near [-−]?\d/.test(seasons)) return true;
  // Templated seasonContext / fit phrases
  if (/is at its most kinetic for/.test(joined)) return true;
  if (/shows its teeth/.test(joined)) return true;
  if (/who accept the cold season/.test(joined)) return true;
  if (/is easiest to read on the ground/.test(joined)) return true;
  if (/defines the daily backdrop/.test(joined)) return true;
  if (/the practical way to experience .* terrain in/.test(joined)) return true;
  if (/if the local tradeoffs still feel acceptable after a full season in/.test(joined)) return true;
  // Older openers before headline rewrite
  return /^(Winter settles in|The cold season|Deep winter|Winter runs|The thaw season|Spring opens|Spring arrives|High season|Summer peaks|Summer settles|Autumn turns|Autumn light|Fall shoulder|The warm months|As spring builds)/.test(seasons);
}

export function formatExperienceBlock(draft: AuthoredExperienceDraft, indent = "    "): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const i = indent;
  const i2 = i + "  ";
  return [
    `${i}experience: {`,
    `${i2}feel: "${esc(draft.feel)}",`,
    `${i2}seasons: {`,
    `${i2}  winter: "${esc(draft.seasons.winter)}",`,
    `${i2}  spring: "${esc(draft.seasons.spring)}",`,
    `${i2}  summer: "${esc(draft.seasons.summer)}",`,
    `${i2}  autumn: "${esc(draft.seasons.autumn)}",`,
    `${i2}},`,
    `${i2}travelerFit: "${esc(draft.travelerFit)}",`,
    `${i2}residentFit: "${esc(draft.residentFit)}",`,
    `${i2}texture: "${esc(draft.texture)}",`,
    `${i}},`,
  ].join("\n");
}
