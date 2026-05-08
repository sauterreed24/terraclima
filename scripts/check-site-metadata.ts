/**
 * Verifies public metadata stays aligned across the SPA shell and static files.
 *
 * This catches the exact class of drift that otherwise happens when canonical
 * URLs, Open Graph tags, manifests, robots.txt, and sitemap.xml are edited in
 * separate files.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_METADATA } from "../src/lib/site-metadata";

interface Finding {
  where: string;
  message: string;
}

const findings: Finding[] = [];
const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function readText(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function record(where: string, message: string): void {
  findings.push({ where, message });
}

function expectIncludes(where: string, text: string, expected: string): void {
  if (!text.includes(expected)) {
    record(where, `missing expected text: ${expected}`);
  }
}

function expectEqual(where: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    record(where, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function extractJsonLd(indexHtml: string): Record<string, unknown> | null {
  const match = indexHtml.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch (error) {
    record("index.html json-ld", error instanceof Error ? error.message : "invalid JSON-LD");
    return null;
  }
}

const indexHtml = readText("index.html");
const robots = readText("public/robots.txt");
const sitemap = readText("public/sitemap.xml");
const notFound = readText("public/404.html");
const manifest = JSON.parse(readText("public/site.webmanifest")) as Record<string, unknown>;
const packageJson = JSON.parse(readText("package.json")) as Record<string, unknown>;

const canonicalPath = new URL(SITE_METADATA.canonicalUrl).pathname;
const sitemapUrl = new URL("sitemap.xml", SITE_METADATA.canonicalUrl).href;

expectIncludes("index.html", indexHtml, `<meta name="application-name" content="${SITE_METADATA.appName}" />`);
expectIncludes("index.html", indexHtml, `<meta name="apple-mobile-web-app-title" content="${SITE_METADATA.appName}" />`);
expectIncludes("index.html", indexHtml, `content="${SITE_METADATA.description}"`);
expectIncludes("index.html", indexHtml, `<link rel="canonical" href="${SITE_METADATA.canonicalUrl}" />`);
expectIncludes("index.html", indexHtml, `<meta property="og:title" content="${SITE_METADATA.title}" />`);
expectIncludes("index.html", indexHtml, `content="${SITE_METADATA.socialDescription}"`);
expectIncludes("index.html", indexHtml, `<meta property="og:url" content="${SITE_METADATA.canonicalUrl}" />`);
expectIncludes("index.html", indexHtml, `<meta property="og:image" content="${SITE_METADATA.ogImageUrl}" />`);
expectIncludes("index.html", indexHtml, `<meta property="og:image:alt" content="${SITE_METADATA.title}" />`);
expectIncludes("index.html", indexHtml, `<meta name="twitter:title" content="${SITE_METADATA.title}" />`);
expectIncludes("index.html", indexHtml, `content="${SITE_METADATA.twitterDescription}"`);
expectIncludes("index.html", indexHtml, `<meta name="twitter:image" content="${SITE_METADATA.ogImageUrl}" />`);
expectIncludes("index.html", indexHtml, `<meta name="twitter:image:alt" content="${SITE_METADATA.title}" />`);
expectIncludes("index.html", indexHtml, `<title>${SITE_METADATA.title}</title>`);

const jsonLd = extractJsonLd(indexHtml);
if (jsonLd) {
  expectEqual("index.html json-ld @type", jsonLd["@type"], "WebApplication");
  expectEqual("index.html json-ld name", jsonLd.name, SITE_METADATA.appName);
  expectEqual("index.html json-ld url", jsonLd.url, SITE_METADATA.canonicalUrl);
  expectEqual("index.html json-ld image", jsonLd.image, SITE_METADATA.ogImageUrl);
  expectEqual("index.html json-ld description", jsonLd.description, SITE_METADATA.socialDescription);
}

expectEqual("public/site.webmanifest name", manifest.name, SITE_METADATA.title);
expectEqual("public/site.webmanifest short_name", manifest.short_name, SITE_METADATA.appName);
expectEqual("public/site.webmanifest description", manifest.description, SITE_METADATA.manifestDescription);
expectEqual(
  "public/site.webmanifest categories",
  JSON.stringify(manifest.categories),
  JSON.stringify(SITE_METADATA.manifestCategories),
);

expectIncludes("public/robots.txt", robots, `Sitemap: ${sitemapUrl}`);
expectIncludes("public/sitemap.xml", sitemap, `<loc>${SITE_METADATA.canonicalUrl}</loc>`);
expectIncludes("public/404.html", notFound, `<title>${SITE_METADATA.appName} — redirecting</title>`);
expectIncludes("public/404.html", notFound, `<meta http-equiv="refresh" content="0; url=${canonicalPath}" />`);
expectIncludes("public/404.html", notFound, `<link rel="canonical" href="${SITE_METADATA.canonicalUrl}" />`);
expectIncludes("public/404.html", notFound, `<a href="${canonicalPath}">${SITE_METADATA.appName}</a>`);

if (typeof packageJson.description !== "string" || !packageJson.description.includes(SITE_METADATA.title)) {
  record("package.json description", `should include "${SITE_METADATA.title}"`);
}

if (findings.length > 0) {
  console.error("Site metadata check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.where}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Site metadata check passed.");
