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
        title: "River delta and Gulf maritime set the humidity floor",
        paragraphs: [
          "Apalachicola sits where the river of the same name meets the Gulf behind a chain of barrier islands, so the air here is Gulf-maritime first and continental second. The offshore bars blunt tropical systems slightly but they also pin humid air against the estuary, which is why the monthly humidity stays in the upper-70s even in winter and rarely falls below the mid-60s in spring.",
          "Reading the delta as a microclimate entry means separating the mainland town from the offshore barrier-island chain. The town runs cooler in summer than inland Florida panhandle cities because of the river-marsh exposure and afternoon Gulf breeze, but it also stays muggier at night — the same water that buffers daytime heat returns it as humidity after sundown.",
        ],
      },
      {
        id: "apalachicola-fisheries-water-and-storm-read",
        title: "Fisheries, water, and storm exposure are the live-here filter",
        paragraphs: [
          "Apalachicola's economy has been oyster-and-shrimp based for generations, and the oyster fishery in particular depends on freshwater flows from the Apalachicola-Chattahoochee-Flint basin. The long tri-state water dispute is therefore not abstract policy — it shows up in salinity, in oyster survival, and in the working-waterfront economy a scout can see on the docks.",
          "Storm exposure is the other live-here read. The town has been brushed or hit by Gulf tropical systems repeatedly, and the 2018 Hurricane Michael track across the panhandle is the recent benchmark. A relocation read should weigh elevation and floodplain position block by block, not just compare annual averages — the climate is broadly forgiving, but the hazard tail is real and the insurance market reflects it.",
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
      note: "Asheville's climate-refuge reputation has tightened housing affordability against wage base, but Mission Hospital gives the city a stronger service anchor than most mountain counties. Heavy-rain events, landslide exposure on steep slopes, and the French Broad floodplain are the practical climate-friction points.",
      sources: [
        { label: "U.S. Census QuickFacts — Asheville city", url: "https://www.census.gov/quickfacts/fact/table/ashevillecitynorthcarolina/PST045224" },
        { label: "Mission Hospital — Asheville", url: "https://www.missionhealth.org/location-hub/mission-hospital/" },
        { label: "City of Asheville — hazard mitigation context", url: "https://www.ashevillenc.gov/department/community_resilience/hazard_mitigation/" },
      ],
    },
    deepSections: [
      {
        id: "asheville-french-broad-basin-and-blue-ridge-mildness",
        title: "French Broad basin and Blue Ridge shelter set the mildness",
        paragraphs: [
          "Asheville sits in a broadened section of the French Broad River valley at the confluence where the Swannanoa cuts through the Blue Ridge Escarpment, and that basin geometry is what makes the climate read milder than the surrounding ridgeline elevations would suggest. Winter cold fronts dump feet of snow on Mount Mitchell to the north-east while downtown Asheville stays rainy and near 5°C.",
          "Reading the basin as a microclimate entry means separating the downtown valley from the surrounding slopes. Thermal-belt behaviour on the south- and west-facing slopes above the river keeps overnight lows warmer than the basin floor on calm nights, and that is part of why the apple orchards and residential ridges around town have historically run a touch milder than the airport normals.",
        ],
      },
      {
        id: "asheville-tourism-water-and-storm-friction",
        title: "Tourism, water, and heavy-rain storms are the live-here filter",
        paragraphs: [
          "Asheville's tourism-and-second-home economy has tightened housing affordability against a relatively low regional wage base, and that cost pressure is the dominant lived filter behind the climate appeal. Mission Hospital and the county school system give the city a deeper service base than most Appalachian county seats, which softens the access-friction score.",
          "Heavy-rain storms are the climate side of the same read. The 2024 Hurricane Helene flood across the French Broad and Swannanoa watersheds showed how quickly a tropical remnant can overwhelm a steep valley. A relocation read should compare floodplain position, slope stability, and ridge-versus-valley elevation block by block — the mild annual averages do not capture the hazard tail.",
        ],
      },
    ],
  },
  "astoria-or": {
    climate: { humidity: [86, 84, 80, 76, 75, 78, 82, 84, 84, 86, 88, 88], sunshinePct: [28, 35, 45, 52, 55, 55, 60, 60, 55, 42, 30, 25] },
    deepSections: [
      {
        id: "astoria-columbia-mouth-and-pacific-fog-machine",
        title: "Columbia mouth and Pacific fog machine set the gray-season read",
        paragraphs: [
          "Astoria sits at the Columbia River mouth where Pacific marine air pushes inland over a broad estuary, and that geometry makes the fog-belt signal one of the strongest on the Oregon coast. Winters are gray and rainy with weeks of stratus; summers stay cool with morning fog that burns back to the beaches by afternoon.",
          "Reading the climate as a microclimate entry means separating the south-bank hillside neighborhoods from the downtown waterfront. The hills above town run slightly warmer on calm nights as cold air drains to the river, while the waterfront stays maritime-cool almost year-round — a gradient a single afternoon drive can feel.",
        ],
      },
      {
        id: "astoria-fishing-port-and-rainy-season-flood",
        title: "Fishing port economy and rainy-season flood are the live-here filter",
        paragraphs: [
          "Astoria's working-waterfront identity and Columbia-bar salmon-and-sturgeon fishery keep the town employed when tourism dips, and that working-class base softens the cost-pressure score compared with purely tourist coastal towns. Columbia Memorial Hospital covers most daily medical needs; Portland remains the specialty-care anchor.",
          "Rainy-season flood and coastal-storm exposure are the climate side of the same read. Atmospheric-river events can push the Youngs and Necanicum rivers out of bank quickly, and the 2007 and 2022 storms showed how exposed the low-lying downtown and pier infrastructure can be. A relocation read should weigh elevation, slope stability, and tsunami-zone position block by block.",
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
      note: "Austin's tech-and-university growth has put sustained pressure on housing affordability; daily services, hospitals, and Austin-Bergstrom International Airport cover most needs. Urban heat-island nights and 100-year-floodplain redevelopment along Shoal, Walnut, and Onion creeks are the climate-weighted friction points.",
      sources: [
        { label: "U.S. Census QuickFacts — Austin city", url: "https://www.census.gov/quickfacts/fact/table/austincitytexas/PST045224" },
        { label: "City of Austin — housing and planning", url: "https://www.austintexas.gov/department/housing-and-planning" },
        { label: "Central Texas hospitals — Ascension Seton", url: "https://healthcare.ascension.org/Locations/Texas/AUSTN/AUSTN/seton-medical-center-austin" },
      ],
    },
    deepSections: [
      {
        id: "austin-river-corridor-and-balcones-escarpment",
        title: "River corridor and Balcones Escarpment shape the heat island",
        paragraphs: [
          "Austin's climate signature is the collision between humid Gulf air and the Balcones Escarpment that lifts it — the same mechanism that produces violent spring and autumn supercells also traps humidity over the urban core. The Colorado River corridor cuts a slightly cooler ribbon through the city, but impervious surfaces and a long warm season push summer overnight lows higher than the surrounding Hill Country.",
          "Reading Austin as a microclimate entry means separating the river-corridor and eastern cross-sections from the hillier west. The heat-island signal is real, but the city's strongest microclimate contrast is between the limestone uplift west of MoPac and the blackland prairie east of I-35 — a gradient a scout trip can feel in a single afternoon drive.",
        ],
      },
      {
        id: "austin-growth-water-and-heat",
        title: "Growth, water, and heat extremes are the long-term filter",
        paragraphs: [
          "The Edwards Aquifer recharge zone, the Highland Lakes chain, and the Lower Colorado River Authority's water management together decide how much growth the region can carry. Drought years sharpen that constraint; the 2011 and 2023 droughts showed how quickly reservoir storage can drop when rainfall misses the watershed.",
          "Heat and flood extremes are the lived-climate side of the same coin. The 2015 Memorial Day floods, the 2018 Shoal Creek floods, and the 2021 February freeze showed that the climate risk is not a single variable. A relocation read should weigh wildfire exposure on the western edge, urban heat-island nights, and the city's ongoing drainage investments together, not just compare annual averages.",
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
        title: "Downeast fog and island buffer set the cool-summer read",
        paragraphs: [
          "Bar Harbor sits on Mount Desert Island where the cold Gulf of Maine and the warm Maine Coastal Current mix, and that mixing zone produces one of the strongest summer-fog signals on the East Coast. Winters are cold and snowy with regular Nor'easters; summers stay in the low-20s with afternoon sea-breeze relief and frequent morning fog.",
          "Reading the island as a microclimate entry means separating the shoreline from the inland hills. Cadillac Mountain and the surrounding granite domes run warmer on calm summer afternoons but cooler on clear winter nights, while the village waterfront stays maritime-stable almost year-round — a gradient that a single drive up the Park Loop Road can feel.",
        ],
      },
      {
        id: "bar-harbor-tourism-and-winter-isolation",
        title: "Acadia tourism and winter isolation are the live-here filter",
        paragraphs: [
          "Bar Harbor's identity is dominated by Acadia National Park and the cruise-ship season, and that tourism-and-second-home economy tightens housing against a small year-round wage base. Mount Desert Island Hospital covers most daily medical needs; Bangor and Portland remain the specialty-care and airport anchors.",
          "Winter isolation is the climate side of the same read. The town empties between November and April, restaurants and services close, and storm-driven power outages can last days. A relocation read should weigh year-round employment, ferry-and-flight access, and flood-zone position along the Shore Road corridor — the cool-summer climate appeal is real, but it is a seasonal economy.",
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
    deepSections: [
      {
        id: "beverly-shores-lake-michigan-snowbelt-and-dunes",
        title: "Lake Michigan snowbelt and dune geometry set the winter read",
        paragraphs: [
          "Beverly Shores sits on a narrow strip of land between Lake Michigan and the Great Marsh of the Indiana Dunes, and that geometry makes the lake-effect snowbelt signal one of the strongest in the Indiana coast. Winters bring frequent lake-effect bands off the open water; summers stay a degree or two cooler than the inland Chicago suburbs thanks to the afternoon lake breeze.",
          "Reading the dune strip as a microclimate entry means separating the beachfront from the marsh side. The foredune ridges run warmer on calm nights as cold air drains into the marsh, while the beachfront stays lake-moderate almost year-round — a gradient a single walk along the Calumet Trail can feel.",
        ],
      },
      {
        id: "beverly-shores-lake-access-and-coastal-erosion",
        title: "Lake access and coastal-erosion homework are the live-here filter",
        paragraphs: [
          "Beverly Shores is a small residential town with the Indiana Dunes National Park as its backyard, and that parks-and-beach access is the lifestyle draw. The town's small year-round population means most services route through Chesterton, Michigan City, or the greater Chicago metro — a manageable access-friction profile for a residential outpost.",
          "Coastal-erosion and lake-level flood homework are the climate side of the same read. The 2019 and 2020 high-water events on Lake Michigan carved away front-lot dunes across the Indiana coast, and the Beverly Shores shoreline was among the most exposed. A relocation read should weigh setback from the foredune, base elevation, and the long-term shoreline-management plan lot by lot.",
        ],
      },
    ],
  },
  "bismarck-nd": {
    climate: { humidity: [78, 76, 72, 64, 62, 65, 68, 70, 70, 70, 76, 80], sunshinePct: [50, 56, 62, 64, 66, 68, 70, 68, 64, 58, 48, 44] },
    deepSections: [
      {
        id: "bismarck-northern-plains-and-missouri-river-corridor",
        title: "Northern plains and Missouri River corridor set the continental read",
        paragraphs: [
          "Bismarck sits on the east bank of the Missouri River where the Northern Great Plains meet the Missouri Coteau, and that position gives the city one of the strongest continental temperature swings in the lower 48. Winter arctic fronts drop overnight lows below −25°C; summer convective days push highs above 32°C with strong diurnal recovery.",
          "Reading the plains as a microclimate entry means separating the river corridor from the coteau uplands. The Missouri Valley runs a degree or two milder on calm winter nights as cold air drains off the coteau, while the uplands run cooler in summer with stronger overnight cooling — a gradient a drive south toward Fort Rice can feel.",
        ],
      },
      {
        id: "bismarck-winter-cost-and-snow-read",
        title: "Winter cost, snow labour, and Missouri River flood are the live-here filter",
        paragraphs: [
          "Bismarck's role as the state capital and the Missouri-Plate regional service centre gives it a deeper employment and medical base than most Northern Plains cities of comparable size. CHI St. Alexius and Sanford Health cover most daily medical needs; Bismarck Airport offers direct flights to the major hubs.",
          "Winter cost and snow labour are the climate side of the same read. Heating season runs October through April, snow removal is a months-long routine, and the 2009 and 2011 Missouri River floods showed how quickly a plains snowmelt can overwhelm the reservoir-release schedule. A relocation read should weigh floodplain position, heating-cost budget, and the long winter driving season — the climate is genuinely continental, not just cold.",
        ],
      },
    ],
  },
  "block-island-ri": {
    climate: { humidity: [80, 78, 75, 72, 72, 76, 80, 82, 82, 80, 78, 80], sunshinePct: [48, 52, 56, 60, 62, 65, 68, 68, 62, 58, 48, 45] },
    deepSections: [
      {
        id: "block-island-block-island-sound-and-hurricane-read",
        title: "Block Island Sound and the hurricane track set the maritime read",
        paragraphs: [
          "Block Island sits 14 km off the Rhode Island mainland in Block Island Sound, and that oceanic exposure makes the climate read more maritime than any mainland southern New England site. Winters stay a degree or two milder than Point Judith; summers stay cooler than Narragansett with frequent afternoon sea-breeze relief.",
          "Reading the island as a microclimate entry means separating the harbor side from the highlands. The south-east-facing Mohegan Bluffs run cooler and more wind-exposed, while the Great Salt Pond shore stays more sheltered — a gradient a single ride along Corn Neck Road can feel.",
        ],
      },
      {
        id: "block-island-ferry-life-and-storm-exposure",
        title: "Ferry-only access and storm exposure are the live-here filter",
        paragraphs: [
          "Block Island's year-round population is small and almost every service — including most medical care beyond the island clinic — routes through the Point Judith ferry or the seasonal New London fast ferry. That ferry-only access is the defining lived-friction point: weather cancellations in winter are routine and a storm can isolate the island for days.",
          "Storm exposure is the climate side of the same read. The 1938 and 1991 hurricanes, the 2012 Sandy track, and the increasing frequency of Nor'easter wind events all show how exposed the low-lying harbor and Corn Neck Road are. A relocation read should weigh ferry reliability, base elevation, and wind-loading on older homes — the cool-summer climate appeal is real, but it is an island economy.",
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
        title: "Anza-Borrego basin geometry and Sonoran heat set the desert read",
        paragraphs: [
          "Borrego Springs sits in a closed desert basin surrounded by the Anza-Borrego Desert State Park mountains, and that enclosed geometry produces one of the hottest sustained summer climates in California. July and August highs routinely exceed 42°C, with overnight lows staying above 24°C on the warmest nights.",
          "Reading the basin as a microclimate entry means separating the valley floor from the surrounding foothills. A 600 m climb up Montezuma Grade toward Ranchita drops daytime highs 4 to 5°C and brings overnight lows into the mid-teens — the gradient is sharp enough to feel in a single drive.",
        ],
      },
      {
        id: "borrego-springs-tourism-water-and-summer-isolation",
        title: "Tourism, water, and summer isolation are the live-here filter",
        paragraphs: [
          "Borrego Springs is a small desert community whose economy turns on the winter-spring tourist season; most businesses close or reduce hours through the July-to-September heat. Daily services route through Julian or the greater Palm Springs area for anything beyond the local clinic, and that isolation is the defining lived-friction point.",
          "Water and heat extremes are the climate side of the same read. The Borrego Valley aquifer is in long-term decline as agricultural and residential draw exceeds recharge, and the 2020 and 2024 heatwaves showed how exposed the town is to sustained 45°C-plus afternoons. A relocation read should weigh aquifer-dependent well reliability, cooling-cost budget, and the long drive to a hospital — the desert is genuinely beautiful, but it is a small, isolated, water-constrained town.",
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
        title: "Front Range chinook and Boulder Basin air set the mild-winter read",
        paragraphs: [
          "Boulder sits at the base of the Front Range where the Continental Divide drops abruptly to the High Plains, and that geometry gives the city one of the most pronounced chinook corridors in the West. Winter cold fronts often warm 10 to 15°C in a single day as westerly flow descends the foothills, and the snowpack that accumulates on the Divide often melts within a week at the city elevation.",
          "Reading Boulder as a microclimate entry means separating the downtown basin from the foothills slopes. The downtown runs warmer on calm winter nights as cold air drains out to the plains, while the Sunshine Canyon and Pine Brook Hills slopes stay cooler in summer with stronger overnight cooling — a gradient a single drive up Boulder Canyon can feel.",
        ],
      },
      {
        id: "boulder-wildfire-flood-and-cost-pressure",
        title: "Wildfire, flood, and cost pressure are the live-here filter",
        paragraphs: [
          "Boulder's role as a university and federal-research city has put sustained pressure on housing affordability, and that cost pressure is the dominant lived filter behind the mild-winter climate appeal. BCH and the surrounding UC Health system give the city a strong medical anchor; Denver International Airport covers long-haul flights.",
          "Wildfire and flood are the climate side of the same read. The 2010 Fourmile Fire, the 2021 Marshall Fire, and the 2013 Boulder Creek flood showed how exposed the urban-wildland edge and the creek corridors are. A relocation read should weigh wildfire exposure on the foothills lots, flood-zone position along Boulder Creek and South Boulder Creek, and the city's ongoing forest-management investments — the climate is broadly forgiving, but the hazard tail is real.",
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
        title: "Gallatin Valley and Bridger chinook set the mild-winter read",
        paragraphs: [
          "Bozeman sits in the Gallatin Valley at the northern end of the Bridger Range, and that geometry gives the city a surprising winter mildness for a Montana town at 1,474 m. The Bridgers funnel westerly chinook flow that can warm afternoon highs 10°C in a single day, and the valley floor runs cooler in summer with strong overnight cooling.",
          "Reading the valley as a microclimate entry means separating the downtown from the surrounding slopes. The Springhill and Triple Tree Ranches slopes above town run warmer on calm winter nights as cold air drains to the valley floor, while the downtown basin stays cooler in summer with stronger diurnal recovery — a gradient a drive up to Bridger Bowl can feel.",
        ],
      },
      {
        id: "bozeman-growth-housing-and-gallatin-fire",
        title: "Growth, housing pressure, and Gallatin wildfire are the live-here filter",
        paragraphs: [
          "Bozeman's tech-and-university growth has tightened housing affordability against a regional wage base, and that cost pressure is the dominant lived filter behind the climate appeal. Bozeman Health Deaconess covers most daily medical needs; Bozeman Yellowstone International Airport offers direct flights to the major hubs.",
          "Wildfire and Gallatin River flood are the climate side of the same read. The 2012 Gilead Fire, the 2018 Bacon Rind Fire, and the increasing frequency of smoke events from regional fires show how exposed the urban-wildland edge is. A relocation read should weigh wildfire exposure on the foothills lots, flood-zone position along the East Gallatin and Hyalite corridors, and the city's ongoing growth-management investments — the mild-winter climate is real, but it is a fast-growing region with real hazard exposure.",
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
      note: "Broken Bow is a small Ouachita-foothills town where tourism, forestry, and the nearby McCurtain County correctional-and-health infrastructure anchor employment; specialty medical care and airport access route through Idabel or Texarkana. Heavy-rain events and Mountain Fork River floodplain are the practical climate-friction points.",
      sources: [
        { label: "U.S. Census QuickFacts — Broken Bow city", url: "https://www.census.gov/quickfacts/fact/table/brokenbowcityoklahoma/PST045224" },
        { label: "City of Broken Bow — municipal context", url: "https://www.brokenbowok.org/" },
      ],
    },
    deepSections: [
      {
        id: "broken-bow-ouachita-uplift-and-mountain-fork",
        title: "Ouachita uplift and Mountain Fork River set the humidity read",
        paragraphs: [
          "Broken Bow sits on the south-eastern flank of the Ouachita Mountain uplift where the Mountain Fork River cuts through the Choctaw Upland, and that geometry gives the town a more humid microclimate than the surrounding Red River valley. Winters are mild and rainy; summers stay in the low-30s with frequent afternoon convective storms and strong overnight humidity.",
          "Reading the Ouachita-foothills position as a microclimate entry means separating the river-corridor lots from the upland ridges. The Mountain Fork and Glover River corridors run cooler in summer with stronger humidity, while the upland ridges above town drain cold air at night — a gradient a drive north toward Beavers Bend can feel.",
        ],
      },
      {
        id: "broken-bow-tourism-and-flood-plain-read",
        title: "Tourism, forestry, and flood-plain homework are the live-here filter",
        paragraphs: [
          "Broken Bow's identity is dominated by Beavers Bend State Park and the Hochatown tourism-and-cabin economy, and that tourism base softens the cost-pressure score but tightens housing for year-round residents. Most specialty medical and airport access routes through Idabel or Texarkana, which is the defining lived-friction point.",
          "Flood-plain homework is the climate side of the same read. The 2015 and 2018 Mountain Fork floods showed how exposed the low-lying cabin developments and the Broken Bow Lake spillway corridor are. A relocation read should weigh flood-zone position, year-round employment versus cabin-tourism employment, and the long drive to a hospital — the Ouachita-foothills climate is broadly forgiving, but it is a small-town tourism economy.",
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
