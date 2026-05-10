import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INDEX_HTML = join(ROOT, "dist", "index.html");

const COLD_CHUNK_STEMS = [
  "motion",
  "PlaceDetail",
  "CompareView",
  "ClimateTripsView",
  "CollectionsView",
  "LearnMode",
  "atlas-data",
] as const;

function extractModulePreloads(html: string): string[] {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  return links
    .filter(tag => /\brel=(["'])modulepreload\1/i.test(tag))
    .map(tag => tag.match(/\bhref=(["'])(.*?)\1/i)?.[2])
    .filter((href): href is string => Boolean(href));
}

if (!existsSync(INDEX_HTML)) {
  throw new Error("dist/index.html not found. Run npm run build before npm run check:performance-budget.");
}

const html = readFileSync(INDEX_HTML, "utf8");
const preloads = extractModulePreloads(html);
const violations = preloads
  .map(href => ({ href, file: basename(href) }))
  .filter(({ file }) => COLD_CHUNK_STEMS.some(stem => file.includes(stem)));

if (violations.length > 0) {
  throw new Error(
    [
      "Performance budget failed: cold chunks became initial modulepreloads.",
      ...violations.map(v => `- ${v.href}`),
      `Forbidden stems: ${COLD_CHUNK_STEMS.join(", ")}`,
    ].join("\n"),
  );
}

console.log(
  `Performance budget ok: ${preloads.length} initial modulepreload${preloads.length === 1 ? "" : "s"}; cold chunks stay lazy.`,
);
