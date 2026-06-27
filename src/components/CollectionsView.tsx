import { COLLECTIONS } from "../data/collections";
import { PLACES_BY_ID } from "../data/places";
import { useProse } from "../lib/units";
import { placeMapSecondaryLine } from "../lib/atlas-map-label";
import { getPlaceVisualSignature, type PlaceVisualSignature } from "../lib/place-visual-signature";
import type { Collection } from "../data/collections";
import type { Place } from "../types";

interface Props {
  onOpenPlace: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  onPick: (id: string) => void;
  activeId?: string;
}

interface CollectionStop {
  place: Place;
  signature: PlaceVisualSignature;
  disambiguator?: string;
}

interface CollectionRow {
  collection: Collection;
  stops: CollectionStop[];
}

function buildCollectionRows(): CollectionRow[] {
  return COLLECTIONS.map(collection => {
    const stops = collection.placeIds.flatMap<CollectionStop>(id => {
      const place = PLACES_BY_ID[id];
      return place ? [{ place, signature: getPlaceVisualSignature(place) }] : [];
    });
    const nameCounts = stops.reduce<Map<string, number>>((counts, { place }) => {
      counts.set(place.name, (counts.get(place.name) ?? 0) + 1);
      return counts;
    }, new Map());

    return {
      collection,
      stops: stops.map(stop => ({
        ...stop,
        disambiguator: (nameCounts.get(stop.place.name) ?? 0) > 1 ? placeMapSecondaryLine(stop.place) : undefined,
      })),
    };
  });
}

const COLLECTION_ROWS = buildCollectionRows();

function collectionPlaceLabel({ place, disambiguator }: CollectionStop): string {
  return disambiguator ? `${place.name} (${disambiguator})` : place.name;
}

function CollectionSpectrum({ stops }: { stops: CollectionStop[] }) {
  const visibleStops = stops.slice(0, 12);
  if (visibleStops.length === 0) return null;

  return (
    <div
      className="collection-spectrum"
      aria-hidden="true"
      style={{ ["--collection-spectrum-count" as string]: visibleStops.length }}
    >
      {visibleStops.map(stop => (
        <span
          key={stop.place.id}
          className="collection-spectrum__bar"
          title={`${collectionPlaceLabel(stop)}: ${stop.signature.mapLabel}`}
          style={{ ["--signature-rgb" as string]: stop.signature.mapAccentRgb }}
        />
      ))}
    </div>
  );
}

function CollectionPlaceChip({
  stop,
  tone,
  collectionTitle,
  onOpenPlace,
}: {
  stop: CollectionStop;
  tone: Collection["tone"];
  collectionTitle: string;
  onOpenPlace: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
}) {
  const { place, signature } = stop;
  const placeLabel = collectionPlaceLabel(stop);
  const openProfileLabel = `Open ${placeLabel} profile from ${collectionTitle} collection: ${signature.mapLabel}`;
  return (
    <button
      type="button"
      onClick={event => onOpenPlace(place.id, { trigger: event.currentTarget })}
      className="chip chip-btn collection-place-chip"
      data-tone={tone}
      aria-label={openProfileLabel}
      title={openProfileLabel}
      style={{ ["--signature-rgb" as string]: signature.mapAccentRgb }}
    >
      <span className="collection-place-chip__dot" aria-hidden="true" />
      <span className="collection-place-chip__name">{place.name}</span>
    </button>
  );
}

export function CollectionsView({ onOpenPlace, onPick, activeId }: Props) {
  const prose = useProse();

  return (
    <div className="space-y-5">
      {COLLECTION_ROWS.map(({ collection: c, stops }) => {
        const isActive = c.id === activeId;
        return (
          <div
            key={c.id}
            className={`panel collection-curation-card p-4 anim-fade-in ${isActive ? "glow-glacier tc-curated-card--active" : ""}`}
            data-tone={c.tone}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-stone">{prose(c.subtitle)}</div>
                <h3 className="font-atlas text-xl text-ice">{c.title}</h3>
                <div className="text-[11px] text-stone mt-0.5">{c.placeIds.length} places</div>
              </div>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                className={`collection-pin-button ${isActive ? "btn-primary !text-xs !py-1.5" : "btn-ghost !text-xs"}`}
                aria-pressed={isActive}
                aria-label={isActive ? `Clear ${c.title} collection filter` : `Pin ${c.title} collection`}
                title={isActive ? `Clear ${c.title} from the Explorer filter` : `Filter the Explorer to ${c.title}`}
              >
                {isActive ? "Clear filter" : "Pin collection"}
              </button>
            </div>
            <p className="text-sm text-frost leading-relaxed mb-3">{prose(c.description)}</p>
            <CollectionSpectrum stops={stops} />
            <div className="collection-place-chip-grid">
              {stops.map(stop => (
                <CollectionPlaceChip
                  key={stop.place.id}
                  stop={stop}
                  tone={c.tone}
                  collectionTitle={c.title}
                  onOpenPlace={onOpenPlace}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
