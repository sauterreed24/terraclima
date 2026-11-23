// ============================================================
// Terraclima — Curated Collections
// Sets of places that share a climate mechanism or a region.
// Source text is metric; the app converts at render time.
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
    subtitle: "The dry, sunny side of a wet mountain range",
    description: "Towns in the lee of the Olympics, the Cascades, the Coast Mountains and the Sierra Nevada, where the storms have already dropped their rain on the far slope. Sequim gets about 430 mm of rain a year; the Hoh valley, 65 km away across the Olympics, gets about 4000 mm. Sixteen of these 25 places get under 500 mm. Expect more sun and drier air than the region is known for. The costs are summer drought, irrigation and, inland, wildfire smoke.",
    tone: "ochre",
    placeIds: ["sequim-wa", "port-townsend-wa", "osoyoos-bc", "bishop-ca", "victoria-bc", "hood-river-or", "hood-river-gorge", "ashland-or", "sunshine-coast-bc", "salt-spring-bc", "summerland-bc", "wenatchee-wa", "ellensburg-wa", "kamloops-bc", "qualicum-bc", "whitehorse-yt", "medford-or", "winthrop-wa", "leavenworth-wa", "lone-pine-ca", "kelowna-bc", "page-az", "friday-harbor-wa", "palm-springs-ca", "spokane-wa"],
  },
  {
    id: "sky-islands",
    title: "Sky-Island Refuges",
    subtitle: "Cool, forested high ground above hot lowlands",
    description: "Isolated mountains and plateaus that stand 1,000 m or more above the country around them and are cooler and wetter for it. Most are in the desert Southwest and northern Mexico, where pine and oak grow within sight of cactus flats. Cypress Hills above the Saskatchewan prairie and Mount Washington above the New England forest are the same idea in other settings. They offer summer relief within a short drive of hot basins, and real winter at the top.",
    tone: "sage",
    placeIds: ["portal-az", "silver-city-nm", "creel-mx", "flagstaff-az", "santa-fe-nm", "fort-davis-tx", "cloudcroft-nm", "cypress-hills-sk", "real-catorce-mx", "mount-washington-nh", "mount-charleston-nv"],
  },
  {
    id: "cold-air-pools",
    title: "Cold-Air Pools & Inversion Basins",
    subtitle: "Valley floors that run colder than the slopes above them",
    description: "Basins and high valleys where cold air drains off the slopes on clear, calm nights and settles on the floor. Winter nights average −19°C in Gunnison and −18°C in Stanley, far colder than their latitude suggests, and in midwinter an inversion can hold fog and smoke in the valley for days. Summer brings the other half of the pattern: warm afternoons, and nights 18–23°C cooler in the dry western basins. Useful if you want cold, reliable winters, and a warning if you garden.",
    tone: "ice",
    placeIds: ["gunnison-co", "logan-ut", "canaan-valley-wv", "missoula-mt", "truckee-ca", "crested-butte-co", "stanley-id", "fairbanks-ak", "international-falls-mn", "winthrop-wa", "morgantown-wv", "burkes-garden-va"],
  },
  {
    id: "eternal-spring",
    title: "Eternal-Spring Highlands",
    subtitle: "Tropical latitude, cooled by altitude",
    description: "Mexican highland towns between about 1200 and 2700 m. Altitude takes the heat out of a tropical latitude, so winter afternoons run 19–29°C and the warmest and coldest months are only 4–8°C apart. The seasons are wet and dry: most rain falls June to September, and the hottest weather comes in April and May, just before it, with afternoons of 25–33°C. Winter nights are cool, 2–11°C, and few houses are heated.",
    tone: "sage",
    placeIds: ["oaxaca-mx", "cuernavaca-mx", "san-cristobal-mx", "patzcuaro-mx", "ajijic-lake-chapala-mx", "san-miguel-de-allende-mx", "queretaro-mx", "orizaba-mx", "tapalpa-mx", "mazamitla-mx", "morelia-mx", "guanajuato-mx", "zacatecas-mx", "toluca-mx", "taxco-mx", "puebla-mx"],
  },
  {
    id: "cool-summer-maritimes",
    title: "Cool-Summer Maritimes",
    subtitle: "Coasts where the sea keeps summer cool",
    description: "Shores of the Pacific, the North Atlantic, the Gulf of St. Lawrence and Lake Superior where cold water holds summer down. At most of these places summer afternoons average 16–23°C, and at Prince Rupert and Sitka only 16°C. A few at the warm end, such as Cape May and Burlington, reach 26–29°C but stay cooler than the country inland. These are the places to look at if you want to get away from heat. Fog, wind and a short swimming season come with them.",
    tone: "glacier",
    placeIds: ["monterey-ca", "santa-cruz-felton-ca", "tofino-bc", "victoria-bc", "grand-marais-mn", "grand-manan-nb", "baie-saint-paul-qc", "eureka-ca", "point-reyes-ca", "astoria-or", "forks-wa", "prince-rupert-bc", "tofino-ucluelet-corridor", "gaspe-qc", "st-johns-nl", "cannon-beach-or", "sitka-ak", "twillingate-nl", "ensenada-mx", "duluth-mn", "bar-harbor-me", "halifax-ns", "charlottetown-pei", "squamish-bc", "friday-harbor-wa", "brookings-or", "burlington-vt", "block-island-ri", "cape-may-nj"],
  },
  {
    id: "orchard-valleys",
    title: "Fruit & Orchard Valleys",
    subtitle: "Where apples, cherries, peaches and grapes ripen",
    description: "Valleys and lakeshores where commercial fruit growing shows what the local climate can do. A lake delays spring frost in Traverse City and Niagara. A rain shadow gives the Okanagan and Wenatchee dry, sunny summers. Sloping ground lets cold air drain away from the trees at Hood River. Worth reading if you garden or farm, since each one shows how terrain makes a growing season.",
    tone: "ochre",
    placeIds: ["hood-river-or", "osoyoos-bc", "traverse-city-mi", "niagara-on-the-lake", "wolfville-ns", "baie-saint-paul-qc", "morden-mb", "sutton-qc", "ashland-or", "summerland-bc", "creston-bc", "prince-edward-co-on", "wenatchee-wa", "penticton-bc", "leamington-on", "cuauhtemoc-mx", "medford-or", "kelowna-bc", "leavenworth-wa", "napa-ca"],
  },
  {
    id: "thermal-belts",
    title: "Thermal Belts & Frost Refuges",
    subtitle: "Slopes that stay above the valley frost",
    description: "Hillside towns that sit above the pool of cold air on the valley floor on clear nights. Spring frost ends earlier and autumn frost comes later than in the bottomland nearby, which is why orchards and old farmhouses are found on these slopes. The effect is local: it can change within a few hundred metres up or down the hill, so check the exact site.",
    tone: "ochre",
    placeIds: ["black-mountain-nc", "hood-river-or", "ashland-or", "sedona-az", "viroqua-wi", "gatlinburg-tn"],
  },
  {
    id: "chinook-country",
    title: "Chinook & Downslope Wind Corridors",
    subtitle: "Winter thaws on a warm mountain wind",
    description: "Towns east of the Rockies, the Cascades and the Black Hills, where air coming down off the mountains arrives warm and dry. Winter nights still average −4 to −15°C here. What differs is the breaks: a chinook can lift the temperature 20°C in a few hours and clear the snow in a day. The same winds are strong enough to close highways, and they dry out grass and timber in fire season.",
    tone: "ochre",
    placeIds: ["lethbridge-ab", "boulder-co", "cody-wy", "pincher-creek-ab", "bozeman-mt", "medicine-hat-ab", "banff-ab", "leavenworth-wa", "bismarck-nd", "spearfish-sd"],
  },
  {
    id: "gap-winds",
    title: "Gap & Gorge Wind Corridors",
    subtitle: "Where the wind funnels through the mountains",
    description: "Gorges, straits and passes that carry air from one side of a range to the other: the Columbia River Gorge, the Strait of Juan de Fuca, Crowsnest Pass, the Isthmus of Tehuantepec. Mount Washington is here for its exposed summit. The wind blows from the same quarter for days at a time, which is good for windsurfing and wind farms and hard on gardens, roofs and nerves.",
    tone: "glacier",
    placeIds: ["hood-river-gorge", "ellensburg-wa", "port-townsend-wa", "pincher-creek-ab", "mount-washington-nh", "la-ventosa-mx", "brookings-or", "squamish-bc", "chattanooga-tn"],
  },
  {
    id: "snowbelts",
    title: "Lake-Effect & Mountain Snowbelts",
    subtitle: "From 240 cm to more than 900 cm of snow a year",
    description: "Shores downwind of the Great Lakes and mountain slopes that face the storm track. Station records give Geneva-on-the-Lake about 240 cm of snow a year, Syracuse 380 cm, Houghton 550 cm, Redfield on the Tug Hill Plateau 700 cm and Valdez more than 900 cm. The snow is dependable, which is the attraction for skiers. Roofs, driveways and winter driving are the price.",
    tone: "glacier",
    placeIds: ["grand-marais-mi", "redfield-ny", "syracuse-ny", "marquette-mi", "houghton-mi", "revelstoke-bc", "mammoth-lakes-ca", "valdez-ak", "erie-pa", "duluth-mn", "geneva-on-the-lake-oh"],
  },
  {
    id: "hidden-gems",
    title: "Lesser-Known Local Climates",
    subtitle: "Distinctive climates in places few people shortlist",
    description: "Small towns and out-of-the-way districts with a strongly local climate and a low profile. Many are far from a large airport or a hospital, and that distance is part of why they are little known. Use this set to widen a search beyond the usual names, and read each profile's Cost and access section before going further.",
    tone: "sage",
    placeIds: ["portal-az", "silver-city-nm", "grand-marais-mn", "grand-manan-nb", "creel-mx", "baie-saint-paul-qc", "dawson-city-yt", "sutton-qc", "durango-mx", "orizaba-mx", "tapalpa-mx", "xilitla-mx", "alamos-mx", "salt-spring-bc", "sunshine-coast-bc", "creston-bc", "mazamitla-mx", "canaan-valley-wv", "fort-davis-tx", "cypress-hills-sk", "joseph-or", "real-catorce-mx", "parras-de-la-fuente-mx", "cuauhtemoc-mx", "redfield-ny", "houghton-mi", "viroqua-wi", "stanley-id", "twillingate-nl", "ely-mn", "xalapa-mx", "haida-gwaii-bc", "medicine-hat-ab", "winthrop-wa", "mount-charleston-nv", "burkes-garden-va"],
  },
  {
    id: "alpine-tundra",
    title: "High-Altitude Towns",
    subtitle: "Life between 1800 m and 3100 m",
    description: "Towns high enough for thin air and strong sun to shape daily life. Leadville, at 3094 m, has air pressure about 70% of that at sea level. In Colorado and the Sierra Nevada the frost-free season is only 74–105 days and winter nights average −8 to −20°C. The Mexican members are different: Toluca and Real de Catorce sit just as high but have mild winters and can go most of the year without frost. Mount Washington's summit is the one true alpine-tundra site.",
    tone: "ice",
    placeIds: ["leadville-co", "crested-butte-co", "mammoth-lakes-ca", "truckee-ca", "cloudcroft-nm", "real-catorce-mx", "toluca-mx", "mount-washington-nh", "creel-mx"],
  },
  {
    id: "cloud-forests",
    title: "Cloud Forests & Wet Mountain Slopes",
    subtitle: "Forests that take water from cloud as well as rain",
    description: "Wet slopes facing the wind, where cloud sits on the forest for much of the year. Every place here gets more than 1350 mm of rain a year and Hilo gets about 3500 mm. Xalapa, Coatepec and Orizaba are Mexican cloud-forest country. Highlands, Boone and Gatlinburg are in the wet southern Appalachians, where Highlands gets about 2300 mm. Hilo and Palenque are lowland rainforest, included for comparison. Expect green in every month, moss, mud and few fully clear days.",
    tone: "sage",
    placeIds: ["highlands-nc", "xilitla-mx", "coatepec-mx", "san-cristobal-mx", "orizaba-mx", "boone-nc", "xalapa-mx", "gatlinburg-tn", "palenque-mx", "hilo-hi"],
  },
  {
    id: "dry-air-comfort",
    title: "Low-Humidity Summers",
    subtitle: "Dry air and cool nights",
    description: "Places where summer air is dry enough for sweat to evaporate and for nights to cool off. Average summer humidity is 22–24% in Bishop, Lone Pine and Page, and across the set summer nights are 14–23°C cooler than the afternoons. Several are hot by day: Hermosillo and Borrego Springs average 39°C in summer. The Mexican members turn more humid when the rains arrive in July. Look here if humid heat is what you want to avoid.",
    tone: "glacier",
    placeIds: ["bishop-ca", "silver-city-nm", "santa-fe-nm", "flagstaff-az", "boulder-co", "creel-mx", "san-miguel-de-allende-mx", "queretaro-mx", "durango-mx", "taos-nm", "prescott-az", "borrego-springs-ca", "marfa-tx", "lubbock-tx", "page-az", "hermosillo-mx", "lone-pine-ca"],
  },
  {
    id: "monsoon-edges",
    title: "Monsoon-Edge Landscapes",
    subtitle: "Summer thunderstorms after a dry spring",
    description: "Places reached by the North American Monsoon. Between a third and three-quarters of the year's rain falls from July to September, most of it in afternoon thunderstorms. May and June are hot and dry, and the hills turn green within weeks of the first storms. Totals are modest, 170–820 mm of rain a year, and vary a good deal from one summer to the next.",
    tone: "sage",
    placeIds: ["silver-city-nm", "portal-az", "flagstaff-az", "alamos-mx", "santa-fe-nm", "fort-davis-tx", "marfa-tx", "cloudcroft-nm", "sedona-az", "durango-co", "durango-mx", "taos-nm", "page-az", "monterrey-mx", "hermosillo-mx", "puebla-mx", "tucson-az"],
  },
  {
    id: "hyper-maritime",
    title: "Hyper-Maritime Coasts",
    subtitle: "Outer coasts with little difference between seasons",
    description: "Exposed coasts and islands where the ocean sets the temperature all year. On the Pacific, from Eureka to Sitka, the warmest and coldest months are only 6–12°C apart and summer afternoons stay at 16–20°C. Grand Manan, Twillingate and Block Island on the Atlantic have colder winters but the same wind, fog and cool summers. Rain is heavy on the northern Pacific coast: Tofino gets about 3000 mm of rain a year.",
    tone: "glacier",
    placeIds: ["tofino-bc", "grand-manan-nb", "forks-wa", "eureka-ca", "prince-rupert-bc", "tofino-ucluelet-corridor", "astoria-or", "sitka-ak", "haida-gwaii-bc", "cannon-beach-or", "twillingate-nl", "brookings-or", "block-island-ri"],
  },
  {
    id: "subarctic",
    title: "Far North & Deep Winter",
    subtitle: "Long, severe winters and short, bright summers",
    description: "The coldest winters in the atlas. Winter nights average −17 to −28°C at ten of these eleven places; Anchorage, on Cook Inlet, is milder at about −11°C. Summers are short, with 86–148 frost-free days, and afternoons of about 20°C in the interior and 10–16°C on the Arctic, Bering and Hudson Bay coasts. Ely and Thunder Bay stand in for the same winter farther south. Daylight runs to extremes in both directions north of 60°.",
    tone: "ice",
    placeIds: ["whitehorse-yt", "dawson-city-yt", "yellowknife-nt", "churchill-mb", "thunder-bay-on", "fairbanks-ak", "nome-ak", "iqaluit-nu", "inuvik-nt", "ely-mn", "anchorage-ak"],
  },
  {
    id: "desert-oases",
    title: "Desert Oases",
    subtitle: "Desert towns that depend on a spring, a river or an aquifer",
    description: "Settlements in very dry country that exist because of a dependable water source: the springs at Parras and Furnace Creek, the Colorado River at Yuma and Moab, groundwater at Borrego Springs and La Paz. Rain totals 54–400 mm a year and summer afternoons average 31–46°C. Winters are the reason to come. Look into the water supply as carefully as the weather.",
    tone: "sage",
    placeIds: ["parras-de-la-fuente-mx", "moab-ut", "borrego-springs-ca", "alamos-mx", "la-paz-mx", "death-valley-ca", "yuma-az"],
  },
  {
    id: "tropical-coasts",
    title: "Tropical & Hurricane Coasts",
    subtitle: "Warm coasts in the path of tropical storms",
    description: "Coasts of the Gulf of Mexico, the Caribbean, the Mexican Pacific, Hawai‘i and the US Southeast. On the tropical ones (Puerto Escondido, Bacalar, Hilo, Honolulu) the warmest and coldest months differ by only 3–4°C and the year divides into wet and dry. The northern Gulf and Carolina coasts have a real winter, with nights of 4–10°C. All of them carry hurricane or tropical-storm risk, mostly from June to November, and that risk matters more than the averages.",
    tone: "ember",
    placeIds: ["key-west-fl", "charleston-sc", "apalachicola-fl", "merida-mx", "bacalar-mx", "puerto-escondido-mx", "la-paz-mx", "south-padre-tx", "la-ventosa-mx", "nags-head-nc", "new-orleans-la", "campeche-mx", "puerto-vallarta-mx", "mazatlan-mx", "hilo-hi", "honolulu-hi", "corpus-christi-tx", "ocean-springs-ms"],
  },

  {
    id: "atlantic-maritimes",
    title: "Atlantic Canada & Downeast",
    subtitle: "Fog, ice and cool summers on the North Atlantic",
    description: "From the Bay of Fundy, which has the highest tides in the world, to the iceberg coast of northern Newfoundland. The cold Labrador Current and the Gulf of St. Lawrence keep summer afternoons at 19–24°C. Winters are snowy and stormy, with nights of −5 to −14°C. Spring comes late and autumn is the most settled season.",
    tone: "glacier",
    placeIds: ["grand-manan-nb", "wolfville-ns", "halifax-ns", "charlottetown-pei", "gaspe-qc", "st-johns-nl", "twillingate-nl", "bar-harbor-me"],
  },
  {
    id: "great-lakes-microclimates",
    title: "Great Lakes Shores",
    subtitle: "Lake-effect snow, cool shores and fruit belts",
    description: "Towns whose weather is made by a large lake. Cold air crossing open water buries Houghton, Marquette and Buffalo in snow. Lake Superior keeps Duluth and Grand Marais cool in June. Lakes Erie, Ontario and Michigan delay the frosts that would otherwise rule out peaches and wine grapes at Leamington, Niagara and Traverse City. Burlington, on Lake Champlain, shows the same effects on a smaller lake.",
    tone: "ice",
    placeIds: ["erie-pa", "duluth-mn", "syracuse-ny", "grand-marais-mi", "marquette-mi", "houghton-mi", "traverse-city-mi", "thunder-bay-on", "burlington-vt", "leamington-on", "niagara-on-the-lake", "geneva-on-the-lake-oh", "buffalo-ny"],
  },
  {
    id: "appalachian-arc",
    title: "Appalachian Arc & Eastern Highlands",
    subtitle: "Ridges, coves and high valleys of the East",
    description: "Mountain towns from Quebec's Eastern Townships down the Blue Ridge to Alabama, with Eureka Springs in the Ozarks. Height takes several degrees off the lowland summer, the ridges wring out heavy rain, and enclosed valleys such as Burkes Garden collect cold air at night. Summers are cooler and greener than on the plains and Piedmont nearby. Heavy-rain floods are the main hazard.",
    tone: "sage",
    placeIds: ["black-mountain-nc", "asheville-nc", "boone-nc", "highlands-nc", "sutton-qc", "gatlinburg-tn", "chattanooga-tn", "eureka-springs-ar", "morgantown-wv", "mentone-al", "clayton-ga", "burkes-garden-va"],
  },
  {
    id: "comfort-exemplars",
    title: "Year-Round Comfort: A Short List",
    subtitle: "Thirteen places with mild weather in most months",
    description: "One or two examples of each kind of place where the weather stays moderate for most of the year: sky islands above the Arizona desert, Mexican highland towns, the cool dry-summer coast of California and Baja California, and the southern Appalachian slopes. None is perfect. The sky islands and the Appalachian towns have frosty winter nights, and the Baja coast gets only 200–240 mm of rain a year. Start here, then follow each profile to similar places.",
    tone: "sage",
    placeIds: [
      "huachuca-az",
      "portal-az",
      "silver-city-nm",
      "oaxaca-mx",
      "cuernavaca-mx",
      "ajijic-lake-chapala-mx",
      "san-miguel-de-allende-mx",
      "ensenada-mx",
      "valle-guadalupe-mx",
      "santa-barbara-ca",
      "monterey-ca",
      "black-mountain-nc",
      "highlands-nc",
    ],
  },
];

export const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map(c => [c.id, c]));
