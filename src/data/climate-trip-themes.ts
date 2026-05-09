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
    subtitle: "Climate dissonance, not travel fantasy",
    description:
      "Stops where terrain, latitude, water, or elevation makes the local climate feel abruptly unlike the surrounding map. Use the contrast as the trip: dry Canadian desert edge, tropical highlands, limestone lagoons, volcanic coasts, and North Atlantic chill.",
    tone: "aurora",
    placeIds: ["osoyoos-bc", "penticton-bc", "san-cristobal-mx", "xilitla-mx", "bacalar-mx", "cuatrocienegas-mx", "hilo-hi", "st-johns-nl"],
    bestFor: ["country-feel contrast", "first-time atlas readers", "photo and field notes"],
    seasonHint: "Use the clearest local best-month window for each stop; the point is contrast, not one uniform season.",
    monetizationHint: "Static scouting guide only; no packages, paid placement, or reservation inventory.",
  },
  {
    id: "sky-island-road-trip",
    title: "Sky-Island Road Trip",
    subtitle: "Desert basins to cool uplands",
    description:
      "A vertical trip through mountain islands that lift woodland, storm, and frost above hotter lowlands. Read the route by elevation, not by state line.",
    tone: "sage",
    placeIds: ["portal-az", "huachuca-az", "silver-city-nm", "cloudcroft-nm", "fort-davis-tx", "creel-mx", "cypress-hills-sk", "mount-charleston-nv"],
    archetypeFilters: ["sky-island-refuge", "high-desert-escape", "monsoon-edge"],
    bestFor: ["vertical climate gradients", "monsoon edges", "ridge-to-basin scouting"],
    seasonHint: "Spring and early fall usually make the vertical gradient easiest to read without peak heat or deep winter access issues.",
    monetizationHint: "Future editorial route, not a guided trip or paid itinerary.",
  },
  {
    id: "fog-belt-summer-escape",
    title: "Fog-Belt Summer Escape",
    subtitle: "Cool air beside warmer interiors",
    description:
      "Coasts and islands where cold water, marine layers, and exposure keep summer cool. The useful move is to compare the fog edge with the inland warm belt.",
    tone: "glacier",
    placeIds: ["monterey-ca", "eureka-ca", "point-reyes-ca", "cannon-beach-or", "tofino-bc", "grand-manan-nb", "st-johns-nl", "twillingate-nl"],
    archetypeFilters: ["fog-belt-coast", "coastal-upwelling", "hyper-maritime", "cool-summer-maritime"],
    bestFor: ["cool summers", "marine layer study", "coastal field notes"],
    seasonHint: "Summer is the clearest proof, especially where inland heat sits close enough for a same-day contrast.",
  },
  {
    id: "rain-shadow-weekend",
    title: "Rain-Shadow Weekend",
    subtitle: "One ridge changes the sky",
    description:
      "Dry, bright pockets tucked behind wet mountain walls. The trip is strongest when you can cross the barrier or compare the leeward town with a wetter neighbor.",
    tone: "ochre",
    placeIds: ["sequim-wa", "port-townsend-wa", "victoria-bc", "osoyoos-bc", "bishop-ca", "hood-river-or", "ellensburg-wa", "wenatchee-wa"],
    archetypeFilters: ["rain-shadow-sanctuary"],
    bestFor: ["dry light", "barrier effects", "nearby weather contrasts"],
    seasonHint: "Late spring through early fall usually exposes the dry-side signal with the least storm noise.",
  },
  {
    id: "high-desert-wine-and-orchards",
    title: "High-Desert Wine and Orchards",
    subtitle: "Fruit belts as climate evidence",
    description:
      "Orchard valleys and wine districts where sun, chill, soil, water, and daily temperature swing line up. Treat crops as climate clues, not as a promise of production on any specific site.",
    tone: "ochre",
    placeIds: ["valle-guadalupe-mx", "parras-de-la-fuente-mx", "osoyoos-bc", "penticton-bc", "summerland-bc", "wenatchee-wa", "hood-river-or", "napa-ca"],
    archetypeFilters: ["orchard-valley", "rain-shadow-sanctuary", "mediterranean-pocket", "high-desert-escape"],
    bestFor: ["orchard clues", "vineyard climates", "soil and water tradeoffs"],
    seasonHint: "Harvest windows and shoulder seasons tend to show both comfort and the agricultural signal.",
  },
  {
    id: "appalachian-hollows-and-thermal-belts",
    title: "Appalachian Hollows and Thermal Belts",
    subtitle: "Ridges, hollows, and midslope warmth",
    description:
      "Eastern highland stops where cove forests, frost hollows, and warm midslopes sit close together. Walk the relief before trusting the regional average.",
    tone: "sage",
    placeIds: ["black-mountain-nc", "asheville-nc", "boone-nc", "highlands-nc", "gatlinburg-tn", "burkes-garden-va", "canaan-valley-wv", "mentone-al"],
    archetypeFilters: ["thermal-belt", "cold-air-pool", "cloud-forest", "frost-hollow"],
    bestFor: ["hollows and coves", "thermal belts", "lush eastern relief"],
    seasonHint: "Spring bloom, summer shade, and fall color all work; compare morning cold pockets with afternoon midslopes.",
  },
  {
    id: "great-lakes-islands-and-snowbelts",
    title: "Great Lakes Islands and Snowbelts",
    subtitle: "Freshwater seas as climate engines",
    description:
      "Lake-moderated fruit belts, summer-chill shores, and snowbelt towns shaped by fetch and open water. Read wind direction and shoreline position first.",
    tone: "ice",
    placeIds: ["traverse-city-mi", "houghton-mi", "marquette-mi", "grand-marais-mi", "duluth-mn", "erie-pa", "geneva-on-the-lake-oh", "leamington-on", "prince-edward-co-on"],
    archetypeFilters: ["lake-moderated", "lake-effect-snowbelt", "orchard-valley"],
    bestFor: ["lake-effect weather", "freshwater coasts", "fruit belts and snowbelts"],
    seasonHint: "Summer shows lake cooling; late fall and winter show lake-effect snow mechanics.",
  },
  {
    id: "volcanic-soils-and-growing-zones",
    title: "Volcanic Soils and Growing Zones",
    subtitle: "Ground truth beneath the weather",
    description:
      "Places where volcanic or young upland ground helps explain gardens, coffee, agave, forests, or high-country growing limits. The soil read stays screening-grade and must be verified locally.",
    tone: "ember",
    placeIds: ["hilo-hi", "tequila-mx", "patzcuaro-mx", "xalapa-mx", "coatepec-mx", "orizaba-mx", "santa-fe-nm", "flagstaff-az"],
    archetypeFilters: ["volcanic-upland", "cloud-forest", "eternal-spring-highland"],
    bestFor: ["soil curiosity", "growing-zone scouting", "terrain and crop links"],
    seasonHint: "Growing-season visits are best when gardens, canopy vigor, and soil moisture are visible.",
  },
  {
    id: "hidden-mountain-towns",
    title: "Hidden Mountain Towns",
    subtitle: "Small bases with oversized climate signals",
    description:
      "Mountain towns and upland bases where the climate signal is bigger than the name recognition. Use them as compact scouting bases, then compare the surrounding exposures.",
    tone: "sage",
    placeIds: ["crested-butte-co", "joseph-or", "stanley-id", "real-catorce-mx", "cloudcroft-nm", "silver-city-nm", "winthrop-wa", "nelson-bc"],
    archetypeFilters: ["sky-island-refuge", "cold-air-pool", "rain-shadow-sanctuary", "alpine-tundra"],
    bestFor: ["hidden gems", "upland bases", "terrain-first scouting"],
    seasonHint: "Shoulder seasons show access, comfort, and climate contrast without flattening everything into peak tourism mode.",
  },
  {
    id: "cold-air-pools-and-frost-hollows",
    title: "Cold-Air Pools and Frost Hollows",
    subtitle: "Valley floors that run colder than expected",
    description:
      "Basins and hollows where dense air drains, stalls, and rewrites the winter or garden story. A good trip starts before breakfast, when the inversion is still visible.",
    tone: "ice",
    placeIds: ["gunnison-co", "logan-ut", "canaan-valley-wv", "burkes-garden-va", "stanley-id", "truckee-ca", "fairbanks-ak", "international-falls-mn"],
    archetypeFilters: ["cold-air-pool", "frost-hollow", "basin-inversion"],
    bestFor: ["frost pockets", "inversions", "garden risk scouting"],
    seasonHint: "Clear mornings in winter, early spring, or fall make the cold-air structure easiest to prove.",
  },
];

export const CLIMATE_TRIP_THEME_BY_ID: Record<string, ClimateTripTheme> = Object.fromEntries(
  CLIMATE_TRIP_THEMES.map(theme => [theme.id, theme]),
);
