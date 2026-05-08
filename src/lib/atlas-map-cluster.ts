import { fitMapViewToPoints, type MapViewState } from "./atlas-map-fit";

export interface AtlasClusterPoint {
  id: string;
  x: number;
  y: number;
}

export interface AtlasPointItem<T extends AtlasClusterPoint> {
  kind: "point";
  id: string;
  point: T;
}

export interface AtlasClusterItem<T extends AtlasClusterPoint> {
  kind: "cluster";
  id: string;
  x: number;
  y: number;
  points: T[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type AtlasRenderItem<T extends AtlasClusterPoint> =
  | AtlasPointItem<T>
  | AtlasClusterItem<T>;

export interface ClusterMapPointsOptions {
  enabled: boolean;
  view: MapViewState;
  radiusPx: number;
  protectedIds?: ReadonlySet<string>;
}

function screenDistanceSq(a: { sx: number; sy: number }, b: { sx: number; sy: number }): number {
  const dx = a.sx - b.sx;
  const dy = a.sy - b.sy;
  return dx * dx + dy * dy;
}

function clusterId(points: readonly AtlasClusterPoint[]): string {
  return `cluster:${points.map(p => p.id).sort().join("|")}`;
}

export function clusterMapPoints<T extends AtlasClusterPoint>(
  points: readonly T[],
  opts: ClusterMapPointsOptions,
): AtlasRenderItem<T>[] {
  if (!opts.enabled || points.length < 2) {
    return points.map(point => ({ kind: "point", id: point.id, point }));
  }

  const protectedIds = opts.protectedIds ?? new Set<string>();
  const radiusSq = opts.radiusPx * opts.radiusPx;
  const projected = points.map((point, index) => ({
    point,
    index,
    sx: point.x * opts.view.k + opts.view.x,
    sy: point.y * opts.view.k + opts.view.y,
    protected: protectedIds.has(point.id),
  }));

  const used = new Set<number>();
  const out: AtlasRenderItem<T>[] = [];

  for (const seed of projected) {
    if (used.has(seed.index)) continue;
    used.add(seed.index);

    if (seed.protected) {
      out.push({ kind: "point", id: seed.point.id, point: seed.point });
      continue;
    }

    const group = [seed];
    for (const candidate of projected) {
      if (used.has(candidate.index) || candidate.protected) continue;
      if (screenDistanceSq(seed, candidate) <= radiusSq) {
        used.add(candidate.index);
        group.push(candidate);
      }
    }

    if (group.length === 1) {
      out.push({ kind: "point", id: seed.point.id, point: seed.point });
      continue;
    }

    let sumX = 0;
    let sumY = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const clusterPoints = group.map(g => {
      const p = g.point;
      sumX += p.x;
      sumY += p.y;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      return p;
    });

    out.push({
      kind: "cluster",
      id: clusterId(clusterPoints),
      x: sumX / clusterPoints.length,
      y: sumY / clusterPoints.length,
      points: clusterPoints,
      minX,
      maxX,
      minY,
      maxY,
    });
  }

  return out;
}

export function fitMapViewToCluster<T extends AtlasClusterPoint>(
  cluster: AtlasClusterItem<T>,
  width: number,
  height: number,
  opts: { minK: number; maxK: number; pad?: number; inset?: number },
): MapViewState {
  return fitMapViewToPoints(
    cluster.points.map(p => ({ x: p.x, y: p.y })),
    width,
    height,
    opts.pad ?? 72,
    { minK: opts.minK, maxK: opts.maxK, inset: opts.inset ?? 0.08 },
  );
}

export function canClusterSeparateAtZoom<T extends AtlasClusterPoint>(
  cluster: AtlasClusterItem<T>,
  zoom: number,
  minScreenDistancePx: number,
): boolean {
  if (cluster.points.length < 2) return true;
  let minDistSq = Infinity;
  for (let i = 0; i < cluster.points.length; i += 1) {
    for (let j = i + 1; j < cluster.points.length; j += 1) {
      const dx = (cluster.points[i].x - cluster.points[j].x) * zoom;
      const dy = (cluster.points[i].y - cluster.points[j].y) * zoom;
      minDistSq = Math.min(minDistSq, dx * dx + dy * dy);
    }
  }
  return minDistSq >= minScreenDistancePx * minScreenDistancePx;
}
