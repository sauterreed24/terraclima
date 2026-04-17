import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { Place } from "../types";
import { MicroclimateFingerprint } from "./charts/MicroclimateFingerprint";
import { ClimateRibbon } from "./charts/ClimateRibbon";
import { meanJanLow, meanJulyHigh } from "../lib/scoring";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, useProse } from "../lib/units";
import { X } from "lucide-react";

interface Props {
  places: Place[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function CompareView({ places, open, onClose, onRemove }: Props) {
  const { temp, dist } = useUnits();
  const prose = useProse();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && places.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[rgba(13,20,32,0.88)] backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="max-w-[1280px] mx-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-stone">Compare</div>
                <h2 className="font-atlas text-2xl text-ice">{places.length} places side by side</h2>
              </div>
              <button onClick={onClose} className="btn-ghost"><X className="w-4 h-4" /> Close</button>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${places.length}, minmax(0, 1fr))` }}>
              {places.map(p => (
                <div key={p.id} className="panel p-4 relative">
                  <button onClick={() => onRemove(p.id)} className="absolute top-2 right-2 text-stone hover:text-ice" aria-label="Remove">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-xs text-stone">{p.region}, {p.country}</div>
                  <h3 className="font-atlas text-lg text-ice mb-3">{p.name}</h3>

                  <MicroclimateFingerprint place={p} size={220} />

                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <Row label="Elevation" value={fmtElev(p.elevationM, dist)} />
                    <Row label="Köppen" value={p.koppen} />
                    <Row label="Jul high" value={fmtTemp(meanJulyHigh(p), temp, { digits: 1 })} />
                    <Row label="Jan low" value={fmtTemp(meanJanLow(p), temp, { digits: 1 })} />
                    <Row label="Annual precip" value={fmtPrecip(p.climate.annualPrecipMm ?? p.climate.precipMm.reduce((a, b) => a + b, 0), dist)} />
                    <Row label="Frost-free" value={`${p.climate.frostFreeDays ?? "—"} d`} />
                    <Row label="Hardiness" value={p.growability.hardinessZone ?? p.climate.hardinessZone ?? "—"} />
                    <Row label="Chill hrs" value={`${p.climate.chillHours ?? "—"}`} />
                    <Row label="Uniqueness" value={p.scores.microclimateUniqueness.toString()} />
                    <Row label="Hidden gem" value={p.scores.hiddenGem.toString()} />
                    <Row label="Resilience" value={p.scores.resilience.toString()} />
                    <Row label="Growability" value={p.scores.growability.toString()} />
                  </div>

                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Climate ribbon</div>
                    <ClimateRibbon highs={p.climate.tempHighC} lows={p.climate.tempLowC} height={140} />
                  </div>

                  <p className="text-sm text-frost mt-3 leading-snug">{prose(p.summaryShort)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 border-b last:border-0 border-[rgba(71,90,122,0.3)]">
      <span className="text-stone text-xs uppercase tracking-wide">{label}</span>
      <span className="text-frost font-mono-num">{value}</span>
    </div>
  );
}
