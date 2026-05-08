import type { MapViewState } from "./atlas-map-fit";

export interface AtlasPinLayoutPoint {
  id: string;
  x: number;
  y: number;
  priority?: number;
  locked?: boolean;
}

export interface AtlasPinLayoutOptions {
  enabled: boolean;
  view: MapViewState;
  minSpacingPx: number;
  maxOffsetPx: number;
  iterations?: number;
  leaderThresholdPx?: number;
}

export interface AtlasPinLayoutItem<T extends AtlasPinLayoutPoint> {
  id: string;
  point: T;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  anchorScreenX: number;
  anchorScreenY: number;
  screenX: number;
  screenY: number;
  offsetPx: number;
  needsLeader: boolean;
  crowded: boolean;
}

export interface AtlasPinLayoutResult<T extends AtlasPinLayoutPoint> {
  pins: AtlasPinLayoutItem<T>[];
  crowdedIds: string[];
}

interface LayoutNode<T extends AtlasPinLayoutPoint> {
  point: T;
  anchorScreenX: number;
  anchorScreenY: number;
  screenX: number;
  screenY: number;
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicUnitVector(a: string, b: string): { x: number; y: number } {
  const h = hashString(a < b ? `${a}|${b}` : `${b}|${a}`);
  const angle = ((h % 3600) / 3600) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function mobility(point: AtlasPinLayoutPoint): number {
  if (point.locked) return 0;
  return 1 / (1 + Math.max(0, point.priority ?? 0));
}

function clampToAnchor<T extends AtlasPinLayoutPoint>(node: LayoutNode<T>, maxOffsetPx: number): void {
  const dx = node.screenX - node.anchorScreenX;
  const dy = node.screenY - node.anchorScreenY;
  const d = Math.hypot(dx, dy);
  if (d <= maxOffsetPx || d === 0) return;
  const s = maxOffsetPx / d;
  node.screenX = node.anchorScreenX + dx * s;
  node.screenY = node.anchorScreenY + dy * s;
}

function screenDistance(a: { screenX: number; screenY: number }, b: { screenX: number; screenY: number }): number {
  return Math.hypot(a.screenX - b.screenX, a.screenY - b.screenY);
}

export function layoutAtlasMapPins<T extends AtlasPinLayoutPoint>(
  points: readonly T[],
  opts: AtlasPinLayoutOptions,
): AtlasPinLayoutResult<T> {
  const leaderThresholdPx = opts.leaderThresholdPx ?? 4;
  const nodes: LayoutNode<T>[] = points.map(point => ({
    point,
    anchorScreenX: point.x * opts.view.k + opts.view.x,
    anchorScreenY: point.y * opts.view.k + opts.view.y,
    screenX: point.x * opts.view.k + opts.view.x,
    screenY: point.y * opts.view.k + opts.view.y,
  }));

  if (opts.enabled && nodes.length > 1 && opts.minSpacingPx > 0 && opts.maxOffsetPx > 0) {
    const iterations = opts.iterations ?? 10;
    const minSpacing = opts.minSpacingPx;

    for (let pass = 0; pass < iterations; pass += 1) {
      let changed = false;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.screenX - a.screenX;
          let dy = b.screenY - a.screenY;
          let dist = Math.hypot(dx, dy);
          if (dist >= minSpacing) continue;

          if (dist < 0.001) {
            const unit = deterministicUnitVector(a.point.id, b.point.id);
            dx = unit.x;
            dy = unit.y;
            dist = 1;
          }

          const ma = mobility(a.point);
          const mb = mobility(b.point);
          const totalMobility = ma + mb;
          if (totalMobility === 0) continue;

          const push = (minSpacing - dist) / totalMobility;
          const ux = dx / dist;
          const uy = dy / dist;

          if (ma > 0) {
            a.screenX -= ux * push * ma;
            a.screenY -= uy * push * ma;
            clampToAnchor(a, opts.maxOffsetPx);
            changed = true;
          }
          if (mb > 0) {
            b.screenX += ux * push * mb;
            b.screenY += uy * push * mb;
            clampToAnchor(b, opts.maxOffsetPx);
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
  }

  const crowdedIds = new Set<string>();
  const crowdedThreshold = Math.max(4, opts.minSpacingPx * 0.82);
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (screenDistance(nodes[i], nodes[j]) < crowdedThreshold) {
        crowdedIds.add(nodes[i].point.id);
        crowdedIds.add(nodes[j].point.id);
      }
    }
  }

  const safeK = opts.view.k === 0 ? 1 : opts.view.k;
  return {
    crowdedIds: [...crowdedIds].sort(),
    pins: nodes.map(node => {
      const dx = node.screenX - node.anchorScreenX;
      const dy = node.screenY - node.anchorScreenY;
      const offsetPx = Math.hypot(dx, dy);
      const crowded = crowdedIds.has(node.point.id);
      return {
        id: node.point.id,
        point: node.point,
        anchorX: node.point.x,
        anchorY: node.point.y,
        x: (node.screenX - opts.view.x) / safeK,
        y: (node.screenY - opts.view.y) / safeK,
        anchorScreenX: node.anchorScreenX,
        anchorScreenY: node.anchorScreenY,
        screenX: node.screenX,
        screenY: node.screenY,
        offsetPx,
        needsLeader: offsetPx >= leaderThresholdPx,
        crowded,
      };
    }),
  };
}
