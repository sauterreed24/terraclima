import { useCallback, useMemo, type ReactNode } from "react";
import { ArrowLeftRight, Compass, ExternalLink, Leaf, Map as MapIcon, Route, ShieldAlert, Sprout, Telescope } from "lucide-react";
import { CLIMATE_TRIP_THEMES, type ClimateTripTheme } from "../data/climate-trip-themes";
import { PLACES, PLACES_BY_ID } from "../data/places";
import { getClimateTourismProfile, type ClimateTourismProfile } from "../lib/climate-tourism";
import { COMPARE_LIMIT } from "../lib/app-url";
import { useProse } from "../lib/units";

interface Props {
  onOpenPlace: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  onPickTripTheme: (id: string) => void;
  onComparePlaces: (ids: string[]) => void;
  onPreloadPlaceDetail?: () => void;
  onPreloadCompare?: () => void;
  activeThemeId?: string;
}

type ProfileRow = {
  place: (typeof PLACES)[number];
  profile: ClimateTourismProfile;
};

function themePlaces(theme: ClimateTripTheme): ProfileRow[] {
  return theme.placeIds
    .map(id => PLACES_BY_ID[id])
    .filter((place): place is (typeof PLACES)[number] => place != null)
    .map(place => ({ place, profile: getClimateTourismProfile(place) }));
}

function rowsForTheme(theme: ClimateTripTheme, rowsById: Map<string, ProfileRow>): ProfileRow[] {
  return theme.placeIds
    .map(id => rowsById.get(id))
    .filter((row): row is ProfileRow => row != null)
    .sort((a, b) => b.profile.scores.tourismAppeal - a.profile.scores.tourismAppeal);
}

function scoreTone(score: number): "glacier" | "sage" | "ochre" | "ember" {
  if (score >= 85) return "glacier";
  if (score >= 70) return "sage";
  if (score >= 50) return "ochre";
  return "ember";
}

export function ClimateTripsView({ onOpenPlace, onPickTripTheme, onComparePlaces, onPreloadPlaceDetail, onPreloadCompare, activeThemeId }: Props) {
  const prose = useProse();
  const allProfiles = useMemo<ProfileRow[]>(
    () =>
      PLACES
        .map(place => ({ place, profile: getClimateTourismProfile(place) }))
        .sort((a, b) => b.profile.scores.tourismAppeal - a.profile.scores.tourismAppeal),
    [],
  );
  const rowsById = useMemo(() => new Map(allProfiles.map(row => [row.place.id, row])), [allProfiles]);
  const tourismPicks = useMemo(() => allProfiles.slice(0, 9), [allProfiles]);
  const themeRows = useMemo(
    () =>
      CLIMATE_TRIP_THEMES.map(theme => ({
        theme,
        rows: rowsForTheme(theme, rowsById),
      })),
    [rowsById],
  );
  const themeRowsById = useMemo(
    () => new Map(themeRows.map(({ theme, rows }) => [theme.id, rows])),
    [themeRows],
  );

  const compareTheme = useCallback((theme: ClimateTripTheme) => {
    const ids = (themeRowsById.get(theme.id) ?? themePlaces(theme))
      .slice(0, COMPARE_LIMIT)
      .map(row => row.place.id);
    onComparePlaces(ids);
  }, [onComparePlaces, themeRowsById]);

  return (
    <div className="space-y-7">
      <section className="panel panel-hero p-4 sm:p-5 anim-fade-in" aria-labelledby="climate-trips-title">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-readable">
          <Route className="w-3.5 h-3.5 text-ochre-500" aria-hidden />
          Climate tourism
        </div>
        <h1 id="climate-trips-title" className="font-atlas text-3xl md:text-4xl text-ice text-depth-hero mt-1">
          Climate Trips
        </h1>
        <p className="text-lg md:text-xl text-frost mt-1 font-atlas tracking-tight">
          Travel by microclimate, not by generic region.
        </p>
        <p className="text-sm text-frost leading-relaxed mt-3 max-w-3xl">
          Find fog belts, rain shadows, sky islands, orchard valleys, cold-air pools, volcanic soils, and places that feel like another country. Use this as a scouting itinerary, not a booking engine.
        </p>
      </section>

      <section aria-labelledby="trip-styles-heading" className="space-y-3">
        <div className="tc-section-heading pt-1">
          <div className="tc-section-heading__line opacity-80" aria-hidden />
          <span id="trip-styles-heading" className="tc-section-heading__label">Start with a trip style</span>
          <div className="tc-section-heading__line opacity-80" aria-hidden />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {themeRows.map(({ theme, rows }) => {
            const active = theme.id === activeThemeId;
            const top = rows[0];
            return (
              <article
                key={theme.id}
                className={`panel collection-curation-card climate-trip-card p-4 anim-fade-in ${active ? "glow-glacier" : ""}`}
                data-tone={theme.tone}
                style={active ? { borderColor: "rgba(140,200,224,0.75)" } : undefined}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-stone">{theme.subtitle}</div>
                    <h2 className="font-atlas text-xl text-ice leading-tight">{theme.title}</h2>
                    <div className="text-[11px] text-stone mt-0.5">{theme.placeIds.length} stops</div>
                  </div>
                  {top ? (
                    <span className="chip shrink-0" data-tone={scoreTone(top.profile.scores.tourismAppeal)}>
                      {top.profile.scores.tourismAppeal}/100
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-frost leading-relaxed mb-3">{prose(theme.description)}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {theme.bestFor.slice(0, 4).map(item => (
                    <span key={item} className="chip" data-tone={theme.tone}>{item}</span>
                  ))}
                </div>
                <div className="panel-thin p-3 mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Season read</div>
                  <p className="text-[12px] text-frost leading-snug">{prose(theme.seasonHint)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onPickTripTheme(theme.id)} className={active ? "btn-primary !text-xs" : "btn-ghost !text-xs"}>
                    <MapIcon className="w-3.5 h-3.5" aria-hidden />
                    {active ? "Trip pinned" : "Filter map to this trip"}
                  </button>
                  <button
                    type="button"
                    onClick={() => compareTheme(theme)}
                    onPointerEnter={onPreloadCompare}
                    onFocus={onPreloadCompare}
                    onPointerDown={onPreloadCompare}
                    className="btn-ghost !text-xs"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden />
                    Compare top stops
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="tourism-picks-heading" className="space-y-3">
        <div className="tc-section-heading pt-1">
          <div className="tc-section-heading__line opacity-80" aria-hidden />
          <span id="tourism-picks-heading" className="tc-section-heading__label">Climate tourism picks</span>
          <div className="tc-section-heading__line opacity-80" aria-hidden />
        </div>
        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-3">
          {tourismPicks.map(row => (
            <TourismPickCard
              key={row.place.id}
              row={row}
              onOpenPlace={onOpenPlace}
              onPreloadPlaceDetail={onPreloadPlaceDetail}
            />
          ))}
        </div>
      </section>

      <section className="panel-thin p-4" aria-labelledby="seasonal-windows-heading">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone mb-2">
          <Telescope className="w-3.5 h-3.5" aria-hidden />
          Deterministic windows
        </div>
        <h2 id="seasonal-windows-heading" className="font-atlas text-lg text-ice">Best seasonal windows</h2>
        <div className="grid md:grid-cols-3 gap-2 mt-3">
          {tourismPicks.slice(0, 6).map(({ place, profile }) => (
            <button
              key={place.id}
              type="button"
              onPointerEnter={onPreloadPlaceDetail}
              onFocus={onPreloadPlaceDetail}
              onPointerDown={onPreloadPlaceDetail}
              onClick={e => onOpenPlace(place.id, { trigger: e.currentTarget })}
              className="panel-thin p-3 text-left reveal-row"
              aria-label={`Open ${place.name} climate tourism profile`}
            >
              <div className="font-atlas text-sm text-ice">{place.name}</div>
              <div className="text-[12px] text-stone-readable mt-1">{profile.bestVisitWindow.label}: <span className="text-frost">{profile.bestVisitWindow.range}</span></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function TourismPickCard({
  row,
  onOpenPlace,
  onPreloadPlaceDetail,
}: {
  row: ProfileRow;
  onOpenPlace: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  onPreloadPlaceDetail?: () => void;
}) {
  const prose = useProse();
  const { place, profile } = row;
  const firstDay = profile.itinerary.days[0];
  return (
    <article className="panel climate-trip-card climate-trip-pick-card p-4 anim-fade-in space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-stone">{place.region}, {place.country}</div>
          <h3 className="font-atlas text-xl text-ice leading-tight">{place.name}</h3>
        </div>
        <span className="chip shrink-0" data-tone={scoreTone(profile.scores.tourismAppeal)}>
          {profile.scores.tourismAppeal}/100
        </span>
      </div>

      <p className="text-sm text-frost leading-relaxed">{prose(profile.climateStory)}</p>

      <div className="grid grid-cols-3 gap-2">
        <ScoreMini label="Tourism" value={profile.scores.tourismAppeal} />
        <ScoreMini label="Live here" value={profile.scores.wouldLiveHere} />
        <ScoreMini label="Land signal" value={profile.scores.climateLandOptionality} />
      </div>

      <div className="grid gap-2 text-[12px] text-stone-readable">
        <InfoLine icon={<Compass className="w-3.5 h-3.5" aria-hidden />} label={profile.bestVisitWindow.label} value={profile.bestVisitWindow.range} />
        <InfoLine icon={<Sprout className="w-3.5 h-3.5" aria-hidden />} label="Grow there" value={profile.growThere.bestFits.slice(0, 3).join(", ")} />
        <InfoLine icon={<Leaf className="w-3.5 h-3.5" aria-hidden />} label="Habitat cue" value={profile.wildlifeAndHabitat.cues[0]} />
        <InfoLine icon={<ShieldAlert className="w-3.5 h-3.5" aria-hidden />} label="Top risk" value={profile.riskRead.topRisks[0]} />
      </div>

      <div className="panel-thin p-3">
        <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Vibe</div>
        <div className="font-atlas text-sm text-ice">{profile.vibe.label}</div>
        <p className="text-[12px] text-frost leading-snug mt-1">{prose(profile.vibe.description)}</p>
      </div>

      <div className="grid gap-2">
        <div className="text-[12px] text-stone-readable">
          <span className="text-stone uppercase tracking-wide text-[10px]">Soil cue</span>
          <div>{prose(profile.soilRead.bullets[0])}</div>
        </div>
        <div className="text-[12px] text-stone-readable">
          <span className="text-stone uppercase tracking-wide text-[10px]">Lodging search cue</span>
          <div>{prose(profile.lodgingRead.searchCues[0])}</div>
        </div>
        <div className="text-[12px] text-stone-readable">
          <span className="text-stone uppercase tracking-wide text-[10px]">3-day teaser</span>
          <div>{firstDay.title}: {prose(firstDay.climateLens)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onPointerEnter={onPreloadPlaceDetail}
          onFocus={onPreloadPlaceDetail}
          onPointerDown={onPreloadPlaceDetail}
          onClick={e => onOpenPlace(place.id, { trigger: e.currentTarget })}
          className="btn-primary !text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          Open profile
        </button>
      </div>
    </article>
  );
}

function ScoreMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-thin p-2">
      <div className="text-[10px] uppercase tracking-wide text-stone leading-tight">{label}</div>
      <div className="font-mono-num text-lg text-ice">{value}</div>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string | undefined }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-ochre-500 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-stone uppercase tracking-wide text-[10px]">{label}</span>
        <div className="text-frost leading-snug">{value ?? "Screen locally."}</div>
      </div>
    </div>
  );
}
