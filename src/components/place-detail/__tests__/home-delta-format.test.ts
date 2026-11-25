import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../../data/places";
import { buildHomeBaseComparison } from "../../../lib/home-base";
import { formatHomeDelta } from "../home-delta-format";

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
});
