/**
 * Rigorous post-polish playtest — exercises runtime paths the unit suite
 * doesn't fully cover together: URL theme sync, DOM theme application,
 * shortlist exporters on a real corpus slice, and share clipboard fallback.
 */
import { parseAppSearch, formatAppRelativeUrl } from "../src/lib/app-url";
import { PLACES } from "../src/data/places";
import {
  exportShortlistAsCSV,
  exportShortlistAsGeoJSON,
  exportShortlistAsICS,
  exportShortlistAsJSON,
} from "../src/lib/shortlist-export";
import { applyTheme } from "../src/lib/theme";
import { shareUrl } from "../src/lib/share";

async function main(): Promise<void> {
  const validatePlaceId = (id: string) => PLACES.some((p) => p.id === id);

  const url = formatAppRelativeUrl({ view: "explorer", theme: "dark" });
  if (!url.includes("theme=dark")) throw new Error(`theme not in URL: ${url}`);
  const parsed = parseAppSearch(new URL(url, "https://example.com").search, { validatePlaceId });
  if (parsed.theme !== "dark") throw new Error("theme parse failed");

  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>");
  applyTheme(dom.window.document, "dark", "dark");
  if (dom.window.document.documentElement.getAttribute("data-theme") !== "dark") {
    throw new Error("data-theme not set");
  }

  const sample = PLACES.slice(0, 20);
  for (const fn of [
    exportShortlistAsJSON,
    exportShortlistAsCSV,
    exportShortlistAsGeoJSON,
    exportShortlistAsICS,
  ]) {
    const f = fn(sample, { generatedAt: new Date("2026-01-01T00:00:00Z") });
    if (!f.body || f.body.length < 10) throw new Error(`empty export from ${fn.name}`);
  }

  let clip = "";
  const prevNav = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: async (t: string) => { clip = t; } } },
    configurable: true,
  });
  try {
    await shareUrl({ url: "https://x.test/?a=1", title: "T", text: "hi" });
    if (clip !== "https://x.test/?a=1") throw new Error("clipboard share fallback failed");
  } finally {
    Object.defineProperty(globalThis, "navigator", { value: prevNav, configurable: true });
  }

  console.log("playtest-polish: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
