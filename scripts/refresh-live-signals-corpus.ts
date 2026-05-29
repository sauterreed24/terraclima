/**
 * Refresh templated `liveSignals.note` fields with the latest draft generator.
 * Preserves axis scores and sources when only the note is generic.
 *
 * Run: `tsx scripts/refresh-live-signals-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import { draftLiveSignals, isGenericLiveSignalsNote } from "./lib/draft-live-signals";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

const SKIP_IDS = new Set([
  "new-orleans-la", "charleston-sc", "tucson-az", "anchorage-ak", "mobile-al",
  "savannah-ga", "buffalo-ny", "chattanooga-tn", "spokane-wa", "austin-tx",
  "washington-dc", "honolulu-hi", "monterrey-mx", "puebla-mx", "queretaro-mx",
  "des-moines-ia", "columbia-sc", "wilmington-de", "boulder-co", "grand-marais-mi",
  "forks-wa", "point-reyes-ca", "valdez-ak", "real-catorce-mx", "twillingate-nl",
  "xalapa-mx", "grand-manan-nb",
]);

const fileCache = new Map<string, string>();
let refreshed = 0;
let skipped = 0;

for (const place of PLACES) {
  if (SKIP_IDS.has(place.id) || !place.liveSignals) {
    skipped += 1;
    continue;
  }
  if (!isGenericLiveSignalsNote(place.liveSignals.note)) {
    skipped += 1;
    continue;
  }
  const file = findFileForPlace(place.id);
  if (!file) continue;
  let src = fileCache.get(file) ?? readCorpusFile(file);
  const win = placeBlockWindow(src, place.id);
  if (!win) continue;

  const note = draftLiveSignals(place).note.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = /note:\s*"[^"]*",/;
  if (!re.test(win.block)) continue;

  const relIdx = win.block.search(re);
  if (relIdx < 0) continue;
  const absStart = win.start + relIdx;
  const oldMatch = src.slice(absStart).match(/^note:\s*"[^"]*",/)?.[0];
  if (!oldMatch) continue;

  src = `${src.slice(0, absStart)}note: "${note}",${src.slice(absStart + oldMatch.length)}`;
  fileCache.set(file, src);
  refreshed += 1;
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`refresh-live-signals-corpus: refreshed ${refreshed}, skipped ${skipped} custom notes.`);
