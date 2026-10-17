/**
 * Downloads place hero photographs as small Commons thumbnails so they can be
 * reviewed by eye. Network-bound; run by .github/workflows/hero-contact-sheet.yml,
 * which turns the thumbnails into labelled contact sheets (workflow artifact).
 *
 *   npx tsx scripts/hero-contact-sheet.ts --out hero-thumbs [--shard 1/4]
 *     Current photo for every place: <out>/<NNN>-<place-id>.jpg, atlas order.
 *
 *   npx tsx scripts/hero-contact-sheet.ts --out cand --candidates id1,id2 [--search "id1=q1|q2;id2=q3"] [--shard 1/4]
 *     Up to nine replacement candidates per listed place, for a human to pick
 *     from: <out>/<place-id>--<N>.jpg plus one CAND line per photo (Commons
 *     title, size, assessment, source, article use). Candidates are landscape
 *     JPEGs at least 2000 px wide drawn from the town's Wikipedia / Wikivoyage
 *     articles, Commons geotags within 10 km, the town's Commons category tree,
 *     and assessed pictures naming the town and its state/province. Maps,
 *     signs, postcards, interiors, satellite views and the like are filtered
 *     out; Commons Featured / Quality / Valued pictures and photos already used
 *     in the article rank first. --search adds Commons searches per place
 *     (e.g. a landmark or waterfront the generic sources miss).
 *
 * Exit 1 if any thumbnail fails to download.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PLACES } from "../src/data/places";
import { listPlaceHeroFiles } from "../src/lib/place-hero-media";

const UA = "TerraclimaHeroContactSheet/1.1 (https://github.com/sauterreed24/terraclima)";
const API = "https://commons.wikimedia.org/w/api.php";
const WIDTH = 330; // a Commons standard thumbnail width
const PER_PLACE = 9;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const outDir = arg("--out") ?? "hero-thumbs";
const [shardIndex, shardCount] = (arg("--shard") ?? "1/1").split("/").map(Number) as [number, number];
const candidateIds = (arg("--candidates") ?? "").split(/[\s,]+/).filter(Boolean);
/** Extra Commons searches per place: "id=query|query;id2=query". */
const extraSearches = new Map(
  (arg("--search") ?? "")
    .split(";")
    .map(part => part.split("="))
    .filter(([id, queries]) => id?.trim() && queries?.trim())
    .map(([id, queries]) => [id!.trim(), queries!.split("|").map(q => q.trim()).filter(Boolean)] as const),
);

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

interface ImageInfo {
  mime?: string;
  width?: number;
  height?: number;
  extmetadata?: Record<string, { value?: string }>;
}

interface ApiResponse {
  query?: {
    pages?: Record<string, { title?: string; imageinfo?: ImageInfo[] }>;
    geosearch?: Array<{ title: string; dist: number }>;
    search?: Array<{ title: string }>;
  };
}

async function api(params: Record<string, string>, endpoint = API): Promise<ApiResponse> {
  const body = new URLSearchParams({ format: "json", formatversion: "1", ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: body.toString(),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return (await res.json()) as ApiResponse;
    } catch {
      /* retry */
    }
    await sleep(1000 * 2 ** attempt);
  }
  return {};
}

const REJECT_TITLE =
  /\bISS\d|View of Earth|\b(map|karte|mapa|sign|signage|logo|plaque|marker|postcard|interior|inside|museum|diagram|chart|poster|stamp|coat of arms|flag of|seal of|document|drawing|painting|engraving|lithograph|airplane|aeroplane|plane window|from the air|selfie|portrait|statue|sculpture|grave|cemetery|menu|screenshot|satellite|landsat|sentinel|nasa|census|parking|aerial|airport|jail|gravestone|headstone|tombstone|courthouse|post office|school|hospital|gas station|motel|highway|interstate|overpass|crash|fire damage|cleanup|construction)\b/i;
const REJECT_CATEGORY = /Postcards|Maps of|Interiors|Signs in|Satellite pictures|Aerial photographs from airplanes|Logos|Historical images|Black and white photographs/i;
const GOOD_WORDS = /\b(view|vista|panorama|landscape|sunset|sunrise|lake|mountain|peak|beach|coast|valley|river|canyon|falls|waterfall|harbou?r|bay|dunes?|forest|meadow|overlook|skyline|island|cliffs?|lighthouse|vineyard|orchard)\b/i;
const MEH_WORDS = /\b(street|building|house|church|car|bus|people|festival|parade|store|shop|restaurant|hotel|sign|road)\b/i;

function assessmentRank(info: ImageInfo): number {
  const cats = info.extmetadata?.Categories?.value ?? "";
  if (/Featured pictures/i.test(cats)) return 3;
  if (/Quality images/i.test(cats)) return 2;
  if (/Valued images/i.test(cats)) return 1;
  return 0;
}

function plain(html: string | undefined, max = 110): string {
  const text = (html ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function imageInfo(titles: string[]): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>();
  for (let i = 0; i < titles.length; i += 50) {
    const res = await api({
      action: "query",
      titles: titles.slice(i, i + 50).join("|"),
      prop: "imageinfo",
      iiprop: "size|mime|extmetadata",
      iiextmetadatafilter: "Categories|ImageDescription",
    });
    for (const page of Object.values(res.query?.pages ?? {})) {
      if (page.title && page.imageinfo?.[0]) out.set(page.title, page.imageinfo[0]);
    }
  }
  return out;
}

async function categoryFiles(category: string): Promise<string[]> {
  const res = (await api({
    action: "query",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmtype: "file",
    cmlimit: "200",
  })) as ApiResponse & { query?: { categorymembers?: Array<{ title: string }> } };
  return (res.query?.categorymembers ?? []).map(m => m.title);
}

async function searchTitles(srsearch: string, limit: number, namespace = "6", endpoint = API): Promise<string[]> {
  const res = await api({ action: "query", list: "search", srnamespace: namespace, srlimit: String(limit), srsearch }, endpoint);
  return (res.query?.search ?? []).map(hit => hit.title);
}

/** Files shown in the place's own Wikipedia / Wikivoyage article: a curated, on-subject pool. */
async function articleFiles(endpoint: string, query: string): Promise<string[]> {
  const [article] = await searchTitles(query, 1, "0", endpoint);
  if (!article) return [];
  const res = (await api({ action: "query", titles: article, redirects: "1", prop: "images", imlimit: "200" }, endpoint)) as ApiResponse & {
    query?: { pages?: Record<string, { images?: Array<{ title: string }> }> };
  };
  return Object.values(res.query?.pages ?? {}).flatMap(page => (page.images ?? []).map(image => image.title.replace(/^[^:]+:/, "File:")));
}

const WIKIS: Record<string, string[]> = {
  USA: ["https://en.wikipedia.org/w/api.php", "https://en.wikivoyage.org/w/api.php"],
  Canada: ["https://en.wikipedia.org/w/api.php", "https://en.wikivoyage.org/w/api.php"],
  Mexico: ["https://en.wikipedia.org/w/api.php", "https://es.wikipedia.org/w/api.php", "https://en.wikivoyage.org/w/api.php"],
};

async function globalUsage(titles: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < titles.length; i += 50) {
    const res = (await api({ action: "query", titles: titles.slice(i, i + 50).join("|"), prop: "globalusage", gunamespace: "0", gulimit: "500" })) as ApiResponse & {
      query?: { pages?: Record<string, { title?: string; globalusage?: unknown[] }> };
    };
    for (const page of Object.values(res.query?.pages ?? {})) if (page.title) out.set(page.title, page.globalusage?.length ?? 0);
  }
  return out;
}

// Where a candidate came from: metres when geotagged nearby, otherwise a source tag.
type Source = number | "article" | "category" | "by name" | "search";

async function candidates(place: (typeof PLACES)[number], current: string): Promise<Array<{ title: string; info: ImageInfo; where: string }>> {
  const found = new Map<string, Source>();
  const add = (title: string, source: Source) => {
    const prior = found.get(title);
    // An article appearance outranks every other source; otherwise keep the first.
    if (prior === undefined || source === "article") found.set(title, source);
  };
  const name = (place.municipality ?? place.name).split(/ \(| & |, | — /)[0]!.trim();
  for (const endpoint of WIKIS[place.country] ?? WIKIS.USA!) {
    for (const title of await articleFiles(endpoint, `${name} ${place.region}`)) add(title, "article");
  }
  // Commons caps geosearch at 10 km.
  const geo = await api({
    action: "query",
    list: "geosearch",
    gscoord: `${place.lat}|${place.lon}`,
    gsradius: "10000",
    gsnamespace: "6",
    gslimit: "500",
  });
  for (const hit of geo.query?.geosearch ?? []) add(hit.title, hit.dist);
  for (const category of [`${name}, ${place.region}`, name]) {
    for (const title of await categoryFiles(category)) add(title, "category");
    for (const title of await searchTitles(`deepcat:"${category}" filew:>1999 filemime:image/jpeg`, 100)) add(title, "category");
  }
  for (const query of extraSearches.get(place.id) ?? []) {
    for (const title of await searchTitles(`${query} filew:>1999 filemime:image/jpeg`, 60)) add(title, "search");
  }
  for (const label of ["Quality images", "Featured pictures on Wikimedia Commons", "Valued images"]) {
    for (const title of await searchTitles(`"${name}" "${place.region}" incategory:"${label}"`, 40)) add(title, "by name");
  }
  found.delete(`File:${current}`);
  const infos = await imageInfo([...found.keys()]);
  const passing = [...infos.entries()].filter(([title, info]) => {
    if (!/^image\/jpeg$/.test(info.mime ?? "") || !info.width || !info.height) return false;
    if (info.width < 2000 || info.width / info.height < 1.3) return false;
    if (REJECT_TITLE.test(title) || REJECT_CATEGORY.test(info.extmetadata?.Categories?.value ?? "")) return false;
    return true;
  });
  const usage = await globalUsage(passing.map(([title]) => title));
  return passing
    .map(([title, info]) => {
      const text = `${title} ${plain(info.extmetadata?.ImageDescription?.value, 400)}`;
      const source = found.get(title) ?? "by name";
      const score =
        assessmentRank(info) * 10 +
        (source === "article" ? 8 : source === "search" ? 6 : 0) +
        Math.min(6, usage.get(title) ?? 0) +
        (GOOD_WORDS.test(text) ? 4 : 0) -
        (MEH_WORDS.test(text) ? 3 : 0) +
        Math.min(3, (info.width ?? 0) / 2000) +
        (typeof source === "number" ? 2 - source / 5000 : 0);
      const where = typeof source === "number" ? `${(source / 1000).toFixed(1)} km` : source;
      return { title, info, score, where: `${where} u${usage.get(title) ?? 0}` };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, PER_PLACE);
}

mkdirSync(outDir, { recursive: true });
let failed = 0;

if (candidateIds.length > 0) {
  const fileById = new Map(listPlaceHeroFiles().map(row => [row.id, row.file]));
  const ids = candidateIds.filter((_, index) => index % shardCount === shardIndex - 1);
  for (const id of ids) {
    const place = PLACES.find(p => p.id === id);
    if (!place) {
      console.log(`CAND ${id} | unknown place id`);
      continue;
    }
    const picks = await candidates(place, fileById.get(id) ?? "");
    let n = 0;
    for (const pick of picks) {
      n++;
      const file = pick.title.replace(/^File:/, "");
      const name = `${id}--${n}.jpg`;
      try {
        writeFileSync(join(outDir, name), await download(file));
        const rank = ["-", "VALUED", "QUALITY", "FEATURED"][assessmentRank(pick.info)];
        console.log(`CAND ${name} | ${rank} | ${pick.info.width}x${pick.info.height} | ${pick.where} | ${file} | ${plain(pick.info.extmetadata?.ImageDescription?.value)}`);
      } catch (err) {
        failed++;
        console.log(`FAIL ${name} | ${file} | ${err instanceof Error ? err.message : String(err)}`);
      }
      await sleep(200);
    }
    if (n === 0) console.log(`CAND ${id} | no candidates passed the filters`);
  }
  console.log(`SUMMARY candidates shard=${shardIndex}/${shardCount} places=${ids.length} failed=${failed}`);
} else {
  const mine = listPlaceHeroFiles()
    .map((entry, index) => ({ ...entry, index }))
    .filter(entry => entry.index % shardCount === shardIndex - 1);
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
}
process.exit(failed > 0 ? 1 : 0);
