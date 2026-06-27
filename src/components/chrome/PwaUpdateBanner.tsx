import { Download } from "lucide-react";

interface Props {
  onRefresh: () => void;
  onDismiss: () => void;
}

export function PwaUpdateBanner({ onRefresh, onDismiss }: Props) {
  return (
    <div
      className="tc-pwa-update-banner panel-thin fixed bottom-4 left-4 right-4 z-[90] mx-auto flex max-w-lg flex-col gap-3 p-4 shadow-2xl sm:left-auto sm:right-6 sm:mx-0"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-glacier-500" aria-hidden />
        <div className="min-w-0">
          <p className="m-0 font-atlas text-base text-ice">Atlas update ready</p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-stone-readable">
            A newer Terraclima bundle is installed. Refresh when you are ready — your filters and shortlist stay in this tab until then.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary !text-sm" onClick={onRefresh}>
          Refresh now
        </button>
        <button type="button" className="btn-ghost !text-sm" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
