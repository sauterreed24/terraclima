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
import { placeMapSecondaryLine, truncateMapTitle } from "../lib/atlas-map-label";
import { computePinLabelModes, type MapPinLabelMode } from "../lib/atlas-map-label-visibility";
import { AtlasMapTooltip } from "./AtlasMapTooltip";

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

// Module-level cache so navigating away and back doesn't re-download.
let cachedTopo: { countries: CountriesTopo; states: StatesTopo } | null = null;
let topoPromise: Promise<{ countries: CountriesTopo; states: StatesTopo }> | null = null;

function loadTopo(): Promise<{ countries: CountriesTopo; states: StatesTopo }> {
  if (cachedTopo) return Promise.resolve(cachedTopo);
  if (topoPromise) return topoPromise;
  topoPromise = Promise.all([
    import("world-atlas/countries-110m.json"),
    import("us-atlas/states-10m.json"),
  ]).then(([c, s]) => {
    cachedTopo = {
      countries: (c.default ?? c) as unknown as CountriesTopo,
      states: (s.default ?? s) as unknown as StatesTopo,
    };
    return cachedTopo;
  });
  return topoPromise;
}

interface Props {
  places: Place[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /**
   * Optional hover callback. Note: this fires on every marker mouseover, so
   * parent components that use it will re-render frequently. Prefer letting
   * AtlasMap manage its own hover state (the map's hover ring is already
   * rendered internally).
   */
  onHover?: (id: string | null) => void;
  width?: number;
  height?: number;
}

/** Allow zooming out enough to frame every pin across NA; must match `fitMapViewToPoints` bounds. */
const MIN_ZOOM = 0.42;
const MAX_ZOOM = 8;

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
  onHover,
  width: widthProp = 820,
  height: heightProp = 520,
}: Props) {
  /** Skip SVG Gaussian blur on coast & heavy marker pulse on low-power / save-data devices (e.g. older Surfaces). */
  const richEffects = useRichVisualEffects();

  const shellRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: widthProp, height: heightProp });

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(280, Math.round(r.width));
      const h = Math.max(260, Math.round(r.height));
      setDims(d => (d.width === w && d.height === h ? d : { width: w, height: h }));
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

  const svgRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<SVGGElement>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const { dist } = useUnits();
  // Units read from a closure-captured ref so our direct-DOM scale-bar updater
  // never fires a React re-render when the user toggles imperial/metric —
  // instead we recompute on mount/unit change and when view changes.
  const distRef = useRef(dist);
  distRef.current = dist;

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tooltipScreen, setTooltipScreen] = useState<{ xPct: number; yPct: number } | null>(null);
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

  useLayoutEffect(() => {
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

  const pinLabelModes = useMemo(
    () => computePinLabelModes(pts, view.k, selectedId, hoverId),
    [pts, view.k, selectedId, hoverId]
  );

  // Markers call `onSelect` directly. Do not gate on `dragRef.moved`: marker
  // `pointerdown` stops propagation so the map never resets `moved` after a
  // pan — using a drag guard here left pins unclickable until full reload.

  // Only notify external listeners if they opted in. Guard the effect so the
  // common (no-listener) path doesn't cause any work per hover.
  useEffect(() => {
    if (onHover) onHover(hoverId);
  }, [hoverId, onHover]);

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

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
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
          const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.k * buf.k));
          const f = nextK / v.k;
          const nx = buf.mx - (buf.mx - v.x) * f;
          const ny = buf.my - (buf.my - v.y) * f;
          return { k: nextK, x: nx, y: ny };
        });
      });
    }
  }, [width, height]);

  // Pan via Pointer Events + direct DOM mutation (no React re-renders during drag)
  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      ...dragRef.current,
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      moved: false,
    };
  }, []);

  // Cursor lat/lon overlay — RAF-coalesced direct-DOM update. Runs on every
  // pointer move (not just drag). No React renders.
  const coordRAF = useRef<number>(0);
  const coordBufRef = useRef<{ lon: number; lat: number } | null>(null);
  const updateCursorCoord = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
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
  }, [projection, width, height]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    updateCursorCoord(e);
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
  }, [width, height, applyDOMTransform, updateCursorCoord]);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.active) return;
    const { dx, dy } = dragRef.current;
    dragRef.current.active = false;
    if (dx !== 0 || dy !== 0) setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    dragRef.current.dx = 0;
    dragRef.current.dy = 0;
  }, []);

  const zoomBy = useCallback((f: number) => {
    setView(v => {
      const nk = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.k * f));
      const cx = width / 2;
      const cy = height / 2;
      const factor = nk / v.k;
      return { k: nk, x: cx - (cx - v.x) * factor, y: cy - (cy - v.y) * factor };
    });
  }, [width, height]);

  const reset = useCallback(() => {
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

  return (
    <div ref={shellRef} className="relative w-full h-full rounded-2xl overflow-hidden border border-[rgba(91,113,144,0.55)] map-shell">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-full max-h-full w-full h-full select-none atlas-svg"
        style={{ touchAction: "none" }}
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        role="img"
        tabIndex={0}
        aria-label="Atlas map of North America. Scroll to zoom, drag to pan. Click or tap any pin to open that place’s full profile."
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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

            {/* Hillshade overlays */}
            <path d={focusPath} fill="url(#hillshade)" opacity={richEffects ? 0.95 : 0.72} />
            <path d={focusPath} fill="url(#hillshade2)" opacity={richEffects ? 0.82 : 0.55} />
            <path d={focusPath} fill="url(#landGrain)" opacity={richEffects ? 0.35 : 0.12} />

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

          {/* Markers */}
          <g>
            {pts.map(pt => (
              <Marker
                key={pt.place.id}
                pt={pt}
                k={view.k}
                labelMode={pinLabelModes.get(pt.place.id) ?? "hidden"}
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
              />
            ))}
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
      </div>

      {/* Cursor lat/lon readout — imperatively updated via ref on pointer move */}
      <div
        ref={coordLabelRef}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-[2] px-2.5 py-1 rounded-md panel-thin text-[10px] font-mono-num text-frost tracking-wider opacity-0 transition-opacity"
        style={{ transition: "opacity 200ms" }}
      >—</div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[2]">
        <button className="map-btn" onClick={() => zoomBy(1.4)} title="Zoom in (+)" aria-label="Zoom in">＋</button>
        <button className="map-btn" onClick={() => zoomBy(1 / 1.4)} title="Zoom out (−)" aria-label="Zoom out">−</button>
        <button
          className="map-btn !text-[9px]"
          onClick={reset}
          title="Fit every pin in view (keyboard: 0)"
          aria-label="Fit all places in view"
        >
          FIT
        </button>
      </div>

      {/* Tier legend — matches map chrome; hints are plain language (no key-cap styling). */}
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
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-3 left-3 panel-thin px-2 py-1 text-[10px] font-mono-num text-stone pointer-events-none z-[2]">
        ×{view.k.toFixed(2)}
      </div>

      {hoverPlace && tooltipScreen && (
        <AtlasMapTooltip
          place={hoverPlace}
          xPct={tooltipScreen.xPct}
          yPct={tooltipScreen.yPct}
          onHoverCardPointerEnter={cancelHoverClear}
          onHoverCardPointerLeave={scheduleHoverClear}
        />
      )}
    </div>
  );
}

interface MarkerProps {
  pt: { place: Place; x: number; y: number };
  k: number;
  labelMode: MapPinLabelMode;
  isActive: boolean;
  isHover: boolean;
  /** When false, skip pulsing ring animation (older tablets / reduced motion). */
  richEffects: boolean;
  onSelect: (id: string) => void;
  onEnter: () => void;
  onLeave: () => void;
}

const Marker = memo(function Marker({
  pt, k, labelMode, isActive, isHover, richEffects, onSelect, onEnter, onLeave,
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
      onSelect(place.id);
    },
    [onSelect, place.id],
  );

  const stopPan = useCallback((e: React.PointerEvent) => {
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
        {/* Cheap halo (no SVG filter — stacked translucent circles composite far faster) */}
        <circle r={r + 7} fill={color} opacity={0.05} />
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

        {labelMode !== "hidden" ? (
        <g transform={`translate(${r + 6} ${showSub ? 2 : 4})`} pointerEvents="none" className="map-marker-label">
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
        ) : null}
        {/* Hit target on top so touch/stylus picks the marker, not the map pan layer beneath. */}
        <circle r={r + 18} fill="transparent" stroke="none" pointerEvents="all" aria-hidden />
      </g>
    </g>
  );
}, (prev, next) =>
  prev.onSelect === next.onSelect &&
  prev.labelMode === next.labelMode &&
  prev.isActive === next.isActive &&
  prev.isHover === next.isHover &&
  prev.k === next.k &&
  prev.richEffects === next.richEffects &&
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
