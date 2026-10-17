/**
 * Station check of the Daymet humidity.
 *
 * Daymet estimates vapour pressure from the daily minimum temperature with an
 * aridity correction, which runs far too dry wherever moist air persists
 * through a rainless season: fog coasts (Eureka, Monterey, Ensenada), the
 * tropical coasts' dry season (Mérida, Mazatlán), the Mexican highlands' dry
 * winter, and the subarctic's early summer. Hourly dew points from Integrated
 * Surface Database (ISD) stations measure it directly.
 *
 * For each place, finds ISD stations within --radius-km (default 40) and
 * 300 m of the anchor's elevation, reads their hourly dew points (ISD-Lite,
 * 2011–2025), and compares the station's daily mean vapour pressure, moved to
 * the grid pixel's elevation with a 2.5 km vapour scale height, with the
 * place's Daymet pixel over the days both report, month by month: the
 * vapour-pressure ratio (station / grid), plus the resulting mean relative
 * humidity both ways. Up to three stations are compared so their agreement
 * can be reviewed. Results go to
 * data/climate-v2/stations/humidity-bias-diagnostics.json, plus one summary
 * line per place on stdout.
 *
 *   npx tsx scripts/climate-data/station-humidity.ts [--ids a,b] [--radius-km 40]
 *
 * Needs the Daymet cache (.cache/daymet, from climate:data:fetch) and network
 * access to NOAA NCEI (ISD files are cached in .cache/isd). This is a review
 * aid: ratios are applied only from the reviewed humidity-bias.json, by
 * generate.ts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { parseDaymetCsv, type DaymetDailyRow } from "./lib/daymet-parse";
import { mapPool, sleep } from "./lib/http";
import { saturationVaporPressurePa } from "./lib/rh-solar";

const ROOT = new URL("../..", import.meta.url).pathname;
const DAYMET_CACHE = join(ROOT, ".cache/daymet");
const ISD_CACHE = join(ROOT, ".cache/isd");
const ANCHORS_PATH = join(ROOT, "data/climate-v2/anchors.json");
const OUT_PATH = join(ROOT, "data/climate-v2/stations/humidity-bias-diagnostics.json");
const ISD_HISTORY = "https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv";
const ISD_LITE = "https://www.ncei.noaa.gov/pub/data/noaa/isd-lite";
const FIRST_YEAR = 2011;
const LAST_YEAR = 2025;
const MAX_CANDIDATES = 3;
const MAX_ELEVATION_DELTA_M = 300;
/** Vapour pressure falls off with height roughly as exp(−z / 2.5 km). */
const VAPOUR_SCALE_HEIGHT_M = 2500;
/** A station day needs this many dew points (synoptic stations report 3-hourly). */
const MIN_DAY_OBS = 4;
/** Months need this many paired days (≈ 5 years) to report a ratio. */
const MIN_MONTH_DAYS = 150;
/** A year counts as usable with this many paired days. */
const MIN_YEAR_DAYS = 150;

interface Anchor {
  id: string;
  name: string;
  climateAnchor: { lat: number; lon: number; elevationM: number };
}

interface IsdStation {
  id: string; // USAF-WBAN
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
  begin: number; // YYYYMMDD
  end: number;
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

/** Cached download; null when the file does not exist (404) or keeps failing. */
async function cachedBytes(url: string, file: string): Promise<Buffer | null> {
  const path = join(ISD_CACHE, file);
  if (existsSync(path)) {
    const bytes = readFileSync(path);
    return bytes.length > 0 ? bytes : null; // empty marker = known missing
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "terraclima-climate-data-v2/1.0" }, signal: AbortSignal.timeout(120_000) });
      if (res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        mkdirSync(join(path, ".."), { recursive: true });
        writeFileSync(path, bytes);
        return bytes;
      }
      if (res.status === 404) {
        mkdirSync(join(path, ".."), { recursive: true });
        writeFileSync(path, "");
        return null;
      }
    } catch {
      /* retry */
    }
    await sleep(750 * 2 ** attempt);
  }
  return null;
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

function parseHistory(text: string): IsdStation[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0] ?? "");
  const col = (name: string) => header.indexOf(name);
  const [iUsaf, iWban, iName, iLat, iLon, iElev, iBegin, iEnd] = ["USAF", "WBAN", "STATION NAME", "LAT", "LON", "ELEV(M)", "BEGIN", "END"].map(col);
  const out: IsdStation[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    const lat = Number(c[iLat!]);
    const lon = Number(c[iLon!]);
    const elevationM = Number(c[iElev!]);
    if (!c[iLat!] || !c[iLon!] || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(elevationM)) continue;
    if (c[iUsaf!] === "999999" && c[iWban!] === "99999") continue;
    out.push({
      id: `${c[iUsaf!]}-${c[iWban!]}`,
      name: (c[iName!] ?? "").trim(),
      lat,
      lon,
      elevationM,
      begin: Number(c[iBegin!]),
      end: Number(c[iEnd!]),
    });
  }
  return out;
}

/** ISD-Lite (hourly, UTC) → ISO date → daily mean vapour pressure (Pa) and mean hourly RH (%). */
function parseIsdLite(text: string, into: Map<string, { e: number; rh: number; n: number }>): void {
  for (const line of text.split("\n")) {
    const f = line.trim().split(/\s+/);
    if (f.length < 6) continue;
    const t = Number(f[4]);
    const td = Number(f[5]);
    if (t === -9999 || td === -9999 || !Number.isFinite(t) || !Number.isFinite(td)) continue;
    const tc = t / 10;
    const tdc = td / 10;
    if (tdc > tc + 0.5 || tdc < -60) continue;
    const date = `${f[0]}-${f[1]!.padStart(2, "0")}-${f[2]!.padStart(2, "0")}`;
    const e = saturationVaporPressurePa(tdc);
    const day = into.get(date) ?? { e: 0, rh: 0, n: 0 };
    day.e += e;
    day.rh += Math.min(100, (e / saturationVaporPressurePa(tc)) * 100);
    day.n += 1;
    into.set(date, day);
  }
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

const round0 = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

function compare(daymet: DaymetDailyRow[], station: Map<string, { e: number; rh: number; n: number }>, vpScale: number) {
  const acc = Array.from({ length: 12 }, () => ({ st: 0, grid: 0, rhGrid: 0, rhStationVp: 0, rhHourly: 0, n: 0 }));
  const years = new Map<number, number>();
  for (const row of daymet) {
    const date = daymetDate(row.year, row.yday);
    const st = station.get(date);
    if (!st || st.n < MIN_DAY_OBS) continue;
    const m = Number(date.slice(5, 7)) - 1;
    const e = (st.e / st.n) * vpScale;
    const es = saturationVaporPressurePa((row.tmax + row.tmin) / 2);
    const a = acc[m]!;
    a.st += e;
    a.grid += row.vp;
    a.rhGrid += Math.min(100, (row.vp / es) * 100);
    a.rhStationVp += Math.min(100, (e / es) * 100);
    a.rhHourly += st.rh / st.n;
    a.n += 1;
    years.set(row.year, (years.get(row.year) ?? 0) + 1);
  }
  const ok = (a: (typeof acc)[number]) => a.n >= MIN_MONTH_DAYS && a.grid > 0;
  return {
    usableYears: [...years.values()].filter(n => n >= MIN_YEAR_DAYS).length,
    pairedDays: acc.reduce((s, a) => s + a.n, 0),
    vpRatio: acc.map(a => (ok(a) ? round2(a.st / a.grid) : null)),
    gridRhPct: acc.map(a => (ok(a) ? round0(a.rhGrid / a.n) : null)),
    stationVpRhPct: acc.map(a => (ok(a) ? round0(a.rhStationVp / a.n) : null)),
    stationHourlyRhPct: acc.map(a => (ok(a) ? round0(a.rhHourly / a.n) : null)),
  };
}

async function main() {
  const radiusKm = Number(arg("--radius-km") ?? 40);
  const only = new Set((arg("--ids") ?? "").split(",").filter(Boolean));
  const anchors = (JSON.parse(readFileSync(ANCHORS_PATH, "utf8")) as { anchors: Anchor[] }).anchors.filter(
    a => only.size === 0 || only.has(a.id),
  );

  const history = await cachedBytes(ISD_HISTORY, "isd-history.csv");
  if (!history) throw new Error("Could not download the ISD station history");
  const stations = parseHistory(history.toString("utf8")).filter(
    s => s.begin <= (LAST_YEAR - 7) * 10_000 + 101 && s.end >= (FIRST_YEAR + 7) * 10_000 + 101,
  );

  const results = await mapPool(anchors, 6, async anchor => {
    const { lat, lon, elevationM } = anchor.climateAnchor;
    const daymet = loadDaymet(anchor.id);
    const near = stations
      .map(s => ({ s, km: haversineKm(lat, lon, s.lat, s.lon), dz: s.elevationM - elevationM }))
      .filter(c => c.km <= radiusKm && Math.abs(c.dz) <= MAX_ELEVATION_DELTA_M)
      .sort((a, b) => a.km + Math.abs(a.dz) / 10 - (b.km + Math.abs(b.dz) / 10));
    // ISD lists a station once per USAF-WBAN pair; keep the first of any co-located duplicates.
    const unique = near.filter((c, i) => near.findIndex(o => o.s.name === c.s.name && Math.abs(o.km - c.km) < 0.5) === i);
    const candidates = [];
    for (const c of unique.slice(0, MAX_CANDIDATES)) {
      if (!daymet) break;
      const days = new Map<string, { e: number; rh: number; n: number }>();
      for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
        const gz = await cachedBytes(`${ISD_LITE}/${y}/${c.s.id}-${y}.gz`, `${y}/${c.s.id}-${y}.gz`);
        if (!gz) continue;
        try {
          parseIsdLite(gunzipSync(gz).toString("utf8"), days);
        } catch {
          /* truncated file: skip the year */
        }
      }
      // Station vapour pressure moved to the grid pixel's elevation.
      const vpScale = Math.exp((c.s.elevationM - daymet.gridElevationM) / VAPOUR_SCALE_HEIGHT_M);
      const stats = compare(daymet.rows, days, vpScale);
      candidates.push({
        stationId: c.s.id,
        name: c.s.name,
        lat: c.s.lat,
        lon: c.s.lon,
        elevationM: c.s.elevationM,
        distanceKm: Math.round(c.km * 10) / 10,
        elevationDeltaM: Math.round(c.dz),
        ...stats,
      });
    }
    const best = candidates.find(c => c.usableYears >= 5);
    const summary = best
      ? `${best.stationId} ${best.name} ${best.distanceKm} km dz ${best.elevationDeltaM} m yrs ${best.usableYears} vp× ${JSON.stringify(best.vpRatio)} RH grid ${JSON.stringify(best.gridRhPct)} RH station ${JSON.stringify(best.stationVpRhPct)}`
      : `no usable station (${unique.length} in range)`;
    console.log(`HUM ${anchor.id} | grid ${daymet?.gridElevationM ?? "?"} m | ${summary}`);
    return { id: anchor.id, name: anchor.name, anchor: anchor.climateAnchor, gridElevationM: daymet?.gridElevationM ?? null, candidates };
  });

  mkdirSync(join(ROOT, "data/climate-v2/stations"), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ version: 1, generatedAt: new Date().toISOString().slice(0, 10), radiusKm, period: `${FIRST_YEAR}-${LAST_YEAR}`, places: results }, null, 1) + "\n",
  );
  console.log(`station-humidity: ${results.length} places → ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
