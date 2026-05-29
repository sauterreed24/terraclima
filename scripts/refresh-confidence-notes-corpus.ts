/**
 * Refresh templated Tier C `confidenceNotes` with the latest draft generator.
 * Idempotent — skips notes that are already customized.
 *
 * Run: `tsx scripts/refresh-confidence-notes-corpus.ts`
 */
import { PLACES } from "../src/data/places";
import {
  draftConfidenceNote,
  isGenericConfidenceNote,
} from "./lib/draft-confidence-note";
import { findFileForPlace, placeBlockWindow, readCorpusFile, writeCorpusFile } from "./lib/corpus-place-io";

const SKIP_IDS = new Set([
  "boulder-co", "grand-marais-mi", "hood-river-gorge", "truckee-ca",
  "mammoth-lakes-ca", "sedona-az", "taos-nm", "durango-co",
  "new-orleans-la", "charleston-sc", "tucson-az", "anchorage-ak",
  "mobile-al", "savannah-ga", "buffalo-ny", "chattanooga-tn",
  "spokane-wa", "austin-tx", "washington-dc", "honolulu-hi",
  "monterrey-mx", "puebla-mx", "queretaro-mx", "des-moines-ia",
  "columbia-sc", "wilmington-de", "ensenada-mx", "zacatecas-mx",
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
]);

const fileCache = new Map<string, string>();
let refreshed = 0;
let skipped = 0;

for (const place of PLACES.filter(p => p.tier === "C")) {
  if (SKIP_IDS.has(place.id) || !isGenericConfidenceNote(place.confidenceNotes)) {
    skipped += 1;
    continue;
  }
  const file = findFileForPlace(place.id);
  if (!file) continue;
  let src = fileCache.get(file) ?? readCorpusFile(file);
  const win = placeBlockWindow(src, place.id);
  if (!win) continue;

  const note = draftConfidenceNote(place).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = /confidenceNotes:\s*"[^"]*",/;
  if (!re.test(win.block)) continue;

  const relIdx = win.block.search(re);
  if (relIdx < 0) continue;
  const absStart = win.start + relIdx;
  const oldMatch = src.slice(absStart).match(/^confidenceNotes:\s*"[^"]*",/)?.[0];
  if (!oldMatch) continue;

  src = `${src.slice(0, absStart)}confidenceNotes: "${note}",${src.slice(absStart + oldMatch.length)}`;
  fileCache.set(file, src);
  refreshed += 1;
}

for (const [rel, src] of fileCache) writeCorpusFile(rel, src);
console.log(`refresh-confidence-notes-corpus: refreshed ${refreshed}, skipped ${skipped} custom notes.`);
