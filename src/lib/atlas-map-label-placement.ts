/**
 * Collision-aware placement for the atlas map's background lettering
 * (country names, oceans, seas). Pins and cluster badges always win: a
 * background label either slides to the first clear candidate offset or
 * steps aside entirely, so it is never half-hidden under a badge.
 *
 * Pure and cheap (labels × candidates × obstacles, all tiny) — it runs from a
 * memo keyed on the settled view, never per gesture frame.
 */

/** A pin or cluster badge: centre in map units, radius in screen pixels. */
export interface MapLabelObstacle {
  x: number;
  y: number;
  r: number;
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
}

export interface MapLabelPlacement {
  /** Chosen offset from the anchor, in screen pixels. */
  dx: number;
  dy: number;
  /** False when every candidate collided; the caller should hide the label. */
  clear: boolean;
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
 * Place labels in request order (earlier requests have priority and become
 * obstacles for later ones). `k` is the map zoom: map units × k = pixels.
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
  for (const req of requests) {
    if (!Number.isFinite(req.halfW) || !Number.isFinite(req.halfH)) {
      out.set(req.id, { dx: 0, dy: 0, clear: false });
      continue;
    }
    const ax = req.x * zoom;
    const ay = req.y * zoom;
    let chosen: MapLabelPlacement | null = null;
    let chosenRect: ScreenRect | null = null;
    for (const [dx, dy] of req.candidates) {
      const rect: ScreenRect = { cx: ax + dx, cy: ay + dy, halfW: req.halfW + pad, halfH: req.halfH + pad };
      let blocked = false;
      for (const o of obstacles) {
        if (circleHitsRect(o.x * zoom, o.y * zoom, o.r, rect)) { blocked = true; break; }
      }
      if (!blocked) {
        for (const other of placed) {
          if (rectsOverlap(rect, other)) { blocked = true; break; }
        }
      }
      if (!blocked) {
        chosen = { dx, dy, clear: true };
        chosenRect = rect;
        break;
      }
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
