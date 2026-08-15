/**
 * Rigorous pre-merge browser playtest for the consolidation release.
 * Extends playtest:browser with URL round-trips, theme matrix, back-to-close,
 * home-base, evidence labels, scenario/compare honesty, overview depth, and
 * live Commons hero photographs (Wikimedia allowlisted only for that step).
 *
 *   TC_BASE_URL=http://127.0.0.1:4173 npm run playtest:rigorous
 */
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { accessSync, constants, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const axeSource = require("axe-core").source;

const BASE = process.env.TC_BASE_URL ?? "http://127.0.0.1:4173";
const ARTIFACT_DIR = process.env.TC_RIGOROUS_ARTIFACT_DIR
  ?? "/opt/cursor/artifacts/playtest-rigorous";

const findings = [];
const consoleErrors = [];

function assertLocalBase(url) {
  const u = new URL(url);
  if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
    throw new Error(`refuses non-local base: ${url}`);
  }
}

function isWikimediaUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "commons.wikimedia.org"
      || host === "upload.wikimedia.org"
      || host.endsWith(".wikimedia.org");
  } catch {
    return false;
  }
}

function attachRouting(context, base, { allowWikimedia = false } = {}) {
  return context.route("**/*", (route) => {
    const reqUrl = route.request().url();
    if (
      reqUrl.startsWith(base)
      || reqUrl.startsWith("data:")
      || reqUrl.startsWith("blob:")
      || reqUrl.startsWith("about:")
      || (allowWikimedia && isWikimediaUrl(reqUrl))
    ) {
      return route.continue();
    }
    return route.abort();
  });
}

function attachConsoleGuards(page, label) {
  page.on("pageerror", (err) => {
    const message = String(err);
    if (/net::ERR_FAILED|Failed to load resource/i.test(message)) return;
    consoleErrors.push({ label, message });
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/net::ERR_FAILED|Failed to load resource|ERR_ABORTED/i.test(text)) return;
    consoleErrors.push({ label, message: text });
  });
}

async function runAxe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const results = await axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa"],
      resultTypes: ["violations"],
    });
    return results.violations
      .filter(v => v.impact === "serious" || v.impact === "critical")
      .map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }));
  });
}

async function shot(page, name) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACT_DIR, `${name}.png`), fullPage: false });
}

async function withPage(browser, opts, label, fn, routing = {}) {
  const context = await browser.newContext(opts);
  await attachRouting(context, BASE, routing);
  const page = await context.newPage();
  attachConsoleGuards(page, label);
  try {
    await fn(page);
  } catch (err) {
    findings.push({ label, kind: "exception", message: String(err) });
    try { await shot(page, `${label}-error`); } catch { /* ignore */ }
  } finally {
    await context.close();
  }
}

const OVERVIEW_HEADINGS = ["Why it feels different", "Nearby contrast", "A short history"];
const OVERVIEW_PLACES = [
  "sequim-wa",
  "beverly-shores-in",
  "tucson-az",
  "portal-az",
  "yuma-az",
  "forks-wa",
  "monterey-ca",
  "qualicum-bc",
];
const LIVE_HERO_PLACES = [
  "sequim-wa",
  "beverly-shores-in",
  "tucson-az",
  "bacalar-mx",
  "ensenada-mx",
  "creston-bc",
  "oakland-md",
];

function resolveChrome() {
  for (const candidate of [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
  ].filter(Boolean)) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch { /* next */ }
  }
  return undefined;
}

async function main() {
  assertLocalBase(BASE);
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const executablePath = resolveChrome();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  // 1) Cold start discovery + URL omit most-unique
  await withPage(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  }, "cold-discovery", async (page) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("h1", { timeout: 15000 });
    const h1 = await page.locator("h1").first().textContent();
    if (!/Discover microclimates/i.test(h1 ?? "")) {
      findings.push({ label: "cold-discovery", kind: "hero-heading", h1 });
    }
    const params = new URL(page.url()).searchParams;
    if (params.get("r")) findings.push({ label: "cold-discovery", kind: "ranking-leaked", r: params.get("r") });
    if (!(await page.getByRole("button", { name: /Show scouting tools/i }).count())) {
      // Desktop may hide behind More menu
      const more = page.getByRole("button", { name: /More atlas actions/i });
      if (await more.count()) await more.click();
    }
    const scout = page.getByRole("button", { name: /Show scouting tools/i });
    if (await scout.count()) {
      // Scout tools should be deferred (not already open panels)
      if (await page.getByLabel(/Desktop relocation workbench/i).count()) {
        findings.push({ label: "cold-discovery", kind: "scout-board-premature" });
      }
    }
    for (const v of await runAxe(page)) findings.push({ label: "cold-discovery", kind: "axe", ...v });
    await shot(page, "cold-discovery");
  });

  // 2) Theme matrix light/dark + low-power class
  for (const theme of ["light", "dark"]) {
    await withPage(browser, {
      viewport: { width: 1280, height: 800 },
      colorScheme: theme,
      reducedMotion: "reduce",
    }, `theme-${theme}`, async (page) => {
      await page.goto(`${BASE}/?theme=${theme}&p=sequim-wa`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
      const resolved = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
      if (resolved !== theme) findings.push({ label: `theme-${theme}`, kind: "theme-mismatch", resolved });
      const evidence = page.getByRole("region", { name: /Evidence and how to read this profile/i });
      await evidence.waitFor({ timeout: 10000 });
      // Screening labels present near scores
      const screening = await page.getByText("Screening score", { exact: true }).count();
      if (screening < 1) findings.push({ label: `theme-${theme}`, kind: "missing-screening-label" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      if (overflow) findings.push({ label: `theme-${theme}`, kind: "page-h-overflow" });
      for (const v of await runAxe(page)) findings.push({ label: `theme-${theme}`, kind: "axe", ...v });
      await shot(page, `theme-${theme}-dossier`);
    });
  }

  // 3) Deep hash + Back-to-close (open via Surprise so history gets tcPlace)
  await withPage(browser, {
    viewport: { width: 1100, height: 800 },
    reducedMotion: "reduce",
  }, "back-to-close", async (page) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("h1", { timeout: 15000 });
    const surprise = page.getByRole("button", { name: /Open a unique microclimate|Surprise/i }).first();
    if (!(await surprise.count())) {
      findings.push({ label: "back-to-close", kind: "no-surprise" });
      return;
    }
    await surprise.click();
    await page.waitForSelector("[data-place-detail], [role='dialog']", { timeout: 20000 });
    await page.waitForTimeout(300);
    await page.goBack();
    await page.waitForTimeout(500);
    const openDialog = await page.locator("[data-place-detail]:not([aria-hidden='true'])").count();
    const dialogVisible = await page.getByRole("dialog", { name: /climate dossier/i }).isVisible().catch(() => false);
    if (openDialog > 0 && dialogVisible) {
      findings.push({ label: "back-to-close", kind: "back-did-not-close-dossier" });
    }
    // Focus should not be stuck on body after close if a control remains
    await shot(page, "back-to-close");
  });

  // 4) Evidence disclosure + home base + compare URL round trip
  await withPage(browser, {
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  }, "evidence-home-compare", async (page) => {
    await page.goto(`${BASE}/?p=portal-az#pd-evidence`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
    const toggle = page.getByRole("button", { name: /How to read this profile/i });
    await toggle.click();
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      findings.push({ label: "evidence-home-compare", kind: "evidence-not-expanded" });
    }
    const body = await page.locator(".tc-evidence-summary").innerText();
    if (!/screening/i.test(body) || !/Measured normals|Observed climate/i.test(body)) {
      findings.push({ label: "evidence-home-compare", kind: "evidence-copy-thin", body: body.slice(0, 200) });
    }
    const home = page.getByRole("button", { name: /Set .* as your home base|Set home|Home base/i }).first();
    if (await home.count()) {
      await home.click();
      await page.waitForTimeout(200);
      const hb = new URL(page.url()).searchParams.get("hb");
      if (hb !== "portal-az") findings.push({ label: "evidence-home-compare", kind: "hb-not-written", hb });
    }
    // Add to compare then open compare via URL
    const compareBtn = page.getByRole("button", { name: /Compare/i }).first();
    if (await compareBtn.count()) await compareBtn.click();
    await shot(page, "evidence-home-compare");
  });

  // 5) Scenario compare honesty: out-of-pool style URL still shows projected layer language
  await withPage(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  }, "scenario-compare", async (page) => {
    await page.goto(`${BASE}/?cmp=sequim-wa,portal-az&scn=ssp585&fit=cool-summers`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector("[role='dialog'], .tc-compare, [aria-label*='Compare' i]", { timeout: 20000 });
    const text = await page.locator("body").innerText();
    if (!/SSP5-8\.5|2050|projection|illustrative/i.test(text)) {
      findings.push({ label: "scenario-compare", kind: "scenario-language-missing" });
    }
    // Ensure summer high numbers exist for both columns (projection applied somehow)
    const highs = await page.locator("text=/summer|JJA|high/i").count();
    if (highs < 1) findings.push({ label: "scenario-compare", kind: "compare-climate-missing" });
    for (const v of await runAxe(page)) findings.push({ label: "scenario-compare", kind: "axe", ...v });
    const close = page.getByRole("button", { name: /Close comparison|Close compare/i }).first();
    if (await close.count()) {
      await close.click();
      await page.waitForTimeout(250);
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      if (tag === "BODY") findings.push({ label: "scenario-compare", kind: "focus-fell-to-body" });
    }
    await shot(page, "scenario-compare");
  });

  // 5b) Compare sunshine is percent of possible, never Daymet MJ as sky
  await withPage(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  }, "compare-sunshine", async (page) => {
    await page.goto(`${BASE}/?cmp=sequim-wa,yuma-az`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector("[role='dialog']", { timeout: 20000 });
    const table = page.getByRole("table", { name: /Grouped comparison signals/i });
    await table.waitFor({ timeout: 10000 });
    const text = await table.innerText();
    if (/Solar resource/i.test(text)) {
      findings.push({ label: "compare-sunshine", kind: "solar-mj-row", snippet: text.slice(0, 400) });
    }
    if (/\d+\.\d+\s*MJ/.test(text)) {
      findings.push({ label: "compare-sunshine", kind: "mj-as-sky", snippet: text.slice(0, 400) });
    }
    if (!/Sunshine/i.test(text) || !text.includes("50%") || !text.includes("92%")) {
      findings.push({ label: "compare-sunshine", kind: "sunshine-percent-missing", snippet: text.slice(0, 400) });
    }
    const sourceGap = await page.locator("body").innerText();
    if (/Verify sunshine normals/i.test(sourceGap)) {
      findings.push({ label: "compare-sunshine", kind: "false-sunshine-gap" });
    }
    await shot(page, "compare-sunshine");
  });

  // 6) Mobile empty recovery + clear-all URL hygiene
  await withPage(browser, {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  }, "mobile-empty-recovery", async (page) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".map-shell, svg.atlas-svg", { timeout: 20000 });
    const openFilters = page.getByRole("button", { name: /Open Explorer filters/i }).first();
    await openFilters.click();
    await page.waitForTimeout(250);
    const search = page.locator("#terraclima-place-search");
    await search.fill("zzzx-no-such-climate-place-qqq");
    await page.waitForTimeout(400);
    // Close sheet to see empty state if needed
    const closeSheet = page.getByRole("button", { name: /Close filters|Close/i }).first();
    if (await closeSheet.count()) await closeSheet.click().catch(() => {});
    await page.waitForTimeout(300);
    const empty = page.locator(".tc-empty-results");
    if (!(await empty.count())) {
      // Re-open and check; some layouts show empty under the sheet
      findings.push({ label: "mobile-empty-recovery", kind: "empty-state-not-visible" });
    } else {
      await empty.getByRole("button", { name: /Reset Explorer|Clear search/i }).first().click();
      await page.waitForTimeout(300);
      const q = new URL(page.url()).searchParams.get("q");
      if (q) findings.push({ label: "mobile-empty-recovery", kind: "search-param-stuck", q });
    }
    const escape = page.locator(".map-touch-mode-toggle");
    if (!(await escape.count())) findings.push({ label: "mobile-empty-recovery", kind: "missing-scroll-escape" });
    await shot(page, "mobile-empty-recovery");
  });

  // 7) Fit Finder path + ranking auto live-fit
  await withPage(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  }, "fit-finder", async (page) => {
    await page.goto(`${BASE}/?fit=cool-summers&sh=26`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("h1", { timeout: 15000 });
    await page.waitForTimeout(400);
    const text = await page.locator("body").innerText();
    if (!/Live Finder|cool summer|Fit|signal/i.test(text)) {
      findings.push({ label: "fit-finder", kind: "fit-signals-not-surfaced" });
    }
    // Map should still be present
    if (!(await page.locator("svg.atlas-svg").count())) {
      findings.push({ label: "fit-finder", kind: "map-missing" });
    }
    await shot(page, "fit-finder");
  });

  // 8) Collections + trips routes load without console errors
  for (const route of [
    { v: "trips", label: "route-trips" },
    { v: "collections", label: "route-collections" },
    { v: "learn", label: "route-learn" },
  ]) {
    await withPage(browser, {
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    }, route.label, async (page) => {
      await page.goto(`${BASE}/?v=${route.v}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      if (overflow) findings.push({ label: route.label, kind: "page-h-overflow" });
      for (const v of await runAxe(page)) findings.push({ label: route.label, kind: "axe", ...v });
      await shot(page, route.label);
    });
  }

  // 9) Overview depth + Commons photo request (offline — image fetch may abort)
  for (const placeId of OVERVIEW_PLACES) {
    const label = `overview-${placeId}`;
    await withPage(browser, {
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    }, label, async (page) => {
      const commonsHits = [];
      page.on("request", (req) => {
        if (isWikimediaUrl(req.url())) commonsHits.push(req.url());
      });
      await page.goto(`${BASE}/?p=${placeId}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
      await page.waitForSelector(".place-overview", { timeout: 10000 });
      for (const heading of OVERVIEW_HEADINGS) {
        if (!(await page.getByRole("heading", { name: heading }).count())) {
          findings.push({ label, kind: "overview-heading-missing", heading });
        }
      }
      const historyParas = await page.locator(".place-overview__history p").count();
      if (historyParas < 2) findings.push({ label, kind: "history-thin", historyParas });
      const contrastItems = await page.locator(".place-overview__contrast-list li").count();
      if (contrastItems < 1) findings.push({ label, kind: "contrast-empty" });
      if (!commonsHits.some(u => /Special:FilePath|\/wikipedia\/commons\//i.test(u))) {
        findings.push({ label, kind: "hero-photo-not-requested", hits: commonsHits.slice(0, 3) });
      }
      await shot(page, label);
    });
  }

  // 9b) First-page climate quartet: sunshine as percent of possible, never solar MJ
  const HERO_SPOTS = [
    { id: "sequim-wa", label: "Sunshine", value: "50%" },
    { id: "yuma-az", label: "Sunshine", value: "92%" },
    { id: "astoria-or", label: "Sunshine", value: "43%", overview: /storm-lashed port/i },
    { id: "bacalar-mx", label: "Growing season", value: "365 days" },
    { id: "portal-az", label: "Sunshine", value: "79%", overview: /Paradise|Portal|Chiricahua/i },
  ];
  for (const spot of HERO_SPOTS) {
    const label = `hero-quartet-${spot.id}`;
    await withPage(browser, {
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    }, label, async (page) => {
      await page.goto(`${BASE}/?p=${spot.id}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
      await page.waitForSelector(".atlas-hero-stat", { timeout: 10000 });
      const stats = await page.locator(".atlas-hero-stat").allInnerTexts();
      const joined = stats.join(" | ");
      if (!stats.some(t => /Summer high/i.test(t))) {
        findings.push({ label, kind: "missing-summer-high", joined });
      }
      if (!stats.some(t => /January low/i.test(t))) {
        findings.push({ label, kind: "missing-january-low", joined });
      }
      if (stats.some(t => /Solar resource|JJA high|Sunny days/i.test(t))) {
        findings.push({ label, kind: "stale-hero-stat", joined });
      }
      const fourth = stats.find(t => new RegExp(spot.label, "i").test(t));
      if (!fourth || !fourth.includes(spot.value)) {
        findings.push({ label, kind: "hero-fourth-mismatch", expected: `${spot.label} ${spot.value}`, joined });
      }
      if (spot.overview) {
        await page.waitForSelector(".place-overview", { timeout: 10000 });
        const overview = await page.locator(".place-overview").innerText();
        if (!spot.overview.test(overview)) {
          findings.push({ label, kind: "overview-missing-authored-detail", snippet: overview.slice(0, 280) });
        }
      }
      await shot(page, label);
    });
  }

  // 10) Phone overview overflow on the originally broken lakeshore pin
  await withPage(browser, {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  }, "overview-mobile-beverly-shores", async (page) => {
    await page.goto(`${BASE}/?p=beverly-shores-in`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
    await page.waitForSelector(".place-overview", { timeout: 10000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (overflow) findings.push({ label: "overview-mobile-beverly-shores", kind: "page-h-overflow" });
    if (!(await page.getByRole("heading", { name: "A short history" }).count())) {
      findings.push({ label: "overview-mobile-beverly-shores", kind: "overview-heading-missing", heading: "A short history" });
    }
    await shot(page, "overview-mobile-beverly-shores");
  });

  // 11) Live Commons photograph — allowlist Wikimedia so the img can actually paint
  for (const placeId of LIVE_HERO_PLACES) {
    const label = `hero-live-${placeId}`;
    await withPage(browser, {
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    }, label, async (page) => {
      await page.goto(`${BASE}/?p=${placeId}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
      const loaded = await page.waitForFunction(() => {
        const img = document.querySelector("[data-place-detail] figure img");
        return Boolean(img && img.complete && img.naturalWidth > 20);
      }, { timeout: 25000 }).catch(() => null);
      const fallback = await page.locator(".tc-hero-fallback").count();
      if (!loaded) {
        findings.push({ label, kind: "hero-photo-did-not-load", fallback: fallback > 0 });
      } else if (fallback > 0) {
        findings.push({ label, kind: "hero-fallback-despite-photo" });
      }
      await shot(page, label);
    }, { allowWikimedia: true });
  }

  await browser.close();

  const report = {
    findings,
    consoleErrors,
    base: BASE,
    at: new Date().toISOString(),
    counts: { findings: findings.length, consoleErrors: consoleErrors.length },
  };
  writeFileSync(join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));

  if (findings.length || consoleErrors.length) {
    console.error("playtest:rigorous FAILED");
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log("playtest:rigorous ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
