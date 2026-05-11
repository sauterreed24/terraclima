/**
 * Curated Wikimedia Commons photography for place profiles.
 * URLs resolve via Special:FilePath → CDN; open the Commons file page for attribution.
 */

export type PlaceHeroMedia = {
  src: string;
  srcSet: string;
  sizes: string;
  alt: string;
  creditLine: string;
  sourceUrl: string;
};

const CREDIT =
  "Photo: Wikimedia Commons. Open the file page for photographer and license.";

function commonsFile(file: string, width = 1280): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

function commonsFilePage(file: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;
}

function commonsSrcSet(file: string): string {
  return [640, 960, 1280]
    .map(width => `${commonsFile(file, width)} ${width}w`)
    .join(", ");
}

/** place.id → Commons filename. */
const HERO_BY_PLACE_ID: Record<string, { file: string; alt: string }> = {
  "sequim-wa": {
    file: "John Wayne Marina - Sequim Washington.jpg",
    alt: "Sequim's John Wayne Marina on the dry Olympic rain-shadow shore",
  },
  "monterey-ca": {
    file: "Pacific Grove Coastline, Monterey, CA, jjron 24.03.2012.jpg",
    alt: "Rocky Monterey Peninsula shoreline and cool Pacific water",
  },
  "black-mountain-nc": {
    file: "Black Mountain, North Carolina.jpg",
    alt: "Black Mountain town and wooded Blue Ridge foothills in North Carolina",
  },
  "hood-river-or": {
    file: "Columbia Gorge Hotel - Hood River Oregon.jpg",
    alt: "Hood River's Columbia Gorge setting above the river and orchard country",
  },
  "santa-barbara-ca": {
    file: "Santa Barbara 2012 7.jpg",
    alt: "Santa Barbara's coastal cityscape beneath the Santa Ynez Mountains",
  },
  "port-townsend-wa": {
    file: "Adventuress Schooner Port Townsend Marina , Washington State.jpg",
    alt: "Port Townsend marina and wooden-boat waterfront on the Olympic rain shadow edge",
  },
  "tucson-az": {
    file: "Saguaro_National_Park,_Tucson.jpg",
    alt: "Saguaro cacti and Sonoran Desert hills near Tucson",
  },
  "portal-az": {
    file: "Chiricahua_National_Monument.jpg",
    alt: "Chiricahua highlands rock formations near the Arizona–New Mexico sky-island country",
  },
  "flagstaff-az": {
    file: "Sunset_Crater.jpg",
    alt: "Volcanic cinder cone and ponderosa country near Flagstaff",
  },
  "sedona-az": { file: "Sedona_Arizona.jpg", alt: "Red rock cliffs and juniper–pine country around Sedona" },
  "santa-fe-nm": { file: "Santa_Fe_Plaza.jpg", alt: "Adobe architecture and plaza light in Santa Fe" },
  "taos-nm": { file: "Taos_Pueblo.jpg", alt: "Multi-story adobe buildings at Taos Pueblo beneath the Sangre de Cristo" },
  "marfa-tx": { file: "Marfa_courthouse.jpg", alt: "Presidio County Courthouse and high-desert sky over Marfa" },
  "key-west-fl": {
    file: "Seven_Mile_Bridge.jpg",
    alt: "Overseas highway bridge and turquoise Gulf water in the Florida Keys",
  },
  "charleston-sc": {
    file: "Rainbow_Row_Charleston.jpg",
    alt: "Pastel historic houses along Rainbow Row in Charleston",
  },
  "banff-ab": { file: "Moraine_Lake_17092005.jpg", alt: "Turquoise moraine lake and Rocky peaks in Banff National Park" },
  "victoria-bc": {
    file: "View from Malahat lookout 1.jpg",
    alt: "Southern Vancouver Island water and hills near Victoria's rain-shadow coast",
  },
  "qualicum-bc": {
    file: "Qualicum Beach, British Columbia - panoramio.jpg",
    alt: "Qualicum Beach shoreline on Vancouver Island's drier east side",
  },
  "oaxaca-mx": { file: "Oaxaca_de_Juarez.jpg", alt: "Colonial streets and mountains framing Oaxaca de Juárez" },
  "merida-mx": {
    file: "Uxmal_Pyramid_of_the_Magician.jpg",
    alt: "Maya lowlands near Mérida — tropical heat broken by Gulf breezes and limestone country",
  },
  "guanajuato-mx": { file: "Guanajuato_City.jpg", alt: "Colourful hillside lanes and churches in Guanajuato" },
  "san-miguel-de-allende-mx": {
    file: "Parroquia_de_San_Miguel_Arcangel,_San_Miguel_de_Allende.jpg",
    alt: "Parroquia towers rising above San Miguel de Allende",
  },
  "bacalar-mx": { file: "Laguna_de_Bacalar.jpg", alt: "Laguna de Bacalar’s clear water and shoreline jungle" },
  "puerto-vallarta-mx": {
    file: "Puerto_Vallarta_beach.jpg",
    alt: "Bay, beach, and Sierra Madre backdrop at Puerto Vallarta",
  },
};

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
  };
}

/** Static OpenStreetMap map centered on the place (opens in a new tab). */
export function openStreetMapUrl(lat: number, lon: number, zoom = 10): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}
