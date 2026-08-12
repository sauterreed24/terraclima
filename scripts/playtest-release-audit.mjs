/**
 * Post-merge release audit — catches mobile chrome, hover identity,
 * scenario persistence, and console regressions beyond the standard suites.
 */
import { chromium } from "playwright-core";
import { accessSync, constants, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.TC_BASE_URL ?? "http://127.0.0.1:4173";
const ARTIFACT_DIR = process.env.TC_RELEASE_AUDIT_ARTIFACT_DIR
  ?? "/opt/cursor/artifacts/playtest-release-audit";

const findings = [];
const consoleErrors = [];

function attachOffline(context) {
  return context.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("about:")) {
      return route.continue();
    }
    return route.abort();
  });
}

function guard(page, label) {
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

async function shot(page, name) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACT_DIR, `${name}.png`), fullPage: false });
}

/** Hover the glyph hit circle, not the group bbox (fanned badges inflate the group). */
async function hoverMarkerGlyph(page, markerSelector) {
  const box = await page.evaluate((sel) => {
    const marker = document.querySelector(sel);
    if (!marker) return null;
    const hit = marker.querySelector("circle[pointer-events='all']")
      ?? marker.querySelector("circle[fill='transparent']");
    const r = (hit ?? marker).getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, markerSelector);
  if (!box) return false;
  await page.mouse.move(box.x, box.y);
  return true;
}

async function main() {
  const u = new URL(BASE);
  if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") {
    throw new Error(`refuses non-local base: ${BASE}`);
  }

  const chromeCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  let executablePath;
  for (const candidate of chromeCandidates) {
    try {
      accessSync(candidate, constants.X_OK);
      executablePath = candidate;
      break;
    } catch {
      // try next
    }
  }
  const browser = await chromium.launch(executablePath ? { executablePath, headless: true } : { headless: true });

  // Mobile atlas-read chip + scroll-page
  {
    const label = "mobile-atlas-read";
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-atlas-readout[data-density='compact']", { timeout: 20000 });
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    const chip = await page.evaluate(() => {
      const el = document.querySelector(".map-atlas-readout");
      const shell = document.querySelector(".map-shell")?.getBoundingClientRect();
      const r = el?.getBoundingClientRect();
      if (!el || !shell || !r) return null;
      const midY = innerHeight / 2;
      return {
        density: el.getAttribute("data-density"),
        expanded: el.getAttribute("data-expanded"),
        widthPct: r.width / shell.width,
        height: r.height,
        midBand: r.top <= midY && r.bottom >= midY ? r.width / innerWidth : 0,
        text: el.innerText.replace(/\s+/g, " ").trim(),
      };
    });
    if (!chip) findings.push({ label, kind: "missing-chip" });
    else {
      if (chip.density !== "compact") findings.push({ label, kind: "not-compact", chip });
      if (chip.expanded !== "false") findings.push({ label, kind: "expanded-default", chip });
      if (chip.widthPct > 0.55 || chip.height > 56) findings.push({ label, kind: "chip-too-large", chip });
      if (chip.midBand > 0.45) findings.push({ label, kind: "blocks-midband", chip });
      if (/LEADERS|DRIVER/i.test(chip.text) && chip.expanded === "false") {
        findings.push({ label, kind: "details-visible-when-collapsed", chip });
      }
    }

    // Expand then Scroll-page collapses + disables swipe capture
    await page.evaluate(() => document.querySelector(".tc-map-stage")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(250);
    const more = page.getByRole("button", { name: /Expand atlas read/i });
    if (await more.count()) {
      await more.tap();
      await page.waitForTimeout(200);
      const expanded = await page.locator(".map-atlas-readout").getAttribute("data-expanded");
      if (expanded !== "true") findings.push({ label, kind: "expand-failed" });
    }
    const toggle = page.locator(".map-touch-mode-toggle");
    if (await toggle.count()) {
      await toggle.tap();
      await page.waitForTimeout(250);
      const after = await page.evaluate(() => {
        const el = document.querySelector(".map-atlas-readout");
        return {
          pageScroll: el?.getAttribute("data-page-scroll"),
          expanded: el?.getAttribute("data-expanded"),
          pe: getComputedStyle(el).pointerEvents,
        };
      });
      if (after.pageScroll !== "true") findings.push({ label, kind: "page-scroll-attr", after });
      if (after.expanded !== "false") findings.push({ label, kind: "did-not-collapse-on-page-scroll", after });
      if (after.pe !== "none") findings.push({ label, kind: "page-scroll-still-captures", after });
    }
    const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (ov) findings.push({ label, kind: "overflow-x" });
    await shot(page, label);
    await ctx.close();
  }

  // Desktop hover identity for featured pins
  {
    const label = "desktop-hover-identity";
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?r=most-comfortable&theme=dark`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-marker--featured[data-marker-id]", { timeout: 20000 });
    const fit = page.locator('[data-map-control="fit-all"]');
    if (await fit.count()) {
      await fit.click();
      await page.waitForTimeout(350);
    }
    const featured = await page.evaluate(() =>
      [...document.querySelectorAll(".map-marker--featured[data-marker-id]")].map((el) => ({
        id: el.getAttribute("data-marker-id"),
        label: el.getAttribute("aria-label") || "",
      })),
    );
    if (featured.length < 1) findings.push({ label, kind: "no-featured" });
    for (const f of featured) {
      const hovered = await hoverMarkerGlyph(page, `[data-marker-id="${f.id}"]`);
      if (!hovered) {
        findings.push({ label, kind: "no-bbox", id: f.id });
        continue;
      }
      await page.waitForTimeout(450);
      const card = await page.evaluate(() => {
        const el = document.querySelector(".tc-map-hover-card");
        if (!el) return null;
        return {
          title: el.querySelector(".tc-map-hover-title")?.textContent?.trim(),
          rank: el.querySelector(".tc-map-hover-rankline")?.textContent?.trim(),
        };
      });
      const expected = (f.label.match(/Current rank #(\d+)/) || [])[1];
      if (!card) findings.push({ label, kind: "missing-card", id: f.id });
      else if (expected && card.rank && !card.rank.includes(`#${expected}`)) {
        findings.push({ label, kind: "identity-mismatch", id: f.id, expected, card });
      }
      await page.mouse.move(8, 8);
      await page.waitForTimeout(400);
    }
    await shot(page, label);
    await ctx.close();
  }

  // Desktop light — period labels / no stale WMO claim
  {
    const label = "desktop-labels";
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    const text = await page.evaluate(() => document.body.innerText);
    if (!/1996/.test(text)) findings.push({ label, kind: "missing-1996" });
    if (/Present-day normals \(1991–2020\)/.test(text)) findings.push({ label, kind: "stale-wmo-claim" });
    if (!/not a WMO standard normal|not WMO standard normal/i.test(text)) {
      findings.push({ label, kind: "missing-rolling-disclaimer" });
    }
    if (/\bNaN\b|\bInfinity\b/.test(text)) findings.push({ label, kind: "nan-visible" });
    await shot(page, label);
    await ctx.close();
  }

  // Dossier evidence
  {
    const label = "dossier";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?p=sequim-wa`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);
    const toggles = page.locator("button, summary").filter({ hasText: /evidence|sources|data|provenance/i });
    const n = await toggles.count();
    for (let i = 0; i < Math.min(n, 5); i++) {
      try { await toggles.nth(i).click({ timeout: 1200 }); await page.waitForTimeout(150); } catch { /* */ }
    }
    const text = await page.evaluate(() => document.body.innerText);
    if (!/1996/.test(text)) findings.push({ label, kind: "dossier-missing-1996" });
    if (!/Daymet|rolling climatology|not a WMO/i.test(text)) {
      findings.push({ label, kind: "dossier-missing-provenance" });
    }
    if (/\bNaN\b|\bInfinity\b/.test(text)) findings.push({ label, kind: "nan-in-dossier" });
    await shot(page, label);
    await ctx.close();
  }

  // Scenarios + URL persistence
  for (const scn of ["ssp245", "ssp585"]) {
    const label = `scn-${scn}`;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?r=most-comfortable&scn=${scn}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(900);
    if (!new RegExp(`[?&]scn=${scn}`).test(page.url())) {
      findings.push({ label, kind: "scn-not-in-url", url: page.url() });
    }
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    if (!new RegExp(`[?&]scn=${scn}`).test(page.url())) {
      findings.push({ label, kind: "scn-lost-reload", url: page.url() });
    }
    await ctx.close();
  }

  // 1499 / 1500 overflow
  for (const width of [1499, 1500]) {
    const label = `bp-${width}`;
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (ov) findings.push({ label, kind: "overflow-x" });
    await shot(page, label);
    await ctx.close();
  }

  // Home base persistence
  {
    const label = "home-base";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?hb=sequim-wa&r=live-fit`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(900);
    const text = await page.evaluate(() => document.body.innerText);
    if (!/Sequim/i.test(text)) findings.push({ label, kind: "hb-not-visible" });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    if (!/[?&]hb=sequim-wa/.test(page.url()) && !/Sequim/i.test(await page.evaluate(() => document.body.innerText))) {
      findings.push({ label, kind: "hb-lost", url: page.url() });
    }
    await ctx.close();
  }

  // Filter dock: Rank by stays visible while Fit Finder starts collapsed
  {
    const label = "dock-rank-first";
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".atlas-filter-dock", { timeout: 20000 });
    const dock = await page.evaluate(() => {
      const root = document.querySelector(".atlas-filter-dock");
      if (!root) return null;
      const rank = root.querySelector(".rank-menu__select");
      const fit = [...root.querySelectorAll("details")].find(d =>
        (d.querySelector("summary")?.textContent ?? "").trim().startsWith("Fit Finder"),
      );
      if (!rank || !fit) return { missing: true };
      return {
        rankBeforeFit: Boolean(rank.compareDocumentPosition(fit) & Node.DOCUMENT_POSITION_FOLLOWING),
        fitOpen: fit.open,
      };
    });
    if (!dock || dock.missing) findings.push({ label, kind: "missing-dock-controls", dock });
    else {
      if (!dock.rankBeforeFit) findings.push({ label, kind: "rank-buried-below-fit", dock });
      if (dock.fitOpen) findings.push({ label, kind: "fit-finder-open-by-default", dock });
    }
    await shot(page, label);
    await ctx.close();
  }

  // Compact map peek is a tooltip, not a dialog covering the land
  {
    const label = "hover-preview-region";
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guard(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-marker--featured[data-marker-id]", { timeout: 20000 });
    const hovered = await hoverMarkerGlyph(page, ".map-marker--featured[data-marker-id]");
    if (!hovered) findings.push({ label, kind: "no-marker-bbox" });
    else {
      await page.waitForTimeout(550);
      const preview = await page.evaluate(() => {
        const el = document.getElementById("tc-map-hover-preview");
        if (!el) return null;
        return {
          role: el.getAttribute("role"),
          interactive: el.getAttribute("data-interactive"),
          label: el.getAttribute("aria-label"),
        };
      });
      if (!preview) findings.push({ label, kind: "missing-preview" });
      else {
        if (preview.role === "dialog") findings.push({ label, kind: "preview-is-dialog", preview });
        if (preview.role !== "tooltip") findings.push({ label, kind: "preview-role", preview });
        if (preview.interactive === "true") findings.push({ label, kind: "preview-is-interactive", preview });
      }
    }
    await shot(page, label);
    await ctx.close();
  }

  await browser.close();

  const report = { findings, consoleErrors, artifactDir: ARTIFACT_DIR, base: BASE };
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));

  if (consoleErrors.length) {
    console.error("Console errors:");
    for (const e of consoleErrors) console.error(`  [${e.label}] ${e.message}`);
  }
  if (findings.length) {
    console.error("Release audit findings:");
    for (const f of findings) console.error(`  ${JSON.stringify(f)}`);
    process.exit(1);
  }
  if (consoleErrors.length) process.exit(1);
  console.log(`playtest:release-audit ok — artifacts in ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
