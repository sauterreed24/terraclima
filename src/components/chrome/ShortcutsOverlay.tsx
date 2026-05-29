import { memo, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/use-focus-trap";
import { CMD_KEY_LABEL } from "../../lib/app-constants";

/**
 * Modal listing every keyboard shortcut the app supports. Triggered by
 * the global "?" shortcut, the first-run pulse, and the in-modal "Help"
 * affordance in the site menu.
 *
 * Focus trap is installed with `restoreFocus: true` so closing returns
 * the user to whatever triggered the overlay.
 */
export const ShortcutsOverlay = memo(function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true, true);
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 anim-fade-in">
      <button
        type="button"
        className="tc-modal-scrim absolute inset-0 z-0 cursor-default border-0 p-0"
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kbd-shortcuts-title"
        className="relative z-10 panel p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="kbd-shortcuts-title" className="font-atlas text-xl text-ice">Keyboard shortcuts</h3>
          <button ref={closeBtnRef} type="button" onClick={onClose} className="btn-ghost !p-1.5" aria-label="Close keyboard shortcuts help">
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
        <div className="divider-contour mb-3" />
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Kbds keys={["E"]} />        <span className="text-frost">Explorer</span>
          <Kbds keys={["T"]} />        <span className="text-frost">Trips</span>
          <Kbds keys={["C"]} />        <span className="text-frost">Collections</span>
          <Kbds keys={["L"]} />        <span className="text-frost">Learn</span>
          <Kbds keys={["/"]} />        <span className="text-frost">Explorer: focus search (on narrow screens also opens the filter sheet)</span>
          <Kbds keys={[CMD_KEY_LABEL, "K"]} /> <span className="text-frost">Explorer: focus search (also works from inside any text input)</span>
          <Kbds keys={["F"]} />        <span className="text-frost">Explorer: open filter sheet (narrow screens only)</span>
          <Kbds keys={["R"]} />        <span className="text-frost">Surprise - random place in your current list</span>
          <Kbds keys={["B"]} />        <span className="text-frost">Pin / unpin the currently open place to your shortlist</span>
          <Kbds keys={["Esc"]} />      <span className="text-frost">Close shortcuts, compare, filter sheet, site menu, or place detail (or clear a non-empty search field)</span>
          <Kbds keys={["?"]} />        <span className="text-frost">Toggle this help</span>
        </div>
        <div className="divider-contour my-3" />
        <div className="space-y-2 text-xs text-stone leading-relaxed">
          <p>
            Phone map: one-finger drag pans the atlas and pinch zooms by default. Tap <strong className="text-frost font-normal">Scroll page</strong> when you want browser scrolling over the map, then tap <strong className="text-frost font-normal">Use map</strong> to return to direct map control.
          </p>
          <p>
            Place profiles: tap any pin or card. Read the opening story, then use On this page to move through practical read, climate tourism, field dossier, seasons, geospatial analysis, soils, risks, similar stops, and sources.
          </p>
          <p>
            Share a place: open it, then use <strong className="text-frost font-normal">Copy link</strong> in the panel header. The URL encodes the place and view. Surprise uses the same filtered pool as the cards.
          </p>
        </div>
      </div>
    </div>
  );
});

function Kbds({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
    </span>
  );
}
