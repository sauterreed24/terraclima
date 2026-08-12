import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { DRIVER_LABELS } from "../types";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "./climate-metrics";
import { fmtElev, fmtPrecip, fmtTemp } from "./units";
import type { DistUnit, TempUnit } from "./units";

function firstSentence(text: string): string {
  const first = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text.trim();
  return first;
}

function joinHumanList(items: readonly string[], max = 4): string {
  const clean = Array.from(new Set(items.map(s => s.trim()).filter(Boolean))).slice(0, max);
  if (clean.length === 0) return "local terrain signals";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

function ensurePeriod(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * Scene-first narrative from structured place data. Leads with mechanism and
 * sensation; numbers arrive as supporting texture, not a score readout.
 */
export function composeFieldStory(
  place: Place,
  temp: TempUnit,
  dist: DistUnit,
): { title: string; paragraphs: string[] } {
  const jh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const annualP = getAnnualPrecipMm(place);
  const archetypeLabel = ARCHETYPE_BY_ID[place.archetypes[0]]?.label ?? "this landscape";
  const driverLabels = place.drivers.map(d => DRIVER_LABELS[d] ?? d);
  const feel = place.experience?.feel?.trim();
  const texture = place.experience?.texture?.trim();
  const why = place.whyDistinct.trim();

  const paragraphs: string[] = [];

  if (feel) {
    paragraphs.push(feel);
    if (firstSentence(why) !== feel) paragraphs.push(why);
  } else {
    paragraphs.push(why);
  }

  paragraphs.push(
    `${place.name} sits near ${fmtElev(place.elevationM, dist)} in ${archetypeLabel.toLowerCase()} country, where ${place.reliefContext.replace(/\.$/, "")}. Terrain engines on the record are ${joinHumanList(driverLabels, 5)}.`,
  );

  const nearby = (place.nearbyContrasts ?? []).filter(n => n.note).slice(0, 2);
  if (nearby.length) {
    paragraphs.push(
      nearby.map(n => `${n.label}: ${n.note.replace(/\.$/, "")}.`).join(" "),
    );
  }

  paragraphs.push(
    `High-summer afternoons run around ${fmtTemp(jh, temp)}, winter lows near ${fmtTemp(jl, temp)}, with about ${fmtPrecip(annualP, dist)} of precipitation — Köppen ${place.koppen}, ${place.biome}.`,
  );

  if (place.settlementsWithinZone?.length) {
    const slice = place.settlementsWithinZone.slice(0, 5);
    const names = slice.map(s => s.name + (s.population ? ` (${s.population})` : "")).join(", ");
    const more =
      place.settlementsWithinZone.length > slice.length
        ? `, plus ${place.settlementsWithinZone.length - slice.length} more communities in the same air mass`
        : "";
    paragraphs.push(`The lived map is anchored by ${names}${more}.`);
  }

  if (place.thingsToDo?.length) {
    const bits = place.thingsToDo.slice(0, 5).map(t => {
      const season = t.season ? ` (${t.season})` : "";
      return `${t.label}${season}`;
    });
    paragraphs.push(`To feel the microclimate rather than just read it, start with ${bits.join("; ")}.`);
  } else if (place.travelFit.length) {
    paragraphs.push(`Travelers often show up for ${joinHumanList(place.travelFit, 4)}, which is the practical side of the same climate signal.`);
  }

  if (texture) {
    paragraphs.push(texture);
  } else {
    paragraphs.push(
      `Strongest for ${ensurePeriod(place.whoWouldLove)} Harder for ${ensurePeriod(place.whoMightNot)}`,
    );
  }

  return {
    title: `Field story: ${place.name}`,
    paragraphs,
  };
}
