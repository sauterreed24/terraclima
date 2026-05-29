/**
 * Backfill authored `experience` blocks for every place that lacks one.
 * Drafts prose from structured corpus fields via author-experience-draft.ts.
 *
 * Run: `tsx scripts/backfill-experience-corpus.ts`
 * Idempotent — skips places that already have `experience:`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PLACES, PLACES_BY_ID } from "../src/data/places";
import { draftAuthoredExperience, formatExperienceBlock } from "./lib/author-experience-draft";

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

function insertExperience(rel: string, id: string, block: string): boolean {
  const path = resolve(process.cwd(), rel);
  let src = readFileSync(path, "utf8");
  const idIdx = src.indexOf(`id: "${id}"`);
  if (idIdx < 0) return false;

  const citationsIdx = src.indexOf("citations:", idIdx);
  if (citationsIdx < 0) return false;

  const placeBlock = src.slice(idIdx, citationsIdx);
  if (/\bexperience:\s*\{/.test(placeBlock)) return false;

  const whyMatch = /\bwhyDistinct:\s*"[^"]*",\s*\n/.exec(placeBlock);
  if (!whyMatch) {
    console.warn(`skip ${id}: no whyDistinct anchor in ${rel}`);
    return false;
  }

  const insertAt = idIdx + whyMatch.index + whyMatch[0].length;
  src = src.slice(0, insertAt) + `${block}\n` + src.slice(insertAt);
  writeFileSync(path, src, "utf8");
  return true;
}

let added = 0;
const missing = PLACES.filter(p => !p.experience);

for (const place of missing) {
  const file = findFileForPlace(place.id);
  if (!file) {
    console.warn(`no file for ${place.id}`);
    continue;
  }
  const draft = draftAuthoredExperience(place);
  const block = formatExperienceBlock(draft);
  if (insertExperience(file, place.id, block)) {
    added += 1;
    // Refresh in-memory place for downstream sanity (WeakMap cache unaffected until reload)
    PLACES_BY_ID[place.id] = { ...place, experience: draft };
  }
}

console.log(`backfill-experience-corpus: added ${added} experience blocks (${PLACES.length - missing.length + added}/${PLACES.length} total).`);
