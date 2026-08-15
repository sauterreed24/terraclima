/**
 * Terraclima browser smoke suite (Playwright).
 *
 * Runs against a local production preview only and blocks external network
 * requests except local app resources, data URLs, and blob URLs.
 *
 * Not part of `npm run quality:check` (keeps local iteration fast). CI runs
 * this via `.github/workflows/browser-smoke.yml`.
 *
 *   npm run build
 *   npm run preview -- --host 127.0.0.1 --port 4173 &
 *   npx playwright install chromium
 *   npm run playtest:browser
 *
 * Artifacts (screenshots/traces) land under TC_BROWSER_ARTIFACT_DIR on failure.
 */
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const axeSource = require("axe-core").source;

const BASE = process.env.TC_BASE_URL ?? "http://127.0.0.1:4173";
const ARTIFACT_DIR = process.env.TC_BROWSER_ARTIFACT_DIR
  ?? "/opt/cursor/artifacts/playtest-browser";

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900, hasTouch: false },
  { name: "1024x768", width: 1024, height: 768, hasTouch: false },
  { name: "768x1024", width: 768, height: 1024, hasTouch: true },
  { name: "430x932", width: 430, height: 932, hasTouch: true },
  { name: "390x844", width: 390, height: 844, hasTouch: true },
];

function assertLocalBase(url) {
  const u = new URL(url);
  if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
    throw new Error(`playtest:browser refuses non-local base URL: ${url}`);
  }
}

function attachOfflineRouting(context, base) {
  return context.route("**/*", (route) => {
    const reqUrl = route.request().url();
    if (
      reqUrl.startsWith(base)
      || reqUrl.startsWith("data:")
      || reqUrl.startsWith("blob:")
      || reqUrl.startsWith("about:")
    ) {
      return route.continue();
    }
    return route.abort();
  });
}

function attachConsoleGuards(page, label, consoleErrors) {
  page.on("pageerror", (err) => {
    const message = String(err);
    if (message.includes("net::ERR_FAILED") || message.includes("Failed to load resource")) return;
    consoleErrors.push({ label, message });
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/net::ERR_FAILED|Failed to load resource|ERR_ABORTED/i.test(text)) return;
    consoleErrors.push({ label, message: text });
  });
}

async function pageOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      overflowX: doc.scrollWidth > doc.clientWidth + 2,
      delta: doc.scrollWidth - doc.clientWidth,
    };
  });
}

async function runAxe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const results = await axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "best-practice"],
      resultTypes: ["violations"],
    });
    return results.violations
      .filter(v => v.impact === "serious" || v.impact === "critical")
      .map(v => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
      }));
  });
}

async function shot(page, name) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACT_DIR, `${name}.png`), fullPage: false });
}

async function main() {
  assertLocalBase(BASE);
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  const chromeCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  let executablePath;
  for (const candidate of chromeCandidates) {
    try {
      const { accessSync, constants } = await import("node:fs");
      accessSync(candidate, constants.X_OK);
      executablePath = candidate;
      break;
    } catch {
      // try next
    }
  }

  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  const findings = [];
  const consoleErrors = [];

  // ---- Core product routes at representative viewports ----
  for (const vp of VIEWPORTS) {
    const label = `explorer-${vp.name}`;
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.hasTouch,
      isMobile: vp.width <= 430,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, label, consoleErrors);

    try {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".map-shell, [data-testid='atlas-map-stub'], .tc-map-stage", { timeout: 20000 });
      await page.waitForSelector("h1", { timeout: 10000 });

      const heading = await page.locator("h1").first().textContent();
      if (!/microclimate|Discover|Trip|Collection/i.test(heading ?? "")) {
        findings.push({ label, kind: "unexpected-hero-heading", heading });
      }

      // Default discovery posture: Most unique omitted from URL.
      const url = new URL(page.url());
      if (url.searchParams.get("r") && url.searchParams.get("r") !== "most-unique") {
        // Persisted ranking from storage should not appear on a clean context.
        findings.push({ label, kind: "non-default-ranking-on-cold-start", r: url.searchParams.get("r") });
      }

      const overflow = await pageOverflow(page);
      if (overflow.overflowX) {
        findings.push({ label, kind: "page-h-overflow", delta: overflow.delta });
      }

      // Fit Finder / Most comfortable lens.
      const more = page.getByRole("button", { name: /More atlas actions|Show scouting tools|Most comfortable/i }).first();
      if (await more.count()) {
        // Prefer ranking control in filter dock when visible.
      }
      const comfortable = page.getByRole("button", { name: /Most comfortable/i }).first();
      if (await comfortable.count()) {
        await comfortable.click();
        await page.waitForTimeout(200);
      }

      // Empty results recovery: impossible search.
      // On phone widths the search field lives in the filter sheet.
      const search = page.locator("#terraclima-place-search").first();
      if (await search.count()) {
        const visible = await search.isVisible().catch(() => false);
        if (!visible) {
          const openFilters = page.getByRole("button", { name: /Open Explorer filters/i }).first();
          if (await openFilters.count()) {
            await openFilters.click();
            await page.waitForTimeout(250);
          }
        }
        if (await search.isVisible().catch(() => false)) {
          await search.fill("zzzx-no-such-climate-place-qqq");
          await page.waitForTimeout(350);
          const empty = page.locator(".tc-empty-results");
          if (await empty.count()) {
            const reset = empty.getByRole("button", { name: /Reset Explorer|Clear search/i }).first();
            if (await reset.count()) await reset.click();
            await page.waitForTimeout(200);
          } else {
            findings.push({ label, kind: "empty-results-missing" });
          }
        }
      }

      // Shareable URL round trip via Most unique quick pick if present.
      const unique = page.getByRole("button", { name: /^Most unique$/i }).first();
      if (await unique.count()) {
        await unique.click();
        await page.waitForTimeout(150);
      }

      await shot(page, label);

      const axe = await runAxe(page);
      for (const v of axe) findings.push({ label, kind: "axe", ...v });
    } catch (err) {
      findings.push({ label, kind: "exception", message: String(err) });
      try { await shot(page, `${label}-error`); } catch { /* ignore */ }
    } finally {
      await context.close();
    }
  }

  // ---- Phone: compact intro must scroll away, not stick over the place list ----
  {
    const label = "phone-hero-scroll-away";
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, label, consoleErrors);
    try {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".panel-hero", { timeout: 20000 });
      await page.waitForSelector(".place-card, .tc-map-stage", { timeout: 20000 });
      await page.evaluate(() => window.scrollTo(0, 2200));
      await page.waitForTimeout(400);
      const coverage = await page.evaluate(() => {
        const hero = document.querySelector(".panel-hero");
        if (!hero) return { missing: true };
        const hr = hero.getBoundingClientRect();
        const style = getComputedStyle(hero);
        return {
          missing: false,
          position: style.position,
          top: hr.top,
          bottom: hr.bottom,
          height: hr.height,
        };
      });
      if (coverage.missing) {
        findings.push({ label, kind: "hero-missing" });
      } else {
        if (coverage.position === "sticky" || coverage.position === "fixed") {
          findings.push({ label, kind: "hero-stuck-on-phone", position: coverage.position });
        }
        if (coverage.top >= -8 && coverage.bottom > 220) {
          findings.push({
            label,
            kind: "hero-still-covering-list",
            top: coverage.top,
            bottom: coverage.bottom,
            height: coverage.height,
          });
        }
      }
      await shot(page, label);
    } catch (err) {
      findings.push({ label, kind: "exception", message: String(err) });
      try { await shot(page, `${label}-error`); } catch { /* ignore */ }
    } finally {
      await context.close();
    }
  }

  // ---- Stacked tablet/laptop: compact intro must also scroll away (layout stacks until 1500px) ----
  {
    const label = "stacked-hero-scroll-away";
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, label, consoleErrors);
    try {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".panel-hero", { timeout: 20000 });
      await page.evaluate(() => window.scrollTo(0, 2400));
      await page.waitForTimeout(400);
      const coverage = await page.evaluate(() => {
        const hero = document.querySelector(".panel-hero");
        if (!hero) return { missing: true };
        const hr = hero.getBoundingClientRect();
        const style = getComputedStyle(hero);
        return {
          missing: false,
          position: style.position,
          top: hr.top,
          bottom: hr.bottom,
        };
      });
      if (coverage.missing) {
        findings.push({ label, kind: "hero-missing" });
      } else if (coverage.position === "sticky" || coverage.position === "fixed") {
        findings.push({ label, kind: "hero-stuck-on-stacked-layout", position: coverage.position });
      } else if (coverage.top >= -8 && coverage.bottom > 180) {
        findings.push({
          label,
          kind: "hero-still-covering-list",
          top: coverage.top,
          bottom: coverage.bottom,
        });
      }
      await shot(page, label);
    } catch (err) {
      findings.push({ label, kind: "exception", message: String(err) });
      try { await shot(page, `${label}-error`); } catch { /* ignore */ }
    } finally {
      await context.close();
    }
  }

  // ---- Dossier deep link + evidence + close focus ----
  {
    const label = "dossier-sequim";
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
      colorScheme: "dark",
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, label, consoleErrors);
    try {
      const commonsHits = [];
      page.on("request", (req) => {
        if (/wikimedia\.org/i.test(req.url())) commonsHits.push(req.url());
      });
      await page.goto(`${BASE}/?p=sequim-wa#pd-evidence`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
      for (const heading of ["Why it feels different", "Nearby contrast", "A short history"]) {
        if (!(await page.getByRole("heading", { name: heading }).count())) {
          findings.push({ label, kind: "overview-heading-missing", heading });
        }
      }
      if (!commonsHits.some(u => /Special:FilePath|\/wikipedia\/commons\//i.test(u))) {
        findings.push({ label, kind: "hero-photo-not-requested", hits: commonsHits.slice(0, 3) });
      }
      const evidence = page.getByRole("region", { name: /Evidence and how to read this profile/i });
      await evidence.waitFor({ timeout: 10000 });
      const toggle = page.getByRole("button", { name: /How to read this profile/i });
      await toggle.click();
      await page.waitForTimeout(100);
      if ((await toggle.getAttribute("aria-expanded")) !== "true") {
        findings.push({ label, kind: "evidence-toggle-failed" });
      }

      // Bookmark + home + compare controls when present.
      const home = page.getByRole("button", { name: /Set .* as your home base|Set home|Home base/i }).first();
      if (await home.count()) await home.click();

      const compare = page.getByRole("button", { name: /Compare/i }).first();
      if (await compare.count()) await compare.click();

      const close = page.getByRole("button", { name: /Close .* dossier|Close profile|Close/i }).first();
      await close.click();
      await page.waitForTimeout(250);
      const stillOpen = await page.locator("[data-place-detail]").count();
      if (stillOpen > 0) {
        // Mobile drawers may keep DOM; check aria-hidden / inert.
        const hidden = await page.locator("[data-place-detail]").first().evaluate((el) => {
          return el.getAttribute("aria-hidden") === "true" || el.closest("[aria-hidden='true']") != null;
        }).catch(() => false);
        if (!hidden) findings.push({ label, kind: "dossier-did-not-close" });
      }

      const axe = await runAxe(page);
      for (const v of axe) findings.push({ label, kind: "axe", ...v });
      await shot(page, label);
    } catch (err) {
      findings.push({ label, kind: "exception", message: String(err) });
      try { await shot(page, `${label}-error`); } catch { /* ignore */ }
    } finally {
      await context.close();
    }
  }

  // ---- Compare two places + scenario honesty banner path ----
  {
    const label = "compare-two";
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, label, consoleErrors);
    try {
      await page.goto(`${BASE}/?cmp=sequim-wa,portal-az&scn=ssp585`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector("[role='dialog'], .tc-compare, [aria-label*='Compare' i]", { timeout: 20000 });
      const bodyText = await page.locator("body").innerText();
      if (!/SSP5-8\.5|2050|projection|illustrative/i.test(bodyText)) {
        findings.push({ label, kind: "scenario-banner-missing" });
      }
      const close = page.getByRole("button", { name: /Close comparison|Close compare|Close/i }).first();
      if (await close.count()) {
        await close.click();
        await page.waitForTimeout(200);
        const active = await page.evaluate(() => document.activeElement?.tagName);
        if (active === "BODY") {
          findings.push({ label, kind: "compare-focus-fell-to-body" });
        }
      }
      const axe = await runAxe(page);
      for (const v of axe) findings.push({ label, kind: "axe", ...v });
      await shot(page, label);
    } catch (err) {
      findings.push({ label, kind: "exception", message: String(err) });
      try { await shot(page, `${label}-error`); } catch { /* ignore */ }
    } finally {
      await context.close();
    }
  }

  // ---- Map interaction sample (desktop + phone) ----
  for (const vp of [
    { name: "map-desktop", width: 1280, height: 720, hasTouch: false },
    { name: "map-phone", width: 390, height: 844, hasTouch: true },
  ]) {
    const label = vp.name;
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.hasTouch,
      isMobile: vp.hasTouch,
      reducedMotion: "reduce",
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, label, consoleErrors);
    try {
      await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("svg.atlas-svg", { timeout: 20000 });
      await page.locator("svg.atlas-svg").focus();
      await page.keyboard.press("0");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("=");

      if (vp.hasTouch) {
        const escape = page.locator(".map-touch-mode-toggle");
        if (await escape.count()) {
          await escape.click();
          await escape.click();
        } else {
          findings.push({ label, kind: "missing-scroll-escape" });
        }
      }

      const pin = page.locator("[data-atlas-marker='true']").first();
      if (await pin.count()) {
        await pin.click({ force: true });
        await page.waitForTimeout(250);
        await page.keyboard.press("Escape");
      }

      const focusTargets = await page.locator("[data-atlas-focus-target='true']").count();
      const tabZero = await page.locator("[data-atlas-focus-target='true'][tabindex='0']").count();
      if (focusTargets > 0 && tabZero !== 1) {
        findings.push({ label, kind: "roving-tabindex", tabZero, focusTargets });
      }

      await shot(page, label);
    } catch (err) {
      findings.push({ label, kind: "exception", message: String(err) });
      try { await shot(page, `${label}-error`); } catch { /* ignore */ }
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const report = { findings, consoleErrors, base: BASE, at: new Date().toISOString() };
  writeFileSync(join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));

  if (consoleErrors.length || findings.length) {
    console.error("playtest:browser FAILED");
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(`playtest:browser ok (${VIEWPORTS.length} explorer viewports + dossier + compare + map samples)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
