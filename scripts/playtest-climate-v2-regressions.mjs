/**
 * Deep Climate V2 regression playtest — supplements playtest:rigorous.
 * Local preview only. Exit 1 on findings / console errors.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.TC_BASE_URL ?? "http://127.0.0.1:4173";
const ARTIFACT_DIR = process.env.TC_V2_REGRESSION_ARTIFACT_DIR
  ?? "/opt/cursor/artifacts/playtest-climate-v2-regressions";

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

function guardConsole(page, label) {
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

async function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      overflowX: doc.scrollWidth > doc.clientWidth + 2,
      delta: doc.scrollWidth - doc.clientWidth,
    };
  });
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function shot(page, name) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACT_DIR, `${name}.png`), fullPage: false });
}

async function main() {
  const u = new URL(BASE);
  if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") {
    throw new Error(`refuses non-local base: ${BASE}`);
  }

  const browser = await chromium.launch({ headless: true });

  // --- Desktop light explorer ---
  {
    const label = "desktop-light";
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    await page.waitForSelector(".map-marker--featured[data-marker-id]", { timeout: 20000 });
    const text = await bodyText(page);
    if (!/1996/.test(text)) findings.push({ label, kind: "missing-1996-label" });
    if (/Present-day normals \(1991–2020\)/.test(text)) {
      findings.push({ label, kind: "stale-global-wmo-claim" });
    }
    // Rolling window must be disclaimed as NOT a WMO standard normal.
    if (!/not a WMO standard normal/i.test(text) && !/not WMO standard normal/i.test(text)) {
      findings.push({ label, kind: "missing-rolling-wmo-disclaimer" });
    }
    if (/\b1996[–-]2025\b[^.\n]{0,40}\bis a WMO standard normal\b/i.test(text)) {
      findings.push({ label, kind: "false-wmo-claim-for-rolling" });
    }
    const ov = await overflow(page);
    if (ov.overflowX) findings.push({ label, kind: "overflow-x", ...ov });
    const featured = await page.locator(".map-marker--featured").count();
    if (featured < 1) findings.push({ label, kind: "no-featured-markers", featured });
    await shot(page, label);
    await ctx.close();
  }

  // --- Desktop dark ---
  {
    const label = "desktop-dark";
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable&theme=dark`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    if (theme !== "dark") findings.push({ label, kind: "theme-not-dark", theme });
    const ov = await overflow(page);
    if (ov.overflowX) findings.push({ label, kind: "overflow-x", ...ov });
    await shot(page, label);
    await ctx.close();
  }

  // --- Mobile 390x844 ---
  {
    const label = "mobile-390";
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    const ov = await overflow(page);
    if (ov.overflowX) findings.push({ label, kind: "overflow-x", ...ov });
    // First-viewport hierarchy: brand/atlas should be present without a wall of secondary chrome
    const text = await bodyText(page);
    if (!/Terraclima/i.test(text)) findings.push({ label, kind: "missing-brand" });

    // Atlas Read must be a compact corner chip on coarse pointers — not a
    // full-width mid-band panel that steals page scroll while browsing places.
    await page.waitForSelector(".map-atlas-readout", { timeout: 20000 });
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(250);
    const atlasRead = await page.evaluate(() => {
      const el = document.querySelector(".map-atlas-readout");
      const shell = document.querySelector(".map-shell")?.getBoundingClientRect();
      const r = el?.getBoundingClientRect();
      if (!el || !shell || !r) return { missing: true };
      const midY = window.innerHeight / 2;
      const crossesMid = r.top <= midY && r.bottom >= midY;
      return {
        missing: false,
        density: el.getAttribute("data-density"),
        expanded: el.getAttribute("data-expanded"),
        widthPct: r.width / shell.width,
        height: r.height,
        midBandCoverage: crossesMid ? r.width / window.innerWidth : 0,
      };
    });
    if (atlasRead.missing) findings.push({ label, kind: "atlas-read-missing" });
    else {
      if (atlasRead.density !== "compact") {
        findings.push({ label, kind: "atlas-read-not-compact", ...atlasRead });
      }
      if (atlasRead.expanded !== "false") {
        findings.push({ label, kind: "atlas-read-expanded-by-default", ...atlasRead });
      }
      if (atlasRead.widthPct > 0.55 || atlasRead.height > 56) {
        findings.push({ label, kind: "atlas-read-too-large", ...atlasRead });
      }
      if (atlasRead.midBandCoverage > 0.45) {
        findings.push({ label, kind: "atlas-read-blocks-midband", ...atlasRead });
      }
    }
    await shot(page, label);
    await ctx.close();
  }

  // --- 1499 stacked vs 1500 split ---
  for (const vp of [
    { name: "1499-stacked", width: 1499, expectStacked: true },
    { name: "1500-split", width: 1500, expectStacked: false },
  ]) {
    const label = vp.name;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-shell", { timeout: 20000 });
    const layout = await page.evaluate(() => {
      // Heuristic: split layout typically shows side-by-side map+list above 1500
      const map = document.querySelector(".map-shell");
      const list = document.querySelector("[data-place-list], .place-grid, [data-testid='place-grid']");
      if (!map) return { ok: false };
      const mr = map.getBoundingClientRect();
      const lr = list?.getBoundingClientRect();
      const sideBySide = Boolean(lr && Math.abs(mr.top - lr.top) < 120 && lr.left > mr.right - 40);
      return { ok: true, sideBySide, mapTop: mr.top };
    });
    if (!layout.ok) findings.push({ label, kind: "missing-map" });
    // Soft check — record layout mode for review; hard-fail only on console/overflow
    const ov = await overflow(page);
    if (ov.overflowX) findings.push({ label, kind: "overflow-x", ...ov });
    await shot(page, `${label}-sideBySide-${layout.sideBySide}`);
    await ctx.close();
  }

  // --- Home base ---
  {
    const label = "home-base";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?hb=sequim-wa&r=live-fit`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);
    const text = await bodyText(page);
    if (!/Sequim/i.test(text)) findings.push({ label, kind: "home-base-not-visible" });
    // Reload persistence
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const url = page.url();
    if (!/[?&]hb=sequim-wa/.test(url) && !/Sequim/i.test(await bodyText(page))) {
      findings.push({ label, kind: "home-base-lost-on-reload", url });
    }
    await shot(page, label);
    await ctx.close();
  }

  // --- Dossier evidence + V2 provenance ---
  {
    const label = "dossier-evidence";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?p=sequim-wa`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    // Expand evidence disclosure if collapsed
    const toggles = page.locator("button, summary").filter({ hasText: /evidence|sources|data|provenance|methodology/i });
    const n = await toggles.count();
    for (let i = 0; i < Math.min(n, 6); i++) {
      try { await toggles.nth(i).click({ timeout: 1500 }); await page.waitForTimeout(200); } catch { /* ignore */ }
    }
    const text = await bodyText(page);
    if (!/1996/.test(text)) findings.push({ label, kind: "dossier-missing-1996" });
    if (!/Daymet|rolling climatology|not a WMO/i.test(text)) {
      findings.push({ label, kind: "dossier-missing-provenance-language" });
    }
    // Charts / climate values should not show NaN
    if (/\bNaN\b|\bInfinity\b/.test(text)) findings.push({ label, kind: "nan-in-dossier" });
    const ov = await overflow(page);
    if (ov.overflowX) findings.push({ label, kind: "overflow-x", ...ov });
    await shot(page, label);
    await ctx.close();
  }

  // --- Compare ---
  {
    const label = "compare";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(
      `${BASE}/?compare=sequim-wa,portal-az,patzcuaro-mx&r=most-comfortable`,
      { waitUntil: "networkidle", timeout: 45000 },
    );
    await page.waitForTimeout(1500);
    // Open compare if needed
    const compareBtn = page.getByRole("button", { name: /compare/i }).first();
    if (await compareBtn.count()) {
      try { await compareBtn.click({ timeout: 3000 }); await page.waitForTimeout(800); } catch { /* */ }
    }
    const text = await bodyText(page);
    if (/\bNaN\b|\bInfinity\b/.test(text)) findings.push({ label, kind: "nan-in-compare" });
    // Prefer solar resource language over observed sunshine hours claims when present
    if (/observed sunshine hours/i.test(text)) {
      findings.push({ label, kind: "observed-sunshine-hours-claim" });
    }
    await shot(page, label);
    await ctx.close();
  }

  // --- Scenarios ssp245 / ssp585 ---
  for (const scn of ["ssp245", "ssp585"]) {
    const label = `scenario-${scn}`;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable&scn=${scn}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);
    const url = page.url();
    if (!new RegExp(`[?&]scn=${scn}`).test(url)) {
      findings.push({ label, kind: "scenario-url-not-persisted", url });
    }
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    if (!new RegExp(`[?&]scn=${scn}`).test(page.url())) {
      findings.push({ label, kind: "scenario-lost-on-reload", url: page.url() });
    }
    const text = await bodyText(page);
    if (/\bNaN\b|\bInfinity\b/.test(text)) findings.push({ label, kind: "nan-in-scenario" });
    await shot(page, label);
    await ctx.close();
  }

  // --- Filtered atlas ---
  {
    const label = "filtered-atlas";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable&c=Mexico`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);
    const markers = await page.locator("[data-marker-id]").count();
    // With Mexico filter, should still render some pins/clusters (or empty state honestly)
    const text = await bodyText(page);
    if (markers === 0 && !/no places|no match|empty|0 places/i.test(text)) {
      // Clusters may absorb markers — check clusters
      const clusters = await page.locator(".map-cluster").count();
      if (clusters === 0) findings.push({ label, kind: "filtered-map-blank" });
    }
    await shot(page, label);
    await ctx.close();
  }

  // --- Keyboard access on featured pin ---
  {
    const label = "keyboard-featured";
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-marker--featured[data-marker-id]", { timeout: 20000 });
    const pin = page.locator(".map-marker--featured[data-marker-id]").first();
    await pin.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1200);
    const url = page.url();
    if (!/[?&]p=/.test(url)) {
      // Some activations open dossier without p= — check for dialog/detail
      const detail = await page.locator("[data-place-detail], .place-detail, [role='dialog']").count();
      if (detail === 0) findings.push({ label, kind: "keyboard-enter-no-dossier", url });
    }
    await shot(page, label);
    await ctx.close();
  }

  // --- Hover containment + identity (featured pins) ---
  {
    const label = "hover-containment";
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/?r=most-comfortable&theme=dark`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
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

    let identityMismatches = 0;
    for (const f of featured) {
      const pin = page.locator(`[data-marker-id="${f.id}"]`);
      const box = await pin.boundingBox();
      if (!box) {
        findings.push({ label, kind: "featured-pin-no-bbox", id: f.id });
        continue;
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(450);
      const card = await page.evaluate(() => {
        const el = document.querySelector(".tc-map-hover-card");
        if (!el) return null;
        const shell = document.querySelector(".map-shell")?.getBoundingClientRect();
        const cr = el.getBoundingClientRect();
        const title = el.querySelector(".tc-map-hover-title")?.textContent?.trim() || "";
        const rank = el.querySelector(".tc-map-hover-rankline")?.textContent?.trim() || "";
        const outside = shell
          ? cr.left < shell.left - 0.5
            || cr.right > shell.right + 0.5
            || cr.top < shell.top - 0.5
            || cr.bottom > shell.bottom + 0.5
          : true;
        return { title, rank, outside };
      });
      if (!card) {
        findings.push({ label, kind: "hover-card-missing", id: f.id });
        continue;
      }
      if (card.outside) findings.push({ label, kind: "hover-card-outside-shell", id: f.id });
      const rankMatch = f.label.match(/Current rank #(\d+)/);
      if (rankMatch && card.rank && !card.rank.includes(`#${rankMatch[1]}`)) {
        identityMismatches += 1;
        findings.push({
          label,
          kind: "hover-card-identity-mismatch",
          pinId: f.id,
          expectedRank: rankMatch[1],
          cardTitle: card.title,
          cardRank: card.rank,
        });
      }
      await page.mouse.move(8, 8);
      await page.waitForTimeout(120);
    }
    if (identityMismatches > 0) {
      findings.push({ label, kind: "hover-identity-failures", count: identityMismatches });
    }
    await shot(page, label);
    await ctx.close();
  }

  // --- Unchanged-route smoke (default /) ---
  {
    const label = "route-root";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector(".map-shell, main", { timeout: 20000 });
    const text = await bodyText(page);
    if (!/Terraclima/i.test(text)) findings.push({ label, kind: "root-missing-brand" });
    await shot(page, label);
    await ctx.close();
  }

  // --- Learn methodology ---
  {
    const label = "learn-methodology";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await attachOffline(ctx);
    const page = await ctx.newPage();
    guardConsole(page, label);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const learn = page.getByRole("link", { name: /^Learn$/i }).first();
    if (await learn.count()) {
      await learn.click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto(`${BASE}/?view=learn`, { waitUntil: "networkidle", timeout: 45000 });
    }
    const text = await bodyText(page);
    if (!/Daymet/i.test(text)) findings.push({ label, kind: "learn-missing-daymet" });
    if (!/1996/.test(text)) findings.push({ label, kind: "learn-missing-1996" });
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
    console.error("Climate V2 regression findings:");
    for (const f of findings) console.error(`  ${JSON.stringify(f)}`);
    process.exit(1);
  }
  if (consoleErrors.length) process.exit(1);
  console.log(`playtest:climate-v2-regressions ok — artifacts in ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
