/**
 * Live Wikimedia Commons existence check for every place hero photograph.
 * Not part of quality:check (network). playtest:rigorous runs this first.
 *
 *   npx tsx scripts/check-place-hero-files.ts
 */
import { PLACES } from "../src/data/places";
import { listPlaceHeroFiles } from "../src/lib/place-hero-media";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "TerraclimaHeroMediaCheck/1.0 (https://github.com/sauterreed24/terraclima)";
const BATCH = 50;

interface CommonsPage {
  missing?: string;
  title?: string;
  imageinfo?: Array<{ mime?: string; size?: number; url?: string }>;
}

interface CommonsQuery {
  query?: { pages?: Record<string, CommonsPage> };
}

async function queryFiles(files: string[]): Promise<CommonsPage[]> {
  const titles = files.map(file => `File:${file}`).join("|");
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles,
    prop: "imageinfo",
    iiprop: "url|size|mime",
    redirects: "1",
  });
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "user-agent": UA,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const body = (await res.json()) as CommonsQuery;
      return Object.values(body.query?.pages ?? {});
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`Commons API failed after retries: ${lastError}`);
}

async function main() {
  const rows = listPlaceHeroFiles();
  const byId = new Map(rows.map(row => [row.id, row.file]));
  const missingIds = PLACES.filter(place => !byId.has(place.id)).map(place => place.id);
  if (missingIds.length) {
    console.error(`playtest:hero-media FAILED — ${missingIds.length} places have no Commons file`);
    console.error(missingIds.join(", "));
    process.exit(1);
  }

  const uniqueFiles = [...new Set(rows.map(row => row.file))];
  const missingFiles: string[] = [];
  const nonImage: string[] = [];

  for (let i = 0; i < uniqueFiles.length; i += BATCH) {
    const batch = uniqueFiles.slice(i, i + BATCH);
    const pages = await queryFiles(batch);
    for (const page of pages) {
      const title = page.title ?? "(untitled)";
      if (page.missing != null || !page.imageinfo?.[0]) {
        missingFiles.push(title);
        continue;
      }
      const mime = page.imageinfo[0].mime ?? "";
      if (!mime.startsWith("image/")) nonImage.push(`${title} (${mime})`);
    }
  }

  if (missingFiles.length || nonImage.length) {
    console.error("playtest:hero-media FAILED");
    if (missingFiles.length) {
      console.error(`missing files (${missingFiles.length}):`);
      for (const title of missingFiles) console.error(`  ${title}`);
    }
    if (nonImage.length) {
      console.error(`non-image files (${nonImage.length}):`);
      for (const title of nonImage) console.error(`  ${title}`);
    }
    process.exit(1);
  }

  console.log(`playtest:hero-media ok (${PLACES.length} places, ${uniqueFiles.length} Commons files)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
