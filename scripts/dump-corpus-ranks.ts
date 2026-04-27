/** Usage: npx tsx scripts/dump-corpus-ranks.ts sequim-wa */
import { getPlaceCorpusRanks } from "../src/lib/atlas-corpus-stats";
import { PLACES_BY_ID } from "../src/data/places";

const id = process.argv[2];
if (!id) {
  console.error("Usage: npx tsx scripts/dump-corpus-ranks.ts <placeId>");
  process.exit(1);
}
const p = PLACES_BY_ID[id];
if (!p) {
  console.error(`Unknown place id: ${id}`);
  process.exit(1);
}
const r = getPlaceCorpusRanks(p);
const o = Object.fromEntries(
  Object.entries(r).map(([k, v]) => [k, v == null ? null : Math.round((v as number) * 1e6) / 1e6]),
);
console.log(JSON.stringify({ id, ...o }, null, 2));
