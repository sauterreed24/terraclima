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
  /**
   * Smaller or re-shaped settings of the same lettering (one size down, a
   * two-line stack…), in preference order, for maps too small for the
   * compact one. Tried only after the full and compact settings found
   * neither a clear nor a budgeted seat, so roomy maps never shrink a name:
   * first every fallback for a clear seat, then every one within `maxCover`.
   */
  fallbacks?: readonly MapLabelFallback[];
  /**
   * Last resort, looser than `maxCover`: when no setting has a seat within
   * budget, keep the least-covered seat of any fallback (or, without
   * fallbacks, of the narrowest setting) up to this share and flag it
   * `underlay` — the caller draws it faint, as a watermark the pins sit on,
   * rather than dropping the name from the map.
   */
  underlayMaxCover?: number;
}

export interface MapLabelFallback {
  /** Echoed back as `MapLabelPlacement.variant` so the caller can draw it. */
  variant: string;
  /** Half extents of this setting in screen pixels (`halfH` defaults to the request's). */
  halfW: number;
  halfH?: number;
  /** Own candidate offsets (a smaller setting can slide further); defaults to the request's. */
  candidates?: readonly (readonly [number, number])[];
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
  /** Set when one of the request's `fallbacks` was needed. */
  variant?: string;
  /** True for a last-resort seat beyond `maxCover` (see `underlayMaxCover`). */
  underlay?: boolean;
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
 * compact width, then (only with `maxCover`) the least-covered seat. A label
 * with `fallbacks` then repeats clear / least-covered over those settings,
 * and one with `underlayMaxCover` finally settles for a faint underlay seat.
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
    const fallbacks = (req.fallbacks ?? []).filter(f => Number.isFinite(f.halfW) && f.halfW > 0);
    if ((widths.length === 0 && fallbacks.length === 0) || !Number.isFinite(req.halfH)) {
      out.set(req.id, { dx: 0, dy: 0, clear: false });
      continue;
    }
    const ax = req.x * zoom;
    const ay = req.y * zoom;
    const pick: { seat: MapLabelPlacement | null; rect: ScreenRect | null } = { seat: null, rect: null };
    const seatRect = (dx: number, dy: number, halfW: number, halfH: number): ScreenRect => (
      { cx: ax + dx, cy: ay + dy, halfW: halfW + pad, halfH: halfH + pad }
    );
    type Seats = readonly (readonly [number, number])[];
    const tryClear = (halfW: number, halfH: number, flags: Partial<MapLabelPlacement>, seats: Seats = req.candidates) => {
      for (const [dx, dy] of seats) {
        const rect = seatRect(dx, dy, halfW, halfH);
        if (screenObstacles.some(o => circleHitsRect(o.x, o.y, o.r, rect))) continue;
        if (placed.some(other => rectsOverlap(rect, other))) continue;
        pick.seat = { dx, dy, clear: true, ...flags };
        pick.rect = rect;
        return;
      }
    };
    // Least covered wins, with a mild pull toward earlier (preferred)
    // candidates so the name does not wander for a marginal gain.
    let bestScore = Number.POSITIVE_INFINITY;
    const tryCovered = (
      halfW: number, halfH: number, budget: number, flags: Partial<MapLabelPlacement>, seats: Seats = req.candidates,
    ) => {
      const total = Math.max(1, seats.length);
      seats.forEach(([dx, dy], index) => {
        const rect = seatRect(dx, dy, halfW, halfH);
        if (placed.some(other => rectsOverlap(rect, other))) return;
        const cover = mapLabelCoverFraction(rect.cx, rect.cy, halfW, halfH, solidObstacles);
        if (cover > budget) return;
        const score = cover + (index / total) * 0.12;
        if (score < bestScore - 1e-9) {
          bestScore = score;
          pick.seat = { dx, dy, clear: false, cover, ...flags };
          pick.rect = rect;
        }
      });
    };
    for (const width of widths) {
      tryClear(width.halfW, req.halfH, width.compact ? { compact: true } : {});
      if (pick.seat) break;
    }
    const budget = req.maxCover != null && req.maxCover > 0 ? req.maxCover : 0;
    const last = widths[widths.length - 1];
    const lastFlags: Partial<MapLabelPlacement> = last?.compact ? { compact: true } : {};
    if (!pick.seat && last && budget > 0) tryCovered(last.halfW, req.halfH, budget, lastFlags);
    for (const f of fallbacks) {
      if (!pick.seat) tryClear(f.halfW, f.halfH ?? req.halfH, { variant: f.variant }, f.candidates);
    }
    if (budget > 0) {
      for (const f of fallbacks) {
        if (!pick.seat) tryCovered(f.halfW, f.halfH ?? req.halfH, budget, { variant: f.variant }, f.candidates);
      }
    }
    if (!pick.seat && req.underlayMaxCover != null && req.underlayMaxCover > budget) {
      // Shared best score: the least-covered seat across every fallback wins.
      for (const f of fallbacks) {
        tryCovered(f.halfW, f.halfH ?? req.halfH, req.underlayMaxCover, { variant: f.variant, underlay: true }, f.candidates);
      }
      if (fallbacks.length === 0 && last) tryCovered(last.halfW, req.halfH, req.underlayMaxCover, { ...lastFlags, underlay: true });
    }
    if (pick.seat && pick.rect) {
      placed.push(pick.rect);
      out.set(req.id, pick.seat);
    } else {
      out.set(req.id, { dx: 0, dy: 0, clear: false });
    }
  }
  return out;
}
