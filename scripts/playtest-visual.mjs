/**
 * Visual playtest: open every place dossier in a real headless browser at
 * multiple viewport widths and detect layout defects:
 *
 *   1. Horizontal overflow — any element inside the dossier drawer whose
 *      content paints past its box (scrollWidth > clientWidth + 8) where
 *      overflow is visible (not an intentional scroller, not an ellipsized
 *      cell, not SVG — SVG text gets a geometric check instead).
 *   2. SVG label clipping — a chart <text> extending beyond its svg's box.
 *   3. Bounding-box collisions inside season card heads and residency
 *      lanes (the "months bleed into temps" class of bug).
 *   4. Drawer-level horizontal scroll (content bleeds off the drawer).
 *
 * Not part of `quality:check` — needs a running preview server and a
 * Playwright Chromium. Manual QA loop:
 *
 *   npm run build && npm run preview &
 *   npm i --no-save playwright-core @playwright/test
 *   npx playwright install chromium
 *   TC_PLACE_IDS="$(npx tsx -e 'import("./src/data/places.ts").then(m => console.log(m.PLACES.map(p => p.id).join(",")))')" \
 *     node scripts/playtest-visual.mjs --widths 1024,1280,768,390
 *
 * Exits 1 when any defect is found; 0 on a clean sweep.
 */
import { chromium } from "playwright-core";

const BASE = process.env.TC_BASE_URL ?? "http://localhost:4173";
const argv = process.argv.slice(2);
const limitArg = argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? parseInt(argv[limitArg + 1], 10) : Infinity;
const widthsArg = argv.indexOf("--widths");
const WIDTHS = widthsArg >= 0
  ? argv[widthsArg + 1].split(",").map(w => parseInt(w, 10))
  : [1024, 1280, 768, 390];

async function main() {
  const idsEnv = process.env.TC_PLACE_IDS;
  if (!idsEnv) {
    console.error("TC_PLACE_IDS env var required (comma-separated place ids); see header comment.");
    process.exit(2);
  }
  const ids = idsEnv.split(",").filter(Boolean).slice(0, LIMIT);
  console.error(`Playtesting ${ids.length} places × ${WIDTHS.length} widths`);

  const browser = await chromium.launch();
  const findings = [];
  let checked = 0;

  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    for (const id of ids) {
      const url = `${BASE}/?p=${id}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForSelector("[data-place-detail]", { timeout: 15000 });
        // Let lazy sections/fonts settle.
        await page.waitForTimeout(120);

        const issues = await page.evaluate(() => {
          const out = [];
          const drawer = document.querySelector("[data-place-detail]");
          if (!drawer) return [{ kind: "no-drawer" }];

          // 1. Drawer-level horizontal overflow.
          if (drawer.scrollWidth > drawer.clientWidth + 1) {
            out.push({ kind: "drawer-h-overflow", extra: drawer.scrollWidth - drawer.clientWidth });
          }

          // 2. Per-element horizontal overflow inside the drawer. Skip nodes
          // that intentionally scroll (overflow-x auto/scroll) and their
          // descendants, plus zero-size or hidden nodes.
          const scrollers = new Set();
          for (const el of drawer.querySelectorAll("*")) {
            const cs = getComputedStyle(el);
            if (cs.overflowX === "auto" || cs.overflowX === "scroll") scrollers.add(el);
          }
          const isInsideScroller = (el) => {
            for (let n = el.parentElement; n && n !== drawer; n = n.parentElement) {
              if (scrollers.has(n)) return true;
            }
            return false;
          };
          for (const el of drawer.querySelectorAll("*")) {
            if (el.clientWidth === 0) continue;
            if (scrollers.has(el) || isInsideScroller(el)) continue;
            // scrollWidth is unreliable for SVG content (viewBox-space units
            // leak into the report) — SVG text gets a geometric check below.
            if (el instanceof SVGElement || el.closest("svg")) continue;
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") continue;
            // Visible overflow that actually paints outside the border box.
            if (el.scrollWidth > el.clientWidth + 8 && (cs.overflowX === "visible" || cs.overflowX === "clip")) {
              // Ignore tiny label crops inside cells that intentionally
              // ellipsize (text-overflow) — they clip cleanly.
              if (cs.textOverflow === "ellipsis" && cs.whiteSpace === "nowrap") continue;
              const cls = (el.className && typeof el.className === "string") ? el.className.split(/\s+/).slice(0, 3).join(".") : el.tagName;
              out.push({ kind: "el-h-overflow", sel: cls, extra: el.scrollWidth - el.clientWidth });
            }
          }

          // SVG text clipping — geometric: does a label extend beyond its
          // svg's client box?
          for (const svg of drawer.querySelectorAll("svg")) {
            const sr = svg.getBoundingClientRect();
            if (sr.width === 0) continue;
            for (const t of svg.querySelectorAll("text")) {
              const tr = t.getBoundingClientRect();
              const clipLeft = sr.left - tr.left;
              const clipRight = tr.right - sr.right;
              if (clipLeft > 2 || clipRight > 2) {
                out.push({
                  kind: "svg-text-clip",
                  sel: (t.textContent || "").slice(0, 30),
                  extra: Math.round(Math.max(clipLeft, clipRight)),
                });
              }
            }
          }

          // 3. Season head collisions: months label box vs temps box.
          for (const head of drawer.querySelectorAll(".place-overview__season-head")) {
            const months = head.querySelector(".place-overview__season-months");
            const temps = head.querySelector(".place-overview__season-temps");
            if (!months || !temps) continue;
            const a = months.getBoundingClientRect();
            const b = temps.getBoundingClientRect();
            const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (overlapX > 1 && overlapY > 1) {
              out.push({ kind: "season-head-collision", overlapX: Math.round(overlapX) });
            }
          }

          // 4. Residency lane top collisions (label vs score).
          for (const laneTop of drawer.querySelectorAll(".residency-brief__lane-top")) {
            const kids = laneTop.children;
            if (kids.length < 2) continue;
            const a = kids[0].getBoundingClientRect();
            const b = kids[1].getBoundingClientRect();
            const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (overlapX > 1 && overlapY > 1) {
              out.push({ kind: "lane-top-collision", overlapX: Math.round(overlapX) });
            }
          }
          return out;
        });

        for (const issue of issues) {
          findings.push({ id, width, ...issue });
        }
      } catch (err) {
        findings.push({ id, width, kind: "error", message: String(err).slice(0, 160) });
      }
      checked++;
      if (checked % 50 === 0) console.error(`  ...${checked} checks done, ${findings.length} findings so far`);
    }
    await context.close();
  }

  await browser.close();

  // Report, grouped by kind.
  const byKind = new Map();
  for (const f of findings) {
    const k = f.kind;
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push(f);
  }
  console.log(`\n=== Visual playtest report ===`);
  console.log(`Checks: ${checked} (places × widths) — findings: ${findings.length}`);
  for (const [kind, list] of byKind) {
    console.log(`\n${kind}: ${list.length}`);
    for (const f of list.slice(0, 25)) {
      console.log(`  ${f.id} @${f.width}px ${f.sel ?? ""} ${f.extra != null ? `+${f.extra}px` : ""} ${f.overlapX != null ? `overlap ${f.overlapX}px` : ""} ${f.message ?? ""}`);
    }
    if (list.length > 25) console.log(`  ...and ${list.length - 25} more`);
  }
  process.exit(findings.some(f => f.kind !== "error") ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(2); });
