/**
 * Refresh generic backfill deepSections (-mechanism / -field-read) with the
 * latest draft generator. Skips hand-authored metros and custom section ids.
 *
 * Run: `tsx scripts/refresh-deep-sections-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import { draftDeepSections, formatDeepSectionsBlock } from "./lib/draft-deep-section";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

const SKIP_IDS = new Set([
  "new-orleans-la", "charleston-sc", "tucson-az", "anchorage-ak", "mobile-al",
  "savannah-ga", "buffalo-ny", "chattanooga-tn", "spokane-wa", "austin-tx",
  "washington-dc", "honolulu-hi", "monterrey-mx", "puebla-mx", "queretaro-mx",
  "des-moines-ia", "columbia-sc", "wilmington-de", "ensenada-mx", "zacatecas-mx",
  "boulder-co", "grand-marais-mi", "hood-river-gorge", "truckee-ca",
  "mammoth-lakes-ca", "sedona-az", "taos-nm", "durango-co",
  "apalachicola-fl", "santa-cruz-felton-ca", "ellensburg-wa", "borrego-springs-ca",
  "prescott-az", "cloudcroft-nm", "crested-butte-co", "leadville-co",
  "forks-wa", "point-reyes-ca", "marquette-mi", "houghton-mi", "joseph-or",
  "sitka-ak", "valdez-ak", "stanley-id", "mount-washington-nh", "yuma-az",
  "cuatrocienegas-mx", "real-catorce-mx", "la-ventosa-mx", "cypress-hills-sk",
  "dawson-city-yt", "churchill-mb", "twillingate-nl", "xilitla-mx", "xalapa-mx", "grand-manan-nb",
  "haida-gwaii-bc", "coatepec-mx", "winthrop-wa", "lone-pine-ca", "parras-de-la-fuente-mx",
  "orizaba-mx", "ely-mn", "cuauhtemoc-mx", "viroqua-wi", "gaspe-qc",
  "medicine-hat-ab", "revelstoke-bc", "tofino-ucluelet-corridor", "pincher-creek-ab", "yellowknife-nt",
  "alamos-mx", "toluca-mx", "asheville-nc", "leavenworth-wa", "page-az",
  "salt-spring-bc", "banff-ab", "kelowna-bc", "astoria-or", "port-townsend-wa",
  "cody-wy", "missoula-mt", "cape-may-nj", "taxco-mx", "bacalar-mx",
  "sunshine-coast-bc", "kamloops-bc", "squamish-bc", "napa-ca", "palm-springs-ca",
  "jackson-wy", "block-island-ri", "hermosillo-mx", "palenque-mx", "durango-mx",
  "moab-ut", "bozeman-mt", "prince-rupert-bc", "merida-mx", "galena-il",
  "bar-harbor-me", "nags-head-nc", "south-padre-tx", "penticton-bc", "san-miguel-de-allende-mx",
  "syracuse-ny", "boone-nc", "brookings-or", "medford-or", "friday-harbor-wa",
  "international-falls-mn", "duluth-mn", "summerland-bc", "la-paz-mx", "puerto-vallarta-mx",
  "creston-bc", "leamington-on", "thunder-bay-on", "mazatlan-mx", "campeche-mx",
  "erie-pa", "gatlinburg-tn", "burlington-vt", "lubbock-tx", "ojai-ca",
  "puerto-escondido-mx", "prince-edward-co-on", "iqaluit-nu", "naples-fl", "scottsbluff-ne",
  "rapid-city-sd", "beverly-shores-in", "mystic-ct", "roswell-nm", "paducah-ky",
]);

function isGenericBackfill(sections: { id: string }[]): boolean {
  if (sections.length !== 2) return false;
  const ids = sections.map(s => s.id);
  return ids.some(id => id.endsWith("-mechanism")) && ids.some(id => id.endsWith("-field-read"));
}

function replaceDeepSections(src: string, id: string, block: string): string | null {
  const win = placeBlockWindow(src, id);
  if (!win) return null;
  const match =
    /\bdeepSections:\s*\[[\s\S]*?\n\s{4}\],\s*\n(?=\s{4}[a-zA-Z]+:)/.exec(
      win.block,
    );
  if (!match || match.index == null) return null;
  const absStart = win.start + match.index;
  const absEnd = absStart + match[0].length;
  return `${src.slice(0, absStart)}${block}\n${src.slice(absEnd)}`;
}

const fileCache = new Map<string, string>();
let refreshed = 0;
let skipped = 0;

for (const place of PLACES) {
  if (SKIP_IDS.has(place.id) || !place.deepSections?.length) continue;
  if (!isGenericBackfill(place.deepSections)) {
    skipped += 1;
    continue;
  }
  const file = findFileForPlace(place.id);
  if (!file) continue;
  const src = fileCache.get(file) ?? readCorpusFile(file);
  const block = formatDeepSectionsBlock(draftDeepSections(place));
  const next = replaceDeepSections(src, place.id, block);
  if (next && next !== src) {
    fileCache.set(file, next);
    refreshed += 1;
  }
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`refresh-deep-sections-corpus: refreshed ${refreshed}, skipped ${skipped} custom sets.`);
