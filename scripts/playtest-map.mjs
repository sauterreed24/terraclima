/**
 * Real-browser map playtest for Terraclima's SVG Albers atlas.
 *
 * Centered on `/?r=most-comfortable`. Runs against a local preview only
 * (no public network). Captures viewport screenshots, checks overflow,
 * exercises click/tap/keyboard flows, and fails on console errors.
 *
 *   npm run build && npm run preview &
 *   npm i --no-save playwright-core
 *   npx playwright install chromium
 *   npm run playtest:map
 *
 * Exits 1 on defect; 0 on a clean sweep.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.TC_BASE_URL ?? "http://localhost:4173";
const ARTIFACT_DIR = process.env.TC_MAP_ARTIFACT_DIR
  ?? "/opt/cursor/artifacts/playtest-map";

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x800", width: 360, height: 800 },
];

function assertLocalBase(url) {
  const u = new URL(url);
  if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
    throw new Error(`playtest:map refuses non-local base URL: ${url}`);
  }
}

async function main() {
  assertLocalBase(BASE);
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const findings = [];
  const consoleErrors = [];

  for (const vp of VIEWPORTS) {
    const isNarrow = vp.width <= 430;
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: isNarrow,
      isMobile: isNarrow,
      reducedMotion: "reduce",
    });
    await context.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (
        reqUrl.startsWith(BASE)
        || reqUrl.startsWith("data:")
        || reqUrl.startsWith("blob:")
        || reqUrl.startsWith("about:")
      ) {
        return route.continue();
      }
      // Intentionally offline: drop public network without treating aborts as failures.
      return route.abort();
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => {
      const message = String(err);
      if (message.includes("net::ERR_FAILED") || message.includes("Failed to load resource")) return;
      consoleErrors.push({ viewport: vp.name, message });
    });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      // Route-abort noise from the offline network policy.
      if (/net::ERR_FAILED|Failed to load resource|ERR_ABORTED/i.test(text)) return;
      consoleErrors.push({ viewport: vp.name, message: text });
    });
    page.on("requestfailed", (req) => {
      // Expected when the offline route policy aborts non-local URLs.
      void req;
    });

    const url = `${BASE}/?r=most-comfortable`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".map-shell", { timeout: 20000 });
      await page.waitForTimeout(400);

      // Touch-sized viewports should expose Scroll page escape before other flows.
      if (isNarrow) {
        const hasEscape = await page.locator(".map-touch-mode-toggle").count();
        if (hasEscape === 0) {
          findings.push({ viewport: vp.name, kind: "missing-scroll-escape" });
        }
      }

      const shotPath = join(ARTIFACT_DIR, `most-comfortable-${vp.name}.png`);
      await page.locator(".tc-map-stage, .map-shell").first().screenshot({ path: shotPath });

      const issues = await page.evaluate(() => {
        const out = [];
        const shell = document.querySelector(".map-shell");
        if (!shell) {
          out.push({ kind: "missing-map-shell" });
          return out;
        }
        if (shell.scrollWidth > shell.clientWidth + 2) {
          out.push({
            kind: "map-shell-h-overflow",
            extra: shell.scrollWidth - shell.clientWidth,
          });
        }
        const stage = document.querySelector(".tc-map-stage");
        if (stage && stage.scrollWidth > stage.clientWidth + 2) {
          out.push({
            kind: "map-stage-h-overflow",
            extra: stage.scrollWidth - stage.clientWidth,
          });
        }
        const svg = document.querySelector("svg.atlas-svg");
        if (!svg) out.push({ kind: "missing-atlas-svg" });
        const focusTargets = document.querySelectorAll("[data-atlas-focus-target='true']");
        const tabZero = Array.from(focusTargets).filter((el) => el.getAttribute("tabindex") === "0");
        if (focusTargets.length > 0 && tabZero.length !== 1) {
          out.push({ kind: "roving-tabindex", tabZero: tabZero.length, total: focusTargets.length });
        }
        const clusters = document.querySelectorAll(".map-cluster");
        if (clusters.length > 1) {
          const allTab0 = Array.from(clusters).every((el) => el.getAttribute("tabindex") === "0");
          if (allTab0) out.push({ kind: "clusters-all-tabstops" });
        }
        return out;
      });
      for (const issue of issues) {
        findings.push({ viewport: vp.name, ...issue });
      }

      // Keyboard: focus map application and press Fit (0).
      await page.locator("svg.atlas-svg").focus();
      await page.keyboard.press("0");
      await page.waitForTimeout(120);

      // Click/tap a visible pin if present.
      const pin = page.locator("[data-atlas-marker='true']").first();
      if (await pin.count()) {
        await pin.click({ force: true });
        await page.waitForTimeout(250);
        // Close dossier if it opened so later viewports stay clean.
        const close = page.locator('[aria-label*="Close"], [aria-label*="close"]').first();
        if (await close.count()) {
          try { await close.click({ timeout: 1500 }); } catch { /* ignore */ }
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      }

      // Empty-state smoke: nonsense search if filter UI is present is optional;
      // verify Fit still works after pin interaction.
      const fit = page.locator('[data-map-control="fit-all"]');
      if (await fit.count()) await fit.click();
    } catch (err) {
      findings.push({ viewport: vp.name, kind: "navigation-error", message: String(err) });
    }

    await context.close();
  }

  // Extra matrix: light theme + low-power class on one desktop size.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.startsWith(BASE) || reqUrl.startsWith("data:") || reqUrl.startsWith("blob:")) {
        return route.continue();
      }
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("tc-low-power");
      document.documentElement.setAttribute("data-motion", "reduced");
    });
    await page.waitForTimeout(200);
    await page.screenshot({
      path: join(ARTIFACT_DIR, "most-comfortable-1280x720-dark-lowpower.png"),
      fullPage: false,
    });
    await context.close();
  }

  await browser.close();

  const report = { findings, consoleErrors, artifactDir: ARTIFACT_DIR, base: BASE };
  writeFileSync(join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));

  if (consoleErrors.length > 0) {
    console.error("Console errors:");
    for (const e of consoleErrors) console.error(`  [${e.viewport}] ${e.message}`);
  }
  if (findings.length > 0) {
    console.error("Map playtest findings:");
    for (const f of findings) console.error(`  ${JSON.stringify(f)}`);
    process.exit(1);
  }
  if (consoleErrors.length > 0) process.exit(1);

  console.log(`playtest:map ok — ${VIEWPORTS.length} viewports; artifacts in ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
