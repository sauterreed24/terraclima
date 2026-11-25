import type { MicroclimateArchetype } from "../types";

export interface ClimateTripTheme {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tone: "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora";
  placeIds: string[];
  archetypeFilters?: MicroclimateArchetype[];
  bestFor: string[];
  seasonHint: string;
  monetizationHint?: string;
}

export const CLIMATE_TRIP_THEMES: ClimateTripTheme[] = [
  {
    id: "places-that-feel-like-another-country",
    title: "Places That Feel Like Another Country",
    subtitle: "Local climates unlike the region around them",
    description:
      "Eight stops where the climate is out of character for its region: sagebrush and vineyards in the south Okanagan, a cool pine highland in Chiapas, jungle at Xilitla on the wet face of the Sierra Madre Oriental, spring-fed pools in the Coahuila desert, a rainforest city in Hawai‘i, and the fog and wind of St. John's. Each one is easiest to appreciate beside a more typical neighbour an hour or two away.",
    tone: "aurora",
    placeIds: ["osoyoos-bc", "penticton-bc", "san-cristobal-mx", "xilitla-mx", "bacalar-mx", "cuatrocienegas-mx", "hilo-hi", "st-johns-nl"],
    bestFor: ["strong contrasts", "a first look at the atlas", "photography"],
    seasonHint: "No single season suits the whole list. Check the best months for each stop.",
    monetizationHint: "Editorial list only. No packages, paid placement or bookings.",
  },
  {
    id: "sky-island-road-trip",
    title: "Sky-Island Road Trip",
    subtitle: "From desert basins up to cool forest",
    description:
      "A route planned by elevation. Each stop is a mountain range or high plateau that is cooler and wetter than the basin below it: oak and pine above the Sonoran and Chihuahuan deserts, bristlecone pine above Las Vegas, lodgepole pine above the Saskatchewan prairie. Drive from the valley floor to the top and watch where the vegetation changes.",
    tone: "sage",
    placeIds: ["portal-az", "huachuca-az", "silver-city-nm", "cloudcroft-nm", "fort-davis-tx", "creel-mx", "cypress-hills-sk", "mount-charleston-nv"],
    archetypeFilters: ["sky-island-refuge", "high-desert-escape", "monsoon-edge"],
    bestFor: ["changes with elevation", "summer thunderstorms", "cool nights near hot basins"],
    seasonHint: "Spring and early autumn are easiest: the basins are not at peak heat and the high roads are clear of snow. July and August add afternoon thunderstorms.",
    monetizationHint: "Editorial route only. Not a guided trip or a paid itinerary.",
  },
  {
    id: "fog-belt-summer-escape",
    title: "Fog-Coast Summers",
    subtitle: "Cool coasts next to hot interiors",
    description:
      "Coasts and islands where cold water keeps summer afternoons at about 17–24°C. On the Pacific stops, drive 40 km inland to feel the change: the fog ends and the afternoon can be 10°C warmer or more. The Atlantic stops add wind, and icebergs off Twillingate into early summer.",
    tone: "glacier",
    placeIds: ["monterey-ca", "eureka-ca", "point-reyes-ca", "cannon-beach-or", "tofino-bc", "grand-manan-nb", "st-johns-nl", "twillingate-nl"],
    archetypeFilters: ["fog-belt-coast", "coastal-upwelling", "hyper-maritime", "cool-summer-maritime"],
    bestFor: ["cool summers", "fog and low cloud", "coastal walking"],
    seasonHint: "July to September, when the contrast with inland heat is greatest. Mornings are often grey and afternoons clearer.",
  },
  {
    id: "rain-shadow-weekend",
    title: "Rain-Shadow Weekend",
    subtitle: "Dry towns behind wet mountains",
    description:
      "Sunny, dry towns on the lee side of the Olympics, the Cascades, the Coast Mountains and the Sierra Nevada. The year's rain runs from about 130 mm at Bishop to 830 mm at Hood River, a fraction of what falls on the windward slopes. The trip works best when you cross the range and see both sides on the same day.",
    tone: "ochre",
    placeIds: ["sequim-wa", "port-townsend-wa", "victoria-bc", "osoyoos-bc", "bishop-ca", "hood-river-or", "ellensburg-wa", "wenatchee-wa"],
    archetypeFilters: ["rain-shadow-sanctuary"],
    bestFor: ["sunshine near a wet coast", "crossing a mountain barrier", "comparing neighbours"],
    seasonHint: "Late spring to early autumn shows the dry side most clearly. In winter the contrast with the wet side is largest, but the passes can be snowy.",
  },
  {
    id: "high-desert-wine-and-orchards",
    title: "Dry-Summer Wine and Orchard Valleys",
    subtitle: "What the fruit says about the climate",
    description:
      "Valleys where hot, dry summer days, cool nights and irrigation water ripen wine grapes and tree fruit: the Okanagan, Wenatchee, Hood River, Napa, Valle de Guadalupe and Parras. Summer rain is slight everywhere except Parras, so growers depend on rivers, lakes or wells. Crops are evidence of a climate, but one orchard does not prove the next field will grow fruit. Frost pockets and water rights change from site to site.",
    tone: "ochre",
    placeIds: ["valle-guadalupe-mx", "parras-de-la-fuente-mx", "osoyoos-bc", "penticton-bc", "summerland-bc", "wenatchee-wa", "hood-river-or", "napa-ca"],
    archetypeFilters: ["orchard-valley", "rain-shadow-sanctuary", "mediterranean-pocket", "high-desert-escape"],
    bestFor: ["vineyards and orchards", "warm days and cool nights", "water and soil questions"],
    seasonHint: "Late August to October for harvest. Spring bloom, in April and May, is the other good time and shows where the frost risk lies.",
  },
  {
    id: "appalachian-hollows-and-thermal-belts",
    title: "Appalachian Hollows and Thermal Belts",
    subtitle: "Cold valley floors and milder slopes",
    description:
      "Southern and central Appalachian towns where warm slopes and cold hollows lie a few kilometres apart. Burkes Garden and Canaan Valley are high basins that collect cold air at night. Black Mountain sits on a slope above the frost. Highlands is among the rainiest places in the East. The regional forecast tells you little here; the position on the hill tells you more.",
    tone: "sage",
    placeIds: ["black-mountain-nc", "asheville-nc", "boone-nc", "highlands-nc", "gatlinburg-tn", "burkes-garden-va", "canaan-valley-wv", "mentone-al"],
    archetypeFilters: ["thermal-belt", "cold-air-pool", "cloud-forest", "frost-hollow"],
    bestFor: ["frost hollows and warm slopes", "cove forests", "cool summers in the Southeast"],
    seasonHint: "Spring bloom, summer and autumn colour all work. Go out early on a clear morning to feel the cold in the hollows, then climb to the slopes.",
  },
  {
    id: "great-lakes-islands-and-snowbelts",
    title: "Great Lakes Shores and Snowbelts",
    subtitle: "What a large lake does to its shore",
    description:
      "Fruit-growing shores kept mild by the lakes, the cool south shore of Lake Superior, and towns that take the heaviest lake-effect snow. Which of these a town gets depends on which shore it stands on and which way the wind blows across the water, so start each stop by finding both.",
    tone: "ice",
    placeIds: ["traverse-city-mi", "houghton-mi", "marquette-mi", "grand-marais-mi", "duluth-mn", "erie-pa", "geneva-on-the-lake-oh", "leamington-on", "prince-edward-co-on"],
    archetypeFilters: ["lake-moderated", "lake-effect-snowbelt", "orchard-valley"],
    bestFor: ["lake-effect snow", "cool summer shores", "orchards and vineyards"],
    seasonHint: "Summer shows how the lakes cool the shore. Late November to January shows lake-effect snow, before the lakes ice over.",
  },
  {
    id: "volcanic-soils-and-growing-zones",
    title: "Volcanic Soils and What Grows on Them",
    subtitle: "Lava, ash and the crops they carry",
    description:
      "Places on volcanic ground, where the soil helps explain what grows: rainforest on young lava at Hilo, blue agave on the red soils around Tequila, coffee on the slopes at Coatepec and Xalapa, ponderosa pine on the cinder fields around Flagstaff. The soil notes are general. Dig a hole or ask a local grower before relying on them.",
    tone: "ember",
    placeIds: ["hilo-hi", "tequila-mx", "patzcuaro-mx", "xalapa-mx", "coatepec-mx", "orizaba-mx", "santa-fe-nm", "flagstaff-az"],
    archetypeFilters: ["volcanic-upland", "cloud-forest", "eternal-spring-highland"],
    bestFor: ["soil and crops", "gardening at altitude", "coffee and agave country"],
    seasonHint: "Go in the growing season, when crops and gardens are in leaf and you can see how wet the soil stays.",
  },
  {
    id: "hidden-mountain-towns",
    title: "Small Mountain Towns",
    subtitle: "Little-visited bases with strongly local climates",
    description:
      "Eight small towns, from Winthrop at 520 m to Real de Catorce at 2756 m. Several are cold: winter nights average −20°C at Crested Butte and −18°C at Stanley. Shops and medical care are limited, and the nearest large airport can be hours away. Use each town as a base and compare the valley floor with the slopes around it.",
    tone: "sage",
    placeIds: ["crested-butte-co", "joseph-or", "stanley-id", "real-catorce-mx", "cloudcroft-nm", "silver-city-nm", "winthrop-wa", "nelson-bc"],
    archetypeFilters: ["sky-island-refuge", "cold-air-pool", "rain-shadow-sanctuary", "alpine-tundra"],
    bestFor: ["quiet bases", "cold, clear winters", "exploring on foot"],
    seasonHint: "Late spring and early autumn have open roads, mild days and few visitors. Check for seasonal road closures in winter.",
  },
  {
    id: "cold-air-pools-and-frost-hollows",
    title: "Cold-Air Pools and Frost Hollows",
    subtitle: "Valley floors that run colder than expected",
    description:
      "Basins where cold air collects at night. Go out at dawn on a clear, calm morning. The valley floor is at its coldest, a layer of fog or smoke marks the top of the cold air, and a short climb up the slope brings you into warmer air. The same pooling shortens the growing season, which matters if you plan to garden.",
    tone: "ice",
    placeIds: ["gunnison-co", "logan-ut", "canaan-valley-wv", "burkes-garden-va", "stanley-id", "truckee-ca", "fairbanks-ak", "international-falls-mn"],
    archetypeFilters: ["cold-air-pool", "frost-hollow", "basin-inversion"],
    bestFor: ["frost pockets", "winter inversions", "checking a garden site"],
    seasonHint: "Clear, calm mornings in winter, early spring or autumn show the cold pool best.",
  },
];

export const CLIMATE_TRIP_THEME_BY_ID: Record<string, ClimateTripTheme> = Object.fromEntries(
  CLIMATE_TRIP_THEMES.map(theme => [theme.id, theme]),
);
