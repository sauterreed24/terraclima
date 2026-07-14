import { useMemo } from "react";
import { Home } from "lucide-react";
import type { Place, ScenarioId } from "../../types";
import {
  buildHomeBaseComparison,
  formatHomeDeltaValue,
  type HomeDeltaSignal,
} from "../../lib/home-base";
import { CLIMATE_NORMALS_PERIOD } from "../../lib/atlas-metadata";
import { classifyDossierSection } from "../../lib/evidence-summary";
import { scenarioMeta } from "../../lib/climate-projection";
import { useProse, useUnits } from "../../lib/units";
import { PD } from "./place-detail-nav";
import { Section } from "./place-detail-ui";
import { EvidenceClassLabel } from "./PlaceEvidenceSummary";

const SECTION_ICON = <Home className="w-4 h-4" style={{ color: "#5ec4dc" }} aria-hidden />;

/**
 * "Versus your home base" — relocation deltas when a home is set, or a
 * fixed placeholder CTA when the reader has not pinned one yet.
 *
 * Dossier always uses present-day normals. When Explorer is on a 2050
 * scenario layer, cards/Compare diff projected place vs projected home —
 * this section stays on authored normals and says so.
 */
export function PlaceVersusHome({
  place,
  home,
  onHomeBaseToggle,
  scenario = "now",
}: {
  place: Place;
  home: Place | null;
  onHomeBaseToggle?: (id: string) => void;
  scenario?: ScenarioId;
}) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const comparison = useMemo(
    () => (home ? buildHomeBaseComparison(home, place) : null),
    [home, place],
  );
  const setHomeLabel = `Set ${place.name} as your home base for climate deltas`;
  const clearHomeBaseLabel = `Clear ${place.name} as your home base`;

  if (!home || !comparison) {
    return (
      <Section anchorId={PD.vsHome} title="Versus your home base" icon={SECTION_ICON}>
        <div className="tc-accent-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-frost leading-snug max-w-xl">
            Set a home base to see how summers, winters, moisture, sun, snow, comfortable months,
            and hazard load here compare with the climate you know. Use this place, or open your
            town&apos;s dossier and press <kbd className="kbd">H</kbd>.
          </p>
          {onHomeBaseToggle ? (
            <button
              type="button"
              className="btn-primary !text-xs min-w-0 max-w-full whitespace-normal"
              onClick={() => onHomeBaseToggle(place.id)}
              aria-label={setHomeLabel}
              title={setHomeLabel}
            >
              Set {place.name} as home
            </button>
          ) : null}
        </div>
      </Section>
    );
  }

  if (comparison.isSame) {
    return (
      <Section anchorId={PD.vsHome} title="Your home base" icon={SECTION_ICON}>
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
    <Section anchorId={PD.vsHome} title={`Versus your home base · ${home.name}`} icon={SECTION_ICON}>
      <div className="panel-thin p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EvidenceClassLabel cls={classifyDossierSection("vs-home")} />
        </div>
        <p className="text-sm text-frost leading-snug">{prose(comparison.headline)}</p>
        <div className="divider-contour my-3" />
        <ul className="grid grid-cols-2 @3xl/dossier:grid-cols-4 gap-2" aria-label={`Climate deltas, ${place.name} minus ${home.name}`}>
          {comparison.signals.map(signal => (
            <DeltaTile key={signal.id} signal={signal} temp={temp} dist={dist} />
          ))}
        </ul>
        <p className="text-[11px] text-stone-readable leading-snug mt-3">
          Deltas read {place.name} minus {home.name} from {CLIMATE_NORMALS_PERIOD} normals — a
          screening lens, not a forecast. Change your home base from any dossier header, the{" "}
          <kbd className="kbd">H</kbd> shortcut, or the count strip above the ranked cards.
          {scenario !== "now" ? (
            <>
              {" "}Explorer cards and Compare currently use the{" "}
              <strong>{scenarioMeta(scenario).short}</strong> projected layer for vs-home chips;
              this dossier section stays on present-day normals.
            </>
          ) : null}
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
