/**
 * Pan/zoom math for `AtlasMap`: view state `{ k, x, y }` applies
 * `translate(x y) scale(k)` to map-space coordinates (projection output).
 */

export interface MapViewState {
  k: number;
  x: number;
  y: number;
}

/** Asymmetric chrome insets (px) reserved for caption, controls, scale, readout. */
export interface MapSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FitOptions {
  minK?: number;
  maxK?: number;
  /** Fractional padding inside the viewport (0–0.45). Applied after minK/maxK clamp. */
  inset?: number;
  /**
   * Chrome-aware insets. When set, overrides the symmetric `pad` argument for
   * the inner frame. Values are clamped so the remaining frame stays ≥ 8×8.
   */
  safeArea?: MapSafeArea;
}

export const ATLAS_SAFE_AREA_DESKTOP: MapSafeArea = {
  top: 72,
  right: 56,
  bottom: 96,
  left: 56,
};

export const ATLAS_SAFE_AREA_COMPACT: MapSafeArea = {
  top: 64,
  right: 56,
  bottom: 72,
  left: 48,
};

export function atlasSafeAreaForChrome(compact: boolean): MapSafeArea {
  return compact ? ATLAS_SAFE_AREA_COMPACT : ATLAS_SAFE_AREA_DESKTOP;
}

export function normalizeSafeArea(
  vw: number,
  vh: number,
  safeArea: MapSafeArea | undefined,
  symmetricPad: number,
): MapSafeArea {
  const raw: MapSafeArea = safeArea ?? {
    top: symmetricPad,
    right: symmetricPad,
    bottom: symmetricPad,
    left: symmetricPad,
  };
  const maxHorizontal = Math.max(0, (vw - 8) / 2);
  const maxVertical = Math.max(0, (vh - 8) / 2);
  return {
    top: Math.max(0, Math.min(raw.top, maxVertical)),
    right: Math.max(0, Math.min(raw.right, maxHorizontal)),
    bottom: Math.max(0, Math.min(raw.bottom, maxVertical)),
    left: Math.max(0, Math.min(raw.left, maxHorizontal)),
  };
}

export function safeFrameRect(
  vw: number,
  vh: number,
  safeArea: MapSafeArea | undefined,
  symmetricPad = 0,
): { x0: number; y0: number; x1: number; y1: number; width: number; height: number } {
  const sa = normalizeSafeArea(vw, vh, safeArea, symmetricPad);
  const x0 = sa.left;
  const y0 = sa.top;
  const x1 = vw - sa.right;
  const y1 = vh - sa.bottom;
  return {
    x0,
    y0,
    x1,
    y1,
    width: Math.max(8, x1 - x0),
    height: Math.max(8, y1 - y0),
  };
}

function pointsBBox(points: readonly { x: number; y: number }[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  cx: number;
  cy: number;
  dx: number;
  dy: number;
} | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    dx: maxX - minX,
    dy: maxY - minY,
  };
}

/**
 * Choose k, x, y so all points lie inside the viewport with padding,
 * centered on the bounding box. Clamps k to [minK, maxK].
 *
 * Prefer `opts.safeArea` for chrome-aware framing; otherwise `pad` is applied
 * symmetrically on all sides (legacy callers).
 */
export function fitMapViewToPoints(
  points: readonly { x: number; y: number }[],
  vw: number,
  vh: number,
  pad: number,
  opts: FitOptions = {},
): MapViewState {
  const minK = opts.minK ?? 0.85;
  const maxK = opts.maxK ?? 8;
  const inset = opts.inset ?? 0.08;

  if (points.length === 0 || vw < 48 || vh < 48) {
    return { k: 1, x: 0, y: 0 };
  }

  const bbox = pointsBBox(points);
  if (!bbox) return { k: 1, x: 0, y: 0 };

  const frame = safeFrameRect(vw, vh, opts.safeArea, pad);
  const innerW = frame.width;
  const innerH = frame.height;
  const frameCx = frame.x0 + innerW / 2;
  const frameCy = frame.y0 + innerH / 2;

  const eps = 1e-4;

  // Single point or near-collision: zoom in on the area instead of exploding k.
  if (bbox.dx < eps && bbox.dy < eps) {
    const k = Math.min(maxK, 2.85);
    return {
      k,
      x: frameCx - k * bbox.minX,
      y: frameCy - k * bbox.minY,
    };
  }

  const kUnbounded = Math.min(
    bbox.dx > eps ? innerW / bbox.dx : maxK,
    bbox.dy > eps ? innerH / bbox.dy : maxK,
  );
  let k = kUnbounded * (1 - inset * 2);
  if (!Number.isFinite(k) || k <= 0) k = 1;
  k = Math.max(minK, Math.min(maxK, k));

  return {
    k,
    x: frameCx - k * bbox.cx,
    y: frameCy - k * bbox.cy,
  };
}

/** Screen-space projection of a map-space point under the current view. */
export function mapPointToScreen(
  point: { x: number; y: number },
  view: MapViewState,
): { x: number; y: number } {
  return {
    x: point.x * view.k + view.x,
    y: point.y * view.k + view.y,
  };
}

export function isPointInSafeFrame(
  point: { x: number; y: number },
  view: MapViewState,
  vw: number,
  vh: number,
  safeArea: MapSafeArea | undefined,
  symmetricPad = 0,
  /** Extra inset inside the safe frame before a point counts as "safely visible". */
  margin = 0,
): boolean {
  const frame = safeFrameRect(vw, vh, safeArea, symmetricPad);
  const screen = mapPointToScreen(point, view);
  return (
    screen.x >= frame.x0 + margin
    && screen.x <= frame.x1 - margin
    && screen.y >= frame.y0 + margin
    && screen.y <= frame.y1 - margin
  );
}

/**
 * Nudge pan (and only if needed a modest zoom) so `point` lies inside the
 * safe frame. Returns the current view unchanged when already safely visible.
 */
export function ensurePointVisible(
  point: { x: number; y: number },
  view: MapViewState,
  vw: number,
  vh: number,
  opts: {
    safeArea?: MapSafeArea;
    pad?: number;
    margin?: number;
    minK?: number;
    maxK?: number;
  } = {},
): MapViewState {
  const pad = opts.pad ?? 0;
  const margin = opts.margin ?? 24;
  if (isPointInSafeFrame(point, view, vw, vh, opts.safeArea, pad, margin)) {
    return view;
  }

  const frame = safeFrameRect(vw, vh, opts.safeArea, pad);
  const screen = mapPointToScreen(point, view);
  let next: MapViewState = { ...view };

  const minX = frame.x0 + margin;
  const maxX = frame.x1 - margin;
  const minY = frame.y0 + margin;
  const maxY = frame.y1 - margin;

  if (screen.x < minX) next = { ...next, x: next.x + (minX - screen.x) };
  else if (screen.x > maxX) next = { ...next, x: next.x - (screen.x - maxX) };
  if (screen.y < minY) next = { ...next, y: next.y + (minY - screen.y) };
  else if (screen.y > maxY) next = { ...next, y: next.y - (screen.y - maxY) };

  // If still outside (safe frame smaller than margin*2), fall back to centering.
  if (!isPointInSafeFrame(point, next, vw, vh, opts.safeArea, pad, Math.min(margin, 8))) {
    const frameCx = frame.x0 + frame.width / 2;
    const frameCy = frame.y0 + frame.height / 2;
    next = {
      k: next.k,
      x: frameCx - next.k * point.x,
      y: frameCy - next.k * point.y,
    };
  }

  return next;
}

/**
 * Preserve map-space center and zoom across a viewport size change, then
 * recompute translation so the same geographic center stays in the new frame.
 *
 * When safe areas are provided, the preserved center is the chrome-aware
 * safe-frame center (not the raw container midpoint).
 */
export function viewForViewportResize(
  view: MapViewState,
  prevVw: number,
  prevVh: number,
  nextVw: number,
  nextVh: number,
  opts: {
    prevSafeArea?: MapSafeArea;
    nextSafeArea?: MapSafeArea;
    pad?: number;
  } = {},
): MapViewState {
  if (prevVw < 1 || prevVh < 1 || nextVw < 1 || nextVh < 1) return view;
  if (
    prevVw === nextVw
    && prevVh === nextVh
    && !opts.prevSafeArea
    && !opts.nextSafeArea
  ) {
    return view;
  }

  const pad = opts.pad ?? 0;
  const prevFrame = safeFrameRect(prevVw, prevVh, opts.prevSafeArea, pad);
  const nextFrame = safeFrameRect(nextVw, nextVh, opts.nextSafeArea, pad);
  const prevCx = prevFrame.x0 + prevFrame.width / 2;
  const prevCy = prevFrame.y0 + prevFrame.height / 2;
  const nextCx = nextFrame.x0 + nextFrame.width / 2;
  const nextCy = nextFrame.y0 + nextFrame.height / 2;

  const mapCx = (prevCx - view.x) / view.k;
  const mapCy = (prevCy - view.y) / view.k;
  return {
    k: view.k,
    x: nextCx - view.k * mapCx,
    y: nextCy - view.k * mapCy,
  };
}

export function contentBBoxFromPoints(
  points: readonly { x: number; y: number }[],
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const bbox = pointsBBox(points);
  if (!bbox) return null;
  return { minX: bbox.minX, maxX: bbox.maxX, minY: bbox.minY, maxY: bbox.maxY };
}
