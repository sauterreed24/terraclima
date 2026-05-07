/**
 * One-shot codemod: add canonical `url` to every Citation that currently has
 * only `kind` + `label` for the well-known public-data sources. Idempotent —
 * running it twice does nothing on the second pass because it skips any
 * citation that already has a `url`.
 *
 * Run with: `tsx scripts/backfill-citation-urls.ts` (writes files in place).
 *
 * The mapping below intentionally points at the canonical *portal* for each
 * source rather than guessing at deep-linked station pages. This is the
 * modest claim audit-corpus.ts E1 requires: every citation must have a real
 * https URL the reader can follow to verify.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CANONICAL_URLS: Record<string, string> = {
  noaa: "https://www.ncei.noaa.gov/access/us-climate-normals/",
  prism: "https://prism.oregonstate.edu/",
  usda: "https://planthardiness.ars.usda.gov/",
  usgs: "https://www.usgs.gov/",
  fema: "https://www.fema.gov/flood-maps",
  epa: "https://www.epa.gov/",
  eccc: "https://climate.weather.gc.ca/",
  "climate-atlas-canada": "https://climateatlas.ca/",
  smn: "https://smn.conagua.gob.mx/es/",
  inegi: "https://www.inegi.org.mx/",
  inecc: "https://www.gob.mx/inecc",
  "atlas-riesgos": "http://www.atlasnacionalderiesgos.gob.mx/",
  worldclim: "https://www.worldclim.org/",
  soilgrids: "https://www.isric.org/explore/soilgrids",
  "nasa-nex": "https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp",
  cmip6: "https://wcrp-cmip.org/cmip6/",
  "sentinel-2": "https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2",
  landsat: "https://landsat.gsfc.nasa.gov/",
};

const FILES = [
  "src/data/places.usa.ts",
  "src/data/places.usa.extra.ts",
  "src/data/places.usa.round2.ts",
  "src/data/places.usa.gap-states.ts",
  "src/data/places.canada.ts",
  "src/data/places.mexico.ts",
];

let added = 0;
let skipped = 0;

const root = resolve(process.cwd());

for (const rel of FILES) {
  const path = resolve(root, rel);
  const before = readFileSync(path, "utf8");
  let after = before;

  // Match: { label: "<…>", kind: "<KIND>" } that does NOT already have `url:`
  // Tolerate trailing optional `, note: "…"` etc. Anchor on the closing brace.
  // We rewrite to add `, url: "<URL>"` immediately before the closing brace.
  for (const [kind, url] of Object.entries(CANONICAL_URLS)) {
    // Use a function-style replace so we can skip any object that already
    // contains `url:` between the `kind:` and the closing brace.
    const re = new RegExp(
      String.raw`(\{\s*label:\s*"[^"]*",\s*kind:\s*"${kind}"(?:\s*,\s*note:\s*"[^"]*")?)(\s*\})`,
      "g",
    );
    after = after.replace(re, (full, head: string, tail: string) => {
      // If a `url:` already appears anywhere in this object literal, skip.
      const segment = full;
      if (/\burl:\s*"/.test(segment)) {
        skipped += 1;
        return full;
      }
      added += 1;
      return `${head}, url: "${url}"${tail}`;
    });
  }

  if (after !== before) {
    writeFileSync(path, after, "utf8");
  }
}

console.log(`backfill-citation-urls: added ${added} URLs (skipped ${skipped} already-set).`);
