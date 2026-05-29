/**
 * Refresh auto-drafted `experience` blocks with the latest draft generator.
 * Skips hand-authored Tier A/B and batch exemplars.
 *
 * Run: `tsx scripts/refresh-experience-corpus.ts`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PLACES } from "../src/data/places";
import {
  draftAuthoredExperience,
  formatExperienceBlock,
  isAutoDraftedExperience,
} from "./lib/author-experience-draft";

const CORPUS_FILES = [
  "src/data/places.usa.ts",
  "src/data/places.usa.extra.ts",
  "src/data/places.usa.round2.ts",
  "src/data/places.usa.gap-states.ts",
  "src/data/places.canada.ts",
  "src/data/places.mexico.ts",
];

function findFileForPlace(id: string): string | null {
  const needle = `id: "${id}"`;
  for (const rel of CORPUS_FILES) {
    const src = readFileSync(resolve(process.cwd(), rel), "utf8");
    if (src.includes(needle)) return rel;
  }
  return null;
}

function replaceExperience(rel: string, id: string, block: string): boolean {
  const path = resolve(process.cwd(), rel);
  let src = readFileSync(path, "utf8");
  const idIdx = src.indexOf(`id: "${id}"`);
  if (idIdx < 0) return false;

  const citationsIdx = src.indexOf("citations:", idIdx);
  if (citationsIdx < 0) return false;

  const placeBlock = src.slice(idIdx, citationsIdx);
  const expMatch = /\bexperience:\s*\{[\s\S]*?\n\s*\},\s*\n\s*climate:\s*\{/.exec(placeBlock);
  if (!expMatch) return false;

  const start = idIdx + expMatch.index;
  const end = start + expMatch[0].length - "climate: {".length;
  src = `${src.slice(0, start)}${block}\n    climate: {${src.slice(end + "climate: {".length)}`;
  writeFileSync(path, src, "utf8");
  return true;
}

let refreshed = 0;
let skipped = 0;

for (const place of PLACES) {
  if (!place.experience) continue;
  if (!isAutoDraftedExperience(place)) {
    skipped += 1;
    continue;
  }
  const file = findFileForPlace(place.id);
  if (!file) {
    console.warn(`no file for ${place.id}`);
    continue;
  }
  const draft = draftAuthoredExperience(place);
  const block = formatExperienceBlock(draft);
  if (replaceExperience(file, place.id, block)) {
    refreshed += 1;
  }
}

console.log(`refresh-experience-corpus: refreshed ${refreshed}, skipped ${skipped} hand-authored.`);
