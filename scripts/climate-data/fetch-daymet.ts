import { fileURLToPath } from "node:url";
/**
 * Fetch Daymet Single Pixel CSVs for every climate anchor.
 *
 * Usage:
 *   npx tsx scripts/climate-data/fetch-daymet.ts --through=2025 [--concurrency=6]
 *
 * Downloads multi-year chunks per place (resume-safe). Raw responses in
 * `.cache/daymet/` (gitignored).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { detectCorruptDaymetPayload, parseDaymetCsv } from "./lib/daymet-parse";
import { fetchWithRetry, mapPool } from "./lib/http";
import { sha256Hex } from "./lib/hash";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CACHE_ROOT = join(ROOT, ".cache/daymet");
const ANCHORS_PATH = join(ROOT, "data/climate-v2/anchors.json");
const VARS = "tmax,tmin,prcp,vp,srad,dayl,swe";
const CHUNK_YEARS = 5;

interface AnchorFile {
  anchors: Array<{
    id: string;
    lat: number;
    lon: number;
    elevationM: number;
    climateAnchor: { lat: number; lon: number; elevationM: number; note: string };
  }>;
}

function parseArgs(argv: string[]): { through: number; concurrency: number; startYear: number } {
  let through = 2025;
  let concurrency = 6;
  let startYear = 1991;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--through" || a.startsWith("--through=")) {
      through = Number(a.includes("=") ? a.split("=")[1] : argv[++i]);
    } else if (a === "--concurrency" || a.startsWith("--concurrency=")) {
      concurrency = Number(a.includes("=") ? a.split("=")[1] : argv[++i]);
    } else if (a === "--start-year" || a.startsWith("--start-year=")) {
      startYear = Number(a.includes("=") ? a.split("=")[1] : argv[++i]);
    }
  }
  if (!Number.isFinite(through) || through < startYear) {
    throw new Error(`Invalid --through=${through}`);
  }
  return { through, concurrency, startYear };
}

function cacheDir(placeId: string): string {
  return join(CACHE_ROOT, placeId);
}

function yearPath(placeId: string, year: number): string {
  return join(cacheDir(placeId), `${year}.csv`);
}

function metaPath(placeId: string): string {
  return join(cacheDir(placeId), "meta.json");
}

function yearComplete(placeId: string, year: number): boolean {
  const out = yearPath(placeId, year);
  if (!existsSync(out)) return false;
  try {
    const raw = readFileSync(out, "utf8");
    if (detectCorruptDaymetPayload(raw)) return false;
    const parsed = parseDaymetCsv(raw);
    return parsed.rows.filter(r => r.year === year).length === 365;
  } catch {
    return false;
  }
}

function chunkRanges(startYear: number, through: number): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (let y = startYear; y <= through; y += CHUNK_YEARS) {
    ranges.push([y, Math.min(through, y + CHUNK_YEARS - 1)]);
  }
  return ranges;
}

function daymetUrl(lat: number, lon: number, startYear: number, endYear: number): string {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    vars: VARS,
    years: years.join(","),
  });
  return `https://daymet.ornl.gov/single-pixel/api/data?${params.toString()}`;
}

/** Split a multi-year Daymet CSV into per-year cache files sharing the header. */
function splitAndCache(
  placeId: string,
  raw: string,
  startYear: number,
  endYear: number,
  url: string,
): { fetchedYears: number[]; hashByYear: Record<string, string> } {
  const parsed = parseDaymetCsv(raw);
  const allLines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerEnd = allLines.findIndex(l => /^year,/i.test(l.trim()));
  if (headerEnd < 0) throw new Error("missing column header");
  const preamble = allLines.slice(0, headerEnd + 1).join("\n");
  const dataLines = allLines.slice(headerEnd + 1).filter(l => l.trim());

  mkdirSync(cacheDir(placeId), { recursive: true });
  const fetchedYears: number[] = [];
  const hashByYear: Record<string, string> = {};
  const metaFile = metaPath(placeId);
  const existing = existsSync(metaFile)
    ? JSON.parse(readFileSync(metaFile, "utf8"))
    : { placeId, years: {} };

  for (let y = startYear; y <= endYear; y++) {
    const yearRows = parsed.rows.filter(r => r.year === y);
    if (yearRows.length !== 365) {
      throw new Error(`${placeId} ${y}: expected 365 rows, got ${yearRows.length}`);
    }
    const body = dataLines.filter(l => l.startsWith(`${y},`)).join("\n");
    if (body.split("\n").length !== 365) {
      throw new Error(`${placeId} ${y}: line filter expected 365, got ${body.split("\n").length}`);
    }
    const yearCsv = `${preamble}\n${body}\n`;
    writeFileSync(yearPath(placeId, y), yearCsv);
    const hash = sha256Hex(yearCsv);
    hashByYear[String(y)] = hash;
    fetchedYears.push(y);
    existing.years[String(y)] = {
      placeId,
      year: y,
      fetchedAt: new Date().toISOString(),
      hash,
      softwareVersion: parsed.header.softwareVersion,
      gridElevationM: parsed.header.elevationM,
      tile: parsed.header.tile,
      url,
    };
  }

  existing.gridElevationM = parsed.header.elevationM;
  existing.softwareVersion = parsed.header.softwareVersion;
  existing.tile = parsed.header.tile;
  existing.lat = parsed.header.lat;
  existing.lon = parsed.header.lon;
  writeFileSync(metaFile, JSON.stringify(existing, null, 2));
  return { fetchedYears, hashByYear };
}

async function fetchPlace(
  placeId: string,
  lat: number,
  lon: number,
  startYear: number,
  through: number,
): Promise<{ cachedYears: number; fetchedYears: number; failed: string[] }> {
  let cachedYears = 0;
  let fetchedYears = 0;
  const failed: string[] = [];

  for (const [chunkStart, chunkEnd] of chunkRanges(startYear, through)) {
    const missing: number[] = [];
    for (let y = chunkStart; y <= chunkEnd; y++) {
      if (yearComplete(placeId, y)) cachedYears += 1;
      else missing.push(y);
    }
    if (missing.length === 0) continue;

    const fetchStart = missing[0]!;
    const fetchEnd = missing[missing.length - 1]!;
    const url = daymetUrl(lat, lon, fetchStart, fetchEnd);
    const res = await fetchWithRetry(url, { retries: 5, baseDelayMs: 1000, timeoutMs: 180_000 });
    if (!res.ok) {
      failed.push(`${placeId} ${fetchStart}-${fetchEnd}: HTTP ${res.status}`);
      continue;
    }
    const corrupt = detectCorruptDaymetPayload(res.body);
    if (corrupt) {
      failed.push(`${placeId} ${fetchStart}-${fetchEnd}: ${corrupt}`);
      continue;
    }
    try {
      const { fetchedYears: years } = splitAndCache(placeId, res.body, fetchStart, fetchEnd, url);
      fetchedYears += years.length;
    } catch (err) {
      failed.push(`${placeId} ${fetchStart}-${fetchEnd}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return { cachedYears, fetchedYears, failed };
}

async function main(): Promise<void> {
  const { through, concurrency, startYear } = parseArgs(process.argv.slice(2));
  const anchors = (JSON.parse(readFileSync(ANCHORS_PATH, "utf8")) as AnchorFile).anchors;
  mkdirSync(CACHE_ROOT, { recursive: true });

  console.log(
    `Daymet fetch: ${anchors.length} places, years ${startYear}–${through}, concurrency=${concurrency}, chunk=${CHUNK_YEARS}y`,
  );

  let cached = 0;
  let fetched = 0;
  const failures: string[] = [];
  let done = 0;

  await mapPool(anchors, concurrency, async (anchor) => {
    const result = await fetchPlace(
      anchor.id,
      anchor.climateAnchor.lat,
      anchor.climateAnchor.lon,
      startYear,
      through,
    );
    cached += result.cachedYears;
    fetched += result.fetchedYears;
    failures.push(...result.failed);
    done += 1;
    if (done % 10 === 0 || done === anchors.length) {
      console.log(`  places ${done}/${anchors.length} — year-files fetched=${fetched} cached=${cached} failed=${failures.length}`);
    }
  });

  const summary = {
    through,
    startYear,
    places: anchors.length,
    cachedYearFiles: cached,
    fetchedYearFiles: fetched,
    failed: failures.length,
    failures: failures.slice(0, 80),
    cacheRoot: CACHE_ROOT,
    completedAt: new Date().toISOString(),
  };
  writeFileSync(join(CACHE_ROOT, "fetch-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length > 0) {
    console.error(`Fetch completed with ${failures.length} failures`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
