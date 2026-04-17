import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { Place, MicroclimateArchetype, TopographicDriver } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { DRIVER_LABELS } from "../types";
import { ClimateRibbon } from "./charts/ClimateRibbon";
import { PrecipBars } from "./charts/PrecipBars";
import { MicroclimateFingerprint } from "./charts/MicroclimateFingerprint";
import { RiskProfile } from "./charts/RiskProfile";
import { ContrastChart } from "./charts/ContrastChart";
import { ClimateChangeDelta } from "./charts/ClimateChangeDelta";
import { ComfortMatrix } from "./charts/ComfortMatrix";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";
import { PLACES_BY_ID } from "../data/places";
import { CONCEPTS } from "../data/glossary";
import { meanJanLow, meanJulyHigh } from "../lib/scoring";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, fmtDelta, useProse } from "../lib/units";
import {
  X, ArrowLeftRight, BookOpen, MapPin, Mountain, Sparkles, Leaf, CloudRain, Wind,
  TrendingUp, Thermometer, Droplets, Sun, ChevronRight, HelpCircle,
} from "lucide-react";

const TONE_HERO: Record<string, string> = {
  glacier: "radial-gradient(1000px 300px at 15% 0%, rgba(140,200,224,0.28), transparent 65%)",
  sage: "radial-gradient(1000px 300px at 15% 0%, rgba(198,220,189,0.22), transparent 65%)",
  ochre: "radial-gradient(1000px 300px at 15% 0%, rgba(240,210,156,0.24), transparent 65%)",
  ember: "radial-gradient(1000px 300px at 15% 0%, rgba(239,180,154,0.22), transparent 65%)",
  ice: "radial-gradient(1000px 300px at 15% 0%, rgba(195,228,241,0.2), transparent 65%)",
  aurora: "radial-gradient(1000px 300px at 15% 0%, rgba(199,181,234,0.22), transparent 65%)",
};

// Build a lookup from driver id → glossary short def where we have one.
const DRIVER_CONCEPT_MAP: Partial<Record<TopographicDriver, string>> = {
  "orographic-lift": "orographic-lift",
  "rain-shadow": "rain-shadow",
  "elevation-lapse-rate": "lapse-rate",
  "cold-air-drainage": "cold-air-pooling",
  "marine-layer": "marine-layer",
  "upwelling": "upwelling",
  "chinook-foehn": "chinook",
  "lake-effect": "lake-effect",
  "gap-winds": "gap-wind",
  "inversion": "inversion",
  "aspect-slope": "aspect",
  "monsoon-lift": "monsoon",
  "karst-infiltration": "karst",
  "river-moderation": "continentality",
  "santa-ana": "santa-ana",
  "katabatic-flow": "katabatic",
  "continentality": "continentality",
  "trade-wind": "continentality",
};

interface Props {
  place: Place | null;
  onClose: () => void;
  onCompareToggle?: (id: string) => void;
  inCompareIds?: Set<string>;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
  onOpenPlace?: (id: string) => void;
}

export function PlaceDetail({ place, onClose, onCompareToggle, inCompareIds, onPickArchetype, onOpenPlace }: Props) {
  useEffect(() => {
    if (!place) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [place, onClose]);

  return (
    <AnimatePresence>
      {place && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-30 bg-[rgba(6,14,26,0.56)] backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key={place.id}
            role="dialog"
            aria-label={`${place.name} climate profile`}
            aria-modal="true"
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.4 }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed top-0 right-0 h-full w-full md:w-[760px] max-w-full z-40 panel !rounded-none !border-y-0 !border-r-0 overflow-y-auto"
            style={{ boxShadow: "-24px 0 60px -12px rgba(0,0,0,0.55)" }}
          >
            <DetailHeader
              place={place}
              onClose={onClose}
              onCompareToggle={onCompareToggle}
              inCompare={inCompareIds?.has(place.id) ?? false}
              onPickArchetype={onPickArchetype}
            />
            <DetailBody place={place} onPickArchetype={onPickArchetype} onOpenPlace={onOpenPlace} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailHeader({
  place, onClose, onCompareToggle, inCompare, onPickArchetype,
}: {
  place: Place;
  onClose: () => void;
  onCompareToggle?: (id: string) => void;
  inCompare: boolean;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
}) {
  const { temp, dist } = useUnits();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "ice";
  const julyHigh = meanJulyHigh(place);
  const janLow = meanJanLow(place);
  const annualP = place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const sunshine = place.climate.sunshinePct
    ? Math.round(place.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12)
    : null;
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";

  return (
    <div
      className="sticky top-0 z-10 panel !rounded-none !border-x-0 !border-t-0 px-6 pt-5 pb-4 bg-[rgba(24,35,57,0.94)] backdrop-blur relative"
      style={{ backgroundImage: TONE_HERO[tone] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-stone mb-1 flex-wrap">
            <span className="chip" data-tone={place.tier === "A" ? "ochre" : place.tier === "B" ? "ice" : "sage"}>{tierLabel}</span>
            <MapPin className="w-3 h-3" />
            <span>{place.municipality ? `${place.municipality}, ` : ""}{place.region}, {place.country}</span>
            <span className="text-shadow">·</span>
            <Mountain className="w-3 h-3" />
            <span className="font-mono-num">{fmtElev(place.elevationM, dist)}</span>
            <span className="text-shadow">·</span>
            <span>{place.koppen}</span>
            <span className="text-shadow">·</span>
            <span className="font-mono-num">{place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°</span>
          </div>
          <h2 className="font-atlas text-3xl text-ice tracking-tight leading-[1.15]">{place.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {place.archetypes.map(a => (
              <button
                key={a}
                className="chip chip-btn"
                data-tone={ARCHETYPE_BY_ID[a]?.tone ?? "ice"}
                onClick={(e) => { e.stopPropagation(); onPickArchetype?.(a); onClose(); }}
                title={`Filter to ${ARCHETYPE_BY_ID[a]?.label ?? a}`}
              >
                {ARCHETYPE_BY_ID[a]?.label ?? a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onCompareToggle && (
            <button
              onClick={() => onCompareToggle(place.id)}
              className={`btn-ghost !text-xs ${inCompare ? "!border-[rgba(240,210,156,0.8)] !text-ochre-300" : ""}`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              {inCompare ? "In compare" : "Compare"}
            </button>
          )}
          <button onClick={onClose} className="btn-ghost !p-2" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        <HeroStat icon={<Thermometer className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />} label="Jul high" value={fmtTemp(julyHigh, temp)} />
        <HeroStat icon={<Thermometer className="w-3.5 h-3.5" style={{ color: "#8cc8e0" }} />} label="Jan low" value={fmtTemp(janLow, temp)} />
        <HeroStat icon={<Droplets className="w-3.5 h-3.5" style={{ color: "#c6dcbd" }} />} label="Annual precip" value={fmtPrecip(annualP, dist)} />
        {sunshine != null ? (
          <HeroStat icon={<Sun className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />} label="Sunshine" value={`${sunshine}%`} />
        ) : place.climate.hardinessZone ? (
          <HeroStat icon={<Leaf className="w-3.5 h-3.5" style={{ color: "#c6dcbd" }} />} label="Hardiness" value={place.climate.hardinessZone} />
        ) : (
          <HeroStat icon={<Mountain className="w-3.5 h-3.5" style={{ color: "#c3e4f1" }} />} label="Biome" value={place.biome.split(" / ")[0]} />
        )}
      </div>

      <div className="mt-3">
        <MiniClimateStrip place={place} height={22} />
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel-thin px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-stone flex items-center gap-1">{icon}{label}</div>
      <div className="font-mono-num text-sm text-ice">{value}</div>
    </div>
  );
}

function DetailBody({
  place, onPickArchetype, onOpenPlace,
}: {
  place: Place;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
  onOpenPlace?: (id: string) => void;
}) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const annualP = place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const [activeDriver, setActiveDriver] = useState<TopographicDriver | null>(null);

  const activeConcept = activeDriver
    ? CONCEPTS.find(c => c.id === DRIVER_CONCEPT_MAP[activeDriver])
    : null;

  return (
    <div className="p-6 space-y-6">
      <Section>
        <p className="font-atlas text-lg text-frost leading-relaxed italic">"{prose(place.summaryShort)}"</p>
        <div className="divider-contour my-4" />
        <p className="text-ice leading-relaxed">{prose(place.summaryImmersive)}</p>
      </Section>

      <Section icon={<Sparkles className="w-4 h-4" style={{ color: "#f0d29c" }} />} title="Why this climate is different here">
        <p className="text-ice leading-relaxed">{prose(place.whyDistinct)}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {place.drivers.map(d => {
            const hasConcept = DRIVER_CONCEPT_MAP[d] != null;
            const active = activeDriver === d;
            return (
              <button
                key={d}
                className="chip chip-btn"
                data-tone="ochre"
                data-active={active}
                onClick={() => setActiveDriver(active ? null : d)}
                title={hasConcept ? "Click to explain" : DRIVER_LABELS[d]}
              >
                {DRIVER_LABELS[d]}
                {hasConcept && <HelpCircle className="w-3 h-3 opacity-70" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {activeConcept && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 panel-warm p-4 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-atlas text-base text-ice">{activeConcept.term}</div>
                <button onClick={() => setActiveDriver(null)} className="text-stone hover:text-ice"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="text-sm text-frost">{prose(activeConcept.short)}</div>
              <div className="text-sm text-ice leading-relaxed mt-2">{prose(activeConcept.long)}</div>
              {activeConcept.mechanism && (
                <div className="text-xs text-stone italic mt-2"><span className="uppercase tracking-wider not-italic">Mechanism ·</span> {prose(activeConcept.mechanism)}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-sm text-stone mt-3 italic">Relief context: {prose(place.reliefContext)}</div>
      </Section>

      <Section icon={<Wind className="w-4 h-4" style={{ color: "#8cc8e0" }} />} title="Seasonal rhythm">
        <div className="space-y-4">
          <div>
            <LabelRow label={`Monthly highs & lows (°${temp})`} />
            <ClimateRibbon highs={place.climate.tempHighC} lows={place.climate.tempLowC} />
          </div>
          <div>
            <LabelRow label={`Monthly precipitation · snow band shown where applicable`} />
            <PrecipBars precip={place.climate.precipMm} snow={place.climate.snowCm} />
          </div>
          <div>
            <LabelRow label="Month-by-month comfort" />
            <ComfortMatrix place={place} />
            <div className="text-[10px] text-stone mt-2 flex items-center gap-3 flex-wrap">
              <Legend color="#89af88" text="Ideal" />
              <Legend color="#c6dcbd" text="Very good" />
              <Legend color="#f0d29c" text="Good" />
              <Legend color="#d37c5b" text="Stressed" />
              <Legend color="#9a4a2a" text="Harsh" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Microclimate fingerprint" icon={<Sparkles className="w-4 h-4" style={{ color: "#8cc8e0" }} />}>
        <div className="grid md:grid-cols-[1fr_260px] gap-6 items-center">
          <div className="space-y-2">
            <KeyValue label="Mean annual precipitation" value={fmtPrecip(annualP, dist)} />
            <KeyValue label="Frost-free days (est.)" value={`${place.climate.frostFreeDays ?? "—"}`} />
            <KeyValue label="Hardiness zone" value={place.climate.hardinessZone ?? place.growability.hardinessZone ?? "—"} />
            <KeyValue label="Chill hours (est.)" value={`${place.climate.chillHours ?? "—"}`} />
            <KeyValue label="Summer diurnal swing" value={place.climate.diurnalSummerC != null ? fmtDelta(place.climate.diurnalSummerC, temp, { signed: false }) : "—"} />
            <KeyValue label="Biome" value={place.biome} />
          </div>
          <MicroclimateFingerprint place={place} />
        </div>
      </Section>

      {(place.localContrast?.length || place.nearbyContrasts?.length) ? (
        <Section title="Local contrast" icon={<TrendingUp className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          {place.localContrast && <ContrastChart contrasts={place.localContrast} />}
          {place.nearbyContrasts && place.nearbyContrasts.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone">Nearby contrasts</div>
              {place.nearbyContrasts.map((n, i) => {
                const linked = n.placeId && PLACES_BY_ID[n.placeId];
                return linked ? (
                  <button
                    key={i}
                    onClick={() => onOpenPlace?.(n.placeId!)}
                    className="panel-thin p-3 reveal-row w-full text-left flex items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-frost text-sm">{linked.name}</div>
                      <div className="text-stone text-sm leading-relaxed">{prose(n.note)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone mt-0.5 shrink-0" />
                  </button>
                ) : (
                  <div key={i} className="panel-thin p-3">
                    <div className="font-medium text-frost text-sm">{n.label}</div>
                    <div className="text-stone text-sm leading-relaxed">{prose(n.note)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      <Section title="Soil & growability" icon={<Leaf className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel-thin p-4">
            <div className="text-[10px] uppercase tracking-wider text-stone mb-2">Soil profile</div>
            <KeyValue label="Texture" value={place.soil.texture} />
            <KeyValue label="Drainage" value={place.soil.drainage} />
            <KeyValue label="pH range" value={`${place.soil.phRange[0]}–${place.soil.phRange[1]}`} />
            {place.soil.organicMatterPct && (
              <KeyValue label="Organic matter" value={`${place.soil.organicMatterPct[0]}–${place.soil.organicMatterPct[1]}%`} />
            )}
            <KeyValue label="Water holding" value={place.soil.waterHolding} />
            {place.soil.notes && <div className="text-sm text-stone italic mt-2">{prose(place.soil.notes)}</div>}
          </div>
          <div className="panel-thin p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-stone">Growability</div>
              <div className="font-mono-num text-lg" style={{ color: "#c6dcbd" }}>{place.growability.score}<span className="text-sm text-stone">/100</span></div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-stone mb-1">Grows well</div>
              <div className="flex flex-wrap gap-1">
                {place.growability.growsWell.map(g => <span key={g} className="chip" data-tone="sage">{g}</span>)}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-stone mb-1">Tricky</div>
              <div className="flex flex-wrap gap-1">
                {place.growability.tricky.map(g => <span key={g} className="chip" data-tone="ember">{g}</span>)}
              </div>
            </div>
            {place.growability.orchard && <div className="text-sm text-ice italic mt-2">{prose(place.growability.orchard)}</div>}
            {place.growability.homeGarden && <div className="text-sm text-frost mt-2">{prose(place.growability.homeGarden)}</div>}
          </div>
        </div>
      </Section>

      <Section title="Climate risk" icon={<CloudRain className="w-4 h-4" style={{ color: "#d37c5b" }} />}>
        <RiskProfile place={place} />
      </Section>

      <Section title="Climate-change outlook">
        <ClimateChangeDelta place={place} />
      </Section>

      <Section title="Who would love this · who might not">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="panel-thin p-3 border-l-2" style={{ borderLeftColor: "#c6dcbd" }}>
            <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Fits best</div>
            <div className="text-sm text-frost">{prose(place.whoWouldLove)}</div>
          </div>
          <div className="panel-thin p-3 border-l-2" style={{ borderLeftColor: "#d37c5b" }}>
            <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Poor fit</div>
            <div className="text-sm text-frost">{prose(place.whoMightNot)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {place.relocationFit.map(t => <span key={t} className="chip" data-tone="glacier">Relocation · {t}</span>)}
          {place.travelFit.map(t => <span key={t} className="chip" data-tone="sage">Travel · {t}</span>)}
        </div>
      </Section>

      <Section title="Hidden-gem verdict · sources">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <ScorePill label="Hidden gem" value={place.scores.hiddenGem} tone="sage" />
          <ScorePill label="Microclimate uniqueness" value={place.scores.microclimateUniqueness} tone="ochre" />
          <ScorePill label="Comfort" value={place.scores.comfort} tone="glacier" />
          <ScorePill label="Resilience" value={place.scores.resilience} tone="glacier" />
          <ScorePill label="Growability" value={place.scores.growability} tone="sage" />
          <ScorePill label="Tradeoff level" value={place.scores.tradeoff} tone="ember" />
        </div>

        <div className="panel-thin p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone">Confidence</div>
            <div className="text-sm text-ice capitalize">{place.confidence}</div>
          </div>
          {place.confidenceNotes && <div className="text-xs text-stone italic max-w-[70%] text-right">{place.confidenceNotes}</div>}
        </div>

        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Citations
          </div>
          <ul className="space-y-1 text-sm">
            {place.citations.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-frost">
                <span className="chip" data-tone="ice" style={{ fontSize: "10px" }}>{c.kind.toUpperCase()}</span>
                <span>{c.label}{c.note ? <span className="text-stone italic"> — {c.note}</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="anim-fade-in">
      {title && (
        <h3 className="font-atlas text-base text-ice mb-3 flex items-center gap-2 tracking-wide">
          {icon}{title}
        </h3>
      )}
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm border-b last:border-0 border-[rgba(71,90,122,0.3)]">
      <span className="text-stone">{label}</span>
      <span className="text-frost text-right font-mono-num">{value}</span>
    </div>
  );
}

function LabelRow({ label }: { label: string }) {
  return <div className="text-[10px] uppercase tracking-wider text-stone mb-1">{label}</div>;
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-stone">{text}</span>
    </span>
  );
}

function ScorePill({ label, value, tone }: { label: string; value: number; tone: "glacier" | "sage" | "ochre" | "ember" }) {
  const c: Record<string, string> = { glacier: "#8cc8e0", sage: "#c6dcbd", ochre: "#f0d29c", ember: "#d37c5b" };
  return (
    <div className="panel-thin p-3">
      <div className="text-[10px] uppercase tracking-wider text-stone">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono-num text-xl" style={{ color: c[tone] }}>{value}</span>
        <span className="text-xs text-stone">/ 100</span>
      </div>
      <div className="h-1 rounded-full bg-[rgba(71,90,122,0.4)] mt-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: c[tone] }} />
      </div>
    </div>
  );
}
