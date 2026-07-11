import { memo, useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { PlaceCard } from "./PlaceCard";
import type { BestWindow } from "../lib/best-months";
import type { RankingResult } from "../lib/scoring";
import type { LiveFitFilters } from "../lib/live-fit";
import type { Place } from "../types";

const ROW_GAP_PX = 12;
/**
 * Card estimates by layout. These track the production PlaceCard surface,
 * including the signature band, bioclim chip, livability read, live-fit panel,
 * and best-window pill. Keep them close to the rendered row height so the
 * virtualizer does not reserve a too-short scroll range before rows enter the
 * viewport and get measured.
 */
export const PLACE_GRID_ROW_ESTIMATE_PX = {
  desktop: 1060,
  mobile: 1140,
} as const;
const OVERSCAN_ROWS = 3;
const disableScrollAdjustment = () => false;

function useGridColumns(): 1 | 2 {
  const [cols, setCols] = useState<1 | 2>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return 2;
    return window.matchMedia("(min-width: 768px)").matches ? 2 : 1;
  });
  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setCols(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return cols;
}

export const VirtualPlaceGrid = memo(function VirtualPlaceGrid({
  ranked,
  selectedId,
  openPlace,
  toggleCompare,
  onPreloadPlaceDetail,
  onPreloadCompare,
  compareIds,
  resonantWindow,
  liveFitFilters,
  homePlace,
  rankingLabel,
  bookmarkIds,
  onBookmarkToggle,
}: {
  ranked: RankingResult[];
  selectedId: string | null;
  openPlace: (id: string) => void;
  toggleCompare: (id: string) => void;
  onPreloadPlaceDetail?: () => void;
  onPreloadCompare?: () => void;
  compareIds: Set<string>;
  resonantWindow: BestWindow["id"] | null;
  liveFitFilters: LiveFitFilters;
  /** Home-base anchor; cards render a compact delta strip against it. */
  homePlace?: Place | null;
  rankingLabel: string;
  bookmarkIds?: Set<string>;
  onBookmarkToggle?: (id: string) => void;
}) {
  const cols = useGridColumns();
  const rowCount = ranked.length === 0 ? 0 : Math.ceil(ranked.length / cols);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const nextScrollMargin = Math.round(r.top + window.scrollY);
        setScrollMargin(current => current === nextScrollMargin ? current : nextScrollMargin);
      });
    };
    update();
    window.addEventListener("resize", update);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [cols, rowCount]);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => (cols === 1 ? PLACE_GRID_ROW_ESTIMATE_PX.mobile : PLACE_GRID_ROW_ESTIMATE_PX.desktop),
    overscan: OVERSCAN_ROWS,
    scrollMargin,
    gap: ROW_GAP_PX,
  });
  // This version exposes the adjustment hook on the Virtualizer instance, not
  // in React options. Disable correction to avoid backward-scroll tugging when
  // variable-height mobile cards finish measuring.
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = disableScrollAdjustment;

  useLayoutEffect(() => {
    if (!selectedId || rowCount === 0) return;
    const idx = ranked.findIndex(r => r.place.id === selectedId);
    if (idx < 0) return;
    const row = Math.floor(idx / cols);
    const t = window.setTimeout(() => {
      virtualizer.scrollToIndex(row, { align: "center" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [selectedId, ranked, cols, rowCount, virtualizer]);

  if (rowCount === 0) return null;

  return (
    <div ref={anchorRef} className="tc-card-grid">
      <div
        className="w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map(vRow => {
          const start = vRow.index * cols;
          const row = ranked.slice(start, start + cols);
          if (row.length === 0) return null;
          return (
            <div
              key={vRow.key}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              className="tc-card-row grid grid-cols-1 md:grid-cols-2 gap-3 absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${vRow.start - scrollMargin}px)`,
              }}
            >
              {row.map((r, colIndex) => (
                <PlaceCard
                  key={r.place.id}
                  place={r.place}
                  selected={r.place.id === selectedId}
                  note={r.note}
                  onOpenPlace={openPlace}
                  onCompareToggle={toggleCompare}
                  onPreloadPlaceDetail={onPreloadPlaceDetail}
                  onPreloadCompare={onPreloadCompare}
                  inCompare={compareIds.has(r.place.id)}
                  bookmarked={bookmarkIds?.has(r.place.id)}
                  onBookmarkToggle={onBookmarkToggle}
                  resonantWindow={resonantWindow}
                  liveFitFilters={liveFitFilters}
                  homePlace={homePlace}
                  rank={start + colIndex + 1}
                  rankingLabel={rankingLabel}
                  rankingScore={r.score}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
