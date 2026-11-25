/**
 * Keeps cluster badges legible next to pins that are drawn on their own.
 *
 * Featured (ranked) and selected places are excluded from clustering, so the
 * neighbouring cluster's count never includes them — but its centroid can
 * still land right under the featured glyph, hiding the count. This helper
 * slides the cluster badge (an aggregate with no single true position) just
 * far enough to clear the pin, which keeps its exact geographic seat.
 *
 * Pure and tiny (clusters × pins); runs from a settled-view memo only.
 */

export interface ClusterSeparationCluster {
  id: string;
  /** Centroid in map units. */
  x: number;
  y: number;
  /** Badge radius that must stay uncovered, in screen pixels. */
  r: number;
}

export interface ClusterSeparationPin {
  /** Drawn glyph centre in map units. */
  x: number;
  y: number;
  /** Glyph radius in screen pixels. */
  r: number;
}

export interface ClusterSeparationOptions {
  /** Clear space between a badge and a pin glyph, in screen pixels. */
  gapPx?: number;
  /** A badge never drifts farther than this from its centroid. */
  maxOffsetPx?: number;
  iterations?: number;
}

export interface ClusterSeparationResult {
  /** Display position in map units. */
  x: number;
  y: number;
  /** Screen-pixel distance from the true centroid. */
  offsetPx: number;
}

interface Node {
  id: string;
  ox: number;
  oy: number;
  sx: number;
  sy: number;
  r: number;
}

function clampToOrigin(node: Node, maxOffsetPx: number): void {
  const dx = node.sx - node.ox;
  const dy = node.sy - node.oy;
  const d = Math.hypot(dx, dy);
  if (d <= maxOffsetPx || d === 0) return;
  const s = maxOffsetPx / d;
  node.sx = node.ox + dx * s;
  node.sy = node.oy + dy * s;
}

/**
 * Returns a display position for every cluster that had to move; clusters
 * that are already clear are omitted from the map.
 */
export function separateClustersFromPins(
  clusters: readonly ClusterSeparationCluster[],
  pins: readonly ClusterSeparationPin[],
  k: number,
  opts: ClusterSeparationOptions = {},
): Map<string, ClusterSeparationResult> {
  const out = new Map<string, ClusterSeparationResult>();
  if (clusters.length === 0 || pins.length === 0) return out;
  const zoom = Number.isFinite(k) && k > 0 ? k : 1;
  const gap = opts.gapPx ?? 3;
  const maxOffset = opts.maxOffsetPx ?? 30;
  const iterations = opts.iterations ?? 8;

  const nodes: Node[] = clusters.map(c => ({
    id: c.id, ox: c.x * zoom, oy: c.y * zoom, sx: c.x * zoom, sy: c.y * zoom, r: c.r,
  }));
  const screenPins = pins.map(p => ({ x: p.x * zoom, y: p.y * zoom, r: p.r }));
  // Cluster pairs may already touch before any nudge; never demand more room
  // between two badges than they started with.
  const pairFloor = (a: Node, b: Node) =>
    Math.min(Math.hypot(a.ox - b.ox, a.oy - b.oy), a.r + b.r + 1);

  for (let pass = 0; pass < iterations; pass += 1) {
    let changed = false;
    for (const node of nodes) {
      for (const pin of screenPins) {
        const need = node.r + pin.r + gap;
        let dx = node.sx - pin.x;
        let dy = node.sy - pin.y;
        let dist = Math.hypot(dx, dy);
        if (dist >= need - 0.01) continue;
        if (dist < 0.001) {
          // Coincident: slide down-right, away from the pin's NE rank badge.
          dx = Math.SQRT1_2;
          dy = Math.SQRT1_2;
          dist = 1;
        }
        node.sx = pin.x + (dx / dist) * need;
        node.sy = pin.y + (dy / dist) * need;
        clampToOrigin(node, maxOffset);
        changed = true;
      }
    }
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const need = pairFloor(a, b);
        const dx = b.sx - a.sx;
        const dy = b.sy - a.sy;
        const dist = Math.hypot(dx, dy);
        if (dist >= need - 0.01 || dist < 0.001) continue;
        const push = (need - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        a.sx -= ux * push;
        a.sy -= uy * push;
        b.sx += ux * push;
        b.sy += uy * push;
        clampToOrigin(a, maxOffset);
        clampToOrigin(b, maxOffset);
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const node of nodes) {
    const offsetPx = Math.hypot(node.sx - node.ox, node.sy - node.oy);
    if (offsetPx < 0.25) continue;
    out.set(node.id, { x: node.sx / zoom, y: node.sy / zoom, offsetPx });
  }
  return out;
}
