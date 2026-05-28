// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// Mock both world-atlas and us-atlas before the module is imported so the
// dynamic import inside loadAtlasTopology resolves to a synthetic shape we
// control. We deliberately use minimal valid topology objects (with the
// `objects.{countries,land,states,nation}` shape the assert helpers check)
// so we don't ship real topojson into the test bundle.
vi.mock("world-atlas/countries-110m.json", () => ({
  default: {
    type: "Topology",
    objects: { countries: { type: "GeometryCollection", geometries: [] }, land: { type: "GeometryCollection", geometries: [] } },
    arcs: [],
    transform: { scale: [1, 1], translate: [0, 0] },
  },
}));
vi.mock("us-atlas/states-10m.json", () => ({
  default: {
    type: "Topology",
    objects: { states: { type: "GeometryCollection", geometries: [] }, nation: { type: "GeometryCollection", geometries: [] } },
    arcs: [],
    transform: { scale: [1, 1], translate: [0, 0] },
  },
}));

describe("atlas-map-topology", () => {
  it("loadAtlasTopology resolves and caches a valid shape", async () => {
    const { loadAtlasTopology, getCachedAtlasTopology } = await import("../atlas-map-topology");
    expect(getCachedAtlasTopology()).toBeNull();
    const topo = await loadAtlasTopology();
    expect(topo.countries).toBeDefined();
    expect(topo.states).toBeDefined();
    // Second call returns the cached instance (object identity).
    const cached = getCachedAtlasTopology();
    expect(cached).toBe(topo);
    const second = await loadAtlasTopology();
    expect(second).toBe(topo);
  });
});
