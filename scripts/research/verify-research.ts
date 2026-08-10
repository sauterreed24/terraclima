/**
 * corpus:research:verify — validate 226 receipts, claim coverage, source integrity.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES } from "../../src/data/places";
import { CLIMATE_V2_OVERLAY_BY_ID } from "../../src/data/generated/climate-v2";
import type { PlaceResearchReceipt, ResearchLedger } from "../../src/lib/research/contracts";
import {
  REQUIRED_FACTUAL_FIELD_GROUPS,
  REQUIRED_NARRATIVE_BLOCKS,
} from "../../src/lib/research/contracts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const STRICT = process.argv.includes("--strict");

interface Issue {
  severity: "error" | "warn";
  placeId?: string;
  message: string;
}

function loadReceipts(): PlaceResearchReceipt[] {
  const path = join(ROOT, "src/data/generated/research/receipts.json");
  if (!existsSync(path)) throw new Error(`Missing receipts at ${path}`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as { receipts: PlaceResearchReceipt[] };
  return raw.receipts;
}

function loadLedger(): ResearchLedger | null {
  const path = join(ROOT, "data/research/ledger.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ResearchLedger;
}

function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    let href = u.href;
    if (href.endsWith("/") && u.pathname !== "/") href = href.slice(0, -1);
    return href.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function main() {
  const issues: Issue[] = [];
  const receipts = loadReceipts();
  const byId = new Map(receipts.map(r => [r.placeId, r]));
  const ledger = loadLedger();

  if (PLACES.length !== 226) {
    issues.push({ severity: "error", message: `Expected 226 places, found ${PLACES.length}` });
  }
  if (receipts.length !== 226) {
    issues.push({ severity: "error", message: `Expected 226 receipts, found ${receipts.length}` });
  }

  for (const place of PLACES) {
    const receipt = byId.get(place.id);
    if (!receipt) {
      issues.push({ severity: "error", placeId: place.id, message: "Missing research receipt" });
      continue;
    }

    if (STRICT && receipt.status !== "verified") {
      issues.push({ severity: "error", placeId: place.id, message: `Receipt status is ${receipt.status}, expected verified` });
    }

    const materialUnresolved = receipt.unresolved.filter(
      u => !u.fieldPaths.every(fp => fp === "projection" || fp.startsWith("projection.")),
    );
    if (STRICT && materialUnresolved.length > 0) {
      issues.push({
        severity: "error",
        placeId: place.id,
        message: `Unresolved material claims: ${materialUnresolved.map(u => u.issue).join("; ")}`,
      });
    }

    if (!place.experience?.feel || !place.experience.seasons?.winter || !place.experience.travelerFit || !place.experience.residentFit || !place.experience.texture) {
      issues.push({
        severity: STRICT ? "error" : "warn",
        placeId: place.id,
        message: "Incomplete authored experience (feel/seasons/fits/texture)",
      });
    }

    const sourceIds = new Set(receipt.sources.map(s => s.id));
    const urls = new Set<string>();
    for (const source of receipt.sources) {
      if (!source.url?.startsWith("https://") && !source.url?.startsWith("http://")) {
        issues.push({ severity: "error", placeId: place.id, message: `Source ${source.id} missing HTTP(S) URL` });
      }
      if (!source.publisher?.trim() || !source.title?.trim()) {
        issues.push({ severity: "error", placeId: place.id, message: `Source ${source.id} missing title/publisher` });
      }
      if (!source.accessedOn || !source.geography || !source.sourceType) {
        issues.push({ severity: "error", placeId: place.id, message: `Source ${source.id} missing required metadata` });
      }
      const key = canonicalizeUrl(source.url);
      if (urls.has(key) && !source.id.includes("daymet")) {
        issues.push({ severity: "warn", placeId: place.id, message: `Duplicate source URL ${source.url}` });
      }
      urls.add(key);
    }

    const claimed = new Set(receipt.claims.flatMap(c => c.fieldPaths));
    for (const block of REQUIRED_NARRATIVE_BLOCKS) {
      if (!claimed.has(block)) {
        issues.push({
          severity: STRICT ? "error" : "warn",
          placeId: place.id,
          message: `Missing claim coverage for narrative block ${block}`,
        });
      }
    }

    for (const group of REQUIRED_FACTUAL_FIELD_GROUPS) {
      const covered = [...claimed].some(fp =>
        fp === group ||
        fp.startsWith(group + ".") ||
        (group === "identity" && ["name", "lat", "lon", "region", "country"].includes(fp)) ||
        (group === "coordinates" && (fp === "lat" || fp === "lon")) ||
        (group === "livedIndicators" && fp.startsWith("liveSignals")) ||
        (group === "climate.monthly" && fp.startsWith("climate.")),
      );
      if (!covered) {
        issues.push({
          severity: STRICT ? "error" : "warn",
          placeId: place.id,
          message: `Missing claim coverage for factual group ${group}`,
        });
      }
    }

    for (const claim of receipt.claims) {
      if (claim.sourceIds.length === 0) {
        issues.push({ severity: "error", placeId: place.id, message: `Claim ${claim.id} has no sources` });
      }
      for (const sid of claim.sourceIds) {
        if (!sourceIds.has(sid)) {
          issues.push({ severity: "error", placeId: place.id, message: `Claim ${claim.id} references missing source ${sid}` });
        }
      }
      if (claim.verification === "unresolved") {
        issues.push({
          severity: STRICT ? "error" : "warn",
          placeId: place.id,
          message: `Claim ${claim.id} still unresolved`,
        });
      }
    }

    const overlay = CLIMATE_V2_OVERLAY_BY_ID[place.id];
    if (!overlay) {
      issues.push({ severity: "error", placeId: place.id, message: "Missing Climate V2 overlay" });
    }

    // Headline climate claims should not be marked triangulated without station validation.
    const climateClaim = receipt.claims.find(c => c.fieldPaths.includes("climate.tempHighC"));
    if (climateClaim?.verification === "triangulated" && overlay?.validationStatus !== "validated") {
      issues.push({
        severity: "error",
        placeId: place.id,
        message: "Climate claim marked triangulated without station-validated Climate V2 status",
      });
    }
  }

  if (ledger) {
    if (ledger.entries.length !== 226) {
      issues.push({ severity: "error", message: `Ledger has ${ledger.entries.length} entries, expected 226` });
    }
    if (STRICT) {
      const unverified = ledger.entries.filter(e => e.status !== "verified");
      if (unverified.length) {
        issues.push({
          severity: "error",
          message: `Ledger has ${unverified.length} non-verified entries`,
        });
      }
    }
  } else {
    issues.push({ severity: STRICT ? "error" : "warn", message: "Missing data/research/ledger.json" });
  }

  const errors = issues.filter(i => i.severity === "error");
  const warns = issues.filter(i => i.severity === "warn");
  console.log(`corpus:research:verify — receipts=${receipts.length} places=${PLACES.length} mode=${STRICT ? "strict" : "bootstrap"}`);
  console.log(`errors=${errors.length} warnings=${warns.length}`);
  for (const issue of issues.slice(0, 80)) {
    console.log(`[${issue.severity}] ${issue.placeId ?? "corpus"}: ${issue.message}`);
  }
  if (issues.length > 80) console.log(`… ${issues.length - 80} more`);

  if (errors.length) process.exit(1);
}

main();
