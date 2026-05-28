import { describe, expect, it } from "vitest";
import {
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  wheelZoomFactor,
  zoomAtScreenPoint,
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

describe("zoomAtScreenPoint", () => {
  it("keeps the anchor point under the cursor after a zoom factor > 1", () => {
    const start = { k: 1, x: 0, y: 0 };
    const anchor = { x: 200, y: 100 };
    const next = zoomAtScreenPoint(start, 2, anchor.x, anchor.y);
    // The screen position of the anchor point (in svg-user units) should be
    // unchanged: anchor_user = (anchor_screen - tx) / k.
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
