/**
 * Terraclima evaluator: the app's main jobs as scripted real-user tasks.
 *
 *   npm run eval                 # build, then every check below
 *   npm run eval -- --no-build   # reuse dist/
 *   npm run eval -- --full       # also run the Vitest suite (≈2.5 min)
 *   npm run eval -- --runs=7     # load-time samples (default 5)
 *
 * Sections (scorecard rows in IMPROVE.md):
 *   S1 search    realistic queries → intended place on top (tuning + held-out sets)
 *   S2 jobs      find / narrow / save+compare / home base / export: done? steps? right answer?
 *   S3 data      saved places, home base and compare survive reloads, many saves, bad storage, two tabs
 *   S4 recover   bad links, offline reload, failed code chunk, storage blocked: app stays usable
 *   S5 speed     time to first ranked card (fast + throttled phone), first-load JS gzip
 *
 * Writes eval/results/latest.json. Timing rows vary run to run; every other row must
 * match exactly between two runs.
 */
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { PLACES } from "../src/data/places";
import { runScenarioRanking } from "../src/lib/climate-processor";

const ROOT = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string, d: number) => {
  const a = args.find(x => x.startsWith(`${n}=`));
  return a ? Number(a.split("=")[1]) : d;
};
const RUNS = opt("--runs", 5);
const PORT = opt("--port", 4199);
const BASE = `http://127.0.0.1:${PORT}`;
const NOW = Date.UTC(2026, 5, 15, 12); // fixed clock for ranking-dependent checks

type Row = { id: string; label: string; value: number | string; target: string; pass: boolean; detail?: unknown };
const rows: Row[] = [];
function record(id: string, label: string, value: number | string, target: string, pass: boolean, detail?: unknown) {
  rows.push({ id, label, value, target, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${id} ${label}: ${value}  (target ${target})`);
}

// ---------------------------------------------------------------- S1 search
interface Query { q: string; expect: string[] }
function topIds(q: string, n = 3): string[] {
  const res = runScenarioRanking({
    type: "scenario-rank",
    requestId: 0,
    scenario: "now",
    ranking: "most-unique",
    filters: { countries: [], archetypes: [], fitPresets: [], search: q },
    nowEpochMs: NOW,
  } as never);
  return res.rows.slice(0, n).map(r => r.id);
}
function searchSet(file: string) {
  const set = JSON.parse(readFileSync(join(ROOT, "eval/data", file), "utf8")) as { queries: Query[] };
  const misses: Array<{ q: string; got: string[] }> = [];
  let hits = 0;
  for (const { q, expect } of set.queries) {
    const got = topIds(q);
    if (got[0] && expect.includes(got[0])) hits++;
    else misses.push({ q, got });
  }
  return { hits, total: set.queries.length, misses };
}
function sectionSearch() {
  console.log("\nS1 search (top result is the place meant)");
  const tune = searchSet("search-tune.json");
  record("S1a", "search top-1, tuning set", `${tune.hits}/${tune.total}`, ">= 95%", tune.hits / tune.total >= 0.95, tune.misses);
  const held = searchSet("search-holdout.json");
  record("S1b", "search top-1, HELD-OUT set", `${held.hits}/${held.total}`, ">= 90%", held.hits / held.total >= 0.9, held.misses);
  for (const m of [...tune.misses, ...held.misses]) console.log(`        miss "${m.q}" → ${m.got.join(", ") || "(nothing)"}`);
}

// ---------------------------------------------------------------- browser plumbing
let server: ChildProcess | null = null;
async function startServer() {
  if (!flag("--no-build")) {
    console.log("building…");
    execSync("npm run build", { cwd: ROOT, stdio: "ignore" });
  }
  server = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT, stdio: "ignore", detached: true,
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error("preview server did not start");
}
function stopServer() {
  if (server?.pid) try { process.kill(-server.pid); } catch { /* gone */ }
}
function chromePath(): string | undefined {
  for (const p of [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, "/opt/pw-browsers/chromium"]) if (p && existsSync(p)) return p;
  return undefined;
}

const consoleErrors: string[] = [];
async function newCtx(browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 }, acceptDownloads: true, ...opts });
  // Only the app itself: external photos / map links are not part of any job.
  await ctx.route("**/*", r => {
    const u = r.request().url();
    return u.startsWith(BASE) || u.startsWith("data:") || u.startsWith("blob:") ? r.continue() : r.abort();
  });
  return ctx;
}
async function open(ctx: BrowserContext, path = "/", expected?: RegExp): Promise<Page> {
  const page = await ctx.newPage();
  page.on("pageerror", e => consoleErrors.push(`pageerror ${path}: ${String(e).slice(0, 200)}`));
  page.on("console", m => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (expected?.test(t)) return;
    if (/ERR_FAILED|Failed to load resource|ERR_ABORTED|ERR_INTERNET_DISCONNECTED/.test(t)) return;
    consoleErrors.push(`console ${path}: ${t.slice(0, 200)}`);
  });
  page.on("dialog", d => { consoleErrors.push(`unexpected dialog: ${d.message()}`); void d.dismiss(); });
  await page.goto(BASE + path);
  return page;
}
const CARD = 'button[aria-label$=" place profile"]';
async function firstCard(page: Page, timeout = 20000) {
  await page.waitForSelector(CARD, { timeout });
}
async function cardIds(page: Page): Promise<string[]> {
  const labels = await page.$$eval(CARD, els => els.map(e => e.getAttribute("aria-label") ?? ""));
  const byName = new Map(PLACES.map(p => [p.name, p.id]));
  return labels.map(l => byName.get(l.replace(/^Open /, "").replace(/ place profile$/, "")) ?? "?");
}
async function inListCount(page: Page): Promise<number> {
  const t = await page.locator("text=/\\d+–\\d+ of \\d+/").first().innerText().catch(() => "");
  const m = t.match(/of (\d+)/);
  return m ? Number(m[1]) : -1;
}
async function bookmarks(page: Page): Promise<string[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("terraclima.bookmarks.v1") ?? "[]"));
}

// ---------------------------------------------------------------- S2 jobs
async function sectionJobs(browser: Browser) {
  console.log("\nS2 main jobs (steps = clicks, key presses and fields typed)");
  // J1 find a place by name and open its profile
  {
    const ctx = await newCtx(browser); const page = await open(ctx); await firstCard(page);
    let steps = 0;
    await page.getByPlaceholder("Search places or regions").first().fill("bishop"); steps++;
    await page.keyboard.press("Enter"); steps++;
    await page.waitForURL(/p=bishop-ca/, { timeout: 5000 }).catch(() => {});
    const ok = /p=bishop-ca/.test(page.url()) && await page.getByRole("heading", { name: /Bishop/ }).first().isVisible().catch(() => false);
    record("S2a", "find a place by name → its profile", ok ? `${steps} steps` : "failed", "done in <= 2", ok && steps <= 2);
    await ctx.close();
  }
  // J2 narrow by a must-have; every listed place must actually meet it
  {
    const ctx = await newCtx(browser); const page = await open(ctx); await firstCard(page);
    let steps = 0;
    await page.locator("summary", { hasText: /^Must-haves$/ }).first().click(); steps++;
    await page.getByLabel("Max summer high").first().selectOption({ index: 2 }); steps++; // <= 79°F (26°C)
    await page.waitForURL(/sh=26/, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const shown = await inListCount(page);
    const reference = PLACES.filter(p => {
      const h = p.climate.tempHighC; return (h[5] + h[6] + h[7]) / 3 <= 26;
    }).length;
    const ids = await cardIds(page);
    const highs = await page.$$eval(".place-card", els => els.map(e => {
      const m = e.textContent?.match(/summer highs near (-?\d+)°F/); return m ? Number(m[1]) : NaN;
    }));
    const violators = highs.filter(h => !(h <= 79));
    const ok = shown === reference && violators.length === 0 && ids.length > 0;
    record("S2b", "must-have 'summer high <= 79°F': list = reference, no violators", ok ? `${steps} steps, ${shown} places` : `shown ${shown} vs ref ${reference}, ${violators.length} violators`, "exact match", ok);
    await ctx.close();
  }
  // J3 save two places and compare them
  {
    const ctx = await newCtx(browser); const page = await open(ctx); await firstCard(page);
    const [a, b] = (await cardIds(page)).slice(0, 2).map(id => PLACES.find(p => p.id === id)!);
    let steps = 0;
    await page.getByRole("button", { name: `Save ${a.name} to your saved places` }).first().click(); steps++;
    await page.getByRole("button", { name: `Save ${b.name} to your saved places` }).first().click(); steps++;
    await page.getByRole("button", { name: `Add ${a.name} to comparison` }).first().click(); steps++;
    await page.getByRole("button", { name: `Add ${b.name} to comparison` }).first().click(); steps++;
    await page.getByRole("button", { name: /^Open compare/ }).first().click(); steps++;
    const dlg = page.getByRole("dialog").first();
    await dlg.waitFor({ timeout: 8000 }).catch(() => {});
    const txt = await dlg.innerText().catch(() => "");
    const ok = txt.includes(a.name) && txt.includes(b.name) && (await bookmarks(page)).length === 2;
    record("S2c", "save 2 places and compare them", ok ? `${steps} steps` : "failed", "done in <= 5", ok && steps <= 5);
    await ctx.close();
  }
  // J4 set a home base, see deltas on cards, survive reload
  {
    const ctx = await newCtx(browser); const page = await open(ctx, "/?p=flagstaff-az");
    let steps = 0;
    await page.getByRole("button", { name: /^Set .*home/i }).first().click(); steps++;
    await page.keyboard.press("Escape"); steps++;
    await page.waitForTimeout(300);
    await page.reload(); await firstCard(page);
    const stored = await page.evaluate(() => localStorage.getItem("terraclima.home-base.v1"));
    const deltas = await page.locator(".place-card").first().innerText().then(t => /home|than Flagstaff|vs\.? ?Flagstaff/i.test(t)).catch(() => false);
    const ok = !!stored && stored.includes("flagstaff-az") && deltas;
    record("S2d", "set home base from a profile; cards show differences after reload", ok ? `${steps} steps` : `failed (stored=${stored}, deltas=${deltas})`, "done in <= 2", ok && steps <= 2);
    await ctx.close();
  }
  // J5 export saved places; figures match the atlas
  {
    const ctx = await newCtx(browser);
    await ctx.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("terraclima.bookmarks.v1", JSON.stringify(["bishop-ca", "sequim-wa", "oaxaca-mx"]));
        sessionStorage.setItem("seeded", "1");
      }
    });
    const page = await open(ctx); await firstCard(page);
    let steps = 0;
    await page.getByRole("button", { name: /^Export saved places/ }).first().click(); steps++;
    const dl = page.waitForEvent("download", { timeout: 8000 });
    await page.getByRole("menuitem", { name: /^JSON/ }).first().click().catch(async () => {
      await page.getByRole("button", { name: /^JSON/ }).first().click();
    }); steps++;
    let ok = false; let detail = "";
    try {
      const file = await (await dl).path();
      const json = JSON.parse(readFileSync(file!, "utf8"));
      const list: Array<Record<string, unknown>> = Array.isArray(json) ? json : (json.places ?? []);
      const ids = list.map(p => String(p.id));
      ok = ["bishop-ca", "sequim-wa", "oaxaca-mx"].every(id => ids.includes(id));
      detail = `ids=${ids.join(",")}`;
    } catch (e) { detail = String(e).slice(0, 120); }
    record("S2e", "export saved places as JSON; every saved place present", ok ? `${steps} steps` : `failed ${detail}`, "done in <= 2", ok && steps <= 2);
    await ctx.close();
  }
}

// ---------------------------------------------------------------- S3 data safety
async function sectionData(browser: Browser) {
  console.log("\nS3 data safety (saved places, home base, compare)");
  let lost = 0; const notes: string[] = [];
  // D1 saved places survive reload; compare set survives reload via the address
  {
    const ctx = await newCtx(browser); const page = await open(ctx); await firstCard(page);
    const ids = (await cardIds(page)).slice(0, 3);
    for (const id of ids) {
      const p = PLACES.find(x => x.id === id)!;
      await page.getByRole("button", { name: `Save ${p.name} to your saved places` }).first().click();
    }
    await page.getByRole("button", { name: `Add ${PLACES.find(x => x.id === ids[0])!.name} to comparison` }).first().click();
    await page.waitForTimeout(300);
    await page.reload(); await firstCard(page);
    const after = await bookmarks(page);
    const missing = ids.filter(id => !after.includes(id));
    lost += missing.length;
    if (missing.length) notes.push(`reload lost ${missing.join(",")}`);
    if (!new URL(page.url()).searchParams.get("cmp")?.includes(ids[0]!)) { lost++; notes.push("compare lost on reload"); }
    await ctx.close();
  }
  // D2 saving many places never drops an earlier one
  {
    const ctx = await newCtx(browser);
    const seed = PLACES.slice(0, 60).map(p => p.id);
    await ctx.addInitScript(s => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("terraclima.bookmarks.v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1");
      }
    }, seed);
    const page = await open(ctx); await firstCard(page);
    const target = (await cardIds(page)).find(id => !seed.includes(id))!;
    const tp = PLACES.find(p => p.id === target)!;
    await page.getByRole("button", { name: `Save ${tp.name} to your saved places` }).first().click();
    await page.waitForTimeout(200);
    const after = await bookmarks(page);
    const dropped = seed.filter(id => !after.includes(id));
    lost += dropped.length + (after.includes(target) ? 0 : 1);
    if (dropped.length) notes.push(`61st save dropped ${dropped.length} earlier saved place(s)`);
    await ctx.close();
  }
  // D3 two tabs saving different places keep both, and each tab shows both
  {
    const ctx = await newCtx(browser);
    const p1 = await open(ctx); await firstCard(p1);
    const p2 = await open(ctx); await firstCard(p2);
    const [a, b] = (await cardIds(p1)).slice(0, 2).map(id => PLACES.find(p => p.id === id)!);
    await p1.getByRole("button", { name: `Save ${a.name} to your saved places` }).first().click();
    await p2.getByRole("button", { name: `Save ${b.name} to your saved places` }).first().click();
    await p1.bringToFront(); await p1.waitForTimeout(300);
    const stored = await bookmarks(p1);
    if (!stored.includes(a.id) || !stored.includes(b.id)) { lost++; notes.push("two tabs: one save overwritten"); }
    const p1ShowsB = await p1.getByRole("button", { name: `Remove ${b.name} from your saved places` }).count();
    if (!p1ShowsB) notes.push("two tabs: first tab does not show the other tab's save (stale, not lost)");
    record("S3c", "two open tabs show each other's saves", p1ShowsB ? "yes" : "no", "yes", p1ShowsB > 0);
    await ctx.close();
  }
  record("S3a", "saved items lost: reload, 61st save, two tabs", lost, "0", lost === 0, notes);
}

// ---------------------------------------------------------------- S4 recovery
async function sectionRecover(browser: Browser) {
  console.log("\nS4 recovery (app stays usable)");
  const results: Record<string, boolean> = {};
  {
    const ctx = await newCtx(browser);
    const page = await open(ctx, "/?p=nowhere&cmp=a,b,c,d,e,f&sh=999&r=zzz&fit=nope&hb=x&q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText();
    results["bad link params"] = !/Something went wrong/i.test(body) && body.length > 500;
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser);
    await ctx.addInitScript(() => {
      for (const k of ["terraclima.bookmarks.v1", "terraclima.home-base.v1", "terraclima.ranking.v1", "terraclima.recent-places.v1", "terraclima:list-density"]) localStorage.setItem(k, "{not json");
    });
    const page = await open(ctx); await firstCard(page).catch(() => {});
    results["corrupted storage"] = await page.locator(CARD).count() > 0;
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser);
    await ctx.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    const page = await open(ctx); await firstCard(page).catch(() => {});
    results["storage blocked"] = await page.locator(CARD).count() > 0;
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser); const page = await open(ctx); await firstCard(page);
    await page.evaluate(async () => { await navigator.serviceWorker?.ready; });
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    await page.reload().catch(() => {});
    await firstCard(page, 10000).catch(() => {});
    results["offline reload after one visit"] = await page.locator(CARD).count() > 0;
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser);
    await ctx.route(/PlaceDetail-.*\.js$/, r => r.abort());
    const page = await open(ctx, "/", /Failed to fetch dynamically imported module/); await firstCard(page);
    await page.locator(CARD).first().click();
    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText();
    results["profile code fails to load → message + retry"] = /(try again|retry|reload|couldn.t load|could not load)/i.test(body);
    await ctx.close();
  }
  const passed = Object.values(results).filter(Boolean).length;
  record("S4a", "failure scenarios where the app stays usable", `${passed}/${Object.keys(results).length}`, "all", passed === Object.keys(results).length, results);
  for (const [k, v] of Object.entries(results)) if (!v) console.log(`        fails: ${k}`);
}

// ---------------------------------------------------------------- S5 speed
function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return { median: s[Math.floor(s.length / 2)]!, min: s[0]!, max: s[s.length - 1]! };
}
async function timeToFirstCard(browser: Browser, throttle: boolean): Promise<number> {
  const ctx = await newCtx(browser, throttle ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
  const page = await ctx.newPage();
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const t0 = Date.now();
  await page.goto(BASE + "/");
  await firstCard(page, 60000);
  const ms = Date.now() - t0;
  await ctx.close();
  return ms;
}
function initialJsGzip(): number {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const files = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/g)) files.add(m[1]!);
  let total = 0;
  for (const f of files) total += gzipSync(readFileSync(join(ROOT, "dist", f))).length;
  return Math.round(total / 1024);
}
async function sectionSpeed(browser: Browser) {
  console.log("\nS5 speed");
  const fast: number[] = []; const slow: number[] = [];
  for (let i = 0; i < RUNS; i++) fast.push(await timeToFirstCard(browser, false));
  for (let i = 0; i < Math.max(3, Math.ceil(RUNS / 2)); i++) slow.push(await timeToFirstCard(browser, true));
  const f = stats(fast); const s = stats(slow);
  record("S5a", "first ranked card, desktop (ms, median [min–max])", `${f.median} [${f.min}–${f.max}]`, "<= 1500", f.median <= 1500, fast);
  record("S5b", "first ranked card, phone on 1.6 Mbps + 4x CPU (ms)", `${s.median} [${s.min}–${s.max}]`, "<= 8000", s.median <= 8000, slow);
  const kb = initialJsGzip();
  record("S5c", "first-load JavaScript (KB gzip)", kb, "<= 747", kb <= 747);
}

// ---------------------------------------------------------------- main
async function main() {
  const started = Date.now();
  sectionSearch();
  let browser: Browser | null = null;
  try {
    await startServer();
    browser = await chromium.launch({ executablePath: chromePath() });
    await sectionJobs(browser);
    await sectionData(browser);
    await sectionRecover(browser);
    await sectionSpeed(browser);
  } finally {
    await browser?.close();
    stopServer();
  }
  record("S6a", "console errors / page errors during all tasks", consoleErrors.length, "0", consoleErrors.length === 0, consoleErrors);
  for (const e of consoleErrors) console.log(`        ${e}`);
  if (flag("--full")) {
    console.log("\nunit tests…");
    let ok = true;
    try { execSync("npm test", { cwd: ROOT, stdio: "ignore" }); } catch { ok = false; }
    record("S6b", "Vitest suite", ok ? "pass" : "FAIL", "pass", ok);
  }
  mkdirSync(join(ROOT, "eval/results"), { recursive: true });
  const out = { at: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), rows };
  writeFileSync(join(ROOT, "eval/results/latest.json"), JSON.stringify(out, null, 2) + "\n");
  const failed = rows.filter(r => !r.pass).length;
  console.log(`\n${rows.length - failed}/${rows.length} checks at target · ${out.seconds}s · eval/results/latest.json`);
}
main().catch(e => { stopServer(); console.error(e); process.exit(1); });
