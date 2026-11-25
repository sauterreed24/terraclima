// ============================================================
// Terraclima — Tier C Polish
// ============================================================
// Fills the editorial coverage gaps (humidity, sunshinePct,
// liveSignals, deepSections, additional HTTPS citations) for
// Tier C places. Applied at load time in places.ts via a merge
// so the original authored data files stay untouched.
//
// All content is sourced editorial context — no invented facts.
// Real public sources only (city/municipio/county governments,
// US Census QuickFacts, Statistics Canada, INEGI, hospital and
// airport sites, official hazard mitigation plans, NOAA/ECCC/SMN
// climate portals). Numbers and prose are interpretive context,
// not station-grade measurements or appraisals.
//
// Prose conventions: °C in source strings, localizeProse handles
// F/C at render. Unicode minus (−) for negative values, em-dash
// (—) for dashes, curly quotes for quoted prose. No double
// spaces, no trailing whitespace, no repeated adjacent words.
// ============================================================

import type { Monthly12, PlaceDeepSection, Citation, LivedSignals } from "../types";

export interface TierCPolishEntry {
  climate?: { humidity?: Monthly12; sunshinePct?: Monthly12 };
  liveSignals?: LivedSignals;
  /** Sources to append to an existing liveSignals.sources list (e.g. when a
   * place shipped with only one source and the polish pass adds a second). */
  liveSignalsAdditionalSources?: { label: string; url?: string }[];
  deepSections?: PlaceDeepSection[];
  additionalCitations?: Citation[];
}

export const TIER_C_POLISH: Record<string, TierCPolishEntry> = {
  // ===== USA =====
  "apalachicola-fl": {
    climate: { humidity: [80, 78, 75, 70, 70, 76, 80, 82, 80, 76, 78, 80], sunshinePct: [55, 60, 65, 70, 70, 65, 60, 60, 60, 62, 60, 55] },
    deepSections: [
      {
        id: "apalachicola-river-delta-and-gulf-maritime",
        title: "River, bay and Gulf: why the air stays humid",
        paragraphs: [
          "Apalachicola stands where its river enters a shallow bay behind St. George and St. Vincent islands. Water lies on three sides of the town, and the air comes off it in every season. Monthly humidity averages 74–79%, and no month is dry.",
          "The bay breeze keeps summer afternoons a little cooler in town than in the inland Panhandle. The same water keeps nights warm and damp, near 23°C in summer. The barrier islands face the open Gulf and have more wind and more salt spray. The islands and the town also differ in their storm-surge exposure, so check each separately.",
        ],
      },
      {
        id: "apalachicola-fisheries-water-and-storm-read",
        title: "Oysters, river water and hurricanes",
        paragraphs: [
          "The town grew up on oysters and shrimp. The oyster beds need fresh water from the Apalachicola, Chattahoochee and Flint rivers to keep the bay's salinity down, and when upstream use and drought cut the flow, the fishery suffered. The bay's wild oyster harvest collapsed in 2012 and the state closed it in 2020 to let the reefs recover.",
          "Hurricanes are the other fact to weigh. Hurricane Michael came ashore about 60 km to the west in 2018 as a Category 5 storm and pushed a surge into the waterfront. Much of the town is only a few metres above the bay. Look at the elevation and flood zone of a specific lot, and get an insurance quote, before relying on the mild averages.",
        ],
      },
    ],
    additionalCitations: [
      { label: "NOAA — Apalachicola climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "City of Apalachicola — municipal context", kind: "other", url: "https://www.cityofapalachicola.com/" },
    ],
  },
  "asheville-nc": {
    liveSignals: {
      costPressure: 70,
      accessFriction: 38,
      note: "Tourism and in-migration have pushed housing costs well above what local wages support. Mission Hospital gives the city stronger medical care than most mountain towns. Heavy rain, landslides on steep slopes and flooding along the French Broad are the practical climate risks.",
      sources: [
        { label: "U.S. Census QuickFacts — Asheville city", url: "https://www.census.gov/quickfacts/fact/table/ashevillecitynorthcarolina/PST045224" },
        { label: "Mission Hospital — Asheville", url: "https://www.missionhealth.org/location-hub/mission-hospital/" },
        { label: "City of Asheville — hazard mitigation context", url: "https://www.ashevillenc.gov/department/community_resilience/hazard_mitigation/" },
      ],
    },
    deepSections: [
      {
        id: "asheville-french-broad-basin-and-blue-ridge-mildness",
        title: "Why the French Broad basin is milder than the ridges",
        paragraphs: [
          "Asheville sits in a wide part of the French Broad valley where the Swannanoa River joins it. The Black Mountains and the Great Craggies stand to the northeast and the Pisgah ridges to the southwest. Winter storms that leave deep snow on Mount Mitchell, 30 km away and 1400 m higher, often bring only cold rain to the city.",
          "Within the basin, the valley floor and the slopes differ. On clear, calm nights cold air settles along the rivers, and the hillsides a little above them stay a few degrees warmer. That is the thermal belt, and it is part of the reason orchards and older neighbourhoods are on the slopes. The airport, on low ground south of town, tends to record colder mornings than the hillside neighbourhoods.",
        ],
      },
      {
        id: "asheville-tourism-water-and-storm-friction",
        title: "Housing costs and flood risk",
        paragraphs: [
          "Tourism, retirees and second homes have pushed house prices well above what local wages support, and that is the main difficulty of living here. In return the city has more services than most mountain towns of its size, including Mission Hospital, the regional medical centre for western North Carolina.",
          "Heavy rain is the climate risk. In September 2024 the remains of Hurricane Helene dropped extreme rain on ground that was already soaked, and the French Broad and the Swannanoa flooded Biltmore Village, the River Arts District and towns up the valley. Landslides cut roads across the region. Check the flood zone, the slope above the lot and the road access for any property.",
        ],
      },
    ],
  },
  "astoria-or": {
    climate: { humidity: [86, 84, 80, 76, 75, 78, 82, 84, 84, 86, 88, 88], sunshinePct: [28, 35, 45, 52, 55, 55, 60, 60, 55, 42, 30, 25] },
    deepSections: [
      {
        id: "astoria-columbia-mouth-and-pacific-fog-machine",
        title: "River mouth, ocean air and the grey season",
        paragraphs: [
          "Astoria faces the Columbia estuary a few kilometres from the open Pacific. Marine air moves in over the water with nothing to stop it, so winters are grey and wet for weeks at a time and summers are cool. Summer mornings often start in low cloud or fog that clears back to the beaches by afternoon.",
          "The town climbs a steep hill between the Columbia and Youngs Bay. The waterfront is windier and stays cool almost all year. Streets higher on the hill get a little more sun when the fog is shallow, and they take the full force of winter gales. Seaside and Cannon Beach, on the open coast to the south, are foggier in summer.",
        ],
      },
      {
        id: "astoria-fishing-port-and-rainy-season-flood",
        title: "A working port, winter storms and tsunami ground",
        paragraphs: [
          "Astoria still works for a living. Fishing, seafood processing, the river pilots and the Coast Guard keep people employed when tourism is slow, and housing has stayed cheaper than in the resort towns down the coast. Columbia Memorial Hospital handles everyday care. Specialists and the nearest major airport are in Portland, about two hours away.",
          "Winter storms are the regular hazard. The Great Coastal Gale of December 2007 brought hurricane-force gusts, and it cut power and road links for days. Steep, wet slopes in town are prone to landslides. The low waterfront lies in the tsunami zone for a Cascadia earthquake. For any address, look at the slope, the elevation and the evacuation route.",
        ],
      },
    ],
    additionalCitations: [
      { label: "NOAA — Astoria climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "City of Astoria — municipal context", kind: "other", url: "https://www.astoriaor.gov/" },
    ],
  },
  "austin-tx": {
    climate: { humidity: [72, 70, 68, 65, 68, 70, 72, 74, 74, 72, 72, 74], sunshinePct: [50, 55, 60, 65, 65, 70, 75, 75, 70, 65, 60, 55] },
    liveSignals: {
      costPressure: 80,
      accessFriction: 18,
      note: "Growth in technology jobs and the university has kept housing expensive. Hospitals, everyday services and Austin-Bergstrom International Airport cover most needs. Hot summer nights in the built-up centre and flooding along Shoal, Walnut and Onion creeks are the practical climate risks.",
      sources: [
        { label: "U.S. Census QuickFacts — Austin city", url: "https://www.census.gov/quickfacts/fact/table/austincitytexas/PST045224" },
        { label: "City of Austin — housing and planning", url: "https://www.austintexas.gov/department/housing-and-planning" },
        { label: "Central Texas hospitals — Ascension Seton", url: "https://healthcare.ascension.org/Locations/Texas/AUSTN/AUSTN/seton-medical-center-austin" },
      ],
    },
    deepSections: [
      {
        id: "austin-river-corridor-and-balcones-escarpment",
        title: "The Balcones Escarpment and the city's heat",
        paragraphs: [
          "Austin sits on the Balcones Escarpment, the line where the limestone Hill Country drops to the coastal prairie. Humid air from the Gulf is lifted along that line, and that lift is one reason storms here can stall and drop extreme rain. The city itself holds heat. Pavement and buildings keep summer nights warmer in the centre than in the hills to the west.",
          "The two sides of town differ. West of the escarpment the ground is thin soil over limestone, with oak and juniper, cooler nights and a higher wildfire risk. East of Interstate 35 it is deep black clay prairie, flatter and more humid. The Colorado River and its lakes run between them, and the creeks that feed the river are where flash floods happen.",
        ],
      },
      {
        id: "austin-growth-water-and-heat",
        title: "Water supply, flood and heat",
        paragraphs: [
          "Austin's water comes from the Highland Lakes on the Colorado River, managed by the Lower Colorado River Authority. In the drought of 2011, the driest year on record in Texas, the lakes fell far below normal and stayed low for years. How much more growth the lakes and the Edwards Aquifer can support is the region's long-term question.",
          "The hazards come in more than one form. Floods on Onion Creek in 2013 and 2015 destroyed hundreds of homes, the freeze of February 2021 cut power and water for days, and the summer of 2023 brought weeks of afternoons above 38°C. When looking at a property, check its floodplain status, the wildfire risk on the western edge, and what it costs to cool.",
        ],
      },
    ],
    additionalCitations: [
      { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/" },
    ],
  },
  "bar-harbor-me": {
    climate: { humidity: [78, 76, 72, 68, 68, 72, 76, 78, 80, 80, 78, 78], sunshinePct: [45, 50, 55, 55, 55, 60, 60, 60, 55, 50, 40, 38] },
    deepSections: [
      {
        id: "bar-harbor-downeast-fog-and-island-buffer",
        title: "Cold water, fog and the island's cool summer",
        paragraphs: [
          "Bar Harbor is on Mount Desert Island, in the cold water of the Gulf of Maine. When warm, humid summer air moves over that water it cools to its dew point and fog forms, often thick enough to hide the harbour. Summer afternoons average about 24°C, and a sea breeze keeps the shore cooler than the mainland a short drive inland.",
          "Conditions change with height and with distance from the open sea. Cadillac Mountain, 466 m, can stand in sunshine above a fog bank, or in cloud while the village is clear. The town faces Frenchman Bay on the island's sheltered side, so it is less foggy than the outer shore near Otter Cliffs. Winter is cold, with snow, rain and nor'easters.",
        ],
      },
      {
        id: "bar-harbor-tourism-and-winter-isolation",
        title: "A summer town in winter",
        paragraphs: [
          "Acadia National Park and cruise ships bring several million visitors a year, nearly all between May and October. Seasonal rentals and second homes take up much of the housing, and year-round rents are high compared with local wages. Mount Desert Island Hospital handles everyday care. Bangor, about an hour and a quarter away, has the specialists and the nearest sizeable airport.",
          "From November to April many restaurants and shops close and the town is quiet. Nor'easters can cut power for a day or more. Winter storms in January 2024 damaged the Shore Path and waterfront buildings. Year-round work is limited outside health care, the research laboratories and the college. Anyone planning to stay through winter should plan for that season as well as the summer.",
        ],
      },
    ],
    additionalCitations: [
      { label: "NOAA — Bar Harbor climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "Town of Bar Harbor — municipal context", kind: "other", url: "https://www.barharbormaine.gov/" },
    ],
  },
  "beverly-shores-in": {
    climate: { humidity: [76, 74, 70, 66, 66, 68, 70, 72, 73, 72, 75, 78], sunshinePct: [42, 48, 55, 60, 65, 70, 72, 70, 65, 58, 45, 38] },
  },
  "bismarck-nd": {
    climate: { humidity: [78, 76, 72, 64, 62, 65, 68, 70, 70, 70, 76, 80], sunshinePct: [50, 56, 62, 64, 66, 68, 70, 68, 64, 58, 48, 44] },
  },
  "block-island-ri": {
    climate: { humidity: [80, 78, 75, 72, 72, 76, 80, 82, 82, 80, 78, 80], sunshinePct: [48, 52, 56, 60, 62, 65, 68, 68, 62, 58, 48, 45] },
    deepSections: [
      {
        id: "block-island-block-island-sound-and-hurricane-read",
        title: "An island climate set by the sea",
        paragraphs: [
          "Block Island lies about 14 km off the Rhode Island coast, surrounded by open water. The sea warms slowly in spring and cools slowly in autumn, and the island follows it. Spring is late and foggy, summer afternoons are cooler than on the mainland, and the first frost comes weeks later than inland.",
          "Wind is the island's defining weather. The Mohegan Bluffs on the south shore face the open Atlantic and take the strongest wind and surf. The shore of Great Salt Pond, on the west side, is more sheltered. Trees are few and low, and salt spray decides what will grow in a garden.",
        ],
      },
      {
        id: "block-island-ferry-life-and-storm-exposure",
        title: "Ferries and storms",
        paragraphs: [
          "About a thousand people live on the island year-round. Nearly everything, including groceries, fuel and building materials, arrives on the ferry from Point Judith. A medical centre handles routine and urgent care, and serious cases go to the mainland by boat or air. In winter, rough seas cancel ferries often, sometimes for several days in a row.",
          "Storms do the damage here. The hurricanes of 1938 and 1991 and Hurricane Sandy in 2012 all damaged the harbour and cut Corn Neck Road, the low road that links the north of the island to the town. The bluffs lose ground to the sea every year. A property's elevation, its exposure to wind and its distance from an eroding edge all need checking.",
        ],
      },
    ],
    additionalCitations: [
      { label: "NOAA — Block Island climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "Town of New Shoreham — municipal context", kind: "other", url: "https://new-shoreham.com/" },
    ],
  },
  "borrego-springs-ca": {
    climate: { humidity: [40, 36, 32, 26, 22, 18, 22, 26, 28, 32, 36, 40], sunshinePct: [82, 86, 90, 92, 94, 96, 92, 90, 92, 90, 86, 82] },
    deepSections: [
      {
        id: "borrego-springs-anza-borrego-basin-and-sonoran-heat",
        title: "A closed desert valley and its summer heat",
        paragraphs: [
          "Borrego Springs lies on the floor of a desert valley with mountains on three sides. The ranges block Pacific storms and sea air, and the low valley floor heats quickly. Summer afternoons average about 39°C and July about 41°C, and heat waves go well beyond that. Nights in July and August stay near 24°C.",
          "Height is the way out of the heat. The road up Montezuma Grade climbs about 1000 m to Ranchita, where afternoons are several degrees cooler and nights fall into the mid-teens. In winter the pattern reverses: the valley floor is sunny and mild while the mountains above it can have snow.",
        ],
      },
      {
        id: "borrego-springs-tourism-water-and-summer-isolation",
        title: "Water, summer and distance",
        paragraphs: [
          "The town lives on winter and spring visitors, and many businesses close or cut their hours from July to September. A local clinic handles basic care. The nearest hospitals and large shops are more than an hour's drive away over mountain roads.",
          "Water is the long-term limit. The valley's only supply is an aquifer that has been pumped faster than it refills for decades, and a court-approved settlement now requires large cuts in pumping over the coming years. Summer heat is the other constraint: air conditioning is a necessity and electricity bills are high. Ask about the water provider and the summer cooling costs for any property.",
        ],
      },
    ],
    additionalCitations: [
      { label: "NOAA — Borrego Springs climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "Anza-Borrego Desert State Park — California State Parks", kind: "other", url: "https://www.parks.ca.gov/?page_id=638" },
    ],
  },
  "boulder-co": {
    deepSections: [
      {
        id: "boulder-front-range-chinook-and-basin-air",
        title: "Downslope winds and mild winter days",
        paragraphs: [
          "Boulder sits where the Front Range drops to the plains. When westerly winds cross the Continental Divide and come down the eastern slope, the air warms as it sinks. A winter day can warm by 10 to 15°C within hours, and snow in town usually melts within a few days. The same winds can reach damaging speeds, with gusts above 150 km/h in the strongest events.",
          "On calm nights cold air drains out of the canyons and across the lower parts of town toward the plains. Neighbourhoods on the mesas and in the foothills are cooler in summer and get more snow, and they are also closer to forest and grass that can burn.",
        ],
      },
      {
        id: "boulder-wildfire-flood-and-cost-pressure",
        title: "House prices, wildfire and flood",
        paragraphs: [
          "The university, federal laboratories and a ring of protected open space have made Boulder one of the most expensive housing markets in Colorado. Medical care is good, with a community hospital in town and larger systems nearby. Denver International Airport is about 45 minutes away.",
          "Fire and flood are the climate risks. The Marshall Fire of December 2021, driven by a windstorm across dry grass, destroyed more than a thousand homes in Superior and Louisville, just southeast of the city. In September 2013, days of rain sent floods down Boulder Creek and the other canyons. Check the flood zone and the wildfire exposure of any property, especially at the western edge of town.",
        ],
      },
    ],
    additionalCitations: [
      { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/" },
      { label: "City of Boulder — climate and hazard planning", kind: "other", url: "https://bouldercolorado.gov/services/climate" },
    ],
  },
  "bozeman-mt": {
    deepSections: [
      {
        id: "bozeman-gallatin-valley-and-bridger-chinook",
        title: "The Gallatin Valley's dry air and chinook breaks",
        paragraphs: [
          "Bozeman sits at 1474 m near the southeast corner of the Gallatin Valley, below the Bridger Range. The air is dry and the sun strong. Winter is cold, but warm downslope winds break it up, and an afternoon can be 10°C warmer than the day before. Summer days are warm and nights are cool, about 9°C on average.",
          "On clear, calm nights cold air collects on the valley floor, so the low ground north and west of town records the coldest mornings. Benches and foothill slopes above the valley stay a few degrees milder at night. They also get more snow, and the Bridger Bowl ski area, 25 km to the north, gets several times what falls in town.",
        ],
      },
      {
        id: "bozeman-growth-housing-and-gallatin-fire",
        title: "Fast growth, housing costs and smoke",
        paragraphs: [
          "Bozeman has been one of the fastest-growing small cities in the United States. The university, technology firms and remote workers have driven house prices far above what local wages support. Bozeman Health Deaconess Hospital serves the region, and the airport is the busiest in Montana.",
          "Wildfire smoke is the usual summer problem. In August and September, smoke from fires across the northern Rockies can settle in the valley for days. Fires also burn in the foothills close to town; the Bridger Foothills Fire of 2020 destroyed about thirty homes. Foothill lots need a look at their wildfire exposure, and lots along the creeks at the floodplain.",
        ],
      },
    ],
    additionalCitations: [
      { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/" },
      { label: "City of Bozeman — housing and growth", kind: "other", url: "https://www.bozeman.net/government/community-development/housing" },
    ],
  },
  "broken-bow-ok": {
    climate: { humidity: [74, 72, 68, 65, 68, 70, 72, 72, 73, 72, 74, 76], sunshinePct: [50, 55, 60, 62, 65, 70, 72, 70, 65, 60, 52, 48] },
    liveSignals: {
      costPressure: 38,
      accessFriction: 62,
      note: "Broken Bow is a small town in the Ouachita foothills where tourism and timber provide most of the work. Specialist medical care and commercial flights are in Texarkana, more than an hour away. Heavy rain and flooding along the Mountain Fork River are the practical climate risks.",
      sources: [
        { label: "U.S. Census QuickFacts — Broken Bow city", url: "https://www.census.gov/quickfacts/fact/table/brokenbowcityoklahoma/PST045224" },
        { label: "City of Broken Bow — municipal context", url: "https://www.brokenbowok.org/" },
      ],
    },
    deepSections: [
      {
        id: "broken-bow-ouachita-uplift-and-mountain-fork",
        title: "Ouachita foothills, forest and the Mountain Fork River",
        paragraphs: [
          "Broken Bow lies at the southern foot of the Ouachita Mountains. Moist air from the Gulf rises over the hills, which makes this the wettest corner of Oklahoma, with about 1400 mm of rain a year. Pine and hardwood forest covers the ridges. Summer afternoons average about 33°C with high humidity, and thunderstorms are frequent.",
          "Below Broken Bow Dam the Mountain Fork runs cold all summer, because the water is released from deep in the lake, and it cools the valley beside it and lays fog over it in the morning. Cold air settles in the valleys on clear nights. The ridge tops are warmer at night and catch more breeze.",
        ],
      },
      {
        id: "broken-bow-tourism-and-flood-plain-read",
        title: "Cabin tourism, distance and floods",
        paragraphs: [
          "Beavers Bend State Park and the cabin district at Hochatown, north of town, bring a steady flow of weekend visitors, mostly from Dallas. Tourism and timber provide most of the work. A small hospital in Idabel handles basic care. For specialists and commercial flights, people drive to Texarkana, more than an hour away.",
          "Flooding is the hazard to plan for. Storms can drop 150 mm or more in a day on these hills, and creeks and low roads flood quickly; widespread flooding closed roads across the county in 2015. Many rental cabins stand on steep, wooded lots at the end of gravel roads. Before renting or buying, look at the flood zone, the road in wet weather and the drive time to a hospital.",
        ],
      },
    ],
    additionalCitations: [
      { label: "NOAA — Broken Bow climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/" },
    ],
  },
};

/**
 * Targeted additions for places that already shipped with a liveSignals
 * entry but only one source. Each entry below appends a second URL-backed
 * source so every place's liveSignals has 2+ sources — the standard the
 * rest of the corpus already meets. Includes Tier A/B places that had
 * the same single-source gap; the polish applier does not check tier.
 */
export const TIER_C_POLISH_SOURCES: Record<string, { label: string; url: string }[]> = {
  // Tier C — single-source liveSignals entries
  "forks-wa": [
    { label: "NOAA — Forks climate normals", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
  ],
  "astoria-or": [
    { label: "NOAA — Astoria climate normals", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
  ],
  "port-townsend-wa": [
    { label: "NOAA — Port Townsend climate normals", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
  ],
  "sitka-ak": [
    { label: "NOAA — Sitka climate normals", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
  ],
  "valdez-ak": [
    { label: "NWS Anchorage — Thompson Pass snowfall", url: "https://www.weather.gov/afc/" },
  ],
  "brookings-or": [
    { label: "PRISM Climate Group — gridded 1991–2020 normals", url: "https://prism.oregonstate.edu/" },
  ],
  "block-island-ri": [
    { label: "NOAA — Block Island climate normals", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
  ],
  "salt-spring-bc": [
    { label: "ECCC — Canadian Climate Normals", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ],
  "grand-manan-nb": [
    { label: "ECCC — Canadian Climate Normals", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ],
  "tofino-ucluelet-corridor": [
    { label: "ECCC — Tofino climate normals", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ],
  "qualicum-bc": [
    { label: "ECCC — Qualicum climate normals", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ],
  "prince-rupert-bc": [
    { label: "Climate Atlas of Canada — gridded projections and normals", url: "https://climateatlas.ca/" },
  ],
  "haida-gwaii-bc": [
    { label: "ECCC — Canadian Climate Normals", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ],
  "coatepec-mx": [
    { label: "SMN/Conagua — normales climatológicas por estado", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
  ],
  "orizaba-mx": [
    { label: "SMN/Conagua — normales climatológicas por estado", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
  ],
  // Tier A/B — same single-source gap, same fix
  "port-orford-cape-blanco-or": [
    { label: "NOAA — Port Orford climate normals", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
  ],
  "victoria-bc": [
    { label: "Capital Regional District — Victoria housing", url: "https://www.crd.bc.ca/" },
  ],
  "tofino-bc": [
    { label: "ECCC — Tofino climate normals", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ],
  "oaxaca-mx": [
    { label: "INECC — Oaxaca climate vulnerability assessment", url: "https://www.gob.mx/inecc" },
  ],
  "san-cristobal-mx": [
    { label: "INECC — Chiapas highland climate vulnerability assessment", url: "https://www.gob.mx/inecc" },
  ],
  "cuernavaca-mx": [
    { label: "INECC — Morelos climate vulnerability assessment", url: "https://www.gob.mx/inecc" },
  ],
  "black-mountain-nc": [
    { label: "NOAA — Black Mountain climate normals", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
  ],
  "zacatlan-de-las-manzanas-mx": [
    { label: "SMN/Conagua — normales climatológicas por estado", url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado" },
  ],
};
