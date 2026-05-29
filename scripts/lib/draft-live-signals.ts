/**
 * Draft screening-grade `Place.liveSignals` from structured corpus fields.
 * Used by backfill-live-signals-corpus.ts — editorial reads, not appraisals.
 */
import type { Place } from "../../src/types";

export interface LiveSignalsDraft {
  costPressure: number;
  socialStress: number;
  accessFriction: number;
  note: string;
  sources: { label: string; url?: string }[];
}

function shortName(place: Place): string {
  return place.name.split("(")[0]!.trim();
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function hubLike(place: Place): boolean {
  if (place.archetypes.includes("urban-heat-contrast")) return true;
  const m = (place.municipality ?? "").toLowerCase();
  const hubs = ["austin", "tucson", "anchorage", "honolulu", "spokane", "buffalo", "mobile", "des moines", "washington"];
  return hubs.some(h => m.includes(h));
}

function remoteLike(place: Place): boolean {
  const rc = place.reliefContext.toLowerCase();
  if (place.elevationM >= 2200) return true;
  if (/\b(ferry|remote|isolated|hours from|fly-in|roadless|tribal land)\b/.test(rc)) return true;
  if (place.archetypes.some(a => ["alpine-tundra", "hyper-maritime", "cold-air-pool"].includes(a))) return true;
  return false;
}

function expensiveRegion(place: Place): boolean {
  const r = `${place.region} ${place.country}`.toLowerCase();
  if (place.country === "Canada" && /british columbia|vancouver|victoria|toronto|montreal/.test(r)) return true;
  if (place.country === "Mexico" && /baja california sur|oaxaca city|san miguel/.test(r)) return true;
  if (/california|hawaii|colorado ski|aspen|napa|seattle|portland|boston|connecticut|delaware beach|dc|district of columbia|new york|oahu|maui/.test(r)) return true;
  if (/resort|nantucket|martha|hamptons|jackson hole|aspen|vail|telluride/.test(place.name.toLowerCase())) return true;
  return false;
}

function affordableRegion(place: Place): boolean {
  const r = `${place.region} ${place.municipality ?? ""}`.toLowerCase();
  return /alabama|mississippi|arkansas|west virginia|nebraska|iowa|kansas|oklahoma|manitoba|saskatchewan|chihuahua|sonora desert/.test(r);
}

function draftCostPressure(place: Place): number {
  let score = 52;
  if (expensiveRegion(place)) score += 18;
  if (affordableRegion(place)) score -= 12;
  if (hubLike(place)) score += 8;
  if (remoteLike(place) && place.tier === "C") score -= 6;
  if (place.archetypes.includes("urban-heat-contrast")) score += 10;
  if (place.scores.hiddenGem >= 75 && place.tier === "C") score += 6;
  return clamp(score);
}

function draftSocialStress(place: Place): number {
  let score = 34;
  if (place.archetypes.includes("urban-heat-contrast")) score += 14;
  if (/new orleans|mobile|memphis|baltimore|detroit/.test(`${place.municipality} ${place.name}`.toLowerCase())) score += 12;
  if (remoteLike(place)) score -= 10;
  if (place.tier === "A" || place.tier === "B") score -= 4;
  if (place.scores.tradeoff >= 58) score += 6;
  return clamp(score);
}

function draftAccessFriction(place: Place): number {
  let score = 38;
  if (remoteLike(place)) score += 22;
  if (place.elevationM >= 1500 && place.municipality && place.municipality.length < 12) score += 12;
  if (hubLike(place)) score -= 14;
  if (place.country === "Mexico" && place.elevationM >= 1800) score += 8;
  if (/nome|dawson|gaspe|yukon|inuvik|alert/.test(place.id)) score += 28;
  if (/hawaii|oahu|maui|kauai|alaska|yukon|northwest territories/.test(`${place.region} ${place.id}`.toLowerCase())) score += 6;
  if (place.archetypes.includes("rain-shadow-sanctuary") && place.elevationM < 200) score -= 4;
  return clamp(score);
}

export function isGenericLiveSignalsNote(note: string | undefined): boolean {
  if (!note?.trim()) return true;
  if (note.trim().length < 48) return true;
  return /\bscreening:\b|Atlas-grade read — confirm on the ground/.test(note);
}

function buildNote(place: Place, cost: number, social: number, access: number): string {
  const parts: string[] = [];

  if (cost >= 68) parts.push("Housing runs above regional medians");
  else if (cost <= 38) parts.push("Housing pressure is relatively modest for the region");
  else parts.push("Verify rents and insurance locally before committing");

  if (access >= 65) parts.push("Specialty care and major-airport access need real planning");
  else if (access <= 35) {
    parts.push(`${place.municipality ?? shortName(place)} anchors daily services within reasonable reach`);
  } else parts.push("Confirm hospital and airport distances for your needs");

  if (social >= 55) parts.push("Visible civic or tourism stress shows up in resident reviews");

  const hook = place.whoMightNot.replace(/\.$/, "");
  if (hook.length > 12 && hook.length < 100) {
    parts.push(`A poor fit for ${hook.charAt(0).toLowerCase()}${hook.slice(1)}`);
  }

  if (parts.length === 0) {
    return "Confirm rents, insurance, and seasonal access on the ground before treating atlas normals as daily-life certainty.";
  }
  return `${parts.slice(0, 3).join("; ")}.`;
}

function buildSources(place: Place): { label: string; url?: string }[] {
  const seen = new Set<string>();
  const out: { label: string; url?: string }[] = [];

  for (const c of place.citations ?? []) {
    if (!c.url?.startsWith("https://")) continue;
    const key = c.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: c.label, url: c.url });
    if (out.length >= 2) return out;
  }

  const regional: { label: string; url: string }[] = [];
  if (place.country === "USA") {
    regional.push({
      label: `NOAA climate normals — ${place.municipality ?? shortName(place)}`,
      url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
    });
    regional.push({
      label: "Census QuickFacts — county context",
      url: "https://www.census.gov/quickfacts/fact/table/US/PST045224",
    });
  } else if (place.country === "Canada") {
    regional.push({
      label: "Statistics Canada — community profiles",
      url: "https://www12.statcan.gc.ca/census-recensement/index-eng.cfm",
    });
    regional.push({
      label: "Environment and Climate Change Canada — normals",
      url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
    });
  } else {
    regional.push({
      label: "SMN Mexico — climate normals",
      url: "https://smn.conagua.gob.mx/es/climatologia/normales-climatologicas-por-estado",
    });
    regional.push({
      label: "INEGI — municipal indicators",
      url: "https://www.inegi.org.mx/",
    });
  }

  return [...out, ...regional].slice(0, 3);
}

export function draftLiveSignals(place: Place): LiveSignalsDraft {
  const costPressure = draftCostPressure(place);
  const socialStress = draftSocialStress(place);
  const accessFriction = draftAccessFriction(place);
  return {
    costPressure,
    socialStress,
    accessFriction,
    note: buildNote(place, costPressure, socialStress, accessFriction),
    sources: buildSources(place),
  };
}

export function formatLiveSignalsBlock(draft: LiveSignalsDraft, indent = "    "): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const i = indent;
  const i2 = i + "  ";
  const srcLines = draft.sources.map(s =>
    s.url
      ? `${i2}{ label: "${esc(s.label)}", url: "${esc(s.url)}" },`
      : `${i2}{ label: "${esc(s.label)}" },`,
  );
  return [
    `${i}liveSignals: {`,
    `${i2}costPressure: ${draft.costPressure},`,
    `${i2}socialStress: ${draft.socialStress},`,
    `${i2}accessFriction: ${draft.accessFriction},`,
    `${i2}note: "${esc(draft.note)}",`,
    `${i2}sources: [`,
    ...srcLines,
    `${i2}],`,
    `${i}},`,
  ].join("\n");
}
