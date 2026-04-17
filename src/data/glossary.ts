// ============================================================
// Terraclima — Concept Glossary
// Used in tooltips, "Learn" overlay, and place-detail explainers.
// ============================================================

export interface Concept {
  id: string;
  term: string;
  short: string;         // One-line definition
  long: string;          // Two-to-four sentence deeper explanation
  mechanism?: string;    // Mechanism-oriented note for the curious
  exampleIds?: string[]; // Place ids that exemplify the concept
}

export const CONCEPTS: Concept[] = [
  {
    id: "rain-shadow",
    term: "Rain shadow",
    short: "The dry side of a mountain range, wrung out by prevailing winds.",
    long: "Moist air rising on a mountain's windward flank cools, condenses, and sheds precipitation. The same air, now drier, descends on the lee side, warming and losing relative humidity. The result is a sharply drier, often sunnier band immediately downwind of the range.",
    mechanism: "Orographic lift upwind → condensation; adiabatic compression downwind → drying and warming.",
    exampleIds: ["sequim-wa", "bishop-ca", "osoyoos-bc"],
  },
  {
    id: "sky-island",
    term: "Sky island",
    short: "A mountain range so elevated it hosts a cooler, wetter ecosystem marooned above the surrounding desert.",
    long: "Sky islands are isolated massifs that rise thousands of meters above arid lowlands, intercepting moisture and cooling the air via lapse rate. Pine-oak forests, cloud pockets, and endemic species persist on these uplifted islands while the surrounding basin remains hot and dry.",
    mechanism: "Elevation lapse rate (~6.5°C / km) + orographic lift → cooler, wetter summit climate versus the surrounding basin.",
    exampleIds: ["portal-az", "silver-city-nm", "creel-mx"],
  },
  {
    id: "lapse-rate",
    term: "Lapse rate",
    short: "Temperature drops with elevation — roughly 6.5°C per 1000 m of rise.",
    long: "The environmental lapse rate describes how air cools as you climb. Dry air cools faster (~9.8°C/km), saturated air more slowly (~5°C/km). The average (~6.5°C/km) is why a valley at 500 m and a peak at 2500 m can feel like entirely different climate zones despite being a short drive apart.",
    mechanism: "Decreasing atmospheric pressure → adiabatic expansion → temperature falls with altitude.",
  },
  {
    id: "cold-air-pooling",
    term: "Cold-air pooling",
    short: "Cold, dense air sinks into basins and valley bottoms overnight, producing frost hollows.",
    long: "On clear, calm nights, radiatively cooled air drains downslope and collects in depressions. Valley floors and enclosed basins can sit 5–15°C colder than ridges just 100 m above. These cold pools shape frost frequency, growing season, and why orchardists plant on mid-slope thermal belts instead of the valley bottom.",
    mechanism: "Nocturnal radiative cooling + gravity drainage of denser cold air into topographic lows.",
    exampleIds: ["gunnison-co", "logan-ut", "canaan-valley-wv", "truckee-ca", "stanley-id", "fairbanks-ak"],
  },
  {
    id: "gap-wind",
    term: "Gap wind / gorge wind",
    short: "Persistent wind funneled through a mountain gap between regions of different pressure.",
    long: "Where a mountain barrier is notched by a sea-level gap — the Columbia Gorge, the Strait of Juan de Fuca, the Crowsnest Pass — cross-range pressure differences drive accelerated, often howling winds through the notch. Gap-wind corridors host the world's windsurfing capitals, wind-farm belts, and some of the continent's most distinctive abrupt climate transitions.",
    mechanism: "Pressure gradient across a mountain barrier + constrictive geometry → Bernoulli-style acceleration through the gap.",
    exampleIds: ["hood-river-gorge", "ellensburg-wa", "pincher-creek-ab", "la-ventosa-mx"],
  },
  {
    id: "santa-ana",
    term: "Santa Ana / sundowner winds",
    short: "Hot, dry downslope winds on coastal California that drive the continent's most dangerous fire weather.",
    long: "When high pressure builds over the Great Basin, air descends toward the Pacific through coastal canyons, compressing and drying as it falls. Temperatures can spike 10°C in hours while humidity drops below 10%. The winds define autumn in coastal California and correlate with the state's most destructive wildfires.",
    mechanism: "Interior high-pressure + adiabatic downslope compression + channeling through coastal canyons.",
    exampleIds: ["ojai-ca"],
  },
  {
    id: "katabatic",
    term: "Katabatic drainage flow",
    short: "Dense cold air gravity-drains off icefields and high terrain on still nights.",
    long: "On clear, calm nights near glaciers, icefields, or snowpack-covered plateaus, air chilled in contact with cold surfaces becomes dense enough to flow downslope under gravity — sometimes reaching significant speeds. This shapes microclimate at the toes of valleys, at fjord heads, and along slopes below snowfields.",
  },
  {
    id: "hyper-maritime",
    term: "Hyper-maritime climate",
    short: "A coastal climate so dominated by the ocean that the annual temperature range shrinks to 6–10°C.",
    long: "On exposed Pacific headlands and outer-coast islands, the sea buffers both summer warming and winter cooling. Annual swings can be smaller than a typical inland day's diurnal swing. These climates are rare and climatically resilient — among the most buffered from heat extremes on the continent.",
    exampleIds: ["eureka-ca", "tofino-bc", "prince-rupert-bc", "forks-wa", "sitka-ak", "haida-gwaii-bc", "cannon-beach-or"],
  },
  {
    id: "subarctic-continentality",
    term: "Subarctic continentality",
    short: "Deep-interior high latitudes where annual temperature ranges exceed 55°C.",
    long: "North of roughly 58° and far from any moderating ocean, continental climates reach their extreme expression. Winter lows of -40°C and summer highs of 28°C — in the same calendar year, at the same place — are routine. The thermal amplitude shapes every aspect of life, from architecture to agriculture to the rhythm of the sun.",
    exampleIds: ["whitehorse-yt", "yellowknife-nt", "fairbanks-ak", "iqaluit-nu", "inuvik-nt", "ely-mn"],
  },
  {
    id: "inversion",
    term: "Temperature inversion",
    short: "A layer of warm air sits on top of cold air, trapping pollutants and moisture below.",
    long: "Normally air cools with height, but under calm high-pressure conditions, a stable cap can form where temperature rises with altitude. Inversions lock cold air, fog, and smoke in valleys. In winter, they turn basins into gray, stagnant cold traps while ridges above bask in sun.",
    mechanism: "Subsidence + radiative cooling creates a capped boundary layer; vertical mixing is suppressed.",
  },
  {
    id: "aspect",
    term: "Aspect & slope",
    short: "The compass direction and steepness of a slope govern how much sun, snow, and heat it absorbs.",
    long: "South- and southwest-facing slopes in the Northern Hemisphere receive vastly more direct radiation, running warmer and drier. North-facing slopes hold snow, soil moisture, and cooler forests. Aspect can shift the climate — and what grows — by a full zone over the span of a single hillside.",
    mechanism: "Solar angle-of-incidence varies with aspect and slope, redistributing incoming radiation.",
  },
  {
    id: "orographic-lift",
    term: "Orographic lift",
    short: "Air forced upward by terrain cools and releases its moisture.",
    long: "When wind meets a mountain barrier, it must rise. As it climbs it cools, reaches saturation, and condenses. This is why windward slopes are reliably wet and why cloud caps perch on summits even on otherwise clear days.",
  },
  {
    id: "marine-layer",
    term: "Marine layer",
    short: "A cool, moist coastal air layer that brings morning fog and mild afternoons.",
    long: "Along upwelling-driven coasts (West Coast especially), cold ocean water cools the overlying air, creating a shallow layer of stratus that pushes inland overnight. Coastal places under its influence enjoy remarkably mild summers — often 20°C afternoons while inland valleys roast past 35°C.",
    mechanism: "Cold sea surface + warmer air aloft → temperature inversion → stratocumulus deck.",
    exampleIds: ["monterey-ca", "santa-cruz-felton-ca", "point-reyes-ca"],
  },
  {
    id: "thermal-belt",
    term: "Thermal belt",
    short: "A mid-slope band that stays warmer than both the valley floor and the ridge on frosty nights.",
    long: "On radiative nights, cold air drains past mid-slope into the valley below, while ridges lose heat to space. A band in between escapes both fates. Orchardists and vineyard operators have planted on these belts for centuries — the frost-free window can be weeks longer than in the basin.",
    mechanism: "Cold-air drainage below + radiative cooling above leave a warmer envelope at mid-elevation.",
    exampleIds: ["black-mountain-nc", "hood-river-or"],
  },
  {
    id: "chinook",
    term: "Chinook / foehn",
    short: "A warm, dry downslope wind that can melt snow and spike temperatures by tens of degrees.",
    long: "When stable air crosses a mountain range and descends rapidly on the lee side, it compresses and warms adiabatically. Chinooks in Alberta and the Colorado Front Range have raised winter temperatures 20–30°C in hours. The effect moderates winters and dries snowpack rapidly.",
    mechanism: "Stable cross-mountain flow + adiabatic compression on descent → warm, dry surface wind.",
    exampleIds: ["lethbridge-ab", "boulder-co"],
  },
  {
    id: "lake-effect",
    term: "Lake effect",
    short: "Open water modifies downwind climate — moderating temperature and, in winter, generating snow.",
    long: "Cold air sweeping across relatively warm open water picks up moisture and instability, then dumps heavy snow on the downwind shore. The same water body also moderates diurnal and seasonal swings year-round. Fruit belts on the lee shores of the Great Lakes and Great Slave Lake owe their character to this effect.",
    mechanism: "Air–water vapor/heat flux + convergence on the downwind shore.",
    exampleIds: ["traverse-city-mi", "niagara-on-the-lake"],
  },
  {
    id: "upwelling",
    term: "Coastal upwelling",
    short: "Wind-driven surfacing of cold deep ocean water that chills adjacent coasts.",
    long: "Along eastern ocean boundaries, summer winds drive surface water offshore and cold, nutrient-rich water rises. The cold sea keeps coastal air cool and foggy. It's why the California coast in July can be 12°C when Phoenix is at 44°C.",
    mechanism: "Ekman transport offshore → compensating vertical flux from depth.",
    exampleIds: ["monterey-ca", "ensenada-mx"],
  },
  {
    id: "continentality",
    term: "Continentality",
    short: "How much a place's climate is shaped by distance from large water bodies.",
    long: "Oceans moderate temperature swings; continental interiors amplify them. A continental climate sees wider seasonal and diurnal ranges; a maritime one sees narrower ranges and higher humidity. The gradient across North America is one of the largest on Earth.",
  },
  {
    id: "hardiness-zone",
    term: "Hardiness zone",
    short: "A growing zone defined by average annual minimum temperature.",
    long: "The USDA plant hardiness zone system (and Canada's refined equivalent) divides regions by the coldest night a typical year brings. It's the starting point for asking which perennials survive — though frost timing, heat, and summer moisture matter just as much.",
  },
  {
    id: "chill-hours",
    term: "Chill hours",
    short: "Accumulated hours below ~7°C needed to break dormancy in many fruit trees.",
    long: "Apples, pears, peaches, and cherries need a minimum winter chill dose to flower properly. Too few chill hours and trees set poorly. Too much cold and bloom arrives before frost danger passes. Chill hours are a crucial climate suitability signal for orchard belts.",
  },
  {
    id: "soil-drainage",
    term: "Soil drainage",
    short: "How readily water moves through a soil profile.",
    long: "Drainage depends on texture (sand/silt/clay), structure, and subsoil horizons. Excessive drainage means drought stress and nutrient leaching; poor drainage means saturation and root rot. The best garden soils land in the middle — moist without being soggy.",
  },
  {
    id: "karst",
    term: "Karst",
    short: "Landscape of soluble bedrock (usually limestone) with caves, sinks, and fast drainage.",
    long: "Karst terrain has little surface runoff — water percolates through fractures to underground rivers. Soils are often thin, alkaline, and prone to drought. Microclimates differ between dry uplands and cool, humid sinkholes.",
  },
  {
    id: "monsoon-edge",
    term: "Monsoon edge",
    short: "The transitional zone where summer convective moisture reliably arrives — or doesn't.",
    long: "The North American Monsoon pushes afternoon thunderstorms into the Southwest each July–September. The monsoon's leading edge moves year to year. Places on the edge get wild swings in wet/dry summers, dramatic skies, and some of the continent's most distinctive late-summer atmospheres.",
    exampleIds: ["silver-city-nm", "alamos-mx"],
  },
  {
    id: "climate-normals",
    term: "Climate normals",
    short: "A 30-year rolling average used as a baseline for describing a place's climate.",
    long: "The World Meteorological Organization recommends 30-year averages (e.g., 1991–2020) to smooth out natural variability. Normals are essential for comparison but aren't forecasts — in a rapidly changing climate, the baseline itself is shifting.",
  },
  {
    id: "scenario-uncertainty",
    term: "Scenario uncertainty",
    short: "Different global emissions paths produce different regional futures.",
    long: "Climate projections depend on assumptions about future emissions (SSP1-2.6, SSP2-4.5, SSP5-8.5, etc.). For many variables, mid-century outcomes are fairly robust; late-century outcomes diverge sharply. Honest climate briefs should state the scenario they're drawing from.",
  },
  {
    id: "diurnal-range",
    term: "Diurnal temperature range",
    short: "The typical day-to-night temperature swing — a fingerprint of aridity, elevation, and cloud cover.",
    long: "Dry, high, cloud-free climates swing 15–25°C between midday and dawn; humid maritime climates swing 4–8°C. Diurnal range governs sugar development in fruit, sleep comfort, frost risk, and the felt character of a place. It is arguably the single most useful microclimate descriptor beyond the mean.",
    mechanism: "Clear, dry air + low thermal mass (dry ground) → rapid radiative cooling at night and strong solar heating by day.",
    exampleIds: ["wenatchee-wa", "bishop-ca", "marfa-tx"],
  },
  {
    id: "dew-point",
    term: "Dew point",
    short: "The temperature at which air becomes saturated — a direct measure of absolute humidity.",
    long: "Unlike relative humidity, which changes with temperature, the dew point is a true gauge of how much moisture is in the air. Dew points below 10°C feel crisp and dry; 15–18°C is comfortable; above 21°C the air feels oppressive and sleep quality suffers. Dew-point climatology separates the Southwest from the Southeast as dramatically as temperature separates Minneapolis from Miami.",
  },
  {
    id: "fire-weather",
    term: "Fire weather",
    short: "The combination of low humidity, high temperature, and sustained wind that enables catastrophic fire behavior.",
    long: "Fire-weather days are defined by specific thresholds — typically temperature above 32°C, humidity below 15%, and wind sustained above 25 km/h. The continent's worst fires almost always occur on days when all three align. Santa Ana, chinook, and gap-wind corridors are prone to synchronous fire weather over large areas.",
  },
  {
    id: "monsoon",
    term: "North American Monsoon",
    short: "A seasonal reversal of winds that brings summer thunderstorms to the Southwest.",
    long: "Differential heating between the Gulf of California and the elevated interior draws moist air inland each summer. From late June through September, afternoon convection builds over mountain ranges and moves outward. Many Southwest microclimates get 50–70% of their annual precipitation from monsoon-season storms, concentrated in just a few dozen afternoons.",
    exampleIds: ["silver-city-nm", "flagstaff-az", "alamos-mx"],
  },
  {
    id: "radiative-cooling",
    term: "Radiative cooling",
    short: "Heat loss to the night sky under clear, calm conditions.",
    long: "Earth's surface continuously emits longwave radiation. On clear, calm nights without a cloud blanket, this loss is unimpeded and ground temperatures can plummet 15°C or more below the daytime high. Cold-air pooling, frost hollows, and sharp diurnal swings all originate here.",
  },
  {
    id: "urban-heat-island",
    term: "Urban heat island",
    short: "Built-up areas run 3–8°C warmer than surrounding rural land, especially at night.",
    long: "Concrete, asphalt, and reduced vegetation store solar heat by day and release it slowly at night. Minimum temperatures — the ones that matter most for heat mortality — are where the effect is most pronounced. Two points can sit inside the same metro and experience climatically distinct nights.",
  },
  {
    id: "hurricane-coast",
    term: "Hurricane coast",
    short: "A coastal climate whose character is partly defined by tropical cyclone return intervals.",
    long: "Atlantic and Gulf coasts, plus Pacific Mexico, sit in the path of tropical cyclones whose occasional landfalls shape the built landscape, the vegetation, and the insurance market. The climate averages may be pleasant; the tail risk is the story.",
  },
  {
    id: "tropical-isothermal",
    term: "Tropical isothermal climate",
    short: "Low-latitude elevations where the monthly mean barely varies — often under 2°C range across the year.",
    long: "At tropical latitudes where the sun's elevation changes only modestly through the year, temperatures at a given altitude stay remarkably constant. Seasons are defined by rainfall, not heat. The classic Mexican highland eternal-spring climate is the paradigm case.",
    exampleIds: ["oaxaca-mx", "san-cristobal-mx", "patzcuaro-mx"],
  },
];
