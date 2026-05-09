import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { DRIVER_LABELS } from "../types";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "./climate-metrics";
import { fmtElev, fmtPrecip, fmtTemp } from "./units";
import type { DistUnit, TempUnit } from "./units";

function sentenceLead(text: string): string {
  const first = text.split(/[.;]/)[0]?.trim() ?? text.trim();
  if (!first) return "the local terrain sets the terms";
  return `${first.charAt(0).toLowerCase()}${first.slice(1)}`;
}

function joinHumanList(items: readonly string[], max = 4): string {
  const clean = Array.from(new Set(items.map(s => s.trim()).filter(Boolean))).slice(0, max);
  if (clean.length === 0) return "local terrain signals";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

/**
 * Composes a human, scene-first narrative from structured place data so every
 * entry gets a distinct story even before optional hand-authored prose lands
 * in the corpus. Numbers are already localized to the active unit system.
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

  const paragraphs: string[] = [];

  paragraphs.push(
    `Start with the ground: ${place.name} sits near ${fmtElev(place.elevationM, dist)} in ${archetypeLabel.toLowerCase()} terrain, where ${sentenceLead(place.reliefContext)}.`,
  );

  paragraphs.push(
    `The climate signature is measurable: high-summer afternoons around ${fmtTemp(jh, temp)}, winter lows near ${fmtTemp(
      jl,
      temp,
    )}, about ${fmtPrecip(annualP, dist)} of precipitation, and Köppen ${place.koppen} - ${place.biome}.`,
  );

  paragraphs.push(
    `The terrain engines named in the record are ${joinHumanList(driverLabels, 5)}. Read the charts through those forces first: elevation, exposure, water, and air movement explain more here than a single regional average.`,
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

  paragraphs.push(
    `Fit check: strongest for ${place.whoWouldLove}; harder for ${place.whoMightNot}.`,
  );

  return {
    title: `Field story: ${place.name}`,
    paragraphs,
  };
}
