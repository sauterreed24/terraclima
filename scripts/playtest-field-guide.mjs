/** Release checks for atlas wayfinding, readable profiles, and data scope. */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = process.env.TC_BASE_URL ?? "http://127.0.0.1:4173";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local preview required");
const out = process.env.TC_FIELD_GUIDE_ARTIFACT_DIR ?? "artifacts/field-guide";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
});
const findings = [];
const errors = [];
const checks = [];
function check(ok, message, details) {
  checks.push({ message, ok, details });
  if (!ok) findings.push({ message, details });
}
try {
  for (const width of [360, 390, 624, 768, 1023, 1024, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", route => {
      const url = route.request().url();
      return url.startsWith(base) || /^(data|blob|about):/.test(url) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push({ width, message: String(error) }));
    try {
      for (const theme of ["light", "dark"]) {
        const label = `${width}-${theme}`;
        await page.goto(`${base}/?theme=${theme}&r=most-unique`, { waitUntil: "networkidle" });
        await page.locator(".map-shell").waitFor();
        const geometry = await page.evaluate(() => ({
          width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1,
          headerHeight: document.querySelector(".tc-header-bar").getBoundingClientRect().height,
        }));
        check(!geometry.overflow && geometry.width === width, `${label}: atlas fits viewport`, geometry);
        check(geometry.headerHeight < 110, `${label}: compact site header`, geometry);
        await page.getByRole("link", { name: /^Browse \d+ places/ }).click();
        const headingY = await page.locator("#ranked-places-heading").evaluate(el => el.getBoundingClientRect().top);
        check(headingY >= 60 && headingY < 250, `${label}: list jump clears header`, { headingY });
        await page.getByRole("link", { name: "↑ Back to map" }).click();
        check(await page.locator("#atlas-map").evaluate(el => el === document.activeElement), `${label}: map return restores keyboard focus`);

        await page.goto(`${base}/?p=sequim-wa&theme=${theme}&temp=F&dist=imperial`, { waitUntil: "networkidle" });
        await page.locator(".place-overview").waitFor();
        const text = await page.locator("[data-place-detail]").innerText();
        check(text.includes("1996–2025 · 1 km grid"), `${label}: data basis appears in profile`);
        check(!text.includes("one-sixth") && !text.includes("50 km SW"), `${label}: obsolete Sequim contrast removed`);
        if (width < 1024) {
          const select = page.getByRole("combobox", { name: "Jump to profile section" });
          await select.selectOption("pd-seasons");
          await page.waitForFunction(() => document.querySelector('.tc-reading-nav-mobile select')?.value === "pd-seasons");
          const landing = await page.evaluate(() => ({
            nav: document.querySelector(".tc-reading-nav-mobile").getBoundingClientRect().bottom,
            target: document.getElementById("pd-seasons").getBoundingClientRect().top,
          }));
          check(landing.target >= landing.nav && landing.target < 250, `${label}: section visible below sticky reading controls`, landing);
          await page.getByRole("button", { name: "Next profile section" }).click();
          await page.waitForFunction(() => document.querySelector('.tc-reading-nav-mobile select')?.value === "pd-why-here");
          await page.getByRole("button", { name: "Previous profile section" }).click();
          await page.waitForFunction(() => document.querySelector('.tc-reading-nav-mobile select')?.value === "pd-seasons");
          await select.selectOption("pd-evidence");
        } else {
          await page.getByRole("link", { name: "Evidence & Methods", exact: true }).click();
        }
        await page.getByRole("button", { name: /How to read this profile/ }).click();
        check((await page.locator(".tc-evidence-summary").textContent()).includes("editorial confidence"), `${label}: confidence scope is explicit`);
        check(!(await page.locator(".tc-evidence-summary").innerText()).includes("°C"), `${label}: period deltas honor Fahrenheit`);
        const overflow = await page.locator("[data-place-detail]").evaluate(el => el.scrollWidth > el.clientWidth + 1);
        check(!overflow, `${label}: profile has no horizontal overflow`);
        await page.getByRole("button", { name: "Scroll to top of place profile" }).click();
        await page.waitForFunction(() => document.querySelector("[data-place-detail]")?.scrollTop === 0);
        check(true, `${label}: return to profile top`);
        if ([390, 1440].includes(width)) {
          await page.screenshot({ path: join(out, `profile-${label}.png`) });
          if (width < 1024) await page.getByRole("combobox", { name: "Jump to profile section" }).selectOption("pd-seasons");
          else await page.getByRole("link", { name: "Season by season", exact: true }).click();
          await page.screenshot({ path: join(out, `reading-${label}.png`) });
        }
      }
    } catch (error) {
      findings.push({ width, message: String(error) });
      await page.screenshot({ path: join(out, `failure-${width}.png`) });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(join(out, "report.json"), JSON.stringify({ checks, findings, errors }, null, 2));
console.log(`field-guide: ${checks.length} checks; ${findings.length} findings; ${errors.length} page errors`);
if (findings.length || errors.length) {
  console.error(JSON.stringify({ findings, errors }, null, 2));
  process.exitCode = 1;
}
