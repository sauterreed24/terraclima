/**
 * Rigorous post-polish playtest — exercises runtime paths the unit suite
 * doesn't fully cover together: URL theme sync, DOM theme application,
 * shortlist exporters on a real corpus slice, and share clipboard fallback.
 */
import { parseAppSearch, formatAppRelativeUrl } from "../src/lib/app-url";
import { PLACES } from "../src/data/places";
import {
  applyFilters,
  countActiveExplorerFilterSignals,
  createEmptyFilterState,
  filterStateFromValidated,
  hasActiveExplorerFilters,
} from "../src/lib/scoring";
import { liveFitPresetsPoolPass } from "../src/lib/live-fit";
import { isBundleActive, lifestyleBundleById } from "../src/lib/lifestyle-bundles";
import { runScenarioRanking } from "../src/lib/climate-processor";
import type { ValidatedFilterInput } from "../src/lib/scoring";
import {
  exportShortlistAsCSV,
  exportShortlistAsGeoJSON,
  exportShortlistAsICS,
  exportShortlistAsJSON,
} from "../src/lib/shortlist-export";
import { motionPolicy } from "../src/lib/device-profile";
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
  dom.window.document.documentElement.dataset.motion = motionPolicy();
  if (!dom.window.document.documentElement.dataset.motion) {
    throw new Error("data-motion tier not set");
  }

  const fullPool = applyFilters(PLACES, createEmptyFilterState()).length;
  const presetPool = applyFilters(
    PLACES,
    filterStateFromValidated({
      countries: [],
      archetypes: [],
      fitPresets: ["cool-summers"],
      search: "",
      maxSummerHighC: null,
      minWinterLowC: null,
      minGrowability: null,
      maxFireRisk: null,
      maxOverallRisk: null,
    }),
  ).length;
  if (presetPool >= fullPool || presetPool === 0) {
    throw new Error(`fit preset should narrow pool: ${presetPool} vs ${fullPool}`);
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

  const polluted = filterStateFromValidated({
    countries: [],
    archetypes: [],
    fitPresets: ["cool-summers"],
    search: "zzzznonexistent",
    maxSummerHighC: 22,
    minWinterLowC: 2,
    minGrowability: 75,
    maxFireRisk: "low",
    maxOverallRisk: "moderate",
  });
  if (applyFilters(PLACES, polluted).length !== 0) {
    throw new Error("polluted filters should yield zero places");
  }
  if (applyFilters(PLACES, createEmptyFilterState()).length !== PLACES.length) {
    throw new Error("empty filters should restore full corpus");
  }

  const empty = createEmptyFilterState();
  if (hasActiveExplorerFilters(empty) || countActiveExplorerFilterSignals(empty) !== 0) {
    throw new Error("createEmptyFilterState should have zero active signals");
  }
  const active = filterStateFromValidated({
    countries: ["USA"],
    archetypes: [],
    fitPresets: ["cool-summers"],
    search: "sequim",
    maxSummerHighC: 24,
    minWinterLowC: null,
    minGrowability: null,
    maxFireRisk: null,
    maxOverallRisk: null,
  });
  if (!hasActiveExplorerFilters(active) || countActiveExplorerFilterSignals(active) < 3) {
    throw new Error("active filter state should register multiple explorer signals");
  }

  const coolSummerPlace = PLACES.find((p) => p.id === "sequim-wa");
  const hotSummerPlace = PLACES.find((p) => p.id === "death-valley-ca");
  if (!coolSummerPlace || !hotSummerPlace) throw new Error("anchor places missing for preset pool pass");
  if (!liveFitPresetsPoolPass(coolSummerPlace, new Set(["cool-summers"]))) {
    throw new Error("Sequim should pass cool-summers preset pool");
  }
  if (liveFitPresetsPoolPass(hotSummerPlace, new Set(["cool-summers"]))) {
    throw new Error("Death Valley should fail cool-summers preset pool");
  }

  const clearedUrl = formatAppRelativeUrl({
    view: "explorer",
    placeId: null,
    collectionId: null,
    ranking: "live-fit",
    fitPresets: [],
    maxSummerHighC: null,
    minWinterLowC: null,
    minGrowability: null,
    maxFireRisk: null,
    maxOverallRisk: null,
    search: "",
    collectionExists: () => true,
  });
  for (const param of ["fit=", "sh=", "wl=", "grow=", "fire=", "risk=", "q="]) {
    if (clearedUrl.includes(param)) throw new Error(`cleared URL still has ${param}: ${clearedUrl}`);
  }

  const remoteWork = lifestyleBundleById("remote-work");
  if (!remoteWork) throw new Error("remote-work lifestyle bundle missing");
  const remoteUrl = formatAppRelativeUrl({
    view: "explorer",
    ranking: remoteWork.ranking,
    fitPresets: [...remoteWork.presets],
    maxSummerHighC: remoteWork.maxSummerHighC ?? null,
    minWinterLowC: remoteWork.minWinterLowC ?? null,
    minGrowability: remoteWork.minGrowability ?? null,
    maxFireRisk: remoteWork.maxFireRisk ?? null,
    maxOverallRisk: remoteWork.maxOverallRisk ?? null,
    collectionExists: () => true,
  });
  if (!remoteUrl.includes("fit=cool-summers") || !remoteUrl.includes("low-fire-smoke")) {
    throw new Error(`remote-work bundle URL missing fit presets: ${remoteUrl}`);
  }
  if (!remoteUrl.includes("sh=26")) {
    throw new Error(`remote-work bundle URL missing summer cap: ${remoteUrl}`);
  }
  const remoteParsed = parseAppSearch(new URL(remoteUrl, "https://example.com").search, { validatePlaceId });
  const remoteHydrated = filterStateFromValidated({
    countries: remoteParsed.countries,
    archetypes: remoteParsed.archetypes,
    fitPresets: remoteParsed.fitPresets,
    search: remoteParsed.search,
    maxSummerHighC: remoteParsed.maxSummerHighC,
    minWinterLowC: remoteParsed.minWinterLowC,
    minGrowability: remoteParsed.minGrowability,
    maxFireRisk: remoteParsed.maxFireRisk,
    maxOverallRisk: remoteParsed.maxOverallRisk,
  });
  if (!isBundleActive(remoteWork, remoteWork.ranking, remoteHydrated)) {
    throw new Error("remote-work URL round-trip did not hydrate an active bundle");
  }

  // Climate-scenario ("2050 time machine") URL round-trip + projection recompute.
  const scnUrl = formatAppRelativeUrl({ view: "explorer", scenario: "ssp585", collectionExists: () => true });
  if (!scnUrl.includes("scn=ssp585")) throw new Error(`scenario not in URL: ${scnUrl}`);
  const scnNowUrl = formatAppRelativeUrl({ view: "explorer", scenario: "now", collectionExists: () => true });
  if (scnNowUrl.includes("scn=")) throw new Error(`'now' scenario must be omitted: ${scnNowUrl}`);
  const scnParsed = parseAppSearch(new URL(scnUrl, "https://example.com").search);
  if (scnParsed.scenario !== "ssp585") throw new Error("scenario parse failed");

  const scenarioFilters: ValidatedFilterInput = {
    countries: [], archetypes: [], fitPresets: [], search: "",
    maxSummerHighC: null, minWinterLowC: null, minGrowability: null, maxFireRisk: null, maxOverallRisk: null,
  };
  const nowRank = runScenarioRanking({ type: "scenario-rank", requestId: 1, scenario: "now", ranking: "coolest-summers", filters: scenarioFilters });
  const futureRank = runScenarioRanking({ type: "scenario-rank", requestId: 2, scenario: "ssp585", ranking: "coolest-summers", filters: scenarioFilters });
  if (nowRank.rows.length !== futureRank.rows.length) throw new Error("scenario rank length mismatch");
  const nowScoreById = new Map(nowRank.rows.map(r => [r.id, r.score]));
  let warmed = false;
  for (const row of futureRank.rows) {
    const baseline = nowScoreById.get(row.id);
    if (baseline != null && row.score < baseline - 1e-9) { warmed = true; break; }
  }
  if (!warmed) throw new Error("SSP5-8.5 should lower at least one coolest-summers score vs now");

  console.log("playtest-polish: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
