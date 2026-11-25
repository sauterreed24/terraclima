import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../../data/places";
import { buildHomeBaseComparison, homeBaseHeadline, type HomeDeltaSignal } from "../../../lib/home-base";
import { localizeProse } from "../../../lib/units";
import { formatHomeDelta, HOME_DELTA_SAME } from "../home-delta-format";

describe("formatHomeDelta", () => {
  const comparison = buildHomeBaseComparison(PLACES_BY_ID["sequim-wa"]!, PLACES_BY_ID["yuma-az"]!);

  it("shows temperature differences in whole degrees", () => {
    const temps = comparison.signals.filter(signal => signal.unit === "C");
    expect(temps.length).toBeGreaterThan(0);
    for (const signal of temps) {
      expect(formatHomeDelta(signal, "F", "imperial")).toMatch(/^[+-]?\d+°F$/);
      expect(formatHomeDelta(signal, "C", "metric")).toMatch(/^[+-]?\d+°C$/);
    }
  });

  it("shows overall risk on the 0–100 scale used elsewhere, never out of 5", () => {
    const risk = comparison.signals.find(signal => signal.unit === "risk")!;
    const text = formatHomeDelta(risk, "F", "imperial");
    expect(text).toMatch(/^[+-]?\d+ pts$/);
    expect(text).not.toContain("/ 5");
  });

  it("says 'about the same' when a difference rounds to zero, never 0, -0 or +0", () => {
    const base = comparison.signals[0]!;
    const cases: Array<Pick<HomeDeltaSignal, "unit" | "delta">> = [
      { unit: "C", delta: 0.2 },
      { unit: "C", delta: -0.2 },
      { unit: "C", delta: 0 },
      { unit: "risk", delta: -0.02 },
      { unit: "risk", delta: 0.02 },
      { unit: "ratio", delta: 1.004 },
      { unit: "ratio", delta: 0.996 },
      { unit: "points", delta: -0.4 },
      { unit: "months", delta: 0 },
      { unit: "cm", delta: 0.3 },
      { unit: "cm", delta: -0.3 },
    ];
    for (const c of cases) {
      for (const [temp, dist] of [["F", "imperial"], ["C", "metric"]] as const) {
        expect(formatHomeDelta({ ...base, ...c }, temp, dist), `${c.unit} ${c.delta} ${temp}`).toBe(HOME_DELTA_SAME);
      }
    }
  });

  it("keeps real differences as signed whole numbers", () => {
    const base = comparison.signals[0]!;
    expect(formatHomeDelta({ ...base, unit: "C", delta: 0.6 }, "C", "metric")).toBe("+1°C");
    expect(formatHomeDelta({ ...base, unit: "C", delta: -0.4 }, "F", "imperial")).toBe("-1°F");
    expect(formatHomeDelta({ ...base, unit: "C", delta: 8.2 }, "F", "imperial")).toBe("+15°F");
    expect(formatHomeDelta({ ...base, unit: "ratio", delta: 0.6 }, "F", "imperial")).toBe("-40%");
    expect(formatHomeDelta({ ...base, unit: "risk", delta: -0.8 }, "F", "imperial")).toBe("-16 pts");
  });

  it("writes the headline in whole degrees that match the tiles in both units", () => {
    for (const temp of ["C", "F"] as const) {
      const headline = localizeProse(homeBaseHeadline(comparison, temp), temp);
      expect(headline).not.toMatch(/\d\.\d°/);
      for (const signal of comparison.signals.filter(s => s.unit === "C" && s.direction !== "similar")) {
        const tile = formatHomeDelta(signal, temp, temp === "F" ? "imperial" : "metric").replace(/^[+-]/, "");
        if (comparison.headline.includes(signal.phrase)) expect(headline).toContain(tile);
      }
    }
  });
});
