import { COLLECTIONS } from "../data/collections";
import { PLACES_BY_ID } from "../data/places";
import { useProse } from "../lib/units";
import { getPlaceVisualSignature, type PlaceVisualSignature } from "../lib/place-visual-signature";
import type { Collection } from "../data/collections";
import type { Place } from "../types";

interface Props {
  onOpenPlace: (id: string) => void;
  onPick: (id: string) => void;
  activeId?: string;
}

interface CollectionStop {
  place: Place;
  signature: PlaceVisualSignature;
}

interface CollectionRow {
  collection: Collection;
  stops: CollectionStop[];
}

function buildCollectionRows(): CollectionRow[] {
  return COLLECTIONS.map(collection => ({
    collection,
    stops: collection.placeIds.flatMap(id => {
      const place = PLACES_BY_ID[id];
      return place ? [{ place, signature: getPlaceVisualSignature(place) }] : [];
    }),
  }));
}

const COLLECTION_ROWS = buildCollectionRows();

function CollectionSpectrum({ stops }: { stops: CollectionStop[] }) {
  const visibleStops = stops.slice(0, 12);
  if (visibleStops.length === 0) return null;

  return (
    <div
      className="collection-spectrum"
      aria-hidden="true"
      style={{ ["--collection-spectrum-count" as string]: visibleStops.length }}
    >
      {visibleStops.map(({ place, signature }) => (
        <span
          key={place.id}
          className="collection-spectrum__bar"
          title={`${place.name}: ${signature.mapLabel}`}
          style={{ ["--signature-rgb" as string]: signature.mapAccentRgb }}
        />
      ))}
    </div>
  );
}

function CollectionPlaceChip({
  stop,
  tone,
  onOpenPlace,
}: {
  stop: CollectionStop;
  tone: Collection["tone"];
  onOpenPlace: (id: string) => void;
}) {
  const { place, signature } = stop;
  return (
    <button
      type="button"
      onClick={() => onOpenPlace(place.id)}
      className="chip chip-btn collection-place-chip"
      data-tone={tone}
      title={`Open ${place.name}: ${signature.mapLabel}`}
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
            className={`panel collection-curation-card p-4 anim-fade-in ${isActive ? "glow-glacier" : ""}`}
            data-tone={c.tone}
            style={isActive ? { borderColor: "rgba(140,200,224,0.75)" } : undefined}
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
                className={isActive ? "btn-primary !text-xs !py-1.5" : "btn-ghost !text-xs"}
                aria-pressed={isActive}
              >
                {isActive ? "Pinned" : "Pin collection"}
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
