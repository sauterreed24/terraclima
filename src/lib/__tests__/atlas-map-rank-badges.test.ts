import { describe, expect, it } from "vitest";
import { defaultRankBadgeOffset, layoutRankBadges } from "../atlas-map-rank-badges";

describe("layoutRankBadges", () => {
  it("keeps the classic NE seat when featured pins are far apart", () => {
    const ne = defaultRankBadgeOffset(7.2);
    const result = layoutRankBadges([
      { id: "west", screenX: 40, screenY: 80, rank: 1, pinRadiusPx: 7.2 },
      { id: "east", screenX: 420, screenY: 90, rank: 2, pinRadiusPx: 5.4 },
    ]);

    expect(result).toHaveLength(2);
    expect(result.every(badge => badge.fanned === false)).toBe(true);
    expect(result.find(badge => badge.id === "west")).toMatchObject(ne);
  });

  it("fans nearby highland-style leaders off the shared NE seat", () => {
    const result = layoutRankBadges(
      [
        { id: "patzcuaro-mx", screenX: 200, screenY: 180, rank: 1, pinRadiusPx: 7.2 },
        { id: "morelia-mx", screenX: 208, screenY: 186, rank: 2, pinRadiusPx: 7.2 },
        { id: "patzcuaro-lake-mx", screenX: 204, screenY: 184, rank: 3, pinRadiusPx: 5.4 },
      ],
      { minSpacingPx: 20, proximityPx: 56 },
    );

    expect(result.every(badge => badge.fanned)).toBe(true);
    const seats = result.map(badge => ({ id: badge.id, dx: badge.dx, dy: badge.dy }));
    for (let i = 0; i < seats.length; i += 1) {
      for (let j = i + 1; j < seats.length; j += 1) {
        const a = result[i]!;
        const b = result[j]!;
        const dist = Math.hypot(
          (200 + a.dx) - (200 + b.dx),
          (180 + a.dy) - (180 + b.dy),
        );
        expect(dist).toBeGreaterThan(12);
      }
    }
  });

  it("fans a crowded solo pin so the badge clears the glyph cloud", () => {
    const ne = defaultRankBadgeOffset(5.4);
    const result = layoutRankBadges([
      { id: "crowded", screenX: 100, screenY: 100, rank: 1, pinRadiusPx: 5.4, crowded: true },
    ]);
    expect(result).toEqual([
      expect.objectContaining({ id: "crowded", fanned: true }),
    ]);
    expect(result[0]!.dx !== ne.dx || result[0]!.dy !== ne.dy).toBe(true);
  });

  it("is deterministic for the same dense cluster", () => {
    const pins = [
      { id: "alpha", screenX: 50, screenY: 50, rank: 1, pinRadiusPx: 7.2, crowded: true },
      { id: "beta", screenX: 54, screenY: 52, rank: 2, pinRadiusPx: 5.4, crowded: true },
      { id: "gamma", screenX: 51, screenY: 56, rank: 3, pinRadiusPx: 4.35 },
    ];
    const first = layoutRankBadges(pins);
    const second = layoutRankBadges(pins);
    expect(second).toEqual(first);
  });
});
