/**
 * Pan/zoom math for `AtlasMap`: view state `{ k, x, y }` applies
 * `translate(x y) scale(k)` to map-space coordinates (projection output).
 */

export interface MapViewState {
  k: number;
  x: number;
  y: number;
}

export interface FitOptions {
  minK?: number;
  maxK?: number;
  /** Fractional padding inside the viewport (0–0.45). Applied after minK/maxK clamp. */
  inset?: number;
}

/**
 * Choose k, x, y so all points lie inside the viewport with padding,
 * centered on the bounding box. Clamps k to [minK, maxK].
 */
export function fitMapViewToPoints(
  points: readonly { x: number; y: number }[],
  vw: number,
  vh: number,
  pad: number,
  opts: FitOptions = {}
): MapViewState {
  const minK = opts.minK ?? 0.85;
  const maxK = opts.maxK ?? 8;
  const inset = opts.inset ?? 0.08;

  if (points.length === 0 || vw < 48 || vh < 48) {
    return { k: 1, x: 0, y: 0 };
  }

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

  const dx = maxX - minX;
  const dy = maxY - minY;
  const eps = 1e-4;
  const innerW = Math.max(8, vw - 2 * pad);
  const innerH = Math.max(8, vh - 2 * pad);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Single point or near-collision: zoom in on the area instead of exploding k.
  if (dx < eps && dy < eps) {
    const k = Math.min(maxK, 2.85);
    return {
      k,
      x: vw / 2 - k * minX,
      y: vh / 2 - k * minY,
    };
  }

  const kUnbounded = Math.min(
    dx > eps ? innerW / dx : maxK,
    dy > eps ? innerH / dy : maxK
  );
  let k = kUnbounded * (1 - inset * 2);
  if (!Number.isFinite(k) || k <= 0) k = 1;
  k = Math.max(minK, Math.min(maxK, k));

  return {
    k,
    x: vw / 2 - k * cx,
    y: vh / 2 - k * cy,
  };
}
