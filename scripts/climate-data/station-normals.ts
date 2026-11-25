/**
 * Station normals near a place, straight from GHCN-Daily.
 *
 * For each place, lists the nearest stations that report temperature,
 * precipitation or snowfall and prints their 1991–2025 monthly means: daily
 * maximum and minimum (°C), precipitation (mm) and snowfall (cm). Unlike
 * station-bias.ts it needs no Daymet cache and includes snowfall, so it can
 * check authored figures (snowCm) and places whose grid has no nearby gauge
 * that meets the correction policy.
 *
 *   npx tsx scripts/climate-data/station-normals.ts --ids a,b [--radius-km 40]
 *
 * A review aid only: nothing is applied from its output.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchWithRetry } from "./lib/http";

const ROOT = new URL("../..", import.meta.url).pathname;
const GHCN_CACHE = join(ROOT, ".cache/ghcnd");
const ANCHORS_PATH = join(ROOT, "data/climate-v2/anchors.json");
const GHCN_BASE = "https://www.ncei.noaa.gov/pub/data/ghcn/daily";
const GHCN_ACCESS = "https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access";
const FIRST_YEAR = 1991;
const LAST_YEAR = 2025;
const MAX_STATIONS = 8;
/** A month needs this many reported days (about 8 years) to print a mean. */
const MIN_MONTH_DAYS = 240;
const ELEMENTS = ["TMAX", "TMIN", "PRCP", "SNOW"] as const;
const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface Anchor {
  id: string;
  climateAnchor: { lat: number; lon: number; elevationM: number };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  return process.argv.find(a => a.startsWith(`${name}=`))?.split("=")[1];
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLon - aLon) / 2) ** 2;
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

/** Monthly means per element; temperatures in °C, PRCP in mm/month, SNOW in cm/month. */
function normals(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0] ?? "");
  const iDate = header.indexOf("DATE");
  const acc = Object.fromEntries(ELEMENTS.map(e => [e, Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }))]));
  const years = Object.fromEntries(ELEMENTS.map(e => [e, new Map<number, number>()]));
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = cells[iDate] ?? "";
    const year = Number(date.slice(0, 4));
    if (year < FIRST_YEAR || year > LAST_YEAR) continue;
    const m = Number(date.slice(5, 7)) - 1;
    for (const e of ELEMENTS) {
      const iv = header.indexOf(e);
      if (iv < 0) continue;
      const raw = cells[iv]?.trim();
      if (!raw) continue;
      if ((cells[header.indexOf(`${e}_ATTRIBUTES`)] ?? "").split(",")[1]?.trim()) continue; // failed a quality check
      // TMAX/TMIN are tenths of °C, PRCP tenths of mm, SNOW whole mm (÷10 gives cm).
      const value = Number(raw) / 10; // SNOW mm → cm
      acc[e]![m]!.sum += value;
      acc[e]![m]!.n++;
      years[e]!.set(year, (years[e]!.get(year) ?? 0) + 1);
    }
  }
  const out: Record<string, { years: number; monthly: (number | null)[]; annual: number | null }> = {};
  for (const e of ELEMENTS) {
    const total = e === "PRCP" || e === "SNOW";
    const monthly = acc[e]!.map((x, m) =>
      x.n >= MIN_MONTH_DAYS ? Math.round((x.sum / x.n) * (total ? DAYS_IN_MONTH[m]! : 1) * 10) / 10 : null,
    );
    const complete = monthly.every(v => v != null);
    out[e] = {
      years: [...years[e]!.values()].filter(n => n >= 300).length,
      monthly,
      annual: complete
        ? Math.round((monthly as number[]).reduce((a, b) => a + b, 0) / (total ? 1 : 12) * 10) / 10
        : null,
    };
  }
  return out;
}

async function main() {
  const radiusKm = Number(arg("--radius-km") ?? 40);
  const only = new Set((arg("--ids") ?? "").split(",").filter(Boolean));
  if (only.size === 0) throw new Error("--ids is required");
  const anchors = (JSON.parse(readFileSync(ANCHORS_PATH, "utf8")) as { anchors: Anchor[] }).anchors.filter(a => only.has(a.id));
  const stationsText = await cachedText(`${GHCN_BASE}/ghcnd-stations.txt`, "ghcnd-stations.txt");
  const inventoryText = await cachedText(`${GHCN_BASE}/ghcnd-inventory.txt`, "ghcnd-inventory.txt");
  if (!stationsText || !inventoryText) throw new Error("Could not download the GHCN-Daily station list");
  const active = new Set<string>();
  for (const line of inventoryText.split("\n")) {
    if (line.length < 45) continue;
    if (!(ELEMENTS as readonly string[]).includes(line.slice(31, 35).trim())) continue;
    if (Number(line.slice(41, 45)) >= FIRST_YEAR + 8 && Number(line.slice(36, 40)) <= LAST_YEAR - 8) active.add(line.slice(0, 11).trim());
  }
  for (const anchor of anchors) {
    const { lat, lon, elevationM } = anchor.climateAnchor;
    const near = stationsText
      .split("\n")
      .filter(l => l.length >= 40 && active.has(l.slice(0, 11).trim()))
      .map(l => ({
        id: l.slice(0, 11).trim(),
        name: l.slice(41, 71).trim(),
        elevationM: Number(l.slice(31, 37)),
        km: haversineKm(lat, lon, Number(l.slice(12, 20)), Number(l.slice(21, 30))),
      }))
      .filter(s => s.km <= radiusKm)
      .sort((a, b) => a.km + Math.abs(a.elevationM - elevationM) / 10 - (b.km + Math.abs(b.elevationM - elevationM) / 10))
      .slice(0, MAX_STATIONS);
    console.log(`NORM ${anchor.id} | anchor ${elevationM} m | ${near.length} stations within ${radiusKm} km`);
    for (const s of near) {
      const text = await cachedText(`${GHCN_ACCESS}/${s.id}.csv`, `${s.id}.csv`);
      if (!text) {
        console.log(`NORM ${anchor.id} | ${s.id} ${s.name} | file unavailable`);
        continue;
      }
      const n = normals(text);
      const head = `NORM ${anchor.id} | ${s.id} ${s.name} | ${s.km.toFixed(1)} km | ${s.elevationM} m (dz ${Math.round(s.elevationM - elevationM)})`;
      for (const e of ELEMENTS) {
        if (n[e]!.years === 0 && n[e]!.monthly.every(v => v == null)) continue;
        console.log(`${head} | ${e} yrs ${n[e]!.years} annual ${n[e]!.annual} ${JSON.stringify(n[e]!.monthly)}`);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
