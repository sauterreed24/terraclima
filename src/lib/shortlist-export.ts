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
 *
 * Pure: no DOM access, no Blob, no fetch. The caller owns the download
 * mechanic so the same helpers work in node tests + the future export
 * popover.
 */
import type { Place } from "../types";
import { getBestMonths } from "./best-months";

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

const DEFAULT_CONTEXT: ExportContext = {
  generatedAt: new Date(),
  appName: "Terraclima",
  appUrl: "https://sauterreed24.github.io/terraclima/",
};

function context(partial?: Partial<ExportContext>): ExportContext {
  return { ...DEFAULT_CONTEXT, ...partial };
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

function monthRangeStart(monthIdx: number, year: number): Date {
  return new Date(Date.UTC(year, monthIdx, 1));
}

function monthRangeEnd(monthIdx: number, year: number): Date {
  // DTEND is exclusive per VEVENT semantics, so we use the 1st of the next month.
  const next = monthIdx + 1;
  if (next > 11) return new Date(Date.UTC(year + 1, 0, 1));
  return new Date(Date.UTC(year, next, 1));
}
