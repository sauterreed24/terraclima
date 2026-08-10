import { describe, expect, it } from "vitest";
import { defaultRankBadgeOffset, layoutRankBadges } from "../atlas-map-rank-badges";

describe("layoutRankBadges", () => {
  it("keeps the classic NE seat when featured pins are far apart", () => {
    const ne = defaultRankBadgeOffset(7);
    const result = layoutRankBadges(
      [
        { id: "a", screenX: 40, screenY: 40, rank: 1, pinRadiusPx: 7 },
        { id: "b", screenX: 220, screenY: 180, rank: 2, pinRadiusPx: 7 },
      ],
      { proximityPx: 56, minSpacingPx: 20 },
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "a", dx: ne.dx, dy: ne.dy, fanned: false });
    expect(result[1]).toMatchObject({ id: "b", dx: ne.dx, dy: ne.dy, fanned: false });
  });

  it("fans badges apart for a dense highland-style comfort cluster", () => {
    const result = layoutRankBadges(
      [
        { id: "patzcuaro-mx", screenX: 100, screenY: 100, rank: 1, pinRadiusPx: 7.2, crowded: true },
        { id: "patzcuaro-basin", screenX: 112, screenY: 104, rank: 2, pinRadiusPx: 5.4, crowded: true },
        { id: "morelia-mx", screenX: 108, screenY: 118, rank: 3, pinRadiusPx: 5.4, crowded: true },
        { id: "urupan-mx", screenX: 120, screenY: 110, rank: 4, pinRadiusPx: 4.35, crowded: true },
        { id: "tzintzuntzan-mx", screenX: 104, screenY: 112, rank: 5, pinRadiusPx: 4.35, crowded: true },
      ],
      { proximityPx: 56, minSpacingPx: 20 },
    );

    expect(result.every(badge => badge.fanned)).toBe(true);

    const centers = result.map(badge => {
      const pin = [
        { id: "patzcuaro-mx", x: 100, y: 100 },
        { id: "patzcuaro-basin", x: 112, y: 104 },
        { id: "morelia-mx", x: 108, y: 118 },
        { id: "urupan-mx", x: 120, y: 110 },
        { id: "tzintzuntzan-mx", x: 104, y: 112 },
      ].find(row => row.id === badge.id)!;
      return { id: badge.id, x: pin.x + badge.dx, y: pin.y + badge.dy };
    });

    for (let i = 0; i < centers.length; i += 1) {
      for (let j = i + 1; j < centers.length; j += 1) {
        const dist = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
        expect(dist).toBeGreaterThan(16);
      }
    }
  });

  it("is deterministic for the same dense cluster", () => {
    const pins = [
      { id: "alpha", screenX: 50, screenY: 50, rank: 1, pinRadiusPx: 6, crowded: true },
      { id: "beta", screenX: 54, screenY: 52, rank: 2, pinRadiusPx: 6, crowded: true },
      { id: "gamma", screenX: 52, screenY: 56, rank: 3, pinRadiusPx: 6, crowded: true },
    ];
    const first = layoutRankBadges(pins);
    const second = layoutRankBadges(pins);
    expect(second).toEqual(first);
  });
});
