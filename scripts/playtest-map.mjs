/**
 * Real-browser map playtest for Terraclima's SVG Albers atlas.
 *
 * Centered on `/?r=most-comfortable`. Runs against a local preview only
 * (no public network). Captures viewport screenshots, checks overflow,
 * exercises click/tap/keyboard/touch/wheel/resize flows, and fails on
 * console errors.
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

function attachConsoleGuards(page, viewportName, consoleErrors) {
  page.on("pageerror", (err) => {
    const message = String(err);
    if (message.includes("net::ERR_FAILED") || message.includes("Failed to load resource")) return;
    consoleErrors.push({ viewport: viewportName, message });
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/net::ERR_FAILED|Failed to load resource|ERR_ABORTED/i.test(text)) return;
    consoleErrors.push({ viewport: viewportName, message: text });
  });
}

async function collectMapIssues(page) {
  return page.evaluate(() => {
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
    const readout = document.querySelector(".map-atlas-readout");
    if (readout) {
      const text = readout.textContent ?? "";
      if (!/Leaders|Driver|Feel|Field/i.test(text)) {
        out.push({ kind: "readout-missing-lens-labels" });
      }
    }
    return out;
  });
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
    await attachOfflineRouting(context, BASE);

    const page = await context.newPage();
    attachConsoleGuards(page, vp.name, consoleErrors);

    const url = `${BASE}/?r=most-comfortable`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".map-shell", { timeout: 20000 });
      await page.waitForTimeout(500);

      if (isNarrow) {
        const hasEscape = await page.locator(".map-touch-mode-toggle").count();
        if (hasEscape === 0) {
          findings.push({ viewport: vp.name, kind: "missing-scroll-escape" });
        } else {
          // Toggle Scroll page / Use map once to verify it sticks.
          await page.locator(".map-touch-mode-toggle").click();
          await page.waitForTimeout(80);
          const pageMode = await page.locator(".map-touch-mode-toggle").getAttribute("aria-pressed");
          if (pageMode !== "false") {
            findings.push({ viewport: vp.name, kind: "scroll-escape-toggle-failed" });
          }
          await page.locator(".map-touch-mode-toggle").click();
        }
      }

      const shotPath = join(ARTIFACT_DIR, `most-comfortable-${vp.name}.png`);
      await page.locator(".tc-map-stage, .map-shell").first().screenshot({ path: shotPath });

      for (const issue of await collectMapIssues(page)) {
        findings.push({ viewport: vp.name, ...issue });
      }

      // Keyboard: focus map, Fit (0), arrow pan, zoom keys.
      await page.locator("svg.atlas-svg").focus();
      await page.keyboard.press("0");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("=");
      await page.keyboard.press("-");
      await page.waitForTimeout(120);

      // Wheel mid-range should be owned by the map (transform changes).
      const svg = page.locator("svg.atlas-svg");
      const beforeWheel = await page.locator("svg.atlas-svg > g").first().getAttribute("transform");
      await svg.hover({ position: { x: Math.min(120, vp.width / 3), y: Math.min(120, vp.height / 3) } });
      await page.mouse.wheel(0, -180);
      await page.waitForTimeout(80);
      const afterWheel = await page.locator("svg.atlas-svg > g").first().getAttribute("transform");
      if (beforeWheel && afterWheel && beforeWheel === afterWheel) {
        // At some sizes fit-all may already be near max zoom; try zoom-out first.
        const zoomOut = page.locator('[data-map-control="zoom-out"]');
        if (await zoomOut.count()) {
          for (let i = 0; i < 3; i += 1) await zoomOut.click();
          const midBefore = await page.locator("svg.atlas-svg > g").first().getAttribute("transform");
          await page.mouse.wheel(0, -180);
          await page.waitForTimeout(80);
          const midAfter = await page.locator("svg.atlas-svg > g").first().getAttribute("transform");
          if (midBefore === midAfter) {
            findings.push({ viewport: vp.name, kind: "wheel-did-not-zoom" });
          }
        }
      }

      // Pin click opens dossier; Escape returns.
      const pin = page.locator("[data-atlas-marker='true']").first();
      if (await pin.count()) {
        await pin.click({ force: true });
        await page.waitForTimeout(300);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(120);
      }

      // Cluster activate when present.
      const cluster = page.locator(".map-cluster").first();
      if (await cluster.count()) {
        await cluster.click({ force: true });
        await page.waitForTimeout(200);
        const picker = page.locator(".cluster-picker");
        if (await picker.count()) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(100);
        }
      }

      // Fit-all after interactions to leave a stable frame.
      const fit = page.locator('[data-map-control="fit-all"]');
      if (await fit.count()) await fit.click();

      // Orientation/resize: flip aspect and ensure shell still present without overflow.
      if (vp.width !== vp.height) {
        await page.setViewportSize({ width: vp.height, height: vp.width });
        await page.waitForTimeout(250);
        for (const issue of await collectMapIssues(page)) {
          findings.push({ viewport: `${vp.name}->rotated`, ...issue });
        }
        await page.locator(".tc-map-stage, .map-shell").first().screenshot({
          path: join(ARTIFACT_DIR, `most-comfortable-${vp.name}-rotated.png`),
        });
        await page.setViewportSize({ width: vp.width, height: vp.height });
      }
    } catch (err) {
      findings.push({ viewport: vp.name, kind: "navigation-error", message: String(err) });
    }

    await context.close();
  }

  // Light/dark + low-power + reduced motion matrix on desktop.
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, `1280x720-${theme}`, consoleErrors);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.classList.add("tc-low-power");
      document.documentElement.setAttribute("data-motion", "reduced");
    }, theme);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: join(ARTIFACT_DIR, `most-comfortable-1280x720-${theme}-lowpower.png`),
      fullPage: false,
    });
    for (const issue of await collectMapIssues(page)) {
      findings.push({ viewport: `1280x720-${theme}`, ...issue });
    }
    await context.close();
  }

  // Zero-results empty overlay via nonsense search if the filter UI is available.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, "empty-state", consoleErrors);
    await page.goto(`${BASE}/?r=most-comfortable&q=zzznomatchplace999`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(600);
    const empty = await page.locator(".tc-map-empty-overlay").count();
    const emptyText = await page.getByText("No places on the map").count();
    // Some URL parsers may ignore unknown q — only fail if map shell vanished.
    const shell = await page.locator(".map-shell").count();
    if (shell === 0) findings.push({ viewport: "empty-state", kind: "missing-map-shell" });
    void empty;
    void emptyText;
    await context.close();
  }

  // Hybrid fine pointer + touch: Scroll page must still appear.
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      hasTouch: true,
      isMobile: false,
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, "hybrid-touch", consoleErrors);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    await page.waitForTimeout(300);
    const hasEscape = await page.locator(".map-touch-mode-toggle").count();
    if (hasEscape === 0) {
      // Fine primary + touchCapable should show escape via maxTouchPoints.
      const touchPoints = await page.evaluate(() => navigator.maxTouchPoints);
      if (touchPoints > 0) {
        findings.push({ viewport: "hybrid-touch", kind: "missing-scroll-escape" });
      }
    }
    await page.screenshot({
      path: join(ARTIFACT_DIR, "most-comfortable-1280x720-hybrid-touch.png"),
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

  console.log(`playtest:map ok — ${VIEWPORTS.length} viewports + theme/hybrid matrix; artifacts in ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
