// ============================================================
// Terraclima — profile-only fields of the Mexican places
// ============================================================
// Sources (citations), confidence notes, the climate-change outlook and the
// In depth chapters. They are read only by a place's profile, Compare and
// exports, so they live here and load when one of those opens, instead of
// with the atlas on first load. Edit them here; the rest of each place stays
// in its places file. Keyed by place id.
// ============================================================

import type { AuthoredProfileExtras } from "./types";

export const PROFILE_EXTRAS_MEXICO: Record<string, AuthoredProfileExtras> = {
  "oaxaca-mx": {
    climateChange: {
      outlook2050: "Warmer, with heat stress especially in the pre-monsoon May–June window. Monsoon timing increasingly variable; some projections show later onset.",
      outlook2100: "Significant drying in some scenarios threatens milpa-scale agriculture. Coffee on the sierras under pressure from warming.",
      keyShifts: [
        { variable: "Pre-monsoon heat", direction: "up" },
        { variable: "Monsoon timing", direction: "mixed" },
        { variable: "Dry-season dryness", direction: "up" },
        { variable: "Mountain cloud base", direction: "up" },
      ],
      resilienceNote: "Elevation buffers extreme heat well by North American standards; water availability is the primary vulnerability.",
    },
    confidenceNotes: "SMN station coverage at Oaxaca is strong; WorldClim downscaling agrees with station means.",
    deepSections: [
      {
        id: "oaxaca-dry-wet-rhythm",
        title: "Dry season vs wet season — how the year actually feels",
        paragraphs: [
          "From November into May the valleys sit under dry, stable air most afternoons. Rain is rare; dust picks up on windier days; irrigation and municipal water planning dominate conversation. This is when outdoor markets, rooftop dining, and festival calendars concentrate — the city feels like perpetual spring because humidity is moderate and skies are reliably clear.",
          "June opens the monsoon gate: convection builds over the sierras first, then cells drift across the valles. Rain tends to arrive mid-afternoon to evening, often intense but short; mornings can still be bright. June and September are usually the wettest months, and September the hardest emotionally as well as hydrologically — roads cut by arroyos, hillside communities watch for debris flows. If you are looking at property, find out where the stormwater goes.",
        ],
      },
      {
        id: "oaxaca-valley-wind-light",
        title: "Valley breezes, smoke, and air you can plan around",
        paragraphs: [
          "East–west valley orientation channels easterly flow in some regimes and blocks it in others, so micro-variation block-to-block is real: a courtyard with tall walls may feel still while a rooftop two streets over catches a steady draft.",
          "Late dry season agricultural burns and occasional forest-fire smoke can degrade air quality for days at a time — less a surprise than a calendar item for sensitive households. Treat smoke as a seasonal risk, at its worst late in the dry season.",
        ],
      },
      {
        id: "oaxaca-elevation-pocket",
        title: "Why this valley elevation reads cooler than the map latitude suggests",
        paragraphs: [
          "Free-air lapse rates mean each ~100 m of lift knocks roughly 0.6°C off afternoon potential temperature — stack that across 1500 m above sea level and tropical latitude stops meaning tropical heat. Add valley shelter from the hottest maritime air masses and you get a climate tourists describe as 'perfect' and agronomists describe as 'carefully scheduled around the rains'.",
          "Small elevation differences within the valles (ridge toes vs basin floor) can separate frost pockets from frost-free gardens. If you are buying land for trees or citrus, walk the parcel at dawn in January, not only at noon in April.",
        ],
      },
    ],
    citations: [
      { label: "Servicio Meteorológico Nacional — Oaxaca Observatorio", kind: "smn", url: "https://smn.conagua.gob.mx/es/" },
      { label: "INEGI topographic layers — Valles Centrales", kind: "inegi", url: "https://www.inegi.org.mx/" },
      { label: "WorldClim 2.1 — 30s resolution", kind: "worldclim", url: "https://www.worldclim.org/" },
      { label: "INECC — Regional climate vulnerability assessments", kind: "inecc", url: "https://www.gob.mx/inecc" },
    ],
  },
  "san-cristobal-mx": {
    climateChange: {
      outlook2050: "Warming ~1.5°C; cloud-forest cloud base rises, stressing montane ecosystems.",
      outlook2100: "Cloud-forest retreat on ridges; warmer basin; rain-season intensification.",
      keyShifts: [
        { variable: "Cloud base elevation", direction: "up", note: "Cloud forests retreat upslope." },
        { variable: "Wet-season intensity", direction: "up" },
        { variable: "Winter cold nights", direction: "down" },
      ],
      resilienceNote: "Elevation provides thermal resilience; ecosystem pressure on the surrounding ridges is the key concern.",
    },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because SMN/CONAGUA normals, INEGI relief context, and atlas elevation reasoning agree; neighborhood water, slope, and storm exposure still need local checks.",
    deepSections: [
      {
        id: "san-cristobal-basin-cold",
        title: "Tropical latitude, basin cold",
        paragraphs: [
          "San Cristóbal is a reminder that elevation can dominate latitude. The city sits in a highland basin where dense air drains off surrounding slopes at night, so mornings can feel almost temperate-mountain despite the tropical sun angle.",
          "That basin geometry also means pollution, fog, and cold air can linger until daytime mixing breaks the layer. The comfort is real, but the microclimate is more complex than a simple eternal-spring label.",
        ],
      },
      {
        id: "san-cristobal-cloud-forest-rim",
        title: "Cloud-forest rim and wet-season pulse",
        paragraphs: [
          "The surrounding Chiapas highlands lift moist air from the Gulf and Caribbean side of Mexico. During the wet season, ridges collect cloud and rain while the basin cycles through misty mornings and afternoon convection.",
          "This is why the region supports pine-oak, cloud-forest fragments, maize fields, and cool-weather crops in close proximity. Small changes in exposure and elevation produce visible ecological changes.",
        ],
      },
      {
        id: "san-cristobal-cultural-climate",
        title: "A climate people organize around",
        paragraphs: [
          "Markets, weaving villages, and highland agriculture all use the cool basin setting. The climate makes long walking days possible in a part of Mexico where nearby lowlands can be oppressive in heat and humidity.",
          "For travelers the choice is by season. The dry months bring brighter walking weather. The wet months bring green hillsides, more cloud and roads that can wash out.",
        ],
      },
      {
        id: "san-cristobal-warming-ridge-risk",
        title: "Warming pressure on a cloud-dependent landscape",
        paragraphs: [
          "The main climate-change concern is not only warmer afternoons. Rising cloud bases, altered wet-season intensity, and forest fragmentation can move the ecological band upslope and stress water reliability.",
          "The weather record here comes from the basin floor, and conditions on the slopes differ. For a particular lot, check the slope, the drainage and any history of landslides.",
        ],
      },
    ],
    citations: [
      { label: "SMN — San Cristóbal station", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "INECC vulnerability assessments (Chiapas highland)", kind: "inecc", url: "https://www.gob.mx/inecc" },
      { label: "WorldClim 2.1", kind: "worldclim", url: "https://www.worldclim.org/" },
      { label: "Atlas Nacional de Riesgos — Chiapas hazard context", kind: "atlas-riesgos", url: "https://www.atlasnacionalderiesgos.gob.mx/" },
    ],
  },
  "cuernavaca-mx": {
    climateChange: { outlook2050: "Warmer, drier, increased fire risk on surrounding slopes.", outlook2100: "Heat stress rises; water supply increasingly tight.", keyShifts: [{variable: "Urban heat island", direction: "up"}, {variable: "Water stress", direction: "up"}], resilienceNote: "Elevation helps; urban growth stresses water." },
    confidenceNotes: "This high-confidence profile is grounded in SMN/CONAGUA, INEGI lake-basin context, and strong lived settlement anchors; lake health, drainage, and neighborhood water access still need local checks.",
    deepSections: [
      {
        id: "cuernavaca-slope-bench",
        title: "The south-facing volcanic bench",
        paragraphs: [
          "Cuernavaca is warmer than higher central-Mexican basins because it sits lower and leans south toward tropical lowlands. Elevation still trims heat enough to keep nights comfortable, but the daytime character is lush and subtropical rather than cool highland.",
          "That slope position is why the city can host bougainvillea, citrus, palms, and year-round outdoor life while Mexico City, above it, keeps a cooler and more inversion-prone profile.",
        ],
      },
      {
        id: "cuernavaca-rain-season",
        title: "Rain-season cleaning and dry-season stress",
        paragraphs: [
          "The wet season arrives as afternoon storms built over volcanic slopes. Rain often cleans smoke and dust from the air by evening, then the dry season returns with strong sun and increasing water stress.",
          "For residents, the comfort pattern depends on that alternation: bright dry winters, fragrant wet-season evenings, and late-dry-season heat before the rains settle in.",
        ],
      },
      {
        id: "cuernavaca-urban-water",
        title: "Urban growth is the climate constraint",
        paragraphs: [
          "Cuernavaca's mild weather has drawn people for centuries, from Aztec rulers and Hernán Cortés to weekenders from Mexico City. The growth that followed strains the water supply, has built over ravines and hillsides, and makes the center hotter.",
          "The city still earns its name as the city of eternal spring. For a particular house, check the shade, the airflow, the water supply and the slope it stands on.",
        ],
      },
    ],
    citations: [
      { label: "SMN — Cuernavaca station", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "WorldClim", kind: "worldclim", url: "https://www.worldclim.org/" },
      { label: "INEGI digital map — Morelos topography and land context", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
    ],
  },
  "valle-guadalupe-mx": {
    climateChange: { outlook2050: "Hotter, drier, water stress.", outlook2100: "Viticulture under pressure from heat.", keyShifts: [{variable: "Heat", direction: "up"}, {variable: "Water", direction: "down"}], resilienceNote: "Wine economy climate-constrained." },
    confidenceNotes: "This moderate-confidence profile is reliable at microclimate-zone scale because SMN/CONAGUA normals, INEGI relief context, and atlas elevation reasoning agree; neighborhood water, slope, and storm exposure still need local checks.",
    deepSections: [
      {
        id: "valle-guadalupe-marine-intrusion",
        title: "Marine air without full coastal fog",
        paragraphs: [
          "Valle de Guadalupe is inland enough to warm strongly by afternoon but close enough to the Pacific to receive marine cooling through passes and nighttime drainage. That compromise is the wine climate.",
          "Compared with Ensenada, it is warmer and drier; compared with Mexicali, it is radically cooled by ocean influence.",
        ],
      },
      {
        id: "valle-guadalupe-water-limit",
        title: "Water sets the ceiling",
        paragraphs: [
          "The valley's appeal can hide the hard constraint: summer rain is negligible and groundwater is finite. Vineyard expansion, tourism, and residential demand all compete with a dry Mediterranean baseline.",
          "Before buying land, check the well and the water rights. Annual rain is only about 240 mm, and nearly all of it falls from November to March.",
        ],
      },
      {
        id: "valle-guadalupe-soil-wine",
        title: "Granitic soils and diurnal swing",
        paragraphs: [
          "Fast-draining granitic and alluvial soils help vines avoid wet feet, while warm afternoons build ripeness and cool nights protect acidity. The climate favors Mediterranean grapes and drought-adapted orchard crops more than humid-climate fruit.",
          "Weather stations in the valley are few, and conditions differ from one vineyard to the next, so treat the figures here as approximate.",
        ],
      },
    ],
    citations: [
      { label: "SMN — Ensenada and Valle de Guadalupe regional stations", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "WorldClim", kind: "worldclim", url: "https://www.worldclim.org/" },
      { label: "INEGI digital map — Baja California terrain and land context", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
    ],
  },
  "patzcuaro-mx": {
    climateChange: { outlook2050: "Warming and some drying of the dry season.", outlook2100: "Lake level under pressure.", keyShifts: [{variable: "Lake level", direction: "mixed"}, {variable: "Summer intensity", direction: "up"}], resilienceNote: "Lake is vulnerable; elevation protects humans." },
    confidenceNotes: "This high-confidence profile is grounded in SMN/CONAGUA, INEGI lake-basin context, and strong lived settlement anchors; lake health, drainage, and neighborhood water access still need local checks.",
    deepSections: [
      {
        id: "patzcuaro-lake-basin",
        title: "High lake basin moderation",
        paragraphs: [
          "Pátzcuaro's lake does not create a coastal climate, but it does soften local extremes and adds moisture to a high volcanic basin. Nights remain cool, afternoons stay mild, and wet-season storms often organize around the surrounding rim.",
          "The lake also makes the climate legible to visitors: villages, reeds, fisheries, and fields all sit inside the same basin-scale moisture system.",
        ],
      },
      {
        id: "patzcuaro-volcanic-soils",
        title: "Volcanic soils and highland crops",
        paragraphs: [
          "The Meseta Tarasca's volcanic soils support maize, beans, fruit trees, and avocado districts nearby. The climate is cool enough for temperate crops yet mild enough to avoid harsh winter shutdown.",
          "That mix makes Pátzcuaro more agriculturally flexible than drier high-desert towns, while still avoiding the heat of lower Michoacán.",
        ],
      },
      {
        id: "patzcuaro-lake-risk",
        title: "Lake health is climate resilience",
        paragraphs: [
          "The long-term risk is tied to water quality, lake level, and watershed management. Warming and land-use pressure can reduce the lake's buffering role even if air temperatures remain comfortable for people.",
          "The lake has shrunk and silted up over recent decades, and the comfort of the basin depends on how its watershed is managed.",
        ],
      },
    ],
    citations: [
      { label: "SMN — Pátzcuaro station", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "INECC — Mexico climate vulnerability context", kind: "inecc", url: "https://www.gob.mx/inecc" },
      { label: "INEGI digital map — Michoacán lake basin and relief", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
    ],
  },
  "valle-de-bravo-mx": {
    climateChange: { outlook2050: "Warmer dry seasons, more intense rain bursts, and more pressure on lake and forest management.", outlook2100: "Watershed health becomes the main determinant of climate resilience.", keyShifts: [{ variable: "Dry-season heat", direction: "up" }, { variable: "Extreme rainfall", direction: "up" }, { variable: "Watershed stress", direction: "up" }], resilienceNote: "Elevation protects human comfort; land-use pressure and watershed health set the ceiling." },
    confidenceNotes: "This high-confidence profile is grounded in SMN/CONAGUA normals and INEGI highland/lake context; neighborhood slope, water access, and holiday traffic are local checks.",
    deepSections: [
      { id: "valle-bravo-lake-basin", title: "Lake comfort with slope complications", paragraphs: ["The lake softens local extremes and makes the town feel cooler and more humid than nearby dry highland stretches, especially at night and during the shoulder seasons. That moderation is the heart of the climate appeal.", "But the same basin is steep and developed. Drainage, landslide exposure, road access, and water rules can vary sharply between neighborhoods, so the choice of neighborhood matters."] },
      { id: "valle-bravo-wet-dry-rhythm", title: "Dry-season ease, wet-season drama", paragraphs: ["Dry season brings the postcard version: bright afternoons, cool nights, outdoor dining, and lake light. Wet season brings the ecological engine, when storms build on the rim and keep pine-oak slopes green.", "For living there, both seasons matter. The rain feeds beauty and water supply, but it also tests roads, slopes, roofs, and drainage in ways a climate chart can hide."] },
    ],
    citations: [
      { label: "SMN/CONAGUA climate data bank", kind: "smn", url: "https://www.gob.mx/smn/acciones-y-programas/banco-nacional-de-datos-climatologicos-del-smn" },
      { label: "INEGI digital map relief and hydrography", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
      { label: "CONANP protected-area and watershed context", kind: "other", url: "https://www.gob.mx/conanp" },
    ],
  },
  "zacatlan-de-las-manzanas-mx": {
    climateChange: { outlook2050: "Warmer nights and more intense rainfall, with cloud-forest stress and landslide exposure increasing.", outlook2100: "Moist highland crops may shift upslope while extreme rain management becomes more important.", keyShifts: [{ variable: "Extreme rainfall", direction: "up" }, { variable: "Cloud-forest stress", direction: "up" }, { variable: "Winter chill", direction: "down" }], resilienceNote: "Cool elevation helps human comfort; moisture and slope hazards drive site risk." },
    confidenceNotes: "This moderate-confidence profile uses SMN/CONAGUA and INEGI highland context; Gulf-slope microgradients are strong enough that parcel exposure needs verification.",
    deepSections: [
      { id: "zacatlan-gulf-slope-cloud", title: "Gulf moisture climbs into apple country", paragraphs: ["Zacatlán, at about 2040 m, is on the edge of the Sierra Norte de Puebla, where the highland drops toward the Gulf of Mexico. Moist air from the Gulf rises up the slope and cools, and the town is often in fog or drizzle, even in the drier months. Afternoons stay between 21 and 26°C all year.", "The cool, damp air suits apples, and the town holds an apple fair each August. Houses need ventilation, and fungal disease is a constant in gardens and orchards. September and October are the wettest months, with about 300 mm between them."] },
      { id: "zacatlan-slope-living", title: "The best climate is on the right slope", paragraphs: ["The town stands on the rim of the Barranca de los Jilgueros, a deep ravine, and the ground around it is steep. A slope that faces the morning sun dries by midday. A shaded hollow nearby can stay wet for days, and its road with it.", "Before choosing a house, look at the morning sun, the drainage and the road in the wet season, and ask about past landslides on the slope. The heavy rains of October 1999 caused many in the Sierra Norte."] },
    ],
    citations: [
      { label: "SMN/CONAGUA climate data bank", kind: "smn", url: "https://www.gob.mx/smn/acciones-y-programas/banco-nacional-de-datos-climatologicos-del-smn" },
      { label: "INEGI digital map relief and hydrography", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
      { label: "CONABIO biodiversity and cloud-forest context", kind: "other", url: "https://www.biodiversidad.gob.mx/" },
    ],
  },
  "coatepec-mx": {
    climateChange: { outlook2050: "Warming threatens optimum coffee elevation.", outlook2100: "Coffee belts retreat upslope.", keyShifts: [{variable: "Cloud base", direction: "up"}], resilienceNote: "Coffee culture must adapt upward." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Coatepec station", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "alamos-mx": {
    climateChange: { outlook2050: "Hotter summers, more erratic monsoon.", outlook2100: "Pre-monsoon heat extremes intensify.", keyShifts: [{variable: "Pre-monsoon heat", direction: "up"}], resilienceNote: "Heat-sensitive." },
    confidenceNotes: "This promoted Tier C profile is grounded in SMN/CONAGUA context, Climate-Data and Weather Spark cross-checks, and published municipal/tourism signals; parcel-level drainage and summer heat exposure still need verification.",
    citations: [
      { label: "CLICOM/SMN station climate database", kind: "smn", url: "https://cucapa-clicom.cicese.mx/" },
      { label: "Climate-Data.org - Alamos humidity and sun hours", kind: "other", url: "https://en.climate-data.org/north-america/mexico/sonora/alamos-32531/", note: "Monthly sunshinePct is approximated from reported daily sun hours divided by local mid-month daylight." },
      { label: "Weather Spark - Alamos average weather", kind: "other", url: "https://weatherspark.com/y/3077/Average-Weather-in-Alamos-Mexico-Year-Round" },
      { label: "Visit Mexico - Alamos Pueblo Magico", kind: "other", url: "https://visitmexico.com/en/destino/2102/alamos-sonora" },
      { label: "Data Mexico - Alamos municipal profile", kind: "inegi", url: "https://www.economia.gob.mx/datamexico/en/profile/geo/alamos" },
      { label: "Instituto Sonorense de Cultura - Festival Alfonso Ortiz Tirado", kind: "other", url: "https://isc.sonora.gob.mx/eventos/faot" },
      { label: "Municipio de Alamos - Proteccion Civil y Bomberos", kind: "atlas-riesgos", url: "https://alamos.transparenciasonora.org/category/proteccion-civil-y-bomberos/" },
    ],
    deepSections: [
      {
        id: "alamos-dry-winter-green-monsoon",
        title: "Dry winter, green monsoon",
        paragraphs: [
          "From November to April Álamos is dry and sunny, with afternoons of 27 to 33°C and nights of 8 to 13°C. The town lies in the foothills of the Sierra Madre Occidental at about 400 m, some 50 km inland from Navojoa, and the winter sky is clear day after day.",
          "May and June are the hottest months, with afternoons of 36 to 38°C and the hills bare and grey. The rains arrive in July, and about 310 mm of the year's 400 mm falls by the end of September. The tropical deciduous forest comes into leaf within days. Nights stay near 22°C, the air is humid, and storms fill the arroyos that cross the town.",
        ],
      },
      {
        id: "alamos-small-town-service-reality",
        title: "A small colonial town an hour from the nearest city",
        paragraphs: [
          "Álamos was a silver-mining town, and its arcades and courtyard houses are well preserved. The Festival Alfonso Ortiz Tirado brings musicians and crowds each January. For its size the town has a good supply of hotels and restaurants.",
          "Navojoa, about 50 km away, has the nearest hospitals and large shops, and the nearest airport with regular flights is at Ciudad Obregón, under two hours' drive. Anyone planning to stay through the summer should check the cost of air conditioning, the internet service, and whether the street floods in August.",
        ],
      },
    ],
  },
  "todos-santos-mx": {
    climateChange: { outlook2050: "Water stress; stronger hurricanes.", outlook2100: "Oasis pressure.", keyShifts: [{variable: "Hurricanes", direction: "up"}], resilienceNote: "Water is everything here." },
    confidenceNotes: "This moderate-confidence profile is grounded in SMN/CONAGUA and INEGI Baja Sur context; oasis water, hurricane drainage, and Pacific exposure are block-level checks.",
    citations: [
      { label: "SMN/CONAGUA climate data bank — Baja California Sur stations", kind: "smn", url: "https://www.gob.mx/smn/acciones-y-programas/banco-nacional-de-datos-climatologicos-del-smn" },
      { label: "INEGI digital map — Baja California Sur relief and hydrography", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
      { label: "CONAGUA water context", kind: "other", url: "https://www.gob.mx/conagua" },
    ],
    deepSections: [
      { id: "todos-santos-pacific-oasis", title: "Pacific coolness around a desert oasis", paragraphs: ["Todos Santos is on the Pacific side of Baja California Sur, almost on the Tropic of Cancer. The cool California Current runs along this coast, and the sea breeze keeps afternoons a little cooler than at La Paz, on the Gulf side about 80 km away. Summer afternoons here still average 33 to 35°C.", "The town exists because of water. Springs fed from the Sierra de la Laguna surface here and irrigate palms, mangoes and vegetable plots in a desert that gets about 200 mm of rain a year. The aquifer is small, and new building draws on the same supply. Ask where a property's water comes from."] },
      { id: "todos-santos-seasonal-reality", title: "Dry winters, humid late summer, and hurricanes", paragraphs: ["From November to May the weather is dry and bright. Afternoons reach 27 to 31°C and nights fall to 11 to 15°C. Almost no rain falls from March to June.", "August to October is hot and humid, with nights of 19 to 23°C. Half the year's rain falls in September, from tropical storms and hurricanes moving up the coast. Hurricane Odile in 2014 damaged much of the southern peninsula. Arroyos run hard in these storms and cut the dirt roads."] },
    ],
  },
  "tapalpa-mx": {
    climateChange: { outlook2050: "Warmer.", outlook2100: "Warmer.", keyShifts: [{variable: "Temperature", direction: "up"}], resilienceNote: "Elevation provides buffer." },
    confidenceNotes: "This moderate-confidence profile is grounded in SMN/CONAGUA and INEGI Sierra de Tapalpa context; slope exposure, forest-edge fire, and weekend-growth pressure need local checks.",
    citations: [
      { label: "SMN/CONAGUA climate data bank — Jalisco highland stations", kind: "smn", url: "https://www.gob.mx/smn/acciones-y-programas/banco-nacional-de-datos-climatologicos-del-smn" },
      { label: "INEGI digital map — Sierra de Tapalpa relief", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
      { label: "CONAFOR forest and fire context", kind: "other", url: "https://www.gob.mx/conafor" },
    ],
    deepSections: [
      { id: "tapalpa-pine-plateau", title: "A cool pine plateau above warm Jalisco", paragraphs: ["Tapalpa sits on a pine-and-oak plateau in southern Jalisco, about 2020 m up. The road from the Sayula basin climbs roughly 700 m, and the air cools on the way up. Afternoons reach 23 to 29°C through the year and nights fall to 5 to 13°C, with light frost on some winter mornings.", "June to September brings about 670 mm of rain, four fifths of the annual total, and keeps the forest and the meadows green. Dirt roads turn to mud in those months. March to May is dry, and that is the season for forest fires."] },
      { id: "tapalpa-cabin-siting", title: "Cabin climate depends on exposure", paragraphs: ["A sunny clearing, a lot under pines and the open edge of the plateau are three different places to live. The clearing warms quickly on a winter morning. The shaded lot stays cold and damp. The plateau edge has the views and takes the wind.", "Visit once on a busy weekend and once midweek, because the town is a different size on each. Look for morning sun, ground that drains, shelter from the wind and a short drive to the shops in town."] },
    ],
  },
  "xilitla-mx": {
    climateChange: { outlook2050: "Warming; cloud base rises.", outlook2100: "Cloud-forest stress.", keyShifts: [{variable: "Cloud base", direction: "up"}], resilienceNote: "Cloud ecosystems vulnerable." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Xilitla station", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "morelia-mx": {
    climateChange: { outlook2050: "Warmer; more variable monsoon.", outlook2100: "Drying concern on dry-side flanks.", keyShifts: [{variable: "Rainfall variability", direction: "up"}], resilienceNote: "Elevation-based climate signature is geographically stable." },
    deepSections: [
      {
        id: "morelia-urban-highland-feel",
        title: "A state capital at 1920 m",
        paragraphs: [
          "Morelia is the capital of Michoacán and lies at about 1920 m in the Guayangareo valley. Hospitals, universities, an international airport, groceries and repair trades are all in the city, so the mild highland weather does not come with the long drives for services that smaller highland towns require.",
          "Which part of the city you are in matters. The historic center is built of pink cantera stone, with arcades and thick walls that stay cool through the afternoon. The newer districts on the edges have less shade and more pavement, are hotter in April and May, and depend on a car.",
        ],
      },
      {
        id: "morelia-rainy-season-rhythm",
        title: "Rainy-season rhythm and dry-season light",
        paragraphs: [
          "From November to March the days are dry and clear. Afternoons reach 25 to 29°C and mornings start at 4 to 7°C, so a jacket is needed early and the plazas are comfortable in the evening. April and May are the hottest months, with afternoons of 30 to 32°C before the rains begin.",
          "June to September brings about 530 mm of the year's 650 mm, mostly as afternoon and evening thunderstorms. The storms cool the valley, and afternoons drop back to about 28°C. They also flood low streets, slow traffic and find the leaks in old flat roofs. See how water drains from a street before choosing a house on it.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Morelia 1991–2020", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "guanajuato-mx": {
    climateChange: { outlook2050: "Warmer with stressed water.", outlook2100: "Drying pressure.", keyShifts: [{variable: "Water stress", direction: "up"}], resilienceNote: "Elevation protects temperature; water is the issue." },
    deepSections: [
      {
        id: "guanajuato-canyon-microclimate",
        title: "A city built in a ravine",
        paragraphs: [
          "Guanajuato fills a narrow ravine at about 2000 m. Houses climb both walls, the old riverbed runs underneath as a road tunnel, and most of the center is reached on foot by lanes and stairs. Slopes that face the sun warm early. The lanes at the bottom stay in shade and hold cool air into late morning.",
          "Afternoons average 23 to 30°C and nights 5 to 14°C. Where a house stands on the slope decides the rest: the steps to the nearest road, the winter sun and where storm water goes. The river was put underground after repeated floods, and downpours still send water down the lanes.",
        ],
      },
      {
        id: "guanajuato-services-and-mobility",
        title: "Stairs, tunnels and festival crowds",
        paragraphs: [
          "The University of Guanajuato and the state government keep the city busy all year, and there are hospitals, markets and theaters in the center. Getting around is the difficulty. Cars use the tunnels and a few through streets, parking is scarce, and many houses can only be reached by stairs.",
          "The Festival Internacional Cervantino fills the city for about three weeks each October. Larger shops, the city of León and the international airport at Silao are 30 to 60 minutes away by road. Before renting, carry groceries home on foot and walk the route once in the rain.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Guanajuato station", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "zacatecas-mx": {
    climateChange: { outlook2050: "Warmer; drought intensifying.", outlook2100: "Water-constrained.", keyShifts: [{variable: "Drought", direction: "up"}], resilienceNote: "Elevation buffers temperature; water is limiting." },
    deepSections: [
      {
        id: "zacatecas-cool-highland-feel",
        title: "The cool Mexican highland with real frost",
        paragraphs: [
          "Zacatecas is built in a ravine below the Cerro de la Bufa at about 2440 m. The height keeps it cool: summer afternoons average 23 to 26°C, the air is dry, and winter mornings are near 3°C, with frost on some nights. Houses are built of stone and most have no heating, so January feels colder indoors than the numbers suggest.",
          "The setting is open and windy. The hills around the city are dry grassland and scrub with nopal and few trees, and the wind is strongest in late winter and spring. The sun is strong all year at this height, and the dry air is hard on skin in the cool months.",
        ],
      },
      {
        id: "zacatecas-service-and-water",
        title: "A working city with a short water supply",
        paragraphs: [
          "Zacatecas and the adjoining city of Guadalupe form one urban area with universities, hospitals, supermarkets and museums. The old silver-mining center is a UNESCO World Heritage Site, with steep lanes and a cable car across the ravine to La Bufa. Daily errands are easier than the mining-town look suggests.",
          "Water is the constraint. The year brings about 410 mm of rain, three quarters of it from June to September, and the city draws on aquifers that are pumped faster than they refill. In some neighborhoods water arrives on a schedule. Ask how often it comes on a given street, and what storage the house has.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Zacatecas 1991–2020", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "saltillo-mx": {
    climateChange: { outlook2050: "Warmer; water stress.", outlook2100: "Drying.", keyShifts: [{variable: "Heat waves", direction: "up"}], resilienceNote: "Elevation buffer holds; water supply tight." },
    deepSections: [
      {
        id: "saltillo-monterrey-relief",
        title: "Cooler and drier than Monterrey, an hour away",
        paragraphs: [
          "Saltillo is about 85 km west of Monterrey and roughly 1000 m higher. The highway climbs through the Sierra Madre Oriental, and the air at the top is cooler and much drier. Summer afternoons average 29 to 30°C here against about 36°C in Monterrey, and nights fall to about 16°C.",
          "The city is bright, dry and often windy, with desert scrub on the hills around it. It is also the capital of Coahuila and a large car-manufacturing center, so it has hospitals, universities and steady work.",
        ],
      },
      {
        id: "saltillo-water-and-foothills",
        title: "Little rain, and a greener side toward Arteaga",
        paragraphs: [
          "The year's rain comes to only about 335 mm, mostly between June and September, and the city depends on groundwater. Gardens here are desert gardens, household water tanks are normal, and a long drought reaches the tap.",
          "The east side of the valley, toward Arteaga and the pine-covered sierra, is higher, cooler and greener. The north side, toward Ramos Arizpe and the car plants, is lower, flatter and hotter. A few times each winter a norther arrives, and nights can then fall below freezing.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Saltillo 1991–2020", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "cuauhtemoc-mx": {
    climateChange: { outlook2050: "Chill hours declining; heat stress rising.", outlook2100: "Apple viability pressure.", keyShifts: [{variable: "Chill hours", direction: "down"}], resilienceNote: "Water-supply is long-term pressure." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Cuauhtémoc station", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }, { label: "INIFAP orchard data", kind: "inecc", url: "https://www.gob.mx/inecc" }],
  },
  "real-catorce-mx": {
    climateChange: { outlook2050: "Warmer; water stress.", outlook2100: "Drying.", keyShifts: [{variable: "Water stress", direction: "up"}], resilienceNote: "Elevation provides some buffer." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Catorce station", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "la-paz-mx": {
    climateChange: { outlook2050: "Intensifying heat; stronger hurricanes.", outlook2100: "Habitability constrained in summer.", keyShifts: [{variable: "Heat", direction: "up"}, {variable: "Hurricane intensity", direction: "up"}], resilienceNote: "Winter climate stable; summer pressure mounting." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — La Paz 1991–2020", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "puerto-escondido-mx": {
    climateChange: { outlook2050: "Warmer; stronger hurricanes; less predictable rainy season.", outlook2100: "Coastal stress.", keyShifts: [{variable: "Hurricane intensity", direction: "up"}, {variable: "Heat", direction: "up"}], resilienceNote: "Isothermal regime is stable; storm exposure is rising." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Puerto Escondido", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "merida-mx": {
    climateChange: { outlook2050: "Warmer; stronger hurricanes; rainfall volatility.", outlook2100: "Heat-stress on habitability.", keyShifts: [{variable: "Hurricane intensity", direction: "up"}, {variable: "Heat stress", direction: "up"}], resilienceNote: "Inland position gives some hurricane buffer; heat is the concern." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Mérida 1991–2020", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "bacalar-mx": {
    climateChange: { outlook2050: "Warmer; more hurricane stress.", outlook2100: "Lagoon salinization risk.", keyShifts: [{variable: "Hurricane intensity", direction: "up"}, {variable: "Sea level", direction: "up"}], resilienceNote: "Freshwater ecosystem is hurricane-vulnerable." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Chetumal (nearest station)", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "tequila-mx": {
    climateChange: { outlook2050: "Warmer; water-stressed summers.", outlook2100: "Agave cultivation range shifting.", keyShifts: [{variable: "Heat", direction: "up"}], resilienceNote: "Agave is drought-resilient; the cultural infrastructure is the asset." },
    deepSections: [
      {
        id: "tequila-agave-terroir",
        title: "Volcanic soil and blue agave",
        paragraphs: [
          "Tequila lies at about 1180 m on the north side of the Volcán de Tequila, an extinct volcano of roughly 2900 m. The slopes are red volcanic soil that drains fast. Blue agave suits them: about 700 mm of rain falls from June to September, the other eight months are dry and sunny, and frost is rare.",
          "Fields of spiky blue-grey plants run for kilometers around the town, and the agave landscape and its old distilleries were made a UNESCO World Heritage Site in 2006.",
        ],
      },
      {
        id: "tequila-tourism-and-heat-check",
        title: "Close to Guadalajara, hot before the rains",
        paragraphs: [
          "Guadalajara is about 60 km to the southeast, around an hour by road, and has the hospitals, airport and large shops that Tequila lacks. Day visitors come out from the city by bus and tourist train, and on weekends the streets near the distilleries are crowded and loud.",
          "Heat is the thing to check. April and May afternoons average 34 to 35°C under a clear sky, and the streets have little shade. From July to September afternoons are near 31°C. Storm runoff from the fields runs through town, so look at the drainage on any street away from the center.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Tequila station", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }, { label: "UNESCO agave landscape", kind: "other" }],
  },
  "mazamitla-mx": {
    climateChange: { outlook2050: "Warmer.", outlook2100: "Warmer.", keyShifts: [{variable: "Temperature", direction: "up"}], resilienceNote: "Elevation protects." },
    confidenceNotes: "This moderate-confidence profile is grounded in SMN/CONAGUA and INEGI Sierra del Tigre context; shade, access, and forest-fire exposure vary sharply between cabin pockets.",
    citations: [
      { label: "SMN/CONAGUA climate data bank — Jalisco highland stations", kind: "smn", url: "https://www.gob.mx/smn/acciones-y-programas/banco-nacional-de-datos-climatologicos-del-smn" },
      { label: "INEGI digital map — Sierra del Tigre relief", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
      { label: "CONAFOR forest and fire context", kind: "other", url: "https://www.gob.mx/conafor" },
    ],
    deepSections: [
      { id: "mazamitla-sierra-tigre-cool", title: "Sierra del Tigre coolness at a subtropical latitude", paragraphs: ["Mazamitla stands at about 2220 m in the Sierra del Tigre, south of Lake Chapala. The road up from the lake climbs roughly 700 m into pine and oak forest. Evenings call for a sweater in every month, and winter mornings are near 4°C.", "Height keeps the afternoons mild. The warmest month, May, averages 29°C, and by July, with the rains under way, afternoons are down to 24 to 25°C. About 730 mm falls from June to September, mostly in afternoon storms, and mist hangs in the pines afterwards."] },
      { id: "mazamitla-forest-cabin-tradeoffs", title: "Cabins in the pines: damp, fire and weekend traffic", paragraphs: ["The forest shade that keeps a cabin cool also keeps it damp. Lots under dense pines dry slowly in the rainy season, and mold and soft ground are common. March to May is dry, the pine litter is ready to burn, and fires in the sierra are a yearly risk.", "Most visitors come from Guadalajara, about two hours away. The town is crowded on weekends and holidays and quiet midweek. Check the access after heavy rain, whether the lot gets morning sun, and how far the trees stand from the walls."] },
    ],
  },
  "la-ventosa-mx": {
    climateChange: { outlook2050: "Stronger and more persistent gap-wind events as thermal gradients intensify.", outlook2100: "The wind regime is likely to strengthen; temperature rise continues.", keyShifts: [{ variable: "Gap-wind intensity", direction: "up" }, { variable: "Heat stress", direction: "up" }, { variable: "Dry-season drought", direction: "up" }], resilienceNote: "The wind is the resource and the hazard — wind energy expansion continues, structural/transport disruption will worsen." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — La Ventosa / Salina Cruz stations", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }, { label: "Academic: Chelton et al. on Tehuantepec wind jets", kind: "academic" }],
  },
  "creel-mx": {
    climateChange: { outlook2050: "Warmer; drier dry-season; fire regime shifting.", outlook2100: "Pine-oak belt migrating upslope; snow events rarer.", keyShifts: [{ variable: "Snow", direction: "down" }, { variable: "Fire weather", direction: "up" }, { variable: "Monsoon timing", direction: "mixed" }], resilienceNote: "The plateau is mountain-buffered but fire and water stress are rising." },
    confidenceNotes: "This moderate-confidence profile is reliable at microclimate-zone scale because SMN/CONAGUA normals, INEGI relief context, and atlas elevation reasoning agree; neighborhood water, slope, and storm exposure still need local checks.",
    deepSections: [
      {
        id: "creel-vertical-gradient",
        title: "The canyon drops into a different climate",
        paragraphs: [
          "Creel's defining feature is not just that it is high. It sits near a canyon system where the land falls into much warmer zones over short horizontal distance, making vertical climate change obvious in a single trip.",
          "That gradient is why plateau pine, cold nights, canyon fruit, and subtropical bottoms all belong to the same regional story.",
        ],
      },
      {
        id: "creel-dry-cold-air",
        title: "Dry cold and large day-night swing",
        paragraphs: [
          "The Sierra Tarahumara plateau holds clear, dry winter air. Nights can fall well below freezing while afternoons recover quickly in strong sun, so human comfort depends heavily on building insulation, solar exposure, and wind shelter.",
          "The same diurnal swing helps some fruit and staple crops, but it limits tender plants and surprises travelers expecting only warm Mexico.",
        ],
      },
      {
        id: "creel-fire-monsoon",
        title: "Monsoon relief, fire-season concern",
        paragraphs: [
          "Summer rains support pine-oak forest and Rarámuri agriculture, but the dry season can leave fuels receptive to fire. Climate change raises concern for longer dry spells, hotter fire weather, and shifting pine health.",
          "Forest, canyon, Rarámuri land use and fire risk all sit within a day's walk here, and no single weather station can stand for all of it.",
        ],
      },
    ],
    citations: [
      { label: "SMN — Creel station", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "INEGI — Sierra Tarahumara elevation and land context", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
      { label: "WorldClim 2.1 — Sierra Madre Occidental gridded climate", kind: "worldclim", url: "https://www.worldclim.org/" },
    ],
  },
  "ensenada-mx": {
    climateChange: { outlook2050: "Hotter summers; winter rains more volatile; ocean upwelling intensity shifting.", outlook2100: "Fire regime intensifying; water supply the limiting factor for wine country.", keyShifts: [{ variable: "Summer heat", direction: "up" }, { variable: "Drought", direction: "up" }, { variable: "Fire weather", direction: "up" }], resilienceNote: "Water is the binding constraint; upwelling-driven moderation may weaken with Pacific changes." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Ensenada / El Ciprés", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }, { label: "INIFAP — Valle de Guadalupe viticulture studies", kind: "academic" }],
  },
  "xalapa-mx": {
    climateChange: { outlook2050: "Cloud-forest band shifting upslope as the lifting condensation level rises; some loss of the characteristic mist regime.", outlook2100: "Significant biogeographic displacement possible — Xalapa may become drier and more subtropical.", keyShifts: [{ variable: "Fog frequency", direction: "down" }, { variable: "Upslope shift of cloud-forest", direction: "up" }, { variable: "Extreme rainfall", direction: "up" }], resilienceNote: "Cloud forests are among the ecosystems most threatened by warming; protecting the gradient is critical." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Xalapa station 1991–2020", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }, { label: "INECOL — Cloud forest ecology research", kind: "academic" }],
  },
  "san-miguel-de-allende-mx": {
    climateChange: { outlook2050: "Hotter pre-monsoon season and higher evapotranspiration; summer rainfall timing becoming less reliable.", outlook2100: "Semiarid pressure increases; warm nights become more frequent in built-up zones.", keyShifts: [{ variable: "Pre-monsoon heat", direction: "up" }, { variable: "Rainfall reliability", direction: "down" }, { variable: "Urban heat", direction: "up" }], resilienceNote: "Altitude remains protective for daytime comfort; water availability is the primary long-run constraint." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "WeatherSpark — San Miguel de Allende climate profile", kind: "oss-data", url: "https://weatherspark.com/y/4978/Average-Weather-in-San-Miguel-de-Allende-Mexico-Year-Round" },
      { label: "SMN / CONAGUA station network (Guanajuato highlands)", kind: "smn", url: "https://smn.conagua.gob.mx/" },
    ],
  },
  "cuatrocienegas-mx": {
    climateChange: { outlook2050: "Hotter warm season and higher evaporative stress; groundwater pressure expected to increase.", outlook2100: "Oasis persistence depends heavily on aquifer governance under warming and extraction.", keyShifts: [{ variable: "Heat stress", direction: "up" }, { variable: "Aquifer pressure", direction: "up" }, { variable: "Wetland permanence", direction: "down" }], resilienceNote: "The climate signal matters, but water management is the decisive variable for ecosystem survival." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "ResearchGate summary — Climate of Cuatro Ciénegas Basin", kind: "academic", url: "https://www.researchgate.net/publication/325428359_The_Climate_of_Cuatro_Cienegas_Basin_Drivers_and_Temporal_Patterns" },
      { label: "Ramsar profile — Área de Protección de Flora y Fauna Cuatrociénegas", kind: "other", url: "https://rsis.ramsar.org/" },
    ],
  },
  "parras-de-la-fuente-mx": {
    climateChange: { outlook2050: "Higher heat load during ripening and more variable precipitation.", outlook2100: "Heat and water stress likely push harvest timing earlier and increase irrigation demand.", keyShifts: [{ variable: "Heat extremes", direction: "up" }, { variable: "Irrigation demand", direction: "up" }, { variable: "Harvest timing", direction: "down" }], resilienceNote: "Viticulture remains viable but increasingly management-intensive under hotter summers." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "Wikipedia — Parras (historic viticulture context)", kind: "other", url: "https://en.wikipedia.org/wiki/Parras" },
      { label: "Wine-Searcher — Parras Valley regional profile", kind: "oss-data", url: "https://www.wine-searcher.com/regions-parras+valley" },
    ],
  },
  "toluca-mx": {
    climateChange: { outlook2050: "Warming moderated by elevation; frost nights decreasing; summer afternoon highs rising 1–2°C.", outlook2100: "Valley may lose its frost character; basin-inversion pollution events may change character.", keyShifts: [{ variable: "Frost nights", direction: "down" }, { variable: "Urban heat + pollution", direction: "up" }, { variable: "Monsoon intensity", direction: "up" }], resilienceNote: "Elevation is a buffer; the basin pollution problem is the most immediate risk." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Toluca observatory 1991–2020", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "monterrey-mx": {
    climateChange: { outlook2050: "More heat-wave days; variable monsoon.", outlook2100: "Water stress dominates regional planning.", keyShifts: [{ variable: "Urban heat", direction: "up" }], resilienceNote: "Sierra reservoirs buffer but compete with growth." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Monterrey / INEGI climate summaries", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "hermosillo-mx": {
    climateChange: { outlook2050: "More extreme heat days.", outlook2100: "Water availability for agriculture tightens.", keyShifts: [{ variable: "Heat extremes", direction: "up" }], resilienceNote: "Colorado River-linked policy debates ripple culturally." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Hermosillo", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "puerto-vallarta-mx": {
    climateChange: { outlook2050: "Stronger hurricane rain rates; coral bleaching stress.", outlook2100: "Coastal tourism infrastructure at surge risk.", keyShifts: [{ variable: "Hurricane intensity", direction: "up" }], resilienceNote: "Tourism economy is storm-exposed." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Puerto Vallarta", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "mazatlan-mx": {
    climateChange: { outlook2050: "Wet-season intensification.", outlook2100: "Coastal squeeze from tourism and storms.", keyShifts: [{ variable: "Extreme rain", direction: "up" }], resilienceNote: "Beach nourishment cycles ongoing." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Mazatlán", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "campeche-mx": {
    climateChange: { outlook2050: "Heavier hurricane rain rates.", outlook2100: "Coastal mangrove squeeze.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Historic core elevation modest; drainage is key." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Campeche", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "palenque-mx": {
    climateChange: { outlook2050: "Shifts in cloud timing affect ecotourism.", outlook2100: "Species migration upslope.", keyShifts: [{ variable: "Heavy rain", direction: "up" }], resilienceNote: "Jaguar reserve connectivity matters ecologically." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Palenque", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }, { label: "INECC — Chiapas biodiversity notes", kind: "inecc", url: "https://www.gob.mx/inecc" }],
  },
  "taxco-mx": {
    climateChange: { outlook2050: "Shifts in monsoon onset.", outlook2100: "Water for hillside barrios stressed.", keyShifts: [{ variable: "Landslide risk", direction: "up" }], resilienceNote: "Steep terrain amplifies storm impacts." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Taxco region", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "puebla-mx": {
    climateChange: { outlook2050: "Air quality and heat stress in basin.", outlook2100: "Glacier loss on volcanoes symbolic of change.", keyShifts: [{ variable: "Ozone", direction: "up" }], resilienceNote: "Inversion trapping worsens particulates." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "SMN — Puebla", kind: "smn", url: "https://smn.conagua.gob.mx/es/" }],
  },
  "ajijic-lake-chapala-mx": {
    climateChange: { outlook2050: "Warmer dry seasons and higher lake-management stress.", outlook2100: "Comfort advantage persists but water quality and watershed pressure dominate.", keyShifts: [{ variable: "Dry-season heat", direction: "up" }, { variable: "Lake stress", direction: "up" }], resilienceNote: "Elevation and lake moderation help human comfort; watershed health is the binding constraint." },
    confidenceNotes: "Ajijic itself is lake- and slope-specific; normals rely on Chapala/Guadalajara regional station context plus gridded climate and terrain sources.",
    deepSections: [
      {
        id: "ajijic-lake-moderation",
        title: "Lake Chapala as a thermal flywheel",
        paragraphs: [
          "Lake Chapala is large enough to matter at daily scale. It softens nighttime cold, limits some dry-season heat at the shore, and helps organize local breezes against the north-shore slopes.",
          "The moderation is strongest near the water and weakens into surrounding hills and urbanized corridors, so neighborhood selection can change the lived climate more than the regional average suggests.",
        ],
      },
      {
        id: "ajijic-expat-comfort",
        title: "Why so many people retire here",
        paragraphs: [
          "Ajijic is on the north shore of Lake Chapala at about 1530 m. Afternoons run from 25°C in January to 32°C in May and nights from 8 to 16°C, so most houses have neither heating nor air conditioning. The village can be covered on foot, and the rains from June to September turn the hills behind it green.",
          "Foreign retirees have settled here since the mid-twentieth century, and the place is well known. That has brought traffic on the one lakeshore road, higher rents and pressure on local services.",
        ],
      },
      {
        id: "ajijic-watershed-risk",
        title: "The lake is also the risk",
        paragraphs: [
          "Lake health, wastewater, algal blooms, and watershed demand are not side issues; they are the core long-term resilience question for the Chapala basin.",
          "Before buying, check the water source, the drainage, the shade and the slope above the lot. The lake's level has swung widely, and in the early 2000s the shore lay far out from the village.",
        ],
      },
    ],
    citations: [
      { label: "SMN — Jalisco normals and Chapala regional context", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "INEGI digital map — Lake Chapala basin and relief", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
      { label: "WorldClim 2.1 — Chapala highland gridded climate", kind: "worldclim", url: "https://www.worldclim.org/" },
    ],
  },
  "queretaro-mx": {
    climateChange: { outlook2050: "More heat stress and water pressure in a rapidly growing metro.", outlook2100: "Urban heat and supply constraints dominate comfort more than the regional climate envelope.", keyShifts: [{ variable: "Urban heat", direction: "up" }, { variable: "Water stress", direction: "up" }], resilienceNote: "Elevation helps, but growth management decides lived resilience." },
    deepSections: [
      {
        id: "queretaro-service-ease",
        title: "A dry highland city with everything close",
        paragraphs: [
          "Querétaro lies at about 1820 m on the dry northern side of the central highlands. Afternoons run from 23°C in winter to 30°C in May, nights from 6 to 14°C, and only about 480 mm of rain falls in a year. It is drier and browner than Morelia or the Jalisco highlands, and for eight months the sky is mostly clear.",
          "The city is one of Mexico's main manufacturing centers, with aerospace and car plants, universities, large hospitals and an international airport. Mexico City is about 200 km away by highway. Everyday services are closer here than in the smaller highland towns.",
        ],
      },
      {
        id: "queretaro-growth-water-heat",
        title: "Fast growth, less shade, short water",
        paragraphs: [
          "The city has grown quickly since the 1990s. The historic center has narrow streets, stone buildings and plazas with trees. The newer districts to the north, around Juriquilla, and along the industrial corridors have wide roads and little shade, are hotter in the afternoon and need a car.",
          "Water limits that growth. The local aquifer is overdrawn, and since 2011 much of the city's supply has come through the Acueducto II from springs more than 100 km away. Ask about water service and pressure in any neighborhood.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — city-scale climate is well supported; neighborhood heat and flood exposure vary strongly.",
    citations: [
      { label: "SMN — Querétaro normals", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "INEGI digital map — Querétaro basin relief and urban context", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
    ],
  },
  "durango-mx": {
    climateChange: { outlook2050: "Higher dry-season heat and more variable monsoon timing.", outlook2100: "Water storage and forest-fire pressure become central.", keyShifts: [{ variable: "Dry-season heat", direction: "up" }, { variable: "Monsoon timing", direction: "mixed" }], resilienceNote: "Elevation is a buffer, but water volatility is material." },
    confidenceNotes: "Tier C entry — city station context is useful, but Sierra-side gradients around Durango are stronger than one urban normal can show.",
    citations: [
      { label: "SMN — Durango normals", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "WorldClim 2.1 — Durango highland gridded climate", kind: "worldclim", url: "https://www.worldclim.org/" },
    ],
  },
  "orizaba-mx": {
    climateChange: { outlook2050: "Cloud-base and rainfall timing shifts affect coffee and slope stability.", outlook2100: "Cloud-forest bands move upslope while heavy-rain risk increases.", keyShifts: [{ variable: "Cloud base", direction: "up" }, { variable: "Heavy rain", direction: "up" }], resilienceNote: "Moisture buffers heat but increases landslide and infrastructure diligence." },
    confidenceNotes: "Tier C entry — windward mountain gradients are strong; use the numbers as conservative regional guidance rather than parcel-grade normals.",
    citations: [
      { label: "SMN — Orizaba and Veracruz highland normals", kind: "smn", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
      { label: "INEGI digital map — Pico de Orizaba relief context", kind: "inegi", url: "https://www.inegi.org.mx/app/mapas/" },
    ],
  },
};
