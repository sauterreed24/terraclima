import { describe, expect, it } from "vitest";
import {
  exportShortlistAsCSV,
  exportShortlistAsGeoJSON,
  exportShortlistAsICS,
  exportShortlistAsJSON,
} from "../shortlist-export";
import { makePlace } from "./test-fixtures";

const FIXED = new Date("2026-05-15T12:00:00Z");

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
