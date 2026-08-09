/**
 * Offline verification of committed Climate V2 assets.
 *
 * Recomputes place record hashes from committed JSON (or regenerates from
 * cached Daymet fixtures when present) and validates the manifest. Never
 * contacts external services.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex, stableJsonHash, stableStringify } from "./lib/hash";
import { parseDaymetCsv } from "./lib/daymet-parse";
import { aggregateDaymetPeriod, recentShiftReceipt } from "./lib/aggregate";

const ROOT = new URL("../..", import.meta.url).pathname;
const MANIFEST_PATH = join(ROOT, "data/climate-v2/manifest.json");
const OUT_DIR = join(ROOT, "src/data/generated/climate-v2");
const CACHE_ROOT = join(ROOT, ".cache/daymet");

interface Manifest {
  version: number;
  dataThroughYear: number;
  placeCount: number;
  placeHashes: Record<string, string>;
  cacheHashes?: Record<string, Record<string, string>>;
  daymet: { pinnedSoftwareMajor: string };
  manifestHash: string;
  defaultPeriod: string;
  comparisonPeriod: string;
}

function stripManifestHash(manifest: Manifest): Omit<Manifest, "manifestHash"> {
  const { manifestHash: _h, ...rest } = manifest;
  return rest;
}

function assertFiniteRecord(placeId: string, raw: string): void {
  if (/NaN|Infinity|-Infinity/.test(raw)) {
    throw new Error(`${placeId}: contains NaN/Infinity`);
  }
}

function verifyCommittedRecords(manifest: Manifest): string[] {
  const errors: string[] = [];
  const ids = Object.keys(manifest.placeHashes).sort();
  if (ids.length !== manifest.placeCount) {
    errors.push(`placeCount ${manifest.placeCount} != hash keys ${ids.length}`);
  }

  const bundlePath = join(OUT_DIR, "records.json");
  const overlayPath = join(OUT_DIR, "overlay.json");
  if (!existsSync(bundlePath)) {
    errors.push("missing src/data/generated/climate-v2/records.json");
    return errors;
  }
  if (!existsSync(overlayPath)) {
    errors.push("missing src/data/generated/climate-v2/overlay.json");
    return errors;
  }
  const bundleRaw = readFileSync(bundlePath, "utf8");
  assertFiniteRecord("records.json", bundleRaw);
  assertFiniteRecord("overlay.json", readFileSync(overlayPath, "utf8"));
  const bundle = JSON.parse(bundleRaw) as Array<Record<string, unknown>>;
  const byId = new Map(bundle.map(r => [String(r.placeId), r]));
  const overlayCount = (JSON.parse(readFileSync(overlayPath, "utf8")) as unknown[]).length;
  if (overlayCount !== manifest.placeCount) {
    errors.push(`overlay count ${overlayCount} != placeCount ${manifest.placeCount}`);
  }

  for (const id of ids) {
    const record = byId.get(id);
    if (!record) {
      errors.push(`missing generated record ${id}`);
      continue;
    }
    const hash = sha256Hex(stableStringify(record));
    if (hash !== manifest.placeHashes[id]) {
      errors.push(`hash drift for ${id}: manifest=${manifest.placeHashes[id]} actual=${hash}`);
    }

    const periods = record.periods as Record<string, {
      isWmoStandardNormal: boolean;
      precipMm: number[];
      annualPrecipMm: number;
      solarEnergyMjM2Day?: number[];
      humidity?: number[];
    }>;
    const recent = periods?.["rolling-1996-2025"];
    const wmo = periods?.["wmo-1991-2020"];
    if (!recent || !wmo) {
      errors.push(`${id}: missing period normals`);
      continue;
    }
    if (recent.isWmoStandardNormal !== false) {
      errors.push(`${id}: rolling period incorrectly marked as WMO standard normal`);
    }
    if (wmo.isWmoStandardNormal !== true) {
      errors.push(`${id}: wmo period must be marked isWmoStandardNormal`);
    }
    const precipSum = recent.precipMm.reduce((a: number, b: number) => a + b, 0);
    if (Math.abs(precipSum - recent.annualPrecipMm) > 0.2) {
      errors.push(`${id}: annualPrecipMm != sum(monthly) for rolling period`);
    }
    if (recent.solarEnergyMjM2Day == null) {
      errors.push(`${id}: missing solarEnergyMjM2Day`);
    }
    if (recent.humidity == null) {
      errors.push(`${id}: missing humidity`);
    }
  }
  return errors;
}

function verifyCacheHashesIfPresent(manifest: Manifest): string[] {
  const errors: string[] = [];
  const localHashPath = join(CACHE_ROOT, "cache-hashes.json");
  if (!existsSync(CACHE_ROOT) || !existsSync(localHashPath)) {
    // Offline CI without cache: skip raw cache verification
    return errors;
  }
  const local = JSON.parse(readFileSync(localHashPath, "utf8")) as {
    cacheHashes: Record<string, Record<string, string>>;
  };
  for (const [placeId, years] of Object.entries(local.cacheHashes)) {
    for (const [year, expected] of Object.entries(years)) {
      const path = join(CACHE_ROOT, placeId, `${year}.csv`);
      if (!existsSync(path)) {
        errors.push(`cache missing ${placeId}/${year}.csv while local hash map pins it`);
        continue;
      }
      const actual = sha256Hex(readFileSync(path));
      if (actual !== expected) {
        errors.push(
          `upstream/cache hash drift ${placeId} ${year}: pinned=${expected} actual=${actual}. ` +
            `Bump manifest explicitly after reviewing Daymet revision.`,
        );
      }
      try {
        const parsed = parseDaymetCsv(readFileSync(path, "utf8"));
        if (!parsed.header.softwareVersion.startsWith("4")) {
          errors.push(`${placeId} ${year}: unexpected Daymet software ${parsed.header.softwareVersion}`);
        }
      } catch (err) {
        errors.push(`${placeId} ${year}: parse failed ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  // Ensure committed placeSourceHashes still match recomputed cache concatenation when present
  const placeSourceHashes = (manifest as { placeSourceHashes?: Record<string, string> }).placeSourceHashes;
  if (placeSourceHashes) {
    for (const [placeId, expected] of Object.entries(placeSourceHashes)) {
      const years = local.cacheHashes[placeId];
      if (!years) continue;
      const actual = sha256Hex(Object.values(years).sort().join(""));
      if (actual !== expected) {
        errors.push(`placeSourceHash drift for ${placeId}`);
      }
    }
  }
  return errors;
}

function verifyFixtureRecompute(): string[] {
  /** When fixture CSVs exist under scripts/climate-data/fixtures, recompute one place. */
  const fixtureDir = join(ROOT, "scripts/climate-data/fixtures/daymet");
  const errors: string[] = [];
  if (!existsSync(fixtureDir)) return errors;
  const places = readdirSync(fixtureDir, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const dir of places) {
    const placeId = dir.name;
    const rows = [];
    for (const file of readdirSync(join(fixtureDir, placeId)).filter(f => f.endsWith(".csv"))) {
      const parsed = parseDaymetCsv(readFileSync(join(fixtureDir, placeId, file), "utf8"));
      rows.push(...parsed.rows);
    }
    try {
      const rolling = aggregateDaymetPeriod(rows, {
        period: "rolling-1996-2025",
        startYear: 1996,
        endYear: 2025,
      });
      const wmo = aggregateDaymetPeriod(rows, {
        period: "wmo-1991-2020",
        startYear: 1991,
        endYear: 2020,
      });
      recentShiftReceipt(rolling.normals, wmo.normals);
      const committed = join(OUT_DIR, `${placeId}.json`);
      if (existsSync(committed)) {
        const rec = JSON.parse(readFileSync(committed, "utf8"));
        for (let m = 0; m < 12; m++) {
          if (Math.abs(rec.periods["rolling-1996-2025"].tempHighC[m] - rolling.normals.tempHighC[m]) > 0.15) {
            errors.push(`${placeId}: fixture recompute tempHighC[${m}] drift`);
          }
        }
      }
    } catch (err) {
      errors.push(`${placeId}: fixture recompute failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  return errors;
}

function main(): void {
  if (!existsSync(MANIFEST_PATH)) {
    console.error("Missing data/climate-v2/manifest.json");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const expectedHash = stableJsonHash(stripManifestHash(manifest));
  const errors: string[] = [];

  if (manifest.manifestHash !== expectedHash) {
    errors.push(`manifestHash mismatch: stored=${manifest.manifestHash} recomputed=${expectedHash}`);
  }
  if (manifest.defaultPeriod !== "rolling-1996-2025") {
    errors.push(`defaultPeriod must be rolling-1996-2025`);
  }
  if (manifest.comparisonPeriod !== "wmo-1991-2020") {
    errors.push(`comparisonPeriod must be wmo-1991-2020`);
  }

  errors.push(...verifyCommittedRecords(manifest));
  errors.push(...verifyCacheHashesIfPresent(manifest));
  errors.push(...verifyFixtureRecompute());

  if (errors.length) {
    console.error("climate:data:verify FAILED");
    for (const e of errors.slice(0, 80)) console.error(`  - ${e}`);
    if (errors.length > 80) console.error(`  … ${errors.length - 80} more`);
    process.exit(1);
  }
  console.log(`climate:data:verify OK — ${manifest.placeCount} places, manifest ${manifest.manifestHash.slice(0, 12)}…`);
}

main();
