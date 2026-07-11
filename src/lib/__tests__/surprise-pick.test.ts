import { describe, expect, it } from "vitest";
import type { Place } from "../../types";
import type { RankingResult } from "../scoring";
import { pickSurprisePlaceId } from "../surprise-pick";

function stubPlace(id: string, uniqueness: number, hiddenGem = 40): Place {
  return {
    id,
    name: id,
    scores: {
      hiddenGem,
      microclimateUniqueness: uniqueness,
      comfort: 50,
      resilience: 50,
      growability: 50,
      tradeoff: 50,
    },
  } as Place;
}

function row(place: Place): RankingResult {
  return { place, score: place.scores.microclimateUniqueness };
}

describe("pickSurprisePlaceId", () => {
  it("returns null for an empty pool", () => {
    expect(pickSurprisePlaceId([], [])).toBeNull();
  });

  it("returns the only candidate", () => {
    const only = stubPlace("only", 90);
    expect(pickSurprisePlaceId([row(only)], [], () => 0)).toBe("only");
  });

  it("prefers non-recent places when alternatives exist", () => {
    const recent = stubPlace("recent", 99);
    const fresh = stubPlace("fresh", 40);
    // With only fresh in the effective pool, any random draw yields fresh.
    expect(pickSurprisePlaceId([row(recent), row(fresh)], ["recent"], () => 0.99)).toBe("fresh");
  });

  it("weights toward higher uniqueness within the fresh pool", () => {
    const low = stubPlace("low", 10);
    const high = stubPlace("high", 95);
    const pool = [row(low), row(high)];
    // random near 1 should land in the heavier (high uniqueness) bucket.
    expect(pickSurprisePlaceId(pool, [], () => 0.99)).toBe("high");
  });

  it("falls back to the full pool when every place was recently viewed", () => {
    const a = stubPlace("a", 80);
    const b = stubPlace("b", 20);
    expect(pickSurprisePlaceId([row(a), row(b)], ["a", "b"], () => 0)).toBe("a");
  });
});
