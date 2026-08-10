/**
 * corpus:research:report — human-readable audit of coverage and diversity.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES } from "../../src/data/places";
import { CLIMATE_V2_OVERLAY_BY_ID } from "../../src/data/generated/climate-v2";
import type { PlaceResearchReceipt, ResearchLedger } from "../../src/lib/research/contracts";
import { TIER_C_POLISH_GENERATED } from "../../src/data/places.tier-c-polish";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const receiptsPath = join(ROOT, "src/data/generated/research/receipts.json");
  const ledgerPath = join(ROOT, "data/research/ledger.json");
  const receipts = (JSON.parse(readFileSync(receiptsPath, "utf8")) as { receipts: PlaceResearchReceipt[] }).receipts;
  const ledger = existsSync(ledgerPath)
    ? (JSON.parse(readFileSync(ledgerPath, "utf8")) as ResearchLedger)
    : null;

  const urls = receipts.flatMap(r => r.sources.map(s => s.url));
  const uniqueUrls = new Set(urls.map(u => u.toLowerCase()));
  const genericRoots = [...uniqueUrls].filter(u => {
    try {
      const { pathname } = new URL(u);
      return pathname === "/" || pathname === "";
    } catch {
      return false;
    }
  });

  const experienceComplete = PLACES.filter(p =>
    p.experience?.feel &&
    p.experience.seasons?.winter &&
    p.experience.seasons?.spring &&
    p.experience.seasons?.summer &&
    p.experience.seasons?.autumn &&
    p.experience.travelerFit &&
    p.experience.residentFit &&
    p.experience.texture,
  ).length;

  const validation = { validated: 0, "grid-only": 0, "reviewed-exception": 0, unknown: 0 };
  for (const p of PLACES) {
    const s = CLIMATE_V2_OVERLAY_BY_ID[p.id]?.validationStatus ?? "unknown";
    validation[s as keyof typeof validation] += 1;
  }

  const ledgerStatus = ledger
    ? ledger.entries.reduce<Record<string, number>>((acc, e) => {
        acc[e.status] = (acc[e.status] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  const verifiedReceipts = receipts.filter(r => r.status === "verified").length;
  const withSocial = PLACES.filter(p => p.liveSignals?.socialStress != null).length;

  console.log("# Terraclima corpus research report");
  console.log("");
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Base SHA (ledger): ${ledger?.baseSha ?? "n/a"}`);
  console.log("");
  console.log("## Coverage");
  console.log(`- Places: ${PLACES.length}`);
  console.log(`- Research receipts: ${receipts.length} (verified ${verifiedReceipts})`);
  console.log(`- Authored experience complete: ${experienceComplete}/226`);
  console.log(`- TIER_C_POLISH_GENERATED keys: ${Object.keys(TIER_C_POLISH_GENERATED).length}`);
  console.log(`- Published socialStress residues: ${withSocial}`);
  console.log("");
  console.log("## Climate V2 validation");
  for (const [k, v] of Object.entries(validation)) console.log(`- ${k}: ${v}`);
  console.log("");
  console.log("## Sources");
  console.log(`- Total source entries: ${urls.length}`);
  console.log(`- Unique URLs: ${uniqueUrls.size}`);
  console.log(`- Generic homepage URLs: ${genericRoots.length}`);
  console.log("");
  console.log("## Ledger status");
  for (const [k, v] of Object.entries(ledgerStatus)) console.log(`- ${k}: ${v}`);
  console.log("");
  console.log("## Unresolved material (sample)");
  let shown = 0;
  for (const r of receipts) {
    for (const u of r.unresolved) {
      if (u.fieldPaths.includes("projection")) continue;
      console.log(`- ${r.placeId}: ${u.issue}`);
      shown += 1;
      if (shown >= 20) break;
    }
    if (shown >= 20) break;
  }
  if (shown === 0) console.log("- none");
}

main();
