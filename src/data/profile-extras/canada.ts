// ============================================================
// Terraclima — profile-only fields of the Canadian places
// ============================================================
// Sources (citations), confidence notes, the climate-change outlook and the
// In depth chapters. They are read only by a place's profile, Compare and
// exports, so they live here and load when one of those opens, instead of
// with the atlas on first load. Edit them here; the rest of each place stays
// in its places file. Keyed by place id.
// ============================================================

import type { AuthoredProfileExtras } from "./types";

export const PROFILE_EXTRAS_CANADA: Record<string, AuthoredProfileExtras> = {
  "osoyoos-bc": {
    climateChange: {
      outlook2050: "Hotter summers, longer growing season, increased fire, greater heat-related mortality. Snowpack declines further reduce Okanagan water supply.",
      outlook2100: "Canadian wine country expands northward; Osoyoos becomes more like inland California. Water stress is the defining variable.",
      keyShifts: [
        { variable: "Summer extreme heat", direction: "up" },
        { variable: "Okanagan snowpack", direction: "down" },
        { variable: "Wildfire in surrounding ranges", direction: "up" },
        { variable: "Irrigation demand", direction: "up" },
      ],
      resilienceNote: "Climate is warming rapidly; irrigation and fire smoke are the structural vulnerabilities.",
    },
    confidenceNotes: "ECCC station data at Osoyoos West and Oliver are extensive; Okanagan valley is among BC's best-studied microclimate gradients.",
    deepSections: [
      {
        id: "osoyoos-desert-edge",
        title: "Why the desert reaches Canada here",
        paragraphs: [
          "Osoyoos is not dry by accident. Pacific storms lose moisture crossing the Coast Mountains and Cascades, then the Okanagan valley keeps descending toward the Columbia Basin. By the time air reaches the South Okanagan, summer humidity is low, cloud cover is limited, and evapotranspiration outruns rainfall for much of the growing season.",
          "That mechanism is why the ecology feels abruptly un-Canadian: antelope-brush, bunchgrass, sage, and open talus share space with orchards and vineyards. This is the northern tip of the dry shrub-steppe that runs up from the Columbia Basin.",
        ],
      },
      {
        id: "osoyoos-lake-irrigation",
        title: "Warm lake, irrigation and the dry benches",
        paragraphs: [
          "Osoyoos Lake stores heat through summer and softens immediate shoreline nights, but the broader agricultural system depends on managed water. The visible lushness is a human-hydrology layer sitting on top of a semi-desert baseline.",
          "The distinction matters when choosing land. A lot with irrigation rights and a slope that drains cold air is a different proposition from dry benchland outside the irrigation district.",
        ],
      },
      {
        id: "osoyoos-wine-bench",
        title: "Benchlands, grapes, and heat-unit sorting",
        paragraphs: [
          "The South Okanagan sorts fruit by bench and exposure. Low slopes accumulate heat for red wine grapes and stone fruit, while slightly cooler benches retain enough nighttime relief for acidity and color. Small elevation steps can matter more than the regional map implies.",
          "This is the Canadian end of a larger Columbia-Basin wine logic: high summer light, low humidity, cold-season chill, and a sharp dependency on irrigation reliability.",
        ],
      },
      {
        id: "osoyoos-risk-water-smoke",
        title: "The two binding constraints: water and smoke",
        paragraphs: [
          "The warmth has a cost. Hotter summers increase irrigation demand while regional fire seasons add smoke exposure that can affect health, tourism, and wine quality.",
          "The lake does not solve any of this. July afternoons average 32°C, only about 330 mm of precipitation falls in a year, and smoke is a regular part of late summer.",
        ],
      },
    ],
    citations: [
      { label: "Environment & Climate Change Canada — Osoyoos West 1991–2020 normals", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Wine Growers British Columbia — South Okanagan regional context", kind: "other", url: "https://winebc.com/discover-bc-wine-country/okanagan-valley/" },
      { label: "Climate Atlas of Canada — Osoyoos profile", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "BC Wildfire Service historical fire perimeters", kind: "oss-data", url: "https://wildfiresituation.nrs.gov.bc.ca/map" },
      { label: "AAFC Canadian Soil Information Service — Soil Landscapes of Canada", kind: "other", url: "https://sis.agr.gc.ca/cansis/nsdb/slc/" },
    ],
  },
  "lethbridge-ab": {
    climateChange: {
      outlook2050: "Longer growing seasons; more erratic winters with fewer deep-cold spells but more variability. Drought risk elevated.",
      outlook2100: "Chinook pattern itself likely persists but winter inversions weaken. Prairie agriculture pushes northward; Lethbridge's heat-unit envelope shifts toward current Montana values.",
      keyShifts: [
        { variable: "Winter extreme cold", direction: "down" },
        { variable: "Growing season length", direction: "up" },
        { variable: "Drought frequency", direction: "up" },
        { variable: "Smoke days", direction: "up" },
      ],
      resilienceNote: "Longer growing seasons are agriculturally advantageous; water stress is the main constraint.",
    },
    confidenceNotes: "Dense ECCC observation network; chinook frequency is well-studied by University of Lethbridge.",
    deepSections: [
      {
        id: "lethbridge-chinook-engine",
        title: "The chinook engine",
        paragraphs: [
          "Lethbridge is positioned where westerly flow descends the Rocky Mountain front and arrives on the prairie as compressed, dry, warm air. The signature cloud wall over the mountains is not decorative; it marks a real air-mass boundary moving across the foothills.",
          "That is why winter here is variable rather than simply cold. A week of Arctic air can be interrupted by a rapid thaw, then replaced by cold again once the pressure pattern resets.",
        ],
      },
      {
        id: "lethbridge-wind-land",
        title: "Wind as landscape infrastructure",
        paragraphs: [
          "Wind shapes everything from shelterbelts to road closures to how people experience winter. The same downslope pattern that warms the city can strip snow from fields, desiccate evergreens, and stress orchard bark through freeze-thaw cycles.",
          "What matters for a house is its exposure. A lot on the open prairie takes the full west wind. One in the Oldman River valley or behind a shelterbelt is noticeably calmer.",
        ],
      },
      {
        id: "lethbridge-dryland-irrigation",
        title: "Dryland prairie with irrigation corridors",
        paragraphs: [
          "Southern Alberta's soils can be productive, but climate and water rights decide the ceiling. Dryland grains fit the baseline; irrigated districts along the Oldman and related systems support more intensive crops.",
          "Dryland grain covers most of the plain. The narrower irrigated belts grow sugar beets, potatoes and corn, and there the water licence matters as much as the summer heat.",
        ],
      },
      {
        id: "lethbridge-climate-change",
        title: "Warming does not remove the volatility",
        paragraphs: [
          "Climate change likely reduces the depth and persistence of extreme cold while increasing hot, dry summer stress. The chinook mechanism itself remains tied to mountain-wave and pressure patterns, so volatility is part of the long-term identity rather than a temporary inconvenience.",
          "Lethbridge is less humid and less cold than much of the prairie, and more exposed to drought, wind, smoke and rapid swings in the weather.",
        ],
      },
    ],
    citations: [
      { label: "ECCC Canadian Climate Normals — Lethbridge A 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "University of Lethbridge chinook studies", kind: "academic" },
      { label: "Climate Atlas of Canada — Lethbridge profile", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "Agriculture & Agri-Food Canada — Soil Landscapes of Canada", kind: "other", url: "https://sis.agr.gc.ca/cansis/nsdb/slc/" },
    ],
  },
  "victoria-bc": {
    climateChange: { outlook2050: "Warmer drier summers; irrigation demand up; milder winters.", outlook2100: "Mediterranean character intensifies; water stress emerges.", keyShifts: [{variable: "Summer drought", direction: "up"}, {variable: "Winter warmth", direction: "up"}], resilienceNote: "Among Canada's most climate-resilient major cities for heat." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because ECCC normals, federal terrain/soil context, and atlas relief reasoning agree; site exposure, wildfire smoke, and winter maintenance still need local checks.",
    deepSections: [
      {
        id: "victoria-olympic-shadow",
        title: "Olympic rain shadow at city scale",
        paragraphs: [
          "Victoria's mildness is not just latitude or ocean. The Olympic Mountains remove a large share of Pacific moisture before air crosses the Strait of Juan de Fuca, leaving the Saanich Peninsula brighter and drier than most nearby coastlines.",
          "That rain-shadow geometry explains why gardens, Garry oak meadows, and dry-summer trails sit within sight of much wetter Vancouver Island forests.",
        ],
      },
      {
        id: "victoria-marine-limits",
        title: "Marine limits on heat and cold",
        paragraphs: [
          "The surrounding straits limit both extremes. Winter air arriving over water is softened before reaching the city, while summer sea breezes and cool water suppress the worst afternoon heat compared with inland British Columbia.",
          "Heat domes can still break through, but the baseline remains one of Canada's strongest low-heat urban climates.",
        ],
      },
      {
        id: "victoria-garden-water",
        title: "Garden privilege with a water bill",
        paragraphs: [
          "The long frost-free season supports an unusual mix of figs, palms, camellias, garlic, apples, and Mediterranean herbs. Summer drought is the main garden constraint, not winter cold.",
          "The best sites use soil depth, mulch, and rain storage to carry plants across the dry season. Without that planning, the same rain shadow that creates comfort becomes a water-management problem.",
        ],
      },
    ],
    citations: [
      { label: "ECCC — Victoria Gonzales Heights 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas of Canada — Victoria", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "AAFC Canadian Soil Information Service — Soil Landscapes of Canada", kind: "other", url: "https://sis.agr.gc.ca/cansis/nsdb/slc/" },
    ],
  },
  "tofino-bc": {
    climateChange: { outlook2050: "Warmer winters; possibly slightly drier summers.", outlook2100: "Sea level rise is the defining issue.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Storm intensity", direction: "up"}], resilienceNote: "Hyper-maritime climate buffers heat extremes excellently." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because ECCC normals, federal terrain/soil context, and atlas relief reasoning agree; site exposure, wildfire smoke, and winter maintenance still need local checks.",
    deepSections: [
      {
        id: "tofino-open-pacific",
        title: "Open-Pacific exposure",
        paragraphs: [
          "Tofino faces the Pacific without the inner-coast buffers that protect Vancouver, Victoria, or the Gulf Islands. Winter storms arrive with long fetch, high wave energy, and enough moisture to make rainforest the default vegetation.",
          "The same exposure that makes storm-watching dramatic also keeps summer heat muted. Air has recently crossed cold water before it reaches town.",
        ],
      },
      {
        id: "tofino-rainforest-water",
        title: "Rainforest hydrology and soil",
        paragraphs: [
          "High rainfall, acidic organic soils, and conifer canopy produce a water-rich landscape that is excellent for rainforest species and poor for drought-loving plants. Drainage and root disease matter more than irrigation for many home gardens.",
          "When looking at land, check the stability of the slope and the access in the wet season.",
        ],
      },
      {
        id: "tofino-heat-resilience",
        title: "Cool in a heat wave, exposed in a storm",
        paragraphs: [
          "Tofino stays cool when the rest of the region is hot. Even regional heat events arrive diluted by ocean air compared with inland Vancouver Island or the Lower Mainland.",
          "The cool air comes with exposure to storms, erosion and tsunami. August afternoons average 19°C, and the year's rain comes to about 3000 mm.",
        ],
      },
    ],
    citations: [
      { label: "ECCC — Tofino A 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas of Canada — Pacific coast profiles", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "Canadian Disaster Database — Pacific coastal storm context", kind: "other", url: "https://www.publicsafety.gc.ca/cnt/rsrcs/cndn-dsstr-dtbs/index-en.aspx" },
    ],
  },
  "wolfville-ns": {
    climateChange: { outlook2050: "Longer growing season; more extreme rain events; storm intensification.", outlook2100: "Hurricane/tropical remnant threat grows.", keyShifts: [{variable: "Storm intensity", direction: "up"}, {variable: "Growing season", direction: "up"}], resilienceNote: "Agricultural adaptation is ongoing; storm exposure rising." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because ECCC normals, federal terrain/soil context, and atlas relief reasoning agree; site exposure, wildfire smoke, and winter maintenance still need local checks.",
    deepSections: [
      {
        id: "wolfville-ridge-shelter",
        title: "A valley between two sheltering ridges",
        paragraphs: [
          "The Annapolis Valley is protected by North Mountain and South Mountain, which block some fog and wind from the Bay of Fundy and Atlantic coast. That shelter gives Wolfville more reliable warmth and sun than the open shoreline would suggest.",
          "The fruit belt is therefore a terrain corridor: small enough to miss on a continental map, large enough to support generations of orchards and vineyards.",
        ],
      },
      {
        id: "wolfville-fundy-moderation",
        title: "Fundy tides as climate context",
        paragraphs: [
          "The Bay of Fundy does not make Wolfville warm in a simple way. It delays spring, moderates autumn, adds fog and storm moisture, and raises coastal flood stakes on low ground.",
          "That mix is why apple bloom, grape ripening, and stormwater design all depend on local siting rather than regional averages alone.",
        ],
      },
      {
        id: "wolfville-orchard-future",
        title: "Old orchard country entering a warmer century",
        paragraphs: [
          "Longer seasons help wine grapes and some tender fruit, but warmer winters can reduce chill reliability and increase pest pressure. Heavy rain events also stress valley soils and drainage systems.",
          "Wolfville's advantage is adaptive capacity: a research and farm culture that already understands micro-sites, cultivar shifts, and the difference between valley floor and slope.",
        ],
      },
    ],
    citations: [
      { label: "ECCC — Kentville CDA 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "AAFC Kentville Research and Development Centre", kind: "other", url: "https://agriculture.canada.ca/en/science/agriculture-and-agri-food-research-centres-and-collections/kentville-research-and-development-centre" },
      { label: "Climate Atlas of Canada — Nova Scotia climate projections", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
    ],
  },
  "niagara-on-the-lake": {
    climateChange: { outlook2050: "Longer growing season; hotter summers; heavier rain events.", outlook2100: "Grape varieties shift; traditional ice-wine climate erodes.", keyShifts: [{variable: "Growing season", direction: "up"}, {variable: "Freezes for ice wine", direction: "down"}, {variable: "Heat extremes", direction: "up"}], resilienceNote: "Agricultural adaptation is active." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because ECCC normals, federal terrain/soil context, and atlas relief reasoning agree; site exposure, wildfire smoke, and winter maintenance still need local checks.",
    deepSections: [
      {
        id: "niagara-lake-escarpment",
        title: "Lake below, escarpment behind",
        paragraphs: [
          "The Niagara fruit belt sits in the narrow space where Lake Ontario slows seasonal temperature swings and the escarpment organizes slope drainage. That geometry reduces spring frost risk compared with colder inland pockets and extends autumn ripening.",
          "The belt between the lake and the escarpment is only a few kilometres wide, and most of Ontario's tender fruit comes from it.",
        ],
      },
      {
        id: "niagara-icewine-threshold",
        title: "Icewine and the cold it needs",
        paragraphs: [
          "Icewine needs a hard frost, about −8°C, after a season warm enough to ripen the grapes. Warming helps some red varieties and shoulder-season tourism, but it erodes the cold windows that made the region globally recognizable.",
          "The trend is toward more summer heat, fewer deep freezes and more work against disease and rain.",
        ],
      },
      {
        id: "niagara-humidity-disease",
        title: "Humid summers and vine disease",
        paragraphs: [
          "Niagara is not a dry Mediterranean wine region. Humid summers and lake-influenced storms raise disease pressure in vines and tender fruit, so growers spend much of the season on canopy management and spraying.",
          "For gardeners, the same moisture that helps lush growth also means airflow, drainage, and cultivar choice matter more than in arid orchard valleys.",
        ],
      },
    ],
    citations: [
      { label: "ECCC — Vineland Research Station 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Vineland Research & Innovation Centre", kind: "academic", url: "https://www.vinelandresearch.com/" },
      { label: "Climate Atlas of Canada — Niagara regional projections", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
    ],
  },
  "atlin-lake-bc": {
    climateChange: { outlook2050: "Warmer winters and longer shoulder seasons, with wildfire smoke and glacier-fed hydrology changes increasing.", outlook2100: "Lake and glacier systems shift while the settlement remains cold-season limited.", keyShifts: [{ variable: "Winter cold", direction: "down" }, { variable: "Smoke", direction: "up" }, { variable: "Glacier melt timing", direction: "mixed" }], resilienceNote: "Heat refuge value is strong, but remoteness, cold, and smoke can dominate livability." },
    confidenceNotes: "This moderate-confidence profile is grounded in ECCC northern normals and terrain context, but station sparsity and local lake effects require on-site verification.",
    deepSections: [
      { id: "atlin-lake-moderation", title: "A huge cold lake in a dry northern basin", paragraphs: ["Atlin Lake is the largest natural lake in British Columbia and is fed by glaciers of the Juneau Icefield. It is cold all year. Near the shore it holds back the first autumn frosts and keeps spring late, and it freezes over in winter.", "The town is in the rain shadow of the Coast Mountains and gets about 460 mm of precipitation a year. Winters are cold and fairly dry, with January nights near −16°C. In summer the afternoons reach 17 to 18°C, and in June it hardly gets dark."] },
      { id: "atlin-remoteness-filter", title: "At the end of a 100 km road", paragraphs: ["Atlin has a few hundred residents and is reached by a single road, about 100 km long, from the Alaska Highway in Yukon. Whitehorse, about two and a half hours away, has the nearest hospital, airport and large shops. Winter days are short, heating runs for most of the year, and supplies need planning.", "People who live here have chosen the quiet and the distance. The same distance means a long drive for a dentist or a spare part, on a road that can be icy from October to April."] },
    ],
    citations: [
      { label: "ECCC Canadian Climate Normals", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas of Canada northern projections", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "Natural Resources Canada topographic context", kind: "other", url: "https://natural-resources.canada.ca/maps-tools-and-publications/maps" },
    ],
  },
  "fernie-elk-valley-bc": {
    climateChange: { outlook2050: "Warmer winters, more rain-on-snow events, and rising fire-smoke exposure.", outlook2100: "Snow reliability retreats upslope while flood and fire management become more important.", keyShifts: [{ variable: "Snowpack", direction: "down" }, { variable: "Rain-on-snow", direction: "up" }, { variable: "Smoke", direction: "up" }], resilienceNote: "Mountain relief offers cooler summers but concentrates hazard on slopes, floodplains, and travel corridors." },
    confidenceNotes: "This high-confidence profile uses ECCC normals and official mountain-region context; avalanche, floodplain, and shade exposure remain parcel-scale questions.",
    deepSections: [
      { id: "fernie-snow-machine", title: "Why the Elk Valley holds winter", paragraphs: ["Fernie lies in the Elk Valley at about 1010 m, with the Lizard Range to the west and the main ranges of the Rockies to the east. Moist Pacific air that has already crossed the rest of British Columbia is lifted once more here, and the town gets about 400 cm of snow in a winter. The ski area above it gets more than twice that.", "Snow shapes daily life from November to April. Roofs are steep, clearing is constant, and Highway 3 is sometimes closed for avalanche control. Winter afternoons average about −1°C, so the snow in town is often heavy and wet."] },
      { id: "fernie-valley-hazards", title: "Mild summers and a river that floods", paragraphs: ["Summer is mild: July and August afternoons reach 26 to 27°C and nights fall below 10°C. It is also the season of wildfire smoke, which can fill the valley for days.", "The Elk River runs through town and flooded parts of it in 1995 and again in June 2013. Check whether a house is on the floodplain or on a bench above it, how much winter sun the lot gets, and whether the road has a second way out."] },
    ],
    citations: [
      { label: "ECCC Canadian Climate Normals", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas of Canada mountain-region projections", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "BC Parks - Mount Fernie Provincial Park", kind: "other", url: "https://bcparks.ca/mount-fernie-park/" },
    ],
  },
  "sunshine-coast-bc": {
    climateChange: { outlook2050: "Warmer, drier summers; irrigation demand up.", outlook2100: "Mediterranean drift.", keyShifts: [{variable: "Summer drought", direction: "up"}], resilienceNote: "Moderate resilience." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Sechelt", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "salt-spring-bc": {
    climateChange: { outlook2050: "Warmer drier summers.", outlook2100: "Mediterranean climate deepens.", keyShifts: [{variable: "Summer drought", direction: "up"}], resilienceNote: "Relatively resilient." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Salt Spring Island St Mary Lake", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "summerland-bc": {
    climateChange: { outlook2050: "Hotter drier summers; water pressure.", outlook2100: "Warmer analog.", keyShifts: [{variable: "Heat", direction: "up"}, {variable: "Fire", direction: "up"}], resilienceNote: "Agricultural adaptation ongoing; water is the constraint." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Summerland CDA", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "grand-manan-nb": {
    climateChange: { outlook2050: "Warmer, wetter, stormier.", outlook2100: "SLR and storm exposure rise.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Storms", direction: "up"}], resilienceNote: "Maritime moderation persists; storms intensify." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Grand Manan", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "creston-bc": {
    climateChange: { outlook2050: "Warmer, drier summers.", outlook2100: "More fire.", keyShifts: [{variable: "Fire", direction: "up"}], resilienceNote: "Agricultural valley with good adaptation options." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Creston CDA", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "penticton-bc": {
    climateChange: { outlook2050: "Warmer summers; more fire smoke; wine region expanding.", outlook2100: "Heat stress on orchards.", keyShifts: [{variable: "Fire smoke", direction: "up"}, {variable: "Growing season", direction: "up"}], resilienceNote: "Exceptional soils and water access buffer agriculture." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Penticton 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }, { label: "BCMAF terroir reports", kind: "other" }],
  },
  "kamloops-bc": {
    climateChange: { outlook2050: "Hotter, longer fire seasons.", outlook2100: "Intensifying aridity.", keyShifts: [{variable: "Fire risk", direction: "up"}], resilienceNote: "Fire and drought are primary concerns." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Kamloops AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "nelson-bc": {
    climateChange: { outlook2050: "Warmer; more summer fire smoke.", outlook2100: "Glacier loss affecting summer river flow.", keyShifts: [{variable: "Glacier melt", direction: "up"}], resilienceNote: "Good natural climate buffering." },
    confidenceNotes: "This high-confidence profile is grounded in ECCC normals and Kootenay Lake terrain context; smoke exposure, slope shade, and lake-adjacent winter conditions need neighborhood checks.",
    citations: [
      { label: "ECCC Canadian Climate Normals — Nelson Rixen Creek context", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas of Canada — West Kootenay projections", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "BC Parks — Kokanee Glacier regional context", kind: "other", url: "https://bcparks.ca/kokanee-glacier-park/" },
    ],
    deepSections: [
      {
        id: "nelson-lake-selkirk-moderation",
        title: "A deep lake at the foot of the Selkirks",
        paragraphs: [
          "Nelson is on the West Arm of Kootenay Lake, in a narrow valley of the Selkirk Mountains. The main lake is deep and does not freeze, and the water takes the edge off winter nights near the shore. January lows average about −4°C, mild for the interior of British Columbia.",
          "The effect is local. The town is built on a steep slope that faces north across the water, and in midwinter parts of it get little direct sun. A shaded street high on the hill holds ice long after the lakeshore has cleared, and gardens there start later.",
        ],
      },
      {
        id: "nelson-smoke-snow-tradeoff",
        title: "Smoke, snow and a small-town service base",
        paragraphs: [
          "The town has a compact centre of brick and stone buildings from the 1890s mining boom and the Whitewater ski area about 20 km away. July and August afternoons are 28 to 29°C, and nights cool to 12°C.",
          "Wildfire smoke is the main summer drawback. In bad fire years it settles in the valley for days or weeks in July and August. The town gets about 250 cm of snow in a winter, and steep driveways and stairs need clearing. The hospital is small. Specialist care and most flights mean a trip to Trail, Castlegar or Kelowna, and the Castlegar airport is often closed by low cloud in winter.",
        ],
      },
    ],
  },
  "revelstoke-bc": {
    climateChange: { outlook2050: "Snow-line rising; rainier winters.", outlook2100: "Potential significant snow loss.", keyShifts: [{variable: "Snowpack", direction: "down"}], resilienceNote: "Snow-economy at risk." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Revelstoke 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "tofino-ucluelet-corridor": {
    climateChange: { outlook2050: "Sea-level rise; storm intensity uncertain.", outlook2100: "Continued moderation with rising sea.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Storm intensity", direction: "mixed"}], resilienceNote: "Temperature regime extraordinarily resilient." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Tofino AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "qualicum-bc": {
    climateChange: { outlook2050: "Warmer, slightly drier summers.", outlook2100: "Mediterranean character intensifying.", keyShifts: [{variable: "Summer dry season", direction: "up"}], resilienceNote: "Among Canada's most climate-resilient regions." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    deepSections: [
      {
        id: "qualicum-rain-shadow",
        title: "How the island spine steals the rain",
        paragraphs: [
          "Pacific moisture hits the western slopes first; by the time air subsides over the Strait of Georgia side, much of the water has already fallen. That is why Qualicum has dry summers while communities on the outer coast, across the island, record rainforest totals.",
          "East-side winters are grey but not as endlessly sodden as the outer west coast; summers reward you with clearer skies and a real dry window for decks, tomatoes, and outdoor work.",
        ],
      },
      {
        id: "qualicum-coastal-moderation",
        title: "Salish Sea moderation without downtown Victoria heat",
        paragraphs: [
          "Marine air caps extreme heat — heat waves that roast interior BC often arrive here as warm but tolerable afternoons. The trade-off is humidity during onshore flow and a smaller diurnal swing than the Okanagan.",
          "If you are comparing retirement towns along the east coast of the island, walk each at the same clock time in August: subtle differences in fetch, elevation above the water table, and tree cover matter as much as the headline Köppen label.",
        ],
      },
    ],
    citations: [{ label: "ECCC — Qualicum Beach AWS", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "prince-rupert-bc": {
    climateChange: { outlook2050: "Slightly warmer, more erratic.", outlook2100: "Sea level pressing harbor.", keyShifts: [{variable: "Sea level", direction: "up"}], resilienceNote: "Temperature regime remarkably stable." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Prince Rupert 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "pincher-creek-ab": {
    climateChange: { outlook2050: "Warmer; drier summers possible.", outlook2100: "Continued warming.", keyShifts: [{variable: "Extreme cold", direction: "down"}], resilienceNote: "Chinook regime is geographically anchored." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Pincher Creek 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "cypress-hills-sk": {
    climateChange: { outlook2050: "Warmer; forest stress possible.", outlook2100: "Island-refuge character potentially eroding.", keyShifts: [{variable: "Forest ecosystem", direction: "mixed"}], resilienceNote: "Elevation provides climatic buffer." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Cypress Hills 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }, { label: "Parks Canada Cypress Hills ecosystem", kind: "other" }],
  },
  "leamington-on": {
    climateChange: { outlook2050: "Longer growing seasons; more intense rain.", outlook2100: "Continued warming.", keyShifts: [{variable: "Heat waves", direction: "up"}], resilienceNote: "Agricultural advantage may strengthen." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Leamington / Harrow AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "thunder-bay-on": {
    climateChange: { outlook2050: "Less lake ice; more rain, less snow; milder winters.", outlook2100: "Boreal shift.", keyShifts: [{variable: "Lake ice", direction: "down"}], resilienceNote: "Superior buffers extremes." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Thunder Bay AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "gaspe-qc": {
    climateChange: { outlook2050: "Milder winters; stronger storms.", outlook2100: "Sea-level pressure on coast.", keyShifts: [{variable: "Storm intensity", direction: "up"}], resilienceNote: "Wind and storm exposure is primary concern." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Gaspé AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "st-johns-nl": {
    climateChange: { outlook2050: "Warmer winters; storm pattern uncertain.", outlook2100: "Labrador Current changes could reshape climate.", keyShifts: [{variable: "Storm track", direction: "mixed"}], resilienceNote: "Oceanic moderation provides some buffer." },
    deepSections: [
      {
        id: "st-johns-fog-wind-lifestyle",
        title: "Fog, wind and wet snow",
        paragraphs: [
          "St. John's faces the open Atlantic near the place where the cold Labrador Current meets warmer water from the south. Fog forms over that boundary and comes ashore most often in spring and early summer. The city is among the windiest and foggiest in Canada. July afternoons average 21°C.",
          "Winter is not severely cold for Canada, with afternoons near 0°C and nights near −6°C, but about 350 cm of snow falls, much of it wet and heavy. In January 2020 a single storm dropped about 76 cm in a day and shut the city for a week.",
        ],
      },
      {
        id: "st-johns-service-depth",
        title: "A capital city on the edge of the island",
        paragraphs: [
          "St. John's is the provincial capital and has the province's main hospitals, Memorial University, an international airport and a large share of its jobs. A storm that would cut off a small outport for days is an interruption here.",
          "Within the city, conditions vary over a few blocks. Streets on the hills above the harbour take more wind and are steep in ice. Low ground collects meltwater in basements. Look at the slope, the exposure to wind, where the snow can be piled and whether the basement has been wet.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — St. John's AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "whitehorse-yt": {
    climateChange: { outlook2050: "Winters warming fast; permafrost degrading.", outlook2100: "Significant ecosystem transformation.", keyShifts: [{variable: "Winter cold", direction: "down"}, {variable: "Permafrost", direction: "down"}], resilienceNote: "Subarctic climate among fastest-warming on Earth." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because ECCC normals, federal terrain/soil context, and atlas relief reasoning agree; site exposure, wildfire smoke, and winter maintenance still need local checks.",
    deepSections: [
      {
        id: "whitehorse-rain-shadow-north",
        title: "A dry subarctic rain shadow",
        paragraphs: [
          "Whitehorse is far north, but its dryness comes from the Coast Mountains. Moist Pacific air loses much of its water before reaching the Yukon River valley, leaving a cold, bright, low-precipitation subarctic climate.",
          "That is why winter can feel sharper and clearer than wetter northern coasts, with aurora viewing favored by the same dry air that limits agriculture.",
        ],
      },
      {
        id: "whitehorse-daylight-season",
        title: "Daylight rewrites the growing season",
        paragraphs: [
          "The frost-free season is short, but summer days are long enough to push hardy crops quickly. Gardens succeed by compressing the calendar: raised beds, row cover, cold-hardy greens, potatoes, and fast cultivars.",
          "The lived season is therefore less about average warmth than about long light, spring timing, and how abruptly autumn shuts the window.",
        ],
      },
      {
        id: "whitehorse-permafrost-fire",
        title: "Permafrost, smoke, and infrastructure",
        paragraphs: [
          "Warming in Yukon is not abstract. Permafrost degradation affects roads, foundations, drainage, and slope stability, while longer fire seasons increase smoke risk in a dry boreal setting.",
          "Whitehorse has real climate-buffer value against heat, but the operational risks sit in ground ice, fire weather, and northern supply chains.",
        ],
      },
    ],
    citations: [
      { label: "ECCC — Whitehorse AP 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas Canada", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "Government of Yukon — Climate change in Yukon", kind: "other", url: "https://yukon.ca/en/climate-change-yukon" },
    ],
  },
  "yellowknife-nt": {
    climateChange: { outlook2050: "Rapid winter warming; permafrost degradation.", outlook2100: "Major ecosystem shifts.", keyShifts: [{variable: "Permafrost", direction: "down"}, {variable: "Winter cold", direction: "down"}], resilienceNote: "Most rapidly warming climate region in North America." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Yellowknife AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "churchill-mb": {
    climateChange: { outlook2050: "Sea ice decline dramatically reshaping local climate.", outlook2100: "Bay freeze increasingly absent; polar bear habitat collapse.", keyShifts: [{variable: "Sea ice", direction: "down"}], resilienceNote: "Among fastest-changing regimes on Earth." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Churchill AP", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "prince-edward-co-on": {
    climateChange: { outlook2050: "Longer growing season; more extreme rain.", outlook2100: "Warmer varietal shift.", keyShifts: [{variable: "Growing season", direction: "up"}], resilienceNote: "Emerging climate advantage for cool-climate wine." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Point Petre 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "iqaluit-nu": {
    climateChange: { outlook2050: "Among the fastest-warming places on Earth; winter temperatures up 3–5°C; sea-ice season shortening dramatically.", outlook2100: "Potentially snow-free summers; major implications for food security, hunting, travel on sea ice.", keyShifts: [{ variable: "Sea-ice duration", direction: "down" }, { variable: "Winter extreme cold", direction: "up" }, { variable: "Coastal erosion", direction: "up" }, { variable: "Precipitation", direction: "up" }], resilienceNote: "Climate change is reshaping Arctic life profoundly and rapidly. Adaptation is not optional." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Iqaluit A normal 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }, { label: "Climate Atlas of Canada — Arctic profiles", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" }],
  },
  "inuvik-nt": {
    climateChange: { outlook2050: "Among the fastest-warming places on Earth; permafrost thaw destabilizing infrastructure; longer shoulder seasons.", outlook2100: "Tree-line moving north; community infrastructure facing significant adaptation needs.", keyShifts: [{ variable: "Permafrost integrity", direction: "down" }, { variable: "Summer warmth", direction: "up" }, { variable: "Fire season", direction: "up" }, { variable: "Sea-ice access", direction: "down" }], resilienceNote: "Permafrost is structural — as it thaws, roads, buildings, and ecosystems all reorganize." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Inuvik Climate A 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "haida-gwaii-bc": {
    climateChange: { outlook2050: "Modest warming; ocean acidification significant; storm intensity rising.", outlook2100: "Hyper-maritime character persists; long-term impacts on salmon, forests.", keyShifts: [{ variable: "Storm intensity", direction: "up" }, { variable: "Ocean pH", direction: "down" }, { variable: "Winter rain intensity", direction: "up" }], resilienceNote: "Climatic moderation is robust; cultural/ecological pressures from ocean change are real." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Sandspit A normal 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "medicine-hat-ab": {
    climateChange: { outlook2050: "Hotter, drier summers; more extreme winter warm events; stronger fire weather.", outlook2100: "Aridity approaches desert classification in some projections.", keyShifts: [{ variable: "Summer heat", direction: "up" }, { variable: "Snowpack dependence", direction: "down" }, { variable: "Chinook frequency", direction: "up" }, { variable: "Fire weather", direction: "up" }], resilienceNote: "Sunshine and chinooks remain; water supply becomes the key vulnerability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Medicine Hat A normal 1991–2020", kind: "eccc", url: "https://climate.weather.gc.ca/" }, { label: "Climate Atlas of Canada — prairie sunshine statistics", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" }],
  },
  "twillingate-nl": {
    climateChange: { outlook2050: "Modest summer warming; Labrador Current weakening in some projections, which could substantially change this microclimate.", outlook2100: "If the current regime shifts, this coast could warm significantly; iceberg season shortening.", keyShifts: [{ variable: "Sea temperature", direction: "up" }, { variable: "Iceberg frequency", direction: "mixed" }, { variable: "Storm intensity", direction: "up" }], resilienceNote: "The Labrador Current is the defining feature — its future is the climate's future." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Gander A / Twillingate climate reference", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "kelowna-bc": {
    climateChange: { outlook2050: "Longer frost-free season; higher wildfire smoke exposure.", outlook2100: "Water supply is the binding constraint.", keyShifts: [{ variable: "Fire season", direction: "up" }, { variable: "Growing degree days", direction: "up" }], resilienceNote: "Okanagan water governance is evolving under climate stress." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Kelowna UBC Okanagan / airport", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "squamish-bc": {
    climateChange: { outlook2050: "Warmer storms; landslide risk increases on saturated slopes.", outlook2100: "Snowline rises; rain-on-snow events more frequent.", keyShifts: [{ variable: "Pine beetle pressure", direction: "up" }], resilienceNote: "Terrain-focused hazards dominate." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Squamish Airport", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "banff-ab": {
    climateChange: { outlook2050: "Earlier spring melt; glacial retreat visible from town.", outlook2100: "Alpine ecosystem stress.", keyShifts: [{ variable: "Wildfire", direction: "up" }], resilienceNote: "Tourism economy is climate-exposed to wildfire smoke." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Banff CS", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "halifax-ns": {
    climateChange: { outlook2050: "Sea-level and surge risk for waterfront; more intense precipitation.", outlook2100: "Hurricane decay tracks may shift.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Coastal infrastructure is the front line." },
    deepSections: [
      {
        id: "halifax-urban-maritime-ease",
        title: "A maritime climate with a city's services",
        paragraphs: [
          "Halifax is the largest city in Atlantic Canada, built around a deep harbour that stays free of ice through winter. It has the region's main hospitals, several universities, an international airport and a working port.",
          "The weather is less extreme than at St. John's, which is windier, foggier and cooler in summer. Summer afternoons here average 23 to 24°C and winter nights about −8°C. Fog is most common in late spring and early summer, when warm air moves over the cold water offshore.",
        ],
      },
      {
        id: "halifax-storm-and-housing-friction",
        title: "Storms from several directions, and rising rents",
        paragraphs: [
          "Summer heat is moderate, autumn is clear and crisp, and winter is milder than inland Canada. About 1450 mm of precipitation falls in a year, spread across every month. Winter storms often change from snow to rain and back, and leave slush and ice. Late summer and autumn bring the remains of hurricanes: Juan in 2003, Dorian in 2019 and Fiona in 2022 all brought down trees and cut power.",
          "Housing costs have risen steeply since about 2020, and few rentals are vacant. Many older wooden houses need steady work against damp. The two harbour bridges between Halifax and Dartmouth are congested at rush hour, so check the commute as well as the house.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "ECCC — Halifax Stanfield Intl", kind: "eccc", url: "https://climate.weather.gc.ca/" }],
  },
  "charlottetown-pei": {
    climateChange: { outlook2050: "Coastal erosion on north shore; warmer Gulf waters.", outlook2100: "Sea-level rise threatens low-lying farms.", keyShifts: [{ variable: "Ice duration", direction: "down" }], resilienceNote: "Island infrastructure is exposed to storms." },
    deepSections: [
      {
        id: "charlottetown-island-service-anchor",
        title: "The island's capital and service town",
        paragraphs: [
          "Charlottetown has about 40,000 people and is the capital of Prince Edward Island. The island's main hospital, its university, the provincial government and the airport are all here, and the centre is small enough to walk.",
          "That matters most in winter. January and February afternoons average −2°C and nights −10°C, snow drifts across the open farmland, and country roads can be blocked for a day or two after a storm. In town, shops and medical care stay within reach. The Confederation Bridge to New Brunswick restricts high-sided vehicles in strong wind.",
        ],
      },
      {
        id: "charlottetown-seasonal-lag-and-coast",
        title: "A late spring, a long autumn and a soft coastline",
        paragraphs: [
          "The southern Gulf of St. Lawrence freezes over in winter, and ice lingers offshore into April. Spring is late and cool as a result: April afternoons average 8°C. The water then warms through summer and holds its heat, so September afternoons still average 20°C and the first frosts come late.",
          "The island is made of soft red sandstone, and its shores erode readily. Post-tropical storm Fiona in September 2022 cut metres off dunes and cliffs and brought down trees across the province. For any property near the water, check the elevation, the distance from the bank and the erosion history.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "ECCC - Charlottetown climate data", kind: "eccc", url: "https://climate.weather.gc.ca/" },
      { label: "City of Charlottetown - municipal services", kind: "other", url: "https://www.charlottetown.ca/" },
      { label: "Government of PEI - erosion and flooding", kind: "other", url: "https://www.princeedwardisland.ca/en/information/land-and-environment/erosion-and-flooding" },
    ],
  },
  "baie-saint-paul-qc": {
    climateChange: { outlook2050: "Longer growing season and heavier rain events; winter snow becomes more variable.", outlook2100: "Estuary and slope hazards become more important as freeze-thaw and intense precipitation increase.", keyShifts: [{ variable: "Freeze-thaw", direction: "up" }, { variable: "Growing season", direction: "up" }, { variable: "Heavy rain", direction: "up" }], resilienceNote: "Cool-water influence buffers heat, but slope and river-flood diligence matter." },
    confidenceNotes: "Station coverage is regional rather than perfectly town-specific; estuary and slope effects are interpreted from ECCC normals plus terrain and Climate Atlas context.",
    deepSections: [
      {
        id: "baie-estuary-relief",
        title: "Estuary air against Charlevoix relief",
        paragraphs: [
          "The St. Lawrence estuary behaves like a cold-water climate boundary. On summer afternoons it mutes heat; in winter it feeds moisture and wind into storms approaching the Charlevoix hills.",
          "Because the town sits at a river mouth, small shifts from flats to slopes change frost, fog, snow drifting, and garden performance.",
        ],
      },
      {
        id: "baie-orchard-smallholding",
        title: "Small orchards in a cold-country pocket",
        paragraphs: [
          "Baie-Saint-Paul is not Niagara or the Okanagan. Its growability comes from protected benches, hardy cultivars, and careful use of aspect rather than raw heat.",
          "The exact site decides whether a garden here is merely cold or productive, and a sheltered south-facing bench does far better than an open flat beside the estuary.",
        ],
      },
      {
        id: "baie-hazard-diligence",
        title: "Steep terrain and a river that floods",
        paragraphs: [
          "The same terrain brings hazards: river flooding, slope drainage, freeze-thaw on roads and storms off the estuary. The Rivière du Gouffre flooded part of the town in May 2023.",
          "The best sites are not necessarily closest to the water. They are the ones with enough elevation, wind shelter, and soil depth to use the microclimate without inheriting the wettest hazard layer.",
        ],
      },
    ],
    citations: [
      { label: "ECCC Canadian Climate Normals — Charlevoix and Quebec station context", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas of Canada — Charlevoix regional projections", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
      { label: "AAFC Canadian Soil Information Service — Soil Landscapes of Canada", kind: "other", url: "https://sis.agr.gc.ca/cansis/nsdb/slc/" },
    ],
  },
  "dawson-city-yt": {
    climateChange: { outlook2050: "Rapid winter warming and permafrost stress.", outlook2100: "Major boreal ecosystem shift; river ice and ground stability change.", keyShifts: [{ variable: "Permafrost", direction: "down" }, { variable: "Fire weather", direction: "up" }], resilienceNote: "Heat refuge value exists, but infrastructure is ground-ice exposed." },
    confidenceNotes: "Tier C entry — regional station coverage is strong enough for settlement-scale climate screening, but permafrost and flood diligence are parcel-specific.",
    citations: [
      { label: "ECCC Canadian Climate Normals — Dawson station context", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Government of Yukon — Climate change in Yukon", kind: "other", url: "https://yukon.ca/en/climate-change-yukon" },
    ],
  },
  "morden-mb": {
    climateChange: { outlook2050: "Longer growing season and more heat, with spring flood and drought volatility.", outlook2100: "Prairie crop envelope shifts north, but water extremes intensify.", keyShifts: [{ variable: "Heat units", direction: "up" }, { variable: "Drought", direction: "up" }], resilienceNote: "Good agricultural adaptability, but still exposed to prairie extremes." },
    confidenceNotes: "Tier C entry — station and agricultural context support the warm-pocket read, but escarpment-scale effects need site verification.",
    citations: [
      { label: "ECCC Canadian Climate Normals — Morden and southern Manitoba station context", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "AAFC Canadian Soil Information Service — Soil Landscapes of Canada", kind: "other", url: "https://sis.agr.gc.ca/cansis/nsdb/slc/" },
    ],
  },
  "sutton-qc": {
    climateChange: { outlook2050: "Longer shoulder seasons; more freeze-thaw and heavier rain.", outlook2100: "Hardiness improves, but snow reliability and forest composition shift.", keyShifts: [{ variable: "Freeze-thaw", direction: "up" }, { variable: "Snowpack", direction: "down" }], resilienceNote: "Topographic options help, but winter recreation and forest health are climate-exposed." },
    confidenceNotes: "Tier C entry — local topography creates strong site effects; use ECCC and Climate Atlas as regional scaffolding, then verify parcel exposure.",
    citations: [
      { label: "ECCC Canadian Climate Normals — Eastern Townships station context", kind: "eccc", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
      { label: "Climate Atlas of Canada — southern Quebec projections", kind: "climate-atlas-canada", url: "https://climateatlas.ca/" },
    ],
  },
};
