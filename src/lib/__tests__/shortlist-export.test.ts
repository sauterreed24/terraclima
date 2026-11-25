import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exportShortlistAsCSV,
  exportShortlistAsGeoJSON,
  exportShortlistAsICS,
  exportShortlistAsJSON,
  exportShortlistAsMarkdown,
  foldIcsLine,
  icsEscape,
  nextMonthRunOccurrence,
  parseMonthRuns,
} from "../shortlist-export";
import { makeClimate, makePlace } from "./test-fixtures";

const FIXED = new Date("2026-05-15T12:00:00Z");

afterEach(() => {
  vi.useRealTimers();
});

const sample = [
  makePlace({
    id: "alpha-valley",
    name: "Alpha Valley",
    region: "Cordillera, BC",
    country: "Canada",
    lat: 49.5,
    lon: -120.1,
    elevationM: 1200,
    koppen: "Dfb",
    tier: "A",
    biome: "Montane mixed forest",
  }),
  makePlace({
    id: "beta, ridge",
    name: 'Beta "Ridge"',
    region: "Sky Islands, AZ",
    country: "USA",
    lat: 31.85,
    lon: -109.41,
    elevationM: 2600,
    koppen: "Csb",
    tier: "B",
    biome: "Pine-oak sky island",
  }),
];

describe("exportShortlistAsJSON", () => {
  it("emits a generator stamp + place rows + count", () => {
    const file = exportShortlistAsJSON(sample, { generatedAt: FIXED });
    expect(file.filename).toMatch(/\.json$/);
    expect(file.mimeType).toBe("application/json");
    const parsed = JSON.parse(file.body) as { count: number; places: Array<{ id: string }> };
    expect(parsed.count).toBe(2);
    expect(parsed.places.map(p => p.id)).toEqual(["alpha-valley", "beta, ridge"]);
  });

  it("uses export time, not module-load time, when no context date is passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00Z"));
    const first = exportShortlistAsJSON(sample);

    vi.setSystemTime(new Date("2026-05-16T12:30:00Z"));
    const second = exportShortlistAsJSON(sample);

    expect(first.filename).toBe("terraclima-shortlist-20260515120000.json");
    expect(second.filename).toBe("terraclima-shortlist-20260516123000.json");
    expect(JSON.parse(second.body)).toMatchObject({
      generatedAt: "2026-05-16T12:30:00.000Z",
    });
  });
});

describe("exportShortlistAsCSV", () => {
  it("quotes cells that contain commas, quotes, or CR/LF", () => {
    const file = exportShortlistAsCSV(sample, { generatedAt: FIXED });
    expect(file.filename).toMatch(/\.csv$/);
    expect(file.mimeType).toBe("text/csv");
    const lines = file.body.split("\r\n");
    expect(lines[0]).toBe("id,name,region,country,lat,lon,elevation_ft,koppen,tier,biome");
    // First data row uses the unquoted id but should keep the name unquoted too.
    expect(lines[1]).toContain("alpha-valley");
    // Elevation is exported in feet (1,200 m → 3,937 ft), like the rest of the atlas.
    expect(lines[1]).toContain(",3937,");
    // Second row has both a comma in the id and a double quote in the name.
    expect(lines[2]).toContain('"beta, ridge"');
    expect(lines[2]).toContain('"Beta ""Ridge"""');
  });
});

describe("exportShortlistAsGeoJSON", () => {
  it("emits a FeatureCollection with lon/lat/elevation coordinates per place", () => {
    const file = exportShortlistAsGeoJSON(sample, { generatedAt: FIXED });
    expect(file.filename).toMatch(/\.geojson$/);
    expect(file.mimeType).toBe("application/geo+json");
    const parsed = JSON.parse(file.body) as {
      type: string;
      features: Array<{
        geometry: { type: string; coordinates: number[] };
        properties: { id: string };
      }>;
    };
    expect(parsed.type).toBe("FeatureCollection");
    expect(parsed.features).toHaveLength(2);
    // RFC 7946: lon, lat order. Elevation as the third coordinate.
    expect(parsed.features[0].geometry.coordinates).toEqual([-120.1, 49.5, 1200]);
    expect(parsed.features[1].properties.id).toBe("beta, ridge");
  });
});

/** Unfold RFC 5545 content lines and split into one string per VEVENT. */
function icsEvents(body: string): string[] {
  return body.replace(/\r\n /g, "").match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
}

function icsField(event: string, name: string): string {
  const line = event.split("\r\n").find(l => l.startsWith(`${name}:`) || l.startsWith(`${name};`));
  if (!line) throw new Error(`missing ${name}`);
  return line.slice(line.indexOf(":") + 1);
}

/** Highs that are walkable (12–25°C) only in the given months; hot otherwise. */
function climateWithComfortMonths(months: readonly number[]) {
  const highs = Array.from({ length: 12 }, (_, i) => (months.includes(i) ? 20 : 33));
  return makeClimate({
    tempHighC: highs as never,
    tempLowC: highs.map(h => h - 10) as never,
    snowCm: undefined,
  });
}

describe("exportShortlistAsICS", () => {
  const winterSun = makePlace({
    id: "winter-sun",
    name: "Winter Sun",
    climate: climateWithComfortMonths([10, 11, 0, 1]),
  });

  it("emits a valid VCALENDAR with CRLF endings, PRODID and an event per place", () => {
    const file = exportShortlistAsICS([winterSun], { generatedAt: FIXED });
    expect(file.filename).toMatch(/\.ics$/);
    expect(file.mimeType).toBe("text/calendar");
    const body = file.body;
    expect(body.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Terraclima//Shortlist Export//EN\r\n")).toBe(true);
    expect(body).toMatch(/END:VCALENDAR\r\n$/);
    // No bare LF anywhere.
    expect(body.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const events = icsEvents(body);
    expect(events).toHaveLength(1);
    expect(icsField(events[0]!, "SUMMARY")).toBe("Best time to visit Winter Sun");
    expect(icsField(events[0]!, "DTSTAMP")).toBe("20260515T120000Z");
    expect(icsField(events[0]!, "UID")).toBe("terraclima-winter-sun-20261101@sauterreed24.github.io");
  });

  it("ends a Nov–Feb window in the following year (exclusive all-day DTEND)", () => {
    const [event] = icsEvents(exportShortlistAsICS([winterSun], { generatedAt: FIXED }).body);
    expect(event).toContain("DTSTART;VALUE=DATE:20261101");
    expect(event).toContain("DTEND;VALUE=DATE:20270301");
  });

  it("keeps a wrap-around window that is still in progress in January", () => {
    const [event] = icsEvents(exportShortlistAsICS([winterSun], { generatedAt: new Date("2027-01-20T08:00:00Z") }).body);
    expect(event).toContain("DTSTART;VALUE=DATE:20261101");
    expect(event).toContain("DTEND;VALUE=DATE:20270301");
  });

  it("rolls a window that has already passed this year to its next occurrence", () => {
    const spring = makePlace({ id: "spring", name: "Spring Town", climate: climateWithComfortMonths([3, 4]) });
    const before = icsEvents(exportShortlistAsICS([spring], { generatedAt: new Date("2026-02-10T00:00:00Z") }).body)[0]!;
    expect(before).toContain("DTSTART;VALUE=DATE:20260401");
    expect(before).toContain("DTEND;VALUE=DATE:20260601");
    const during = icsEvents(exportShortlistAsICS([spring], { generatedAt: new Date("2026-05-31T23:00:00Z") }).body)[0]!;
    expect(during).toContain("DTSTART;VALUE=DATE:20260401");
    const after = icsEvents(exportShortlistAsICS([spring], { generatedAt: new Date("2026-06-01T00:00:00Z") }).body)[0]!;
    expect(after).toContain("DTSTART;VALUE=DATE:20270401");
    expect(after).toContain("DTEND;VALUE=DATE:20270601");
    // The UID names the occurrence, so each year's event is distinct but re-exports are stable.
    expect(icsField(after, "UID")).toBe("terraclima-spring-20270401@sauterreed24.github.io");
    expect(icsField(during, "UID")).toBe(icsField(before, "UID"));
  });

  it("emits one event per contiguous run of a split window, each on its own next occurrence", () => {
    const split = makePlace({ id: "split", name: "Shoulder Town", climate: climateWithComfortMonths([4, 8]) });
    const events = icsEvents(exportShortlistAsICS([split], { generatedAt: new Date("2026-07-04T00:00:00Z") }).body);
    expect(events).toHaveLength(2);
    // September is still ahead this year; May has passed, so it rolls to 2027. Sorted by date.
    expect(events[0]).toContain("DTSTART;VALUE=DATE:20260901");
    expect(events[0]).toContain("DTEND;VALUE=DATE:20261001");
    expect(events[1]).toContain("DTSTART;VALUE=DATE:20270501");
    expect(events[1]).toContain("DTEND;VALUE=DATE:20270601");
    expect(new Set(events.map(e => icsField(e, "UID"))).size).toBe(2);
    for (const e of events) expect(icsField(e, "DESCRIPTION")).toContain("May\\, Sep");
  });

  it("every event ends after it starts and not before the export date, across the real fixture set", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-06-15T00:00:00Z", "2026-12-31T23:59:59Z"]) {
      const now = new Date(iso);
      const today = iso.slice(0, 10).replace(/-/g, "");
      for (const e of icsEvents(exportShortlistAsICS([...sample, winterSun], { generatedAt: now }).body)) {
        const start = e.match(/DTSTART;VALUE=DATE:(\d{8})/)![1]!;
        const end = e.match(/DTEND;VALUE=DATE:(\d{8})/)![1]!;
        expect(end > start).toBe(true);
        expect(end > today).toBe(true);
      }
    }
  });

  it("gives a place with no parseable month window a one-day reminder on the export date", () => {
    const never = makePlace({ id: "never", name: "Furnace", climate: climateWithComfortMonths([]) });
    const yearRound = makePlace({ id: "always", name: "Eden", climate: climateWithComfortMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) });
    const events = icsEvents(exportShortlistAsICS([never, yearRound], { generatedAt: FIXED }).body);
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e).toContain("DTSTART;VALUE=DATE:20260515");
      expect(e).toContain("DTEND;VALUE=DATE:20260516");
    }
    expect(icsField(events[1]!, "SUMMARY")).toBe("Visit Eden: good year-round");
  });

  it("writes a US-unit description with real escaped newlines, never a doubled backslash", () => {
    const [event] = icsEvents(exportShortlistAsICS([winterSun], { generatedAt: FIXED }).body);
    const description = icsField(event!, "DESCRIPTION");
    expect(description).not.toContain("\\\\n");
    expect(description.split("\\n\\n").length).toBeGreaterThanOrEqual(3);
    expect(description).toContain("Outdoor comfort: Nov–Feb.");
    expect(description).toMatch(/summer highs near 91°F\\, winter lows near 50°F\\, about \d+ in of precipitation a year/);
    expect(description).not.toMatch(/°C|\bmm\b/);
    expect(description).toContain("Profile: https://sauterreed24.github.io/terraclima/?p=winter-sun");
  });

  it("escapes commas, semicolons and backslashes in text values per RFC 5545", () => {
    const place = makePlace({
      id: "with-special",
      name: "Foo, Bar; Baz\\Qux",
      region: "AZ; NM",
      country: "USA",
    });
    const file = exportShortlistAsICS([place], { generatedAt: FIXED });
    const [event] = icsEvents(file.body);
    expect(icsField(event!, "LOCATION")).toBe("Foo\\, Bar\; Baz\\\\Qux\\, AZ\; NM\\, United States");
    expect(icsField(event!, "SUMMARY")).toContain("Foo\\, Bar\; Baz\\\\Qux");
    expect(icsEscape("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\;c\\,d\\ne\\nf");
  });

  it("folds content lines at 75 octets without splitting multi-byte characters", () => {
    const place = makePlace({ id: "long", name: "Mérida — Querétaro — Álamos — Mazatlán ".repeat(4).trim() });
    const body = exportShortlistAsICS([place], { generatedAt: FIXED }).body;
    const encoder = new TextEncoder();
    const rawLines = body.split("\r\n");
    for (const line of rawLines) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    expect(rawLines.some(line => line.startsWith(" "))).toBe(true);
    // Unfolding restores the exact text (no replacement characters from a split code point).
    expect(icsField(icsEvents(body)[0]!, "SUMMARY")).toBe(`Best time to visit ${place.name}`);
    expect(body).not.toContain("�");

    expect(foldIcsLine("x".repeat(75))).toBe("x".repeat(75));
    expect(foldIcsLine("x".repeat(76))).toBe(`${"x".repeat(75)}\r\n x`);
    expect(foldIcsLine("x".repeat(74) + "é")).toBe(`${"x".repeat(74)}\r\n é`);
  });

  it("parses month ranges into runs and finds the next occurrence", () => {
    expect(parseMonthRuns("May")).toEqual([{ startMonth: 4, endMonth: 4 }]);
    expect(parseMonthRuns("Nov–Feb")).toEqual([{ startMonth: 10, endMonth: 1 }]);
    expect(parseMonthRuns("Apr–May, Sep-Oct")).toEqual([{ startMonth: 3, endMonth: 4 }, { startMonth: 8, endMonth: 9 }]);
    expect(parseMonthRuns("Year-round")).toEqual([]);
    const occ = nextMonthRunOccurrence({ startMonth: 11, endMonth: 11 }, new Date("2026-12-31T12:00:00Z"));
    expect(occ.start.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(occ.endExclusive.toISOString().slice(0, 10)).toBe("2027-01-01");
  });
});

describe("exportShortlistAsMarkdown", () => {
  it("emits a human-readable scouting plan in pinned order", () => {
    const file = exportShortlistAsMarkdown(sample, {
      generatedAt: FIXED,
      appUrl: "https://example.test/terraclima/",
    });

    expect(file.filename).toBe("terraclima-scout-plan-20260515120000.md");
    expect(file.mimeType).toBe("text/markdown");
    expect(file.body).toContain("# Terraclima visit plan");
    expect(file.body).toContain("Generated: 2026-05-15T12:00:00.000Z");
    expect(file.body).toContain("Source: https://example.test/terraclima/");
    expect(file.body).toContain("Places: 2");
    expect(file.body).toContain("This plan is built from climate averages and editorial scores.");
    expect(file.body).toContain("### 1. Alpha Valley");
    expect(file.body).toContain("### 2. Beta \"Ridge\"");
    expect(file.body).toContain("- Best visit window:");
    expect(file.body).toContain("- Why visit:");
    expect(file.body).toContain("- Check first:");
    expect(file.body).toContain("- Scores: live-here fit");
    expect(file.body).toContain("- Profile: https://example.test/terraclima/?p=alpha-valley");
    expect(file.body).toContain("- Profile: https://example.test/terraclima/?p=beta%2C%20ridge");
    expect(file.body).toContain("## How well sourced");
    expect(file.body).toContain("Least well-sourced places first.");
    expect(file.body).toContain("### Alpha Valley - Thinly sourced");
    expect(file.body).toContain("- Sources: high confidence; 0 web sources; 1 researched chapter; no cost or access data; measured humidity; no measured sunshine.");
    expect(file.body).toContain("- Gaps: finding a second web source; the thin in-depth text; missing cost and access data; missing measured sunshine.");
    expect(file.body).toContain("- Next step: Start with finding a second web source. Check it before planning a trip or a move.");
    expect(file.body).toContain("## Compare next");
    expect(file.body).toContain("Compare URL: https://example.test/terraclima/?cmp=alpha-valley,beta%2C%20ridge");
    expect(file.body).toContain("Summary:");
    expect(file.body).toContain("Next step:");
    expect(file.body).toContain("Caution:");
    expect(file.body).toContain("Check before you go:");
    expect(file.body).toContain("- When to visit - ");
    expect(file.body).toContain("- Hazard check - ");
    expect(file.body).toContain("- Daily life - ");
    expect(file.body).toContain("- Source gap - ");
    expect(file.body).toContain("Proof:");
    expect(file.body).toContain("before booking");
    expect(file.body).toContain("| Role | Place | Score | Fit | Risk | Visit | Check first |");
    expect(file.body).toContain("| Start here |");
    expect(file.body).toContain("Beta \"Ridge\"");
  });

  it("keeps the plan useful when no places are pinned", () => {
    const file = exportShortlistAsMarkdown([], { generatedAt: FIXED });

    expect(file.body).toContain("Places: 0");
    expect(file.body).toContain("No pinned places yet.");
    expect(file.body).toContain("## Compare next");
    expect(file.body).toContain("Pin at least two places to get a side-by-side table.");
  });

  it("exports a Compare setup handoff for a one-place shortlist", () => {
    const file = exportShortlistAsMarkdown([sample[0]], {
      generatedAt: FIXED,
      appUrl: "https://example.test/terraclima/",
    });

    expect(file.body).toContain("Places: 1");
    expect(file.body).toContain("### 1. Alpha Valley");
    expect(file.body).toContain("Compare URL: https://example.test/terraclima/?cmp=alpha-valley");
    expect(file.body).toContain("Alpha Valley is the only pinned place.");
    expect(file.body).toContain("Add a second place in Compare");
    expect(file.body).toContain("Check first:");
    expect(file.body).not.toContain("Pin at least two places to get a side-by-side table.");
    expect(file.body).not.toContain("| Role | Place | Score | Fit | Risk | Visit | Check first |");
  });

  it("keeps the Compare handoff inside the four-place app limit while preserving the full export", () => {
    const places = Array.from({ length: 5 }, (_, index) => makePlace({
      id: `place-${index + 1}`,
      name: `Place ${index + 1}`,
      region: "Test range",
      country: "USA",
    }));
    const file = exportShortlistAsMarkdown(places, {
      generatedAt: FIXED,
      appUrl: "https://example.test/terraclima/",
    });

    expect(file.body).toContain("Places: 5");
    expect(file.body).toContain("### 5. Place 5");
    expect(file.body).toContain("Compare opens the first 4 pinned places; all 5 pinned places are listed above.");
    expect(file.body).toContain("Compare URL: https://example.test/terraclima/?cmp=place-1,place-2,place-3,place-4");
    expect(file.body).not.toContain("cmp=place-1,place-2,place-3,place-4,place-5");
  });
});
