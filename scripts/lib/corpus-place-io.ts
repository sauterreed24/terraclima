/**
 * Shared corpus file helpers for idempotent backfill codemods.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const CORPUS_FILES = [
  "src/data/places.usa.ts",
  "src/data/places.usa.extra.ts",
  "src/data/places.usa.round2.ts",
  "src/data/places.usa.gap-states.ts",
  "src/data/places.canada.ts",
  "src/data/places.mexico.ts",
] as const;

export function findFileForPlace(id: string): string | null {
  const needle = `id: "${id}"`;
  for (const rel of CORPUS_FILES) {
    if (readFileSync(resolve(process.cwd(), rel), "utf8").includes(needle)) return rel;
  }
  return null;
}

export function readCorpusFile(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

export function writeCorpusFile(rel: string, src: string): void {
  writeFileSync(resolve(process.cwd(), rel), src, "utf8");
}

/** Slice from place id through (exclusive) the citations array field. */
export function placeBlockWindow(src: string, id: string): { start: number; end: number; block: string } | null {
  const idIdx = src.indexOf(`id: "${id}"`);
  if (idIdx < 0) return null;

  // Anchor on the typed citations field — not prose that mentions "citations".
  const citeField = src.indexOf("\n    citations:", idIdx);
  if (citeField < 0) return null;

  return { start: idIdx, end: citeField, block: src.slice(idIdx, citeField) };
}

export function formatMonthly12(values: readonly number[]): string {
  return `[${values.map(v => Math.round(v)).join(", ")}]`;
}
