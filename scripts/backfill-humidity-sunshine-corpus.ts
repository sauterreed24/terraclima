/**
 * Backfill monthly humidity (%) and sunshine (% of possible) for places
 * missing either field in `climate`. Idempotent.
 *
 * Run: `tsx scripts/backfill-humidity-sunshine-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import { draftHumidityPct, draftSunshinePct } from "./lib/draft-climate-atmosphere";
import {
  findFileForPlace,
  formatMonthly12,
  placeBlockWindow,
  readCorpusFile,
  writeCorpusFile,
} from "./lib/corpus-place-io";

function climateFieldSlice(src: string, id: string): { absStart: number; body: string; inline: boolean } | null {
  const win = placeBlockWindow(src, id);
  if (!win) return null;
  const rel = win.block.indexOf("\n    climate:");
  if (rel < 0) return null;
  const absStart = win.start + rel + 1;
  const slice = src.slice(absStart, win.end);

  const inline = /^ {4}climate:\s*\{[^}\n]+\},/m.exec(slice);
  if (inline) {
    const body = inline[0].slice(inline[0].indexOf("{") + 1, -2);
    return { absStart, body, inline: true };
  }

  const multiline = /^ {4}climate:\s*\{([\s\S]*?)\n {4}\},/m.exec(slice);
  if (!multiline) return null;
  return { absStart, body: multiline[1]!, inline: false };
}

function hasClimateField(body: string, key: "humidity" | "sunshinePct"): boolean {
  return new RegExp(`\\b${key}:`).test(body);
}

function insertClimateFields(
  src: string,
  id: string,
  fields: Array<{ key: "humidity" | "sunshinePct"; values: readonly number[] }>,
): string | null {
  const field = climateFieldSlice(src, id);
  if (!field) return null;

  let body = field.body;
  const pending = fields.filter(f => !hasClimateField(body, f.key));
  if (pending.length === 0) return null;

  for (const { key, values } of pending) {
    body = `${body.trimEnd()}, ${key}: ${formatMonthly12(values)}`;
  }

  if (field.inline) {
    const replacement = `    climate: { ${body.trim()} },`;
    const oldLen = src.slice(field.absStart).match(/^ {4}climate:\s*\{[^}\n]+\},/)?.[0]?.length;
    if (!oldLen) return null;
    return src.slice(0, field.absStart) + replacement + src.slice(field.absStart + oldLen);
  }

  const slice = src.slice(field.absStart, placeBlockWindow(src, id)!.end);
  const oldBlock = /^ {4}climate:\s*\{[\s\S]*?\n {4}\},/m.exec(slice)?.[0];
  if (!oldBlock) return null;
  const replacement = `    climate: {\n${body.trim()}\n    },`;
  return src.slice(0, field.absStart) + replacement + src.slice(field.absStart + oldBlock.length);
}

const fileCache = new Map<string, string>();
let humidityAdded = 0;
let sunshineAdded = 0;

for (const place of PLACES) {
  const file = findFileForPlace(place.id);
  if (!file) continue;
  const src = fileCache.get(file) ?? readCorpusFile(file);
  const field = climateFieldSlice(src, place.id);
  if (!field) continue;

  const fields: Array<{ key: "humidity" | "sunshinePct"; values: readonly number[] }> = [];
  if (!place.climate.humidity && !hasClimateField(field.body, "humidity")) {
    fields.push({ key: "humidity", values: draftHumidityPct(place) });
    humidityAdded += 1;
  }
  if (!place.climate.sunshinePct && !hasClimateField(field.body, "sunshinePct")) {
    fields.push({ key: "sunshinePct", values: draftSunshinePct(place) });
    sunshineAdded += 1;
  }
  if (fields.length === 0) continue;

  const next = insertClimateFields(src, place.id, fields);
  if (next && next !== src) fileCache.set(file, next);
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`backfill-humidity-sunshine-corpus: humidity +${humidityAdded}, sunshinePct +${sunshineAdded}.`);
