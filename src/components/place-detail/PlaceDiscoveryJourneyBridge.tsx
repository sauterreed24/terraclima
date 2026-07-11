import { Compass, Home, Sparkles } from "lucide-react";
import type { Place } from "../../types";
import { scrollDetailRootToSection } from "../../lib/detail-scroll-spy";
import { PD } from "./place-detail-nav";

/**
 * Compact first-session bridge after the mechanism section: set home →
 * compare deltas → explore climate twins.
 */
export function PlaceDiscoveryJourneyBridge({
  place,
  homePlace,
  onHomeBaseToggle,
  reduceMotion,
}: {
  place: Place;
  homePlace?: Place | null;
  onHomeBaseToggle?: (id: string) => void;
  reduceMotion?: boolean;
}) {
  const behavior = reduceMotion ? "auto" : "smooth";
  const setHomeLabel = `Set ${place.name} as your home base for climate deltas`;
  const hasHome = Boolean(homePlace);

  return (
    <aside
      className="tc-accent-panel px-4 py-3 space-y-2"
      aria-label="First-session climate journey"
    >
      <div className="text-[10px] uppercase tracking-wider text-glacier-700 flex items-center gap-1.5">
        <Compass className="w-3.5 h-3.5" aria-hidden />
        Next in this profile
      </div>
      {!hasHome ? (
        <>
          <p className="text-sm text-frost leading-snug max-w-2xl">
            Set this place—or your town—as home base to unlock climate deltas, then find climate
            twins with clearer tradeoffs.
          </p>
          {onHomeBaseToggle ? (
            <button
              type="button"
              className="btn-primary !text-xs"
              onClick={() => onHomeBaseToggle(place.id)}
              aria-label={setHomeLabel}
              title={setHomeLabel}
            >
              <Home className="w-3.5 h-3.5" aria-hidden />
              Set {place.name} as home
            </button>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-frost leading-snug max-w-2xl">
            Home base is set{homePlace ? ` (${homePlace.name})` : ""}. Compare the deltas, then
            pressure-test climate twins.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost !text-xs border-[rgba(122,212,240,0.35)]"
              onClick={() => scrollDetailRootToSection(PD.vsHome, { behavior })}
            >
              <Home className="w-3.5 h-3.5" aria-hidden />
              Versus home
            </button>
            <button
              type="button"
              className="btn-ghost !text-xs border-[rgba(122,212,240,0.35)]"
              onClick={() => scrollDetailRootToSection(PD.similar, { behavior })}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              Climate twins
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
