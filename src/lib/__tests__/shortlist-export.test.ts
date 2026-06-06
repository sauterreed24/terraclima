import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exportShortlistAsCSV,
  exportShortlistAsGeoJSON,
  exportShortlistAsICS,
  exportShortlistAsJSON,
  exportShortlistAsMarkdown,
} from "../shortlist-export";
import { makePlace } from "./test-fixtures";

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
    expect(lines[0]).toBe("id,name,region,country,lat,lon,elevation_m,koppen,tier,biome");
    // First data row uses the unquoted id but should keep the name unquoted too.
    expect(lines[1]).toContain("alpha-valley");
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

describe("exportShortlistAsICS", () => {
  it("emits a valid VCALENDAR with one VEVENT per shortlisted place", () => {
    const file = exportShortlistAsICS(sample, { generatedAt: FIXED });
    expect(file.filename).toMatch(/\.ics$/);
    expect(file.mimeType).toBe("text/calendar");
    const body = file.body;
    expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(body).toMatch(/END:VCALENDAR\r\n$/);
    const events = body.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
    expect(events.length).toBe(sample.length);
    for (const ev of events) {
      expect(ev).toMatch(/SUMMARY:/);
      expect(ev).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
      expect(ev).toMatch(/DTEND;VALUE=DATE:\d{8}/);
      expect(ev).toMatch(/UID:terraclima-/);
    }
  });

  it("keeps DTEND after DTSTART for cross-year best-month windows (e.g. Nov–Feb)", () => {
    const place = makePlace({
      id: "winter-sun",
      name: "Winter Sun Town",
      region: "Test",
      country: "USA",
      climate: {
        tempHighC: [22, 23, 26, 30, 34, 38, 40, 39, 35, 30, 26, 23],
        tempLowC: [12, 13, 15, 18, 22, 26, 28, 27, 24, 20, 16, 13],
        precipMm: Array(12).fill(20),
        humidityPct: Array(12).fill(55),
        sunshinePct: [70, 72, 75, 80, 85, 90, 92, 90, 85, 78, 72, 68],
        windKph: Array(12).fill(10),
        snowCm: Array(12).fill(0),
      },
    });
    const file = exportShortlistAsICS([place], { generatedAt: FIXED });
    const match = file.body.match(/DTSTART;VALUE=DATE:(\d{8})[\s\S]*?DTEND;VALUE=DATE:(\d{8})/);
    expect(match).not.toBeNull();
    const [, dtStart, dtEnd] = match!;
    expect(dtEnd > dtStart).toBe(true);
    expect(dtStart).toBe("20261101");
    expect(dtEnd).toBe("20270401");
  });

  it("escapes commas and semicolons in LOCATION + DESCRIPTION per RFC 5545", () => {
    const place = makePlace({
      id: "with-special",
      name: "Foo, Bar; Baz",
      region: "AZ; NM",
      country: "USA",
    });
    const file = exportShortlistAsICS([place], { generatedAt: FIXED });
    // Commas must be escaped to "\\,", semicolons to "\\;".
    expect(file.body).toMatch(/LOCATION:Foo\\, Bar\\; Baz\\, AZ\\; NM\\, USA/);
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
    expect(file.body).toContain("# Terraclima Scout Plan");
    expect(file.body).toContain("Generated: 2026-05-15T12:00:00.000Z");
    expect(file.body).toContain("Source: https://example.test/terraclima/");
    expect(file.body).toContain("Places: 2");
    expect(file.body).toContain("Screening-grade climate and livability intelligence only.");
    expect(file.body).toContain("### 1. Alpha Valley");
    expect(file.body).toContain("### 2. Beta \"Ridge\"");
    expect(file.body).toContain("- Best visit window:");
    expect(file.body).toContain("- Why scout:");
    expect(file.body).toContain("- Watch first:");
    expect(file.body).toContain("- Score ingredients: live-here fit");
    expect(file.body).toContain("- Dossier: https://example.test/terraclima/?p=alpha-valley");
    expect(file.body).toContain("- Dossier: https://example.test/terraclima/?p=beta%2C%20ridge");
    expect(file.body).toContain("## Compare next");
  });

  it("keeps the plan useful when no places are pinned", () => {
    const file = exportShortlistAsMarkdown([], { generatedAt: FIXED });

    expect(file.body).toContain("Places: 0");
    expect(file.body).toContain("No pinned places yet.");
    expect(file.body).toContain("## Compare next");
  });
});
