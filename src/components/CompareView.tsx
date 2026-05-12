import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useRef } from "react";
import type { Place } from "../types";
import { MicroclimateFingerprint } from "./charts/MicroclimateFingerprint";
import { ClimateRibbon } from "./charts/ClimateRibbon";
import { annualComfortMonthCount, avgRisk, meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "../lib/climate-metrics";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, useProse } from "../lib/units";
import { buildGeospatialAnalysis } from "../lib/geospatial-analysis";
import { scoreLivability, feltComfortScore, livedFrictionScore } from "../lib/livability-score";
import { assessLiveFit } from "../lib/live-fit";
import { useFocusTrap } from "../hooks/use-focus-trap";
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
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const placeCount = `${places.length} ${places.length === 1 ? "place" : "places"}`;
  const isSinglePlace = places.length === 1;
  const title = isSinglePlace ? `${placeCount} saved to compare` : `${placeCount} side by side`;
  const helperText = isSinglePlace
    ? "Add another place from any card or profile to start a side-by-side comparison."
    : "Compare climate fingerprints, seasonal ranges, and screening scores across the saved places.";
  const decisionProfiles = useMemo(() => places.map(place => {
    const liveFit = assessLiveFit(place);
    const livability = scoreLivability(place);
    return {
      place,
      liveFitScore: liveFit.score,
      livabilityScore: livability.score,
      feltComfort: Math.round(feltComfortScore(place)),
      livedEase: Math.round(livedFrictionScore(place)),
      easyMonths: annualComfortMonthCount(place),
      riskLoad: Math.round(avgRisk(place) * 20),
    };
  }), [places]);
  const decisionById = useMemo(
    () => new Map(decisionProfiles.map(profile => [profile.place.id, profile])),
    [decisionProfiles],
  );
  const compareHighlights = useMemo(() => {
    if (places.length < 2) return [];
    const coolestSummer = places.reduce((best, place) => meanSummerHigh(place) < meanSummerHigh(best) ? place : best, places[0]);
    const mildestWinter = places.reduce((best, place) => meanJanLow(place) > meanJanLow(best) ? place : best, places[0]);
    const bestLiveFit = decisionProfiles.reduce((best, profile) => profile.liveFitScore > best.liveFitScore ? profile : best, decisionProfiles[0]);
    const topLivability = decisionProfiles.reduce((best, profile) => profile.livabilityScore > best.livabilityScore ? profile : best, decisionProfiles[0]);
    const lowestRisk = decisionProfiles.reduce((best, profile) => profile.riskLoad < best.riskLoad ? profile : best, decisionProfiles[0]);
    const bestGrowability = places.reduce((best, place) => place.scores.growability > best.scores.growability ? place : best, places[0]);
    return [
      { label: "Coolest summer", place: coolestSummer, value: fmtTemp(meanSummerHigh(coolestSummer), temp, { digits: 1 }) },
      { label: "Mildest winter", place: mildestWinter, value: fmtTemp(meanJanLow(mildestWinter), temp, { digits: 1 }) },
      { label: "Best live-here fit", place: bestLiveFit.place, value: `${bestLiveFit.liveFitScore}/100` },
      { label: "Top livability", place: topLivability.place, value: `${topLivability.livabilityScore}/100` },
      { label: "Lowest risk load", place: lowestRisk.place, value: `${lowestRisk.riskLoad}/100` },
      { label: "Best growability", place: bestGrowability, value: `${bestGrowability.scores.growability}/100` },
    ];
  }, [decisionProfiles, places, temp]);
  /**
   * Mobile (<lg breakpoint via the Tailwind class) gets fixed-width columns
   * with a horizontal scroll snap so 2–4 places stay readable on a phone
   * instead of collapsing the column min-width below 17rem and being
   * essentially unusable. Desktop fills the available width.
   */
  const columnTemplate = useMemo(
    () => `repeat(${places.length}, minmax(min(17rem, 88vw), 1fr))`,
    [places.length],
  );
  useFocusTrap(panelRef, open && places.length > 0);

  useEffect(() => {
    if (!open || places.length === 0) return;
    closeBtnRef.current?.focus({ preventScroll: true });
  }, [open, places.length]);
  return (
    <AnimatePresence>
      {open && places.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="fixed inset-0 z-50 bg-[rgba(62,38,24,0.35)] backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? { opacity: 1 } : { y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { y: 30, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            tabIndex={-1}
            className="max-w-[1280px] mx-auto p-4 sm:p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-stone">Compare</div>
                <h2 id={titleId} className="font-atlas text-2xl text-ice">{title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-stone-readable">{helperText}</p>
              </div>
              <button ref={closeBtnRef} type="button" onClick={onClose} className="btn-ghost"><X className="w-4 h-4" /> Close</button>
            </div>

            {compareHighlights.length > 0 ? (
              <div className="compare-insight-strip" aria-label="Comparison highlights">
                {compareHighlights.map(item => (
                  <div key={item.label} className="compare-insight-strip__item">
                    <span className="compare-insight-strip__label">{item.label}</span>
                    <span className="compare-insight-strip__place" title={item.place.name}>{item.place.name}</span>
                    <span className="compare-insight-strip__value">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="text-[11px] text-stone-readable lg:hidden mb-2">
              {isSinglePlace ? "Add a second place to unlock the comparison lane." : `Swipe sideways to compare -> (${placeCount})`}
            </div>
            <div className="overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scroll-smooth" aria-label="Scrollable comparison columns" style={{ touchAction: "pan-x pan-y" }}>
              <div className="grid gap-4 min-w-full snap-mandatory" style={{ gridTemplateColumns: columnTemplate }}>
              {places.map(p => {
                const geo = buildGeospatialAnalysis(p);
                const decision = decisionById.get(p.id)!;
                return (
                <div key={p.id} className="panel p-4 relative snap-start">
                  <button type="button" onClick={() => onRemove(p.id)} className="absolute top-2 right-2 text-stone hover:text-ice min-h-[44px] min-w-[44px] inline-flex items-center justify-center" aria-label={`Remove ${p.name} from comparison`}>
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-xs text-stone">{p.region}, {p.country}</div>
                  <h3 className="font-atlas text-lg text-ice mb-3">{p.name}</h3>

                  <MicroclimateFingerprint place={p} size={220} />

                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <Row label="Elevation" value={fmtElev(p.elevationM, dist)} />
                    <Row label="Köppen" value={p.koppen} />
                    <Row label="JJA high" value={fmtTemp(meanSummerHigh(p), temp, { digits: 1 })} />
                    <Row label="Jan low" value={fmtTemp(meanJanLow(p), temp, { digits: 1 })} />
                    <Row label="Annual precip" value={fmtPrecip(getAnnualPrecipMm(p), dist)} />
                    <Row label="Frost-free" value={`${p.climate.frostFreeDays ?? "—"} d`} />
                    <Row label="Hardiness" value={p.growability.hardinessZone ?? p.climate.hardinessZone ?? "—"} />
                    <Row label="Chill hrs" value={`${p.climate.chillHours ?? "—"}`} />
                    <Row label="Live-here fit" value={`${decision.liveFitScore}/100`} />
                    <Row label="Livability" value={`${decision.livabilityScore}/100`} />
                    <Row label="Felt comfort" value={`${decision.feltComfort}/100`} />
                    <Row label="Easy months" value={`${decision.easyMonths}/12`} />
                    <Row label="Lived ease" value={`${decision.livedEase}/100`} />
                    <Row label="Uniqueness" value={p.scores.microclimateUniqueness.toString()} />
                    <Row label="Geo signal" value={`${geo.geospatialSignalScore}/100`} />
                    <Row label="EO fit" value={`${geo.eoObservabilityScore}/100`} />
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
                );
              })}
              </div>
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
