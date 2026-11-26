// ============================================================
// Terraclima — profile-only fields of the US places
// ============================================================
// Sources (citations), confidence notes, the climate-change outlook and the
// In depth chapters. They are read only by a place's profile, Compare and
// exports, so they live here and load when one of those opens, instead of
// with the atlas on first load. Edit them here; the rest of each place stays
// in its places file. Keyed by place id.
// ============================================================

import type { AuthoredProfileExtras } from "./types";

export const PROFILE_EXTRAS_USA: Record<string, AuthoredProfileExtras> = {
  "sequim-wa": {
    climateChange: {
      outlook2050: "Mild warming and modestly drier summers projected. Growing season extends into early November; frost becomes rarer. Irrigation demand rises sharply as summer precip declines.",
      outlook2100: "Continued warming (+2 to +3°C on summers), increased evaporative demand, and possible Olympic snowpack declines threaten summer streamflow for irrigation. The rain shadow persists; the dryness does not go away — it intensifies in summer.",
      keyShifts: [
        { variable: "Summer dry-season length", direction: "up", note: "Longer, drier summers." },
        { variable: "Olympic snowpack", direction: "down", note: "Affects Dungeness River late-summer flow." },
        { variable: "Winter rain intensity", direction: "up" },
        { variable: "Wildfire smoke days", direction: "up", note: "From regional fires, not local ignitions." },
      ],
      resilienceNote: "Marine moderation buffers Sequim from extreme heat. Irrigation supply — not rainfall — is the primary climate-change pressure.",
    },
    confidenceNotes: "Sequim is one of the best-studied rain-shadow microclimates in North America. Station data at WA Sequim 2 E (USC00457544) and PRISM agree well on the precipitation anomaly.",
    citations: [
      { label: "NOAA Climate Normals 1991–2020 — Sequim 2 E", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "PRISM 30-year normals precipitation grid", kind: "prism", url: "https://prism.oregonstate.edu/normals/" },
      { label: "USDA Plant Hardiness Zone Map 2023", kind: "usda", url: "https://planthardiness.ars.usda.gov/" },
      { label: "Washington State Climatologist — Olympic rain-shadow notes", kind: "academic", url: "https://climate.washington.edu/" },
    ],
    deepSections: [
      {
        id: "sequim-air-masses",
        title: "Air masses, fronts, and the Olympic barrier",
        paragraphs: [
          "In winter and spring, mid-latitude cyclones approach the Pacific Northwest with deeply maritime air. The Olympic Mountains act as a towering wall: saturated westerly flow lifts on windward slopes, wringing out thousands of millimetres on the Quinault and Hoh. Air that reaches the northern rain-shadow has already surrendered most of its water; subsidence and downslope drying further warm and clear it. That is why Sequim can sit under high pressure with crisp visibility while Forks, about 95 km to the west, records another soaking day.",
          "Summer brings a different rhythm: the North Pacific subtropical high strengthens, and the strait becomes a corridor for cool, stable northwesterlies. June can still feel muted — the Pacific Northwest ‘June gloom’ reaches Sequim in softened form — but July and August are genuinely dry. The combination of rain-shadow subsidence and strait ventilation keeps afternoon highs modest even when interior Washington and Oregon bake.",
        ],
      },
      {
        id: "sequim-hydrology",
        title: "Hydrology, irrigation, and snowpack teleconnections",
        paragraphs: [
          "Annual precipitation near 475 mm is far below crop demand for most row crops; the Dungeness River and its glacial outwash aquifers are the economic backbone of the valley. Summer irrigation demand rises with temperature and evaporation just as natural recharge is minimal — a classic Mediterranean-style water stress pattern transposed onto the cool Pacific margin.",
          "Olympic snowpack on the Bailey Range and Mount Olympus is the upstream reservoir. Mid-century warming projects earlier melt and tighter late-summer streamflow — a direct challenge for irrigated agriculture and salmon habitat in the lower Dungeness. The microclimate story is not only about rainfall totals; it is about when water arrives and when it does not.",
        ],
      },
      {
        id: "sequim-ecology",
        title: "Ecology, land use, and the lavender belt",
        paragraphs: [
          "The rain-shadow mosaic blends temperate grassland openings, Douglas-fir and Garry oak patches, and intensive agriculture. Commercial lavender production took off partly because dry summers and mild winters mimic Mediterranean production regions without continental heat. The same dryness that delights gardeners stresses native forest regeneration — fire historically played a smaller role here than east of the Cascades, but regional wildfire smoke is now a recurring summer air-quality issue.",
          "Bird migration along the Strait of Juan de Fuca is intense: raptors use thermals on the Olympic lee, and shorebirds stage on tidal flats. The climatic contrast between Sequim and the windward coast is mirrored in vegetation within a short drive — a living lab for orographic effects.",
        ],
      },
      {
        id: "sequim-methods",
        title: "How we know — stations, PRISM, and residual uncertainty",
        paragraphs: [
          "Sequim 2 E (USC00457544) anchors the lowland signal; PRISM grids capture the sharp gradient toward the Hoh. Residual uncertainty lies in garden-level frost on radiative nights — local cold-air pooling in the Dungeness valley can dip below grid expectations, especially under clear, calm inversions after snow in the Olympics.",
          "Confidence in the rain-shadow magnitude is high; confidence in any single farm’s last frost date remains moderate because micro-scale topography within the lowland still matters at the 100–500 m scale.",
        ],
      },
      {
        id: "sequim-strait-ventilation",
        title: "Strait ventilation, ebb-and-flood breezes, and the Olympic lee",
        paragraphs: [
          "The Strait of Juan de Fuca is not merely a water body — it is a pressure-gradient corridor. When interior British Columbia builds summer high pressure and the Pacific maintains lower pressure offshore, the strait funnels cool, stable northwesterlies onto the northern Olympic lowland. Those breezes cap afternoon heating and keep relative humidity from collapsing the way it does in California’s interior valleys.",
          "Tidal and local sea-breeze circulations add a second, finer-scale rhythm: onshore components strengthen on many summer afternoons even when synoptic flow is weak. For gardeners, that means afternoon relief and reduced heat stress on crops that would scorch in a continental rain shadow at the same latitude.",
        ],
      },
    ],
  },
  "portal-az": {
    climateChange: {
      outlook2050: "Warmer nights and extended fire seasons. Monsoon expected to shift later and become more erratic — fewer, heavier storms rather than steady rhythm. Drought intensification in pre-monsoon window.",
      outlook2100: "Significant ecosystem migration upslope; lower Madrean oaks may retreat hundreds of meters uphill. Fire regime change is the dominant threat — sky islands are uniquely fire-vulnerable because species have nowhere higher to go.",
      keyShifts: [
        { variable: "Pre-monsoon drought", direction: "up" },
        { variable: "Monsoon timing", direction: "mixed", note: "Arrival shifting later; intensity uncertain." },
        { variable: "Fire frequency/severity", direction: "up" },
        { variable: "Summit snowpack", direction: "down" },
      ],
      resilienceNote: "Sky islands are both stunning and fragile. Elevation buffers summit climates, but fire and drought pressure the system from below.",
    },
    confidenceNotes: "Portal/Rodeo climate values use RAWS and USHCN data; summit data extrapolated from Chiricahua NM stations.",
    citations: [
      { label: "NOAA RAWS — Portal 4 SW", kind: "noaa", url: "https://raws.dri.edu/" },
      { label: "PRISM gridded climate", kind: "prism", url: "https://prism.oregonstate.edu/" },
      { label: "USFS Southwestern Region sky-island vegetation surveys", kind: "academic", url: "https://www.fs.usda.gov/r3/" },
      { label: "Warshall, P. 'The Madrean Sky Island Archipelago' (1995)", kind: "academic" },
    ],
    deepSections: [
      {
        id: "portal-monsoon",
        title: "North American Monsoon — dynamics at the range edge",
        paragraphs: [
          "From late June into September, subtropical moisture penetrates northwest Mexico and the southwestern US. The Chiricahuas intercept that flow: orographic lifting triggers afternoon convection that can be hyper-local — rain on the south face while the San Simon valley stays sun-baked. Lightning ignitions and flash floods in arroyos are the flip side of the monsoon’s generosity.",
          "Pre-monsoon May and June are the stress window: extreme heat, low humidity, and high fire danger before the first reliable storms. Climate projections emphasize longer, drier pre-monsoon windows even when total monsoon moisture does not collapse — a recipe for ecological stress.",
        ],
      },
      {
        id: "portal-vertical-climate",
        title: "Vertical climate stacking and rhyolite terrain",
        paragraphs: [
          "Roughly 1,500 m of relief within a few kilometres produces a full Madrean vertical sequence: desert scrub and sycamore-ash riparian in the canyon mouths, oak-pine woodlands mid-slope, mixed conifer and fir on cool north aspects near the crest. Temperatures fall roughly 6–7°C per 1,000 m of ascent — enough to move mean annual temperature from basin heat to montane coolness in one hike.",
          "Rhyolitic hoodoos and jointed cliffs add micro-shade and radiative cooling at dawn; canyon bottoms pool cold air on clear nights, so Portal’s morning minima can diverge sharply from exposed ridges only hundreds of metres above.",
        ],
      },
      {
        id: "portal-research",
        title: "Field science, birding economy, and fire memory",
        paragraphs: [
          "The Southwestern Research Station and a constellation of feeder networks have made Cave Creek one of the most sampled bird communities in North America. The same sky-island structure that concentrates species also concentrates fire risk — the 2011 Horseshoe Two Fire reshaped thousands of hectares of habitat and debris-flow hazard.",
          "Ecotourism and research are now co-equal economic drivers with ranching. Understanding the microclimate is not academic; it determines trail access after storms, fire closures, and hummingbird migration timing.",
        ],
      },
      {
        id: "portal-borderlands-water",
        title: "Bootheel hydrology, grazing, and the San Pedro–Animas groundwater story",
        paragraphs: [
          "Portal sits at the hinge between the San Simon and Animas basins — ranching country where shallow alluvium and fractured volcanic aquifers hold just enough water to support cottonwood corridors and human settlement. Summer monsoon storms recharge arroyos episodically; the rest of the year, baseflow and wells carry the landscape.",
          "That hydrologic thin margin is why fire and drought compound so quickly: vegetation stress in the foothills propagates into sediment yield in Cave Creek after burns. The sky-island climate is glorious on paper, but its lived resilience is tied to groundwater, grazing history, and post-fire recovery in the same canyon walls that shelter the village.",
        ],
      },
    ],
  },
  "huachuca-az": {
    climateChange: {
      outlook2050: "Warmer nights, extended fire seasons, monsoon timing increasingly erratic.",
      outlook2100: "Upslope ecosystem shifts; San Pedro baseflow under pressure from regional aquifer drawdown.",
      keyShifts: [
        { variable: "Pre-monsoon drought", direction: "up" },
        { variable: "Fire risk", direction: "up" },
        { variable: "San Pedro baseflow", direction: "down" },
      ],
      resilienceNote: "Elevation protects human comfort, but the San Pedro riparian corridor depends on a shared aquifer under growing municipal demand.",
    },
    confidenceNotes: "Values reflect Sierra Vista Muni/Fort Huachuca and Hereford stations 1991–2020; summit data extrapolated from Huachuca Peak and Carr Canyon.",
    citations: [
      { label: "NOAA — Sierra Vista / Fort Huachuca coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "USFS Coronado National Forest — Huachuca ecosystem", kind: "academic" },
      { label: "San Pedro Riparian NCA — BLM", kind: "other", url: "https://www.blm.gov/programs/national-conservation-lands/arizona/san-pedro" },
      { label: "Tucson Audubon — Southeast Arizona birding site guides", kind: "field-observation" },
    ],
    deepSections: [
      {
        id: "huachuca-san-pedro",
        title: "San Pedro River — last free-flowing desert lifeline",
        paragraphs: [
          "The San Pedro is one of the few perennial desert rivers in the US without a major mainstem dam. Cottonwood-willow gallery forest along the corridor creates a humid, cool island at dawn relative to the mesquite uplands — a classic riparian microclimate embedded in arid country. Baseflow depends on regional aquifers stressed by municipal pumping and climate-driven evaporation.",
          "Migratory birds treat the corridor as a north–south highway; the hydrology and microclimate are inseparable — lose water and you unravel the entire biotic community within a few hot seasons.",
        ],
      },
      {
        id: "huachuca-urban-military",
        title: "Fort Huachuca, Sierra Vista, and local heat budgets",
        paragraphs: [
          "Sierra Vista’s built area and irrigated turf modify nocturnal temperatures relative to open desert — a mild urban heat island, partly offset by elevation. Military land buffers large blocks from suburban sprawl, preserving dark skies and limiting road dust that would otherwise nucleate haze.",
          "Training schedules and aviation can affect noise and access, but climatologically the fort’s footprint is secondary to elevation and monsoon timing for human comfort.",
        ],
      },
      {
        id: "huachuca-biogeography",
        title: "Sky-island biogeography and the Mexico connection",
        paragraphs: [
          "Species richness peaks where Madrean woodlands connect across the international boundary — hummingbirds, trogons, and oaks do not respect passports. Climate change pushes elevational bands upward; sky islands are finite: species that run out of mountain have nowhere else to go.",
          "Huachuca’s scientific value is the combination of accessibility (roads to mid-elevation trailheads) and intact vertical habitat — a living textbook for orographic precipitation and monsoon convection.",
        ],
      },
    ],
  },
  "monterey-ca": {
    climateChange: {
      outlook2050: "Upwelling may intensify temporarily in some projections, keeping coastal summer cool — but marine heatwaves and stratification threaten that stability. Wildfire smoke episodes increase.",
      outlook2100: "High uncertainty: some scenarios preserve cool-summer coast, others show weakening upwelling and meaningful warming. Acidification and ecosystem stress on the marine shelf are near-certain.",
      keyShifts: [
        { variable: "Marine heatwaves", direction: "up" },
        { variable: "Summer fog frequency", direction: "mixed", note: "Some research suggests fog has declined over the past century." },
        { variable: "Wildfire smoke", direction: "up" },
        { variable: "Sea level", direction: "up" },
      ],
      resilienceNote: "Among the most climate-resilient lived environments in California for heat — but increasingly affected by smoke, fire on the Santa Lucia flanks, and coastal erosion.",
    },
    confidenceNotes: "Dense NOAA network coverage; Monterey Peninsula Airport station provides high-quality normals.",
    citations: [
      { label: "NOAA Climate Normals 1991–2020 — Monterey Peninsula AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "NOAA Coastal Upwelling Index (PFEL)", kind: "noaa", url: "https://www.pfeg.noaa.gov/products/PFEL/modeled/indices/upwelling/upwelling.html" },
      { label: "NOAA Office for Coastal Management — Sea Level Rise Viewer", kind: "noaa", url: "https://coast.noaa.gov/slr/" },
      { label: "USDA Hardiness Zone Map 2023", kind: "usda", url: "https://planthardiness.ars.usda.gov/" },
    ],
    deepSections: [
      {
        id: "monterey-upwelling",
        title: "California Current, upwelling, and cold sea-surface temperatures",
        paragraphs: [
          "Equatorward surface transport in the California Current draws deep, nutrient-rich water toward the surface along the central coast — the same process that feeds kelp forests and cold-water fisheries. Near Monterey Canyon, bathymetry and wind-stress curl intensify upwelling filaments; sea-surface temperatures in summer can sit near 10–14°C only a few kilometres offshore.",
          "That cold water is the thermodynamic anchor for the marine layer: warm air aloft over cold water yields strong inversions, capping stratus and fog until solar heating or offshore flow breaks the cap.",
        ],
      },
      {
        id: "monterey-diurnal-marine-layer",
        title: "Diurnal cycle of the marine layer — why August feels like spring",
        paragraphs: [
          "Overnight, longwave cooling and onshore flow deepen the stratus; mornings are gray and cool. By mid-morning, solar absorption on land strengthens the thermal contrast that eventually erodes the inversion — the layer retreats offshore, revealing blue sky while Salinas and inland valleys heat rapidly. Afternoon onshore breezes can rebuild fog at the immediate shoreline while a few kilometres inland stays clear.",
          "This oscillation inverts the seasonal expectation many newcomers carry: summer is the cool, cloudy season at the water’s edge; the warmest, sunniest afternoons for coastal residents often arrive in autumn when offshore flow weakens.",
        ],
      },
      {
        id: "monterey-fog-ecology",
        title: "Fog drip, redwoods, and coastal prairie",
        paragraphs: [
          "Coast redwoods and closed-cone pines along canyons intercept fog droplets that supplement summer rainfall — a hidden hydrologic input not captured in rain-gauge totals alone. Prairie openings on warmer, drier aspects host rare endemic plants tuned to wind and salt spray.",
          "The ecological edge between fog-fed forest and Salinas Valley heat is sharp enough to measure in plant community turnover across a single afternoon drive.",
        ],
      },
      {
        id: "monterey-coastal-hazards",
        title: "Coastal hazards — erosion, SLR, and atmospheric rivers",
        paragraphs: [
          "Monterey Bay’s sandy bluffs and soft cliffs respond quickly to storm waves and El Niño winters. Atmospheric river events deliver most annual precipitation in a handful of intense storms — useful for reservoirs inland, erosive at the coast. Sea-level rise amplifies surge reach in the harbor and low marina districts.",
          "Planning here is explicitly climate-aware: wastewater, desalination, and harbor infrastructure must anticipate both warmer offshore waters and higher baseline sea level over infrastructure lifetimes.",
        ],
      },
      {
        id: "monterey-salinas-coupling",
        title: "Salinas Valley heat, coastal stratus, and the agricultural fog economy",
        paragraphs: [
          "Monterey’s cool shore is inseparable from the Salinas River corridor’s summer warmth twenty minutes inland. The same subsidence inversion that traps stratus at the coast allows solar heating to run freely once the marine layer tears eastward — producing the continent’s sharpest short-distance vegetable and berry economy. Growers time plantings to the stratus calendar: leaf crops and brassicas hug the fog belt; heat-demanding row crops push slightly inland where GDD accumulates.",
          "Fog drip on coastal terraces and canyon redwoods supplements gauge-captured rainfall for perennial systems — a hidden moisture budget embedded in orchard and vineyard siting. Climate change questions here are as much about fog frequency and offshore stratification as about mean temperature.",
        ],
      },
    ],
  },
  "black-mountain-nc": {
    climateChange: {
      outlook2050: "Warmer winters, hotter summers (with more overnight minima above 20°C), and heavier convective rainfall. Growing season lengthens but disease pressure rises.",
      outlook2100: "Southern Appalachians identified as a relative climate refuge within the eastern US: warming is moderate and water is not limiting. Ecosystem migration (spruce-fir decline on ridges) is a key signal.",
      keyShifts: [
        { variable: "Heavy rain events", direction: "up" },
        { variable: "Cold-night frequency", direction: "down" },
        { variable: "Fungal disease pressure", direction: "up" },
        { variable: "Spruce-fir range", direction: "down", note: "Mt. Mitchell forests under stress." },
      ],
      resilienceNote: "Among the eastern US's better climate refuges. Elevation provides thermal flexibility; rainfall is abundant; relief buffers extreme single-event heat.",
    },
    confidenceNotes: "Excellent station coverage (Asheville Regional, Mt. Mitchell, Black Mountain coop). Thermal-belt deltas are well-documented in Southern Appalachian horticultural literature.",
    citations: [
      { label: "NOAA Climate Normals 1991–2020 — Asheville Regional AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "USDA Plant Hardiness Zone Map 2023", kind: "usda", url: "https://planthardiness.ars.usda.gov/" },
      { label: "Cogbill, C. et al. — Southern Appalachian cold-air drainage studies", kind: "academic" },
      { label: "FEMA National Risk Index (Buncombe County)", kind: "fema", url: "https://www.fema.gov/flood-maps" },
    ],
    deepSections: [
      {
        id: "black-mountain-drainage",
        title: "Cold-air drainage and the mid-slope thermal belt",
        paragraphs: [
          "On clear, calm nights the Swannanoa Valley behaves like a shallow lake of dense air. Katabatic flow slides off surrounding slopes and accumulates on the floor; the coldest pockets sit where topography blocks exit drainage. Mid-slope benches between roughly 650 and 900 m often sit above that pool — not because they are warmer in absolute energy terms, but because they exchange air with the broader slope circulation and avoid the deepest stagnation.",
          "Orchardists learned this empirically: bloom dates on mid-slopes can run one to three weeks ahead of the floor, enough to dodge a late frost that would wipe out valley apples. The same geometry repeats across the Southern Appalachians, but the Black Mountains add a second control — proximity to very high relief just to the north steepens lapse-rate gradients and sharpens fog/cloud caps on ridges while leaving thermal-belt afternoons comparatively sunny.",
        ],
      },
      {
        id: "black-mountain-orographic",
        title: "Orographic rain and the Black Mountains wall",
        paragraphs: [
          "Southwesterly flow ahead of mid-latitude systems and moisture tongues from the Gulf stream moisture up the Blue Ridge escarpment. The Black Mountains include the highest summits east of the Mississippi; windward slopes and convex terrain can receive substantially more annual precipitation than leeward valleys only kilometres away.",
          "For a resident, the signature is experiential: it can be raining on the flank of Mitchell while Black Mountain town stays in broken sun — not magic, just geometry and wind direction interacting with a very rough surface.",
        ],
      },
      {
        id: "black-mountain-hydro",
        title: "Heavy rain, saturated slopes, and landslide hydrology",
        paragraphs: [
          "Warm-season convection and remnant tropical moisture are both efficient at loading Appalachian soils past their shear strength. Intense bursts on already wet antecedent conditions translate into rapid stream rises and debris movement on steep colluvium — the classic Blue Ridge recipe for road closures and hillside failures.",
          "Climate projections for the region emphasize heavier sub-daily rainfall extremes even when seasonal totals shift modestly. That matters more for hazard than for annual averages: landslide recurrence is driven by rare combinations of rain rate and soil moisture, not by mean precipitation alone.",
        ],
      },
      {
        id: "black-mountain-horticulture",
        title: "Cove soils, heritage orchards, and modern gardeners",
        paragraphs: [
          "North-facing coves accumulate deep, organic-rich soil washed from upslope; south-facing benches warm earlier in spring. The thermal belt is not a single line on a map — it is a stack of aspect × slope × soil packages that competent growers read the way sailors read wind.",
          "Contemporary gardeners inherit that knowledge through plant societies, county extension trials, and hardiness-zone maps — but the first-order control remains local cold pooling on radiative nights. The best sites trade a little midsummer heat for spring frost insurance — the defining trade of Appalachian fruit culture.",
        ],
      },
      {
        id: "black-mountain-asheville-metro",
        title: "Asheville metro, tourism pressure, and ridge–valley air quality",
        paragraphs: [
          "The Swannanoa corridor sits immediately east of Asheville’s growing basin — close enough that commuter traffic and wood-smoke episodes occasionally pool under winter inversions alongside natural cold drainage. Ozone and fine-particle pollution in mountain valleys is rarely as severe as in major basins, but terrain channeling still matters for sensitive populations on still January mornings.",
          "Tourism and second-home development push housing onto steeper, forested slopes where landslide risk rises when tropical remnants saturate soils — the same Helene-class events that define modern Appalachian hazard planning. The thermal belt’s climatic advantages come with explicit land-use trade-offs.",
        ],
      },
    ],
  },
  "bishop-ca": {
    climateChange: { outlook2050: "Hotter summers, reduced Sierra snowpack, increasing wildfire smoke from Sierra fires.", outlook2100: "Sierra snowpack decline is the critical variable — the rain shadow stays, but the irrigation supply that makes Bishop livable is directly threatened.", keyShifts: [{variable: "Sierra snowpack", direction: "down"}, {variable: "Summer heat", direction: "up"}, {variable: "Smoke days", direction: "up"}], resilienceNote: "Economic and agricultural resilience is directly tied to the Sierra snowpack above." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA Climate Normals — Bishop AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "California Dept. of Water Resources", kind: "oss-data" }, { label: "USGS Owens Valley studies", kind: "usgs", url: "https://www.usgs.gov/" }],
    deepSections: [
      {
        id: "bishop-sierra-rain-shadow",
        title: "Sierra lee subsidence and the steepest precipitation gradient in the West",
        paragraphs: [
          "Pacific storms approach the range as saturated westerly flow; orographic lift on the windward San Joaquin side wrings out most of the column before air descends into the Owens. Subsidence warms and dries the lee slope — the thermodynamic core of Bishop’s ~130 mm annual precipitation while Mammoth Lakes, about 50 km northwest and 1,200 m higher, gets roughly four times as much.",
          "That gradient is not a curiosity; it is the entire basis of eastern Sierra life: snowpack as distant reservoir, ditches as historical lifeline, and a summer sky so clear that radiative cooling dominates every night.",
        ],
      },
      {
        id: "bishop-los-angeles-aqueduct",
        title: "Owens River hydrology — snowmelt, exports, and the irrigation economy",
        paragraphs: [
          "The Owens Valley’s water story is inseparable from Los Angeles’s imports — a century-long rearrangement of surface flow that still shapes how much native vegetation, ranching, and orchard irrigation can rely on local rivers versus groundwater.",
          "For microclimate interpretation, the point is simple: apparent aridity at Bishop is moderated by engineered flow in ditches and by alluvial aquifers along Bishop Creek. Without that plumbing, the climate numbers would feel even harsher on the ground than they already do.",
        ],
      },
      {
        id: "bishop-eastside-wind",
        title: "Downslope winds, dust, and smoke from the Sierra–White Mountain corridor",
        paragraphs: [
          "Strong pressure gradients across the Sierra crest occasionally produce fierce northeast downslope events — winds that strip snow, raise dust from dry lake beds, and fan wildfire plumes from the range. Smoke from Sierra fires is the summer air-quality signature even when Bishop itself is not burning.",
          "Gardeners and residents learn to read wind direction as a hazard dial: clear nights for cold, windy days for particulates, and monsoon surges from the southeast as the rare moisture exception.",
        ],
      },
    ],
  },
  "flagstaff-az": {
    climateChange: { outlook2050: "Hotter summers, reduced winter snowpack, extended wildfire season. Monsoon onset timing increasingly erratic.", outlook2100: "Major ecosystem stress in ponderosa forests; expansion of fire-dominated regime.", keyShifts: [{variable: "Wildfire season", direction: "up"}, {variable: "Snowpack", direction: "down"}, {variable: "Warm nights", direction: "up"}], resilienceNote: "Cool refuge from Sonoran heat but under growing fire pressure." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA Climate Normals — Flagstaff Pulliam AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USDA Hardiness Map 2023", kind: "usda", url: "https://planthardiness.ars.usda.gov/" }],
    deepSections: [
      {
        id: "flagstaff-peaks-orography",
        title: "San Francisco Peaks orography — split between winter Pacific and summer monsoon",
        paragraphs: [
          "Flagstaff’s ~560 mm of annual precipitation is the Peaks’ doing: winter mid-latitude systems arrive with southwesterly flow that ascends the southwestern flank; summer moisture returns from the Gulf of California and Four Corners region, triggering afternoon convection on the same topography.",
          "The result is a bimodal precipitation personality — snowy cold-season storms and reliable August thunderstorms — unusual for the Southwest’s reputation as a single dry desert.",
        ],
      },
      {
        id: "flagstaff-ponderosa-fire",
        title: "Ponderosa fire ecology and the warming squeeze on snowpack",
        paragraphs: [
          "The world’s largest contiguous ponderosa pine forest surrounds the city — an ecosystem adapted to frequent low-severity fire but now confronting extended high-severity seasons and bark-beetle stress. Fuel loads and housing encroachment into the wildland-urban interface translate climate projections into evacuation maps.",
          "Snowpack on the Peaks is the municipal water-storage buffer; warming shifts snow to rain and advances melt — tightening late-summer streamflow for both ecology and supply.",
        ],
      },
      {
        id: "flagstaff-colorado-plateau",
        title: "Colorado Plateau continentality versus Phoenix Sonoran heat",
        paragraphs: [
          "At 2100 m, Flagstaff sits on the southern edge of the Colorado Plateau — far enough from marine air that diurnal swings stay large, yet high enough to avoid Phoenix’s basin heat. The drive to the low desert is a lesson in lapse rate: each 300 m of descent buys summer warmth most people underestimate until they thermometer-check Sedona or Phoenix.",
          "Winter visitors from Phoenix experience the gradient as relief; summer visitors experience it as escape — the same physics, opposite season.",
        ],
      },
    ],
  },
  "silver-city-nm": {
    climateChange: { outlook2050: "Warming summers, more erratic monsoon, increased fire risk in the Gila.", outlook2100: "Major fire regime reset ongoing; monsoon character remains uncertain.", keyShifts: [{variable: "Fire risk", direction: "up"}, {variable: "Drought", direction: "up"}, {variable: "Monsoon timing", direction: "mixed"}], resilienceNote: "Elevation buffers heat but fire is the long-tail risk." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA Climate Normals — Silver City", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NM State Climate Office", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "silver-city-mogollon-monsoon",
        title: "Mogollon uplift and the North American Monsoon at the Gila’s edge",
        paragraphs: [
          "Silver City sits where the Mogollon–Gila highlands intercept moisture surging north from Mexico in July and August. Orographic lifting organizes afternoon storms that can drench one canyon while leaving the Mimbres basin sunlit — the same spatial lottery that defines Sky Island country.",
          "Spring pre-monsoon is the stress window: hot, dry, and windy — fire weather on the piñon–juniper ecotone before convection returns.",
        ],
      },
      {
        id: "silver-city-gila-wilderness",
        title: "Gila Wilderness vertical climate and backcountry exposure",
        paragraphs: [
          "Within a short drive, elevation climbs into ponderosa and mixed conifer where mean temperatures fall sharply and lightning-ignited fires shape the landscape. Backpackers experience a full Madrean vertical stack in a day — desert scrub at the trailhead to fir forest near the crest.",
          "That relief is why the town’s climate summary is only a partial guide: gardeners at 1800 m face different frost calendars than campers at 2800 m only kilometres away.",
        ],
      },
      {
        id: "silver-city-mining-water",
        title: "Mining legacy, water rights, and community-scale hydrology",
        paragraphs: [
          "Historic copper and silver mining left a scattered footprint of tailings and altered drainages; modern water management balances domestic demand against intermittent streamflow. Elevation buffers heat but does not manufacture water — summer monsoon is welcome, but total annual moisture remains semi-arid.",
          "For growers, that means drip and timing discipline: the monsoon is a bonus, not a substitute for a deep soil-moisture bank.",
        ],
      },
    ],
  },
  "hood-river-or": {
    climateChange: { outlook2050: "Hotter, drier summers; wildfire smoke increasingly affects fruit quality. Winter chill hours decline.", outlook2100: "Continued chill hour erosion may stress some apple cultivars; crop shift toward later-bloom and heat-tolerant varieties.", keyShifts: [{variable: "Chill hours", direction: "down"}, {variable: "Smoke days", direction: "up"}, {variable: "Irrigation demand", direction: "up"}], resilienceNote: "Orchard economy is adapting but chill-hour decline is a structural concern." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Hood River Experiment Station", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "OSU Hood River Extension research", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "hood-river-cascade-gap",
        title: "The Cascade sea-level gap and the Columbia as climate conveyor",
        paragraphs: [
          "The Columbia River is the only continuous low-elevation breach of the Cascades for hundreds of kilometres. Marine air spills through the gap, while interior continental air spills west — producing the Gorge’s famous pressure-driven winds and a precipitation gradient that drops from rainforest to orchard steppe within tens of kilometres.",
          "Hood River sits just east of the crest’s rain-shadow onset: wet enough for dryland orchards with supplemental irrigation, sunny enough for sugar development in pears and cherries.",
        ],
      },
      {
        id: "hood-river-thermal-belts",
        title: "South-facing orchard benches and the Hood River Valley stack",
        paragraphs: [
          "Orchards climb the north side of the valley in terrace bands — each elevation a different bloom date and frost exposure. Thermal belts here are economically legible: early sites risk bloom frost; mid-slopes trade a week of spring safety for slightly cooler nights at harvest.",
          "Cold-air drainage still pools in low pockets during radiative freezes — the same geometry Black Mountain illustrates, transplanted to Pacific fruit country.",
        ],
      },
      {
        id: "hood-river-east-wind",
        title: "Outflow winds, smoke, and heat domes from the interior",
        paragraphs: [
          "When interior high pressure builds, the Gorge becomes a nozzle for hot easterly winds — a pattern that brought record 2021 heat east of the crest. Wildfire smoke from Cascade and interior fires follows the same channel, occasionally trapping under stable layers.",
          "Fruit growers watch these episodes closely: sun scald, tainted wine grapes, and worker heat protocols all spike together.",
        ],
      },
    ],
  },
  "ashland-or": {
    climateChange: { outlook2050: "Hotter summers, more fire, chill-hour decline.", outlook2100: "Rogue Valley increasingly Californianizes — more heat, more fire, less snow in nearby mountains.", keyShifts: [{variable: "Fire season", direction: "up"}, {variable: "Chill hours", direction: "down"}, {variable: "Smoke", direction: "up"}], resilienceNote: "Climate is drifting hotter but remains among the most livable in the Pacific NW." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Medford Regional AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "OSU Southern Oregon Research & Extension", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "ashland-siskiyou-shadow",
        title: "Siskiyou rain shadow and the Rogue Valley dry slot",
        paragraphs: [
          "Southwest Oregon’s geography places the Rogue in a partial lee of the Siskiyou–Klamath knot: enough moisture for dryland oak savanna and irrigated orchards, not enough for Willamette-style gray winters. Summer subtropical high pressure caps the region with subsidence — long sunny runs broken by occasional north Pacific troughs.",
          "The combination yields classic warm-day/cool-night diurnals that wine grapes and pears exploit for acid retention and sugar balance.",
        ],
      },
      {
        id: "ashland-theatre-climate",
        title: "Outdoor theatre season and the shoulder-season comfort window",
        paragraphs: [
          "The Oregon Shakespeare Festival’s outdoor stages depend on summer evenings that cool reliably — a thermal pattern rare in humid eastern North America at the same temperatures. When smoke intrudes from regional fires, the festival’s economics and air-quality safety protocols intersect directly with climate variability.",
        ],
      },
      {
        id: "ashland-fire-smoke",
        title: "Klamath–Siskiyou fire regime and smoke climatology",
        paragraphs: [
          "Southern Oregon sits in one of the West’s most lightning-prone, fuel-rich interfaces between interior dryness and coastal moisture penetration. Megafire smoke seasons are now a recurring constraint on tourism, viticulture, and respiratory health — as much a part of the lived climate as January frost.",
        ],
      },
    ],
  },
  "santa-fe-nm": {
    climateChange: { outlook2050: "Warmer, drier, increasing wildfire risk.", outlook2100: "Water stress is the key variable — Sangre snowpack decline matters.", keyShifts: [{variable: "Fire risk", direction: "up"}, {variable: "Monsoon variability", direction: "up"}, {variable: "Snowpack", direction: "down"}], resilienceNote: "Elevation helps but water is tight." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Santa Fe County Muni AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NM State Climatologist", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "santa-fe-sangre-orography",
        title: "Sangre de Cristo lifting and bimodal precipitation",
        paragraphs: [
          "Santa Fe’s bench lies where moisture approaches from both Gulf return flow in summer and southwesterly mid-latitude systems in winter. The Sangre de Cristos provide sharp orographic enhancement — enough for skiable snow above town while the plaza stays comparatively dry.",
          "Monsoon storms in July and August are the horticultural lifeline for native landscapes; May and June remain desiccating until convection organizes.",
        ],
      },
      {
        id: "santa-fe-rio-grande-water",
        title: "Rio Grande compact, acequia culture, and high-desert supply",
        paragraphs: [
          "Surface water in the Middle Rio Grande is fully spoken for across municipalities, pueblos, and agriculture — a legal and hydrologic context that frames every discussion of trees, turf, and development. Traditional acequia irrigation embedded water-sharing norms long before climate stress intensified.",
          "Snowpack in the Sangres is the natural reservoir; earlier melt tightens late-summer stress even when annual totals look adequate.",
        ],
      },
      {
        id: "santa-fe-adobe-thermal",
        title: "Adobe massing, solar gain, and high-desert building physics",
        paragraphs: [
          "Santa Fe’s architectural vernacular — thick earthen walls, small east-west exposures, courtyards — is climate technology. Daily temperature swings are large; thermal mass smooths interior comfort without mechanical cooling for much of the summer.",
        ],
      },
    ],
  },
  "santa-barbara-ca": {
    climateChange: { outlook2050: "Hotter summers, more extreme fire behavior on Santa Ynez flanks, episodic heat domes.", outlook2100: "Mediterranean character persists but stresses intensify.", keyShifts: [{variable: "Fire intensity", direction: "up"}, {variable: "Heat domes", direction: "up"}, {variable: "Precipitation variability", direction: "up"}], resilienceNote: "Climate is mild but wildfire on the backing mountains is the key vulnerability." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Santa Barbara Muni AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "CAL FIRE historical fires", kind: "oss-data" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "santa-barbara-south-coast",
        title: "South-facing coast geometry and the shortest June-gloom season on the central coast",
        paragraphs: [
          "Where the coastline bends east–west, solar geometry favors the urban strip with more direct insolation than north-facing Central Coast neighbors. The Santa Ynez Mountains block interior continental air and wring winter storms, leaving a regime of mild wet winters and dry warm summers.",
          "Marine layer still intrudes — but retreats faster here than in Santa Monica or San Francisco on many June days, a subtle but decisive tourism and viticulture advantage.",
        ],
      },
      {
        id: "santa-barbara-montecito-debris",
        title: "Santa Ynez fire, chaparral, and post-fire debris-flow hazard",
        paragraphs: [
          "Steep chaparral slopes behind the city burned repeatedly in the modern record; intense rain on hydrophobic post-fire soils generates debris flows that reach the urban interface — the Montecito 2018 tragedy is the reference event for coupling wildfire to alluvial-fan hazard.",
          "Planning and insurance markets here treat burn–rain sequences as predictable, not exceptional.",
        ],
      },
      {
        id: "santa-barbara-channel-upwelling",
        title: "Santa Barbara Channel eddies and coastal stratus variability",
        paragraphs: [
          "The Channel’s island archipelago and cyclonic eddies modulate sea-surface temperature and low cloud — enough to shift fog frequency block by block along the mesa versus beach. Avocado and citrus plantings track these micro-scale warm pockets.",
        ],
      },
    ],
  },
  "driggs-id": {
    climateChange: { outlook2050: "Shorter ski season, warmer winter extremes, longer frost-free growing season.", outlook2100: "Inversions weaken slightly; snowpack variability increases; fire risk in surrounding forests grows.", keyShifts: [{variable: "Winter inversion frequency", direction: "down"}, {variable: "Snowpack", direction: "mixed"}, {variable: "Wildfire risk", direction: "up"}], resilienceNote: "Warming is a net positive for habitability but net negative for water and ski economy." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Driggs-Reed Memorial AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Idaho Climate-Economy Impacts Assessment", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "driggs-teton-basin-pool",
        title: "Closed-basin cold-air pooling and multi-day valley inversions",
        paragraphs: [
          "Teton Valley has no low outlet for dense nocturnal air — cold drains from the Tetons and Big Hole summits and accumulates on the floor until sun angle or synoptic mixing breaks the lid. Multi-day inversions are common; wood smoke and particulates can accumulate under the same stable layer that holds −30°C mornings.",
          "Ski-area operations and valley agriculture literally occupy different air masses during the coldest weeks — the microclimate story is vertical as much as horizontal.",
        ],
      },
      {
        id: "driggs-targhee-contrast",
        title: "Grand Targhee versus valley floor — skiing above the inversion",
        paragraphs: [
          "Resort elevations often sit above the inversion ceiling — warmer overnight in mid-winter than the valley, paradoxically, while receiving far more snow from orographic lift. The contrast is economically central: powder skiing above, ice fog below.",
        ],
      },
      {
        id: "driggs-growing-season",
        title: "Compressed frost-free season and high-UV horticulture",
        paragraphs: [
          "Summers are glorious but frost-free days are few; growing seasons rely on cold-hardy cultivars, season extension, and careful siting on benches that drain cold air. Intense solar UV at 1860 m speeds growth but also stresses tender transplants.",
        ],
      },
    ],
  },
  "traverse-city-mi": {
    climateChange: { outlook2050: "Longer growing season, warmer winters, lake-ice decline.", outlook2100: "Lake moderation weakens as Great Lakes warm; ecosystem shifts north.", keyShifts: [{variable: "Growing season", direction: "up"}, {variable: "Lake ice", direction: "down"}, {variable: "Extreme rainfall", direction: "up"}], resilienceNote: "Fruit belt is adapting toward wine grapes; warming helps viticulture but threatens tart-cherry chill reliability." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Cherry Capital AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "MSU Extension fruit research", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "traverse-city-lake-delay",
        title: "Lake Michigan thermal inertia and bloom-delay horticulture",
        paragraphs: [
          "The bay’s water volume delays spring warming along shore — pushing bloom until after the riskiest advective frosts from continental cold-air outbreaks. That timing is the economic foundation of tart cherries: late flowers, reliable pollination windows, and harvest compressed into July.",
          "Autumn moderation extends hang-time for wine grapes and color for tourism — the same heat storage that frustrates early-season beachgoers rewards growers.",
        ],
      },
      {
        id: "traverse-city-lake-effect",
        title: "Lake-effect snow as soil-insulating winter precipitation",
        paragraphs: [
          "Heavy lake-effect snow blankets orchards with an insulating layer that moderates soil freeze–thaw and protects roots — a counterintuitive benefit of otherwise arduous winter maintenance.",
        ],
      },
      {
        id: "traverse-city-ice-decline",
        title: "Declining Great Lakes ice and the future of moderation",
        paragraphs: [
          "As Lake Michigan loses winter ice cover, spring water temperatures rise earlier — potentially advancing bloom into riskier alignment with late frosts. Fruit breeders and growers watch chill-hour trends and bloom phenology together; climate change here is measured in degree-days and bloom date, not annual rainfall alone.",
        ],
      },
    ],
  },
  "ithaca-ny": {
    climateChange: { outlook2050: "Longer growing season; increased heavy rainfall; lake-effect snow evolves.", outlook2100: "Grape varieties shift; Riesling may yield to warmer analogs.", keyShifts: [{variable: "Growing season", direction: "up"}, {variable: "Heavy rain", direction: "up"}, {variable: "Lake ice", direction: "down"}], resilienceNote: "Climate warming is a mixed bag for the wine economy." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "Cornell NRCC — Ithaca Cornell", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Cornell Extension viticulture", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "ithaca-finger-lakes-fetch",
        title: "Deep glacial lakes as north–south thermal batteries",
        paragraphs: [
          "Cayuga and neighboring lakes store summer heat into autumn and blunt midwinter cold near shore — lengthening frost-free periods relative to the upland plateau only kilometres away. Fetch length along the lake axis organizes local wind fields and cloud streets during unstable outbreaks.",
        ],
      },
      {
        id: "ithaca-slope-viticulture",
        title: "Slope aspect, drainage air, and Finger Lakes Riesling",
        paragraphs: [
          "West- and southwest-facing slopes above the eastern lakeshores capture afternoon sun while cold air drains toward the lake — a combination that preserves acidity in aromatic whites. Seneca and Cayuga AVAs exploit these mesoscale geometries explicitly.",
        ],
      },
      {
        id: "ithaca-gorge-cloud",
        title: "Gorge microclimate and campus–upland gradients",
        paragraphs: [
          "Ithaca’s incised gorges create shaded microclimates with shorter effective growing seasons in cove bottoms versus ridgetops. Hikers notice temperature and humidity shifts within hundreds of steps — the same relief that challenges winter road maintenance also diversifies wildflower phenology.",
        ],
      },
    ],
  },
  "grand-marais-mn": {
    climateChange: { outlook2050: "Warmer summers on the shore; reduced lake ice.", outlook2100: "Boreal forest transition begins; ecosystem northward shift.", keyShifts: [{variable: "Lake ice", direction: "down"}, {variable: "Boreal forest stress", direction: "up"}, {variable: "Growing season", direction: "up"}], resilienceNote: "Lake moderation weakens as Superior warms but remains the dominant climate signal." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Grand Marais coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "MN State Climatology", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "grand-marais-mn-superior-mass",
        title: "Lake Superior as inland ocean — summer chill and winter moderation",
        paragraphs: [
          "Superior’s immense volume and depth keep summer afternoon highs along the shore near 22°C while inland Minnesota climbs toward the high twenties. In winter, open-water heat flux and cloud cover raise minimums relative to the Boundary Waters plateau — the classic maritime versus continental split within one county.",
        ],
      },
      {
        id: "grand-marais-mn-fog",
        title: "Fog belts, sea breeze analogs, and the Sawtooth escarpment",
        paragraphs: [
          "Warm air over cold water produces stratus and fog that can linger mornings — a Nova-Scotia rhythm on Minnesota bedrock. Local topography channels drainage winds and fog penetration; trail runners learn micro-variation by cove.",
        ],
      },
      {
        id: "grand-marais-mn-boreal-edge",
        title: "Boreal transition, lake ice, and changing seasonality",
        paragraphs: [
          "The north shore is an ecological tension zone between boreal forest and northern hardwoods. Ice-cover decline on Superior shifts spring onset and storm tracks — with uncertain long-term effects on lake-effect snow that skiers and loggers both depend on.",
        ],
      },
    ],
  },
  "highlands-nc": {
    climateChange: { outlook2050: "Warming tempered by elevation; heavier rain events; some spruce stress on highest ridges.", outlook2100: "Southern Appalachian cloud forest identified as a regional biodiversity refugium.", keyShifts: [{variable: "Heavy rainfall", direction: "up"}, {variable: "Fog regime", direction: "mixed"}, {variable: "Warming", direction: "up"}], resilienceNote: "Elevation + precipitation abundance make this a relatively resilient climate." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Highlands coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USFS Southern Appalachian studies", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "highlands-escarpment-lift",
        title: "Blue Ridge escarpment and Gulf moisture ascent",
        paragraphs: [
          "Moist southerly flow rides up the abrupt escarpment west of the Piedmont, yielding some of the highest orographic rainfall totals in the eastern US. Summer convection is frequent but cool — cloud bases low, rain rates high — producing the cloud-forest feel that distinguishes Highlands from nearby Asheville.",
        ],
      },
      {
        id: "highlands-temperate-rainforest",
        title: "Temperate rainforest ecology on Appalachian bedrock",
        paragraphs: [
          "Dense hemlock–hardwood understory, massive rhododendron thickets, and leached acidic soils mirror Pacific Northwest structure at a smaller scale. Endemic salamander diversity and bryophyte loads signal persistently high humidity — a system tuned to fog drip as much as gauge rainfall.",
        ],
      },
      {
        id: "highlands-helene-hydro",
        title: "Tropical remnant rainfall and landslide hydrology",
        paragraphs: [
          "Remnant tropical systems can deliver multi-day rainfall on already saturated steep slopes — the recipe for debris slides that sever roads and threaten structures. Climate projections emphasize heavier sub-daily extremes; here, that translates directly into slope hazard rather than abstract averages.",
        ],
      },
    ],
  },
  "boulder-co": {
    climateChange: { outlook2050: "Warmer, drier; more wildfire on foothill flanks.", outlook2100: "Sustained aridification.", keyShifts: [{variable: "Fire risk", direction: "up"}, {variable: "Snowpack", direction: "down"}], resilienceNote: "Elevation helps; water is tight." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Boulder", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "grand-marais-mi": {
    climateChange: { outlook2050: "Less lake ice → potentially more lake-effect snow near-term; warming long-term reduces snow overall.", outlook2100: "Shift from snow to rain events.", keyShifts: [{variable: "Lake ice", direction: "down"}], resilienceNote: "Snow-economy is vulnerable." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Munising coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "apalachicola-fl": {
    climateChange: { outlook2050: "Sea-level rise, stronger hurricanes, warmer summers.", outlook2100: "Coastal retreat pressure; ecosystem reconfiguration.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Hurricane intensity", direction: "up"}], resilienceNote: "Exposure is the primary vulnerability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Apalachicola", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "santa-cruz-felton-ca": {
    climateChange: { outlook2050: "Warmer, drier summers; continued fire pressure on upland flanks.", outlook2100: "Ecosystem stress on lower-elevation redwoods.", keyShifts: [{variable: "Summer fog", direction: "mixed"}, {variable: "Fire risk", direction: "up"}], resilienceNote: "Fog-dependent ecosystems face gradual drying." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Felton coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USGS Santa Cruz Mtns climate", kind: "usgs", url: "https://www.usgs.gov/" }],
  },
  "wenatchee-wa": {
    climateChange: { outlook2050: "Warmer summers with heightened heat events; longer growing season stretching the bloom-frost risk window.", outlook2100: "Chill-hour decline may force apple-cultivar migration to higher elevations.", keyShifts: [{variable: "Summer heat extremes", direction: "up"}, {variable: "Chill hours", direction: "down"}, {variable: "Fire smoke days", direction: "up"}], resilienceNote: "Irrigation infrastructure and cold-chain storage buffer agricultural vulnerability; fire-smoke air quality is the emerging risk." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Wenatchee 1991–2020 normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM 30-year precipitation", kind: "prism", url: "https://prism.oregonstate.edu/" }, { label: "WSU Tree Fruit Research", kind: "academic" }],
    deepSections: [
      {
        id: "wenatchee-cascade-shadow",
        title: "Deep Cascade lee and the Columbia River moderation wedge",
        paragraphs: [
          "Wenatchee sits multiple tens of kilometres east of the crest in one of the continent’s strongest rain shadows — annual precipitation near 240 mm while windward slopes measure ten times that or more. The Columbia River’s thermal mass and valley airflow blunt the most extreme diurnal swings that would otherwise characterize pure steppe.",
          "Irrigation from Bureau of Reclamation infrastructure and snowmelt-fed tributaries converts climatic dryness into agricultural productivity — the climate story is incomplete without the plumbing.",
        ],
      },
      {
        id: "wenatchee-fruit-chill",
        title: "Chill hours, diurnal swing, and the Washington apple economy",
        paragraphs: [
          "Cold nights and hot days during fruit fill raise sugar and color in apples and cherries while winter chill satisfies cultivar requirements — for now. Warming pushes bloom earlier into riskier alignment with spring frosts; breeders and growers track hourly chill models as closely as rainfall.",
        ],
      },
      {
        id: "wenatchee-smoke-pressure",
        title: "Interior smoke corridors and heat domes",
        paragraphs: [
          "Eastern Washington lies downwind of Cascades fires and interior lightning ignitions; stable summer highs trap smoke in the basin. The 2021 heat dome showed how synoptic blocking can overwhelm local river moderation — a preview of tail risks orchard insurance now prices explicitly.",
        ],
      },
    ],
  },
  "ellensburg-wa": {
    climateChange: { outlook2050: "Warmer summers, marginal precipitation change.", outlook2100: "Continued warming; potential shift in wind patterns.", keyShifts: [{variable: "Heat waves", direction: "up"}, {variable: "Chill hours", direction: "down"}], resilienceNote: "Yakima-basin irrigation dependency is the watch-item." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Ellensburg 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "forks-wa": {
    climateChange: { outlook2050: "Slightly warmer; slightly drier summers.", outlook2100: "Summer drought stress on lower-elevation rainforest.", keyShifts: [{variable: "Summer dry-spell length", direction: "up"}, {variable: "Winter warmth", direction: "up"}], resilienceNote: "Extraordinary hydrological reservoir; ecosystem climate-resilient." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Forks 1A2", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NPS Olympic Climate Data", kind: "other" }],
  },
  "astoria-or": {
    climateChange: { outlook2050: "Slightly drier summers, rising seas pressuring estuary.", outlook2100: "Continued marine ecosystem reorganization.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Summer dry spells", direction: "up"}], resilienceNote: "Climate moderation is profound; coastal exposure is the vulnerability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Astoria 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "port-townsend-wa": {
    climateChange: { outlook2050: "Slightly drier, warmer summers; growing season lengthening.", outlook2100: "Continued maritime moderation with summer heat events.", keyShifts: [{variable: "Summer dry spells", direction: "up"}], resilienceNote: "Exceptional climate resilience; tight water supply is the constraint." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Port Townsend coop 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "hood-river-gorge": {
    climateChange: { outlook2050: "Stronger summer heat domes; smoky late summers from Cascade fires.", outlook2100: "Continued warming with gorge wind patterns largely stable.", keyShifts: [{variable: "Wildfire smoke days", direction: "up"}], resilienceNote: "The physical wind corridor is a geological constant; heat and smoke are the emerging concerns." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — The Dalles 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USGS Gorge Climate Transect", kind: "usgs", url: "https://www.usgs.gov/" }],
  },
  "eureka-ca": {
    climateChange: { outlook2050: "Fog may decline but ocean upwelling continues to buffer heat.", outlook2100: "Sea-level encroachment on Humboldt Bay flats.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Summer fog frequency", direction: "mixed"}], resilienceNote: "Upwelling-driven cool is one of the most climate-resilient regimes in North America; the main vulnerability is sea-level rise on bay margins." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Eureka/Woodley Island", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Humboldt State Schatz Energy climate notes", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "eureka-upwelling-narrow-range",
        title: "California Current upwelling and the continent’s narrowest annual temperature range",
        paragraphs: [
          "Eureka’s mean monthly highs span only ~6°C from January to August because cold offshore water and onshore flow cap summer warming while marine air limits winter cooling. The climate behaves more like coastal Ireland than like latitude-matched inland California — upwelling, not latitude, is the thermostat.",
        ],
      },
      {
        id: "eureka-redwood-fog-drip",
        title: "Redwood fog drip and hidden summer moisture",
        paragraphs: [
          "Coast redwoods intercept stratus droplets that never register in rain gauges — a supplementary hydrologic input that sustains alluvial aquifers and stream baseflow through the dry season. Timber history and modern conservation both depend on that fog budget.",
        ],
      },
      {
        id: "eureka-humboldt-bay-slr",
        title: "Humboldt Bay, tsunami exposure, and sea-level rise",
        paragraphs: [
          "The bay’s mudflats and low industrial waterfront face joint pressures from Pacific storms, Cascadia tsunami risk, and accelerating SLR — climate resilience here is coastal engineering as much as temperature trend.",
        ],
      },
    ],
  },
  "point-reyes-ca": {
    climateChange: { outlook2050: "Some fog decline expected, upwelling may intensify.", outlook2100: "Sea-level reshaping of estuary and beaches.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Fog", direction: "mixed"}], resilienceNote: "Among the most heat-resilient climates on the continent." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Pt Reyes lighthouse", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NPS Pt Reyes climate monitoring", kind: "other" }],
  },
  "truckee-ca": {
    climateChange: { outlook2050: "Snowpack decline; more rain, less snow; fire season lengthened.", outlook2100: "Major snowpack loss; ecosystem stress on Sierra conifers.", keyShifts: [{variable: "Snowpack", direction: "down"}, {variable: "Fire risk", direction: "up"}], resilienceNote: "Elevation cooling remains but snow economy at risk." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Truckee Ranger Station", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "mammoth-lakes-ca": {
    climateChange: { outlook2050: "Snow declining; fire and bark beetle stress increasing.", outlook2100: "Subalpine ecosystem migration upward.", keyShifts: [{variable: "Snowpack", direction: "down"}], resilienceNote: "Extreme elevation buys time; fire risk is the watch-item." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Mammoth Lakes Ranger Station", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "borrego-springs-ca": {
    climateChange: { outlook2050: "Intensifying extreme heat; deeper drought pressure.", outlook2100: "Habitability constraint in summer.", keyShifts: [{variable: "Summer heat", direction: "up"}, {variable: "Aquifer", direction: "down"}], resilienceNote: "Remarkable winter climate, increasingly marginal summers." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Borrego Desert Park", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "IDA Dark-Sky designation", kind: "other" }],
  },
  "fort-davis-tx": {
    climateChange: { outlook2050: "Warmer; fire risk rising in pine-oak.", outlook2100: "Potential conversion of higher elevations to desert scrub if drought persists.", keyShifts: [{variable: "Fire risk", direction: "up"}, {variable: "Monsoon reliability", direction: "mixed"}], resilienceNote: "Elevation provides real protection; aquifer health is the long-term concern." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Fort Davis coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "McDonald Observatory climate notes", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "fort-davis-sky-island",
        title: "Volcanic sky-island lift above the Chihuahuan floor",
        paragraphs: [
          "The Davis Mountains are a true elevation island: volcanic uplands rise from hot desert basins into oak, juniper, and pine-oak pockets. That lift is enough to turn West Texas summer from a survival problem into a dry, breezy highland climate with cool nights and monsoon cloud towers.",
          "The same isolation makes the range ecologically important. Species track slope, aspect, and drainage, so a north-facing canyon and a sun-baked bajada can feel like different counties even when they sit minutes apart.",
        ],
      },
      {
        id: "fort-davis-dark-sky-water",
        title: "Dark skies, transparency, and the water tradeoff",
        paragraphs: [
          "McDonald Observatory is not here by accident: thin dry air, sparse settlement, and low aerosol load give the Davis Mountains some of the best optical seeing in the country. Clear sky is a climate asset as much as a scenery asset.",
          "The constraint is water. High elevation softens heat but does not create a large watershed; ranching, tourism, and gardening all depend on careful groundwater use and drought-tolerant expectations.",
        ],
      },
    ],
  },
  "marfa-tx": {
    climateChange: { outlook2050: "Warmer, drier.", outlook2100: "Grassland stress.", keyShifts: [{variable: "Heat waves", direction: "up"}, {variable: "Monsoon variability", direction: "up"}], resilienceNote: "Elevation buys time; water is the long-term issue." },
    deepSections: [
      {
        id: "marfa-sky-and-distance",
        title: "Sky, distance, and the high-grassland feel",
        paragraphs: [
          "Marfa is on an open grassland plateau at about 1470 m, with the Davis Mountains to the north and the Chinati Mountains to the southwest. Height brings cool nights: after a 32°C July afternoon the temperature falls to about 17°C. The plain has few trees, and wind and glare are constant.",
          "The air is dry and clear, which is why the McDonald Observatory was built in the Davis Mountains nearby. Winter nights average −4 to −3°C under the same clear sky. There is little shade in town and a great deal of empty country around it.",
        ],
      },
      {
        id: "marfa-services-water-and-cost",
        title: "Services, water and cost",
        paragraphs: [
          "Marfa has about 1,800 people. The nearest hospital is in Alpine, about 40 km east. The nearest airports with regular flights are at Midland–Odessa and El Paso, each about three hours' drive. Many repairs and most specialist appointments mean a day on the road.",
          "The art world that followed Donald Judd to Marfa in the 1970s has pushed house prices far above local wages. Water comes from wells. The year's rain is about 370 mm, most of it from thunderstorms between June and September. Weigh the house prices, the water supply and the drive to a doctor against the evenings.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Marfa 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the high-desert aridity and the late-summer monsoon pulse." }],
  },
  "sedona-az": {
    climateChange: { outlook2050: "Warmer, more fire pressure, uncertain monsoon.", outlook2100: "Prolonged drought stress.", keyShifts: [{variable: "Fire risk", direction: "up"}, {variable: "Snowpack", direction: "down"}], resilienceNote: "Elevation helps but water stress is real." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Sedona RS", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the bimodal winter-and-monsoon precipitation across the Verde watershed." }],
  },
  "prescott-az": {
    climateChange: { outlook2050: "Warmer summers, lengthening fire season.", outlook2100: "Pine-belt stress.", keyShifts: [{variable: "Fire risk", direction: "up"}], resilienceNote: "Elevation-protected but fire-exposed." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Prescott AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "cloudcroft-nm": {
    climateChange: { outlook2050: "Warmer; fire pressure rising in drought cycles.", outlook2100: "Conifer stress possible.", keyShifts: [{variable: "Fire risk", direction: "up"}], resilienceNote: "Elevation helps; water and fire are concerns." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Cloudcroft coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "taos-nm": {
    climateChange: { outlook2050: "Warmer, drier.", outlook2100: "Snowpack-based water stress.", keyShifts: [{variable: "Snowpack", direction: "down"}, {variable: "Fire risk", direction: "up"}], resilienceNote: "Elevation helps; water tight." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Taos 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the monsoon-weighted summer precipitation and high-plateau aridity." }],
  },
  "gunnison-co": {
    climateChange: { outlook2050: "Winters warming faster than summers; snowpack decline.", outlook2100: "Cold-pool signature weakens; growing season expands.", keyShifts: [{variable: "Extreme cold frequency", direction: "down"}, {variable: "Snowpack", direction: "down"}], resilienceNote: "Elevation resilient; cold-pool character softening." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Gunnison 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "UC Boulder cold-pool studies", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "gunnison-cold-pool-engine",
        title: "Why the cold pool gets so strong",
        paragraphs: [
          "Gunnison combines nearly every ingredient cold-air pooling needs: a high enclosed basin, clear dry air, weak winter sun, snow cover, and limited nighttime mixing. Dense air drains off the surrounding slopes, settles on the floor, and can sit there for days beneath an inversion cap.",
          "The result is counterintuitive for visitors: a sunny ridge or ski slope above town may be dramatically warmer than the valley floor. January nights in town average about −21°C, among the coldest of any town in the lower forty-eight states.",
        ],
      },
      {
        id: "gunnison-brief-summer",
        title: "Brief summer, big diurnal range",
        paragraphs: [
          "Summer is the release valve. The same dry basin air that radiates heat away in January lets July afternoons warm quickly, then drop hard after sunset. Gardens can grow fast under high sun, but frost risk still brackets the season tightly.",
          "Monsoon storms add another pulse: short, bright mornings, tower-building afternoons, and localized rain that matters more to rangeland and fire behavior than annual totals suggest.",
        ],
      },
    ],
  },
  "crested-butte-co": {
    climateChange: { outlook2050: "Snowpack decline; longer summers.", outlook2100: "Tree-line migration up-slope.", keyShifts: [{variable: "Snowpack", direction: "down"}], resilienceNote: "Elevation protects temperature but snow industry threatened." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Crested Butte 3W coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "leadville-co": {
    climateChange: { outlook2050: "Warming measurable; treeline rising.", outlook2100: "Alpine ecosystem shift.", keyShifts: [{variable: "Winter warmth", direction: "up"}], resilienceNote: "Extreme elevation buys decades of buffer." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Leadville Lake County AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "durango-co": {
    climateChange: { outlook2050: "Warmer; fire pressure continues.", outlook2100: "Water-constrained.", keyShifts: [{variable: "Fire risk", direction: "up"}], resilienceNote: "Moderate elevation buffer." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Durango La Plata County AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "cody-wy": {
    climateChange: { outlook2050: "Warmer; drought pressure.", outlook2100: "Grazing-land stress.", keyShifts: [{variable: "Drought", direction: "up"}], resilienceNote: "Dry climate buffer; water access is key." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Cody WY", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "missoula-mt": {
    climateChange: { outlook2050: "Hotter summers with more smoke; milder winters.", outlook2100: "Continued aridification of summers.", keyShifts: [{variable: "Smoke days", direction: "up"}, {variable: "Fire risk", direction: "up"}], resilienceNote: "Valley geography makes air-quality increasingly central to livability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Missoula AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "bozeman-mt": {
    climateChange: { outlook2050: "Warmer; some water pressure.", outlook2100: "Continued warming; fire & smoke.", keyShifts: [{variable: "Summer heat", direction: "up"}], resilienceNote: "Elevation buffer." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Bozeman-Belgrade AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "logan-ut": {
    climateChange: { outlook2050: "Warmer; possibly longer/worse inversion episodes if more fog under warmer winters.", outlook2100: "Water-supply pressure from Wasatch snowpack.", keyShifts: [{variable: "Extreme inversions", direction: "mixed"}, {variable: "Summer heat", direction: "up"}, {variable: "Water supply", direction: "down"}], resilienceNote: "Agricultural soils are exceptional; air-quality mitigation is the civic challenge." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Logan USU 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Utah DEQ air quality", kind: "epa", url: "https://www.epa.gov/" }],
    deepSections: [
      {
        id: "logan-inversion-bowl",
        title: "Cache Valley as an inversion bowl",
        paragraphs: [
          "Cache Valley has limited winter ventilation: cold air drains from surrounding ranges, fog forms over snow and moist valley soils, and a stable lid can keep emissions close to the surface. That is why winter comfort here cannot be separated from air quality.",
          "The same basin walls that create a scenic four-season setting also make pollution management a local climate issue. Wood smoke, traffic, and agricultural emissions all matter more when the atmosphere stops mixing.",
        ],
      },
      {
        id: "logan-agricultural-floor",
        title: "Lake Bonneville soils and the summer reversal",
        paragraphs: [
          "The valley floor is built from old Lake Bonneville sediments: deep, productive, and water-holding compared with the surrounding sagebrush benches. Once spring mixing returns, the basin becomes an agricultural asset rather than an air-quality trap.",
          "Summer days are sunny and warm, irrigation is legible everywhere, and evening drainage restores cool nights. The lived climate is therefore split sharply by season: winter stagnation, summer openness.",
        ],
      },
    ],
  },
  "moab-ut": {
    climateChange: { outlook2050: "Hotter summers; more fire pressure.", outlook2100: "Intensifying aridity.", keyShifts: [{variable: "Summer heat", direction: "up"}, {variable: "Colorado River flow", direction: "down"}], resilienceNote: "Water is the ultimate constraint." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Moab 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "canaan-valley-wv": {
    climateChange: { outlook2050: "Warmer winters, longer growing seasons; boreal relict ecosystems under stress.", outlook2100: "Risk of losing spruce-fir community; climate shifting out of cold-pool regime.", keyShifts: [{variable: "Winter cold extremes", direction: "down"}, {variable: "Ecosystem composition", direction: "mixed"}], resilienceNote: "An increasingly rare climate pocket; conservation value is high." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Davis 3SE coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USGS Allegheny relict bogs", kind: "usgs", url: "https://www.usgs.gov/" }],
    deepSections: [
      {
        id: "canaan-boreal-basin",
        title: "A boreal basin inside the central Appalachians",
        paragraphs: [
          "Canaan Valley behaves colder than its latitude because elevation and shape work together. The basin floor radiates freely on clear nights, while surrounding ridges slow the export of dense air. Peat and wetland surfaces then reinforce the cool, damp microclimate.",
          "That is why red spruce, balsam fir, sphagnum, and cranberry bog communities persist here while warmer Appalachian valleys nearby support very different forests. The anomaly is ecological, not just statistical.",
        ],
      },
      {
        id: "canaan-conservation-pressure",
        title: "Cold refuge under a warming ceiling",
        paragraphs: [
          "Warming does not erase the basin shape, but it does raise the background climate that the cold pool starts from. Snowpack duration, spruce-fir stress, and wetland hydrology become the key variables to watch.",
          "For visitors and residents, the practical trade is solitude and cool summer air in exchange for a short growing season, persistent wet ground, and winter conditions that can feel much farther north than West Virginia suggests.",
        ],
      },
    ],
  },
  "redfield-ny": {
    climateChange: { outlook2050: "Lake-effect intensifies near-term (less ice on Ontario); longer-term snow shifts to rain.", outlook2100: "Decline in persistent snowpack.", keyShifts: [{variable: "Lake ice", direction: "down"}, {variable: "Snowfall", direction: "mixed"}], resilienceNote: "Snow-economy increasingly volatile." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Redfield coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NWS Buffalo lake-effect research", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "redfield-fetch-lift",
        title: "Lake Ontario fetch plus plateau lift",
        paragraphs: [
          "The Tug Hill machine starts over open water. Cold air crosses Lake Ontario long enough to pick up heat and moisture, then reaches the plateau and is forced upward. That final lift turns lake-effect bands from heavy snow into extreme snow.",
          "Small wind-direction changes decide who gets buried. A band parked over Redfield can miss Syracuse or Watertown entirely, which is why regional snowfall maps look streaked rather than smooth.",
        ],
      },
      {
        id: "redfield-snow-economy",
        title: "A snow economy with a volatile future",
        paragraphs: [
          "Deep snow supports snowmobiling, forestry access rhythms, and a winter identity that few eastern towns can match. It also loads roofs, narrows roads, and makes emergency logistics a climate design problem.",
          "Near-term warming can intensify lake-effect events while Lake Ontario stays ice-free longer, but the late-century signal points toward more rain-on-snow and shorter continuous snowpack. Tug Hill is likely to keep its heavy snow for now and lose its continuous snowpack later.",
        ],
      },
    ],
  },
  "syracuse-ny": {
    climateChange: { outlook2050: "Lake-effect intensification short-term, decline long-term.", outlook2100: "Shorter, milder winters.", keyShifts: [{variable: "Lake ice", direction: "down"}], resilienceNote: "Structural climate resilience relatively high." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Syracuse Hancock AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "marquette-mi": {
    climateChange: { outlook2050: "Warmer winters with less lake ice; snow shift.", outlook2100: "Superior becomes a greater year-round climate force.", keyShifts: [{variable: "Lake ice", direction: "down"}], resilienceNote: "Superior is a massive climate buffer." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Marquette 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "houghton-mi": {
    climateChange: { outlook2050: "Less ice, potentially more lake-effect mid-term.", outlook2100: "Warming moderate but snow likely declining.", keyShifts: [{variable: "Lake ice", direction: "down"}], resilienceNote: "Superior buffers temperature extremes." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Houghton coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "viroqua-wi": {
    climateChange: { outlook2050: "More intense rainfall events; longer growing seasons.", outlook2100: "Agricultural advantage may shift.", keyShifts: [{variable: "Extreme rain", direction: "up"}], resilienceNote: "Deep soils and diverse topography provide real buffer." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Viroqua coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USDA NRCS Driftless soils", kind: "usda", url: "https://planthardiness.ars.usda.gov/" }],
  },
  "asheville-nc": {
    climateChange: { outlook2050: "Warmer; more extreme rain.", outlook2100: "Mountain ecosystem reorganization.", keyShifts: [{variable: "Extreme rainfall", direction: "up"}], resilienceNote: "Elevation resilient; hurricane remnant flooding is rising risk." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Asheville Regional AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the orographic precipitation gradient across the French Broad valley." }],
  },
  "boone-nc": {
    climateChange: { outlook2050: "Warmer; ecosystem upslope migration.", outlook2100: "Unique climate-latitude combination eroding.", keyShifts: [{variable: "Winter cold", direction: "down"}], resilienceNote: "Elevation keeps summer livable." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "NOAA - Boone coop normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "Weather Spark - Boone average weather", kind: "other", url: "https://weatherspark.com/y/17975/Average-Weather-in-Boone-North-Carolina-United-States-Year-Round" },
      { label: "Climate-Data.org - Boone humidity and sunshine", kind: "other", url: "https://en.climate-data.org/north-america/united-states-of-america/north-carolina/boone-18171/", note: "Humidity is reported directly; sunshinePct is approximated from reported average daily sun hours divided by possible daylight at Boone latitude." },
      { label: "UNC Health Appalachian - Watauga Medical Center", kind: "other", url: "https://www.unchealthappalachian.org/locations/profile/watauga-medical-center/" },
      { label: "High Country Regional Hazard Mitigation Plan", kind: "other", url: "https://www.ashecountygov.com/hifi/files/departments/emergency-management/High_Country_Regional_Hazard_Mitigation_Plan_Update_20170907_PUBLIC_reduced.pdf" },
      { label: "U.S. Census QuickFacts - Boone town", kind: "other", url: "https://www.census.gov/quickfacts/fact/table/boonetownnorthcarolina/PST045225" },
    ],
    deepSections: [
      {
        id: "boone-escarpment-comfort",
        title: "Escarpment height makes the climate",
        paragraphs: [
          "Boone is at about 1000 m on the Blue Ridge, just back from the escarpment that drops to the North Carolina foothills. July afternoons average 26°C and nights 16°C, while the Piedmont cities below are several degrees hotter on the same days.",
          "The height also brings wind, cloud and winter weather. About 140 cm of snow falls in a year, and about 1500 mm of precipitation, spread fairly evenly. Asheville, about 350 m lower in its basin, is warmer and drier.",
        ],
      },
      {
        id: "boone-living-friction",
        title: "A university town on mountain roads",
        paragraphs: [
          "Appalachian State University, with about 20,000 students, keeps the town busy all year, and Watauga Medical Center gives it a hospital that most mountain towns of its size lack.",
          "Housing is tight and expensive for the area, partly because of the university and second homes. Roads are steep and can be icy in winter. Streams rise quickly in heavy rain: Hurricane Helene in September 2024 flooded parts of Boone and caused landslides across Watauga County. Check the flood zone and the slope above any property.",
        ],
      },
    ],
  },
  "key-west-fl": {
    climateChange: { outlook2050: "Rising seas pressuring the islands; stronger hurricanes.", outlook2100: "Existential sea-level-rise threat.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Hurricane intensity", direction: "up"}], resilienceNote: "Climate stability itself is stable; absolute elevation is not." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Key West International AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NOAA Hurricane Center — tropical cyclone climatology", kind: "noaa", url: "https://www.nhc.noaa.gov/climo/" }],
    deepSections: [
      {
        id: "key-west-isothermal-water",
        title: "Ocean on every side",
        paragraphs: [
          "Key West has almost no continental temperature memory. Gulf, Straits, and Atlantic water surround the island, damping daily and seasonal range so strongly that rainfall seasonality matters more than winter versus summer in the usual mainland sense.",
          "That oceanic stability is why frost is not the concern; wind, salt, storm tide, and insurance are. A perfect tropical evening and an evacuation order come from the same water-dominated setting.",
        ],
      },
      {
        id: "key-west-dry-wet-hurricane",
        title: "Dry season, wet season, hurricane season",
        paragraphs: [
          "The dry season is the livability peak: lower humidity, trade-wind ventilation, and reliable outdoor nights. Wet season shifts the rhythm toward thunderstorms, mosquito pressure, and tropical cyclone monitoring.",
          "Sea-level rise changes the background on which every storm arrives. The microclimate may remain exceptionally stable in temperature terms while the physical island becomes harder to insure, drain, and defend.",
        ],
      },
    ],
  },
  "charleston-sc": {
    climateChange: { outlook2050: "Sea-level rise already pressuring tidal neighborhoods; stronger hurricanes.", outlook2100: "Major coastal-adaptation challenge.", keyShifts: [{variable: "Sea level", direction: "up"}, {variable: "Hurricane intensity", direction: "up"}], resilienceNote: "Cultural and architectural resilience is high; physical exposure is the vulnerability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Charleston Int'l AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the summer-peaked Lowcountry precipitation regime." }],
  },
  "joseph-or": {
    climateChange: { outlook2050: "Warmer; reduced snowpack.", outlook2100: "Snow-tourism shifts.", keyShifts: [{variable: "Snowpack", direction: "down"}], resilienceNote: "Elevation buffers." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Enterprise 2S coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "fairbanks-ak": {
    climateChange: { outlook2050: "Warmer winters (+3 to +5°C) likely fastest on Earth for any populated city; permafrost destabilization; a growing season stretching past four months.", outlook2100: "Permafrost retreat and boreal forest transition; wildfire smoke season extending into June and September; ice fog events may decrease as winters warm past critical threshold.", keyShifts: [{ variable: "Winter minimum", direction: "up", note: "Extreme cold events becoming rarer." }, { variable: "Wildfire season length", direction: "up" }, { variable: "Permafrost thaw", direction: "up" }, { variable: "Growing season", direction: "up" }], resilienceNote: "Climate change is reshaping this place faster than almost anywhere in North America. Infrastructure built on permafrost is at substantial risk." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Fairbanks Int'l Airport NORMAL 1991–2020", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Alaska Climate Research Center — interior inversion studies", kind: "academic" }, { label: "UAF Geophysical Institute — aurora statistics", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "fairbanks-basin",
        title: "Tanana basin geometry and interior continentality",
        paragraphs: [
          "Fairbanks sits in a broad lowland rimmed by uplands — a shape that favors both pooling of cold air and long sight lines for radiative cooling through the long subarctic night. The Alaska Range to the south blocks mild Pacific air much of the year; the Brooks Range to the north filters Arctic outbreaks differently by season. The practical result is a climate dominated by continental air masses and by the valley’s own nocturnal stratification rather than by maritime moderation.",
          "Distance from ocean heat storage is the macro control; basin geometry is the micro-scale amplifier. That combination produces one of North America’s largest honest annual temperature ranges for a populated place.",
        ],
      },
      {
        id: "fairbanks-ice-fog",
        title: "Ice fog, inversions, and the Chena Ridge escape",
        paragraphs: [
          "When temperatures fall far below freezing and moisture sources remain — open water, vehicle exhaust, combustion plumes — supersaturated air near the surface nucleates into tiny ice crystals: ice fog. It is not merely aesthetic; it marks a stable layer where mixing is weak and pollutants can accumulate under the same inversion that holds cold air down.",
          "A short climb to hilltops above the fog often lands in dramatically warmer air — sometimes a difference large enough to change road traction, visibility, and even effective plant hardiness for exposed landscaping. Locals treat elevation as a vertical evacuation route from the valley’s winter worst.",
        ],
      },
      {
        id: "fairbanks-midnight-sun",
        title: "Midnight sun, growing season compression, and agriculture",
        paragraphs: [
          "Summer’s extremely long photoperiod concentrates photosynthesis into a short frost-free window. Cool-season crops can reach remarkable size because daily integrated light is high even when afternoon temperatures are modest by lower-latitude standards.",
          "The constraint is not daytime warmth alone — it is the abrupt shoulder seasons and the short count of frost-free days. Greenhouse culture and season-extension techniques are part of ordinary gardening here, not hobbyist excess.",
        ],
      },
      {
        id: "fairbanks-permafrost",
        title: "Permafrost thaw, infrastructure, and accelerating change",
        paragraphs: [
          "Discontinuous permafrost underlies much of the Fairbanks area; buildings, roads, and utilities were often engineered for frozen ground that now warms and consolidates unevenly. Thermokarst and frost-heave risk are not abstract climate topics — they show up as cracked foundations, dipping pavement, and shifting water lines.",
          "Winter warming is among the fastest signals on Earth in this region. For residents, that can mean fewer historically extreme cold events — but also more freeze–thaw cycling, changing snowpack, longer wildfire smoke seasons, and ecological transitions from boreal forest toward shrubbier or deciduous-dominated systems on favorable sites.",
        ],
      },
    ],
  },
  "sitka-ak": {
    climateChange: { outlook2050: "Continued mild warming; ocean acidification affecting fisheries; winter rain replacing what little snow falls.", outlook2100: "Hyper-maritime character persists; narrow temperature range may compress further.", keyShifts: [{ variable: "Winter snow", direction: "down" }, { variable: "Ocean pH", direction: "down" }, { variable: "Storm intensity", direction: "up" }], resilienceNote: "Marine buffering keeps extremes modest; the community's fishing-dependent economy is more climate-exposed than its air temperatures." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Sitka Magnetic Obs / SIT Airport", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Alaska Climate Research Center", kind: "academic" }],
  },
  "valdez-ak": {
    climateChange: { outlook2050: "Warmer winters; possible shift of more precipitation to rain; Chugach glaciers continuing mass loss.", outlook2100: "Snowpack totals trending down as winter warms past critical thresholds at low elevation; high elevation continues to capture heavy snowfall.", keyShifts: [{ variable: "Winter mean temp", direction: "up" }, { variable: "Rain/snow ratio", direction: "up" }, { variable: "Extreme precip events", direction: "up" }], resilienceNote: "Marine moderation buffers temperature but amplifies storminess. Community is highly accustomed to weather extremes." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Valdez WSO", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Thompson Pass snowfall records (NWS Anchorage)", kind: "noaa", url: "https://www.weather.gov/afc/" }],
  },
  "death-valley-ca": {
    climateChange: { outlook2050: "Summer extremes pushing toward 50°C as a norm; any biologically-active surface water increasingly scarce.", outlook2100: "Potential for 54°C+ heat events becoming multi-year; the world-record 56.7°C may be broken.", keyShifts: [{ variable: "Days above 49°C", direction: "up" }, { variable: "Cool-season rainfall", direction: "mixed" }, { variable: "Flash-flood intensity", direction: "up" }], resilienceNote: "The desert itself is resilient; human habitation depends entirely on reliable cool-season tourism and imported everything." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Death Valley 1913 world heat record", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NPS Death Valley — climate overview", kind: "academic" }, { label: "PRISM precipitation normals", kind: "prism", url: "https://prism.oregonstate.edu/" }],
    deepSections: [
      {
        id: "death-valley-heat-bowl",
        title: "The heat bowl mechanism",
        paragraphs: [
          "Death Valley is not merely low and sunny. It is a deep, dry basin behind multiple rain-shadow barriers, so air descending into the floor is already moisture-starved and efficient at heating. Once dense hot air collects, vertical mixing is limited by the surrounding walls and the summer thermal low.",
          "That is why the place produces extreme heat with such consistency. The record is famous, but the more important climate fact is persistence: long sequences of dangerous afternoons and warm nights define the season.",
        ],
      },
      {
        id: "death-valley-water-pulse",
        title: "Rare water, superblooms, and destructive floods",
        paragraphs: [
          "The basin can appear static until rare rain arrives. A single atmospheric-river remnant or desert thunderstorm can erase roads, move gravel fans, and refill playas that were dust weeks earlier.",
          "Those same pulses can produce wildflower superblooms when timing and antecedent moisture line up. In Death Valley, water is both spectacle and hazard because the landscape is built to receive it rarely and violently.",
        ],
      },
    ],
  },
  "stanley-id": {
    climateChange: { outlook2050: "Shorter snow season; summer highs warmer by ~3°C; frost frequency slightly reduced but cold-pool geometry persists.", outlook2100: "Cold-pool mechanism is geometric, not meteorological — the valley will continue producing extreme lows even as averages warm.", keyShifts: [{ variable: "Snowpack depth", direction: "down" }, { variable: "Summer heat", direction: "up" }, { variable: "Fire season", direction: "up" }, { variable: "Extreme cold frequency", direction: "down" }], resilienceNote: "Geographic drivers of cold are robust; dependent economy (fishing, skiing, tourism) is more climate-exposed than the climate itself." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Stanley Ranger Station records", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Idaho Climate Office — Sawtooth Valley cold-pool analysis", kind: "academic" }],
  },
  "mount-washington-nh": {
    climateChange: { outlook2050: "Warming slightly less pronounced than surrounding lowlands; wind regime robust to climate change; rime frequency changing.", outlook2100: "Alpine tundra ecosystem at risk from warming; extreme wind events may increase in frequency.", keyShifts: [{ variable: "Treeline elevation", direction: "up" }, { variable: "Fog frequency", direction: "mixed" }, { variable: "Winter extremes", direction: "up" }], resilienceNote: "The summit is weather's own laboratory; ecological change is real and measurable." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "Mount Washington Observatory records (continuous since 1932)", kind: "academic" }, { label: "NOAA — historical wind records", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "yuma-az": {
    climateChange: { outlook2050: "Higher extreme heat (48°C+ possible); Colorado River flows reduced, threatening irrigation; cooling demand rising.", outlook2100: "Water scarcity is the defining issue — climate itself remains viable but agriculture depends on imported water that is becoming more contested.", keyShifts: [{ variable: "Summer heat extremes", direction: "up" }, { variable: "Colorado River flow", direction: "down" }, { variable: "Winter mildness", direction: "up" }, { variable: "Monsoon intensity", direction: "mixed" }], resilienceNote: "Sunshine and mild winters are robust; water supply is the vulnerability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA Yuma International Airport normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "WMO — global sunshine rankings", kind: "academic" }, { label: "USDA — Yuma winter vegetable statistics", kind: "usda", url: "https://planthardiness.ars.usda.gov/" }],
  },
  "south-padre-tx": {
    climateChange: { outlook2050: "Rising seas eroding the island; stronger hurricanes; warmer Gulf increasing tropical storm intensification.", outlook2100: "Portions of the island likely submerged or requiring engineered protection; climate itself remains mild.", keyShifts: [{ variable: "Hurricane intensity", direction: "up" }, { variable: "Sea level", direction: "up" }, { variable: "Summer night warmth", direction: "up" }, { variable: "Fall rainfall", direction: "mixed" }], resilienceNote: "Island geography is inherently vulnerable; the climate is mild, the environment is not." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Brownsville airport normals (nearby)", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NHC hurricane climatology", kind: "noaa", url: "https://www.nhc.noaa.gov/climo/" }],
  },
  "ely-mn": {
    climateChange: { outlook2050: "Warming ~+2°C; longer growing season; less reliable winter ice; more winter rain mixing with snow.", outlook2100: "Boreal-to-mixed-forest transition accelerating; extreme cold events less frequent but still possible.", keyShifts: [{ variable: "Winter minimum temp", direction: "up" }, { variable: "Lake ice duration", direction: "down" }, { variable: "Fire frequency", direction: "up" }, { variable: "Growing season", direction: "up" }], resilienceNote: "Wilderness character remains; cold identity will fade over decades." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Ely 25 S", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Minnesota DNR climatology", kind: "academic" }],
  },
  "cannon-beach-or": {
    climateChange: { outlook2050: "Slightly warmer summers but marine-layer persistence protects coastal moderation; ocean acidification affecting intertidal life.", outlook2100: "Upwelling dynamics expected to intensify in some models, offsetting marine warming; very mild climate character persists.", keyShifts: [{ variable: "Coastal erosion", direction: "up" }, { variable: "Ocean pH", direction: "down" }, { variable: "Storm intensity", direction: "up" }], resilienceNote: "One of the more climate-resilient microclimates in the Pacific NW in terms of temperature; coastal erosion is the real long-term risk." },
    deepSections: [
      {
        id: "cannon-beach-temperature-stability",
        title: "A year without much temperature change",
        paragraphs: [
          "Cannon Beach faces the open Pacific, and the sea sets its temperature. In summer, northerly winds draw cold water to the surface along the coast, and the sea breeze holds August afternoons to about 21°C. In winter the same ocean keeps afternoons near 10°C and nights above freezing. Afternoons in the coldest month are only about ten degrees cooler than in the warmest.",
          "It is a wet climate, with about 2300 mm of rain a year and more than 300 mm in each month from November to January. July and August are the dry break, with 25 to 35 mm each. Summer days often start in fog or low cloud that clears by afternoon.",
        ],
      },
      {
        id: "cannon-beach-resort-friction",
        title: "A small resort town on an exposed coast",
        paragraphs: [
          "About 1,500 people live here year-round, and many of the houses are second homes or rentals, so prices are high and long-term rentals are few. The headlands are prone to landslides, and winter storms bring high surf and strong wind. The town lies in the tsunami zone for a Cascadia earthquake, and the evacuation routes to high ground are signposted.",
          "Seaside, about 13 km north, has the hospital, the larger grocery stores and more year-round housing. Spend time in both towns before deciding, and visit in November as well as in August.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Astoria / Seaside coop stations", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Oregon Climate Service — coastal upwelling summaries", kind: "academic" }],
  },
  "valentine-ne": {
    climateChange: {
      outlook2050: "Warmer summers with rising evapotranspiration; Ogallala recharge pressure intensifies. Winter snow events fewer but more disruptive when they occur.",
      outlook2100: "Dune-stabilizing prairie grass cover is climate-sensitive; prolonged drought could reactivate portions of the dune field — a process observed repeatedly in the Holocene.",
      keyShifts: [
        { variable: "Aquifer pressure", direction: "up" },
        { variable: "Dune mobilization risk", direction: "up" },
        { variable: "Growing season length", direction: "up" },
      ],
      resilienceNote: "The Sandhills ecosystem depends on a thin grass cover holding dunes in place; moderate warming is absorbable, but sustained megadrought would be existential.",
    },
    confidenceNotes: "Climate values based on NOAA Valentine Lake 4SSW normals 1991–2020 and nearby Ainsworth station. Soil description follows USDA Valentine Series type location.",
    citations: [
      { label: "NOAA Valentine Lake 4SSW — 1991–2020 normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "USDA NRCS — Valentine Series soil type description", kind: "usda", url: "https://planthardiness.ars.usda.gov/" },
      { label: "Nebraska Sandhills Task Force — ecological assessments", kind: "academic" },
      { label: "Niobrara National Scenic River — NPS", kind: "other", url: "https://www.nps.gov/niob/" },
    ],
    deepSections: [
      {
        id: "valentine-dune-grass-water",
        title: "Grass, sand, and the Ogallala water table",
        paragraphs: [
          "The Sandhills look permanent because prairie grass holds the dunes in place, but the stability is biological. Deep roots bind loose sand, while the Ogallala Aquifer sits close enough to feed interdune lakes, wet meadows, and spring-fed streams.",
          "That makes drought more consequential than annual rainfall alone implies. If grass cover weakens and groundwater drops, the landscape can shift from quiet ranch country toward moving sand and stressed wetlands.",
        ],
      },
      {
        id: "valentine-niobrara-crossroads",
        title: "The Niobrara canyon as a climate crossroads",
        paragraphs: [
          "The Niobrara slices through the dune country and creates shaded walls, seep lines, and protected benches that host species from several biomes in one corridor. A float trip is therefore also a climate transect: prairie, ponderosa, deciduous woodland, and cool ravines repeat in quick succession.",
          "For travelers and land scouts, the canyon is the most legible microclimate. It can feel cooler and more humid than the surrounding grass sea at midday, then collect colder air after sunset.",
        ],
      },
    ],
  },
  "loess-hills-ia": {
    climateChange: {
      outlook2050: "Warmer summers with more extreme rainfall events; increased slope-erosion risk on disturbed loess.",
      outlook2100: "Growing season lengthens but heavy precipitation events threaten the landscape's physical integrity.",
      keyShifts: [
        { variable: "Extreme rain events", direction: "up" },
        { variable: "Growing season", direction: "up" },
        { variable: "Soil-erosion pressure", direction: "up" },
      ],
      resilienceNote: "Loess is the landscape's strength and its fragility — keeping prairie cover intact is the single most decisive climate-resilience lever.",
    },
    confidenceNotes: "Climate values blended from NOAA stations at Council Bluffs, Sioux City, and Missouri Valley; soil mapping follows USDA Ida and Monona series.",
    citations: [
      { label: "NOAA — Sioux City / Council Bluffs stations, 1991–2020 normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "USDA NRCS — Ida Series type description", kind: "usda", url: "https://planthardiness.ars.usda.gov/" },
      { label: "Iowa Geological Survey — Loess Hills stratigraphy", kind: "usgs", url: "https://www.usgs.gov/" },
      { label: "Loess Hills National Scenic Byway", kind: "other", url: "https://www.visitloesshills.org/" },
    ],
    deepSections: [
      {
        id: "loess-hills-global-rarity",
        title: "A globally rare loess ridge",
        paragraphs: [
          "Loess is wind-built silt, but in western Iowa it accumulated deeply enough to behave like a sculpted mountain material. Streams and gravity cut the deposit into narrow ridges, catsteps, and knife-edge slopes that feel out of scale with the surrounding Corn Belt.",
          "The steep ground makes the local climate as well: slope angle and aspect produce dry prairie, oak shade and frost pockets within a short walk of each other. Around the hills the climate is ordinary for the Midwest.",
        ],
      },
      {
        id: "loess-hills-erosion-prairie",
        title: "Prairie cover as climate infrastructure",
        paragraphs: [
          "The same fine silt that makes the bluffs dramatic also makes them fragile. Native prairie roots slow slumping and sheet erosion; bare cuts, trails, and oversteepened roads can fail quickly during heavy rain.",
          "Climate resilience here is therefore practical land management. Keeping slopes covered does more for long-term stability than any single drainage project, especially as extreme rainfall events intensify.",
        ],
      },
    ],
  },
  "flint-hills-ks": {
    climateChange: {
      outlook2050: "Hotter and more humid summers with declining chill hours; fire-weather windows shifting earlier in spring.",
      outlook2100: "Growing season pushes toward Dfa-to-Cfa transition; aridity at the western edge of the Hills rises.",
      keyShifts: [
        { variable: "Fire-weather window", direction: "up" },
        { variable: "Growing season", direction: "up" },
        { variable: "Chill hours", direction: "down" },
      ],
      resilienceNote: "The prairie itself is highly climate-resilient — it evolved under continental variability. The pressure is on the rural ranching economy that maintains it.",
    },
    confidenceNotes: "Values reflect NOAA Cottonwood Falls 1S and Manhattan stations, 1991–2020; ecosystem descriptions follow Konza Prairie LTER and TNC Tallgrass Prairie Preserve literature.",
    citations: [
      { label: "NOAA — Cottonwood Falls & Manhattan normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "Konza Prairie Biological Station LTER", kind: "academic" },
      { label: "Tallgrass Prairie National Preserve — NPS", kind: "other", url: "https://www.nps.gov/tapr/" },
      { label: "USDA NRCS — Florence Series", kind: "usda", url: "https://planthardiness.ars.usda.gov/" },
    ],
    deepSections: [
      {
        id: "flint-hills-chert-prairie",
        title: "Why the tallgrass survived here",
        paragraphs: [
          "The Flint Hills are not spared prairie by chance. Cherty limestone made the uplands difficult to plow, so grazing and fire remained the dominant land uses while flatter neighboring counties converted to row crops.",
          "That accident of geology preserves one of the continent's largest intact tallgrass systems. Climate, soil, and ranch economics are inseparable: the same thin rocky ground that frustrates corn supports deep-rooted prairie and cattle range.",
        ],
      },
      {
        id: "flint-hills-fire-season",
        title: "Fire, smoke, and continental storm energy",
        paragraphs: [
          "Prescribed fire is the management heartbeat of the Hills. Spring burns remove woody encroachment, recycle nutrients, and keep grassland open, but they also create regional smoke events that make climate visible to people far beyond the pasture fence.",
          "Summer then shifts to continental volatility: heat, humidity, supercells, and flash flood risk along creek bottoms. The prairie is resilient to that variability; roads, fences, and rural emergency systems are the parts under pressure.",
        ],
      },
    ],
  },
  "eureka-springs-ar": {
    climateChange: {
      outlook2050: "Warmer summers and more intense rainfall; karst terrain will route the extra runoff through existing spring systems with some spring-flow variability.",
      outlook2100: "Chill-hour decline pressures apple/peach viability; humid heat load rises.",
      keyShifts: [
        { variable: "Heavy-rain events", direction: "up" },
        { variable: "Chill hours", direction: "down" },
        { variable: "Humid-heat days", direction: "up" },
      ],
      resilienceNote: "The landscape's spring-fed hydrology and deep cove soils give it good baseline resilience; the human economy's reliance on tourism is more sensitive to summer heat-wave frequency.",
    },
    confidenceNotes: "Climate values reflect NOAA Eureka Springs 3WNW and Fayetteville Experiment Station 1991–2020 normals; karst descriptions follow Arkansas Geological Survey publications.",
    citations: [
      { label: "NOAA — Eureka Springs 3WNW station", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "Arkansas Geological Survey — Springfield Plateau karst", kind: "usgs", url: "https://www.usgs.gov/" },
      { label: "USDA NRCS — Clarksville Series", kind: "usda", url: "https://planthardiness.ars.usda.gov/" },
      { label: "Buffalo National River — NPS", kind: "other", url: "https://www.nps.gov/buff/" },
    ],
    deepSections: [
      {
        id: "eureka-spring-line",
        title: "Spring-line hydrology and karst storage",
        paragraphs: [
          "Eureka Springs sits where water moving through limestone finds exits along bedding planes, fractures, and slope breaks. Springs are not decorative here; they are the visible plumbing of a karst system that stores and routes rainfall through rock.",
          "That routing can make the town feel lush even when nearby ridgetops are dry. It also means contamination, sinkholes, and rapid storm response deserve more attention than a simple humid-subtropical label would suggest.",
        ],
      },
      {
        id: "eureka-ridge-hollow-town",
        title: "Ridges, hollows, and block-scale microclimate",
        paragraphs: [
          "The town's vertical street pattern turns climate into a walking experience. A shaded hollow can hold cool damp air while a south-facing limestone bench a few blocks away warms early, dries fast, and supports a different garden palette.",
          "The town is built up the sides of a steep hollow, with streets stacked one above another, so the contrast is met on an ordinary walk to the shops.",
        ],
      },
    ],
  },
  "brookings-or": {
    climateChange: { outlook2050: "Warmer winters; summer marine layer timing less reliable.", outlook2100: "Coastal erosion and king-tide flooding pressure.", keyShifts: [{ variable: "Winter minimums", direction: "up" }, { variable: "Fog frequency", direction: "mixed" }], resilienceNote: "Marine moderation remains the backbone; offshore warming is the wild card." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Brookings area COOP / Chetco effect case studies", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NWS Medford — Chetco wind climatology notes", kind: "academic" }],
  },
  "medford-or": {
    climateChange: { outlook2050: "Longer fire season; earlier snowmelt on Crater Lake rim.", outlook2100: "Irrigation demand rises; smoke exposure worsens.", keyShifts: [{ variable: "Summer water demand", direction: "up" }, { variable: "Wildfire smoke", direction: "up" }], resilienceNote: "Water rights and smoke are the twin constraints." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Medford AP normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "friday-harbor-wa": {
    climateChange: { outlook2050: "Warmer nights; summer fog may decline.", outlook2100: "Salinity intrusion in shallow island wells.", keyShifts: [{ variable: "Sea level", direction: "up" }, { variable: "Fog", direction: "down" }], resilienceNote: "Water supply is the limiting factor for growth." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Friday Harbor station", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "winthrop-wa": {
    climateChange: { outlook2050: "Earlier snowmelt; longer fire season.", outlook2100: "Winter cold extremes may soften slightly.", keyShifts: [{ variable: "Fire smoke", direction: "up" }, { variable: "Growing season", direction: "up" }], resilienceNote: "Water for irrigation is finite." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Winthrop COOP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "leavenworth-wa": {
    climateChange: { outlook2050: "More heat stress in July–August; fire risk increases.", outlook2100: "Snowpack reliability declines.", keyShifts: [{ variable: "Fire weather", direction: "up" }], resilienceNote: "River-fed irrigation helps but competes with ecosystem flow." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Leavenworth area", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "lone-pine-ca": {
    climateChange: { outlook2050: "Hotter summers; dust events may increase with playa dynamics.", outlook2100: "Water stress absolute.", keyShifts: [{ variable: "Heat", direction: "up" }], resilienceNote: "Tourism to public lands is economically dominant." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Lone Pine 8 SW", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "page-az": {
    climateChange: { outlook2050: "Earlier monsoon onset uncertainty; hotter pre-monsoon May–June.", outlook2100: "Colorado River flow stress dominates regional life.", keyShifts: [{ variable: "Aridity", direction: "up" }], resilienceNote: "Water policy is existential, not garden-scale." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Page AZ", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "international-falls-mn": {
    climateChange: { outlook2050: "Warmer winters; ice season shorter on Rainy River.", outlook2100: "Boreal shift pressures forest composition.", keyShifts: [{ variable: "Winter severity", direction: "down" }, { variable: "Precipitation intensity", direction: "up" }], resilienceNote: "Winter warming may reduce energy costs but increase ice-road hazard variability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — International Falls Intl AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "GLISA — International Falls station summary", kind: "academic" }],
  },
  "duluth-mn": {
    climateChange: { outlook2050: "Less ice cover could reduce summer cooling advantage over time.", outlook2100: "Lake level and storm regimes in flux.", keyShifts: [{ variable: "Ice cover", direction: "down" }], resilienceNote: "Lake moderation is the asset; ice loss is the risk." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Duluth Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the Lake Superior precipitation gradient and cool-summer normals." }],
  },
  "erie-pa": {
    climateChange: { outlook2050: "Less ice cover may shift lake-effect patterns.", outlook2100: "More lake-moderated warmth in winter.", keyShifts: [{ variable: "Lake ice", direction: "down" }], resilienceNote: "Shoreline erosion accelerates with storms." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Erie Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "chattanooga-tn": {
    climateChange: { outlook2050: "More intense summer rainfall; longer pollen season.", outlook2100: "Humid heat stress rises.", keyShifts: [{ variable: "Heavy rain", direction: "up" }], resilienceNote: "River flooding is the acute hazard." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Chattanooga AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the winter-and-spring precipitation maximum in the Tennessee Valley." }],
  },
  "gatlinburg-tn": {
    climateChange: { outlook2050: "More invasive pests and pathogens in humid warmth.", outlook2100: "High-elevation species migration pressure.", keyShifts: [{ variable: "Humid heat", direction: "up" }], resilienceNote: "Park boundaries buffer some development pressure." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Gatlinburg 2 SW", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NPS — Great Smoky Mountains precip climatology", kind: "other", url: "https://www.nps.gov/grsm/" }],
  },
  "nags-head-nc": {
    climateChange: { outlook2050: "Higher surge risk; accelerating beach erosion.", outlook2100: "Barrier migration inland likely.", keyShifts: [{ variable: "Sea level", direction: "up" }, { variable: "Hurricane intensity", direction: "up" }], resilienceNote: "Fixed infrastructure is the vulnerability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Cape Hatteras ASOS", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "burlington-vt": {
    climateChange: { outlook2050: "More ice-free lake days in winter; wetter extremes.", outlook2100: "Shorter ice season changes lake-effect snow.", keyShifts: [{ variable: "Lake ice duration", direction: "down" }], resilienceNote: "Lake moderation may weaken as ice declines." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Burlington Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the Champlain Valley precipitation and lake-moderated normals." }],
  },
  "bar-harbor-me": {
    climateChange: { outlook2050: "Warmer Gulf of Maine waters; shifting lobster and fish regimes.", outlook2100: "Fog frequency uncertain.", keyShifts: [{ variable: "Ocean temperature", direction: "up" }], resilienceNote: "Tourism economy tied to park and marine conditions." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Hancock County stations", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "lubbock-tx": {
    climateChange: { outlook2050: "More days near 38°C; aquifer stress.", outlook2100: "Aridity intensifies.", keyShifts: [{ variable: "Drought", direction: "up" }], resilienceNote: "Ogallala aquifer decline is regional constraint." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Lubbock Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "new-orleans-la": {
    climateChange: { outlook2050: "Higher sea level and wetter hurricanes.", outlook2100: "Compound flooding becomes dominant risk.", keyShifts: [{ variable: "Storm surge", direction: "up" }], resilienceNote: "Infrastructure adaptation is ongoing and expensive." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — New Orleans Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "PRISM Climate Group — gridded 1991–2020 normals", kind: "prism", url: "https://prism.oregonstate.edu/", note: "Cross-checks the year-round Gulf precipitation and its summer convective maximum." }],
  },
  "ojai-ca": {
    climateChange: { outlook2050: "Hotter, drier, increasing fire exposure.", outlook2100: "Sustained aridification.", keyShifts: [{variable: "Fire risk", direction: "up"}, {variable: "Heat extremes", direction: "up"}], resilienceNote: "Mediterranean character persists but narrows." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Ojai coop", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "hilo-hi": {
    climateChange: { outlook2050: "Warmer nights; possible shift in trade-wind frequency; heavier extreme rain events.", outlook2100: "Coastal groundwater and reef stress; uncertain trade regime.", keyShifts: [{ variable: "Extreme rainfall", direction: "up" }, { variable: "Coral bleaching stress", direction: "up" }], resilienceNote: "Elevation diversity on-island provides migration space for ecosystems." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Hilo International", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NWS Honolulu — Hawaiʻi climate summaries", kind: "noaa", url: "https://www.weather.gov/hfo/" }],
    deepSections: [
      {
        id: "hilo-trades",
        title: "Trade-wind regime and the trade-wind inversion",
        paragraphs: [
          "The subtropical high over the central Pacific feeds persistent northeasterly trades. A climatological inversion a few thousand feet above the sea surface caps convection over the ocean but breaks on windward slopes, allowing deep clouds to form. That is why rainfall concentrates on the northeast coast while leeward areas sit in subsidence.",
          "When the inversion weakens — during some El Niño winters or Kona lows — moisture penetrates higher and rainfall patterns flip temporarily, producing multi-day warm rains that stress flood control.",
        ],
      },
      {
        id: "hilo-island-mountain",
        title: "From sea level to Mauna Kea in one afternoon",
        paragraphs: [
          "A road from Hilo to the Mauna Kea visitor station climbs through cloud forest, subalpine shrubland, and alpine desert in under two hours of driving — one of the planet’s steepest climate gradients. Summit mean temperatures are below freezing in winter; Hilo remains in tropical air.",
          "This vertical stacking makes Hawaiʻi Island a natural laboratory for lapse-rate studies, inversion height, and astronomical seeing — the reason major observatories sit above the cloud deck.",
        ],
      },
    ],
  },
  "nome-ak": {
    climateChange: { outlook2050: "Later freeze-up and earlier break-up; more open-water storms.", outlook2100: "Coastal erosion accelerates; ice road season shortens.", keyShifts: [{ variable: "Sea ice duration", direction: "down" }], resilienceNote: "Subsistence and transport systems tightly coupled to ice timing." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Nome Airport", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
    deepSections: [
      {
        id: "nome-ice-season",
        title: "Living with the ice calendar",
        paragraphs: [
          "Sea ice is a travel surface, a hunting platform and a buffer that steadies winter temperatures. When the pack is solid, cold air sitting over Siberia does not translate into quite the same shock at the shoreline as it does over open ocean. When ice is thin or absent, the same wind can feel brutally raw.",
          "Break-up turns logistics on its head: barges replace ice roads, river mouths become debris jams, and coastal erosion accelerates where permafrost bluffs thaw. For any property, ask about flood insurance, the setback from the shore, and whether the foundation is on piles or thermosyphons.",
        ],
      },
      {
        id: "nome-light-work",
        title: "Summer light, winter dark, and daily rhythm",
        paragraphs: [
          "Summer weeks bring usable light deep into the evening — gardeners and construction crews stretch schedules naturally. Winter reverses the bargain: short daylight concentrates errands and social life into a few bright hours, while artificial light becomes a mental-health variable as much as a utility bill.",
          "On the shortest day the sun is up for less than four hours, and in late June for more than twenty-one. At this latitude the light governs the working year as much as the temperature does.",
        ],
      },
    ],
  },
  "corpus-christi-tx": {
    climateChange: { outlook2050: "Higher baseline sea level and wetter hurricanes.", outlook2100: "Surge reach expands in bay networks.", keyShifts: [{ variable: "Hurricane rainfall", direction: "up" }], resilienceNote: "Windstorm building codes have tightened post-Harvey era." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Corpus Christi Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
    deepSections: [
      {
        id: "corpus-surge-bay",
        title: "Surge, bays, and why geometry matters more than category",
        paragraphs: [
          "Hurricane hazard here is not only wind — it is water pushed into a concave coastline. Corpus Christi Bay narrows toward the city; Aransas Pass and the Laguna Madre exchange water on wind shifts. A modest storm on paper can still stack surge against a high tide. If you are evaluating a lot, elevation above the base flood elevation and the vintage of the drainage system matter more than distance to the beach in miles.",
          "Flood insurance maps are revised after major storms, so look up the current map for the address before relying on an older one.",
        ],
      },
      {
        id: "corpus-sea-breeze-heat",
        title: "Sea breeze vs offshore flow — summer comfort in practice",
        paragraphs: [
          "On many July days the Gulf supplies a late-afternoon onshore push that trims heat index peaks for an hour or two. When large-scale flow turns offshore ahead of a tropical wave, that relief disappears and heat indices spike — the same week can contain both 'manageable' and 'dangerous' afternoons.",
          "Workers and athletes learn to schedule hard outdoor blocks before noon; newcomers should plan shade, hydration, and a cool indoor anchor the way northern cities plan for wind chill in January.",
        ],
      },
    ],
  },
  "paducah-ky": {
    climateChange: { outlook2050: "Heavier spring rain; more high-CAPE nights.", outlook2100: "Mississippi basin flooding teleconnections intensify.", keyShifts: [{ variable: "Warm-season humidity", direction: "up" }], resilienceNote: "Floodplain management is central." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Barkley Regional", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "bismarck-nd": {
    climateChange: { outlook2050: "Wetter springs; more crop-damaging hail days.", outlook2100: "Winter warming faster than summer.", keyShifts: [{ variable: "Frost-free season", direction: "up" }], resilienceNote: "Agriculture adapts via cultivar shifts." },
    deepSections: [
      {
        id: "bismarck-continentality-is-logistics",
        title: "Planning around the extremes",
        paragraphs: [
          "Bismarck is far from any ocean, and no mountain range shelters it. January afternoons average −5°C and nights −16°C, and July afternoons 29°C. Winter errands depend on the car starting, on the wind chill and on whether the roads are open, and blizzards close schools and highways several times in most winters.",
          "The open setting has advantages. The air dries quickly after a storm, summer nights cool to about 15°C, and winter days are often sunny. The Missouri River runs in a wooded valley along the west side of the city and breaks up the plain.",
        ],
      },
      {
        id: "bismarck-capital-service-counterweight",
        title: "A state capital on the plains",
        paragraphs: [
          "Bismarck is the capital of North Dakota and the service center for a wide stretch of the northern plains. Two hospital systems, the state offices, large shops and an airport with flights to Minneapolis and Denver are all in the city.",
          "The climate is harsher than in lake-moderated or mountain towns. Living with it is far easier here than in a small prairie town with the same wind and cold and a long drive to a hospital.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "NOAA - Bismarck Municipal climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "City of Bismarck - municipal services", kind: "other", url: "https://www.bismarcknd.gov/1606/Services" },
      { label: "U.S. Census QuickFacts - Bismarck city", kind: "oss-data", url: "https://www.census.gov/quickfacts/fact/table/bismarckcitynorthdakota/POP010220" },
    ],
  },
  "morgantown-wv": {
    climateChange: { outlook2050: "Heavier convective rain; longer pollen seasons.", outlook2100: "Species migration on slopes.", keyShifts: [{ variable: "Flash flood frequency", direction: "up" }], resilienceNote: "Forested slopes buffer some erosion." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Morgantown Municipal", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "port-orford-cape-blanco-or": {
    climateChange: { outlook2050: "Ocean moderation persists, but winter storms, erosion, and marine heatwaves become more consequential.", outlook2100: "Sea-level and bluff exposure dominate siting decisions while summer heat remains buffered.", keyShifts: [{ variable: "Coastal erosion", direction: "up" }, { variable: "Marine heatwaves", direction: "up" }, { variable: "Summer heat", direction: "mixed" }], resilienceNote: "Excellent heat refuge, poor parcel uniformity: bluff, tsunami, wind, and landslide siting are decisive." },
    confidenceNotes: "This high-confidence profile is anchored by NOAA Port Orford/Cape Blanco normals and official coastal terrain context; bluff exposure, wind shelter, and tsunami/landslide siting need parcel checks.",
    deepSections: [
      {
        id: "port-orford-upwelling-headland",
        title: "Cold upwelling and a town on the edge of the current",
        paragraphs: [
          "Cape Blanco is the westernmost point of Oregon, and Port Orford lies just south of it. In summer, strong northerly winds blow along this coast and draw cold water to the surface. The sea air holds afternoons to about 20°C while the inland valleys of southern Oregon are above 30°C.",
          "Wind is the constant here: Cape Blanco is one of the windiest places on the Oregon coast, with northerlies in summer and southerly gales in winter. Salt spray, fog and about 1800 mm of rain a year, nearly all of it from October to May, come with the cool air.",
        ],
      },
      {
        id: "port-orford-parcel-reality",
        title: "Shelter from the wind decides the lot",
        paragraphs: [
          "Two houses a few hundred meters apart can feel very different here. One on the open bluff takes the wind and the salt directly. One behind a stand of shore pine or spruce, or on ground that faces south, has a usable garden and a quieter winter.",
          "Look for shelter belts, south-facing ground and good drainage, and check the road in storm season. Highway 101 is the only route north and south, and slides close it from time to time. The nearest hospitals are in Gold Beach and Bandon, each about 45 km away.",
        ],
      },
    ],
    citations: [
      { label: "NOAA NCEI Port Orford monthly 1991-2020 normals service", kind: "noaa", url: "https://www.ncei.noaa.gov/access/services/data/v1?dataTypes=MLY-TMAX-NORMAL%2CMLY-TMIN-NORMAL%2CMLY-TAVG-NORMAL%2CMLY-PRCP-NORMAL%2CMLY-SNOW-NORMAL&dataset=normals-monthly-1991-2020&format=pdf&stations=USC00356784" },
      { label: "NOAA NCEI U.S. Climate Normals overview", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" },
      { label: "USGS National Map coastal terrain and hydrography", kind: "usgs", url: "https://www.usgs.gov/programs/national-geospatial-program/national-map" },
    ],
  },
  "klamath-falls-upper-klamath-basin-or": {
    climateChange: { outlook2050: "Hotter summers, more drought stress, more smoke days, and tighter lake/irrigation conflict.", outlook2100: "Water allocation and wetland health dominate resilience despite continued dry-air heat relief.", keyShifts: [{ variable: "Drought", direction: "up" }, { variable: "Smoke", direction: "up" }, { variable: "Snowpack runoff", direction: "down" }], resilienceNote: "Dry air and elevation help human comfort, but watershed stress is the main long-term constraint." },
    confidenceNotes: "This high-confidence profile uses NOAA normals and official basin/wetland geography; air quality, water rights, and lake-adjacent flooding are highly site-specific.",
    deepSections: [
      { id: "klamath-water-climate", title: "Water decides more than temperature", paragraphs: ["The Upper Klamath Basin can look comfortable on temperature charts: bright, dry, cool at night, and rarely humid. But the livability question is tied to water allocation, wetland health, irrigation districts, and lake ecology.", "In drought years irrigation deliveries from the Klamath Project have been cut sharply, as in 2001 and 2021, and some household wells have gone dry. Ask about the water source for any property before anything else."] },
      { id: "klamath-inversion-sun", title: "Sunny basin, stagnant winter lid", paragraphs: ["Clear high-desert nights drain cold air into the basin, and winter high pressure can hold a stable lid over the city. That creates a familiar western-basin split: bright climate in the abstract, but occasional stagnant air at street level.", "Summer reverses the problem. Mixing is stronger, humidity is low, and evening cooling is reliable, but regional fires can import smoke into the same basin geometry that otherwise protects the place from marine gloom."] },
    ],
    citations: [
      { label: "NOAA NCEI U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" },
      { label: "USGS Upper Klamath Basin science", kind: "usgs", url: "https://www.usgs.gov/centers/oregon-water-science-center/science/upper-klamath-basin" },
      { label: "USFWS Klamath Basin National Wildlife Refuge Complex", kind: "other", url: "https://www.fws.gov/refuge/klamath-basin" },
    ],
  },
  "los-alamos-pajarito-plateau-nm": {
    climateChange: { outlook2050: "Hotter dry seasons, longer fire weather, and more stress on ponderosa and pinon belts.", outlook2100: "Forest composition shifts and post-fire flood risk become central siting concerns.", keyShifts: [{ variable: "Fire weather", direction: "up" }, { variable: "Snowpack", direction: "down" }, { variable: "Post-fire flooding", direction: "up" }], resilienceNote: "Elevation protects from lowland heat but not from forest and watershed risk." },
    confidenceNotes: "This high-confidence profile is based on NOAA normals and official Jemez/Bandelier terrain context; canyon-edge fire, drainage, and evacuation exposure are parcel-specific.",
    deepSections: [
      { id: "los-alamos-mesa-canyon", title: "Mesa neighborhoods are not one smooth climate", paragraphs: ["Los Alamos is built on the Pajarito Plateau, a set of narrow mesas divided by deep canyons on the east flank of the Jemez Mountains. Cold air drains into the canyons at night, smoke and runoff follow them, and the wind blows hardest across the mesa tops.", "Each mesa is a peninsula with few roads out, and that matters in a fire. The town was evacuated for the Cerro Grande fire in 2000, which destroyed more than 200 homes, and again for the Las Conchas fire in 2011. For any street, check the evacuation route, the drainage and how much clearing the lot needs."] },
      { id: "los-alamos-altitude-fire", title: "Altitude buys comfort, not immunity", paragraphs: ["At more than 2,200 m, the town is far cooler than the Rio Grande valley below it. July afternoons average about 28°C and nights about 14°C, and the air is dry. Winter afternoons average 4 to 7°C in strong sun, and the season's snow comes to about 80 cm.", "The forest above the town is the hazard. After both fires, summer thunderstorms on the burned slopes sent floods and debris down the canyons. July and August are the wettest months, with about 65 mm each, and that is when the flood risk below a burn is highest."] },
    ],
    citations: [
      { label: "NOAA NCEI U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" },
      { label: "NPS Bandelier National Monument", kind: "other", url: "https://www.nps.gov/band/index.htm" },
      { label: "USGS National Map Pajarito Plateau terrain context", kind: "usgs", url: "https://www.usgs.gov/programs/national-geospatial-program/national-map" },
    ],
  },
  "lander-sinks-canyon-wy": {
    climateChange: { outlook2050: "More hot dry spells, earlier snowmelt, and higher fire weather on foothill and canyon edges.", outlook2100: "Range snowpack and late-summer water timing become the main resilience question.", keyShifts: [{ variable: "Snowpack", direction: "down" }, { variable: "Fire weather", direction: "up" }, { variable: "Summer heat", direction: "up" }], resilienceNote: "Dry air and elevation help comfort; water timing and wind/fire exposure remain hard constraints." },
    confidenceNotes: "This high-confidence profile uses NOAA/NWS Wyoming normals and official canyon/terrain context; wind exposure, irrigation, and snow drifting vary sharply by site.",
    deepSections: [
      { id: "lander-foothill-transition", title: "The useful edge between basin and range", paragraphs: ["Lander's climate is valuable because it is not purely basin and not fully mountain. The town sits where dry High Plains air, canyon shelter, and Wind River snow-water influence overlap, giving it better texture than a station number alone shows.", "That edge gives residents choices: warmer benches, creek bottoms, canyon-adjacent shelter, and quick access to colder high country. The tradeoff is wind, winter severity, and a short growing season."] },
      { id: "lander-wind-dry-air", title: "Dry air makes comfort, wind makes friction", paragraphs: ["Low humidity is the comfort engine. Summer heat loses its oppressive edge, sweat works, nights cool, and shoulder seasons can feel astonishingly clear. But the same openness exposes homes, gardens, and roads to wind.", "Good siting in Lander is practical: look for wind breaks, solar orientation, drifting patterns, and whether a property has enough water and shelter to turn dry-air comfort into daily livability."] },
    ],
    citations: [
      { label: "NWS Riverton 1991-2020 Wyoming climate normals", kind: "noaa", url: "https://www.weather.gov/riw/cms_wyclimatenormals_2020" },
      { label: "NOAA NCEI U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" },
      { label: "Wyoming State Parks - Sinks Canyon", kind: "other", url: "https://wyoparks.wyo.gov/index.php/places-to-go/sinks-canyon" },
    ],
  },
  "mentone-al": {
    climateChange: { outlook2050: "Longer pollen season; heavier convective rain.", outlook2100: "Southern Appalachian species migration upslope.", keyShifts: [{ variable: "Humid heat nights", direction: "up" }], resilienceNote: "Elevation buffers some heat relative to the valley." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Valley Head 2 NE (proxy)", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "norfolk-ct": {
    climateChange: { outlook2050: "Shorter snow season; wetter shoulder storms.", outlook2100: "Hardiness zone creep upward.", keyShifts: [{ variable: "Winter snow", direction: "down" }], resilienceNote: "Cold infrastructure still matters for decades." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Norfolk 2 SW", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "lewes-de": {
    climateChange: { outlook2050: "Higher surge reach; more compound flood–rain events.", outlook2100: "Salt intrusion into shallow aquifers.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Elevation is the long-term constraint." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Lewes (Sussex County)", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "clayton-ga": {
    climateChange: { outlook2050: "Heavier extreme rain on slopes.", outlook2100: "Species migration upslope.", keyShifts: [{ variable: "Flash flood risk", direction: "up" }], resilienceNote: "Forested slopes buffer erosion if kept intact." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Clayton 1 WSW", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "galena-il": {
    climateChange: { outlook2050: "More intense spring rain on bluffs.", outlook2100: "Shorter ice season on the river.", keyShifts: [{ variable: "Heavy rain", direction: "up" }], resilienceNote: "Topographic diversity aids adaptation." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Galena", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "beverly-shores-in": {
    climateChange: { outlook2050: "Less ice cover may reduce snowband frequency but increase lake heat.", outlook2100: "Shifting shoreline ecology.", keyShifts: [{ variable: "Lake ice", direction: "down" }], resilienceNote: "Lake moderation still dominates local comfort." },
    deepSections: [
      {
        id: "beverly-shores-lake-season-lag",
        title: "The lake shifts the seasons",
        paragraphs: [
          "Lake Michigan warms and cools more slowly than the land, and Beverly Shores follows it. In April and May the water is still cold and a breeze off the lake can chill the beach within minutes. In September and October the water is warm and holds off the first frost.",
          "In July the lake breeze keeps the beach a few degrees cooler than towns inland. From November to January cold winds blowing down the length of the lake bring cloud and bands of snow, about 190 cm in a winter, and totals differ over a few kilometers.",
        ],
      },
      {
        id: "beverly-shores-small-town-friction",
        title: "A few hundred residents inside a national park",
        paragraphs: [
          "Beverly Shores has a few hundred year-round residents and is surrounded by Indiana Dunes National Park. Many of the houses are seasonal. Shops, schools and medical care are in Chesterton and Michigan City, a short drive away, and the South Shore Line runs to Chicago.",
          "The beach and the dune trails are the reason to live here. Against them stand the grey winters, the small number of houses for sale and the lake itself: high water in 2019 and 2020 cut away the beach and undermined parts of Lake Front Drive.",
        ],
      },
    ],
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "NOAA - Michigan City IN climate normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "National Park Service - Indiana Dunes National Park", kind: "other", url: "https://www.nps.gov/indu/" },
      { label: "Town of Beverly Shores - municipal services", kind: "other", url: "https://www.in.gov/towns/beverlyshores/" },
    ],
  },
  "oakland-md": {
    climateChange: { outlook2050: "Wetter springs; shorter snow season.", outlook2100: "Hardiness zone migration upward.", keyShifts: [{ variable: "Heavy rain", direction: "up" }], resilienceNote: "Lake tourism economy sensitive to winter reliability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Oakland 2 SE", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "pittsfield-ma": {
    climateChange: { outlook2050: "More freeze–thaw; maple sap windows shift.", outlook2100: "Species composition shifts upslope.", keyShifts: [{ variable: "Winter freeze–thaw", direction: "up" }], resilienceNote: "Forest-based economies need adaptive management." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Pittsfield Airport", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "ocean-springs-ms": {
    climateChange: { outlook2050: "Higher sea level and surge risk; wetter hurricanes.", outlook2100: "Saltwater intrusion into coastal soils.", keyShifts: [{ variable: "Hurricane rainfall", direction: "up" }], resilienceNote: "Wind and storm surge dominate planning." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Biloxi MS (proxy sound)", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "eminence-mo": {
    climateChange: { outlook2050: "Heavier convective rain; flashier streams.", outlook2100: "Groundwater sensitivity to land-use change.", keyShifts: [{ variable: "Flash flood frequency", direction: "up" }], resilienceNote: "Springs buffer some warming but not land-use stress." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Eminence", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USGS — Ozark Plateau springs", kind: "usgs", url: "https://www.usgs.gov/" }],
  },
  "mount-charleston-nv": {
    climateChange: { outlook2050: "Earlier snowmelt; longer fire season upslope.", outlook2100: "Desert encroachment on lower elevations.", keyShifts: [{ variable: "Snowpack", direction: "down" }, { variable: "Wildfire", direction: "up" }], resilienceNote: "Water supply for Las Vegas is downstream; forest stress is upslope." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Mount Charleston cooperative summaries", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "USFS — Spring Mountains NRA", kind: "other" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "charleston-inversion",
        title: "Basin inversion and the mountain island",
        paragraphs: [
          "Las Vegas Valley’s frequent clear, stable nights create strong nocturnal inversions that pool cool air near the surface — paradoxically trapping heat and pollutants in the same layer. Above the inversion cap, the Spring Mountains intercept moisture and radiate freely to space under clear skies.",
          "That vertical separation is why a morning drive can traverse from basin smog and searing afternoon heat in the valley to pine-scented air and crisp dew points near treeline in one hour.",
        ],
      },
      {
        id: "charleston-hydrology",
        title: "Snowpack, springs, and desert demand",
        paragraphs: [
          "Winter snowpack is the primary natural reservoir for high-elevation springs that feed lower desert ecosystems and human supply. Warming shifts the snow–rain ratio and advances melt timing — a hydrologic stressor for species adapted to late-summer streamflow.",
          "Management tension here is not hypothetical: recreation, municipal water, and wildfire risk all scale with how snow and rain partition across the narrow elevation bands.",
        ],
      },
    ],
  },
  "cape-may-nj": {
    climateChange: { outlook2050: "Surge and nuisance flooding increase.", outlook2100: "Barrier migration and beach nourishment costs rise.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Tourism economy is storm-exposed." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Cape May County AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "geneva-on-the-lake-oh": {
    climateChange: { outlook2050: "Less ice, shifting snowbands.", outlook2100: "More lake-effect rain vs snow events.", keyShifts: [{ variable: "Lake ice", direction: "down" }], resilienceNote: "Shoreline erosion competes with winter tourism." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Geneva", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "broken-bow-ok": {
    climateChange: { outlook2050: "Heavier extreme rain; longer fire season in droughts.", outlook2100: "Forest stress under heat waves.", keyShifts: [{ variable: "Convective rain", direction: "up" }], resilienceNote: "Water resources are reservoir-dependent." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Broken Bow", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "block-island-ri": {
    climateChange: { outlook2050: "Storm-surge and erosion accelerate.", outlook2100: "Habitat migration with sea-level rise.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Freshwater lens is finite." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Block Island State Airport", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "spearfish-sd": {
    climateChange: { outlook2050: "Warmer winters; more rain vs snow.", outlook2100: "Fire–grass transition risk on ecotone.", keyShifts: [{ variable: "Winter snow fraction", direction: "down" }], resilienceNote: "Water supply tied to Black Hills snowpack." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — Spearfish", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "NWS Rapid City — Black Hills climatology notes", kind: "noaa", url: "https://www.weather.gov/unr/" }],
    deepSections: [
      {
        id: "spearfish-chinook",
        title: "Foehn mechanics and surface traces",
        paragraphs: [
          "When mid-latitude westerlies impinge on the Black Hills, stable flow can descend lee slopes as a warm, dry downslope wind. In narrow valleys, the replacement of cold pool air happens quickly enough to produce step changes in temperature readings that are visible on minute-resolution archives.",
          "These are not merely ‘nice warm days’ — they are adiabatic warming events with real implications for snowmelt, road ice, and wildfire risk when relative humidity crashes.",
        ],
      },
      {
        id: "spearfish-ecotone",
        title: "Ecotone fire and water",
        paragraphs: [
          "Spearfish sits where ponderosa pine meets grassland — a boundary that moves with fire frequency and winter moisture. Climate warming pushes some processes toward more rain-dominated winter precipitation, which changes both fire season length and plant recruitment.",
          "Management here is applied climatology: fuel treatments, water rights, and recreation economies all depend on how snow and wind regimes shift together.",
        ],
      },
    ],
  },
  "burkes-garden-va": {
    climateChange: { outlook2050: "Earlier spring warming alters pool frequency.", outlook2100: "Cold-pool intensity may weaken with fewer clear, calm nights.", keyShifts: [{ variable: "Frost-free season", direction: "up" }], resilienceNote: "Agricultural calendars must track floor vs rim separately." },
    confidenceNotes: "This high-confidence profile is reliable at microclimate-zone scale because NOAA normals, federal terrain/hydrography sources, and atlas relief reasoning agree; parcel exposure, smoke, insurance, and water access still need local checks.",
    citations: [{ label: "NOAA — nearby Tazewell County stations", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }, { label: "Journal of Applied Meteorology — Appalachian cold pools (regional synthesis)", kind: "academic" },
      { label: "NOAA NCEI 1991-2020 U.S. Climate Normals", kind: "noaa", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" }
    ],
    deepSections: [
      {
        id: "burkes-pool-dynamics",
        title: "Ventilation, pooling, and humidity",
        paragraphs: [
          "Cold-air pools in humid eastern climates differ from intermountain-west basins: longwave cooling still drives surface stratification, but soil moisture and cloud feedbacks can either reinforce or erode the pool depending on synoptic wind.",
          "Burkes Garden’s nearly closed geometry limits horizontal ventilation until pressure gradients strengthen — a situation where a few meters of elevation change can mean the difference between liquid dew and rime on crops.",
        ],
      },
      {
        id: "burkes-agriculture",
        title: "Floor vs rim farming",
        paragraphs: [
          "Hay and pasture dominate the floor because risk management is simpler at scale than tree fruit with late-spring radiation freezes. Rim sites catch earlier spring sun and avoid the deepest pools — classic thermal-belt logic transposed onto a sinkhole landform.",
          "Climate change does not remove the pool; it changes the frequency of destructive freeze events relative to phenological advance — the central problem of eastern orchardists everywhere.",
        ],
      },
    ],
  },
  "spokane-wa": {
    climateChange: { outlook2050: "Hotter, drier late summers; longer fire season.", outlook2100: "Snowpack-dependent water stress rises.", keyShifts: [{ variable: "Wildfire smoke", direction: "up" }], resilienceNote: "River supply buffers some drought years." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Spokane Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "napa-ca": {
    climateChange: { outlook2050: "Earlier budbreak; frost risk in volatile springs.", outlook2100: "Variety migration upslope.", keyShifts: [{ variable: "Heat extremes", direction: "up" }], resilienceNote: "Water rights and fire smoke are sector risks." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Napa County AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "palm-springs-ca": {
    climateChange: { outlook2050: "More extreme heat days.", outlook2100: "Water and energy demand dominate.", keyShifts: [{ variable: "Extreme heat", direction: "up" }], resilienceNote: "Tourism timing may shift earlier in year." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Palm Springs", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "austin-tx": {
    climateChange: { outlook2050: "Hotter nights; heavier extreme rain.", outlook2100: "Water stress in drought cycles.", keyShifts: [{ variable: "Urban heat", direction: "up" }], resilienceNote: "Flash flood design is central to resilience." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Camp Mabry", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "naples-fl": {
    climateChange: { outlook2050: "Higher surge reach; wetter hurricanes.", outlook2100: "Coastal squeeze on infrastructure.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Insurance and drainage define livability." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Naples", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "buffalo-ny": {
    climateChange: { outlook2050: "Less ice, shifting band locations.", outlook2100: "More lake-effect rain vs snow mix.", keyShifts: [{ variable: "Lake ice", direction: "down" }], resilienceNote: "Shoreline bluff erosion accelerates." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Buffalo Niagara Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "scottsbluff-ne": {
    climateChange: { outlook2050: "Warmer; more crop hail days.", outlook2100: "Aquifer stress tightens.", keyShifts: [{ variable: "Growing season", direction: "up" }], resilienceNote: "Irrigation from Platte storage is contested." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Scottsbluff", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "mobile-al": {
    climateChange: { outlook2050: "Wetter hurricanes; higher surge.", outlook2100: "Compound flood risk in low districts.", keyShifts: [{ variable: "Extreme rainfall", direction: "up" }], resilienceNote: "Drainage and insurance are planning pillars." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Mobile Regional AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "savannah-ga": {
    climateChange: { outlook2050: "Higher nuisance flooding; wetter storms.", outlook2100: "Salt intrusion into low groundwater.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Historic district elevation varies block by block." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Savannah Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "wilmington-de": {
    climateChange: { outlook2050: "Wetter extremes; longer pollen season.", outlook2100: "Urban heat intensifies.", keyShifts: [{ variable: "Heavy rain", direction: "up" }], resilienceNote: "River flooding remains the acute hazard." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — New Castle County AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "mystic-ct": {
    climateChange: { outlook2050: "Higher surge reach; warmer late summer water.", outlook2100: "Marsh migration inland.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Historic port infrastructure is exposed." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Groton/New London", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "state-college-pa": {
    climateChange: { outlook2050: "Wetter springs; longer pollen season.", outlook2100: "Species migration on slopes.", keyShifts: [{ variable: "Heavy rain", direction: "up" }], resilienceNote: "Flash flooding in steep hollows rises." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — University Park", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "columbia-sc": {
    climateChange: { outlook2050: "More dangerous heat indices.", outlook2100: "Heavier convective rain.", keyShifts: [{ variable: "Humid heat", direction: "up" }], resilienceNote: "Urban tree cover is a health intervention." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Columbia Metro AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "des-moines-ia": {
    climateChange: { outlook2050: "Wetter springs; more hail days.", outlook2100: "Growing season lengthens.", keyShifts: [{ variable: "Extreme rain", direction: "up" }], resilienceNote: "Agricultural adaptation is cultivar-driven." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Des Moines Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "tucson-az": {
    climateChange: { outlook2050: "Hotter; uncertain monsoon moisture totals.", outlook2100: "Heat stress dominates urban design.", keyShifts: [{ variable: "Heat extremes", direction: "up" }], resilienceNote: "Water banking is existential." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Tucson Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "anchorage-ak": {
    climateChange: { outlook2050: "Warmer winters; more rain vs snow.", outlook2100: "Permafrost issues limited at coast but glacier loss visible.", keyShifts: [{ variable: "Snow fraction", direction: "down" }], resilienceNote: "Landslide risk rises on thawing slopes." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [
      { label: "NOAA - Anchorage International normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
      { label: "Weather Spark - Anchorage average weather", kind: "other", url: "https://weatherspark.com/y/252/Average-Weather-in-Anchorage-Alaska-United-States-Year-Round" },
      { label: "Climate-Data.org - Anchorage humidity", kind: "other", url: "https://en.climate-data.org/north-america/united-states-of-america/alaska/anchorage-1419/" },
      { label: "U.S. Climate Data - Anchorage sunshine hours", kind: "other", url: "https://usclimatedata.com/climate/anchorage/alaska/united-states/usak0012", note: "Monthly sunshinePct is approximated from reported monthly sunshine hours divided by Weather Spark monthly daylight hours." },
      { label: "Providence Alaska Medical Center", kind: "other", url: "https://www.providence.org/locations/ak/alaska-medical-center" },
      { label: "Ted Stevens Anchorage International Airport", kind: "other", url: "https://dot.alaska.gov/anc/" },
      { label: "Don Young Port of Alaska", kind: "other", url: "https://www.portofalaska.com/" },
      { label: "Municipality of Anchorage All-Hazards Mitigation Plan", kind: "other", url: "https://www.muni.org/Departments/OEM/Plans/SiteAssets/pages/oem-mitigation-plan/MOA%20All%20Hazards%20Mitigation%20Plan%202022%20updated%20Jan%2026.pdf" },
    ],
    deepSections: [
      {
        id: "anchorage-alaska-city-services",
        title: "Alaska scale, city services",
        paragraphs: [
          "Anchorage holds about 290,000 people, roughly two in five Alaskans. Providence Alaska Medical Center is the largest hospital in the state, Ted Stevens Anchorage International Airport is its main air gateway, and much of the state's freight arrives through the Port of Alaska.",
          "It is still a long way from anywhere else. Nearly everything is shipped or flown in, and prices show it. On the shortest day the sun is up for about five and a half hours. Snow totals about 200 cm in a winter and lies from late autumn into April.",
        ],
      },
      {
        id: "anchorage-cook-inlet-hazard-homework",
        title: "Milder than the interior, with earthquakes and avalanches",
        paragraphs: [
          "Cook Inlet and the Chugach Mountains keep Anchorage milder than interior Alaska. January nights average about −12°C here and about −25°C in Fairbanks. Summer afternoons average 19 to 20°C, with daylight late into the evening.",
          "The ground is the main hazard. The 1964 earthquake, magnitude 9.2, destroyed parts of downtown and the Turnagain neighborhood where the clay beneath them gave way, and a magnitude 7.1 earthquake in 2018 damaged roads and buildings. Hillside neighborhoods face wildfire and strong winds off the Chugach, and avalanches close the Seward Highway in some winters.",
        ],
      },
    ],
  },
  "honolulu-hi": {
    climateChange: { outlook2050: "Coastal inundation and reef stress.", outlook2100: "Trade-wind changes uncertain.", keyShifts: [{ variable: "Sea level", direction: "up" }], resilienceNote: "Freshwater lenses are finite." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Honolulu Intl", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "roswell-nm": {
    climateChange: { outlook2050: "Hotter; more evaporation demand.", outlook2100: "Aquifer stress.", keyShifts: [{ variable: "Heat", direction: "up" }], resilienceNote: "Water rights dominate planning." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Roswell Industrial AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "rapid-city-sd": {
    climateChange: { outlook2050: "Warmer; more high-CAPE hail days.", outlook2100: "Fire–prairie interface shifts.", keyShifts: [{ variable: "Severe storm", direction: "up" }], resilienceNote: "Flash flooding in 1972 remains in civic memory." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Rapid City Regional", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "jackson-wy": {
    climateChange: { outlook2050: "Earlier snowmelt; longer fire season.", outlook2100: "Tourism economy stressed by low-snow winters.", keyShifts: [{ variable: "Snowpack", direction: "down" }], resilienceNote: "Wildlife migration corridors are climate-sensitive." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Jackson AWOS", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
  "washington-dc": {
    climateChange: { outlook2050: "More dangerous heat indices; wetter extremes.", outlook2100: "Potomac flooding risk rises.", keyShifts: [{ variable: "Humid heat", direction: "up" }], resilienceNote: "Tree canopy is equity and health policy." },
    confidenceNotes: "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.",
    citations: [{ label: "NOAA — Reagan National AP", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" }],
  },
};
