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
import { ClimateScenarioControl } from "./chrome/ClimateScenarioControl";
import { useElementIsolation } from "../hooks/use-element-isolation";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { scenarioMeta } from "../lib/climate-projection";
import { LIVE_FIT_PRESET_BY_ID } from "../lib/live-fit";
import { countActiveExplorerFilterSignals, type FilterState, type RankingProfile } from "../lib/scoring";
import { fmtTemp, useUnits } from "../lib/units";
import type { ScenarioId } from "../types";

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
  scenario?: ScenarioId;
  onScenarioChange?: (next: ScenarioId) => void;
  onOpenChange?: (open: boolean) => void;
  projecting?: boolean;
};

const RISK_SUMMARY_LABELS = {
  "very-low": "very low",
  low: "low",
  moderate: "moderate",
  elevated: "elevated",
  high: "high",
  "very-high": "very high",
} as const;

function summarizeActiveExplorerLens(
  filters: FilterState,
  scenario: ScenarioId | undefined,
  temp: ReturnType<typeof useUnits>["temp"],
): string | null {
  const parts: string[] = [];
  const search = filters.search?.trim();
  if (search) parts.push(`search "${search}"`);
  if (filters.countries.size > 0) parts.push(`countries ${[...filters.countries].join(", ")}`);
  if (filters.archetypes.size > 0) {
    parts.push(`${filters.archetypes.size} archetype${filters.archetypes.size === 1 ? "" : "s"}`);
  }
  if ((filters.fitPresets?.size ?? 0) > 0) {
    const labels = [...(filters.fitPresets ?? [])]
      .map(id => LIVE_FIT_PRESET_BY_ID[id]?.shortLabel ?? id)
      .slice(0, 3);
    const more = (filters.fitPresets?.size ?? 0) - labels.length;
    parts.push(`Live Finder ${labels.join(", ")}${more > 0 ? ` + ${more} more` : ""}`);
  }
  if (filters.maxSummerHighC != null) parts.push(`summer at or below ${fmtTemp(filters.maxSummerHighC, temp)}`);
  if (filters.minWinterLowC != null) parts.push(`winter at or above ${fmtTemp(filters.minWinterLowC, temp)}`);
  if (filters.minGrowability != null) parts.push(`garden ${filters.minGrowability}+`);
  if (filters.maxFireRisk != null) parts.push(`fire ${RISK_SUMMARY_LABELS[filters.maxFireRisk]} or lower`);
  if (filters.maxOverallRisk != null) parts.push(`risk ${RISK_SUMMARY_LABELS[filters.maxOverallRisk]} or lower`);
  if (scenario && scenario !== "now") parts.push(`climate layer ${scenarioMeta(scenario).short}`);

  if (parts.length === 0) return null;
  return `Active Explorer filters: ${parts.join("; ")}.`;
}

export const ExplorerFilterSheet = memo(
  forwardRef<ExplorerFilterSheetHandle, Props>(function ExplorerFilterSheet(
    { searchInputId, filters, setFilters, ranking, setRanking, footer, detailOpen, scenario, onScenarioChange, onOpenChange, projecting },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const triggerShellRef = useRef<HTMLSpanElement>(null);
    const triggerButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const wasOpenRef = useRef(false);
    const [open, setOpen] = useState(false);
    const { temp } = useUnits();

    useElementIsolation(triggerShellRef, open);
    useFocusTrap(panelRef, open);

    useEffect(() => {
      const d = dialogRef.current;
      if (!d) return;
      const sync = () => {
        setOpen(d.open);
        onOpenChange?.(d.open);
      };
      d.addEventListener("toggle", sync);
      sync();
      return () => {
        d.removeEventListener("toggle", sync);
        if (d.open) onOpenChange?.(false);
      };
    }, [onOpenChange]);

    useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }, [open]);

    useEffect(() => {
      if (open) {
        wasOpenRef.current = true;
        return;
      }
      if (!wasOpenRef.current) return;
      wasOpenRef.current = false;
      const focusTrigger = () => {
        try {
          triggerButtonRef.current?.focus({ preventScroll: true });
        } catch {
          /* noop */
        }
      };
      const timeoutId = window.setTimeout(focusTrigger, 0);
      const rafId = window.requestAnimationFrame(focusTrigger);
      return () => {
        window.clearTimeout(timeoutId);
        window.cancelAnimationFrame(rafId);
      };
    }, [open]);

    const close = useCallback(() => {
      dialogRef.current?.close();
    }, []);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const closeFromBackdrop = (event: MouseEvent) => {
        if (event.target === dialog) close();
      };
      dialog.addEventListener("click", closeFromBackdrop);
      return () => dialog.removeEventListener("click", closeFromBackdrop);
    }, [close]);

    const focusInitialControl = useCallback(() => {
      const root = panelRef.current;
      if (!root) return;
      const target =
        root.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"])') ??
        closeButtonRef.current ??
        root.querySelector<HTMLElement>("button:not([disabled])");
      try {
        target?.focus({ preventScroll: true });
      } catch {
        /* noop */
      }
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
      let focusRetry = 0;
      const focus = () => {
        if (!alive) return;
        focusInitialControl();
      };
      const outerRaf = window.requestAnimationFrame(() => {
        focus();
        innerRaf = window.requestAnimationFrame(focus);
      });
      focusRetry = window.setTimeout(focus, 160);
      return () => {
        alive = false;
        window.cancelAnimationFrame(outerRaf);
        window.cancelAnimationFrame(innerRaf);
        window.clearTimeout(focusRetry);
      };
    }, [focusInitialControl, open]);

    const chips = useMemo(() => countActiveExplorerFilterSignals(filters), [filters]);
    const signalCount = chips + (scenario && scenario !== "now" ? 1 : 0);
    const triggerSummary = useMemo(
      () => summarizeActiveExplorerLens(filters, scenario, temp),
      [filters, scenario, temp],
    );
    const triggerLabel =
      signalCount > 0
        ? `Open Explorer filters and ranking (${signalCount} active ${signalCount === 1 ? "filter" : "filters"})`
        : "Open Explorer filters and ranking";

    return (
      <>
        <span ref={triggerShellRef} data-filter-sheet-trigger-shell>
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={openSheet}
            className="tc-filter-sheet-trigger"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="tc-explorer-filter-sheet"
            aria-label={triggerLabel}
            aria-describedby={triggerSummary ? "tc-explorer-filter-sheet-trigger-summary" : undefined}
            title={triggerSummary ?? "Open Explorer filters and ranking"}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden />
            <span className="tc-filter-sheet-trigger__label">Filters</span>
            {triggerSummary ? (
              <span id="tc-explorer-filter-sheet-trigger-summary" className="sr-only">
                {triggerSummary}
              </span>
            ) : null}
            {signalCount > 0 ? (
              <span className="tc-filter-sheet-trigger__badge" aria-hidden>
                {signalCount > 9 ? "9+" : signalCount}
              </span>
            ) : null}
          </button>
        </span>

        <dialog
          ref={dialogRef}
          id="tc-explorer-filter-sheet"
          aria-modal="true"
          className="tc-filter-sheet-dialog tc-glass-dialog-motion"
          aria-labelledby="tc-explorer-filter-sheet-title"
        >
          <div ref={panelRef} className="relative z-10 tc-filter-sheet-dialog__inner">
            <div className="tc-filter-sheet-dialog__head">
              <h2 id="tc-explorer-filter-sheet-title" className="font-atlas text-lg text-ice m-0">
                Filters & ranking
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="btn-ghost !p-2 rounded-lg"
                aria-label="Close filters"
                title="Close filters"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            {onScenarioChange ? (
              <ClimateScenarioControl
                scenario={scenario ?? "now"}
                onChange={onScenarioChange}
                projecting={projecting}
              />
            ) : null}
            <FilterBar
              variant="sheet"
              searchInputId={searchInputId}
              filters={filters}
              setFilters={setFilters}
              ranking={ranking}
              setRanking={setRanking}
              scenario={scenario}
              onScenarioChange={onScenarioChange}
            />
            {footer ? <div className="mt-3 space-y-0">{footer}</div> : null}
          </div>
        </dialog>
      </>
    );
  }),
);

ExplorerFilterSheet.displayName = "ExplorerFilterSheet";
