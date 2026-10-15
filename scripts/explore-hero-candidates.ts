/**
 * One-off: list landscape Commons photos for places whose hero needs
 * replacing. Reads scripts/hero-explore.json ({ placeId: [query, ...] });
 * a query starting with "Category:" lists that category's files, anything
 * else is a File-namespace full-text search.
 */
import { readFileSync } from "node:fs";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "TerraclimaHeroMediaCheck/2.0 (https://github.com/sauterreed24/terraclima)";

type Info = { mime?: string; width?: number; height?: number; extmetadata?: Record<string, { value?: string }> };
type Page = { title?: string; imageinfo?: Info[] };
type Res = { query?: { pages?: Record<string, Page>; search?: Array<{ title: string }>; categorymembers?: Array<{ title: string }> } };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<Res> {
  const body = new URLSearchParams({ format: "json", ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(API, { method: "POST", headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(30000) });
      if (res.ok) return (await res.json()) as Res;
    } catch { /* retry */ }
    await sleep(1000 * 2 ** attempt);
  }
  return {};
}

const plain = (html = "", max = 80) => {
  const t = html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

function assess(info?: Info): string {
  const cats = info?.extmetadata?.Categories?.value ?? "";
  return [/Featured pictures/i, /Quality images/i, /Valued images/i].map((re, i) => (re.test(cats) ? ["F", "Q", "V"][i] : "")).join("") || "-";
}

async function main() {
  const plan = JSON.parse(readFileSync("scripts/hero-explore.json", "utf8")) as Record<string, string[]>;
  for (const [placeId, queries] of Object.entries(plan)) {
    const seen = new Set<string>();
    for (const query of queries) {
      const res = query.startsWith("Category:")
        ? await api({ action: "query", list: "categorymembers", cmtitle: query, cmtype: "file", cmlimit: "60" })
        : await api({ action: "query", list: "search", srnamespace: "6", srlimit: "25", srsearch: query });
      const titles = (res.query?.search ?? res.query?.categorymembers ?? []).map(h => h.title).filter(t => !seen.has(t));
      titles.forEach(t => seen.add(t));
      if (!titles.length) continue;
      const info = await api({ action: "query", titles: titles.slice(0, 50).join("|"), prop: "imageinfo", iiprop: "size|mime|extmetadata", iiextmetadatafilter: "Categories|ImageDescription" });
      const rows = Object.values(info.query?.pages ?? {})
        .map(p => ({ title: p.title ?? "", i: p.imageinfo?.[0] }))
        .filter(r => r.i?.width && r.i.height && /^image\/(jpeg|png)$/.test(r.i.mime ?? "") && r.i.width >= 2000 && r.i.width / r.i.height >= 1.3)
        .sort((a, b) => (assess(b.i) !== "-" ? 1 : 0) - (assess(a.i) !== "-" ? 1 : 0) || (b.i!.width! - a.i!.width!))
        .slice(0, 10);
      for (const r of rows) {
        console.log(`EXP ${placeId} | ${query} | ${assess(r.i)} | ${r.i!.width}x${r.i!.height} | ${r.title.replace(/^File:/, "")} | ${plain(r.i!.extmetadata?.ImageDescription?.value)}`);
      }
      await sleep(200);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
