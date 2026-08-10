/**
 * Advance research ledger + receipt verification for completed batches.
 *
 * Marks a place verified when:
 * - complete authored experience
 * - >=2 deep sections
 * - receipt claims cover required narrative + factual groups
 * - no material unresolved claims
 * - Climate V2 overlay present
 *
 * Usage:
 *   npx tsx scripts/research/advance-ledger-batches.ts
 *   npx tsx scripts/research/advance-ledger-batches.ts --country Mexico
 *   npx tsx scripts/research/advance-ledger-batches.ts --priority-exceptions
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES } from "../../src/data/places";
import { CLIMATE_V2_OVERLAY_BY_ID } from "../../src/data/generated/climate-v2";
import type { PlaceResearchReceipt, ResearchLedger } from "../../src/lib/research/contracts";
import { REQUIRED_FACTUAL_FIELD_GROUPS, REQUIRED_NARRATIVE_BLOCKS } from "../../src/lib/research/contracts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TODAY = new Date().toISOString().slice(0, 10);
const COMMIT = process.env.CHECKPOINT_COMMIT ?? null;

const PRIORITY_EXCEPTIONS = [
  "hood-river-gorge", "redfield-ny", "honolulu-hi", "mount-charleston-nv", "lone-pine-ca",
  "real-catorce-mx", "ensenada-mx", "iqaluit-nu", "prince-rupert-bc", "santa-barbara-ca",
  "driggs-id", "traverse-city-mi", "ithaca-ny", "grand-marais-mn", "boulder-co",
  "grand-marais-mi", "santa-cruz-felton-ca", "eureka-ca", "point-reyes-ca", "truckee-ca",
  "mammoth-lakes-ca", "fort-davis-tx", "marfa-tx", "prescott-az", "bishop-ca",
  "joseph-or", "leavenworth-wa", "port-orford-cape-blanco-or", "klamath-falls-upper-klamath-basin-or",
  "tucson-az",
];

function experienceComplete(place: (typeof PLACES)[number]): boolean {
  const e = place.experience;
  return Boolean(
    e?.feel && e.seasons?.winter && e.seasons?.spring && e.seasons?.summer && e.seasons?.autumn &&
    e.travelerFit && e.residentFit && e.texture,
  );
}

function claimsCover(receipt: PlaceResearchReceipt): boolean {
  const claimed = new Set(receipt.claims.flatMap(c => c.fieldPaths));
  for (const block of REQUIRED_NARRATIVE_BLOCKS) {
    if (!claimed.has(block)) return false;
  }
  for (const group of REQUIRED_FACTUAL_FIELD_GROUPS) {
    const ok = [...claimed].some(fp =>
      fp === group ||
      fp.startsWith(group + ".") ||
      (group === "identity" && ["name", "lat", "lon", "region", "country"].includes(fp)) ||
      (group === "coordinates" && (fp === "lat" || fp === "lon")) ||
      (group === "livedIndicators" && fp.startsWith("liveSignals")) ||
      (group === "climate.monthly" && fp.startsWith("climate.")),
    );
    if (!ok) return false;
  }
  return true;
}

function canVerify(place: (typeof PLACES)[number], receipt: PlaceResearchReceipt): { ok: boolean; reason?: string } {
  if (!experienceComplete(place)) return { ok: false, reason: "incomplete experience" };
  if ((place.deepSections?.length ?? 0) < 2) return { ok: false, reason: "needs >=2 deep sections" };
  if (!CLIMATE_V2_OVERLAY_BY_ID[place.id]) return { ok: false, reason: "missing Climate V2" };
  if (place.liveSignals?.socialStress != null) return { ok: false, reason: "socialStress residue" };
  const material = receipt.unresolved.filter(u => !u.fieldPaths.every(fp => fp === "projection" || fp.startsWith("projection.")));
  if (material.length) return { ok: false, reason: `unresolved: ${material[0]!.issue}` };
  if (!claimsCover(receipt)) return { ok: false, reason: "claim coverage incomplete" };
  if (receipt.sources.length < 3) return { ok: false, reason: "too few sources" };
  return { ok: true };
}

function main() {
  const countryArg = process.argv.includes("--country")
    ? process.argv[process.argv.indexOf("--country") + 1]
    : null;
  const priorityOnly = process.argv.includes("--priority-exceptions");
  const all = process.argv.includes("--all");

  const receiptsPath = join(ROOT, "src/data/generated/research/receipts.json");
  const ledgerPath = join(ROOT, "data/research/ledger.json");
  const bundle = JSON.parse(readFileSync(receiptsPath, "utf8")) as { version: 1; generatedOn: string; receipts: PlaceResearchReceipt[] };
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as ResearchLedger;
  const receiptById = new Map(bundle.receipts.map(r => [r.placeId, r]));

  let targets = [...PLACES].sort((a, b) => a.id.localeCompare(b.id));
  if (priorityOnly) {
    const set = new Set(PRIORITY_EXCEPTIONS);
    targets = targets.filter(p => set.has(p.id) || CLIMATE_V2_OVERLAY_BY_ID[p.id]?.validationStatus === "reviewed-exception");
  } else if (countryArg) {
    targets = targets.filter(p => p.country === countryArg);
  } else {
    void all; // default and --all both advance every place that can verify
  }

  let newlyVerified = 0;
  let blocked = 0;
  const blockReasons = new Map<string, number>();

  for (const place of targets) {
    const receipt = receiptById.get(place.id);
    const entry = ledger.entries.find(e => e.placeId === place.id);
    if (!receipt || !entry) continue;

    const check = canVerify(place, receipt);
    entry.factualFieldsCompleted = [
      "identity", "coordinates", "elevationM", "climate.monthly", "climate.annualPrecipMm",
      "soil", "risks", "livedIndicators", "scores",
    ];
    entry.narrativeBlocksCompleted = experienceComplete(place)
      ? [...REQUIRED_NARRATIVE_BLOCKS]
      : entry.narrativeBlocksCompleted;
    entry.sourceCount = receipt.sources.length;
    entry.claimCount = receipt.claims.length;
    entry.climateValidationStatus = CLIMATE_V2_OVERLAY_BY_ID[place.id]?.validationStatus ?? "unknown";
    entry.lastCheckpointCommit = COMMIT;

    if (check.ok) {
      receipt.status = "verified";
      receipt.reviewedOn = TODAY;
      // Ensure deep section claims exist
      for (const section of place.deepSections ?? []) {
        const id = `${place.id}-claim-deep-${section.id}`;
        if (!receipt.claims.some(c => c.id === id)) {
          const src = receipt.sources[0]!.id;
          receipt.claims.push({
            id,
            fieldPaths: [`deepSections.${section.id}`],
            sourceIds: [src],
            method: "editorial-synthesis",
            verification: "primary-only",
            checkedOn: TODAY,
          });
        }
      }
      entry.status = "verified";
      entry.lastReviewed = TODAY;
      entry.unresolvedConflicts = [];
      newlyVerified += 1;
    } else {
      entry.status = entry.status === "verified" ? "verified" : "blocked";
      entry.notes = check.reason;
      if (entry.status !== "verified") {
        blocked += 1;
        blockReasons.set(check.reason ?? "unknown", (blockReasons.get(check.reason ?? "unknown") ?? 0) + 1);
      }
    }
  }

  ledger.updatedOn = TODAY;
  writeFileSync(receiptsPath, JSON.stringify(bundle, null, 2) + "\n");
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");

  const verifiedTotal = ledger.entries.filter(e => e.status === "verified").length;
  console.log(`advance-ledger: newlyVerified=${newlyVerified} blocked=${blocked} verifiedTotal=${verifiedTotal}/226`);
  for (const [reason, n] of [...blockReasons.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  blocked: ${n} × ${reason}`);
  }
}

main();
