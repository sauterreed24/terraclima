// ============================================================
// Terraclima — Microclimate Archetypes
// Provides display metadata for each archetype and short
// "field guide" descriptions used in collection views.
// ============================================================

import type { MicroclimateArchetype } from "../types";

export interface ArchetypeMeta {
  id: MicroclimateArchetype;
  label: string;
  tone: "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora";
  blurb: string;
  guide: string; // longer field-guide style description
}

export const ARCHETYPES: ArchetypeMeta[] = [
  {
    id: "rain-shadow-sanctuary",
    label: "Rain-Shadow Sanctuary",
    tone: "ochre",
    blurb: "Dry, sunny, and sheltered just downwind of a reliable mountain wall.",
    guide: "The atmosphere does the work: moist air sheds its rain climbing the windward flank, then compresses and dries as it descends. The result is a pocket of unexpected sunshine and open skies, often adjacent to soggy neighbors only a short drive away.",
  },
  {
    id: "sky-island-refuge",
    label: "Sky-Island Refuge",
    tone: "sage",
    blurb: "A cool, forested uplift marooned above hot desert lowlands.",
    guide: "Elevation alone is a climate-changer. Sky islands are isolated massifs that rise thousands of meters above arid basins, carrying pine-oak forests, cloud pockets, and endemic species into otherwise uninhabitable heat. Drive the switchbacks and you cross ecosystems with every 500 m.",
  },
  {
    id: "eternal-spring-highland",
    label: "Eternal-Spring Highland",
    tone: "sage",
    blurb: "Tropical latitudes tempered by altitude into a year-round mild climate.",
    guide: "In the subtropics, altitude substitutes for latitude. Highland basins between 1500 and 2500 m — especially along Mexico's Trans-Volcanic Belt — sit in the range where highs stay near 22–26°C and lows near 8–14°C essentially all year. The result is climates often described, fairly, as 'perpetual spring.'",
  },
  {
    id: "cool-summer-maritime",
    label: "Cool-Summer Maritime",
    tone: "glacier",
    blurb: "Ocean-moderated coasts where summer highs rarely leave the 20s Celsius.",
    guide: "Where cold ocean currents and persistent marine layers dominate, summers remain astonishingly cool. July afternoons in the teens and low 20s are normal. Winters, too, moderate — the sea refuses to freeze. For heat-sensitive humans and plants, these coasts are refuges.",
  },
  {
    id: "fog-belt-coast",
    label: "Fog-Belt Coast",
    tone: "glacier",
    blurb: "Coasts kept cool by persistent low stratus through the warm season.",
    guide: "A narrow band along upwelling coasts where stratus is the default summer sky. Mornings are gray, afternoons sometimes clear, redwoods thrive, and summer heat never arrives. Fog acts as a slow irrigation on forests and orchards alike.",
  },
  {
    id: "orchard-valley",
    label: "Orchard Valley",
    tone: "ochre",
    blurb: "Valleys where terrain, drainage, and diurnal swing align for tree fruit.",
    guide: "Orchard belts emerge where three factors meet: a dependable chill period, warm sunny summers, and topography that drains frost downward past mid-slope plantings. The fruit valleys of the Okanagan, Annapolis, Willamette, and Michigan coast all tell the same story through different geologies.",
  },
  {
    id: "basin-inversion",
    label: "Basin Inversion",
    tone: "ice",
    blurb: "Enclosed basins where winter cold and fog stagnate for days.",
    guide: "In closed basins, calm high-pressure winters build inversions that pin cold, moist air under a warm cap. Valleys turn gray and freezing while ridges above bask in sun. These microclimates are real but unforgiving — they define winter character as much as any weather system.",
  },
  {
    id: "thermal-belt",
    label: "Thermal Belt",
    tone: "ochre",
    blurb: "A mid-slope band spared from both frost pockets below and ridge exposure above.",
    guide: "On radiative nights, cold air drains past mid-slope into the valley below, and ridges lose heat to space — but the mid-slope itself stays warmer than both. Orchards, vineyards, and the oldest farmhouses cluster along these belts for a reason: an extra two to four weeks of frost-free season.",
  },
  {
    id: "lake-moderated",
    label: "Lake-Moderated",
    tone: "glacier",
    blurb: "Open water nearby softens both summer heat and winter cold.",
    guide: "Large lakes are thermal flywheels. They delay spring, stretch autumn, and hold off the worst of winter cold. On their lee shores, fruit trees survive where they couldn't ten miles inland. The moderation is subtle but profoundly shapes local character.",
  },
  {
    id: "lake-effect-snowbelt",
    label: "Lake-Effect Snowbelt",
    tone: "glacier",
    blurb: "Downwind shores where cold-air-over-warm-water produces prodigious snowfall.",
    guide: "Every cold outbreak across an unfrozen lake lifts moisture and convects it onto the downwind shore. Annual snowfall totals of 3–6 meters are normal in these belts — a defining feature that shapes everything from architecture to the local economy.",
  },
  {
    id: "chinook-corridor",
    label: "Chinook Corridor",
    tone: "ochre",
    blurb: "Lee-of-the-Rockies belts where warm downslope winds punctuate winter.",
    guide: "When stable westerly flow descends the lee of the Rockies, it compresses and warms, sometimes spiking temperatures 20–30°C in hours. Snow vanishes within a day; winters become intermittent rather than continuous. It's a wild, beautiful, wind-shaped climate.",
  },
  {
    id: "high-desert-escape",
    label: "High-Desert Escape",
    tone: "ochre",
    blurb: "Elevation-tempered desert with dry air, cool nights, and vast skies.",
    guide: "Above 1500 m, desert loses its worst heat. Afternoons are warm but bearable; nights cool sharply thanks to dry air and radiative loss. The trade-off is aridity — but for heat-intolerant, humidity-averse people, these places are paradise.",
  },
  {
    id: "canyon-sheltered",
    label: "Canyon-Sheltered",
    tone: "ochre",
    blurb: "Settlements tucked in canyon walls, shielded from wind and harsh sun.",
    guide: "Canyons throttle wind, shade slopes, and create their own drainage breezes. Canyon towns often enjoy a noticeably milder, steadier climate than the plateaus above — plus deeper soils where water collects in the narrows.",
  },
  {
    id: "coastal-upwelling",
    label: "Coastal-Upwelling Belt",
    tone: "glacier",
    blurb: "Coasts chilled by wind-driven surfacing of deep, cold ocean water.",
    guide: "During the warm season, offshore winds drag surface water out to sea and cold water rises to replace it. The adjacent coast stays cool and often foggy. These are some of the most productive oceans on Earth — and some of the most climatologically distinctive coasts.",
  },
  {
    id: "monsoon-edge",
    label: "Monsoon-Edge Zone",
    tone: "sage",
    blurb: "Places where late-summer monsoon moisture reliably — but barely — arrives.",
    guide: "The North American Monsoon pushes moisture into the Southwest each July to September. Places at its leading edge experience towering afternoon thunderstorms, dramatic skies, and a distinctly two-season feel: dry foresummer, wet late summer. Cross the edge and the rhythm changes.",
  },
  {
    id: "humidity-refuge",
    label: "Humidity Refuge",
    tone: "glacier",
    blurb: "Places where dry air, elevation, or marine cooling keep dew points low.",
    guide: "Summer discomfort is driven as much by humidity as by heat. A pocket with typical afternoon dew points in the 10–15°C range feels dramatically different — and healthier — than a lowland with dew points in the 22–24°C range, even at identical temperatures.",
  },
  {
    id: "mild-winter-foothills",
    label: "Mild-Winter Foothills",
    tone: "sage",
    blurb: "Low-elevation ridges downslope of mountains that escape the worst cold.",
    guide: "Foothill belts sit above the cold-air pools of valleys and below the exposure of ridges. They often feature warmer nights, less snow, and earlier springs than neighbors on either side. Many historic farmsteads and orchards chose these belts on purpose.",
  },
  {
    id: "mediterranean-pocket",
    label: "Mediterranean Pocket",
    tone: "ochre",
    blurb: "Mild, wet winters and dry, sunny summers — a rare climate globally.",
    guide: "True Mediterranean climates exist on only a handful of coasts worldwide. In North America, they form a narrow band from Baja through coastal California. Olive, grape, citrus, and stone fruit thrive. Winter green turns to tawny gold by July.",
  },
  {
    id: "cloud-forest",
    label: "Cloud Forest",
    tone: "sage",
    blurb: "Montane forests fed continually by mist rather than rainfall.",
    guide: "Along humid tropical windward slopes, moisture-laden air condenses onto forest canopies — 'horizontal precipitation.' The result is lush, dripping, biodiverse forest with remarkably stable temperature and humidity. These are globally rare and locally dramatic.",
  },
  {
    id: "volcanic-upland",
    label: "Volcanic Upland",
    tone: "ochre",
    blurb: "High-elevation plateaus on volcanic substrate with distinctive growing conditions.",
    guide: "Volcanic soils are deep, well-drained, and often extraordinarily fertile. Combined with elevation-moderated climate, they produce some of the world's best coffee, stone-fruit, and avocado-analog regions — often on otherwise unlikely-seeming latitudes.",
  },
  {
    id: "limestone-karst",
    label: "Limestone / Karst Pocket",
    tone: "ochre",
    blurb: "Fast-draining alkaline landscapes with distinctive soils and water behavior.",
    guide: "Karst terrain drains through fractures rather than streams. Soils are thin, alkaline, and rocky; sinks harbor their own humid microclimates. Character is defined by how water moves underground rather than over it.",
  },
  {
    id: "river-valley-moderation",
    label: "River-Valley Moderation",
    tone: "glacier",
    blurb: "Long, deep river valleys that moderate climate and carry maritime air inland.",
    guide: "Major river valleys are thermal corridors. They channel marine air inland, moderate extremes in both directions, and host deep alluvial soils. The Columbia and St. Lawrence carry their influence hundreds of kilometers from the coast.",
  },
  {
    id: "urban-heat-contrast",
    label: "Urban Heat Contrast",
    tone: "ember",
    blurb: "City cores that run several degrees hotter than surrounding land — for better and worse.",
    guide: "Urban surfaces absorb, retain, and re-radiate heat. The effect delays frost in spring, preserves tender plantings, and lengthens growing seasons — but also amplifies summer heat stress. Understanding the gradient from core to edge is key to urban livability.",
  },
  {
    id: "desert-oasis",
    label: "Desert Oasis",
    tone: "sage",
    blurb: "Localized springs, wetlands, or riparian pockets thriving within harsh desert.",
    guide: "A steady water source changes everything. Oases create islands of humidity, shade, and biodiversity within otherwise arid landscapes — and they are fragile. Many are tied to fossil groundwater or ice-age aquifers.",
  },
  {
    id: "hyper-maritime",
    label: "Hyper-Maritime",
    tone: "glacier",
    blurb: "Coasts so ocean-dominated that seasons nearly blur together.",
    guide: "On exposed Pacific headlands and outer-coast islands, summers barely warm and winters barely cool. Fog, swell, and salt define daily life. It's the most maritime climate North America produces — a world of 9–17°C year-round.",
  },
  {
    id: "driftless-relief",
    label: "Driftless Relief Pocket",
    tone: "sage",
    blurb: "Unglaciated topographic pockets producing strong local microclimate variation.",
    guide: "The Driftless Area and similar unglaciated uplands retain complex relief the ice sheets smoothed away elsewhere. The result is sharp local variation in slope, aspect, soil depth, and drainage — dense microclimatic diversity in a small area.",
  },
  {
    id: "piedmont-transition",
    label: "Piedmont Transition",
    tone: "ochre",
    blurb: "Foothill transition bands between mountains and lowland plains.",
    guide: "Piedmonts are the connective tissue of continents — gentler than the ridges, cooler than the plains, often home to some of the best small-farm and wine country. Elevation buys moderation; proximity buys access to water and soil.",
  },
  {
    id: "cold-air-pool",
    label: "Cold-Air Pool",
    tone: "ice",
    blurb: "Persistent winter inversion basins where the valley floor stays colder than the ridges above.",
    guide: "In enclosed valleys on calm, clear winter nights, cold air drains downslope and puddles at the bottom — sometimes for weeks. Inversions cap the cold layer under a warmer lid aloft; surface temperatures can be 10–25°C below ridgetops only a few hundred meters higher. Places like Cache Valley, Canaan Valley, and Gunnison carry national temperature records for exactly this reason.",
  },
  {
    id: "frost-hollow",
    label: "Frost Hollow",
    tone: "ice",
    blurb: "Small radiative basins where the growing season is measurably shorter than adjacent slopes.",
    guide: "Distinct from full inversion valleys, frost hollows are topographic cups — even modest ones — where cold air settles enough on still nights to shave weeks off the frost-free season. Orchardists avoid them; gardeners learn their locations by hard experience. They can be meters across or kilometers wide.",
  },
  {
    id: "santa-ana-corridor",
    label: "Santa Ana / Sundowner Corridor",
    tone: "ember",
    blurb: "Coastal canyons and passes where desert air descends offshore as hot, dry, fire-driving wind.",
    guide: "When high pressure builds over the Great Basin, air accelerates through coastal gaps — compressing, drying, and heating as it drops. Santa Anas, sundowners, and Diablo winds produce sudden heat spikes, crystalline dry air, and the continent's most dangerous fire weather. They define autumn character across coastal Southern California.",
  },
  {
    id: "gap-wind-corridor",
    label: "Gap / Gorge Wind Corridor",
    tone: "ochre",
    blurb: "Mountain gaps that funnel and accelerate wind through predictable corridors.",
    guide: "Where a mountain barrier is notched by a river or pass, the pressure gradient across the range drives persistent, predictable wind — the Columbia Gorge, Cajon Pass, Tehachapi, the Strait of Juan de Fuca. These corridors concentrate weather into a small geographic band: the windsurfing capital, the wind-farm belt, the corridor where storms arrive first.",
  },
  {
    id: "fjord-inlet",
    label: "Fjord / Inlet Coast",
    tone: "glacier",
    blurb: "Deep, steep-walled inlets where ocean and mountain meet in an intimate microclimate.",
    guide: "Fjords produce intense local climate contrasts. Steep walls shade one side while the other bakes; inlets funnel katabatic winds off inland snowfields; the ocean moderates the head of the fjord more than the outer coast. Expect narrow zones of temperate rainforest, intense precipitation gradients, and dramatic local weather.",
  },
  {
    id: "alpine-tundra",
    label: "Alpine Tundra",
    tone: "ice",
    blurb: "Above-treeline towns and basins with short, cool summers and long, bright winters.",
    guide: "Above roughly 3000 m in the Rockies and Sierras, the growing season compresses to weeks and winter stretches for eight months. These places retain snow late, carry thin air and brilliant UV, and experience some of the continent's most dramatic diurnal swings. A human can live here — many do — but the climate demands it.",
  },
  {
    id: "subarctic-continental",
    label: "Subarctic Continental",
    tone: "aurora",
    blurb: "Deep-interior latitudes where winter reaches -40°C and summer briefly hits 25°C.",
    guide: "North of 58° latitude and far from any ocean, the annual temperature range becomes staggering. Whitehorse, Yellowknife, Fairbanks: long aurora-lit winters, short near-midnight-sun summers, boreal forest and muskeg, and a relationship with the sun that reshapes life. These are not extreme microclimates — they are extreme regional climates, distinctively their own.",
  },
  {
    id: "tropical-isothermal",
    label: "Tropical Isothermal Coast",
    tone: "sage",
    blurb: "Tropical coasts where the annual temperature range barely exceeds 5°C.",
    guide: "Between roughly 15° and 23° latitude on equatorward-facing coasts, ocean buffering and limited solar swing produce climates where every month averages within a few degrees of every other. The seasons are rainfall, not temperature — a dry winter and a wet summer in mirror image.",
  },
  {
    id: "tropical-dry",
    label: "Tropical Wet-Dry",
    tone: "ochre",
    blurb: "Tropical latitudes with a pronounced dry season and a reliable monsoon.",
    guide: "Aw and As climates of the Yucatán, Oaxaca coast, and western Mexican lowlands: bone-dry winters, explosive summer rainy seasons, and dramatic greening/browning cycles that define how everything — agriculture, architecture, celebrations — is scheduled.",
  },
  {
    id: "hurricane-coast",
    label: "Hurricane-Exposed Coast",
    tone: "ember",
    blurb: "Tropical and subtropical coasts within the statistical path of major storms.",
    guide: "From the Gulf of Mexico through the Caribbean and up the US Atlantic, hurricane climatology is a constitutive part of climate — influencing building codes, insurance, vegetation, and the rhythm of autumn. Some coasts live it annually; others carry long latent return periods and the memory of rare catastrophic events.",
  },
  {
    id: "badland-steppe",
    label: "Badland / Steppe Pocket",
    tone: "ochre",
    blurb: "Eroded landscapes at the dry edge of the Great Plains with distinctive thermal regimes.",
    guide: "In places like the Dakotas Badlands and Cypress Hills, rapidly eroded topography creates exposed slopes with hot, dry days and sharply cold nights. Aspect matters enormously; south-facing slopes behave almost like desert while north-facing slopes hold snow for months.",
  },
];

export const ARCHETYPE_BY_ID = Object.fromEntries(ARCHETYPES.map(a => [a.id, a])) as Record<MicroclimateArchetype, ArchetypeMeta>;
