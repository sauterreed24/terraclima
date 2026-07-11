import { memo, useMemo } from "react";
import { Sparkles } from "lucide-react";
import type { Place } from "../../types";
import { PLACES } from "../../data/places";
import { CLIMATE_SHIFTS, findClimateTwins } from "../../lib/climate-analog";
import { scrollDetailRootToSection } from "../../lib/detail-scroll-spy";
import { PD } from "./place-detail-nav";
import { Section } from "./place-detail-ui";

/**
 * Compact twins preview in the lived-read spine. Opens the full Climate twins
 * section (including Twin, but —) without duplicating the heavy twin UI.
 */
export const PlaceClimateTwinsTeaser = memo(function PlaceClimateTwinsTeaser({
  place,
  onOpenPlace,
  reduceMotion,
}: {
  place: Place;
  onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  reduceMotion?: boolean;
}) {
  const twins = useMemo(() => findClimateTwins(place, PLACES, 1, null), [place]);
  const lead = twins[0];
  const behavior = reduceMotion ? "auto" : "smooth";
  const drierShift = CLIMATE_SHIFTS.find(s => s.id === "drier") ?? CLIMATE_SHIFTS[0]!;

  return (
    <Section
      anchorId={PD.similarTeaser}
      title="Climate twins"
      icon={<Sparkles className="w-4 h-4" style={{ color: "#b79ee0" }} />}
    >
      {!lead ? (
        <p className="text-sm text-stone italic">No close climate analog sits in the atlas yet.</p>
      ) : (
        <div className="tc-accent-panel px-4 py-3 space-y-3" aria-label="Climate twins teaser">
          <p className="text-sm text-frost leading-snug">
            Closest same-feel stop:{" "}
            <button
              type="button"
              className="text-ice underline-offset-2 hover:underline font-medium"
              onClick={event => onOpenPlace?.(lead.place.id, { trigger: event.currentTarget })}
              aria-label={`Open ${lead.place.name}, the closest climate twin`}
              title={`Open ${lead.place.name}, the closest climate twin`}
            >
              {lead.place.name}
            </button>{" "}
            <span className="font-mono-num text-stone-readable">
              ({Math.round(lead.analog * 100)} match)
            </span>
            . Keep the year&apos;s rhythm, or nudge one axis.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="tc-twin-shift"
              onClick={() => scrollDetailRootToSection(PD.similar, { behavior })}
              title={drierShift.description}
            >
              Twin, but — {drierShift.label}
            </button>
            <button
              type="button"
              className="btn-ghost !text-xs border-[rgba(122,212,240,0.35)]"
              onClick={() => scrollDetailRootToSection(PD.similar, { behavior })}
            >
              Full twins + Twin, but…
            </button>
          </div>
        </div>
      )}
    </Section>
  );
});
