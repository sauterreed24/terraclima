/**
 * Downloads every place hero photograph as a small Commons thumbnail so the
 * set can be reviewed by eye. Network-bound; run by
 * .github/workflows/hero-contact-sheet.yml, which turns the thumbnails into
 * labelled contact sheets (uploaded as a workflow artifact).
 *
 *   npx tsx scripts/hero-contact-sheet.ts --out hero-thumbs [--shard 1/4]
 *
 * Writes <out>/<NNN>-<place-id>.jpg in atlas order and prints one line per
 * photo. Exit 1 if any thumbnail fails to download.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listPlaceHeroFiles } from "../src/lib/place-hero-media";

const UA = "TerraclimaHeroContactSheet/1.0 (https://github.com/sauterreed24/terraclima)";
const WIDTH = 330; // a Commons standard thumbnail width

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const outDir = arg("--out") ?? "hero-thumbs";
const [shardIndex, shardCount] = (arg("--shard") ?? "1/1").split("/").map(Number) as [number, number];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function download(file: string): Promise<Buffer> {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${WIDTH}`;
  let lastError = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await sleep(1500 * 2 ** attempt);
  }
  throw new Error(lastError);
}

const all = listPlaceHeroFiles();
const mine = all
  .map((entry, index) => ({ ...entry, index }))
  .filter(entry => entry.index % shardCount === shardIndex - 1);

mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const { id, file, index } of mine) {
  const name = `${String(index + 1).padStart(3, "0")}-${id}.jpg`;
  try {
    writeFileSync(join(outDir, name), await download(file));
    console.log(`OK   ${name} | ${file}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name} | ${file} | ${err instanceof Error ? err.message : String(err)}`);
  }
  await sleep(250);
}
console.log(`SUMMARY shard=${shardIndex}/${shardCount} photos=${mine.length} failed=${failed}`);
process.exit(failed > 0 ? 1 : 0);
