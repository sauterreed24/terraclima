import { describe, expect, it } from "vitest";
import { synthesizePlaceSignals } from "../place-signals";
import { makePlace } from "./test-fixtures";

describe("synthesizePlaceSignals", () => {
  it("emits the three baseline lines: thermal span, wettest/driest, comfort window", () => {
    const place = makePlace({
      id: "phx",
      name: "Phoenix",
      climate: {
        tempHighC: [20, 22, 26, 31, 36, 41, 42, 41, 38, 32, 25, 20],
        tempLowC: [8, 10, 13, 17, 22, 27, 30, 29, 25, 18, 12, 8],
        precipMm: [22, 22, 26, 8, 3, 1, 24, 30, 22, 18, 18, 26],
      },
    });
    const { lines, topRisks } = synthesizePlaceSignals(place, "C", "metric");
    expect(lines).toHaveLength(3);
    expect(lines[0].label).toBe("Annual thermal span");
    expect(lines[0].value).toContain("8°C to 42°C");
    expect(lines[1].label).toBe("Wettest / driest month");
    // Wettest = Aug (30), driest = Jun (1), ratio 30×
    expect(lines[1].value).toContain("Aug");
    expect(lines[1].value).toContain("Jun");
    expect(lines[1].value).toContain("30.0×");
    expect(lines[2].label).toContain("Comfort-window months");
    // Highs in 12–28°C: 20, 22, 26, 25, 20 → Jan, Feb, Mar, Nov, Dec = 5 months.
    expect(lines[2].value).toBe("5 / 12");
    expect(topRisks).toEqual([]); // No risks at elevated+ in baseline fixture
  });

  it("uses ∞ when the driest month is essentially zero", () => {
    const place = makePlace({
      id: "atacama",
      climate: {
        tempHighC: [20, 22, 26, 28, 26, 22, 20, 22, 24, 26, 24, 22],
        tempLowC: [10, 12, 14, 16, 16, 14, 12, 12, 14, 14, 12, 10],
        precipMm: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      },
    });
    const { lines } = synthesizePlaceSignals(place, "C", "metric");
    expect(lines[1].value).toContain("∞");
  });

  it("includes a humidity regime line when humidity data is present", () => {
    const place = makePlace({
      id: "miami",
      climate: {
        tempHighC: [25, 26, 27, 28, 30, 32, 33, 33, 32, 30, 27, 26],
        tempLowC: [17, 17, 19, 21, 23, 25, 26, 26, 25, 23, 20, 18],
        precipMm: [50, 50, 60, 80, 130, 200, 160, 220, 220, 160, 80, 50],
        humidity: [72, 70, 70, 70, 73, 76, 76, 76, 76, 75, 75, 73],
      },
    });
    const { lines } = synthesizePlaceSignals(place, "F", "imperial");
    const humidity = lines.find(l => l.label === "Humidity regime");
    expect(humidity).toBeTruthy();
    expect(humidity?.value).toContain("Summer 76%");
  });

  it("includes snow-active months only when snow data is present", () => {
    const place = makePlace({
      id: "buffalo",
      climate: {
        tempHighC: [-2, 0, 5, 12, 18, 23, 27, 26, 21, 14, 7, 1],
        tempLowC: [-9, -9, -5, 1, 7, 12, 16, 15, 11, 5, 0, -6],
        precipMm: [70, 60, 70, 80, 80, 90, 80, 80, 90, 90, 90, 90],
        snowCm: [60, 50, 40, 5, 0, 0, 0, 0, 0, 1, 20, 50],
      },
    });
    const { lines } = synthesizePlaceSignals(place, "F", "imperial");
    const snow = lines.find(l => l.label === "Snow-active months");
    expect(snow?.value).toBe("7 / 12");
  });

  it("flags up to three top risks at the elevated level or above", () => {
    const place = makePlace({
      id: "risky",
      risks: {
        wildfire: { level: "high" },
        flood: { level: "low" },
        drought: { level: "elevated" },
        extremeHeat: { level: "very-high" },
        extremeCold: { level: "low" },
        smoke: { level: "moderate" },
        storm: { level: "very-low" },
        landslide: { level: "low" },
        coastal: { level: "very-low" },
      },
    });
    const { topRisks } = synthesizePlaceSignals(place, "C", "metric");
    expect(topRisks).toHaveLength(3);
    expect(topRisks[0]).toContain("Extreme heat");
    expect(topRisks[1]).toContain("Wildfire");
    expect(topRisks[2]).toContain("Drought");
  });

  it("returns 0 risks when nothing crosses the elevated threshold", () => {
    const place = makePlace({
      id: "quiet",
      risks: {
        wildfire: { level: "moderate" },
        flood: { level: "low" },
        drought: { level: "low" },
        extremeHeat: { level: "moderate" },
        extremeCold: { level: "low" },
        smoke: { level: "low" },
        storm: { level: "very-low" },
        landslide: { level: "very-low" },
        coastal: { level: "very-low" },
      },
    });
    const { topRisks } = synthesizePlaceSignals(place, "C", "metric");
    expect(topRisks).toEqual([]);
  });
});
