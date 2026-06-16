import { useMemo } from "react";
import { Home } from "lucide-react";
import type { Place } from "../../types";
import {
  buildHomeBaseComparison,
  formatHomeDeltaValue,
  type HomeDeltaSignal,
} from "../../lib/home-base";
import { CLIMATE_NORMALS_PERIOD } from "../../lib/atlas-metadata";
import { useProse, useUnits } from "../../lib/units";
import { Section } from "./place-detail-ui";

const SECTION_ICON = <Home className="w-4 h-4" style={{ color: "#5ec4dc" }} aria-hidden />;

/**
 * "Versus your home base" — the relocation-first delta read. Renders only
 * when the reader has pinned a home base in the app shell. All deltas are
 * pure functions of the authored normals (see src/lib/home-base.ts); when
 * the open dossier IS the home base, the section flips into a short
 * baseline explainer with a clear control.
 */
export function PlaceVersusHome({
  place,
  home,
  onHomeBaseToggle,
}: {
  place: Place;
  home: Place;
  onHomeBaseToggle?: (id: string) => void;
}) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const comparison = useMemo(() => buildHomeBaseComparison(home, place), [home, place]);
  const clearHomeBaseLabel = `Clear ${place.name} as your home base`;

  if (comparison.isSame) {
    return (
      <Section anchorId="pd-vs-home" title="Your home base" icon={SECTION_ICON}>
        <div className="tc-accent-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-frost leading-snug max-w-xl">
            {place.name} is your climate baseline. Every other card, dossier, and Compare column
            now reads as a delta against it — summers, winters, moisture, sun, snow, comfortable
            months, and hazard load.
          </p>
          {onHomeBaseToggle ? (
            <button
              type="button"
              className="btn-ghost tc-home-base-clear !text-xs shrink-0"
              onClick={() => onHomeBaseToggle(place.id)}
              aria-label={clearHomeBaseLabel}
              title={clearHomeBaseLabel}
            >
              Clear home base
            </button>
          ) : null}
        </div>
      </Section>
    );
  }

  return (
    <Section anchorId="pd-vs-home" title={`Versus your home base — ${home.name}`} icon={SECTION_ICON}>
      <div className="panel-thin p-4">
        <p className="text-sm text-frost leading-snug">{prose(comparison.headline)}</p>
        <div className="divider-contour my-3" />
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2" aria-label={`Climate deltas, ${place.name} minus ${home.name}`}>
          {comparison.signals.map(signal => (
            <DeltaTile key={signal.id} signal={signal} temp={temp} dist={dist} />
          ))}
        </ul>
        <p className="text-[11px] text-stone-readable leading-snug mt-3">
          Deltas read {place.name} minus {home.name} from {CLIMATE_NORMALS_PERIOD} normals — a
          screening lens, not a forecast. Change your home base from any dossier header, the{" "}
          <kbd className="kbd">H</kbd> shortcut, or the count strip above the ranked cards.
        </p>
      </div>
    </Section>
  );
}

function DeltaTile({
  signal,
  temp,
  dist,
}: {
  signal: HomeDeltaSignal;
  temp: ReturnType<typeof useUnits>["temp"];
  dist: ReturnType<typeof useUnits>["dist"];
}) {
  const similar = signal.direction === "similar";
  return (
    <li className="panel-thin px-3 py-2" title={signal.basis}>
      <div className="text-[10px] uppercase tracking-wider text-stone">{signal.label}</div>
      <div className="font-mono-num text-sm text-ice mt-0.5 flex items-baseline gap-1">
        {similar ? (
          <span aria-hidden>≈</span>
        ) : (
          <span aria-hidden className={signal.direction === "higher" ? "text-ochre-300" : "text-glacier-700"}>
            {signal.direction === "higher" ? "▲" : "▼"}
          </span>
        )}
        <span>{similar ? "similar" : formatHomeDeltaValue(signal, temp, dist)}</span>
      </div>
      <div className="mt-1">
        <span className="chip" data-tone={signal.tone}>{signal.descriptor}</span>
      </div>
    </li>
  );
}
