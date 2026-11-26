/**
 * Regenerates the profile-field files the app loads, from the authored sources
 * (src/data/profile-extras/{usa,canada,mexico}.ts, Tier C polish, research
 * citations):
 *   - src/data/profile-extras/stats.json — the few figures the atlas list and
 *     rankings need (citation counts, In depth chapter count, 2050 outlook);
 *   - src/data/profile-extras/generated/<group>.json — each place's finished
 *     sources, confidence notes, outlook and chapters, in the same ten groups
 *     as the site-history files, so a profile downloads one small file.
 *
 *   npm run corpus:profile-stats      (after editing any of those sources)
 *
 * src/lib/__tests__/profile-extras.test.ts fails when these are out of date.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { computeProfileFieldGroups, computeProfileStats } from "../src/lib/profile-stats-compute";
import { PLACES_FULL } from "../src/data/places.full";

const dir = fileURLToPath(new URL("../src/data/profile-extras/", import.meta.url));
writeFileSync(`${dir}stats.json`, `${JSON.stringify(computeProfileStats(PLACES_FULL), null, 1)}\n`);
mkdirSync(`${dir}generated`, { recursive: true });
const groups = computeProfileFieldGroups(PLACES_FULL);
for (const [group, fields] of Object.entries(groups)) {
  writeFileSync(`${dir}generated/${group}.json`, `${JSON.stringify(fields)}\n`);
}
console.log(`profile fields: ${PLACES_FULL.length} places, ${Object.keys(groups).length} files → ${dir}`);
