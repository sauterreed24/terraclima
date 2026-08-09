import { readFileSync, writeFileSync } from "node:fs";
import { assertAtlasCorpusHealthy, getPlaceCorpusRanks } from "../../src/lib/atlas-corpus-stats";
import { buildGeospatialAnalysis } from "../../src/lib/geospatial-analysis";
import { PLACES_BY_ID } from "../../src/data/places";

assertAtlasCorpusHealthy();
let src = readFileSync("scripts/corpus-rank-gold.ts", "utf8");

const goldIds = [
  "sequim-wa",
  "tofino-bc",
  "portal-az",
  "fairbanks-ak",
  "hilo-hi",
  "oaxaca-mx",
  "banff-ab",
  "los-alamos-pajarito-plateau-nm",
  "victoria-bc",
  "nelson-bc",
  "tucson-az",
];

for (const id of goldIds) {
  const place = PLACES_BY_ID[id];
  if (!place) throw new Error(`missing ${id}`);
  const ranks = getPlaceCorpusRanks(place);
  const lit = Object.entries(ranks)
    .map(([k, v]) => `      ${k}: ${v === null ? "null" : v},`)
    .join("\n");
  const block = `expected: {\n${lit}\n    }`;
  const re = new RegExp(`(id: "${id}",[\\s\\S]*?)expected: \\{[\\s\\S]*?\\n    \\}`, "m");
  if (!re.test(src)) throw new Error(`no match for ${id}`);
  src = src.replace(re, `$1${block}`);
}
writeFileSync("scripts/corpus-rank-gold.ts", src);

const geoIds = ["sequim-wa", "tofino-bc", "portal-az", "fairbanks-ak"];
let src2 = readFileSync("scripts/corpus-rank-gold.ts", "utf8");
const geoStart = src2.indexOf("const GEOSPATIAL_GOLD");
const geoEnd = src2.indexOf("function close");
if (geoStart < 0 || geoEnd < 0) throw new Error("GEOSPATIAL_GOLD markers missing");
const before = src2.slice(0, geoStart);
const after = src2.slice(geoEnd);
const entries = geoIds
  .map(id => {
    const place = PLACES_BY_ID[id];
    if (!place) throw new Error(`missing ${id}`);
    const act = buildGeospatialAnalysis(place);
    const sourceFits = act.sourceFits.map(s => ({
      sourceId: s.sourceId,
      score: s.score,
      label: s.label,
    }));
    return `  {
    id: "${id}",
    expected: {
      geospatialSignalScore: ${act.geospatialSignalScore},
      eoObservabilityScore: ${act.eoObservabilityScore},
      reliefEnergyMPerKm: ${Number(act.reliefEnergyMPerKm.toFixed(6))},
      hydroSeasonalityRatio: ${Number(act.hydroSeasonalityRatio.toFixed(6))},
      terrainExposureIndex: ${Number(act.terrainExposureIndex.toFixed(6))},
      analysisConfidence: ${JSON.stringify(act.analysisConfidence)},
      sourceFits: ${JSON.stringify(sourceFits)},
      spectralSignals: ${JSON.stringify(act.spectralSignals.map(s => s.index))},
    },
  }`;
  })
  .join(",\n");
src2 =
  before +
  `const GEOSPATIAL_GOLD: { id: string; expected: GeospatialGold }[] = [\n${entries},\n];\n\n` +
  after;
writeFileSync("scripts/corpus-rank-gold.ts", src2);
console.log("Refreshed corpus-rank-gold.ts from Climate V2 normals");
