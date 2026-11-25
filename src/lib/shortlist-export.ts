/**
 * Pure exporters for a shortlist of places.
 *
 * Each helper returns a string body + suggested MIME type + filename so
 * the caller can decide whether to download (Blob + anchor click), copy
 * to clipboard, or pipe somewhere else.
 *
 * Formats:
 *   - JSON     a minimal serialisation: id, name, region, country, lat,
 *              lon, koppen, tier, biome. Stable enough to round-trip back
 *              into the corpus by id, opaque enough that an editorial
 *              schema change won't break consumers.
 *   - CSV      same fields, RFC 4180 quoting (commas + quotes escaped),
 *              CRLF line endings.
 *   - GeoJSON  RFC 7946 FeatureCollection, lon/lat order, with the same
 *              metadata in `properties`.
 *   - ICS      iCalendar VEVENT per place's best-month window (when the
 *              best-months helper returns a "good" window), so a user can
 *              pin scouting trips to a calendar app. Pure text; no I/O.
 *   - Markdown a human-readable scouting plan: visit window, why scout,
 *              watch-first caveat, score ingredients, and dossier links.
 *
 * Pure: no DOM access, no Blob, no fetch. The caller owns the download
 * mechanic so the same helpers work in node tests + the future export
 * popover.
 */
import type { Place } from "../types";
import { getBestMonths, pickVisitWindow } from "./best-months";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh } from "./climate-metrics";
import { COMPARE_LIMIT } from "./app-url";
import { buildCompareDecisionProfiles, buildCompareDecisionRead } from "./compare-finalist-verdict";
import { buildShortlistDecisionRows } from "./decision-matrix";
import { scoreLivability } from "./livability-score";
import { hasSourcedSkySeries } from "./hero-glance";
import { chapterCountLabel, hasThinChapterDepth, researchedChapterCount } from "./research-chapters";
import { cToF, mToFt, mmToIn } from "./units";

export interface ShortlistExportFile {
  body: string;
  /** Suggested filename including the extension. */
  filename: string;
  /** Suggested MIME type. */
  mimeType: string;
}

interface ExportContext {
  generatedAt: Date;
  appName: string;
  appUrl: string;
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

function placeRow(place: Place) {
  return {
    id: place.id,
    name: place.name,
    region: place.region ?? "",
    country: place.country,
    lat: place.lat,
    lon: place.lon,
    elevationFt: Math.round(mToFt(place.elevationM)),
    koppen: place.koppen,
    tier: place.tier,
    biome: place.biome ?? "",
  };
}

export function exportShortlistAsJSON(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const body = JSON.stringify(
    {
      generator: ctx.appName,
      generatedAt: ctx.generatedAt.toISOString(),
      source: ctx.appUrl,
      count: places.length,
      places: places.map(placeRow),
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

export function exportShortlistAsCSV(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const header = ["id", "name", "region", "country", "lat", "lon", "elevation_ft", "koppen", "tier", "biome"];
  const rows = places.map(p => {
    const r = placeRow(p);
    return [r.id, r.name, r.region, r.country, r.lat, r.lon, r.elevationFt, r.koppen, r.tier, r.biome];
  });
  const body = [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return {
    body,
    filename: `terraclima-shortlist-${stampSlug(ctx.generatedAt)}.csv`,
    mimeType: "text/csv",
  };
}

export function exportShortlistAsGeoJSON(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const body = JSON.stringify(
    {
      type: "FeatureCollection",
      generator: ctx.appName,
      generatedAt: ctx.generatedAt.toISOString(),
      source: ctx.appUrl,
      features: places.map(place => ({
        type: "Feature",
        // RFC 7946: lon, lat order; the spec puts altitude (meters) third.
        // Properties carry the feet the rest of the atlas uses.
        geometry: { type: "Point", coordinates: [place.lon, place.lat, place.elevationM] },
        properties: placeRow(place),
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
    filename: `terraclima-scout-plan-${stampSlug(ctx.generatedAt)}.md`,
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

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s === "") return "";
  if (/[",\r\n]/.test(s)) {
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
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
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
