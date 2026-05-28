/**
 * Imperative scale-bar renderer for the atlas map.
 *
 * The scale bar lives in the map chrome and updates on every pan/zoom.
 * Rather than re-render React on each view change, we take DOM refs and
 * mutate `textContent` / `style.width` directly. This keeps the scale
 * bar perfectly in sync with zoom without forcing a render through the
 * (memoised but still measurable) component tree.
 *
 * Extracted from AtlasMap.tsx so the step ladders + math are
 * unit-testable and so the component file stops embedding tiny lookup
 * tables.
 */
import type { DistUnit } from "./units";

/** Nice round metric distances for the bar. Picked so the bar stays
 *  inside ~120px at the current zoom; the step ladder is ordered
 *  descending so we pick the largest that still fits. */
export const SCALE_KM_STEPS = [
  5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1,
] as const;

/** Nice round imperial distances, sized to roughly match the metric
 *  steps so the rendered bar width stays comparable across unit modes. */
export const SCALE_MI_STEPS = [
  3000, 1500, 500, 250, 100, 50, 20, 10, 5, 2, 1,
] as const;

/** Maximum pixel width the scale bar is allowed to occupy. */
export const SCALE_BAR_MAX_PX = 120;

/**
 * Compute the scale-bar step and pixel width for the current zoom.
 *
 * Pure: takes zoom (k), the km-per-pixel scale at k=1, and the unit
 * preference; returns the chosen step and the bar's pixel width plus
 * the rendered label. Mutating the DOM is left to the caller.
 */
export function computeScaleBarStep(
  zoom: number,
  kmPerPxAt1: number,
  dist: DistUnit,
): { stepLabel: string; pxWidth: number } {
  const kmPerPx = kmPerPxAt1 / Math.max(1e-6, zoom);
  if (dist === "metric") {
    const maxKm = kmPerPx * SCALE_BAR_MAX_PX;
    const step = SCALE_KM_STEPS.find(s => s <= maxKm) ?? 1;
    const pxWidth = step / kmPerPx;
    const stepLabel = step >= 1000
      ? `${(step / 1000).toLocaleString()} × 1,000 km`
      : `${step.toLocaleString()} km`;
    return { stepLabel, pxWidth };
  }
  const miPerPx = kmPerPx * 0.621371;
  const maxMi = miPerPx * SCALE_BAR_MAX_PX;
  const step = SCALE_MI_STEPS.find(s => s <= maxMi) ?? 1;
  const pxWidth = step / miPerPx;
  const stepLabel = step >= 1000
    ? `${(step / 1000).toLocaleString()} × 1,000 mi`
    : `${step.toLocaleString()} mi`;
  return { stepLabel, pxWidth };
}

/**
 * Mutate the label + bar elements in place from a precomputed step. Kept
 * separate so React-free unit tests can hit `computeScaleBarStep` without
 * needing a DOM, while the imperative writer remains a one-liner inside
 * the component.
 */
export function applyScaleBar(
  labelEl: HTMLDivElement | null,
  barEl: HTMLDivElement | null,
  step: { stepLabel: string; pxWidth: number },
): void {
  if (!labelEl || !barEl) return;
  barEl.style.width = `${Math.round(step.pxWidth)}px`;
  labelEl.textContent = step.stepLabel;
}

/**
 * Convenience wrapper that combines `computeScaleBarStep` + `applyScaleBar`
 * — matches the legacy `updateScaleBar` signature from AtlasMap.tsx.
 */
export function updateScaleBar(
  labelEl: HTMLDivElement | null,
  barEl: HTMLDivElement | null,
  zoom: number,
  kmPerPxAt1: number,
  dist: DistUnit,
): void {
  applyScaleBar(labelEl, barEl, computeScaleBarStep(zoom, kmPerPxAt1, dist));
}
