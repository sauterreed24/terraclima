import { BookOpen, X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { useFocusTrap } from "../../hooks/use-focus-trap";

interface Props {
  placeName: string;
  onClose: () => void;
  occluded?: boolean;
}

export function PlaceDetailLoadingFallback({ placeName, onClose, occluded = false }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(panelRef, !occluded);

  useEffect(() => {
    if (occluded) return;
    closeRef.current?.focus({ preventScroll: true });
  }, [occluded]);

  const handleCloseKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <>
      <div
        className="tc-modal-scrim fixed inset-0 z-30 cursor-default border-0 p-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={occluded ? "true" : undefined}
        data-place-detail-loading
        className="place-detail-drawer fixed top-0 right-0 h-full w-full md:w-[min(92vw,900px)] max-w-full z-40 panel !rounded-none !border-y-0 !border-r-0 overflow-hidden outline-none border-l"
      >
        <div className="flex min-h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 md:px-6">
            <div className="min-w-0">
              <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-stone-readable">
                Opening profile
              </p>
              <h2 id={titleId} className="m-0 mt-1 font-atlas text-xl text-ice md:text-2xl">
                {placeName} climate dossier
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              onKeyDown={handleCloseKeyDown}
              data-place-detail-close
              className="btn-ghost shrink-0 !p-2 rounded-lg"
              aria-label="Close profile"
              title="Close profile"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-center px-5 py-8 md:px-8">
            <div role="status" aria-live="polite" aria-atomic="true" className="max-w-xl">
              <BookOpen className="h-8 w-8 text-ochre-700" aria-hidden />
              <p className="m-0 mt-4 font-atlas text-lg text-ice">
                Opening {placeName} climate dossier
              </p>
              <p className="m-0 mt-2 max-w-md text-sm leading-relaxed text-stone-readable">
                Preparing the dossier surface.
              </p>
            </div>
            <div className="mt-7 space-y-3" aria-hidden="true">
              <div className="h-3 w-3/4 rounded-full bg-white/10" />
              <div className="h-3 w-full rounded-full bg-white/10" />
              <div className="h-3 w-5/6 rounded-full bg-white/10" />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="h-24 rounded-lg border border-white/10 bg-white/[0.04]" />
                <div className="h-24 rounded-lg border border-white/10 bg-white/[0.04]" />
                <div className="h-24 rounded-lg border border-white/10 bg-white/[0.04]" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
