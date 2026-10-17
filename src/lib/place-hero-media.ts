/**
 * Curated Wikimedia Commons photography for place profiles.
 * URLs resolve via Special:FilePath → CDN; open the Commons file page for attribution.
 */

import { HERO_BY_PLACE_ID } from "../data/place-hero-photos";

export type PlaceHeroMedia = {
  src: string;
  srcSet: string;
  sizes: string;
  alt: string;
  creditLine: string;
  sourceUrl: string;
  /** CSS object-position for the wide hero frame, keeping the subject in view. */
  objectPosition: string;
};

/** Default vertical focus (%) for the wide hero crop: a little above centre. */
const DEFAULT_FOCUS_Y = 42;

const CREDIT =
  "Photo: Wikimedia Commons. Open the file page for photographer and license.";

/**
 * Wikimedia serves thumbnails only at its standard widths and rejects (or
 * rate-limits) other widths on hotlinked requests, so every width we ask for
 * must come from this list. https://www.mediawiki.org/wiki/Common_thumbnail_sizes
 */
export const COMMONS_STANDARD_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840] as const;
type CommonsWidth = (typeof COMMONS_STANDARD_WIDTHS)[number];

function commonsFile(file: string, width: CommonsWidth = 1280): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

function commonsFilePage(file: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;
}

function commonsSrcSet(file: string): string {
  return ([500, 960, 1280, 1920] as const)
    .map(width => `${commonsFile(file, width)} ${width}w`)
    .join(", ");
}


export function getPlaceHeroMedia(placeId: string): PlaceHeroMedia | null {
  const row = HERO_BY_PLACE_ID[placeId];
  if (!row) return null;
  return {
    src: commonsFile(row.file),
    srcSet: commonsSrcSet(row.file),
    sizes: "(min-width: 768px) 52rem, calc(100vw - 2rem)",
    alt: row.alt,
    creditLine: CREDIT,
    sourceUrl: commonsFilePage(row.file),
    objectPosition: `center ${row.focusY ?? DEFAULT_FOCUS_Y}%`,
  };
}

export function listPlaceHeroFiles(): ReadonlyArray<{ id: string; file: string }> {
  return Object.entries(HERO_BY_PLACE_ID).map(([id, row]) => ({ id, file: row.file }));
}

export function placeHeroMediaCount(): number {
  return Object.keys(HERO_BY_PLACE_ID).length;
}

/** Static OpenStreetMap map centered on the place (opens in a new tab). */
export function openStreetMapUrl(lat: number, lon: number, zoom = 10): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}

export interface ExternalMapLink {
  id: "google" | "apple" | "osm";
  label: string;
  href: string;
}

/**
 * Live-map links for a place, most dependable first. OpenStreetMap's site
 * rate-limits busy networks (HTTP 429), so it is offered alongside Google
 * Maps and Apple Maps rather than as the only way to see the area.
 */
export function externalMapLinks(lat: number, lon: number, name: string, zoom = 10): ExternalMapLink[] {
  const coords = `${lat},${lon}`;
  return [
    {
      id: "google",
      label: "Google Maps",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`,
    },
    {
      id: "apple",
      label: "Apple Maps",
      href: `https://maps.apple.com/?ll=${coords}&q=${encodeURIComponent(name)}&z=${zoom}`,
    },
    { id: "osm", label: "OpenStreetMap", href: openStreetMapUrl(lat, lon, zoom) },
  ];
}
