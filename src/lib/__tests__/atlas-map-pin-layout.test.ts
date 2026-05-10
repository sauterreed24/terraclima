import { describe, expect, it } from "vitest";
import { layoutAtlasMapPins, type AtlasPinLayoutPoint } from "../atlas-map-pin-layout";

const view = { k: 2, x: 10, y: -6 };

function byId(points: ReturnType<typeof layoutAtlasMapPins<AtlasPinLayoutPoint>>["pins"], id: string) {
  const point = points.find(p => p.id === id);
  if (!point) throw new Error(`missing ${id}`);
  return point;
}

describe("layoutAtlasMapPins", () => {
  it("keeps anchors exact while moving rendered pins apart in screen space", () => {
    const result = layoutAtlasMapPins(
      [
        { id: "a", x: 10, y: 10 },
        { id: "b", x: 11, y: 10 },
      ],
      { enabled: true, view, minSpacingPx: 36, maxOffsetPx: 24, iterations: 12, leaderThresholdPx: 1 },
    );

    const a = byId(result.pins, "a");
    const b = byId(result.pins, "b");
    expect(a.anchorX).toBe(10);
    expect(a.anchorY).toBe(10);
    expect(b.anchorX).toBe(11);
    expect(b.anchorY).toBe(10);
    expect(Math.hypot(a.screenX - b.screenX, a.screenY - b.screenY)).toBeGreaterThan(30);
    expect(a.needsLeader || b.needsLeader).toBe(true);
  });

  it("bounds visual displacement so geography is not falsified", () => {
    const result = layoutAtlasMapPins(
      [
        { id: "a", x: 20, y: 20 },
        { id: "b", x: 20, y: 20 },
        { id: "c", x: 20, y: 20 },
      ],
      { enabled: true, view, minSpacingPx: 60, maxOffsetPx: 10, iterations: 16 },
    );

    for (const pin of result.pins) {
      expect(pin.offsetPx).toBeLessThanOrEqual(10.000001);
    }
    expect(result.crowdedIds).toEqual(["a", "b", "c"]);
  });

  it("keeps locked pins anchored and moves lower-priority neighbors around them", () => {
    const result = layoutAtlasMapPins(
      [
        { id: "selected", x: 50, y: 50, locked: true, priority: 100 },
        { id: "nearby", x: 50.5, y: 50, priority: 1 },
      ],
      { enabled: true, view, minSpacingPx: 34, maxOffsetPx: 24, iterations: 10 },
    );

    const selected = byId(result.pins, "selected");
    const nearby = byId(result.pins, "nearby");
    expect(selected.offsetPx).toBe(0);
    expect(nearby.offsetPx).toBeGreaterThan(0);
  });

  it("is deterministic for exact-coordinate collisions", () => {
    const points = [
      { id: "alpha", x: 5, y: 5 },
      { id: "beta", x: 5, y: 5 },
    ];
    const opts = { enabled: true, view, minSpacingPx: 32, maxOffsetPx: 18, iterations: 12 };
    const first = layoutAtlasMapPins(points, opts).pins;
    const second = layoutAtlasMapPins(points, opts).pins;

    expect(second.map(pin => [pin.id, pin.x, pin.y])).toEqual(first.map(pin => [pin.id, pin.x, pin.y]));
  });
});
