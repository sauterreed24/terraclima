/**
 * Replace generic Tier C `confidenceNotes` with place-specific screening language.
 * Idempotent — skips notes that are already customized.
 *
 * Run: `tsx scripts/backfill-confidence-notes-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import {
  draftConfidenceNote,
  isGenericConfidenceNote,
} from "./lib/draft-confidence-note";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

const fileCache = new Map<string, string>();
let updated = 0;

for (const place of PLACES.filter(p => p.tier === "C" && isGenericConfidenceNote(p.confidenceNotes))) {
  const file = findFileForPlace(place.id);
  if (!file) continue;
  let src = fileCache.get(file) ?? readCorpusFile(file);
  const win = placeBlockWindow(src, place.id);
  if (!win) continue;

  const note = draftConfidenceNote(place).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = /confidenceNotes:\s*"[^"]*",/;
  const block = win.block;
  if (!re.test(block)) continue;

  const relIdx = block.search(re);
  if (relIdx < 0) continue;
  const absStart = win.start + relIdx;
  const oldMatch = src.slice(absStart).match(/^confidenceNotes:\s*"[^"]*",/)?.[0];
  if (!oldMatch) continue;

  src = `${src.slice(0, absStart)}confidenceNotes: "${note}",${src.slice(absStart + oldMatch.length)}`;
  fileCache.set(file, src);
  updated += 1;
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`backfill-confidence-notes-corpus: updated ${updated} Tier C confidenceNotes.`);
