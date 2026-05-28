// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  applyScaleBar,
  computeScaleBarStep,
  SCALE_BAR_MAX_PX,
  SCALE_KM_STEPS,
  SCALE_MI_STEPS,
  updateScaleBar,
} from "../atlas-map-scale-bar";

describe("computeScaleBarStep — metric", () => {
  it("picks the largest km step that still fits in SCALE_BAR_MAX_PX", () => {
    // kmPerPxAt1 = 50 → at k=1 the bar can show up to 50 * 120 = 6000 km.
    // Largest step ≤ 6000 in SCALE_KM_STEPS is 5000.
    const out = computeScaleBarStep(1, 50, "metric");
    expect(out.stepLabel).toContain("5 × 1,000 km");
    // pxWidth = step / kmPerPx; kmPerPx = 50, step = 5000 → 100 px.
    expect(out.pxWidth).toBe(100);
  });

  it("formats sub-1,000 km steps without the multiplier prefix", () => {
    // kmPerPxAt1 = 1 → at k=1 the bar can show up to 120 km.
    // Largest step ≤ 120 is 100.
    const out = computeScaleBarStep(1, 1, "metric");
    expect(out.stepLabel).toBe("100 km");
  });

  it("falls back to the smallest step (1 km) when no step fits", () => {
    // Comically large zoom: bar can show only a few metres at k=1.
    const out = computeScaleBarStep(100_000, 0.01, "metric");
    expect(out.stepLabel).toBe("1 km");
    expect(SCALE_KM_STEPS).toContain(1);
  });
});

describe("computeScaleBarStep — imperial", () => {
  it("picks the largest mi step that still fits", () => {
    // kmPerPxAt1 = 50 → miPerPxAt1 ≈ 31.07
    // maxMi at k=1 = 31.07 * 120 ≈ 3728 → largest step ≤ 3728 is 3000.
    const out = computeScaleBarStep(1, 50, "imperial");
    expect(out.stepLabel).toContain("3 × 1,000 mi");
    expect(SCALE_MI_STEPS).toContain(3000);
  });
});

describe("applyScaleBar", () => {
  it("writes the label text and bar width to live DOM elements", () => {
    const label = document.createElement("div");
    const bar = document.createElement("div");
    applyScaleBar(label, bar, { stepLabel: "200 km", pxWidth: 64.4 });
    expect(label.textContent).toBe("200 km");
    expect(bar.style.width).toBe("64px"); // rounded
  });

  it("is a no-op when either element is missing", () => {
    expect(() => applyScaleBar(null, document.createElement("div"), {
      stepLabel: "_",
      pxWidth: 1,
    })).not.toThrow();
    expect(() => applyScaleBar(document.createElement("div"), null, {
      stepLabel: "_",
      pxWidth: 1,
    })).not.toThrow();
  });
});

describe("updateScaleBar (compose)", () => {
  it("composes computeScaleBarStep + applyScaleBar end to end", () => {
    const label = document.createElement("div");
    const bar = document.createElement("div");
    updateScaleBar(label, bar, 1, 1, "metric");
    expect(label.textContent).toBe("100 km");
    // With kmPerPx = 1, the 100 km step takes 100 px (under SCALE_BAR_MAX_PX).
    expect(bar.style.width).toBe("100px");
    expect(SCALE_BAR_MAX_PX).toBeGreaterThanOrEqual(100);
  });

  it("safely no-ops on null elements (jsdom won't complain)", () => {
    expect(() => updateScaleBar(null, null, 1, 1, "metric")).not.toThrow();
  });

  it("does not crash when ratio inputs are degenerate", () => {
    const label = document.createElement("div");
    const bar = document.createElement("div");
    // Zero zoom would divide by zero; the helper clamps to a tiny non-zero
    // so the kmPerPx becomes huge and the smallest step wins.
    const before = vi.fn();
    expect(() => { before(); updateScaleBar(label, bar, 0, 50, "metric"); }).not.toThrow();
  });
});
