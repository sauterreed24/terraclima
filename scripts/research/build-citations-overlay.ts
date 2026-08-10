/**
 * Build a compact Citation[] overlay from research receipts for runtime places.ts.
 * Full receipts remain lazy-loaded for Evidence UI only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlaceResearchReceipt } from "../../src/lib/research/contracts";
import { citationsFromResearchSources } from "../../src/lib/research/overlay";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const receiptsPath = join(ROOT, "src/data/generated/research/receipts.json");
const outPath = join(ROOT, "src/data/generated/research/citations-overlay.json");

const bundle = JSON.parse(readFileSync(receiptsPath, "utf8")) as { receipts: PlaceResearchReceipt[] };
const byId: Record<string, ReturnType<typeof citationsFromResearchSources>> = {};
for (const receipt of bundle.receipts) {
  byId[receipt.placeId] = citationsFromResearchSources(receipt.sources);
}
writeFileSync(outPath, JSON.stringify({ version: 1, byId }, null, 2) + "\n");
console.log(`Wrote citations overlay for ${Object.keys(byId).length} places → ${outPath}`);
