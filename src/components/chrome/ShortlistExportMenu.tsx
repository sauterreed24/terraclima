import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { Place } from "../../types";
import { downloadBlobFile } from "../../lib/download-blob";
import type { ShortlistExportFile } from "../../lib/shortlist-export";
import { useFocusTrap } from "../../hooks/use-focus-trap";

type ExportFormatId = "markdown" | "json" | "csv" | "geojson" | "ics";

const FORMATS: ReadonlyArray<{
  id: ExportFormatId;
  label: string;
  hint: string;
}> = [
  {
    id: "markdown",
    label: "Scout plan",
    hint: "Visit windows, caveats, and dossier links",
  },
  { id: "json", label: "JSON", hint: "Minimal place rows for scripts" },
  { id: "csv", label: "CSV", hint: "Spreadsheet-friendly table" },
  { id: "geojson", label: "GeoJSON", hint: "RFC 7946 map points" },
  { id: "ics", label: "Calendar (.ics)", hint: "Best-month scouting windows" },
];

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
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useFocusTrap(panelRef, open, true);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  const disabled = places.length === 0;

  const onExport = useCallback(
    (format: ExportFormatId) => {
      const exportPlaces = [...places];
      close();
      void buildShortlistExport(format, exportPlaces).then(file => {
        window.setTimeout(() => {
          try {
            downloadBlobFile(file.body, file.filename, file.mimeType);
          } catch {
            // Some embedded browser surfaces block synthetic downloads. Keep the menu state stable.
          }
        }, 0);
      }).catch(() => {
        // Keep the menu closed if the lazy export chunk fails to load.
      });
    },
    [places, close],
  );

  return (
    <div className={`tc-shortlist-export relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-ghost !text-xs !py-1 !px-2"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        disabled={disabled}
        title={disabled ? "Pin places to export your shortlist" : "Download shortlist"}
        onClick={() => setOpen(v => !v)}
      >
        <Download className="w-3.5 h-3.5" aria-hidden />
        Export
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label="Export shortlist format"
          className="tc-shortlist-export__panel tc-surface-glass panel-thin absolute right-0 sm:right-auto sm:left-0 top-full z-20 mt-1 min-w-[12.5rem] max-w-[calc(100vw-2rem)] p-2 flex flex-col gap-0.5 tc-shortlist-export__panel--open"
        >
          {FORMATS.map(fmt => (
            <button
              key={fmt.id}
              type="button"
              role="menuitem"
              className="tc-shortlist-export__item text-left rounded-md px-2 py-1.5 hover:bg-[var(--tc-surface-muted)]"
              onClick={() => onExport(fmt.id)}
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
