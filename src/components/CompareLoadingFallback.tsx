import { ArrowLeftRight, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from "react";
import { useFocusTrap } from "../hooks/use-focus-trap";
import type { Place } from "../types";

interface Props {
  places: readonly Place[];
  onClose: () => void;
}

export function CompareLoadingFallback({ places, onClose }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  const placeCount = `${places.length} ${places.length === 1 ? "place" : "places"}`;
  const title = places.length === 1 ? "Loading compare setup" : `Loading compare for ${placeCount}`;
  const placeNames = useMemo(
    () => places.map(place => place.name).join(", "),
    [places],
  );

  const handleCloseKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <>
      <div
        className="tc-modal-scrim fixed inset-0 z-50 cursor-default border-0 p-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-compare-loading
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 outline-none pointer-events-none"
      >
        <div className="panel w-full max-w-lg p-5 shadow-2xl pointer-events-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-stone-readable">
                Compare
              </p>
              <h2 id={titleId} className="m-0 mt-1 font-atlas text-xl text-ice">
                {title}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              onKeyDown={handleCloseKeyDown}
              data-compare-loading-close
              className="btn-ghost shrink-0 !p-2 rounded-lg"
              aria-label="Close comparison"
              title="Close comparison"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div role="status" aria-live="polite" aria-atomic="true" className="mt-6">
            <ArrowLeftRight className="h-8 w-8 text-[rgba(26,143,168,0.9)]" aria-hidden />
            <p className="m-0 mt-4 text-sm leading-relaxed text-stone-readable">
              {placeNames
                ? `Preparing ${placeNames}.`
                : "Preparing the saved comparison."}
            </p>
          </div>

          <div className="mt-6 grid gap-3" aria-hidden="true">
            <div className="h-3 w-3/4 rounded-full bg-white/10" />
            <div className="h-3 w-full rounded-full bg-white/10" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-24 rounded-lg border border-white/10 bg-white/[0.04]" />
              <div className="h-24 rounded-lg border border-white/10 bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
