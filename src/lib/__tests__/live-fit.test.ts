import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import { LIVE_FIT_PRESETS, assessLiveFit, liveFitFilterPass, rankLiveFit, type LiveFitPresetId } from "../live-fit";
import { makeClimate, makePlace } from "./test-fixtures";
import type { Monthly12 } from "../../types";

describe("live-fit scoring", () => {
  it("keeps presets unique and stable for URL serialization", () => {
    const ids = LIVE_FIT_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("cool-summers");
    expect(ids).toContain("sunny-winters");
    expect(ids).toContain("quiet-small-town");
  });

  it("returns bounded scores with human-readable reasons and cautions", () => {
    const place = makePlace({
      scores: { hiddenGem: 84, microclimateUniqueness: 82, comfort: 76, resilience: 74, growability: 78, tradeoff: 70 },
      settlementsWithinZone: [{ name: "Test Town", role: "town", population: "~12,000", note: "A compact valley anchor." }],
      risks: {
        ...makePlace().risks,
        wildfire: { level: "high" },
      },
    });
    const fit = assessLiveFit(place, { fitPresets: new Set(["gardenable", "quiet-small-town"]) });
    expect(fit.score).toBeGreaterThanOrEqual(0);
    expect(fit.score).toBeLessThanOrEqual(100);
    expect(fit.reasons.length).toBeGreaterThanOrEqual(2);
    expect(fit.reasons.length).toBeLessThanOrEqual(3);
    expect(fit.cautions.length).toBeGreaterThanOrEqual(1);
    expect(fit.cautions.length).toBeLessThanOrEqual(3);
    expect(fit.badges).toContain("Hidden");
  });

  it("hard-filters places outside explicit live-here constraints", () => {
    const cool = makePlace({
      id: "cool",
      climate: makeClimate({ tempHighC: [5, 7, 10, 14, 18, 20, 21, 20, 17, 12, 8, 5] as Monthly12 }),
      risks: { ...makePlace().risks, wildfire: { level: "low" } },
    });
    const hot = makePlace({
      id: "hot",
      climate: makeClimate({ tempHighC: [12, 15, 20, 25, 31, 36, 38, 37, 32, 25, 18, 13] as Monthly12 }),
      risks: { ...makePlace().risks, wildfire: { level: "high" } },
    });
    const filters = { maxSummerHighC: 24, maxFireRisk: "moderate" as const };
    expect(liveFitFilterPass(cool, filters)).toBe(true);
    expect(liveFitFilterPass(hot, filters)).toBe(false);
  });

  it("uses measured winter sunshine for the sunny-winters preset and fails closed when missing", () => {
    const bright = makePlace({
      id: "bright-winter-sun",
      climate: makeClimate({
        sunshinePct: [82, 80, 74, 68, 65, 64, 63, 64, 68, 72, 78, 84] as Monthly12,
      }),
    });
    const gray = makePlace({
      id: "gray-winter-sun",
      climate: makeClimate({
        sunshinePct: [34, 36, 45, 52, 58, 62, 66, 65, 58, 48, 38, 32] as Monthly12,
      }),
    });
    const missing = makePlace({
      id: "missing-winter-sun",
      climate: makeClimate({ sunshinePct: undefined }),
    });

    const filters = { fitPresets: new Set<LiveFitPresetId>(["sunny-winters"]) };

    expect(liveFitFilterPass(bright, filters)).toBe(true);
    expect(liveFitFilterPass(gray, filters)).toBe(false);
    expect(liveFitFilterPass(missing, filters)).toBe(false);
    expect(assessLiveFit(bright, filters).reasons).toContain("Sunny winters match (86/100).");
  });

  it("ranks the same filtered pool by live-fit assessment", () => {
    const gardenTown = makePlace({
      id: "garden-town",
      scores: { hiddenGem: 80, microclimateUniqueness: 75, comfort: 78, resilience: 76, growability: 86, tradeoff: 32 },
      growability: { ...makePlace().growability, score: 86 },
    });
    const dryRock = makePlace({
      id: "dry-rock",
      scores: { hiddenGem: 60, microclimateUniqueness: 65, comfort: 56, resilience: 58, growability: 42, tradeoff: 45 },
      growability: { ...makePlace().growability, score: 42 },
    });
    const ranked = rankLiveFit([dryRock, gardenTown], { fitPresets: new Set(["gardenable"]) });
    expect(ranked[0].place.id).toBe("garden-town");
    expect(ranked[0].note).toContain("live-here fit");
  });

  it("keeps tied live-fit results stable regardless of input order", () => {
    const alpha = makePlace({ id: "alpha-ridge", name: "Alpha Ridge" });
    const zulu = makePlace({ id: "zulu-ridge", name: "Zulu Ridge" });

    expect(assessLiveFit(alpha).score).toBe(assessLiveFit(zulu).score);
    expect(rankLiveFit([zulu, alpha]).map(result => result.place.id)).toEqual(["alpha-ridge", "zulu-ridge"]);
    expect(rankLiveFit([alpha, zulu]).map(result => result.place.id)).toEqual(["alpha-ridge", "zulu-ridge"]);
  });

  it("returns defensive copies from the cached live-fit assessment", () => {
    const place = makePlace({ id: "cache-copy", name: "Cache Copy" });
    const first = assessLiveFit(place);
    first.reasons.push("mutated reason");
    first.cautions.push("mutated caution");
    first.badges.push("mutated badge");

    const second = assessLiveFit(place);

    expect(second.reasons).not.toContain("mutated reason");
    expect(second.cautions).not.toContain("mutated caution");
    expect(second.badges).not.toContain("mutated badge");
  });

  it("surfaces a caution when lived-reality coverage is missing", () => {
    const unrated = makePlace({ id: "unrated-live-reality", liveSignals: undefined });
    const fit = assessLiveFit(unrated);
    expect(fit.cautions.some(c => c.includes("Lived-reality signals are not source-backed yet"))).toBe(true);
  });

  it("keeps missing lived-reality coverage visible even when other cautions are saturated", () => {
    const saturated = makePlace({
      id: "risk-saturated-unrated-live-reality",
      liveSignals: undefined,
      scores: { ...makePlace().scores, tradeoff: 72 },
      risks: {
        ...makePlace().risks,
        wildfire: { level: "high" },
        smoke: { level: "elevated" },
      },
    });
    const fit = assessLiveFit(saturated);
    expect(fit.cautions.length).toBeLessThanOrEqual(3);
    expect(fit.cautions.some(c => c.includes("Lived-reality signals are not source-backed yet"))).toBe(true);
  });

  it("rewards a longer livable season when peak-season temperatures tie", () => {
    const longSeason = makePlace({
      id: "long-season",
      climate: makeClimate({
        tempHighC: [22,22,22,22,22,22,22,22,22,22,22,22] as Monthly12,
        tempLowC: [12,12,12,12,12,12,12,12,12,12,12,12] as Monthly12,
        precipMm: [45,45,45,45,45,45,45,45,45,45,45,45] as Monthly12,
        snowCm: [0,0,0,0,0,0,0,0,0,0,0,0] as Monthly12,
      }),
    });
    const narrowSeason = makePlace({
      id: "narrow-season",
      climate: makeClimate({
        tempHighC: [22,22,2,6,10,22,22,22,10,6,2,22] as Monthly12,
        tempLowC: [12,12,-10,-6,0,12,12,12,0,-6,-10,12] as Monthly12,
        precipMm: [45,45,45,45,45,45,45,45,45,45,45,45] as Monthly12,
        snowCm: [0,0,8,4,0,0,0,0,0,4,8,0] as Monthly12,
      }),
    });

    const ranked = rankLiveFit([narrowSeason, longSeason]);

    expect(ranked[0].place.id).toBe("long-season");
    expect(assessLiveFit(longSeason).badges).toContain("Long season");
  });

  it("ranks dry highland comfort anchors ahead of fog, extreme heat, and Alaska anchors", () => {
    const silverCity = PLACES_BY_ID["silver-city-nm"]!;
    const saltillo = PLACES_BY_ID["saltillo-mx"]!;
    const eureka = PLACES_BY_ID["eureka-ca"]!;
    const deathValley = PLACES_BY_ID["death-valley-ca"]!;
    const fairbanks = PLACES_BY_ID["fairbanks-ak"]!;

    const silver = assessLiveFit(silverCity).score;
    const salt = assessLiveFit(saltillo).score;
    const fog = assessLiveFit(eureka).score;
    const heat = assessLiveFit(deathValley).score;
    const arctic = assessLiveFit(fairbanks).score;

    expect(silver).toBeGreaterThan(fog);
    expect(salt).toBeGreaterThan(fog);
    expect(silver).toBeGreaterThan(heat);
    expect(salt).toBeGreaterThan(heat);
    expect(silver).toBeGreaterThan(arctic);
    expect(salt).toBeGreaterThan(arctic);
    expect(fog).toBeGreaterThan(heat);
  });
});
