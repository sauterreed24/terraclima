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
import { getBestMonths } from "./best-months";
import { COMPARE_LIMIT } from "./app-url";
import { buildCompareDecisionProfiles, buildCompareDecisionRead } from "./compare-finalist-verdict";
import { buildShortlistDecisionRows } from "./decision-matrix";
import { scoreLivability } from "./livability-score";

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
    elevationM: place.elevationM,
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
  const header = ["id", "name", "region", "country", "lat", "lon", "elevation_m", "koppen", "tier", "biome"];
  const rows = places.map(p => {
    const r = placeRow(p);
    return [r.id, r.name, r.region, r.country, r.lat, r.lon, r.elevationM, r.koppen, r.tier, r.biome];
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
        // RFC 7946: lon, lat order. Elevation (m) as the 3rd coordinate.
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

/**
 * Build an iCalendar VCALENDAR with one VEVENT per shortlisted place, sized
 * to the place's first "good" best-month window. The window is parsed
 * leniently from BestWindow.range (e.g. "May–Sep") — anything we can't
 * parse falls back to a "scout this place" all-day event on the export
 * date so the user still gets a reminder.
 */
export function exportShortlistAsICS(
  places: readonly Place[],
  ctxPartial?: Partial<ExportContext>,
): ShortlistExportFile {
  const ctx = context(ctxPartial);
  const year = ctx.generatedAt.getUTCFullYear();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${ctx.appName}//Shortlist Export//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const place of places) {
    const window = getBestMonths(place, "C").find(w => w.kind === "good");
    const range = window ? parseMonthRange(window.range) : null;
    const start = range
      ? monthRangeStart(range.startMonth, year)
      : new Date(Date.UTC(year, ctx.generatedAt.getUTCMonth(), ctx.generatedAt.getUTCDate()));
    const end = range
      ? monthRangeEnd(range.endMonth, year)
      : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:terraclima-${place.id}-${year}@sauterreed24.github.io`);
    lines.push(`DTSTAMP:${formatIcsUtc(ctx.generatedAt)}`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(end)}`);
    const summary = window
      ? `Scout ${place.name} — ${window.label}`
      : `Scout ${place.name}`;
    lines.push(`SUMMARY:${icsEscape(summary)}`);
    const description = [
      window?.range,
      window?.note,
      `Source: ${ctx.appUrl}?p=${place.id}`,
    ]
      .filter(Boolean)
      .join("\\n\\n");
    if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
    if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
      lines.push(`GEO:${place.lat.toFixed(5)};${place.lon.toFixed(5)}`);
    }
    lines.push(`LOCATION:${icsEscape(`${place.name}, ${place.region ?? ""}, ${place.country}`)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return {
    body: lines.join("\r\n") + "\r\n",
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
      return { place, score: livability, note: `${livability}/100 livability screen` };
    }),
    {},
    places.length,
  );
  const lines = [
    "# Terraclima Scout Plan",
    "",
    `Generated: ${ctx.generatedAt.toISOString()}`,
    `Source: ${ctx.appUrl}`,
    `Places: ${places.length}`,
    "",
    "Screening-grade climate and livability intelligence only. Verify housing, services, hazards, medical needs, schools, insurance, and local rules with official local sources before making decisions.",
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
      lines.push(`- Climate class: ${place.koppen}; tier ${place.tier}`);
      if (bestWindow) {
        const note = bestWindow.note ? ` - ${bestWindow.note}` : "";
        lines.push(`- Best visit window: ${bestWindow.label} (${bestWindow.range})${note}`);
      } else {
        lines.push("- Best visit window: Check the dossier's season-by-season read before scheduling.");
      }
      lines.push(`- Why scout: ${row.bestFor}`);
      lines.push(`- Watch first: ${row.watch}`);
      lines.push(
        `- Score ingredients: live-here fit ${row.liveFitScore}/100; felt comfort ${row.comfortScore}/100; ` +
        `risk load ${row.riskLoad}/100; growability ${row.growability}/100; lived ease ${row.livedEase}/100.`,
      );
      lines.push(`- Dossier: ${ctx.appUrl}?p=${encodeURIComponent(place.id)}`);
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
      lines.push(`Compare opens the first ${COMPARE_LIMIT} pinned places; this export still keeps all ${places.length} places in the pinned shortlist above.`);
      lines.push("");
    }
    if (compareRead) {
      lines.push(`Decision read: ${compareRead.summary}`);
      lines.push(`Next action: ${compareRead.nextAction}`);
      lines.push(`Caution: ${compareRead.caution}`);
      lines.push("");
      lines.push("| Role | Place | Score | Fit | Risk | Visit | Watch first |");
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
    lines.push(`Compare setup URL: ${compareUrl(ctx.appUrl, places)}`);
    lines.push("");
    lines.push(`${anchor.name} is saved as the anchor finalist. Use Compare setup to add a similar peer or a counterweight before trusting the side-by-side read.`);
    if (row) {
      lines.push(`Anchor read: ${row.bestFor} Watch first: ${row.watch}`);
    }
    lines.push("");
  } else {
    lines.push("Pin at least two places to generate a Compare-ready finalist table.");
    lines.push("");
  }
  lines.push("Use Compare for finalists that survived the watch-first caveats. This plan preserves your pinned order; it is not a route, booking, appraisal, or recommendation to move.");

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

/**
 * Parse a BestWindow range string into a start + end month index.
 * Accepts "May", "May–Sep", "May-Sep" (any dash flavour), and falls back
 * to `null` for anything else (split months, prose ranges, etc.).
 */
function parseMonthRange(range: string): { startMonth: number; endMonth: number } | null {
  const cleaned = range.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(/[\u2013\u2014–—\-/]/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const idx = monthIndex(parts[0]);
    return idx >= 0 ? { startMonth: idx, endMonth: idx } : null;
  }
  const a = monthIndex(parts[0]);
  const b = monthIndex(parts[1]);
  if (a < 0 || b < 0) return null;
  return { startMonth: a, endMonth: b };
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

function icsEscape(s: string): string {
  // RFC 5545 §3.3.11: escape commas, semicolons, backslashes, newlines.
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");
}

function markdownCell(s: string): string {
  return s.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
}

function compareUrl(appUrl: string, places: readonly Place[]): string {
  const separator = appUrl.includes("?") ? "&" : "?";
  const ids = places.map(place => encodeURIComponent(place.id)).join(",");
  return `${appUrl}${separator}cmp=${ids}`;
}

function countryLabel(country: Place["country"]): string {
  return country === "USA" ? "United States" : country;
}

function monthRangeStart(monthIdx: number, year: number): Date {
  return new Date(Date.UTC(year, monthIdx, 1));
}

function monthRangeEnd(monthIdx: number, year: number): Date {
  // DTEND is exclusive per VEVENT semantics, so we use the 1st of the next month.
  const next = monthIdx + 1;
  if (next > 11) return new Date(Date.UTC(year + 1, 0, 1));
  return new Date(Date.UTC(year, next, 1));
}
