import { memo, useEffect, useMemo, useRef, type CSSProperties, type MouseEvent } from "react";
import { X } from "lucide-react";
import type { Place } from "../../types";
import { useFocusTrap } from "../../hooks/use-focus-trap";
import { type AtlasClusterItem } from "../../lib/atlas-map-cluster";
import { livedRealityCoverage } from "../../lib/livability-score";
import { placeMapSecondaryLine } from "../../lib/atlas-map-label";
import { BookmarkButton } from "../BookmarkButton";

export type AtlasMapClusterPoint = { place: Place; x: number; y: number; id: string };

type ClusterPickerSpatialPoint = AtlasMapClusterPoint & {
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

const CLUSTER_TIER_ORDER: Record<Place["tier"], number> = { A: 0, B: 1, C: 2 };
const CLUSTER_TIER_LABEL: Record<Place["tier"], string> = {
  A: "Flagship",
  B: "Spotlight",
  C: "Index",
};

function clusterPickerCoverageLabel(place: Place): string {
  const coverage = livedRealityCoverage(place);
  if (coverage.confidence === "source-backed") {
    return coverage.sourceCount >= 2 ? `${coverage.sourceCount} lived sources` : "Source-backed lived read";
  }
  if (coverage.confidence === "partial") return "Partial lived read";
  return "Lived read pending";
}

function compareClusterPickerPoints(
  a: AtlasMapClusterPoint,
  b: AtlasMapClusterPoint,
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

export function pluralCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function summarizeClusterPicker(points: readonly AtlasMapClusterPoint[]): ClusterPickerSummary {
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

function clusterPickerMiniPoints(points: readonly AtlasMapClusterPoint[]): ClusterPickerSpatialPoint[] {
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

export const AtlasMapClusterPicker = memo(function AtlasMapClusterPicker({
  cluster,
  xPct,
  yPct,
  mapHeight,
  featuredRankById,
  bookmarkIds,
  onToggleBookmark,
  onClose,
  onSelect,
}: {
  cluster: AtlasClusterItem<AtlasMapClusterPoint>;
  xPct: number;
  yPct: number;
  mapHeight: number;
  featuredRankById: ReadonlyMap<string, number>;
  bookmarkIds?: ReadonlySet<string>;
  onToggleBookmark?: (id: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const onRight = xPct < 52;
  const pickerInsetPx = 12;
  const maxPickerHeightPx = Math.min(380, Math.max(280, mapHeight - pickerInsetPx * 2));
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
  } as CSSProperties;
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
          const pinned = bookmarkIds?.has(pt.place.id) ?? false;
          const handlePin = (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleBookmark?.(pt.place.id);
          };
          return (
            <div key={pt.place.id} className="cluster-picker__item-row">
              <button
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
              {onToggleBookmark ? (
                <BookmarkButton
                  pinned={pinned}
                  placeName={pt.place.name}
                  onToggle={handlePin}
                  size="compact"
                  ariaContext="from cluster picker"
                  className="cluster-picker__pin"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});

