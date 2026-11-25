/**
 * Terraclima evaluator: the app's main jobs as scripted real-user tasks.
 *
 *   npm run eval                 # build, then every check below
 *   npm run eval -- --no-build   # reuse dist/
 *   npm run eval -- --full       # also run the Vitest suite (≈2.5 min)
 *   npm run eval -- --runs=7     # load-time samples (default 5)
 *   npm run eval -- --only=search,speed   # sections: search jobs data recover speed accuracy
 *
 * Sections (scorecard rows in IMPROVE.md):
 *   S1 search    realistic queries → intended place on top (tuning + held-out sets)
 *   S2 jobs      find / narrow / save+compare / home base / export: done? steps? right answer?
 *   S3 data      saved places, home base and compare survive reloads, many saves, bad storage, two tabs
 *   S4 recover   bad links, offline reload, failed code chunk, storage blocked: app stays usable
 *   S5 speed     time to first ranked card (fast + throttled phone), first-load JS gzip
 *   S7 accuracy  figures on cards, profiles, "vs home" chips and exports = the climate records,
 *                converted here independently (seeded profile sample + a held-out seed set)
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
import RECORDS from "../src/data/generated/climate-v2/records.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string, d: number) => {
  const a = args.find(x => x.startsWith(`${n}=`));
  return a ? Number(a.split("=")[1]) : d;
};
const RUNS = opt("--runs", 5);
const ONLY = args.find(a => a.startsWith("--only="))?.split("=")[1]?.split(",") ?? null;
const want = (section: string) => !ONLY || ONLY.includes(section);
/** Seeded sample (mulberry32) so a run is repeatable; the held-out seed is never tuned against. */
function sample<T>(xs: readonly T[], n: number, seed: number): T[] {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = [...xs]; const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  return out;
}
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
  record("S1b", "search top-1, HELD-OUT set", `${held.hits}/${held.total}`, ">= 90%", held.hits / held.total >= 0.9);
  // Held-out misses are not printed, so they cannot steer the next change.
  for (const m of tune.misses) console.log(`        miss "${m.q}" → ${m.got.join(", ") || "(nothing)"}`);
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
    // J6 carry them to another browser that already has one saved place of its own
    let moved = false; let mstep = steps; let mdetail = "";
    try {
      const file = await (await dl).path();
      const other = await newCtx(browser);
      await other.addInitScript(() => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem("terraclima.bookmarks.v1", JSON.stringify(["sitka-ak"])); sessionStorage.setItem("seeded", "1");
        }
      });
      const p2 = await open(other); await firstCard(p2);
      await p2.getByRole("button", { name: "More actions" }).first().click(); mstep++;
      await p2.getByLabel(/^Import saved places/).first().setInputFiles(file!); mstep++;
      await p2.waitForTimeout(500);
      const after = await bookmarks(p2);
      moved = ["sitka-ak", "bishop-ca", "sequim-wa", "oaxaca-mx"].every(id => after.includes(id)) && after[0] === "sitka-ak";
      mdetail = after.join(",");
      await other.close();
    } catch (e) { mdetail = String(e).slice(0, 120); }
    record("S2f", "move saved places to another browser (export, then import there; its own save kept)", moved ? `${mstep} steps` : `failed ${mdetail}`, "done in <= 4", moved && mstep <= 4);
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
  // D4 the offline cache does not keep old deploys' files forever (storage pressure can clear
  //    the whole site, saved places included): a stale build file is dropped after a visit.
  {
    const ctx = await newCtx(browser);
    const page = await open(ctx); await firstCard(page);
    await page.evaluate(async () => { await navigator.serviceWorker?.ready; });
    await page.evaluate(async url => {
      const keys = await caches.keys();
      const name = keys.find(k => k.endsWith("-runtime")) ?? "terraclima-v1-runtime";
      await (await caches.open(name)).put(url, new Response("// old build", { headers: { "content-type": "text/javascript" } }));
    }, new URL("/assets/index-0ld0ld0l.js", BASE).href);
    await page.reload(); await firstCard(page);
    const still = await page.evaluate(async url => {
      for (let i = 0; i < 60; i++) {
        if (!(await caches.match(url))) return false;
        await new Promise(r => setTimeout(r, 250));
      }
      return true;
    }, new URL("/assets/index-0ld0ld0l.js", BASE).href);
    record("S3d", "offline cache drops an old build's file after a visit", still ? "kept" : "dropped", "dropped", !still);
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
    // A first visit of ~10 s: wait (up to 15 s) until the worker holds the entry script.
    await page.evaluate(async () => {
      await navigator.serviceWorker?.ready;
      const entry = (document.querySelector('script[type="module"][src]') as HTMLScriptElement | null)?.src;
      for (let i = 0; i < 60 && entry; i++) {
        if (await caches.match(entry, { ignoreVary: true })) return;
        await new Promise(r => setTimeout(r, 250));
      }
    });
    await page.locator(CARD).first().click();
    await page.getByRole("dialog").first().waitFor({ timeout: 8000 }).catch(() => {});
    const viewed = new URL(page.url()).searchParams.get("p");
    await ctx.setOffline(true);
    await page.goto(BASE + "/").catch(() => {});
    await firstCard(page, 10000).catch(() => {});
    results["offline reload after one visit"] = await page.locator(CARD).count() > 0;
    await page.goto(`${BASE}/?p=${viewed}`).catch(() => {});
    await page.waitForTimeout(2500);
    const prof = await page.locator("body").innerText().catch(() => "");
    const name = PLACES.find(p => p.id === viewed)?.name ?? "§";
    results["offline: reopen a profile viewed online"] = !!viewed && prof.includes(name) && /Climate normals/i.test(prof);
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
  {
    // A profile's site-history file fails (offline, or an old tab after a deploy).
    const ctx = await newCtx(browser);
    let hits = 0;
    await ctx.route(/site-history-(?:usa|canada|mexico)-\d+-.*\.js$/, r => { hits++; return r.abort(); });
    const page = await open(ctx, "/?p=sequim-wa", /Failed to fetch dynamically imported module/);
    await page.waitForTimeout(4000);
    const body = await page.getByRole("dialog").first().innerText().catch(() => "");
    results["profile's history file fails → profile still opens, no retry storm"] = /Sequim/.test(body) && /Climate normals/i.test(body) && hits <= 3;
    if (hits > 3) console.log(`        site-history requests while failing: ${hits}`);
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
  // Throttling is per page; a service worker's own fetches would bypass it, so throttled runs block the worker.
  const ctx = await newCtx(browser, throttle ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" } : {});
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
  // First profile open: bytes fetched and time until its climate figures show, throttled phone.
  const opens: number[] = []; let openKb = 0;
  for (let i = 0; i < Math.max(3, Math.ceil(RUNS / 2)); i++) {
    const ctx = await newCtx(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/"); await firstCard(page, 60000);
    await page.waitForTimeout(1500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const fetched = new Set<string>();
    page.on("requestfinished", r => { const m = r.url().match(/\/(assets\/[^?#]+)$/); if (m) fetched.add(m[1]!); });
    const t0 = Date.now();
    await page.locator(CARD).first().click();
    await page.getByRole("dialog").getByText(/Climate normals/i).first().waitFor({ timeout: 60000 });
    opens.push(Date.now() - t0);
    await page.waitForTimeout(4000); // let follow-up downloads finish
    // gzip size of what was fetched: what a phone downloads from GitHub Pages.
    openKb = Math.round([...fetched].reduce((n, f) => n + (existsSync(join(ROOT, "dist", f)) ? gzipSync(readFileSync(join(ROOT, "dist", f))).length : 0), 0) / 1024);
    await ctx.close();
  }
  const o = stats(opens);
  record("S5d", "first profile open, phone 1.6 Mbps + 4x CPU (ms to climate figures)", `${o.median} [${o.min}–${o.max}]`, "<= 3000", o.median <= 3000, opens);
  record("S5e", "first profile open: KB gzip downloaded", openKb, "<= 250", openKb <= 250);
  const kb = initialJsGzip();
  record("S5c", "first-load JavaScript (KB gzip)", kb, "<= 747", kb <= 747);
}


// ---------------------------------------------------------------- S7 accuracy
// Reference: the generated climate records, converted with formulas written here,
// not imported from the app. A figure is wrong if it differs by more than rounding.
type Rec = { tempHighC: number[]; tempLowC: number[]; annualPrecipMm: number; humidity: number[] | null; frostFreeDays: number };
const REC = new Map<string, Rec>((RECORDS as Array<{ placeId: string; periods: Record<string, Rec> }>).map(r => [r.placeId, r.periods["rolling-1996-2025"]!]));
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f = (c: number) => c * 9 / 5 + 32;
const ref = (id: string) => {
  const r = REC.get(id)!;
  return {
    summerHighF: f(avg([5, 6, 7].map(m => r.tempHighC[m]!))),
    winterLowF: f(avg([11, 0, 1].map(m => r.tempLowC[m]!))),
    precipIn: r.annualPrecipMm / 25.4,
    humidityAnnual: r.humidity ? avg(r.humidity) : null,
    humiditySummer: r.humidity ? avg([5, 6, 7].map(m => r.humidity![m]!)) : null,
    frostFree: r.frostFreeDays,
  };
};
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const split = (l: string) => { const out: string[] = []; let cur = ""; let q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
  const head = split(lines[0]!);
  return lines.slice(1).map(l => Object.fromEntries(split(l).map((v, i) => [head[i]!, v])));
}
async function sectionAccuracy(browser: Browser) {
  console.log("\nS7 accuracy (shown figures = climate records, converted independently)");
  const HOME = "flagstaff-az";
  const errs: string[] = [];
  let checked = 0;
  const kinds: Record<string, number> = {};
  const near = (label: string, shown: number, want: number, tol: number) => {
    checked++;
    const kind = label.replace(/^\S+ /, ""); kinds[kind] = (kinds[kind] ?? 0) + 1;
    if (!(Math.abs(shown - want) <= tol)) errs.push(`${label}: shown ${shown}, records give ${want.toFixed(2)}`);
  };
  // (a) Export of every place, home base set.
  const ctx = await newCtx(browser);
  await ctx.addInitScript(([ids, home]) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("terraclima.bookmarks.v1", JSON.stringify(ids));
      localStorage.setItem("terraclima.home-base.v1", JSON.stringify(home));
      sessionStorage.setItem("seeded", "1");
    }
  }, [PLACES.map(p => p.id), HOME] as const);
  const page = await open(ctx); await firstCard(page);
  const dl = page.waitForEvent("download", { timeout: 15000 });
  await page.getByRole("button", { name: /^Export saved places/ }).first().click();
  await page.getByRole("menuitem", { name: /^CSV/ }).first().click().catch(async () => { await page.getByRole("button", { name: /^CSV/ }).first().click(); });
  const rows = parseCsv(readFileSync((await (await dl).path())!, "utf8"));
  const h = ref(HOME);
  for (const row of rows) {
    const id = row.id!; const r = ref(id);
    near(`${id} csv summer_high_f`, Number(row.summer_high_f), r.summerHighF, 0.06);
    near(`${id} csv winter_low_f`, Number(row.winter_low_f), r.winterLowF, 0.06);
    near(`${id} csv annual_precip_in`, Number(row.annual_precip_in), r.precipIn, 0.06);
    if (r.humidityAnnual != null) near(`${id} csv humidity_pct`, Number(row.humidity_pct), r.humidityAnnual, 0.51);
    near(`${id} csv frost_free_days`, Number(row.frost_free_days), r.frostFree, 0.51);
    if (id !== HOME) {
      near(`${id} csv summer_high_vs_home_f`, Number(row.summer_high_vs_home_f), r.summerHighF - h.summerHighF, 0.11);
      near(`${id} csv winter_low_vs_home_f`, Number(row.winter_low_vs_home_f), r.winterLowF - h.winterLowF, 0.11);
      if (r.humidityAnnual != null && h.humidityAnnual != null) near(`${id} csv humidity_vs_home_pct`, Number(row.humidity_vs_home_pct), r.humidityAnnual - h.humidityAnnual, 0.51);
    }
  }
  const missing = PLACES.length - rows.length;
  if (missing) errs.push(`export is missing ${missing} saved places`);
  await ctx.close();
  // (b) Cards: core numbers and labelled "vs home" chips, read the way their label says.
  //     Each sampled place is found by name, so its own card is read.
  const cardErrs = async (seed: number) => {
    const out: string[] = []; let n = 0;
    const c3 = await newCtx(browser);
    await c3.addInitScript(home => { localStorage.setItem("terraclima.home-base.v1", JSON.stringify(home)); }, HOME);
    for (const p of sample(PLACES.filter(x => x.id !== HOME), 8, seed)) {
      const pg = await open(c3, `/?q=${encodeURIComponent(p.name)}`);
      await firstCard(pg);
      const text = await pg.locator(".place-card").first().innerText();
      if (!text.toLowerCase().includes(p.name.toLowerCase())) { out.push(`${p.id} card: not found by name`); await pg.close(); continue; }
      const r = ref(p.id);
      const chk = (label: string, shown: number | null, want: number | null, tol = 0.51) => {
        if (shown == null || want == null) return;
        n++; const kind = `card ${label}`; kinds[kind] = (kinds[kind] ?? 0) + 1;
        if (Math.abs(shown - want) > tol) out.push(`${p.id} card ${label}: shown ${shown}, records give ${want.toFixed(2)}`);
      };
      const num = (re: RegExp, t = text) => { const m = t.match(re); return m ? Number(m[1]!.replace(/[−–]/, "-").replace("+", "")) : null; };
      chk("summer high", num(/SUMMER HIGH\s*(-?\d+)°F/i), r.summerHighF);
      chk("winter low", num(/WINTER LOW\s*(-?\d+)°F/i), r.winterLowF);
      chk("humidity", num(/(\d+)%\s*humidity/i), r.humidityAnnual);
      chk("frost-free days", num(/(\d+)\s*frost-free days/i), r.frostFree);
      const vs = text.slice(Math.max(0, text.search(/vs Flagstaff/i)));
      chk("vs-home Summer", num(/\bSummer\s*([+\-−–]?\d+)°F/i, vs), r.summerHighF - h.summerHighF);
      chk("vs-home Winter", num(/\bWinter\s*([+\-−–]?\d+)°F/i, vs), r.winterLowF - h.winterLowF);
      // An unqualified "Humidity" reads like the card's own (annual) humidity figure.
      chk('vs-home "Humidity"', num(/(?<!Summer\s)Humidity\s*([+\-−–]?\d+) pts/i, vs), r.humidityAnnual != null && h.humidityAnnual != null ? r.humidityAnnual - h.humidityAnnual : null);
      chk('vs-home "Summer humidity"', num(/Summer\s+humidity\s*([+\-−–]?\d+) pts/i, vs), r.humiditySummer != null && h.humiditySummer != null ? r.humiditySummer - h.humiditySummer : null);
      await pg.close();
    }
    await c3.close();
    return { out, n };
  };
  const cardTune = await cardErrs(11);
  const cardHeld = await cardErrs(9001);
  checked += cardTune.n; errs.push(...cardTune.out);
  // (c) Profiles: the climate figures at the top, for a seeded sample and a held-out seed.
  const profileErrs = async (seed: number) => {
    const out: string[] = []; let n = 0;
    const c2 = await newCtx(browser);
    for (const p of sample(PLACES, 8, seed)) {
      const pg = await open(c2, `/?p=${p.id}`);
      await pg.getByRole("dialog").getByText(/Climate normals/i).first().waitFor({ timeout: 15000 });
      const t = (await pg.getByRole("dialog").innerText()).replace(/\s+/g, " ");
      const r = ref(p.id);
      const grab = (re: RegExp) => { const m = t.match(re); return m ? Number(m[1]!.replace(/[−–]/, "-").replace(/,/g, "")) : null; };
      const pairs: Array<[string, number | null, number, number]> = [
        ["summer high", grab(/SUMMER HIGH (-?\d+)°F/i), r.summerHighF, 0.51],
        ["winter low", grab(/WINTER LOW (-?\d+)°F/i), r.winterLowF, 0.51],
        ["yearly precip", grab(/(?:YEARLY RAIN|RAIN & SNOW) ([\d.]+) in/i), r.precipIn, r.precipIn >= 10 ? 0.51 : 0.051],
      ];
      for (const [label, shown, want, tol] of pairs) {
        n++;
        if (shown == null) out.push(`${p.id} profile ${label}: not found`);
        else if (Math.abs(shown - want) > tol) out.push(`${p.id} profile ${label}: shown ${shown}, records give ${want.toFixed(2)}`);
      }
      await pg.close();
    }
    await c2.close();
    return { out, n };
  };
  // (d) Compare: the figures table for seeded pairs. Sunshine: the station record where the
  //     export says "station"; otherwise the app's rule is "no data" (the solar-based estimate
  //     is not shown as sunshine on screen; see Decisions in IMPROVE.md).
  const exported = new Map(rows.map(r => [r.id!, r]));
  const compareErrs = async (seed: number) => {
    const out: string[] = []; let n = 0;
    const picks = sample(PLACES, 8, seed);
    const c4 = await newCtx(browser);
    for (let k = 0; k < picks.length; k += 2) {
      const pair = [picks[k]!, picks[k + 1]!];
      const pg = await open(c4, `/?cmp=${pair.map(p => p.id).join(",")}`);
      const dlg = pg.getByRole("dialog").first();
      await dlg.waitFor({ timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(800);
      const trs = await dlg.locator("tr").evaluateAll(els => els.map(tr => [...tr.querySelectorAll("th,td")].map(c => (c as HTMLElement).innerText.replace(/\s+/g, " ").trim())));
      const head = trs.find(r => /signal/i.test(r[1] ?? "") || /^group$/i.test(r[0] ?? "")) ?? [];
      // Value columns follow the header's place order.
      const order = head.slice(2).map(name => pair.find(p => p.name.toLowerCase() === name.toLowerCase()) ?? null);
      const cells = (label: RegExp) => {
        const row = trs.find(r => label.test(`${r[0]} ${r[1]}`)); return row ? row.slice(2) : null;
      };
      const val = (x: string | undefined) => (x == null || /no data/.test(x) ? null : Number(x.replace(/[^\d.\-−]/g, "").replace("−", "-")));
      const checks: Array<[string, RegExp, (id: string) => number | null, number]> = [
        ["summer high", /^COMFORT Summer high$/i, id => ref(id).summerHighF, 0.51],
        ["winter low", /^COMFORT Winter low$/i, id => ref(id).winterLowF, 0.51],
        ["humidity", /^COMFORT Humidity$/i, id => ref(id).humidityAnnual, 0.51],
        ["annual precip", /^SEASONALITY Annual precip$/i, id => ref(id).precipIn, 0.51],
        ["frost-free", /^SEASONALITY Frost-free$/i, id => ref(id).frostFree, 0.51],
        ["sunshine (station)", /^SEASONALITY Sunshine$/i, id => (exported.get(id)?.sunshine_basis === "station" ? Number(exported.get(id)!.sunshine_pct) : null), 0.51],
      ];
      for (const [label, re, want, tol] of checks) {
        const cs = cells(re);
        if (order.length !== 2 || order.some(p => p == null)) { out.push(`compare ${pair.map(p => p.id).join("+")}: header not found`); continue; }
        order.forEach((p, idx) => {
          if (!p) return;
          const w = want(p.id); const shown = cs ? val(cs[idx]) : undefined;
          if (w == null && (shown == null)) return;
          n++; const kind = `compare ${label}`; kinds[kind] = (kinds[kind] ?? 0) + 1;
          if (shown == null) out.push(`${p.id} compare ${label}: shown "${cs?.[idx] ?? "missing"}", expected ${w!.toFixed(1)}`);
          else if (w == null) out.push(`${p.id} compare ${label}: shown ${shown}, expected none`);
          else if (Math.abs(shown - w) > tol) out.push(`${p.id} compare ${label}: shown ${shown}, expected ${w.toFixed(2)}`);
        });
      }
      await pg.close();
    }
    await c4.close();
    return { out, n };
  };
  const cmpTune = await compareErrs(11);
  const cmpHeld = await compareErrs(9001);
  checked += cmpTune.n; errs.push(...cmpTune.out);
  const tune = await profileErrs(11);
  const heldP = await profileErrs(9001);
  checked += tune.n; errs.push(...tune.out);
  const held = { out: [...heldP.out, ...cardHeld.out, ...cmpHeld.out], n: heldP.n + cardHeld.n + cmpHeld.n };
  record("S7a", "figures that differ from the climate records (export of all places; cards, profiles and Compare for 8 seeded places)", `${errs.length} of ${checked}`, "0", errs.length === 0, { errors: errs.slice(0, 60), checkedByKind: kinds });
  console.log(`        checked: ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  record("S7b", "same, cards, profiles and Compare for a HELD-OUT seed (8 places)", `${held.out.length} of ${held.n}`, "0", held.out.length === 0, held.out);
  for (const e of [...errs.slice(0, 12), ...held.out.slice(0, 5)]) console.log(`        ${e}`);
}

// ---------------------------------------------------------------- main
async function main() {
  const started = Date.now();
  if (want("search")) sectionSearch();
  let browser: Browser | null = null;
  try {
    await startServer();
    browser = await chromium.launch({ executablePath: chromePath() });
    if (want("jobs")) await sectionJobs(browser);
    if (want("data")) await sectionData(browser);
    if (want("recover")) await sectionRecover(browser);
    if (want("speed")) await sectionSpeed(browser);
    if (want("accuracy")) await sectionAccuracy(browser);
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
