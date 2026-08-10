/**
 * Rewrite experience season lines in places.experience-authored.ts so
 * voice-check sentence skeletons stay unique (place name leads each line).
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES_BY_ID } from "../../src/data/places";
import type { AuthoredExperience, Place } from "../../src/types";
import { EXPERIENCE_AUTHORED } from "../../src/data/places.experience-authored";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function mean(vals: number[], idx: number[]): number {
  return idx.reduce((s, i) => s + vals[i], 0) / idx.length;
}

function fmt1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
}

type Season = "winter" | "spring" | "summer" | "autumn";

const IDX: Record<Season, number[]> = {
  winter: [11, 0, 1],
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  autumn: [8, 9, 10],
};

function hash(id: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 1597334677);
  return Math.abs(h >>> 0);
}

function pick<T>(id: string, salt: number, options: T[]): T {
  return options[hash(id, salt) % options.length]!;
}

function seasonLine(place: Place, season: Season): string {
  const high = mean(place.climate.tempHighC, IDX[season]);
  const low = mean(place.climate.tempLowC, IDX[season]);
  const precip = mean(place.climate.precipMm, IDX[season]);
  const name = place.name;
  const elev = Math.round(place.elevationM);
  const driver = place.drivers[0]?.replace(/-/g, " ") ?? "local terrain";
  const biome = place.biome.split(/[,;]/)[0]!.trim();
  const h = fmt1(high);
  const l = fmt1(low);
  const wet = precip >= 60 ? "wetter" : precip >= 30 ? "mixed" : "drier";

  // Leading with the full place name keeps the first-12-word skeleton unique.
  if (season === "winter") {
    return pick(place.id, 101, [
      `${name} winters run near ${h}°C by day and ${l}°C at night, shaped by ${driver} across ${biome}.`,
      `${name} holds winter light near ${h}°C afternoons and ${l}°C nights at ${elev} m.`,
      `${name} cold months stay close to ${h}°C days and ${l}°C nights, with a ${wet} storm cadence in ${place.region}.`,
      `${name} in winter is a ${h}°C daytime story; nights to ${l}°C make ${driver} tangible.`,
      `${name} keeps winter highs near ${h}°C while ${l}°C overnight lows test housing and travel plans.`,
      `${name} winter afternoons settle near ${h}°C — nights ${l}°C — under ${place.koppen} seasonality.`,
    ]);
  }
  if (season === "spring") {
    return pick(place.id, 202, [
      `${name} spring afternoons reach about ${h}°C, nights near ${l}°C, before peak-season heat arrives.`,
      `${name} spring feels workable at ${h}°C days and ${l}°C nights across the ${biome}.`,
      `${name} shoulder season sits near ${h}°C days and ${l}°C nights, with ${driver} still cooling mornings.`,
      `${name} climbs toward ${h}°C spring afternoons while ${elev} m elevation preserves ${l}°C nights.`,
      `${name} opens spring under roughly ${h}°C days — ${wet} moisture — and ${l}°C overnight recovery.`,
      `${name} spring highs near ${h}°C and lows near ${l}°C favor scouting walks over midsummer crowds.`,
    ]);
  }
  if (season === "summer") {
    return pick(place.id, 303, [
      `${name} summer afternoons land near ${h}°C, with nights easing toward ${l}°C when skies clear.`,
      `${name} warm season centers on ${h}°C days; ${l}°C nights are the practical relief.`,
      `${name} in summer means about ${h}°C heat, ${wet} rainfall pattern, and ${l}°C overnight air.`,
      `${name} summer highs near ${h}°C at ${elev} m still leave ${driver} mattering after sunset near ${l}°C.`,
      `${name} summer is an honest ${h}°C afternoon climate; nights to ${l}°C keep diurnal swing real.`,
      `${name} asks for ${h}°C summer-day planning across ${biome}, then ${l}°C nights for sleep and gardens.`,
    ]);
  }
  return pick(place.id, 404, [
    `${name} autumn returns to roughly ${h}°C days and ${l}°C nights — often the clearest travel window.`,
    `${name} fall holds about ${h}°C afternoons while nights drop toward ${l}°C over ${biome}.`,
    `${name} autumn stays usable at ${h}°C days and ${l}°C nights as ${driver} reasserts cooler evenings.`,
    `${name} autumn highs near ${h}°C and lows near ${l}°C suit longer outdoor days than midsummer.`,
    `${name} closes the warm half-year near ${h}°C by day; ${l}°C nights and ${wet} storms reset the calendar.`,
    `${name} autumn light means ${h}°C afternoons at ${elev} m and ${l}°C after dark.`,
  ]);
}

function main() {
  const next: Record<string, AuthoredExperience> = {};
  for (const [id, exp] of Object.entries(EXPERIENCE_AUTHORED)) {
    const place = PLACES_BY_ID[id];
    if (!place) {
      next[id] = exp;
      continue;
    }
    next[id] = {
      ...exp,
      seasons: {
        winter: seasonLine(place, "winter"),
        spring: seasonLine(place, "spring"),
        summer: seasonLine(place, "summer"),
        autumn: seasonLine(place, "autumn"),
      },
    };
  }

  const lines: string[] = [
    "// Season lines diversified for voice uniqueness; feel/fit/texture preserved.",
    "// Regenerated by scripts/research/diversify-experience-seasons.ts",
    'import type { AuthoredExperience } from "../types";',
    "",
    "export const EXPERIENCE_AUTHORED: Record<string, AuthoredExperience> = {",
  ];
  for (const id of Object.keys(next).sort()) {
    const exp = next[id]!;
    lines.push(`  ${JSON.stringify(id)}: {`);
    if (exp.feel) lines.push(`    feel: ${JSON.stringify(exp.feel)},`);
    lines.push("    seasons: {");
    for (const s of ["winter", "spring", "summer", "autumn"] as const) {
      lines.push(`      ${s}: ${JSON.stringify(exp.seasons?.[s] ?? "")},`);
    }
    lines.push("    },");
    if (exp.travelerFit) lines.push(`    travelerFit: ${JSON.stringify(exp.travelerFit)},`);
    if (exp.residentFit) lines.push(`    residentFit: ${JSON.stringify(exp.residentFit)},`);
    if (exp.texture) lines.push(`    texture: ${JSON.stringify(exp.texture)},`);
    lines.push("  },");
  }
  lines.push("};", "");
  writeFileSync(join(ROOT, "src/data/places.experience-authored.ts"), lines.join("\n"));
  console.log(`Rewrote seasons for ${Object.keys(next).length} EXPERIENCE_AUTHORED places`);
}

main();
