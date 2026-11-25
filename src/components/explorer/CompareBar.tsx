import { memo } from "react";
import { GitCompareArrows, X } from "lucide-react";

export const COMPARE_BAR_OPEN_LABEL = "Open compare";

/**
 * Compact bar fixed to the bottom of the viewport while places are queued for
 * Compare, so the comparison is one tap away from anywhere on a long page.
 *
 * It is fixed-position (no layout shift) and sits above the phone "Filters"
 * button and the "Top" button; on wide screens, where the Filters button does
 * not exist, it drops to the bottom edge and stays centred clear of "Top".
 * The parent unmounts it while a profile, Compare, the Filters sheet, the
 * site menu or the shortcuts overlay is open.
 */
export const CompareBar = memo(function CompareBar({
  names,
  limit,
  onOpen,
  onPreload,
  onClear,
}: {
  names: readonly string[];
  limit: number;
  onOpen: (opts: { trigger: HTMLElement }) => void;
  onPreload?: () => void;
  onClear: () => void;
}) {
  const count = names.length;
  if (count === 0) return null;
  const regionLabel = `${count} ${count === 1 ? "place" : "places"} to compare`;
  const detail = count === 1
    ? `${names[0]}. Add another to see them side by side (up to ${limit}).`
    : names.join(", ");
  const clearLabel = `Clear the comparison (${count} ${count === 1 ? "place" : "places"})`;
  return (
    <section
      aria-label={regionLabel}
      data-compare-bar
      className="pointer-events-none fixed inset-x-0 z-[34] flex justify-center pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="panel pointer-events-auto flex w-full max-w-xl items-center gap-2 !rounded-2xl px-3 py-2 shadow-[0_14px_36px_-12px_rgba(20,30,40,0.45)]">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight text-ice">
            <span className="tabular-nums">{count}</span> to compare
          </div>
          <div className="truncate text-xs leading-snug text-frost" title={detail}>
            {detail}
          </div>
        </div>
        <button
          type="button"
          className="btn-primary min-h-[44px] shrink-0 !text-sm"
          aria-label={COMPARE_BAR_OPEN_LABEL}
          onPointerEnter={onPreload}
          onFocus={onPreload}
          onClick={event => onOpen({ trigger: event.currentTarget })}
        >
          <GitCompareArrows className="h-4 w-4" aria-hidden />
          Open compare
        </button>
        <button
          type="button"
          className="btn-ghost min-h-[44px] min-w-[44px] shrink-0 justify-center !p-2"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={onClear}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
});
