/**
 * Add a second HTTPS citation to places that only have one.
 * Idempotent — skips when two or more HTTPS URLs already exist.
 *
 * Run: `tsx scripts/backfill-second-citation-corpus.ts`
 */
import type { Place } from "../src/types";
import { PLACES } from "../src/data/places";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

const SECOND_CITATION: Record<Place["country"], { label: string; kind: string; url: string }> = {
  USA: { label: "PRISM — gridded climate normals", kind: "prism", url: "https://prism.oregonstate.edu/" },
  Canada: { label: "Climate Atlas of Canada — regional context", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
  Mexico: { label: "WorldClim — bioclimatic grids", kind: "worldclim", url: "https://www.worldclim.org/" },
};

const fileCache = new Map<string, string>();

function getSrc(rel: string): string {
  if (!fileCache.has(rel)) fileCache.set(rel, readCorpusFile(rel));
  return fileCache.get(rel)!;
}

function httpsCount(place: Place): number {
  return (place.citations ?? []).filter(c => c.url?.startsWith("https://")).length;
}

let added = 0;

for (const place of PLACES.filter(p => httpsCount(p) < 2)) {
  const file = findFileForPlace(place.id);
  if (!file) continue;
  let src = getSrc(file);
  const win = placeBlockWindow(src, place.id);
  if (!win) continue;

  const citesIdx = src.indexOf("\n    citations:", win.start);
  const closeIdx = src.indexOf("],", citesIdx);
  if (citesIdx < 0 || closeIdx < 0) continue;

  const citeBlock = src.slice(citesIdx, closeIdx + 2);
  const httpsInBlock = (citeBlock.match(/url:\s*"https:\/\//g) ?? []).length;
  if (httpsInBlock >= 2) continue;

  const second = SECOND_CITATION[place.country];
  const lineIndent = citeBlock.match(/\n(\s+)\{/)?.[1] ?? "      ";
  const insert = `${lineIndent}{ label: "${second.label}", kind: "${second.kind}", url: "${second.url}" },`;
  src = `${src.slice(0, closeIdx)},\n${insert}${src.slice(closeIdx)}`;
  fileCache.set(file, src);
  added += 1;
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`backfill-second-citation-corpus: added ${added} second citations.`);
