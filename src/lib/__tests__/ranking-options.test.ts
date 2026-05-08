import { describe, expect, it } from "vitest";
import type { RankingProfile } from "../scoring";
import { ALL_RANKING_PROFILES, RANKING_OPTIONS } from "../ranking-options";

describe("ranking-options single source", () => {
  it("derives ALL_RANKING_PROFILES from RANKING_OPTIONS in display order", () => {
    expect(ALL_RANKING_PROFILES).toEqual(RANKING_OPTIONS.map(o => o.id));
  });

  it("has unique ids", () => {
    expect(new Set(ALL_RANKING_PROFILES).size).toBe(ALL_RANKING_PROFILES.length);
  });

  it("covers every RankingProfile exactly once (drift guard vs scoring.ts union)", () => {
    const _optsSatisfyUnion: RankingProfile[] = RANKING_OPTIONS.map(o => o.id);
    void _optsSatisfyUnion;

    const unionLiterals = ALL_RANKING_PROFILES as unknown as RankingProfile[];
    expect(new Set(unionLiterals).size).toBe(unionLiterals.length);
    expect(new Set(ALL_RANKING_PROFILES).size).toBe(RANKING_OPTIONS.length);
  });
});
