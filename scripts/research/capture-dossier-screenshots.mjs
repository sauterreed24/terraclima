/**
 * Capture place-dossier screenshots at key viewports for PR before/after evidence.
 *
 * Usage:
 *   TC_BASE_URL=http://localhost:4173 TC_OUT_DIR=/opt/cursor/artifacts/screenshots/after \
 *     node scripts/research/capture-dossier-screenshots.mjs
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.TC_BASE_URL ?? "http://localhost:4173";
const OUT = process.env.TC_OUT_DIR ?? "/opt/cursor/artifacts/screenshots/after";
const LABEL = process.env.TC_LABEL ?? "after";
const PLACES = (process.env.TC_PLACE_IDS ?? "sequim-wa,portal-az,oaxaca-mx,tofino-bc,yuma-az").split(",");

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: theme === "dark" ? "dark" : "light",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const id of PLACES) {
      const url = `${BASE}/?p=${id}${theme === "dark" ? "&theme=dark" : ""}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("[data-place-detail]", { timeout: 20000 });
      await page.waitForTimeout(400);
      const file = join(OUT, `${LABEL}_${id}_${vp.name}_${theme}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log("wrote", file);
    }
    await context.close();
  }
}
await browser.close();
console.log("done");
