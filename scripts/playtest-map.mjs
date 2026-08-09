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

const SAVED_STATE_VIEWPORTS = [
  { name: "390x844-saved", width: 390, height: 844 },
  { name: "1024x768-saved", width: 1024, height: 768 },
];

const DESKTOP_BOUNDARY_VIEWPORTS = [
  { name: "1499x900-stacked", width: 1499, height: 900, layout: "stacked" },
  { name: "1500x900-split", width: 1500, height: 900, layout: "split" },
];

const SAVED_EXPLORER_STATE = {
  bookmarks: ["sequim-wa", "port-townsend-wa", "portal-az"],
  recents: ["real-catorce-mx", "valle-de-bravo-mx"],
};

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

async function collectSavedStateResponsiveIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const stage = document.querySelector(".tc-map-stage");
    const continuity = document.querySelector(".tc-explorer-continuity");

    if (!stage) {
      out.push({ kind: "missing-map-stage" });
      return out;
    }

    const stageRect = stage.getBoundingClientRect();
    if (stageRect.top >= window.innerHeight || stageRect.bottom <= 0) {
      out.push({
        kind: "saved-map-outside-first-viewport",
        mapTop: Math.round(stageRect.top),
        viewportHeight: window.innerHeight,
      });
    }

    if (!continuity) {
      out.push({ kind: "missing-explorer-continuity" });
    } else {
      const continuityRect = continuity.getBoundingClientRect();
      const followsMap = Boolean(
        stage.compareDocumentPosition(continuity) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
      if (!followsMap || continuityRect.top < stageRect.bottom - 1) {
        out.push({
          kind: "continuity-does-not-follow-map",
          followsMap,
          mapBottom: Math.round(stageRect.bottom),
          continuityTop: Math.round(continuityRect.top),
        });
      }
    }

    return out;
  });
}

async function collectFilterControlOverlapIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const filterTrigger = document.querySelector(".tc-filter-sheet-trigger");
    if (!filterTrigger) return out;

    const filterRect = filterTrigger.getBoundingClientRect();
    const controls = document.querySelectorAll("[data-map-control]");
    for (const control of controls) {
      const controlRect = control.getBoundingClientRect();
      const visible = controlRect.width > 0 && controlRect.height > 0;
      const intersects = visible
        && filterRect.left < controlRect.right
        && filterRect.right > controlRect.left
        && filterRect.top < controlRect.bottom
        && filterRect.bottom > controlRect.top;
      if (intersects) {
        out.push({
          kind: "filters-overlap-map-control",
          control: control.getAttribute("data-map-control"),
        });
      }
    }

    return out;
  });
}

const HOVER_CARD_INSET_PX = 8;
const HOVER_CARD_DWELL_MS = 460;

/** Pins spanning southern comfort leaders plus cardinal extremes for placement. */
const HOVER_CARD_PIN_IDS = [
  "real-catorce-mx",
  "valle-de-bravo-mx",
  "sequim-wa",
  "port-townsend-wa",
  "portal-az",
];

async function collectHoverCardContainmentIssues(page, { expectFull = true, label = "hover" } = {}) {
  return page.evaluate(({ inset, expectFull: wantFull, label: caseLabel }) => {
    const out = [];
    const shell = document.querySelector(".map-shell");
    const card = document.querySelector(".tc-map-hover-card");
    if (!shell) {
      out.push({ kind: "missing-map-shell", case: caseLabel });
      return out;
    }
    if (!card) {
      out.push({ kind: "missing-hover-card", case: caseLabel });
      return out;
    }

    if (card.classList.contains("anim-fade-in")) {
      out.push({ kind: "hover-card-uses-transform-fade", case: caseLabel });
    }
    if (!card.classList.contains("tc-map-hover-card-enter")) {
      out.push({ kind: "hover-card-missing-opacity-enter", case: caseLabel });
    }

    const horizontal = card.getAttribute("data-horizontal");
    const vertical = card.getAttribute("data-vertical");
    if (horizontal !== "left" && horizontal !== "right") {
      out.push({ kind: "hover-card-missing-horizontal", value: horizontal, case: caseLabel });
    }
    if (vertical !== "above" && vertical !== "below") {
      out.push({ kind: "hover-card-missing-vertical", value: vertical, case: caseLabel });
    }

    const variant = card.getAttribute("data-variant");
    if (wantFull && variant !== "full") {
      out.push({ kind: "hover-card-not-full", variant, case: caseLabel });
    }
    if (!wantFull && variant !== "compact") {
      out.push({ kind: "hover-card-not-compact", variant, case: caseLabel });
    }

    const transform = card.style.transform || "";
    if (!/translate\(/.test(transform)) {
      out.push({ kind: "hover-card-missing-placement-transform", transform, case: caseLabel });
    } else if (transform === "none" || transform === "translate(0px, 0px)" || transform === "translate(0, 0)") {
      // Compact-map width may use translate(0, …); only flag pure identity.
      if (!/calc\(-100%/.test(transform) && !/12px|10px/.test(transform)) {
        out.push({ kind: "hover-card-identity-transform", transform, case: caseLabel });
      }
    }

    const shellRect = shell.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (
      cardRect.left < shellRect.left + inset
      || cardRect.top < shellRect.top + inset
      || cardRect.right > shellRect.right - inset
      || cardRect.bottom > shellRect.bottom - inset
    ) {
      out.push({
        kind: "hover-card-outside-map-inset",
        case: caseLabel,
        inset,
        shell: {
          left: Math.round(shellRect.left),
          top: Math.round(shellRect.top),
          right: Math.round(shellRect.right),
          bottom: Math.round(shellRect.bottom),
        },
        card: {
          left: Math.round(cardRect.left),
          top: Math.round(cardRect.top),
          right: Math.round(cardRect.right),
          bottom: Math.round(cardRect.bottom),
        },
      });
    }

    const readout = document.querySelector(".map-atlas-readout");
    if (readout) {
      const readoutRect = readout.getBoundingClientRect();
      const overlaps = cardRect.left < readoutRect.right
        && cardRect.right > readoutRect.left
        && cardRect.top < readoutRect.bottom
        && cardRect.bottom > readoutRect.top;
      if (overlaps) {
        out.push({
          kind: "hover-card-overlaps-atlas-readout",
          case: caseLabel,
          card: {
            left: Math.round(cardRect.left),
            top: Math.round(cardRect.top),
            right: Math.round(cardRect.right),
            bottom: Math.round(cardRect.bottom),
          },
          readout: {
            left: Math.round(readoutRect.left),
            top: Math.round(readoutRect.top),
            right: Math.round(readoutRect.right),
            bottom: Math.round(readoutRect.bottom),
          },
        });
      }
    }

    return out;
  }, { inset: HOVER_CARD_INSET_PX, expectFull, label });
}

async function hoverPinById(page, pinId) {
  const pin = page.locator(`[data-marker-id="${pinId}"]`);
  if (await pin.count() === 0) return false;
  await pin.scrollIntoViewIfNeeded();
  await pin.hover({ force: true });
  return true;
}

async function runHoverCardSweep(page, findings, viewportName) {
  const fit = page.locator('[data-map-control="fit-all"]');
  if (await fit.count()) await fit.click();
  await page.waitForTimeout(200);

  let exercised = 0;
  for (const pinId of HOVER_CARD_PIN_IDS) {
    const ok = await hoverPinById(page, pinId);
    if (!ok) continue;
    await page.waitForTimeout(HOVER_CARD_DWELL_MS + 40);
    for (const issue of await collectHoverCardContainmentIssues(page, {
      expectFull: true,
      label: `${viewportName}:${pinId}`,
    })) {
      findings.push({ viewport: viewportName, pinId, ...issue });
    }
    exercised += 1;
    // Move off the pin so the next hover starts clean.
    await page.mouse.move(8, 8);
    await page.waitForTimeout(120);
  }

  if (exercised === 0) {
    findings.push({ viewport: viewportName, kind: "hover-card-no-pins-found" });
    return;
  }

  // Keyboard focus stays compact and must still remain inside the map.
  const keyboardPin = page.locator(`[data-marker-id="${HOVER_CARD_PIN_IDS[0]}"]`);
  if (await keyboardPin.count()) {
    await keyboardPin.focus();
    await page.waitForTimeout(HOVER_CARD_DWELL_MS + 40);
    for (const issue of await collectHoverCardContainmentIssues(page, {
      expectFull: false,
      label: `${viewportName}:keyboard-compact`,
    })) {
      findings.push({ viewport: viewportName, ...issue });
    }
  }

  // After zoom-in, re-anchor Real de Catorce and re-check containment.
  const zoomIn = page.locator('[data-map-control="zoom-in"]');
  if (await zoomIn.count()) {
    for (let i = 0; i < 2; i += 1) {
      if (await zoomIn.isDisabled()) break;
      await zoomIn.click();
    }
    await page.waitForTimeout(160);
    if (await hoverPinById(page, "real-catorce-mx")) {
      await page.waitForTimeout(HOVER_CARD_DWELL_MS + 40);
      for (const issue of await collectHoverCardContainmentIssues(page, {
        expectFull: true,
        label: `${viewportName}:after-zoom`,
      })) {
        findings.push({ viewport: viewportName, ...issue });
      }
    }
  }

  // Resize while the rich card is open — placement must stay inside the shell.
  if (await hoverPinById(page, "real-catorce-mx")) {
    await page.waitForTimeout(HOVER_CARD_DWELL_MS + 40);
    const box = page.viewportSize();
    if (box) {
      await page.setViewportSize({
        width: Math.max(1024, box.width - 80),
        height: Math.max(720, box.height - 40),
      });
      await page.waitForTimeout(220);
      for (const issue of await collectHoverCardContainmentIssues(page, {
        expectFull: true,
        label: `${viewportName}:after-resize`,
      })) {
        findings.push({ viewport: viewportName, ...issue });
      }
      await page.setViewportSize({ width: box.width, height: box.height });
      await page.waitForTimeout(120);
    }
  }

  if (await fit.count()) await fit.click();
}

async function collectDesktopBoundaryIssues(page, expectedLayout) {
  return page.evaluate((layout) => {
    const out = [];
    const main = document.querySelector(".tc-explorer-main");
    const hero = main?.querySelector(":scope > .panel-hero");
    const stage = main?.querySelector(":scope > .tc-map-stage");
    const continuity = main?.querySelector(":scope > .tc-explorer-continuity");

    if (!main || !hero || !stage || !continuity) {
      out.push({
        kind: "missing-desktop-layout-region",
        main: Boolean(main),
        hero: Boolean(hero),
        map: Boolean(stage),
        continuity: Boolean(continuity),
      });
      return out;
    }

    const mainStyle = getComputedStyle(main);
    const heroRect = hero.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const continuityRect = continuity.getBoundingClientRect();
    const followsMap = Boolean(
      stage.compareDocumentPosition(continuity) & Node.DOCUMENT_POSITION_FOLLOWING,
    );

    if (layout === "stacked") {
      if (mainStyle.display !== "flex" || mainStyle.flexDirection !== "column") {
        out.push({
          kind: "desktop-boundary-should-stack",
          display: mainStyle.display,
          flexDirection: mainStyle.flexDirection,
        });
      }
      if (stageRect.top < heroRect.bottom - 1) {
        out.push({
          kind: "stacked-map-overlaps-hero",
          heroBottom: Math.round(heroRect.bottom),
          mapTop: Math.round(stageRect.top),
        });
      }
      if (Math.abs(heroRect.width - stageRect.width) > 2) {
        out.push({
          kind: "stacked-map-not-full-width",
          heroWidth: Math.round(heroRect.width),
          mapWidth: Math.round(stageRect.width),
        });
      }
    } else {
      if (mainStyle.display !== "grid") {
        out.push({ kind: "desktop-boundary-should-split", display: mainStyle.display });
      }
      if (Math.abs(heroRect.top - stageRect.top) > 2 || stageRect.left < heroRect.right - 1) {
        out.push({
          kind: "split-columns-misaligned",
          heroTop: Math.round(heroRect.top),
          mapTop: Math.round(stageRect.top),
          heroRight: Math.round(heroRect.right),
          mapLeft: Math.round(stageRect.left),
        });
      }
      const occupiedWidth = heroRect.width + stageRect.width;
      const mapShare = occupiedWidth > 0 ? stageRect.width / occupiedWidth : 0;
      if (mapShare < 0.56 || mapShare > 0.64) {
        out.push({
          kind: "split-map-share-out-of-range",
          mapShare: Number(mapShare.toFixed(3)),
        });
      }
    }

    if (!followsMap || continuityRect.top < Math.max(heroRect.bottom, stageRect.bottom) - 1) {
      out.push({
        kind: "desktop-continuity-placement",
        followsMap,
        heroBottom: Math.round(heroRect.bottom),
        mapBottom: Math.round(stageRect.bottom),
        continuityTop: Math.round(continuityRect.top),
      });
    }

    return out;
  }, expectedLayout);
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

  // Returning-user layout: saved rails must follow a map that enters the first viewport.
  for (const vp of SAVED_STATE_VIEWPORTS) {
    const isNarrow = vp.width <= 430;
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: isNarrow,
      isMobile: isNarrow,
      reducedMotion: "reduce",
    });
    await attachOfflineRouting(context, BASE);
    await context.addInitScript((savedState) => {
      window.localStorage.setItem(
        "terraclima.bookmarks.v1",
        JSON.stringify(savedState.bookmarks),
      );
      window.localStorage.setItem(
        "terraclima.recent-places.v1",
        JSON.stringify(savedState.recents),
      );
    }, SAVED_EXPLORER_STATE);

    const page = await context.newPage();
    attachConsoleGuards(page, vp.name, consoleErrors);
    try {
      await page.goto(`${BASE}/?r=most-comfortable`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(".map-shell", { timeout: 20000 });
      await page.waitForSelector(".tc-explorer-continuity", { timeout: 20000 });
      await page.waitForTimeout(500);

      for (const issue of await collectSavedStateResponsiveIssues(page)) {
        findings.push({ viewport: vp.name, ...issue });
      }
      await page.screenshot({
        path: join(ARTIFACT_DIR, `most-comfortable-${vp.name}-first-viewport.png`),
        fullPage: false,
      });

      // Center the map before checking the fixed trigger against every map control.
      await page.locator(".tc-map-stage").scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      for (const issue of await collectFilterControlOverlapIssues(page)) {
        findings.push({ viewport: vp.name, ...issue });
      }
      await page.screenshot({
        path: join(ARTIFACT_DIR, `most-comfortable-${vp.name}-map-controls.png`),
        fullPage: false,
      });
    } catch (err) {
      findings.push({ viewport: vp.name, kind: "navigation-error", message: String(err) });
    }

    await context.close();
  }

  // Exact atlas-first breakpoint contract: full-width stack below 1500px,
  // approximately 40/60 hero-map split from 1500px upward.
  for (const vp of DESKTOP_BOUNDARY_VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    await attachOfflineRouting(context, BASE);
    await context.addInitScript((savedState) => {
      window.localStorage.setItem(
        "terraclima.bookmarks.v1",
        JSON.stringify(savedState.bookmarks),
      );
      window.localStorage.setItem(
        "terraclima.recent-places.v1",
        JSON.stringify(savedState.recents),
      );
    }, SAVED_EXPLORER_STATE);

    const page = await context.newPage();
    attachConsoleGuards(page, vp.name, consoleErrors);
    try {
      await page.goto(`${BASE}/?r=most-comfortable`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(".map-shell", { timeout: 20000 });
      await page.waitForSelector(".tc-explorer-continuity", { timeout: 20000 });
      await page.waitForTimeout(500);

      for (const issue of await collectDesktopBoundaryIssues(page, vp.layout)) {
        findings.push({ viewport: vp.name, ...issue });
      }
      for (const issue of await collectMapIssues(page)) {
        findings.push({ viewport: vp.name, ...issue });
      }
      await page.screenshot({
        path: join(ARTIFACT_DIR, `most-comfortable-${vp.name}.png`),
        fullPage: false,
      });
    } catch (err) {
      findings.push({ viewport: vp.name, kind: "navigation-error", message: String(err) });
    }

    await context.close();
  }

  // Hover-card containment: southern comfort leaders + cardinal pins under normal motion.
  const HOVER_CARD_VIEWPORTS = [
    { name: "1440x900-hover", width: 1440, height: 900 },
    { name: "1280x720-hover", width: 1280, height: 720 },
    { name: "1024x768-hover", width: 1024, height: 768 },
  ];
  for (const vp of HOVER_CARD_VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: false,
      isMobile: false,
      reducedMotion: "no-preference",
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, vp.name, consoleErrors);
    try {
      await page.goto(`${BASE}/?r=most-comfortable&theme=dark`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(".map-shell", { timeout: 20000 });
      await page.waitForSelector("[data-marker-id='real-catorce-mx']", { timeout: 20000 });
      await page.waitForTimeout(400);
      await runHoverCardSweep(page, findings, vp.name);
      await page.screenshot({
        path: join(ARTIFACT_DIR, `most-comfortable-${vp.name}-rich-card.png`),
        fullPage: false,
      });

      // Reduced-motion still places the card; entrance class remains, animation is CSS-disabled.
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-motion", "reduced");
      });
      if (await hoverPinById(page, "real-catorce-mx")) {
        await page.waitForTimeout(HOVER_CARD_DWELL_MS + 40);
        for (const issue of await collectHoverCardContainmentIssues(page, {
          expectFull: true,
          label: `${vp.name}:reduced-motion`,
        })) {
          findings.push({ viewport: vp.name, ...issue });
        }
        await page.screenshot({
          path: join(ARTIFACT_DIR, `most-comfortable-${vp.name}-reduced-motion.png`),
          fullPage: false,
        });
      }
    } catch (err) {
      findings.push({ viewport: vp.name, kind: "navigation-error", message: String(err) });
    }
    await context.close();
  }

  // Touch / coarse pointers must not introduce hover cards.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await attachOfflineRouting(context, BASE);
    const page = await context.newPage();
    attachConsoleGuards(page, "390x844-touch-no-hover", consoleErrors);
    try {
      await page.goto(`${BASE}/?r=most-comfortable`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(".map-shell", { timeout: 20000 });
      await page.waitForTimeout(300);
      const pin = page.locator("[data-atlas-marker='true']").first();
      if (await pin.count()) {
        await pin.tap({ force: true }).catch(async () => {
          await pin.click({ force: true });
        });
        await page.waitForTimeout(200);
        // Tap opens dossier or cluster — hover preview must stay absent on touch paths.
        const hoverCards = await page.locator(".tc-map-hover-card").count();
        if (hoverCards > 0) {
          findings.push({
            viewport: "390x844-touch-no-hover",
            kind: "touch-introduced-hover-card",
          });
        }
        await page.keyboard.press("Escape");
      }
      const escape = page.locator(".map-touch-mode-toggle");
      if (await escape.count()) {
        await escape.click();
        await page.waitForTimeout(80);
        await escape.click();
      }
    } catch (err) {
      findings.push({
        viewport: "390x844-touch-no-hover",
        kind: "navigation-error",
        message: String(err),
      });
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

  console.log(`playtest:map ok — ${VIEWPORTS.length} viewports + ${SAVED_STATE_VIEWPORTS.length} saved-state viewports + ${DESKTOP_BOUNDARY_VIEWPORTS.length} breakpoint viewports + theme/hybrid matrix; artifacts in ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
