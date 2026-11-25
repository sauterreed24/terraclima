import { describe, expect, it } from "vitest";
import { separateClustersFromPins } from "../atlas-map-cluster-separation";

describe("atlas map cluster separation", () => {
  it("leaves clusters that are already clear of pins untouched", () => {
    const out = separateClustersFromPins(
      [{ id: "c", x: 100, y: 100, r: 13 }],
      [{ x: 160, y: 100, r: 11 }],
      1,
    );
    expect(out.size).toBe(0);
  });

  it("slides a cluster badge out from under a featured pin", () => {
    const out = separateClustersFromPins(
      [{ id: "c", x: 106, y: 104, r: 13 }],
      [{ x: 100, y: 100, r: 11 }],
      1,
      { gapPx: 3 },
    );
    const moved = out.get("c")!;
    expect(Math.hypot(moved.x - 100, moved.y - 100)).toBeCloseTo(27, 3);
    // Moves directly away from the pin, not sideways.
    expect(moved.x).toBeGreaterThan(106);
    expect(moved.y).toBeGreaterThan(104);
    expect(moved.offsetPx).toBeGreaterThan(0);
  });

  it("works in screen pixels at any zoom and reports map-unit positions", () => {
    const out = separateClustersFromPins(
      [{ id: "c", x: 52, y: 50, r: 13 }],
      [{ x: 50, y: 50, r: 11 }],
      2,
      { gapPx: 3 },
    );
    const moved = out.get("c")!;
    expect((moved.x - 50) * 2).toBeCloseTo(27, 3);
    expect(moved.y).toBeCloseTo(50, 6);
  });

  it("never drifts farther than the offset cap", () => {
    const out = separateClustersFromPins(
      [{ id: "c", x: 101, y: 100, r: 20 }],
      [{ x: 100, y: 100, r: 14 }],
      1,
      { maxOffsetPx: 12 },
    );
    expect(out.get("c")!.offsetPx).toBeLessThanOrEqual(12.001);
  });

  it("picks a deterministic direction when pin and centroid coincide", () => {
    const run = () => separateClustersFromPins([{ id: "c", x: 10, y: 10, r: 13 }], [{ x: 10, y: 10, r: 11 }], 1);
    expect(run().get("c")).toEqual(run().get("c"));
    expect(run().get("c")!.y).toBeGreaterThan(10);
  });

  it("does not shove a nudged cluster on top of a neighbouring cluster", () => {
    const out = separateClustersFromPins(
      [
        { id: "a", x: 110, y: 100, r: 13 },
        { id: "b", x: 140, y: 100, r: 13 },
      ],
      [{ x: 100, y: 100, r: 11 }],
      1,
      { gapPx: 3, maxOffsetPx: 40 },
    );
    const a = out.get("a") ?? { x: 110, y: 100 };
    const b = out.get("b") ?? { x: 140, y: 100 };
    expect(Math.hypot(a.x - 100, a.y - 100)).toBeGreaterThanOrEqual(26);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(26);
  });
});
