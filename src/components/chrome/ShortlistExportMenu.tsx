import { memo, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Download } from "lucide-react";
import type { Place } from "../../types";
import { downloadBlobFile } from "../../lib/download-blob";
import type { ShortlistExportFile } from "../../lib/shortlist-export";
import { useFocusTrap } from "../../hooks/use-focus-trap";

type ExportFormatId = "markdown" | "json" | "csv" | "geojson" | "ics";
type ExportStatus = "idle" | "preparing" | "ready" | "failed";
type MenuPlacement = "down" | "up";

const FORMATS: ReadonlyArray<{
  id: ExportFormatId;
  label: string;
  hint: string;
}> = [
  {
    id: "markdown",
    label: "Scout plan",
    hint: "Visit windows, source gaps, and verification steps",
  },
  { id: "json", label: "JSON", hint: "Minimal place rows for scripts" },
  { id: "csv", label: "CSV", hint: "Spreadsheet-friendly table" },
  { id: "geojson", label: "GeoJSON", hint: "RFC 7946 map points" },
  { id: "ics", label: "Calendar (.ics)", hint: "Best-month scouting windows" },
];
const MENU_NAV_KEYS = new Set(["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"]);

async function buildShortlistExport(format: ExportFormatId, places: readonly Place[]): Promise<ShortlistExportFile> {
  const exports = await import("../../lib/shortlist-export");
  switch (format) {
    case "markdown": return exports.exportShortlistAsMarkdown(places);
    case "json": return exports.exportShortlistAsJSON(places);
    case "csv": return exports.exportShortlistAsCSV(places);
    case "geojson": return exports.exportShortlistAsGeoJSON(places);
    case "ics": return exports.exportShortlistAsICS(places);
  }
}

interface Props {
  places: readonly Place[];
  className?: string;
}

export const ShortlistExportMenu = memo(function ShortlistExportMenu({ places, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<MenuPlacement>("down");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  const statusResetRef = useRef<number | null>(null);
  const pointerActivatedFormatRef = useRef<ExportFormatId | null>(null);
  const menuId = useId();
  useFocusTrap(panelRef, open, true);

  const close = useCallback((opts: { restoreFocus?: boolean } = {}) => {
    setOpen(false);
    if (opts.restoreFocus === false) return;
    window.setTimeout(() => {
      try { triggerRef.current?.focus({ preventScroll: true }); } catch { /* noop */ }
    }, 0);
  }, []);
  const setExportStatus = useCallback((next: ExportStatus) => {
    if (mountedRef.current) setStatus(next);
  }, []);
  const resetLater = useCallback(() => {
    if (statusResetRef.current !== null) window.clearTimeout(statusResetRef.current);
    statusResetRef.current = window.setTimeout(() => {
      setExportStatus("idle");
      statusResetRef.current = null;
    }, 2600);
  }, [setExportStatus]);
  const focusTriggerSoon = useCallback(() => {
    const focusTrigger = () => {
      if (!mountedRef.current) return;
      const trigger = triggerRef.current;
      if (!trigger || trigger.disabled) return;
      try { trigger.focus({ preventScroll: true }); } catch { /* noop */ }
    };
    window.setTimeout(focusTrigger, 0);
    window.setTimeout(focusTrigger, 80);
    window.setTimeout(focusTrigger, 240);
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => window.requestAnimationFrame(focusTrigger));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      close({ restoreFocus: false });
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, close]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (statusResetRef.current !== null) window.clearTimeout(statusResetRef.current);
    };
  }, []);

  const disabled = places.length === 0;
  const statusMessage =
    status === "preparing" ? "Preparing export..."
      : status === "ready" ? "Download started."
        : status === "failed" ? "Download blocked. Try another format or browser."
          : "";
  const triggerLabel = disabled
    ? "Export shortlist unavailable until places are pinned"
    : status === "preparing"
      ? "Exporting shortlist"
      : "Export shortlist";
  const choosePlacement = useCallback((): MenuPlacement => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return "down";
    const rect = trigger.getBoundingClientRect();
    const estimatedPanelHeight = Math.min(280, Math.max(240, FORMATS.length * 48 + 28));
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    return spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow ? "up" : "down";
  }, []);
  const onMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!MENU_NAV_KEYS.has(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      .filter(item => !item.disabled);
    if (items.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length;
    else nextIndex = (currentIndex + 1) % items.length;

    items[nextIndex]?.focus({ preventScroll: true });
  }, []);

  const onExport = useCallback(
    (format: ExportFormatId) => {
      const exportPlaces = [...places];
      close();
      setExportStatus("preparing");
      if (statusResetRef.current !== null) {
        window.clearTimeout(statusResetRef.current);
        statusResetRef.current = null;
      }
      void buildShortlistExport(format, exportPlaces).then(file => {
        window.setTimeout(() => {
          try {
            downloadBlobFile(file.body, file.filename, file.mimeType);
            setExportStatus("ready");
          } catch {
            // Some embedded browser surfaces block synthetic downloads. Keep that visible.
            setExportStatus("failed");
          }
          focusTriggerSoon();
          resetLater();
        }, 0);
      }).catch(() => {
        setExportStatus("failed");
        focusTriggerSoon();
        resetLater();
      });
    },
    [places, close, focusTriggerSoon, resetLater, setExportStatus],
  );
  const markPointerActivated = useCallback((format: ExportFormatId) => {
    pointerActivatedFormatRef.current = format;
    window.setTimeout(() => {
      if (pointerActivatedFormatRef.current === format) {
        pointerActivatedFormatRef.current = null;
      }
    }, 0);
  }, []);
  const onFormatPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, format: ExportFormatId) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    markPointerActivated(format);
    onExport(format);
  }, [markPointerActivated, onExport]);
  const onFormatClick = useCallback((format: ExportFormatId) => {
    if (pointerActivatedFormatRef.current === format) {
      pointerActivatedFormatRef.current = null;
      return;
    }
    onExport(format);
  }, [onExport]);
  const onFormatKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, format: ExportFormatId) => {
    if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
    event.preventDefault();
    event.stopPropagation();
    onExport(format);
  }, [onExport]);

  return (
    <div ref={rootRef} className={`tc-shortlist-export relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-ghost tc-shortlist-export__trigger !text-xs !py-1 !px-2"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        disabled={disabled || status === "preparing"}
        title={triggerLabel}
        onClick={() => {
          if (!open) setPlacement(choosePlacement());
          setOpen(v => !v);
        }}
      >
        <Download className="w-3.5 h-3.5" aria-hidden />
        {status === "preparing" ? "Exporting" : "Export"}
      </button>
      {statusMessage ? (
        <span className="tc-shortlist-export__status" data-status={status} role="status" aria-live="polite">
          {statusMessage}
        </span>
      ) : null}
      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label="Export shortlist format"
          tabIndex={-1}
          className={`tc-shortlist-export__panel tc-shortlist-export__panel--${placement} tc-surface-glass panel-thin absolute right-0 sm:right-auto sm:left-0 z-20 min-w-[12.5rem] max-w-[calc(100vw-2rem)] p-2 flex flex-col gap-0.5 tc-shortlist-export__panel--open`}
          onKeyDown={onMenuKeyDown}
        >
          {FORMATS.map(fmt => (
            <button
              key={fmt.id}
              ref={fmt.id === "markdown" ? firstItemRef : undefined}
              type="button"
              role="menuitem"
              className="tc-shortlist-export__item text-left rounded-md px-2 py-1.5 hover:bg-[var(--tc-surface-muted)]"
              aria-label={`${fmt.label}: ${fmt.hint}`}
              title={`${fmt.label}: ${fmt.hint}`}
              onPointerDown={event => onFormatPointerDown(event, fmt.id)}
              onClick={() => onFormatClick(fmt.id)}
              onKeyDown={event => onFormatKeyDown(event, fmt.id)}
            >
              <span className="block text-sm text-frost font-medium">{fmt.label}</span>
              <span className="block text-[10px] text-stone-readable leading-snug">{fmt.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
