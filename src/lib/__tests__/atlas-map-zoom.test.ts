import { describe, expect, it } from "vitest";
import {
  clampMapTranslation,
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  wheelDeltaConsumable,
  wheelZoomFactor,
  zoomAtScreenPoint,
  zoomAtScreenPointClamped,
} from "../atlas-map-zoom";

describe("zoom bounds", () => {
  it("clamps below MIN_ZOOM to MIN_ZOOM", () => {
    expect(clampZoom(-1)).toBe(MIN_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
  });

  it("clamps above MAX_ZOOM to MAX_ZOOM", () => {
    expect(clampZoom(MAX_ZOOM + 5)).toBe(MAX_ZOOM);
    expect(clampZoom(1000)).toBe(MAX_ZOOM);
  });

  it("passes through values within the allowed range", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
  });
});

describe("wheelZoomFactor", () => {
  it("returns 1 for a non-finite or zero deltaY", () => {
    expect(wheelZoomFactor(0)).toBe(1);
    expect(wheelZoomFactor(NaN)).toBe(1);
    expect(wheelZoomFactor(Infinity)).toBe(1);
  });

  it("a negative deltaY zooms in (factor > 1)", () => {
    expect(wheelZoomFactor(-1, 0)).toBeGreaterThan(1);
    expect(wheelZoomFactor(-1, 0)).toBeLessThan(1.01);
    expect(wheelZoomFactor(-100, 0)).toBeGreaterThan(1.18);
  });

  it("a positive deltaY zooms out (factor < 1)", () => {
    expect(wheelZoomFactor(1, 0)).toBeLessThan(1);
    expect(wheelZoomFactor(100, 0)).toBeLessThan(0.84);
  });

  it("respects deltaMode=1 (LINE) as ~16x pixel multiplier", () => {
    const linePos = wheelZoomFactor(1, 1);
    const pixelPos = wheelZoomFactor(16, 0);
    expect(linePos).toBeCloseTo(pixelPos, 4);
  });

  it("caps very large deltas so a fling does not snap to full bounds", () => {
    expect(wheelZoomFactor(-10_000, 0)).toBeLessThan(1.6);
    expect(wheelZoomFactor(10_000, 0)).toBeGreaterThan(0.62);
  });
});

describe("wheelDeltaConsumable", () => {
  it("is false when factor is 1 or would not change clamped k", () => {
    expect(wheelDeltaConsumable({ k: 2 }, 1)).toBe(false);
    expect(wheelDeltaConsumable({ k: MAX_ZOOM }, 2)).toBe(false);
    expect(wheelDeltaConsumable({ k: MIN_ZOOM }, 0.5)).toBe(false);
  });

  it("is true when the factor can still move k inside the allowed range", () => {
    expect(wheelDeltaConsumable({ k: 2 }, 1.2)).toBe(true);
    expect(wheelDeltaConsumable({ k: MAX_ZOOM }, 0.5)).toBe(true);
    expect(wheelDeltaConsumable({ k: MIN_ZOOM }, 2)).toBe(true);
  });
});

describe("zoomAtScreenPoint", () => {
  it("keeps the anchor point under the cursor after a zoom factor > 1", () => {
    const start = { k: 1, x: 0, y: 0 };
    const anchor = { x: 200, y: 100 };
    const next = zoomAtScreenPoint(start, 2, anchor.x, anchor.y);
    const userBefore = { x: (anchor.x - start.x) / start.k, y: (anchor.y - start.y) / start.k };
    const userAfter = { x: (anchor.x - next.x) / next.k, y: (anchor.y - next.y) / next.k };
    expect(userAfter.x).toBeCloseTo(userBefore.x, 6);
    expect(userAfter.y).toBeCloseTo(userBefore.y, 6);
  });

  it("clamps the resulting zoom to the allowed range", () => {
    const tooFar = zoomAtScreenPoint({ k: MAX_ZOOM, x: 0, y: 0 }, 10, 100, 100);
    expect(tooFar.k).toBe(MAX_ZOOM);
    const tooClose = zoomAtScreenPoint({ k: MIN_ZOOM, x: 0, y: 0 }, 0.001, 100, 100);
    expect(tooClose.k).toBe(MIN_ZOOM);
  });
});

describe("clampMapTranslation", () => {
  const content = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };

  it("pulls content back when panned entirely past the right edge", () => {
    // Content screen x = [1000, 1100] with k=1 — fully right of 800px viewport
    const view = { k: 1, x: 1000, y: 0 };
    const next = clampMapTranslation(view, content, 800, 600, { safeArea, overscrollPx: 40 });
    const left = content.minX * next.k + next.x;
    expect(left).toBeLessThanOrEqual(800 - 40);
  });

  it("pulls content back when panned entirely above the viewport", () => {
    const view = { k: 1, x: 0, y: -500 };
    const next = clampMapTranslation(view, content, 800, 600, { safeArea, overscrollPx: 40 });
    const bottom = content.maxY * next.k + next.y;
    expect(bottom).toBeGreaterThanOrEqual(40);
  });

  it("leaves a centered view unchanged", () => {
    const view = { k: 1, x: 350, y: 250 }; // content [350,450]×[250,350] inside 800×600
    const next = clampMapTranslation(view, content, 800, 600, { safeArea, overscrollPx: 40 });
    expect(next).toEqual(view);
  });

  it("clamps after anchored zoom so the atlas cannot vanish", () => {
    const start = { k: 1, x: 0, y: 0 };
    const zoomed = zoomAtScreenPointClamped(
      start,
      4,
      0,
      0,
      content,
      800,
      600,
      { safeArea, overscrollPx: 40 },
    );
    const left = content.minX * zoomed.k + zoomed.x;
    const right = content.maxX * zoomed.k + zoomed.x;
    const top = content.minY * zoomed.k + zoomed.y;
    const bottom = content.maxY * zoomed.k + zoomed.y;
    expect(right).toBeGreaterThanOrEqual(40);
    expect(left).toBeLessThanOrEqual(800 - 40);
    expect(bottom).toBeGreaterThanOrEqual(40);
    expect(top).toBeLessThanOrEqual(600 - 40);
  });
});
