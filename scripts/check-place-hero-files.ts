/**
 * Live Wikimedia Commons audit of every place hero photograph.
 * Not part of quality:check (network). playtest:rigorous runs this first, and
 * .github/workflows/hero-media-audit.yml runs it when the photo list changes.
 *
 *   npx tsx scripts/check-place-hero-files.ts               # check only
 *   npx tsx scripts/check-place-hero-files.ts --candidates  # + replacement ideas
 *
 * For every place it reports one HERO line: the Commons file, its size, its
 * Commons quality assessment (Featured / Quality / Valued), the HTTP result of
 * the exact thumbnail URL the app requests, and flags:
 *   MISSING   file not on Commons            NONIMAGE  not an image MIME type
 *   HTTP      app thumbnail URL not 200      SMALL     under 1600 px wide
 *   PORTRAIT  taller than wide               DUP       file shared by places
 * Exit 1 only for photos that would not render (MISSING / NONIMAGE / HTTP).
 *
 * With --candidates, places whose photo is not Commons-assessed also get up to
 * three CAND lines: assessed, landscape, ≥1600 px photos geotagged within
 * 10 km (or found by name), best first, for a human to choose from.
 */
import { PLACES } from "../src/data/places";
import { getPlaceHeroMedia, listPlaceHeroFiles } from "../src/lib/place-hero-media";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "TerraclimaHeroMediaCheck/2.0 (https://github.com/sauterreed24/terraclima)";
const BATCH = 50;
const MIN_WIDTH = 1600;
const WANT_CANDIDATES = process.argv.includes("--candidates");

interface ImageInfo {
  mime?: string;
  width?: number;
  height?: number;
  extmetadata?: Record<string, { value?: string }>;
}

interface CommonsPage {
  missing?: string;
  title?: string;
  imageinfo?: ImageInfo[];
}

interface CommonsResponse {
  query?: {
    pages?: Record<string, CommonsPage>;
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    geosearch?: Array<{ title: string; dist: number }>;
    search?: Array<{ title: string }>;
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function api(params: Record<string, string>): Promise<CommonsResponse> {
  const body = new URLSearchParams({ format: "json", formatversion: "1", ...params });
  let lastError = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: body.toString(),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return (await res.json()) as CommonsResponse;
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await sleep(1000 * 2 ** attempt);
  }
  throw new Error(`Commons API failed after retries: ${lastError}`);
}

const ASSESSMENTS: Array<[RegExp, string]> = [
  [/Featured pictures/i, "FEATURED"],
  [/Quality images/i, "QUALITY"],
  [/Valued images/i, "VALUED"],
];

function assessment(info: ImageInfo | undefined): string {
  const cats = info?.extmetadata?.Categories?.value ?? "";
  return ASSESSMENTS.filter(([re]) => re.test(cats)).map(([, label]) => label).join("+") || "-";
}

function assessmentRank(label: string): number {
  if (label.includes("FEATURED")) return 3;
  if (label.includes("QUALITY")) return 2;
  if (label.includes("VALUED")) return 1;
  return 0;
}

function plain(html: string | undefined, max = 90): string {
  const text = (html ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** imageinfo for many File: titles, keyed by the title as requested. */
async function imageInfo(titles: string[]): Promise<Map<string, CommonsPage>> {
  const out = new Map<string, CommonsPage>();
  for (let i = 0; i < titles.length; i += BATCH) {
    const batch = titles.slice(i, i + BATCH);
    const res = await api({
      action: "query",
      titles: batch.join("|"),
      prop: "imageinfo",
      iiprop: "size|mime|extmetadata",
      iiextmetadatafilter: "Categories|ImageDescription|LicenseShortName",
      redirects: "1",
    });
    const alias = new Map<string, string>();
    for (const n of res.query?.normalized ?? []) alias.set(n.from, n.to);
    for (const r of res.query?.redirects ?? []) alias.set(r.from, r.to);
    const byTitle = new Map(Object.values(res.query?.pages ?? {}).map(page => [page.title ?? "", page]));
    for (const title of batch) {
      let resolved = title;
      for (let hop = 0; hop < 3 && alias.has(resolved); hop++) resolved = alias.get(resolved)!;
      out.set(title, byTitle.get(resolved) ?? { missing: "", title });
    }
  }
  return out;
}

async function urlStatus(url: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
      const type = res.headers.get("content-type") ?? "";
      await res.body?.cancel();
      if (res.ok && type.startsWith("image/")) return "200";
      if (res.status !== 429) return `${res.status}${type ? ` ${type.split(";")[0]}` : ""}`;
    } catch (err) {
      if (attempt === 1) return `ERR ${err instanceof Error ? err.message : String(err)}`;
    }
    await sleep(3000);
  }
  return "429";
}

function coreName(name: string): string {
  return name.split(/ \(| & |, | — /)[0]!.trim();
}

async function candidatesFor(place: (typeof PLACES)[number], exclude: Set<string>): Promise<string[]> {
  const titles = new Map<string, number>();
  const geo = await api({
    action: "query",
    list: "geosearch",
    gscoord: `${place.lat}|${place.lon}`,
    gsradius: "10000",
    gsnamespace: "6",
    gslimit: "100",
  });
  for (const hit of geo.query?.geosearch ?? []) titles.set(hit.title, hit.dist);
  for (const category of ["Featured pictures on Wikimedia Commons", "Quality images"]) {
    const search = await api({
      action: "query",
      list: "search",
      srnamespace: "6",
      srlimit: "30",
      srsearch: `"${coreName(place.name)}" incategory:"${category}"`,
    });
    for (const hit of search.query?.search ?? []) if (!titles.has(hit.title)) titles.set(hit.title, -1);
  }
  const infos = await imageInfo([...titles.keys()].filter(title => !exclude.has(title)));
  const rows = [...infos.entries()]
    .map(([title, page]) => ({ title, info: page.imageinfo?.[0], dist: titles.get(title) ?? -1 }))
    .filter(row => {
      const { info } = row;
      if (!info?.width || !info.height || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) return false;
      return assessmentRank(assessment(info)) > 0 && info.width >= MIN_WIDTH && info.width / info.height >= 1.25;
    })
    .sort((a, b) => assessmentRank(assessment(b.info)) - assessmentRank(assessment(a.info)) || (b.info!.width ?? 0) - (a.info!.width ?? 0))
    .slice(0, 3);
  return rows.map(row => {
    const where = row.dist >= 0 ? `${(row.dist / 1000).toFixed(1)} km` : "by name";
    return `  CAND ${place.id} | ${assessment(row.info)} | ${row.info!.width}x${row.info!.height} | ${where} | ${row.title.replace(/^File:/, "")} | ${plain(row.info!.extmetadata?.ImageDescription?.value)}`;
  });
}

async function main() {
  const rows = listPlaceHeroFiles();
  const fileById = new Map(rows.map(row => [row.id, row.file]));
  const missingIds = PLACES.filter(place => !fileById.has(place.id)).map(place => place.id);
  const useCount = new Map<string, number>();
  for (const row of rows) useCount.set(row.file, (useCount.get(row.file) ?? 0) + 1);

  const infos = await imageInfo([...new Set(rows.map(row => `File:${row.file}`))]);
  const broken: string[] = [];
  const flagged = { SMALL: 0, PORTRAIT: 0, DUP: 0, unassessed: 0 };

  for (const place of PLACES) {
    const file = fileById.get(place.id);
    if (!file) continue;
    const page = infos.get(`File:${file}`);
    const info = page?.imageinfo?.[0];
    const flags: string[] = [];
    if (!info || page?.missing != null) flags.push("MISSING");
    else if (!(info.mime ?? "").startsWith("image/")) flags.push("NONIMAGE");
    const media = getPlaceHeroMedia(place.id)!;
    const status = flags.length ? "-" : await urlStatus(media.src);
    if (!flags.length && status !== "200") flags.push("HTTP");
    if (flags.length) broken.push(place.id);
    if (info?.width && info.width < MIN_WIDTH) { flags.push("SMALL"); flagged.SMALL++; }
    if (info?.width && info.height && info.height > info.width) { flags.push("PORTRAIT"); flagged.PORTRAIT++; }
    if ((useCount.get(file) ?? 0) > 1) { flags.push("DUP"); flagged.DUP++; }
    const assessed = assessment(info);
    if (assessed === "-") flagged.unassessed++;
    const license = info?.extmetadata?.LicenseShortName?.value ?? "?";
    console.log(
      `HERO ${place.id} | ${flags.join(",") || "ok"} | ${info?.width ?? "?"}x${info?.height ?? "?"} | ${assessed} | ${license} | http ${status} | ${file} | ${plain(info?.extmetadata?.ImageDescription?.value)}`,
    );
    if (WANT_CANDIDATES && assessed === "-") {
      try {
        for (const line of await candidatesFor(place, new Set([`File:${file}`]))) console.log(line);
      } catch (err) {
        console.log(`  CAND ${place.id} | lookup failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await sleep(150);
  }

  console.log(
    `SUMMARY places=${PLACES.length} files=${useCount.size} broken=${broken.length} small=${flagged.SMALL} portrait=${flagged.PORTRAIT} dup=${flagged.DUP} unassessed=${flagged.unassessed}`,
  );
  if (missingIds.length || broken.length) {
    console.error("playtest:hero-media FAILED");
    if (missingIds.length) console.error(`no photo assigned: ${missingIds.join(", ")}`);
    if (broken.length) console.error(`would not render: ${broken.join(", ")}`);
    process.exit(1);
  }
  console.log(`playtest:hero-media ok (${PLACES.length} places, ${useCount.size} Commons files)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
