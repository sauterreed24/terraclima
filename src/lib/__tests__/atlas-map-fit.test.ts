import { describe, expect, it } from "vitest";
import {
  atlasSafeAreaForChrome,
  ATLAS_SAFE_AREA_COMPACT,
  ATLAS_SAFE_AREA_DESKTOP,
  contentBBoxFromPoints,
  ensurePointVisible,
  fitMapViewToPoints,
  isPointInSafeFrame,
  mapPointToScreen,
  normalizeSafeArea,
  safeFrameRect,
  viewForViewportResize,
} from "../atlas-map-fit";

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
      { minK: 0, maxK: 1000 },
    );
    expect(v.k).toBeCloseTo(0.84, 6);
  });

  it("floors the inner viewport dimensions at 8px under heavy padding", () => {
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      100, 100, 60,
      { inset: 0, minK: 0, maxK: 8 },
    );
    expectClose(v, { k: 0.8, x: 50 - 0.8 * 5, y: 50 - 0.8 * 5 });
  });

  it("falls back to k=1 when the inset would drive the scale non-positive", () => {
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 1000, y: 1000 }],
      1000, 1000, 0,
      { inset: 0.6, minK: 0.85, maxK: 8 },
    );
    expectClose(v, { k: 1, x: 0, y: 0 });
  });

  it("centers the bbox in the asymmetric safe frame, not the full viewport", () => {
    const safeArea = { top: 100, right: 200, bottom: 50, left: 0 };
    const v = fitMapViewToPoints(
      [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      1000, 800, 0,
      { safeArea, inset: 0, minK: 0, maxK: 1000 },
    );
    // Inner frame: x0=0,y0=100,x1=800,y1=750 → 800×650, center (400, 425)
    expect(v.k).toBeCloseTo(6.5, 6);
    expect(v.x).toBeCloseTo(400 - 6.5 * 50, 6);
    expect(v.y).toBeCloseTo(425 - 6.5 * 50, 6);
  });
});

describe("safe area helpers", () => {
  it("exposes desktop and compact chrome presets", () => {
    expect(atlasSafeAreaForChrome(false)).toEqual(ATLAS_SAFE_AREA_DESKTOP);
    expect(atlasSafeAreaForChrome(true)).toEqual(ATLAS_SAFE_AREA_COMPACT);
  });

  it("clamps safe area so the remaining frame stays at least 8×8", () => {
    const sa = normalizeSafeArea(100, 100, { top: 90, right: 90, bottom: 90, left: 90 }, 0);
    const frame = safeFrameRect(100, 100, sa, 0);
    expect(frame.width).toBeGreaterThanOrEqual(8);
    expect(frame.height).toBeGreaterThanOrEqual(8);
  });
});

describe("isPointInSafeFrame / ensurePointVisible", () => {
  const safeArea = { top: 40, right: 40, bottom: 40, left: 40 };

  it("reports points inside the safe frame", () => {
    const view = { k: 1, x: 0, y: 0 };
    expect(isPointInSafeFrame({ x: 200, y: 200 }, view, 800, 600, safeArea, 0, 0)).toBe(true);
    expect(isPointInSafeFrame({ x: 10, y: 10 }, view, 800, 600, safeArea, 0, 0)).toBe(false);
  });

  it("is a no-op when the point is already safely visible", () => {
    const view = { k: 1, x: 0, y: 0 };
    const next = ensurePointVisible({ x: 200, y: 200 }, view, 800, 600, { safeArea, margin: 24 });
    expect(next).toEqual(view);
  });

  it("pans so an off-frame point enters the safe area without changing k", () => {
    const view = { k: 1, x: 0, y: 0 };
    const next = ensurePointVisible({ x: 10, y: 10 }, view, 800, 600, { safeArea, margin: 24 });
    expect(next.k).toBe(1);
    expect(isPointInSafeFrame({ x: 10, y: 10 }, next, 800, 600, safeArea, 0, 24)).toBe(true);
  });

  it("projects map points through the view transform", () => {
    expect(mapPointToScreen({ x: 10, y: 20 }, { k: 2, x: 5, y: 7 })).toEqual({ x: 25, y: 47 });
  });
});

describe("viewForViewportResize", () => {
  it("preserves map-space center and zoom across a size change", () => {
    const view = { k: 2, x: 100, y: 50 };
    // map center at prev 800×600: ((400-100)/2, (300-50)/2) = (150, 125)
    const next = viewForViewportResize(view, 800, 600, 400, 300);
    expect(next.k).toBe(2);
    const mapCx = (400 / 2 - next.x) / next.k;
    const mapCy = (300 / 2 - next.y) / next.k;
    expect(mapCx).toBeCloseTo(150, 6);
    expect(mapCy).toBeCloseTo(125, 6);
  });

  it("returns the same view when dimensions are unchanged", () => {
    const view = { k: 1.5, x: 10, y: 20 };
    expect(viewForViewportResize(view, 800, 600, 800, 600)).toEqual(view);
  });

  it("preserves the chrome-aware safe-frame center when safe areas change", () => {
    const prevSafe = { top: 0, right: 0, bottom: 0, left: 0 };
    const nextSafe = { top: 100, right: 0, bottom: 0, left: 0 };
    const view = { k: 1, x: 0, y: 0 };
    // Prev safe-frame center is (400, 300). Map point under it is (400, 300).
    // Next safe-frame (0,100)-(800,600) center is (400, 350).
    const next = viewForViewportResize(view, 800, 600, 800, 600, {
      prevSafeArea: prevSafe,
      nextSafeArea: nextSafe,
    });
    expect(next.k).toBe(1);
    expect(next.x).toBeCloseTo(0, 6);
    expect(next.y).toBeCloseTo(50, 6);
  });
});

describe("contentBBoxFromPoints", () => {
  it("returns null for an empty set", () => {
    expect(contentBBoxFromPoints([])).toBeNull();
  });

  it("returns the axis-aligned bbox", () => {
    expect(contentBBoxFromPoints([{ x: 1, y: 5 }, { x: 9, y: 2 }])).toEqual({
      minX: 1, maxX: 9, minY: 2, maxY: 5,
    });
  });
});
