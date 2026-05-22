import { describe, expect, it } from "vitest";
import { fitMapViewToPoints } from "../atlas-map-fit";

const IDENTITY = { k: 1, x: 0, y: 0 };

function expectClose(got: { k: number; x: number; y: number }, want: { k: number; x: number; y: number }): void {
  expect(got.k).toBeCloseTo(want.k, 6);
  expect(got.x).toBeCloseTo(want.x, 6);
  expect(got.y).toBeCloseTo(want.y, 6);
}

describe("fitMapViewToPoints", () => {
  it("returns identity when there are no points", () => {
    expect(fitMapViewToPoints([], 800, 600, 20)).toEqual(IDENTITY);
  });

  it("returns identity when the viewport is too small in either dimension", () => {
    expect(fitMapViewToPoints([{ x: 100, y: 50 }], 40, 600, 0)).toEqual(IDENTITY);
    expect(fitMapViewToPoints([{ x: 100, y: 50 }], 600, 40, 0)).toEqual(IDENTITY);
  });

  it("zooms in on a single point at a fixed scale instead of exploding k", () => {
    // dx === dy === 0 takes the near-collision branch: k = min(maxK, 2.85),
    // centered with x = vw/2 - k*minX.
    expectClose(fitMapViewToPoints([{ x: 100, y: 50 }], 800, 600, 20), {
      k: 2.85,
      x: 400 - 2.85 * 100,
      y: 300 - 2.85 * 50,
    });
  });

  it("clamps the single-point scale to a tighter maxK", () => {
    expectClose(fitMapViewToPoints([{ x: 0, y: 0 }], 800, 600, 0, { maxK: 2 }), {
      k: 2,
      x: 400,
      y: 300,
    });
  });

  it("treats a near-collision (sub-epsilon span) like a single point", () => {
    expectClose(fitMapViewToPoints([{ x: 10, y: 10 }, { x: 10.000001, y: 10.000001 }], 800, 600, 0), {
      k: 2.85,
      x: 400 - 2.85 * 10,
      y: 300 - 2.85 * 10,
    });
  });

  it("picks the smaller scale when the bounding box is width-dominated", () => {
    // innerW/dx (1) < innerH/dy (100) -> width constraint wins.
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 1000, y: 10 }],
      1000, 1000, 0,
      { inset: 0, minK: 0, maxK: 1000 },
    );
    expectClose(v, { k: 1, x: 0, y: 500 - 1 * 5 });
  });

  it("picks the smaller scale when the bounding box is height-dominated", () => {
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 10, y: 1000 }],
      1000, 1000, 0,
      { inset: 0, minK: 0, maxK: 1000 },
    );
    expectClose(v, { k: 1, x: 500 - 1 * 5, y: 0 });
  });

  it("clamps a tiny bounding box up against maxK", () => {
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      800, 600, 0,
      { inset: 0, minK: 0.85, maxK: 8 },
    );
    expectClose(v, { k: 8, x: 400 - 8 * 0.5, y: 300 - 8 * 0.5 });
  });

  it("clamps a huge bounding box down against minK", () => {
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 100_000, y: 100_000 }],
      800, 600, 0,
      { inset: 0, minK: 0.85, maxK: 8 },
    );
    expectClose(v, { k: 0.85, x: 400 - 0.85 * 50_000, y: 300 - 0.85 * 50_000 });
  });

  it("shrinks the scale by the inset factor (1 - inset*2)", () => {
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 1000, y: 1000 }],
      1000, 1000, 0,
      { minK: 0, maxK: 1000 }, // default inset 0.08 -> factor 0.84
    );
    expect(v.k).toBeCloseTo(0.84, 6);
  });

  it("floors the inner viewport dimensions at 8px under heavy padding", () => {
    // vw/vh stay >= 48 (so the guard passes) but vw - 2*pad goes negative;
    // innerW/innerH are floored at 8, so k = 8/10 = 0.8 rather than negative.
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      100, 100, 60,
      { inset: 0, minK: 0, maxK: 8 },
    );
    expectClose(v, { k: 0.8, x: 50 - 0.8 * 5, y: 50 - 0.8 * 5 });
  });

  it("falls back to k=1 when the inset would drive the scale non-positive", () => {
    // inset 0.6 -> factor (1 - 1.2) = -0.2 -> k <= 0 -> reset to 1, then clamp.
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 1000, y: 1000 }],
      1000, 1000, 0,
      { inset: 0.6, minK: 0.85, maxK: 8 },
    );
    expectClose(v, { k: 1, x: 0, y: 0 });
  });
});
