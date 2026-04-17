import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoPath, geoAlbers } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, useProse } from "../lib/units";
import type { DistUnit } from "../lib/units";
import { meanJanLow, meanJulyHigh } from "../lib/scoring";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";

import countriesTopoRaw from "world-atlas/countries-110m.json";
import statesTopoRaw from "us-atlas/states-10m.json";

const countriesTopo = countriesTopoRaw as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>;
  land: GeometryCollection;
}>;
const statesTopo = statesTopoRaw as unknown as Topology<{
  states: GeometryCollection<{ name: string }>;
  nation: GeometryCollection;
}>;

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

const MIN_ZOOM = 0.85;
const MAX_ZOOM = 8;

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
 *   - SVG filters are avoided on the marker layer (replaced with stacked
 *     translucent halo circles, which composite far cheaper than a blur).
 */
export function AtlasMap({
  places,
  selectedId,
  onSelect,
  onHover,
  width = 820,
  height = 520,
}: Props) {
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

  // Topology features (decoded once)
  const focusFC = useMemo(() => feature(
    countriesTopo,
    countriesTopo.objects.countries
  ) as unknown as FeatureCollection<Geometry, { name: string }>, []);

  const focusCountries = useMemo(
    () => focusFC.features.filter(f => ["United States of America", "Canada", "Mexico"].includes(f.properties?.name ?? "")),
    [focusFC]
  );
  const otherCountries = useMemo(
    () => focusFC.features.filter(f => !["United States of America", "Canada", "Mexico", "Antarctica"].includes(f.properties?.name ?? "")),
    [focusFC]
  );

  // Mesh borders only (much faster than per-state polygon paths)
  const stateMeshGeo = useMemo(() => mesh(
    statesTopo,
    statesTopo.objects.states,
    (a, b) => a !== b
  ), []);
  const countryBorderMesh = useMemo(() => mesh(
    countriesTopo,
    countriesTopo.objects.countries,
    (a, b) => {
      const an = (a as unknown as { properties?: { name?: string } }).properties?.name;
      const bn = (b as unknown as { properties?: { name?: string } }).properties?.name;
      const focus = ["United States of America", "Canada", "Mexico"];
      return focus.includes(an ?? "") || focus.includes(bn ?? "");
    }
  ), []);

  const focusPath = useMemo(
    () => focusCountries.map(f => pathGen(f) ?? "").join(" "),
    [focusCountries, pathGen]
  );
  const otherPath = useMemo(
    () => otherCountries.map(f => pathGen(f) ?? "").join(" "),
    [otherCountries, pathGen]
  );
  const statePath = useMemo(() => pathGen(stateMeshGeo as never), [stateMeshGeo, pathGen]);
  const countryPath = useMemo(() => pathGen(countryBorderMesh as never), [countryBorderMesh, pathGen]);

  const pts = useMemo(() => {
    const out: { place: Place; x: number; y: number }[] = [];
    for (const p of places) {
      const xy = projection([p.lon, p.lat]);
      if (xy) out.push({ place: p, x: xy[0], y: xy[1] });
    }
    return out;
  }, [places, projection]);

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

  const reset = useCallback(() => setView({ k: 1, x: 0, y: 0 }), []);

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
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[rgba(91,113,144,0.55)] map-shell">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full block select-none atlas-svg"
        style={{ touchAction: "none" }}
        role="img"
        tabIndex={0}
        aria-label="Atlas map of North America. Scroll to zoom, drag to pan, click a marker to open a place."
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerEnter={() => { if (coordLabelRef.current) coordLabelRef.current.style.opacity = "1"; }}
        onPointerLeave={() => {
          onPointerUp();
          setHoverId(null);
          setTooltipScreen(null);
          if (coordLabelRef.current) coordLabelRef.current.style.opacity = "0";
        }}
      >
        <defs>
          {/* Ocean — deep navy with a subtle warmth aloft */}
          <radialGradient id="oceanGrad" cx="60%" cy="32%" r="90%">
            <stop offset="0" stopColor="#1c2a44" />
            <stop offset="0.5" stopColor="#0f1a2c" />
            <stop offset="1" stopColor="#070d18" />
          </radialGradient>

          {/* Land — warm mineral slate (brighter than v1) */}
          <linearGradient id="landGrad" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" stopColor="#42577a" />
            <stop offset="0.55" stopColor="#36476a" />
            <stop offset="1" stopColor="#283b5a" />
          </linearGradient>

          {/* Hillshade-like cross-hatch (very subtle) */}
          <pattern id="hillshade" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(190,212,236,0.06)" strokeWidth="0.5" />
            <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,222,168,0.04)" strokeWidth="0.4" />
          </pattern>
          <pattern id="hillshade2" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)">
            <line x1="0" y1="0" x2="26" y2="0" stroke="rgba(140,200,224,0.045)" strokeWidth="0.4" />
          </pattern>

          {/* Vignette */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="78%">
            <stop offset="0.55" stopColor="rgba(0,0,0,0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>

          {/* Coastline halo (light glow on the seaward side of land) */}
          <filter id="coastalGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>

          {/* Compass rose accent */}
          <radialGradient id="compassFill" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="rgba(241,246,252,0.95)" />
            <stop offset="1" stopColor="rgba(155,178,205,0.55)" />
          </radialGradient>
        </defs>

        {/* Ocean background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#oceanGrad)" />

        {/* Pan/zoom group (mutated directly during drag) */}
        <g ref={transformRef} transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* Distant countries — faint context silhouettes */}
          <path
            d={otherPath}
            fill="rgba(60,75,100,0.32)"
            stroke="rgba(155,178,205,0.18)"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />

          {/* Coastline glow (only on focus countries) */}
          <path
            d={focusPath}
            fill="rgba(140,200,224,0.18)"
            filter="url(#coastalGlow)"
          />

          {/* Focus country fills */}
          <path d={focusPath} fill="url(#landGrad)" />

          {/* Hillshade overlays */}
          <path d={focusPath} fill="url(#hillshade)" opacity="0.85" />
          <path d={focusPath} fill="url(#hillshade2)" opacity="0.7" />

          {/* Graticule (lat/lon grid with edge tick labels) */}
          <Graticule pathGen={pathGen} projection={projection} />

          {/* US state interior borders */}
          <path
            d={statePath ?? undefined}
            fill="none"
            stroke="rgba(170,193,220,0.32)"
            strokeWidth="0.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Country borders */}
          <path
            d={countryPath ?? undefined}
            fill="none"
            stroke="rgba(210,228,245,0.7)"
            strokeWidth="1"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

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
                  fontFamily="Inter"
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
                isActive={pt.place.id === selectedId}
                isHover={pt.place.id === hoverId}
                onSelect={(id) => { if (!dragRef.current.moved) onSelect(id); }}
                onEnter={() => { setHoverId(pt.place.id); updateTooltip(pt); }}
                onLeave={() => { setHoverId(null); setTooltipScreen(null); }}
                showHighTierLabel={view.k >= 1.4}
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
          <text x="0" y="-29" textAnchor="middle" fontSize="9" fill="rgba(241,246,252,0.9)" fontFamily="Inter" fontWeight={700}>N</text>
          <text x="29" y="3"   textAnchor="middle" fontSize="9" fill="rgba(170,193,220,0.8)" fontFamily="Inter" fontWeight={500}>E</text>
          <text x="0" y="37"   textAnchor="middle" fontSize="9" fill="rgba(170,193,220,0.8)" fontFamily="Inter" fontWeight={500}>S</text>
          <text x="-29" y="3"  textAnchor="middle" fontSize="9" fill="rgba(170,193,220,0.8)" fontFamily="Inter" fontWeight={500}>W</text>
        </g>

        {/* Projection credit */}
        <text
          x={width - 14}
          y={height - 12}
          textAnchor="end"
          fontSize="9"
          fill="rgba(165,185,210,0.55)"
          fontFamily="Inter"
          letterSpacing="0.08em"
          pointerEvents="none"
        >ALBERS CONIC · NORTH AMERICA</text>
      </svg>

      {/* Live scale bar — mutates imperatively via refs on zoom / unit flip.
          Shows a round number of miles or kilometres at current zoom. */}
      <div className="absolute bottom-3 left-3 pointer-events-none z-[2] flex flex-col gap-1">
        <div ref={scaleBarRef} className="text-[9px] font-mono-num text-frost tracking-wider">— mi</div>
        <div className="h-[10px] flex items-end gap-0">
          <div ref={scaleBarBarRef} className="h-[6px] border border-[rgba(170,193,220,0.75)] bg-[rgba(13,20,32,0.55)]" style={{ width: 100 }}>
            {/* Two-tone tick bar: 50/50 split filled vs unfilled for visual bite. */}
            <div className="w-1/2 h-full bg-[rgba(230,242,252,0.55)]" />
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
        <button className="map-btn !text-[9px]" onClick={reset} title="Reset view (0)" aria-label="Reset view">RESET</button>
      </div>

      {/* Tier legend + keyboard hints */}
      <div className="absolute bottom-3 right-3 panel-thin px-3 py-2 text-[10px] text-stone space-y-1.5 pointer-events-none z-[2]">
        <div className="flex items-center gap-2">
          <span style={{display:"inline-block",width:10,height:10,transform:"rotate(45deg)",background:"#cfe9f3",border:"1px solid #0a1322"}} />
          <span>Flagship · Tier A</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{display:"inline-block",width:10,height:10,borderRadius:5,background:"#cfe9f3",border:"1px solid #0a1322"}} />
          <span>Spotlight · Tier B</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:"#cfe9f3",opacity:0.9,border:"1px solid #0a1322"}} />
          <span>Index · Tier C</span>
        </div>
        <div className="pt-1.5 mt-1 border-t border-[rgba(71,90,122,0.5)] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-shadow">
          <span className="flex items-center gap-1"><span className="kbd">+</span><span className="kbd">−</span>zoom</span>
          <span className="flex items-center gap-1"><span className="kbd">0</span>reset</span>
          <span className="flex items-center gap-1"><span className="kbd">←↑↓→</span>pan</span>
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-3 left-3 panel-thin px-2 py-1 text-[10px] font-mono-num text-stone pointer-events-none z-[2]">
        ×{view.k.toFixed(2)}
      </div>

      {hoverPlace && tooltipScreen && (
        <MapTooltip place={hoverPlace} xPct={tooltipScreen.xPct} yPct={tooltipScreen.yPct} />
      )}
    </div>
  );
}

interface MarkerProps {
  pt: { place: Place; x: number; y: number };
  k: number;
  isActive: boolean;
  isHover: boolean;
  onSelect: (id: string) => void;
  onEnter: () => void;
  onLeave: () => void;
  showHighTierLabel: boolean;
}

const Marker = memo(function Marker({
  pt, k, isActive, isHover, onSelect, onEnter, onLeave, showHighTierLabel,
}: MarkerProps) {
  const { place, x, y } = pt;
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const color = TONE[tone];

  const baseSize = place.tier === "A" ? 6.5 : place.tier === "B" ? 4.8 : 3.4;
  const r = isActive ? baseSize + 1.6 : isHover ? baseSize + 1 : baseSize;

  const inv = 1 / k;
  const showLabel = isActive || isHover || (place.tier === "A" && showHighTierLabel);
  const labelW = place.name.length * 6.6 + 12;

  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={(e) => { e.stopPropagation(); onSelect(place.id); }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className="map-marker"
      style={{ cursor: "pointer" }}
    >
      <g transform={`scale(${inv})`}>
        {/* Cheap halo (no SVG filter — stacked translucent circles composite far faster) */}
        <circle r={r + 7} fill={color} opacity={0.05} />
        <circle r={r + 4} fill={color} opacity={0.12} />

        {/* Active pulse ring */}
        {isActive && (
          <circle r={r + 10} fill="none" stroke={color} strokeWidth={1.4} opacity={0.75} className="pulse-dot" />
        )}

        {/* Hover ring */}
        {isHover && !isActive && (
          <circle r={r + 5} fill="none" stroke="#f0d29c" strokeWidth={1.1} opacity={0.95} />
        )}

        {/* Tier glyph */}
        {place.tier === "A" ? (
          <g transform="rotate(45)">
            <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={color} stroke="#0a1322" strokeWidth={1.4} rx={0.6} />
            <rect x={-r * 0.42} y={-r * 0.42} width={r * 0.84} height={r * 0.84} fill="rgba(13,20,32,0.42)" />
          </g>
        ) : place.tier === "B" ? (
          <>
            <circle r={r} fill={color} stroke="#0a1322" strokeWidth={1.3} />
            <circle r={r * 0.42} fill="rgba(13,20,32,0.42)" />
          </>
        ) : (
          <circle r={r} fill={color} stroke="#0a1322" strokeWidth={0.9} opacity={0.95} />
        )}

        {showLabel && (
          <g transform={`translate(${r + 5} 4)`} pointerEvents="none">
            <rect
              x={-2}
              y={-11}
              rx={3}
              ry={3}
              width={labelW}
              height={16}
              fill="rgba(13,20,32,0.94)"
              stroke="rgba(170,193,220,0.55)"
              strokeWidth={0.8}
            />
            <text
              x={4}
              y={1}
              fontSize={11}
              fill="#f1f6fc"
              fontFamily="Inter"
              fontWeight={500}
            >{place.name}</text>
          </g>
        )}
      </g>
    </g>
  );
}, (prev, next) =>
  prev.isActive === next.isActive &&
  prev.isHover === next.isHover &&
  prev.k === next.k &&
  prev.showHighTierLabel === next.showHighTierLabel &&
  prev.pt.x === next.pt.x &&
  prev.pt.y === next.pt.y &&
  prev.pt.place === next.pt.place
);

function MapTooltip({ place, xPct, yPct }: { place: Place; xPct: number; yPct: number }) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const julyHigh = meanJulyHigh(place);
  const janLow = meanJanLow(place);
  const annualP = place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);

  const onRight = xPct < 55;
  const onTop = yPct > 55;
  const style: React.CSSProperties = {
    left: `${xPct}%`,
    top: `${yPct}%`,
    transform: `translate(${onRight ? "18px" : "calc(-100% - 18px)"}, ${onTop ? "calc(-100% - 14px)" : "14px"})`,
  };

  return (
    <div
      className="absolute panel w-[280px] p-3 shadow-2xl pointer-events-none anim-fade-in z-10"
      style={{
        ...style,
        borderColor: `var(--color-${tone === "ochre" ? "ochre-500" : tone === "sage" ? "sage-500" : tone === "ember" ? "ember-500" : tone === "aurora" ? "aurora-500" : "glacier-500"})`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-stone">
            {place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index"} ·{" "}
            {place.country === "USA" ? "US" : place.country === "Canada" ? "CA" : "MX"}
          </div>
          <div className="font-atlas text-base text-ice truncate">{place.name}</div>
        </div>
        <span className="chip" data-tone={tone}>
          {ARCHETYPE_BY_ID[place.archetypes[0]]?.label ?? place.archetypes[0]}
        </span>
      </div>
      <div className="text-[11px] text-stone mb-2">
        {place.region} · <span className="font-mono-num">{fmtElev(place.elevationM, dist)}</span> · {place.koppen}
      </div>
      <div className="rounded overflow-hidden mb-2" style={{ filter: "saturate(1.1)" }}>
        <MiniClimateStrip place={place} height={22} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <Metric tone="ochre" label="Jul high" value={fmtTemp(julyHigh, temp)} />
        <Metric tone="glacier" label="Jan low" value={fmtTemp(janLow, temp)} />
        <Metric tone="sage" label="Annual" value={fmtPrecip(annualP, dist)} />
      </div>
      <p className="text-xs text-frost mt-2 leading-snug line-clamp-2">{prose(place.summaryShort)}</p>
      <div className="text-[10px] text-stone italic mt-1.5">Click marker to open full profile →</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  const c: Record<string, string> = {
    ochre: "#f0d29c",
    glacier: "#8cc8e0",
    sage: "#c6dcbd",
  };
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-stone">{label}</span>
      <span className="font-mono-num" style={{ color: c[tone] }}>{value}</span>
    </div>
  );
}

const TONE: Record<string, string> = {
  glacier: "#8cc8e0",
  sage: "#c6dcbd",
  ochre: "#f0d29c",
  ember: "#efb49a",
  ice: "#cfe9f3",
  aurora: "#c7b5ea",
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
 * precision based on zoom-independent intuition: three decimals are about
 * 110 metres of horizontal resolution, which is appropriate at any map zoom
 * level that fits in a browser window.
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

const Graticule = memo(function Graticule({ pathGen, projection }: { pathGen: ReturnType<typeof geoPath>; projection: GeoProjection }) {
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

  return (
    <g>
      {lines.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(170,193,220,0.10)"
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
            fill="rgba(170,193,220,0.45)"
            fontFamily="Inter"
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
            fill="rgba(170,193,220,0.45)"
            fontFamily="Inter"
            letterSpacing="0.05em"
          >{l.text}</text>
        ))}
      </g>
    </g>
  );
});
