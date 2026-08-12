/**
 * Curated Wikimedia Commons photography for place profiles.
 * URLs resolve via Special:FilePath → CDN; open the Commons file page for attribution.
 */

export type PlaceHeroMedia = {
  src: string;
  srcSet: string;
  sizes: string;
  alt: string;
  creditLine: string;
  sourceUrl: string;
};

const CREDIT =
  "Photo: Wikimedia Commons. Open the file page for photographer and license.";

function commonsFile(file: string, width = 1280): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

function commonsFilePage(file: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;
}

function commonsSrcSet(file: string): string {
  return [640, 960, 1280]
    .map(width => `${commonsFile(file, width)} ${width}w`)
    .join(", ");
}

/** place.id → Commons filename. Landscape-first; file-page credit only. */
const HERO_BY_PLACE_ID: Record<string, { file: string; alt: string }> = {
  "sequim-wa": {
    file: "John Wayne Marina - Sequim Washington.jpg",
    alt: "Sequim's John Wayne Marina on the dry Olympic rain-shadow shore",
  },
  "monterey-ca": {
    file: "Pacific Grove Coastline, Monterey, CA, jjron 24.03.2012.jpg",
    alt: "Rocky Monterey Peninsula shoreline and cool Pacific water",
  },
  "black-mountain-nc": {
    file: "Black Mountain, North Carolina.jpg",
    alt: "Black Mountain town and wooded Blue Ridge foothills in North Carolina",
  },
  "hood-river-or": {
    file: "Columbia Gorge Hotel - Hood River Oregon.jpg",
    alt: "Hood River's Columbia Gorge setting above the river and orchard country",
  },
  "santa-barbara-ca": {
    file: "Santa Barbara 2012 7.jpg",
    alt: "Santa Barbara's coastal cityscape beneath the Santa Ynez Mountains",
  },
  "port-townsend-wa": {
    file: "Adventuress Schooner Port Townsend Marina , Washington State.jpg",
    alt: "Port Townsend marina and wooden-boat waterfront on the Olympic rain shadow edge",
  },
  "tucson-az": {
    file: "Saguaro_National_Park,_Tucson.jpg",
    alt: "Saguaro cacti and Sonoran Desert hills near Tucson",
  },
  "portal-az": {
    file: "Chiricahua_National_Monument.jpg",
    alt: "Chiricahua highlands rock formations near the Arizona–New Mexico sky-island country",
  },
  "flagstaff-az": {
    file: "Sunset_Crater.jpg",
    alt: "Volcanic cinder cone and ponderosa country near Flagstaff",
  },
  "sedona-az": { file: "Sedona_Arizona.jpg", alt: "Red rock cliffs and juniper–pine country around Sedona" },
  "santa-fe-nm": { file: "Santa_Fe_Plaza.jpg", alt: "Adobe architecture and plaza light in Santa Fe" },
  "taos-nm": { file: "Taos_Pueblo.jpg", alt: "Multi-story adobe buildings at Taos Pueblo beneath the Sangre de Cristo" },
  "marfa-tx": { file: "Marfa_courthouse.jpg", alt: "Presidio County Courthouse and high-desert sky over Marfa" },
  "key-west-fl": {
    file: "Seven_Mile_Bridge.jpg",
    alt: "Overseas highway bridge and turquoise Gulf water in the Florida Keys",
  },
  "charleston-sc": {
    file: "Rainbow_Row_Charleston.jpg",
    alt: "Pastel historic houses along Rainbow Row in Charleston",
  },
  "banff-ab": { file: "Moraine_Lake_17092005.jpg", alt: "Turquoise moraine lake and Rocky peaks in Banff National Park" },
  "victoria-bc": {
    file: "View from Malahat lookout 1.jpg",
    alt: "Southern Vancouver Island water and hills near Victoria's rain-shadow coast",
  },
  "qualicum-bc": {
    file: "Qualicum Beach, British Columbia - panoramio.jpg",
    alt: "Qualicum Beach shoreline on Vancouver Island's drier east side",
  },
  "oaxaca-mx": { file: "Oaxaca_de_Juarez.jpg", alt: "Colonial streets and mountains framing Oaxaca de Juárez" },
  "merida-mx": {
    file: "Uxmal_Pyramid_of_the_Magician.jpg",
    alt: "Maya lowlands near Mérida — tropical heat broken by Gulf breezes and limestone country",
  },
  "guanajuato-mx": { file: "Guanajuato_City.jpg", alt: "Colourful hillside lanes and churches in Guanajuato" },
  "san-miguel-de-allende-mx": {
    file: "Parroquia_de_San_Miguel_Arcangel,_San_Miguel_de_Allende.jpg",
    alt: "Parroquia towers rising above San Miguel de Allende",
  },
  "bacalar-mx": { file: "Laguna_de_Bacalar.jpg", alt: "Laguna de Bacalar’s clear water and shoreline jungle" },
  "puerto-vallarta-mx": {
    file: "Puerto_Vallarta_beach.jpg",
    alt: "Bay, beach, and Sierra Madre backdrop at Puerto Vallarta",
  },

  "osoyoos-bc": {
    file: "Osoyoos Lake.jpg",
    alt: "Osoyoos Lake in the dry South Okanagan pocket-desert valley",
  },
  "lethbridge-ab": {
    file: "Lethbridge High Level Bridge (2335895049).jpg",
    alt: "High Level Bridge spanning the Oldman River coulee at Lethbridge",
  },
  "tofino-bc": {
    file: "Long beach Tofino Ucluelet British Columbia Canada 2.jpg",
    alt: "Pacific swell and driftwood beach on the Tofino–Ucluelet outer coast",
  },
  "tofino-ucluelet-corridor": {
    file: "Long beach Tofino Ucluelet British Columbia Canada 2.jpg",
    alt: "Long Beach sand and surf between Tofino and Ucluelet",
  },
  "wolfville-ns": {
    file: "Wolfville, Nova Scotia (22131661151).jpg",
    alt: "Wolfville street and Annapolis Valley hills in Nova Scotia",
  },
  "niagara-on-the-lake": {
    file: "Niagara-on-the-Lake.JPG",
    alt: "Niagara-on-the-Lake street trees and lake-plain townscape",
  },
  "atlin-lake-bc": {
    file: "ATLIN, BRITISH COLUMBIA.jpg",
    alt: "Atlin settlement beside the long glacial lake in northwestern British Columbia",
  },
  "fernie-elk-valley-bc": {
    file: "Three Sisters from Police Creek.jpg",
    alt: "Fernie's Three Sisters peaks rising above the Elk Valley",
  },
  "sunshine-coast-bc": {
    file: "Sechelt Inlet, 1974 02.jpg",
    alt: "Sechelt Inlet forest and water on British Columbia's Sunshine Coast",
  },
  "salt-spring-bc": {
    file: "Saltspring Island.jpg",
    alt: "Salt Spring Island shoreline and Gulf Islands light",
  },
  "summerland-bc": {
    file: "Lake Okanagan - Summerland - panoramio.jpg",
    alt: "Okanagan Lake benches and orchards at Summerland",
  },
  "grand-manan-nb": {
    file: "Grand Manan - northeast shore.jpg",
    alt: "Cliffs and Fundy water on Grand Manan's northeast shore",
  },
  "creston-bc": {
    file: "Creston Valley 1996 01.jpg",
    alt: "Creston Valley farmland and surrounding Kootenay ranges",
  },
  "penticton-bc": {
    file: "Penticton British Columbia.jpg",
    alt: "Penticton between Okanagan lakes in the South Okanagan trench",
  },
  "kamloops-bc": {
    file: "Kamloops.jpg",
    alt: "Kamloops at the Thompson River confluence in dry interior British Columbia",
  },
  "nelson-bc": {
    file: "Kootenay-Lake Nelson-BC.jpg",
    alt: "Nelson above Kootenay Lake in the West Kootenay ranges",
  },
  "revelstoke-bc": {
    file: "Revelstoke.jpg",
    alt: "Revelstoke in the Columbia Mountains snow belt",
  },
  "prince-rupert-bc": {
    file: "Prince Rupert.jpg",
    alt: "Prince Rupert harbour on the very wet North Coast",
  },
  "st-johns-nl": {
    file: "St. John's Newfoundland.jpg",
    alt: "St. John's harbour and steep streets on the Avalon Peninsula",
  },
  "whitehorse-yt": {
    file: "Yukon River at Whitehorse -b.jpg",
    alt: "Yukon River corridor through Whitehorse in the rain-shadow interior",
  },
  "yellowknife-nt": {
    file: "Yellowknife.jpg",
    alt: "Yellowknife on the Canadian Shield shore of Great Slave Lake",
  },
  "churchill-mb": {
    file: "Polar Bears - Churchill, Manitoba (39489485710).jpg",
    alt: "Hudson Bay tundra and polar-bear country near Churchill",
  },
  "iqaluit-nu": {
    file: "Iqaluit, Nunavut.jpg",
    alt: "Iqaluit waterfront on Frobisher Bay in the eastern Arctic",
  },
  "haida-gwaii-bc": {
    file: "Totem pole ruins in Haida Gwaii.jpg",
    alt: "Coastal forest and Haida pole remnants on Haida Gwaii",
  },
  "kelowna-bc": {
    file: "Kelowna.jpg",
    alt: "Kelowna along Okanagan Lake in the central valley trench",
  },
  "squamish-bc": {
    file: "Stawamus Chief.jpg",
    alt: "Stawamus Chief granite wall above Howe Sound at Squamish",
  },
  "halifax-ns": {
    file: "2022-08-15 01 Wide angle view of Halifax skyline, Nova Scotia, Canada.jpg",
    alt: "Halifax skyline across the harbour on Nova Scotia's Atlantic coast",
  },
  "charlottetown-pei": {
    file: "Charlottetown.jpg",
    alt: "Charlottetown waterfront on Prince Edward Island",
  },
  "dawson-city-yt": {
    file: "Dawson City.jpg",
    alt: "Dawson City at the Yukon–Klondike confluence under northern hills",
  },
  "baie-saint-paul-qc": {
    file: "Baie-Saint-Paul.jpg",
    alt: "Baie-Saint-Paul in the Charlevoix hills above the St. Lawrence",
  },
  "twillingate-nl": {
    file: "Twillingate.jpg",
    alt: "Twillingate harbour on Newfoundland's iceberg coast",
  },
  "sutton-qc": {
    file: "Sutton, Quebec-1.JPG",
    alt: "Sutton village and Eastern Townships hills in southern Québec",
  },
  "morden-mb": {
    file: "Morden Manitoba Canada.JPG",
    alt: "Morden on the Pembina Escarpment in southern Manitoba",
  },
  "pincher-creek-ab": {
    file: "Pincher Creek in Pincher Creek AB.jpg",
    alt: "Pincher Creek in chinook country beneath the southern Alberta Rockies",
  },
  "thunder-bay-on": {
    file: "Sleeping Giant (as seen from Thunder Bay Lookout) (I0015350).jpg",
    alt: "Sleeping Giant peninsula across Thunder Bay on Lake Superior",
  },
  "gaspe-qc": {
    file: "Rocher Percé – Percé, QC – (2018-07-19).jpg",
    alt: "Percé Rock at the Gaspé Peninsula tip in the Gulf of St. Lawrence",
  },

  "san-cristobal-mx": {
    file: "San Cristobal de las Casas.jpg",
    alt: "San Cristóbal de las Casas highland streets in Chiapas",
  },
  "cuernavaca-mx": {
    file: "Cuernavaca.jpg",
    alt: "Cuernavaca on the warm slope below the Valley of Mexico",
  },
  "valle-de-bravo-mx": {
    file: "Valle de Bravo.jpg",
    alt: "Valle de Bravo town and pine slopes above Lake Avándaro",
  },
  "morelia-mx": {
    file: "Morelia.jpg",
    alt: "Morelia's colonial core on the Michoacán highland",
  },
  "zacatecas-mx": {
    file: "Zacatecas.jpg",
    alt: "Zacatecas hillside city in the cool northern Mexican highlands",
  },
  "la-paz-mx": {
    file: "La Paz BCS.jpg",
    alt: "La Paz on the Sea of Cortez in Baja California Sur",
  },
  "puerto-escondido-mx": {
    file: "Playa de puerto escondido mexico.jpg",
    alt: "Pacific surf and sand at Puerto Escondido, Oaxaca",
  },
  "palenque-mx": {
    file: "Palenque.jpg",
    alt: "Palenque temples at the Lacandon jungle edge in Chiapas",
  },
  "taxco-mx": {
    file: "Taxco.jpg",
    alt: "White hillside town of Taxco in the Sierra Madre del Sur",
  },
  "puebla-mx": {
    file: "Catedral de Puebla, México, 2013-10-11, DD 17.JPG",
    alt: "Puebla Cathedral on the Trans-Mexican Volcanic Belt highland",
  },
  "queretaro-mx": {
    file: "Santiago de Querétaro.jpg",
    alt: "Santiago de Querétaro's historic core on the Bajío plateau",
  },
  "ajijic-lake-chapala-mx": {
    file: "Lake Chapala.jpg",
    alt: "Lake Chapala shoreline near Ajijic in Jalisco",
  },
  "mazatlan-mx": {
    file: "Mazatlan.jpg",
    alt: "Mazatlán's Pacific waterfront on the humid tropical coast",
  },
  "campeche-mx": {
    file: "Campeche.jpg",
    alt: "Campeche's fortified Gulf-coast city on the Yucatán limestone plain",
  },
  "patzcuaro-mx": {
    file: "Lago de Pátzcuaro en Michoacán.jpg",
    alt: "Lake Pátzcuaro and surrounding Meseta Tarasca highlands",
  },
  "valle-guadalupe-mx": {
    file: "Viñedos Valle de Guadalupe B.C.jpg",
    alt: "Vineyards in Valle de Guadalupe on Baja's Mediterranean-climate coast",
  },
  "xilitla-mx": {
    file: "Las Pozas, Xilitla (7159081639).jpg",
    alt: "Las Pozas pools and cloud-forest vegetation at Xilitla",
  },
  "real-catorce-mx": {
    file: "Panorámica de Real de Catorce.jpg",
    alt: "Real de Catorce high-desert mining town in the Sierra de Catorce",
  },
  "creel-mx": {
    file: "Copper Canyon, observation deck.jpg",
    alt: "Copper Canyon rim country above Creel in the Sierra Tarahumara",
  },
  "monterrey-mx": {
    file: "Monterrey, panorámica del Cerro de la Silla (2014).jpg",
    alt: "Cerro de la Silla rising above Monterrey in Nuevo León",
  },
  "tapalpa-mx": {
    file: "Tapalpa, Jalisco..jpg",
    alt: "Tapalpa pine-plateau town in the Sierra de Tapalpa",
  },
  "alamos-mx": {
    file: "Acceso Parque la Colorada Álamos, Sonora.jpg",
    alt: "Álamos colonial town at the Sonoran monsoon edge",
  },
  "xalapa-mx": {
    file: "Parque Juárez, Xalapa - 6.jpg",
    alt: "Xalapa park and cloud-forest highland light in Veracruz",
  },
  "coatepec-mx": {
    file: "Coatepec-Ayuntamiento.jpg",
    alt: "Coatepec town hall in Veracruz coffee-cloud country",
  },

  "death-valley-ca": {
    file: "Badwater Basin.jpg",
    alt: "Badwater Basin salt flats in Death Valley's below-sea-level heat bowl",
  },
  "cannon-beach-or": {
    file: "Cannon Beach October 2019 panorama 2.jpg",
    alt: "Haystack Rock and the Oregon surf at Cannon Beach",
  },
  "new-orleans-la": {
    file: "Jackson Square New Orleans.jpg",
    alt: "Jackson Square and St. Louis Cathedral in New Orleans",
  },
  "bar-harbor-me": {
    file: "Acadia National Park.jpg",
    alt: "Acadia granite and Atlantic water near Bar Harbor",
  },
  "asheville-nc": {
    file: "Downtown Asheville.jpg",
    alt: "Downtown Asheville against the Blue Ridge front",
  },
  "boulder-co": {
    file: "Flatirons Winter Sunrise edit 2.jpg",
    alt: "Snow-dusted Flatirons above Boulder on the Front Range",
  },
  "moab-ut": {
    file: "Delicate Arch.jpg",
    alt: "Delicate Arch sandstone in the canyon country around Moab",
  },
  "jackson-wy": {
    file: "Grand Teton.jpg",
    alt: "Grand Teton rising above Jackson Hole",
  },
  "honolulu-hi": {
    file: "Waikiki Beach.jpg",
    alt: "Waikiki Beach and Diamond Head on Oʻahu's leeward shore",
  },
  "anchorage-ak": {
    file: "Anchorage.jpg",
    alt: "Anchorage against the Chugach front on Cook Inlet",
  },
  "napa-ca": {
    file: "Napa Valley.jpg",
    alt: "Napa Valley floor vineyards in California's marine-moderated wine country",
  },
  "palm-springs-ca": {
    file: "Palm Springs.jpg",
    alt: "Palm Springs against the San Jacinto escarpment in the Coachella Desert",
  },
  "austin-tx": {
    file: "Austin Texas.jpg",
    alt: "Austin on the Edwards Plateau edge of central Texas",
  },
  "savannah-ga": {
    file: "Savannah, GA - Historic District (3).jpg",
    alt: "Live oaks and historic squares in Savannah's Atlantic Bight city",
  },
  "hilo-hi": {
    file: "Hilo bay.jpg",
    alt: "Hilo Bay on the wet windward side of Hawaiʻi Island",
  },
  "sitka-ak": {
    file: "Sitka, Alaska - Sitka National Historical Park - Totem Trail (3).jpg",
    alt: "Sitka temperate-rainforest trail and totem poles on Baranof Island",
  },
  "valdez-ak": {
    file: "Valdez Alaska 1.jpg",
    alt: "Valdez harbour under steep coastal mountains in Prince William Sound",
  },
  "fairbanks-ak": {
    file: "Paisaje en el Sureste de Fairbanks, Alaska, Estados Unidos, 2017-08-28, DD 130-136 PAN.jpg",
    alt: "Interior Alaska hills and boreal forest southeast of Fairbanks",
  },
  "nome-ak": {
    file: "Nome Alaska (1).jpg",
    alt: "Nome on the Seward Peninsula looking toward the Bering Sea",
  },
  "ashland-or": {
    file: "Lithia Park Ashland November 2019 008.jpg",
    alt: "Lithia Park trees and creek in Ashland's Rogue Valley",
  },
  "prescott-az": {
    file: "Everybody's Hometown Prescott Arizona.jpg",
    alt: "Prescott courthouse plaza in Arizona's central highlands",
  },
  "missoula-mt": {
    file: "Missoula Montana 20210630.jpg",
    alt: "Missoula in the Clark Fork valley beneath western Montana ranges",
  },
  "bozeman-mt": {
    file: "Bozeman MT aerial.jpg",
    alt: "Aerial view of Bozeman on the Gallatin Valley floor",
  },
  "durango-co": {
    file: "Durango Colorado.jpg",
    alt: "Durango in the Animas River valley of southwest Colorado",
  },
  "crested-butte-co": {
    file: "Crested Butte.jpg",
    alt: "Crested Butte mountain town in the high Elk Mountains",
  },
  "leadville-co": {
    file: "Leadville CO - snow.jpg",
    alt: "Snowy Leadville, the highest incorporated city in North America",
  },
  "cody-wy": {
    file: "Cody, Wyoming.jpg",
    alt: "Cody at the eastern gateway to the Absaroka and Yellowstone country",
  },
  "cloudcroft-nm": {
    file: "Cloudcroft NM 07-04-05.jpg",
    alt: "Cloudcroft in the Sacramento Mountains above the Tularosa Basin",
  },
  "logan-ut": {
    file: "Logan Utah Banner.jpg",
    alt: "Logan beneath the Bear River Range in northern Utah",
  },
  "borrego-springs-ca": {
    file: "2017-03-11 USA, CA, Anza-Borrego DSC 1358 DxO.jpg",
    alt: "Anza-Borrego desert slopes and ocotillo country near Borrego Springs",
  },
  "hood-river-gorge": {
    file: "Columbia River Gorge from near Mosier, Oregon.jpg",
    alt: "Columbia River Gorge looking west from the Mosier benches",
  },
  "winthrop-wa": {
    file: "Winthrop Washington.jpg",
    alt: "Winthrop in the Methow Valley rain shadow of the North Cascades",
  },
  "brookings-or": {
    file: "Oregon Coast near Brookings 1981.jpg",
    alt: "Rocky southern Oregon coast near Brookings",
  },
  "joseph-or": {
    file: "Ehrler's Cabins in Wallowa Lake, Oregon (37785936446).jpg",
    alt: "Wallowa Lake and the Wallowa Mountains above Joseph, Oregon",
  },
  "stanley-id": {
    file: "Sawtooth from Stanley Lake Creek.JPG",
    alt: "Sawtooth Range from Stanley Lake Creek in central Idaho",
  },
  "mount-washington-nh": {
    file: "Mount Washington Cog Railway October 2021 015 edit.jpg",
    alt: "Mount Washington summit railway on the Presidential Range",
  },
  "ely-mn": {
    file: "The Boundary Waters, Minnesota.jpg",
    alt: "Boundary Waters lakes and boreal forest near Ely, Minnesota",
  },
  "nags-head-nc": {
    file: "Nags Head Outer Banks - panoramio.jpg",
    alt: "Nags Head dunes and Atlantic surf on the Outer Banks",
  },
  "lubbock-tx": {
    file: "Lubbock, Texas skyline.jpg",
    alt: "Lubbock skyline on the High Plains of West Texas",
  },
  "ojai-ca": {
    file: "Aerial view of Ojai, California in July 2021.jpg",
    alt: "Ojai Valley orchards and mountains from the air",
  },
  "corpus-christi-tx": {
    file: "Downtown Corpus Christi , Texas.jpg",
    alt: "Corpus Christi downtown against the Laguna Madre and Gulf",
  },
  "bismarck-nd": {
    file: "North Dakota State Capitol 02.jpg",
    alt: "North Dakota capitol tower above the Missouri River plains at Bismarck",
  },
  "morgantown-wv": {
    file: "City of Morgantown from the west side of the Monongahela River, May 2012.jpg",
    alt: "Morgantown across the Monongahela on the Appalachian Plateau",
  },
  "cape-may-nj": {
    file: "Cape May Lighthouse September 2020 002.jpg",
    alt: "Cape May Lighthouse at the Atlantic tip of New Jersey",
  },
  "block-island-ri": {
    file: "Block Island, Rhode Island - 2023.jpg",
    alt: "Block Island bluffs and Atlantic water off Rhode Island",
  },
  "spearfish-sd": {
    file: "Roughlock Falls, Spearfish Canyon, South Dakota.jpg",
    alt: "Roughlock Falls in Spearfish Canyon on the northern Black Hills",
  },
  "mobile-al": {
    file: "Le cuirassé USS Alabama, Battleship Memorial Park, Mobile, Alabama.jpg",
    alt: "Mobile Bay waterfront at Battleship Memorial Park",
  },
  "naples-fl": {
    file: "Gulf of Mexico from Naples FL pier.jpg",
    alt: "Gulf of Mexico from the Naples fishing pier",
  },
  "des-moines-ia": {
    file: "Capitol Building of Des moines, Iowa entrance.jpg",
    alt: "Iowa capitol on the Des Moines River in the Corn Belt",
  },
  "washington-dc": {
    file: "Washington Monument Dusk Jan 2006.jpg",
    alt: "Washington Monument at dusk on the Mid-Atlantic coastal plain",
  },
  "rapid-city-sd": {
    file: "Dean Franklin - 06.04.03 Mount Rushmore Monument (by-sa).jpg",
    alt: "Mount Rushmore in the eastern Black Hills above Rapid City country",
  },
  "roswell-nm": {
    file: "Roswell, NM.jpg",
    alt: "Roswell on the Pecos Valley floor of southeastern New Mexico",
  },
  "page-az": {
    file: "Glen Canyon Dam.jpg",
    alt: "Glen Canyon Dam and Colorado River corridor at Page, Arizona",
  },
  "lone-pine-ca": {
    file: "Mount Whitney.jpg",
    alt: "Mount Whitney above the Owens Valley near Lone Pine",
  },
  "leavenworth-wa": {
    file: "Leavenworth Washington.jpg",
    alt: "Leavenworth in the Wenatchee River valley beneath the Cascades",
  },
  "friday-harbor-wa": {
    file: "Friday Harbor.jpg",
    alt: "Friday Harbor on San Juan Island in the rain-shadow inland sea",
  },
  "point-reyes-ca": {
    file: "Point Reyes Lighthouse.jpg",
    alt: "Point Reyes Lighthouse on the foggy Pacific headland",
  },
  "truckee-ca": {
    file: "Lake Tahoe.jpg",
    alt: "Lake Tahoe high-Sierra water near the Truckee basin",
  },
  "mammoth-lakes-ca": {
    file: "Mammoth Lakes.jpg",
    alt: "Mammoth Lakes in the Eastern Sierra volcanic high country",
  },
  "forks-wa": {
    file: "Hoh Rain Forest.jpg",
    alt: "Hoh Rain Forest moss and Sitka spruce near Forks, Washington",
  },
  "astoria-or": {
    file: "Astoria Oregon.jpg",
    alt: "Astoria at the Columbia River mouth on the Oregon coast",
  },
  "eureka-ca": {
    file: "Carson Mansion.jpg",
    alt: "Carson Mansion and Humboldt Bay fog-belt architecture in Eureka",
  },
  "spokane-wa": {
    file: "Spokane Washington.jpg",
    alt: "Spokane on the inland Columbia Plateau",
  },
  "buffalo-ny": {
    file: "Niagara Falls.jpg",
    alt: "Niagara Falls, the lake-effect engine just north of Buffalo",
  },
  "ithaca-ny": {
    file: "Ithaca Falls.jpg",
    alt: "Ithaca Falls in the Finger Lakes gorge country",
  },
  "traverse-city-mi": {
    file: "Sleeping Bear Dunes.jpg",
    alt: "Sleeping Bear Dunes on Lake Michigan near the Traverse City fruit belt",
  },
  "gatlinburg-tn": {
    file: "Great Smoky Mountains.jpg",
    alt: "Great Smoky Mountains ridges above Gatlinburg",
  },
  "duluth-mn": {
    file: "Aerial lift bridge duluth mn.jpg",
    alt: "Duluth Aerial Lift Bridge on the western tip of Lake Superior",
  },
  "chattanooga-tn": {
    file: "Market Street and Walnut Street Bridges, across the Tennessee River, Chattanooga, Tennessee (67681).jpg",
    alt: "Tennessee River bridges at Chattanooga beneath Lookout Mountain",
  },
  "burlington-vt": {
    file: "Burlington, Vermont Waterfront (30308921845).jpg",
    alt: "Burlington waterfront on Lake Champlain",
  },
  "boone-nc": {
    file: "Boone NC - King Street.jpg",
    alt: "Boone's King Street in the High Country of northwestern North Carolina",
  },
  "wenatchee-wa": {
    file: "Views of Wenatchee from Squilchuck Road in April (47649).jpg",
    alt: "Wenatchee and the Columbia River from the Squilchuck benches",
  },
  "yuma-az": {
    file: "Colorado River At Yuma - Page-473.jpg",
    alt: "Colorado River corridor at Yuma on the Sonoran Desert floor",
  },
};

export function getPlaceHeroMedia(placeId: string): PlaceHeroMedia | null {
  const row = HERO_BY_PLACE_ID[placeId];
  if (!row) return null;
  return {
    src: commonsFile(row.file),
    srcSet: commonsSrcSet(row.file),
    sizes: "(min-width: 768px) 52rem, calc(100vw - 2rem)",
    alt: row.alt,
    creditLine: CREDIT,
    sourceUrl: commonsFilePage(row.file),
  };
}

export function placeHeroMediaCount(): number {
  return Object.keys(HERO_BY_PLACE_ID).length;
}

/** Static OpenStreetMap map centered on the place (opens in a new tab). */
export function openStreetMapUrl(lat: number, lon: number, zoom = 10): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}
