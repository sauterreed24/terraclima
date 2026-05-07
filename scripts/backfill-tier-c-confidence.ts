/**
 * One-shot codemod: add a baseline `confidenceNotes` line to every Tier C
 * place that doesn't already have one. The line is intentionally framed as
 * editorial-screening language so readers know the entry is interpretive,
 * not measurement-grade. Skips any place that already has confidenceNotes.
 *
 * Run with `tsx scripts/backfill-tier-c-confidence.ts`. Idempotent.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = [
  "src/data/places.usa.ts",
  "src/data/places.usa.extra.ts",
  "src/data/places.usa.round2.ts",
  "src/data/places.usa.gap-states.ts",
  "src/data/places.canada.ts",
  "src/data/places.mexico.ts",
];

const TIER_C_NOTE =
  "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.";

let added = 0;

for (const rel of FILES) {
  const path = resolve(process.cwd(), rel);
  let src = readFileSync(path, "utf8");

  // Match a place with `tier: "C"` and `confidence: "..."` but no
  // `confidenceNotes:` between them. Insert the note immediately after
  // `confidence: "..."` line.
  // We work block-by-block: find each `tier: "C"` and walk to the next
  // `citations: [` (which always exists). If `confidenceNotes:` is absent
  // in that window, insert.
  const placeBlocks: Array<{ start: number; end: number }> = [];
  const tierC = /\btier:\s*"C"/g;
  for (const m of src.matchAll(tierC)) {
    const start = m.index ?? 0;
    const next = src.indexOf("citations:", start);
    if (next < 0) continue;
    placeBlocks.push({ start, end: next });
  }

  // Walk in reverse so insertions don't shift later indices.
  for (let i = placeBlocks.length - 1; i >= 0; i--) {
    const { start, end } = placeBlocks[i];
    const block = src.slice(start, end);
    if (/\bconfidenceNotes:/.test(block)) continue;
    // Find the `confidence: "..."` declaration in this block.
    const cm = /\bconfidence:\s*"(?:high|moderate|low)"\s*,\s*\n/.exec(block);
    if (!cm) continue;
    const insertAt = start + cm.index + cm[0].length;
    // Detect leading indentation by looking at the line containing `confidence:`.
    // Use the same indent as that line.
    const lineStart = src.lastIndexOf("\n", start + cm.index) + 1;
    const indent = src.slice(lineStart, start + cm.index).match(/^\s*/)?.[0] ?? "    ";
    const insert = `${indent}confidenceNotes: "${TIER_C_NOTE}",\n`;
    src = src.slice(0, insertAt) + insert + src.slice(insertAt);
    added += 1;
  }

  writeFileSync(path, src, "utf8");
}

console.log(`backfill-tier-c-confidence: added ${added} confidenceNotes to Tier C places.`);
