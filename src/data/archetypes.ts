// ============================================================
// Terraclima — Microclimate Archetypes
// Display metadata for each archetype: chip label, tone colour,
// a one-line blurb, and a longer `guide` paragraph shown in
// PlaceDetail when a reader opens a profile. Source text is
// metric; the app converts at render time.
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
    blurb: "Dry and sunny, in the lee of mountains that catch the rain first.",
    guide: "Storms drop most of their rain and snow as they climb the windward side of a range. The air that comes down the far side is drier and warms as it sinks, so the cloud breaks up. A rain-shadow town can get a quarter of its wetter neighbour's rain, or less, and far more sun. The usual costs are dry summers, irrigation and, inland, a longer fire season.",
  },
  {
    id: "sky-island-refuge",
    label: "Sky-Island Refuge",
    tone: "sage",
    blurb: "Cool, forested high ground standing above hot, dry lowlands.",
    guide: "A sky island is an isolated range or plateau that rises 1000 m or more above desert or dry grassland. Air cools with height and the mountain catches passing storms, so the road up runs from scrub through oak into pine. Every 500 m of climb makes summer afternoons about 3°C cooler. Winters at the top bring real frost and some snow.",
  },
  {
    id: "eternal-spring-highland",
    label: "Eternal-Spring Highland",
    tone: "sage",
    blurb: "Tropical latitude at high altitude: mild afternoons all year and no real winter.",
    guide: "In the tropics the temperature depends on height far more than on season. Mexican highland towns between about 1200 and 2700 m have afternoons of roughly 20–30°C in every month. Nights are cool, and close to freezing at the highest towns in January. The year divides into a dry season and a rainy one from about June to September. April and May, before the rain, are the hottest months.",
  },
  {
    id: "cool-summer-maritime",
    label: "Cool-Summer Maritime",
    tone: "glacier",
    blurb: "Coasts where a cold sea keeps summer afternoons at about 16–22°C.",
    guide: "Wind off cold water holds summer down. July afternoons of 16–22°C are normal while places a short drive inland are 10°C warmer. On the Pacific the same sea keeps winter mild. On the North Atlantic and Lake Superior winters are cold and snowy all the same. Fog, low cloud and wind are common, and warm beach days are few.",
  },
  {
    id: "fog-belt-coast",
    label: "Fog-Belt Coast",
    tone: "glacier",
    blurb: "Coasts under low cloud and fog for much of the summer.",
    guide: "A narrow strip beside cold, upwelling water where low grey cloud is the usual summer sky. Mornings are overcast, afternoons often clear for a few hours, and the heat of the interior never arrives. Fog dripping from needles and leaves adds water through the dry season, which is how coast redwoods get through rainless summers. Step a few kilometres inland, or a few hundred metres uphill, and you are in sunshine.",
  },
  {
    id: "orchard-valley",
    label: "Orchard Valley",
    tone: "ochre",
    blurb: "Valleys where winter chill, summer sun and sloping ground suit tree fruit.",
    guide: "Commercial orchards need three things: enough winter cold for the trees to rest, a warm and sunny summer, and ground where cold air can drain away from the blossom on spring nights. The Okanagan, the Annapolis Valley, Hood River and the Lake Michigan shore meet those needs in different ways, through rain shadow, lake or slope. Where fruit has been grown for generations, the climate has been tested.",
  },
  {
    id: "basin-inversion",
    label: "Basin Inversion",
    tone: "ice",
    blurb: "Enclosed basins where cold air and fog settle for days in winter.",
    guide: "Under calm winter high pressure, cold air fills a closed basin and a layer of warmer air sits on top like a lid. The valley stays grey, cold and often smoky while the ridges above are in sunshine. An episode can last a week or more, until a storm or strong wind clears it. Winter air quality is the main thing to check.",
  },
  {
    id: "thermal-belt",
    label: "Thermal Belt",
    tone: "ochre",
    blurb: "A band partway up the slope that escapes the frost on the valley floor.",
    guide: "On clear, calm nights cold air drains downhill and pools in the valley. The slope above the pool stays in warmer air and can be several degrees milder at dawn. Higher still it turns colder and windier again. Orchards, vineyards and old farmhouses are often found in this band, where the frost-free season can run two to four weeks longer than in the bottomland.",
  },
  {
    id: "lake-moderated",
    label: "Lake-Moderated",
    tone: "glacier",
    blurb: "A large lake nearby takes the edge off summer heat and winter cold.",
    guide: "Deep water warms and cools slowly. A big lake holds spring back, which keeps fruit buds closed until the frosts are over, and it gives off heat through autumn, which delays the first freeze. On the downwind shore peaches and wine grapes survive where they would fail a short drive inland. The effect weakens quickly with distance from the water.",
  },
  {
    id: "lake-effect-snowbelt",
    label: "Lake-Effect Snowbelt",
    tone: "glacier",
    blurb: "Shores downwind of a large lake that take very heavy snow.",
    guide: "When cold air crosses open, unfrozen water it picks up heat and moisture and unloads it as snow on the downwind shore, often in bands only a few kilometres wide. Totals of 2.5 to 7 m a year are normal in these belts. The snow is heaviest from November to January and eases if the lake freezes. Skies are grey for much of the winter.",
  },
  {
    id: "chinook-corridor",
    label: "Chinook Corridor",
    tone: "ochre",
    blurb: "East of the mountains, where warm downslope winds break up the winter.",
    guide: "Air that crosses the Rockies and sinks down the eastern slope warms as it descends and arrives dry and fast. A chinook can raise the temperature 20–30°C in a few hours and remove the snow cover in a day. Winter comes in spells of deep cold with thaws between them. The same wind dries the land and can reach damaging speeds.",
  },
  {
    id: "high-desert-escape",
    label: "High-Desert Escape",
    tone: "ochre",
    blurb: "Desert at altitude: dry air, warm days, cool nights.",
    guide: "Above about 1500 m the desert loses its worst heat. Afternoons are warm, the air is dry, and nights cool by 15°C or more because dry air under a clear sky holds little warmth. Winters are sunny, with frosty nights. The limits are water, strong sun and, in many places, distance from services.",
  },
  {
    id: "canyon-sheltered",
    label: "Canyon-Sheltered",
    tone: "ochre",
    blurb: "Towns set between canyon walls, out of the wind and partly shaded.",
    guide: "Canyon walls block the wind and shade the floor for part of the day. Cool air flows down-canyon at night and up-canyon breezes rise in the afternoon. A canyon town is usually calmer than the plateau above it, and water and deeper soil collect on the floor. Flash floods and rockfall are the hazards that come with the setting.",
  },
  {
    id: "coastal-upwelling",
    label: "Coastal-Upwelling Belt",
    tone: "glacier",
    blurb: "Coasts cooled by cold water rising from the deep.",
    guide: "In spring and summer, winds blowing along the coast push the surface water out to sea and cold water rises to replace it. The sea can be 10–13°C in July. The shore stays cool and often foggy while the land behind it is hot. The same cold, nutrient-rich water supports kelp forests, seabirds and fisheries.",
  },
  {
    id: "monsoon-edge",
    label: "Monsoon-Edge Zone",
    tone: "sage",
    blurb: "Where the summer monsoon arrives, though not equally every year.",
    guide: "The North American Monsoon brings afternoon thunderstorms to northwest Mexico and the US Southwest from July to September. Towns near its edge have a hot, dry spring, then a sudden turn to towering clouds, short downpours and green hills. How much rain arrives varies widely from year to year, and flash floods come with the storms.",
  },
  {
    id: "humidity-refuge",
    label: "Humidity Refuge",
    tone: "glacier",
    blurb: "Places where dry air, altitude or a cool sea keeps summer humidity low.",
    guide: "Humidity decides how heat feels. Where the summer dew point stays around 10–15°C, sweat evaporates and nights cool off. Where it sits at 22–24°C, as on the Gulf Coast, the same air temperature is far more tiring and nights stay warm. These places share the first kind of summer.",
  },
  {
    id: "mild-winter-foothills",
    label: "Mild-Winter Foothills",
    tone: "sage",
    blurb: "Low hills at the foot of the mountains that miss the worst winter cold.",
    guide: "Foothills sit above the cold air that pools on the valley floor and below the wind and snow of the high country. Winter nights are milder, snow melts sooner and spring starts earlier than in either neighbour. Many old farms and orchards were sited on these slopes for that reason.",
  },
  {
    id: "mediterranean-pocket",
    label: "Mediterranean Pocket",
    tone: "ochre",
    blurb: "Mild, wet winters and dry, sunny summers.",
    guide: "The Mediterranean pattern, with rain in winter and almost none in summer, occurs in only five regions of the world. In North America it runs from northern Baja California through California, and a cooler version reaches the rain shadows of Oregon, Washington and southern British Columbia. Hills are green in winter and brown by July. Olives, grapes and stone fruit do well, and summer irrigation and wildfire are the costs.",
  },
  {
    id: "cloud-forest",
    label: "Cloud Forest",
    tone: "sage",
    blurb: "Mountain forest that is often inside the cloud and takes water from it.",
    guide: "On slopes that face a moist wind, cloud forms at a steady height and the forest there stands in mist for much of the year. Leaves and moss collect droplets and drip them to the ground, which adds to an already heavy rainfall. Temperature and humidity change little from day to day. Expect mud, moss, tree ferns and very few dry weeks.",
  },
  {
    id: "volcanic-upland",
    label: "Volcanic Upland",
    tone: "ochre",
    blurb: "High country on lava and ash soils.",
    guide: "Weathered volcanic ash makes deep, loose, fertile soil that holds water well and still drains. Young lava and cinder are the opposite: thin, rocky and quick to dry. At altitude in the tropics the ash soils carry coffee, avocado and maize. Farther north they carry pine forest. Local crops are a fair guide to which kind of ground you are standing on.",
  },
  {
    id: "limestone-karst",
    label: "Limestone / Karst Pocket",
    tone: "ochre",
    blurb: "Limestone country where water sinks underground and soils are thin.",
    guide: "In karst, rain drains through cracks in the limestone into caves and underground streams, and comes back to the surface at springs. There are few creeks. Soils are shallow, alkaline and stony, and gardens dry out fast. Sinkholes and cave mouths stay cool and damp. Wells, springs and cisterns matter more here than rainfall totals suggest.",
  },
  {
    id: "river-valley-moderation",
    label: "River-Valley Moderation",
    tone: "glacier",
    blurb: "Large river valleys that carry milder air inland.",
    guide: "A big river valley is a low route through high ground. Sea air moves up it, and cold or hot air drains along it, so the valley floor is often milder than the uplands on either side. The Columbia and the St. Lawrence carry this effect hundreds of kilometres from the coast. Valley floors also have deep river soils, and fog and flood risk.",
  },
  {
    id: "urban-heat-contrast",
    label: "Urban Heat Contrast",
    tone: "ember",
    blurb: "City centres that run several degrees warmer than their surroundings, mainly at night.",
    guide: "Pavement and buildings store the day's heat and release it after dark. That delays frost and lengthens the growing season in the city, and it makes summer nights hotter and heat waves harder to bear. Tall streets can also channel wind or trap still air. Parks, rivers and the leafy edge of town can be noticeably cooler than the core.",
  },
  {
    id: "desert-oasis",
    label: "Desert Oasis",
    tone: "sage",
    blurb: "Springs, rivers or shallow groundwater supporting green ground in the desert.",
    guide: "A dependable source of water changes a small area of desert. Trees give shade, the air is slightly more humid, and birds and people gather there. Oases are fragile, because many draw on old groundwater that is refilled slowly or not at all. The condition of the spring or aquifer matters as much as the climate.",
  },
  {
    id: "hyper-maritime",
    label: "Hyper-Maritime",
    tone: "glacier",
    blurb: "Outer coasts where the ocean leaves little difference between the seasons.",
    guide: "On exposed headlands and outer islands, summer afternoons reach only 16–20°C and winter afternoons mostly stay at 5–10°C. Hard frost and hot days are both uncommon. Cloud, wind, salt spray and long spells of rain or fog shape daily life. This is the most ocean-controlled climate in North America.",
  },
  {
    id: "driftless-relief",
    label: "Driftless Relief Pocket",
    tone: "sage",
    blurb: "Hill country the glaciers missed, with steep valleys and varied slopes.",
    guide: "The Driftless Area of the upper Mississippi was never flattened by ice, so it kept its ridges, bluffs and narrow valleys. Within a few kilometres there are warm south-facing slopes, cold valley floors, and north-facing rock slopes that stay cool all summer. What grows, and when the frost comes, depends on exactly where you stand.",
  },
  {
    id: "piedmont-transition",
    label: "Piedmont Transition",
    tone: "ochre",
    blurb: "Rolling country between the mountains and the plain.",
    guide: "A piedmont is the belt of low hills at the foot of a mountain range. It is a little cooler than the plain below, less steep and less snowy than the mountains above, and well supplied with streams. Many piedmonts are farming and wine country. Climate changes gradually across them, so two sites an hour apart can differ by a few degrees.",
  },
  {
    id: "cold-air-pool",
    label: "Cold-Air Pool",
    tone: "ice",
    blurb: "Valleys where cold air settles at night and the floor runs colder than the slopes above.",
    guide: "On calm, clear nights cold air drains off the slopes and fills an enclosed valley from the bottom. In winter a lid of warmer air can hold it there for days or weeks. The floor can be more than 10°C colder than slopes a few hundred metres higher. Peter Sinks, a basin in the mountains above Logan, has recorded −56°C, the second-lowest reading in the contiguous United States.",
  },
  {
    id: "frost-hollow",
    label: "Frost Hollow",
    tone: "ice",
    blurb: "Small dips in the land where frost comes later in spring and earlier in autumn.",
    guide: "A frost hollow is any low spot where cold air collects on still nights. It need not be a deep valley; a shallow bowl in a field is enough. The frost-free season there can be weeks shorter than on the slope beside it. Gardeners find these spots by losing tomatoes to a June frost. They range from a few metres to several kilometres across.",
  },
  {
    id: "santa-ana-corridor",
    label: "Santa Ana / Sundowner Corridor",
    tone: "ember",
    blurb: "Canyons and passes where hot, dry wind blows from the interior toward the coast.",
    guide: "When high pressure builds inland, air pours through the passes and canyons toward the sea, warming and drying as it descends. Santa Anas in southern California, sundowners at Santa Barbara and Diablo winds around San Francisco Bay all work this way. They bring sudden heat, very low humidity and clear views, mostly in autumn, and many of California's most destructive wildfires have burned under them.",
  },
  {
    id: "gap-wind-corridor",
    label: "Gap / Gorge Wind Corridor",
    tone: "ochre",
    blurb: "Gaps in the mountains where wind is funnelled and strengthened.",
    guide: "Where a river or pass cuts through a range, air moves through the opening from the high-pressure side to the low. The Columbia River Gorge, Cajon Pass, Tehachapi Pass and the Strait of Juan de Fuca are examples. The wind is steady and comes from a predictable direction, which suits windsurfers and wind farms. A gap is also where the weather of one region meets the next.",
  },
  {
    id: "fjord-inlet",
    label: "Fjord / Inlet Coast",
    tone: "glacier",
    blurb: "Deep, steep-sided inlets where sea and mountain climates meet.",
    guide: "A fjord brings sea water far into the mountains. The outer coast is mild, wet and windy. Toward the head of the inlet, winters are colder and summers warmer, and cold air draining off inland snowfields can blow down the fjord for days. One wall may be in shade for much of the winter. Rainfall changes sharply along the length of the inlet.",
  },
  {
    id: "alpine-tundra",
    label: "Alpine Tundra",
    tone: "ice",
    blurb: "High mountain towns and summits near or above treeline, with short, cool summers.",
    guide: "Near treeline the growing season is a matter of weeks and frost is possible in any month. Snow lies from autumn well into spring, the air is thin, and the sun is strong. Summer nights are often 15–20°C cooler than the afternoons. People live at these heights year-round, but altitude affects sleep, exertion and health, and takes time to adjust to.",
  },
  {
    id: "subarctic-continental",
    label: "Subarctic Continental",
    tone: "aurora",
    blurb: "The northern interior: winters that reach −40°C and short summers that reach 25°C.",
    guide: "Far from the ocean and north of about 58°, the difference between winter and summer is as large as anywhere on Earth outside Siberia. Whitehorse, Yellowknife and Fairbanks have long, dark, dry-cold winters and short summers with daylight most of the night. Spruce forest, muskeg and permafrost cover the land. Day length shapes the year as much as temperature does.",
  },
  {
    id: "tropical-isothermal",
    label: "Tropical Isothermal Coast",
    tone: "sage",
    blurb: "Tropical coasts where every month is nearly as warm as every other.",
    guide: "On tropical coasts the sea and the high sun keep monthly temperatures within a few degrees of each other all year. Seasons are marked by rain: a dry season in winter and spring, and a wet season from about June to October. Nights stay warm and the air is humid. The cooler, drier months are the comfortable ones.",
  },
  {
    id: "tropical-dry",
    label: "Tropical Wet-Dry",
    tone: "ochre",
    blurb: "Tropical lowlands with a long dry season and a summer rainy season.",
    guide: "The tropical wet-and-dry climate (Köppen Aw) of the Yucatán, the Oaxaca coast and the lowlands of western Mexico. Almost no rain falls from November to May, and forest and fields turn brown. The rains arrive in June and within weeks everything is green. Farming, building and festivals all follow that calendar.",
  },
  {
    id: "hurricane-coast",
    label: "Hurricane-Exposed Coast",
    tone: "ember",
    blurb: "Warm coasts where hurricanes and tropical storms make landfall.",
    guide: "On the Gulf of Mexico, the Caribbean and the US Atlantic coast, tropical cyclones are part of the climate. They shape building codes, insurance costs and the vegetation, and they make late summer and autumn a watchful season. Some stretches are hit every few years. Others go decades between major storms and then take a severe one.",
  },
  {
    id: "badland-steppe",
    label: "Badland / Steppe Pocket",
    tone: "ochre",
    blurb: "Dry, eroded country at the edge of the Great Plains.",
    guide: "In badlands and dry breaks such as those of the Dakotas and southern Alberta, bare, steep, deeply cut ground heats fast by day and cools fast at night. Which way a slope faces matters a great deal: south-facing slopes are hot and nearly bare, while north-facing draws hold snow longer and grow shrubs and trees. Wind is constant and shade is scarce.",
  },
];

export const ARCHETYPE_BY_ID = Object.fromEntries(ARCHETYPES.map(a => [a.id, a])) as Record<MicroclimateArchetype, ArchetypeMeta>;
