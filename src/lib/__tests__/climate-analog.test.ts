import { describe, expect, it } from "vitest";
import {
  analogBreakdown,
  analogScore,
  CLIMATE_ANALOG_WEIGHTS,
  describeAnalogMatch,
  findClimateTwins,
  type ClimateAnalogAxisKey,
} from "../climate-analog";
import { makeClimate, makePlace } from "./test-fixtures";
import type { Monthly12, Place } from "../../types";

const flat = (v: number): Monthly12 => Array(12).fill(v) as Monthly12;
const monthly = (values: number[]): Monthly12 => values as Monthly12;
const annual = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0);
// Strong single-peak (continental) annual curve.
const seasonalHighs: Monthly12 = [2, 5, 11, 18, 24, 29, 31, 30, 25, 17, 9, 3];
const seasonalLows: Monthly12 = [-8, -5, -1, 4, 9, 14, 17, 16, 11, 4, -2, -6];
const mediterraneanHighs = monthly([10, 12, 15, 18, 22, 26, 29, 29, 26, 20, 14, 10]);
const mediterraneanLows = monthly([3, 4, 6, 8, 11, 14, 16, 16, 14, 10, 6, 3]);
const mediterraneanPrecip = monthly([95, 78, 62, 42, 24, 12, 6, 8, 22, 54, 82, 105]);
const aridWinterPrecip = monthly([20, 15, 10, 5, 3, 1, 1, 2, 5, 10, 15, 20]);

function climateWithPrecip(tempHighC: Monthly12, tempLowC: Monthly12, precipMm: Monthly12) {
  return makeClimate({
    tempHighC,
    tempLowC,
    precipMm,
    annualPrecipMm: annual(precipMm),
    snowCm: flat(0),
  });
}

function axisCloseness(a: Place, b: Place, key: ClimateAnalogAxisKey): number {
  const axis = analogBreakdown(a, b).find(item => item.key === key);
  if (!axis) throw new Error(`Missing analog axis ${key}`);
  return axis.closeness;
}

describe("CLIMATE_ANALOG_WEIGHTS", () => {
  it("sums to 1.0", () => {
    const sum = Object.values(CLIMATE_ANALOG_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});

describe("analogScore", () => {
  it("is 1.0 for identical inputs", () => {
    const p = makePlace();
    expect(analogScore(p, p)).toBeCloseTo(1, 6);
  });

  it("is symmetric", () => {
    const a = makePlace({ id: "a" });
    const b = makePlace({
      id: "b",
      climate: makeClimate({ tempHighC: seasonalHighs, tempLowC: seasonalLows, annualPrecipMm: 900 }),
    });
    expect(analogScore(a, b)).toBeCloseTo(analogScore(b, a), 10);
  });

  it("is bounded in [0,1]", () => {
    const a = makePlace({ id: "a", climate: makeClimate({ tempHighC: flat(40), tempLowC: flat(28), annualPrecipMm: 30 }) });
    const b = makePlace({ id: "b", climate: makeClimate({ tempHighC: seasonalHighs, tempLowC: seasonalLows, annualPrecipMm: 2400 }) });
    const s = analogScore(a, b);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe("seasonal shape axis", () => {
  it("scores a flat tropical year as a different rhythm from a strongly seasonal one", () => {
    const tropical = makePlace({ id: "trop", climate: makeClimate({ tempHighC: flat(30), tempLowC: flat(22) }) });
    const continental = makePlace({ id: "cont", climate: makeClimate({ tempHighC: seasonalHighs, tempLowC: seasonalLows }) });
    const shape = analogBreakdown(tropical, continental).find(a => a.key === "seasonalShape")!;
    expect(shape.closeness).toBeLessThan(0.5);
  });

  it("treats two strongly seasonal years as sharing a rhythm", () => {
    const a = makePlace({ id: "a", climate: makeClimate({ tempHighC: seasonalHighs, tempLowC: seasonalLows }) });
    // Same shape, shifted warmer by a constant — shape is level-independent.
    const warmer = makePlace({
      id: "warmer",
      climate: makeClimate({
        tempHighC: seasonalHighs.map(v => v + 6) as Monthly12,
        tempLowC: seasonalLows.map(v => v + 6) as Monthly12,
      }),
    });
    const shape = analogBreakdown(a, warmer).find(a => a.key === "seasonalShape")!;
    expect(shape.closeness).toBeGreaterThan(0.95);
  });
});

describe("precip regime axis", () => {
  const winterWet = makePlace({
    id: "winter-wet",
    climate: makeClimate({ precipMm: [150, 130, 90, 40, 15, 5, 2, 3, 20, 60, 110, 160], annualPrecipMm: 785 }),
  });
  const summerWet = makePlace({
    id: "summer-wet",
    climate: makeClimate({ precipMm: [5, 6, 12, 25, 60, 130, 180, 170, 95, 35, 12, 6], annualPrecipMm: 736 }),
  });

  it("separates winter-wet (Mediterranean) from summer-wet (monsoon) regimes", () => {
    const opposite = analogBreakdown(winterWet, summerWet).find(a => a.key === "precipRegime")!;
    const sameRegime = analogBreakdown(winterWet, makePlace({ id: "w2", climate: winterWet.climate })).find(a => a.key === "precipRegime")!;
    expect(opposite.closeness).toBeLessThan(0.4);
    expect(sameRegime.closeness).toBeGreaterThan(0.95);
  });
});

describe("bioclim axes", () => {
  it("penalizes a thermally similar place that crosses from Mediterranean water balance into aridity", () => {
    const source = makePlace({
      id: "med-source",
      lat: 48.1,
      climate: climateWithPrecip(mediterraneanHighs, mediterraneanLows, mediterraneanPrecip),
    });
    const mediterraneanTwin = makePlace({
      id: "med-twin",
      lat: 47.8,
      climate: climateWithPrecip(mediterraneanHighs, mediterraneanLows, mediterraneanPrecip),
    });
    const aridThermalTwin = makePlace({
      id: "arid-thermal-twin",
      lat: 47.8,
      climate: climateWithPrecip(mediterraneanHighs, mediterraneanLows, aridWinterPrecip),
    });

    expect(axisCloseness(source, mediterraneanTwin, "aridity")).toBeGreaterThan(0.95);
    expect(axisCloseness(source, aridThermalTwin, "aridity")).toBeLessThan(0.15);
    expect(analogScore(source, mediterraneanTwin)).toBeGreaterThan(analogScore(source, aridThermalTwin));
  });

  it("separates thermally identical places when Conrad continentality diverges", () => {
    const climate = climateWithPrecip(seasonalHighs, seasonalLows, flat(60));
    const anchor = makePlace({ id: "conrad-anchor", lat: 48, climate });
    const nearConrad = makePlace({ id: "near-conrad", lat: 49, climate });
    const farConrad = makePlace({ id: "far-conrad", lat: 20, climate });

    expect(axisCloseness(anchor, farConrad, "thermalLevel")).toBeCloseTo(1, 6);
    expect(axisCloseness(anchor, farConrad, "seasonalAmplitude")).toBeCloseTo(1, 6);
    expect(axisCloseness(anchor, nearConrad, "continentality")).toBeGreaterThan(0.98);
    expect(axisCloseness(anchor, farConrad, "continentality")).toBeLessThan(0.25);
  });
});

describe("describeAnalogMatch", () => {
  it("returns a non-empty sentence", () => {
    const a = makePlace({ id: "a" });
    const b = makePlace({ id: "b", climate: makeClimate({ tempHighC: seasonalHighs, tempLowC: seasonalLows }) });
    const text = describeAnalogMatch(a, b);
    expect(text.length).toBeGreaterThan(0);
    expect(text.endsWith(".")).toBe(true);
  });
});

describe("findClimateTwins", () => {
  it("excludes the target and returns at most k, sorted by analog", () => {
    const target = makePlace({ id: "target" });
    const pool = [target, makePlace({ id: "a" }), makePlace({ id: "b" }), makePlace({ id: "c" })];
    const twins = findClimateTwins(target, pool, 2);
    expect(twins.length).toBe(2);
    expect(twins.find(t => t.place.id === "target")).toBeUndefined();
    expect(twins[0].analog).toBeGreaterThanOrEqual(twins[1].analog);
  });

  it("keeps cached twin pools scoped to the supplied pool identity", () => {
    const target = makePlace({ id: "pool-target", climate: makeClimate({ tempHighC: seasonalHighs, tempLowC: seasonalLows }) });
    const maritime = makePlace({
      id: "pool-maritime",
      climate: makeClimate({
        tempHighC: seasonalHighs.map(v => v - 3) as Monthly12,
        tempLowC: seasonalLows.map(v => v + 2) as Monthly12,
      }),
    });
    const continental = makePlace({
      id: "pool-continental",
      climate: makeClimate({
        tempHighC: seasonalHighs.map(v => v + 4) as Monthly12,
        tempLowC: seasonalLows.map(v => v - 3) as Monthly12,
      }),
    });

    expect(findClimateTwins(target, [maritime], 1)[0].place.id).toBe("pool-maritime");
    expect(findClimateTwins(target, [continental], 1)[0].place.id).toBe("pool-continental");
  });

  it("a 'warmer' shift promotes the warmer of two otherwise-similar twins", () => {
    const anchor = makePlace({ id: "anchor", climate: makeClimate({ tempHighC: seasonalHighs, tempLowC: seasonalLows }) });
    const warmer = makePlace({
      id: "warmer",
      climate: makeClimate({
        tempHighC: seasonalHighs.map(v => v + 6) as Monthly12,
        tempLowC: seasonalLows.map(v => v + 6) as Monthly12,
      }),
    });
    const cooler = makePlace({
      id: "cooler",
      climate: makeClimate({
        tempHighC: seasonalHighs.map(v => v - 6) as Monthly12,
        tempLowC: seasonalLows.map(v => v - 6) as Monthly12,
      }),
    });
    const twins = findClimateTwins(anchor, [warmer, cooler], 2, "warmer");
    expect(twins[0].place.id).toBe("warmer");
  });

  it("a 'drier' shift promotes the drier twin", () => {
    const anchor = makePlace({ id: "anchor2", climate: makeClimate({ annualPrecipMm: 900, precipMm: flat(75) }) });
    const wet = makePlace({ id: "wet", climate: makeClimate({ annualPrecipMm: 1500, precipMm: flat(125) }) });
    const dry = makePlace({ id: "dry", climate: makeClimate({ annualPrecipMm: 350, precipMm: flat(29) }) });
    const twins = findClimateTwins(anchor, [wet, dry], 2, "drier");
    expect(twins[0].place.id).toBe("dry");
  });

  it("a shift never lets a non-twin leapfrog genuine twins (regression: cool coast asked for 'milder winter')", () => {
    // A cool, low-amplitude maritime anchor.
    const coolClimate = makeClimate({
      tempHighC: [10, 11, 13, 15, 17, 18, 19, 19, 18, 15, 12, 10],
      tempLowC: [5, 5, 7, 8, 10, 12, 13, 13, 12, 10, 7, 5],
      annualPrecipMm: 1100,
      precipMm: [160, 130, 110, 70, 40, 20, 10, 12, 40, 90, 140, 170],
    });
    const anchor = makePlace({ id: "cool-anchor", climate: coolClimate });
    // Six genuine cool twins (small perturbations keep them clearly analogous).
    const twins = Array.from({ length: 6 }, (_, i) =>
      makePlace({
        id: `cool-${i}`,
        climate: makeClimate({
          ...coolClimate,
          tempHighC: coolClimate.tempHighC.map(v => v + (i - 3) * 0.4) as Monthly12,
          tempLowC: coolClimate.tempLowC.map(v => v + (i - 3) * 0.4) as Monthly12,
        }),
      }),
    );
    // A tropical interloper: maximally satisfies "milder winter" but is no twin.
    const tropical = makePlace({
      id: "tropical",
      archetypes: ["tropical-isothermal"],
      drivers: ["trade-wind"],
      climate: makeClimate({
        tempHighC: flat(31),
        tempLowC: flat(24),
        annualPrecipMm: 1300,
        precipMm: [20, 20, 30, 60, 140, 180, 180, 170, 150, 120, 60, 30],
      }),
    });
    const out = findClimateTwins(anchor, [...twins, tropical], 6, "milder-winter");
    expect(out.find(t => t.place.id === "tropical")).toBeUndefined();
    expect(out.every(t => t.analog >= 0.62)).toBe(true);
  });

  it("prefers a Mediterranean water-balance twin over a thermally similar arid candidate", () => {
    const anchor = makePlace({
      id: "med-anchor",
      lat: 48.1,
      climate: climateWithPrecip(mediterraneanHighs, mediterraneanLows, mediterraneanPrecip),
    });
    const aridCandidate = makePlace({
      id: "aa-arid-candidate",
      lat: 48.1,
      climate: climateWithPrecip(mediterraneanHighs, mediterraneanLows, aridWinterPrecip),
    });
    const medCandidate = makePlace({
      id: "zz-med-candidate",
      lat: 48.1,
      climate: climateWithPrecip(mediterraneanHighs, mediterraneanLows, mediterraneanPrecip),
    });

    expect(findClimateTwins(anchor, [aridCandidate, medCandidate], 2)[0].place.id).toBe("zz-med-candidate");
  });

  it("uses Conrad continentality to break otherwise identical climate-twin ties", () => {
    const climate = climateWithPrecip(seasonalHighs, seasonalLows, flat(60));
    const anchor = makePlace({ id: "conrad-anchor-twin", lat: 48, climate });
    const farConrad = makePlace({ id: "aa-far-conrad", lat: 20, climate });
    const nearConrad = makePlace({ id: "zz-near-conrad", lat: 49, climate });

    expect(findClimateTwins(anchor, [farConrad, nearConrad], 2)[0].place.id).toBe("zz-near-conrad");
  });
});
