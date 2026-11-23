/**
 * Collision-aware placement for the atlas map's background lettering
 * (country names, oceans, seas). Pins and cluster badges always win: a
 * background label slides to the first clear candidate offset, tightens its
 * setting, and only then either accepts a small, budgeted overlap (country
 * names) or steps aside entirely — it is never mostly hidden under badges.
 *
 * Pure and cheap (labels × candidates × obstacles, all tiny) — it runs from a
 * memo keyed on the settled view, never per gesture frame.
 */

/** A pin or cluster badge: centre in map units, radius in screen pixels. */
export interface MapLabelObstacle {
  x: number;
  y: number;
  r: number;
  /**
   * Radius of the opaque part (badge disc / pin glyph) in screen pixels, when
   * smaller than `r` (which may include a translucent halo and breathing
   * room). Only this part counts as hiding lettering for `maxCover`.
   */
  solidR?: number;
}

export interface MapLabelRequest {
  id: string;
  /** Anchor (label centre) in map units. */
  x: number;
  y: number;
  /** Half extents of the lettering in screen pixels. */
  halfW: number;
  halfH: number;
  /**
   * Candidate offsets from the anchor in screen pixels, in preference order.
   * The first entry should normally be `[0, 0]`.
   */
  candidates: readonly (readonly [number, number])[];
  /**
   * Half width of a tighter setting of the same lettering (less tracking /
   * one size tier down). Tried on every candidate before giving up on a
   * clear seat.
   */
  compactHalfW?: number;
  /**
   * Largest share of the label's length (0–1) that pins may cover. When no
   * clear seat exists the least-covered candidate is kept if it stays within
   * this budget — partly covered but readable beats absent. Omit to hide.
   */
  maxCover?: number;
}

export interface MapLabelPlacement {
  /** Chosen offset from the anchor, in screen pixels. */
  dx: number;
  dy: number;
  /**
   * False when every candidate collided. Unless `cover` is set the caller
   * should hide the label.
   */
  clear: boolean;
  /** True when the tighter `compactHalfW` setting was needed. */
  compact?: boolean;
  /**
   * Set only for a partly covered seat: the share of the label's length that
   * sits under pins. The caller should draw it dimmed, behind the pins.
   */
  cover?: number;
}

interface ScreenRect {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

function circleHitsRect(ox: number, oy: number, r: number, rect: ScreenRect): boolean {
  const dx = Math.max(0, Math.abs(ox - rect.cx) - rect.halfW);
  const dy = Math.max(0, Math.abs(oy - rect.cy) - rect.halfH);
  return dx * dx + dy * dy < r * r;
}

function rectsOverlap(a: ScreenRect, b: ScreenRect): boolean {
  return Math.abs(a.cx - b.cx) < a.halfW + b.halfW && Math.abs(a.cy - b.cy) < a.halfH + b.halfH;
}

/** Rough advance width of tracked lettering, in pixels. */
export function estimateMapLabelWidth(text: string, fontSize: number, trackingEm: number, glyphEm = 0.6): number {
  return text.length * fontSize * (glyphEm + trackingEm);
}

/**
 * Share (0–1) of a label's length hidden by obstacles: the union of the
 * horizontal spans of every badge that reaches the lettering's band.
 */
export function mapLabelCoverFraction(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  obstacles: readonly { x: number; y: number; r: number }[],
): number {
  if (!(halfW > 0)) return 1;
  const left = cx - halfW;
  const right = cx + halfW;
  const spans: [number, number][] = [];
  for (const o of obstacles) {
    if (Math.abs(o.y - cy) >= halfH + o.r) continue;
    const a = Math.max(left, o.x - o.r);
    const b = Math.min(right, o.x + o.r);
    if (b > a) spans.push([a, b]);
  }
  if (spans.length === 0) return 0;
  spans.sort((p, q) => p[0] - q[0]);
  let covered = 0;
  let [curA, curB] = spans[0]!;
  for (let i = 1; i < spans.length; i += 1) {
    const [a, b] = spans[i]!;
    if (a > curB) {
      covered += curB - curA;
      curA = a;
      curB = b;
    } else if (b > curB) {
      curB = b;
    }
  }
  covered += curB - curA;
  return Math.min(1, covered / (right - left));
}

/**
 * Place labels in request order (earlier requests have priority and become
 * obstacles for later ones). `k` is the map zoom: map units × k = pixels.
 *
 * Each label tries, in order: a clear seat at full width, a clear seat at its
 * compact width, then (only with `maxCover`) the least-covered seat.
 */
export function placeMapLabels(
  requests: readonly MapLabelRequest[],
  obstacles: readonly MapLabelObstacle[],
  k: number,
  pad = 4,
): Map<string, MapLabelPlacement> {
  const out = new Map<string, MapLabelPlacement>();
  const placed: ScreenRect[] = [];
  const zoom = Number.isFinite(k) && k > 0 ? k : 1;
  const screenObstacles = obstacles.map(o => ({ x: o.x * zoom, y: o.y * zoom, r: o.r }));
  const solidObstacles = obstacles.map(o => ({ x: o.x * zoom, y: o.y * zoom, r: Math.min(o.r, o.solidR ?? o.r) }));
  for (const req of requests) {
    const widths: { halfW: number; compact: boolean }[] = [];
    if (Number.isFinite(req.halfW)) widths.push({ halfW: req.halfW, compact: false });
    if (req.compactHalfW != null && Number.isFinite(req.compactHalfW) && req.compactHalfW < req.halfW) {
      widths.push({ halfW: req.compactHalfW, compact: true });
    }
    if (widths.length === 0 || !Number.isFinite(req.halfH)) {
      out.set(req.id, { dx: 0, dy: 0, clear: false });
      continue;
    }
    const ax = req.x * zoom;
    const ay = req.y * zoom;
    let chosen: MapLabelPlacement | null = null;
    let chosenRect: ScreenRect | null = null;
    for (const width of widths) {
      for (const [dx, dy] of req.candidates) {
        const rect: ScreenRect = { cx: ax + dx, cy: ay + dy, halfW: width.halfW + pad, halfH: req.halfH + pad };
        if (screenObstacles.some(o => circleHitsRect(o.x, o.y, o.r, rect))) continue;
        if (placed.some(other => rectsOverlap(rect, other))) continue;
        chosen = width.compact ? { dx, dy, clear: true, compact: true } : { dx, dy, clear: true };
        chosenRect = rect;
        break;
      }
      if (chosen) break;
    }
    if (!chosen && req.maxCover != null && req.maxCover > 0) {
      const width = widths[widths.length - 1]!;
      // Least covered wins, with a mild pull toward earlier (preferred)
      // candidates so the name does not wander for a marginal gain.
      let bestScore = Number.POSITIVE_INFINITY;
      const total = Math.max(1, req.candidates.length);
      req.candidates.forEach(([dx, dy], index) => {
        const rect: ScreenRect = { cx: ax + dx, cy: ay + dy, halfW: width.halfW + pad, halfH: req.halfH + pad };
        if (placed.some(other => rectsOverlap(rect, other))) return;
        const cover = mapLabelCoverFraction(rect.cx, rect.cy, width.halfW, req.halfH, solidObstacles);
        if (cover > req.maxCover!) return;
        const score = cover + (index / total) * 0.12;
        if (score < bestScore - 1e-9) {
          bestScore = score;
          chosen = { dx, dy, clear: false, cover, ...(width.compact ? { compact: true } : {}) };
          chosenRect = rect;
        }
      });
    }
    if (chosen && chosenRect) {
      placed.push(chosenRect);
      out.set(req.id, chosen);
    } else {
      out.set(req.id, { dx: 0, dy: 0, clear: false });
    }
  }
  return out;
}
