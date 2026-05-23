import type { Topology, GeometryCollection } from "topojson-specification";

export type CountriesTopo = Topology<{
  countries: GeometryCollection<{ name: string }>;
  land: GeometryCollection;
}>;

export type StatesTopo = Topology<{
  states: GeometryCollection<{ name: string }>;
  nation: GeometryCollection;
}>;

export interface AtlasTopology {
  countries: CountriesTopo;
  states: StatesTopo;
}

/**
 * Validate the JSON shape returned by world-atlas / us-atlas before treating
 * it as a typed Topology. This makes dependency drift fail loudly instead of
 * leaving the map border layer silently incomplete.
 */
function assertCountriesTopo(value: unknown): asserts value is CountriesTopo {
  if (!value || typeof value !== "object") throw new Error("countries topo: not an object");
  const objects = (value as { objects?: unknown }).objects;
  if (!objects || typeof objects !== "object") throw new Error("countries topo: missing objects");
  if (!("countries" in objects) || !("land" in objects)) {
    throw new Error("countries topo: expected objects.countries and objects.land");
  }
}

function assertStatesTopo(value: unknown): asserts value is StatesTopo {
  if (!value || typeof value !== "object") throw new Error("states topo: not an object");
  const objects = (value as { objects?: unknown }).objects;
  if (!objects || typeof objects !== "object") throw new Error("states topo: missing objects");
  if (!("states" in objects) || !("nation" in objects)) {
    throw new Error("states topo: expected objects.states and objects.nation");
  }
}

let cachedTopo: AtlasTopology | null = null;
let topoPromise: Promise<AtlasTopology> | null = null;

export function getCachedAtlasTopology(): AtlasTopology | null {
  return cachedTopo;
}

export function loadAtlasTopology(): Promise<AtlasTopology> {
  if (cachedTopo) return Promise.resolve(cachedTopo);
  if (topoPromise) return topoPromise;

  topoPromise = Promise.all([
    import("world-atlas/countries-110m.json"),
    import("us-atlas/states-10m.json"),
  ]).then(([cMod, sMod]) => {
    const cRaw: unknown = (cMod as { default?: unknown }).default ?? cMod;
    const sRaw: unknown = (sMod as { default?: unknown }).default ?? sMod;
    assertCountriesTopo(cRaw);
    assertStatesTopo(sRaw);
    cachedTopo = { countries: cRaw, states: sRaw };
    return cachedTopo;
  }).catch((err: unknown) => {
    topoPromise = null;
    throw err;
  });

  return topoPromise;
}
