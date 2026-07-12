import { describe, expect, it } from "vitest";
import { rankingMonthEpochMs, rankingReferenceMonth } from "../ranking-calendar";

describe("ranking-calendar", () => {
  it("pins to local noon on the 1st so getMonth matches the whole month", () => {
    const midJuly = new Date(2026, 6, 15, 23, 59, 0);
    const epoch = rankingMonthEpochMs(midJuly);
    const pinned = new Date(epoch);
    expect(pinned.getFullYear()).toBe(2026);
    expect(pinned.getMonth()).toBe(6);
    expect(pinned.getDate()).toBe(1);
    expect(rankingReferenceMonth(epoch)).toBe(6);
  });

  it("changes only when the calendar month changes", () => {
    const june30 = rankingMonthEpochMs(new Date(2026, 5, 30, 18, 0, 0));
    const july1 = rankingMonthEpochMs(new Date(2026, 6, 1, 0, 5, 0));
    expect(rankingReferenceMonth(june30)).toBe(5);
    expect(rankingReferenceMonth(july1)).toBe(6);
    expect(june30).not.toBe(july1);
  });
});
