/**
 * Build the compact North American hydrography layer drawn on the atlas map.
 *
 * Source: Natural Earth 1:50m `rivers_lake_centerlines` and `lakes`
 * (public domain, https://www.naturalearthdata.com/). The raw GeoJSON is
 * fetched from the natural-earth-vector repository, clipped to the atlas
 * focus box, simplified (Douglas–Peucker), quantized to 0.01°, and
 * delta-encoded (see `encodeLine`) so the lazy chunk stays small. Output:
 * `src/data/geo/na-hydrography.json`, decoded by `src/lib/atlas-map-hydrography.ts`.
 *
 *   npx tsx scripts/generate-hydrography.ts            # fetch from GitHub
 *   npx tsx scripts/generate-hydrography.ts <dir>      # read local copies
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "src/data/geo/na-hydrography.json");
const NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

/** Atlas focus box (lon/lat). Pins span Alaska/Nunavut to the Yucatán. */
const BOX = { minLon: -170, maxLon: -52, minLat: 14, maxLat: 74 };
/** River simplification tolerance in degrees (~2 km). */
const RIVER_TOLERANCE = 0.02;
const LAKE_TOLERANCE = 0.02;
/** Skip lakes whose bounding box is smaller than this (degrees²). */
const MIN_LAKE_BOX = 0.06;
/** Skip the smallest named rivers (Natural Earth scalerank 0–6 at 50m). */
const MAX_RIVER_RANK = 6;

type Pos = [number, number];
interface Feature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown } | null;
}

async function load(name: string, dir?: string): Promise<{ features: Feature[] }> {
  if (dir) return JSON.parse(readFileSync(join(dir, `${name}.geojson`), "utf8"));
  const res = await fetch(`${NE_BASE}/${name}.geojson`);
  if (!res.ok) throw new Error(`fetch ${name}: ${res.status}`);
  return (await res.json()) as { features: Feature[] };
}

function perpDist(p: Pos, a: Pos, b: Pos): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplify(points: Pos[], tol: number): Pos[] {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(points[i]!, points[s]!, points[e]!);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const q = (n: number) => Math.round(n * 100) / 100;

function quantize(points: Pos[]): Pos[] {
  const out: Pos[] = [];
  for (const [lon, lat] of points) {
    const p: Pos = [q(lon), q(lat)];
    const prev = out.at(-1);
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
  }
  return out;
}

/**
 * Flat integer encoding: `[lon0, lat0, dLon1, dLat1, …]` in hundredths of a
 * degree. Deltas between neighbouring vertices are one or two digits, which
 * keeps the JSON a fraction of the size of nested float pairs.
 */
function encodeLine(points: Pos[]): number[] {
  const out: number[] = [];
  let pLon = 0;
  let pLat = 0;
  points.forEach(([lon, lat], i) => {
    const iLon = Math.round(lon * 100);
    const iLat = Math.round(lat * 100);
    if (i === 0) out.push(iLon, iLat);
    else out.push(iLon - pLon, iLat - pLat);
    pLon = iLon;
    pLat = iLat;
  });
  return out;
}

function inBox(points: Pos[]): boolean {
  let lon = 0;
  let lat = 0;
  for (const p of points) { lon += p[0]; lat += p[1]; }
  lon /= points.length;
  lat /= points.length;
  return lon > BOX.minLon && lon < BOX.maxLon && lat > BOX.minLat && lat < BOX.maxLat;
}

function lines(geom: Feature["geometry"]): Pos[][] {
  if (!geom) return [];
  if (geom.type === "LineString") return [geom.coordinates as Pos[]];
  if (geom.type === "MultiLineString") return geom.coordinates as Pos[][];
  return [];
}

function polygons(geom: Feature["geometry"]): Pos[][][] {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates as Pos[][]];
  if (geom.type === "MultiPolygon") return geom.coordinates as Pos[][][];
  return [];
}

function boxArea(ring: Pos[]): number {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  return (maxLon - minLon) * (maxLat - minLat);
}

async function main() {
  const dir = process.argv[2];
  const [riversRaw, lakesRaw] = await Promise.all([
    load("ne_50m_rivers_lake_centerlines", dir),
    load("ne_50m_lakes", dir),
  ]);

  const rivers: Array<{ n: string; r: number; l: Pos[][] }> = [];
  let riverPts = 0;
  let lakePts = 0;
  for (const f of riversRaw.features) {
    const rank = Number(f.properties.scalerank ?? 9);
    if (rank > MAX_RIVER_RANK) continue;
    const parts = lines(f.geometry)
      .filter(part => part.length >= 2 && inBox(part))
      .map(part => quantize(simplify(part, RIVER_TOLERANCE)))
      .filter(part => part.length >= 2);
    if (!parts.length) continue;
    const name = String(f.properties.name ?? f.properties.name_en ?? "").trim();
    rivers.push({ n: name, r: rank, l: parts });
  }
  rivers.sort((a, b) => a.r - b.r || a.n.localeCompare(b.n));

  const lakes: Array<{ n: string; r: number; p: Pos[][] }> = [];
  for (const f of lakesRaw.features) {
    const rank = Number(f.properties.scalerank ?? 9);
    for (const poly of polygons(f.geometry)) {
      const outer = poly[0];
      if (!outer || outer.length < 4 || !inBox(outer)) continue;
      if (boxArea(outer) < MIN_LAKE_BOX) continue;
      const rings = poly
        .map(ring => quantize(simplify(ring, LAKE_TOLERANCE)))
        .filter(ring => ring.length >= 4);
      if (!rings.length) continue;
      const name = String(f.properties.name ?? f.properties.name_en ?? "").trim();
      lakes.push({ n: name, r: rank, p: rings });
    }
  }
  lakes.sort((a, b) => boxArea(b.p[0]!) - boxArea(a.p[0]!));

  const payload = {
    source: "Natural Earth 1:50m rivers_lake_centerlines + lakes (public domain)",
    encoding: "delta-hundredths",
    rivers: rivers.map(r => {
      riverPts += r.l.reduce((t, l) => t + l.length, 0);
      return { n: r.n, r: r.r, l: r.l.map(encodeLine) };
    }),
    lakes: lakes.map(l => {
      lakePts += l.p.reduce((t, ring) => t + ring.length, 0);
      return { n: l.n, r: l.r, p: l.p.map(encodeLine) };
    }),
  };
  const json = JSON.stringify(payload);
  writeFileSync(OUT, `${json}\n`);
  console.log(`hydrography: ${rivers.length} rivers (${riverPts} pts), ${lakes.length} lakes (${lakePts} pts), ${json.length} bytes → ${OUT}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
