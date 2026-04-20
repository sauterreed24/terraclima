import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { meanJanLow, meanJulyHigh } from "./scoring";
import { fmtElev, fmtPrecip, fmtTemp } from "./units";
import type { DistUnit, TempUnit } from "./units";

/**
 * Composes a human, scene-first narrative from structured place data so every
 * entry gets a distinct “story” even before optional hand-authored prose lands
 * in the corpus. Numbers are already localized to the active unit system.
 */
export function composeFieldStory(
  place: Place,
  temp: TempUnit,
  dist: DistUnit,
): { title: string; paragraphs: string[] } {
  const jh = meanJulyHigh(place);
  const jl = meanJanLow(place);
  const annualP =
    place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const archetypeLabel = ARCHETYPE_BY_ID[place.archetypes[0]]?.label ?? "this landscape";

  const paragraphs: string[] = [];

  const reliefLead = place.reliefContext.split(/[.;]/)[0]?.trim() ?? place.reliefContext;
  paragraphs.push(
    `${place.name} sits near ${fmtElev(place.elevationM, dist)} in ${archetypeLabel.toLowerCase()} terrain — ${reliefLead.charAt(0).toLowerCase()}${reliefLead.slice(1)}.`,
  );

  paragraphs.push(
    `The annual contract looks like ${fmtTemp(jh, temp)} summer highs, ${fmtTemp(
      jl,
      temp,
    )} winter lows, about ${fmtPrecip(annualP, dist)} of precipitation, and Köppen ${place.koppen} — ${place.biome}.`,
  );

  if (place.settlementsWithinZone?.length) {
    const slice = place.settlementsWithinZone.slice(0, 5);
    const names = slice.map(s => s.name + (s.population ? ` (${s.population})` : "")).join(", ");
    const more =
      place.settlementsWithinZone.length > slice.length
        ? `, plus ${place.settlementsWithinZone.length - slice.length} more communities in the same air mass`
        : "";
    paragraphs.push(`Life is anchored in ${names}${more}.`);
  }

  if (place.thingsToDo?.length) {
    const bits = place.thingsToDo.slice(0, 5).map(t => {
      const season = t.season ? ` (${t.season})` : "";
      return `${t.label}${season}`;
    });
    paragraphs.push(`On the ground: ${bits.join(" · ")}.`);
  } else if (place.travelFit.length) {
    paragraphs.push(`Travelers often show up for ${place.travelFit.slice(0, 4).join(", ")}.`);
  }

  paragraphs.push(
    `Fit check — ${place.whoWouldLove} · ${place.whoMightNot}`,
  );

  return {
    title: `The field · ${place.name}`,
    paragraphs,
  };
}
