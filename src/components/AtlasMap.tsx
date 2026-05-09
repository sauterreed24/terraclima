import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoPath, geoAlbers } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { useUnits } from "../lib/units";
import type { DistUnit } from "../lib/units";
import { useRichVisualEffects } from "../lib/device-profile";
import { fitMapViewToPoints } from "../lib/atlas-map-fit";
import {
  canClusterSeparateAtZoom,
  clusterMapPoints,
  fitMapViewToCluster,
  type AtlasClusterItem,
} from "../lib/atlas-map-cluster";
import { layoutAtlasMapPins } from "../lib/atlas-map-pin-layout";
import { placeMapSecondaryLine, truncateMapTitle } from "../lib/atlas-map-label";
import { computePinLabelModes, type MapPinLabelMode } from "../lib/atlas-map-label-visibility";
import {
  ATLAS_DEFAULT_TOUCH_MODE,
  atlasTouchActionForMode,
  resolveAtlasMapInteractive,
  type AtlasTouchMode,
} from "../lib/atlas-map-touch-gesture";
import { useMediaQuery } from "../hooks/use-media-query";
import { AtlasMapTooltip } from "./AtlasMapTooltip";
import { CLIMATE_NORMALS_PERIOD } from "../lib/atlas-metadata";

// Topojson atlas data lives in the `atlas-data` Rollup chunk (~74 kB gz).
// Loading it eagerly would block first paint even though the UI shell
// (ocean, projection math, markers, legend, scale bar, compass) is perfectly
// happy to render without it. Instead we dynamically import both datasets on
// mount — the map appears instantly with markers on a warm ocean, and the
// country / state polygons fade in one frame after the chunk arrives.
type CountriesTopo = Topology<{
  countries: GeometryCollection<{ name: string }>;
  land: GeometryCollection;
}>;
type StatesTopo = Topology<{
  states: GeometryCollection<{ name: string }>;
  nation: GeometryCollection;
}>;

/**
 * Validate the JSON shape returned by world-atlas / us-atlas before treating
 * it as a typed Topology. Replaces a previous `as unknown as` double-cast that
 * silently trusted the import. Throws clearly if the on-disk shape ever drifts
 * (e.g. a future package version changes the object names).
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

// Module-level cache so navigating away and back doesn't re-download.
let cachedTopo: { countries: CountriesTopo; states: StatesTopo } | null = null;
let topoPromise: Promise<{ countries: CountriesTopo; states: StatesTopo }> | null = null;

function loadTopo(): Promise<{ countries: CountriesTopo; states: StatesTopo }> {
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
  });
  return topoPromise;
}

interface Props {
  places: Place[];
  selectedId?: string;
  onSelect: (id: string) => void;
  width?: number;
  height?: number;
}

/** Allow zooming out enough to frame every pin across NA; must match `fitMapViewToPoints` bounds. */
const MIN_ZOOM = 0.42;
const MAX_ZOOM = 14;
const MOBILE_CLUSTER_RADIUS_PX = 48;
const MOBILE_CLUSTER_LABEL_ZOOM_CUTOFF = 1.65;
const MOBILE_PIN_MIN_SPACING_PX = 42;
const DESKTOP_PIN_MIN_SPACING_PX = 28;
const MOBILE_PIN_MAX_OFFSET_PX = 34;
const DESKTOP_PIN_MAX_OFFSET_PX = 20;

type ClusterPoint = { place: Place; x: number; y: number; id: string };
type RenderedClusterPoint = ClusterPoint & {
  anchorX: number;
  anchorY: number;
  offsetPx: number;
  needsLeader: boolean;
  crowded: boolean;
};

/** Microclimate driver legend — lives on the dark map chrome with high-contrast labels. */
function MapLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-[rgba(255,255,255,0.45)]"
        style={{ background: color }}
        aria-hidden
      />
      <span className="font-medium text-[rgba(245,250,255,0.98)] [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">{label}</span>
    </span>
  );
}

function clampZoom(k: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k));
}

function pinLayoutPriority(place: Place, selectedId: string | undefined, hoverId: string | null): number {
  if (place.id === selectedId) return 100;
  if (place.id === hoverId) return 90;
  const tierPriority = place.tier === "A" ? 8 : place.tier === "B" ? 4 : 1;
  return tierPriority + Math.max(0, 2 - place.name.length / 24);
}

function svgPointFromClient(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * width,
    y: ((clientY - rect.top) / rect.height) * height,
  };
}

function firstTwoPointers(map: Map<number, { clientX: number; clientY: number }>) {
  const arr = [...map.values()];
  if (arr.length < 2) return null;
  return [arr[0], arr[1]] as const;
}

function pointerDistance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

type TouchPointLike = { clientX: number; clientY: number };
type TouchListLike = { length: number; item(index: number): TouchPointLike | null };

function touchPair(touches: TouchListLike): readonly [TouchPointLike, TouchPointLike] | null {
  if (touches.length < 2) return null;
  const a = touches.item(0);
  const b = touches.item(1);
  return a && b ? [a, b] : null;
}

/**
 * North-America microclimate atlas map.
 *
 * Performance:
 *   - Pan is applied directly to the SVG transform via a ref + RAF, so no
 *     React re-renders fire during a drag (markers, borders, etc. stay put).
 *   - Wheel zoom is RAF-coalesced into a single state update per frame.
 *   - All geo strokes use vector-effect="non-scaling-stroke" so we don't
 *     have to recompute stroke widths on zoom.
 *   - Markers are React.memo'd; only the marker that lost or gained hover
 *     re-renders on mouseover, not all 130.
 *   - Marker visual size stays constant at any zoom via a counter-scale
 *     wrapper (no per-marker arithmetic).
 *   - Pins call the parent `onSelect` directly — not gated on pan `moved`,
 *     because marker pointerdown stops propagation so the map never resets
 *     that flag after a drag (which previously made pins “dead” until reload).
 *   - SVG filters are avoided on the marker layer (replaced with stacked
 *     translucent halo circles, which composite far cheaper than a blur).
 *   - Coastline blur / marker pulse / land grain follow `useRichVisualEffects()`
 *     (`device-profile.ts`, paired with App `tc-low-power`).
 */
export function AtlasMap({
  places,
  selectedId,
  onSelect,
  width: widthProp = 820,
  height: heightProp = 520,
}: Props) {
  /** Skip SVG Gaussian blur on coast & heavy marker pulse on low-power / save-data devices (e.g. older Surfaces). */
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  // Touch devices skip rich effects unconditionally — the SVG blur filter and
  // marker pulses are the largest paint cost on iOS Safari, and modern phones
  // still report >4 GB / >4 cores so the generic `useRichVisualEffects()`
  // probe leaves them on. We always keep gradients, halos, and tier glyphs.
  const richEffects = useRichVisualEffects() && !coarsePointer;
  const [touchMode, setTouchMode] = useState<AtlasTouchMode>(ATLAS_DEFAULT_TOUCH_MODE);
  const mapInteractive = resolveAtlasMapInteractive({ coarsePointer, touchMode });
  const [legendOpen, setLegendOpen] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: widthProp, height: heightProp, measured: false });

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(280, Math.round(r.width));
      const h = Math.max(260, Math.round(r.height));
      setDims(d => (d.width === w && d.height === h && d.measured ? d : { width: w, height: h, measured: true }));
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  const width = dims.width;
  const height = dims.height;
  const mapMeasured = dims.measured;
  const compactMapChrome = coarsePointer || width < 760;

  useEffect(() => {
    if (!coarsePointer) {
      setTouchMode(ATLAS_DEFAULT_TOUCH_MODE);
    }
    if (!compactMapChrome) {
      setLegendOpen(false);
    }
  }, [coarsePointer, compactMapChrome]);

  useEffect(() => {
    if (mapInteractive) return;
    activeTouchPointersRef.current.clear();
    pinchRef.current = null;
    touchPinchRef.current = null;
    dragRef.current.active = false;
    dragRef.current.dx = 0;
    dragRef.current.dy = 0;
  }, [mapInteractive]);

  const svgRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<SVGGElement>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  // `settledView` lags `view` by ~120 ms while a gesture is in flight. We use
  // it for expensive O(n²) work — clustering and label-bucket layout — so a
  // 60 Hz pinch doesn't recompute them every frame. The marker layer still
  // tracks the finger because pan/zoom is applied imperatively on `transformRef`.
  const [settledView, setSettledView] = useState(view);
  useEffect(() => {
    const ric: ((cb: () => void, opts?: { timeout?: number }) => number) | undefined =
      typeof window !== "undefined"
        ? (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback
        : undefined;
    const cic: ((id: number) => void) | undefined =
      typeof window !== "undefined"
        ? (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback
        : undefined;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const commit = () => setSettledView(view);
    if (ric) {
      idleId = ric(commit, { timeout: 140 });
    } else {
      timeoutId = setTimeout(commit, 120);
    }
    return () => {
      if (idleId !== null && cic) cic(idleId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [view]);
  const fitSignatureRef = useRef<string | null>(null);
  const { dist } = useUnits();
  // Units read from a closure-captured ref so our direct-DOM scale-bar updater
  // never fires a React re-render when the user toggles imperial/metric —
  // instead we recompute on mount/unit change and when view changes.
  const distRef = useRef(dist);
  distRef.current = dist;

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tooltipScreen, setTooltipScreen] = useState<{ xPct: number; yPct: number } | null>(null);
  const [clusterPicker, setClusterPicker] = useState<{
    cluster: AtlasClusterItem<{ place: Place; x: number; y: number; id: string }>;
    xPct: number;
    yPct: number;
  } | null>(null);
  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current) {
      clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClear = useCallback(() => {
    cancelHoverClear();
    hoverClearTimerRef.current = setTimeout(() => {
      hoverClearTimerRef.current = null;
      setHoverId(null);
      setTooltipScreen(null);
    }, 240);
  }, [cancelHoverClear]);

  useEffect(() => () => cancelHoverClear(), [cancelHoverClear]);

  // Direct-DOM refs for the cursor lat/lon readout and the scale bar. These
  // are mutated imperatively (via ref.textContent / ref.style.width) on
  // pointer move / zoom — no React reconciliation on the hot path.
  const coordLabelRef = useRef<HTMLDivElement>(null);
  const scaleBarRef = useRef<HTMLDivElement>(null);
  const scaleBarBarRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    moved: false,
    raf: 0,
  });
  const activeTouchPointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const suppressTouchActivationRef = useRef(false);
  const suppressTouchActivationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinchRef = useRef<{
    startDistance: number;
    startK: number;
    mapCenterX: number;
    mapCenterY: number;
  } | null>(null);
  const touchPinchRef = useRef<{
    startDistance: number;
    startK: number;
    mapCenterX: number;
    mapCenterY: number;
  } | null>(null);
  // Tracks the previous touch's pointerdown for double-tap-to-zoom detection.
  // The follow-up tap zooms ~1.9× centered on the tap point (matches the
  // wheel-zoom math) — only when the gesture didn't move and didn't land on a
  // marker (markers stop propagation so this handler never sees their taps).
  const lastTouchTapRef = useRef<{ t: number; clientX: number; clientY: number } | null>(null);

  const projection: GeoProjection = useMemo(() =>
    geoAlbers()
      .rotate([100, 0])
      .center([0, 48])
      .parallels([29, 55])
      .scale(width * 0.95)
      .translate([width / 2, height / 2])
  , [width, height]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  // Lazy-loaded topology. Starts null — all the country/state path strings
  // below resolve to "" until the chunk arrives. The ocean, markers,
  // graticule, compass, scale bar, and zoom controls all render
  // immediately; the country fills and state borders fade in via CSS a
  // frame after loadTopo() resolves.
  const [topo, setTopo] = useState<{ countries: CountriesTopo; states: StatesTopo } | null>(cachedTopo);

  useEffect(() => {
    if (topo) return;
    let cancelled = false;
    loadTopo().then(t => { if (!cancelled) setTopo(t); });
    return () => { cancelled = true; };
  }, [topo]);

  // Topology features (decoded once, only once the chunk is present)
  const focusFC = useMemo<FeatureCollection<Geometry, { name: string }> | null>(() => {
    if (!topo) return null;
    return feature(topo.countries, topo.countries.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  }, [topo]);

  const focusCountries = useMemo(
    () => focusFC?.features.filter(f => ["United States of America", "Canada", "Mexico"].includes(f.properties?.name ?? "")) ?? [],
    [focusFC]
  );
  const otherCountries = useMemo(
    () => focusFC?.features.filter(f => !["United States of America", "Canada", "Mexico", "Antarctica"].includes(f.properties?.name ?? "")) ?? [],
    [focusFC]
  );

  // Mesh borders only (much faster than per-state polygon paths)
  const stateMeshGeo = useMemo(() => {
    if (!topo) return null;
    return mesh(topo.states, topo.states.objects.states, (a, b) => a !== b);
  }, [topo]);
  const countryBorderMesh = useMemo(() => {
    if (!topo) return null;
    return mesh(topo.countries, topo.countries.objects.countries, (a, b) => {
      const an = (a as unknown as { properties?: { name?: string } }).properties?.name;
      const bn = (b as unknown as { properties?: { name?: string } }).properties?.name;
      const focus = ["United States of America", "Canada", "Mexico"];
      return focus.includes(an ?? "") || focus.includes(bn ?? "");
    });
  }, [topo]);

  const focusPath = useMemo(
    () => focusCountries.map(f => pathGen(f) ?? "").join(" "),
    [focusCountries, pathGen]
  );
  const otherPath = useMemo(
    () => otherCountries.map(f => pathGen(f) ?? "").join(" "),
    [otherCountries, pathGen]
  );
  const statePath = useMemo(
    () => stateMeshGeo ? pathGen(stateMeshGeo as never) : null,
    [stateMeshGeo, pathGen]
  );
  const countryPath = useMemo(
    () => countryBorderMesh ? pathGen(countryBorderMesh as never) : null,
    [countryBorderMesh, pathGen]
  );

  const pts = useMemo(() => {
    const out: { place: Place; x: number; y: number }[] = [];
    for (const p of places) {
      const xy = projection([p.lon, p.lat]);
      if (xy) out.push({ place: p, x: xy[0], y: xy[1] });
    }
    return out;
  }, [places, projection]);

  const pointsSignature = useMemo(
    () => places.map(p => p.id).sort().join("|"),
    [places],
  );

  useLayoutEffect(() => {
    if (!mapMeasured) return;
    if (fitSignatureRef.current === pointsSignature) return;
    fitSignatureRef.current = pointsSignature;
    setClusterPicker(null);
    if (pts.length === 0) {
      setView({ k: 1, x: 0, y: 0 });
      return;
    }
    setView(
      fitMapViewToPoints(
        pts.map(p => ({ x: p.x, y: p.y })),
        width,
        height,
        48,
        { minK: MIN_ZOOM, maxK: MAX_ZOOM, inset: 0.065 }
      )
    );
  }, [pts, pointsSignature, width, height, mapMeasured]);

  // Country labels — computed from geographic anchor points (not polygon
  // centroids, which sit at Nunavut for Canada and the Aleutians for the US).
  // Hand-picked lon/lat anchors give visually balanced placement at every
  // zoom level. Positions projected once; the parent pan/zoom `<g>` moves
  // them so they always stay tied to the land.
  const countryLabels = useMemo(() => {
    const anchors: { id: string; label: string; lonLat: [number, number] }[] = [
      { id: "usa",    label: "UNITED STATES", lonLat: [-98.0, 40.5] },
      { id: "canada", label: "CANADA",        lonLat: [-98.0, 58.0] },
      { id: "mexico", label: "MÉXICO",        lonLat: [-102.0, 23.5] },
    ];
    const out: { id: string; label: string; x: number; y: number }[] = [];
    for (const a of anchors) {
      const xy = projection(a.lonLat);
      if (xy) out.push({ id: a.id, label: a.label, x: xy[0], y: xy[1] });
    }
    return out;
  }, [projection]);

  /** Soft, clipped ellipses over major cordilleras — reads as relief without raster tiles. */
  const terrainVeils = useMemo(() => {
    const anchors: Array<{ lon: number; lat: number; rxk: number; ryk: number; rot: number; op: number }> = [
      { lon: -116, lat: 46.5, rxk: 0.2, ryk: 0.12, rot: -32, op: 0.11 },
      { lon: -109, lat: 40, rxk: 0.17, ryk: 0.14, rot: -18, op: 0.13 },
      { lon: -119.5, lat: 38, rxk: 0.11, ryk: 0.26, rot: 15, op: 0.1 },
      { lon: -82.5, lat: 36.2, rxk: 0.1, ryk: 0.22, rot: 22, op: 0.09 },
      { lon: -105, lat: 29.5, rxk: 0.09, ryk: 0.15, rot: 38, op: 0.075 },
      { lon: -126, lat: 53.5, rxk: 0.12, ryk: 0.09, rot: 8, op: 0.085 },
      { lon: -97, lat: 19.5, rxk: 0.09, ryk: 0.13, rot: 55, op: 0.07 },
    ];
    const out: Array<{ id: string; cx: number; cy: number; rx: number; ry: number; rot: number; op: number }> = [];
    anchors.forEach((a, i) => {
      const xy = projection([a.lon, a.lat]);
      if (!xy) return;
      out.push({
        id: `rel-${i}`,
        cx: xy[0],
        cy: xy[1],
        rx: width * a.rxk,
        ry: height * a.ryk,
        rot: a.rot,
        op: a.op,
      });
    });
    return out;
  }, [projection, width, height]);

  // Precompute km-per-pixel at the map centre at zoom=1. Scale bar width at
  // any zoom is then `nicePixels = niceDistance_km / (kmPerPx / k)`. We
  // derive this using the projection's own inverse so it's robust to any
  // projection parameter change.
  const kmPerPxAt1 = useMemo(() => {
    const midX = width / 2;
    const midY = height / 2;
    const a = projection.invert?.([midX, midY]);
    const b = projection.invert?.([midX + 100, midY]);
    if (!a || !b) return 25; // reasonable fallback
    return haversineKm(a[0], a[1], b[0], b[1]) / 100;
  }, [projection, width, height]);

  // Update the scale bar imperatively whenever zoom changes or the user
  // flips the unit toggle. We avoid re-rendering the map; instead we mutate
  // the DOM directly via refs.
  useEffect(() => {
    updateScaleBar(scaleBarRef.current, scaleBarBarRef.current, view.k, kmPerPxAt1, distRef.current);
  }, [view, kmPerPxAt1, dist]);

  const hoverPlace = useMemo(
    () => pts.find(pt => pt.place.id === hoverId)?.place ?? null,
    [pts, hoverId]
  );

  const clusterSourcePoints = useMemo(
    () => pts.map(pt => ({ ...pt, id: pt.place.id })),
    [pts],
  );

  const protectedClusterIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedId) ids.add(selectedId);
    if (hoverId) ids.add(hoverId);
    return ids;
  }, [selectedId, hoverId]);

  const clusterEnabled =
    coarsePointer &&
    pts.length > 18 &&
    (settledView.k < MOBILE_CLUSTER_LABEL_ZOOM_CUTOFF || settledView.k >= MAX_ZOOM * 0.96);
  const renderItems = useMemo(
    () => clusterMapPoints(clusterSourcePoints, {
      enabled: clusterEnabled,
      view: settledView,
      radiusPx: MOBILE_CLUSTER_RADIUS_PX,
      protectedIds: protectedClusterIds,
    }),
    [clusterSourcePoints, clusterEnabled, settledView, protectedClusterIds],
  );
  const clusterItems = useMemo(
    () => renderItems.filter((item): item is AtlasClusterItem<{ place: Place; x: number; y: number; id: string }> => item.kind === "cluster"),
    [renderItems],
  );
  const markerPointsAll = useMemo(
    () => renderItems.flatMap(item => item.kind === "point" ? [item.point] : []),
    [renderItems],
  );

  // Viewport-cull markers on mobile above the cluster cutoff. Below it
  // clustering already collapses ~210 pins to ~30. Above it (k ≥ 1.65) only
  // ~25 of the 210 are typically on-screen; rendering the rest just costs
  // paint and reconciliation. We pad by one marker hit-radius (~80 SVG units)
  // so markers don't pop in/out at the edge, and always include
  // selected/hovered ids so they survive even when scrolled out of frame.
  const markerPoints = useMemo(() => {
    if (!coarsePointer || settledView.k < MOBILE_CLUSTER_LABEL_ZOOM_CUTOFF) return markerPointsAll;
    if (markerPointsAll.length <= 32) return markerPointsAll;
    const pad = 80;
    const k = settledView.k;
    const minX = (-settledView.x - pad) / k;
    const maxX = (width - settledView.x + pad) / k;
    const minY = (-settledView.y - pad) / k;
    const maxY = (height - settledView.y + pad) / k;
    return markerPointsAll.filter(pt => {
      if (pt.place.id === selectedId || pt.place.id === hoverId) return true;
      return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
    });
  }, [markerPointsAll, coarsePointer, settledView, width, height, selectedId, hoverId]);

  const laidOutMarkerPoints = useMemo<RenderedClusterPoint[]>(() => {
    const layout = layoutAtlasMapPins(
      markerPoints.map(pt => ({
        ...pt,
        priority: pinLayoutPriority(pt.place, selectedId, hoverId),
        locked: pt.place.id === selectedId || pt.place.id === hoverId,
      })),
      {
        enabled: markerPoints.length > 1,
        view: settledView,
        minSpacingPx: coarsePointer ? MOBILE_PIN_MIN_SPACING_PX : DESKTOP_PIN_MIN_SPACING_PX,
        maxOffsetPx: coarsePointer ? MOBILE_PIN_MAX_OFFSET_PX : DESKTOP_PIN_MAX_OFFSET_PX,
        iterations: coarsePointer ? 14 : 10,
        leaderThresholdPx: coarsePointer ? 5 : 4,
      },
    );

    return layout.pins.map(pin => ({
      ...pin.point,
      x: pin.x,
      y: pin.y,
      anchorX: pin.anchorX,
      anchorY: pin.anchorY,
      offsetPx: pin.offsetPx,
      needsLeader: pin.needsLeader,
      crowded: pin.crowded,
    }));
  }, [markerPoints, settledView, coarsePointer, selectedId, hoverId]);

  const pinLabelModes = useMemo(
    () => computePinLabelModes(laidOutMarkerPoints, settledView.k, selectedId, hoverId),
    [laidOutMarkerPoints, settledView.k, selectedId, hoverId]
  );

  /**
   * SVG paint order = hit-test order. Render inactive pins first, then hover,
   * then selection so stacked pins are clickable without hunting for a gap.
   *
   * Implemented as a single linear partition pass: with ~130 pins, only 0–2
   * ever have non-zero priority. The previous spread + sort allocated a new
   * array and ran ~896 `localeCompare` calls per recompute (every hover,
   * every selection). The base order from `laidOutMarkerPoints` is already
   * deterministic so we don't need a tiebreaker.
   */
  const markerRenderOrder = useMemo(() => {
    const base: RenderedClusterPoint[] = [];
    let hover: RenderedClusterPoint | null = null;
    let selected: RenderedClusterPoint | null = null;
    for (const pt of laidOutMarkerPoints) {
      if (pt.place.id === selectedId) selected = pt;
      else if (pt.place.id === hoverId) hover = pt;
      else base.push(pt);
    }
    if (hover) base.push(hover);
    if (selected) base.push(selected);
    return base;
  }, [laidOutMarkerPoints, selectedId, hoverId]);

  // Markers call `onSelect` directly. Do not gate on `dragRef.moved`: marker
  // `pointerdown` stops propagation so the map never resets `moved` after a
  // pan — using a drag guard here left pins unclickable until full reload.

  // DOM transform applier — used both during drag (no re-render) and after
  // committed view changes.
  const applyDOMTransform = useCallback(() => {
    const v = viewRef.current;
    const drag = dragRef.current;
    const x = v.x + (drag.active ? drag.dx : 0);
    const y = v.y + (drag.active ? drag.dy : 0);
    if (transformRef.current) {
      transformRef.current.setAttribute("transform", `translate(${x} ${y}) scale(${v.k})`);
    }
  }, []);

  useEffect(() => { applyDOMTransform(); }, [view, applyDOMTransform]);

  // Wheel zoom — RAF-coalesced
  const wheelRAF = useRef<number>(0);
  const wheelBuf = useRef<{ k: number; mx: number; my: number } | null>(null);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const prev = wheelBuf.current;
    wheelBuf.current = prev
      ? { k: prev.k * factor, mx, my }
      : { k: factor, mx, my };
    if (!wheelRAF.current) {
      wheelRAF.current = requestAnimationFrame(() => {
        wheelRAF.current = 0;
        const buf = wheelBuf.current;
        wheelBuf.current = null;
        if (!buf) return;
        setView(v => {
          const nextK = clampZoom(v.k * buf.k);
          const f = nextK / v.k;
          const nx = buf.mx - (buf.mx - v.x) * f;
          const ny = buf.my - (buf.my - v.y) * f;
          return { k: nextK, x: nx, y: ny };
        });
      });
    }
  }, [width, height]);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const startDragAt = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      ...dragRef.current,
      active: true,
      startX: clientX,
      startY: clientY,
      dx: 0,
      dy: 0,
      moved: false,
    };
  }, []);

  const clearTouchActivationSuppression = useCallback(() => {
    suppressTouchActivationRef.current = false;
    if (suppressTouchActivationTimerRef.current) {
      clearTimeout(suppressTouchActivationTimerRef.current);
      suppressTouchActivationTimerRef.current = null;
    }
  }, []);

  const suppressNextTouchActivation = useCallback(() => {
    if (suppressTouchActivationTimerRef.current) {
      clearTimeout(suppressTouchActivationTimerRef.current);
    }
    suppressTouchActivationRef.current = true;
    suppressTouchActivationTimerRef.current = setTimeout(() => {
      suppressTouchActivationRef.current = false;
      suppressTouchActivationTimerRef.current = null;
    }, 450);
  }, []);

  const shouldSuppressTouchActivation = useCallback(() => {
    if (!suppressTouchActivationRef.current) return false;
    clearTouchActivationSuppression();
    return true;
  }, [clearTouchActivationSuppression]);

  useEffect(() => () => clearTouchActivationSuppression(), [clearTouchActivationSuppression]);

  const finishDrag = useCallback((): boolean => {
    if (!dragRef.current.active) return false;
    const { dx, dy, moved } = dragRef.current;
    dragRef.current.active = false;
    if (dx !== 0 || dy !== 0) setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    dragRef.current.dx = 0;
    dragRef.current.dy = 0;
    return moved;
  }, []);

  const startPinch = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    const pair = firstTwoPointers(activeTouchPointersRef.current);
    if (!rect || !pair) return;
    const [a, b] = pair;
    const center = svgPointFromClient(
      (a.clientX + b.clientX) / 2,
      (a.clientY + b.clientY) / 2,
      rect,
      width,
      height,
    );
    const v = viewRef.current;
    pinchRef.current = {
      startDistance: Math.max(1, pointerDistance(a, b)),
      startK: v.k,
      mapCenterX: (center.x - v.x) / v.k,
      mapCenterY: (center.y - v.y) / v.k,
    };
    dragRef.current.active = false;
    dragRef.current.dx = 0;
    dragRef.current.dy = 0;
  }, [width, height]);

  // Pan via Pointer Events + direct DOM mutation (no React re-renders during drag)
  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      setClusterPicker(null);

      if (!mapInteractive) {
        return;
      }

      e.preventDefault();
      activeTouchPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      if (activeTouchPointersRef.current.size === 1) {
        startDragAt(e.clientX, e.clientY);
      } else {
        startPinch();
      }
      return;
    }

    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setClusterPicker(null);
    startDragAt(e.clientX, e.clientY);
  }, [mapInteractive, startDragAt, startPinch]);

  const updateExplicitTouchPan = useCallback((e: React.PointerEvent<SVGSVGElement>): boolean => {
    if (!activeTouchPointersRef.current.has(e.pointerId)) return false;
    e.preventDefault();
    activeTouchPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    const pair = firstTwoPointers(activeTouchPointersRef.current);
    if (pair && pinchRef.current) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return true;
      const [a, b] = pair;
      const center = svgPointFromClient(
        (a.clientX + b.clientX) / 2,
        (a.clientY + b.clientY) / 2,
        rect,
        width,
        height,
      );
      const nextK = clampZoom(pinchRef.current.startK * (pointerDistance(a, b) / pinchRef.current.startDistance));
      setView({
        k: nextK,
        x: center.x - pinchRef.current.mapCenterX * nextK,
        y: center.y - pinchRef.current.mapCenterY * nextK,
      });
      return true;
    }
    return false;
  }, [width, height]);

  const finishTouchPointer = useCallback((e: React.PointerEvent<SVGSVGElement>): boolean => {
    activeTouchPointersRef.current.delete(e.pointerId);

    if (!mapInteractive) {
      pinchRef.current = null;
      return true;
    }

    if (activeTouchPointersRef.current.size >= 2) {
      startPinch();
      return true;
    }
    if (activeTouchPointersRef.current.size === 1 && pinchRef.current) {
      const remaining = [...activeTouchPointersRef.current.values()][0];
      pinchRef.current = null;
      startDragAt(remaining.clientX, remaining.clientY);
      return true;
    }
    pinchRef.current = null;
    return false;
  }, [mapInteractive, startDragAt, startPinch]);

  // Cursor lat/lon overlay — RAF-coalesced direct-DOM update. Runs on every
  // pointer move (not just drag). No React renders. Skipped on coarse
  // pointers: touch never hovers usefully and the overlay would just steal a
  // getBoundingClientRect + projection-invert per touchmove frame.
  const coordRAF = useRef<number>(0);
  const coordBufRef = useRef<{ lon: number; lat: number } | null>(null);
  const updateCursorCoord = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (coarsePointer) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = ((e.clientX - rect.left) / rect.width) * width;
    const localY = ((e.clientY - rect.top) / rect.height) * height;
    const v = viewRef.current;
    // Undo current pan/zoom to get map-space coords, then invert projection.
    const mapX = (localX - v.x) / v.k;
    const mapY = (localY - v.y) / v.k;
    const ll = projection.invert?.([mapX, mapY]);
    if (!ll) return;
    coordBufRef.current = { lon: ll[0], lat: ll[1] };
    if (!coordRAF.current) {
      coordRAF.current = requestAnimationFrame(() => {
        coordRAF.current = 0;
        const buf = coordBufRef.current;
        coordBufRef.current = null;
        const el = coordLabelRef.current;
        if (el && buf) {
          el.textContent = formatLatLon(buf.lat, buf.lon);
        }
      });
    }
  }, [coarsePointer, projection, width, height]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      if (!mapInteractive) return;
      if (updateExplicitTouchPan(e)) {
        return;
      }
    } else {
      updateCursorCoord(e);
    }

    if (!dragRef.current.active) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = width / rect.width;
    const sy = height / rect.height;
    const dx = (e.clientX - dragRef.current.startX) * sx;
    const dy = (e.clientY - dragRef.current.startY) * sy;
    dragRef.current.dx = dx;
    dragRef.current.dy = dy;
    if (!dragRef.current.moved && Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
    if (!dragRef.current.raf) {
      dragRef.current.raf = requestAnimationFrame(() => {
        dragRef.current.raf = 0;
        applyDOMTransform();
      });
    }
  }, [width, height, applyDOMTransform, updateCursorCoord, mapInteractive, updateExplicitTouchPan]);

  const onPointerUp = useCallback((e?: React.PointerEvent<SVGSVGElement>) => {
    let touchTap: { clientX: number; clientY: number } | null = null;
    if (e?.pointerType === "touch") {
      if (!mapInteractive) return;
      const canDoubleTap =
        mapInteractive &&
        activeTouchPointersRef.current.size === 1 &&
        !pinchRef.current &&
        !dragRef.current.moved;
      if (finishTouchPointer(e)) return;
      if (canDoubleTap && activeTouchPointersRef.current.size === 0) {
        touchTap = { clientX: e.clientX, clientY: e.clientY };
      }
    } else if (!e) {
      activeTouchPointersRef.current.clear();
      pinchRef.current = null;
    }

    const moved = finishDrag();
    if (e?.pointerType === "touch" && mapInteractive && moved) {
      suppressNextTouchActivation();
    }

    if (touchTap) {
      const now = performance.now();
      const prev = lastTouchTapRef.current;
      const close =
        prev &&
        now - prev.t < 320 &&
        Math.hypot(touchTap.clientX - prev.clientX, touchTap.clientY - prev.clientY) < 24;
      if (close) {
        lastTouchTapRef.current = null;
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = ((touchTap.clientX - rect.left) / rect.width) * width;
          const my = ((touchTap.clientY - rect.top) / rect.height) * height;
          setView(v => {
            const nextK = clampZoom(v.k * 1.9);
            const f = nextK / v.k;
            return {
              k: nextK,
              x: mx - (mx - v.x) * f,
              y: my - (my - v.y) * f,
            };
          });
        }
      } else {
        lastTouchTapRef.current = { t: now, clientX: touchTap.clientX, clientY: touchTap.clientY };
      }
    }
  }, [finishDrag, finishTouchPointer, height, mapInteractive, suppressNextTouchActivation, width]);

  const startTouchPinch = useCallback((touches: TouchListLike) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const pair = touchPair(touches);
    if (!rect || !pair) return;
    const [a, b] = pair;
    const center = svgPointFromClient(
      (a.clientX + b.clientX) / 2,
      (a.clientY + b.clientY) / 2,
      rect,
      width,
      height,
    );
    const v = viewRef.current;
    touchPinchRef.current = {
      startDistance: Math.max(1, pointerDistance(a, b)),
      startK: v.k,
      mapCenterX: (center.x - v.x) / v.k,
      mapCenterY: (center.y - v.y) / v.k,
    };
    dragRef.current.active = false;
    dragRef.current.dx = 0;
    dragRef.current.dy = 0;
  }, [width, height]);

  const onTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!mapInteractive || e.touches.length < 2) return;
    startTouchPinch(e.touches);
  }, [mapInteractive, startTouchPinch]);

  const onTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const pinch = touchPinchRef.current;
    const rect = svgRef.current?.getBoundingClientRect();
    const pair = touchPair(e.touches);
    if (!mapInteractive || !pinch || !rect || !pair) return;
    const [a, b] = pair;
    const center = svgPointFromClient(
      (a.clientX + b.clientX) / 2,
      (a.clientY + b.clientY) / 2,
      rect,
      width,
      height,
    );
    const nextK = clampZoom(pinch.startK * (pointerDistance(a, b) / pinch.startDistance));
    setView({
      k: nextK,
      x: center.x - pinch.mapCenterX * nextK,
      y: center.y - pinch.mapCenterY * nextK,
    });
  }, [mapInteractive, width, height]);

  const onTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length >= 2) {
      startTouchPinch(e.touches);
      return;
    }
    touchPinchRef.current = null;
  }, [startTouchPinch]);

  const zoomBy = useCallback((f: number) => {
    setView(v => {
      const nk = clampZoom(v.k * f);
      const cx = width / 2;
      const cy = height / 2;
      const factor = nk / v.k;
      return { k: nk, x: cx - (cx - v.x) * factor, y: cy - (cy - v.y) * factor };
    });
  }, [width, height]);

  const reset = useCallback(() => {
    setClusterPicker(null);
    if (pts.length === 0) {
      setView({ k: 1, x: 0, y: 0 });
      return;
    }
    setView(
      fitMapViewToPoints(
        pts.map(p => ({ x: p.x, y: p.y })),
        width,
        height,
        48,
        { minK: MIN_ZOOM, maxK: MAX_ZOOM, inset: 0.065 }
      )
    );
  }, [pts, width, height]);

  // Keyboard: +/- to zoom, 0 to reset, arrows to pan
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target !== node && !node.contains(e.target as Node)) return;
      switch (e.key) {
        case "+": case "=": zoomBy(1.4); break;
        case "-": case "_": zoomBy(1 / 1.4); break;
        case "0": reset(); break;
        case "ArrowLeft":  setView(v => ({ ...v, x: v.x + 30 })); break;
        case "ArrowRight": setView(v => ({ ...v, x: v.x - 30 })); break;
        case "ArrowUp":    setView(v => ({ ...v, y: v.y + 30 })); break;
        case "ArrowDown":  setView(v => ({ ...v, y: v.y - 30 })); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomBy, reset]);

  const updateTooltip = useCallback((pt: { x: number; y: number }) => {
    const v = viewRef.current;
    const sx = pt.x * v.k + v.x;
    const sy = pt.y * v.k + v.y;
    setTooltipScreen({ xPct: (sx / width) * 100, yPct: (sy / height) * 100 });
  }, [width, height]);

  const openClusterPicker = useCallback((cluster: AtlasClusterItem<{ place: Place; x: number; y: number; id: string }>) => {
    const v = viewRef.current;
    setClusterPicker({
      cluster,
      xPct: ((cluster.x * v.k + v.x) / width) * 100,
      yPct: ((cluster.y * v.k + v.y) / height) * 100,
    });
  }, [width, height]);

  const activateCluster = useCallback((cluster: AtlasClusterItem<{ place: Place; x: number; y: number; id: string }>) => {
    const next = fitMapViewToCluster(cluster, width, height, {
      minK: Math.min(MAX_ZOOM, Math.max(viewRef.current.k * 1.45, MIN_ZOOM)),
      maxK: MAX_ZOOM,
      pad: coarsePointer ? 92 : 72,
      inset: 0.08,
    });

    if (next.k >= MAX_ZOOM * 0.98 && !canClusterSeparateAtZoom(cluster, MAX_ZOOM, MOBILE_CLUSTER_RADIUS_PX * 0.85)) {
      openClusterPicker(cluster);
      return;
    }

    setClusterPicker(null);
    setView(next);
  }, [width, height, coarsePointer, openClusterPicker]);

  const topoLoading = topo === null;
  const svgTouchAction = atlasTouchActionForMode(mapInteractive);

  return (
    <div ref={shellRef} className="relative w-full h-full rounded-2xl overflow-hidden border border-[rgba(91,113,144,0.55)] map-shell">
      {topoLoading ? (
        <div
          className="tc-map-topology-loading absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded-full px-3 py-1 text-[11px] text-frost bg-white/85 border border-[rgba(91,113,144,0.45)] shadow-sm"
          role="status"
          aria-live="polite"
        >
          Loading country & state outlines…
        </div>
      ) : null}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-full max-h-full w-full h-full select-none atlas-svg"
        style={{ touchAction: svgTouchAction }}
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        role="img"
        tabIndex={0}
        aria-label={coarsePointer ? "Atlas map of North America. One-finger drag pans the map; pinch zooms when map mode is active. Use the Scroll page control to let the browser scroll past the map. Tap any pin to open that place's full profile." : "Atlas map of North America. Scroll to zoom, drag to pan. Click any pin to open that place's full profile."}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onPointerEnter={() => { if (coordLabelRef.current) coordLabelRef.current.style.opacity = "1"; }}
        onPointerLeave={() => {
          onPointerUp();
          if (coordLabelRef.current) coordLabelRef.current.style.opacity = "0";
        }}
      >
        <defs>
          {/* Ocean — moonlit swell + depth (no bitmaps; GPU-friendly gradients) */}
          <radialGradient id="oceanGrad" cx="60%" cy="32%" r="90%">
            <stop offset="0" stopColor="#2c4060" />
            <stop offset="0.35" stopColor="#1a2844" />
            <stop offset="0.7" stopColor="#101c32" />
            <stop offset="1" stopColor="#050a14" />
          </radialGradient>
          <radialGradient id="oceanMoon" cx="78%" cy="18%" r="55%">
            <stop offset="0" stopColor="rgba(200, 232, 252, 0.14)" />
            <stop offset="0.4" stopColor="rgba(100, 150, 190, 0.06)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="oceanWarm" cx="12%" cy="88%" r="45%">
            <stop offset="0" stopColor="rgba(240, 200, 140, 0.07)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Land — layered mineral tones (cool north → warm low-latitude hint) */}
          <linearGradient id="landGrad" x1="0.15" y1="0" x2="0.25" y2="1">
            <stop offset="0" stopColor="#526a8e" />
            <stop offset="0.35" stopColor="#3d5578" />
            <stop offset="0.72" stopColor="#334a68" />
            <stop offset="1" stopColor="#283850" />
          </linearGradient>

          {/* Hillshade-like cross-hatch — slightly richer on capable GPUs */}
          <pattern id="hillshade" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(200,220,245,0.085)" strokeWidth="0.5" />
            <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,224,180,0.055)" strokeWidth="0.4" />
          </pattern>
          <pattern id="hillshade2" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)">
            <line x1="0" y1="0" x2="26" y2="0" stroke="rgba(150,205,230,0.065)" strokeWidth="0.4" />
          </pattern>
          {/* Sparse paper grain on land — vector only, skips on low-power via opacity */}
          <pattern id="landGrain" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="2" r="0.35" fill="rgba(255,255,255,0.12)" />
            <circle cx="5" cy="5" r="0.28" fill="rgba(255,255,255,0.08)" />
            <circle cx="3" cy="7" r="0.22" fill="rgba(240,210,156,0.06)" />
          </pattern>

          {/* Vignette */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="78%">
            <stop offset="0.5" stopColor="rgba(0,0,0,0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.58)" />
          </radialGradient>

          {/* Coastline halo (light glow on the seaward side of land) */}
          <filter id="coastalGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.85" />
          </filter>

          {/* Compass rose accent */}
          <radialGradient id="compassFill" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="rgba(241,246,252,0.95)" />
            <stop offset="1" stopColor="rgba(155,178,205,0.55)" />
          </radialGradient>

          {/* Clip NA landmass for relief veils (no extra network; vector only). */}
          {topo && focusPath.length > 8 ? (
            <clipPath id="tc-focus-land-clip">
              <path d={focusPath} />
            </clipPath>
          ) : null}
        </defs>

        {/* Ocean background + layered light (still just rects / gradients) */}
        <rect x="0" y="0" width={width} height={height} fill="url(#oceanGrad)" />
        <rect x="0" y="0" width={width} height={height} fill="url(#oceanMoon)" pointerEvents="none" />
        <rect x="0" y="0" width={width} height={height} fill="url(#oceanWarm)" pointerEvents="none" />

        {/* Pan/zoom group (mutated directly during drag).
            `will-change: transform` hints the browser to promote this
            subtree onto its own compositor layer so pan/zoom are pure GPU
            operations — no repaint of the country paths per frame. */}
        <g
          ref={transformRef}
          transform={`translate(${view.x} ${view.y}) scale(${view.k})`}
          style={{ willChange: "transform" }}
        >
          {/* Cartography group. When the atlas-data chunk hasn't landed yet
              this subtree renders with `opacity: 0` and no `d` attributes,
              so the browser does zero painting — the GPU-composited
              opacity transition then fades the whole layer in as soon as
              React sees the new topology. */}
          <g
            className="cartography"
            style={{
              opacity: topo ? 1 : 0,
              transition: "opacity 420ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            {/* Distant countries — faint context silhouettes */}
            <path
              d={otherPath}
              fill="rgba(60,75,100,0.32)"
              stroke="rgba(155,178,205,0.18)"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
            />

            {/* Coastline glow — blur filter skipped on modest hardware (GPU savings). */}
            <path
              d={focusPath}
              fill={richEffects ? "rgba(140,200,224,0.18)" : "rgba(140,200,224,0.12)"}
              filter={richEffects ? "url(#coastalGlow)" : undefined}
            />

            {/* Focus country fills */}
            <path d={focusPath} fill="url(#landGrad)" />

            {/* Hillshade overlays — phones get just one to keep the relief feel
                without three full-landmass fill repaints per pinch frame. */}
            <path d={focusPath} fill="url(#hillshade)" opacity={richEffects ? 0.95 : 0.72} />
            {!coarsePointer ? (
              <>
                <path d={focusPath} fill="url(#hillshade2)" opacity={richEffects ? 0.82 : 0.55} />
                <path d={focusPath} fill="url(#landGrain)" opacity={richEffects ? 0.35 : 0.12} />
              </>
            ) : null}

            {/* Faux cordillera shading — clipped to land, cheap ellipses (no DEM fetch). */}
            {topo && focusPath.length > 8 ? (
              <g clipPath="url(#tc-focus-land-clip)" pointerEvents="none" opacity={richEffects ? 0.88 : 0.62}>
                {terrainVeils.map(v => (
                  <ellipse
                    key={v.id}
                    cx={v.cx}
                    cy={v.cy}
                    rx={v.rx}
                    ry={v.ry}
                    transform={`rotate(${v.rot} ${v.cx} ${v.cy})`}
                    fill="rgba(4,10,22,0.4)"
                    opacity={v.op * (richEffects ? 1.15 : 0.85)}
                  />
                ))}
              </g>
            ) : null}

            {/* Sunward rim on landmass — 1 extra path, no filter */}
            <path
              d={focusPath}
              fill="none"
              stroke="rgba(255, 248, 235, 0.11)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              opacity={richEffects ? 0.9 : 0.45}
            />
          </g>

          {/* Graticule (lat/lon grid with edge tick labels) */}
          <Graticule pathGen={pathGen} projection={projection} richEffects={richEffects} />

          {/* Borders — also fade with the cartography group */}
          <g
            style={{
              opacity: topo ? 1 : 0,
              transition: "opacity 520ms cubic-bezier(0.2, 0.8, 0.2, 1) 80ms",
            }}
          >
            <path
              d={statePath ?? undefined}
              fill="none"
              stroke="rgba(170,193,220,0.32)"
              strokeWidth="0.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={countryPath ?? undefined}
              fill="none"
              stroke="rgba(210,228,245,0.7)"
              strokeWidth="1"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* Country labels — big, quiet, sit under markers. Opacity falls
              off at high zoom so they don't compete with marker labels. */}
          <g pointerEvents="none" opacity={Math.max(0, Math.min(0.9, 1.35 - view.k * 0.35))}>
            {countryLabels.map(cl => (
              <g key={cl.id} transform={`translate(${cl.x} ${cl.y}) scale(${1 / view.k})`}>
                <text
                  textAnchor="middle"
                  fontSize={13}
                  letterSpacing="0.32em"
                  fontWeight={600}
                  fill="rgba(230,242,252,0.62)"
                  fontFamily="var(--font-sans), system-ui, sans-serif"
                  style={{ paintOrder: "stroke fill", stroke: "rgba(8,14,26,0.85)", strokeWidth: 4, strokeLinejoin: "round" }}
                >{cl.label}</text>
              </g>
            ))}
          </g>

          {/* Clustered pins (mobile / low zoom) */}
          <g>
            {clusterItems.map(cluster => (
              <ClusterMarker
                key={cluster.id}
                cluster={cluster}
                k={view.k}
                onActivate={activateCluster}
                shouldSuppressTouchActivation={shouldSuppressTouchActivation}
              />
            ))}
          </g>

          {/* Visual-only pin offsets keep dense touch targets usable while leader lines preserve exact geography. */}
          <g pointerEvents="none" aria-hidden>
            {markerRenderOrder.filter(pt => pt.needsLeader).map(pt => (
              <g key={`leader-${pt.place.id}`}>
                <line
                  x1={pt.anchorX}
                  y1={pt.anchorY}
                  x2={pt.x}
                  y2={pt.y}
                  stroke={pt.crowded ? "rgba(240,210,156,0.76)" : "rgba(220,235,248,0.52)"}
                  strokeWidth="1"
                  strokeDasharray={pt.crowded ? "2.5 2.5" : "none"}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={pt.anchorX}
                  cy={pt.anchorY}
                  r={Math.max(0.6, 1.8 / view.k)}
                  fill="rgba(245,250,255,0.8)"
                  stroke="rgba(8,14,24,0.9)"
                  strokeWidth="0.65"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>

          {/* Markers */}
          <g>
            {markerRenderOrder.map(pt => {
              // Flip the label to the left of the pin when the marker sits in
              // the right band of the visible map. Uses settledView so the
              // side doesn't jitter mid-pan; threshold 0.62 keeps the default
              // "right" placement for everything except markers comfortably
              // inside the right edge.
              const screenX = pt.x * settledView.k + settledView.x;
              const labelSide: "left" | "right" = screenX > width * 0.62 ? "left" : "right";
              return (
                <Marker
                  key={pt.place.id}
                  pt={pt}
                  k={view.k}
                  labelMode={pinLabelModes.get(pt.place.id) ?? "hidden"}
                  labelSide={labelSide}
                  isActive={pt.place.id === selectedId}
                  isHover={pt.place.id === hoverId}
                  richEffects={richEffects}
                  onSelect={onSelect}
                  onEnter={() => {
                    cancelHoverClear();
                    setHoverId(pt.place.id);
                    updateTooltip(pt);
                  }}
                  onLeave={scheduleHoverClear}
                  shouldSuppressTouchActivation={shouldSuppressTouchActivation}
                />
              );
            })}
          </g>
        </g>

        {/* Vignette (above geometry, below UI) */}
        <rect x="0" y="0" width={width} height={height} fill="url(#vignette)" pointerEvents="none" />

        {/* Compass rose — full 4-point cardinal readout */}
        <g transform={`translate(${width - 60} 60)`} pointerEvents="none" opacity="0.7">
          <circle r="26" fill="rgba(13,20,32,0.72)" stroke="rgba(170,193,220,0.5)" strokeWidth="0.9" />
          <circle r="20" fill="none" stroke="rgba(170,193,220,0.18)" strokeWidth="0.5" strokeDasharray="2 2" />
          {/* North-South needle */}
          <path d="M0 -21 L4 0 L0 21 L-4 0 Z" fill="url(#compassFill)" />
          {/* East-West crossbar */}
          <path d="M-21 0 L0 -3 L21 0 L0 3 Z" fill="rgba(195,228,241,0.28)" />
          {/* Centre stud */}
          <circle r="1.6" fill="rgba(230,242,252,0.85)" />
          <text x="0" y="-29" textAnchor="middle" fontSize="9" fill="rgba(241,246,252,0.9)" fontFamily="var(--font-sans),system-ui,sans-serif" fontWeight={700}>N</text>
          <text x="29" y="3"   textAnchor="middle" fontSize="9" fill="rgba(170,193,220,0.8)" fontFamily="var(--font-sans),system-ui,sans-serif" fontWeight={500}>E</text>
          <text x="0" y="37"   textAnchor="middle" fontSize="9" fill="rgba(170,193,220,0.8)" fontFamily="var(--font-sans),system-ui,sans-serif" fontWeight={500}>S</text>
          <text x="-29" y="3"  textAnchor="middle" fontSize="9" fill="rgba(170,193,220,0.8)" fontFamily="var(--font-sans),system-ui,sans-serif" fontWeight={500}>W</text>
        </g>

        {/* Projection credit */}
        <text
          x={width - 14}
          y={height - 12}
          textAnchor="end"
          fontSize="9"
          fill="rgba(165,185,210,0.55)"
          fontFamily="var(--font-sans),system-ui,sans-serif"
          letterSpacing="0.08em"
          pointerEvents="none"
        >ALBERS CONIC · NORTH AMERICA</text>
      </svg>

      {/* Scale + marker-color legend — stacked so wide labels (e.g. "1,500 mi")
          never collide with legend text (previously both used bottom-left). */}
      <div className="absolute bottom-3 left-3 z-[3] flex flex-col items-stretch gap-2 pointer-events-none max-w-[min(calc(100vw-8rem),22rem)]">
        <div className="flex flex-col gap-1 w-[104px] shrink-0">
          <div
            ref={scaleBarRef}
            className="text-[10px] font-mono-num tracking-wide text-[rgba(236,244,252,0.95)] tabular-nums leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
          >
            — mi
          </div>
          <div className="h-[10px] flex items-end gap-0">
            <div ref={scaleBarBarRef} className="h-[6px] border border-[rgba(170,193,220,0.75)] bg-[rgba(13,20,32,0.55)]" style={{ width: 100 }}>
              <div className="w-1/2 h-full bg-[rgba(230,242,252,0.55)]" />
            </div>
          </div>
        </div>
        {coarsePointer ? (
          <button
            type="button"
            className="map-control-pill pointer-events-auto"
            aria-expanded={legendOpen}
            aria-controls="tc-map-mobile-legend"
            onClick={() => setLegendOpen(v => !v)}
          >
            Legend
          </button>
        ) : (
          <div
            role="group"
            aria-label="Marker colors by primary climate driver"
            className="map-chrome-panel px-2.5 py-2"
          >
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px] leading-relaxed">
              <MapLegendDot color="#ffc860" label="Orographic / orchard / chinook" />
              <MapLegendDot color="#8fd99a" label="Highland / sky-island / cloud" />
              <MapLegendDot color="#6ec8ea" label="Maritime / fog / rain-shadow" />
              <MapLegendDot color="#d4a8ff" label="Rare / sky-island / aurora" />
            </div>
          </div>
        )}
      </div>

      {/* Cursor lat/lon readout — imperatively updated via ref on pointer move.
          Hidden on coarse pointers (touch never hovers usefully). */}
      {!coarsePointer ? (
        <div
          ref={coordLabelRef}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-[2] px-2.5 py-1 rounded-md panel-thin text-[10px] font-mono-num text-frost tracking-wider opacity-0 transition-opacity"
          style={{ transition: "opacity 200ms" }}
        >—</div>
      ) : null}

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[2]">
        <button type="button" className="map-btn" onClick={() => zoomBy(1.7)} title="Zoom in (+)" aria-label="Zoom in">＋</button>
        <button type="button" className="map-btn" onClick={() => zoomBy(1 / 1.7)} title="Zoom out (−)" aria-label="Zoom out">−</button>
        <button
          type="button"
          className="map-btn !text-[9px]"
          onClick={reset}
          title="Fit every pin in view (keyboard: 0)"
          aria-label="Fit all places in view"
        >
          FIT
        </button>
      </div>

      {coarsePointer ? (
        <div className="absolute top-3 left-3 z-[3] pointer-events-auto">
          <button
            type="button"
            className="map-control-pill"
            aria-pressed={mapInteractive}
            aria-label={mapInteractive ? "Switch map to page scrolling" : "Switch map to direct interaction"}
            title={mapInteractive ? "Let page scroll gestures pass through the map" : "Use one-finger pan and pinch zoom on the map"}
            onClick={() => setTouchMode(mode => mode === "map" ? "page" : "map")}
          >
            {mapInteractive ? "Scroll page" : "Use map"}
          </button>
        </div>
      ) : null}

      {/* Tier legend — matches map chrome; hints are plain language (no key-cap styling). */}
      {!coarsePointer ? (
      <div
        role="group"
        aria-label="Marker shapes by atlas tier"
        className="map-chrome-panel absolute bottom-3 right-3 z-[2] max-w-[13.5rem] px-3 py-2.5 pointer-events-none text-[10px] leading-relaxed space-y-2.5"
      >
        <div className="text-[9px] uppercase tracking-wider text-[rgba(236,244,252,0.72)]">Pin shape · tier</div>
        <div className="flex items-center gap-2.5 text-[rgba(245,250,255,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] shrink-0" aria-hidden>
            <span className="inline-block w-[11px] h-[11px] rotate-45 rounded-[1px] bg-[#ffc860] ring-2 ring-[rgba(255,252,245,0.9)] border border-[rgba(6,10,18,0.95)]" />
          </span>
          <span>Flagship — diamond with bright rim</span>
        </div>
        <div className="flex items-center gap-2.5 text-[rgba(245,250,255,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] shrink-0" aria-hidden>
            <span className="inline-block w-[11px] h-[11px] rounded-[3px] bg-[#6ec8ea] border-2 border-[rgba(6,10,18,0.92)]" />
          </span>
          <span>Spotlight — filled rounded square</span>
        </div>
        <div className="flex items-center gap-2.5 text-[rgba(245,250,255,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] shrink-0" aria-hidden>
            <span className="inline-block w-[10px] h-[10px] rounded-full bg-[rgba(8,14,24,0.75)] border-2 border-[#8fd99a] ring-1 ring-[rgba(255,252,245,0.55)]" />
          </span>
          <span>Index — open ring (driver colour on stroke)</span>
        </div>
        <p className="pt-1 mt-0.5 border-t border-[rgba(140,200,224,0.25)] text-[9px] text-[rgba(210,225,240,0.88)] leading-relaxed">
          Tap a pin to open its sheet. Use + / − to zoom, Fit (or the 0 key) to show every pin in the frame, and drag to pan.
        </p>
        <p className="text-[9px] text-[rgba(210,225,240,0.82)] leading-snug">
          Names auto-hide when crowded: at most one label per map cell (tier wins ties). Zoom in or hover for full text.
        </p>
        <p className="text-[9px] text-[rgba(210,225,240,0.82)] leading-snug">
          Pale ring: <span className="text-[rgba(255,236,210,0.95)]">US</span>
          {" · "}
          <span className="text-[rgba(190,230,255,0.95)]">Canada</span>
          {" · "}
          <span className="text-[rgba(255,220,150,0.95)]">Mexico</span>
          {" "}— fill stays the climate driver.
        </p>
        <p className="text-[9px] text-[rgba(200,218,236,0.72)] leading-snug pt-1.5 border-t border-[rgba(140,200,224,0.18)]">
          Geospatial numbers are atlas screening analytics (terrain + climate + reference EO design goals). They are not live Sentinel, Landsat, or lidar products.
        </p>
        <p className="text-[9px] text-[rgba(200,218,236,0.78)] leading-snug pt-0.5">
          Chart numbers in each profile use the cited normals or blends; WMO 30-year windows are often {CLIMATE_NORMALS_PERIOD} when a period is named.
        </p>
      </div>
      ) : null}

      {/* Zoom indicator */}
      <div className="absolute top-3 left-3 panel-thin px-2 py-1 text-[10px] font-mono-num text-stone pointer-events-none z-[2]">
        ×{view.k.toFixed(2)}
      </div>

      {coarsePointer && legendOpen ? (
        <div
          id="tc-map-mobile-legend"
          role="dialog"
          aria-label="Map legend"
          className="map-mobile-legend map-chrome-panel"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wider text-[rgba(236,244,252,0.72)]">Map legend</div>
            <button type="button" className="map-legend-close" onClick={() => setLegendOpen(false)} aria-label="Close map legend">×</button>
          </div>
          <div className="grid gap-2 text-[11px] leading-relaxed">
            <MapLegendDot color="#ffc860" label="Orographic / orchard / chinook" />
            <MapLegendDot color="#8fd99a" label="Highland / sky-island / cloud" />
            <MapLegendDot color="#6ec8ea" label="Maritime / fog / rain-shadow" />
            <MapLegendDot color="#d4a8ff" label="Rare / sky-island / aurora" />
          </div>
          <div className="grid gap-1.5 border-t border-[rgba(140,200,224,0.24)] pt-2 text-[10px] text-[rgba(245,250,255,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
            <div>Diamond: flagship. Square: spotlight. Open ring: index.</div>
            <div>Pale outer ring: US, Canada, or Mexico. Fill color stays the climate driver.</div>
            <div>Clusters show nearby pins. Tap one to zoom; tightly overlapping groups open a picker.</div>
          </div>
        </div>
      ) : null}

      {clusterPicker ? (
        <ClusterPicker
          cluster={clusterPicker.cluster}
          xPct={clusterPicker.xPct}
          yPct={clusterPicker.yPct}
          onClose={() => setClusterPicker(null)}
          onSelect={(id) => {
            setClusterPicker(null);
            onSelect(id);
          }}
        />
      ) : null}

      {hoverPlace && tooltipScreen && (
        <AtlasMapTooltip
          place={hoverPlace}
          xPct={tooltipScreen.xPct}
          yPct={tooltipScreen.yPct}
        />
      )}
    </div>
  );
}

interface MarkerProps {
  pt: { place: Place; x: number; y: number };
  k: number;
  labelMode: MapPinLabelMode;
  /** Side of the pin to draw the label on. Flips to "left" when the marker
   * sits in the right band of the visible viewport so the label never clips
   * past the SVG edge at high zoom. */
  labelSide: "left" | "right";
  isActive: boolean;
  isHover: boolean;
  /** When false, skip pulsing ring animation (older tablets / reduced motion). */
  richEffects: boolean;
  onSelect: (id: string) => void;
  onEnter: () => void;
  onLeave: () => void;
  shouldSuppressTouchActivation: () => boolean;
}

const ClusterMarker = memo(function ClusterMarker({
  cluster,
  k,
  onActivate,
  shouldSuppressTouchActivation,
}: {
  cluster: AtlasClusterItem<ClusterPoint>;
  k: number;
  onActivate: (cluster: AtlasClusterItem<ClusterPoint>) => void;
  shouldSuppressTouchActivation: () => boolean;
}) {
  const inv = 1 / k;
  const count = cluster.points.length;
  const activate = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (shouldSuppressTouchActivation()) return;
    onActivate(cluster);
  }, [cluster, onActivate, shouldSuppressTouchActivation]);
  const stopPan = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    e.stopPropagation();
  }, []);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onActivate(cluster);
    }
  }, [cluster, onActivate]);

  return (
    <g
      transform={`translate(${cluster.x} ${cluster.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${count} nearby microclimates. Zoom to separate these pins.`}
      className="map-cluster"
      onPointerDown={stopPan}
      onClick={activate}
      onKeyDown={onKeyDown}
    >
      <g transform={`scale(${inv})`}>
        <circle r="24" fill="rgba(8,14,24,0.88)" stroke="rgba(245,250,255,0.92)" strokeWidth="1.5" />
        <circle r="18" fill="rgba(94,196,220,0.32)" stroke="rgba(94,196,220,0.78)" strokeWidth="1.1" />
        <text
          textAnchor="middle"
          y="5"
          fontSize="14"
          fontFamily="var(--font-mono),ui-monospace,monospace"
          fontWeight={700}
          fill="rgba(245,250,255,0.98)"
          style={{ paintOrder: "stroke fill", stroke: "rgba(6,10,18,0.9)", strokeWidth: 2, strokeLinejoin: "round" }}
        >
          {count}
        </text>
        <circle r="30" fill="transparent" stroke="none" pointerEvents="all" aria-hidden />
      </g>
    </g>
  );
});

const ClusterPicker = memo(function ClusterPicker({
  cluster,
  xPct,
  yPct,
  onClose,
  onSelect,
}: {
  cluster: AtlasClusterItem<ClusterPoint>;
  xPct: number;
  yPct: number;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const onRight = xPct < 52;
  const onTop = yPct > 56;
  return (
    <div
      role="dialog"
      aria-label="Choose a microclimate from this cluster"
      className="cluster-picker map-chrome-panel"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(${onRight ? "12px" : "calc(-100% - 12px)"}, ${onTop ? "calc(-100% - 10px)" : "10px"})`,
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[rgba(140,200,224,0.24)] pb-2">
        <div className="text-[10px] uppercase tracking-wider text-[rgba(236,244,252,0.76)]">
          {cluster.points.length} nearby pins
        </div>
        <button type="button" className="map-legend-close" onClick={onClose} aria-label="Close cluster picker">×</button>
      </div>
      <div className="grid gap-1.5 max-h-[14rem] overflow-y-auto pt-2">
        {cluster.points
          .slice()
          .sort((a, b) => a.place.name.localeCompare(b.place.name))
          .map(pt => (
            <button
              key={pt.place.id}
              type="button"
              className="cluster-picker__item"
              onClick={() => onSelect(pt.place.id)}
            >
              <span className="font-atlas text-[0.9rem] leading-tight">{pt.place.name}</span>
              <span className="text-[0.68rem] text-[rgba(215,228,242,0.86)] leading-snug">{placeMapSecondaryLine(pt.place)}</span>
            </button>
          ))}
      </div>
    </div>
  );
});

const Marker = memo(function Marker({
  pt, k, labelMode, labelSide, isActive, isHover, richEffects, onSelect, onEnter, onLeave, shouldSuppressTouchActivation,
}: MarkerProps) {
  const { place, x, y } = pt;
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const color = TONE[tone];

  const baseSize = place.tier === "A" ? 7.2 : place.tier === "B" ? 5.4 : 4.35;
  const r = isActive ? baseSize + 1.8 : isHover ? baseSize + 1.2 : baseSize;

  const inv = 1 / k;
  const subLine = placeMapSecondaryLine(place);

  const titleLimit =
    labelMode === "compact"
      ? 16
      : labelMode === "full"
        ? isActive || isHover
          ? 120
          : k >= 1.38
            ? 56
            : Math.max(12, Math.min(30, Math.floor(11 + k * 11)))
        : 0;
  const titleDisp =
    labelMode === "hidden" ? "" : truncateMapTitle(place.name, Math.max(1, titleLimit));
  const showSub =
    labelMode === "full" &&
    (isActive || isHover || k >= 1.24) &&
    subLine.length > 0;
  const labelW = Math.min(
    300,
    Math.max(
      titleDisp.length * 6.15 + 18,
      showSub ? subLine.length * 5.2 + 18 : 0
    )
  );
  const labelH = showSub ? 34 : labelMode === "compact" ? 18 : 18;

  const activate = useCallback(
    (e: React.SyntheticEvent) => {
      e.stopPropagation();
      if (shouldSuppressTouchActivation()) return;
      onSelect(place.id);
    },
    [onSelect, place.id, shouldSuppressTouchActivation],
  );

  const stopPan = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    e.stopPropagation();
  }, []);

  const onMarkerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onSelect(place.id);
      }
    },
    [onSelect, place.id],
  );

  const ariaLabel =
    subLine.length > 0
      ? `${place.name}, ${subLine}. Open full profile.`
      : `Open full profile for ${place.name}`;

  return (
    <g
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className="map-marker"
      style={{ cursor: "pointer" }}
      onPointerDown={stopPan}
      onClick={activate}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onKeyDown={onMarkerKeyDown}
    >
      <g transform={`scale(${inv})`}>
        <circle
          r={r + 3.65}
          fill="none"
          stroke={COUNTRY_RING_STROKE[place.country]}
          strokeWidth={1.55}
          opacity={0.93}
        />
        {/* Cheap halo (no SVG filter — one translucent circle reads as glow). */}
        <circle r={r + 4} fill={color} opacity={0.12} />

        {/* Active pulse ring */}
        {isActive && (
          <circle
            r={r + 10}
            fill="none"
            stroke={color}
            strokeWidth={1.4}
            opacity={0.75}
            className={richEffects ? "pulse-dot" : undefined}
          />
        )}

        {/* Hover ring */}
        {isHover && !isActive && (
          <circle r={r + 5} fill="none" stroke="#f0d29c" strokeWidth={1.1} opacity={0.95} />
        )}

        {/* Tier glyph — shape encodes tier; fill encodes driver (see legend). */}
        {place.tier === "A" ? (
          <g transform="rotate(45)">
            <rect x={-(r + 2.2)} y={-(r + 2.2)} width={(r + 2.2) * 2} height={(r + 2.2) * 2} fill="none" stroke="rgba(255,252,245,0.92)" strokeWidth="2.2" rx={0.9} />
            <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={color} stroke="rgba(6,10,18,0.95)" strokeWidth="1.65" rx={0.65} />
            <rect x={-r * 0.36} y={-r * 0.36} width={r * 0.72} height={r * 0.72} fill="rgba(6,10,18,0.48)" rx={0.35} />
          </g>
        ) : place.tier === "B" ? (
          <>
            <rect
              x={-r}
              y={-r}
              width={r * 2}
              height={r * 2}
              rx={r * 0.32}
              ry={r * 0.32}
              fill={color}
              stroke="rgba(6,10,18,0.95)"
              strokeWidth="1.45"
            />
            <line x1={-r * 0.52} y1={0} x2={r * 0.52} y2={0} stroke="rgba(6,10,18,0.38)" strokeWidth={Math.max(0.9, r * 0.14)} strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle r={r + 1.35} fill="none" stroke="rgba(255,252,245,0.5)" strokeWidth="1.15" />
            <circle r={r} fill="rgba(8,14,24,0.72)" stroke={color} strokeWidth="2.35" />
          </>
        )}

        {/* Specular fleck on top of glyph — cheap highlight, skipped on low-power */}
        {richEffects && (
          <ellipse
            cx={-r * 0.22}
            cy={-r * 0.5}
            rx={r * 0.38}
            ry={r * 0.2}
            fill="rgba(255, 252, 245, 0.26)"
            transform="rotate(-28)"
            pointerEvents="none"
          />
        )}

        {labelMode !== "hidden" ? (() => {
          // Label sits to the right of the pin by default. When `labelSide`
          // is "left", the entire group is shifted by -(labelW + r + 6) so
          // its right edge lands just before the pin — never past the SVG
          // edge at high zoom.
          const labelDx = labelSide === "right" ? r + 6 : -(r + 6) - labelW;
          return (
            <g transform={`translate(${labelDx} ${showSub ? 2 : 4})`} pointerEvents="none" className="map-marker-label">
              <rect
                x={-2}
                y={showSub ? -15 : -11}
                rx={4}
                ry={4}
                width={labelW}
                height={labelH}
                fill="rgba(8,14,24,0.94)"
                stroke={isActive ? "rgba(240,210,156,0.85)" : "rgba(170,193,220,0.62)"}
                strokeWidth={isActive ? 1.05 : 0.85}
              />
              <text
                x={4}
                y={showSub ? -4 : 1}
                fontSize={labelMode === "compact" ? 10.5 : 11.5}
                fill="#f4f8fc"
                fontFamily="var(--font-sans),system-ui,sans-serif"
                fontWeight={600}
                style={{ paintOrder: "stroke fill", stroke: "rgba(6,10,18,0.88)", strokeWidth: 2.5, strokeLinejoin: "round" }}
              >{titleDisp}</text>
              {showSub ? (
                <text
                  x={4}
                  y={9}
                  fontSize={9.5}
                  fill="rgba(200,218,238,0.95)"
                  fontFamily="var(--font-sans),system-ui,sans-serif"
                  fontWeight={500}
                  style={{ paintOrder: "stroke fill", stroke: "rgba(6,10,18,0.82)", strokeWidth: 2, strokeLinejoin: "round" }}
                >{subLine}</text>
              ) : null}
            </g>
          );
        })() : null}
        {/* Hit target on top so touch/stylus picks the marker, not the map pan layer beneath. */}
        <circle r={r + 18} fill="transparent" stroke="none" pointerEvents="all" aria-hidden />
      </g>
    </g>
  );
}, (prev, next) =>
  prev.onSelect === next.onSelect &&
  prev.labelMode === next.labelMode &&
  prev.labelSide === next.labelSide &&
  prev.isActive === next.isActive &&
  prev.isHover === next.isHover &&
  prev.k === next.k &&
  prev.richEffects === next.richEffects &&
  prev.shouldSuppressTouchActivation === next.shouldSuppressTouchActivation &&
  prev.pt.x === next.pt.x &&
  prev.pt.y === next.pt.y &&
  prev.pt.place === next.pt.place
);

/** Driver hues — saturated so diamonds / rings / squares read at a glance on dark land. */
const TONE: Record<string, string> = {
  glacier: "#6ec8ea",
  sage: "#8fd99a",
  ochre: "#ffc860",
  ember: "#ff8a5c",
  ice: "#b8ecff",
  aurora: "#d4a8ff",
};

/** Thin outer ring — encodes country at a glance (driver colour stays fill). */
const COUNTRY_RING_STROKE: Record<Place["country"], string> = {
  USA: "rgba(240, 205, 168, 0.98)",
  Canada: "rgba(168, 218, 252, 0.98)",
  Mexico: "rgba(255, 214, 138, 0.98)",
};

/**
 * Great-circle distance in kilometres between two lon/lat pairs.
 * Used to derive the scale bar and to validate the inverse projection.
 */
function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Format a lat/lon pair for the cursor overlay. We pick degree-decimal
 * precision based on zoom-independent intuition: two decimals are about
 * 1.1 km of horizontal resolution at the equator, which keeps the label
 * readable at a glance while still being useful for regional orientation.
 */
function formatLatLon(lat: number, lon: number): string {
  const latH = lat >= 0 ? "N" : "S";
  const lonH = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${latH}  ${Math.abs(lon).toFixed(2)}°${lonH}`;
}

/** Nice round distances for the scale bar. Chosen so both miles and km have
 *  values at roughly the same magnitude; the scale bar picks the largest that
 *  still fits inside ~120px at the current zoom. */
const SCALE_KM_STEPS = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
const SCALE_MI_STEPS = [3000, 1500, 500, 250, 100, 50, 20, 10, 5, 2, 1] as const;

/**
 * Imperative scale bar renderer. Rather than returning JSX, we take DOM
 * references and mutate `textContent` / `style.width` directly. This keeps
 * the scale bar perfectly in sync with zoom without forcing a React render.
 */
function updateScaleBar(
  labelEl: HTMLDivElement | null,
  barEl: HTMLDivElement | null,
  zoom: number,
  kmPerPxAt1: number,
  dist: DistUnit
): void {
  if (!labelEl || !barEl) return;
  const kmPerPx = kmPerPxAt1 / zoom;
  const maxPx = 120;
  if (dist === "metric") {
    const maxKm = kmPerPx * maxPx;
    const step = SCALE_KM_STEPS.find(s => s <= maxKm) ?? 1;
    const px = step / kmPerPx;
    barEl.style.width = `${Math.round(px)}px`;
    labelEl.textContent = step >= 1000
      ? `${(step / 1000).toLocaleString()} × 1,000 km`
      : `${step.toLocaleString()} km`;
  } else {
    const miPerPx = kmPerPx * 0.621371;
    const maxMi = miPerPx * maxPx;
    const step = SCALE_MI_STEPS.find(s => s <= maxMi) ?? 1;
    const px = step / miPerPx;
    barEl.style.width = `${Math.round(px)}px`;
    labelEl.textContent = step >= 1000
      ? `${(step / 1000).toLocaleString()} × 1,000 mi`
      : `${step.toLocaleString()} mi`;
  }
}

const Graticule = memo(function Graticule({ pathGen, projection, richEffects }: { pathGen: ReturnType<typeof geoPath>; projection: GeoProjection; richEffects: boolean }) {
  const { lines, latLabels, lonLabels } = useMemo(() => {
    const out: string[] = [];
    // Longitudes (meridians)
    for (let lon = -170; lon <= -40; lon += 10) {
      const coords: [number, number][] = [];
      for (let lat = 15; lat <= 75; lat += 2) coords.push([lon, lat]);
      const d = pathGen({ type: "LineString", coordinates: coords } as never);
      if (d) out.push(d);
    }
    // Latitudes (parallels)
    for (let lat = 15; lat <= 75; lat += 10) {
      const coords: [number, number][] = [];
      for (let lon = -170; lon <= -40; lon += 2) coords.push([lon, lat]);
      const d = pathGen({ type: "LineString", coordinates: coords } as never);
      if (d) out.push(d);
    }

    // Tick labels — small degree markers at the edges of the focus area,
    // projected once and positioned in SVG user units. These sit inside the
    // pan/zoom group and so will move with the map.
    const latList: Array<{ text: string; x: number; y: number }> = [];
    for (const lat of [30, 45, 60]) {
      const xy = projection([-125, lat]); // left edge of continental US
      if (xy) latList.push({ text: `${lat}°N`, x: xy[0] - 4, y: xy[1] + 3 });
    }
    const lonList: Array<{ text: string; x: number; y: number }> = [];
    for (const lon of [-120, -100, -80]) {
      const xy = projection([lon, 22]); // bottom edge ~MX gulf
      if (xy) lonList.push({ text: `${Math.abs(lon)}°W`, x: xy[0], y: xy[1] + 10 });
    }
    return { lines: out, latLabels: latList, lonLabels: lonList };
  }, [pathGen, projection]);

  const gridStroke = richEffects ? "rgba(175,200,228,0.14)" : "rgba(170,193,220,0.075)";
  const tickFill = richEffects ? "rgba(185,205,230,0.5)" : "rgba(170,193,220,0.38)";

  return (
    <g>
      {lines.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={gridStroke}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <g pointerEvents="none">
        {latLabels.map(l => (
          <text
            key={l.text}
            x={l.x}
            y={l.y}
            textAnchor="end"
            fontSize={8}
            fill={tickFill}
            fontFamily="var(--font-sans),system-ui,sans-serif"
            letterSpacing="0.05em"
          >{l.text}</text>
        ))}
        {lonLabels.map(l => (
          <text
            key={l.text}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            fontSize={8}
            fill={tickFill}
            fontFamily="var(--font-sans),system-ui,sans-serif"
            letterSpacing="0.05em"
          >{l.text}</text>
        ))}
      </g>
    </g>
  );
});
