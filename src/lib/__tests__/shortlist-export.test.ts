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
    expect(file.body).toContain("Compare URL: https://example.test/terraclima/?cmp=alpha-valley,beta%2C%20ridge");
    expect(file.body).toContain("Decision read:");
    expect(file.body).toContain("Next action:");
    expect(file.body).toContain("Caution:");
    expect(file.body).toContain("| Role | Place | Score | Fit | Risk | Visit | Watch first |");
    expect(file.body).toContain("| Start here |");
    expect(file.body).toContain("Beta \"Ridge\"");
  });

  it("keeps the plan useful when no places are pinned", () => {
    const file = exportShortlistAsMarkdown([], { generatedAt: FIXED });

    expect(file.body).toContain("Places: 0");
    expect(file.body).toContain("No pinned places yet.");
    expect(file.body).toContain("## Compare next");
    expect(file.body).toContain("Pin at least two places to generate a Compare-ready finalist table.");
  });

  it("exports a Compare setup handoff for a one-place shortlist", () => {
    const file = exportShortlistAsMarkdown([sample[0]], {
      generatedAt: FIXED,
      appUrl: "https://example.test/terraclima/",
    });

    expect(file.body).toContain("Places: 1");
    expect(file.body).toContain("### 1. Alpha Valley");
    expect(file.body).toContain("Compare setup URL: https://example.test/terraclima/?cmp=alpha-valley");
    expect(file.body).toContain("Alpha Valley is saved as the anchor finalist.");
    expect(file.body).toContain("add a similar peer or a counterweight");
    expect(file.body).toContain("Anchor read:");
    expect(file.body).not.toContain("Pin at least two places to generate a Compare-ready finalist table.");
    expect(file.body).not.toContain("| Role | Place | Score | Fit | Risk | Visit | Watch first |");
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
    expect(file.body).toContain("Compare opens the first 4 pinned places; this export still keeps all 5 places");
    expect(file.body).toContain("Compare URL: https://example.test/terraclima/?cmp=place-1,place-2,place-3,place-4");
    expect(file.body).not.toContain("cmp=place-1,place-2,place-3,place-4,place-5");
  });
});
