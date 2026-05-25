import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import type { Monthly12 } from "../../types";
import { buildGrowabilityRationale } from "../growability-score";
import { makeClimate, makePlace } from "./test-fixtures";

const M = (v: number[]): Monthly12 => v as unknown as Monthly12;

function joinedLines(placeId: string): string {
  const place = PLACES_BY_ID[placeId];
  expect(place, placeId).toBeTruthy();
  return buildGrowabilityRationale(place).lines.join(" ");
}

describe("buildGrowabilityRationale", () => {
  it("explains irrigated arid growability as a water-access tradeoff", () => {
    const text = joinedLines("yuma-az");

    expect(text).toContain("Selianinov HTC");
    expect(text).toContain("Thornthwaite PET");
    expect(text).toContain("very high drought risk");
    expect(text).toContain("irrigation");
  });

  it("emphasizes frost and GDD constraints for a cool short-season place", () => {
    const place = makePlace({
      name: "Short Season Test",
      climate: makeClimate({
        tempHighC: M([-5, -2, 2, 7, 12, 16, 19, 18, 13, 7, 0, -4]),
        tempLowC: M([-15, -13, -8, -3, 1, 5, 7, 6, 2, -4, -10, -14]),
        precipMm: M([30, 26, 32, 40, 52, 62, 58, 54, 48, 42, 34, 30]),
        annualPrecipMm: 508,
        frostFreeDays: 35,
        gdd10: 300,
        hardinessZone: "3a",
      }),
      growability: {
        score: 24,
        hardinessZone: "3a",
        growsWell: ["Hardy greens", "Potatoes"],
        tricky: ["Tomatoes", "Peppers"],
      },
    });

    const text = buildGrowabilityRationale(place).lines.join(" ");

    expect(text).toContain("Season length caps the score");
    expect(text).toContain("35 frost-free days");
    expect(text).toContain("GDD10 300");
    expect(text).toContain("zone 3a");
  });

  it("calls out the no-growing-season Selianinov edge explicitly", () => {
    const place = makePlace({
      name: "High Arctic Test",
      lat: 70,
      climate: makeClimate({
        tempHighC: M([-10, -10, -8, -2, 4, 9, 11, 9, 4, -2, -8, -10]),
        tempLowC: M([-20, -20, -18, -10, -2, 2, 3, 2, -2, -8, -16, -20]),
        precipMm: M([10, 10, 10, 15, 25, 30, 30, 30, 25, 15, 10, 10]),
        annualPrecipMm: 220,
        frostFreeDays: 0,
        gdd10: 0,
        hardinessZone: "1a",
      }),
      growability: {
        score: 6,
        hardinessZone: "1a",
        growsWell: ["Tundra plants"],
        tricky: ["Everything else"],
      },
    });

    const text = buildGrowabilityRationale(place).lines.join(" ");

    expect(text).toContain("Selianinov HTC is undefined");
    expect(text).toContain("active growing-season moisture index undefined");
    expect(text).toContain("GDD10");
  });
});
