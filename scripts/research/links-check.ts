/**
 * corpus:links:check — live URL validation with retry, HEAD→GET, rate limit, cache.
 * Not part of per-commit quality:check (network flaky). Use for release / schedule.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlaceResearchReceipt } from "../../src/lib/research/contracts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CACHE_PATH = join(ROOT, "data/research/link-cache.json");
const CONCURRENCY = 4;
const DELAY_MS = 150;
const RETRIES = 2;

interface CacheEntry {
  url: string;
  ok: boolean;
  status: number | null;
  checkedOn: string;
  finalUrl?: string;
  error?: string;
}

async function sleep(ms: number) {
  await new Promise(r => setTimeout(r, ms));
}

async function checkUrl(url: string): Promise<CacheEntry> {
  const checkedOn = new Date().toISOString();
  let lastError = "";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      let res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: { "user-agent": "TerraclimaCorpusLinkCheck/1.0" },
      });
      if (res.status === 405 || res.status === 403 || res.status === 404) {
        res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(20000),
          headers: { "user-agent": "TerraclimaCorpusLinkCheck/1.0" },
        });
      }
      const ok = res.status >= 200 && res.status < 400;
      return { url, ok, status: res.status, checkedOn, finalUrl: res.url };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await sleep(300 * (attempt + 1));
    }
  }
  return { url, ok: false, status: null, checkedOn, error: lastError };
}

async function main() {
  const receiptsPath = join(ROOT, "src/data/generated/research/receipts.json");
  const raw = JSON.parse(readFileSync(receiptsPath, "utf8")) as { receipts: PlaceResearchReceipt[] };
  const urls = [...new Set(raw.receipts.flatMap(r => r.sources.map(s => s.url)).filter(u => /^https?:\/\//i.test(u)))];

  let cache: Record<string, CacheEntry> = {};
  if (existsSync(CACHE_PATH)) {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Record<string, CacheEntry>;
  }

  const freshHours = 24;
  const now = Date.now();
  const todo = urls.filter(u => {
    const c = cache[u];
    if (!c) return true;
    const age = now - Date.parse(c.checkedOn);
    return Number.isNaN(age) || age > freshHours * 3600_000;
  });

  console.log(`corpus:links:check — uniqueUrls=${urls.length} toCheck=${todo.length}`);

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(checkUrl));
    for (const r of results) cache[r.url] = r;
    await sleep(DELAY_MS);
    if ((i / CONCURRENCY) % 10 === 0) {
      console.log(`… checked ${Math.min(i + CONCURRENCY, todo.length)}/${todo.length}`);
    }
  }

  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");

  const failures = urls.map(u => cache[u]).filter(c => c && !c.ok);
  console.log(`ok=${urls.length - failures.length} fail=${failures.length}`);
  for (const f of failures.slice(0, 40)) {
    console.log(`[fail] ${f.status ?? "err"} ${f.url} ${f.error ?? ""}`);
  }
  if (failures.length) process.exit(1);
}

main();
