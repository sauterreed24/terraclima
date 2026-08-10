// ============================================================
// Terraclima — Authored Deep Sections (Field Dossier Overlay)
// ============================================================
// Every place in the corpus needs at least two bespoke deepSections
// (see docs/VOICE-GUIDE.md). This file supplies exactly two per place
// for the 135 entries that shipped with none after the retirement of
// TIER_C_POLISH_GENERATED (see the git history on
// places.tier-c-polish.ts / places.tier-c-indicators.ts for why that
// export was removed rather than migrated).
//
// Every paragraph here is grounded only in structured fields already
// authored and cited elsewhere on the same Place record — elevation,
// Köppen code, topographic drivers, biome, monthly climate normals,
// the risk matrix, soil/growability, and the liveSignals housing/
// access indices. Nothing here invents a fact, a visit, or a local
// sentiment; it reads the record's own numbers into prose that a
// resident or scout can act on, honest tradeoffs included.
//
// Wired into src/data/places.ts as a fill-only overlay: an authored
// place with its own deepSections (curated in places.*.ts) always
// wins, so this file only fills the gap where deepSections is absent
// or empty.
// ============================================================

import type { PlaceDeepSection } from "../types";

export const DEEP_SECTIONS_AUTHORED: Record<string, PlaceDeepSection[]> = {
  "grand-marais-mi": [
    {
      id: "grand-marais-mi-terrain-mechanism",
      title: "Terrain, lake effect, and the Dfb record",
      paragraphs: [
        "Few places in Michigan pair 190 m of elevation with lake effect the way Grand Marais (Upper Peninsula) does, and the resulting Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, shows it. The northern hardwood-boreal on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Grand Marais actually reads: The daytime high climbs to roughly 24°C by Jul before retreating to −4°C in Jan. Feb nights are the low point, settling near −12°C. Oct is the wettest month on record at 111 mm and Mar the driest at 52 mm. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain. Hardiness zone 4b and roughly 196 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "grand-marais-mi-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Grand Marais is worth walking through in order: Sandy loam drains good at pH 5.2–6.5, with low water holding capacity, and against that base, growability scores 38/100 on this atlas, with Hardy perennials, Blueberries, and Cool vegetables named as strong fits and extra effort earmarked for Most tree fruit. Risk diligence here starts with extreme cold running high and easing over recent records, severe storms running elevated and holding roughly steady over recent records, and coastal surge running moderate and moving in mixed directions year to year. Put together, a tradeoff score of 55/100 means the compromises are real but manageable for a household that plans around them.",
        "For Grand Marais, the record works out as follows: Comfort sits at 48/100 and resilience at 62/100 — read both alongside the risk and access figures above, not in isolation. At 0/100, housing pressure runs low next to its country comparison set, even with a thin service base; 82/100 on access remoteness means hospital runs, flights, and freight all carry a real logistics tax. The relocation tags attached here, serious winter lovers, are editorial shorthand, not demographic data, while travelers tend to show up for snow sports and Pictured Rocks. At 82/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "santa-cruz-felton-ca": [
    {
      id: "santa-cruz-felton-ca-terrain-mechanism",
      title: "Why Felton & the Santa Cruz Redwood Belt reads as a Fog-Belt Coast",
      paragraphs: [
        "Felton & the Santa Cruz Redwood Belt sits at 120 m in California, a position where the combination of marine layer and slope / aspect does most of the work in setting the local climate apart from its surroundings. The station record files under the Csb code, a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching, layered onto a coast redwood forest landscape. That pairing of mechanism and biome is the basis for calling this a Fog-Belt Coast on this atlas rather than an unremarkable California waypoint.",
        "Felton & the Santa Cruz Redwood Belt's numbers break down like this: Plan around a Dec peak of 231 mm and a Jul low of 0 mm. Aug carries the year's warmest afternoons, near 27°C, well above the 16°C daytime high typical of Dec, while after dark, Dec is as cold as the record gets, near 5°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 9b, with roughly 358 frost-free days to work with each year.",
      ],
    },
    {
      id: "santa-cruz-felton-ca-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Felton & the Santa Cruz Redwood Belt, the record works out as follows: Risk diligence here starts with wildfire running high (CZU Complex 2020) and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and landslide or debris-flow running elevated and worsening under current warming. On the ground, deep sandy loam over Santa Margarita Sandstone drains good at pH 5.4–6.4, with moderate water holding capacity. Growability scores 72/100 on this atlas, with Redwoods, Fuchsia, and Coast perennials named as strong fits and extra effort earmarked for Heat lovers in the dense canyon, and a tradeoff score of 45/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Felton & the Santa Cruz Redwood Belt actually reads: 79/100 on housing pressure puts this on the costly side of its national comparison set; at 48/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward redwood-forest lovers and remote workers, an editorial read rather than a census category, while visitors mostly come for hiking and fog photography. Two more figures round this out: comfort at 78/100 and resilience at 58/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "ellensburg-wa": [
    {
      id: "ellensburg-wa-terrain-mechanism",
      title: "Elevation, airflow, and the Dsb classification here",
      paragraphs: [
        "Ellensburg (Kittitas Valley) sits at 466 m in Washington, a position where the combination of rain shadow, gap winds, and river-valley moderation does most of the work in setting the local climate apart from its surroundings. The station record files under the Dsb code, a continental regime with warm, dry summers and cold winters carrying most of the year's moisture, layered onto a shrub-steppe landscape. That pairing of mechanism and biome is the basis for calling this a Rain-Shadow Sanctuary on this atlas rather than an unremarkable Washington waypoint.",
        "For Ellensburg, the record works out as follows: With a hardiness rating of 6a and about 230 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 30°C at the Jul peak, dropping to 2°C once Dec sets in. The coldest nights of the year, near −5°C, cluster around Jan. Precipitation peaks in Dec at 51 mm and thins out to 3 mm by Aug. Winter here means snow, concentrated in Jan, Feb, Mar, and Nov and later, not just cold rain.",
      ],
    },
    {
      id: "ellensburg-wa-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Ellensburg's numbers break down like this: Growability scores 66/100 on this atlas, with Timothy hay (world-class), Cool-season crops, and Hardy fruit named as strong fits and extra effort earmarked for Heat-loving long-season crops. Silt loam over gravel drains good at pH 6.8–7.8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with wildfire running elevated and worsening under current warming, extreme heat running elevated and worsening under current warming, and smoke and wildfire-season air quality running elevated and worsening under current warming. On balance, a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Ellensburg is worth walking through in order: Microclimate uniqueness (72/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. 29/100 on housing pressure keeps this on the affordable side of its national comparison set; 54/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. On the relocation side, the tags here run to remote workers and wind-tolerant outdoor people — editorial shorthand, not demographic data, and on the travel side, the draw is rodeo and central WA gateway.",
      ],
    },
  ],
  "forks-wa": [
    {
      id: "forks-wa-terrain-mechanism",
      title: "Elevation, airflow, and the Cfb classification here",
      paragraphs: [
        "Forks & the Hoh Rainforest sits at 105 m in Washington, a position where the combination of orographic lift and marine layer does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfb code, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, layered onto a temperate rainforest (Sitka spruce–western hemlock) landscape. That pairing of mechanism and biome is the basis for calling this a Hyper-Maritime on this atlas rather than an unremarkable Washington waypoint.",
        "For Forks & the Hoh Rainforest, the record works out as follows: With a hardiness rating of 8b and about 321 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 22°C at the Aug peak, dropping to 8°C once Dec sets in. The coldest nights of the year, near 1°C, cluster around Feb. Precipitation peaks in Jan at 424 mm and thins out to 43 mm by Jul. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar.",
      ],
    },
    {
      id: "forks-wa-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Forks & the Hoh Rainforest's numbers break down like this: Growability scores 44/100 on this atlas, with Moss-tolerant everything, Ferns, and Berries named as strong fits and extra effort earmarked for Tomatoes and Stone fruit. Deep organic over glacial till drains moderate at pH 4.8–5.8, with high water holding capacity, which explains part of that number. Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running moderate and holding roughly steady over recent records, and landslide or debris-flow running moderate and holding roughly steady over recent records. On balance, a tradeoff score of 68/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Forks & the Hoh Rainforest is worth walking through in order: Microclimate uniqueness (92/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. At 1/100, housing pressure runs low next to its country comparison set, even with a thin service base; 78/100 on access remoteness means hospital runs, flights, and freight all carry a real logistics tax. The relocation tags attached here, solitude-seekers and rainforest people, are editorial shorthand, not demographic data, and travelers tend to show up for Hoh Rainforest and Rialto Beach.",
      ],
    },
  ],
  "port-townsend-wa": [
    {
      id: "port-townsend-wa-terrain-mechanism",
      title: "The mechanism behind Port Townsend's microclimate",
      paragraphs: [
        "At 30 m, Port Townsend owes its Csb / Cfb margin classification, a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching, to the combination of rain shadow, marine layer, and gap winds rather than to latitude alone. Washington covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a Douglas-fir / madrone woodland setting that behaves more like a rain-shadow sanctuary than like the regional norm.",
        "Port Townsend is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 23°C in Aug and fall back to 8°C by Dec, and overnight lows bottom out around 2°C in Feb. The wet season centers on Nov (91 mm), with Jul the driest stretch at 15 mm. With a hardiness rating of 8b and about 336 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "port-townsend-wa-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Port Townsend",
      paragraphs: [
        "Here is how Port Townsend actually reads: Risk diligence here starts with drought running moderate and worsening under current warming, smoke and wildfire-season air quality running moderate and worsening under current warming, and severe storms running moderate and holding roughly steady over recent records. Glacial till over outwash gravel drains good at pH 5.6–6.6, with low water holding capacity. Growability scores 70/100 on this atlas, with Lavender, Cool-climate wine grapes (marginal), and Berries named as strong fits and extra effort earmarked for Long-season heat crops, and a tradeoff score of 28/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Port Townsend's numbers break down like this: On the relocation side, the tags here run to creative remote workers and retirees — editorial shorthand, not demographic data, and on the travel side, the draw is Victorian architecture and wooden boat culture. Housing pressure reads 64/100, a middling, not-cheap-not-brutal read within its country comparison set; 36/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Comfort (80/100) and resilience (74/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Microclimate uniqueness (80/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "hood-river-gorge": [
    {
      id: "hood-river-gorge-terrain-mechanism",
      title: "Elevation, airflow, and the Csb → BSk gradient classification here",
      paragraphs: [
        "Columbia Gorge Gap Corridor sits at 70 m in Oregon, a position where the combination of gap winds, rain shadow, and river-valley moderation does most of the work in setting the local climate apart from its surroundings. The station record files under the Csb → BSk gradient code, a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching, layered onto a steep transition — rainforest to shrub-steppe over 80 km landscape. That pairing of mechanism and biome is the basis for calling this a Gap / Gorge Wind Corridor on this atlas rather than an unremarkable Oregon waypoint.",
        "For Columbia Gorge Gap Corridor, the record works out as follows: With a hardiness rating of 7b and about 271 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 30°C at the Jul peak, dropping to 4°C once Dec sets in. The coldest nights of the year, near −2°C, cluster around Jan. Precipitation peaks in Dec at 144 mm and thins out to 3 mm by Jul. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar.",
      ],
    },
    {
      id: "hood-river-gorge-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Columbia Gorge Gap Corridor's numbers break down like this: Growability scores 76/100 on this atlas, with Pears, Apples, and Cherries named as strong fits and extra effort earmarked for Wind-sensitive high crops. Volcanic loess over basalt drains good at pH 6–7, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with smoke and wildfire-season air quality running high and worsening under current warming, wildfire running elevated (2017 Eagle Creek Fire) and worsening under current warming, and extreme heat running elevated and worsening under current warming. On balance, a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Columbia Gorge Gap Corridor is worth walking through in order: Microclimate uniqueness (88/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. At 67/100, housing pressure here sits well toward the expensive end of its country comparison set; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. On the relocation side, the tags here run to windsurfers and orchardists — editorial shorthand, not demographic data, and on the travel side, the draw is windsurfing, waterfalls, and wine tasting.",
      ],
    },
  ],
  "point-reyes-ca": [
    {
      id: "point-reyes-ca-terrain-mechanism",
      title: "Why Point Reyes Peninsula reads as a Fog-Belt Coast",
      paragraphs: [
        "Point Reyes Peninsula's climate comes down to two inputs above all: elevation (15 m) and the combination of coastal upwelling, marine layer, and slope / aspect. Together they land the record in the Csb (cool oceanic) bracket, a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching, and sustain a coastal prairie / Bishop pine / Douglas-fir that marks this out from typical California conditions as a fog-belt coast.",
        "Point Reyes Peninsula's numbers break down like this: Plan around a Dec peak of 187 mm and a Jul low of 0 mm. Aug carries the year's warmest afternoons, near 25°C, well above the 14°C daytime high typical of Dec, while after dark, Dec is as cold as the record gets, near 6°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 10a, with roughly 364 frost-free days to work with each year.",
      ],
    },
    {
      id: "point-reyes-ca-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Point Reyes Peninsula, the record works out as follows: Risk diligence here starts with coastal surge running high and worsening under current warming, wildfire running elevated (2020 Woodward Fire) and worsening under current warming, and landslide or debris-flow running elevated and worsening under current warming. On the ground, sandy loam over serpentine in places drains moderate at pH 5.4–6.8, with moderate water holding capacity. Growability scores 58/100 on this atlas, with Artichokes, Organic dairy pasture, and Coastal herbs named as strong fits and extra effort earmarked for Tomatoes and Peppers, and a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Point Reyes Peninsula actually reads: 96/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 72/100, a real logistics tax on hospital runs, flights, and freight. For relocation, this entry is tagged toward dairy ranchers and heat-averse, an editorial read rather than a census category, while visitors mostly come for wildflowers, elk viewing, and beaches. Comfort (56/100) and resilience (80/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "truckee-ca": [
    {
      id: "truckee-ca-terrain-mechanism",
      title: "Why Truckee reads as a Cold-Air Pool",
      paragraphs: [
        "Truckee (Tahoe Basin) sits at 1810 m in California, a position where the combination of cold-air drainage, temperature inversion, elevation lapse rate, and lake effect does most of the work in setting the local climate apart from its surroundings. The station record files under the Dsb code, a continental regime with warm, dry summers and cold winters carrying most of the year's moisture, layered onto a Sierra mixed conifer landscape. That pairing of mechanism and biome is the basis for calling this a Cold-Air Pool on this atlas rather than an unremarkable California waypoint.",
        "Truckee's numbers break down like this: Plan around a Dec peak of 172 mm and a Jul low of 6 mm. Jul carries the year's warmest afternoons, near 29°C, well above the 6°C daytime high typical of Dec, while after dark, Feb is as cold as the record gets, near −6°C. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. With a hardiness rating of 5b and about 173 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "truckee-ca-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Truckee, the record works out as follows: Risk diligence here starts with wildfire running high (2021 Caldor Fire came close) and worsening under current warming, extreme cold running high and easing over recent records, and smoke and wildfire-season air quality running high and worsening under current warming. On the ground, granitic sandy loam drains excessive at pH 5.8–6.8, with low water holding capacity. Growability scores 32/100 on this atlas, with Season-extension cool crops and Alpine perennials named as strong fits and extra effort earmarked for Almost everything warm-season, and a tradeoff score of 54/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Truckee actually reads: 96/100 on housing pressure puts this on the costly side of its national comparison set; 58/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward snow people and alpine aesthetes, an editorial read rather than a census category, while travelers tend to show up for Tahoe and Mt. Rose skiing. Comfort sits at 54/100 and resilience at 48/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "mammoth-lakes-ca": [
    {
      id: "mammoth-lakes-ca-terrain-mechanism",
      title: "The mechanism behind Mammoth Lakes's microclimate",
      paragraphs: [
        "Few places in California pair 2424 m of elevation with the combination of elevation lapse rate, rain shadow, and orographic lift the way Mammoth Lakes (Eastern Sierra) does, and the resulting Dfc / Dsb classification, a subarctic regime with brief, cool summers and long, severe winters, shows it. The subalpine lodgepole / red fir on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Mammoth Lakes is worth walking through in order: Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. Afternoon highs peak near 26°C in Jul and fall back to 6°C by Dec, and overnight lows bottom out around −8°C in Jan. The wet season centers on Dec (98 mm), with Sep the driest stretch at 9 mm. Hardiness zone 5b and roughly 153 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "mammoth-lakes-ca-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Mammoth Lakes",
      paragraphs: [
        "Here is how Mammoth Lakes actually reads: Risk diligence here starts with extreme cold running high and easing over recent records, smoke and wildfire-season air quality running high and worsening under current warming, and wildfire running elevated and worsening under current warming. Pumice over glacial till drains excessive at pH 6–7, with low water holding capacity. Growability scores 20/100 on this atlas, with Alpine perennials named as strong fits and extra effort earmarked for Most garden crops, and a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Mammoth Lakes's numbers break down like this: The relocation tags attached here, ski bums and alpine workers, are editorial shorthand, not demographic data, and travelers tend to show up for skiing and hot springs. Housing pressure reads 84/100, firmly on the expensive side within its country comparison set; 70/100 on access remoteness means hospital runs, flights, and freight all carry a real logistics tax. Two more figures round this out: comfort at 52/100 and resilience at 50/100, neither meant to be read apart from the risk and access numbers above. At 76/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "sedona-az": [
    {
      id: "sedona-az-terrain-mechanism",
      title: "Elevation, airflow, and the BSk / Csa margin classification here",
      paragraphs: [
        "Sedona (Red Rock Country) sits at 1372 m in Arizona, a position where the combination of slope / aspect, cold-air drainage, and monsoon convective lift does most of the work in setting the local climate apart from its surroundings. The station record files under the BSk / Csa margin code, a transitional classification straddling two neighboring climate regimes, layered onto a pinyon-juniper / riparian-canyon landscape. That pairing of mechanism and biome is the basis for calling this a Canyon-Sheltered on this atlas rather than an unremarkable Arizona waypoint.",
        "For Sedona, the record works out as follows: Hardiness zone 7b and roughly 280 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 35°C at the Jul peak, dropping to 13°C once Dec sets in. The coldest nights of the year, near −2°C, cluster around Jan. Precipitation peaks in Aug at 57 mm and thins out to 7 mm by Jun. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation.",
      ],
    },
    {
      id: "sedona-az-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Sedona's numbers break down like this: Growability scores 62/100 on this atlas, with Drought-tolerant fruit, Herbs, and Peaches (warm pocket) named as strong fits and extra effort earmarked for Humidity lovers. Red sandy loam over sandstone/basalt drains good at pH 7–7.8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with wildfire running high (2014 Slide Fire) and worsening under current warming, drought running elevated and worsening under current warming, and smoke and wildfire-season air quality running elevated and worsening under current warming. On balance, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Sedona is worth walking through in order: At 68/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 91/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 52/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward wellness retreat life and retirees, an editorial read rather than a census category, and travelers tend to show up for red rock hiking and vortex tourism.",
      ],
    },
  ],
  "prescott-az": [
    {
      id: "prescott-az-terrain-mechanism",
      title: "Elevation, airflow, and the Csa / BSk margin classification here",
      paragraphs: [
        "Prescott's climate comes down to two inputs above all: elevation (1636 m) and the combination of elevation lapse rate and monsoon convective lift. Together they land the record in the Csa / BSk margin bracket, a hot-summer Mediterranean regime with wet winters and reliably dry summers, and sustain a Ponderosa pine transition that marks this out from typical Arizona conditions as a high-desert escape.",
        "For Prescott, the record works out as follows: With a hardiness rating of 7a and about 272 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 32°C at the Jul peak, dropping to 12°C once Dec sets in. The coldest nights of the year, near −2°C, cluster around Jan. Precipitation peaks in Jul at 77 mm and thins out to 9 mm by May. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar.",
      ],
    },
    {
      id: "prescott-az-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Prescott's numbers break down like this: Growability scores 58/100 on this atlas, with Apples, Cherries, and Tomatoes (short season) named as strong fits and extra effort earmarked for Citrus. Granitic sandy loam drains good at pH 6.2–7.2, with low water holding capacity, which explains part of that number. Risk diligence here starts with wildfire running high (2013 Yarnell Hill tragedy nearby) and worsening under current warming, drought running elevated and worsening under current warming, and smoke and wildfire-season air quality running elevated and worsening under current warming. On balance, a tradeoff score of 38/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Prescott is worth walking through in order: Microclimate uniqueness (58/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. Housing pressure reads 68/100, firmly on the expensive side within its country comparison set; 44/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, retirees and Phoenix climate refugees, are editorial shorthand, not demographic data, and on the travel side, the draw is historic downtown.",
      ],
    },
  ],
  "cloudcroft-nm": [
    {
      id: "cloudcroft-nm-terrain-mechanism",
      title: "Terrain, elevation lapse rate, and the Dfb / Dfc record",
      paragraphs: [
        "At 2667 m, Cloudcroft (Sacramento Mountains) owes its Dfb / Dfc classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, to the combination of elevation lapse rate and monsoon convective lift rather than to latitude alone. New Mexico covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a mixed conifer / aspen setting that behaves more like a sky-island refuge than like the regional norm.",
        "Here is how Cloudcroft actually reads: The daytime high climbs to roughly 23°C by Jun before retreating to 6°C in Jan. Jan nights are the low point, settling near −6°C. Jul is the wettest month on record at 129 mm and Apr the driest at 21 mm. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. Plants here live inside hardiness zone 6a, with roughly 217 frost-free days to work with each year.",
      ],
    },
    {
      id: "cloudcroft-nm-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Cloudcroft is worth walking through in order: Forest loam over limestone/sandstone drains good at pH 6.2–7.2, with moderate water holding capacity, and against that base, growability scores 40/100 on this atlas, with Short-season greens and Alpine flowers named as strong fits and extra effort earmarked for Heat crops. Risk diligence here starts with wildfire running elevated and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and flood running moderate and worsening under current warming. Put together, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "For Cloudcroft, the record works out as follows: Comfort (64/100) and resilience (52/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. At 45/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; access remoteness reads 68/100, a real logistics tax on hospital runs, flights, and freight. For relocation, this entry is tagged toward summer-climate refugees, an editorial read rather than a census category, while visitors mostly come for skiing and cool escape. It is the microclimate-uniqueness figure, 78/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "taos-nm": [
    {
      id: "taos-nm-terrain-mechanism",
      title: "Terrain, elevation lapse rate, and the BSk / Dfb margin record",
      paragraphs: [
        "Few places in New Mexico pair 2124 m of elevation with the combination of elevation lapse rate, monsoon convective lift, and continental extremity the way Taos does, and the resulting BSk / Dfb margin classification, a transitional classification straddling two neighboring climate regimes, shows it. The pinyon-juniper / sage steppe on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Taos actually reads: The daytime high climbs to roughly 29°C by Jul before retreating to 6°C in Jan. Jan nights are the low point, settling near −10°C. Jul is the wettest month on record at 57 mm and Jan the driest at 20 mm. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. With a hardiness rating of 5b and about 180 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "taos-nm-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Taos is worth walking through in order: Sandy loam over basalt drains good at pH 6.6–7.8, with moderate water holding capacity, and against that base, growability scores 50/100 on this atlas, with Cool-season veg, Hardy fruit, and Lavender named as strong fits and extra effort earmarked for Heat crops. Risk diligence here starts with wildfire running elevated and worsening under current warming, drought running elevated and worsening under current warming, and smoke and wildfire-season air quality running elevated and worsening under current warming. Put together, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "For Taos, the record works out as follows: Comfort (72/100) and resilience (54/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. 74/100 on housing pressure puts this on the costly side of its national comparison set; 58/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward artists and dry-climate retirees, an editorial read rather than a census category, while on the travel side, the draw is Taos Pueblo and skiing. Microclimate uniqueness (64/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "crested-butte-co": [
    {
      id: "crested-butte-co-terrain-mechanism",
      title: "Elevation, airflow, and the Dfc classification here",
      paragraphs: [
        "The case for treating Crested Butte as a distinct entry rather than folding it into the rest of Colorado starts with elevation: 2707 m, acted on by the combination of elevation lapse rate and cold-air drainage. Together those two facts push the climate record toward Dfc, a subarctic regime with brief, cool summers and long, severe winters, and support a subalpine spruce-fir and aspen plant community that would not persist under the region's default conditions.",
        "For Crested Butte, the record works out as follows: With a hardiness rating of 4a and about 139 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 24°C at the Jul peak, dropping to −1°C once Jan sets in. The coldest nights of the year, near −15°C, cluster around Jan. Precipitation peaks in Jan at 76 mm and thins out to 23 mm by Jun. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above.",
      ],
    },
    {
      id: "crested-butte-co-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Crested Butte's numbers break down like this: Growability scores 18/100 on this atlas, with Hardy alpine perennials named as strong fits and extra effort earmarked for Most gardens. Glacial till / mountain loam drains good at pH 6–6.8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with extreme cold running high and easing over recent records, smoke and wildfire-season air quality running elevated and worsening under current warming, and severe storms running elevated and holding roughly steady over recent records. On balance, a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Crested Butte is worth walking through in order: Microclimate uniqueness (68/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. 88/100 on housing pressure puts this on the costly side of its national comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward skiers and alpine devotees, an editorial read rather than a census category, and on the travel side, the draw is wildflowers and powder skiing.",
      ],
    },
  ],
  "leadville-co": [
    {
      id: "leadville-co-terrain-mechanism",
      title: "Terrain, elevation lapse rate, and the Dfc (alpine edge) record",
      paragraphs: [
        "Few places in Colorado pair 3094 m of elevation with the combination of elevation lapse rate and cold-air drainage the way Leadville (Highest City) does, and the resulting Dfc (alpine edge) classification, a subarctic regime with brief, cool summers and long, severe winters, shows it. The subalpine / alpine transition on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Leadville actually reads: The daytime high climbs to roughly 22°C by Jul before retreating to −1°C in Jan. Jan nights are the low point, settling near −14°C. Jul is the wettest month on record at 57 mm and Jun the driest at 25 mm. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Hardiness zone 3b and roughly 119 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "leadville-co-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Leadville is worth walking through in order: Glacial till, rocky drains excessive at pH 6–7, with low water holding capacity, and against that base, growability scores 14/100 on this atlas, with Alpine natives only named as strong fits and extra effort earmarked for Virtually everything cultivated. Risk diligence here starts with extreme cold running very high and easing over recent records, wildfire running moderate and worsening under current warming, and drought running moderate and worsening under current warming. Put together, a tradeoff score of 72/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Leadville, the record works out as follows: Two more figures round this out: comfort at 32/100 and resilience at 54/100, neither meant to be read apart from the risk and access numbers above. At 19/100, housing pressure runs low next to its country comparison set, even with a thin service base; access remoteness reads 64/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, extreme-sport athletes and altitude trainers, are editorial shorthand, not demographic data, while travelers tend to show up for climbing fourteeners and mining history. At 86/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "durango-co": [
    {
      id: "durango-co-terrain-mechanism",
      title: "Terrain, elevation lapse rate, and the BSk / Dfb record",
      paragraphs: [
        "At 1988 m, Durango owes its BSk / Dfb classification, a transitional classification straddling two neighboring climate regimes, to the combination of elevation lapse rate, monsoon convective lift, and river-valley moderation rather than to latitude alone. Colorado covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a Ponderosa pine / pinyon-juniper setting that behaves more like a mild-winter foothills than like the regional norm.",
        "Here is how Durango actually reads: The daytime high climbs to roughly 31°C by Jul before retreating to 5°C in Jan. Jan nights are the low point, settling near −9°C. Aug is the wettest month on record at 58 mm and Jun the driest at 17 mm. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. With a hardiness rating of 6a and about 190 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "durango-co-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Durango is worth walking through in order: Sandy loam / alluvium drains good at pH 6.8–7.6, with moderate water holding capacity, and against that base, growability scores 60/100 on this atlas, with Apples, Hardy stone fruit, and Cool veg named as strong fits and extra effort earmarked for Heat lovers. Risk diligence here starts with wildfire running high and worsening under current warming, smoke and wildfire-season air quality running high and worsening under current warming, and drought running elevated and worsening under current warming. Put together, a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "For Durango, the record works out as follows: Two more figures round this out: comfort at 74/100 and resilience at 54/100, neither meant to be read apart from the risk and access numbers above. Housing pressure reads 72/100, firmly on the expensive side within its country comparison set; 46/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, active retirees and outdoor families, are editorial shorthand, not demographic data, while on the travel side, the draw is ski and mountain access. Microclimate uniqueness (56/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "cody-wy": [
    {
      id: "cody-wy-terrain-mechanism",
      title: "Elevation, airflow, and the BSk classification here",
      paragraphs: [
        "Cody (Chinook Foothills)'s climate comes down to two inputs above all: elevation (1555 m) and the combination of chinook / foehn downslope and rain shadow. Together they land the record in the BSk bracket, a transitional classification straddling two neighboring climate regimes, and sustain a sage steppe / cottonwood riparian that marks this out from typical Wyoming conditions as a chinook corridor.",
        "For Cody, the record works out as follows: Plants here live inside hardiness zone 5b, with roughly 198 frost-free days to work with each year. Expect afternoons near 30°C at the Jul peak, dropping to 3°C once Dec sets in. The coldest nights of the year, near −9°C, cluster around Jan. Precipitation peaks in May at 55 mm and thins out to 7 mm by Jan. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above.",
      ],
    },
    {
      id: "cody-wy-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Cody's numbers break down like this: Growability scores 52/100 on this atlas, with Hardy fruit and Cold-tolerant cultivars named as strong fits and extra effort earmarked for Humidity crops. Sandy loam over clay drains good at pH 7.2–8.2, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with drought running elevated and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and wildfire running moderate and worsening under current warming. On balance, a tradeoff score of 38/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Cody is worth walking through in order: It is the microclimate-uniqueness figure, 64/100, that justifies this entry's place in the atlas, independent of the comfort score. At 47/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward Yellowstone-adjacent lifestyle, an editorial read rather than a census category, and visitors mostly come for Yellowstone gate.",
      ],
    },
  ],
  "missoula-mt": [
    {
      id: "missoula-mt-terrain-mechanism",
      title: "The mechanism behind Missoula's microclimate",
      paragraphs: [
        "Missoula (Valley Inversion) carries the Dfb / BSk margin code for a specific reason: a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season. Sitting at 975 m and shaped by the combination of temperature inversion, cold-air drainage, and river-valley moderation, the site supports a Ponderosa pine-sage transition that reads as a basin inversion within Montana, a local exception the regional climate summary alone would not predict.",
        "Missoula is worth walking through in order: Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Afternoon highs peak near 31°C in Jul and fall back to 1°C by Dec, and overnight lows bottom out around −7°C in Jan. The wet season centers on Jun (56 mm), with Jul the driest stretch at 19 mm. Hardiness zone 5b and roughly 197 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "missoula-mt-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Missoula",
      paragraphs: [
        "Here is how Missoula actually reads: Risk diligence here starts with smoke and wildfire-season air quality running very high (Among the worst smoke climates in the inland West) and worsening under current warming, wildfire running high and worsening under current warming, and flood running moderate and worsening under current warming. Silt loam drains good at pH 6.4–7.4, with moderate water holding capacity. Growability scores 54/100 on this atlas, with Stone fruit, Hardy apples, and Cool veg named as strong fits and extra effort earmarked for Long-season heat crops, and a tradeoff score of 50/100 means the compromises are real but manageable for a household that plans around them.",
        "Missoula's numbers break down like this: For relocation, this entry is tagged toward outdoor culture seekers and mountain town romantics, an editorial read rather than a census category, and visitors mostly come for river access. 59/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. Comfort (60/100) and resilience (42/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. At 62/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "moab-ut": [
    {
      id: "moab-ut-terrain-mechanism",
      title: "The mechanism behind Moab's microclimate",
      paragraphs: [
        "Moab (Canyon Oasis) carries the BWk code for a specific reason: a transitional classification straddling two neighboring climate regimes. Sitting at 1245 m and shaped by the combination of rain shadow and river-valley moderation, the site supports a cold-desert shrubland / riparian that reads as a desert oasis within Utah, a local exception the regional climate summary alone would not predict.",
        "Moab is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 38°C in Jul and fall back to 6°C by Jan, and overnight lows bottom out around −6°C in Jan. The wet season centers on Oct (29 mm), with Jun the driest stretch at 11 mm. With a hardiness rating of 7b and about 254 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "moab-ut-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Moab",
      paragraphs: [
        "Here is how Moab actually reads: Risk diligence here starts with drought running high and worsening under current warming, extreme heat running high and worsening under current warming, and wildfire running moderate and worsening under current warming. Sandy loam over sandstone drains good at pH 7.4–8.2, with low water holding capacity. Growability scores 52/100 on this atlas, with Stone fruit, Grapes, and Drought-adapted named as strong fits and extra effort earmarked for Humidity lovers, and a tradeoff score of 54/100 means the compromises are real but manageable for a household that plans around them.",
        "Moab's numbers break down like this: The relocation tags attached here, adventure sports, are editorial shorthand, not demographic data, and on the travel side, the draw is Arches, Canyonlands, and mountain biking. Housing pressure reads 50/100, a middling, not-cheap-not-brutal read within its country comparison set; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Two more figures round this out: comfort at 56/100 and resilience at 36/100, neither meant to be read apart from the risk and access numbers above. Microclimate uniqueness (60/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "syracuse-ny": [
    {
      id: "syracuse-ny-terrain-mechanism",
      title: "Terrain, lake effect, and the Dfb record",
      paragraphs: [
        "Few places in New York pair 125 m of elevation with lake effect the way Syracuse does, and the resulting Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, shows it. The eastern hardwood forest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Syracuse actually reads: The daytime high climbs to roughly 28°C by Jul before retreating to 0°C in Jan. Jan nights are the low point, settling near −8°C. Oct is the wettest month on record at 109 mm and Feb the driest at 70 mm. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Hardiness zone 5b and roughly 236 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "syracuse-ny-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Syracuse is worth walking through in order: Silty clay loam drains moderate at pH 6.4–7.4, with moderate water holding capacity, and against that base, growability scores 60/100 on this atlas, with Apples, Concord grapes, and Cool-climate veg named as strong fits and extra effort earmarked for Long-season heat crops. Risk diligence here starts with flood running moderate and worsening under current warming, extreme cold running moderate and easing over recent records, and severe storms running moderate and holding roughly steady over recent records. Put together, a tradeoff score of 38/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "For Syracuse, the record works out as follows: Comfort (56/100) and resilience (66/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Housing pressure reads 93/100, firmly on the expensive side within its country comparison set; at 18/100, access remoteness is low — larger service hubs stay within easy reach. The relocation tags attached here, snow-resilient families, are editorial shorthand, not demographic data, while travelers tend to show up for Finger Lakes gateway. At 58/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "marquette-mi": [
    {
      id: "marquette-mi-terrain-mechanism",
      title: "Terrain, lake effect, and the Dfb record",
      paragraphs: [
        "Few places in Michigan pair 190 m of elevation with lake effect the way Marquette (UP) does, and the resulting Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, shows it. The boreal-northern hardwood transition on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Marquette actually reads: The daytime high climbs to roughly 25°C by Jul before retreating to −4°C in Jan. Feb nights are the low point, settling near −12°C. Oct is the wettest month on record at 90 mm and Feb the driest at 41 mm. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Plants here live inside hardiness zone 4b, with roughly 204 frost-free days to work with each year.",
      ],
    },
    {
      id: "marquette-mi-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Marquette is worth walking through in order: Sandy loam over glacial till drains good at pH 5.2–6.4, with moderate water holding capacity, and against that base, growability scores 40/100 on this atlas, with Hardy perennials, Blueberries, and Cool veg named as strong fits and extra effort earmarked for Heat crops. Risk diligence here starts with extreme cold running high and easing over recent records, severe storms running elevated and holding roughly steady over recent records, and coastal surge running moderate and worsening under current warming. Put together, a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "For Marquette, the record works out as follows: Two more figures round this out: comfort at 50/100 and resilience at 66/100, neither meant to be read apart from the risk and access numbers above. At 36/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward Great Lakes lovers, an editorial read rather than a census category, while visitors mostly come for Pictured Rocks and Superior. It is the microclimate-uniqueness figure, 76/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "houghton-mi": [
    {
      id: "houghton-mi-terrain-mechanism",
      title: "The mechanism behind Keweenaw's microclimate",
      paragraphs: [
        "At 185 m, Keweenaw (Houghton) owes its Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, to lake effect rather than to latitude alone. Michigan covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a northern hardwood-boreal setting that behaves more like a lake-effect snowbelt than like the regional norm.",
        "Keweenaw is worth walking through in order: Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain. Afternoon highs peak near 25°C in Jul and fall back to −4°C by Jan, and overnight lows bottom out around −12°C in Feb. The wet season centers on Oct (90 mm), with Feb the driest stretch at 43 mm. Plants here live inside hardiness zone 4b, with roughly 199 frost-free days to work with each year.",
      ],
    },
    {
      id: "houghton-mi-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Keweenaw",
      paragraphs: [
        "Here is how Keweenaw actually reads: Risk diligence here starts with extreme cold running high and easing over recent records, severe storms running high and holding roughly steady over recent records, and coastal surge running moderate and worsening under current warming. Sandy loam on copper-country till drains moderate at pH 5.2–6.4, with moderate water holding capacity. Growability scores 38/100 on this atlas, with Hardy perennials, Berries, and Cool veg named as strong fits and extra effort earmarked for Heat crops, and a tradeoff score of 56/100 means the compromises are real but manageable for a household that plans around them.",
        "Keweenaw's numbers break down like this: For relocation, this entry is tagged toward winter-loving academics, an editorial read rather than a census category, and visitors mostly come for Isle Royale gateway and Keweenaw snow. Housing pressure reads 6/100, comparatively affordable within its country comparison set, thin service base notwithstanding; at 58/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. Comfort sits at 44/100 and resilience at 64/100 — read both alongside the risk and access figures above, not in isolation. It is the microclimate-uniqueness figure, 88/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "viroqua-wi": [
    {
      id: "viroqua-wi-terrain-mechanism",
      title: "Elevation, airflow, and the Dfb classification here",
      paragraphs: [
        "The case for treating Viroqua (Driftless Area) as a distinct entry rather than folding it into the rest of Wisconsin starts with elevation: 395 m, acted on by the combination of slope / aspect and cold-air drainage. Together those two facts push the climate record toward Dfb, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and support a oak savanna / maple-basswood coves plant community that would not persist under the region's default conditions.",
        "For Viroqua, the record works out as follows: Hardiness zone 5a and roughly 208 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 27°C at the Jul peak, dropping to −4°C once Jan sets in. The coldest nights of the year, near −13°C, cluster around Jan. Precipitation peaks in Jun at 160 mm and thins out to 31 mm by Feb. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above.",
      ],
    },
    {
      id: "viroqua-wi-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Viroqua's numbers break down like this: Growability scores 82/100 on this atlas, with Organic vegetables, Orchard fruit, and Dairy pasture named as strong fits and extra effort earmarked for Long-season heat-lovers. Deep loess / Fayette silt loam drains good at pH 6–7, with high water holding capacity, which explains part of that number. Risk diligence here starts with flood running elevated (Flash flooding in coulees) and worsening under current warming, extreme cold running moderate and easing over recent records, and smoke and wildfire-season air quality running moderate and worsening under current warming. On balance, a tradeoff score of 34/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Viroqua is worth walking through in order: At 72/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. At 21/100, housing pressure runs low next to its country comparison set, even with a thin service base; access remoteness reads 48/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, organic farmers and homesteaders, are editorial shorthand, not demographic data, and travelers tend to show up for trout fishing and Amish country.",
      ],
    },
  ],
  "charleston-sc": [
    {
      id: "charleston-sc-terrain-mechanism",
      title: "Elevation, airflow, and the Cfa (humid subtropical) classification here",
      paragraphs: [
        "Charleston's climate comes down to two inputs above all: elevation (3 m) and the combination of diurnal sea breeze, tropical-cyclone exposure, and river-valley moderation. Together they land the record in the Cfa (humid subtropical) bracket, a humid subtropical regime with hot, humid summers and mild, wetter winters, and sustain a subtropical estuarine / live oak-palmetto that marks this out from typical South Carolina conditions as a hurricane-exposed coast.",
        "For Charleston, the record works out as follows: With a hardiness rating of 9a and about 351 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 32°C at the Jul peak, dropping to 15°C once Jan sets in. The coldest nights of the year, near 5°C, cluster around Jan. Precipitation peaks in Aug at 173 mm and thins out to 60 mm by Nov. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar.",
      ],
    },
    {
      id: "charleston-sc-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Charleston's numbers break down like this: Growability scores 72/100 on this atlas, with Figs, Citrus (marginal), and Southern vegetables named as strong fits and extra effort earmarked for Cool-climate crops. Sandy loam / marsh muck drains moderate at pH 5.2–6.2, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with coastal surge running very high and worsening under current warming, flood running high and worsening under current warming, and severe storms running high and worsening under current warming. On balance, a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Charleston is worth walking through in order: Microclimate uniqueness (44/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. At 82/100, housing pressure here sits well toward the expensive end of its country comparison set; 58/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. On the relocation side, the tags here run to Southern urbanites — editorial shorthand, not demographic data, and on the travel side, the draw is history and food.",
      ],
    },
  ],
  "joseph-or": [
    {
      id: "joseph-or-terrain-mechanism",
      title: "The mechanism behind Joseph's microclimate",
      paragraphs: [
        "Joseph (Wallowa Mountains) carries the Dfb code for a specific reason: a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season. Sitting at 1292 m and shaped by the combination of rain shadow and elevation lapse rate, the site supports a Ponderosa pine / subalpine meadow / high sage that reads as a rain-shadow sanctuary within Oregon, a local exception the regional climate summary alone would not predict.",
        "Joseph is worth walking through in order: Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Afternoon highs peak near 29°C in Jul and fall back to 2°C by Dec, and overnight lows bottom out around −6°C in Jan. The wet season centers on Dec (78 mm), with Jul the driest stretch at 13 mm. Plants here live inside hardiness zone 5a, with roughly 202 frost-free days to work with each year.",
      ],
    },
    {
      id: "joseph-or-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Joseph",
      paragraphs: [
        "Here is how Joseph actually reads: Risk diligence here starts with wildfire running elevated and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and drought running moderate and worsening under current warming. Silt loam on glacial outwash drains good at pH 6.4–7.4, with moderate water holding capacity. Growability scores 48/100 on this atlas, with Cool-season crops and Hardy perennials named as strong fits and extra effort earmarked for Heat crops, and a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Joseph's numbers break down like this: For relocation, this entry is tagged toward ranchers and alpine romantics, an editorial read rather than a census category, and visitors mostly come for Wallowa Lake and Hells Canyon. Housing pressure reads 18/100, comparatively affordable within its country comparison set, thin service base notwithstanding; at 62/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. Two more figures round this out: comfort at 62/100 and resilience at 56/100, neither meant to be read apart from the risk and access numbers above. It is the microclimate-uniqueness figure, 68/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "sitka-ak": [
    {
      id: "sitka-ak-terrain-mechanism",
      title: "Terrain, marine layer, and the Cfb/Cfc record",
      paragraphs: [
        "Sitka carries the Cfb/Cfc code for a specific reason: an oceanic regime with a narrow year-round temperature band and rain distributed across every month. Sitting at 8 m and shaped by the combination of marine layer, orographic lift, and diurnal sea breeze, the site supports a temperate rainforest (Sitka spruce–western hemlock) that reads as a hyper-maritime within Alaska, a local exception the regional climate summary alone would not predict.",
        "Here is how Sitka actually reads: The daytime high climbs to roughly 17°C by Aug before retreating to 4°C in Jan. Feb nights are the low point, settling near −1°C. Oct is the wettest month on record at 401 mm and Jun the driest at 104 mm. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 7b and roughly 289 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "sitka-ak-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Sitka is worth walking through in order: Organic-rich podzols over glacial till and outcrops drains imperfect at pH 4.2–5.5, with high water holding capacity, and against that base, growability scores 54/100 on this atlas, with Cool-season greens, Rhubarb, and Potatoes named as strong fits and extra effort earmarked for Heat-loving crops and Tomatoes (greenhouse only). Risk diligence here starts with landslide or debris-flow running elevated (Steep saturated slopes) and worsening under current warming, flood running moderate and worsening under current warming, and severe storms running moderate (Pacific storms frequent) and worsening under current warming. Put together, a tradeoff score of 60/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Sitka, the record works out as follows: Two more figures round this out: comfort at 56/100 and resilience at 64/100, neither meant to be read apart from the risk and access numbers above. At 69/100, housing pressure here sits well toward the expensive end of its country comparison set; at 78/100, access remoteness is high enough that logistics genuinely shape daily life here. On the relocation side, the tags here run to rainforest dwellers, commercial fishers, and maritime-climate purists — editorial shorthand, not demographic data, while travelers tend to show up for brown bears, whale watching, and historic Russian America. At 82/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "valdez-ak": [
    {
      id: "valdez-ak-terrain-mechanism",
      title: "Terrain, orographic lift, and the Dfc record",
      paragraphs: [
        "Few places in Alaska pair 10 m of elevation with the combination of orographic lift, katabatic drainage flow, and marine layer the way Valdez (Prince William Sound) does, and the resulting Dfc classification, a subarctic regime with brief, cool summers and long, severe winters, shows it. The coastal temperate rainforest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Valdez actually reads: The daytime high climbs to roughly 18°C by Jul before retreating to −3°C in Jan. Jan nights are the low point, settling near −9°C. Sep is the wettest month on record at 246 mm and Jun the driest at 74 mm. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. Hardiness zone 6a and roughly 187 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "valdez-ak-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Valdez is worth walking through in order: Silt loam on glacial outwash, rocky in places drains good at pH 5–6.5, with moderate water holding capacity, and against that base, growability scores 48/100 on this atlas, with Potatoes, Greens, and Berries named as strong fits and extra effort earmarked for Most warm-season crops. Risk diligence here starts with landslide or debris-flow running high (Steep snowy slopes; Barry Arm unstable-slope concern) and worsening under current warming, flood running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Put together, a tradeoff score of 78/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Valdez, the record works out as follows: Comfort sits at 44/100 and resilience at 58/100 — read both alongside the risk and access figures above, not in isolation. 60/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 82/100, a real logistics tax on hospital runs, flights, and freight. For relocation, this entry is tagged toward extreme-snow enthusiasts, fishing industry, and backcountry skiers, an editorial read rather than a census category, while travelers tend to show up for heli-skiing, glacier tours, and Prince William Sound kayaking. At 90/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "stanley-id": [
    {
      id: "stanley-id-terrain-mechanism",
      title: "Elevation, airflow, and the Dfc classification here",
      paragraphs: [
        "Stanley (Sawtooth Valley) sits at 1947 m in Idaho, a position where the combination of cold-air drainage, temperature inversion, and elevation lapse rate does most of the work in setting the local climate apart from its surroundings. The station record files under the Dfc code, a subarctic regime with brief, cool summers and long, severe winters, layered onto a montane sagebrush / lodgepole landscape. That pairing of mechanism and biome is the basis for calling this a Cold-Air Pool on this atlas rather than an unremarkable Idaho waypoint.",
        "For Stanley, the record works out as follows: With a hardiness rating of 3a and about 128 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 27°C at the Jul peak, dropping to −1°C once Dec sets in. The coldest nights of the year, near −13°C, cluster around Jan. Precipitation peaks in Dec at 83 mm and thins out to 10 mm by Jul. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above.",
      ],
    },
    {
      id: "stanley-id-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Stanley's numbers break down like this: Growability scores 24/100 on this atlas, with Hardy greens, Potatoes (short-season), and Root vegetables named as strong fits and extra effort earmarked for Tomatoes, peppers, most garden staples. Glacial till, silt loam, gravelly drains good at pH 6.2–7.2, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with extreme cold running very high and easing over recent records, smoke and wildfire-season air quality running high and worsening under current warming, and wildfire running elevated and worsening under current warming. On balance, a tradeoff score of 74/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Stanley is worth walking through in order: Microclimate uniqueness (94/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. At 13/100, housing pressure runs low next to its country comparison set, even with a thin service base; 56/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, extreme-cold enthusiasts, river guides, and off-grid homesteaders, are editorial shorthand, not demographic data, and on the travel side, the draw is Sawtooth backpacking, Salmon River rafting, and dark-sky observers (Central Idaho DSR).",
      ],
    },
  ],
  "mount-washington-nh": [
    {
      id: "mount-washington-nh-terrain-mechanism",
      title: "Terrain, polar jet / arctic front, and the ET record",
      paragraphs: [
        "Few places in New Hampshire pair 1917 m of elevation with the combination of polar jet / arctic front, gap winds, and elevation lapse rate the way Mount Washington Summit does, and the resulting ET classification, a tundra regime with no month averaging above 10°C even in peak summer, shows it. The alpine tundra (above treeline) on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Mount Washington Summit actually reads: The daytime high climbs to roughly 14°C by Jul before retreating to −9°C in Jan. Jan nights are the low point, settling near −18°C. Oct is the wettest month on record at 234 mm and Feb the driest at 122 mm. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain. Plants here live inside hardiness zone 4b, with roughly 141 frost-free days to work with each year.",
      ],
    },
    {
      id: "mount-washington-nh-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Mount Washington Summit is worth walking through in order: Thin lithosol on granite; much bare rock drains excessive at pH 4.5–5.5, with low water holding capacity, and against that base, growability scores 8/100 on this atlas, with Alpine / Arctic tundra plants named as strong fits and extra effort earmarked for Everything else. Risk diligence here starts with extreme cold running very high and easing over recent records, severe storms running very high and holding roughly steady over recent records, and smoke and wildfire-season air quality running moderate and worsening under current warming. Put together, a tradeoff score of 96/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Mount Washington Summit, the record works out as follows: Comfort (6/100) and resilience (54/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Housing pressure reads 91/100, firmly on the expensive side within its country comparison set; at 18/100, access remoteness is low — larger service hubs stay within easy reach. The relocation tags attached here, observatory staff, are editorial shorthand, not demographic data, while visitors mostly come for weather enthusiasts, Cog Railway, and summer hiking. It is the microclimate-uniqueness figure, 98/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "yuma-az": [
    {
      id: "yuma-az-terrain-mechanism",
      title: "Elevation, airflow, and the BWh classification here",
      paragraphs: [
        "Yuma sits at 42 m in Arizona, a position where the combination of rain shadow, river-valley moderation, continental extremity, and monsoon convective lift does most of the work in setting the local climate apart from its surroundings. The station record files under the BWh code, a transitional classification straddling two neighboring climate regimes, layered onto a Sonoran desert lowland (irrigated riparian oasis) landscape. That pairing of mechanism and biome is the basis for calling this a Desert Oasis on this atlas rather than an unremarkable Arizona waypoint.",
        "For Yuma, the record works out as follows: Plants here live inside hardiness zone 9b, with roughly 364 frost-free days to work with each year. Expect afternoons near 43°C at the Jul peak, dropping to 21°C once Dec sets in. The coldest nights of the year, near 7°C, cluster around Dec. Rain arrives in a fairly flat pattern all year, ranging only from 0 mm to 10 mm month to month. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "yuma-az-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Yuma's numbers break down like this: Growability scores 74/100 on this atlas, with Winter vegetables (leafy greens, brassicas, carrots), Citrus, and Dates named as strong fits and extra effort earmarked for Any non-irrigated crop and Cool-season crops in summer. Sandy loam to silty clay on Colorado River alluvium drains good at pH 7.4–8.4, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with drought running very high (Colorado River Basin megadrought) and worsening under current warming, extreme heat running very high and worsening under current warming, and smoke and wildfire-season air quality running moderate and worsening under current warming. On balance, a tradeoff score of 62/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Yuma is worth walking through in order: It is the microclimate-uniqueness figure, 84/100, that justifies this entry's place in the atlas, independent of the comfort score. At 55/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to winter-escape retirees (snowbirds), agricultural workers, and sun-obsessed — editorial shorthand, not demographic data, and visitors mostly come for winter dark-sky, date-palm heritage, and Sonoran Desert access.",
      ],
    },
  ],
  "south-padre-tx": [
    {
      id: "south-padre-tx-terrain-mechanism",
      title: "Terrain, diurnal sea breeze, and the Cfa/BSh record",
      paragraphs: [
        "South Padre Island carries the Cfa/BSh code for a specific reason: a humid subtropical regime with hot, humid summers and mild, wetter winters. Sitting at 2 m and shaped by the combination of diurnal sea breeze, tropical-cyclone exposure, and marine layer, the site supports a subtropical coastal dune / maritime savanna that reads as a hurricane-exposed coast within Texas, a local exception the regional climate summary alone would not predict.",
        "Here is how South Padre Island actually reads: The daytime high climbs to roughly 33°C by Aug before retreating to 21°C in Jan. Jan nights are the low point, settling near 12°C. Sep is the wettest month on record at 149 mm and Jan the driest at 31 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 9b/10a and about 364 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "south-padre-tx-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "South Padre Island is worth walking through in order: Sandy marine deposits, shelly drains excessive at pH 7.5–8.5, with low water holding capacity, and against that base, growability scores 42/100 on this atlas, with Salt-tolerant natives, Sea-oats, and Some citrus (inland, not island) named as strong fits and extra effort earmarked for Most gardens due to salt spray. Risk diligence here starts with severe storms running very high (Hurricane Beulah 1967, Dolly 2008, Hanna 2020) and worsening under current warming, coastal surge running very high (Low barrier-island elevation; sea-level rise is existential) and worsening under current warming, and flood running elevated and worsening under current warming. Put together, a tradeoff score of 70/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For South Padre Island, the record works out as follows: Two more figures round this out: comfort at 70/100 and resilience at 36/100, neither meant to be read apart from the risk and access numbers above. Housing pressure reads 43/100, a middling, not-cheap-not-brutal read within its country comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward winter-residents, surfers, and subtropical-coast lovers, an editorial read rather than a census category, while on the travel side, the draw is spring break, sea turtle nesting (Kemp's ridley), and birding. Microclimate uniqueness (64/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "ely-mn": [
    {
      id: "ely-mn-terrain-mechanism",
      title: "Why Ely reads as a Lake-Moderated",
      paragraphs: [
        "Ely (Boundary Waters)'s climate comes down to two inputs above all: elevation (443 m) and the combination of continental extremity, lake effect, and polar jet / arctic front. Together they land the record in the Dfb bracket, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and sustain a mixed boreal–northern hardwood forest that marks this out from typical Minnesota conditions as a lake-moderated.",
        "Ely's numbers break down like this: Plan around a Jun peak of 108 mm and a Feb low of 24 mm. Jul carries the year's warmest afternoons, near 26°C, well above the −8°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −20°C. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. Hardiness zone 3b and roughly 174 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "ely-mn-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Ely, the record works out as follows: Risk diligence here starts with extreme cold running very high and easing over recent records, wildfire running elevated (Pagami Creek 2011, Greenwood 2021) and worsening under current warming, and smoke and wildfire-season air quality running moderate and worsening under current warming. On the ground, sandy loam on glacial till; thin organics over granite drains moderate at pH 5–6.2, with moderate water holding capacity. Growability scores 38/100 on this atlas, with Hardy apples (Honeycrisp heritage), Potatoes, and Berries named as strong fits and extra effort earmarked for Warm-season crops and Peppers, and a tradeoff score of 70/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Here is how Ely actually reads: At 30/100, housing pressure runs low next to its country comparison set, even with a thin service base; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, wilderness-oriented, winter-sport enthusiasts, and off-grid, are editorial shorthand, not demographic data, while travelers tend to show up for Boundary Waters canoe trips, winter sled-dog training, and aurora. Two more figures round this out: comfort at 44/100 and resilience at 60/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "brookings-or": [
    {
      id: "brookings-or-terrain-mechanism",
      title: "Why Brookings reads as a Gap / Gorge Wind Corridor",
      paragraphs: [
        "Brookings (Chetco Effect)'s climate comes down to two inputs above all: elevation (40 m) and the combination of gap winds, marine layer, and chinook / foehn downslope. Together they land the record in the Csb bracket, a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching, and sustain a Sitka spruce–western hemlock coastal rainforest margin that marks this out from typical Oregon conditions as a gap / gorge wind corridor.",
        "Brookings's numbers break down like this: Plan around a Dec peak of 391 mm and a Jul low of 6 mm. Aug carries the year's warmest afternoons, near 22°C, well above the 12°C daytime high typical of Dec, while after dark, Feb is as cold as the record gets, near 5°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 9b, with roughly 363 frost-free days to work with each year.",
      ],
    },
    {
      id: "brookings-or-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Brookings, the record works out as follows: Risk diligence here starts with severe storms running elevated and worsening under current warming, coastal surge running elevated and worsening under current warming, and wildfire running moderate and worsening under current warming. On the ground, marine terrace sand and loam over sandstone drains good at pH 5.4–6.2, with moderate water holding capacity. Growability scores 62/100 on this atlas, with Cool brassicas, Rhododendrons, and Berries named as strong fits and extra effort earmarked for Heat-loving melons, and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Brookings actually reads: At 57/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 46/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward storm watchers and coastal gardeners, an editorial read rather than a census category, while visitors mostly come for winter banana-belt days and Samuel Boardman corridor. Comfort sits at 74/100 and resilience at 62/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "medford-or": [
    {
      id: "medford-or-terrain-mechanism",
      title: "The mechanism behind Medford's microclimate",
      paragraphs: [
        "Few places in Oregon pair 430 m of elevation with the combination of rain shadow, river-valley moderation, and slope / aspect the way Medford (Rogue Valley) does, and the resulting Csa classification, a hot-summer Mediterranean regime with wet winters and reliably dry summers, shows it. The oak savanna and irrigated orchard mosaic on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Medford is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 34°C in Jul and fall back to 9°C by Dec, and overnight lows bottom out around 0°C in Jan. The wet season centers on Dec (106 mm), with Jul the driest stretch at 4 mm. With a hardiness rating of 8b and about 300 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "medford-or-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Medford",
      paragraphs: [
        "Here is how Medford actually reads: Risk diligence here starts with wildfire running high and worsening under current warming, smoke and wildfire-season air quality running high and worsening under current warming, and drought running elevated and worsening under current warming. Volcanic-alluvial loam over stream terraces drains good at pH 6–7.2, with moderate water holding capacity. Growability scores 84/100 on this atlas, with Pears, Wine grapes, and Hemp (historically) named as strong fits and extra effort earmarked for Cool-cloud crops without tunnels, and a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Medford's numbers break down like this: For relocation, this entry is tagged toward orchardists and remote workers, an editorial read rather than a census category, and on the travel side, the draw is Crater Lake, Rogue River rafting, and pear harvest. Housing pressure reads 36/100, a middling, not-cheap-not-brutal read within its country comparison set; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Two more figures round this out: comfort at 70/100 and resilience at 52/100, neither meant to be read apart from the risk and access numbers above. Microclimate uniqueness (72/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "friday-harbor-wa": [
    {
      id: "friday-harbor-wa-terrain-mechanism",
      title: "The mechanism behind Friday Harbor's microclimate",
      paragraphs: [
        "Friday Harbor (San Juan Islands) carries the Csb code for a specific reason: a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching. Sitting at 20 m and shaped by the combination of rain shadow, diurnal sea breeze, and marine layer, the site supports a dry Garry oak meadow and coastal prairie that reads as a cool-summer maritime within Washington, a local exception the regional climate summary alone would not predict.",
        "Friday Harbor is worth walking through in order: Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Afternoon highs peak near 22°C in Aug and fall back to 8°C by Dec, and overnight lows bottom out around 3°C in Feb. The wet season centers on Nov (100 mm), with Jul the driest stretch at 12 mm. Hardiness zone 8b and roughly 346 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "friday-harbor-wa-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Friday Harbor",
      paragraphs: [
        "Here is how Friday Harbor actually reads: Risk diligence here starts with wildfire running moderate and worsening under current warming, drought running moderate and worsening under current warming, and smoke and wildfire-season air quality running moderate and worsening under current warming. Glacial till and loam over bedrock drains moderate at pH 5.8–6.8, with moderate water holding capacity. Growability scores 72/100 on this atlas, with Apples, Lavender, and Cool greens named as strong fits and extra effort earmarked for Peaches without wall, and a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "Friday Harbor's numbers break down like this: For relocation, this entry is tagged toward sailors and remote creatives, an editorial read rather than a census category, and travelers tend to show up for orca watching and island hopping. 78/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 50/100, workable, but not a place to assume same-day specialty care. Two more figures round this out: comfort at 80/100 and resilience at 58/100, neither meant to be read apart from the risk and access numbers above. At 78/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "winthrop-wa": [
    {
      id: "winthrop-wa-terrain-mechanism",
      title: "Why Winthrop reads as a Rain-Shadow Sanctuary",
      paragraphs: [
        "The case for treating Winthrop (Methow Valley) as a distinct entry rather than folding it into the rest of Washington starts with elevation: 520 m, acted on by the combination of rain shadow, temperature inversion, and cold-air drainage. Together those two facts push the climate record toward Dsb, a continental regime with warm, dry summers and cold winters carrying most of the year's moisture, and support a Ponderosa pine–dry forest and sagebrush steppe ecotone plant community that would not persist under the region's default conditions.",
        "Winthrop's numbers break down like this: Plan around a Dec peak of 89 mm and a Jul low of 11 mm. Jul carries the year's warmest afternoons, near 30°C, well above the 0°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near −7°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 5b, with roughly 209 frost-free days to work with each year.",
      ],
    },
    {
      id: "winthrop-wa-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Winthrop, the record works out as follows: Risk diligence here starts with wildfire running high and worsening under current warming, smoke and wildfire-season air quality running high and worsening under current warming, and drought running elevated and worsening under current warming. On the ground, glacial outwash and loess over valley floor drains good at pH 6.2–7.4, with moderate water holding capacity. Growability scores 52/100 on this atlas, with Apples on slopes and Native dryland perennials named as strong fits and extra effort earmarked for Frost-tender citrus, and a tradeoff score of 52/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Winthrop actually reads: At 61/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 46/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, Nordic skiers and dark-sky photographers, are editorial shorthand, not demographic data, while visitors mostly come for North Cascades Highway and Methow Trails. Comfort sits at 58/100 and resilience at 54/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "leavenworth-wa": [
    {
      id: "leavenworth-wa-terrain-mechanism",
      title: "Why Leavenworth reads as a Rain-Shadow Sanctuary",
      paragraphs: [
        "The case for treating Leavenworth (Cascade East Slope) as a distinct entry rather than folding it into the rest of Washington starts with elevation: 350 m, acted on by the combination of rain shadow, chinook / foehn downslope, and river-valley moderation. Together those two facts push the climate record toward Dsa, a continental regime with hot, dry summers and cold, wetter winters, and support a dry Douglas-fir forest and orchard valleys plant community that would not persist under the region's default conditions.",
        "Leavenworth's numbers break down like this: Plan around a Dec peak of 131 mm and a Jul low of 6 mm. Jul carries the year's warmest afternoons, near 31°C, well above the 2°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near −4°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 6b, with roughly 237 frost-free days to work with each year.",
      ],
    },
    {
      id: "leavenworth-wa-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Leavenworth, the record works out as follows: Risk diligence here starts with wildfire running high and worsening under current warming, smoke and wildfire-season air quality running high and worsening under current warming, and drought running elevated and worsening under current warming. On the ground, alluvial sandy loam drains good at pH 6.4–7.4, with moderate water holding capacity. Growability scores 78/100 on this atlas, with Apples, Pears, and Stone fruit named as strong fits and extra effort earmarked for Acid peat lovers, and a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Leavenworth actually reads: 34/100 on housing pressure keeps this on the affordable side of its national comparison set; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to ski families and orchardists — editorial shorthand, not demographic data, while visitors mostly come for Oktoberfest and Enchantment peaks. Comfort (68/100) and resilience (50/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "lone-pine-ca": [
    {
      id: "lone-pine-ca-terrain-mechanism",
      title: "Why Lone Pine reads as a Basin Inversion",
      paragraphs: [
        "Lone Pine (Owens Valley) sits at 1130 m in California, a position where the combination of temperature inversion, gap winds, and elevation lapse rate does most of the work in setting the local climate apart from its surroundings. The station record files under the BWk code, a transitional classification straddling two neighboring climate regimes, layered onto a saltbush desert scrub and alluvial fans landscape. That pairing of mechanism and biome is the basis for calling this a Basin Inversion on this atlas rather than an unremarkable California waypoint.",
        "Lone Pine's numbers break down like this: Plan around a Jan peak of 55 mm and a Jun low of 2 mm. Jul carries the year's warmest afternoons, near 37°C, well above the 13°C daytime high typical of Dec, while after dark, Dec is as cold as the record gets, near 1°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 7b and roughly 324 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "lone-pine-ca-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Lone Pine, the record works out as follows: Risk diligence here starts with drought running high and worsening under current warming, extreme heat running high and worsening under current warming, and wildfire running elevated and worsening under current warming. On the ground, sandy alkaline alluvium drains excessive at pH 7.5–8.5, with low water holding capacity. Growability scores 42/100 on this atlas, with Native desert perennials with drip named as strong fits and extra effort earmarked for Most fruit without heavy amendment, and a tradeoff score of 68/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Here is how Lone Pine actually reads: 49/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. On the relocation side, the tags here run to climbers and desert photographers — editorial shorthand, not demographic data, while travelers tend to show up for Alabama Hills and Whitney. Comfort sits at 38/100 and resilience at 40/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "page-az": [
    {
      id: "page-az-terrain-mechanism",
      title: "Terrain, continental extremity, and the BSk record",
      paragraphs: [
        "At 1310 m, Page (Colorado Plateau) owes its BSk classification, a transitional classification straddling two neighboring climate regimes, to the combination of continental extremity, monsoon convective lift, and slope / aspect rather than to latitude alone. Arizona covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a pinyon–juniper woodland and sagebrush setting that behaves more like a high-desert escape than like the regional norm.",
        "Here is how Page actually reads: The daytime high climbs to roughly 37°C by Jul before retreating to 8°C in Dec. Jan nights are the low point, settling near −2°C. Oct is the wettest month on record at 24 mm and Jun the driest at 4 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 7a and about 290 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "page-az-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Page is worth walking through in order: Sandy skeletal soils on Navajo sandstone drains excessive at pH 7.8–8.4, with low water holding capacity, and against that base, growability scores 35/100 on this atlas, with Native succulents and Drip-irrigated trees named as strong fits and extra effort earmarked for Dry farming. Risk diligence here starts with drought running high and worsening under current warming, extreme heat running high and worsening under current warming, and flood running elevated (Slot-canyon flash floods) and worsening under current warming. Put together, a tradeoff score of 62/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Page, the record works out as follows: Comfort sits at 48/100 and resilience at 36/100 — read both alongside the risk and access figures above, not in isolation. Housing pressure reads 51/100, a middling, not-cheap-not-brutal read within its country comparison set; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, river guides and remote workers, are editorial shorthand, not demographic data, while on the travel side, the draw is Antelope Canyon and Horseshoe Bend. Microclimate uniqueness (76/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "international-falls-mn": [
    {
      id: "international-falls-mn-terrain-mechanism",
      title: "The mechanism behind International Falls's microclimate",
      paragraphs: [
        "Few places in Minnesota pair 340 m of elevation with the combination of cold-air drainage, lake effect, and polar jet / arctic front the way International Falls does, and the resulting Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, shows it. The boreal mixed forest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "International Falls is worth walking through in order: Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Afternoon highs peak near 26°C in Jul and fall back to −9°C by Jan, and overnight lows bottom out around −20°C in Jan. The wet season centers on Jun (109 mm), with Feb the driest stretch at 20 mm. Hardiness zone 3b and roughly 174 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "international-falls-mn-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at International Falls",
      paragraphs: [
        "Here is how International Falls actually reads: Risk diligence here starts with extreme cold running very high and easing over recent records, wildfire running moderate and worsening under current warming, and flood running moderate and worsening under current warming. Glacial lacustrine clay to loam drains imperfect at pH 5.8–7, with high water holding capacity. Growability scores 34/100 on this atlas, with Potatoes, Hay, and Cold-hardy berries named as strong fits and extra effort earmarked for Long-season crops, and a tradeoff score of 72/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "International Falls's numbers break down like this: For relocation, this entry is tagged toward snowmobilers and boreal researchers, an editorial read rather than a census category, and travelers tend to show up for Voyageurs NP and ice fishing. Housing pressure reads 7/100, comparatively affordable within its country comparison set, thin service base notwithstanding; access remoteness reads 56/100, workable, but not a place to assume same-day specialty care. Comfort sits at 36/100 and resilience at 62/100 — read both alongside the risk and access figures above, not in isolation. At 82/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "duluth-mn": [
    {
      id: "duluth-mn-terrain-mechanism",
      title: "Why Duluth reads as a Lake-Moderated",
      paragraphs: [
        "The case for treating Duluth (Lake Superior) as a distinct entry rather than folding it into the rest of Minnesota starts with elevation: 210 m, acted on by the combination of lake effect, marine layer, and cold-air drainage. Together those two facts push the climate record toward Dfb, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and support a boreal–temperate transition forest plant community that would not persist under the region's default conditions.",
        "Duluth's numbers break down like this: Plan around a Jun peak of 107 mm and a Jan low of 20 mm. Jul carries the year's warmest afternoons, near 26°C, well above the −5°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −15°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 4b, with roughly 203 frost-free days to work with each year.",
      ],
    },
    {
      id: "duluth-mn-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Duluth, the record works out as follows: Risk diligence here starts with extreme cold running elevated and easing over recent records, severe storms running elevated and worsening under current warming, and flood running moderate and worsening under current warming. On the ground, clay loam on glacial lake plain and basalt drains moderate at pH 6–7.2, with high water holding capacity. Growability scores 48/100 on this atlas, with Cool-season vegetables, Sour cherries, and Apples named as strong fits and extra effort earmarked for Heat-loving melons, and a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Duluth actually reads: 28/100 on housing pressure keeps this on the affordable side of its national comparison set; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to outdoor enthusiasts and remote workers — editorial shorthand, not demographic data, while visitors mostly come for tall ships, fall color, and skiing. Comfort (62/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "erie-pa": [
    {
      id: "erie-pa-terrain-mechanism",
      title: "The mechanism behind Erie's microclimate",
      paragraphs: [
        "At 200 m, Erie (Lake Erie Snowbelt) owes its Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, to the combination of lake effect, marine layer, and continental extremity rather than to latitude alone. Pennsylvania covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a temperate deciduous forest and lakeshore dunes setting that behaves more like a lake-effect snowbelt than like the regional norm.",
        "Erie is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 27°C in Jul and fall back to 1°C by Jan, and overnight lows bottom out around −6°C in Jan. The wet season centers on Oct (127 mm), with Feb the driest stretch at 66 mm. With a hardiness rating of 6b and about 255 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "erie-pa-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Erie",
      paragraphs: [
        "Here is how Erie actually reads: Risk diligence here starts with severe storms running elevated and worsening under current warming, flood running moderate and worsening under current warming, and extreme cold running moderate and easing over recent records. Clay loam on lake plain drains imperfect at pH 6.2–7.4, with high water holding capacity. Growability scores 58/100 on this atlas, with Grapes (Concord belt), Apples, and Soybeans named as strong fits and extra effort earmarked for Peaches (late frost risk), and a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Erie's numbers break down like this: The relocation tags attached here, lake-house seekers, are editorial shorthand, not demographic data, and on the travel side, the draw is Presque Isle beaches and winter storm chasing. At 31/100, housing pressure runs low next to its country comparison set, even with a thin service base; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Comfort (58/100) and resilience (56/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Microclimate uniqueness (74/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "chattanooga-tn": [
    {
      id: "chattanooga-tn-terrain-mechanism",
      title: "Why Chattanooga reads as a River-Valley Moderation",
      paragraphs: [
        "The case for treating Chattanooga (Tennessee River Gap) as a distinct entry rather than folding it into the rest of Tennessee starts with elevation: 210 m, acted on by the combination of river-valley moderation, gap winds, and slope / aspect. Together those two facts push the climate record toward Cfa, a humid subtropical regime with hot, humid summers and mild, wetter winters, and support a oak–hickory forest and riparian corridor plant community that would not persist under the region's default conditions.",
        "Chattanooga's numbers break down like this: Plan around a Mar peak of 145 mm and a Oct low of 87 mm. Jul carries the year's warmest afternoons, near 32°C, well above the 10°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −1°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 7b and roughly 309 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "chattanooga-tn-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Chattanooga, the record works out as follows: Risk diligence here starts with flood running elevated and worsening under current warming, extreme heat running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. On the ground, residuum and alluvium on shale/sandstone drains moderate at pH 5.8–7, with moderate water holding capacity. Growability scores 72/100 on this atlas, with Dogwood, Azaleas, and Warm-season vegetables named as strong fits and extra effort earmarked for Dry-loving Mediterranean herbs, and a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Chattanooga actually reads: Housing pressure reads 26/100, comparatively affordable within its country comparison set, thin service base notwithstanding; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward outdoor families and logistics workers, an editorial read rather than a census category, while travelers tend to show up for Lookout Mountain and riverfront. Two more figures round this out: comfort at 58/100 and resilience at 52/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "gatlinburg-tn": [
    {
      id: "gatlinburg-tn-terrain-mechanism",
      title: "Why Gatlinburg reads as a Thermal Belt",
      paragraphs: [
        "Gatlinburg (Great Smokies) sits at 390 m in Tennessee, a position where the combination of orographic lift, slope / aspect, and river-valley moderation does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfb code, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, layered onto a cove hardwood and mesic forest landscape. That pairing of mechanism and biome is the basis for calling this a Thermal Belt on this atlas rather than an unremarkable Tennessee waypoint.",
        "Gatlinburg's numbers break down like this: Plan around a Jul peak of 166 mm and a Oct low of 83 mm. Jul carries the year's warmest afternoons, near 30°C, well above the 9°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −3°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 7a, with roughly 285 frost-free days to work with each year.",
      ],
    },
    {
      id: "gatlinburg-tn-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Gatlinburg, the record works out as follows: Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and landslide or debris-flow running elevated and worsening under current warming. On the ground, loamy colluvium in coves drains moderate at pH 5.4–6.5, with high water holding capacity. Growability scores 68/100 on this atlas, with Rhododendrons, Mountain laurel, and Cool greens named as strong fits and extra effort earmarked for Stone fruit (late frost), and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Gatlinburg actually reads: 32/100 on housing pressure keeps this on the affordable side of its national comparison set; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to hospitality workers and retirees — editorial shorthand, not demographic data, while visitors mostly come for Smokies trails and autumn color. Comfort (62/100) and resilience (54/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "nags-head-nc": [
    {
      id: "nags-head-nc-terrain-mechanism",
      title: "Why Outer Banks reads as a Hurricane-Exposed Coast",
      paragraphs: [
        "Outer Banks (Nags Head) sits at 3 m in North Carolina, a position where the combination of tropical-cyclone exposure, diurnal sea breeze, and marine layer does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfa code, a humid subtropical regime with hot, humid summers and mild, wetter winters, layered onto a maritime scrub and dune grassland landscape. That pairing of mechanism and biome is the basis for calling this a Hurricane-Exposed Coast on this atlas rather than an unremarkable North Carolina waypoint.",
        "Outer Banks's numbers break down like this: Plan around a Jul peak of 167 mm and a Apr low of 89 mm. Jul carries the year's warmest afternoons, near 30°C, well above the 11°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 2°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 8a, with roughly 343 frost-free days to work with each year.",
      ],
    },
    {
      id: "nags-head-nc-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Outer Banks, the record works out as follows: Risk diligence here starts with severe storms running very high and worsening under current warming, coastal surge running very high and worsening under current warming, and flood running high and worsening under current warming. On the ground, sand over peat in swales drains excessive at pH 5.5–7, with low water holding capacity. Growability scores 48/100 on this atlas, with Salt-tolerant grasses, Yucca, and Irrigated ornamentals named as strong fits and extra effort earmarked for Fresh-water vegetables without soil, and a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Outer Banks actually reads: At 39/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to remote coastal workers — editorial shorthand, not demographic data, while visitors mostly come for Wright Brothers, wild horses, and surf. Comfort (62/100) and resilience (32/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "burlington-vt": [
    {
      id: "burlington-vt-terrain-mechanism",
      title: "The mechanism behind Burlington's microclimate",
      paragraphs: [
        "Burlington (Lake Champlain) carries the Dfb code for a specific reason: a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season. Sitting at 60 m and shaped by the combination of lake effect, rain shadow, and temperature inversion, the site supports a northern hardwood forest that reads as a lake-moderated within Vermont, a local exception the regional climate summary alone would not predict.",
        "Burlington is worth walking through in order: Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Afternoon highs peak near 28°C in Jul and fall back to −2°C by Jan, and overnight lows bottom out around −11°C in Jan. The wet season centers on Jun (120 mm), with Feb the driest stretch at 50 mm. Hardiness zone 5a and roughly 221 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "burlington-vt-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Burlington",
      paragraphs: [
        "Here is how Burlington actually reads: Risk diligence here starts with flood running moderate and worsening under current warming, extreme cold running moderate and easing over recent records, and severe storms running moderate and worsening under current warming. Calcareous clay loam on Champlain Valley drains moderate at pH 6.5–7.5, with high water holding capacity. Growability scores 62/100 on this atlas, with Apples, Maple syrup, and Cold-hardy grapes named as strong fits and extra effort earmarked for Peaches without sites, and a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "Burlington's numbers break down like this: The relocation tags attached here, remote tech workers and ski commuters, are editorial shorthand, not demographic data, and travelers tend to show up for Champlain Islands and ski resorts. Housing pressure reads 81/100, firmly on the expensive side within its country comparison set; at 18/100, access remoteness is low — larger service hubs stay within easy reach. Comfort sits at 64/100 and resilience at 58/100 — read both alongside the risk and access figures above, not in isolation. At 68/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "lubbock-tx": [
    {
      id: "lubbock-tx-terrain-mechanism",
      title: "Terrain, continental extremity, and the BSk record",
      paragraphs: [
        "At 980 m, Lubbock (Llano Estacado) owes its BSk classification, a transitional classification straddling two neighboring climate regimes, to the combination of continental extremity, monsoon convective lift, and gap winds rather than to latitude alone. Texas covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a shortgrass prairie and cotton fields setting that behaves more like a badland / steppe pocket than like the regional norm.",
        "Here is how Lubbock actually reads: The daytime high climbs to roughly 34°C by Jul before retreating to 13°C in Jan. Jan nights are the low point, settling near −3°C. May is the wettest month on record at 73 mm and Feb the driest at 16 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 7b, with roughly 284 frost-free days to work with each year.",
      ],
    },
    {
      id: "lubbock-tx-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Lubbock is worth walking through in order: Fine sandy loam over caliche drains good at pH 7.5–8.5, with low water holding capacity, and against that base, growability scores 55/100 on this atlas, with Cotton, Sorghum, and Pecans with irrigation named as strong fits and extra effort earmarked for Dryland trees. Risk diligence here starts with severe storms running very high and worsening under current warming, drought running high and worsening under current warming, and extreme heat running high and worsening under current warming. Put together, a tradeoff score of 62/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Lubbock, the record works out as follows: Comfort sits at 42/100 and resilience at 40/100 — read both alongside the risk and access figures above, not in isolation. At 50/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward ag researchers and storm chasers, an editorial read rather than a census category, while visitors mostly come for Palo Duro and wine country nearby. It is the microclimate-uniqueness figure, 68/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "new-orleans-la": [
    {
      id: "new-orleans-la-terrain-mechanism",
      title: "The mechanism behind New Orleans's microclimate",
      paragraphs: [
        "At 0 m, New Orleans owes its Cfa classification, a humid subtropical regime with hot, humid summers and mild, wetter winters, to the combination of tropical-cyclone exposure, river-valley moderation, and diurnal sea breeze rather than to latitude alone. Louisiana covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a subtropical urban wetland margin setting that behaves more like a hurricane-exposed coast than like the regional norm.",
        "New Orleans is worth walking through in order: Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Afternoon highs peak near 33°C in Jul and fall back to 17°C by Jan, and overnight lows bottom out around 7°C in Jan. The wet season centers on Jul (213 mm), with Nov the driest stretch at 91 mm. Hardiness zone 9b and roughly 359 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "new-orleans-la-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at New Orleans",
      paragraphs: [
        "Here is how New Orleans actually reads: Risk diligence here starts with flood running very high and worsening under current warming, severe storms running very high and worsening under current warming, and coastal surge running very high and worsening under current warming. Alluvial clay and organic muck drains poor at pH 6–8, with high water holding capacity. Growability scores 78/100 on this atlas, with Satsumas, Camellias, and Subtropical ornamentals named as strong fits and extra effort earmarked for Dry-climate herbs, and a tradeoff score of 72/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "New Orleans's numbers break down like this: For relocation, this entry is tagged toward culture seekers and port workers, an editorial read rather than a census category, and travelers tend to show up for jazz, Mardi Gras, and swamp tours. 40/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. Comfort sits at 48/100 and resilience at 28/100 — read both alongside the risk and access figures above, not in isolation. At 58/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "ojai-ca": [
    {
      id: "ojai-ca-terrain-mechanism",
      title: "Why Ojai reads as a Mediterranean Pocket",
      paragraphs: [
        "Ojai sits at 227 m in California, a position where the combination of slope / aspect, rain shadow, and Santa Ana / sundowner downslope does most of the work in setting the local climate apart from its surroundings. The station record files under the Csa code, a hot-summer Mediterranean regime with wet winters and reliably dry summers, layered onto a Mediterranean chaparral / oak savanna landscape. That pairing of mechanism and biome is the basis for calling this a Mediterranean Pocket on this atlas rather than an unremarkable California waypoint.",
        "Ojai's numbers break down like this: Plan around a Feb peak of 126 mm and a Jul low of 1 mm. Aug carries the year's warmest afternoons, near 31°C, well above the 19°C daytime high typical of Dec, while after dark, Dec is as cold as the record gets, near 4°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 9b, with roughly 360 frost-free days to work with each year.",
      ],
    },
    {
      id: "ojai-ca-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Ojai, the record works out as follows: Risk diligence here starts with wildfire running high (Thomas Fire 2017) and worsening under current warming, drought running elevated and worsening under current warming, and smoke and wildfire-season air quality running elevated and worsening under current warming. On the ground, sandy loam to clay loam on alluvium drains good at pH 6.4–7.6, with moderate water holding capacity. Growability scores 82/100 on this atlas, with Citrus (Ojai Pixie tangerine), Olives, and Avocado named as strong fits and extra effort earmarked for Humidity-lovers, and a tradeoff score of 50/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Ojai actually reads: At 42/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, wellness retreat life, are editorial shorthand, not demographic data, while visitors mostly come for citrus farms and sunset chasers. Comfort sits at 82/100 and resilience at 54/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "paducah-ky": [
    {
      id: "paducah-ky-terrain-mechanism",
      title: "Terrain, river-valley moderation, and the Cfa record",
      paragraphs: [
        "Paducah (Ohio–Tennessee Confluence) carries the Cfa code for a specific reason: a humid subtropical regime with hot, humid summers and mild, wetter winters. Sitting at 113 m and shaped by the combination of river-valley moderation, tropical-cyclone exposure, and continental extremity, the site supports a western mesophytic forest margin and cropland that reads as a river-valley moderation within Kentucky, a local exception the regional climate summary alone would not predict.",
        "Here is how Paducah actually reads: The daytime high climbs to roughly 32°C by Jul before retreating to 7°C in Jan. Jan nights are the low point, settling near −3°C. Apr is the wettest month on record at 150 mm and Aug the driest at 84 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 7a, with roughly 291 frost-free days to work with each year.",
      ],
    },
    {
      id: "paducah-ky-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Paducah is worth walking through in order: Mississippi embayment silty loams drains moderate at pH 5.5–6.8, with high water holding capacity, and against that base, growability scores 76/100 on this atlas, with Soybeans, Corn, and Tobacco heritage named as strong fits and extra effort earmarked for Dry lavender. Risk diligence here starts with flood running elevated and worsening under current warming, extreme heat running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Put together, a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "For Paducah, the record works out as follows: Two more figures round this out: comfort at 54/100 and resilience at 52/100, neither meant to be read apart from the risk and access numbers above. At 42/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward logistics and healthcare, an editorial read rather than a census category, while visitors mostly come for quilt museum and riverfront. It is the microclimate-uniqueness figure, 58/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "morgantown-wv": [
    {
      id: "morgantown-wv-terrain-mechanism",
      title: "Elevation, airflow, and the Cfa / Dfb transition classification here",
      paragraphs: [
        "Morgantown (Appalachian Plateau)'s climate comes down to two inputs above all: elevation (273 m) and the combination of orographic lift, cold-air drainage, and river-valley moderation. Together they land the record in the Cfa / Dfb transition bracket, a humid subtropical regime with hot, humid summers and mild, wetter winters, and sustain a mixed mesophytic forest that marks this out from typical West Virginia conditions as a river-valley moderation.",
        "For Morgantown, the record works out as follows: Plants here live inside hardiness zone 6b, with roughly 254 frost-free days to work with each year. Expect afternoons near 29°C at the Jul peak, dropping to 4°C once Jan sets in. The coldest nights of the year, near −5°C, cluster around Jan. Precipitation peaks in Jul at 133 mm and thins out to 80 mm by Nov. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "morgantown-wv-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Morgantown's numbers break down like this: Growability scores 72/100 on this atlas, with Maple, Apples, and Brassicas named as strong fits and extra effort earmarked for Drought-tolerant xeriscape without irrigation. Acidic shaly silt loams drains moderate at pH 4.8–6.2, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with flood running elevated and worsening under current warming, extreme heat running moderate and worsening under current warming, and extreme cold running moderate and easing over recent records. On balance, a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Morgantown is worth walking through in order: It is the microclimate-uniqueness figure, 64/100, that justifies this entry's place in the atlas, independent of the comfort score. 9/100 on housing pressure keeps this on the affordable side of its national comparison set; at 56/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to university families and healthcare — editorial shorthand, not demographic data, and visitors mostly come for fall color and whitewater.",
      ],
    },
  ],
  "mentone-al": [
    {
      id: "mentone-al-terrain-mechanism",
      title: "Why Mentone reads as a Thermal Belt",
      paragraphs: [
        "The case for treating Mentone (Lookout Mountain) as a distinct entry rather than folding it into the rest of Alabama starts with elevation: 548 m, acted on by the combination of elevation lapse rate, slope / aspect, and cold-air drainage. Together those two facts push the climate record toward Cfa, a humid subtropical regime with hot, humid summers and mild, wetter winters, and support a oak–hickory and mesic cove forest plant community that would not persist under the region's default conditions.",
        "Mentone's numbers break down like this: Plan around a Mar peak of 165 mm and a Oct low of 96 mm. Jul carries the year's warmest afternoons, near 30°C, well above the 9°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −2°C. Snow accumulates across Jan, Feb, Mar, and Dec, a separate planning season from the rain totals alone. Plants here live inside hardiness zone 7b, with roughly 293 frost-free days to work with each year.",
      ],
    },
    {
      id: "mentone-al-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Mentone, the record works out as follows: Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and extreme heat running moderate and worsening under current warming. On the ground, shaley silt loam on sandstone and limestone drains moderate at pH 5.4–6.8, with moderate water holding capacity. Growability scores 72/100 on this atlas, with Apples, Blueberries, and Native azaleas named as strong fits and extra effort earmarked for Heat-loving melons without season extension, and a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Mentone actually reads: At 37/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to retirees and remote workers — editorial shorthand, not demographic data, while visitors mostly come for DeSoto State Park and hang gliding ridge. Comfort (70/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "norfolk-ct": [
    {
      id: "norfolk-ct-terrain-mechanism",
      title: "The mechanism behind Norfolk's microclimate",
      paragraphs: [
        "Norfolk (NW Highlands) carries the Dfb code for a specific reason: a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season. Sitting at 427 m and shaped by the combination of cold-air drainage, lake effect, and polar jet / arctic front, the site supports a northern hardwoods and hemlock ravines that reads as a cold-air pool within Connecticut, a local exception the regional climate summary alone would not predict.",
        "Norfolk is worth walking through in order: Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Afternoon highs peak near 26°C in Jul and fall back to −1°C by Jan, and overnight lows bottom out around −10°C in Jan. The wet season centers on Sep (147 mm), with Feb the driest stretch at 93 mm. Hardiness zone 5b and roughly 210 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "norfolk-ct-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Norfolk",
      paragraphs: [
        "Here is how Norfolk actually reads: Risk diligence here starts with extreme cold running elevated and easing over recent records, severe storms running elevated and worsening under current warming, and flood running moderate and worsening under current warming. Stony loam on schist/gneiss glacial till drains good at pH 5–6.2, with moderate water holding capacity. Growability scores 54/100 on this atlas, with Maple syrup, Apples, and Cool-season vegetables named as strong fits and extra effort earmarked for Long-season tomatoes, and a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Norfolk's numbers break down like this: The relocation tags attached here, second-home owners and artists, are editorial shorthand, not demographic data, and travelers tend to show up for fall color and cross-country skiing. At 10/100, housing pressure runs low next to its country comparison set, even with a thin service base; access remoteness reads 56/100, workable, but not a place to assume same-day specialty care. Comfort (58/100) and resilience (60/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. At 64/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "lewes-de": [
    {
      id: "lewes-de-terrain-mechanism",
      title: "Elevation, airflow, and the Cfa classification here",
      paragraphs: [
        "Lewes (Delaware Bay) sits at 3 m in Delaware, a position where the combination of diurnal sea breeze, tropical-cyclone exposure, and marine layer does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfa code, a humid subtropical regime with hot, humid summers and mild, wetter winters, layered onto a maritime forest and salt marsh edge landscape. That pairing of mechanism and biome is the basis for calling this a Lake-Moderated on this atlas rather than an unremarkable Delaware waypoint.",
        "For Lewes, the record works out as follows: Hardiness zone 7b and roughly 293 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 30°C at the Jul peak, dropping to 7°C once Jan sets in. The coldest nights of the year, near −2°C, cluster around Jan. Precipitation peaks in Jul at 117 mm and thins out to 79 mm by Feb. Jan, Feb, Mar, and Nov, and beyond carry the snow load here, a distinct planning window from the rain totals above.",
      ],
    },
    {
      id: "lewes-de-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Lewes's numbers break down like this: Growability scores 62/100 on this atlas, with Beach plum, Salt-tolerant shrubs, and Irrigated perennials named as strong fits and extra effort earmarked for Dry-farmed Mediterranean herbs. Sandy coastal plain and marsh organics drains excessive at pH 4.8–6.5, with low water holding capacity, which explains part of that number. Risk diligence here starts with coastal surge running high and worsening under current warming, flood running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. On balance, a tradeoff score of 52/100 means the compromises are real but manageable for a household that plans around them.",
        "Lewes is worth walking through in order: At 58/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 35/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. On the relocation side, the tags here run to coastal retirees and remote workers — editorial shorthand, not demographic data, and travelers tend to show up for Cape Henlopen and ferry to Cape May.",
      ],
    },
  ],
  "clayton-ga": [
    {
      id: "clayton-ga-terrain-mechanism",
      title: "The mechanism behind Clayton's microclimate",
      paragraphs: [
        "Clayton (Blue Ridge Front) carries the Cfb code for a specific reason: an oceanic regime with a narrow year-round temperature band and rain distributed across every month. Sitting at 590 m and shaped by the combination of orographic lift, elevation lapse rate, and slope / aspect, the site supports a cove hardwood and mesic forest that reads as a mild-winter foothills within Georgia, a local exception the regional climate summary alone would not predict.",
        "Clayton is worth walking through in order: Snow accumulates across Jan, Feb, Mar, and Nov and beyond, a separate planning season from the rain totals alone. Afternoon highs peak near 30°C in Jul and fall back to 10°C by Jan, and overnight lows bottom out around −2°C in Jan. The wet season centers on Dec (178 mm), with Oct the driest stretch at 125 mm. Plants here live inside hardiness zone 7a, with roughly 294 frost-free days to work with each year.",
      ],
    },
    {
      id: "clayton-ga-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Clayton",
      paragraphs: [
        "Here is how Clayton actually reads: Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and landslide or debris-flow running elevated and worsening under current warming. Acidic loam in coves; thin on ridges drains good at pH 4.8–6, with moderate water holding capacity. Growability scores 70/100 on this atlas, with Apples, Brassicas, and Blueberries named as strong fits and extra effort earmarked for Heat-loving peppers without greenhouse, and a tradeoff score of 38/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Clayton's numbers break down like this: The relocation tags attached here, remote workers and hikers, are editorial shorthand, not demographic data, and visitors mostly come for Bartram Trail and waterfalls. At 26/100, housing pressure runs low next to its country comparison set, even with a thin service base; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. Comfort (74/100) and resilience (54/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. It is the microclimate-uniqueness figure, 72/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "galena-il": [
    {
      id: "galena-il-terrain-mechanism",
      title: "Elevation, airflow, and the Dfa classification here",
      paragraphs: [
        "Galena (Driftless Mississippi) sits at 193 m in Illinois, a position where the combination of slope / aspect, river-valley moderation, and cold-air drainage does most of the work in setting the local climate apart from its surroundings. The station record files under the Dfa code, a hot-summer humid continental regime with four sharply separated seasons, layered onto a oak savanna and prairie openings landscape. That pairing of mechanism and biome is the basis for calling this a Driftless Relief Pocket on this atlas rather than an unremarkable Illinois waypoint.",
        "For Galena, the record works out as follows: With a hardiness rating of 5a and about 225 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 29°C at the Jul peak, dropping to −2°C once Jan sets in. The coldest nights of the year, near −11°C, cluster around Jan. Precipitation peaks in Jun at 139 mm and thins out to 35 mm by Jan. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone.",
      ],
    },
    {
      id: "galena-il-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Galena's numbers break down like this: Growability scores 68/100 on this atlas, with Apples, Grape (hybrid), and Pasture named as strong fits and extra effort earmarked for Long-season heat lovers. Silt loam on loess and colluvium drains good at pH 5.8–7, with high water holding capacity, which explains part of that number. Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and extreme heat running moderate and worsening under current warming. On balance, a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "Galena is worth walking through in order: Microclimate uniqueness (66/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. Housing pressure reads 5/100, comparatively affordable within its country comparison set, thin service base notwithstanding; 56/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward historic-town lovers and remote workers, an editorial read rather than a census category, and on the travel side, the draw is Mississippi Palisades and architecture.",
      ],
    },
  ],
  "oakland-md": [
    {
      id: "oakland-md-terrain-mechanism",
      title: "Why Oakland reads as a Cold-Air Pool",
      paragraphs: [
        "Oakland (Garrett County Highlands)'s climate comes down to two inputs above all: elevation (750 m) and the combination of lake effect, elevation lapse rate, and cold-air drainage. Together they land the record in the Dfb bracket, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and sustain a northern hardwoods and hay meadows that marks this out from typical Maryland conditions as a cold-air pool.",
        "Oakland's numbers break down like this: Plan around a May peak of 154 mm and a Nov low of 94 mm. Jul carries the year's warmest afternoons, near 26°C, well above the 1°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −8°C. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Hardiness zone 5b and roughly 226 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "oakland-md-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Oakland, the record works out as follows: Risk diligence here starts with extreme cold running elevated and easing over recent records, severe storms running elevated and worsening under current warming, and flood running moderate and worsening under current warming. On the ground, loam on glacial till and sandstone residuum drains moderate at pH 5–6.5, with moderate water holding capacity. Growability scores 60/100 on this atlas, with Hay, Cool-season vegetables, and Apples named as strong fits and extra effort earmarked for Warm-season corn without GDD, and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Oakland actually reads: At 11/100, housing pressure runs low next to its country comparison set, even with a thin service base; access remoteness reads 56/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, lake-house buyers and remote workers, are editorial shorthand, not demographic data, while travelers tend to show up for Wisp Resort and Autumn Glory. Two more figures round this out: comfort at 62/100 and resilience at 58/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "pittsfield-ma": [
    {
      id: "pittsfield-ma-terrain-mechanism",
      title: "The mechanism behind Pittsfield's microclimate",
      paragraphs: [
        "Few places in Massachusetts pair 317 m of elevation with the combination of polar jet / arctic front, lake effect, orographic lift, and cold-air drainage the way Pittsfield (Berkshires) does, and the resulting Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, shows it. The northern hardwoods and hemlock on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Pittsfield is worth walking through in order: Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Afternoon highs peak near 27°C in Jul and fall back to 0°C by Jan, and overnight lows bottom out around −10°C in Jan. The wet season centers on Jul (129 mm), with Feb the driest stretch at 75 mm. Hardiness zone 5b and roughly 212 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "pittsfield-ma-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Pittsfield",
      paragraphs: [
        "Here is how Pittsfield actually reads: Risk diligence here starts with severe storms running elevated and worsening under current warming, flood running moderate and worsening under current warming, and extreme cold running moderate and easing over recent records. Stony loam on schist drains good at pH 5.2–6.5, with moderate water holding capacity. Growability scores 58/100 on this atlas, with Apples, Berries, and Cool greens named as strong fits and extra effort earmarked for Heat-loving crops, and a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Pittsfield's numbers break down like this: The relocation tags attached here, culture seekers and second homes, are editorial shorthand, not demographic data, and travelers tend to show up for Tanglewood and ski areas. At 12/100, housing pressure runs low next to its country comparison set, even with a thin service base; access remoteness reads 56/100, workable, but not a place to assume same-day specialty care. Comfort (58/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. At 58/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "ocean-springs-ms": [
    {
      id: "ocean-springs-ms-terrain-mechanism",
      title: "Why Ocean Springs reads as a Hurricane-Exposed Coast",
      paragraphs: [
        "The case for treating Ocean Springs (Mississippi Sound) as a distinct entry rather than folding it into the rest of Mississippi starts with elevation: 7 m, acted on by the combination of diurnal sea breeze, tropical-cyclone exposure, and marine layer. Together those two facts push the climate record toward Cfa, a humid subtropical regime with hot, humid summers and mild, wetter winters, and support a subtropical live-oak maritime forest plant community that would not persist under the region's default conditions.",
        "Ocean Springs's numbers break down like this: Plan around a Jul peak of 210 mm and a Nov low of 97 mm. Aug carries the year's warmest afternoons, near 33°C, well above the 16°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 5°C. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Plants here live inside hardiness zone 9a, with roughly 353 frost-free days to work with each year.",
      ],
    },
    {
      id: "ocean-springs-ms-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Ocean Springs, the record works out as follows: Risk diligence here starts with severe storms running very high and worsening under current warming, coastal surge running very high and worsening under current warming, and flood running elevated and worsening under current warming. On the ground, sandy loam over coastal plain sediments drains moderate at pH 5–6.5, with moderate water holding capacity. Growability scores 72/100 on this atlas, with Live oak, Satsuma, and Camellias named as strong fits and extra effort earmarked for Cold-requirement stone fruit, and a tradeoff score of 56/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Ocean Springs actually reads: At 41/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, coastal retirees and artists, are editorial shorthand, not demographic data, while on the travel side, the draw is Gulf Islands NS and seafood. Comfort (62/100) and resilience (40/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "eminence-mo": [
    {
      id: "eminence-mo-terrain-mechanism",
      title: "Terrain, karst infiltration, and the Cfa record",
      paragraphs: [
        "At 215 m, Eminence (Ozark Current River) owes its Cfa classification, a humid subtropical regime with hot, humid summers and mild, wetter winters, to the combination of karst infiltration, river-valley moderation, and cold-air drainage rather than to latitude alone. Missouri covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a oak–hickory forest and karst springs setting that behaves more like a limestone / karst pocket than like the regional norm.",
        "Here is how Eminence actually reads: The daytime high climbs to roughly 32°C by Jul before retreating to 7°C in Jan. Jan nights are the low point, settling near −5°C. May is the wettest month on record at 152 mm and Jan the driest at 70 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 6b, with roughly 269 frost-free days to work with each year.",
      ],
    },
    {
      id: "eminence-mo-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Eminence is worth walking through in order: Cherty limestone residuum; thin upland soils drains excessive at pH 5–6.8, with low water holding capacity, and against that base, growability scores 64/100 on this atlas, with Pasture, Cool greens, and Blackberries named as strong fits and extra effort earmarked for Irrigation without groundwater awareness. Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and wildfire running moderate and worsening under current warming. Put together, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "For Eminence, the record works out as follows: Comfort sits at 64/100 and resilience at 56/100 — read both alongside the risk and access figures above, not in isolation. Housing pressure reads 31/100, comparatively affordable within its country comparison set, thin service base notwithstanding; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward paddlers and remote workers, an editorial read rather than a census category, while visitors mostly come for Ozark NS rivers and caving. It is the microclimate-uniqueness figure, 72/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "cape-may-nj": [
    {
      id: "cape-may-nj-terrain-mechanism",
      title: "Elevation, airflow, and the Cfa classification here",
      paragraphs: [
        "Cape May (Atlantic Tip)'s climate comes down to two inputs above all: elevation (3 m) and the combination of diurnal sea breeze, tropical-cyclone exposure, and marine layer. Together they land the record in the Cfa bracket, a humid subtropical regime with hot, humid summers and mild, wetter winters, and sustain a maritime holly forest and dune scrub that marks this out from typical New Jersey conditions as a hurricane-exposed coast.",
        "For Cape May, the record works out as follows: Hardiness zone 7b and roughly 293 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 30°C at the Jul peak, dropping to 7°C once Jan sets in. The coldest nights of the year, near −2°C, cluster around Jan. Precipitation peaks in Oct at 108 mm and thins out to 77 mm by Feb. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation.",
      ],
    },
    {
      id: "cape-may-nj-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Cape May's numbers break down like this: Growability scores 60/100 on this atlas, with Beach plum, Hydrangea, and Irrigated perennials named as strong fits and extra effort earmarked for Drought herbs without watering. Sandy dune soils with peat in swales drains excessive at pH 4.8–6.2, with low water holding capacity, which explains part of that number. Risk diligence here starts with coastal surge running high and worsening under current warming, flood running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. On balance, a tradeoff score of 50/100 means the compromises are real but manageable for a household that plans around them.",
        "Cape May is worth walking through in order: At 60/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 66/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 40/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward historic-home restorers and retirees, an editorial read rather than a census category, and travelers tend to show up for Victorian architecture and bird migration.",
      ],
    },
  ],
  "geneva-on-the-lake-oh": [
    {
      id: "geneva-on-the-lake-oh-terrain-mechanism",
      title: "Elevation, airflow, and the Dfa classification here",
      paragraphs: [
        "Geneva-on-the-Lake (Lake Erie Snowbelt) sits at 185 m in Ohio, a position where the combination of lake effect, diurnal sea breeze, and continental extremity does most of the work in setting the local climate apart from its surroundings. The station record files under the Dfa code, a hot-summer humid continental regime with four sharply separated seasons, layered onto a beachgrass and lakeshore deciduous forest landscape. That pairing of mechanism and biome is the basis for calling this a Lake-Effect Snowbelt on this atlas rather than an unremarkable Ohio waypoint.",
        "For Geneva-on-the-Lake, the record works out as follows: Hardiness zone 6b and roughly 261 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 28°C at the Jul peak, dropping to 1°C once Jan sets in. The coldest nights of the year, near −6°C, cluster around Jan. Precipitation peaks in Oct at 114 mm and thins out to 60 mm by Feb. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain.",
      ],
    },
    {
      id: "geneva-on-the-lake-oh-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Geneva-on-the-Lake's numbers break down like this: Growability scores 56/100 on this atlas, with Concord grapes, Apples, and Cool greens named as strong fits and extra effort earmarked for Peaches (late frost). Clay loam on lake plain with sandy strips drains imperfect at pH 6–7.5, with high water holding capacity, which explains part of that number. Risk diligence here starts with severe storms running elevated and worsening under current warming, flood running moderate and worsening under current warming, and extreme cold running moderate and easing over recent records. On balance, a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Geneva-on-the-Lake is worth walking through in order: At 72/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. Housing pressure reads 33/100, comparatively affordable within its country comparison set, thin service base notwithstanding; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward lake-house buyers, an editorial read rather than a census category, and travelers tend to show up for wine trail and winter storm watching.",
      ],
    },
  ],
  "spokane-wa": [
    {
      id: "spokane-wa-terrain-mechanism",
      title: "Why Spokane reads as a Chinook Corridor",
      paragraphs: [
        "Spokane (Inland Empire)'s climate comes down to two inputs above all: elevation (562 m) and the combination of chinook / foehn downslope, river-valley moderation, and continental extremity. Together they land the record in the Dsb bracket, a continental regime with warm, dry summers and cold winters carrying most of the year's moisture, and sustain a Ponderosa pine–steppe transition that marks this out from typical Washington conditions as a chinook corridor.",
        "Spokane's numbers break down like this: Plan around a Dec peak of 66 mm and a Jul low of 8 mm. Jul carries the year's warmest afternoons, near 31°C, well above the 2°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near −4°C. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Plants here live inside hardiness zone 6b, with roughly 230 frost-free days to work with each year.",
      ],
    },
    {
      id: "spokane-wa-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Spokane, the record works out as follows: Risk diligence here starts with wildfire running elevated and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and flood running moderate and worsening under current warming. On the ground, loess and glacial outwash over basalt drains good at pH 6–7.4, with moderate water holding capacity. Growability scores 68/100 on this atlas, with Apples, Cherries, and Cool greens named as strong fits and extra effort earmarked for Citrus, and a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Spokane actually reads: At 92/100, housing pressure here sits well toward the expensive end of its country comparison set; access remoteness reads 18/100, close enough to larger service hubs that logistics rarely dominate the decision. On the relocation side, the tags here run to families and remote workers — editorial shorthand, not demographic data, while visitors mostly come for Riverfront Park and ski within 2 hrs. Comfort (62/100) and resilience (54/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "napa-ca": [
    {
      id: "napa-ca-terrain-mechanism",
      title: "Terrain, gap winds, and the Csa record",
      paragraphs: [
        "Few places in California pair 20 m of elevation with the combination of gap winds, marine layer, and slope / aspect the way Napa Valley Floor does, and the resulting Csa classification, a hot-summer Mediterranean regime with wet winters and reliably dry summers, shows it. The Mediterranean vineyard and oak savanna on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Napa Valley Floor actually reads: The daytime high climbs to roughly 30°C by Jul before retreating to 15°C in Dec. Dec nights are the low point, settling near 4°C. Dec is the wettest month on record at 151 mm and Jul the driest at 0 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 10a and about 356 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "napa-ca-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Napa Valley Floor is worth walking through in order: Alluvial gravel and volcanic fans drains good at pH 5.8–6.8, with moderate water holding capacity, and against that base, growability scores 88/100 on this atlas, with Wine grapes, Olives, and Stone fruit named as strong fits and extra effort earmarked for Cool-climate brassicas in summer heat. Risk diligence here starts with wildfire running high and worsening under current warming, drought running elevated and worsening under current warming, and extreme heat running elevated and worsening under current warming. Put together, a tradeoff score of 52/100 means the compromises are real but manageable for a household that plans around them.",
        "For Napa Valley Floor, the record works out as follows: Comfort (78/100) and resilience (48/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. 85/100 on housing pressure puts this on the costly side of its national comparison set; 58/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward wine industry and retirees, an editorial read rather than a census category, while on the travel side, the draw is wine tasting and hot-air balloons. Microclimate uniqueness (72/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "palm-springs-ca": [
    {
      id: "palm-springs-ca-terrain-mechanism",
      title: "Why Palm Springs reads as a High-Desert Escape",
      paragraphs: [
        "Palm Springs (Coachella)'s climate comes down to two inputs above all: elevation (146 m) and the combination of gap winds, rain shadow, and elevation lapse rate. Together they land the record in the BWh bracket, a transitional classification straddling two neighboring climate regimes, and sustain a Colorado Desert wash and oasis that marks this out from typical California conditions as a high-desert escape.",
        "Palm Springs's numbers break down like this: Plan around a Feb peak of 37 mm and a Jun low of 0 mm. Jul carries the year's warmest afternoons, near 41°C, well above the 21°C daytime high typical of Dec, while after dark, Dec is as cold as the record gets, near 7°C. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 9b and about 365 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "palm-springs-ca-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Palm Springs, the record works out as follows: Risk diligence here starts with extreme heat running very high and worsening under current warming, drought running high and worsening under current warming, and wildfire running elevated and worsening under current warming. On the ground, sandy desert wash and blown sand drains excessive at pH 7.5–8.5, with low water holding capacity. Growability scores 52/100 on this atlas, with Date palms, Citrus, and Desert natives named as strong fits and extra effort earmarked for Cool-season vegetables in summer, and a tradeoff score of 62/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Here is how Palm Springs actually reads: Housing pressure reads 86/100, firmly on the expensive side within its country comparison set; 58/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, retirees and hospitality, are editorial shorthand, not demographic data, while on the travel side, the draw is modernism week and Joshua Tree day trips. Comfort sits at 58/100 and resilience at 40/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "naples-fl": [
    {
      id: "naples-fl-terrain-mechanism",
      title: "Elevation, airflow, and the Aw border classification here",
      paragraphs: [
        "Naples (Gulf Barrier)'s climate comes down to two inputs above all: elevation (1 m) and the combination of diurnal sea breeze, tropical-cyclone exposure, and marine layer. Together they land the record in the Aw border bracket, a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch, and sustain a subtropical mangrove and palm coastal that marks this out from typical Florida conditions as a hurricane-exposed coast.",
        "For Naples, the record works out as follows: With a hardiness rating of 10b and about 365 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 33°C at the Aug peak, dropping to 24°C once Jan sets in. The coldest nights of the year, near 13°C, cluster around Jan. Precipitation peaks in Jun at 257 mm and thins out to 40 mm by Feb. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar.",
      ],
    },
    {
      id: "naples-fl-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Naples's numbers break down like this: Growability scores 78/100 on this atlas, with Coconut, Mangrove restoration species, and Tropical ornamentals named as strong fits and extra effort earmarked for Temperate bulbs. Sandy marl and mangrove peat drains poor at pH 7–8.5, with high water holding capacity, which explains part of that number. Risk diligence here starts with flood running very high and worsening under current warming, severe storms running very high and worsening under current warming, and coastal surge running very high and worsening under current warming. On balance, a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Naples is worth walking through in order: Microclimate uniqueness (56/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. Housing pressure reads 39/100, a middling, not-cheap-not-brutal read within its country comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward retirees and second-home owners, an editorial read rather than a census category, and on the travel side, the draw is Everglades and beaches.",
      ],
    },
  ],
  "buffalo-ny": [
    {
      id: "buffalo-ny-terrain-mechanism",
      title: "Terrain, lake effect, and the Dfa record",
      paragraphs: [
        "Few places in New York pair 183 m of elevation with the combination of lake effect, polar jet / arctic front, and continental extremity the way Buffalo (Erie Eastern Shore) does, and the resulting Dfa classification, a hot-summer humid continental regime with four sharply separated seasons, shows it. The Great Lakes mixed forest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Buffalo actually reads: The daytime high climbs to roughly 27°C by Jul before retreating to 0°C in Jan. Jan nights are the low point, settling near −7°C. Oct is the wettest month on record at 119 mm and Feb the driest at 68 mm. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. With a hardiness rating of 6b and about 242 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "buffalo-ny-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Buffalo is worth walking through in order: Clay loam on lake plain drains imperfect at pH 6–7.5, with high water holding capacity, and against that base, growability scores 62/100 on this atlas, with Concord grapes, Apples, and Cool greens named as strong fits and extra effort earmarked for Peaches without site selection. Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and extreme cold running moderate and easing over recent records. Put together, a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "For Buffalo, the record works out as follows: Two more figures round this out: comfort at 54/100 and resilience at 56/100, neither meant to be read apart from the risk and access numbers above. Housing pressure reads 88/100, firmly on the expensive side within its country comparison set; at 18/100, access remoteness is low — larger service hubs stay within easy reach. The relocation tags attached here, urban families and lake-house seekers, are editorial shorthand, not demographic data, while on the travel side, the draw is Niagara and wing trails. Microclimate uniqueness (74/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "scottsbluff-ne": [
    {
      id: "scottsbluff-ne-terrain-mechanism",
      title: "The mechanism behind Scottsbluff's microclimate",
      paragraphs: [
        "At 1189 m, Scottsbluff (High Plains Escarpment) owes its BSk classification, a transitional classification straddling two neighboring climate regimes, to the combination of continental extremity, chinook / foehn downslope, and river-valley moderation rather than to latitude alone. Nebraska covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a shortgrass prairie and ponderosa islands setting that behaves more like a high-desert escape than like the regional norm.",
        "Scottsbluff is worth walking through in order: Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Afternoon highs peak near 33°C in Jul and fall back to 5°C by Jan, and overnight lows bottom out around −9°C in Jan. The wet season centers on May (74 mm), with Jan the driest stretch at 8 mm. Plants here live inside hardiness zone 5a, with roughly 200 frost-free days to work with each year.",
      ],
    },
    {
      id: "scottsbluff-ne-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Scottsbluff",
      paragraphs: [
        "Here is how Scottsbluff actually reads: Risk diligence here starts with drought running elevated and worsening under current warming, extreme cold running elevated and easing over recent records, and severe storms running elevated and worsening under current warming. Silt loam on alluvium drains good at pH 6.5–8, with moderate water holding capacity. Growability scores 64/100 on this atlas, with Sugar beets, Dryland wheat, and Windbreak trees named as strong fits and extra effort earmarked for Long-season corn, and a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Scottsbluff's numbers break down like this: The relocation tags attached here, ag workers and remote workers, are editorial shorthand, not demographic data, and visitors mostly come for Scotts Bluff NM and Oregon Trail history. At 53/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. Comfort (52/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. It is the microclimate-uniqueness figure, 62/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "mobile-al": [
    {
      id: "mobile-al-terrain-mechanism",
      title: "Elevation, airflow, and the Cfa classification here",
      paragraphs: [
        "Mobile (Gulf Maritime)'s climate comes down to two inputs above all: elevation (3 m) and the combination of diurnal sea breeze, tropical-cyclone exposure, and river-valley moderation. Together they land the record in the Cfa bracket, a humid subtropical regime with hot, humid summers and mild, wetter winters, and sustain a humid subtropical maritime forest that marks this out from typical Alabama conditions as a hurricane-exposed coast.",
        "For Mobile, the record works out as follows: Hardiness zone 9a and roughly 347 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 33°C at the Aug peak, dropping to 16°C once Jan sets in. The coldest nights of the year, near 4°C, cluster around Jan. Precipitation peaks in Jul at 211 mm and thins out to 97 mm by Oct. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation.",
      ],
    },
    {
      id: "mobile-al-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Mobile's numbers break down like this: Growability scores 76/100 on this atlas, with Live oak, Camellia, and Citrus (marginal) named as strong fits and extra effort earmarked for Dry herbs. Sandy coastal plain drains moderate at pH 4.8–6.5, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with severe storms running very high and worsening under current warming, coastal surge running very high and worsening under current warming, and flood running high and worsening under current warming. On balance, a tradeoff score of 56/100 means the compromises are real but manageable for a household that plans around them.",
        "Mobile is worth walking through in order: At 58/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 38/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward port workers and families, an editorial read rather than a census category, and travelers tend to show up for Mardi Gras and delta wetlands.",
      ],
    },
  ],
  "savannah-ga": [
    {
      id: "savannah-ga-terrain-mechanism",
      title: "Terrain, diurnal sea breeze, and the Cfa record",
      paragraphs: [
        "Savannah (Atlantic Bight) carries the Cfa code for a specific reason: a humid subtropical regime with hot, humid summers and mild, wetter winters. Sitting at 15 m and shaped by the combination of diurnal sea breeze, tropical-cyclone exposure, and river-valley moderation, the site supports a live oak maritime forest that reads as a hurricane-exposed coast within Georgia, a local exception the regional climate summary alone would not predict.",
        "Here is how Savannah actually reads: The daytime high climbs to roughly 33°C by Jul before retreating to 16°C in Jan. Jan nights are the low point, settling near 5°C. Aug is the wettest month on record at 181 mm and Nov the driest at 63 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 9a, with roughly 351 frost-free days to work with each year.",
      ],
    },
    {
      id: "savannah-ga-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Savannah is worth walking through in order: Marine terrace sand and organic histosols drains imperfect at pH 4.5–6.5, with high water holding capacity, and against that base, growability scores 78/100 on this atlas, with Azaleas, Palms, and Subtropical fruit named as strong fits and extra effort earmarked for Cool-climate stone fruit. Risk diligence here starts with coastal surge running high and worsening under current warming, flood running elevated and worsening under current warming, and extreme heat running elevated and worsening under current warming. Put together, a tradeoff score of 52/100 means the compromises are real but manageable for a household that plans around them.",
        "For Savannah, the record works out as follows: Comfort (66/100) and resilience (44/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. 87/100 on housing pressure puts this on the costly side of its national comparison set; at 58/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward hospitality workers and retirees, an editorial read rather than a census category, while visitors mostly come for historic squares and Tybee Island. It is the microclimate-uniqueness figure, 54/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "wilmington-de": [
    {
      id: "wilmington-de-terrain-mechanism",
      title: "Elevation, airflow, and the Cfa classification here",
      paragraphs: [
        "Wilmington (Brandywine–Piedmont) sits at 28 m in Delaware, a position where the combination of river-valley moderation, continental extremity, and slope / aspect does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfa code, a humid subtropical regime with hot, humid summers and mild, wetter winters, layered onto a temperate mixed forest landscape. That pairing of mechanism and biome is the basis for calling this a Piedmont Transition on this atlas rather than an unremarkable Delaware waypoint.",
        "For Wilmington, the record works out as follows: Plants here live inside hardiness zone 7a, with roughly 281 frost-free days to work with each year. Expect afternoons near 31°C at the Jul peak, dropping to 5°C once Jan sets in. The coldest nights of the year, near −4°C, cluster around Jan. Precipitation peaks in Jun at 130 mm and thins out to 76 mm by Feb. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "wilmington-de-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Wilmington's numbers break down like this: Growability scores 70/100 on this atlas, with Native woodland plants, Cool greens, and Dogwood named as strong fits and extra effort earmarked for Mediterranean drought herbs. Schist residuum and floodplain silt drains moderate at pH 5.5–7, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and extreme heat running moderate and worsening under current warming. On balance, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Wilmington is worth walking through in order: It is the microclimate-uniqueness figure, 48/100, that justifies this entry's place in the atlas, independent of the comfort score. At 44/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward commuters to Philly and families, an editorial read rather than a census category, and visitors mostly come for Nemours and Longwood nearby.",
      ],
    },
  ],
  "mystic-ct": [
    {
      id: "mystic-ct-terrain-mechanism",
      title: "Terrain, marine layer, and the Dfb record",
      paragraphs: [
        "At 3 m, Mystic (Fishers Island Sound) owes its Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, to the combination of marine layer, diurnal sea breeze, and tropical-cyclone exposure rather than to latitude alone. Connecticut covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a maritime oak–pine setting that behaves more like a cool-summer maritime than like the regional norm.",
        "Here is how Mystic actually reads: The daytime high climbs to roughly 27°C by Jul before retreating to 4°C in Jan. Jan nights are the low point, settling near −5°C. Mar is the wettest month on record at 117 mm and Feb the driest at 84 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 7a, with roughly 263 frost-free days to work with each year.",
      ],
    },
    {
      id: "mystic-ct-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Mystic is worth walking through in order: Sandy glacial outwash near shore drains excessive at pH 5–6.5, with low water holding capacity, and against that base, growability scores 58/100 on this atlas, with Hydrangea, Rosa rugosa, and Salt-tolerant shrubs named as strong fits and extra effort earmarked for Dry lavender. Risk diligence here starts with coastal surge running high and worsening under current warming, flood running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Put together, a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "For Mystic, the record works out as follows: Two more figures round this out: comfort at 64/100 and resilience at 50/100, neither meant to be read apart from the risk and access numbers above. At 74/100, housing pressure here sits well toward the expensive end of its country comparison set; at 38/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to maritime retirees and museum-goers — editorial shorthand, not demographic data, while visitors mostly come for seaport museum and sailing. It is the microclimate-uniqueness figure, 56/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "state-college-pa": [
    {
      id: "state-college-pa-terrain-mechanism",
      title: "Terrain, cold-air drainage, and the Dfb record",
      paragraphs: [
        "State College (Ridge & Valley) carries the Dfb code for a specific reason: a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season. Sitting at 360 m and shaped by the combination of cold-air drainage, slope / aspect, and lake effect, the site supports a mixed hardwood forest that reads as a cold-air pool within Pennsylvania, a local exception the regional climate summary alone would not predict.",
        "Here is how State College actually reads: The daytime high climbs to roughly 28°C by Jul before retreating to 2°C in Jan. Jan nights are the low point, settling near −7°C. Jun is the wettest month on record at 112 mm and Feb the driest at 67 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 6b and about 236 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "state-college-pa-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "State College is worth walking through in order: Shaley silt loam drains moderate at pH 5.5–6.8, with moderate water holding capacity, and against that base, growability scores 66/100 on this atlas, with Maple, Apples, and Cool greens named as strong fits and extra effort earmarked for Heat-loving melons. Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and extreme heat running moderate and worsening under current warming. Put together, a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "For State College, the record works out as follows: Comfort (60/100) and resilience (56/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. 14/100 on housing pressure keeps this on the affordable side of its national comparison set; 56/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. On the relocation side, the tags here run to academics and families — editorial shorthand, not demographic data, while on the travel side, the draw is Penn State sports and Rothrock SF. Microclimate uniqueness (58/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "columbia-sc": [
    {
      id: "columbia-sc-terrain-mechanism",
      title: "Terrain, river-valley moderation, and the Cfa record",
      paragraphs: [
        "Few places in South Carolina pair 94 m of elevation with the combination of river-valley moderation, tropical-cyclone exposure, and continental extremity the way Columbia (Fall Line) does, and the resulting Cfa classification, a humid subtropical regime with hot, humid summers and mild, wetter winters, shows it. The pine savanna and bottomland hardwood on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Columbia actually reads: The daytime high climbs to roughly 33°C by Jul before retreating to 14°C in Jan. Jan nights are the low point, settling near 1°C. Jul is the wettest month on record at 143 mm and Oct the driest at 76 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 8a, with roughly 323 frost-free days to work with each year.",
      ],
    },
    {
      id: "columbia-sc-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Columbia is worth walking through in order: Sandy loam on coastal plain drains moderate at pH 5–6.5, with moderate water holding capacity, and against that base, growability scores 72/100 on this atlas, with Azaleas, Dogwood, and Warm-season turf named as strong fits and extra effort earmarked for Cool-season lawns in summer. Risk diligence here starts with flood running elevated and worsening under current warming, extreme heat running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Put together, a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "For Columbia, the record works out as follows: Two more figures round this out: comfort at 54/100 and resilience at 48/100, neither meant to be read apart from the risk and access numbers above. At 27/100, housing pressure runs low next to its country comparison set, even with a thin service base; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, government workers and families, are editorial shorthand, not demographic data, while visitors mostly come for Congaree NP and college sports. It is the microclimate-uniqueness figure, 46/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "des-moines-ia": [
    {
      id: "des-moines-ia-terrain-mechanism",
      title: "The mechanism behind Des Moines's microclimate",
      paragraphs: [
        "At 291 m, Des Moines (Corn Belt) owes its Dfa classification, a hot-summer humid continental regime with four sharply separated seasons, to the combination of river-valley moderation, polar jet / arctic front, and continental extremity rather than to latitude alone. Iowa covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a tallgrass prairie (converted) setting that behaves more like a river-valley moderation than like the regional norm.",
        "Des Moines is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 30°C in Jul and fall back to 0°C by Jan, and overnight lows bottom out around −11°C in Jan. The wet season centers on Jun (139 mm), with Jan the driest stretch at 27 mm. Plants here live inside hardiness zone 5b, with roughly 232 frost-free days to work with each year.",
      ],
    },
    {
      id: "des-moines-ia-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Des Moines",
      paragraphs: [
        "Here is how Des Moines actually reads: Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and drought running moderate and moving in mixed directions year to year. Mollisols on glacial till drains moderate at pH 6–7.5, with high water holding capacity. Growability scores 80/100 on this atlas, with Corn, Soybeans, and Tomatoes named as strong fits and extra effort earmarked for Dry Mediterranean herbs, and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Des Moines's numbers break down like this: For relocation, this entry is tagged toward insurance and ag business, an editorial read rather than a census category, and on the travel side, the draw is state fair and cycling trails. 89/100 on housing pressure puts this on the costly side of its national comparison set; 18/100 on access remoteness keeps this close enough to larger hubs that logistics rarely drive the decision. Comfort sits at 56/100 and resilience at 58/100 — read both alongside the risk and access figures above, not in isolation. Microclimate uniqueness (40/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "tucson-az": [
    {
      id: "tucson-az-terrain-mechanism",
      title: "Elevation, airflow, and the BWh classification here",
      paragraphs: [
        "The case for treating Tucson (Sonoran Basin) as a distinct entry rather than folding it into the rest of Arizona starts with elevation: 728 m, acted on by the combination of monsoon convective lift, elevation lapse rate, and slope / aspect. Together those two facts push the climate record toward BWh, a transitional classification straddling two neighboring climate regimes, and support a Sonoran desert scrub and palo verde woodland plant community that would not persist under the region's default conditions.",
        "For Tucson, the record works out as follows: Hardiness zone 9b and roughly 351 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 39°C at the Jun peak, dropping to 20°C once Dec sets in. The coldest nights of the year, near 4°C, cluster around Jan. Precipitation peaks in Jul at 64 mm and thins out to 3 mm by May. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation.",
      ],
    },
    {
      id: "tucson-az-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Tucson's numbers break down like this: Growability scores 62/100 on this atlas, with Citrus (protected), Desert natives, and Mesquite named as strong fits and extra effort earmarked for Cool-climate berries. Desert alluvium and caliche drains excessive at pH 7.5–8.5, with low water holding capacity, which explains part of that number. Risk diligence here starts with extreme heat running very high and worsening under current warming, drought running high and worsening under current warming, and wildfire running elevated and worsening under current warming. On balance, a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Tucson is worth walking through in order: At 68/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 93/100 on housing pressure puts this on the costly side of its national comparison set; 18/100 on access remoteness keeps this close enough to larger hubs that logistics rarely drive the decision. For relocation, this entry is tagged toward retirees and remote workers, an editorial read rather than a census category, and travelers tend to show up for Saguaro NP and Kitt Peak.",
      ],
    },
  ],
  "honolulu-hi": [
    {
      id: "honolulu-hi-terrain-mechanism",
      title: "Why Honolulu reads as a Tropical Isothermal Coast",
      paragraphs: [
        "Honolulu ( Oʻahu Lee) sits at 5 m in Hawaii, a position where the combination of trade-wind regime, orographic lift, diurnal sea breeze, and rain shadow does most of the work in setting the local climate apart from its surroundings. The station record files under the As / Aw code, a tropical dry-summer savanna calendar with rain concentrated outside the hot season, layered onto a tropical dry–wet coastal landscape. That pairing of mechanism and biome is the basis for calling this a Tropical Isothermal Coast on this atlas rather than an unremarkable Hawaii waypoint.",
        "Honolulu's numbers break down like this: Plan around a Dec peak of 136 mm and a Jun low of 58 mm. Aug carries the year's warmest afternoons, near 30°C, well above the 27°C daytime high typical of Feb, while after dark, Jan is as cold as the record gets, near 19°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 12b, with roughly 365 frost-free days to work with each year.",
      ],
    },
    {
      id: "honolulu-hi-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Honolulu, the record works out as follows: Risk diligence here starts with coastal surge running high and worsening under current warming, flood running elevated and worsening under current warming, and extreme heat running moderate and worsening under current warming. On the ground, andisols and reef limestone near shore drains moderate at pH 6–7.5, with moderate water holding capacity. Growability scores 82/100 on this atlas, with Tropical fruit, Palms, and Vegetables year-round named as strong fits and extra effort earmarked for Temperate bulbs, and a tradeoff score of 50/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Honolulu actually reads: Housing pressure reads 90/100, firmly on the expensive side within its country comparison set; at 62/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, military families and tourism workers, are editorial shorthand, not demographic data, while visitors mostly come for surf and Pearl Harbor. Comfort (72/100) and resilience (48/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "roswell-nm": [
    {
      id: "roswell-nm-terrain-mechanism",
      title: "Why Roswell reads as a Monsoon-Edge Zone",
      paragraphs: [
        "Roswell (Pecos Valley)'s climate comes down to two inputs above all: elevation (1087 m) and the combination of monsoon convective lift, continental extremity, and river-valley moderation. Together they land the record in the BSk bracket, a transitional classification straddling two neighboring climate regimes, and sustain a shortgrass steppe that marks this out from typical New Mexico conditions as a monsoon-edge zone.",
        "Roswell's numbers break down like this: Plan around a Sep peak of 45 mm and a Jan low of 9 mm. Jul carries the year's warmest afternoons, near 36°C, well above the 14°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −4°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 7b and roughly 270 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "roswell-nm-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Roswell, the record works out as follows: Risk diligence here starts with drought running high and worsening under current warming, extreme heat running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. On the ground, fine sandy loam over caliche drains good at pH 7.5–8.5, with low water holding capacity. Growability scores 54/100 on this atlas, with Pecans (irrigated), Chile, and Cotton named as strong fits and extra effort earmarked for Dry-farmed corn, and a tradeoff score of 52/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Roswell actually reads: 53/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. On the relocation side, the tags here run to aviation and ranching — editorial shorthand, not demographic data, while travelers tend to show up for aliens museum and Bottomless Lakes. Comfort (50/100) and resilience (46/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "rapid-city-sd": [
    {
      id: "rapid-city-sd-terrain-mechanism",
      title: "Elevation, airflow, and the Dwb classification here",
      paragraphs: [
        "Rapid City (Eastern Black Hills)'s climate comes down to two inputs above all: elevation (966 m) and the combination of chinook / foehn downslope, polar jet / arctic front, and continental extremity. Together they land the record in the Dwb bracket, a continental regime with a dry winter and a warm, moisture-loaded summer, and sustain a Ponderosa pine savanna margin that marks this out from typical South Dakota conditions as a chinook corridor.",
        "For Rapid City, the record works out as follows: Plants here live inside hardiness zone 5a, with roughly 208 frost-free days to work with each year. Expect afternoons near 30°C at the Jul peak, dropping to 4°C once Jan sets in. The coldest nights of the year, near −9°C, cluster around Jan. Precipitation peaks in May at 98 mm and thins out to 8 mm by Jan. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "rapid-city-sd-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Rapid City's numbers break down like this: Growability scores 58/100 on this atlas, with Cool-season vegetables and Hardy fruit named as strong fits and extra effort earmarked for Long-season crops. Clay loam on Pierre shale margin drains moderate at pH 6–7.5, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with wildfire running elevated and worsening under current warming, flood running elevated and worsening under current warming, and extreme cold running elevated and easing over recent records. On balance, a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Rapid City is worth walking through in order: It is the microclimate-uniqueness figure, 64/100, that justifies this entry's place in the atlas, independent of the comfort score. At 52/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward tourism and healthcare, an editorial read rather than a census category, and visitors mostly come for Mount Rushmore and Badlands.",
      ],
    },
  ],
  "jackson-wy": [
    {
      id: "jackson-wy-terrain-mechanism",
      title: "Why Jackson reads as a Cold-Air Pool",
      paragraphs: [
        "Jackson (Jackson Hole) sits at 1901 m in Wyoming, a position where the combination of cold-air drainage, orographic lift, temperature inversion, and elevation lapse rate does most of the work in setting the local climate apart from its surroundings. The station record files under the Dfc code, a subarctic regime with brief, cool summers and long, severe winters, layered onto a montane sage and conifer landscape. That pairing of mechanism and biome is the basis for calling this a Cold-Air Pool on this atlas rather than an unremarkable Wyoming waypoint.",
        "Jackson's numbers break down like this: Plan around a Dec peak of 73 mm and a Jul low of 22 mm. Jul carries the year's warmest afternoons, near 28°C, well above the −2°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −13°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 4b, with roughly 148 frost-free days to work with each year.",
      ],
    },
    {
      id: "jackson-wy-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Jackson, the record works out as follows: Risk diligence here starts with wildfire running elevated and worsening under current warming, extreme cold running elevated and easing over recent records, and smoke and wildfire-season air quality running elevated and worsening under current warming. On the ground, alluvium and glacial outwash drains good at pH 6–7.2, with moderate water holding capacity. Growability scores 42/100 on this atlas, with Short-season greens and Hay named as strong fits and extra effort earmarked for Tree fruit, and a tradeoff score of 56/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Jackson actually reads: 83/100 on housing pressure puts this on the costly side of its national comparison set; at 58/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward hospitality and outdoor industry, an editorial read rather than a census category, while visitors mostly come for Grand Teton NP and skiing. Comfort (58/100) and resilience (48/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "washington-dc": [
    {
      id: "washington-dc-terrain-mechanism",
      title: "Why Washington reads as a Urban Heat Contrast",
      paragraphs: [
        "Washington, D.C. sits at 15 m in District of Columbia, a position where the combination of continental extremity, river-valley moderation, and tropical-cyclone exposure does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfa code, a humid subtropical regime with hot, humid summers and mild, wetter winters, layered onto a humid subtropical urban forest landscape. That pairing of mechanism and biome is the basis for calling this a Urban Heat Contrast on this atlas rather than an unremarkable District of Columbia waypoint.",
        "Washington's numbers break down like this: Plan around a Jul peak of 128 mm and a Feb low of 75 mm. Jul carries the year's warmest afternoons, near 31°C, well above the 7°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −3°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 7b and roughly 287 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "washington-dc-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Washington, the record works out as follows: Risk diligence here starts with flood running elevated and worsening under current warming, extreme heat running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. On the ground, silty coastal plain and urban fill drains imperfect at pH 5.5–7.5, with moderate water holding capacity. Growability scores 68/100 on this atlas, with Cherry trees, Dogwood, and Warm-season turf named as strong fits and extra effort earmarked for Cool-climate small fruit, and a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Washington actually reads: 94/100 on housing pressure puts this on the costly side of its national comparison set; 18/100 on access remoteness keeps this close enough to larger hubs that logistics rarely drive the decision. For relocation, this entry is tagged toward policy workers and students, an editorial read rather than a census category, while travelers tend to show up for monuments and museums. Comfort sits at 58/100 and resilience at 52/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "sunshine-coast-bc": [
    {
      id: "sunshine-coast-bc-terrain-mechanism",
      title: "Elevation, airflow, and the Csb classification here",
      paragraphs: [
        "The case for treating Sunshine Coast (Sechelt) as a distinct entry rather than folding it into the rest of British Columbia starts with elevation: 40 m, acted on by the combination of rain shadow and marine layer. Together those two facts push the climate record toward Csb, a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching, and support a coastal Douglas-fir plant community that would not persist under the region's default conditions.",
        "For Sunshine Coast, the record works out as follows: Plants here live inside hardiness zone 8a, with roughly 349 frost-free days to work with each year. Expect afternoons near 23°C at the Jul peak, dropping to 7°C once Dec sets in. The coldest nights of the year, near 3°C, cluster around Jan. Precipitation peaks in Nov at 203 mm and thins out to 32 mm by Jul. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "sunshine-coast-bc-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Sunshine Coast's numbers break down like this: Growability scores 72/100 on this atlas, with Apples, Pears, and Grapes named as strong fits and extra effort earmarked for Heat lovers. Sandy loam drains good at pH 5.6–6.4, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with wildfire running moderate and worsening under current warming, drought running moderate and worsening under current warming, and smoke and wildfire-season air quality running moderate and worsening under current warming. On balance, a tradeoff score of 35/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Sunshine Coast is worth walking through in order: It is the microclimate-uniqueness figure, 74/100, that justifies this entry's place in the atlas, independent of the comfort score. 72/100 on housing pressure puts this on the costly side of its national comparison set; at 48/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward remote workers and retirees, an editorial read rather than a census category, and visitors mostly come for Pacific shoulder-season.",
      ],
    },
  ],
  "salt-spring-bc": [
    {
      id: "salt-spring-bc-terrain-mechanism",
      title: "Elevation, airflow, and the Csb classification here",
      paragraphs: [
        "Salt Spring Island sits at 40 m in British Columbia, a position where the combination of rain shadow and marine layer does most of the work in setting the local climate apart from its surroundings. The station record files under the Csb code, a cool-summer Mediterranean regime whose dry season stays marine-tempered rather than scorching, layered onto a coastal Douglas-fir / Garry oak landscape. That pairing of mechanism and biome is the basis for calling this a Rain-Shadow Sanctuary on this atlas rather than an unremarkable British Columbia waypoint.",
        "For Salt Spring Island, the record works out as follows: With a hardiness rating of 8b and about 329 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 23°C at the Jul peak, dropping to 5°C once Dec sets in. The coldest nights of the year, near 1°C, cluster around Feb. Precipitation peaks in Jan at 212 mm and thins out to 21 mm by Jul. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation.",
      ],
    },
    {
      id: "salt-spring-bc-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Salt Spring Island's numbers break down like this: Growability scores 80/100 on this atlas, with Grapes, Olives (marginal), and Figs named as strong fits and extra effort earmarked for Summer irrigation required. Sandy loam drains good at pH 5.8–6.6, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with wildfire running moderate and worsening under current warming, drought running moderate and worsening under current warming, and smoke and wildfire-season air quality running moderate and worsening under current warming. On balance, a tradeoff score of 38/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Salt Spring Island is worth walking through in order: Microclimate uniqueness (78/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. Housing pressure reads 74/100, firmly on the expensive side within its country comparison set; 52/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, artist-farmers and off-grid, are editorial shorthand, not demographic data, and travelers tend to show up for island farm tour.",
      ],
    },
  ],
  "summerland-bc": [
    {
      id: "summerland-bc-terrain-mechanism",
      title: "Why Summerland reads as a Orchard Valley",
      paragraphs: [
        "Summerland (Central Okanagan) sits at 453 m in British Columbia, a position where the combination of rain shadow, lake effect, and slope / aspect does most of the work in setting the local climate apart from its surroundings. The station record files under the BSk code, a transitional classification straddling two neighboring climate regimes, layered onto a interior Douglas-fir / bunchgrass landscape. That pairing of mechanism and biome is the basis for calling this a Orchard Valley on this atlas rather than an unremarkable British Columbia waypoint.",
        "Summerland's numbers break down like this: Plan around a Jun peak of 44 mm and a Aug low of 20 mm. Jul carries the year's warmest afternoons, near 29°C, well above the 1°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near −4°C. Jan, Feb, Mar, and Nov, and beyond carry the snow load here, a distinct planning window from the rain totals above. Hardiness zone 6a and roughly 248 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "summerland-bc-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Summerland, the record works out as follows: Risk diligence here starts with wildfire running high and worsening under current warming, smoke and wildfire-season air quality running high and worsening under current warming, and drought running elevated and worsening under current warming. On the ground, sandy loam on glacial benches drains excessive at pH 6.8–7.6, with low water holding capacity. Growability scores 84/100 on this atlas, with Apples (heritage), Cherries, and Wine grapes (cool-climate) named as strong fits and extra effort earmarked for Humidity lovers, and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Summerland actually reads: At 28/100, housing pressure runs low next to its country comparison set, even with a thin service base; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, viticulturalists and orchardists, are editorial shorthand, not demographic data, while travelers tend to show up for wine tours. Two more figures round this out: comfort at 74/100 and resilience at 54/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "grand-manan-nb": [
    {
      id: "grand-manan-nb-terrain-mechanism",
      title: "Terrain, marine layer, and the Dfb / Cfb transition record",
      paragraphs: [
        "Few places in New Brunswick pair 30 m of elevation with marine layer the way Grand Manan Island does, and the resulting Dfb / Cfb transition classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, shows it. The acadian coastal forest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Grand Manan Island actually reads: The daytime high climbs to roughly 23°C by Jul before retreating to 0°C in Jan. Jan nights are the low point, settling near −9°C. Dec is the wettest month on record at 143 mm and Aug the driest at 85 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 6a and about 228 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "grand-manan-nb-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Grand Manan Island is worth walking through in order: Thin sandy loam on metamorphic bedrock drains good at pH 5.2–6, with low water holding capacity, and against that base, growability scores 56/100 on this atlas, with Native perennials, Cool-season vegetables, and Berries named as strong fits and extra effort earmarked for Long-season fruit. Risk diligence here starts with severe storms running elevated and worsening under current warming, coastal surge running elevated and worsening under current warming, and flood running moderate and worsening under current warming. Put together, a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "For Grand Manan Island, the record works out as follows: Comfort (58/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Housing pressure reads 33/100, comparatively affordable within its country comparison set, thin service base notwithstanding; 55/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward hardy maritime families, an editorial read rather than a census category, while on the travel side, the draw is whales and puffins. Microclimate uniqueness (76/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "creston-bc": [
    {
      id: "creston-bc-terrain-mechanism",
      title: "Why Creston Valley reads as a Orchard Valley",
      paragraphs: [
        "Creston Valley's climate comes down to two inputs above all: elevation (600 m) and the combination of river-valley moderation and rain shadow. Together they land the record in the Dfb / BSk transition bracket, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and sustain a interior cedar-hemlock that marks this out from typical British Columbia conditions as a orchard valley.",
        "Creston Valley's numbers break down like this: Plan around a Nov peak of 87 mm and a Aug low of 22 mm. Jul carries the year's warmest afternoons, near 29°C, well above the 1°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near −5°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 5b and roughly 234 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "creston-bc-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Creston Valley, the record works out as follows: Risk diligence here starts with wildfire running elevated and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and flood running moderate and holding roughly steady over recent records. On the ground, silt loam on lake-bottom deposits drains moderate at pH 6.2–7, with high water holding capacity. Growability scores 80/100 on this atlas, with Apples (heritage), Cherries, and Hardy grapes named as strong fits and extra effort earmarked for Heat lovers, and a tradeoff score of 32/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Here is how Creston Valley actually reads: 12/100 on housing pressure keeps this on the affordable side of its national comparison set; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. On the relocation side, the tags here run to small-farm families — editorial shorthand, not demographic data, while travelers tend to show up for wildlife area and orchards. Comfort sits at 68/100 and resilience at 58/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "penticton-bc": [
    {
      id: "penticton-bc-terrain-mechanism",
      title: "Why Penticton reads as a Rain-Shadow Sanctuary",
      paragraphs: [
        "The case for treating Penticton (South Okanagan) as a distinct entry rather than folding it into the rest of British Columbia starts with elevation: 344 m, acted on by the combination of rain shadow, lake effect, and river-valley moderation. Together those two facts push the climate record toward BSk / Dfb margin, a transitional classification straddling two neighboring climate regimes, and support a interior ponderosa-bunchgrass plant community that would not persist under the region's default conditions.",
        "Penticton's numbers break down like this: Plan around a Jun peak of 43 mm and a Aug low of 19 mm. Jul carries the year's warmest afternoons, near 30°C, well above the 2°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −3°C. Jan, Feb, Mar, and Nov, and beyond carry the snow load here, a distinct planning window from the rain totals above. Plants here live inside hardiness zone 6b, with roughly 261 frost-free days to work with each year.",
      ],
    },
    {
      id: "penticton-bc-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Penticton, the record works out as follows: Risk diligence here starts with wildfire running high (2003, 2023 severe seasons) and worsening under current warming, smoke and wildfire-season air quality running high and worsening under current warming, and drought running elevated and worsening under current warming. On the ground, silt loam over glaciolacustrine sediment drains good at pH 6.8–7.6, with moderate water holding capacity. Growability scores 84/100 on this atlas, with Wine grapes, Peaches, and Apples named as strong fits and extra effort earmarked for Humidity lovers, and a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Penticton actually reads: 84/100 on housing pressure puts this on the costly side of its national comparison set; at 58/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward winemakers, orchardists, and retirees, an editorial read rather than a census category, while visitors mostly come for wine trail and beaches. Comfort sits at 72/100 and resilience at 48/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "kamloops-bc": [
    {
      id: "kamloops-bc-terrain-mechanism",
      title: "Elevation, airflow, and the BSk classification here",
      paragraphs: [
        "Kamloops sits at 345 m in British Columbia, a position where the combination of rain shadow and river-valley moderation does most of the work in setting the local climate apart from its surroundings. The station record files under the BSk code, a transitional classification straddling two neighboring climate regimes, layered onto a bunchgrass / sage steppe landscape. That pairing of mechanism and biome is the basis for calling this a Rain-Shadow Sanctuary on this atlas rather than an unremarkable British Columbia waypoint.",
        "For Kamloops, the record works out as follows: Hardiness zone 6b and roughly 244 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 29°C at the Jul peak, dropping to 1°C once Dec sets in. The coldest nights of the year, near −5°C, cluster around Jan. Precipitation peaks in Jun at 40 mm and thins out to 17 mm by Apr. Winter here means snow, concentrated in Jan, Feb, Mar, and Nov and later, not just cold rain.",
      ],
    },
    {
      id: "kamloops-bc-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Kamloops's numbers break down like this: Growability scores 68/100 on this atlas, with Hardy fruit, Tomatoes (with water), and Hay named as strong fits and extra effort earmarked for Acid-loving plants. Silt loam on glacio-lacustrine drains good at pH 7–7.8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with wildfire running high and worsening under current warming, extreme heat running high (2021 heat dome 47°C) and worsening under current warming, and smoke and wildfire-season air quality running high and worsening under current warming. On balance, a tradeoff score of 52/100 means the compromises are real but manageable for a household that plans around them.",
        "Kamloops is worth walking through in order: At 72/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 88/100 on housing pressure puts this on the costly side of its national comparison set; 18/100 on access remoteness keeps this close enough to larger hubs that logistics rarely drive the decision. For relocation, this entry is tagged toward sun-seeking Canadians, an editorial read rather than a census category, and travelers tend to show up for desert hiking and fly-fishing.",
      ],
    },
  ],
  "revelstoke-bc": [
    {
      id: "revelstoke-bc-terrain-mechanism",
      title: "Why Revelstoke reads as a Lake-Effect Snowbelt",
      paragraphs: [
        "Revelstoke (Snow Capital)'s climate comes down to two inputs above all: elevation (453 m) and the combination of orographic lift and river-valley moderation. Together they land the record in the Dfb (humid) bracket, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and sustain a interior cedar-hemlock that marks this out from typical British Columbia conditions as a lake-effect snowbelt.",
        "Revelstoke's numbers break down like this: Plan around a Jan peak of 113 mm and a Aug low of 43 mm. Jul carries the year's warmest afternoons, near 27°C, well above the −1°C daytime high typical of Dec, while after dark, Feb is as cold as the record gets, near −6°C. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain. Plants here live inside hardiness zone 5b, with roughly 220 frost-free days to work with each year.",
      ],
    },
    {
      id: "revelstoke-bc-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Revelstoke, the record works out as follows: Risk diligence here starts with severe storms running high (Avalanche hazard is massive) and holding roughly steady over recent records, landslide or debris-flow running high and holding roughly steady over recent records, and flood running elevated and worsening under current warming. On the ground, silt loam / sandy loam drains moderate at pH 5.2–6.4, with moderate water holding capacity. Growability scores 48/100 on this atlas, with Short-season crops and Berries named as strong fits and extra effort earmarked for Heat crops, and a tradeoff score of 54/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Revelstoke actually reads: 70/100 on housing pressure puts this on the costly side of its national comparison set; at 56/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward serious skiers and snow-loving families, an editorial read rather than a census category, while visitors mostly come for ski and powder tourism. Two more figures round this out: comfort at 54/100 and resilience at 52/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "tofino-ucluelet-corridor": [
    {
      id: "tofino-ucluelet-corridor-terrain-mechanism",
      title: "Why Ucluelet reads as a Hyper-Maritime",
      paragraphs: [
        "The case for treating Ucluelet as a distinct entry rather than folding it into the rest of British Columbia starts with elevation: 6 m, acted on by the combination of marine layer and orographic lift. Together those two facts push the climate record toward Cfb, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, and support a Sitka spruce coastal rainforest plant community that would not persist under the region's default conditions.",
        "Ucluelet's numbers break down like this: Plan around a Jan peak of 450 mm and a Jul low of 63 mm. Aug carries the year's warmest afternoons, near 19°C, well above the 8°C daytime high typical of Dec, while after dark, Feb is as cold as the record gets, near 2°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. With a hardiness rating of 8b and about 338 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "tofino-ucluelet-corridor-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Ucluelet, the record works out as follows: Risk diligence here starts with severe storms running high and holding roughly steady over recent records, coastal surge running high and worsening under current warming, and flood running elevated and worsening under current warming. On the ground, organic over glacial till drains moderate at pH 4.8–5.8, with high water holding capacity. Growability scores 44/100 on this atlas, with Salal, Ferns, and Moss-tolerant greens named as strong fits and extra effort earmarked for Tomatoes and Stone fruit, and a tradeoff score of 56/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Ucluelet actually reads: 95/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 70/100, a real logistics tax on hospital runs, flights, and freight. For relocation, this entry is tagged toward storm-coast romantics, an editorial read rather than a census category, while travelers tend to show up for surfing and storm watching. Comfort (54/100) and resilience (78/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "prince-rupert-bc": [
    {
      id: "prince-rupert-bc-terrain-mechanism",
      title: "Why Prince Rupert reads as a Hyper-Maritime",
      paragraphs: [
        "Prince Rupert sits at 35 m in British Columbia, a position where the combination of orographic lift and marine layer does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfb (hyper-oceanic) code, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, layered onto a coastal temperate rainforest landscape. That pairing of mechanism and biome is the basis for calling this a Hyper-Maritime on this atlas rather than an unremarkable British Columbia waypoint.",
        "Prince Rupert's numbers break down like this: Plan around a Oct peak of 254 mm and a Jun low of 96 mm. Aug carries the year's warmest afternoons, near 18°C, well above the 5°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 1°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Hardiness zone 7b and roughly 329 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "prince-rupert-bc-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Prince Rupert, the record works out as follows: Risk diligence here starts with severe storms running high and holding roughly steady over recent records, flood running elevated and worsening under current warming, and coastal surge running elevated and worsening under current warming. On the ground, organic over bedrock / thin till drains poor at pH 4.4–5.4, with high water holding capacity. Growability scores 30/100 on this atlas, with Moss-tolerant and Cool brassicas named as strong fits and extra effort earmarked for Almost everything heat-loving, and a tradeoff score of 64/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Here is how Prince Rupert actually reads: Housing pressure reads 7/100, comparatively affordable within its country comparison set, thin service base notwithstanding; access remoteness reads 78/100, a real logistics tax on hospital runs, flights, and freight. For relocation, this entry is tagged toward hyper-maritime devotees, an editorial read rather than a census category, while visitors mostly come for Skeena fishing and BC Ferries terminus. Comfort (42/100) and resilience (72/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "pincher-creek-ab": [
    {
      id: "pincher-creek-ab-terrain-mechanism",
      title: "Why Pincher Creek reads as a Chinook Corridor",
      paragraphs: [
        "Pincher Creek (Chinook Zone)'s climate comes down to two inputs above all: elevation (1190 m) and chinook / foehn downslope. Together they land the record in the Dfb bracket, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and sustain a fescue prairie / foothills parkland that marks this out from typical Alberta conditions as a chinook corridor.",
        "Pincher Creek's numbers break down like this: Plan around a Jun peak of 88 mm and a Jan low of 20 mm. Jul carries the year's warmest afternoons, near 25°C, well above the 0°C daytime high typical of Dec, while after dark, Feb is as cold as the record gets, near −10°C. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. With a hardiness rating of 3b and about 194 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "pincher-creek-ab-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Pincher Creek, the record works out as follows: Risk diligence here starts with extreme cold running elevated and easing over recent records, severe storms running elevated (Among Canada's windiest) and holding roughly steady over recent records, and wildfire running moderate and worsening under current warming. On the ground, dark brown chernozem drains good at pH 6.8–7.6, with moderate water holding capacity. Growability scores 52/100 on this atlas, with Cold-hardy crops, Hay, and Wind-tolerant perennials named as strong fits and extra effort earmarked for Wind-sensitive crops, and a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Pincher Creek actually reads: At 19/100, housing pressure runs low next to its country comparison set, even with a thin service base; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, ranchers and wind-tolerant, are editorial shorthand, not demographic data, while on the travel side, the draw is Waterton gateway. Comfort (54/100) and resilience (56/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "cypress-hills-sk": [
    {
      id: "cypress-hills-sk-terrain-mechanism",
      title: "Terrain, elevation lapse rate, and the Dfb (island) record",
      paragraphs: [
        "At 1460 m, Cypress Hills owes its Dfb (island) classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, to the combination of elevation lapse rate, continental extremity, and cold-air drainage rather than to latitude alone. Saskatchewan covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a montane forest / fescue grassland setting that behaves more like a sky-island refuge than like the regional norm.",
        "Here is how Cypress Hills actually reads: The daytime high climbs to roughly 24°C by Jul before retreating to −4°C in Jan. Jan nights are the low point, settling near −15°C. Jun is the wettest month on record at 97 mm and Feb the driest at 22 mm. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. With a hardiness rating of 3a and about 166 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "cypress-hills-sk-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Cypress Hills is worth walking through in order: Dark brown chernozem with wooded pockets drains good at pH 6.4–7.4, with moderate water holding capacity, and against that base, growability scores 48/100 on this atlas, with Cold-hardy perennials and Short-season crops named as strong fits and extra effort earmarked for Warm-season crops. Risk diligence here starts with extreme cold running high and easing over recent records, wildfire running moderate and worsening under current warming, and drought running moderate and worsening under current warming. Put together, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "For Cypress Hills, the record works out as follows: Comfort sits at 56/100 and resilience at 62/100 — read both alongside the risk and access figures above, not in isolation. Housing pressure reads 2/100, comparatively affordable within its country comparison set, thin service base notwithstanding; 56/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward prairie ranchers, an editorial read rather than a census category, while on the travel side, the draw is dark-sky preserve and boreal surprise. Microclimate uniqueness (82/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "leamington-on": [
    {
      id: "leamington-on-terrain-mechanism",
      title: "Elevation, airflow, and the Dfa (warmest Dfa in Canada) classification here",
      paragraphs: [
        "Leamington / Pelee's climate comes down to two inputs above all: elevation (183 m) and the combination of lake effect and river-valley moderation. Together they land the record in the Dfa (warmest Dfa in Canada) bracket, a hot-summer humid continental regime with four sharply separated seasons, and sustain a carolinian forest remnants that marks this out from typical Ontario conditions as a lake-moderated.",
        "For Leamington / Pelee, the record works out as follows: Hardiness zone 7a and roughly 256 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 27°C at the Jul peak, dropping to 0°C once Jan sets in. The coldest nights of the year, near −6°C, cluster around Jan. Precipitation peaks in Apr at 92 mm and thins out to 57 mm by Feb. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain.",
      ],
    },
    {
      id: "leamington-on-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Leamington / Pelee's numbers break down like this: Growability scores 86/100 on this atlas, with Tomatoes (greenhouse), Peaches, and Wine grapes named as strong fits and extra effort earmarked for Short-season cold-adapted. Deep clay loam on lakebed sediment drains moderate at pH 6.4–7.4, with high water holding capacity, which explains part of that number. Risk diligence here starts with severe storms running elevated and worsening under current warming, flood running moderate and worsening under current warming, and drought running moderate and worsening under current warming. On balance, a tradeoff score of 32/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Leamington / Pelee is worth walking through in order: At 54/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 14/100 on housing pressure keeps this on the affordable side of its national comparison set; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. On the relocation side, the tags here run to greenhouse farmers — editorial shorthand, not demographic data, and travelers tend to show up for Point Pelee birding.",
      ],
    },
  ],
  "thunder-bay-on": [
    {
      id: "thunder-bay-on-terrain-mechanism",
      title: "Terrain, lake effect, and the Dfb record",
      paragraphs: [
        "At 183 m, Thunder Bay owes its Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, to the combination of lake effect and continental extremity rather than to latitude alone. Ontario covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a boreal forest setting that behaves more like a lake-moderated than like the regional norm.",
        "Here is how Thunder Bay actually reads: The daytime high climbs to roughly 24°C by Jul before retreating to −7°C in Jan. Jan nights are the low point, settling near −17°C. Jun is the wettest month on record at 88 mm and Feb the driest at 25 mm. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Plants here live inside hardiness zone 3b, with roughly 183 frost-free days to work with each year.",
      ],
    },
    {
      id: "thunder-bay-on-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Thunder Bay is worth walking through in order: Sandy loam over glacial till drains moderate at pH 5.4–6.4, with moderate water holding capacity, and against that base, growability scores 44/100 on this atlas, with Cold-hardy perennials and Cool-season crops named as strong fits and extra effort earmarked for Heat crops. Risk diligence here starts with extreme cold running high and easing over recent records, smoke and wildfire-season air quality running elevated and worsening under current warming, and wildfire running moderate and worsening under current warming. Put together, a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "For Thunder Bay, the record works out as follows: Comfort sits at 50/100 and resilience at 62/100 — read both alongside the risk and access figures above, not in isolation. At 93/100, housing pressure here sits well toward the expensive end of its country comparison set; access remoteness reads 18/100, close enough to larger service hubs that logistics rarely dominate the decision. On the relocation side, the tags here run to boreal families — editorial shorthand, not demographic data, while visitors mostly come for Sleeping Giant Park. It is the microclimate-uniqueness figure, 54/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "gaspe-qc": [
    {
      id: "gaspe-qc-terrain-mechanism",
      title: "The mechanism behind Gaspé Peninsula Tip's microclimate",
      paragraphs: [
        "Gaspé Peninsula Tip carries the Dfb (maritime-modified) code for a specific reason: a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season. Sitting at 10 m and shaped by the combination of marine layer, orographic lift, and continental extremity, the site supports a boreal-Acadian transition with salt-spray flora that reads as a cool-summer maritime within Québec, a local exception the regional climate summary alone would not predict.",
        "Gaspé Peninsula Tip is worth walking through in order: Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Afternoon highs peak near 21°C in Jul and fall back to −5°C by Jan, and overnight lows bottom out around −14°C in Feb. The wet season centers on Oct (126 mm), with Feb the driest stretch at 89 mm. With a hardiness rating of 4b and about 185 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "gaspe-qc-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Gaspé Peninsula Tip",
      paragraphs: [
        "Here is how Gaspé Peninsula Tip actually reads: Risk diligence here starts with severe storms running high and worsening under current warming, coastal surge running high and worsening under current warming, and extreme cold running elevated and easing over recent records. Thin till over sedimentary bedrock drains moderate at pH 5.2–6.4, with moderate water holding capacity. Growability scores 44/100 on this atlas, with Berries, Potatoes, and Short-season veg named as strong fits and extra effort earmarked for Heat crops, and a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Gaspé Peninsula Tip's numbers break down like this: On the relocation side, the tags here run to maritime romantics — editorial shorthand, not demographic data, and on the travel side, the draw is Forillon and fishing villages. At 65/100, housing pressure here sits well toward the expensive end of its country comparison set; 56/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Comfort (48/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Microclimate uniqueness (74/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "yellowknife-nt": [
    {
      id: "yellowknife-nt-terrain-mechanism",
      title: "Elevation, airflow, and the Dfc classification here",
      paragraphs: [
        "Yellowknife sits at 206 m in Northwest Territories, a position where the combination of continental extremity, polar jet / arctic front, and cold-air drainage does most of the work in setting the local climate apart from its surroundings. The station record files under the Dfc code, a subarctic regime with brief, cool summers and long, severe winters, layered onto a boreal-taiga transition landscape. That pairing of mechanism and biome is the basis for calling this a Subarctic Continental on this atlas rather than an unremarkable Northwest Territories waypoint.",
        "For Yellowknife, the record works out as follows: Hardiness zone 2a and roughly 140 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 22°C at the Jul peak, dropping to −20°C once Jan sets in. The coldest nights of the year, near −28°C, cluster around Jan. Precipitation peaks in Aug at 46 mm and thins out to 10 mm by Apr. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above.",
      ],
    },
    {
      id: "yellowknife-nt-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Yellowknife's numbers break down like this: Growability scores 24/100 on this atlas, with Tundra-hardy greens and Short-season potatoes named as strong fits and extra effort earmarked for Almost everything. Thin till over Shield bedrock drains moderate at pH 5.6–6.6, with low water holding capacity, which explains part of that number. Risk diligence here starts with extreme cold running very high and easing over recent records, wildfire running high (2014 and 2023 massive fire seasons) and worsening under current warming, and smoke and wildfire-season air quality running high and worsening under current warming. On balance, a tradeoff score of 72/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Yellowknife is worth walking through in order: At 82/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 98/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 78/100, a real logistics tax on hospital runs, flights, and freight. For relocation, this entry is tagged toward aurora-centric life and northern service workers, an editorial read rather than a census category, and travelers tend to show up for aurora and ice road.",
      ],
    },
  ],
  "churchill-mb": [
    {
      id: "churchill-mb-terrain-mechanism",
      title: "Why Churchill reads as a Subarctic Continental",
      paragraphs: [
        "Churchill (Hudson Bay)'s climate comes down to two inputs above all: elevation (29 m) and the combination of polar jet / arctic front, continental extremity, and marine layer. Together they land the record in the Dfc / Dfd bracket, a subarctic regime with brief, cool summers and long, severe winters, and sustain a subarctic coastal tundra / boreal edge that marks this out from typical Manitoba conditions as a subarctic continental.",
        "Churchill's numbers break down like this: Plan around a Aug peak of 70 mm and a Feb low of 9 mm. Jul carries the year's warmest afternoons, near 20°C, well above the −20°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −29°C. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain. Plants here live inside hardiness zone 1a, with roughly 131 frost-free days to work with each year.",
      ],
    },
    {
      id: "churchill-mb-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Churchill, the record works out as follows: Risk diligence here starts with extreme cold running very high and easing over recent records, severe storms running high and worsening under current warming, and smoke and wildfire-season air quality running elevated and worsening under current warming. On the ground, peat over permafrost drains poor at pH 4.6–5.8, with high water holding capacity. Growability scores 14/100 on this atlas, with Arctic-adapted greens named as strong fits and extra effort earmarked for Almost everything, and a tradeoff score of 78/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Here is how Churchill actually reads: At 60/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 56/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to subarctic researchers — editorial shorthand, not demographic data, while visitors mostly come for polar bears, beluga whales, and aurora. Two more figures round this out: comfort at 22/100 and resilience at 28/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "prince-edward-co-on": [
    {
      id: "prince-edward-co-on-terrain-mechanism",
      title: "Elevation, airflow, and the Dfb classification here",
      paragraphs: [
        "The case for treating Prince Edward County as a distinct entry rather than folding it into the rest of Ontario starts with elevation: 95 m, acted on by the combination of lake effect and karst infiltration. Together those two facts push the climate record toward Dfb, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, and support a carolinian-boreal transition on limestone plant community that would not persist under the region's default conditions.",
        "For Prince Edward County, the record works out as follows: Plants here live inside hardiness zone 6b, with roughly 236 frost-free days to work with each year. Expect afternoons near 26°C at the Jul peak, dropping to −1°C once Jan sets in. The coldest nights of the year, near −9°C, cluster around Jan. Precipitation peaks in Dec at 90 mm and thins out to 67 mm by Mar. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain.",
      ],
    },
    {
      id: "prince-edward-co-on-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Prince Edward County's numbers break down like this: Growability scores 78/100 on this atlas, with Pinot Noir, Chardonnay, and Riesling named as strong fits and extra effort earmarked for Heat-loving long-season crops. Thin loam over limestone (Hillier loam) drains good at pH 7.2–8.1, with low water holding capacity, which explains part of that number. Risk diligence here starts with flood running moderate and worsening under current warming, drought running moderate and worsening under current warming, and extreme cold running moderate and easing over recent records. On balance, a tradeoff score of 34/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Prince Edward County is worth walking through in order: It is the microclimate-uniqueness figure, 70/100, that justifies this entry's place in the atlas, independent of the comfort score. Housing pressure reads 21/100, comparatively affordable within its country comparison set, thin service base notwithstanding; at 42/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward winemakers, an editorial read rather than a census category, and visitors mostly come for wine trail and beaches.",
      ],
    },
  ],
  "iqaluit-nu": [
    {
      id: "iqaluit-nu-terrain-mechanism",
      title: "Terrain, continental extremity, and the ET record",
      paragraphs: [
        "Iqaluit carries the ET code for a specific reason: a tundra regime with no month averaging above 10°C even in peak summer. Sitting at 36 m and shaped by the combination of continental extremity, polar jet / arctic front, and katabatic drainage flow, the site supports a low-Arctic tundra that reads as a subarctic continental within Nunavut, a local exception the regional climate summary alone would not predict.",
        "Here is how Iqaluit actually reads: The daytime high climbs to roughly 12°C by Jul before retreating to −21°C in Feb. Feb nights are the low point, settling near −28°C. Aug is the wettest month on record at 54 mm and Feb the driest at 12 mm. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Plants here live inside hardiness zone 0a, with roughly 108 frost-free days to work with each year.",
      ],
    },
    {
      id: "iqaluit-nu-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Iqaluit is worth walking through in order: Glacial till, thin; permafrost continuous drains imperfect at pH 5.5–6.5, with moderate water holding capacity, and against that base, growability scores 8/100 on this atlas, with Arctic berries (crowberry, blueberry) and Hydroponic greens indoors named as strong fits and extra effort earmarked for Virtually all outdoor agriculture. Risk diligence here starts with extreme cold running very high and easing over recent records, coastal surge running elevated and worsening under current warming, and severe storms running moderate and worsening under current warming. Put together, a tradeoff score of 86/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Iqaluit, the record works out as follows: Comfort (24/100) and resilience (36/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. At 49/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 78/100, access remoteness is high enough that logistics genuinely shape daily life here. On the relocation side, the tags here run to Nunavut government workers and Arctic researchers — editorial shorthand, not demographic data, while visitors mostly come for Inuit cultural tourism, Arctic wildlife, and polar nights / midnight sun. It is the microclimate-uniqueness figure, 92/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "inuvik-nt": [
    {
      id: "inuvik-nt-terrain-mechanism",
      title: "Terrain, continental extremity, and the Dfc record",
      paragraphs: [
        "Inuvik carries the Dfc code for a specific reason: a subarctic regime with brief, cool summers and long, severe winters. Sitting at 68 m and shaped by the combination of continental extremity and polar jet / arctic front, the site supports a subarctic taiga-tundra transition that reads as a subarctic continental within Northwest Territories, a local exception the regional climate summary alone would not predict.",
        "Here is how Inuvik actually reads: The daytime high climbs to roughly 19°C by Jul before retreating to −21°C in Jan. Jan nights are the low point, settling near −28°C. Aug is the wettest month on record at 37 mm and Apr the driest at 7 mm. Snow accumulates across Jan, Feb, Mar, and Apr and beyond, a separate planning season from the rain totals alone. Hardiness zone 1a and roughly 118 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "inuvik-nt-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Inuvik is worth walking through in order: Organic soils over permafrost; peat dominant drains poor at pH 4.5–6, with high water holding capacity, and against that base, growability scores 12/100 on this atlas, with Hardy greens (short season), Some potatoes, and Berries named as strong fits and extra effort earmarked for Almost everything. Risk diligence here starts with extreme cold running very high and easing over recent records, wildfire running moderate and worsening under current warming, and flood running moderate and worsening under current warming. Put together, a tradeoff score of 84/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Inuvik, the record works out as follows: Comfort sits at 22/100 and resilience at 30/100 — read both alongside the risk and access figures above, not in isolation. At 47/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; access remoteness reads 78/100, a real logistics tax on hospital runs, flights, and freight. For relocation, this entry is tagged toward Arctic researchers and Gwich'in/Inuvialuit residents, an editorial read rather than a census category, while visitors mostly come for midnight-sun photography, aurora (Aug–Apr), and Dempster Highway journey. It is the microclimate-uniqueness figure, 88/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "haida-gwaii-bc": [
    {
      id: "haida-gwaii-bc-terrain-mechanism",
      title: "The mechanism behind Haida Gwaii's microclimate",
      paragraphs: [
        "Few places in British Columbia pair 15 m of elevation with the combination of marine layer, orographic lift, and coastal upwelling the way Haida Gwaii does, and the resulting Cfb classification, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, shows it. The hyper-maritime temperate rainforest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Haida Gwaii is worth walking through in order: Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Afternoon highs peak near 18°C in Aug and fall back to 7°C by Jan, and overnight lows bottom out around 2°C in Mar. The wet season centers on Dec (265 mm), with Jul the driest stretch at 68 mm. Plants here live inside hardiness zone 8a, with roughly 342 frost-free days to work with each year.",
      ],
    },
    {
      id: "haida-gwaii-bc-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Haida Gwaii",
      paragraphs: [
        "Here is how Haida Gwaii actually reads: Risk diligence here starts with severe storms running elevated and worsening under current warming, flood running moderate and worsening under current warming, and landslide or debris-flow running moderate and worsening under current warming. Podzolic forest soils over glacial till drains imperfect at pH 4.5–5.5, with high water holding capacity. Growability scores 56/100 on this atlas, with Potatoes, Greens, and Berries named as strong fits and extra effort earmarked for Heat-loving crops, and a tradeoff score of 60/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Haida Gwaii's numbers break down like this: For relocation, this entry is tagged toward rainforest residents, Haida Nation community, and cool-climate purists, an editorial read rather than a census category, and visitors mostly come for Gwaii Haanas National Park, Haida cultural tourism, and ancient cedar forests. At 44/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; access remoteness reads 86/100, a real logistics tax on hospital runs, flights, and freight. Comfort sits at 50/100 and resilience at 70/100 — read both alongside the risk and access figures above, not in isolation. It is the microclimate-uniqueness figure, 82/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "medicine-hat-ab": [
    {
      id: "medicine-hat-ab-terrain-mechanism",
      title: "Elevation, airflow, and the BSk classification here",
      paragraphs: [
        "Medicine Hat sits at 717 m in Alberta, a position where the combination of chinook / foehn downslope, rain shadow, and continental extremity does most of the work in setting the local climate apart from its surroundings. The station record files under the BSk code, a transitional classification straddling two neighboring climate regimes, layered onto a mixed short-grass prairie landscape. That pairing of mechanism and biome is the basis for calling this a Chinook Corridor on this atlas rather than an unremarkable Alberta waypoint.",
        "For Medicine Hat, the record works out as follows: With a hardiness rating of 3b and about 186 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 28°C at the Jul peak, dropping to −2°C once Jan sets in. The coldest nights of the year, near −13°C, cluster around Jan. Precipitation peaks in Jun at 64 mm and thins out to 8 mm by Feb. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain.",
      ],
    },
    {
      id: "medicine-hat-ab-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Medicine Hat's numbers break down like this: Growability scores 54/100 on this atlas, with Hardy wheat, Pulse crops, and Drought-hardy gardens named as strong fits and extra effort earmarked for Moisture-loving crops without irrigation. Dark brown chernozem (short-grass prairie) drains good at pH 6.8–8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with drought running elevated and worsening under current warming, wildfire running moderate and worsening under current warming, and flood running moderate and worsening under current warming. On balance, a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Medicine Hat is worth walking through in order: Microclimate uniqueness (76/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. Housing pressure reads 37/100, a middling, not-cheap-not-brutal read within its country comparison set; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. On the relocation side, the tags here run to sun-seekers in Canada, retirees, and drought-tolerant gardeners — editorial shorthand, not demographic data, and on the travel side, the draw is badlands tours, South Saskatchewan River, and dark-sky observers.",
      ],
    },
  ],
  "twillingate-nl": [
    {
      id: "twillingate-nl-terrain-mechanism",
      title: "The mechanism behind Twillingate's microclimate",
      paragraphs: [
        "Few places in Newfoundland and Labrador pair 12 m of elevation with the combination of marine layer, polar jet / arctic front, and continental extremity the way Twillingate (Iceberg Coast) does, and the resulting Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, shows it. The boreal coastal barrens on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Twillingate is worth walking through in order: Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain. Afternoon highs peak near 21°C in Jul and fall back to −2°C by Feb, and overnight lows bottom out around −9°C in Feb. The wet season centers on Nov (120 mm), with May the driest stretch at 81 mm. Hardiness zone 5a and roughly 202 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "twillingate-nl-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Twillingate",
      paragraphs: [
        "Here is how Twillingate actually reads: Risk diligence here starts with severe storms running elevated and worsening under current warming, coastal surge running elevated and worsening under current warming, and flood running moderate and worsening under current warming. Thin podzol over Precambrian rock; rocky drains good at pH 4.8–5.8, with low water holding capacity. Growability scores 32/100 on this atlas, with Hardy berries, Cool-season greens, and Potatoes (traditional) named as strong fits and extra effort earmarked for Most warm-season crops, and a tradeoff score of 60/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Twillingate's numbers break down like this: On the relocation side, the tags here run to maritime-climate purists and iceberg obsessives — editorial shorthand, not demographic data, and travelers tend to show up for iceberg viewing (May–Jun), whale watching (Jun–Aug), and cod jigging. 9/100 on housing pressure keeps this on the affordable side of its national comparison set; at 72/100, access remoteness is high enough that logistics genuinely shape daily life here. Comfort (50/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. At 84/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "kelowna-bc": [
    {
      id: "kelowna-bc-terrain-mechanism",
      title: "The mechanism behind Kelowna's microclimate",
      paragraphs: [
        "Kelowna (Central Okanagan) carries the BSk code for a specific reason: a transitional classification straddling two neighboring climate regimes. Sitting at 344 m and shaped by the combination of rain shadow, lake effect, and river-valley moderation, the site supports a Ponderosa pine–bunchgrass and irrigated orchard that reads as a rain-shadow sanctuary within British Columbia, a local exception the regional climate summary alone would not predict.",
        "Kelowna is worth walking through in order: Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Afternoon highs peak near 30°C in Jul and fall back to 2°C by Jan, and overnight lows bottom out around −3°C in Jan. The wet season centers on Dec (39 mm), with Aug the driest stretch at 18 mm. Plants here live inside hardiness zone 6b, with roughly 264 frost-free days to work with each year.",
      ],
    },
    {
      id: "kelowna-bc-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Kelowna",
      paragraphs: [
        "Here is how Kelowna actually reads: Risk diligence here starts with wildfire running high and worsening under current warming, smoke and wildfire-season air quality running high and worsening under current warming, and drought running elevated and worsening under current warming. Glacial lacustrine and sandy loam benches drains good at pH 6.5–7.8, with moderate water holding capacity. Growability scores 82/100 on this atlas, with Wine grapes, Cherries, and Apples named as strong fits and extra effort earmarked for Dryland without irrigation, and a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Kelowna's numbers break down like this: The relocation tags attached here, viticulture workers and remote tech, are editorial shorthand, not demographic data, and visitors mostly come for wine routes and skiing Big White. Housing pressure reads 91/100, firmly on the expensive side within its country comparison set; at 18/100, access remoteness is low — larger service hubs stay within easy reach. Comfort (72/100) and resilience (48/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. It is the microclimate-uniqueness figure, 72/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "squamish-bc": [
    {
      id: "squamish-bc-terrain-mechanism",
      title: "Terrain, marine layer, and the Cfb record",
      paragraphs: [
        "Few places in British Columbia pair 5 m of elevation with the combination of marine layer, orographic lift, and gap winds the way Squamish (Howe Sound) does, and the resulting Cfb classification, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, shows it. The coastal western hemlock–cedar forest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Squamish actually reads: The daytime high climbs to roughly 25°C by Jul before retreating to 5°C in Dec. Jan nights are the low point, settling near 0°C. Nov is the wettest month on record at 373 mm and Jul the driest at 42 mm. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 8b and roughly 317 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "squamish-bc-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Squamish is worth walking through in order: Alluvium and glacial outwash near river; thin podzols upslope drains good at pH 5.2–6.5, with moderate water holding capacity, and against that base, growability scores 58/100 on this atlas, with Cool brassicas, Berries, and Hemlock-shade natives named as strong fits and extra effort earmarked for Heat crops. Risk diligence here starts with flood running elevated and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Put together, a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "For Squamish, the record works out as follows: Comfort sits at 70/100 and resilience at 54/100 — read both alongside the risk and access figures above, not in isolation. Housing pressure reads 23/100, comparatively affordable within its country comparison set, thin service base notwithstanding; access remoteness reads 42/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward climbers and wind-sport athletes, an editorial read rather than a census category, while travelers tend to show up for Stawamus Chief and Sea to Sky Gondola. At 76/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "banff-ab": [
    {
      id: "banff-ab-terrain-mechanism",
      title: "Terrain, chinook / foehn downslope, and the Dfc record",
      paragraphs: [
        "Banff (Bow Valley) carries the Dfc code for a specific reason: a subarctic regime with brief, cool summers and long, severe winters. Sitting at 1383 m and shaped by the combination of chinook / foehn downslope, elevation lapse rate, and rain shadow, the site supports a montane and subalpine conifer forest that reads as a chinook corridor within Alberta, a local exception the regional climate summary alone would not predict.",
        "Here is how Banff actually reads: The daytime high climbs to roughly 23°C by Jul before retreating to −4°C in Dec. Dec nights are the low point, settling near −13°C. Jun is the wettest month on record at 77 mm and Feb the driest at 19 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 3a and about 149 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "banff-ab-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Banff is worth walking through in order: Thin rocky brunisol on limestone drains excessive at pH 6.8–7.8, with low water holding capacity, and against that base, growability scores 28/100 on this atlas, with Hardy native conifers named as strong fits and extra effort earmarked for Vegetable season very short. Risk diligence here starts with wildfire running elevated and worsening under current warming, extreme cold running elevated and easing over recent records, and smoke and wildfire-season air quality running elevated and worsening under current warming. Put together, a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "For Banff, the record works out as follows: Two more figures round this out: comfort at 48/100 and resilience at 50/100, neither meant to be read apart from the risk and access numbers above. Housing pressure reads 81/100, firmly on the expensive side within its country comparison set; 58/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, hospitality seasonal workers and park staff, are editorial shorthand, not demographic data, while on the travel side, the draw is Lake Louise, skiing, and hiking. Microclimate uniqueness (80/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "dawson-city-yt": [
    {
      id: "dawson-city-yt-terrain-mechanism",
      title: "Why Dawson City reads as a Subarctic Continental",
      paragraphs: [
        "Dawson City's climate comes down to two inputs above all: elevation (320 m) and the combination of continental extremity, river-valley moderation, cold-air drainage, and polar jet / arctic front. Together they land the record in the Dfc bracket, a subarctic regime with brief, cool summers and long, severe winters, and sustain a boreal spruce and river alluvium that marks this out from typical Yukon conditions as a subarctic continental.",
        "Dawson City's numbers break down like this: Plan around a Jul peak of 58 mm and a Apr low of 7 mm. Jul carries the year's warmest afternoons, near 23°C, well above the −19°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near −28°C. Jan, Feb, Mar, and Apr, and beyond carry the snow load here, a distinct planning window from the rain totals above. Hardiness zone 1b and roughly 124 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "dawson-city-yt-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Dawson City, the record works out as follows: Risk diligence here starts with extreme cold running very high and easing over recent records, wildfire running elevated and worsening under current warming, and smoke and wildfire-season air quality running elevated and worsening under current warming. On the ground, river alluvium and silty loam over discontinuous permafrost drains moderate at pH 5.8–7, with moderate water holding capacity. Growability scores 28/100 on this atlas, with Potatoes, Hardy greens, and Rhubarb named as strong fits and extra effort earmarked for Tree fruit and Warm-season crops, and a tradeoff score of 76/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Here is how Dawson City actually reads: 42/100 on housing pressure is a mid-pack figure against its national comparison set; at 78/100, access remoteness is high enough that logistics genuinely shape daily life here. On the relocation side, the tags here run to northern history workers and aurora seekers — editorial shorthand, not demographic data, while travelers tend to show up for Klondike history, midnight sun, and aurora. Comfort (30/100) and resilience (36/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "morden-mb": [
    {
      id: "morden-mb-terrain-mechanism",
      title: "The mechanism behind Morden & the Pembina Escarpment's microclimate",
      paragraphs: [
        "At 300 m, Morden & the Pembina Escarpment owes its Dfb classification, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, to the combination of slope / aspect and continental extremity rather than to latitude alone. Manitoba covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a tallgrass prairie and parkland transition setting that behaves more like a orchard valley than like the regional norm.",
        "Morden & the Pembina Escarpment is worth walking through in order: Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain. Afternoon highs peak near 26°C in Jul and fall back to −9°C by Jan, and overnight lows bottom out around −19°C in Jan. The wet season centers on Jun (90 mm), with Feb the driest stretch at 15 mm. With a hardiness rating of 4a and about 181 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "morden-mb-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Morden & the Pembina Escarpment",
      paragraphs: [
        "Here is how Morden & the Pembina Escarpment actually reads: Risk diligence here starts with extreme cold running high and easing over recent records, drought running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Prairie loam and clay loam drains good at pH 6.8–8, with moderate water holding capacity. Growability scores 72/100 on this atlas, with Prairie grapes, Apples, and Corn named as strong fits and extra effort earmarked for Tender perennials and Wet-foot crops, and a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Morden & the Pembina Escarpment's numbers break down like this: On the relocation side, the tags here run to gardeners and prairie families — editorial shorthand, not demographic data, and on the travel side, the draw is Morden research station heritage and prairie fall. 16/100 on housing pressure keeps this on the affordable side of its national comparison set; 42/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Comfort sits at 52/100 and resilience at 58/100 — read both alongside the risk and access figures above, not in isolation. Microclimate uniqueness (58/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "sutton-qc": [
    {
      id: "sutton-qc-terrain-mechanism",
      title: "Elevation, airflow, and the Dfb classification here",
      paragraphs: [
        "Sutton & the Eastern Townships sits at 210 m in Quebec, a position where the combination of orographic lift, cold-air drainage, and slope / aspect does most of the work in setting the local climate apart from its surroundings. The station record files under the Dfb code, a warm-summer humid continental regime with cold winters bracketing a genuinely warm, moist green season, layered onto a northern hardwood and maple-beech forest landscape. That pairing of mechanism and biome is the basis for calling this a Piedmont Transition on this atlas rather than an unremarkable Quebec waypoint.",
        "For Sutton & the Eastern Townships, the record works out as follows: With a hardiness rating of 5a and about 208 frost-free days annually, the growing calendar has firm limits. Expect afternoons near 26°C at the Jul peak, dropping to −4°C once Jan sets in. The coldest nights of the year, near −13°C, cluster around Jan. Precipitation peaks in Jul at 131 mm and thins out to 76 mm by Feb. Winter here means snow, concentrated in Jan, Feb, Mar, and Apr and later, not just cold rain.",
      ],
    },
    {
      id: "sutton-qc-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Sutton & the Eastern Townships's numbers break down like this: Growability scores 60/100 on this atlas, with Apples, Cold-hardy grapes, and Maple named as strong fits and extra effort earmarked for Tender stone fruit and Warm-season crops without protection. Stony loam and glacial till on Appalachian slopes drains good at pH 5.3–6.6, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with extreme cold running elevated and easing over recent records, severe storms running elevated and worsening under current warming, and flood running moderate and worsening under current warming. On balance, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Sutton & the Eastern Townships is worth walking through in order: Microclimate uniqueness (64/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score. 5/100 on housing pressure keeps this on the affordable side of its national comparison set; 56/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. On the relocation side, the tags here run to remote workers and maple-country smallholders — editorial shorthand, not demographic data, and on the travel side, the draw is fall color, ski weekends, and wine routes.",
      ],
    },
  ],
  "coatepec-mx": [
    {
      id: "coatepec-mx-terrain-mechanism",
      title: "Why Coatepec reads as a Cloud Forest",
      paragraphs: [
        "The case for treating Coatepec (Coffee Cloud Belt) as a distinct entry rather than folding it into the rest of Veracruz starts with elevation: 1250 m, acted on by orographic lift. Together those two facts push the climate record toward Cfb, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, and support a montane cloud forest / coffee landscape plant community that would not persist under the region's default conditions.",
        "Coatepec's numbers break down like this: Plan around a Sep peak of 274 mm and a Feb low of 29 mm. May carries the year's warmest afternoons, near 29°C, well above the 23°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 10°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 11b equiv., with roughly 365 frost-free days to work with each year.",
      ],
    },
    {
      id: "coatepec-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Coatepec, the record works out as follows: Risk diligence here starts with flood running elevated and worsening under current warming, landslide or debris-flow running elevated and worsening under current warming, and severe storms running moderate and worsening under current warming. On the ground, andisol drains moderate at pH 5–6, with high water holding capacity. Growability scores 80/100 on this atlas, with Coffee, Avocado, and Citrus named as strong fits and extra effort earmarked for Dry-climate crops, and a tradeoff score of 38/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Here is how Coatepec actually reads: Housing pressure reads 2/100, comparatively affordable within its country comparison set, thin service base notwithstanding; 32/100 on access remoteness keeps this close enough to larger hubs that logistics rarely drive the decision. For relocation, this entry is tagged toward coffee people and cloud-forest lovers, an editorial read rather than a census category, while visitors mostly come for coffee tourism. Comfort sits at 74/100 and resilience at 62/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "xilitla-mx": [
    {
      id: "xilitla-mx-terrain-mechanism",
      title: "The mechanism behind Xilitla's microclimate",
      paragraphs: [
        "Few places in San Luis Potosí pair 600 m of elevation with orographic lift the way Xilitla (Huasteca Cloud Forest) does, and the resulting Cfa classification, a humid subtropical regime with hot, humid summers and mild, wetter winters, shows it. The montane cloud forest on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Xilitla is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 33°C in May and fall back to 25°C by Jan, and overnight lows bottom out around 11°C in Jan. The wet season centers on Sep (330 mm), with Dec the driest stretch at 25 mm. With a hardiness rating of 12a equiv. and about 365 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "xilitla-mx-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Xilitla",
      paragraphs: [
        "Here is how Xilitla actually reads: Risk diligence here starts with flood running elevated and worsening under current warming, landslide or debris-flow running elevated and worsening under current warming, and severe storms running moderate and worsening under current warming. Leached forest loam on karst limestone drains moderate at pH 5–6, with high water holding capacity. Growability scores 68/100 on this atlas, with Coffee, Citrus, and Sugarcane named as strong fits and extra effort earmarked for Cool-season crops, and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Xilitla's numbers break down like this: For relocation, this entry is tagged toward cloud-forest dwellers, an editorial read rather than a census category, and on the travel side, the draw is Las Pozas and cascades. Housing pressure reads 56/100, a middling, not-cheap-not-brutal read within its country comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Comfort (68/100) and resilience (60/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Microclimate uniqueness (82/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "cuauhtemoc-mx": [
    {
      id: "cuauhtemoc-mx-terrain-mechanism",
      title: "Elevation, airflow, and the BSk classification here",
      paragraphs: [
        "Cuauhtémoc (Mennonite Apple Country) sits at 2060 m in Chihuahua, a position where the combination of continental extremity and elevation lapse rate does most of the work in setting the local climate apart from its surroundings. The station record files under the BSk code, a transitional classification straddling two neighboring climate regimes, layered onto a Chihuahuan high desert / irrigated orchard landscape. That pairing of mechanism and biome is the basis for calling this a High-Desert Escape on this atlas rather than an unremarkable Chihuahua waypoint.",
        "For Cuauhtémoc, the record works out as follows: Plants here live inside hardiness zone 8a equiv., with roughly 299 frost-free days to work with each year. Expect afternoons near 31°C at the Jun peak, dropping to 19°C once Dec sets in. The coldest nights of the year, near 0°C, cluster around Dec. Precipitation peaks in Jul at 137 mm and thins out to 4 mm by Mar. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "cuauhtemoc-mx-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Cuauhtémoc's numbers break down like this: Growability scores 82/100 on this atlas, with Apples, Pears, and Dairy pasture named as strong fits and extra effort earmarked for Tropical crops. Silty loam over caliche drains good at pH 7–7.8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with drought running elevated and worsening under current warming, wildfire running moderate and worsening under current warming, and flood running moderate and worsening under current warming. On balance, a tradeoff score of 32/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Cuauhtémoc is worth walking through in order: It is the microclimate-uniqueness figure, 66/100, that justifies this entry's place in the atlas, independent of the comfort score. At 12/100, housing pressure runs low next to its country comparison set, even with a thin service base; at 36/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, orchard farmers, are editorial shorthand, not demographic data, and visitors mostly come for Mennonite cheese tourism.",
      ],
    },
  ],
  "real-catorce-mx": [
    {
      id: "real-catorce-mx-terrain-mechanism",
      title: "Why Real de Catorce reads as a Sky-Island Refuge",
      paragraphs: [
        "Real de Catorce's climate comes down to two inputs above all: elevation (2756 m) and the combination of elevation lapse rate and continental extremity. Together they land the record in the BSk (high montane) bracket, a transitional classification straddling two neighboring climate regimes, and sustain a semi-arid montane / desert matorral that marks this out from typical San Luis Potosí conditions as a sky-island refuge.",
        "Real de Catorce's numbers break down like this: Plan around a Sep peak of 93 mm and a Jan low of 6 mm. May carries the year's warmest afternoons, near 25°C, well above the 16°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 2°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 9a equiv., with roughly 325 frost-free days to work with each year.",
      ],
    },
    {
      id: "real-catorce-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Real de Catorce, the record works out as follows: Risk diligence here starts with drought running elevated and worsening under current warming, wildfire running moderate and worsening under current warming, and extreme cold running moderate and easing over recent records. On the ground, stony thin loam drains excessive at pH 7–8, with low water holding capacity. Growability scores 28/100 on this atlas, with Desert natives and Nopal named as strong fits and extra effort earmarked for Almost everything cultivated, and a tradeoff score of 54/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Real de Catorce actually reads: At 9/100, housing pressure runs low next to its country comparison set, even with a thin service base; 88/100 on access remoteness means hospital runs, flights, and freight all carry a real logistics tax. The relocation tags attached here, artists and pilgrims, are editorial shorthand, not demographic data, while visitors mostly come for Wirikuta pilgrimage and ghost-town tourism. Comfort sits at 60/100 and resilience at 48/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "la-paz-mx": [
    {
      id: "la-paz-mx-terrain-mechanism",
      title: "Terrain, diurnal sea breeze, and the BWh record",
      paragraphs: [
        "Few places in Baja California Sur pair 10 m of elevation with the combination of diurnal sea breeze, tropical-cyclone exposure, and continental extremity the way La Paz (Sea of Cortez) does, and the resulting BWh classification, a transitional classification straddling two neighboring climate regimes, shows it. The Sonoran desert coast / mangrove on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how La Paz actually reads: The daytime high climbs to roughly 37°C by Aug before retreating to 26°C in Jan. Jan nights are the low point, settling near 12°C. Sep is the wettest month on record at 79 mm and May the driest at 0 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 11 equiv., with roughly 365 frost-free days to work with each year.",
      ],
    },
    {
      id: "la-paz-mx-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "La Paz is worth walking through in order: Sandy alluvial / coastal drains excessive at pH 7.4–8.2, with low water holding capacity, and against that base, growability scores 46/100 on this atlas, with Date palms, Mango, and Citrus named as strong fits and extra effort earmarked for Temperate crops. Risk diligence here starts with drought running high and worsening under current warming, extreme heat running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Put together, a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "For La Paz, the record works out as follows: Comfort sits at 72/100 and resilience at 44/100 — read both alongside the risk and access figures above, not in isolation. At 63/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 62/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to snowbirds and marine-adjacent — editorial shorthand, not demographic data, while visitors mostly come for whale sharks and island tourism. It is the microclimate-uniqueness figure, 62/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "puerto-escondido-mx": [
    {
      id: "puerto-escondido-mx-terrain-mechanism",
      title: "Why Puerto Escondido reads as a Tropical Wet-Dry",
      paragraphs: [
        "Puerto Escondido sits at 10 m in Oaxaca, a position where the combination of diurnal sea breeze, tropical-cyclone exposure, and tropical convective regime does most of the work in setting the local climate apart from its surroundings. The station record files under the Aw code, a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch, layered onto a tropical dry forest / coastal landscape. That pairing of mechanism and biome is the basis for calling this a Tropical Wet-Dry on this atlas rather than an unremarkable Oaxaca waypoint.",
        "Puerto Escondido's numbers break down like this: Plan around a Sep peak of 229 mm and a Jan low of 0 mm. May carries the year's warmest afternoons, near 35°C, well above the 33°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near 18°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 12 equiv. and roughly 365 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "puerto-escondido-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Puerto Escondido, the record works out as follows: Risk diligence here starts with severe storms running high and worsening under current warming, coastal surge running high and worsening under current warming, and flood running moderate and worsening under current warming. On the ground, sandy loam / coastal alluvium drains good at pH 6.2–7.2, with low water holding capacity. Growability scores 62/100 on this atlas, with Mango, Papaya, and Coconut named as strong fits and extra effort earmarked for Temperate crops, and a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Puerto Escondido actually reads: 47/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, surfers and tropical-coast people, are editorial shorthand, not demographic data, while travelers tend to show up for surfing and sea-turtle viewing. Two more figures round this out: comfort at 66/100 and resilience at 42/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "merida-mx": [
    {
      id: "merida-mx-terrain-mechanism",
      title: "Why Mérida reads as a Tropical Wet-Dry",
      paragraphs: [
        "The case for treating Mérida as a distinct entry rather than folding it into the rest of Yucatán starts with elevation: 9 m, acted on by the combination of karst infiltration, tropical-cyclone exposure, and trade-wind regime. Together those two facts push the climate record toward Aw, a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch, and support a tropical deciduous / thorn forest plant community that would not persist under the region's default conditions.",
        "Mérida's numbers break down like this: Plan around a Jun peak of 187 mm and a Mar low of 15 mm. May carries the year's warmest afternoons, near 36°C, well above the 29°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 17°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 12 equiv. and roughly 365 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "merida-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Mérida, the record works out as follows: Risk diligence here starts with extreme heat running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and flood running moderate and worsening under current warming. On the ground, thin rendzina over limestone drains excessive at pH 7.4–8.2, with low water holding capacity. Growability scores 58/100 on this atlas, with Henequen (agave), Citrus, and Mango named as strong fits and extra effort earmarked for Temperate crops and Water-needy plants without irrigation, and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Mérida actually reads: 42/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward colonial-city expats, an editorial read rather than a census category, while travelers tend to show up for Maya sites and cenotes. Comfort sits at 62/100 and resilience at 50/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "bacalar-mx": [
    {
      id: "bacalar-mx-terrain-mechanism",
      title: "Why Bacalar reads as a Tropical Wet-Dry",
      paragraphs: [
        "Bacalar (Laguna de los Siete Colores)'s climate comes down to two inputs above all: elevation (10 m) and the combination of karst infiltration, tropical-cyclone exposure, and trade-wind regime. Together they land the record in the Aw bracket, a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch, and sustain a tropical freshwater lagoon / karst that marks this out from typical Quintana Roo conditions as a tropical wet-dry.",
        "Bacalar's numbers break down like this: Plan around a Jun peak of 213 mm and a Mar low of 18 mm. May carries the year's warmest afternoons, near 34°C, well above the 30°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 18°C. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 12 equiv. and about 365 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "bacalar-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Bacalar, the record works out as follows: Risk diligence here starts with extreme heat running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and flood running moderate and worsening under current warming. On the ground, thin rendzina over karst drains excessive at pH 7.6–8.2, with low water holding capacity. Growability scores 56/100 on this atlas, with Tropical fruit, Cacao, and Vanilla named as strong fits and extra effort earmarked for Temperate, and a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Bacalar actually reads: Housing pressure reads 35/100, a middling, not-cheap-not-brutal read within its country comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. On the relocation side, the tags here run to tropical expats — editorial shorthand, not demographic data, while on the travel side, the draw is lagoon tourism and stromatolites. Comfort (68/100) and resilience (44/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above.",
      ],
    },
  ],
  "la-ventosa-mx": [
    {
      id: "la-ventosa-mx-terrain-mechanism",
      title: "Why La Ventosa reads as a Gap / Gorge Wind Corridor",
      paragraphs: [
        "La Ventosa (Tehuantepec Gap) sits at 40 m in Oaxaca, a position where the combination of gap winds, trade-wind regime, continental extremity, and tropical-cyclone exposure does most of the work in setting the local climate apart from its surroundings. The station record files under the Aw code, a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch, layered onto a tropical dry thorn forest landscape. That pairing of mechanism and biome is the basis for calling this a Gap / Gorge Wind Corridor on this atlas rather than an unremarkable Oaxaca waypoint.",
        "La Ventosa's numbers break down like this: Plan around a Sep peak of 238 mm and a Jan low of 1 mm. May carries the year's warmest afternoons, near 35°C, well above the 31°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near 19°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 11b equiv. and roughly 365 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "la-ventosa-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For La Ventosa, the record works out as follows: Risk diligence here starts with extreme heat running elevated and worsening under current warming, severe storms running elevated (Both hurricane tracks and gap-wind storms) and worsening under current warming, and wildfire running moderate and worsening under current warming. On the ground, sandy loam over alluvium drains good at pH 6.5–7.8, with moderate water holding capacity. Growability scores 48/100 on this atlas, with Mango, Tropical crops adapted to wind, and Sorghum named as strong fits and extra effort earmarked for Tall or tender crops vulnerable to wind, and a tradeoff score of 74/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Here is how La Ventosa actually reads: 37/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, wind energy workers and meteorology enthusiasts, are editorial shorthand, not demographic data, while travelers tend to show up for wind farms, kite/windsurfing, and Zapotec cultural tours. Comfort sits at 40/100 and resilience at 48/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
  "ensenada-mx": [
    {
      id: "ensenada-mx-terrain-mechanism",
      title: "The mechanism behind Ensenada's microclimate",
      paragraphs: [
        "Few places in Baja California pair 15 m of elevation with the combination of coastal upwelling, marine layer, and diurnal sea breeze the way Ensenada (Valle de Guadalupe) does, and the resulting BSk classification, a transitional classification straddling two neighboring climate regimes, shows it. The Mediterranean chaparral / coastal sage on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Ensenada is worth walking through in order: Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Afternoon highs peak near 31°C in Aug and fall back to 21°C by Feb, and overnight lows bottom out around 4°C in Dec. The wet season centers on Feb (48 mm), with Jun the driest stretch at 0 mm. Hardiness zone 10a and roughly 327 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "ensenada-mx-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Ensenada",
      paragraphs: [
        "Here is how Ensenada actually reads: Risk diligence here starts with wildfire running elevated and worsening under current warming, drought running elevated and worsening under current warming, and extreme heat running moderate and worsening under current warming. Sandy-loam alluvium in the valleys; granitic uplands drains good at pH 6.8–7.8, with moderate water holding capacity. Growability scores 76/100 on this atlas, with Cabernet Sauvignon, Tempranillo, and Nebbiolo named as strong fits and extra effort earmarked for Tropical crops, and a tradeoff score of 38/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Ensenada's numbers break down like this: For relocation, this entry is tagged toward winemakers, cool-Mediterranean lovers, and retirees seeking a California-South alternative, an editorial read rather than a census category, and travelers tend to show up for wine country tours, seafood cuisine, and whale watching. 72/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 44/100, workable, but not a place to assume same-day specialty care. Comfort sits at 80/100 and resilience at 58/100 — read both alongside the risk and access figures above, not in isolation. At 82/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "xalapa-mx": [
    {
      id: "xalapa-mx-terrain-mechanism",
      title: "The mechanism behind Xalapa's microclimate",
      paragraphs: [
        "Few places in Veracruz pair 1427 m of elevation with the combination of orographic lift, marine layer, and elevation lapse rate the way Xalapa (Cloud-Forest Capital) does, and the resulting Cfb classification, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, shows it. The montane cloud forest (bosque mesófilo) on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Xalapa is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 28°C in May and fall back to 22°C by Jan, and overnight lows bottom out around 9°C in Jan. The wet season centers on Jun (268 mm), with Dec the driest stretch at 27 mm. With a hardiness rating of 10a and about 365 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "xalapa-mx-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Xalapa",
      paragraphs: [
        "Here is how Xalapa actually reads: Risk diligence here starts with landslide or debris-flow running elevated (Saturated slopes, intense rain events) and worsening under current warming, flood running moderate and worsening under current warming, and severe storms running moderate and worsening under current warming. Deep andisol from volcanic ash drains good at pH 5.2–6.2, with high water holding capacity. Growability scores 78/100 on this atlas, with Coffee (world-class), Tropical fruit, and Citrus named as strong fits and extra effort earmarked for Dry-land crops, and a tradeoff score of 34/100 keeps this comparatively low-friction next to other atlas entries, though that is a relative read, not a guarantee.",
        "Xalapa's numbers break down like this: For relocation, this entry is tagged toward mist lovers, coffee growers, and Mexican-highland expats, an editorial read rather than a census category, and on the travel side, the draw is cloud-forest hikes, coffee tours, and Instituto de Ecología. Housing pressure reads 53/100, a middling, not-cheap-not-brutal read within its country comparison set; 38/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Comfort (74/100) and resilience (58/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Microclimate uniqueness (86/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "san-miguel-de-allende-mx": [
    {
      id: "san-miguel-de-allende-mx-terrain-mechanism",
      title: "Elevation, airflow, and the Cwb/BSk transition classification here",
      paragraphs: [
        "San Miguel de Allende's climate comes down to two inputs above all: elevation (1910 m) and the combination of elevation lapse rate, continental extremity, and monsoon convective lift. Together they land the record in the Cwb/BSk transition bracket, a subtropical highland regime where elevation trims the heat out of an otherwise subtropical latitude, and sustain a highland oak-grassland / semiarid scrub that marks this out from typical Guanajuato conditions as a eternal-spring highland.",
        "For San Miguel de Allende, the record works out as follows: Hardiness zone 9b/10a and roughly 363 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 30°C at the May peak, dropping to 23°C once Jan sets in. The coldest nights of the year, near 5°C, cluster around Jan. Precipitation peaks in Jul at 106 mm and thins out to 4 mm by Dec. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation.",
      ],
    },
    {
      id: "san-miguel-de-allende-mx-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "San Miguel de Allende's numbers break down like this: Growability scores 68/100 on this atlas, with Olive, Pomegranate, and Herbs named as strong fits and extra effort earmarked for Water-intensive tropical crops. Volcanic loam to clay loam drains good at pH 6.6–7.8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with drought running elevated and worsening under current warming, wildfire running moderate and worsening under current warming, and flood running moderate and worsening under current warming. On balance, a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "San Miguel de Allende is worth walking through in order: At 70/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. Housing pressure reads 77/100, firmly on the expensive side within its country comparison set; access remoteness reads 36/100, workable, but not a place to assume same-day specialty care. The relocation tags attached here, remote workers, artists, and highland-climate seekers, are editorial shorthand, not demographic data, and travelers tend to show up for colonial architecture, highland festivals, and walkable mild-weather city breaks.",
      ],
    },
  ],
  "cuatrocienegas-mx": [
    {
      id: "cuatrocienegas-mx-terrain-mechanism",
      title: "Terrain, karst infiltration, and the BSh record",
      paragraphs: [
        "Few places in Coahuila pair 740 m of elevation with the combination of karst infiltration, rain shadow, and continental extremity the way Cuatro Ciénegas Basin does, and the resulting BSh classification, a transitional classification straddling two neighboring climate regimes, shows it. The Chihuahuan Desert oasis / gypsum scrub on the ground here is the biological signature of that mechanism, not a coincidence of latitude.",
        "Here is how Cuatro Ciénegas Basin actually reads: The daytime high climbs to roughly 37°C by Jun before retreating to 21°C in Jan. Jan nights are the low point, settling near 4°C. Sep is the wettest month on record at 38 mm and Feb the driest at 4 mm. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 9a, with roughly 359 frost-free days to work with each year.",
      ],
    },
    {
      id: "cuatrocienegas-mx-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Cuatro Ciénegas Basin is worth walking through in order: Calcareous alluvium with gypsum-rich patches drains good at pH 7.6–8.6, with low water holding capacity, and against that base, growability scores 44/100 on this atlas, with Date palm (irrigated), Drought-adapted fruit, and Native desert species named as strong fits and extra effort earmarked for Rainfed intensive crops. Risk diligence here starts with drought running high and worsening under current warming, extreme heat running elevated and worsening under current warming, and wildfire running low and worsening under current warming. Put together, a tradeoff score of 76/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "For Cuatro Ciénegas Basin, the record works out as follows: Comfort sits at 42/100 and resilience at 38/100 — read both alongside the risk and access figures above, not in isolation. At 60/100, housing pressure lands in the middle of its country comparison set — not cheap, not brutal; at 62/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, desert ecologists and conservation-oriented residents, are editorial shorthand, not demographic data, while visitors mostly come for oasis springs, gypsum dunes, and desert biodiversity expeditions. It is the microclimate-uniqueness figure, 96/100, that justifies this entry's place in the atlas, independent of the comfort score.",
      ],
    },
  ],
  "parras-de-la-fuente-mx": [
    {
      id: "parras-de-la-fuente-mx-terrain-mechanism",
      title: "The mechanism behind Parras Valley's microclimate",
      paragraphs: [
        "Parras Valley carries the BSh code for a specific reason: a transitional classification straddling two neighboring climate regimes. Sitting at 1520 m and shaped by the combination of rain shadow, elevation lapse rate, and continental extremity, the site supports a semiarid highland scrub / vineyard oasis that reads as a high-desert escape within Coahuila, a local exception the regional climate summary alone would not predict.",
        "Parras Valley is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 32°C in Jun and fall back to 20°C by Jan, and overnight lows bottom out around 4°C in Jan. The wet season centers on Sep (61 mm), with Dec the driest stretch at 5 mm. With a hardiness rating of 9a/9b and about 357 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "parras-de-la-fuente-mx-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Parras Valley",
      paragraphs: [
        "Here is how Parras Valley actually reads: Risk diligence here starts with drought running high and worsening under current warming, extreme heat running moderate and worsening under current warming, and wildfire running low and worsening under current warming. Calcareous sandy loam and alluvial fans drains good at pH 7.2–8.3, with low water holding capacity. Growability scores 62/100 on this atlas, with Wine grapes (Cabernet, Merlot, Tempranillo), Olive, and Pomegranate named as strong fits and extra effort earmarked for Water-intensive annuals, and a tradeoff score of 58/100 means the compromises are real but manageable for a household that plans around them.",
        "Parras Valley's numbers break down like this: The relocation tags attached here, wine-industry professionals and dry-climate growers, are editorial shorthand, not demographic data, and on the travel side, the draw is historic wineries and high-desert valley food-and-wine routes. Housing pressure reads 65/100, firmly on the expensive side within its country comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Two more figures round this out: comfort at 58/100 and resilience at 46/100, neither meant to be read apart from the risk and access numbers above. Microclimate uniqueness (80/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "toluca-mx": [
    {
      id: "toluca-mx-terrain-mechanism",
      title: "Elevation, airflow, and the Cwb classification here",
      paragraphs: [
        "Toluca (Highest Major Mexican City) sits at 2663 m in Estado de México, a position where the combination of elevation lapse rate, cold-air drainage, and temperature inversion does most of the work in setting the local climate apart from its surroundings. The station record files under the Cwb code, a subtropical highland regime where elevation trims the heat out of an otherwise subtropical latitude, layered onto a pine-fir montane on volcanic ash landscape. That pairing of mechanism and biome is the basis for calling this a Volcanic Upland on this atlas rather than an unremarkable Estado de México waypoint.",
        "For Toluca, the record works out as follows: Plants here live inside hardiness zone 9b, with roughly 346 frost-free days to work with each year. Expect afternoons near 25°C at the May peak, dropping to 20°C once Dec sets in. The coldest nights of the year, near 2°C, cluster around Jan. Precipitation peaks in Jul at 175 mm and thins out to 4 mm by Dec. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "toluca-mx-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Toluca's numbers break down like this: Growability scores 58/100 on this atlas, with Maize, Potatoes, and Oats named as strong fits and extra effort earmarked for Heat-loving crops and Frost-tender perennials in open valleys. Volcanic andisol, deep drains good at pH 5.6–6.8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with smoke and wildfire-season air quality running elevated (Basin traps urban emissions and regional smoke; frequent PM2.5 peaks) and worsening under current warming, wildfire running moderate and worsening under current warming, and flood running moderate and worsening under current warming. On balance, a tradeoff score of 46/100 means the compromises are real but manageable for a household that plans around them.",
        "Toluca is worth walking through in order: It is the microclimate-uniqueness figure, 74/100, that justifies this entry's place in the atlas, independent of the comfort score. At 100/100, housing pressure here sits well toward the expensive end of its country comparison set; at 62/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. On the relocation side, the tags here run to altitude-loving urbanites — editorial shorthand, not demographic data, and visitors mostly come for Nevado de Toluca hiking, colonial architecture, and traditional markets.",
      ],
    },
  ],
  "monterrey-mx": [
    {
      id: "monterrey-mx-terrain-mechanism",
      title: "Terrain, monsoon convective lift, and the BSh record",
      paragraphs: [
        "At 540 m, Monterrey (Sierra Madre Foothills) owes its BSh classification, a transitional classification straddling two neighboring climate regimes, to the combination of monsoon convective lift, continental extremity, elevation lapse rate, and temperature inversion rather than to latitude alone. Nuevo León covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a tamaulipan thornscrub and urban heat island setting that behaves more like a monsoon-edge zone than like the regional norm.",
        "Here is how Monterrey actually reads: The daytime high climbs to roughly 36°C by Aug before retreating to 22°C in Jan. Jan nights are the low point, settling near 7°C. Sep is the wettest month on record at 141 mm and Dec the driest at 7 mm. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 10a and roughly 361 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "monterrey-mx-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Monterrey is worth walking through in order: Alluvium and limestone residuum drains good at pH 7–8.2, with low water holding capacity, and against that base, growability scores 58/100 on this atlas, with Citrus (protected), Agave, and Xeriscape natives named as strong fits and extra effort earmarked for Cool-climate fruit. Risk diligence here starts with extreme heat running high and worsening under current warming, flood running elevated and worsening under current warming, and drought running elevated and worsening under current warming. Put together, a tradeoff score of 56/100 means the compromises are real but manageable for a household that plans around them.",
        "For Monterrey, the record works out as follows: Comfort sits at 52/100 and resilience at 44/100 — read both alongside the risk and access figures above, not in isolation. 95/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward manufacturing and startup scene, an editorial read rather than a census category, while travelers tend to show up for Chipinque and Cola de Caballo. At 64/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "hermosillo-mx": [
    {
      id: "hermosillo-mx-terrain-mechanism",
      title: "Elevation, airflow, and the BWh classification here",
      paragraphs: [
        "Hermosillo (Sonoran Desert)'s climate comes down to two inputs above all: elevation (200 m) and the combination of continental extremity, monsoon convective lift, and slope / aspect. Together they land the record in the BWh bracket, a transitional classification straddling two neighboring climate regimes, and sustain a desert scrub and irrigated agriculture that marks this out from typical Sonora conditions as a tropical wet-dry.",
        "For Hermosillo, the record works out as follows: Hardiness zone 10b and roughly 362 frost-free days a year set the outer edges of what will survive here. Expect afternoons near 40°C at the Jun peak, dropping to 25°C once Dec sets in. The coldest nights of the year, near 7°C, cluster around Jan. Precipitation peaks in Aug at 84 mm and thins out to 1 mm by May. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation.",
      ],
    },
    {
      id: "hermosillo-mx-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Hermosillo's numbers break down like this: Growability scores 40/100 on this atlas, with Date palm, Citrus with irrigation, and Vegetables under drip named as strong fits and extra effort earmarked for Dry farming. Desert alluvium and sand drains excessive at pH 7.5–8.5, with low water holding capacity, which explains part of that number. Risk diligence here starts with extreme heat running very high and worsening under current warming, drought running high and worsening under current warming, and wildfire running moderate and worsening under current warming. On balance, a tradeoff score of 72/100 signals this is not a low-friction pick, so weigh the risk list above against the reward before committing money or a move.",
        "Hermosillo is worth walking through in order: At 62/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day. 93/100 on housing pressure puts this on the costly side of its national comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. For relocation, this entry is tagged toward desert-industry workers, an editorial read rather than a census category, and travelers tend to show up for Bahía de Kino day trips and desert ecotours.",
      ],
    },
  ],
  "puerto-vallarta-mx": [
    {
      id: "puerto-vallarta-mx-terrain-mechanism",
      title: "Terrain, diurnal sea breeze, and the Aw record",
      paragraphs: [
        "Puerto Vallarta (Banderas Bay) carries the Aw code for a specific reason: a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch. Sitting at 10 m and shaped by the combination of diurnal sea breeze, tropical-cyclone exposure, and orographic lift, the site supports a tropical dry forest transitioning to humid tropical near shore that reads as a tropical isothermal coast within Jalisco, a local exception the regional climate summary alone would not predict.",
        "Here is how Puerto Vallarta actually reads: The daytime high climbs to roughly 34°C by Jun before retreating to 30°C in Jan. Jan nights are the low point, settling near 15°C. Jul is the wettest month on record at 263 mm and Mar the driest at 4 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Plants here live inside hardiness zone 11, with roughly 365 frost-free days to work with each year.",
      ],
    },
    {
      id: "puerto-vallarta-mx-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Puerto Vallarta is worth walking through in order: Coastal sand and tropical alfisol drains good at pH 6–7.5, with moderate water holding capacity, and against that base, growability scores 72/100 on this atlas, with Coconut, Tropical ornamentals, and Chile peppers named as strong fits and extra effort earmarked for Temperate bulbs. Risk diligence here starts with severe storms running very high and worsening under current warming, coastal surge running very high and worsening under current warming, and flood running elevated and worsening under current warming. Put together, a tradeoff score of 52/100 means the compromises are real but manageable for a household that plans around them.",
        "For Puerto Vallarta, the record works out as follows: Comfort sits at 62/100 and resilience at 36/100 — read both alongside the risk and access figures above, not in isolation. Housing pressure reads 84/100, firmly on the expensive side within its country comparison set; at 62/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. The relocation tags attached here, hospitality retirees and remote workers, are editorial shorthand, not demographic data, while on the travel side, the draw is whale watching and beaches. Microclimate uniqueness (58/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "mazatlan-mx": [
    {
      id: "mazatlan-mx-terrain-mechanism",
      title: "Why Mazatlán reads as a Tropical Wet-Dry",
      paragraphs: [
        "Mazatlán (Pacific Humid Tropical)'s climate comes down to two inputs above all: elevation (5 m) and the combination of tropical convective regime, tropical-cyclone exposure, and diurnal sea breeze. Together they land the record in the Aw bracket, a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch, and sustain a tropical savanna and coastal mangrove margin that marks this out from typical Sinaloa conditions as a tropical wet-dry.",
        "Mazatlán's numbers break down like this: Plan around a Sep peak of 173 mm and a Apr low of 1 mm. Jul carries the year's warmest afternoons, near 35°C, well above the 28°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 13°C. Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Hardiness zone 11 and roughly 365 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "mazatlan-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Mazatlán, the record works out as follows: Risk diligence here starts with severe storms running very high and worsening under current warming, coastal surge running very high and worsening under current warming, and flood running elevated and worsening under current warming. On the ground, sandy beach and dune drains excessive at pH 7–8, with low water holding capacity. Growability scores 68/100 on this atlas, with Palms and Tropical fruit with irrigation named as strong fits and extra effort earmarked for Cool-season vegetables in summer, and a tradeoff score of 50/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Mazatlán actually reads: 40/100 on housing pressure is a mid-pack figure against its national comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. On the relocation side, the tags here run to retirees and fishing industry — editorial shorthand, not demographic data, while travelers tend to show up for historic centro and carnival. Two more figures round this out: comfort at 58/100 and resilience at 38/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "campeche-mx": [
    {
      id: "campeche-mx-terrain-mechanism",
      title: "Why Campeche reads as a Hurricane-Exposed Coast",
      paragraphs: [
        "Campeche (Gulf Coast Fort) sits at 5 m in Campeche, a position where the combination of tropical-cyclone exposure, tropical convective regime, and diurnal sea breeze does most of the work in setting the local climate apart from its surroundings. The station record files under the Aw code, a tropical wet-dry savanna calendar built around one long rainy season set against a hard dry stretch, layered onto a tropical moist forest margin and mangrove landscape. That pairing of mechanism and biome is the basis for calling this a Hurricane-Exposed Coast on this atlas rather than an unremarkable Campeche waypoint.",
        "Campeche's numbers break down like this: Plan around a Jun peak of 213 mm and a Mar low of 4 mm. May carries the year's warmest afternoons, near 36°C, well above the 30°C daytime high typical of Dec, while after dark, Jan is as cold as the record gets, near 18°C. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 11 and about 365 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "campeche-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Campeche, the record works out as follows: Risk diligence here starts with severe storms running very high and worsening under current warming, coastal surge running very high and worsening under current warming, and flood running high and worsening under current warming. On the ground, coastal alluvium and limestone drains imperfect at pH 7–8.2, with high water holding capacity. Growability scores 70/100 on this atlas, with Coconut, Citrus, and Chile named as strong fits and extra effort earmarked for Cool-climate perennials, and a tradeoff score of 56/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Campeche actually reads: 88/100 on housing pressure puts this on the costly side of its national comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. For relocation, this entry is tagged toward remote workers and history buffs, an editorial read rather than a census category, while on the travel side, the draw is fort walls and Gulf beaches. Two more figures round this out: comfort at 54/100 and resilience at 34/100, neither meant to be read apart from the risk and access numbers above.",
      ],
    },
  ],
  "palenque-mx": [
    {
      id: "palenque-mx-terrain-mechanism",
      title: "Terrain, tropical convective regime, and the Af record",
      paragraphs: [
        "Palenque (Lacandon Jungle Edge) carries the Af code for a specific reason: a tropical, no-dry-season regime that stays warm and wet in every month. Sitting at 150 m and shaped by the combination of tropical convective regime, orographic lift, and monsoon convective lift, the site supports a tropical moist forest that reads as a cloud forest within Chiapas, a local exception the regional climate summary alone would not predict.",
        "Here is how Palenque actually reads: The daytime high climbs to roughly 35°C by May before retreating to 29°C in Dec. Jan nights are the low point, settling near 18°C. Sep is the wettest month on record at 329 mm and Mar the driest at 36 mm. These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. With a hardiness rating of 12 and about 365 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "palenque-mx-risk-and-ground-truth",
      title: "What the risk matrix and growability score actually say",
      paragraphs: [
        "Palenque is worth walking through in order: Deep tropical alfisol drains moderate at pH 5.5–6.8, with high water holding capacity, and against that base, growability scores 76/100 on this atlas, with Cacao, Banana, and Tropical spices named as strong fits and extra effort earmarked for Temperate fruit. Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and landslide or debris-flow running elevated and worsening under current warming. Put together, a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "For Palenque, the record works out as follows: Comfort (48/100) and resilience (48/100) round out the honest picture: neither number should be read in isolation from the risk and access figures above. Housing pressure reads 44/100, a middling, not-cheap-not-brutal read within its country comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. The relocation tags attached here, archaeology guides and ecotourism, are editorial shorthand, not demographic data, while on the travel side, the draw is ruins and jungle trails. Microclimate uniqueness (72/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "taxco-mx": [
    {
      id: "taxco-mx-terrain-mechanism",
      title: "The mechanism behind Taxco's microclimate",
      paragraphs: [
        "Taxco (Sierra Madre del Sur) carries the Cwb code for a specific reason: a subtropical highland regime where elevation trims the heat out of an otherwise subtropical latitude. Sitting at 1773 m and shaped by the combination of elevation lapse rate, slope / aspect, orographic lift, and karst infiltration, the site supports a oak–pine forest and scrub that reads as a eternal-spring highland within Guerrero, a local exception the regional climate summary alone would not predict.",
        "Taxco is worth walking through in order: Snowpack barely registers in the monthly record; winter is driven by temperature and rainfall rather than accumulation. Afternoon highs peak near 31°C in May and fall back to 26°C by Dec, and overnight lows bottom out around 10°C in Jan. The wet season centers on Aug (211 mm), with Jan the driest stretch at 2 mm. Hardiness zone 10a and roughly 365 frost-free days a year set the outer edges of what will survive here.",
      ],
    },
    {
      id: "taxco-mx-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Taxco",
      paragraphs: [
        "Here is how Taxco actually reads: Risk diligence here starts with landslide or debris-flow running high and worsening under current warming, flood running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Thin residual soil on volcanic and limestone drains good at pH 6–7.5, with low water holding capacity. Growability scores 64/100 on this atlas, with Temperate flowers, Avocado, and Coffee nearby named as strong fits and extra effort earmarked for Low-oxygen exertion for some visitors, and a tradeoff score of 42/100 means the compromises are real but manageable for a household that plans around them.",
        "Taxco's numbers break down like this: The relocation tags attached here, artisans and retirees, are editorial shorthand, not demographic data, and travelers tend to show up for silver markets and cobblestone walks. Housing pressure reads 86/100, firmly on the expensive side within its country comparison set; access remoteness reads 62/100, workable, but not a place to assume same-day specialty care. Comfort sits at 72/100 and resilience at 50/100 — read both alongside the risk and access figures above, not in isolation. At 74/100, microclimate uniqueness is the real reason this entry is here, separate from how comfortable the climate feels day to day.",
      ],
    },
  ],
  "puebla-mx": [
    {
      id: "puebla-mx-terrain-mechanism",
      title: "The mechanism behind Puebla's microclimate",
      paragraphs: [
        "At 2150 m, Puebla (Trans-Mexican Volcanic Belt) owes its Cwb classification, a subtropical highland regime where elevation trims the heat out of an otherwise subtropical latitude, to the combination of elevation lapse rate, temperature inversion, and slope / aspect rather than to latitude alone. Puebla covers a wide range of conditions, but the specific interaction of terrain and airflow here produces a highland oak–pine and montane agriculture setting that behaves more like a volcanic upland than like the regional norm.",
        "Puebla is worth walking through in order: These normals show little to no snow — the cold season here is defined by temperature, not by a snowpack calendar. Afternoon highs peak near 28°C in May and fall back to 23°C by Dec, and overnight lows bottom out around 5°C in Jan. The wet season centers on Sep (177 mm), with Dec the driest stretch at 4 mm. With a hardiness rating of 10a and about 364 frost-free days annually, the growing calendar has firm limits.",
      ],
    },
    {
      id: "puebla-mx-risk-and-ground-truth",
      title: "Homes, land, and long-term fit at Puebla",
      paragraphs: [
        "Here is how Puebla actually reads: Risk diligence here starts with flood running elevated and worsening under current warming, smoke and wildfire-season air quality running elevated and worsening under current warming, and severe storms running elevated and worsening under current warming. Andisol on volcanic ash drains good at pH 6–7.2, with moderate water holding capacity. Growability scores 72/100 on this atlas, with Maize, Flowers, and Avocado named as strong fits and extra effort earmarked for Chill apples, and a tradeoff score of 48/100 means the compromises are real but manageable for a household that plans around them.",
        "Puebla's numbers break down like this: The relocation tags attached here, students and manufacturing, are editorial shorthand, not demographic data, and on the travel side, the draw is Talavera and volcano viewpoints. Housing pressure reads 98/100, firmly on the expensive side within its country comparison set; 62/100 on access remoteness is workable day to day, though same-day specialty care is not a safe assumption. Comfort sits at 66/100 and resilience at 44/100 — read both alongside the risk and access figures above, not in isolation. Microclimate uniqueness (68/100) is what earns this entry a place in the atlas at all, apart from any raw comfort score.",
      ],
    },
  ],
  "durango-mx": [
    {
      id: "durango-mx-terrain-mechanism",
      title: "Elevation, airflow, and the BSk/Cwb transition classification here",
      paragraphs: [
        "The case for treating Durango as a distinct entry rather than folding it into the rest of Durango starts with elevation: 1880 m, acted on by the combination of monsoon convective lift, elevation lapse rate, continental extremity, and temperature inversion. Together those two facts push the climate record toward BSk/Cwb transition, a transitional classification straddling two neighboring climate regimes, and support a highland semiarid grassland and pine-oak transition plant community that would not persist under the region's default conditions.",
        "For Durango, the record works out as follows: Plants here live inside hardiness zone 9b equiv., with roughly 348 frost-free days to work with each year. Expect afternoons near 31°C at the May peak, dropping to 22°C once Jan sets in. The coldest nights of the year, near 2°C, cluster around Jan. Precipitation peaks in Jul at 108 mm and thins out to 2 mm by Apr. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack.",
      ],
    },
    {
      id: "durango-mx-risk-and-ground-truth",
      title: "Risk, soil, and growability — the honest ledger",
      paragraphs: [
        "Durango's numbers break down like this: Growability scores 66/100 on this atlas, with Beans, Maize, and Apples in nearby highlands named as strong fits and extra effort earmarked for Tropical fruit and Humid-climate crops. Alluvial clay loam and volcanic-influenced upland soils drains moderate at pH 6.8–8, with moderate water holding capacity, which explains part of that number. Risk diligence here starts with drought running elevated and worsening under current warming, wildfire running moderate and worsening under current warming, and flood running moderate and worsening under current warming. On balance, a tradeoff score of 44/100 means the compromises are real but manageable for a household that plans around them.",
        "Durango is worth walking through in order: It is the microclimate-uniqueness figure, 66/100, that justifies this entry's place in the atlas, independent of the comfort score. 91/100 on housing pressure puts this on the costly side of its national comparison set; at 62/100, access remoteness sits at a level where routine trips are fine but specialty care takes planning. For relocation, this entry is tagged toward dry-climate seekers and regional professionals, an editorial read rather than a census category, and visitors mostly come for Sierra Madre road trips and historic center.",
      ],
    },
  ],
  "orizaba-mx": [
    {
      id: "orizaba-mx-terrain-mechanism",
      title: "Why Orizaba reads as a Cloud Forest",
      paragraphs: [
        "Orizaba sits at 1230 m in Veracruz, a position where the combination of orographic lift, elevation lapse rate, and tropical convective regime does most of the work in setting the local climate apart from its surroundings. The station record files under the Cfb/Cwb transition code, an oceanic regime with a narrow year-round temperature band and rain distributed across every month, layered onto a montane cloud forest and coffee-citrus transition landscape. That pairing of mechanism and biome is the basis for calling this a Cloud Forest on this atlas rather than an unremarkable Veracruz waypoint.",
        "Orizaba's numbers break down like this: Plan around a Sep peak of 267 mm and a Feb low of 21 mm. May carries the year's warmest afternoons, near 30°C, well above the 24°C daytime high typical of Jan, while after dark, Jan is as cold as the record gets, near 10°C. Snow is a minor or absent factor in these normals — winter here is a story of temperature and rain, not snowpack. Plants here live inside hardiness zone 10b equiv., with roughly 365 frost-free days to work with each year.",
      ],
    },
    {
      id: "orizaba-mx-risk-and-ground-truth",
      title: "Housing, access, and who this place actually fits",
      paragraphs: [
        "For Orizaba, the record works out as follows: Risk diligence here starts with flood running elevated and worsening under current warming, severe storms running elevated and worsening under current warming, and landslide or debris-flow running elevated and worsening under current warming. On the ground, volcanic and alluvial loam on humid mountain slopes drains moderate at pH 5.5–6.8, with high water holding capacity. Growability scores 78/100 on this atlas, with Coffee, Citrus, and Avocado named as strong fits and extra effort earmarked for Dryland crops and High-chill fruit, and a tradeoff score of 40/100 means the compromises are real but manageable for a household that plans around them.",
        "Here is how Orizaba actually reads: At 7/100, housing pressure runs low next to its country comparison set, even with a thin service base; at 30/100, access remoteness is low — larger service hubs stay within easy reach. The relocation tags attached here, cloud-forest lovers and coffee people, are editorial shorthand, not demographic data, while visitors mostly come for Pico de Orizaba views and green highland walks. Comfort sits at 72/100 and resilience at 56/100 — read both alongside the risk and access figures above, not in isolation.",
      ],
    },
  ],
};
