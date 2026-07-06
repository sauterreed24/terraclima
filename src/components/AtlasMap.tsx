import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoPath, geoAlbers } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import { Info, Maximize2, Minus, Plus, RotateCw, X } from "lucide-react";
import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useUnits } from "../lib/units";
import { getCachedAtlasTopology, loadAtlasTopology, type AtlasTopology } from "../lib/atlas-map-topology";
import { motionPolicy, useRichVisualEffects } from "../lib/device-profile";
import { fitMapViewToPoints } from "../lib/atlas-map-fit";
import {
  endpointMarkerId,
  isMarkerKeyboardTarget,
  nextMarkerId,
  type AtlasArrowDirection,
  type AtlasMarkerLayoutPoint,
} from "../lib/atlas-map-keyboard";
import {
  firstTwoPointers,
  formatLatLon,
  haversineKm,
  pointerDistance,
  svgPointFromClient,
} from "../lib/atlas-map-geometry";
import {
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  wheelZoomFactor as wheelZoomFactorImpl,
  zoomAtScreenPoint,
} from "../lib/atlas-map-zoom";
import { updateScaleBar } from "../lib/atlas-map-scale-bar";

/** Re-export so existing imports of `wheelZoomFactor` from this component
 *  (notably the dom-test that imports it from "../components/AtlasMap")
 *  keep working unchanged. */
export const wheelZoomFactor = wheelZoomFactorImpl;
import {
  canClusterSeparateAtZoom,
  clusterMapPoints,
  fitMapViewToCluster,
  type AtlasClusterItem,
} from "../lib/atlas-map-cluster";
import { layoutAtlasMapPins } from "../lib/atlas-map-pin-layout";
import { placeMapSecondaryLine, truncateMapTitle } from "../lib/atlas-map-label";
import { computePinLabelModes, type MapPinLabelMode } from "../lib/atlas-map-label-visibility";
import { livedRealityCoverage } from "../lib/livability-score";
import type { LiveFitFilters } from "../lib/live-fit";
import {
  ATLAS_DEFAULT_TOUCH_MODE,
  atlasTouchActionForMode,
  resolveAtlasMapInteractive,
  type AtlasTouchMode,
} from "../lib/atlas-map-touch-gesture";
import { useMediaQuery } from "../hooks/use-media-query";
import { AtlasMapTooltip } from "./AtlasMapTooltip";
import { CLIMATE_NORMALS_PERIOD } from "../lib/atlas-metadata";
import { getPlaceVisualSignature } from "../lib/place-visual-signature";

// Topojson atlas data lives in the `atlas-data` Rollup chunk (~74 kB gz).
// Loading it eagerly would block first paint even though the UI shell
// (ocean, projection math, markers, legend, scale bar, compass) is perfectly
// happy to render without it. Instead we dynamically import both datasets on
// mount — the map appears instantly with markers on a warm ocean, and the
// country / state polygons fade in one frame after the chunk arrives.
interface Props {
  places: Place[];
  selectedId?: string;
  onSelect: (id: string) => void;
  featuredIds?: readonly string[];
  featuredLabel?: string;
  liveFitFilters?: LiveFitFilters;
  onEmptyRecovery?: () => void;
  emptyRecoveryLabel?: string;
  width?: number;
  height?: number;
}

const MOBILE_CLUSTER_RADIUS_PX = 48;
const DESKTOP_CLUSTER_RADIUS_PX = 36;
const MOBILE_CLUSTER_LABEL_ZOOM_CUTOFF = 1.65;
const DESKTOP_CLUSTER_LABEL_ZOOM_CUTOFF = 1.45;
const DESKTOP_MARKER_CULL_ZOOM_CUTOFF = 1.45;
const MOBILE_PIN_MIN_SPACING_PX = 42;
const DESKTOP_PIN_MIN_SPACING_PX = 32;
const MOBILE_PIN_MAX_OFFSET_PX = 34;
const DESKTOP_PIN_MAX_OFFSET_PX = 24;
const CLUSTER_TIER_ORDER: Record<Place["tier"], number> = { A: 0, B: 1, C: 2 };
const CLUSTER_TIER_LABEL: Record<Place["tier"], string> = {
  A: "Flagship",
  B: "Spotlight",
  C: "Index",
};
const CLUSTER_VISUAL_BANDS = [
  { max: 3, band: "small", outerR: 18, innerR: 12.5, fontSize: 12, textY: 4 },
  { max: 8, band: "standard", outerR: 21, innerR: 15, fontSize: 13, textY: 4.5 },
  { max: 24, band: "dense", outerR: 23, innerR: 17, fontSize: 13.5, textY: 5 },
  { max: Number.POSITIVE_INFINITY, band: "mass", outerR: 24, innerR: 18, fontSize: 14, textY: 5 },
] as const;

function clusterVisualForCount(count: number) {
  return CLUSTER_VISUAL_BANDS.find(band => count <= band.max) ?? CLUSTER_VISUAL_BANDS[CLUSTER_VISUAL_BANDS.length - 1];
}

function clusterPlacePreview(points: readonly ClusterPoint[]): string {
  const names = points
    .map(point => point.place.name)
    .filter((name, index, all) => all.indexOf(name) === index);
  if (names.length === 0) return "";
  if (names.length === 1) return ` around ${names[0]}`;
  if (names.length === 2) return ` around ${names[0]} and ${names[1]}`;
  return ` including ${names[0]}, ${names[1]}, and ${names.length - 2} more`;
}

type ClusterPoint = { place: Place; x: number; y: number; id: string };
type RenderedClusterPoint = ClusterPoint & {
  anchorX: number;
  anchorY: number;
  offsetPx: number;
  needsLeader: boolean;
  crowded: boolean;
};
type ClusterPickerSpatialPoint = ClusterPoint & {
  pickerIndex: number;
  keyed: boolean;
  miniX: number;
  miniY: number;
};
type ClusterPickerSummary = {
  description: string;
  tierMixLabel: string;
  coverageMixLabel: string;
};

type ClimateRibbon = {
  id: string;
  d: string;
  color: string;
  width: number;
  opacity: number;
  dash?: string;
};

type AtlasMapReadout = {
  accentRgb: string;
  ariaLabel: string;
  headline: string;
  items: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
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

/** Compact north arrow for the bottom-left cartography cluster. The map is a
 *  fixed north-up Albers projection, so this reads as orientation furniture
 *  (paired with the scale bar) rather than an interactive control. */
function MapCompassGlyph() {
  return (
    <div className="map-compass" aria-hidden>
      <svg viewBox="0 0 40 40" width="40" height="40" focusable="false" role="presentation">
        <circle cx="20" cy="20" r="16.5" fill="rgba(13,20,32,0.78)" stroke="rgba(170,193,220,0.5)" strokeWidth="1" />
        <circle cx="20" cy="20" r="12.5" fill="none" stroke="rgba(170,193,220,0.2)" strokeWidth="0.6" strokeDasharray="2 2.4" />
        {/* East–west crossbar (quiet), then the north–south needle on top. */}
        <path d="M6 20 L20 17.4 L34 20 L20 22.6 Z" fill="rgba(195,228,241,0.26)" />
        <path d="M20 33.5 L22.6 20 L20 20 Z" fill="rgba(158,182,210,0.55)" />
        <path d="M20 7 L22.6 20 L20 20 Z" fill="rgba(247,219,164,0.95)" />
        <path d="M20 7 L17.4 20 L20 20 Z" fill="rgba(255,238,200,0.78)" />
        <circle cx="20" cy="20" r="1.5" fill="rgba(230,242,252,0.92)" />
        <text
          x="20"
          y="6.4"
          textAnchor="middle"
          fontSize="7"
          fontWeight={800}
          fill="rgba(247,237,213,0.98)"
          fontFamily="var(--font-sans),system-ui,sans-serif"
          style={{ paintOrder: "stroke fill", stroke: "rgba(8,14,24,0.92)", strokeWidth: 1.7, strokeLinejoin: "round" }}
        >
          N
        </text>
      </svg>
    </div>
  );
}

function pinLayoutPriority(place: Place, selectedId: string | undefined, featuredRank?: number): number {
  if (place.id === selectedId) return 100;
  if (featuredRank) return 28 - featuredRank;
  const tierPriority = place.tier === "A" ? 8 : place.tier === "B" ? 4 : 1;
  return tierPriority + Math.max(0, 2 - place.name.length / 24);
}

function countByValue<T extends string>(values: readonly T[]): Array<{ value: T; count: number }> {
  const counts = new Map<T, { count: number; firstIndex: number }>();
  values.forEach((value, index) => {
    const current = counts.get(value);
    counts.set(value, current ? { ...current, count: current.count + 1 } : { count: 1, firstIndex: index });
  });
  return [...counts.entries()]
    .map(([value, meta]) => ({ value, count: meta.count, firstIndex: meta.firstIndex }))
    .sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex)
    .map(({ value, count }) => ({ value, count }));
}

function countDetail(count: number, total: number, noun: string): string {
  if (total <= 1) return total === 1 ? `1 ${noun}` : `No ${noun}s`;
  return `${count}/${total} ${noun}${total === 1 ? "" : "s"}`;
}

function compactAtlasLabel(label: string): string {
  return label
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\bSanctuary\b/g, "")
    .replace(/\bBelt\b/g, "")
    .replace(/\bPocket\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAtlasMapReadout({
  places,
  featuredIds,
  featuredLabel,
  clusterCount,
  visiblePinCount,
}: {
  places: readonly Place[];
  featuredIds: readonly string[];
  featuredLabel?: string;
  clusterCount: number;
  visiblePinCount: number;
}): AtlasMapReadout | null {
  if (places.length === 0) return null;

  const placeById = new Map(places.map(place => [place.id, place]));
  const leaders = featuredIds.slice(0, 5).map(id => placeById.get(id)).filter((place): place is Place => Boolean(place));
  const readPlaces = leaders.length > 0 ? leaders : places.slice(0, Math.min(5, places.length));
  const total = readPlaces.length;
  const signatures = readPlaces.map(getPlaceVisualSignature);
  const axisCounts = countByValue(signatures.map(signature => signature.strength.shortLabel));
  const topAxis = axisCounts[0] ?? { value: "Mixed", count: total };
  const driverCounts = countByValue(readPlaces.flatMap(place => place.archetypes[0] ? [place.archetypes[0]] : []));
  const topDriver = driverCounts[0];
  const driverMeta = topDriver ? ARCHETYPE_BY_ID[topDriver.value] : null;
  const leaderLabel = leaders.length > 1
    ? `${leaders.length} linked`
    : leaders.length === 1
      ? "1 leader"
      : `${places.length} pins`;
  const clusterValue = clusterCount > 0
    ? pluralCount(clusterCount, "cluster")
    : pluralCount(visiblePinCount, "open pin");
  const clusterDetail = clusterCount > 0
    ? "Dense areas grouped"
    : "Labels adapt to zoom";
  const driverLabel = driverMeta ? compactAtlasLabel(driverMeta.label) : "Mixed drivers";
  const driverDetail = topDriver ? countDetail(topDriver.count, total, "leader") : "Current field";
  const axisDetail = countDetail(topAxis.count, total, "leader");
  const accent = signatures.find(signature => signature.strength.shortLabel === topAxis.value) ?? signatures[0];
  const lensLabel = featuredLabel ?? (leaders.length > 0 ? "Ranked lens" : "Visible field");
  const headline = leaders[0]
    ? `${leaders[0].name} leads`
    : `${places.length} mapped places`;

  return {
    accentRgb: accent?.mapAccentRgb ?? "94, 196, 220",
    headline,
    ariaLabel: `Current map read. ${leaderLabel} for ${lensLabel}. Main driver ${driverLabel}, ${driverDetail}. Strongest feel signal ${topAxis.value}, ${axisDetail}. ${clusterValue}.`,
    items: [
      { label: "Leaders", value: leaderLabel, detail: lensLabel },
      { label: "Driver", value: driverLabel, detail: driverDetail },
      { label: "Feel", value: `${topAxis.value}-led`, detail: axisDetail },
      { label: "Field", value: clusterValue, detail: clusterDetail },
    ],
  };
}

function linePath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}${rest.map(([x, y]) => ` L ${x.toFixed(1)} ${y.toFixed(1)}`).join("")}`;
}

function smoothTrailPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  if (points.length === 2) return linePath(points);
  const [first] = points;
  let d = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    if (next) {
      const mx = (current[0] + next[0]) / 2;
      const my = (current[1] + next[1]) / 2;
      d += ` Q ${current[0].toFixed(1)} ${current[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    } else {
      d += ` L ${current[0].toFixed(1)} ${current[1].toFixed(1)}`;
    }
  }
  return d;
}

/**
 * North-America microclimate atlas map.
 *
 * Performance:
 *   - Pan is applied directly to the SVG transform via a ref + RAF, so no
 *     React re-renders fire during a drag (markers, borders, etc. stay put).
 *   - Wheel/pinch zoom update the outer SVG transform imperatively during the
 *     gesture; React `view` commits once the gesture ends (~50 ms wheel idle,
 *     pointer-up for pinch). Each pin counter-scales with translate→scale(1/k).
 *   - `data-gesturing` is toggled on the shell via DOM, not React state.
 *   - All geo strokes use vector-effect="non-scaling-stroke" so we don't
 *     have to recompute stroke widths on zoom.
 *   - Markers are React.memo'd; hover uses a compact preview first, rich
 *     card after ~350 ms dwell (keyboard focus skips dwell).
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
export const AtlasMap = memo(function AtlasMap({
  places,
  selectedId,
  onSelect,
  featuredIds = [],
  featuredLabel,
  liveFitFilters,
  onEmptyRecovery,
  emptyRecoveryLabel = "Reset Explorer",
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
  const topoFadeMs = motionPolicy() === "full" ? 420 : 0;
  const borderFadeMs = motionPolicy() === "full" ? 520 : 0;
  const [touchMode, setTouchMode] = useState<AtlasTouchMode>(ATLAS_DEFAULT_TOUCH_MODE);
  const mapInteractive = resolveAtlasMapInteractive({ coarsePointer, touchMode });
  const [legendOpen, setLegendOpen] = useState(false);
  // Roving-tabindex state: which marker currently owns Tab focus. Defaults to
  // null; the first visible marker takes over until the user moves arrows or
  // focuses a different pin. Tracking this in state (not a ref) so memoised
  // Marker children can re-render only the two affected pins on a step.
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);
  // Polite announcement for keyboard pin navigation reaching a top/bottom edge.
  const [navAnnounce, setNavAnnounce] = useState("");

  const shellRef = useRef<HTMLDivElement>(null);
  const setShellGesturing = useCallback((active: boolean) => {
    shellRef.current?.setAttribute("data-gesturing", active ? "true" : "false");
  }, []);
  const legendToggleRef = useRef<HTMLButtonElement>(null);
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
    wheelActiveRef.current = false;
    if (wheelIdleTimerRef.current) {
      clearTimeout(wheelIdleTimerRef.current);
      wheelIdleTimerRef.current = null;
    }
    setShellGesturing(false);
    dragRef.current.active = false;
    dragRef.current.dx = 0;
    dragRef.current.dy = 0;
  }, [mapInteractive, setShellGesturing]);

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
      idleId = ric(commit, { timeout: 90 });
    } else {
      timeoutId = setTimeout(commit, 70);
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
  const hoverIdRef = useRef<string | null>(null);
  hoverIdRef.current = hoverId;
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

  const cancelTooltipDwell = useCallback(() => {
    if (tooltipDwellTimerRef.current) {
      clearTimeout(tooltipDwellTimerRef.current);
      tooltipDwellTimerRef.current = null;
    }
  }, []);

  const scheduleTooltipRich = useCallback(() => {
    cancelTooltipDwell();
    setTooltipVariant("compact");
    tooltipDwellTimerRef.current = setTimeout(() => {
      tooltipDwellTimerRef.current = null;
      setTooltipVariant("full");
    }, 350);
  }, [cancelTooltipDwell]);

  const scheduleHoverClear = useCallback(() => {
    cancelHoverClear();
    cancelTooltipDwell();
    hoverClearTimerRef.current = setTimeout(() => {
      hoverClearTimerRef.current = null;
      setHoverId(null);
      setTooltipScreen(null);
      setTooltipVariant("compact");
    }, 180);
  }, [cancelHoverClear, cancelTooltipDwell]);

  useEffect(() => () => {
    cancelHoverClear();
    cancelTooltipDwell();
  }, [cancelHoverClear, cancelTooltipDwell]);

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
  /** Tracks active wheel zoom for pausing decorative animations. */
  const wheelActiveRef = useRef(false);
  const wheelIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltipVariant, setTooltipVariant] = useState<"compact" | "full">("compact");
  const tooltipDwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // frame after loadAtlasTopology() resolves. If the load fails the map stays usable
  // (pins still work) and surfaces a retry control instead of silently
  // sitting border-less forever.
  const [topo, setTopo] = useState<AtlasTopology | null>(getCachedAtlasTopology);
  const [topoError, setTopoError] = useState(false);
  const [topoRetryNonce, setTopoRetryNonce] = useState(0);

  useEffect(() => {
    if (topo) return;
    let cancelled = false;
    setTopoError(false);
    loadAtlasTopology()
      .then(t => { if (!cancelled) setTopo(t); })
      .catch(() => { if (!cancelled) setTopoError(true); });
    return () => { cancelled = true; };
  }, [topo, topoRetryNonce]);

  const retryTopo = useCallback(() => {
    setTopoError(false);
    setTopoRetryNonce(n => n + 1);
  }, []);

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

  const lastPanSelectionRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!mapMeasured || !selectedId) return;
    if (lastPanSelectionRef.current === selectedId) return;
    const pt = pts.find(p => p.place.id === selectedId);
    if (!pt) return;
    lastPanSelectionRef.current = selectedId;
    setView(
      fitMapViewToPoints(
        [{ x: pt.x, y: pt.y }],
        width,
        height,
        48,
        { minK: MIN_ZOOM, maxK: MAX_ZOOM, inset: 0.14 },
      ),
    );
  }, [selectedId, pts, width, height, mapMeasured]);

  useEffect(() => {
    if (!selectedId) lastPanSelectionRef.current = null;
  }, [selectedId]);

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

  const climateRibbons = useMemo<ClimateRibbon[]>(() => {
    const ribbons: Array<{
      id: string;
      lonLat: Array<[number, number]>;
      color: string;
      width: number;
      opacity: number;
      dash?: string;
    }> = [
      {
        id: "marine-layer",
        lonLat: [[-129, 51], [-126, 47], [-124, 43], [-122, 39], [-120, 35], [-116, 31]],
        color: "rgba(120, 220, 245, 0.68)",
        width: 4.2,
        opacity: 0.34,
        dash: "2 10",
      },
      {
        id: "rocky-rain-shadow",
        lonLat: [[-116, 51], [-113, 46], [-110, 42], [-107, 38], [-105, 34], [-104, 30]],
        color: "rgba(255, 204, 112, 0.72)",
        width: 3.6,
        opacity: 0.3,
        dash: "1 8",
      },
      {
        id: "gulf-moisture",
        lonLat: [[-98, 24], [-93, 29], [-88, 33], [-83, 37], [-77, 41]],
        color: "rgba(143, 217, 154, 0.64)",
        width: 3.2,
        opacity: 0.23,
        dash: "4 12",
      },
      {
        id: "sierra-madre",
        lonLat: [[-108, 31], [-104, 27], [-101, 23], [-98, 19], [-95, 16]],
        color: "rgba(212, 168, 255, 0.68)",
        width: 3.1,
        opacity: 0.25,
        dash: "2 9",
      },
    ];

    return ribbons.flatMap(r => {
      const projected = r.lonLat
        .map(ll => projection(ll))
        .filter((xy): xy is [number, number] => Boolean(xy));
      if (projected.length < 2) return [];
      return [{ ...r, d: linePath(projected) }];
    });
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

  const featuredRankById = useMemo(() => {
    const rankById = new Map<string, number>();
    featuredIds.slice(0, 5).forEach((id, index) => {
      if (!rankById.has(id)) rankById.set(id, index + 1);
    });
    return rankById;
  }, [featuredIds]);

  const featuredTrailPoints = useMemo(() => {
    const pointById = new Map(pts.map(pt => [pt.place.id, pt]));
    return featuredIds.slice(0, 5).flatMap(id => {
      const pt = pointById.get(id);
      return pt ? [{ id, x: pt.x, y: pt.y }] : [];
    });
  }, [featuredIds, pts]);
  const featuredTrailPath = useMemo(
    () => smoothTrailPath(featuredTrailPoints.map(pt => [pt.x, pt.y])),
    [featuredTrailPoints],
  );

  const clusterSourcePoints = useMemo(
    () => pts.map(pt => ({ ...pt, id: pt.place.id })),
    [pts],
  );

  const protectedClusterIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedId) ids.add(selectedId);
    for (const id of featuredRankById.keys()) ids.add(id);
    return ids;
  }, [selectedId, featuredRankById]);

  const clusterRadiusPx = coarsePointer ? MOBILE_CLUSTER_RADIUS_PX : DESKTOP_CLUSTER_RADIUS_PX;
  const clusterZoomCutoff = coarsePointer ? MOBILE_CLUSTER_LABEL_ZOOM_CUTOFF : DESKTOP_CLUSTER_LABEL_ZOOM_CUTOFF;
  const clusterEnabled =
    pts.length > (coarsePointer ? 18 : 90) &&
    (settledView.k < clusterZoomCutoff || (coarsePointer && settledView.k >= MAX_ZOOM * 0.96));
  const renderItems = useMemo(
    () => clusterMapPoints(clusterSourcePoints, {
      enabled: clusterEnabled,
      view: settledView,
      radiusPx: clusterRadiusPx,
      protectedIds: protectedClusterIds,
    }),
    [clusterSourcePoints, clusterEnabled, settledView, clusterRadiusPx, protectedClusterIds],
  );
  const clusterItems = useMemo(
    () => renderItems.filter((item): item is AtlasClusterItem<{ place: Place; x: number; y: number; id: string }> => item.kind === "cluster"),
    [renderItems],
  );
  const markerPointsAll = useMemo(
    () => renderItems.flatMap(item => item.kind === "point" ? [item.point] : []),
    [renderItems],
  );

  // Viewport-cull markers once the user is zoomed in. Below the cutoff,
  // clustering/label modes already reduce visual work. Above it, only a small
  // fraction of the atlas is visible; rendering off-screen markers just costs
  // paint and reconciliation. Always include selected/hovered ids so they
  // survive even when scrolled out of frame.
  const markerPoints = useMemo(() => {
    const cullZoomCutoff = coarsePointer ? MOBILE_CLUSTER_LABEL_ZOOM_CUTOFF : DESKTOP_MARKER_CULL_ZOOM_CUTOFF;
    const minCountForCull = coarsePointer ? 32 : 70;
    if (settledView.k < cullZoomCutoff) return markerPointsAll;
    if (markerPointsAll.length <= minCountForCull) return markerPointsAll;
    const pad = coarsePointer ? 80 : 120;
    const k = settledView.k;
    const minX = (-settledView.x - pad) / k;
    const maxX = (width - settledView.x + pad) / k;
    const minY = (-settledView.y - pad) / k;
    const maxY = (height - settledView.y + pad) / k;
    const currentHoverId = hoverIdRef.current;
    return markerPointsAll.filter(pt => {
      if (pt.place.id === selectedId || pt.place.id === currentHoverId) return true;
      return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
    });
  }, [markerPointsAll, coarsePointer, settledView, width, height, selectedId]);

  const laidOutMarkerPoints = useMemo<RenderedClusterPoint[]>(() => {
    const layout = layoutAtlasMapPins(
      markerPoints.map(pt => ({
        ...pt,
        priority: pinLayoutPriority(pt.place, selectedId, featuredRankById.get(pt.place.id)),
        locked: pt.place.id === selectedId,
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
  }, [markerPoints, settledView, coarsePointer, selectedId, featuredRankById]);

  const pinLabelModes = useMemo(
    () => computePinLabelModes(laidOutMarkerPoints, settledView, selectedId, hoverId, {
      viewportWidth: width,
      viewportHeight: height,
      featuredRankById,
    }),
    [laidOutMarkerPoints, settledView, selectedId, hoverId, width, height, featuredRankById]
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
    const featured: RenderedClusterPoint[] = [];
    let hover: RenderedClusterPoint | null = null;
    let selected: RenderedClusterPoint | null = null;
    for (const pt of laidOutMarkerPoints) {
      if (pt.place.id === selectedId) selected = pt;
      else if (pt.place.id === hoverId) hover = pt;
      else if (featuredRankById.has(pt.place.id)) featured.push(pt);
      else base.push(pt);
    }
    base.push(...featured);
    if (hover) base.push(hover);
    if (selected) base.push(selected);
    return base;
  }, [laidOutMarkerPoints, selectedId, hoverId, featuredRankById]);

  const rankTrailTopMarkerIds = useMemo(() => {
    const ids = new Set(featuredRankById.keys());
    if (selectedId) ids.add(selectedId);
    return ids;
  }, [featuredRankById, selectedId]);
  const baseMarkerRenderOrder = useMemo(
    () => markerRenderOrder.filter(pt => !rankTrailTopMarkerIds.has(pt.place.id)),
    [markerRenderOrder, rankTrailTopMarkerIds],
  );
  const topMarkerRenderOrder = useMemo(
    () => markerRenderOrder.filter(pt => rankTrailTopMarkerIds.has(pt.place.id)),
    [markerRenderOrder, rankTrailTopMarkerIds],
  );
  const rankTrailTone =
    clusterEnabled || (markerPointsAll.length > 75 && settledView.k < 1.18)
      ? "quiet"
      : "full";
  const atlasMapReadout = useMemo(
    () => buildAtlasMapReadout({
      places,
      featuredIds,
      featuredLabel,
      clusterCount: clusterItems.length,
      visiblePinCount: markerPoints.length,
    }),
    [places, featuredIds, featuredLabel, clusterItems.length, markerPoints.length],
  );

  // Roving-tabindex layout points — one per visible marker, in DOM render
  // order, with the post-projection screen coordinates that `nextMarkerId`
  // uses to bucket rows for ArrowUp / ArrowDown. Recomputed when the visible
  // set changes (zoom / pan / filter) or the settled view changes.
  const markerLayoutPoints = useMemo<AtlasMarkerLayoutPoint[]>(() => {
    return markerRenderOrder.map(pt => ({
      id: pt.place.id,
      x: pt.x * settledView.k + settledView.x,
      y: pt.y * settledView.k + settledView.y,
    }));
  }, [markerRenderOrder, settledView]);
  const markerLayoutById = useMemo(() => {
    const map = new Map<string, AtlasMarkerLayoutPoint>();
    for (const p of markerLayoutPoints) map.set(p.id, p);
    return map;
  }, [markerLayoutPoints]);
  // The "effective" focused id — what each Marker compares against to decide
  // whether to render with tabIndex=0. When state is null (initial mount) the
  // first visible marker becomes the keyboard entry point; when state points
  // to a marker that's no longer visible (zoom culled it) we also fall back.
  const effectiveFocusedMarkerId =
    focusedMarkerId && markerLayoutById.has(focusedMarkerId)
      ? focusedMarkerId
      : markerLayoutPoints[0]?.id ?? null;
  const focusMarkerInDom = useCallback((id: string) => {
    const svg = svgRef.current;
    if (!svg) return;
    const el = svg.querySelector<SVGGElement>(`[data-marker-id="${CSS.escape(id)}"]`);
    el?.focus();
  }, []);
  const onMarkerArrow = useCallback(
    (fromId: string, direction: AtlasArrowDirection) => {
      const next = nextMarkerId(fromId, direction, markerLayoutPoints);
      if (!next) return;
      if (next === fromId) {
        // Focus can't move. For Up/Down that means a top/bottom edge — announce
        // it so a keyboard/AT user can tell the edge from a broken control. For
        // Left/Right this only happens with a lone visible pin (they otherwise
        // wrap circularly), where an "edge row" message would be wrong — stay
        // silent there.
        if (direction === "up") setNavAnnounce("Top row of the visible pins.");
        else if (direction === "down") setNavAnnounce("Bottom row of the visible pins.");
        return;
      }
      setNavAnnounce("");
      setFocusedMarkerId(next);
      requestAnimationFrame(() => focusMarkerInDom(next));
    },
    [markerLayoutPoints, focusMarkerInDom],
  );
  const onMarkerHomeEnd = useCallback(
    (position: "home" | "end") => {
      const next = endpointMarkerId(position, markerLayoutPoints);
      if (!next) return;
      setNavAnnounce("");
      setFocusedMarkerId(next);
      requestAnimationFrame(() => focusMarkerInDom(next));
    },
    [markerLayoutPoints, focusMarkerInDom],
  );
  const onMarkerFocusReceived = useCallback((id: string) => {
    setFocusedMarkerId(curr => (curr === id ? curr : id));
  }, []);

  // Markers call `onSelect` directly. Do not gate on `dragRef.moved`: marker
  // `pointerdown` stops propagation so the map never resets `moved` after a
  // pan — using a drag guard here left pins unclickable until full reload.

  const syncShellGesturing = useCallback(() => {
    setShellGesturing(pinchRef.current !== null || wheelActiveRef.current);
  }, [setShellGesturing]);

  const scheduleWheelGestureEnd = useCallback(() => {
    if (wheelIdleTimerRef.current) clearTimeout(wheelIdleTimerRef.current);
    wheelIdleTimerRef.current = setTimeout(() => {
      wheelIdleTimerRef.current = null;
      wheelActiveRef.current = false;
      syncShellGesturing();
    }, 90);
  }, [syncShellGesturing]);

  const markWheelGesture = useCallback(() => {
    wheelActiveRef.current = true;
    syncShellGesturing();
    scheduleWheelGestureEnd();
  }, [syncShellGesturing, scheduleWheelGestureEnd]);

  // DOM transform applier — runs every layout pass so hover/tooltip re-renders
  // never reset an in-flight pan offset. Wheel/pinch commit through setView.
  const applyDOMTransform = useCallback(() => {
    const v = viewRef.current;
    const drag = dragRef.current;
    const x = v.x + (drag.active ? drag.dx : 0);
    const y = v.y + (drag.active ? drag.dy : 0);
    if (transformRef.current) {
      transformRef.current.setAttribute("transform", `translate(${x} ${y}) scale(${v.k})`);
    }
  }, []);

  useLayoutEffect(() => { applyDOMTransform(); });

  // Wheel zoom — RAF-coalesced setView (same reliable path as pre-polish map).
  const wheelRAF = useRef<number>(0);
  const wheelBuf = useRef<{ k: number; mx: number; my: number } | null>(null);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    markWheelGesture();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    const factor = wheelZoomFactor(e.deltaY, e.deltaMode);
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
        setView(v => zoomAtScreenPoint(v, buf.k, buf.mx, buf.my));
      });
    }
  }, [width, height, markWheelGesture]);

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
    if (dx !== 0 || dy !== 0) {
      const next = { ...viewRef.current, x: viewRef.current.x + dx, y: viewRef.current.y + dy };
      viewRef.current = next;
      setView(next);
    }
    dragRef.current.dx = 0;
    dragRef.current.dy = 0;
    applyDOMTransform();
    return moved;
  }, [applyDOMTransform]);

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
    syncShellGesturing();
  }, [width, height, syncShellGesturing]);

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
      syncShellGesturing();
      return true;
    }

    if (activeTouchPointersRef.current.size >= 2) {
      startPinch();
      return true;
    }
    if (activeTouchPointersRef.current.size === 1 && pinchRef.current) {
      const remaining = [...activeTouchPointersRef.current.values()][0];
      pinchRef.current = null;
      syncShellGesturing();
      startDragAt(remaining.clientX, remaining.clientY);
      return true;
    }
    pinchRef.current = null;
    syncShellGesturing();
    return false;
  }, [mapInteractive, startDragAt, startPinch, syncShellGesturing]);

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
    if (!pinchRef.current && activeTouchPointersRef.current.size === 0) {
      syncShellGesturing();
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
          const { x: mx, y: my } = svgPointFromClient(touchTap.clientX, touchTap.clientY, rect, width, height);
          setView(v => zoomAtScreenPoint(v, 1.9, mx, my));
        }
      } else {
        lastTouchTapRef.current = { t: now, clientX: touchTap.clientX, clientY: touchTap.clientY };
      }
    }
  }, [finishDrag, finishTouchPointer, height, mapInteractive, suppressNextTouchActivation, width, syncShellGesturing]);

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

  // Desktop parity with the touch double-tap: double-clicking empty map zooms in
  // ~1.7× centered on the cursor (matches the zoom-in button). Double-clicks that
  // land on a pin or cluster are left to those elements' own activation, and
  // coarse pointers keep using the dedicated double-tap path in onPointerUp.
  const onDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (coarsePointer) return;
    const target = e.target as Element | null;
    if (target?.closest?.('[data-atlas-marker="true"], .map-cluster')) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: mx, y: my } = svgPointFromClient(e.clientX, e.clientY, rect, width, height);
    setView(v => zoomAtScreenPoint(v, 1.7, mx, my));
  }, [coarsePointer, width, height]);

  // Keyboard: +/- to zoom, 0 to reset, arrows pan the map when the SVG
  // itself owns focus. When focus is on a marker, the Marker's own keydown
  // owns arrows for roving-tabindex navigation between pins — bail out
  // early here so we don't both step a pin AND pan the map.
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target !== node && !node.contains(e.target as Node)) return;
      if (isMarkerKeyboardTarget(e.target)) return;
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
    const alreadyAtTouchLimit = coarsePointer && viewRef.current.k >= MAX_ZOOM * 0.94;
    if (alreadyAtTouchLimit || !canClusterSeparateAtZoom(cluster, MAX_ZOOM, clusterRadiusPx * 0.85)) {
      openClusterPicker(cluster);
      return;
    }

    const next = fitMapViewToCluster(cluster, width, height, {
      minK: Math.min(MAX_ZOOM, Math.max(viewRef.current.k * 1.45, MIN_ZOOM)),
      maxK: MAX_ZOOM,
      pad: coarsePointer ? 92 : 72,
      inset: 0.08,
    });

    setClusterPicker(null);
    setView(next);
    // Activating a cluster unmounts the focused cluster <g> as it separates
    // into individual pins. Without this, keyboard/AT users would be dropped to
    // <body> and lose arrow-key map navigation. Returning focus to the map SVG
    // keeps the roving-tabindex context alive (preventScroll avoids a jump).
    svgRef.current?.focus({ preventScroll: true });
  }, [width, height, coarsePointer, clusterRadiusPx, openClusterPicker]);

  const topoLoading = topo === null && !topoError;
  const svgTouchAction = atlasTouchActionForMode(mapInteractive);
  const legendPanelId = coarsePointer ? "tc-map-mobile-legend" : "tc-map-desktop-legend";
  const legendToggleKind = coarsePointer ? "legend" : "key";
  const legendToggleLabel = `${legendOpen ? "Hide" : "Open"} map ${legendToggleKind}`;
  const closeLegend = useCallback(() => {
    setLegendOpen(false);
    window.setTimeout(() => {
      try {
        legendToggleRef.current?.focus({ preventScroll: true });
      } catch {
        legendToggleRef.current?.focus();
      }
    }, 0);
  }, []);
  useEffect(() => {
    if (!legendOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeLegend();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [legendOpen, closeLegend]);
  const mapHasPins = pts.length > 0;
  const canZoomIn = view.k < MAX_ZOOM - 1e-3;
  const canZoomOut = view.k > MIN_ZOOM + 1e-3;
  const zoomInLabel = canZoomIn ? "Zoom in (+)" : "Maximum zoom reached";
  const zoomOutLabel = canZoomOut ? "Zoom out (-)" : "Minimum zoom reached";
  const fitAllLabel = "Fit every pin in view (keyboard: 0)";
  const mapAriaLabel = !mapHasPins
    ? "Atlas map of North America. No places match the current filters or search; adjust them to bring pins back."
    : (coarsePointer
        ? "Atlas map of North America. One-finger drag pans the map; pinch zooms when map mode is active. Use the Scroll page control to let the browser scroll past the map. Tap any pin to open that place's full profile."
        : "Atlas map of North America. Scroll to zoom, drag to pan, double-click to zoom in. Click any pin to open that place's full profile.") +
      (featuredTrailPoints.length > 1 ? " Gold trail connects the current top-ranked places." : "");
  const renderMarker = (pt: RenderedClusterPoint) => {
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
        featuredRank={featuredRankById.get(pt.place.id)}
        richEffects={richEffects}
        isRovingFocused={pt.place.id === effectiveFocusedMarkerId}
        onSelect={onSelect}
        onEnter={() => {
          cancelHoverClear();
          setHoverId(pt.place.id);
          scheduleTooltipRich();
          updateTooltip({ x: pt.anchorX, y: pt.anchorY });
        }}
        onFocusEnter={() => {
          cancelHoverClear();
          setHoverId(pt.place.id);
          scheduleTooltipRich();
          updateTooltip({ x: pt.anchorX, y: pt.anchorY });
        }}
        onLeave={scheduleHoverClear}
        shouldSuppressTouchActivation={shouldSuppressTouchActivation}
        onArrow={onMarkerArrow}
        onHomeEnd={onMarkerHomeEnd}
        onFocusReceived={onMarkerFocusReceived}
      />
    );
  };

  return (
    <div
      ref={shellRef}
      className="relative w-full h-full rounded-2xl overflow-hidden border border-[rgba(91,113,144,0.55)] map-shell"
      data-legend-open={legendOpen ? "true" : "false"}
      data-gesturing="false"
    >
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{navAnnounce}</div>
      {topoLoading ? (
        <div
          className="tc-map-topology-loading"
          role="status"
          aria-live="polite"
        >
          Loading country & state outlines…
        </div>
      ) : null}
      {!topoLoading && !mapHasPins ? (
        <div
          className="tc-map-empty-overlay absolute inset-0 z-[3] flex items-center justify-center p-4 pointer-events-none"
          role="status"
        >
          <div className="tc-map-empty-overlay__card pointer-events-auto">
            <p className="tc-map-empty-overlay__title">No places on the map</p>
            <p className="tc-map-empty-overlay__hint">Nothing matches the current filters or search. Loosen one control to bring the atlas back.</p>
            {onEmptyRecovery ? (
              <button
                type="button"
                className="tc-map-empty-overlay__action"
                onClick={onEmptyRecovery}
              >
                {emptyRecoveryLabel}
              </button>
            ) : null}
          </div>
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
        role="application"
        aria-roledescription="Interactive map"
        tabIndex={0}
        aria-label={mapAriaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onPointerEnter={() => { if (coordLabelRef.current) coordLabelRef.current.style.opacity = "1"; }}
        onPointerLeave={(e) => {
          // Ignore leave events when the pointer moves onto a marker or other
          // descendant — only finish when the cursor exits the SVG entirely.
          const related = e.relatedTarget as Node | null;
          if (related && e.currentTarget.contains(related)) {
            if (coordLabelRef.current) coordLabelRef.current.style.opacity = "0";
            return;
          }
          // DOM updates during drag (hover cards, featured halos) can synthesize
          // leave events; keep the in-flight pan offset until pointerup.
          if (dragRef.current.active || activeTouchPointersRef.current.size > 0) return;
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
          <pattern id="oceanContours" width="104" height="76" patternUnits="userSpaceOnUse">
            <path
              d="M-24 42 C 8 18, 36 18, 64 38 S 118 54, 136 28"
              fill="none"
              stroke="rgba(174, 211, 236, 0.14)"
              strokeWidth="0.75"
            />
            <path
              d="M-18 65 C 14 42, 46 44, 78 62 S 126 76, 146 48"
              fill="none"
              stroke="rgba(240, 210, 156, 0.08)"
              strokeWidth="0.55"
            />
          </pattern>

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
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#oceanContours)"
          opacity={richEffects ? 0.62 : 0.32}
          pointerEvents="none"
        />

        {/* Pan/zoom group (mutated directly during drag).
            `will-change: transform` hints the browser to promote this
            subtree onto its own compositor layer so pan/zoom are pure GPU
            operations — no repaint of the country paths per frame. */}
        <g
          ref={transformRef}
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
              transition: topoFadeMs
                ? `opacity ${topoFadeMs}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
                : "none",
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

            <g className="map-signal-ribbons" pointerEvents="none" aria-hidden>
              {climateRibbons.map(ribbon => (
                <path
                  key={ribbon.id}
                  d={ribbon.d}
                  fill="none"
                  stroke={ribbon.color}
                  strokeWidth={ribbon.width}
                  strokeDasharray={ribbon.dash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={richEffects ? ribbon.opacity : ribbon.opacity * 0.55}
                />
              ))}
            </g>
          </g>

          {/* Graticule (lat/lon grid with edge tick labels) */}
          <Graticule pathGen={pathGen} projection={projection} richEffects={richEffects} />

          {/* Borders — also fade with the cartography group */}
          <g
            style={{
              opacity: topo ? 1 : 0,
              transition: borderFadeMs
                ? `opacity ${borderFadeMs}ms cubic-bezier(0.2, 0.8, 0.2, 1) 80ms`
                : "none",
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

          {/* Base pins first; the ranked trail then reads above the field without covering top-ranked / active pins. */}
          <g>
            {baseMarkerRenderOrder.map(renderMarker)}
          </g>

          {featuredTrailPath ? (
            <g className="map-rank-trail" data-tone={rankTrailTone} pointerEvents="none" aria-hidden>
              <path
                className="map-rank-trail__glow"
                d={featuredTrailPath}
                fill="none"
                stroke="rgba(255, 190, 92, 0.18)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="map-rank-trail__line"
                d={featuredTrailPath}
                fill="none"
                stroke="rgba(255, 225, 166, 0.78)"
                strokeWidth="2.2"
                strokeDasharray="7 9"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {richEffects ? (
                <path
                  className="map-rank-trail__pulse"
                  d={featuredTrailPath}
                  fill="none"
                  stroke="rgba(255, 250, 220, 0.92)"
                  strokeWidth="1.15"
                  strokeDasharray="1 18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {featuredTrailPoints.map(pt => (
                <circle
                  key={`rank-node-${pt.id}`}
                  className="map-rank-trail__node"
                  cx={pt.x}
                  cy={pt.y}
                  r={3.1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ) : null}

          {/* Visual-only pin offsets keep dense touch targets usable while leader lines preserve exact geography. */}
          <g className="map-pin-leaders" pointerEvents="none" aria-hidden>
            {markerRenderOrder.filter(pt => pt.needsLeader).map(pt => (
              <g key={`leader-${pt.place.id}`} className="map-pin-leader">
                <line
                  className="map-pin-leader__line"
                  x1={pt.anchorX}
                  y1={pt.anchorY}
                  x2={pt.x}
                  y2={pt.y}
                  stroke={pt.crowded ? "rgba(255,214,128,0.82)" : "rgba(220,235,248,0.68)"}
                  strokeWidth="1.35"
                  strokeDasharray={pt.crowded ? "3 2.5" : "none"}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  className="map-pin-leader__anchor"
                  cx={pt.anchorX}
                  cy={pt.anchorY}
                  r={Math.max(0.85, 2.4 / view.k)}
                  fill="rgba(245,250,255,0.92)"
                  stroke="rgba(8,14,24,0.94)"
                  strokeWidth="0.85"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>

          {/* Ranked, hovered, and selected pins stay above the trail for clear hit targets and badges. */}
          <g>
            {topMarkerRenderOrder.map(renderMarker)}
          </g>
        </g>

        {/* Vignette (above geometry, below UI) */}
        <rect x="0" y="0" width={width} height={height} fill="url(#vignette)" pointerEvents="none" />

        {/* The compass + scale + zoom readout used to float in two opposite
            corners (and the compass overlapped the zoom controls). They now live
            together in one bottom-left cartography cluster — see `map-scale-stack`
            below — keeping the top-right and bottom-right corners clear. The
            projection credit moved into the on-demand map key. */}
      </svg>

      {/* Bottom-left cartography cluster — north arrow + scale bar grouped as one
          widget so the busy corners above stay clear. The north arrow is desktop
          only; coarse pointers keep just the scale bar plus the compact Key
          access. (The scale bar reports real distance, so a raw zoom multiplier
          would be redundant — we deliberately don't show one.) */}
      <div className="map-scale-stack absolute bottom-3 left-3 z-[3] flex flex-col items-start gap-2 pointer-events-none max-w-[min(calc(100vw-8rem),22rem)]">
        <div className="map-cartography-cluster">
          {!coarsePointer ? <MapCompassGlyph /> : null}
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
        </div>
        {coarsePointer ? (
          <button
            ref={legendToggleRef}
            type="button"
            className="map-control-pill map-key-toggle pointer-events-auto"
            aria-expanded={legendOpen}
            aria-controls={legendPanelId}
            aria-label={legendToggleLabel}
            title={legendToggleLabel}
            onClick={() => setLegendOpen(v => !v)}
          >
            <Info className="w-3.5 h-3.5" aria-hidden />
            <span>Key</span>
          </button>
        ) : null}
      </div>

      {atlasMapReadout ? (
        <aside
          className="map-atlas-readout map-chrome-panel"
          aria-label="Current map read"
          style={{ ["--map-readout-rgb" as string]: atlasMapReadout.accentRgb }}
        >
          <div className="map-atlas-readout__head">
            <span>Atlas read</span>
            <strong title={atlasMapReadout.headline}>{atlasMapReadout.headline}</strong>
          </div>
          <dl className="map-atlas-readout__grid" aria-label={atlasMapReadout.ariaLabel}>
            {atlasMapReadout.items.map(item => (
              <div key={item.label} className="map-atlas-readout__item">
                <dt>{item.label}</dt>
                <dd>{item.value}<span>{item.detail}</span></dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}

      {/* Cursor lat/lon readout — imperatively updated via ref on pointer move.
          Hidden on coarse pointers (touch never hovers usefully). */}
      {!coarsePointer ? (
        <div
          ref={coordLabelRef}
          className="tc-map-coord-readout absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-[2] opacity-0 transition-opacity"
        >—</div>
      ) : null}

      {/* Zoom + interaction controls — all map-control affordances grouped in the
          top-right column. On coarse pointers the touch-mode toggle leads the
          stack (it used to float top-left, hidden behind the title caption). */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-[3]">
        {coarsePointer ? (
          <button
            type="button"
            className="map-control-pill map-touch-mode-toggle pointer-events-auto"
            aria-pressed={mapInteractive}
            aria-label={mapInteractive ? "Switch map to page scrolling" : "Switch map to direct interaction"}
            title={mapInteractive ? "Let page scroll gestures pass through the map" : "Use one-finger pan and pinch zoom on the map"}
            onClick={() => setTouchMode(mode => mode === "map" ? "page" : "map")}
          >
            {mapInteractive ? "Scroll page" : "Use map"}
          </button>
        ) : null}
        <button type="button" className="map-btn" data-map-control="zoom-in" data-map-target="comfortable" onClick={() => zoomBy(1.7)} disabled={!canZoomIn} title={zoomInLabel} aria-label={zoomInLabel}>
          <Plus className="w-4 h-4" aria-hidden />
        </button>
        <button type="button" className="map-btn" data-map-control="zoom-out" data-map-target="comfortable" onClick={() => zoomBy(1 / 1.7)} disabled={!canZoomOut} title={zoomOutLabel} aria-label={zoomOutLabel}>
          <Minus className="w-4 h-4" aria-hidden />
        </button>
        <button
          type="button"
          className="map-btn"
          data-map-control="fit-all"
          data-map-target="comfortable"
          onClick={reset}
          title={fitAllLabel}
          aria-label={fitAllLabel}
        >
          <Maximize2 className="w-3.5 h-3.5" aria-hidden />
        </button>
        {topoError && !topo ? (
          <button
            type="button"
            className="map-btn"
            data-map-control="retry-borders"
            data-map-target="comfortable"
            onClick={retryTopo}
            title="Map borders failed to load — retry"
            aria-label="Retry loading map borders"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Map key — tucked above the button so it does not sit on the atlas by default. */}
      {!coarsePointer ? (
        <div className="map-key-dock absolute bottom-3 right-3 z-[4] pointer-events-auto">
          <button
            ref={legendToggleRef}
            type="button"
            className="map-control-pill map-key-toggle"
            aria-expanded={legendOpen}
            aria-controls={legendPanelId}
            aria-label={legendToggleLabel}
            title={legendToggleLabel}
            onClick={() => setLegendOpen(v => !v)}
          >
            <Info className="w-3.5 h-3.5" aria-hidden />
            <span>Key</span>
          </button>
        </div>
      ) : null}

      {!coarsePointer && legendOpen ? (
      <div
        role="group"
        id={legendPanelId}
        aria-label="Map key"
        className="map-key-popover map-chrome-panel absolute bottom-16 right-3 z-[4] max-w-[18.5rem] px-3 py-2.5 pointer-events-auto text-[10px] leading-relaxed space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[9px] uppercase tracking-wider text-[rgba(236,244,252,0.72)]">Map key</div>
          <button type="button" className="map-legend-close" onClick={closeLegend} aria-label="Close map key" title="Close map key">
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
        <div className="grid gap-2 border-t border-[rgba(140,200,224,0.22)] pt-2 text-[11px] leading-relaxed">
          <MapLegendDot color="#ffc860" label="Orographic / orchard / chinook" />
          <MapLegendDot color="#8fd99a" label="Highland / sky-island / cloud" />
          <MapLegendDot color="#6ec8ea" label="Maritime / fog / rain-shadow" />
          <MapLegendDot color="#d4a8ff" label="Rare / sky-island / aurora" />
        </div>
        <div className="text-[9px] uppercase tracking-wider text-[rgba(236,244,252,0.72)]">Aura language</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] leading-relaxed">
          <MapLegendDot color="#5ec4dc" label="Comfort" />
          <MapLegendDot color="#67b96f" label="Ease" />
          <MapLegendDot color="#e3a63b" label="Identity" />
          <MapLegendDot color="#ad8cff" label="Clarity" />
        </div>
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
        <details className="map-key-notes">
          <summary>Usage notes</summary>
          <div className="map-key-notes__body">
            <p>Click a pin to open its sheet. Scroll or double-click to zoom, use + / − or Fit (the 0 key) to frame every pin, and drag to pan.</p>
            <p>Names auto-hide when crowded: at most one label per map cell (tier wins ties). Zoom in or hover for full text.</p>
            <p>Gold halos and the connecting trail mark the current top-ranked leaders, matching the rank strip and cards.</p>
            <p>Thin colored aura: strongest place-feel signal, matching the card signature band.</p>
            <p>
              Pale ring: <span className="text-[rgba(255,236,210,0.95)]">US</span>
              {" · "}
              <span className="text-[rgba(190,230,255,0.95)]">Canada</span>
              {" · "}
              <span className="text-[rgba(255,220,150,0.95)]">Mexico</span>
              {" "}— fill stays the climate driver.
            </p>
            <p>Geospatial numbers are atlas screening analytics (terrain + climate + reference EO design goals). They are not live Sentinel, Landsat, or lidar products.</p>
            <p>Chart numbers in each profile use the cited normals or blends; WMO 30-year windows are often {CLIMATE_NORMALS_PERIOD} when a period is named.</p>
            <p className="map-key-notes__credit">Projection: Albers equal-area conic, centered on North America (north is up).</p>
          </div>
        </details>
      </div>
      ) : null}

      {coarsePointer && legendOpen ? (
        <div
          id="tc-map-mobile-legend"
          role="dialog"
          aria-modal="true"
          aria-label="Map legend"
          className="map-mobile-legend map-chrome-panel"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wider text-[rgba(236,244,252,0.72)]">Map legend</div>
            <button type="button" className="map-legend-close" onClick={closeLegend} aria-label="Close map legend" title="Close map legend">
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
          <div className="grid gap-2 text-[11px] leading-relaxed">
            <MapLegendDot color="#ffc860" label="Orographic / orchard / chinook" />
            <MapLegendDot color="#8fd99a" label="Highland / sky-island / cloud" />
            <MapLegendDot color="#6ec8ea" label="Maritime / fog / rain-shadow" />
            <MapLegendDot color="#d4a8ff" label="Rare / sky-island / aurora" />
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-[rgba(140,200,224,0.24)] pt-2 text-[10px] leading-relaxed">
            <MapLegendDot color="#5ec4dc" label="Comfort aura" />
            <MapLegendDot color="#67b96f" label="Ease aura" />
            <MapLegendDot color="#e3a63b" label="Identity aura" />
            <MapLegendDot color="#ad8cff" label="Clarity aura" />
          </div>
          <div className="grid gap-1.5 border-t border-[rgba(140,200,224,0.24)] pt-2 text-[10px] text-[rgba(245,250,255,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
            <div>Diamond: flagship. Square: spotlight. Open ring: index.</div>
            <div>Gold halos and route line mark the current top-ranked leaders.</div>
            <div>Thin colored aura marks each place's strongest feel signal.</div>
            <div>Pale outer ring: US, Canada, or Mexico. Fill color stays the climate driver.</div>
            <div>Clusters show nearby pins. Tap one to zoom; tightly overlapping groups open a picker.</div>
            <div className="map-key-notes__credit">Projection: Albers equal-area conic, centered on North America (north is up).</div>
          </div>
        </div>
      ) : null}

      {clusterPicker ? (
        <ClusterPicker
          cluster={clusterPicker.cluster}
          xPct={clusterPicker.xPct}
          yPct={clusterPicker.yPct}
          mapHeight={height}
          featuredRankById={featuredRankById}
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
          mapWidth={width}
          featuredRank={featuredRankById.get(hoverPlace.id)}
          featuredLabel={featuredLabel}
          liveFitFilters={liveFitFilters}
          variant={tooltipVariant}
        />
      )}
    </div>
  );
});

interface MarkerProps {
  pt: RenderedClusterPoint;
  k: number;
  labelMode: MapPinLabelMode;
  /** Side of the pin to draw the label on. Flips to "left" when the marker
   * sits in the right band of the visible viewport so the label never clips
   * past the SVG edge at high zoom. */
  labelSide: "left" | "right";
  isActive: boolean;
  isHover: boolean;
  featuredRank?: number;
  /** When false, skip pulsing ring animation (older tablets / reduced motion). */
  richEffects: boolean;
  /** Roving-tabindex: true when this is the marker that currently owns
   * Tab focus among all visible markers. */
  isRovingFocused: boolean;
  onSelect: (id: string) => void;
  onEnter: () => void;
  onFocusEnter: () => void;
  onLeave: () => void;
  shouldSuppressTouchActivation: () => boolean;
  /** Arrow-key step within the visible marker set. */
  onArrow: (id: string, direction: AtlasArrowDirection) => void;
  /** Home / End jump within the visible marker set. */
  onHomeEnd: (position: "home" | "end") => void;
  /** Notify parent when this marker receives focus (click, Tab) so the
   * roving state stays in sync with the actual DOM focus owner. */
  onFocusReceived: (id: string) => void;
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
  const visual = clusterVisualForCount(count);
  const label = `${count} nearby microclimates${clusterPlacePreview(cluster.points)}. Zoom or choose from this cluster.`;
  const labelFontSize = count >= 100 ? Math.max(11.5, visual.fontSize - 1.5) : visual.fontSize;
  const activate = useCallback((e: React.SyntheticEvent<SVGGElement>) => {
    e.stopPropagation();
    if (shouldSuppressTouchActivation()) return;
    e.currentTarget.focus({ preventScroll: true });
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
      aria-label={label}
      className="map-cluster"
      onPointerDown={stopPan}
      onClick={activate}
      onKeyDown={onKeyDown}
      data-cluster-size={visual.band}
    >
      <title>{label}</title>
      <g transform={`scale(${inv})`}>
        <circle
          className="map-cluster__outer"
          r={visual.outerR}
          fill="rgba(8,14,24,0.88)"
          stroke="rgba(245,250,255,0.86)"
          strokeWidth="1.35"
        />
        <circle
          className="map-cluster__inner"
          r={visual.innerR}
          fill="rgba(94,196,220,0.3)"
          stroke="rgba(94,196,220,0.72)"
          strokeWidth="1.05"
        />
        <text
          textAnchor="middle"
          y={visual.textY}
          fontSize={labelFontSize}
          fontFamily="var(--font-mono),ui-monospace,monospace"
          fontWeight={700}
          fill="rgba(245,250,255,0.98)"
          style={{ paintOrder: "stroke fill", stroke: "rgba(6,10,18,0.9)", strokeWidth: 2, strokeLinejoin: "round" }}
        >
          {count}
        </text>
        <circle className="map-cluster__hit-area" r="30" fill="transparent" stroke="none" pointerEvents="all" aria-hidden />
      </g>
    </g>
  );
});

function clusterPickerCoverageLabel(place: Place): string {
  const coverage = livedRealityCoverage(place);
  if (coverage.confidence === "source-backed") {
    return coverage.sourceCount >= 2 ? `${coverage.sourceCount} lived sources` : "Source-backed lived read";
  }
  if (coverage.confidence === "partial") return "Partial lived read";
  return "Lived read pending";
}

function compareClusterPickerPoints(
  a: ClusterPoint,
  b: ClusterPoint,
  featuredRankById: ReadonlyMap<string, number>,
) {
  const aRank = featuredRankById.get(a.place.id) ?? Number.POSITIVE_INFINITY;
  const bRank = featuredRankById.get(b.place.id) ?? Number.POSITIVE_INFINITY;
  if (aRank !== bRank) return aRank - bRank;

  const tierDelta = CLUSTER_TIER_ORDER[a.place.tier] - CLUSTER_TIER_ORDER[b.place.tier];
  if (tierDelta !== 0) return tierDelta;

  const nameDelta = a.place.name.localeCompare(b.place.name);
  if (nameDelta !== 0) return nameDelta;

  return a.place.id.localeCompare(b.place.id);
}

function pluralCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function summarizeClusterPicker(points: readonly ClusterPoint[]): ClusterPickerSummary {
  const tierCounts: Record<Place["tier"], number> = { A: 0, B: 0, C: 0 };
  const coverageCounts = { sourceBacked: 0, partial: 0, unrated: 0 };

  for (const pt of points) {
    tierCounts[pt.place.tier] += 1;
    const coverage = livedRealityCoverage(pt.place);
    if (coverage.confidence === "source-backed") coverageCounts.sourceBacked += 1;
    else if (coverage.confidence === "partial") coverageCounts.partial += 1;
    else coverageCounts.unrated += 1;
  }

  const tierParts = [
    tierCounts.A > 0 ? pluralCount(tierCounts.A, "flagship") : null,
    tierCounts.B > 0 ? pluralCount(tierCounts.B, "spotlight") : null,
    tierCounts.C > 0 ? pluralCount(tierCounts.C, "index", "index") : null,
  ].filter((part): part is string => Boolean(part));

  const coverageParts = [
    coverageCounts.sourceBacked > 0 ? pluralCount(coverageCounts.sourceBacked, "source-backed", "source-backed") : null,
    coverageCounts.partial > 0 ? pluralCount(coverageCounts.partial, "partial", "partial") : null,
    coverageCounts.unrated > 0 ? pluralCount(coverageCounts.unrated, "pending", "pending") : null,
  ].filter((part): part is string => Boolean(part));

  const tierMixLabel = tierParts.join(" / ");
  const coverageMixLabel = coverageParts.join(" / ");
  const description = `${pluralCount(points.length, "nearby pin")}. Sorted by featured rank, tier, then name.`;

  return { description, tierMixLabel, coverageMixLabel };
}

function clusterPickerMiniPoints(points: readonly ClusterPoint[]): ClusterPickerSpatialPoint[] {
  if (points.length === 0) return [];
  const keyedLimit = points.length > 24 ? 12 : points.length;

  const xs = points.map(pt => pt.x);
  const ys = points.map(pt => pt.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spreadX = maxX - minX;
  const spreadY = maxY - minY;

  if (spreadX < 1.2 && spreadY < 1.2) {
    const count = points.length;
    return points.map((pt, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      const radius = count > 12 ? (index % 2 === 0 ? 34 : 22) : count > 5 ? 30 : 24;
      return {
        ...pt,
        pickerIndex: index + 1,
        keyed: index < keyedLimit,
        miniX: 50 + Math.cos(angle) * radius,
        miniY: 50 + Math.sin(angle) * radius,
      };
    });
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const scale = 76 / Math.max(spreadX, spreadY, 1);
  return points.map((pt, index) => ({
    ...pt,
    pickerIndex: index + 1,
    keyed: index < keyedLimit,
    miniX: Math.max(10, Math.min(90, 50 + (pt.x - centerX) * scale)),
    miniY: Math.max(10, Math.min(90, 50 + (pt.y - centerY) * scale)),
  }));
}

const ClusterPicker = memo(function ClusterPicker({
  cluster,
  xPct,
  yPct,
  mapHeight,
  featuredRankById,
  onClose,
  onSelect,
}: {
  cluster: AtlasClusterItem<ClusterPoint>;
  xPct: number;
  yPct: number;
  mapHeight: number;
  featuredRankById: ReadonlyMap<string, number>;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const onRight = xPct < 52;
  const pickerInsetPx = 12;
  const maxPickerHeightPx = Math.min(520, Math.max(280, mapHeight - pickerInsetPx * 2));
  const anchorY = (yPct / 100) * mapHeight;
  const topPx = Math.max(
    pickerInsetPx,
    Math.min(anchorY + 10, mapHeight - maxPickerHeightPx - pickerInsetPx),
  );
  const listMaxHeightPx = Math.max(84, maxPickerHeightPx - 270);
  const pickerStyle = {
    left: `${xPct}%`,
    top: `${topPx}px`,
    "--cluster-picker-max-height": `${maxPickerHeightPx}px`,
    "--cluster-picker-list-max-height": `${listMaxHeightPx}px`,
    transform: `translateX(${onRight ? "12px" : "calc(-100% - 12px)"})`,
  } as React.CSSProperties;
  const sortedPoints = useMemo(
    () => cluster.points.slice().sort((a, b) => compareClusterPickerPoints(a, b, featuredRankById)),
    [cluster.points, featuredRankById],
  );
  const summary = useMemo(() => summarizeClusterPicker(sortedPoints), [sortedPoints]);
  const spatialPoints = useMemo(() => clusterPickerMiniPoints(sortedPoints), [sortedPoints]);
  const keyedCount = spatialPoints.reduce((count, pt) => count + (pt.keyed ? 1 : 0), 0);
  const spatialCountLabel =
    keyedCount < cluster.points.length ? `${cluster.points.length} pins · ${keyedCount} keyed` : `${cluster.points.length} pins separated`;
  const descriptionId = `cluster-picker-summary-${Math.round(xPct * 100)}-${Math.round(yPct * 100)}-${cluster.points.length}`;

  // Trap Tab focus inside the picker and restore focus to the cluster trigger
  // (the pin that opened the picker) on teardown, so keyboard users don't lose
  // their place on the map.
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(panelRef, true, true);

  useEffect(() => {
    // Move keyboard focus into the picker on open so Tab and Escape both work
    // immediately. The close button is the safest landing — auto-focusing the
    // first place option would auto-trigger on Enter for users who pressed
    // Escape but had momentary keyboard latency.
    closeBtnRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // Local Escape handler — the global keyboard-shortcut hook does not know
    // about the cluster picker (it lives inside the map, not the app shell),
    // so we close it locally. Capture phase ensures we run before the global
    // handler when both could fire (e.g. with a focused search input).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a microclimate from this cluster"
      aria-describedby={descriptionId}
      className="cluster-picker map-chrome-panel"
      style={pickerStyle}
    >
      <div className="cluster-picker__head">
        <div className="cluster-picker__head-copy">
          <div className="cluster-picker__eyebrow">
            {pluralCount(cluster.points.length, "nearby pin")}
          </div>
          <div id={descriptionId} className="cluster-picker__sort">{summary.description}</div>
        </div>
        <button ref={closeBtnRef} type="button" className="map-legend-close" onClick={onClose} aria-label="Close cluster picker" title="Close cluster picker">
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
      <div className="cluster-picker__summary-grid" aria-label="Cluster summary">
        <span className="cluster-picker__summary-pill">
          <span className="cluster-picker__summary-label">Tier mix</span>
          <span className="cluster-picker__summary-value">{summary.tierMixLabel}</span>
        </span>
        <span className="cluster-picker__summary-pill">
          <span className="cluster-picker__summary-label">Lived read</span>
          <span className="cluster-picker__summary-value">{summary.coverageMixLabel}</span>
        </span>
      </div>
      <div className="cluster-picker__spatial" aria-label="Cluster location key">
        <div className="cluster-picker__mini-map" aria-hidden="true">
          <span className="cluster-picker__mini-center" />
          {spatialPoints.map(pt => (
            <span
              key={pt.place.id}
              className="cluster-picker__mini-pin"
              data-tier={pt.place.tier}
              data-keyed={pt.keyed ? "true" : "false"}
              style={{ left: `${pt.miniX}%`, top: `${pt.miniY}%` }}
            >
              {pt.keyed ? pt.pickerIndex : ""}
            </span>
          ))}
        </div>
        <div className="cluster-picker__spatial-copy">
          <span className="cluster-picker__spatial-label">Location key</span>
          <span className="cluster-picker__spatial-count">{spatialCountLabel}</span>
        </div>
      </div>
      <div className="cluster-picker__list">
        {spatialPoints.map(pt => {
          const rank = featuredRankById.get(pt.place.id);
          const tierLabel = rank
            ? `#${rank} ${CLUSTER_TIER_LABEL[pt.place.tier]}`
            : CLUSTER_TIER_LABEL[pt.place.tier];
          const coverage = livedRealityCoverage(pt.place);
          const coverageLabel = clusterPickerCoverageLabel(pt.place);
          return (
            <button
              key={pt.place.id}
              type="button"
              className="cluster-picker__item"
              aria-label={`Open ${pt.place.name}. Position ${pt.pickerIndex}. ${tierLabel}. ${coverageLabel}.`}
              onClick={() => onSelect(pt.place.id)}
            >
              <span className="cluster-picker__item-head">
                <span className="cluster-picker__title-row">
                  <span className="cluster-picker__index" aria-hidden="true">{pt.pickerIndex}</span>
                  <span className="cluster-picker__title">{pt.place.name}</span>
                </span>
                <span className="cluster-picker__tier">{tierLabel}</span>
              </span>
              <span className="cluster-picker__secondary">{placeMapSecondaryLine(pt.place)}</span>
              <span className="cluster-picker__coverage" data-coverage={coverage.confidence}>{coverageLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

const Marker = memo(function Marker({
  pt, k, labelMode, labelSide, isActive, isHover, featuredRank, richEffects, isRovingFocused,
  onSelect, onEnter, onFocusEnter, onLeave, shouldSuppressTouchActivation, onArrow, onHomeEnd, onFocusReceived,
}: MarkerProps) {
  const { place, x, y, anchorX, anchorY, needsLeader } = pt;
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const color = TONE[tone];
  const signature = useMemo(() => getPlaceVisualSignature(place), [place]);

  const baseSize = place.tier === "A" ? 7.2 : place.tier === "B" ? 5.4 : 4.35;
  const r = isActive ? baseSize + 1.8 : isHover ? baseSize + 1.2 : baseSize;

  const inv = 1 / k;
  const subLine = placeMapSecondaryLine(place);
  // When pins spread for collision, labels sit at the spread point while the
  // glyph stays on the geographic anchor (leader line connects them).
  const labelSpreadDx = needsLeader ? (x - anchorX) * k : 0;
  const labelSpreadDy = needsLeader ? (y - anchorY) * k : 0;

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
  const showSignatureLine = showSub && (isActive || isHover || k >= 1.38);
  const labelW = Math.min(
    320,
    Math.max(
      titleDisp.length * 6.15 + 18,
      showSub ? subLine.length * 5.2 + 18 : 0,
      showSignatureLine ? signature.mapLabel.length * 5.2 + 32 : 0,
    )
  );
  const labelH = showSignatureLine ? 48 : showSub ? 34 : labelMode === "compact" ? 18 : 18;

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
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          e.stopPropagation();
          onSelect(place.id);
          return;
        case "ArrowLeft":
          e.preventDefault();
          e.stopPropagation();
          onArrow(place.id, "left");
          return;
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          onArrow(place.id, "right");
          return;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          onArrow(place.id, "up");
          return;
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          onArrow(place.id, "down");
          return;
        case "Home":
          e.preventDefault();
          e.stopPropagation();
          onHomeEnd("home");
          return;
        case "End":
          e.preventDefault();
          e.stopPropagation();
          onHomeEnd("end");
          return;
        default:
          return;
      }
    },
    [onSelect, place.id, onArrow, onHomeEnd],
  );

  const onMarkerFocus = useCallback(() => {
    onFocusReceived(place.id);
    // Keyboard parity with mouse hover: focusing a pin shows the rich preview immediately.
    onFocusEnter();
  }, [onFocusReceived, place.id, onFocusEnter]);
  const onMarkerBlur = useCallback(() => {
    onLeave();
  }, [onLeave]);

  const ariaLabelBase =
    subLine.length > 0
      ? `${place.name}, ${subLine}. Open full profile.`
      : `Open full profile for ${place.name}`;
  const ariaLabel = featuredRank ? `Current rank #${featuredRank}. ${ariaLabelBase}` : ariaLabelBase;

  return (
    <g
      transform={`translate(${anchorX} ${anchorY})`}
      role="button"
      tabIndex={isRovingFocused ? 0 : -1}
      data-atlas-marker="true"
      data-marker-id={place.id}
      data-has-leader={needsLeader ? "true" : "false"}
      aria-label={ariaLabel}
      className={`map-marker${featuredRank ? " map-marker--featured" : ""}${needsLeader ? " map-marker--offset-label" : ""}`}
      style={{ cursor: "pointer" }}
      onPointerDown={stopPan}
      onClick={activate}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onKeyDown={onMarkerKeyDown}
      onFocus={onMarkerFocus}
      onBlur={onMarkerBlur}
    >
      <title>{ariaLabel}</title>
      <g transform={`scale(${inv})`}>
        {/* Generous invisible hit target — geographic anchor stays the tap point. */}
        <circle r={Math.max(r + 10, 18)} fill="transparent" stroke="none" pointerEvents="all" />
        {featuredRank ? (
          <g className="map-rank-halo" aria-hidden>
            <circle
              r={r + 13}
              fill="none"
              stroke="rgba(255, 214, 128, 0.76)"
              strokeWidth={1.15}
              strokeDasharray="5 5"
              className={richEffects ? "map-rank-halo__orbit" : undefined}
            />
            <circle r={r + 8.2} fill="rgba(255, 198, 96, 0.1)" stroke="rgba(255, 238, 190, 0.55)" strokeWidth={1.05} />
            <g className="map-rank-badge" transform={`translate(${r + 12} ${-(r + 13)})`}>
              <circle r="8.5" fill="rgba(255, 228, 166, 0.96)" stroke="rgba(8,14,24,0.92)" strokeWidth="1.15" />
              <text
                textAnchor="middle"
                y="3.2"
                fontSize="8.8"
                fontFamily="var(--font-mono),ui-monospace,monospace"
                fontWeight={800}
                fill="rgba(8,14,24,0.96)"
              >
                {featuredRank}
              </text>
            </g>
          </g>
        ) : null}
        <circle
          className="map-marker__signature-aura"
          r={r + 6.6}
          fill="none"
          stroke={signature.mapAccentColor}
          strokeWidth={1.25}
          strokeDasharray={signature.mapDash === "none" ? undefined : signature.mapDash}
          strokeLinecap="round"
          opacity={isActive || isHover || featuredRank ? 0.94 : 0.58}
          style={{ color: signature.mapAccentColor }}
        />
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
            <circle r={r + 1.35} fill="none" stroke="rgba(255,252,245,0.72)" strokeWidth="1.2" />
            <circle r={r} fill="rgba(8,14,24,0.72)" stroke={color} strokeWidth="2.5" />
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
          const labelPointerEvents = featuredRank || isActive || isHover ? "auto" : "none";
          return (
            <g
              transform={`translate(${labelSpreadDx + labelDx} ${labelSpreadDy + (showSub ? 2 : 4)})`}
              pointerEvents={labelPointerEvents}
              className="map-marker-label"
            >
              <rect
                x={-2}
                y={showSignatureLine ? -16 : showSub ? -15 : -11}
                rx={4}
                ry={4}
                width={labelW}
                height={labelH}
                fill="rgba(8,14,24,0.94)"
                stroke={isActive ? "rgba(240,210,156,0.85)" : "rgba(170,193,220,0.62)"}
                strokeWidth={isActive ? 1.05 : 0.85}
              />
              <rect
                x={-2}
                y={showSignatureLine ? -16 : showSub ? -15 : -11}
                rx={4}
                ry={4}
                width={3.5}
                height={labelH}
                fill={signature.mapAccentColor}
                opacity={0.88}
              />
              <text
                x={4}
                y={showSignatureLine ? -5 : showSub ? -4 : 1}
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
              {showSignatureLine ? (
                <>
                  <circle cx={6} cy={22} r={2.2} fill={signature.mapAccentColor} />
                  <text
                    x={13}
                    y={25}
                    fontSize={8.8}
                    fill="rgba(236,244,252,0.88)"
                    fontFamily="var(--font-sans),system-ui,sans-serif"
                    fontWeight={650}
                    style={{ paintOrder: "stroke fill", stroke: "rgba(6,10,18,0.82)", strokeWidth: 1.7, strokeLinejoin: "round" }}
                  >{signature.mapLabel}</text>
                </>
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
  prev.featuredRank === next.featuredRank &&
  prev.k === next.k &&
  prev.richEffects === next.richEffects &&
  prev.isRovingFocused === next.isRovingFocused &&
  prev.shouldSuppressTouchActivation === next.shouldSuppressTouchActivation &&
  prev.onArrow === next.onArrow &&
  prev.onHomeEnd === next.onHomeEnd &&
  prev.onFocusReceived === next.onFocusReceived &&
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
