import { describe, expect, it } from "vitest";
import {
  cToF,
  fToC,
  mmToIn,
  cmToIn,
  mToFt,
  kmToMi,
  fmtTemp,
  fmtDelta,
  fmtPrecip,
  fmtPrecipSmall,
  fmtSnow,
  fmtElev,
  fmtDist,
  precipTickStep,
  toTempUnit,
  toDeltaUnit,
  localizeProse,
} from "../units";

describe("conversion primitives", () => {
  it("cToF / fToC are inverses on integer anchors", () => {
    for (const c of [-40, -20, 0, 10, 20, 37, 100]) {
      expect(fToC(cToF(c))).toBeCloseTo(c, 10);
    }
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
    expect(cToF(-40)).toBe(-40);
  });

  it("distance/length helpers match standard ratios", () => {
    expect(mmToIn(25.4)).toBeCloseTo(1, 6);
    expect(cmToIn(2.54)).toBeCloseTo(1, 6);
    expect(mToFt(1)).toBeCloseTo(3.28084, 5);
    expect(kmToMi(1)).toBeCloseTo(0.621371, 5);
  });
});

describe("fmtTemp", () => {
  it("returns em-dash for null/undefined/Infinity", () => {
    expect(fmtTemp(null, "F")).toBe("—");
    expect(fmtTemp(undefined, "C")).toBe("—");
    expect(fmtTemp(Infinity, "F")).toBe("—");
  });
  it("formats °F by default with no decimals", () => {
    expect(fmtTemp(0, "F")).toBe("32°F");
    expect(fmtTemp(20, "C")).toBe("20°C");
  });
  it("respects digits and unit_symbol options", () => {
    expect(fmtTemp(20, "C", { digits: 1 })).toBe("20.0°C");
    expect(fmtTemp(20, "C", { unit_symbol: false })).toBe("20°");
  });
});

describe("fmtDelta", () => {
  it("uses the 9/5 ratio for °F deltas (no +32 offset)", () => {
    expect(fmtDelta(5, "F")).toBe("+9.0°F");
    expect(fmtDelta(5, "C")).toBe("+5.0°C");
  });
  it("does not prefix '+' when signed:false", () => {
    expect(fmtDelta(2, "C", { signed: false })).toBe("2.0°C");
  });
  it("renders negative deltas with a minus", () => {
    expect(fmtDelta(-3, "C")).toBe("-3.0°C");
  });
});

describe("toTempUnit / toDeltaUnit", () => {
  it("toDeltaUnit applies 9/5 with no offset", () => {
    expect(toDeltaUnit(10, "F")).toBeCloseTo(18, 6);
    expect(toDeltaUnit(10, "C")).toBe(10);
  });
  it("toTempUnit applies the full conversion", () => {
    expect(toTempUnit(0, "F")).toBe(32);
    expect(toTempUnit(0, "C")).toBe(0);
  });
});

describe("formatters with units", () => {
  it("fmtPrecip — imperial uses 1 decimal under 10 inches", () => {
    expect(fmtPrecip(254, "imperial")).toBe("10 in"); // exactly 10 → no decimal
    expect(fmtPrecip(127, "imperial")).toBe("5.0 in");
    expect(fmtPrecip(254, "metric")).toBe("254 mm");
  });
  it("fmtSnow — cm input localized to in", () => {
    expect(fmtSnow(50.8, "imperial")).toBe("20\"");
    expect(fmtSnow(50, "metric")).toBe("50 cm");
  });
  it("fmtElev — formats with locale commas", () => {
    expect(fmtElev(1000, "imperial")).toBe("3,281 ft");
    expect(fmtElev(1000, "metric")).toBe("1,000 m");
  });
  it("fmtDist — switches precision under 10", () => {
    expect(fmtDist(5, "imperial")).toBe("3.1 mi");
    expect(fmtDist(50, "imperial")).toBe("31 mi");
    expect(fmtDist(5, "metric")).toBe("5.0 km");
  });
  it("fmtPrecipSmall — compact monthly form", () => {
    expect(fmtPrecipSmall(50, "metric")).toBe("50");
    expect(fmtPrecipSmall(25.4, "imperial")).toBe("1.0\"");
  });
  it("non-finite inputs return em-dash", () => {
    expect(fmtPrecip(Infinity, "imperial")).toBe("—");
    expect(fmtSnow(NaN, "metric")).toBe("—");
    expect(fmtElev(NaN, "imperial")).toBe("—");
    expect(fmtDist(Infinity, "metric")).toBe("—");
  });
});

describe("precipTickStep", () => {
  it("steps up by data range — imperial", () => {
    expect(precipTickStep(0.5, "imperial")).toBe(0.5);
    expect(precipTickStep(2, "imperial")).toBe(1);
    expect(precipTickStep(5, "imperial")).toBe(2);
    expect(precipTickStep(20, "imperial")).toBe(4);
  });
  it("steps up by data range — metric", () => {
    expect(precipTickStep(20, "metric")).toBe(10);
    expect(precipTickStep(50, "metric")).toBe(20);
    expect(precipTickStep(120, "metric")).toBe(50);
    expect(precipTickStep(300, "metric")).toBe(100);
  });
});

describe("localizeProse — temperatures", () => {
  it("converts a single absolute °C to °F", () => {
    expect(localizeProse("Highs reach 25°C in July.", "F", "metric")).toContain("77°F");
  });
  it("preserves dash ranges", () => {
    // Use prose with no delta-trigger word ("of", "by", "above", "below"…)
    // before the range, so the converter treats both numbers as absolutes.
    const out = localizeProse("May highs reach 18–22°C.", "F", "metric");
    expect(out).toMatch(/64–72°F|64-72°F/);
  });
  it("treats explicit deltas as 9/5 (no +32)", () => {
    expect(localizeProse("The town runs 3°C cooler than the basin.", "F", "metric")).toContain("5°F cooler");
  });
  it("treats annual ranges and lapse rates as deltas, not absolute readings", () => {
    expect(localizeProse("Annual ranges under 10°C.", "F", "metric")).toBe("Annual ranges under 18°F.");
    expect(localizeProse("Annual temperature ranges exceed 55°C.", "F", "metric")).toBe("Annual temperature ranges exceed 99°F.");
    expect(localizeProse("Elevation lapse rate (~6.5°C / km).", "F", "imperial")).toBe("Elevation lapse rate (~3.6°F per 1,000 ft).");
    expect(localizeProse("Temperature drops roughly 6.5°C per 1000 m of rise.", "F", "imperial")).toBe("Temperature drops roughly 3.6°F per 1,000 ft of rise.");
  });
  it("is a no-op when target unit is C", () => {
    const text = "Highs reach 25°C in July.";
    expect(localizeProse(text, "C", "metric")).toBe(text);
  });
  it("converts decade shorthand (20s °C → mid-60s to mid-70s °F band)", () => {
    expect(localizeProse("Summers stay in the 20s°C.", "F", "metric")).toContain("68–84°F range");
    expect(localizeProse("Highs rarely leave the 20s °C.", "F", "metric")).toBe("Highs rarely leave the 68–84°F range.");
  });

  it("treats thermal/seasonal/annual amplitude-style nouns as deltas", () => {
    // Joint delta pattern covers every thermal × {span,range,amplitude,
    // swing,spread,gap,window} combination, plus seasonal/annual/diurnal
    // variants and day-night/day/night/night-to-day forms.
    expect(localizeProse("thermal span 25°C", "F", "metric")).toBe("thermal span 45°F");
    expect(localizeProse("thermal amplitude 30°C", "F", "metric")).toBe("thermal amplitude 54°F");
    expect(localizeProse("seasonal swing 18°C", "F", "metric")).toBe("seasonal swing 32°F");
    expect(localizeProse("annual amplitude 32°C", "F", "metric")).toBe("annual amplitude 58°F");
    expect(localizeProse("day-night spread 12°C", "F", "metric")).toBe("day-night spread 22°F");
    expect(localizeProse("day/night swing 14°C", "F", "metric")).toBe("day/night swing 25°F");
  });

  it("treats delta nouns immediately following a temperature as a delta", () => {
    // "N°C swing", "N°C amplitude", "N°C gap" — unambiguous deltas.
    expect(localizeProse("a 13°C swing keeps the valley honest.", "F", "metric")).toBe("a 23°F swing keeps the valley honest.");
    expect(localizeProse("an 8°C differential drives the breeze.", "F", "metric")).toBe("an 14°F differential drives the breeze.");
    expect(localizeProse("a 25°C amplitude is unusual at this latitude.", "F", "metric")).toBe("a 45°F amplitude is unusual at this latitude.");
  });

  it("does NOT treat 'N°C range' as a delta (range is overloaded)", () => {
    // Authors use "in the X–Y°C range" to mean an absolute interval, not a
    // delta. Only the joint pattern (annual/diurnal/temperature range) or
    // explicit cues like "range of" force the delta reading.
    expect(localizeProse("dew points in the 10–15°C range", "F", "metric")).toBe("dew points in the 50–59°F range");
    expect(localizeProse("afternoons push into the 33–36°C range", "F", "metric")).toBe("afternoons push into the 91–97°F range");
  });

  it("normalizes editorial Celsius word forms before conversion", () => {
    // Defense in depth for the place-feel `${x}C` missing-degree-symbol bug
    // class: word forms are rewritten to "°C" in F-mode so all numeric passes
    // (delta detection, range/to passes, decade shorthand) apply uniformly.
    expect(localizeProse("25 Celsius", "F", "metric")).toBe("77°F");
    expect(localizeProse("20 degrees Celsius", "F", "metric")).toBe("68°F");
    expect(localizeProse("20 degree Celsius", "F", "metric")).toBe("68°F");
    expect(localizeProse("20 degrees C", "F", "metric")).toBe("68°F");
    expect(localizeProse("warmer by 5 Celsius", "F", "metric")).toBe("warmer by 9°F");
    // C-mode preserves the editorial word form byte-for-byte.
    expect(localizeProse("25 Celsius", "C", "metric")).toBe("25 Celsius");
    expect(localizeProse("20 degrees Celsius", "C", "metric")).toBe("20 degrees Celsius");
  });

  it("recovers from a missing degree symbol in computed prose", () => {
    // Reproduce the place-feel bug class: a template literal forgets the
    // degree glyph, e.g. `${x.toFixed(1)}C`. The Celsius-word pass catches
    // bare "N C" only when the C is part of a "degrees C" / "Celsius" form,
    // but a single trailing digit-+-C with whitespace and a "degrees" prefix
    // is the typical authoring hazard. Verify both shapes localize cleanly.
    expect(localizeProse("summer mean 26.5 degrees C", "F", "metric")).toBe("summer mean 80°F");
    expect(localizeProse("winter mean −3.2 degrees C", "F", "metric")).toBe("winter mean 26°F");
  });
});

describe("localizeProse — distances", () => {
  it("converts kilometres in a clearly distance context", () => {
    // Under-10 mile output is rendered with one decimal (10 km ≈ 6.2 mi).
    expect(localizeProse("Drive 10 km north.", "F", "imperial")).toContain("6.2 mi");
    expect(localizeProse("Drive 50 km north.", "F", "imperial")).toContain("31 mi");
  });
  it("converts millimetres of precip", () => {
    expect(localizeProse("Annual precip averages 1,500 mm.", "F", "imperial")).toContain("59 in");
  });
  it("converts metric ranges with one trailing unit before single-unit passes", () => {
    expect(localizeProse("Annual precip spans 3,375 to 6,096 mm.", "F", "imperial")).toContain("133 to 240 in");
    expect(localizeProse("The hiking belt runs 5–10 km from town.", "F", "imperial")).toContain("3.1–6.2 mi");
    expect(localizeProse("Snow depth often reaches 20-40 cm.", "F", "imperial")).toContain("8-16 in");
  });
  it("converts km/h before bare km", () => {
    expect(localizeProse("Gusts reach 80 km/h.", "F", "imperial")).toContain("50 mph");
  });
  it("converts elevations with vocabulary cues", () => {
    expect(localizeProse("The town sits at 1,500 m.", "F", "imperial")).toContain("4,921 ft");
  });
  it("preserves plus thresholds when localizing spelled metric lengths", () => {
    expect(localizeProse("5+ meters of annual snow.", "F", "imperial")).toContain("16+ feet");
  });
  it("converts threshold elevations and sensor-resolution metre claims", () => {
    expect(localizeProse("At more than 2,200 m, Los Alamos keeps strong night cooling.", "F", "imperial")).toContain("7,218 ft");
    const sensorText = localizeProse(
      "Sentinel-2 MSI emphasizes 10 m VNIR/SWIR for texture; Landsat OLI-TIRS pairs 30 m multispectral with thermal history.",
      "F",
      "imperial"
    );
    expect(sensorText).toContain("33 ft VNIR/SWIR");
    expect(sensorText).toContain("98 ft multispectral");
  });
  it("is a no-op when dist=metric", () => {
    expect(localizeProse("The town sits at 1,500 m.", "C", "metric")).toBe("The town sits at 1,500 m.");
  });
});

describe("localizeProse — null/empty inputs", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(localizeProse(null, "F", "imperial")).toBe("");
    expect(localizeProse(undefined, "F", "imperial")).toBe("");
    expect(localizeProse("", "F", "imperial")).toBe("");
  });
});
