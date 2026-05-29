/**
 * Normalize mis-indented `experience:` blocks in corpus files.
 * Run: `tsx scripts/normalize-experience-indent.ts`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CORPUS_FILES = [
  "src/data/places.usa.ts",
  "src/data/places.usa.extra.ts",
  "src/data/places.usa.round2.ts",
  "src/data/places.usa.gap-states.ts",
  "src/data/places.canada.ts",
  "src/data/places.mexico.ts",
];

let fixes = 0;
for (const rel of CORPUS_FILES) {
  const path = resolve(process.cwd(), rel);
  const src = readFileSync(path, "utf8");
  const out = src.replace(/^\s{8,}experience:\s*\{/gm, () => {
    fixes += 1;
    return "    experience: {";
  });
  if (out !== src) writeFileSync(path, out, "utf8");
}
console.log(`normalize-experience-indent: ${fixes} blocks normalized.`);
