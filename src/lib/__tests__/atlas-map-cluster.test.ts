import { describe, expect, it } from "vitest";
import {
  canClusterSeparateAtZoom,
  clusterMapPoints,
  fitMapViewToCluster,
  type AtlasClusterItem,
  type AtlasClusterPoint,
} from "../atlas-map-cluster";

function clusters(items: ReturnType<typeof clusterMapPoints<AtlasClusterPoint>>) {
  return items.filter((item): item is AtlasClusterItem<AtlasClusterPoint> => item.kind === "cluster");
}

describe("clusterMapPoints", () => {
  it("groups nearby screen-space points when clustering is enabled", () => {
    const items = clusterMapPoints(
      [
        { id: "a", x: 10, y: 10 },
        { id: "b", x: 12, y: 11 },
        { id: "c", x: 120, y: 120 },
      ],
      { enabled: true, view: { k: 1, x: 0, y: 0 }, radiusPx: 16 },
    );

    expect(clusters(items)).toHaveLength(1);
    expect(clusters(items)[0].points.map(p => p.id).sort()).toEqual(["a", "b"]);
    expect(items.some(item => item.kind === "point" && item.id === "c")).toBe(true);
  });

  it("checks adjacent screen buckets without changing seed-radius semantics", () => {
    const items = clusterMapPoints(
      [
        { id: "seed", x: 15.9, y: 10 },
        { id: "near-next-bucket", x: 16.2, y: 10 },
        { id: "near-neighbor-only", x: 32.1, y: 10 },
      ],
      { enabled: true, view: { k: 1, x: 0, y: 0 }, radiusPx: 16 },
    );

    expect(clusters(items)).toHaveLength(1);
    expect(clusters(items)[0].points.map(p => p.id)).toEqual(["seed", "near-next-bucket"]);
    expect(items.some(item => item.kind === "point" && item.id === "near-neighbor-only")).toBe(true);
  });

  it("keeps selected or otherwise protected points out of clusters", () => {
    const items = clusterMapPoints(
      [
        { id: "selected", x: 10, y: 10 },
        { id: "nearby", x: 11, y: 10 },
        { id: "third", x: 12, y: 11 },
      ],
      {
        enabled: true,
        view: { k: 1, x: 0, y: 0 },
        radiusPx: 16,
        protectedIds: new Set(["selected"]),
      },
    );

    expect(items.some(item => item.kind === "point" && item.id === "selected")).toBe(true);
    expect(clusters(items)[0].points.map(p => p.id).sort()).toEqual(["nearby", "third"]);
  });

  it("returns individual points when clustering is disabled", () => {
    const items = clusterMapPoints(
      [
        { id: "a", x: 10, y: 10 },
        { id: "b", x: 11, y: 10 },
      ],
      { enabled: false, view: { k: 1, x: 0, y: 0 }, radiusPx: 16 },
    );

    expect(items.map(item => item.kind)).toEqual(["point", "point"]);
  });
});

describe("cluster zoom helpers", () => {
  const cluster: AtlasClusterItem<AtlasClusterPoint> = {
    kind: "cluster",
    id: "cluster:a|b",
    x: 15,
    y: 10,
    minX: 10,
    maxX: 20,
    minY: 10,
    maxY: 10,
    points: [
      { id: "a", x: 10, y: 10 },
      { id: "b", x: 20, y: 10 },
    ],
  };

  it("fits a cluster inside the viewport and respects zoom bounds", () => {
    const view = fitMapViewToCluster(cluster, 400, 300, { minK: 1.5, maxK: 8, pad: 80 });
    expect(view.k).toBeGreaterThanOrEqual(1.5);
    expect(view.k).toBeLessThanOrEqual(8);
    expect(view.x).toBeTypeOf("number");
    expect(view.y).toBeTypeOf("number");
  });

  it("centers the cluster in an asymmetric safe frame when provided", () => {
    const view = fitMapViewToCluster(cluster, 1000, 800, {
      minK: 0,
      maxK: 1000,
      pad: 0,
      inset: 0,
      safeArea: { top: 100, right: 200, bottom: 50, left: 0 },
    });
    // Frame center is (400, 425); cluster center is (15, 10).
    expect(view.x).toBeCloseTo(400 - view.k * 15, 6);
    expect(view.y).toBeCloseTo(425 - view.k * 10, 6);
  });

  it("detects whether clustered points can visually separate at max zoom", () => {
    expect(canClusterSeparateAtZoom(cluster, 8, 44)).toBe(true);

    const tightCluster = { ...cluster, points: [{ id: "a", x: 10, y: 10 }, { id: "b", x: 11, y: 10 }] };
    expect(canClusterSeparateAtZoom(tightCluster, 8, 44)).toBe(false);
  });
});
