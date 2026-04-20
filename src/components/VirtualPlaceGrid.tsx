import { memo, useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { PlaceCard } from "./PlaceCard";
import type { BestWindow } from "../lib/best-months";
import type { RankingResult } from "../lib/scoring";

const ROW_GAP_PX = 12;
/** Slightly tall cards (stats + sections); underestimate causes scroll jank. */
const EST_ROW_HEIGHT_PX = 272;
const OVERSCAN_ROWS = 3;

function useGridColumns(): 1 | 2 {
  const [cols, setCols] = useState<1 | 2>(2);
  useLayoutEffect(() => {
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
}: {
  ranked: RankingResult[];
  selectedId: string | null;
  openPlace: (id: string) => void;
  toggleCompare: (id: string) => void;
  compareIds: Set<string>;
  resonantWindow: BestWindow["id"] | null;
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
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [cols, rowCount]);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => EST_ROW_HEIGHT_PX,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
    gap: ROW_GAP_PX,
  });

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
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              {row.map(r => (
                <PlaceCard
                  key={r.place.id}
                  place={r.place}
                  selected={r.place.id === selectedId}
                  note={r.note}
                  onOpenPlace={openPlace}
                  onCompareToggle={toggleCompare}
                  inCompare={compareIds.has(r.place.id)}
                  resonantWindow={resonantWindow}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
