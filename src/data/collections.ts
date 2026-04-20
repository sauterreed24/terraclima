// ============================================================
// Terraclima — Curated Collections
// Thematic bundles that surface coherent sets of places.
// ============================================================

import type { MicroclimateArchetype } from "../types";

export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tone: "glacier" | "sage" | "ochre" | "ember" | "ice";
  placeIds: string[];
  archetypeFilter?: MicroclimateArchetype[];
}

export const COLLECTIONS: Collection[] = [
  {
    id: "rain-shadows",
    title: "Rain-Shadow Sanctuaries",
    subtitle: "Dry, sunny, unexpectedly sheltered",
    description: "Places where a single ridge of mountains transforms rainfall by a factor of five or more — often within a one-hour drive. Rain shadows produce some of North America's most livable climates hiding in some of its rainiest neighborhoods.",
    tone: "ochre",
    placeIds: ["sequim-wa", "port-townsend-wa", "osoyoos-bc", "bishop-ca", "victoria-bc", "hood-river-or", "hood-river-gorge", "ashland-or", "sunshine-coast-bc", "salt-spring-bc", "summerland-bc", "wenatchee-wa", "ellensburg-wa", "kamloops-bc", "qualicum-bc", "whitehorse-yt", "medford-or", "winthrop-wa", "leavenworth-wa", "lone-pine-ca", "kelowna-bc", "page-az", "friday-harbor-wa", "palm-springs-ca", "spokane-wa"],
  },
  {
    id: "sky-islands",
    title: "Sky-Island Refuges",
    subtitle: "Cool forests marooned above the desert",
    description: "Elevation changes everything. These mountain islands rise above arid basins into pine-oak, cloud-forest, and real winter — sometimes within sight of saguaros.",
    tone: "sage",
    placeIds: ["portal-az", "silver-city-nm", "creel-mx", "flagstaff-az", "santa-fe-nm", "fort-davis-tx", "cloudcroft-nm", "cypress-hills-sk", "real-catorce-mx", "mount-washington-nh", "mount-charleston-nv"],
  },
  {
    id: "cold-air-pools",
    title: "Cold-Air Pools & Inversion Basins",
    subtitle: "Where valley floors stay colder than the ridges above",
    description: "Enclosed basins with ideal geometry for radiative cooling. On clear winter nights, cold air drains from surrounding slopes and pools against the valley floor — sometimes for weeks. These are among the continent's most extreme and least-documented microclimates.",
    tone: "ice",
    placeIds: ["gunnison-co", "logan-ut", "canaan-valley-wv", "missoula-mt", "truckee-ca", "crested-butte-co", "stanley-id", "fairbanks-ak", "international-falls-mn", "winthrop-wa", "morgantown-wv", "burkes-garden-va"],
  },
  {
    id: "eternal-spring",
    title: "Eternal-Spring Highlands",
    subtitle: "Subtropical latitude, temperate comfort",
    description: "Where tropical latitudes meet 1500–2500 m of altitude, a different climate emerges: highs in the low 20s and lows in the teens, month after month. These are the cities where spring refuses to end.",
    tone: "sage",
    placeIds: ["oaxaca-mx", "cuernavaca-mx", "san-cristobal-mx", "patzcuaro-mx", "san-miguel-mx", "tapalpa-mx", "mazamitla-mx", "morelia-mx", "guanajuato-mx", "zacatecas-mx", "toluca-mx", "taxco-mx", "puebla-mx"],
  },
  {
    id: "cool-summer-maritimes",
    title: "Cool-Summer Maritimes",
    subtitle: "The ocean is the air conditioner",
    description: "Coasts where deep cold water and persistent marine air keep summer highs at 14–19°C while inland valleys bake. Some of the most climate-resilient places on the continent for extreme heat.",
    tone: "glacier",
    placeIds: ["monterey-ca", "santa-cruz-felton-ca", "tofino-bc", "victoria-bc", "grand-marais-mn", "grand-manan-nb", "eureka-ca", "point-reyes-ca", "astoria-or", "forks-wa", "prince-rupert-bc", "tofino-ucluelet-corridor", "gaspe-qc", "st-johns-nl", "cannon-beach-or", "sitka-ak", "twillingate-nl", "ensenada-mx", "duluth-mn", "bar-harbor-me", "halifax-ns", "charlottetown-pei", "squamish-bc", "friday-harbor-wa", "brookings-or", "burlington-vt", "block-island-ri", "cape-may-nj"],
  },
  {
    id: "orchard-valleys",
    title: "Fruit & Orchard Valleys",
    subtitle: "Where terrain, sun, and chill align",
    description: "Valleys whose microclimate — lake moderation, rain-shadow dryness, thermal belts, or river-valley sheltering — produces the conditions for apples, cherries, pears, and grapes. The continent's fruit belts tell a climate story in every harvest.",
    tone: "ochre",
    placeIds: ["hood-river-or", "osoyoos-bc", "traverse-city-mi", "niagara-on-the-lake", "wolfville-ns", "ashland-or", "summerland-bc", "creston-bc", "prince-edward-co-on", "wenatchee-wa", "penticton-bc", "leamington-on", "cuauhtemoc-mx", "medford-or", "kelowna-bc", "leavenworth-wa", "napa-ca"],
  },
  {
    id: "thermal-belts",
    title: "Thermal Belts & Frost Refuges",
    subtitle: "The mid-slope advantage",
    description: "Mid-slope bands where cold air drains past into valleys below and radiative cooling skims off the ridges above. Orchardists found these belts centuries ago and have never left.",
    tone: "ochre",
    placeIds: ["black-mountain-nc", "hood-river-or", "ashland-or", "sedona-az", "viroqua-wi", "gatlinburg-tn"],
  },
  {
    id: "chinook-country",
    title: "Chinook & Downslope Wind Corridors",
    subtitle: "Mountains that make winter warm winds",
    description: "Lee-of-the-Rockies belts where stable westerly flow descends and compresses into warm, dry downslope winds. Winters in these corridors are wild, windy, and surprisingly moderate.",
    tone: "ochre",
    placeIds: ["lethbridge-ab", "boulder-co", "cody-wy", "pincher-creek-ab", "bozeman-mt", "medicine-hat-ab", "banff-ab", "leavenworth-wa", "bismarck-nd", "spearfish-sd"],
  },
  {
    id: "gap-winds",
    title: "Gap & Gorge Wind Corridors",
    subtitle: "Where mountains notch and the wind howls",
    description: "Natural mountain gaps funnel wind through predictable corridors — the Columbia Gorge, the Strait of Juan de Fuca, the Crowsnest Pass. These are the windiest places on the continent and the most reliable weather transitions.",
    tone: "glacier",
    placeIds: ["hood-river-gorge", "ellensburg-wa", "port-townsend-wa", "pincher-creek-ab", "mount-washington-nh", "la-ventosa-mx", "brookings-or", "squamish-bc", "chattanooga-tn"],
  },
  {
    id: "snowbelts",
    title: "Lake-Effect & Mountain Snowbelts",
    subtitle: "5+ meters of annual snow",
    description: "Downwind shores of unfrozen Great Lakes and windward flanks of the Canadian and Pacific ranges — where single storms routinely drop more snow than many cities see in a year.",
    tone: "glacier",
    placeIds: ["grand-marais-mi", "redfield-ny", "syracuse-ny", "marquette-mi", "houghton-mi", "revelstoke-bc", "mammoth-lakes-ca", "valdez-ak", "erie-pa", "duluth-mn", "geneva-on-the-lake-oh"],
  },
  {
    id: "hidden-gems",
    title: "Deep Hidden Gems",
    subtitle: "Climatically distinctive and under-celebrated",
    description: "Places whose microclimate is genuinely distinctive but whose names remain off most lists. Each entry scores at least 70 on both uniqueness and hidden-gem metrics.",
    tone: "sage",
    placeIds: ["portal-az", "silver-city-nm", "grand-marais-mn", "grand-manan-nb", "creel-mx", "tapalpa-mx", "xilitla-mx", "alamos-mx", "salt-spring-bc", "sunshine-coast-bc", "creston-bc", "mazamitla-mx", "canaan-valley-wv", "fort-davis-tx", "cypress-hills-sk", "joseph-or", "real-catorce-mx", "parras-mx", "cuauhtemoc-mx", "redfield-ny", "houghton-mi", "viroqua-wi", "stanley-id", "twillingate-nl", "ely-mn", "xalapa-mx", "haida-gwaii-bc", "medicine-hat-ab", "winthrop-wa", "mount-charleston-nv", "burkes-garden-va"],
  },
  {
    id: "alpine-tundra",
    title: "Alpine Tundra & Thin-Air Towns",
    subtitle: "Above 2500 m, where summer frost is a weekly possibility",
    description: "High-elevation settlements where the growing season is weeks, not months. Summer highs rarely exceed 25°C; winter runs for eight months; the air carries only 70% of sea-level oxygen.",
    tone: "ice",
    placeIds: ["leadville-co", "crested-butte-co", "mammoth-lakes-ca", "truckee-ca", "cloudcroft-nm", "real-catorce-mx", "toluca-mx", "mount-washington-nh", "creel-mx"],
  },
  {
    id: "cloud-forests",
    title: "Cloud-Forest Refugia",
    subtitle: "Fed by mist as much as by rain",
    description: "Windward mountain slopes where moist air condenses continuously onto forest canopies. A globally rare ecosystem compressed into specific elevation-and-aspect bands.",
    tone: "sage",
    placeIds: ["highlands-nc", "xilitla-mx", "coatepec-mx", "san-cristobal-mx", "boone-nc", "xalapa-mx", "gatlinburg-tn", "palenque-mx", "hilo-hi"],
  },
  {
    id: "dry-air-comfort",
    title: "Humidity Refuges",
    subtitle: "Low dew points, crisp skies",
    description: "Dry-climate pockets where summer comfort is a function of humidity more than temperature. A 30°C afternoon at 15% humidity feels radically different than 30°C at 75%.",
    tone: "glacier",
    placeIds: ["bishop-ca", "silver-city-nm", "santa-fe-nm", "flagstaff-az", "boulder-co", "creel-mx", "san-miguel-mx", "taos-nm", "prescott-az", "borrego-springs-ca", "marfa-tx", "lubbock-tx", "page-az", "hermosillo-mx", "lone-pine-ca"],
  },
  {
    id: "monsoon-edges",
    title: "Monsoon-Edge Landscapes",
    subtitle: "Where summer convection reliably arrives",
    description: "Places on the leading edge of the North American Monsoon — spectacular afternoon thunderstorms, dry foresummers, luminous late-summer green.",
    tone: "sage",
    placeIds: ["silver-city-nm", "portal-az", "flagstaff-az", "alamos-mx", "santa-fe-nm", "fort-davis-tx", "marfa-tx", "cloudcroft-nm", "sedona-az", "durango-co", "taos-nm", "page-az", "monterrey-mx", "hermosillo-mx", "puebla-mx", "tucson-az"],
  },
  {
    id: "hyper-maritime",
    title: "Hyper-Maritime Coasts",
    subtitle: "Where seasons nearly merge",
    description: "Exposed outer coasts where ocean dominance flattens the annual cycle into a narrow thermal window. The most maritime climates in North America.",
    tone: "glacier",
    placeIds: ["tofino-bc", "grand-manan-nb", "forks-wa", "eureka-ca", "prince-rupert-bc", "tofino-ucluelet-corridor", "astoria-or", "sitka-ak", "haida-gwaii-bc", "cannon-beach-or", "twillingate-nl", "brookings-or", "block-island-ri"],
  },
  {
    id: "subarctic",
    title: "Subarctic Continental",
    subtitle: "Where winter is eight months long",
    description: "The deep interior north — where January lows of −30°C are routine, summer is fierce and brief, and aurora season runs 240 nights a year. North America's most climatically extreme inhabited landscapes.",
    tone: "ice",
    placeIds: ["whitehorse-yt", "yellowknife-nt", "churchill-mb", "thunder-bay-on", "fairbanks-ak", "nome-ak", "iqaluit-nu", "inuvik-nt", "ely-mn", "anchorage-ak"],
  },
  {
    id: "desert-oases",
    title: "Desert Oases",
    subtitle: "Water where no one would expect it",
    description: "Spring-fed or river-fed pockets of greenery inside vast arid landscapes. Each oasis is a story of specific hydrogeology — and a climate that depends on the water beneath as much as the sun above.",
    tone: "sage",
    placeIds: ["parras-mx", "moab-ut", "borrego-springs-ca", "alamos-mx", "la-paz-mx", "death-valley-ca", "yuma-az"],
  },
  {
    id: "tropical-coasts",
    title: "Tropical & Hurricane Coasts",
    subtitle: "Annual ranges under 10°C",
    description: "Tropical latitudes where the annual temperature range barely exceeds a typical day's swing elsewhere. Hurricane exposure is a constitutive part of climate — and the seasons here are defined by rainfall, not temperature.",
    tone: "ember",
    placeIds: ["key-west-fl", "charleston-sc", "apalachicola-fl", "merida-mx", "bacalar-mx", "puerto-escondido-mx", "la-paz-mx", "south-padre-tx", "la-ventosa-mx", "nags-head-nc", "new-orleans-la", "campeche-mx", "puerto-vallarta-mx", "mazatlan-mx", "hilo-hi", "honolulu-hi", "corpus-christi-tx", "ocean-springs-ms"],
  },

  {
    id: "atlantic-maritimes",
    title: "Atlantic Canada & Downeast",
    subtitle: "Ice, fog, Fundy, and Labrador Current chill",
    description: "From the Bay of Fundy to iceberg alley, the Canadian Maritimes and Downeast Maine mix polar maritime air with occasional tropical moisture — producing the continent's highest tides, cool summers, and stormy shoulder seasons.",
    tone: "glacier",
    placeIds: ["grand-manan-nb", "wolfville-ns", "halifax-ns", "charlottetown-pei", "gaspe-qc", "st-johns-nl", "twillingate-nl", "bar-harbor-me"],
  },
  {
    id: "great-lakes-microclimates",
    title: "Great Lakes — Effect Snow & Summer Chill",
    subtitle: "The inland freshwater seas",
    description: "Lake-effect streamers, June sweater weather beside Superior, and fruit belts in lee of moderated shores — the Great Lakes are the continent's largest organized microclimate engine.",
    tone: "ice",
    placeIds: ["erie-pa", "duluth-mn", "syracuse-ny", "grand-marais-mi", "marquette-mi", "houghton-mi", "traverse-city-mi", "thunder-bay-on", "burlington-vt", "leamington-on", "niagara-on-the-lake", "geneva-on-the-lake-oh", "buffalo-ny"],
  },
  {
    id: "appalachian-arc",
    title: "Appalachian Arc & Eastern Highlands",
    subtitle: "Ridges, gorges, and orchard benches",
    description: "From the Blue Ridge to the Ozark rim, the eastern highlands concentrate rainfall, shelter cold pools, and host orchard belts on sunny midslopes — a full vocabulary of relief in one winding chain.",
    tone: "sage",
    placeIds: ["black-mountain-nc", "asheville-nc", "boone-nc", "highlands-nc", "gatlinburg-tn", "chattanooga-tn", "eureka-springs-ar", "morgantown-wv", "mentone-al", "clayton-ga", "burkes-garden-va"],
  },
];

export const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map(c => [c.id, c]));
