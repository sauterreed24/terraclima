import { memo, useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { PlaceCard } from "./PlaceCard";
import type { BestWindow } from "../lib/best-months";
import type { FilterState, RankingResult } from "../lib/scoring";

const ROW_GAP_PX = 12;
/** Card estimates by layout. Mobile cards are one-column and significantly taller. */
const EST_ROW_HEIGHT_DESKTOP_PX = 380;
const EST_ROW_HEIGHT_MOBILE_PX = 530;
const OVERSCAN_ROWS = 3;
const disableScrollAdjustment = () => false;

function useGridColumns(): 1 | 2 {
  const [cols, setCols] = useState<1 | 2>(2);
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
  compareIds,
  resonantWindow,
  liveFitFilters,
  rankingLabel,
  bookmarkIds,
  onBookmarkToggle,
}: {
  ranked: RankingResult[];
  selectedId: string | null;
  openPlace: (id: string) => void;
  toggleCompare: (id: string) => void;
  compareIds: Set<string>;
  resonantWindow: BestWindow["id"] | null;
  liveFitFilters: FilterState;
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
        setScrollMargin(r.top + window.scrollY);
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
    estimateSize: () => (cols === 1 ? EST_ROW_HEIGHT_MOBILE_PX : EST_ROW_HEIGHT_DESKTOP_PX),
    overscan: OVERSCAN_ROWS,
    scrollMargin,
    gap: ROW_GAP_PX,
  });
  // This version exposes the adjustment hook on the Virtualizer instance, not
  // in React options. Disable correction to avoid backward-scroll tugging when
  // variable-height mobile cards finish measuring.
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = disableScrollAdjustment;

  if (rowCount === 0) return null;

  return (
    <div ref={anchorRef}>
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
              className="grid grid-cols-1 md:grid-cols-2 gap-3 absolute top-0 left-0 w-full"
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
                  inCompare={compareIds.has(r.place.id)}
                  bookmarked={bookmarkIds?.has(r.place.id)}
                  onBookmarkToggle={onBookmarkToggle}
                  resonantWindow={resonantWindow}
                  liveFitFilters={liveFitFilters}
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
