/**
 * climate:data:update — fetch Daymet through a complete calendar year, then
 * regenerate committed Climate V2 assets.
 *
 *   npm run climate:data:update -- --through=2025
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;

function run(script: string, args: string[]): void {
  const result = spawnSync(
    "npx",
    ["tsx", join(ROOT, "scripts/climate-data", script), ...args],
    { stdio: "inherit", cwd: ROOT, env: process.env, shell: true },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  console.log("== climate:data:update: fetch ==");
  run("fetch-daymet.ts", args);
  console.log("== climate:data:update: generate ==");
  run("generate.ts", args);
  console.log("== climate:data:update: verify ==");
  run("verify.ts", []);
  console.log("== climate:data:update: audit ==");
  run("audit.ts", []);
  console.log("climate:data:update complete");
}

main();
