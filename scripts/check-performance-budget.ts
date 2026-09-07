/**
 * Post-build performance budget for Terraclima.
 *
 * Preserves the cold-chunk modulepreload guard and adds conservative gzip
 * byte ceilings for initial entry assets based on the 2026-07-12 baseline
 * plus a small documented allowance (~8–12%).
 *
 * Run after `npm run build`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const INDEX_HTML = join(DIST, "index.html");
const ASSETS = join(DIST, "assets");

const COLD_CHUNK_STEMS = [
  "motion",
  "PlaceDetail",
  "CompareView",
  "ClimateTripsView",
  "CollectionsView",
  "LearnMode",
  "atlas-data",
  "site-history",
] as const;

/**
 * Baseline (main @ 5e6221a, 2026-07-12) + documented headroom.
 * Thresholds are gzip bytes unless marked raw.
 */
const BUDGETS = {
  /** Initial CSS file gzip. Baseline ~56.4 KB → 62 KB. */
  initialCssGzip: 62_000,
  /** Largest synchronous entry JS chunk (index-*.js) gzip. Baseline ~100 KB → 112 KB. */
  largestEntryJsGzip: 112_000,
  /**
   * Sum of modulepreload + entry script JS gzip (excludes CSS).
   * Historical baseline ~603 KB → 680 KB. Corpus-truth overhaul adds authored
   * experience, deep sections, and compact citation overlays for all 226 places
   * (~80 KB gzip), so the ceiling is raised to 780 KB with that allowance.
   */
  totalInitialJsGzip: 780_000,
  /** Total initial modulepreload count. Baseline 15 → 22. */
  maxModulePreloads: 22,
  /** Atlas topology cold chunk raw size ceiling (lazy). Baseline ~222 KB → 280 KB. */
  atlasDataRaw: 280_000,
  /**
   * PlaceDetail cold chunk raw size ceiling (lazy). Baseline ~149 KB → 200 KB.
   * Photographing every corpus place plus the overview portrait (why / contrast /
   * history) lands just over 200 KB; longer Commons filenames in the hero catalog
   * need a small extra allowance.
   * The September field-guide pass adds an always-available climate-basis
   * explanation and accessible section controls: measured 214,227 bytes.
   * Allow 2 KB for these additions; initial-load ceilings remain unchanged.
   */
  placeDetailRaw: 215_000,
} as const;

function extractAttrs(tag: string, attr: string): string | null {
  return tag.match(new RegExp(`\\b${attr}=(["'])(.*?)\\1`, "i"))?.[2] ?? null;
}

function extractModulePreloads(html: string): string[] {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  return links
    .filter(tag => /\brel=(["'])modulepreload\1/i.test(tag))
    .map(tag => extractAttrs(tag, "href"))
    .filter((href): href is string => Boolean(href));
}

function extractEntryScripts(html: string): string[] {
  const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
  return scripts
    .map(tag => extractAttrs(tag, "src"))
    .filter((href): href is string => Boolean(href));
}

function extractStylesheets(html: string): string[] {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  return links
    .filter(tag => /\brel=(["'])stylesheet\1/i.test(tag))
    .map(tag => extractAttrs(tag, "href"))
    .filter((href): href is string => Boolean(href));
}

function isLocalAssetHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("./") || href.startsWith("assets/") || !/^[a-z]+:/i.test(href);
}

function resolveAssetPath(href: string): string {
  const cleaned = href.replace(/^\.\//, "").replace(/^\//, "");
  if (cleaned.startsWith("assets/")) return join(DIST, cleaned);
  return join(DIST, cleaned);
}

function gzipSize(filePath: string): number {
  return gzipSync(readFileSync(filePath)).length;
}

function findAssetByStem(stem: string): string | null {
  if (!existsSync(ASSETS)) return null;
  const match = readdirSync(ASSETS).find(name => name.includes(stem) && name.endsWith(".js"));
  return match ? join(ASSETS, match) : null;
}

if (!existsSync(INDEX_HTML)) {
  throw new Error("dist/index.html not found. Run npm run build before npm run check:performance-budget.");
}

const html = readFileSync(INDEX_HTML, "utf8");
const preloads = extractModulePreloads(html).filter(isLocalAssetHref);
const entryScripts = extractEntryScripts(html).filter(isLocalAssetHref);
const stylesheets = extractStylesheets(html).filter(isLocalAssetHref);

const violations: string[] = [];

const coldPreloadHits = preloads
  .map(href => ({ href, file: basename(href) }))
  .filter(({ file }) => COLD_CHUNK_STEMS.some(stem => file.includes(stem)));

if (coldPreloadHits.length > 0) {
  violations.push(
    "Cold chunks became initial modulepreloads:",
    ...coldPreloadHits.map(v => `  - ${v.href}`),
    `  Forbidden stems: ${COLD_CHUNK_STEMS.join(", ")}`,
  );
}

if (preloads.length > BUDGETS.maxModulePreloads) {
  violations.push(
    `Too many initial modulepreloads: ${preloads.length} > ${BUDGETS.maxModulePreloads}`,
  );
}

const cssGzip = stylesheets.reduce((sum, href) => sum + gzipSize(resolveAssetPath(href)), 0);
if (cssGzip > BUDGETS.initialCssGzip) {
  violations.push(`Initial CSS gzip ${cssGzip} > budget ${BUDGETS.initialCssGzip}`);
}

const initialJsHrefs = [...new Set([...entryScripts, ...preloads])];
const initialJsGzipSizes = initialJsHrefs.map(href => {
  const path = resolveAssetPath(href);
  return { href, gz: gzipSize(path), raw: statSync(path).size };
});
const totalInitialJsGzip = initialJsGzipSizes.reduce((sum, row) => sum + row.gz, 0);
const largestEntry = initialJsGzipSizes
  .filter(row => /(?:^|\/)index-[^/]+\.js$/.test(row.href))
  .sort((a, b) => b.gz - a.gz)[0];

if (totalInitialJsGzip > BUDGETS.totalInitialJsGzip) {
  violations.push(`Total initial JS gzip ${totalInitialJsGzip} > budget ${BUDGETS.totalInitialJsGzip}`);
}
if (largestEntry && largestEntry.gz > BUDGETS.largestEntryJsGzip) {
  violations.push(
    `Largest entry JS gzip ${largestEntry.gz} (${largestEntry.href}) > budget ${BUDGETS.largestEntryJsGzip}`,
  );
}

const atlasData = findAssetByStem("atlas-data");
if (atlasData) {
  const raw = statSync(atlasData).size;
  if (raw > BUDGETS.atlasDataRaw) {
    violations.push(`Atlas topology chunk raw ${raw} > budget ${BUDGETS.atlasDataRaw}`);
  }
}

const placeDetail = findAssetByStem("PlaceDetail");
if (placeDetail) {
  const raw = statSync(placeDetail).size;
  if (raw > BUDGETS.placeDetailRaw) {
    violations.push(`PlaceDetail cold chunk raw ${raw} > budget ${BUDGETS.placeDetailRaw}`);
  }
}

const stemCounts = new Map<string, number>();
for (const { href } of initialJsGzipSizes) {
  const stem = basename(href).replace(/-[A-Za-z0-9_-]{6,}(?=\.js$)/, "");
  stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
}
for (const [stem, count] of stemCounts) {
  if (count > 1 && /^(react|vendor|geo)\.js$/.test(stem)) {
    violations.push(`Unexpected duplicate initial dependency stem ${stem} × ${count}`);
  }
}

if (violations.length > 0) {
  throw new Error(["Performance budget failed:", ...violations].join("\n"));
}

console.log(
  [
    `Performance budget ok: ${preloads.length} modulepreload${preloads.length === 1 ? "" : "s"}; cold chunks stay lazy.`,
    `  CSS gzip: ${cssGzip} / ${BUDGETS.initialCssGzip}`,
    `  Initial JS gzip: ${totalInitialJsGzip} / ${BUDGETS.totalInitialJsGzip}` +
      (largestEntry ? ` (entry ${largestEntry.gz} / ${BUDGETS.largestEntryJsGzip})` : ""),
    atlasData ? `  atlas-data raw: ${statSync(atlasData).size} / ${BUDGETS.atlasDataRaw}` : null,
    placeDetail ? `  PlaceDetail raw: ${statSync(placeDetail).size} / ${BUDGETS.placeDetailRaw}` : null,
  ]
    .filter(Boolean)
    .join("\n"),
);
