import { describe, expect, it } from "vitest";
import {
  shouldShowPlaceCardScreeningScores,
  liveFitFiltersActive,
} from "../place-card-screening";

describe("place-card-screening", () => {
  it("keeps discovery rankings free of screening score chrome", () => {
    expect(shouldShowPlaceCardScreeningScores("most-unique")).toBe(false);
    expect(shouldShowPlaceCardScreeningScores("hidden-gems")).toBe(false);
    expect(shouldShowPlaceCardScreeningScores("coolest-summers")).toBe(false);
    expect(shouldShowPlaceCardScreeningScores("best-this-month")).toBe(false);
  });

  it("shows screening scores for fit-oriented rankings", () => {
    expect(shouldShowPlaceCardScreeningScores("live-fit")).toBe(true);
    expect(shouldShowPlaceCardScreeningScores("most-comfortable")).toBe(true);
    expect(shouldShowPlaceCardScreeningScores("best-for-remote-work")).toBe(true);
    expect(shouldShowPlaceCardScreeningScores("best-retirement")).toBe(true);
  });

  it("shows screening scores when Live Finder constraints are active", () => {
    expect(liveFitFiltersActive({ maxSummerHighC: 26 })).toBe(true);
    expect(shouldShowPlaceCardScreeningScores("most-unique", { maxSummerHighC: 26 })).toBe(true);
    expect(shouldShowPlaceCardScreeningScores("most-unique", { fitPresets: new Set(["cool-summers"]) })).toBe(true);
  });
});
