import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterBar } from "./FilterBar";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { countActiveExplorerFilterSignals, type FilterState, type RankingProfile } from "../lib/scoring";

export type ExplorerFilterSheetHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  searchInputId?: string;
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  ranking: RankingProfile;
  setRanking: (r: RankingProfile) => void;
  /** Shown below filters in the sheet (e.g. atlas footprint stats). */
  footer?: ReactNode;
  /** When a place profile opens, the sheet closes so the drawer is unobstructed. */
  detailOpen?: boolean;
};

export const ExplorerFilterSheet = memo(
  forwardRef<ExplorerFilterSheetHandle, Props>(function ExplorerFilterSheet(
    { searchInputId, filters, setFilters, ranking, setRanking, footer, detailOpen },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    useFocusTrap(panelRef, open);

    useEffect(() => {
      const d = dialogRef.current;
      if (!d) return;
      const sync = () => setOpen(d.open);
      d.addEventListener("toggle", sync);
      sync();
      return () => d.removeEventListener("toggle", sync);
    }, []);

    useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }, [open]);

    const close = useCallback(() => {
      dialogRef.current?.close();
    }, []);

    const openSheet = useCallback(() => {
      dialogRef.current?.showModal();
    }, []);

    useImperativeHandle(ref, () => ({ open: openSheet, close }), [openSheet, close]);

    useEffect(() => {
      if (detailOpen) close();
    }, [detailOpen, close]);

    useEffect(() => {
      if (!open) return;
      let alive = true;
      let innerRaf = 0;
      const outerRaf = window.requestAnimationFrame(() => {
        innerRaf = window.requestAnimationFrame(() => {
          if (!alive) return;
          if (searchInputId) {
            document.getElementById(searchInputId)?.focus();
          } else {
            panelRef.current?.querySelector<HTMLElement>("input")?.focus();
          }
        });
      });
      return () => {
        alive = false;
        window.cancelAnimationFrame(outerRaf);
        window.cancelAnimationFrame(innerRaf);
      };
    }, [open, searchInputId]);

    const chips = useMemo(() => countActiveExplorerFilterSignals(filters), [filters]);
    const triggerLabel =
      chips > 0
        ? `Open Explorer filters and ranking (${chips} active ${chips === 1 ? "filter" : "filters"})`
        : "Open Explorer filters and ranking";

    return (
      <>
        <button
          type="button"
          onClick={openSheet}
          className="tc-filter-sheet-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="tc-explorer-filter-sheet"
          aria-label={triggerLabel}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden />
          <span className="tc-filter-sheet-trigger__label">Filters</span>
          {chips > 0 ? (
            <span className="tc-filter-sheet-trigger__badge" aria-hidden>
              {chips > 9 ? "9+" : chips}
            </span>
          ) : null}
        </button>

        <dialog
          ref={dialogRef}
          id="tc-explorer-filter-sheet"
          className="tc-filter-sheet-dialog tc-glass-dialog-motion"
          aria-labelledby="tc-explorer-filter-sheet-title"
        >
          <div
            className="fixed inset-0 z-0 min-h-[100dvh] min-w-[100vw] cursor-default border-0 bg-transparent p-0"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
          />
          <div ref={panelRef} className="relative z-10 tc-filter-sheet-dialog__inner">
            <div className="tc-filter-sheet-dialog__head">
              <h2 id="tc-explorer-filter-sheet-title" className="font-atlas text-lg text-ice m-0">
                Filters & ranking
              </h2>
              <button type="button" onClick={close} className="btn-ghost !p-2 rounded-lg" aria-label="Close filters">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <FilterBar
              variant="sheet"
              searchInputId={searchInputId}
              filters={filters}
              setFilters={setFilters}
              ranking={ranking}
              setRanking={setRanking}
            />
            {footer ? <div className="mt-3 space-y-0">{footer}</div> : null}
          </div>
        </dialog>
      </>
    );
  }),
);

ExplorerFilterSheet.displayName = "ExplorerFilterSheet";
