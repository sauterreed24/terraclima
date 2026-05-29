/**
 * Repair partial `liveSignals` blocks — ensure ≥2 HTTPS sources and
 * complete axis scores. Preserves hand-authored notes when adequate.
 *
 * Run: `tsx scripts/repair-live-signals-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import { draftLiveSignals, formatLiveSignalsBlock } from "./lib/draft-live-signals";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

function httpsSources(place: typeof PLACES[number]): number {
  return (place.liveSignals?.sources ?? []).filter(s => s.url?.startsWith("https://")).length;
}

function needsRepair(place: typeof PLACES[number]): boolean {
  const ls = place.liveSignals;
  if (!ls) return true;
  if (ls.costPressure == null || ls.socialStress == null || ls.accessFriction == null) return true;
  if (!ls.note || ls.note.length < 48) return true;
  return httpsSources(place) < 2;
}

function replaceLiveSignals(src: string, id: string, block: string): string | null {
  const win = placeBlockWindow(src, id);
  if (!win) return null;
  const lsMatch = /\bliveSignals:\s*\{[\s\S]*?\n\s*\},/.exec(win.block);
  if (!lsMatch || lsMatch.index == null) return null;
  const absStart = win.start + lsMatch.index;
  const absEnd = absStart + lsMatch[0].length;
  return `${src.slice(0, absStart)}${block}${src.slice(absEnd)}`;
}

function appendSourceToLiveSignals(src: string, id: string, label: string, url: string): string | null {
  const win = placeBlockWindow(src, id);
  if (!win) return null;
  const lsMatch = /\bliveSignals:\s*\{[\s\S]*?\n\s*\},/.exec(win.block);
  if (!lsMatch || lsMatch.index == null) return null;
  const lsBlock = lsMatch[0];
  const srcIndent = lsBlock.match(/\n(\s*)sources:\s*\[/)?.[1] ?? "      ";
  const itemIndent = `${srcIndent}  `;
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `${itemIndent}{ label: "${esc(label)}", url: "${esc(url)}" },`;
  const sourcesEnd = lsBlock.lastIndexOf("],");
  if (sourcesEnd < 0) return null;
  const absStart = win.start + lsMatch.index;
  const newLs =
    lsBlock.slice(0, sourcesEnd) +
    (lsBlock.slice(sourcesEnd - itemIndent.length, sourcesEnd).trim() === "" ? "" : "\n") +
    line +
    lsBlock.slice(sourcesEnd);
  return src.slice(0, absStart) + newLs + src.slice(absStart + lsMatch[0].length);
}

const fileCache = new Map<string, string>();
let repaired = 0;
let sourcesPatched = 0;

for (const place of PLACES.filter(needsRepair)) {
  const file = findFileForPlace(place.id);
  if (!file) continue;
  let src = fileCache.get(file) ?? readCorpusFile(file);
  const ls = place.liveSignals;
  const axesOk =
    ls &&
    ls.costPressure != null &&
    ls.socialStress != null &&
    ls.accessFriction != null &&
    ls.note &&
    ls.note.length >= 48;

  if (axesOk && httpsSources(place) < 2) {
    const draft = draftLiveSignals(place);
    const extra = draft.sources.find(s => s.url?.startsWith("https://") && !(ls!.sources ?? []).some(x => x.url === s.url));
    if (extra?.url) {
      const next = appendSourceToLiveSignals(src, place.id, extra.label, extra.url);
      if (next && next !== src) {
        src = next;
        sourcesPatched += 1;
      }
    }
  } else {
    const draft = draftLiveSignals(place);
    const next = replaceLiveSignals(src, place.id, formatLiveSignalsBlock(draft));
    if (next && next !== src) {
      src = next;
      repaired += 1;
    }
  }

  fileCache.set(file, src);
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`repair-live-signals-corpus: rebuilt ${repaired}, patched sources ${sourcesPatched}.`);
