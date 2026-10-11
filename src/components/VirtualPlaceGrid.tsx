import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { PlaceCard } from "./PlaceCard";
import type { BestWindow } from "../lib/best-months";
import type { RankingProfile, RankingResult } from "../lib/scoring";
import type { LiveFitFilters } from "../lib/live-fit";
import { shouldShowPlaceCardScreeningScores } from "../lib/place-card-screening";
import type { Place } from "../types";

const ROW_GAP_PX = 12;
/**
 * Card estimates by layout. Discovery cards omit livability / live-fit /
 * signature score chrome; fit-mode cards are taller. Estimates lean slightly
 * tall so the virtualizer does not under-reserve scroll range before measure.
 */
export const PLACE_GRID_ROW_ESTIMATE_PX = {
  desktop: 820,
  mobile: 900,
  screeningDesktop: 1060,
  screeningMobile: 1140,
} as const;
const OVERSCAN_ROWS = 3;
/**
 * The list reveals places in batches. Reserving virtual height for all 226
 * cards made the document ~96,000px tall (~208,000px on phones), so one pixel
 * of scrollbar-thumb drag jumped 120–270px. Batches keep the page short enough
 * that the scrollbar is controllable; "Show more" / "Show all" extend it.
 */
export const PLACE_GRID_BATCH = 36;
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
  rankingProfile,
  homePlace,
  rankingLabel,
  referenceMonth,
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
  rankingProfile: RankingProfile;
  /** Home-base anchor; cards render a compact delta strip against it. */
  homePlace?: Place | null;
  rankingLabel: string;
  /** Calendar month (0–11) shared with Visit-now / best-this-month ranking. */
  referenceMonth?: number;
  bookmarkIds?: Set<string>;
  onBookmarkToggle?: (id: string) => void;
}) {
  const cols = useGridColumns();
  const showScreeningScores = shouldShowPlaceCardScreeningScores(rankingProfile, liveFitFilters);

  // A new ranking or filter set starts again from the first batch.
  const listKey = `${rankingLabel}|${ranked.length}|${ranked.slice(0, 6).map(r => r.place.id).join(",")}`;
  const [reveal, setReveal] = useState({ key: listKey, count: PLACE_GRID_BATCH });
  let visibleCount = reveal.key === listKey ? reveal.count : PLACE_GRID_BATCH;
  // Opening a place from the map or search reveals the batch that holds it.
  const selectedIndex = selectedId ? ranked.findIndex(r => r.place.id === selectedId) : -1;
  if (selectedIndex >= visibleCount) visibleCount = Math.ceil((selectedIndex + 1) / PLACE_GRID_BATCH) * PLACE_GRID_BATCH;
  visibleCount = Math.min(visibleCount, ranked.length);
  const visible = useMemo(() => ranked.slice(0, visibleCount), [ranked, visibleCount]);
  const remaining = ranked.length - visibleCount;
  // Keep a selection-driven reveal after the place closes, so the list does
  // not shrink out from under the reader.
  useLayoutEffect(() => {
    if (reveal.key !== listKey || visibleCount > reveal.count) setReveal({ key: listKey, count: visibleCount });
  }, [listKey, reveal, visibleCount]);
  // When a reveal ends the list its buttons unmount; hand keyboard focus to
  // the count line so the next Tab continues from the list footer.
  const countRef = useRef<HTMLParagraphElement>(null);
  const focusCountRef = useRef(false);
  const showMore = (all: boolean) => {
    const count = all ? ranked.length : visibleCount + PLACE_GRID_BATCH;
    focusCountRef.current = count >= ranked.length;
    setReveal({ key: listKey, count });
  };
  useEffect(() => {
    if (!focusCountRef.current || remaining > 0) return;
    focusCountRef.current = false;
    countRef.current?.focus({ preventScroll: true });
  }, [remaining]);

  const rowCount = visible.length === 0 ? 0 : Math.ceil(visible.length / cols);
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
    estimateSize: () => {
      if (showScreeningScores) {
        return cols === 1 ? PLACE_GRID_ROW_ESTIMATE_PX.screeningMobile : PLACE_GRID_ROW_ESTIMATE_PX.screeningDesktop;
      }
      return cols === 1 ? PLACE_GRID_ROW_ESTIMATE_PX.mobile : PLACE_GRID_ROW_ESTIMATE_PX.desktop;
    },
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
    const idx = visible.findIndex(r => r.place.id === selectedId);
    if (idx < 0) return;
    const row = Math.floor(idx / cols);
    const t = window.setTimeout(() => {
      virtualizer.scrollToIndex(row, { align: "center" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [selectedId, visible, cols, rowCount, virtualizer]);

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
          const row = visible.slice(start, start + cols);
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
                  showScreeningScores={showScreeningScores}
                  rankingProfile={rankingProfile}
                  homePlace={homePlace}
                  rank={start + colIndex + 1}
                  rankingLabel={rankingLabel}
                  rankingScore={r.score}
                  referenceMonth={referenceMonth}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div className="tc-card-grid__more panel-thin" role="group" aria-label="Ranked list length">
        <p ref={countRef} className="tc-card-grid__count" tabIndex={-1} aria-live="polite">
          {remaining > 0 ? (
            <>
              Showing <span className="font-mono-num text-frost">{visibleCount}</span> of{" "}
              <span className="font-mono-num text-frost">{ranked.length}</span> places, best first
            </>
          ) : (
            <>
              Showing {ranked.length === 1 ? "the only matching place" : (
                <>all <span className="font-mono-num text-frost">{ranked.length}</span> places</>
              )}
            </>
          )}
        </p>
        {remaining > 0 ? (
          <div className="tc-card-grid__more-actions">
            <button type="button" className="btn btn-ghost" onClick={() => showMore(false)}>
              Show {Math.min(PLACE_GRID_BATCH, remaining)} more
            </button>
            {remaining > PLACE_GRID_BATCH ? (
              <button type="button" className="btn btn-ghost" onClick={() => showMore(true)}>
                Show all {ranked.length}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
