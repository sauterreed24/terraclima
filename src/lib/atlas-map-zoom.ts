/**
 * Pure zoom math for the atlas map: bounds, clamping, wheel-delta →
 * factor, and pan-stable zoom (zoom anchored on a screen point).
 *
 * Extracted from AtlasMap.tsx so the math has its own unit tests and so
 * the component file stops doubling as a math library.
 */

/**
 * Lowest zoom that still frames every NA pin in `fitMapViewToPoints`.
 * The two extremes must match each other; if you bump these, also bump
 * the fit-bounds defaults in `src/lib/atlas-map-fit.ts` (currently 0.5).
 */
export const MIN_ZOOM = 0.42;
export const MAX_ZOOM = 14;

/** Clamp a candidate zoom factor to the allowed range. */
export function clampZoom(k: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k));
}

/**
 * Map a wheel deltaY (with `deltaMode` taken into account) to a zoom
 * factor centered on 1.0. Trackpad-style small deltas produce tiny
 * increments; old-school mouse-wheel detents (`deltaMode === 1`) get
 * scaled up so each click feels like a real step.
 *
 * Re-exported by `src/components/AtlasMap.tsx` for backwards
 * compatibility with existing tests that import it from there.
 */
export function wheelZoomFactor(deltaY: number, deltaMode = 0): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1;
  const modeMultiplier = deltaMode === 1 ? 16 : deltaMode === 2 ? 480 : 1;
  const pixelDelta = Math.max(-240, Math.min(240, deltaY * modeMultiplier));
  return 2 ** (-pixelDelta / 360);
}

/**
 * Compute the next view after a zoom anchored on a screen point.
 *
 * Given a current view `(k, x, y)` and a zoom factor that targets
 * `nextK = clampZoom(k * factor)`, return the new translation so the
 * `(anchorX, anchorY)` screen-space point stays under the cursor.
 *
 * Used by wheel zoom, double-tap zoom, and any other anchored-zoom code
 * path. Pure: no DOM, no state.
 */
export function zoomAtScreenPoint(
  view: { k: number; x: number; y: number },
  factor: number,
  anchorX: number,
  anchorY: number,
): { k: number; x: number; y: number } {
  const nextK = clampZoom(view.k * factor);
  const f = nextK / view.k;
  return {
    k: nextK,
    x: anchorX - (anchorX - view.x) * f,
    y: anchorY - (anchorY - view.y) * f,
  };
}
