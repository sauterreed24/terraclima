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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildComfortPrecisionProfile, apparentComfortIndexFromProfile } from "../src/lib/comfort-precision";
import { composePlaceExperience } from "../src/lib/place-overview";
import {
  composeAtAGlanceIntro,
  composeClimateIntro,
  composeGeospatialIntro,
  composePracticalReadIntro,
  composeTourismIntro,
} from "../src/lib/dossier-intros";
import { buildGeospatialAnalysis } from "../src/lib/geospatial-analysis";

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

  const ssp245Url = formatAppRelativeUrl({ view: "explorer", scenario: "ssp245", collectionExists: () => true });
  if (!ssp245Url.includes("scn=ssp245")) throw new Error(`ssp245 not in URL: ${ssp245Url}`);
  const ssp245Parsed = parseAppSearch(new URL(ssp245Url, "https://example.com").search);
  if (ssp245Parsed.scenario !== "ssp245") throw new Error("ssp245 parse failed");

  // Post–v4.8 UI polish: dark-theme scenario control + comfort grid CSS shipped.
  const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../src/styles.css");
  const styles = readFileSync(stylesPath, "utf8");
  for (const needle of [
    "container-name: tc-comfort-precision",
    "grid-template-columns: repeat(5, minmax(0, 1fr))",
    'html[data-theme="dark"] .climate-scenario',
    "@container tc-comfort-precision",
  ]) {
    if (!styles.includes(needle)) throw new Error(`styles.css missing post-v4.8 polish: ${needle}`);
  }

  // Corpus sunshine + UTCI* comfort path on a flagship B place.
  const sb = PLACES.find(p => p.id === "santa-barbara-ca");
  if (!sb?.climate.sunshinePct) throw new Error("santa-barbara-ca missing sunshinePct");
  const comfort = buildComfortPrecisionProfile(sb);
  const utci = apparentComfortIndexFromProfile(comfort);
  if (!Number.isFinite(utci.score) || utci.score < 0 || utci.score > 100) {
    throw new Error(`UTCI* proxy invalid for santa-barbara-ca: ${utci.score}`);
  }

  const polishIds = [
    "santa-barbara-ca", "driggs-id", "flagstaff-az", "wenatchee-wa", "gunnison-co",
    "logan-ut", "fairbanks-ak", "whitehorse-yt", "victoria-bc", "hood-river-or",
    "canaan-valley-wv", "redfield-ny", "key-west-fl", "death-valley-ca",
    "klamath-falls-upper-klamath-basin-or", "lander-sinks-canyon-wy",
    "mount-charleston-nv", "spearfish-sd", "burkes-garden-va",
    "valentine-ne", "hilo-hi", "wolfville-ns", "fernie-elk-valley-bc",
    "valle-guadalupe-mx", "todos-santos-mx",
    "silver-city-nm", "ashland-or", "fort-davis-tx", "niagara-on-the-lake",
    "patzcuaro-mx", "ajijic-lake-chapala-mx",
    "boulder-co",
  ];
  for (const id of polishIds) {
    const place = PLACES.find(p => p.id === id);
    if (!place) throw new Error(`polish anchor missing: ${id}`);
    if (!place.climate.sunshinePct) throw new Error(`${id} missing sunshinePct after polish pass`);
    if (!place.liveSignals) throw new Error(`${id} missing liveSignals after polish pass`);
    if (!place.climate.humidity) throw new Error(`${id} missing humidity after Tier B polish pass`);
  }

  const tierCLiveIds = [
    "grand-marais-mi", "apalachicola-fl", "santa-cruz-felton-ca",
    "ellensburg-wa", "hood-river-gorge", "truckee-ca", "mammoth-lakes-ca",
    "borrego-springs-ca", "sedona-az", "prescott-az", "cloudcroft-nm",
    "taos-nm", "crested-butte-co", "leadville-co", "durango-co",
    "spokane-wa", "austin-tx", "washington-dc", "honolulu-hi",
  ];
  for (const id of tierCLiveIds) {
    const place = PLACES.find(p => p.id === id);
    if (!place) throw new Error(`tier C live anchor missing: ${id}`);
    if (!place.liveSignals) throw new Error(`${id} missing liveSignals after Tier C polish pass`);
  }

  const lethbridge = PLACES.find(p => p.id === "lethbridge-ab");
  if (!lethbridge?.climate.humidity) throw new Error("lethbridge-ab missing humidity (Tier A)");

  // Overview spotlight engine — every place gets a complete, humanistic read.
  const SEASON_ORDER = ["winter", "spring", "summer", "autumn"] as const;
  let authoredCount = 0;
  for (const place of PLACES) {
    if (!place.experience) throw new Error(`${place.id} missing corpus experience block`);
    const exp = composePlaceExperience(place);
    if (!exp.authored) throw new Error(`${place.id} experience: expected authored=true`);
    authoredCount += 1;
    if (!exp.lede.trim()) throw new Error(`${place.id} experience: empty lede`);
    if (!exp.immersive.trim()) throw new Error(`${place.id} experience: empty immersive`);
    if (exp.feelLine.length < 48) throw new Error(`${place.id} experience: thin feelLine (${exp.feelLine.length})`);
    if (!exp.travelerFit.trim() || !exp.residentFit.trim() || !exp.wouldNotFit.trim()) {
      throw new Error(`${place.id} experience: missing fit framing`);
    }
    if (!exp.texture.trim()) throw new Error(`${place.id} experience: empty texture`);
    if (exp.seasons.length !== 4) throw new Error(`${place.id} experience: expected 4 seasons, got ${exp.seasons.length}`);
    const proseBlob = [exp.feelLine, exp.texture, ...exp.seasons.map(s => s.detail)].join(" ");
    if (/single-digit\s+humidity/i.test(proseBlob)) {
      throw new Error(`${place.id} experience: 'single-digit humidity' localization hazard`);
    }
    exp.seasons.forEach((s, i) => {
      if (s.key !== SEASON_ORDER[i]) throw new Error(`${place.id} experience: season order drift at ${i}`);
      if (s.detail.length < 48) throw new Error(`${place.id} experience: thin ${s.key} detail (${s.detail.length})`);
      if (!s.headline.includes("&")) throw new Error(`${place.id} experience: malformed ${s.key} headline`);
      if (!Number.isFinite(s.highC) || !Number.isFinite(s.lowC)) throw new Error(`${place.id} experience: non-finite ${s.key} temps`);
      if (!s.authored) throw new Error(`${place.id} experience: ${s.key} season not authored`);
    });
  }
  if (authoredCount !== PLACES.length) {
    throw new Error(`experience coverage incomplete: ${authoredCount}/${PLACES.length}`);
  }

  const missingLive = PLACES.filter(p => !p.liveSignals);
  if (missingLive.length > 0) {
    throw new Error(`liveSignals coverage incomplete: ${PLACES.length - missingLive.length}/${PLACES.length}`);
  }
  for (const place of PLACES) {
    const ls = place.liveSignals!;
    if (ls.costPressure == null || ls.socialStress == null || ls.accessFriction == null) {
      throw new Error(`${place.id} liveSignals: missing axis scores`);
    }
    if (!ls.note || ls.note.length < 48) throw new Error(`${place.id} liveSignals: thin note`);
    const httpsSources = (ls.sources ?? []).filter(s => s.url?.startsWith("https://")).length;
    if (httpsSources < 2) throw new Error(`${place.id} liveSignals: need ≥2 HTTPS sources (${httpsSources})`);
  }

  // Tier C complete block gate — humidity, sunshine, deepSections, citations.
  const tierC = PLACES.filter(p => p.tier === "C");
  for (const place of tierC) {
    if (!place.climate.humidity) throw new Error(`${place.id} Tier C missing humidity`);
    if (!place.climate.sunshinePct) throw new Error(`${place.id} Tier C missing sunshinePct`);
    if (!place.deepSections?.length) throw new Error(`${place.id} Tier C missing deepSections`);
    const httpsCites = (place.citations ?? []).filter(c => c.url?.startsWith("https://")).length;
    if (httpsCites < 2) throw new Error(`${place.id} Tier C needs ≥2 HTTPS citations (${httpsCites})`);
  }
  if (tierC.length !== 164) throw new Error(`expected 164 Tier C places, got ${tierC.length}`);

  // Authored override precedence
  const overrideProbe = PLACES[0]!;
  const probe = composePlaceExperience({ ...overrideProbe, experience: { feel: "PROBE feel line over the derived read." } });
  if (probe.feelLine !== "PROBE feel line over the derived read.") {
    // composePlaceExperience caches by identity; a fresh object must bypass the cache.
    throw new Error("experience: authored feel override did not take precedence");
  }

  // Dossier intros — every place gets localized section leads.
  const introSample = PLACES.slice(0, 12);
  for (const place of introSample) {
    const geo = buildGeospatialAnalysis(place);
    for (const [label, intro] of [
      ["atAGlance", composeAtAGlanceIntro(place)],
      ["climate", composeClimateIntro(place)],
      ["geospatial", composeGeospatialIntro(place, geo)],
      ["practical", composePracticalReadIntro(place, geo)],
      ["tourism", composeTourismIntro(place)],
    ] as const) {
      if (intro.length < 48) throw new Error(`${place.id} dossier ${label} intro too thin (${intro.length})`);
    }
  }

  console.log("playtest-polish: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
