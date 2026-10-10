import type { Place } from "../types";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "./climate-metrics";
import { fmtPrecip, fmtTemp } from "./units";
import type { DistUnit, TempUnit } from "./units";

function joinHumanList(items: readonly string[], max = 4): string {
  const clean = Array.from(new Set(items.map(s => s.trim()).filter(Boolean))).slice(0, max);
  if (clean.length === 0) return "local terrain signals";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

/**
 * A short, practical companion to the overview. The overview already carries
 * the authored feel, why-it-differs read, contrasts and history, so this
 * section does not repeat them: it puts the numbers into plain words, names
 * the communities that share the same air, and says where to start on the
 * ground.
 */
export function composeFieldStory(
  place: Place,
  temp: TempUnit,
  dist: DistUnit,
): { title: string; paragraphs: string[] } {
  const jh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const annualP = getAnnualPrecipMm(place);
  const annualSnowCm = place.climate.snowCm?.reduce((a, b) => a + (b ?? 0), 0) ?? 0;
  const wet = annualSnowCm >= 25 ? "rain and snow" : "rain";

  const paragraphs: string[] = [
    `In round numbers: summer afternoons around ${fmtTemp(jh, temp)}, winter nights near ${fmtTemp(jl, temp)}, and about ${fmtPrecip(annualP, dist)} of ${wet} in a typical year.`,
  ];

  if (place.settlementsWithinZone?.length) {
    const slice = place.settlementsWithinZone.slice(0, 5);
    const names = slice.map(s => s.name + (s.population ? ` (${s.population})` : ""));
    const extra = place.settlementsWithinZone.length - slice.length;
    const list = extra > 0 ? [...names, `${extra} more ${extra === 1 ? "community" : "communities"}`] : names;
    paragraphs.push(`The same air wraps around ${joinHumanList(list, 6)}.`);
  }

  if (place.thingsToDo?.length) {
    const bits = place.thingsToDo.slice(0, 5).map(t => (t.season ? `${t.label} (${t.season})` : t.label));
    paragraphs.push(`To feel the climate rather than just read about it, start with ${bits.join("; ")}.`);
  } else if (place.travelFit.length) {
    paragraphs.push(`Visitors tend to come for ${joinHumanList(place.travelFit, 4)}.`);
  }

  return {
    title: `On the ground: ${place.name}`,
    paragraphs,
  };
}
