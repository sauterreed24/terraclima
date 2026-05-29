/**
 * Backfill screening-grade `liveSignals` for places that lack them.
 * Run: `tsx scripts/backfill-live-signals-corpus.ts`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PLACES } from "../src/data/places";
import { draftLiveSignals, formatLiveSignalsBlock } from "./lib/draft-live-signals";

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
    if (readFileSync(resolve(process.cwd(), rel), "utf8").includes(needle)) return rel;
  }
  return null;
}

function insertLiveSignals(rel: string, id: string, block: string): boolean {
  const path = resolve(process.cwd(), rel);
  let src = readFileSync(path, "utf8");
  const idIdx = src.indexOf(`id: "${id}"`);
  if (idIdx < 0) return false;

  const citationsIdx = src.indexOf("citations:", idIdx);
  if (citationsIdx < 0) return false;

  const placeBlock = src.slice(idIdx, citationsIdx);
  if (/\bliveSignals:\s*\{/.test(placeBlock)) return false;

  const anchor = placeBlock.match(/\n\s*relocationFit:/);
  if (!anchor || anchor.index == null) {
    console.warn(`skip ${id}: no relocationFit anchor`);
    return false;
  }

  const insertAt = idIdx + anchor.index + 1;
  src = `${src.slice(0, insertAt)}${block}\n${src.slice(insertAt)}`;
  writeFileSync(path, src, "utf8");
  return true;
}

let added = 0;
for (const place of PLACES.filter(p => !p.liveSignals)) {
  const file = findFileForPlace(place.id);
  if (!file) {
    console.warn(`no file for ${place.id}`);
    continue;
  }
  const draft = draftLiveSignals(place);
  const block = formatLiveSignalsBlock(draft);
  if (insertLiveSignals(file, place.id, block)) added += 1;
}

console.log(`backfill-live-signals-corpus: added ${added} blocks (${PLACES.length - PLACES.filter(p => !p.liveSignals).length + added}/${PLACES.length} total).`);
