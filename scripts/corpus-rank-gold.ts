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
      wetterThanAtlasShare: 0.301887,
      drierThanAtlasShare: 0.693396,
      coolerSummersThanAtlasShare: 0.858491,
      milderWintersThanAtlasShare: 0.646226,
      higherElevationThanAtlasShare: 0.301887,
      largerDiurnalThanAtlasShare: 0.264151,
      higherResilienceShare: 0.896226,
      higherGrowabilityShare: 0.816038,
      higherUniquenessShare: 0.976415,
      gddAboveShare: 0.060606,
      frostAboveShare: 0.599057,
    },
  },
  {
    id: "tofino-bc",
    label: "Tofino — very wet, tiny diurnal, oceanic",
    expected: {
      wetterThanAtlasShare: 0.990566,
      drierThanAtlasShare: 0.004717,
      coolerSummersThanAtlasShare: 0.976415,
      milderWintersThanAtlasShare: 0.688679,
      higherElevationThanAtlasShare: 0.113208,
      largerDiurnalThanAtlasShare: 0.004717,
      higherResilienceShare: 0.929245,
      higherGrowabilityShare: 0.268868,
      higherUniquenessShare: 0.816038,
      gddAboveShare: 0.030303,
      frostAboveShare: 0.698113,
    },
  },
  {
    id: "portal-az",
    label: "Portal — dry sky island, high elevation & diurnal",
    expected: {
      wetterThanAtlasShare: 0.235849,
      drierThanAtlasShare: 0.759434,
      coolerSummersThanAtlasShare: 0.146226,
      milderWintersThanAtlasShare: 0.518868,
      higherElevationThanAtlasShare: 0.792453,
      largerDiurnalThanAtlasShare: 0.783019,
      higherResilienceShare: 0.34434,
      higherGrowabilityShare: 0.349057,
      higherUniquenessShare: 0.971698,
      gddAboveShare: 0.69697,
      frostAboveShare: 0.584906,
    },
  },
  {
    id: "fairbanks-ak",
    label: "Fairbanks — very cold winter, dry, GDD sub-pool can be null",
    expected: {
      wetterThanAtlasShare: 0.099057,
      drierThanAtlasShare: 0.896226,
      coolerSummersThanAtlasShare: 0.801887,
      milderWintersThanAtlasShare: 0.018868,
      higherElevationThanAtlasShare: 0.367925,
      largerDiurnalThanAtlasShare: 0.504717,
      higherResilienceShare: 0.132075,
      higherGrowabilityShare: 0.268868,
      higherUniquenessShare: 0.90566,
      gddAboveShare: null,
      frostAboveShare: 0.089623,
    },
  },
  {
    id: "hilo-hi",
    label: "Hilo — wet tropical, mild, huge growability in pool",
    expected: {
      wetterThanAtlasShare: 0.985849,
      drierThanAtlasShare: 0.009434,
      coolerSummersThanAtlasShare: 0.396226,
      milderWintersThanAtlasShare: 0.971698,
      higherElevationThanAtlasShare: 0.188679,
      largerDiurnalThanAtlasShare: 0.070755,
      higherResilienceShare: 0.764151,
      higherGrowabilityShare: 0.985849,
      higherUniquenessShare: 0.938679,
      gddAboveShare: 0.969697,
      frostAboveShare: 0.886792,
    },
  },
  {
    id: "tucson-az",
    label: "Tucson — hot summer, GDD can be null in sub-pool",
    expected: {
      wetterThanAtlasShare: 0.264151,
      drierThanAtlasShare: 0.731132,
      coolerSummersThanAtlasShare: 0.023585,
      milderWintersThanAtlasShare: 0.764151,
      higherElevationThanAtlasShare: 0.660377,
      largerDiurnalThanAtlasShare: 0.674528,
      higherResilienceShare: 0.15566,
      higherGrowabilityShare: 0.490566,
      higherUniquenessShare: 0.29717,
      gddAboveShare: null,
      frostAboveShare: 0.745283,
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
      geospatialSignalScore: 40,
      eoObservabilityScore: 65,
      reliefEnergyMPerKm: 1.1,
      hydroSeasonalityRatio: 5.142857,
      terrainExposureIndex: 1.533333,
      analysisConfidence: "high",
      sourceFits: [{ sourceId: "sentinel-2", score: 77, label: "useful" }, { sourceId: "landsat", score: 53, label: "contextual" }],
      spectralSignals: ["NDVI / red-edge NDVI", "LST anomaly", "NDMI", "NDSI"],
    },
  },
  {
    id: "tofino-bc",
    expected: {
      geospatialSignalScore: 43,
      eoObservabilityScore: 60,
      reliefEnergyMPerKm: 0.416667,
      hydroSeasonalityRatio: 7.914286,
      terrainExposureIndex: 2.733333,
      analysisConfidence: "high",
      sourceFits: [{ sourceId: "sentinel-2", score: 76, label: "useful" }, { sourceId: "landsat", score: 43, label: "contextual" }],
      spectralSignals: ["NDVI / red-edge NDVI", "LST anomaly", "NDMI"],
    },
  },
  {
    id: "portal-az",
    expected: {
      geospatialSignalScore: 66,
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
      geospatialSignalScore: 59,
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
