/**
 * Refresh generic `experience.texture` lines on Tier C places without
 * touching hand-authored seasons, feel, or fit fields.
 *
 * Run: `tsx scripts/refresh-texture-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import { draftTexture, isGenericTexture } from "./lib/author-experience-draft";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

const fileCache = new Map<string, string>();
let refreshed = 0;
let skipped = 0;

for (const place of PLACES.filter(p => p.tier === "C")) {
  const texture = place.experience?.texture;
  if (!texture || !isGenericTexture(texture)) {
    skipped += 1;
    continue;
  }

  const file = findFileForPlace(place.id);
  if (!file) continue;

  const src = fileCache.get(file) ?? readCorpusFile(file);
  const win = placeBlockWindow(src, place.id);
  if (!win) continue;

  const nextTexture = draftTexture(place).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = /(\btexture:\s*")([^"]*)(")/;
  const relMatch = re.exec(win.block);
  if (!relMatch || relMatch.index == null) continue;

  const absStart = win.start + relMatch.index;
  const absEnd = absStart + relMatch[0].length;
  const updated = `${src.slice(0, absStart)}texture: "${nextTexture}"${src.slice(absEnd)}`;
  fileCache.set(file, updated);
  refreshed += 1;
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`refresh-texture-corpus: refreshed ${refreshed}, skipped ${skipped} custom textures.`);
