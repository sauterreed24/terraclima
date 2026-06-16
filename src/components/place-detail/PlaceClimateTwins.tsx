import { memo, useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { Place } from "../../types";
import { PLACES } from "../../data/places";
import { ClimateRibbon } from "../charts/ClimateRibbon";
import {
  CLIMATE_SHIFTS,
  buildClimateTwinTradeoffRead,
  findClimateTwins,
  type ClimateAnalogAxis,
  type ClimateShiftId,
} from "../../lib/climate-analog";

/** Palette per analog axis — reads cleanly on the bright paper surface. */
const AXIS_TONE: Record<ClimateAnalogAxis["key"], string> = {
  thermalLevel: "#e08a5a",
  seasonalShape: "#b79ee0",
  seasonalAmplitude: "#4faacd",
  moisture: "#1a8fa8",
  precipRegime: "#5ec4dc",
  aridity: "#c7833a",
  continentality: "#7a9b45",
  atmosphere: "#3d8f55",
  mechanism: "#d6ad66",
};

function countryCode(c: Place["country"]): string {
  return c === "USA" ? "US" : c === "Canada" ? "CA" : "MX";
}

/** Compact 9-bar "alignment fingerprint" — one bar per analog axis. */
const AlignmentFingerprint = memo(function AlignmentFingerprint({ axes }: { axes: ClimateAnalogAxis[] }) {
  return (
    <div className="tc-twin-fingerprint" aria-hidden="true">
      {axes.map(ax => (
        <span
          key={ax.key}
          className="tc-twin-fingerprint__bar"
          title={`${ax.label}: ${Math.round(ax.closeness * 100)}/100`}
          style={{
            ["--c" as string]: AXIS_TONE[ax.key],
            ["--h" as string]: `${Math.round(Math.max(8, ax.closeness * 100))}%`,
          }}
        />
      ))}
    </div>
  );
});

function MatchMeter({ value }: { value: number }) {
  return (
    <span className="tc-twin-card__match">
      <span className="tc-twin-card__match-num font-mono-num">{value}</span>
      <small>match</small>
    </span>
  );
}

export const PlaceClimateTwins = memo(function PlaceClimateTwins({
  place,
  onOpenPlace,
}: {
  place: Place;
  onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
}) {
  const [shift, setShift] = useState<ClimateShiftId | null>(null);
  const [isPending, startTransition] = useTransition();
  const twins = useMemo(() => findClimateTwins(place, PLACES, 6, shift), [place, shift]);
  const selectShift = (id: ClimateShiftId) => {
    startTransition(() => {
      setShift(prev => (prev === id ? null : id));
    });
  };

  if (twins.length === 0) {
    return <div className="text-sm text-stone italic">No close climate analog sits in the atlas yet.</div>;
  }

  const [lead, ...rest] = twins;
  const tradeoffRead = buildClimateTwinTradeoffRead(place, lead, shift);

  return (
    <div className="tc-twins" aria-busy={isPending || undefined} data-pending={isPending || undefined}>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isPending ? "Updating climate twins." : ""}
      </span>
      <p className="tc-twins__intro">
        Ranked by how the <em>whole year</em> lines up — overall warmth, the shape of the seasons, when the rain
        falls, and the air — not just a shared label. Pick a nudge to find a twin that keeps the rhythm but shifts one thing.
      </p>

      <div className="tc-twins__shifts" role="group" aria-label="Find a twin, but shifted">
        <span className="tc-twins__shifts-label">Twin, but —</span>
        {CLIMATE_SHIFTS.map(s => (
          <button
            key={s.id}
            type="button"
            className="tc-twin-shift"
            aria-pressed={shift === s.id}
            title={s.description}
            onClick={() => selectShift(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="tc-twins__tradeoff" role="group" aria-label="Climate twin tradeoff read">
        <div>
          <span className="tc-twins__tradeoff-kicker">{tradeoffRead.label}</span>
          <p>{tradeoffRead.summary}</p>
        </div>
        <div className="tc-twins__tradeoff-grid" aria-label="Top twin relocation read">
          {tradeoffRead.shared.map(item => (
            <span key={item} className="tc-twins__tradeoff-chip" data-tone="match">
              Keeps {item}
            </span>
          ))}
          <span className="tc-twins__tradeoff-chip" data-tone="watch">
            Watch: {tradeoffRead.tradeoff}
          </span>
        </div>
        <p className="tc-twins__tradeoff-action">{tradeoffRead.nextAction}</p>
      </div>

      <button
        type="button"
        className="tc-twin-lead reveal-row"
        onClick={event => onOpenPlace?.(lead.place.id, { trigger: event.currentTarget })}
        aria-label={`Open ${lead.place.name}, the closest climate twin, ${Math.round(lead.analog * 100)} out of 100 match`}
        title={`Open ${lead.place.name}, the closest climate twin, ${Math.round(lead.analog * 100)} out of 100 match`}
      >
        <div className="tc-twin-lead__head">
          <span className="tc-twin-lead__kicker">
            <Sparkles className="w-3 h-3" aria-hidden /> {shift ? "Top shifted twin" : "Closest climate twin"}
          </span>
          <div className="tc-twin-lead__title">
            <div>
              <div className="tc-twin-card__name">{lead.place.name}</div>
              <div className="tc-twin-card__meta">{lead.place.region}, {countryCode(lead.place.country)} · {lead.place.koppen}</div>
            </div>
            <MatchMeter value={Math.round(lead.analog * 100)} />
          </div>
        </div>

        <div className="tc-twin-lead__ribbon">
          <ClimateRibbon
            highs={place.climate.tempHighC}
            lows={place.climate.tempLowC}
            refHighs={lead.place.climate.tempHighC}
            refLows={lead.place.climate.tempLowC}
            refLabel={lead.place.name}
            height={170}
          />
          <div className="tc-twin-lead__legend">
            <span><i className="tc-twin-lead__swatch tc-twin-lead__swatch--here" />{place.name}</span>
            <span><i className="tc-twin-lead__swatch tc-twin-lead__swatch--twin" />{lead.place.name}</span>
          </div>
        </div>

        <AlignmentFingerprint axes={lead.axes} />
        <p className="tc-twin-card__synopsis">{lead.synopsis}</p>
      </button>

      <div className="tc-twins__grid">
        {rest.map(twin => (
          <button
            key={twin.place.id}
            type="button"
            className="tc-twin-card reveal-row"
            onClick={event => onOpenPlace?.(twin.place.id, { trigger: event.currentTarget })}
            aria-label={`Open ${twin.place.name}, climate match ${Math.round(twin.analog * 100)} out of 100`}
            title={`Open ${twin.place.name}, climate match ${Math.round(twin.analog * 100)} out of 100`}
          >
            <div className="tc-twin-card__head">
              <div className="min-w-0">
                <div className="tc-twin-card__name">{twin.place.name}</div>
                <div className="tc-twin-card__meta">{twin.place.region}, {countryCode(twin.place.country)} · {twin.place.koppen}</div>
              </div>
              <MatchMeter value={Math.round(twin.analog * 100)} />
            </div>
            <AlignmentFingerprint axes={twin.axes} />
            <p className="tc-twin-card__synopsis">{twin.synopsis}</p>
          </button>
        ))}
      </div>

      <div className="tc-twins__foot">
        Twin score blends thermal level, seasonal shape, swing, moisture, rain timing, water-balance aridity,
        continentality, air, and shared terrain mechanism.
        Editorial climate kinship for scouting — not a forecast, cost-of-living, or appraisal claim.
      </div>
    </div>
  );
});
