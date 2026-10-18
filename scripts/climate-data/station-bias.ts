/**
 * Station check of the Daymet grid.
 *
 * For each place, finds nearby GHCN-Daily stations with temperature records
 * and compares each with the place's Daymet pixel over the days both report
 * (1991–2025), month by month: mean Tmax and Tmin differences (station minus
 * grid) and the precipitation ratio. Results go to
 * data/climate-v2/stations/station-bias-diagnostics.json, plus one summary
 * line per place on stdout.
 *
 *   npx tsx scripts/climate-data/station-bias.ts [--ids a,b] [--radius-km 30]
 *
 * Needs the Daymet cache (.cache/daymet, from climate:data:fetch) and network
 * access to NOAA NCEI (GHCN-Daily files are cached in .cache/ghcnd). This is a
 * review aid: corrections are applied only from the reviewed
 * station-bias.json, by generate.ts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDaymetCsv, type DaymetDailyRow } from "./lib/daymet-parse";
import { fetchWithRetry, mapPool } from "./lib/http";

const ROOT = new URL("../..", import.meta.url).pathname;
const DAYMET_CACHE = join(ROOT, ".cache/daymet");
const GHCN_CACHE = join(ROOT, ".cache/ghcnd");
const ANCHORS_PATH = join(ROOT, "data/climate-v2/anchors.json");
const OUT_PATH = join(ROOT, "data/climate-v2/stations/station-bias-diagnostics.json");
const GHCN_BASE = "https://www.ncei.noaa.gov/pub/data/ghcn/daily";
const GHCN_ACCESS = "https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access";
const FIRST_YEAR = 1991;
const LAST_YEAR = 2025;
const MAX_CANDIDATES = 4;
/** Months need this many paired days (≈ 8 years) to report a bias. */
const MIN_MONTH_DAYS = 240;

interface Anchor {
  id: string;
  name: string;
  climateAnchor: { lat: number; lon: number; elevationM: number };
}

interface Station {
  id: string;
  lat: number;
  lon: number;
  elevationM: number;
  name: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(`${name}=`));
  return eq?.split("=")[1];
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLon = r(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

async function cachedText(url: string, file: string): Promise<string | null> {
  const path = join(GHCN_CACHE, file);
  if (existsSync(path)) return readFileSync(path, "utf8");
  const res = await fetchWithRetry(url, { timeoutMs: 300_000 });
  if (!res.ok) return null;
  mkdirSync(GHCN_CACHE, { recursive: true });
  writeFileSync(path, res.body);
  return res.body;
}

function parseStations(text: string): Map<string, Station> {
  const out = new Map<string, Station>();
  for (const line of text.split("\n")) {
    if (line.length < 40) continue;
    const id = line.slice(0, 11).trim();
    out.set(id, {
      id,
      lat: Number(line.slice(12, 20)),
      lon: Number(line.slice(21, 30)),
      elevationM: Number(line.slice(31, 37)),
      name: line.slice(41, 71).trim(),
    });
  }
  return out;
}

/** station id → element → [first, last] year. */
function parseInventory(text: string): Map<string, Map<string, [number, number]>> {
  const out = new Map<string, Map<string, [number, number]>>();
  for (const line of text.split("\n")) {
    if (line.length < 45) continue;
    const id = line.slice(0, 11).trim();
    const element = line.slice(31, 35).trim();
    if (!["TMAX", "TMIN", "PRCP"].includes(element)) continue;
    const span: [number, number] = [Number(line.slice(36, 40)), Number(line.slice(41, 45))];
    if (!out.has(id)) out.set(id, new Map());
    out.get(id)!.set(element, span);
  }
  return out;
}

function loadDaymet(placeId: string): { rows: DaymetDailyRow[]; gridElevationM: number } | null {
  const rows: DaymetDailyRow[] = [];
  let gridElevationM = NaN;
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    const path = join(DAYMET_CACHE, placeId, `${y}.csv`);
    if (!existsSync(path)) return null;
    const parsed = parseDaymetCsv(readFileSync(path, "utf8"));
    gridElevationM = parsed.header.elevationM;
    rows.push(...parsed.rows.filter(r => r.year === y));
  }
  return { rows, gridElevationM };
}

/** Daymet yday → ISO date (Daymet keeps Feb 29 and drops Dec 31 in leap years). */
function daymetDate(year: number, yday: number): string {
  const d = new Date(Date.UTC(year, 0, 1) + (yday - 1) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

interface StationDay {
  tmax?: number;
  tmin?: number;
  prcp?: number;
}

/** GHCN-Daily access CSV → date → values in °C / mm (source units are tenths). */
function parseStationCsv(text: string): Map<string, StationDay> {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0] ?? "");
  const col = (name: string) => header.indexOf(name);
  const iDate = col("DATE");
  const fields = [
    ["tmax", col("TMAX"), col("TMAX_ATTRIBUTES")],
    ["tmin", col("TMIN"), col("TMIN_ATTRIBUTES")],
    ["prcp", col("PRCP"), col("PRCP_ATTRIBUTES")],
  ] as const;
  const out = new Map<string, StationDay>();
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = cells[iDate] ?? "";
    const year = Number(date.slice(0, 4));
    if (year < FIRST_YEAR || year > LAST_YEAR) continue;
    const day: StationDay = {};
    for (const [key, iv, ia] of fields) {
      if (iv < 0) continue;
      const raw = cells[iv]?.trim();
      if (!raw) continue;
      const qflag = (cells[ia] ?? "").split(",")[1]?.trim();
      if (qflag) continue; // failed a GHCN quality check
      day[key] = Number(raw) / 10;
    }
    out.set(date, day);
  }
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function compare(daymet: DaymetDailyRow[], station: Map<string, StationDay>) {
  const dMax = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
  const dMin = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
  const pr = Array.from({ length: 12 }, () => ({ s: 0, g: 0, n: 0 }));
  const years = new Map<number, number>();
  const prYears = new Map<number, { s: number; g: number; n: number }>();
  for (const row of daymet) {
    const date = daymetDate(row.year, row.yday);
    const st = station.get(date);
    if (!st) continue;
    const m = Number(date.slice(5, 7)) - 1;
    if (st.tmax != null && st.tmin != null && st.tmax >= st.tmin) {
      dMax[m]!.sum += st.tmax - row.tmax;
      dMax[m]!.n++;
      dMin[m]!.sum += st.tmin - row.tmin;
      dMin[m]!.n++;
      years.set(row.year, (years.get(row.year) ?? 0) + 1);
    }
    if (st.prcp != null) {
      pr[m]!.s += st.prcp;
      pr[m]!.g += row.prcp;
      pr[m]!.n++;
      const y = prYears.get(row.year) ?? { s: 0, g: 0, n: 0 };
      y.s += st.prcp;
      y.g += row.prcp;
      y.n++;
      prYears.set(row.year, y);
    }
  }
  const monthly = (a: { sum: number; n: number }[]) => a.map(x => (x.n >= MIN_MONTH_DAYS ? round1(x.sum / x.n) : null));
  const tmaxDeltaC = monthly(dMax);
  const tminDeltaC = monthly(dMin);
  const precipRatio = pr.map(x => (x.n >= MIN_MONTH_DAYS && x.g > 0 ? round2(x.s / x.g) : null));
  const sumS = pr.reduce((a, x) => a + (x.n >= MIN_MONTH_DAYS ? x.s / x.n : 0), 0);
  const sumG = pr.reduce((a, x) => a + (x.n >= MIN_MONTH_DAYS ? x.g / x.n : 0), 0);
  const usableYears = [...years.values()].filter(n => n >= 300).length;
  const finite = (a: (number | null)[]) => a.filter((v): v is number => v != null);
  const maxAbs = Math.max(0, ...finite(tmaxDeltaC).map(Math.abs), ...finite(tminDeltaC).map(Math.abs));
  return {
    usableYears,
    pairedDays: dMax.reduce((a, x) => a + x.n, 0),
    tmaxDeltaC,
    tminDeltaC,
    precipRatio,
    annualPrecipRatio: sumG > 0 ? round2(sumS / sumG) : null,
    /** Paired station and grid totals for each year with at least 330 paired precipitation days. */
    precipByYear: [...prYears]
      .filter(([, y]) => y.n >= 330)
      .sort(([a], [b]) => a - b)
      .map(([year, y]) => ({ year, stationMm: Math.round(y.s), gridMm: Math.round(y.g), days: y.n })),
    maxAbsTempDeltaC: round1(maxAbs),
  };
}

async function main() {
  const radiusKm = Number(arg("--radius-km") ?? 30);
  const only = new Set((arg("--ids") ?? "").split(",").filter(Boolean));
  const anchors = (JSON.parse(readFileSync(ANCHORS_PATH, "utf8")) as { anchors: Anchor[] }).anchors.filter(
    a => only.size === 0 || only.has(a.id),
  );

  const stationsText = await cachedText(`${GHCN_BASE}/ghcnd-stations.txt`, "ghcnd-stations.txt");
  const inventoryText = await cachedText(`${GHCN_BASE}/ghcnd-inventory.txt`, "ghcnd-inventory.txt");
  if (!stationsText || !inventoryText) throw new Error("Could not download the GHCN-Daily station list");
  const stations = parseStations(stationsText);
  const inventory = parseInventory(inventoryText);
  const tempStations = [...stations.values()].filter(s => {
    const inv = inventory.get(s.id);
    const tmax = inv?.get("TMAX");
    const tmin = inv?.get("TMIN");
    return tmax && tmin && tmax[1] >= FIRST_YEAR + 8 && tmax[0] <= LAST_YEAR - 8 && tmin[1] >= FIRST_YEAR + 8;
  });

  const results = await mapPool(anchors, 4, async anchor => {
    const { lat, lon, elevationM } = anchor.climateAnchor;
    const daymet = loadDaymet(anchor.id);
    const near = tempStations
      .map(s => ({ s, km: haversineKm(lat, lon, s.lat, s.lon), dz: s.elevationM - elevationM }))
      .filter(c => c.km <= radiusKm)
      .sort((a, b) => a.km + Math.abs(a.dz) / 10 - (b.km + Math.abs(b.dz) / 10))
      .slice(0, MAX_CANDIDATES);
    const candidates = [];
    for (const c of near) {
      const text = daymet ? await cachedText(`${GHCN_ACCESS}/${c.s.id}.csv`, `${c.s.id}.csv`) : null;
      const stats = text && daymet ? compare(daymet.rows, parseStationCsv(text)) : null;
      candidates.push({
        stationId: c.s.id,
        name: c.s.name,
        lat: c.s.lat,
        lon: c.s.lon,
        elevationM: c.s.elevationM,
        distanceKm: round1(c.km),
        elevationDeltaM: Math.round(c.dz),
        ...(stats ?? { error: daymet ? "station file unavailable" : "Daymet cache missing" }),
      });
    }
    const best = candidates.find(c => "usableYears" in c && (c.usableYears ?? 0) >= 8);
    const summary = best && "maxAbsTempDeltaC" in best
      ? `${best.stationId} ${best.name} ${best.distanceKm} km dz ${best.elevationDeltaM} m yrs ${best.usableYears} maxΔT ${best.maxAbsTempDeltaC} P×${best.annualPrecipRatio} Tmax ${JSON.stringify(best.tmaxDeltaC)} Tmin ${JSON.stringify(best.tminDeltaC)}`
      : "no usable station";
    console.log(`BIAS ${anchor.id} | grid ${daymet?.gridElevationM ?? "?"} m | ${summary}`);
    return { id: anchor.id, name: anchor.name, anchor: anchor.climateAnchor, gridElevationM: daymet?.gridElevationM ?? null, candidates };
  });

  mkdirSync(join(ROOT, "data/climate-v2/stations"), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ version: 1, generatedAt: new Date().toISOString().slice(0, 10), radiusKm, period: `${FIRST_YEAR}-${LAST_YEAR}`, places: results }, null, 1) + "\n",
  );
  console.log(`station-bias: ${results.length} places → ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
