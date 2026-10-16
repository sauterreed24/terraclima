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
  parseUnitSearch,
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

describe("parseUnitSearch", () => {
  it("accepts shareable temperature and distance unit params", () => {
    expect(parseUnitSearch("?temp=C&dist=metric")).toEqual({ temp: "C", dist: "metric" });
    expect(parseUnitSearch("temp=F&dist=imperial")).toEqual({ temp: "F", dist: "imperial" });
  });

  it("drops unsupported unit params", () => {
    expect(parseUnitSearch("?temp=K&dist=nautical")).toEqual({});
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
  it("treats signed Celsius after absolute cues as warm readings, not deltas", () => {
    const chinook = localizeProse(
      "Chinook events can lift January temperatures to +15°C for days at a time.",
      "F",
      "metric"
    );
    expect(chinook).toContain("59°F");
    expect(chinook).not.toMatch(/\+\d+°F/);

    expect(localizeProse("The warm shelf can rise to +10 to +15°C.", "F", "metric")).toContain("50 to 59°F");
  });
  it("treats weather ceilings as absolute readings, not deltas", () => {
    expect(localizeProse("Summer highs up to 40°C.", "F", "metric")).toContain("104°F");
    expect(localizeProse("Summer highs up to +15°C.", "F", "metric")).toContain("59°F");

    const range = localizeProse("Summer highs up to 35–40°C.", "F", "metric");
    expect(range).toContain("95");
    expect(range).toContain("104°F");
  });
  it("still treats signed outlook ranges and warming shorthand as deltas", () => {
    expect(localizeProse("Warmer winters (+3 to +5°C) likely fastest.", "F", "metric")).toMatch(/\+5 to \+9°F/);
    expect(localizeProse("Warming ~+2°C; longer growing season.", "F", "metric")).toMatch(/~\+4°F/);
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
    expect(localizeProse("Daytime highs hover in the low-to-mid 20s year-round.", "F", "metric")).toBe("Daytime highs hover in the 68–79°F range year-round.");
    expect(localizeProse("Nights cool into the single digits in winter, low teens in summer.", "F", "metric")).toBe("Nights cool into the 32–48°F range in winter, 50–55°F range in summer.");
    expect(localizeProse("Summers never warm past the mid-teens on the west coast.", "F", "metric")).toContain("57–61°F range");
    expect(localizeProse("Inland Minnesota climbs toward the high twenties.", "F", "metric")).toBe("Inland Minnesota climbs toward the 81–84°F range.");
    expect(localizeProse("Warm-season afternoons in the low thirties Celsius.", "F", "metric")).toBe("Warm-season afternoons in the 86–91°F range.");
    expect(localizeProse("WorldClim 2.1 uses 30s resolution.", "F", "metric")).toBe("WorldClim 2.1 uses 30s resolution.");
  });
});

describe("localizeProse — distances", () => {
  it("converts kilometres in a clearly distance context", () => {
    // Under-10 mile output is rendered with one decimal (10 km ≈ 6.2 mi).
    expect(localizeProse("Drive 10 km north.", "F", "imperial")).toContain("6 mi");
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
  it("converts hyphenated Celsius decade bands", () => {
    const out = localizeProse("afternoons that rarely push past the mid-20s °C", "F", "imperial");
    expect(out).not.toMatch(/mid-\d/);
    expect(out).toMatch(/°F/);
  });

  it("converts areas and spelled-out or vague metric quantities", () => {
    const L = (t: string) => localizeProse(t, "F", "imperial");
    expect(L("covers some 7,000 hectares of marsh")).toContain("17,000 acres");
    expect(L("a 1,300-hectare sand spit")).toContain("3,200-acre");
    expect(L("about 350,000 square kilometres of land")).toContain("135,000 square miles");
    expect(L("more than a thousand hectares")).toContain("2,500 acres");
    expect(L("barely three kilometres wide")).toContain("1.9 miles wide");
    expect(L("a crater 500 metres across")).toContain("1,600 feet across");
    expect(L("travelled thousands of kilometres")).toContain("thousands of miles");
    expect(L("only a few metres deep")).toContain("a few yards deep");
    expect(L("barely more than a metre high")).toContain("a yard high");
    expect(L("two metres of snow")).toContain("7 feet of snow");
    expect(localizeProse("covers some 7,000 hectares", "C", "metric")).toContain("7,000 hectares");
    expect(L("removed about 400,000 tonnes of rock")).toContain("441,000 tons");
    expect(L("About 80 million tonnes of rock")).toContain("88 million tons");
    expect(L("climbs 1800 vertical meters")).toContain("5,900 vertical feet");
    expect(L("twelve-metre tides")).toContain("39-foot tides");
    expect(L("a ski town — 2424 m on the east Sierra flank")).toContain("7,953 ft");
    expect(L("dump meters of snow")).toContain("feet of snow");
    expect(L("Route 5 m")).toBe("Route 5 m");
    // Review regressions: compound numbers, "half a kilometre", km², capitals, ranges, money.
    expect(L("Twenty-five kilometres inland")).toBe("16 miles inland");
    expect(L("two hundred and fifty metres")).toBe("820 feet");
    expect(L("most days, and thirty kilometers inland")).toBe("most days, and 19 miles inland");
    expect(L("a twenty-five-metre cliff")).toBe("an 82-foot cliff");
    expect(L("Less than half a kilometre downstream")).toBe("Less than a third of a mile downstream");
    expect(L("a kilometre-long beach")).toBe("a half-mile-long beach");
    expect(L("roughly 50,000 km² — the largest")).toContain("19,000 square miles");
    expect(L("Metres of snow fall")).toBe("Feet of snow fall");
    expect(L("pine forests 2000–3000 m in the Sierra")).toBe("pine forests 2000–3000 m in the Sierra");
    expect(L("raised $300 m in bonds")).toBe("raised $300 m in bonds");
    expect(L("5 kg/ha")).toBe("5 kg/ha");
    expect(L("0.4°C milder January low")).toBe("1°F milder January low");
  });

  it("converts kilogram weights to pounds", () => {
    expect(localizeProse("a cow sculpted from about 270 kg of butter", "F", "imperial")).toContain("595 lb");
    expect(localizeProse("trout can weigh more than 10 kg", "F", "imperial")).toContain("22 lb");
    expect(localizeProse("about 270 kg of butter", "C", "metric")).toContain("270 kg");
  });

  it("converts km/h before bare km", () => {
    expect(localizeProse("Gusts reach 80 km/h.", "F", "imperial")).toContain("50 mph");
  });
  it("converts elevations with vocabulary cues", () => {
    expect(localizeProse("The town sits at 1,500 m.", "F", "imperial")).toContain("4,900 ft");
  });
  it("converts between-and elevation bands without orphaning the first endpoint", () => {
    expect(localizeProse("Highland basins between 1500 and 2500 m.", "F", "imperial")).toBe(
      "Highland basins between 4,900 and 8,200 ft.",
    );
  });
  it("converts spelled-out metre ranges without orphaning the first endpoint", () => {
    expect(localizeProse("Annual snowfall totals of 3–6 meters are normal.", "F", "imperial")).toBe(
      "Annual snowfall totals of 10–20 feet are normal.",
    );
  });
  it("converts qualitative metric distance nouns", () => {
    expect(localizeProse("Sky islands rise thousands of meters above arid basins.", "F", "imperial")).toContain(
      "thousands of feet",
    );
    expect(localizeProse("Influence carries hundreds of kilometers inland.", "F", "imperial")).toContain(
      "hundreds of miles",
    );
    expect(localizeProse("Ridgetops only a few hundred meters higher.", "F", "imperial")).toContain(
      "a few hundred feet",
    );
    expect(localizeProse("They can be meters across or kilometers wide.", "F", "imperial")).toBe(
      "They can be feet across or miles wide.",
    );
  });
  it("preserves plus thresholds when localizing spelled metric lengths", () => {
    expect(localizeProse("5+ meters of annual snow.", "F", "imperial")).toContain("16+ feet");
  });
  it("converts threshold elevations and sensor-resolution metre claims", () => {
    expect(localizeProse("At more than 2,200 m, Los Alamos keeps strong night cooling.", "F", "imperial")).toContain("7,200 ft");
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

describe("localizeProse — chinook-style temperature spikes", () => {
  it("treats spiking temperatures as deltas, not absolute readings", () => {
    expect(localizeProse("sometimes spiking temperatures 20–30°C in hours", "F", "imperial")).toBe(
      "sometimes spiking temperatures 36–54°F in hours",
    );
  });
});

describe("localizeProse — null/empty inputs", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(localizeProse(null, "F", "imperial")).toBe("");
    expect(localizeProse(undefined, "F", "imperial")).toBe("");
    expect(localizeProse("", "F", "imperial")).toBe("");
  });
});

describe("localizeProse — absolute readings vs differences in corpus sentences", () => {
  const f = (text: string) => localizeProse(text, "F", "metric");
  it.each([
    ["Brutally hot — afternoons near 41°C and often well above 45°C, nights that barely cool.", "near 106°F and often well above 113°F"],
    ["Cold — afternoons struggling near freezing, mornings near −15°C and often far colder.", "mornings near 5°F"],
    ["Hot, dry and blazing — afternoons near 29°C and often above 35°C, nights around 14°C.", "near 84°F and often above 95°F"],
    ["Warm, humid and misty — afternoons near 30°C in town but much cooler up on the ridges.", "near 86°F in town"],
    ["Warm then glorious — September afternoons near 29°C give way to cooler, drier days.", "near 84°F give way"],
    ["Afternoons fall from about 13°C to below freezing by late October.", "about 55°F to below"],
    ["Cool and frosty — nights near 4°C and often dipping below freezing.", "nights near 39°F"],
    ["The great escape — afternoons near 22°C while the basin below tops 35°C.", "near 72°F while the basin below tops 95°F"],
    ["Summer afternoons rarely exceed 25°C above a still-active volcanic caldera.", "exceed 77°F above"],
    ["A furnace — afternoons near 40°C and higher, nights that only fall to about 24°C.", "near 104°F and higher"],
  ])("keeps %j absolute", (text, expected) => {
    expect(f(text)).toContain(expected);
  });

  it.each([
    ["Lapse-rate cooling drops summit temperatures by roughly 10 °C relative to the surrounding desert.", "by roughly 18°F"],
    ["Sierra Vista's elevation shaves 4–6°C off low-desert highs.", "shaves 7–11°F off"],
    ["Elevation supplies on the order of 10 °C of cooling relative to the basin.", "order of 18°F of cooling"],
    ["The trail drops into a fog-dripping redwood cove and the temperature drops 5°C.", "temperature drops 9°F"],
    ["Mean monthly highs span only ~6°C from January to August.", "span only ~11°F"],
    ["Stepping inland 8 km can add 8°C on a summer afternoon.", "can add 14°F"],
    ["A plunge to around 9°C after dark, a swing of nearly 20°C that makes evenings cool.", "swing of nearly 36°F"],
    ["A chinook can lift the temperature 15°C in a few hours.", "lift the temperature 27°F"],
    ["A norther drops the temperature 10°C in a few hours.", "drops the temperature 18°F"],
    ["Summer highs warmer by ~3°C; frost frequency slightly reduced.", "warmer by ~5°F"],
    ["Cold-air drainage nets about a 1°C winter low difference over a few hundred metres.", "about a 2°F winter low difference"],
    ["Warming ~1.5°C; the cloud base rises.", "Warming ~3°F"],
    ["Down in the Owens Valley, summer afternoons run about 10°C hotter.", "about 18°F hotter"],
    ["About 7°C colder in winter.", "About 13°F colder"],
    ["Coulee bottoms can run 5 to 10°C colder than the ridgetop town.", "9 to 18°F colder"],
  ])("converts %j as a difference", (text, expected) => {
    expect(f(text)).toContain(expected);
  });

  it("converts a lapse-rate range per 1,000 m", () => {
    expect(localizeProse("Air cools 6–7°C per 1,000 m of climb.", "F", "imperial")).toContain("3.3–3.8°F per 1,000 ft");
  });
});

describe("localizeProse — round metric figures stay round", () => {
  const f = (text: string) => localizeProse(text, "C", "imperial");
  it.each([
    ["Peaks reach more than 3,000 m.", "more than 9,800 ft"],
    ["The bench sits nearly 1,000 m above the valley.", "nearly 3,300 ft"],
    ["Rain totals about 500 mm a year.", "about 20 in"],
    ["The town sits at 2,424 m on the flank.", "7,953 ft"],
    ["Sierra Vista's ~1,400-m elevation shaves heat off.", "~4,600-ft elevation"],
    ["The belt runs 5–10 km from town.", "3.1–6.2 mi"],
  ])("%j", (text, expected) => {
    expect(f(text)).toContain(expected);
  });
});
