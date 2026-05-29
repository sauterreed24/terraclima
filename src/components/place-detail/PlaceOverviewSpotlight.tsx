import { useMemo } from "react";
import { Compass, Plane, Home, UserMinus, ThermometerSun } from "lucide-react";
import type { Place } from "../../types";
import { composePlaceExperience } from "../../lib/place-overview";
import { fmtTemp, useProse, useUnits } from "../../lib/units";

/**
 * Overview spotlight — the humanistic lead of every place dossier. Answers
 * "what does this place actually feel like?" with an evocative lede, a rich
 * immersive read, a four-season walkthrough, and who-it-fits framing, before
 * the analytical sections begin.
 */
export function PlaceOverviewSpotlight({
  place,
  anchorId,
  seasonsAnchorId,
}: {
  place: Place;
  anchorId: string;
  seasonsAnchorId: string;
}) {
  const prose = useProse();
  const { temp } = useUnits();
  const exp = useMemo(() => composePlaceExperience(place), [place]);

  return (
    <section id={anchorId} className="place-overview detail-doc-section anim-fade-in" aria-labelledby={`${anchorId}-title`}>
      <div className="place-overview__head">
        <span className="place-overview__eyebrow">
          <Compass className="w-3.5 h-3.5" aria-hidden />
          What it actually feels like
        </span>
        <p id={`${anchorId}-title`} className="place-overview__lede">
          {prose(exp.lede)}
        </p>
      </div>

      <p className="place-overview__immersive">{prose(exp.immersive)}</p>

      <div className="place-overview__feel">
        <ThermometerSun className="w-4 h-4 shrink-0" aria-hidden />
        <p>{prose(exp.feelLine)}</p>
      </div>

      <div id={seasonsAnchorId} className="place-overview__seasons scroll-mt-28" aria-label="Season-by-season feel">
        <div className="place-overview__seasons-label">The year, season by season</div>
        <div className="place-overview__season-grid">
          {exp.seasons.map(season => (
            <article key={season.key} className="place-overview__season" data-tone={season.tone}>
              <header className="place-overview__season-head">
                <span className="place-overview__season-glyph" aria-hidden>{season.glyph}</span>
                <div className="min-w-0">
                  <div className="place-overview__season-name">{season.label}</div>
                  <div className="place-overview__season-months">{season.monthsLabel}</div>
                </div>
                <div className="place-overview__season-temps" aria-label={`Typical high ${fmtTemp(season.highC, temp)}, low ${fmtTemp(season.lowC, temp)}`}>
                  <span className="font-mono-num place-overview__season-high">{fmtTemp(season.highC, temp)}</span>
                  <span className="font-mono-num place-overview__season-low">{fmtTemp(season.lowC, temp)}</span>
                </div>
              </header>
              <div className="place-overview__season-headline">{season.headline}</div>
              <p className="place-overview__season-detail">{prose(season.detail)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="place-overview__fit">
        <div className="place-overview__fit-card" data-kind="travel">
          <div className="place-overview__fit-label"><Plane className="w-3.5 h-3.5" aria-hidden /> Why people visit</div>
          <p>{prose(exp.travelerFit)}</p>
        </div>
        <div className="place-overview__fit-card" data-kind="resident">
          <div className="place-overview__fit-label"><Home className="w-3.5 h-3.5" aria-hidden /> Who lives here happily</div>
          <p>{prose(exp.residentFit)}</p>
        </div>
        <div className="place-overview__fit-card" data-kind="caution">
          <div className="place-overview__fit-label"><UserMinus className="w-3.5 h-3.5" aria-hidden /> Who might not</div>
          <p>{prose(exp.wouldNotFit)}</p>
        </div>
      </div>

      <p className="place-overview__texture">{prose(exp.texture)}</p>
    </section>
  );
}
