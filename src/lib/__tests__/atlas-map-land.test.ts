import { describe, expect, it } from "vitest";
import { atlasLandFeatureCollection, loadAtlasTopology } from "../atlas-map-topology";

describe("atlas land fill", () => {
  it("exposes Natural Earth land (with lake holes) from the same topology payload", async () => {
    const topo = await loadAtlasTopology();
    const land = atlasLandFeatureCollection(topo);
    expect(land.type).toBe("FeatureCollection");
    expect(land.features.length).toBeGreaterThan(0);
    const hasInteriorRing = land.features.some(feature => {
      const geom = feature.geometry;
      if (geom.type === "Polygon") return geom.coordinates.length > 1;
      if (geom.type === "MultiPolygon") return geom.coordinates.some(poly => poly.length > 1);
      return false;
    });
    expect(hasInteriorRing).toBe(true);
  });
});
