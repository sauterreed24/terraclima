/**
 * Pure zoom math for the atlas map: bounds, clamping, wheel-delta →
 * factor, and pan-stable zoom (zoom anchored on a screen point).
 *
 * Extracted from AtlasMap.tsx so the math has its own unit tests and so
 * the component file stops doubling as a math library.
 */

import type { MapSafeArea, MapViewState } from "./atlas-map-fit";
import { normalizeSafeArea, safeFrameRect } from "./atlas-map-fit";

/**
 * Lowest zoom that still frames every NA pin in `fitMapViewToPoints`.
 * The two extremes must match each other; if you bump these, also bump
 * the fit-bounds defaults in `src/lib/atlas-map-fit.ts` (currently 0.85).
 */
export const MIN_ZOOM = 0.42;
export const MAX_ZOOM = 14;

/** How much of the content bbox (in screen px) must remain inside the safe frame. */
export const DEFAULT_PAN_OVERSCROLL_PX = 80;

export interface ContentBBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

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
 * True when applying `factor` would actually change `view.k` after clamp.
 * Used for wheel → page-scroll handoff at zoom limits.
 */
export function wheelDeltaConsumable(view: { k: number }, factor: number): boolean {
  if (!Number.isFinite(factor) || factor === 1) return false;
  const nextK = clampZoom(view.k * factor);
  return Math.abs(nextK - view.k) > 1e-9;
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

/**
 * Keep at least `overscrollPx` of the content bounding box inside the safe
 * viewport frame. Prevents the atlas from being panned entirely off-canvas.
 */
export function clampMapTranslation(
  view: MapViewState,
  content: ContentBBox,
  vw: number,
  vh: number,
  opts: {
    safeArea?: MapSafeArea;
    pad?: number;
    overscrollPx?: number;
  } = {},
): MapViewState {
  if (vw < 8 || vh < 8 || view.k <= 0 || !Number.isFinite(view.k)) return view;

  const frame = safeFrameRect(vw, vh, opts.safeArea, opts.pad ?? 0);
  const overscroll = Math.max(0, opts.overscrollPx ?? DEFAULT_PAN_OVERSCROLL_PX);

  const contentLeft = content.minX * view.k + view.x;
  const contentRight = content.maxX * view.k + view.x;
  const contentTop = content.minY * view.k + view.y;
  const contentBottom = content.maxY * view.k + view.y;

  let x = view.x;
  let y = view.y;

  // Content too far left → shift right so right edge reaches frame.x0 + overscroll
  // Content too far right → shift left so left edge reaches frame.x1 - overscroll
  if (contentRight < frame.x0 + overscroll) {
    x += (frame.x0 + overscroll) - contentRight;
  } else if (contentLeft > frame.x1 - overscroll) {
    x -= contentLeft - (frame.x1 - overscroll);
  }

  if (contentBottom < frame.y0 + overscroll) {
    y += (frame.y0 + overscroll) - contentBottom;
  } else if (contentTop > frame.y1 - overscroll) {
    y -= contentTop - (frame.y1 - overscroll);
  }

  return { k: view.k, x, y };
}

/** Anchored zoom followed by translation clamp against content bounds. */
export function zoomAtScreenPointClamped(
  view: MapViewState,
  factor: number,
  anchorX: number,
  anchorY: number,
  content: ContentBBox | null,
  vw: number,
  vh: number,
  clampOpts?: {
    safeArea?: MapSafeArea;
    pad?: number;
    overscrollPx?: number;
  },
): MapViewState {
  const zoomed = zoomAtScreenPoint(view, factor, anchorX, anchorY);
  if (!content) return zoomed;
  return clampMapTranslation(zoomed, content, vw, vh, clampOpts);
}

export function normalizeSafeAreaForZoom(
  vw: number,
  vh: number,
  safeArea: MapSafeArea | undefined,
  pad = 0,
): MapSafeArea {
  return normalizeSafeArea(vw, vh, safeArea, pad);
}
