import { memo } from "react";
import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { meanJanLow, meanJulyHigh } from "../lib/scoring";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, useProse } from "../lib/units";
import { PLACE_ANNUAL_PRECIP } from "../data/places";
import { ArrowRight } from "lucide-react";

interface Props {
  place: Place;
  selected?: boolean;
  note?: string;
  onClick?: () => void;
  onCompareToggle?: () => void;
  inCompare?: boolean;
  compact?: boolean;
}

const TONE_ACCENT: Record<string, string> = {
  glacier: "linear-gradient(180deg, #8cc8e0 0%, #2b7a9a 100%)",
  sage: "linear-gradient(180deg, #c6dcbd 0%, #567957 100%)",
  ochre: "linear-gradient(180deg, #f0d29c 0%, #9a7c3b 100%)",
  ember: "linear-gradient(180deg, #efb49a 0%, #9a4a2a 100%)",
  ice: "linear-gradient(180deg, #c3e4f1 0%, #4faacd 100%)",
  aurora: "linear-gradient(180deg, #c7b5ea 0%, #5a4397 100%)",
};

// Archetype tone expressed as comma-separated RGB so CSS can interpolate
// opacity in box-shadow without a second JS pass. Piped into the card via
// the --tone-rgb custom property.
const TONE_RGB: Record<string, string> = {
  glacier: "140, 200, 224",
  sage: "198, 220, 189",
  ochre: "240, 210, 156",
  ember: "239, 180, 154",
  ice: "195, 228, 241",
  aurora: "199, 181, 234",
};

/**
 * Atlas place card.
 *
 * Memoized and reduced to a plain button + CSS hover transform. Previously
 * each card mounted a framer-motion `motion.button` with `layout` and
 * `whileHover`, which on a 40-card grid meant 40 motion runtimes doing
 * per-frame work even when idle. Switching to CSS-only hover (no JS) drops
 * the interactive render budget dramatically on low-spec hardware.
 */
export const PlaceCard = memo(function PlaceCard({
  place, selected, note, onClick, onCompareToggle, inCompare, compact,
}: Props) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const julyHighC = meanJulyHigh(place);
  const janLowC = meanJanLow(place);
  const annualP = PLACE_ANNUAL_PRECIP[place.id] ?? place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const primaryArchetype = place.archetypes[0] ? ARCHETYPE_BY_ID[place.archetypes[0]] : null;
  const tone = primaryArchetype?.tone ?? "ice";
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";

  const toneRgb = TONE_RGB[tone] ?? TONE_RGB.ice;

  return (
    <button
      onClick={onClick}
      className={`place-card place-card--tinted text-left panel w-full relative overflow-hidden group${selected ? " place-card--selected" : ""}`}
      style={{
        // Tint the hover/selected glow with the primary archetype's colour.
        // A string custom property so CSS rgba() can consume it.
        ["--tone-rgb" as string]: toneRgb,
      }}
      aria-pressed={selected ? true : undefined}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{ background: TONE_ACCENT[tone] }}
      />

      <div className="p-4 pl-[calc(1rem+3px)]">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-atlas text-lg text-ice truncate">{place.name}</h3>
              <span className="text-xs text-stone">{place.region}, {place.country === "USA" ? "US" : place.country === "Canada" ? "CA" : "MX"}</span>
              <ArrowRight className="w-3 h-3 text-stone opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {!compact && (
              <div className="text-xs text-stone mt-0.5">
                {primaryArchetype?.label}
                {" · "}
                <span className="font-mono-num">{fmtElev(place.elevationM, dist)}</span>
                {" · "}
                {place.koppen}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="chip" data-tone={place.tier === "A" ? "ochre" : place.tier === "B" ? "ice" : "sage"} title={`Tier ${place.tier}`}>{tierLabel}</span>
            {onCompareToggle && (
              <button
                onClick={(e) => { e.stopPropagation(); onCompareToggle(); }}
                className={`btn-ghost !px-2 !py-1 !text-xs ${inCompare ? "!border-[rgba(240,210,156,0.8)] !text-ochre-300" : ""}`}
                title="Add to comparison"
              >
                {inCompare ? "− Compare" : "+ Compare"}
              </button>
            )}
          </div>
        </div>

        {!compact && (
          <p className="text-sm text-frost leading-snug mb-3 line-clamp-2">{prose(place.summaryShort)}</p>
        )}

        {!compact && (
          <div className="mb-3 rounded-md overflow-hidden" style={{ filter: "saturate(1.05)" }}>
            <MiniClimateStrip place={place} />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <Stat label="Jul high" value={fmtTemp(julyHighC, temp)} tone="ochre" />
          <Stat label="Jan low" value={fmtTemp(janLowC, temp)} tone="glacier" />
          <Stat label="Annual" value={fmtPrecip(annualP, dist)} tone="sage" />
          <Stat label="Unique" value={place.scores.microclimateUniqueness.toString()} tone="ice" />
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-1 mt-3">
            {place.archetypes.slice(0, 3).map(a => (
              <span key={a} className="chip" data-tone={ARCHETYPE_BY_ID[a]?.tone ?? "ice"}>
                {ARCHETYPE_BY_ID[a]?.label ?? a}
              </span>
            ))}
          </div>
        )}

        {note && <div className="text-xs text-stone italic mt-2">{note}</div>}
      </div>
    </button>
  );
});

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  const color: Record<string, string> = {
    ochre: "#f0d29c",
    glacier: "#8cc8e0",
    sage: "#c6dcbd",
    ice: "#c3e4f1",
  };
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-stone">{label}</span>
      <span className="font-mono-num text-sm" style={{ color: color[tone] ?? "#d3dce9" }}>{value}</span>
    </div>
  );
}
