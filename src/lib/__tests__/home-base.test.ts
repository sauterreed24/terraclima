// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import type { Monthly12 } from "../../types";
import {
  HOME_BASE_STORAGE_KEY,
  buildHomeBaseComparison,
  formatHomeDeltaValue,
  loadHomeBaseId,
  persistHomeBaseId,
  pickHomeDeltaChips,
} from "../home-base";
import { localizeProse } from "../units";
import { makeClimate, makePlace } from "./test-fixtures";

const flat = (v: number) => Array(12).fill(v) as Monthly12;

describe("home-base persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a place id and clears with null", () => {
    expect(loadHomeBaseId()).toBeNull();
    persistHomeBaseId("sequim-wa");
    expect(loadHomeBaseId()).toBe("sequim-wa");
    persistHomeBaseId(null);
    expect(loadHomeBaseId()).toBeNull();
  });

  it("tolerates garbage in storage", () => {
    window.localStorage.setItem(HOME_BASE_STORAGE_KEY, "{not json");
    expect(loadHomeBaseId()).toBeNull();
    window.localStorage.setItem(HOME_BASE_STORAGE_KEY, JSON.stringify(42));
    expect(loadHomeBaseId()).toBeNull();
    window.localStorage.setItem(HOME_BASE_STORAGE_KEY, JSON.stringify(""));
    expect(loadHomeBaseId()).toBeNull();
  });
});

describe("buildHomeBaseComparison", () => {
  const home = makePlace({
    id: "home-town",
    name: "Home Town",
    climate: makeClimate({
      tempHighC: [8, 10, 14, 18, 22, 26, 28, 27, 24, 19, 13, 9] as Monthly12,
      tempLowC: [0, 1, 4, 7, 11, 15, 17, 16, 13, 8, 3, 1] as Monthly12,
      precipMm: flat(50),
      annualPrecipMm: 600,
      humidity: flat(60),
      sunshinePct: flat(50),
      snowCm: [20, 16, 8, 0, 0, 0, 0, 0, 0, 0, 6, 18] as Monthly12,
    }),
  });

  it("computes signed temperature deltas, place minus home", () => {
    const cooler = makePlace({
      id: "cooler-town",
      name: "Cooler Town",
      climate: makeClimate({
        // JJA highs 20/21/20 vs home 26/28/27 → −6.67°C
        tempHighC: [4, 6, 9, 13, 17, 20, 21, 20, 18, 13, 8, 5] as Monthly12,
        // DJF lows mean −4.33 vs home 0.67 → −5°C
        tempLowC: [-5, -4, -1, 2, 6, 10, 12, 11, 8, 3, -1, -4] as Monthly12,
      }),
    });
    const read = buildHomeBaseComparison(home, cooler);
    const summer = read.signals.find(s => s.id === "summer-days")!;
    const winter = read.signals.find(s => s.id === "winter-nights")!;
    expect(summer.delta).toBeCloseTo(-6.67, 1);
    expect(summer.direction).toBe("lower");
    expect(summer.magnitude).toBe("major");
    expect(winter.delta).toBeCloseTo(-5, 5);
    expect(winter.direction).toBe("lower");
    expect(read.isSame).toBe(false);
  });

  it("expresses precipitation as a ratio with a clamped denominator", () => {
    const wet = makePlace({
      id: "wet-town",
      climate: makeClimate({ annualPrecipMm: 1800 }),
    });
    const ratio = buildHomeBaseComparison(home, wet).signals.find(s => s.id === "annual-precip")!;
    expect(ratio.unit).toBe("ratio");
    expect(ratio.delta).toBeCloseTo(3, 5);
    expect(ratio.direction).toBe("higher");
    expect(ratio.magnitude).toBe("major");

    const desertHome = makePlace({ id: "desert-home", climate: makeClimate({ annualPrecipMm: 0, precipMm: flat(0) }) });
    const vsDesert = buildHomeBaseComparison(desertHome, wet).signals.find(s => s.id === "annual-precip")!;
    expect(Number.isFinite(vsDesert.delta)).toBe(true);
    expect(vsDesert.delta).toBeCloseTo(120, 5); // 1800 / clamped 15
  });

  it("omits humidity, winter-sun, and snow signals unless both places author the field", () => {
    const noOptional = makePlace({
      id: "sparse-town",
      climate: makeClimate({ humidity: undefined, sunshinePct: undefined, snowCm: undefined }),
    });
    const ids = buildHomeBaseComparison(home, noOptional).signals.map(s => s.id);
    expect(ids).not.toContain("summer-humidity");
    expect(ids).not.toContain("winter-sun");
    expect(ids).not.toContain("annual-snow");
    // The always-computable core is still present.
    expect(ids).toContain("summer-days");
    expect(ids).toContain("winter-nights");
    expect(ids).toContain("annual-precip");
    expect(ids).toContain("comfy-months");
    expect(ids).toContain("hazard-load");
  });

  it("orders signals by salience and keeps similar ones out of the chips", () => {
    const slightlyDifferent = makePlace({
      id: "sibling-town",
      climate: makeClimate({
        tempHighC: home.climate.tempHighC.map(v => v + 0.4) as Monthly12,
        tempLowC: home.climate.tempLowC.map(v => v + 0.4) as Monthly12,
        annualPrecipMm: 620,
        humidity: flat(61),
        sunshinePct: flat(51),
        snowCm: home.climate.snowCm,
      }),
    });
    const read = buildHomeBaseComparison(home, slightlyDifferent);
    expect(pickHomeDeltaChips(read)).toHaveLength(0);
    expect(read.headline).toContain("close climate sibling");

    const contrast = makePlace({
      id: "contrast-town",
      climate: makeClimate({
        tempHighC: home.climate.tempHighC.map(v => v + 9) as Monthly12,
        sunshinePct: flat(75),
      }),
    });
    const chips = pickHomeDeltaChips(buildHomeBaseComparison(home, contrast));
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.length).toBeLessThanOrEqual(3);
    expect(chips[0].id).toBe("summer-days"); // 9°C swing dominates
    expect(chips.every(s => s.direction !== "similar")).toBe(true);
  });

  it("treats the same place as home without inventing deltas", () => {
    const read = buildHomeBaseComparison(home, home);
    expect(read.isSame).toBe(true);
    expect(read.signals).toHaveLength(0);
    expect(read.headline).toContain("home base");
  });

  it("writes delta-safe metric prose that localizes with the 9/5 ratio", () => {
    const cooler = makePlace({
      id: "delta-prose-town",
      climate: makeClimate({
        tempHighC: home.climate.tempHighC.map(v => v - 7) as Monthly12,
        tempLowC: home.climate.tempLowC.map(v => v + 5) as Monthly12,
      }),
    });
    const read = buildHomeBaseComparison(home, cooler);
    expect(read.headline).toContain("7.0°C cooler");
    expect(read.headline).toContain("5.0°C warmer");
    const localized = localizeProse(read.headline, "F");
    // Deltas must convert ×9/5 (7°C → 13°F), not via the absolute formula (7°C → 45°F).
    expect(localized).toContain("13°F cooler");
    expect(localized).toContain("9°F warmer");
    expect(localized).not.toContain("45°F");
  });

  it("reads sane directions on a real corpus pair", () => {
    const sequim = PLACES_BY_ID["sequim-wa"];
    const portal = PLACES_BY_ID["portal-az"];
    expect(sequim).toBeDefined();
    expect(portal).toBeDefined();
    const read = buildHomeBaseComparison(sequim, portal);
    const summer = read.signals.find(s => s.id === "summer-days")!;
    expect(summer.direction).toBe("higher"); // a sky-island summer still runs hotter than Sequim's marine summer
    expect(read.headline).toContain("Compared with Sequim");
    for (const signal of read.signals) {
      expect(Number.isFinite(signal.delta)).toBe(true);
      expect(Number.isFinite(signal.salience)).toBe(true);
    }
  });
});

describe("formatHomeDeltaValue", () => {
  const home = makePlace({ id: "fmt-home" });

  it("formats temperature deltas in both unit systems", () => {
    const hotter = makePlace({
      id: "fmt-hot",
      climate: makeClimate({ tempHighC: makePlace().climate.tempHighC.map(v => v + 5) as Monthly12 }),
    });
    const summer = buildHomeBaseComparison(home, hotter).signals.find(s => s.id === "summer-days")!;
    expect(formatHomeDeltaValue(summer, "C", "metric")).toBe("+5.0°C");
    expect(formatHomeDeltaValue(summer, "F", "imperial")).toBe("+9.0°F");
  });

  it("formats ratios as multiples above 1.75× and percentages below", () => {
    const wetter = makePlace({ id: "fmt-wet", climate: makeClimate({ annualPrecipMm: 536 * 2.3 }) });
    const drier = makePlace({ id: "fmt-dry", climate: makeClimate({ annualPrecipMm: 536 * 0.6 }) });
    const wetSignal = buildHomeBaseComparison(home, wetter).signals.find(s => s.id === "annual-precip")!;
    const drySignal = buildHomeBaseComparison(home, drier).signals.find(s => s.id === "annual-precip")!;
    expect(formatHomeDeltaValue(wetSignal, "F", "imperial")).toBe("2.3×");
    expect(formatHomeDeltaValue(drySignal, "F", "imperial")).toBe("-40%");
  });

  it("formats snow deltas through the snow unit localizer", () => {
    const snowier = makePlace({
      id: "fmt-snow",
      climate: makeClimate({
        snowCm: makePlace().climate.snowCm!.map(v => v + 10) as Monthly12, // +120 cm/yr
      }),
    });
    const snow = buildHomeBaseComparison(home, snowier).signals.find(s => s.id === "annual-snow")!;
    expect(formatHomeDeltaValue(snow, "C", "metric")).toBe("+120 cm");
    expect(formatHomeDeltaValue(snow, "F", "imperial")).toBe("+47\"");
  });
});
