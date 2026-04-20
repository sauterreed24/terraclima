/**
 * Curated Wikimedia Commons photography for place profiles.
 * URLs resolve via Special:FilePath → CDN; open the Commons file page for attribution.
 */

export type PlaceHeroMedia = {
  src: string;
  alt: string;
  creditLine: string;
};

const CREDIT =
  "Photo: Wikimedia Commons — open the file page on Commons for photographer and license.";

function commonsFile(file: string, width = 1280): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

/** place.id → Commons filename (underscores as on Commons). */
const HERO_BY_PLACE_ID: Record<string, { file: string; alt: string }> = {
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
    file: "Butchart_Gardens.jpg",
    alt: "Victoria-area gardens on Vancouver Island — mild maritime winters, dry bright summers",
  },
  "oaxaca-mx": { file: "Oaxaca_de_Juarez.jpg", alt: "Colonial streets and mountains framing Oaxaca de Juárez" },
  "merida-mx": {
    file: "Uxmal_Pyramid_of_the_Magician.jpg",
    alt: "Maya lowlands near Mérida — tropical heat broken by Gulf breezes and limestone country",
  },
  "guanajuato-mx": { file: "Guanajuato_City.jpg", alt: "Colourful hillside lanes and churches in Guanajuato" },
  "san-miguel-mx": {
    file: "Parroquia_de_San_Miguel_Arcangel,_San_Miguel_de_Allende.jpg",
    alt: "Parroquia towers rising above San Miguel de Allende",
  },
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
    alt: row.alt,
    creditLine: CREDIT,
  };
}

/** Static OpenStreetMap map centered on the place (opens in a new tab). */
export function openStreetMapUrl(lat: number, lon: number, zoom = 10): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}
