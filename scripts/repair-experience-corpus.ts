/**
 * Repair corrupted experience blocks (duplicate tails from a bad refresh regex).
 * Run once after fixing formatExperienceBlock / replaceExperience.
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

function repair(src: string): { out: string; fixes: number } {
  let fixes = 0;
  const out = src.replace(
    /(\bexperience:\s*\{[\s\S]*?\btexture:[^\n]+\n)\s*\},\s*\n\s*travelerFit:[\s\S]*?\n\s*texture:[^\n]+\n\s*\},\s*\n(\s*climate:\s*\{)/g,
    (_m, head: string, climate: string) => {
      fixes += 1;
      const normalized = head.replace(/^\s+/m, "    ").replace(/\n\s{6,}/g, "\n      ");
      return `${normalized.trimEnd()}\n    },\n${climate}`;
    },
  );
  return { out, fixes };
}

let total = 0;
for (const rel of CORPUS_FILES) {
  const path = resolve(process.cwd(), rel);
  const src = readFileSync(path, "utf8");
  const { out, fixes } = repair(src);
  if (fixes > 0) {
    writeFileSync(path, out, "utf8");
    total += fixes;
    console.log(`${rel}: repaired ${fixes}`);
  }
}
console.log(`repair-experience-corpus: ${total} blocks fixed.`);
