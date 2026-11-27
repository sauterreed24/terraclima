/**
 * Terraclima evaluator: the app's main jobs as scripted real-user tasks.
 *
 *   npm run eval                 # build, then every check below
 *   npm run eval -- --no-build   # reuse dist/
 *   npm run eval -- --full       # also run the Vitest suite (≈2.5 min)
 *   npm run eval -- --runs=7     # load-time samples (default 5)
 *   npm run eval -- --only=search,speed   # sections: search notes jobs data recover speed accuracy
 *
 * Sections (scorecard rows in IMPROVE.md):
 *   S1 search    realistic queries → intended place on top (tuning + held-out sets)
 *   S2 jobs      find / narrow / save+compare / home base / export: done? steps? right answer?
 *   S3 data      saved places, home base and compare survive reloads, many saves, bad storage, two tabs
 *   S4 recover   bad links, offline reload, failed code chunk, storage blocked: app stays usable
 *   S5 speed     time to first ranked card (fast + throttled phone), first-load JS gzip
 *   S7c notes    figures in the line under each ranked card (all rankings that quote climate) = records (Node, fast)
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
import { assessLiveFit } from "../src/lib/live-fit";
import { localizeProse } from "../src/lib/units";
import { projectPlace } from "../src/lib/climate-projection";
import { SITE_HISTORY } from "../src/data/places.site-history";
import { PLACES_FULL_BY_ID } from "../src/data/places.full";
import { SITE_HISTORY_GROUP_BY_ID } from "../src/data/site-history/group-index";

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
    // Wait for the list to settle (a fixed 400 ms wait failed once under load: 226 shown).
    let shown = await inListCount(page);
    for (let i = 0, prev = -1; i < 40 && (shown === PLACES.length || shown !== prev); i++) {
      prev = shown; await page.waitForTimeout(200); shown = await inListCount(page);
    }
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
  // J4b phone first screen: the search box must not sit under another control (the
  //     floating Filters button covered it on an iPhone-sized screen), and Filters must
  //     still be one tap away. Five phone browser viewports (Safari / Chrome with their toolbars); points across the field's width.
  {
    const covered: string[] = []; const noFilters: string[] = [];
    for (const [w, h] of [[375, 548], [375, 667], [390, 664], [412, 839], [360, 640]] as const) {
      const ctx = await newCtx(browser, { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await open(ctx); await firstCard(page); await page.waitForTimeout(600);
      for (const typed of ["", "big island lodge"]) {
        if (typed) { await page.locator("#tc-atlas-quick-search").fill(typed); await page.waitForTimeout(400); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300); }
        const hits = await page.evaluate(() => {
          const label = document.querySelector("[data-quick-search]") as HTMLElement | null;
          if (!label) return ["(no search field)"];
          const r = label.getBoundingClientRect(); const out: string[] = [];
          if (r.bottom <= 0 || r.top >= innerHeight) return out;
          const y = Math.min(r.top + r.height / 2, innerHeight - 2);
          for (let f = 0.08; f < 0.95; f += 0.12) {
            const el = document.elementFromPoint(r.left + r.width * f, y);
            if (el && !label.contains(el)) out.push(`${Math.round(f * 100)}%: ${(el.closest("button") as HTMLElement | null)?.getAttribute("aria-label") ?? el.className.toString().slice(0, 40)}`);
          }
          return out;
        });
        if (hits.length) covered.push(`${w}x${h}${typed ? " typed" : ""}: ${hits[0]} (+${hits.length - 1})`);
      }
      const filtersVisible = await page.getByRole("button", { name: /^Open filters and ranking/ }).evaluateAll(els => els.some(e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).visibility !== "hidden" && r.width > 0 && r.top < innerHeight && r.bottom > 0; }));
      if (!filtersVisible) noFilters.push(`${w}x${h}`);
      await ctx.close();
    }
    // From review: after the sheet closes, focus sits on the button, and the button must
    // still follow the row (it stayed docked off screen, or floated over the field).
    {
      const ctx = await newCtx(browser, { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await open(ctx); await firstCard(page); await page.waitForTimeout(600);
      const btn = page.getByRole("button", { name: /^Open filters and ranking/ }).first();
      const where = () => page.evaluate(() => {
        const b = document.querySelector(".tc-filter-sheet-trigger") as HTMLElement | null;
        const r = b?.getBoundingClientRect();
        return { docked: !!b?.closest("[data-quick-search]"), onScreen: !!r && r.width > 0 && r.top < innerHeight && r.bottom > 0, focused: document.activeElement === b };
      });
      for (const scrollTo of [1600, 0]) {
        await btn.click(); await page.waitForTimeout(400);
        await page.locator("#tc-explorer-filter-sheet").evaluate(d => (d as HTMLDialogElement).close()); await page.waitForTimeout(300);
        await page.evaluate(y => window.scrollTo(0, y), scrollTo); await page.waitForTimeout(700);
        const w = await where();
        const want = scrollTo === 0;
        if (w.docked !== want || !w.onScreen) covered.push(`after closing Filters, scrolled to ${scrollTo}: docked=${w.docked} onScreen=${w.onScreen}`);
      }
      await ctx.close();
    }
    record("S2l", "phone first screen: search field covered by another control / Filters not on screen (5 phone browser sizes, empty + typed; scroll after closing Filters)", `${covered.length} / ${noFilters.length}`, "0 / 0", covered.length === 0 && noFilters.length === 0, { covered, noFilters });
    for (const c of covered.slice(0, 4)) console.log(`        ${c}`);
  }
  // J4c Compare on a phone: how far down the summary and the first figure sit (px from
  //     the top of the screen), as it is and with the compare-figures-first trial.
  {
    const out: Record<string, { summary: number | null; firstFigure: number | null }> = {};
    for (const [tag, q] of [["off", ""], ["trial", "try=compare-figures-first&"]] as const) {
      const ctx = await newCtx(browser, { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await open(ctx, `/?${q}cmp=sequim-wa,bishop-ca`);
      await page.locator("#compare-diff-board").waitFor({ timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
      out[tag] = await page.evaluate(() => {
        // No named helper here: the runner wraps named functions in a helper the page lacks.
        const s = document.getElementById("compare-decision-read");
        const f = [...document.querySelectorAll("td, th")].find(e => /Summer high/i.test(e.textContent ?? ""));
        return { summary: s ? Math.round(s.getBoundingClientRect().top) : null, firstFigure: f ? Math.round(f.getBoundingClientRect().top) : null };
      });
      await ctx.close();
    }
    const v = `summary ${out.off!.summary} px, first figure ${out.off!.firstFigure} px (trial: ${out.trial!.summary} / ${out.trial!.firstFigure})`;
    record("S2m", "Compare on a phone (390×664): distance to the summary / first figure", v, "summary on first screen (< 664)", (out.off!.summary ?? 1e9) < 664, out);
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
    // Every item of the menu must be reachable (one was covered by the panel below it).
    const blocked: string[] = [];
    for (const item of await page.getByRole("menuitem").all()) {
      if (!(await item.click({ trial: true, timeout: 1500 }).then(() => true, () => false))) blocked.push((await item.getAttribute("aria-label")) ?? "?");
    }
    record("S2k", "export menu items covered by other panels", blocked.length, "0", blocked.length === 0, blocked);
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
    // J7 send saved places to someone by link; their browser asks first and keeps its own saves
    {
      let linkSteps = steps; let ok = false; let detail = "";
      try {
        await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
        const sender = await open(ctx); await firstCard(sender);
        await sender.getByRole("button", { name: /^Export saved places/ }).first().click(); linkSteps = 1;
        await sender.getByRole("menuitem", { name: /^Link to these places/ }).first().click(); linkSteps++;
        await sender.getByText(/Link copied/).first().waitFor({ timeout: 5000 });
        const link = await sender.evaluate(() => navigator.clipboard.readText());
        const other = await newCtx(browser);
        await other.addInitScript(() => {
          if (!sessionStorage.getItem("seeded")) {
            localStorage.setItem("terraclima.bookmarks.v1", JSON.stringify(["sitka-ak", "bishop-ca"])); sessionStorage.setItem("seeded", "1");
          }
        });
        const p2 = await open(other, link.replace(/^https?:\/\/[^/]+/, "")); await firstCard(p2);
        await p2.getByRole("heading", { name: /This link carries 3 saved places/ }).waitFor({ timeout: 8000 }); linkSteps++; // open the link
        const untouched = (await bookmarks(p2)).join(",") === "sitka-ak,bishop-ca";
        // Typing elsewhere while the prompt is open keeps focus (it used to steal it each render).
        const box = p2.getByPlaceholder("Search places or regions").first();
        await box.click(); await box.pressSequentially("bishop", { delay: 40 });
        const typed = await box.inputValue();
        await box.fill("");
        if (typed !== "bishop") detail = `typing while asked kept "${typed}"`;
        await p2.getByRole("button", { name: /^Add 2 places$/ }).click(); linkSteps++;
        await p2.waitForTimeout(300);
        const after = await bookmarks(p2);
        ok = typed === "bishop" && untouched && after.join(",") === "sitka-ak,bishop-ca,sequim-wa,oaxaca-mx" && !new URL(p2.url()).searchParams.has("saved");
        detail ||= `before=${untouched} after=${after.join(",")}`;
        await other.close();
      } catch (e) { detail = String(e).slice(0, 140); }
      record("S2i", "send saved places by link; receiver is asked, keeps own saves, gets the rest", ok ? `${linkSteps} steps` : `failed ${detail}`, "done in <= 4", ok && linkSteps <= 4);
    }
    await ctx.close();
  }
}

// Profiles carry their sources, 2050 outlook and chapters (loaded after first paint since the split).
async function sectionProfileFields(browser: Browser) {
  const out: string[] = []; let n = 0;
  const ctx = await newCtx(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const p of sample(PLACES, 6, 23)) {
    const full = PLACES_FULL_BY_ID[p.id]!;
    const pg = await open(ctx, n % 2 === 0 ? `/?p=${p.id}` : `/?q=${encodeURIComponent(p.name)}`);
    if (n % 2 === 1) { await firstCard(pg); await pg.locator(CARD).first().click(); }
    n++;
    const dlg = pg.getByRole("dialog").first();
    await dlg.getByText(/Climate normals/i).first().waitFor({ timeout: 20000 });
    // Open every collapsed section so its text is in the page.
    for (const b of await dlg.getByRole("button", { name: /^Show\b/ }).all()) await b.click().catch(() => {});
    await pg.waitForTimeout(400);
    const t = (await dlg.textContent() ?? "").replace(/\s+/g, " ");
    const want = [
      ["first source", full.citations?.[0]?.label ?? ""],
      ["2050 outlook", (full.climateChange?.outlook2050 ?? "").slice(0, 40)],
      ...((full.deepSections ?? []).slice(0, 1).map(sec => ["first In depth chapter", sec.title] as [string, string])),
    ] as Array<[string, string]>;
    for (const [what, text] of want) if (text && !t.includes(text.replace(/\s+/g, " ").replace(/°C/g, ""))) {
      // Temperatures in prose are localized (°C → °F); compare on text before the first number.
      const head = text.split(/\d/)[0]!.trim();
      if (!head || !t.includes(head)) out.push(`${p.id}: ${what} missing ("${text.slice(0, 50)}")`);
    }
    await pg.close();
  }
  await ctx.close();
  record("S2g", "profiles show their sources, 2050 outlook and first In depth chapter (6 seeded, link + click, phone)", `${out.length} missing`, "0", out.length === 0, out);
  for (const e of out.slice(0, 5)) console.log(`        ${e}`);
  // A word found only in In depth chapters finds the same places once the chapters arrive (idle prefetch).
  const expected = topIds("orographic", 999).length;
  const counts: number[] = [];
  for (const path of ["/", "/?scn=ssp245"]) { // the 2050 layer searches in a worker
    const c2 = await newCtx(browser);
    const pg = await open(c2, path); await firstCard(pg);
    await pg.waitForTimeout(6500);
    await pg.getByPlaceholder("Search places or regions").first().fill("orographic");
    await pg.waitForTimeout(1200);
    counts.push(await inListCount(pg));
    await c2.close();
  }
  // Deep links, the 2050 layer and save-data connections (no background download) as well.
  const linked = topIds("surrendered", 999).length;
  const linkCounts: number[] = [];
  for (const [path, saveData] of [["/?q=surrendered", false], ["/?scn=ssp245&q=surrendered", false], ["/?q=surrendered", true]] as const) {
    const c3 = await newCtx(browser);
    if (saveData) await c3.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true }));
    const pg = await open(c3, path); await firstCard(pg).catch(() => {});
    await pg.waitForTimeout(5000);
    linkCounts.push(await inListCount(pg).catch(() => -1));
    await c3.close();
  }
  record("S2h", "chapter-only search (typed: now / 2050; linked: now / 2050 / save-data) = before the split", `${[...counts, ...linkCounts].join(" / ")} vs ${expected},${linked}`, "equal", counts.every(n => n === expected) && linkCounts.every(n => n === linked));
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
    let ok = !/Something went wrong/i.test(body) && body.length > 500;
    // Values that are also Object property names (a crash class found in review).
    for (const q of ["?q=constructor%20oregon", "?col=constructor", "?v=trips&col=__proto__", "?a=toString&p=hasOwnProperty&hb=valueOf"]) {
      await page.goto(BASE + "/" + q);
      await page.waitForTimeout(1500);
      const t = await page.locator("body").innerText();
      if (/Something went wrong|could not load/i.test(t) || t.length < 500) { ok = false; console.log(`        bad link broke the page: ${q}`); }
    }
    results["bad link params"] = ok;
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
  {
    // A new deploy lands while this browser still holds the previous page: the offline copy must
    // keep what that page needs (pruning compares against the new build's file list).
    const ctx = await newCtx(browser);
    const page = await open(ctx); await firstCard(page);
    const waitCached = () => page.evaluate(async () => {
      await navigator.serviceWorker?.ready;
      const entry = (document.querySelector('script[type="module"][src]') as HTMLScriptElement | null)?.src;
      for (let i = 0; i < 60 && entry; i++) {
        if (await caches.match(entry, { ignoreVary: true })) return;
        await new Promise(r => setTimeout(r, 250));
      }
    });
    await waitCached();
    await page.locator(CARD).first().click();
    await page.getByRole("dialog").first().waitFor({ timeout: 8000 }).catch(() => {});
    const viewed = new URL(page.url()).searchParams.get("p");
    await ctx.route(/asset-manifest\.json/, r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ files: Array.from({ length: 12 }, (_, i) => `assets/next-deploy-${i}.js`) }) }));
    await page.goto(BASE + "/"); await firstCard(page);
    await page.waitForTimeout(7000); // idle hand-off + prune
    await ctx.setOffline(true);
    await page.goto(BASE + "/").catch(() => {});
    await firstCard(page, 10000).catch(() => {});
    const listOk = await page.locator(CARD).count() > 0;
    await page.goto(`${BASE}/?p=${viewed}`).catch(() => {});
    await page.waitForTimeout(2500);
    const prof = await page.locator("body").innerText().catch(() => "");
    results["offline after a new deploy's file list: list and a viewed profile still open"] = listOk && /Climate normals/i.test(prof);
    await ctx.close();
  }
  {
    // The history file fails once (a dropped connection), then works: the profile gets its history.
    const ctx = await newCtx(browser);
    let first = true;
    await ctx.route(/site-history-usa-1-.*\.js$/, r => { if (first) { first = false; return r.abort(); } return r.continue(); });
    const page = await open(ctx, "/?p=sequim-wa", /Failed to fetch dynamically imported module/);
    await page.waitForTimeout(4000);
    const body = await page.getByRole("dialog").first().innerText().catch(() => "");
    const line = SITE_HISTORY["sequim-wa"]!.history[0]!.slice(0, 50);
    results["history file fails once, then loads → profile shows its history"] = body.replace(/\s+/g, " ").includes(line.replace(/\s+/g, " "));
    await ctx.close();
  }
  {
    // The profile-fields file fails (offline, or an old tab after a deploy): the profile still opens.
    const ctx = await newCtx(browser);
    let hits = 0;
    await ctx.route(/profile-fields-usa-1-.*\.js$/, r => { hits++; return r.abort(); }); // Bishop's group
    const page = await open(ctx, "/?p=bishop-ca", /Failed to fetch dynamically imported module/);
    await page.waitForTimeout(7000); // past the background prefetch (5 s after start-up), which may try once
    const settled = hits;
    // Re-renders of the open profile (save, unsave) must not download again.
    for (let i = 0; i < 2; i++) await page.getByRole("dialog").getByRole("button", { name: /^(Save|Remove) Bishop/ }).first().click().catch(() => {});
    await page.waitForTimeout(1000);
    const body = await page.getByRole("dialog").first().innerText().catch(() => "");
    results["profile-fields file fails → profile opens, says sources are missing, no re-download on re-render"] =
      /Bishop/.test(body) && /Climate normals/i.test(body) && /could not be downloaded/.test(body) && hits <= 4 && hits === settled;
    if (hits > 4) console.log(`        profile-fields requests while failing: ${hits}`);
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
    // Count what the profile itself needs: files requested before its figures show
    // (the idle prefetch of every group file starts later and is not this action's cost).
    const fetched = new Set<string>();
    let shown = false;
    page.on("request", r => { if (shown) return; const m = r.url().match(/\/(assets\/[^?#]+)$/); if (m) fetched.add(m[1]!); });
    const t0 = Date.now();
    await page.locator(CARD).first().click();
    await page.getByRole("dialog").getByText(/Climate normals/i).first().waitFor({ timeout: 60000 });
    shown = true;
    opens.push(Date.now() - t0);
    await page.waitForTimeout(4000); // let follow-up downloads finish
    // gzip size of what was fetched: what a phone downloads from GitHub Pages. Other groups'
    // profile-field files are the background prefetch, not this profile's need.
    const group = SITE_HISTORY_GROUP_BY_ID[new URL(page.url()).searchParams.get("p") ?? ""] ?? "";
    for (const f of [...fetched]) if (/profile-fields-/.test(f) && !f.includes(`profile-fields-${group}-`)) fetched.delete(f);
    openKb = Math.round([...fetched].reduce((n, f) => n + (existsSync(join(ROOT, "dist", f)) ? gzipSync(readFileSync(join(ROOT, "dist", f))).length : 0), 0) / 1024);
    await ctx.close();
  }
  const o = stats(opens);
  record("S5d", "first profile open, phone 1.6 Mbps + 4x CPU (ms to climate figures)", `${o.median} [${o.min}–${o.max}]`, "<= 3000", o.median <= 3000, opens);
  record("S5e", "first profile open: KB gzip downloaded", openKb, "<= 250", openKb <= 250);
  const kb = initialJsGzip();
  record("S5c", "first-load JavaScript (KB gzip)", kb, "<= 650", kb <= 650);
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
  // Sunshine differences between two station series (monthly percent of possible, raw data).
  const stationSun = (id: string) => { const m = PLACES.find(p => p.id === id)!.climate.sunshinePct; return m && m.length === 12 ? avg(m) : null; };
  const hs = stationSun(HOME);
  for (const row of rows) {
    const here = stationSun(row.id!);
    if (row.id === HOME || here == null || hs == null || row.sunshine_vs_home_pct === "") continue;
    near(`${row.id} csv sunshine_vs_home_pct (stations)`, Number(row.sunshine_vs_home_pct), here - hs, 0.51);
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
  // (d) Compare: the figures table for seeded pairs. Sunshine has no independent reference
  //     (estimated where no station), so it must equal the exported figure for the same place,
  //     and an estimate must be marked as one.
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
        ["sunshine (= export)", /^SEASONALITY Sunshine$/i, id => (exported.get(id)?.sunshine_pct ? Number(exported.get(id)!.sunshine_pct) : null), 0.51],
      ];
      for (const [label, re, want, tol] of checks) {
        const cs = cells(re);
        if (order.length !== 2 || order.some(p => p == null)) { out.push(`compare ${pair.map(p => p.id).join("+")}: header not found`); continue; }
        order.forEach((p, idx) => {
          if (!p) return;
          const w = want(p.id); const shown = cs ? val(cs[idx]) : undefined;
          if (w == null && (shown == null)) return;
          n++; const kind = `compare ${label}`; kinds[kind] = (kinds[kind] ?? 0) + 1;
          if (label.startsWith("sunshine") && exported.get(p.id)?.sunshine_basis === "estimated" && cs?.[idx] && !/est/i.test(cs[idx]!)) out.push(`${p.id} compare sunshine: estimate "${cs[idx]}" not marked as one`);
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
  // (e) Ranking notes as the card shows them ("Why this rank"), for two rankings: the
  //     S7c reference formulas, read from the page instead of Node.
  {
    const c6 = await newCtx(browser);
    for (const [ranking, m] of [["best-this-month", 1], ["best-diurnal-sleep", 5]] as const) {
      const pg = await open(c6, `/?r=${ranking}${ranking === "best-this-month" ? `&m=${m + 1}` : ""}`);
      await firstCard(pg);
      const cards = await pg.locator(".place-card").evaluateAll(els => els.slice(0, 4).map(e => (e as HTMLElement).innerText));
      for (const text of cards) {
        // Name and region together: two places are called "Durango".
        const lower = text.toLowerCase();
        const id = PLACES.find(p => lower.includes(p.name.toLowerCase()) && lower.includes(p.region.toLowerCase()))?.id;
        const note = /why this rank\s*(.+)/i.exec(text)?.[1]?.replace(/[\u2212\u2013](?=\d)/g, "-");
        if (!id || !note) { errs.push(`card note ${ranking}: card or note not found`); continue; }
        for (const ref of NOTE_REFS[ranking]!) {
          const want = ref.want(id, m); if (want == null) continue;
          checked++; kinds[`card note ${ranking}`] = (kinds[`card note ${ranking}`] ?? 0) + 1;
          const hit = ref.re.exec(note.trim());
          const v = hit ? noteFigureOk(hit[1]!, ref.kind, want) : null;
          if (!v?.ok) errs.push(`${id} card note ${ranking}: "${note}" vs records ${v?.want.toFixed(2) ?? "(figure not found)"}`);
        }
      }
      await pg.close();
    }
    await c6.close();
  }
  const cmpTune = await compareErrs(11);
  const cmpHeld = await compareErrs(9001);
  checked += cmpTune.n; errs.push(...cmpTune.out);
  const tune = await profileErrs(11);
  const heldP = await profileErrs(9001);
  checked += tune.n; errs.push(...tune.out);
  const held = { out: [...heldP.out, ...cardHeld.out, ...cmpHeld.out], n: heldP.n + cardHeld.n + cmpHeld.n };
  // S8 confidence claims: a visible "High confidence" must not sit on figures that were never
  //    checked against a station, and the profile must say how its figures were checked.
  const status = new Map((RECORDS as Array<{ placeId: string; validation: { status: string }; climateDataConfidence?: string }>).map(r => [r.placeId, r]));
  const overclaim = PLACES.filter(p => assessLiveFit(p).badges.includes("High confidence") && status.get(p.id)?.climateDataConfidence !== "high").map(p => p.id);
  record("S8a", "places badged 'High confidence' whose climate data is not high (all 226)", overclaim.length, "0", overclaim.length === 0, overclaim.slice(0, 20));
  const basisErrs = async (seed: number) => {
    const out: string[] = [];
    const c5 = await newCtx(browser);
    for (const p of sample(PLACES, 8, seed)) {
      const pg = await open(c5, `/?p=${p.id}`);
      await pg.getByRole("dialog").getByText(/Climate normals/i).first().waitFor({ timeout: 15000 });
      const t = (await pg.getByRole("dialog").innerText()).replace(/\s+/g, " ");
      const st = status.get(p.id)?.validation.status;
      const said = /CLIMATE NORMALS · [^·]+ · (STATION-CHECKED|CHECKED, WITH CAVEATS|GRID ESTIMATE)/i.exec(t)?.[1]?.toLowerCase();
      const want = st === "validated" ? "station-checked" : st === "reviewed-exception" ? "checked, with caveats" : "grid estimate";
      if (said !== want) out.push(`${p.id}: figures basis shown "${said ?? "none"}", records say ${st}`);
      if (status.get(p.id)?.climateDataConfidence !== "high" && /High confidence/.test(t)) out.push(`${p.id}: "High confidence" shown, climate data ${status.get(p.id)?.climateDataConfidence}`);
      await pg.close();
    }
    await c5.close();
    return out;
  };
  const b1 = await basisErrs(11); const b2 = await basisErrs(9001);
  record("S8b", "profiles that misstate how their figures were checked (8 seeded + 8 HELD-OUT)", `${b1.length} + ${b2.length}`, "0 + 0", b1.length + b2.length === 0, [...b1, ...b2]);
  for (const e of [...b1, ...b2].slice(0, 6)) console.log(`        ${e}`);
  record("S7a", "figures that differ from the climate records (export of all places; cards, profiles and Compare for 8 seeded places)", `${errs.length} of ${checked}`, "0", errs.length === 0, { errors: errs.slice(0, 60), checkedByKind: kinds });
  console.log(`        checked: ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  record("S7b", "same, cards, profiles and Compare for a HELD-OUT seed (8 places)", `${held.out.length} of ${held.n}`, "0", held.out.length === 0, held.out);
  for (const e of [...errs.slice(0, 12), ...held.out.slice(0, 5)]) console.log(`        ${e}`);
}

// ---------------------------------------------------------------- S7c ranking notes
// The line under each ranked card ("Jun: 81°F day · 60°F night · 0.5 in") as the reader
// sees it (the app's own prose localizer), checked against the records with formulas
// written here. Every place, every month for Best this month. Places split by a fixed
// seed: tuning half (errors printed) and HELD-OUT half (count only).
const recFull = new Map<string, { tempHighC: number[]; tempLowC: number[]; precipMm: number[]; humidity: number[] | null; diurnalSummerC?: number | null }>(
  (RECORDS as Array<{ placeId: string; periods: Record<string, never> }>).map(r => [r.placeId, r.periods["rolling-1996-2025"]!]));
const mean = (xs: number[], idx: number[]) => idx.reduce((s, i) => s + xs[i]!, 0) / idx.length;
type NoteRef = Array<{ re: RegExp; want: (id: string, month: number) => number | null; kind: "F" | "dF" | "in" | "pct" }>;
const NOTE_REFS: Record<string, NoteRef> = {
  "coolest-summers": [{ re: /Mean summer high (-?[\d.]+)°F/, kind: "F", want: id => mean(recFull.get(id)!.tempHighC, [5, 6, 7]) }],
  "mildest-winters": [{ re: /Mean winter low (-?[\d.]+)°F/, kind: "F", want: id => mean(recFull.get(id)!.tempLowC, [11, 0, 1]) }],
  "best-shoulder-seasons": [
    { re: /highs near (-?[\d.]+)°F/, kind: "F", want: id => mean(recFull.get(id)!.tempHighC, [3, 4, 8, 9]) },
    { re: /· ([\d.,]+) in of rain a month/, kind: "in", want: id => mean(recFull.get(id)!.precipMm, [3, 4, 8, 9]) },
  ],
  "driest-air": [{ re: /Mean humidity ~(\d+)%(?! \(atlas)/, kind: "pct", want: id => { const h = recFull.get(id)!.humidity; return h ? mean(h, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) : null; } }],
  "best-four-season": [
    { re: /Winter days average (-?[\d.]+)°F/, kind: "F", want: id => { const r = recFull.get(id)!; return (mean(r.tempHighC, [11, 0, 1]) + mean(r.tempLowC, [11, 0, 1])) / 2; } },
    { re: /summer highs (-?[\d.]+)°F/, kind: "F", want: id => mean(recFull.get(id)!.tempHighC, [5, 6, 7]) },
  ],
  "best-diurnal-sleep": [
    { re: /Summer nights near (-?[\d.]+)°F/, kind: "F", want: id => mean(recFull.get(id)!.tempLowC, [5, 6, 7]) },
    { re: /swing (-?[\d.]+)°F/, kind: "dF", want: id => { const r = recFull.get(id)!; return r.diurnalSummerC ?? r.tempHighC[6]! - r.tempLowC[6]!; } },
  ],
  "mediterranean-like": [{ re: /· ([\d.,]+) in(?:ches)? in Jul–Aug/, kind: "in", want: id => mean(recFull.get(id)!.precipMm, [6, 7]) * 2 }],
  "wet-forest-refuges": [
    { re: /^([\d.,]+) in of rain a year/, kind: "in", want: id => recFull.get(id)!.precipMm.reduce((a, b) => a + b, 0) },
    { re: /driest month ([\d.,]+) in/, kind: "in", want: id => Math.min(...recFull.get(id)!.precipMm) },
  ],
  "monsoon-drama": [
    { re: /^([\d.,]+) in(?:ches)? in Jul–Sep/, kind: "in", want: id => mean(recFull.get(id)!.precipMm, [6, 7, 8]) * 3 },
    { re: /vs ([\d.,]+) in(?:ches)? in Dec–Feb/, kind: "in", want: id => mean(recFull.get(id)!.precipMm, [11, 0, 1]) * 3 },
  ],
  "best-this-month": [
    { re: /: (-?[\d.]+)°F day/, kind: "F", want: (id, m) => recFull.get(id)!.tempHighC[m]! },
    { re: /day · (-?[\d.]+)°F night/, kind: "F", want: (id, m) => recFull.get(id)!.tempLowC[m]! },
    { re: /night · ([\d.,]+) in$/, kind: "in", want: (id, m) => recFull.get(id)!.precipMm[m]! },
  ],
  "best-for-remote-work": [{ re: /^(-?[\d.]+)°F summers/, kind: "F", want: id => mean(recFull.get(id)!.tempHighC, [5, 6, 7]) }],
};
/** Shown figure vs reference: whole °F within 0.5; inches within half the last shown digit. */
function noteFigureOk(shownRaw: string, kind: NoteRef[number]["kind"], refMetric: number): { ok: boolean; want: number } {
  const shown = Number(shownRaw.replace(/,/g, ""));
  const want = kind === "F" ? refMetric * 9 / 5 + 32 : kind === "dF" ? refMetric * 9 / 5 : kind === "in" ? refMetric / 25.4 : refMetric;
  const decimals = (shownRaw.split(".")[1] ?? "").length;
  const tol = 0.5 * 10 ** -decimals + 1e-9;
  return { ok: Math.abs(shown - want) <= tol, want };
}
const countBy = (xs: string[]) => xs.reduce<Record<string, number>>((o, x) => { const k = x.split(" ")[0]!; o[k] = (o[k] ?? 0) + 1; return o; }, {});
function sectionNotes() {
  console.log("\nS7c ranking notes (figures under ranked cards = the records)");
  const held = new Set(sample(PLACES.map(p => p.id), Math.floor(PLACES.length / 2), 4242));
  const res = { tune: { bad: [] as string[], n: 0 }, held: { bad: [] as string[], n: 0 } };
  const missing: string[] = [];
  for (const [ranking, refs] of Object.entries(NOTE_REFS)) {
    const months = ranking === "best-this-month" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [5];
    for (const m of months) {
      const out = runScenarioRanking({
        type: "scenario-rank", requestId: 0, scenario: "now", ranking,
        filters: { countries: [], archetypes: [], fitPresets: [], search: "" },
        nowEpochMs: new Date(2026, m, 1, 12).getTime(),
      } as never);
      for (const row of out.rows as Array<{ id: string; note?: string }>) {
        const shownNote = localizeProse(row.note ?? "", "F", "imperial").replace(/[−–](?=\d)/g, "-");
        const bucket = held.has(row.id) ? res.held : res.tune;
        for (const ref of refs) {
          const want = ref.want(row.id, m);
          if (want == null) continue;
          bucket.n++;
          const hit = ref.re.exec(shownNote);
          if (!hit) { if (missing.length < 5) missing.push(`${ranking} ${row.id}: "${shownNote}"`); bucket.bad.push(`${ranking} ${row.id}: figure not found in "${shownNote}"`); continue; }
          const v = noteFigureOk(hit[1]!, ref.kind, want);
          if (!v.ok) bucket.bad.push(`${ranking} m${m + 1} ${row.id}: "${shownNote}" — records give ${v.want.toFixed(2)} for ${ref.re.source.slice(0, 24)}`);
        }
      }
    }
  }
  record("S7c", "figures in ranking notes that differ from the records (11 rankings, 12 months; tuning half of places)", `${res.tune.bad.length} of ${res.tune.n}`, "0", res.tune.bad.length === 0, { byRanking: countBy(res.tune.bad), errors: res.tune.bad.slice(0, 40) });
  record("S7d", "same, HELD-OUT half of places", `${res.held.bad.length} of ${res.held.n}`, "0", res.held.bad.length === 0, countBy(res.held.bad));
  for (const e of res.tune.bad.slice(0, 8)) console.log(`        ${e}`);
}

// ---------------------------------------------------------------- S7e 2050 figures
// The 2050 layers (scn=ssp245 / ssp585): every place's projected summer high, winter low
// and yearly precipitation, as the cards and the 2050 summary show them, against the
// documented rules applied here to the records: one anomaly per latitude band (IPCC AR6
// screening table, copied from the spec in climate-projection.ts), Mexico's precipitation
// nudged 4 points drier, warming eased from the January delta to the July delta along a
// cosine, monthly values rounded to 0.1 °C / 1 mm.
const BAND_DELTAS: Record<"ssp245" | "ssp585", Array<[number, number, number, number]>> = {
  // [max |lat|, ΔJJA high °C, ΔJan low °C, Δprecip %]
  ssp245: [[25, 1.6, 1.4, -5], [35, 1.9, 1.6, -6], [45, 2.0, 1.9, 2], [55, 2.1, 2.4, 5], [65, 2.3, 3.2, 8], [91, 2.6, 4.5, 12]],
  ssp585: [[25, 2.2, 2.0, -8], [35, 2.7, 2.3, -9], [45, 2.9, 2.8, 3], [55, 3.1, 3.6, 7], [65, 3.4, 4.8, 11], [91, 3.9, 6.5, 16]],
};
function ref2050(id: string, scn: "ssp245" | "ssp585") {
  const p = PLACES.find(x => x.id === id)!; const r = recFull.get(id)!;
  const [, dJJA, dJan, dP0] = BAND_DELTAS[scn].find(b => Math.abs(p.lat) < b[0])!;
  const dP = dP0 + (p.country === "Mexico" ? -4 : 0);
  const w = (i: number) => dJan + (dJJA - dJan) * (1 - Math.cos(2 * Math.PI * i / 12)) / 2;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const hi = r.tempHighC.map((v, i) => r1(v + w(i))), lo = r.tempLowC.map((v, i) => r1(v + w(i)));
  const pr = r.precipMm.map(v => Math.max(0, Math.round(v * (1 + dP / 100))));
  const now = { sh: mean(r.tempHighC, [5, 6, 7]), wl: mean(r.tempLowC, [11, 0, 1]), ap: r.precipMm.reduce((a, b) => a + b, 0) };
  const fut = { sh: mean(hi, [5, 6, 7]), wl: mean(lo, [11, 0, 1]), ap: pr.reduce((a, b) => a + b, 0) };
  return { now, fut, dSh: fut.sh - now.sh, dWl: fut.wl - now.wl, dPpct: (fut.ap - now.ap) / now.ap * 100 };
}
async function section2050(browser: Browser) {
  console.log("\nS7e 2050 figures (cards and the 2050 summary = records + documented projection)");
  const errs: string[] = []; let n = 0;
  const num = (x: string | undefined) => (x == null ? null : Number(x.replace(/[−–]/, "-").replace("+", "")));
  const ctx = await newCtx(browser);
  for (const scn of ["ssp245", "ssp585"] as const) {
    for (const ranking of ["coolest-summers", "mildest-winters"]) {
      const pg = await open(ctx, `/?scn=${scn}&r=${ranking}`);
      await firstCard(pg);
      await pg.locator(".scenario-remap__row").first().waitFor({ timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(500);
      // Summary chips: change from today, per row.
      for (const row of await pg.locator(".scenario-remap__row").evaluateAll(els => els.map(e => (e as HTMLElement).innerText.replace(/\s+/g, " ")))) {
        const matches = PLACES.filter(p => row.toLowerCase().includes(p.name.toLowerCase()));
        if (matches.length !== 1) { if (!matches.length) errs.push(`${scn} summary row: place not found in "${row.slice(0, 60)}"`); continue; }
        const id = matches[0]!.id; const ref = ref2050(id, scn);
        const sh = num(/Summer ([+\-−]?[\d.]+)°F/.exec(row)?.[1]); const wl = num(/Winter ([+\-−]?[\d.]+)°F/.exec(row)?.[1]); const pp = num(/Precip ([+\-−]?[\d.]+)%/.exec(row)?.[1]);
        for (const [label, shown, want, tol] of [["summer change °F", sh, ref.dSh * 1.8, 0.051], ["winter change °F", wl, ref.dWl * 1.8, 0.051], ["precip change %", pp, ref.dPpct, 0.51]] as const) {
          n++;
          if (shown == null || Math.abs(shown - want) > tol) errs.push(`${scn} ${id} summary ${label}: shown ${shown}, rules give ${want.toFixed(2)}`);
        }
      }
      // First six cards: their projected summer high / winter low.
      for (const text of await pg.locator(".place-card").evaluateAll(els => els.slice(0, 6).map(e => (e as HTMLElement).innerText))) {
        const lower = text.toLowerCase();
        const p = PLACES.find(x => lower.includes(x.name.toLowerCase()) && lower.includes(x.region.toLowerCase()));
        if (!p) { errs.push(`${scn} card: place not found`); continue; }
        const ref = ref2050(p.id, scn);
        const sh = num(/SUMMER HIGH\s*(-?[\d]+)°F/i.exec(text)?.[1]); const wl = num(/WINTER LOW\s*([\-−]?[\d]+)°F/i.exec(text)?.[1]);
        for (const [label, shown, want] of [["summer high", sh, ref.fut.sh * 1.8 + 32], ["winter low", wl, ref.fut.wl * 1.8 + 32]] as const) {
          n++;
          if (shown == null || Math.abs(shown - want) > 0.51) errs.push(`${scn} ${p.id} card ${label}: shown ${shown}, rules give ${want.toFixed(2)}`);
        }
      }
      await pg.close();
    }
  }
  await ctx.close();
  // Every place, both scenarios, unrounded: the projected climate the whole app reads.
  for (const scn of ["ssp245", "ssp585"] as const) for (const p of PLACES) {
    const ref = ref2050(p.id, scn); const c = projectPlace(p, scn).climate;
    const got = { sh: mean(c.tempHighC, [5, 6, 7]), wl: mean(c.tempLowC, [11, 0, 1]), ap: c.precipMm.reduce((a, b) => a + b, 0) };
    for (const k of ["sh", "wl", "ap"] as const) {
      n++;
      if (Math.abs(got[k] - ref.fut[k]) > 1e-6) errs.push(`${scn} ${p.id} projected ${k}: app ${got[k].toFixed(2)}, rules give ${ref.fut[k].toFixed(2)}`);
    }
  }
  // S8c: what the 2050 layer says about itself must match what it does: changes are
  // applied to the 1996–2025 averages, and no place has ensemble (NEX) data loaded.
  {
    const said: string[] = [];
    const pg = await open(await newCtx(browser), "/?scn=ssp245");
    await firstCard(pg); await pg.locator(".scenario-remap").first().waitFor({ timeout: 15000 }).catch(() => {});
    const text = await pg.evaluate(() => {
      const titles = [...document.querySelectorAll("[title]")].map(e => e.getAttribute("title") ?? "");
      return `${document.body.innerText}\n${titles.join("\n")}`;
    });
    if (/change from 1991.2020/i.test(text)) said.push("2050 summary: changes 'from 1991–2020 normals' (they are applied to 1996–2025)");
    const nex = (RECORDS as Array<{ projection?: { modelCount?: number } }>).filter(r => (r.projection?.modelCount ?? 0) > 0).length;
    if (nex === 0 && /ensemble median/i.test(text)) said.push("climate layer: claims an 'ensemble median' but no place has ensemble data");
    await pg.close();
    record("S8c", "2050 layer misdescribes its baseline or source", said.length, "0", said.length === 0, said);
    for (const x of said) console.log(`        ${x}`);
  }
  record("S7e", "2050 figures that differ from records + documented projection (all places' projected climate; cards and 2050 summary chips; both scenarios)", `${errs.length} of ${n}`, "0", errs.length === 0 && n > 0, errs.slice(0, 30));
  for (const e of errs.slice(0, 8)) console.log(`        ${e}`);
}

// ---------------------------------------------------------------- main
async function main() {
  const started = Date.now();
  if (want("search")) sectionSearch();
  if (want("notes") || want("accuracy")) sectionNotes();
  let browser: Browser | null = null;
  const nodeOnly = ONLY != null && ONLY.every(x => x === "search" || x === "notes");
  if (!nodeOnly) try {
    await startServer();
    browser = await chromium.launch({ executablePath: chromePath() });
    if (want("jobs")) await sectionJobs(browser);
    if (want("jobs") || want("profile")) await sectionProfileFields(browser);
    if (want("data")) await sectionData(browser);
    if (want("recover")) await sectionRecover(browser);
    if (want("speed")) await sectionSpeed(browser);
    if (want("accuracy")) await sectionAccuracy(browser);
    if (want("accuracy") || want("2050")) await section2050(browser);
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
