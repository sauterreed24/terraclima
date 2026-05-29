/**
 * Refresh auto-drafted `experience` blocks with the latest draft generator.
 * Skips hand-authored Tier A/B and batch exemplars.
 *
 * Run: `tsx scripts/refresh-experience-corpus.ts`
 */
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";
import { PLACES } from "../src/data/places";
import {
  draftAuthoredExperience,
  formatExperienceBlock,
  isAutoDraftedExperience,
} from "./lib/author-experience-draft";

function replaceExperience(rel: string, id: string, block: string): boolean {
  let src = readCorpusFile(rel);
  const win = placeBlockWindow(src, id);
  if (!win) return false;

  const expMatch = /\bexperience:\s*\{[\s\S]*?\n\s*\},\s*\n\s*climate:\s*\{/.exec(win.block);
  if (!expMatch || expMatch.index == null) return false;

  const start = win.start + expMatch.index;
  const end = start + expMatch[0].length - "climate: {".length;
  src = `${src.slice(0, start)}${block}\n    climate: {${src.slice(end + "climate: {".length)}`;
  writeCorpusFile(rel, src);
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
