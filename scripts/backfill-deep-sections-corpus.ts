/**
 * Backfill curated `deepSections` for places that lack them.
 * Idempotent — skips places that already have deepSections.
 *
 * Run: `tsx scripts/backfill-deep-sections-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import { draftDeepSections, formatDeepSectionsBlock } from "./lib/draft-deep-section";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

const fileCache = new Map<string, string>();

function getSrc(rel: string): string {
  if (!fileCache.has(rel)) fileCache.set(rel, readCorpusFile(rel));
  return fileCache.get(rel)!;
}

let added = 0;

for (const place of PLACES.filter(p => !p.deepSections?.length)) {
  const file = findFileForPlace(place.id);
  if (!file) {
    console.warn(`no file for ${place.id}`);
    continue;
  }
  let src = getSrc(file);
  const win = placeBlockWindow(src, place.id);
  if (!win || /\bdeepSections:/.test(win.block)) continue;

  const anchor = /\n(\s*)confidenceNotes:/.exec(win.block) ?? /\n(\s*)confidence:/.exec(win.block);
  if (!anchor || anchor.index == null) {
    console.warn(`skip ${place.id}: no confidence anchor`);
    continue;
  }

  const insertAt = win.start + anchor.index + 1;
  const block = formatDeepSectionsBlock(draftDeepSections(place), anchor[1] ?? "    ");
  src = `${src.slice(0, insertAt)}${block}\n${src.slice(insertAt)}`;
  fileCache.set(file, src);
  added += 1;
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`backfill-deep-sections-corpus: added ${added} deepSections blocks.`);
