/**
 * Pure exporters for a shortlist of places.
 *
 * Each helper returns a string body + suggested MIME type + filename so
 * the caller can decide whether to download (Blob + anchor click), copy
 * to clipboard, or pipe somewhere else.
 *
 * Formats:
 *   - JSON     one record per place: identity, US-unit climate figures, risk
 *              levels, the app's main 0–100 scores, the active ranking's
 *              rank + score, and (with a home base) deltas vs home. A
 *              `readme` / `fields` legend states units and scales.
 *   - CSV      the same fields as columns with unit-suffixed names, RFC 4180
 *              quoting, CRLF line endings and a UTF-8 BOM for Excel.
 *   - GeoJSON  RFC 7946 FeatureCollection, lon/lat order, with the same
 *              fields in `properties`.
 *   - ICS      iCalendar all-day VEVENTs for each place's recommended visit
 *              window (one per contiguous month run, next occurrence), so a
 *              user can pin visits to a calendar app. Pure text; no I/O.
 *   - Markdown a human-readable visit plan: visit window, why visit,
 *              check-first caveat, score ingredients, and profile links.
 *
 * Pure: no DOM access, no Blob, no fetch. The caller owns the download
 * mechanic so the same helpers work in node tests + the future export
 * popover.
 */
import type { Place } from "../types";
import { getBestMonths, pickVisitWindow } from "./best-months";
import { getAnnualPrecipMm, meanAnnualHumidityPct, meanAnnualSunshinePct, meanJanLow, meanSummerHigh, summerDiurnalC } from "./climate-metrics";
import { ATLAS_EDITORIAL_SNAPSHOT, CLIMATE_NORMALS_PERIOD } from "./atlas-metadata";
import { PLACES } from "../data/places";
import { assessLiveFit, rankLiveFit } from "./live-fit";
import { rankingOptionLabel } from "./ranking-options";
import { rankPlaces, type RankingProfile } from "./scoring";
import { COMPARE_LIMIT } from "./app-url";
import { buildCompareDecisionProfiles, buildCompareDecisionRead } from "./compare-finalist-verdict";
import { buildShortlistDecisionRows } from "./decision-matrix";
import { scoreLivability } from "./livability-score";
import { hasSourcedSkySeries, observedSunshinePct } from "./hero-glance";
import { chapterCountLabel, hasThinChapterDepth, researchedChapterCount } from "./research-chapters";
import { cToF, cmToIn, mToFt, mmToIn } from "./units";

export interface ShortlistExportFile {
  body: string;
  /** Suggested filename including the extension. */
  filename: string;
  /** Suggested MIME type. */
  mimeType: string;
}

export interface ExportContext {
  /** Export time. Also the "now" that calendar events and month-aware rankings are placed against. */
  generatedAt: Date;
  appName: string;
  appUrl: string;
  /** The reader's home base. When set, table exports add "vs home" delta columns. */
  home?: Place | null;
  /** The ranking active in the app. When set, table exports add each place's rank and score in it. */
  ranking?: RankingProfile | null;
  /** Pool the ranking is computed over; defaults to the whole atlas. */
  rankingPool?: readonly Place[];
}

interface ExportEvidenceReadiness {
  place: Place;
  label: string;
  score: number;
  facts: string[];
  gaps: string[];
  action: string;
}

const DEFAULT_CONTEXT: Omit<ExportContext, "generatedAt"> = {
  appName: "Terraclima",
  appUrl: "https://sauterreed24.github.io/terraclima/",
};

function context(partial?: Partial<ExportContext>): ExportContext {
  return { generatedAt: new Date(), ...DEFAULT_CONTEXT, ...partial };
}

type Cell = string | number | null;

interface ExportColumn {
  /** CSV header: snake_case with the unit as a suffix, like `elevation_ft`. */
  csv: string;
  /** JSON / GeoJSON property name: the same words in camelCase. */
  json: string;
  /** One-line meaning, written into the JSON `fields` legend. */
  about: string;
  value: (place: Place, env: RowEnv) => Cell;
}

interface RowEnv {
  home: Place | null;
  ranking: { id: RankingProfile; label: string; of: number; byId: Map<string, { rank: number; score: number }> } | null;
}

const round = (value: number, digits = 0): number => {
  const f = 10 ** digits;
  // `+ 0` folds −0 into 0 so a spreadsheet never shows "-0".
  return Math.round(value * f) / f + 0;
};
const orNull = (value: number | null | undefined, digits = 0): number | null =>
  value == null || !Number.isFinite(value) ? null : round(value, digits);
/** A temperature DIFFERENCE in °C expressed in °F (no 32° offset). */
const deltaCToF = (deltaC: number): number => (deltaC * 9) / 5;

/** Annual snowfall (in), or null when the place has no station snowfall series or it sums to zero. */
function annualSnowIn(place: Place): number | null {
  const snow = place.climate.snowCm;
  if (!snow) return null;
  const totalCm = snow.reduce((sum, v) => sum + v, 0);
  return totalCm > 0 ? round(cmToIn(totalCm), 1) : null;
}

/** Share of possible sunshine: the station series where the place has one, else the solar-resource estimate. */
function sunshine(place: Place): { pct: number; basis: "station" | "estimated" } | null {
  const station = observedSunshinePct(place);
  if (station != null) return { pct: station, basis: "station" };
  const estimate = meanAnnualSunshinePct(place);
  return estimate == null ? null : { pct: round(estimate), basis: "estimated" };
}

const summerHighF = (p: Place) => round(cToF(meanSummerHigh(p)), 1);
const winterLowF = (p: Place) => round(cToF(meanJanLow(p)), 1);
const annualPrecipIn = (p: Place) => round(mmToIn(getAnnualPrecipMm(p)), 1);

function vsHome(metric: (p: Place) => number | null, digits: number) {
  return (place: Place, env: RowEnv): Cell => {
    if (!env.home) return null;
    const here = metric(place);
    const there = metric(env.home);
    return here == null || there == null ? null : round(here - there, digits);
  };
}

const BASE_COLUMNS: readonly ExportColumn[] = [
  { csv: "id", json: "id", about: "Stable place id; open a profile with ?p=<id>.", value: p => p.id },
  { csv: "name", json: "name", about: "Place name.", value: p => p.name },
  { csv: "region", json: "region", about: "State, province or territory.", value: p => p.region ?? "" },
  { csv: "country", json: "country", about: "Country.", value: p => p.country },
  { csv: "lat", json: "lat", about: "Latitude, decimal degrees.", value: p => p.lat },
  { csv: "lon", json: "lon", about: "Longitude, decimal degrees.", value: p => p.lon },
  { csv: "elevation_ft", json: "elevationFt", about: "Elevation, feet.", value: p => Math.round(mToFt(p.elevationM)) },
  { csv: "koppen", json: "koppen", about: "Köppen climate class.", value: p => p.koppen },
  { csv: "tier", json: "tier", about: "Editorial depth tier: A (deepest) to C.", value: p => p.tier },
  { csv: "biome", json: "biome", about: "Biome.", value: p => p.biome ?? "" },
  { csv: "summer_high_f", json: "summerHighF", about: "Mean daily high, June–August, °F.", value: summerHighF },
  { csv: "winter_low_f", json: "winterLowF", about: "Mean daily low, December–February, °F.", value: winterLowF },
  { csv: "annual_precip_in", json: "annualPrecipIn", about: "Annual precipitation (rain plus melted snow), inches.", value: annualPrecipIn },
  { csv: "annual_snow_in", json: "annualSnowIn", about: "Annual snowfall, inches. Blank when no station snowfall is recorded.", value: annualSnowIn },
  { csv: "humidity_pct", json: "humidityPct", about: "Mean annual relative humidity, %. Blank when not recorded.", value: p => orNull(meanAnnualHumidityPct(p)) },
  { csv: "frost_free_days", json: "frostFreeDays", about: "Approximate frost-free days per year.", value: p => orNull(p.climate.frostFreeDays) },
  { csv: "sunshine_pct", json: "sunshinePct", about: "Annual share of possible sunshine, %.", value: p => sunshine(p)?.pct ?? null },
  { csv: "sunshine_basis", json: "sunshineBasis", about: "\"station\" = measured sunshine record; \"estimated\" = derived from gridded solar energy.", value: p => sunshine(p)?.basis ?? null },
  { csv: "summer_day_night_swing_f", json: "summerDayNightSwingF", about: "Typical summer difference between afternoon high and overnight low, °F.", value: p => round(deltaCToF(summerDiurnalC(p)), 1) },
  { csv: "best_months", json: "bestMonths", about: "Recommended visit window (months).", value: p => pickVisitWindow(getBestMonths(p, "F"))?.range ?? null },
  { csv: "best_months_for", json: "bestMonthsFor", about: "What the visit window is good for.", value: p => pickVisitWindow(getBestMonths(p, "F"))?.label ?? null },
  { csv: "wildfire_risk", json: "wildfireRisk", about: "Wildfire risk level: very-low, low, moderate, elevated, high or very-high.", value: p => p.risks.wildfire.level },
  { csv: "smoke_risk", json: "smokeRisk", about: "Wildfire-smoke risk level (same scale).", value: p => p.risks.smoke.level },
  { csv: "flood_risk", json: "floodRisk", about: "Flood risk level (same scale).", value: p => p.risks.flood.level },
  { csv: "uniqueness_score_0_100", json: "uniquenessScore", about: "Microclimate uniqueness, 0–100 (higher = more unusual for its surroundings).", value: p => p.scores.microclimateUniqueness },
  { csv: "livability_score_0_100", json: "livabilityScore", about: "Livability, 0–100 (higher = easier to live in year-round).", value: p => scoreLivability(p).score },
  { csv: "live_here_fit_score_0_100", json: "liveHereFitScore", about: "Live-here fit with no preferences set, 0–100 (higher = better).", value: p => assessLiveFit(p).score },
  { csv: "resilience_score_0_100", json: "resilienceScore", about: "Climate-change resilience, 0–100 (higher = more resilient).", value: p => p.scores.resilience },
  { csv: "growability_score_0_100", json: "growabilityScore", about: "Growability for gardens and crops, 0–100 (higher = better).", value: p => p.scores.growability },
];

const RANKING_COLUMNS: readonly ExportColumn[] = [
  { csv: "ranking", json: "ranking", about: "The ranking that was active in the app at export time.", value: (_p, env) => env.ranking?.label ?? null },
  { csv: "ranking_rank", json: "rankingRank", about: "This place's position in that ranking across the whole atlas (1 = top).", value: (p, env) => env.ranking?.byId.get(p.id)?.rank ?? null },
  { csv: "ranking_of", json: "rankingOf", about: "Number of places ranked.", value: (_p, env) => env.ranking?.of ?? null },
  { csv: "ranking_score", json: "rankingScore", about: "This place's score in that ranking (higher ranks first; scale depends on the ranking).", value: (p, env) => orNull(env.ranking?.byId.get(p.id)?.score, 2) },
];

const PERIOD_COLUMNS: readonly ExportColumn[] = [
  { csv: "climate_normals_period", json: "climateNormalsPeriod", about: "Years the climate averages cover.", value: () => CLIMATE_NORMALS_PERIOD },
];

/** Place minus home base; blank where either side has no value. Present only when a home base is set. */
const HOME_COLUMNS: readonly ExportColumn[] = [
  { csv: "home_base", json: "homeBase", about: "The home base the vs-home columns compare against.", value: (_p, env) => env.home?.name ?? null },
  { csv: "summer_high_vs_home_f", json: "summerHighVsHomeF", about: "Summer high minus home's, °F (positive = hotter).", value: vsHome(summerHighF, 1) },
  { csv: "winter_low_vs_home_f", json: "winterLowVsHomeF", about: "Winter low minus home's, °F (positive = milder nights).", value: vsHome(winterLowF, 1) },
  { csv: "annual_precip_vs_home_in", json: "annualPrecipVsHomeIn", about: "Annual precipitation minus home's, inches.", value: vsHome(annualPrecipIn, 1) },
  { csv: "annual_snow_vs_home_in", json: "annualSnowVsHomeIn", about: "Annual snowfall minus home's, inches (blank unless both record snowfall).", value: vsHome(annualSnowIn, 1) },
  { csv: "humidity_vs_home_pct", json: "humidityVsHomePct", about: "Mean humidity minus home's, percentage points.", value: vsHome(p => orNull(meanAnnualHumidityPct(p)), 0) },
  { csv: "sunshine_vs_home_pct", json: "sunshineVsHomePct", about: "Sunshine share minus home's, percentage points.", value: vsHome(p => sunshine(p)?.pct ?? null, 0) },
  { csv: "livability_vs_home", json: "livabilityVsHome", about: "Livability score minus home's, points.", value: vsHome(p => scoreLivability(p).score, 0) },
];

function rankingEnv(ctx: ExportContext): RowEnv["ranking"] {
  if (!ctx.ranking) return null;
  const pool = [...(ctx.rankingPool ?? PLACES)];
  const rows = ctx.ranking === "live-fit" ? rankLiveFit(pool) : rankPlaces(ctx.ranking, pool, ctx.generatedAt);
  const byId = new Map<string, { rank: number; score: number }>();
  rows.forEach((row, i) => byId.set(row.place.id, { rank: i + 1, score: row.score }));
  return { id: ctx.ranking, label: rankingOptionLabel(ctx.ranking), of: rows.length, byId };
}

function exportTable(ctx: ExportContext): { columns: ExportColumn[]; env: RowEnv } {
  const env: RowEnv = { home: ctx.home ?? null, ranking: rankingEnv(ctx) };
  return {
    env,
    columns: [
      ...BASE_COLUMNS,
      ...(env.ranking ? RANKING_COLUMNS : []),
      ...PERIOD_COLUMNS,
      ...(env.home ? HOME_COLUMNS : []),
    ],
  };
}

function jsonRow(place: Place, columns: readonly ExportColumn[], env: RowEnv): Record<string, Cell> {
  const row: Record<string, Cell> = {};
  for (const column of columns) row[column.json] = column.value(place, env);
  return row;
}

/** Shared explanatory header for the JSON and GeoJSON exports. */
function exportLegend(columns: readonly ExportColumn[], env: RowEnv) {
  return {
    readme: [
      "US units throughout: °F, inches, feet. Numbers are plain (no thousands separators); null means not recorded.",
      "Scores run 0–100 and higher is better. They are editorial indices for comparing places, not measurements.",
      `Climate figures are ${CLIMATE_NORMALS_PERIOD} averages (${ATLAS_EDITORIAL_SNAPSHOT.toLowerCase()}), not a forecast and not live weather.`,
      ...(env.ranking ? [`Ranking columns use "${env.ranking.label}" as ranked across ${env.ranking.of} places at export time.`] : []),
      ...(env.home ? [`"vs home" fields are this place minus ${env.home.name}.`] : []),
    ],
    units: { temperature: "°F", precipitation: "in", snowfall: "in", elevation: "ft", humidity: "%", sunshine: "% of possible" },
    scoreScale: "0–100, higher is better",
    climateNormalsPeriod: CLIMATE_NORMALS_PERIOD,
    dataSnapshot: ATLAS_EDITORIAL_SNAPSHOT,
    ranking: env.ranking ? { id: env.ranking.id, label: env.ranking.label, placesRanked: env.ranking.of } : null,
    homeBase: env.home ? { id: env.home.id, name: env.home.name } : null,
    fields: Object.fromEntries(columns.map(column => [column.json, column.about])),
  };
}

export function exportShortlistAsJSON(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const { columns, env } = exportTable(ctx);
  const body = JSON.stringify(
    {
      generator: ctx.appName,
      generatedAt: ctx.generatedAt.toISOString(),
      source: ctx.appUrl,
      ...exportLegend(columns, env),
      count: places.length,
      places: places.map(place => jsonRow(place, columns, env)),
    },
    null,
    2,
  );
  return {
    body,
    filename: `terraclima-shortlist-${stampSlug(ctx.generatedAt)}.json`,
    mimeType: "application/json",
  };
}

/** UTF-8 byte-order mark: without it Excel reads "Mérida" as "MÃ©rida". */
export const CSV_BOM = "\uFEFF";

export function exportShortlistAsCSV(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const { columns, env } = exportTable(ctx);
  const header = columns.map(column => column.csv);
  const rows = places.map(place => columns.map(column => column.value(place, env)));
  const body = CSV_BOM + [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return {
    body,
    filename: `terraclima-shortlist-${stampSlug(ctx.generatedAt)}.csv`,
    mimeType: "text/csv;charset=utf-8",
  };
}

export function exportShortlistAsGeoJSON(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const { columns, env } = exportTable(ctx);
  const body = JSON.stringify(
    {
      type: "FeatureCollection",
      generator: ctx.appName,
      generatedAt: ctx.generatedAt.toISOString(),
      source: ctx.appUrl,
      ...exportLegend(columns, env),
      features: places.map(place => ({
        type: "Feature",
        // RFC 7946: lon, lat order; the spec puts altitude (meters) third.
        // Properties carry the US units the rest of the atlas uses.
        geometry: { type: "Point", coordinates: [place.lon, place.lat, place.elevationM] },
        properties: jsonRow(place, columns, env),
      })),
    },
    null,
    2,
  );
  return {
    body,
    filename: `terraclima-shortlist-${stampSlug(ctx.generatedAt)}.geojson`,
    // RFC 7946 registered type.
    mimeType: "application/geo+json",
  };
}

/** One contiguous run of months; `endMonth` < `startMonth` means it wraps past December. */
export interface MonthRun {
  startMonth: number;
  endMonth: number;
}

/**
 * Parse a BestWindow range ("May", "May–Sep", "Nov–Feb", "Apr–May, Sep–Oct",
 * "Year-round") into contiguous month runs. Unparseable segments are dropped;
 * "Year-round" and prose return no runs (the caller emits a reminder instead).
 */
export function parseMonthRuns(range: string): MonthRun[] {
  const runs: MonthRun[] = [];
  for (const segment of range.split(/[,;&]|\band\b/i)) {
    const parts = segment.split(/[\u2012-\u2015\-/]|\bto\b/i).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0 || parts.length > 2) continue;
    const a = monthIndex(parts[0]!);
    const b = parts.length === 2 ? monthIndex(parts[1]!) : a;
    if (a < 0 || b < 0) continue;
    runs.push({ startMonth: a, endMonth: b });
  }
  return runs;
}

/**
 * The next occurrence of a month run on or after `now`: a run still in
 * progress keeps this occurrence; one already over rolls to next year.
 * Returns all-day bounds with an exclusive end (RFC 5545 DATE semantics).
 */
export function nextMonthRunOccurrence(run: MonthRun, now: Date): { start: Date; endExclusive: Date } {
  const span = ((run.endMonth - run.startMonth + 12) % 12) + 1;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let year = now.getUTCFullYear() - 1; ; year++) {
    const start = new Date(Date.UTC(year, run.startMonth, 1));
    // Date.UTC normalises month overflow, so a Nov–Feb run ends on 1 March of the following year.
    const endExclusive = new Date(Date.UTC(year, run.startMonth + span, 1));
    if (endExclusive.getTime() > today) return { start, endExclusive };
  }
}

function icsClimateLine(place: Place): string {
  const f = (c: number) => `${Math.round(cToF(c))}°F`;
  const precipIn = Math.round(mmToIn(getAnnualPrecipMm(place)));
  return `Typical climate: summer highs near ${f(meanSummerHigh(place))}, winter lows near ${f(meanJanLow(place))}, ` +
    `about ${precipIn} in of precipitation a year.`;
}

/**
 * Build an iCalendar VCALENDAR of all-day "best time to visit" events: one
 * VEVENT per contiguous month run of each place's recommended visit window
 * (so "Apr–May, Sep–Oct" yields two events), each placed on its next
 * occurrence relative to `generatedAt` and wrapping into the following year
 * where the run crosses December. A place with no month window, or a
 * year-round one, gets a single one-day reminder on the export date.
 */
export function exportShortlistAsICS(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const now = ctx.generatedAt;
  const host = icsHost(ctx.appUrl);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${ctx.appName}//Shortlist Export//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(`${ctx.appName} best times to visit`)}`,
  ];
  for (const place of places) {
    // US units throughout: the window note carries °F thresholds.
    const window = pickVisitWindow(getBestMonths(place, "F"));
    const runs = window ? parseMonthRuns(window.range) : [];
    const yearRound = window != null && /year.?round/i.test(window.range);
    const occurrences = runs.length > 0
      ? runs.map(run => nextMonthRunOccurrence(run, now))
      : [{
          start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
          endExclusive: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)),
        }];
    occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
    const profileUrl = `${ctx.appUrl}?p=${encodeURIComponent(place.id)}`;
    const summary = runs.length > 0
      ? `Best time to visit ${place.name}`
      : yearRound
        ? `Visit ${place.name}: good year-round`
        : `Plan a visit to ${place.name}`;
    const description = [
      window ? `${window.label}: ${window.range}.${window.note ? ` ${withFullStop(window.note)}` : ""}` : null,
      runs.length > 1 ? "This window comes in separate parts; each part has its own calendar entry." : null,
      runs.length === 0 && !yearRound ? "No single best window stands out; see the profile's season-by-season section before picking dates." : null,
      icsClimateLine(place),
      "Climate averages, not a forecast.",
      `Profile: ${profileUrl}`,
    ]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");
    const location = [place.name, place.region, countryLabel(place.country)].filter(Boolean).join(", ");
    for (const { start, endExclusive } of occurrences) {
      const uidSlug = place.id.replace(/[^A-Za-z0-9-]+/g, "-");
      lines.push("BEGIN:VEVENT");
      // Stable per place + occurrence, so re-importing a later export updates rather than duplicates.
      lines.push(`UID:terraclima-${uidSlug}-${formatIcsDate(start)}@${host}`);
      lines.push(`DTSTAMP:${formatIcsUtc(now)}`);
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(endExclusive)}`);
      lines.push(`SUMMARY:${icsEscape(summary)}`);
      lines.push(`DESCRIPTION:${icsEscape(description)}`);
      if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
        lines.push(`GEO:${place.lat.toFixed(5)};${place.lon.toFixed(5)}`);
      }
      lines.push(`LOCATION:${icsEscape(location)}`);
      lines.push(`URL:${profileUrl}`);
      // All-day planning banners should not block the day as busy.
      lines.push("TRANSP:TRANSPARENT");
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return {
    body: lines.map(foldIcsLine).join("\r\n") + "\r\n",
    filename: `terraclima-shortlist-${stampSlug(ctx.generatedAt)}.ics`,
    mimeType: "text/calendar",
  };
}

export function exportShortlistAsMarkdown(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const rows = buildShortlistDecisionRows(
    places.map(place => {
      const livability = scoreLivability(place).score;
      return { place, score: livability, note: `${livability}/100 livability` };
    }),
    {},
    places.length,
  );
  const lines = [
    "# Terraclima visit plan",
    "",
    `Generated: ${ctx.generatedAt.toISOString()}`,
    `Source: ${ctx.appUrl}`,
    `Places: ${places.length}`,
    "",
    "This plan is built from climate averages and editorial scores. It is not live weather and not advice. Check housing, services, hazards, medical needs, schools, insurance and local rules with official local sources before deciding anything.",
    "",
    "## Pinned shortlist",
    "",
  ];

  if (places.length === 0) {
    lines.push("No pinned places yet.");
  } else {
    for (const row of rows) {
      const place = row.place;
      const bestWindow = getBestMonths(place, "C").find(window => window.kind === "good");
      const location = [place.region, countryLabel(place.country)].filter(Boolean).join(", ");
      lines.push(`### ${row.rank}. ${place.name}`);
      lines.push("");
      lines.push(`- Location: ${location}`);
      lines.push(`- Köppen climate class: ${place.koppen}; tier ${place.tier}`);
      if (bestWindow) {
        const note = bestWindow.note ? ` - ${bestWindow.note}` : "";
        lines.push(`- Best visit window: ${bestWindow.label} (${bestWindow.range})${note}`);
      } else {
        lines.push("- Best visit window: see the profile's season-by-season section before picking dates.");
      }
      lines.push(`- Why visit: ${row.bestFor}`);
      lines.push(`- Check first: ${row.watch}`);
      lines.push(
        `- Scores: live-here fit ${row.liveFitScore}/100; felt comfort ${row.comfortScore}/100; ` +
        `overall risk ${row.riskLoad}/100; growability ${row.growability}/100; cost and access ${row.livedEase}/100.`,
      );
      lines.push(`- Profile: ${ctx.appUrl}?p=${encodeURIComponent(place.id)}`);
      lines.push("");
    }

    lines.push("## How well sourced");
    lines.push("");
    lines.push("Least well-sourced places first. Use this to decide what to confirm before booking a visit or looking at housing.");
    lines.push("");
    for (const row of buildExportEvidenceReadiness(places)) {
      lines.push(`### ${row.place.name} - ${row.label} (${row.score}/100)`);
      lines.push("");
      lines.push(`- Sources: ${row.facts.join("; ")}.`);
      lines.push(`- Gaps: ${row.gaps.join("; ")}.`);
      lines.push(`- Next step: ${row.action}`);
      lines.push("");
    }
  }

  lines.push("## Compare next");
  lines.push("");
  if (places.length >= 2) {
    const comparePlaces = places.slice(0, COMPARE_LIMIT);
    const compareRead = buildCompareDecisionRead(buildCompareDecisionProfiles(comparePlaces));
    lines.push(`Compare URL: ${compareUrl(ctx.appUrl, comparePlaces)}`);
    lines.push("");
    if (places.length > COMPARE_LIMIT) {
      lines.push(`Compare opens the first ${COMPARE_LIMIT} pinned places; all ${places.length} pinned places are listed above.`);
      lines.push("");
    }
    if (compareRead) {
      lines.push(`Summary: ${compareRead.summary}`);
      lines.push(`Next step: ${compareRead.nextAction}`);
      lines.push(`Caution: ${compareRead.caution}`);
      lines.push("");
      lines.push("Check before you go:");
      for (const item of compareRead.verificationChecklist) {
        lines.push(`- ${item.label} - ${item.place.name}: ${item.action} Proof: ${item.proof}`);
      }
      lines.push("");
      lines.push("| Role | Place | Score | Fit | Risk | Visit | Check first |");
      lines.push("| --- | --- | ---: | --- | --- | --- | --- |");
      for (const row of compareRead.tableRows) {
        lines.push(`| ${[
          markdownCell(row.role),
          markdownCell(row.place.name),
          `${row.decisionScore}/100`,
          markdownCell(row.fitSummary),
          markdownCell(row.riskSummary),
          markdownCell(row.visitWindow),
          markdownCell(row.watch),
        ].join(" | ")} |`);
      }
      lines.push("");
    }
  } else if (places.length === 1) {
    const anchor = places[0];
    const row = rows[0];
    lines.push(`Compare URL: ${compareUrl(ctx.appUrl, places)}`);
    lines.push("");
    lines.push(`${anchor.name} is the only pinned place. Add a second place in Compare to see tradeoffs.`);
    if (row) {
      lines.push(`${row.bestFor} Check first: ${row.watch}`);
    }
    lines.push("");
  } else {
    lines.push("Pin at least two places to get a side-by-side table.");
    lines.push("");
  }
  lines.push("Places are listed in the order you pinned them. This plan is not a route, a booking, an appraisal or a recommendation to move.");

  return {
    body: lines.join("\n") + "\n",
    filename: `terraclima-visit-plan-${stampSlug(ctx.generatedAt)}.md`,
    mimeType: "text/markdown",
  };
}

// --- helpers ------------------------------------------------------------

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function monthIndex(name: string): number {
  const norm = name.trim().slice(0, 3).toLowerCase();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (MONTH_NAMES[i].toLowerCase() === norm) return i;
  }
  return -1;
}

/** RFC 4180 cell: quoted when it holds a comma, quote or line break (or edge whitespace a parser might trim). */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s === "") return "";
  if (/[",\r\n]|^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function stampSlug(d: Date): string {
  const iso = d.toISOString();
  return iso.slice(0, 19).replace(/[:T-]/g, "");
}

function formatIcsUtc(d: Date): string {
  const iso = d.toISOString();
  return iso.slice(0, 19).replace(/[-:]/g, "") + "Z";
}

function formatIcsDate(d: Date): string {
  // YYYYMMDD per RFC 5545 §3.3.4 (DATE).
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** RFC 5545 §3.3.11 TEXT escaping: backslash, semicolon, comma, and newline as a literal "\n". */
export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

const UTF8 = new TextEncoder();

/**
 * RFC 5545 §3.1 line folding: no content line longer than 75 octets; a
 * continuation starts with one space. Splits between code points so a
 * multi-byte UTF-8 character is never cut.
 */
export function foldIcsLine(line: string): string {
  if (UTF8.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    const size = UTF8.encode(ch).length;
    // Continuation lines spend one octet on the leading space.
    const limit = out.length === 0 ? 75 : 74;
    if (octets + size > limit) {
      out.push(current);
      current = "";
      octets = 0;
    }
    current += ch;
    octets += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

function icsHost(appUrl: string): string {
  try {
    return new URL(appUrl).hostname || "terraclima";
  } catch {
    return "terraclima";
  }
}

function withFullStop(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function markdownCell(s: string): string {
  return s.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
}

function buildExportEvidenceReadiness(places: readonly Place[]): ExportEvidenceReadiness[] {
  return places.map(place => {
    const httpsCitations = place.citations.filter(citation => citation.url?.startsWith("https://")).length;
    const chapters = researchedChapterCount(place);
    const hasLiveSignals = Boolean(place.liveSignals && Object.values(place.liveSignals).some(value => typeof value === "number"));
    const hasHumidity = Boolean(place.climate.humidity?.length);
    const hasSunshine = hasSourcedSkySeries(place);
    const confidenceScore = place.confidence === "high" ? 34 : place.confidence === "moderate" ? 22 : 10;
    const score = Math.min(100, Math.round(
      confidenceScore +
      Math.min(httpsCitations * 8, 24) +
      Math.min(chapters * 8, 24) +
      (hasLiveSignals ? 8 : 0) +
      (hasHumidity ? 5 : 0) +
      (hasSunshine ? 5 : 0),
    ));
    const gaps = [
      ...(place.confidence === "low" ? ["the low-confidence entry"] : place.confidence === "moderate" ? ["the moderate-confidence entry"] : []),
      ...(httpsCitations < 2 ? ["finding a second web source"] : []),
      ...(hasThinChapterDepth(place) ? ["the thin in-depth text"] : []),
      ...(!hasLiveSignals ? ["missing cost and access data"] : []),
      ...(!hasHumidity ? ["missing measured humidity"] : []),
      ...(!hasSunshine ? ["missing measured sunshine"] : []),
    ].slice(0, 5);
    const label = score >= 78 && gaps.length <= 1
      ? "Well sourced"
      : score >= 58
        ? "Check before booking"
        : "Thinly sourced";
    const action = gaps.length === 0
      ? "Enough to compare with confidence. Still check hazards for the exact address, and logistics."
      : `Start with ${gaps[0]}. Check it before planning a trip or a move.`;

    return {
      place,
      label,
      score,
      facts: [
        `${place.confidence} confidence`,
        `${httpsCitations} web source${httpsCitations === 1 ? "" : "s"}`,
        chapterCountLabel(chapters),
        hasLiveSignals ? "cost and access data" : "no cost or access data",
        hasHumidity ? "measured humidity" : "no measured humidity",
        hasSunshine ? "measured sunshine" : "no measured sunshine",
      ],
      gaps: gaps.length ? gaps : ["no major gaps"],
      action,
    };
  }).sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id));
}

function compareUrl(appUrl: string, places: readonly Place[]): string {
  const separator = appUrl.includes("?") ? "&" : "?";
  const ids = places.map(place => encodeURIComponent(place.id)).join(",");
  return `${appUrl}${separator}cmp=${ids}`;
}

function countryLabel(country: Place["country"]): string {
  return country === "USA" ? "United States" : country;
}
