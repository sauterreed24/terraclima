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
import { CSV_BOM } from "../shortlist-export";
import { makeClimate, makePlace } from "./test-fixtures";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import { CLIMATE_NORMALS_PERIOD } from "../atlas-metadata";
import { getBestMonths, pickVisitWindow } from "../best-months";
import { getAnnualPrecipMm, meanAnnualHumidityPct, meanAnnualSunshinePct, meanJanLow, meanSummerHigh, summerDiurnalC } from "../climate-metrics";
import { observedSunshinePct } from "../hero-glance";
import { scoreLivability } from "../livability-score";
import { assessLiveFit, rankLiveFit } from "../live-fit";
import { rankPlaces } from "../scoring";
import { cToF, mmToIn } from "../units";

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

/** Minimal RFC 4180 reader for the tests: BOM-stripped rows of cells. */
function parseCsv(body: string): string[][] {
  const text = body.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\r" && text[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
    else cell += ch;
  }
  return rows;
}

function csvRecords(body: string): Array<Record<string, string>> {
  const [header, ...rows] = parseCsv(body);
  return rows.map(row => Object.fromEntries(header!.map((name, i) => [name, row[i] ?? ""])));
}

const r1 = (n: number) => String(Math.round(n * 10) / 10 + 0);

describe("exportShortlistAsCSV", () => {
  it("quotes cells that contain commas, quotes, or CR/LF", () => {
    const file = exportShortlistAsCSV(sample, { generatedAt: FIXED });
    expect(file.filename).toMatch(/\.csv$/);
    expect(file.mimeType).toBe("text/csv;charset=utf-8");
    const lines = file.body.split("\r\n");
    // Existing columns keep their names and positions; new ones are appended.
    expect(lines[0]!.startsWith("\uFEFFid,name,region,country,lat,lon,elevation_ft,koppen,tier,biome,")).toBe(true);
    expect(lines[1]).toContain("alpha-valley");
    // Elevation is exported in feet (1,200 m → 3,937 ft), like the rest of the atlas.
    expect(lines[1]).toContain(",3937,");
    // Second row has both a comma in the id and a double quote in the name.
    expect(lines[2]).toContain('"beta, ridge"');
    expect(lines[2]).toContain('"Beta ""Ridge"""');
    const tricky = makePlace({ id: "x", name: "Line\nBreak", biome: " padded " });
    const [, row] = parseCsv(exportShortlistAsCSV([tricky], { generatedAt: FIXED }).body);
    expect(row![1]).toBe("Line\nBreak");
    expect(row![9]).toBe(" padded ");
    expect(file.body.endsWith("\r\n")).toBe(true);
  });

  it("starts with a UTF-8 BOM and keeps accents intact for Excel", () => {
    const file = exportShortlistAsCSV([PLACES_BY_ID["merida-mx"]!], { generatedAt: FIXED });
    expect(file.body.charCodeAt(0)).toBe(0xfeff);
    expect(CSV_BOM).toBe("\uFEFF");
    expect(new TextEncoder().encode(file.body).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
    expect(csvRecords(file.body)[0]).toMatchObject({ name: "Mérida", region: "Yucatán" });
  });

  it("carries the climate figures and scores the app shows, in US units, for two known places", () => {
    const sequim = PLACES_BY_ID["sequim-wa"]!;
    const oaxaca = PLACES_BY_ID["oaxaca-mx"]!;
    const file = exportShortlistAsCSV([sequim, oaxaca], { generatedAt: FIXED });
    const records = csvRecords(file.body);
    expect(records).toHaveLength(2);
    for (const [record, place] of [[records[0]!, sequim], [records[1]!, oaxaca]] as const) {
      expect(record.id).toBe(place.id);
      expect(record.summer_high_f).toBe(r1(cToF(meanSummerHigh(place))));
      expect(record.winter_low_f).toBe(r1(cToF(meanJanLow(place))));
      expect(record.annual_precip_in).toBe(r1(mmToIn(getAnnualPrecipMm(place))));
      expect(record.humidity_pct).toBe(String(Math.round(meanAnnualHumidityPct(place)!)));
      expect(record.frost_free_days).toBe(String(place.climate.frostFreeDays));
      expect(record.summer_day_night_swing_f).toBe(r1(summerDiurnalC(place) * 1.8));
      expect(record.best_months).toBe(pickVisitWindow(getBestMonths(place, "F"))!.range);
      expect(record.best_months_for).toBe(pickVisitWindow(getBestMonths(place, "F"))!.label);
      expect(record.wildfire_risk).toBe(place.risks.wildfire.level);
      expect(record.smoke_risk).toBe(place.risks.smoke.level);
      expect(record.flood_risk).toBe(place.risks.flood.level);
      expect(record.uniqueness_score_0_100).toBe(String(place.scores.microclimateUniqueness));
      expect(record.livability_score_0_100).toBe(String(scoreLivability(place).score));
      expect(record.live_here_fit_score_0_100).toBe(String(assessLiveFit(place).score));
      expect(record.resilience_score_0_100).toBe(String(place.scores.resilience));
      expect(record.growability_score_0_100).toBe(String(place.scores.growability));
      expect(record.climate_normals_period).toBe(CLIMATE_NORMALS_PERIOD);
      // Station sunshine where the place has it (what the profile shows).
      expect(record.sunshine_pct).toBe(String(observedSunshinePct(place)));
      expect(record.sunshine_basis).toBe("station");
    }
    // Sanity anchors in plain numbers: a cool-summer rain-shadow town and a tropical highland.
    expect(Number(records[0]!.summer_high_f)).toBeGreaterThan(60);
    expect(Number(records[0]!.summer_high_f)).toBeLessThan(75);
    expect(Number(records[0]!.annual_precip_in)).toBeLessThan(25);
    expect(Number(records[0]!.annual_snow_in)).toBeGreaterThan(0);
    expect(records[1]!.annual_snow_in).toBe("");
    expect(records[1]!.best_months).toBe("Nov–Feb");
  });

  it("marks estimated sunshine, leaves unrecorded values blank and never formats numbers", () => {
    const merida = PLACES_BY_ID["merida-mx"]!;
    expect(observedSunshinePct(merida)).toBeNull();
    const [record] = csvRecords(exportShortlistAsCSV([merida], { generatedAt: FIXED }).body);
    expect(record!.sunshine_basis).toBe("estimated");
    expect(record!.sunshine_pct).toBe(String(Math.round(meanAnnualSunshinePct(merida)!)));

    const bare = makePlace({ id: "bare", elevationM: 3000, climate: makeClimate({ humidity: undefined, snowCm: undefined, frostFreeDays: undefined }) });
    const [blank] = csvRecords(exportShortlistAsCSV([bare], { generatedAt: FIXED }).body);
    expect(blank).toMatchObject({ annual_snow_in: "", humidity_pct: "", frost_free_days: "", sunshine_pct: "", sunshine_basis: "" });
    expect(blank!.elevation_ft).toBe("9843");
    const numeric = Object.entries(blank!).filter(([key]) => /_(f|in|ft|pct|days|0_100)$/.test(key));
    expect(numeric.length).toBeGreaterThan(10);
    for (const [, value] of numeric) expect(value).toMatch(/^(-?\d+(\.\d+)?)?$/);
  });

  it("adds the active ranking's name, rank and score when a ranking is given", () => {
    const sequim = PLACES_BY_ID["sequim-wa"]!;
    const yuma = PLACES_BY_ID["yuma-az"]!;
    const without = parseCsv(exportShortlistAsCSV([sequim], { generatedAt: FIXED }).body)[0]!;
    expect(without).not.toContain("ranking");
    const records = csvRecords(exportShortlistAsCSV([sequim, yuma], { generatedAt: FIXED, ranking: "coolest-summers" }).body);
    const ranked = rankPlaces("coolest-summers", PLACES, FIXED);
    for (const [record, place] of [[records[0]!, sequim], [records[1]!, yuma]] as const) {
      const at = ranked.findIndex(row => row.place.id === place.id);
      expect(record.ranking).toBe("Coolest summers");
      expect(record.ranking_rank).toBe(String(at + 1));
      expect(record.ranking_of).toBe(String(PLACES.length));
      expect(Number(record.ranking_score)).toBeCloseTo(ranked[at]!.score, 2);
    }
    expect(Number(records[0]!.ranking_rank)).toBeLessThan(Number(records[1]!.ranking_rank));
    const liveFit = csvRecords(exportShortlistAsCSV([sequim], { generatedAt: FIXED, ranking: "live-fit" }).body)[0]!;
    expect(liveFit.ranking).toBe("Live-here fit");
    expect(liveFit.ranking_rank).toBe(String(rankLiveFit([...PLACES]).findIndex(row => row.place.id === sequim.id) + 1));
  });

  it("adds vs-home delta columns only when a home base is set", () => {
    const sequim = PLACES_BY_ID["sequim-wa"]!;
    const yuma = PLACES_BY_ID["yuma-az"]!;
    expect(parseCsv(exportShortlistAsCSV([sequim], { generatedAt: FIXED }).body)[0]!.join(",")).not.toContain("home");
    const records = csvRecords(exportShortlistAsCSV([sequim, yuma], { generatedAt: FIXED, home: yuma }).body);
    const [s, y] = records as [Record<string, string>, Record<string, string>];
    expect(s.home_base).toBe("Yuma");
    expect(Number(s.summer_high_vs_home_f)).toBeCloseTo(Number(s.summer_high_f) - Number(y.summer_high_f), 1);
    expect(Number(s.summer_high_vs_home_f)).toBeLessThan(-25);
    expect(Number(s.annual_precip_vs_home_in)).toBeCloseTo(Number(s.annual_precip_in) - Number(y.annual_precip_in), 1);
    expect(Number(s.livability_vs_home)).toBe(scoreLivability(sequim).score - scoreLivability(yuma).score);
    // Yuma records no snowfall, so the snow delta is blank rather than a made-up number.
    expect(s.annual_snow_vs_home_in).toBe("");
    // Home against itself is all zeros.
    expect([y.summer_high_vs_home_f, y.winter_low_vs_home_f, y.humidity_vs_home_pct, y.livability_vs_home]).toEqual(["0", "0", "0", "0"]);
  });
});

describe("JSON and GeoJSON carry the same fields as the CSV", () => {
  it("JSON states units, score scale and data period, and matches the CSV values", () => {
    const places = [PLACES_BY_ID["sequim-wa"]!, PLACES_BY_ID["oaxaca-mx"]!];
    const ctx = { generatedAt: FIXED, ranking: "most-unique" as const, home: PLACES_BY_ID["boulder-co"]! };
    const parsed = JSON.parse(exportShortlistAsJSON(places, ctx).body) as {
      readme: string[]; scoreScale: string; climateNormalsPeriod: string; units: Record<string, string>;
      ranking: { id: string; label: string; placesRanked: number }; homeBase: { id: string };
      fields: Record<string, string>; places: Array<Record<string, string | number | null>>;
    };
    expect(parsed.readme.join(" ")).toMatch(/Scores run 0–100 and higher is better/);
    expect(parsed.readme.join(" ")).toContain(CLIMATE_NORMALS_PERIOD);
    expect(parsed.scoreScale).toBe("0–100, higher is better");
    expect(parsed.climateNormalsPeriod).toBe(CLIMATE_NORMALS_PERIOD);
    expect(parsed.units.temperature).toBe("°F");
    expect(parsed.ranking).toEqual({ id: "most-unique", label: "Most unique", placesRanked: PLACES.length });
    expect(parsed.homeBase.id).toBe("boulder-co");
    const sequim = parsed.places[0]!;
    // Original keys survive unchanged.
    expect(sequim).toMatchObject({ id: "sequim-wa", name: "Sequim", region: "Washington", country: "USA", koppen: "Csb", tier: "A" });
    expect(typeof sequim.elevationFt).toBe("number");
    expect(sequim.summerHighF).toBe(Math.round(cToF(meanSummerHigh(places[0]!)) * 10) / 10);
    expect(sequim.livabilityScore).toBe(scoreLivability(places[0]!).score);
    expect(parsed.places[1]!.annualSnowIn).toBeNull();
    // Every field is documented, and the JSON has exactly the CSV's columns.
    expect(Object.keys(sequim)).toEqual(Object.keys(parsed.fields));
    const csvHeader = parseCsv(exportShortlistAsCSV(places, ctx).body)[0]!;
    expect(Object.keys(sequim)).toHaveLength(csvHeader.length);
    const csvRow = csvRecords(exportShortlistAsCSV(places, ctx).body)[0]!;
    expect(Object.values(sequim).map(v => (v == null ? "" : String(v)))).toEqual(csvHeader.map(name => csvRow[name]));
  });

  it("GeoJSON properties equal the JSON record", () => {
    const places = [PLACES_BY_ID["sequim-wa"]!];
    const ctx = { generatedAt: FIXED, ranking: "most-unique" as const };
    const json = JSON.parse(exportShortlistAsJSON(places, ctx).body) as { places: unknown[] };
    const geo = JSON.parse(exportShortlistAsGeoJSON(places, ctx).body) as { features: Array<{ properties: unknown }>; scoreScale: string };
    expect(geo.features[0]!.properties).toEqual(json.places[0]);
    expect(geo.scoreScale).toBe("0–100, higher is better");
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
    expect(icsField(event!, "LOCATION")).toBe("Foo\\, Bar\\; Baz\\\\Qux\\, AZ\\; NM\\, United States");
    expect(icsField(event!, "SUMMARY")).toContain("Foo\\, Bar\\; Baz\\\\Qux");
    expect(icsEscape("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf");
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
  it("emits a human-readable visit plan in pinned order", () => {
    const file = exportShortlistAsMarkdown(sample, {
      generatedAt: FIXED,
      appUrl: "https://example.test/terraclima/",
    });

    expect(file.filename).toBe("terraclima-visit-plan-20260515120000.md");
    expect(file.body).not.toMatch(/scout|dossier/i);
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
    // The label text belongs to compare-finalist-verdict (being reworded elsewhere); accept either.
    expect(file.body).toMatch(/- (Source gap|Sources to check) - /);
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
