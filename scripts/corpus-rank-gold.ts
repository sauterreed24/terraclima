/**
 * Regression: atlas corpus rank shares for known places.
 *
 * If this fails after editing place climate data, update the `expected` objects
 * (re-dump with the one-liner in the repo wiki / comment below).
 */
import { assertAtlasCorpusHealthy, getPlaceCorpusRanks, type PlaceCorpusRanks } from "../src/lib/atlas-corpus-stats";
import { PLACES_BY_ID } from "../src/data/places";
import { buildGeospatialAnalysis } from "../src/lib/geospatial-analysis";

const TOL = 1e-5;

const GOLD: { id: string; label: string; expected: Partial<PlaceCorpusRanks> }[] = [
  {
    id: "sequim-wa",
    label: "Sequim — cool maritime, moderate wet, high uniqueness",
    expected: {
      wetterThanAtlasShare: 0.3008849557522124,
      drierThanAtlasShare: 0.6946902654867256,
      coolerSummersThanAtlasShare: 0.8539823008849557,
      milderWintersThanAtlasShare: 0.6460176991150443,
      higherElevationThanAtlasShare: 0.2920353982300885,
      largerDiurnalThanAtlasShare: 0.2610619469026549,
      higherResilienceShare: 0.8982300884955752,
      higherGrowabilityShare: 0.8097345132743363,
      higherUniquenessShare: 0.9778761061946902,
      gddAboveShare: 0.060606,
      frostAboveShare: 0.6017699115044248,
    },
  },
  {
    id: "tofino-bc",
    label: "Tofino — very wet, tiny diurnal, oceanic",
    expected: {
      wetterThanAtlasShare: 0.9911504424778761,
      drierThanAtlasShare: 0.004424778761061947,
      coolerSummersThanAtlasShare: 0.9778761061946902,
      milderWintersThanAtlasShare: 0.6902654867256637,
      higherElevationThanAtlasShare: 0.10619469026548672,
      largerDiurnalThanAtlasShare: 0.004424778761061947,
      higherResilienceShare: 0.9292035398230089,
      higherGrowabilityShare: 0.26548672566371684,
      higherUniquenessShare: 0.8141592920353983,
      gddAboveShare: 0.030303,
      frostAboveShare: 0.6946902654867256,
    },
  },
  {
    id: "portal-az",
    label: "Portal — dry sky island, high elevation & diurnal",
    expected: {
      wetterThanAtlasShare: 0.23893805309734514,
      drierThanAtlasShare: 0.7566371681415929,
      coolerSummersThanAtlasShare: 0.13716814159292035,
      milderWintersThanAtlasShare: 0.5265486725663717,
      higherElevationThanAtlasShare: 0.7831858407079646,
      largerDiurnalThanAtlasShare: 0.7876106194690266,
      higherResilienceShare: 0.3230088495575221,
      higherGrowabilityShare: 0.3495575221238938,
      higherUniquenessShare: 0.9734513274336283,
      gddAboveShare: 0.69697,
      frostAboveShare: 0.588495575221239,
    },
  },
  {
    id: "fairbanks-ak",
    label: "Fairbanks — very cold winter, dry, GDD sub-pool can be null",
    expected: {
      wetterThanAtlasShare: 0.09292035398230089,
      drierThanAtlasShare: 0.9026548672566371,
      coolerSummersThanAtlasShare: 0.7964601769911505,
      milderWintersThanAtlasShare: 0.022123893805309734,
      higherElevationThanAtlasShare: 0.35398230088495575,
      largerDiurnalThanAtlasShare: 0.49557522123893805,
      higherResilienceShare: 0.12389380530973451,
      higherGrowabilityShare: 0.26548672566371684,
      higherUniquenessShare: 0.911504424778761,
      gddAboveShare: null,
      frostAboveShare: 0.09292035398230089,
    },
  },
  {
    id: "hilo-hi",
    label: "Hilo — wet tropical, mild, huge growability in pool",
    expected: {
      wetterThanAtlasShare: 0.9867256637168141,
      drierThanAtlasShare: 0.008849557522123894,
      coolerSummersThanAtlasShare: 0.37610619469026546,
      milderWintersThanAtlasShare: 0.9734513274336283,
      higherElevationThanAtlasShare: 0.18141592920353983,
      largerDiurnalThanAtlasShare: 0.07079646017699115,
      higherResilienceShare: 0.7699115044247787,
      higherGrowabilityShare: 0.9867256637168141,
      higherUniquenessShare: 0.9424778761061947,
      gddAboveShare: 0.969697,
      frostAboveShare: 0.8849557522123894,
    },
  },
  {
    id: "tucson-az",
    label: "Tucson — hot summer, GDD can be null in sub-pool",
    expected: {
      wetterThanAtlasShare: 0.26548672566371684,
      drierThanAtlasShare: 0.7300884955752213,
      coolerSummersThanAtlasShare: 0.022123893805309734,
      milderWintersThanAtlasShare: 0.7566371681415929,
      higherElevationThanAtlasShare: 0.6460176991150443,
      largerDiurnalThanAtlasShare: 0.672566371681416,
      higherResilienceShare: 0.14601769911504425,
      higherGrowabilityShare: 0.4911504424778761,
      higherUniquenessShare: 0.2920353982300885,
      gddAboveShare: null,
      frostAboveShare: 0.7389380530973452,
    },
  },
];

type GeospatialGold = {
  geospatialSignalScore: number;
  eoObservabilityScore: number;
  reliefEnergyMPerKm: number;
  hydroSeasonalityRatio: number;
  terrainExposureIndex: number;
  analysisConfidence: string;
  sourceFits: { sourceId: string; score: number; label: string }[];
  spectralSignals: string[];
};

const GEOSPATIAL_GOLD: { id: string; expected: GeospatialGold }[] = [
  {
    id: "sequim-wa",
    expected: {
      geospatialSignalScore: 36,
      eoObservabilityScore: 65,
      reliefEnergyMPerKm: 1.1,
      hydroSeasonalityRatio: 5.142857,
      terrainExposureIndex: 1.533333,
      analysisConfidence: "high",
      sourceFits: [{ sourceId: "sentinel-2", score: 77, label: "useful" }, { sourceId: "landsat", score: 53, label: "contextual" }],
      spectralSignals: ["Aerosol-aware RGB / turbidity", "NDVI / red-edge NDVI", "LST anomaly", "NDMI", "NDSI"],
    },
  },
  {
    id: "tofino-bc",
    expected: {
      geospatialSignalScore: 39,
      eoObservabilityScore: 60,
      reliefEnergyMPerKm: 0.416667,
      hydroSeasonalityRatio: 7.914286,
      terrainExposureIndex: 2.733333,
      analysisConfidence: "high",
      sourceFits: [{ sourceId: "sentinel-2", score: 76, label: "useful" }, { sourceId: "landsat", score: 43, label: "contextual" }],
      spectralSignals: ["Aerosol-aware RGB / turbidity", "NDVI / red-edge NDVI", "LST anomaly", "NDMI"],
    },
  },
  {
    id: "portal-az",
    expected: {
      geospatialSignalScore: 63,
      eoObservabilityScore: 71,
      reliefEnergyMPerKm: 58.4,
      hydroSeasonalityRatio: 9.3,
      terrainExposureIndex: 3.067538,
      analysisConfidence: "high",
      sourceFits: [{ sourceId: "sentinel-2", score: 68, label: "useful" }, { sourceId: "landsat", score: 75, label: "useful" }],
      spectralSignals: ["NDVI / red-edge NDVI", "LST anomaly", "NDMI", "NBR / dNBR", "NDSI"],
    },
  },
  {
    id: "fairbanks-ak",
    expected: {
      geospatialSignalScore: 57,
      eoObservabilityScore: 64,
      reliefEnergyMPerKm: 5.4,
      hydroSeasonalityRatio: 6.75,
      terrainExposureIndex: 3.546667,
      analysisConfidence: "high",
      sourceFits: [{ sourceId: "sentinel-2", score: 52, label: "contextual" }, { sourceId: "landsat", score: 78, label: "strong" }],
      spectralSignals: ["NDVI / red-edge NDVI", "LST anomaly", "NBR / dNBR", "NDSI"],
    },
  },
];

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOL;
}

const KEYS = [
  "wetterThanAtlasShare",
  "drierThanAtlasShare",
  "coolerSummersThanAtlasShare",
  "milderWintersThanAtlasShare",
  "higherElevationThanAtlasShare",
  "largerDiurnalThanAtlasShare",
  "higherResilienceShare",
  "higherGrowabilityShare",
  "higherUniquenessShare",
  "gddAboveShare",
  "frostAboveShare",
] as const satisfies readonly (keyof PlaceCorpusRanks)[];

function main() {
  assertAtlasCorpusHealthy();
  let failed = 0;
  for (const row of GOLD) {
    const place = PLACES_BY_ID[row.id];
    if (!place) {
      console.error(`FAIL: unknown place id "${row.id}" (${row.label})`);
      failed++;
      continue;
    }
    const act = getPlaceCorpusRanks(place);
    for (const k of KEYS) {
      const ev = row.expected[k];
      if (ev === undefined) continue;
      const av = act[k];
      if (ev == null) {
        if (av != null) {
          console.error(`FAIL ${row.id} ${k}: expected null, got ${av} (${row.label})`);
          failed++;
        }
        continue;
      }
      if (av == null) {
        console.error(`FAIL ${row.id} ${k}: expected ${ev}, got null (${row.label})`);
        failed++;
        continue;
      }
      if (!close(av, ev)) {
        console.error(
          `FAIL ${row.id} ${k}: expected ${ev}, got ${av} (Δ${(av - ev).toExponential(3)}) — ${row.label}`,
        );
        failed++;
      }
    }
  }
  for (const row of GEOSPATIAL_GOLD) {
    const place = PLACES_BY_ID[row.id];
    if (!place) {
      console.error(`FAIL: unknown place id "${row.id}" (geospatial gold)`);
      failed++;
      continue;
    }
    const act = buildGeospatialAnalysis(place);
    const numericPairs = [
      ["geospatialSignalScore", act.geospatialSignalScore, row.expected.geospatialSignalScore],
      ["eoObservabilityScore", act.eoObservabilityScore, row.expected.eoObservabilityScore],
      ["reliefEnergyMPerKm", Number(act.reliefEnergyMPerKm.toFixed(6)), row.expected.reliefEnergyMPerKm],
      ["hydroSeasonalityRatio", Number(act.hydroSeasonalityRatio.toFixed(6)), row.expected.hydroSeasonalityRatio],
      ["terrainExposureIndex", Number(act.terrainExposureIndex.toFixed(6)), row.expected.terrainExposureIndex],
    ] as const;
    for (const [k, av, ev] of numericPairs) {
      if (!close(av, ev)) {
        console.error(`FAIL ${row.id} geo ${k}: expected ${ev}, got ${av}`);
        failed++;
      }
    }
    if (act.analysisConfidence !== row.expected.analysisConfidence) {
      console.error(`FAIL ${row.id} geo analysisConfidence: expected ${row.expected.analysisConfidence}, got ${act.analysisConfidence}`);
      failed++;
    }
    const sourceFits = act.sourceFits.map(s => ({ sourceId: s.sourceId, score: s.score, label: s.label }));
    if (JSON.stringify(sourceFits) !== JSON.stringify(row.expected.sourceFits)) {
      console.error(`FAIL ${row.id} geo sourceFits: expected ${JSON.stringify(row.expected.sourceFits)}, got ${JSON.stringify(sourceFits)}`);
      failed++;
    }
    const spectralSignals = act.spectralSignals.map(s => s.index);
    if (JSON.stringify(spectralSignals) !== JSON.stringify(row.expected.spectralSignals)) {
      console.error(`FAIL ${row.id} geo spectralSignals: expected ${JSON.stringify(row.expected.spectralSignals)}, got ${JSON.stringify(spectralSignals)}`);
      failed++;
    }
  }
  if (failed > 0) {
    console.error(
      `\n${failed} regression mismatch(es). If you edited climate JSON on purpose, update expected[] in scripts/corpus-rank-gold.ts ` +
        `(re-dump ranks: see comment at bottom of that file).\n`,
    );
    process.exit(1);
  }
  console.log(`OK  corpus-rank-gold: ${GOLD.length} rank snapshots + ${GEOSPATIAL_GOLD.length} geospatial snapshots`);
}

main();

/*
Re-dump one place, then paste 0..1 shares into GOLD above:

  npm run dump:corpus-rank -- sequim-wa
*/
