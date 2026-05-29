/**
 * Orchestrator: complete all Tier C editorial blocks in one pass.
 * Run: `tsx scripts/backfill-tier-c-complete.ts`
 */
import { execSync } from "node:child_process";

const steps = [
  "scripts/backfill-humidity-sunshine-corpus.ts",
  "scripts/backfill-deep-sections-corpus.ts",
  "scripts/backfill-second-citation-corpus.ts",
  "scripts/repair-live-signals-corpus.ts",
];

for (const step of steps) {
  console.log(`\n=== ${step} ===`);
  execSync(`npx tsx ${step}`, { stdio: "inherit", cwd: process.cwd() });
}

console.log("\n=== corpus-coverage-report ===");
execSync("npx tsx scripts/corpus-coverage-report.ts", { stdio: "inherit", cwd: process.cwd() });
