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
      wetterThanAtlasShare: 0.37168141592920356,
      drierThanAtlasShare: 0.6238938053097345,
      coolerSummersThanAtlasShare: 0.8805309734513275,
      milderWintersThanAtlasShare: 0.6415929203539823,
      higherElevationThanAtlasShare: 0.2920353982300885,
      largerDiurnalThanAtlasShare: 0.2079646017699115,
      higherResilienceShare: 0.8982300884955752,
      higherGrowabilityShare: 0.8097345132743363,
      higherUniquenessShare: 0.9778761061946902,
      gddAboveShare: 0.17256637168141592,
      frostAboveShare: 0.668141592920354,
    },
  },
  {
    id: "tofino-bc",
    label: "Tofino — very wet, tiny diurnal, oceanic",
    expected: {
      wetterThanAtlasShare: 0.9867256637168141,
      drierThanAtlasShare: 0.008849557522123894,
      coolerSummersThanAtlasShare: 0.9469026548672567,
      milderWintersThanAtlasShare: 0.6769911504424779,
      higherElevationThanAtlasShare: 0.10619469026548672,
      largerDiurnalThanAtlasShare: 0.02654867256637168,
      higherResilienceShare: 0.9292035398230089,
      higherGrowabilityShare: 0.26548672566371684,
      higherUniquenessShare: 0.8141592920353983,
      gddAboveShare: 0.10619469026548672,
      frostAboveShare: 0.6769911504424779,
    },
  },
  {
    id: "portal-az",
    label: "Portal — dry sky island, high elevation & diurnal",
    expected: {
      wetterThanAtlasShare: 0.18141592920353983,
      drierThanAtlasShare: 0.8141592920353983,
      coolerSummersThanAtlasShare: 0.12389380530973451,
      milderWintersThanAtlasShare: 0.5398230088495575,
      higherElevationThanAtlasShare: 0.7831858407079646,
      largerDiurnalThanAtlasShare: 0.8672566371681416,
      higherResilienceShare: 0.3230088495575221,
      higherGrowabilityShare: 0.3495575221238938,
      higherUniquenessShare: 0.9734513274336283,
      gddAboveShare: 0.6991150442477876,
      frostAboveShare: 0.5176991150442478,
    },
  },
  {
    id: "fairbanks-ak",
    label: "Fairbanks — very cold winter, dry, GDD sub-pool can be null",
    expected: {
      wetterThanAtlasShare: 0.1415929203539823,
      drierThanAtlasShare: 0.8539823008849557,
      coolerSummersThanAtlasShare: 0.8716814159292036,
      milderWintersThanAtlasShare: 0.022123893805309734,
      higherElevationThanAtlasShare: 0.35398230088495575,
      largerDiurnalThanAtlasShare: 0.4911504424778761,
      higherResilienceShare: 0.12389380530973451,
      higherGrowabilityShare: 0.26548672566371684,
      higherUniquenessShare: 0.911504424778761,
      gddAboveShare: 0.0752212389380531,
      frostAboveShare: 0.030973451327433628,
    },
  },
  {
    id: "hilo-hi",
    label: "Hilo — wet tropical, mild, huge growability in pool",
    expected: {
      wetterThanAtlasShare: 0.995575221238938,
      drierThanAtlasShare: 0,
      coolerSummersThanAtlasShare: 0.4336283185840708,
      milderWintersThanAtlasShare: 0.9601769911504425,
      higherElevationThanAtlasShare: 0.18141592920353983,
      largerDiurnalThanAtlasShare: 0.0752212389380531,
      higherResilienceShare: 0.7699115044247787,
      higherGrowabilityShare: 0.9867256637168141,
      higherUniquenessShare: 0.9424778761061947,
      gddAboveShare: 0.8982300884955752,
      frostAboveShare: 0.8716814159292036,
    },
  },
  {
    id: "oaxaca-mx",
    label: "Oaxaca — Mexico highland, mild winter, strong growability share",
    expected: {
      wetterThanAtlasShare: 0.46017699115044247,
      drierThanAtlasShare: 0.5353982300884956,
      coolerSummersThanAtlasShare: 0.47345132743362833,
      milderWintersThanAtlasShare: 0.8938053097345132,
      higherElevationThanAtlasShare: 0.8185840707964602,
      largerDiurnalThanAtlasShare: 0.5796460176991151,
      higherResilienceShare: 0.7035398230088495,
      higherGrowabilityShare: 0.8938053097345132,
      higherUniquenessShare: 0.7654867256637168,
      gddAboveShare: 0.8230088495575221,
      frostAboveShare: 0.8716814159292036,
    },
  },
  {
    id: "banff-ab",
    label: "Banff — cold winter, high elevation, low growability share",
    expected: {
      wetterThanAtlasShare: 0.252212389380531,
      drierThanAtlasShare: 0.7433628318584071,
      coolerSummersThanAtlasShare: 0.8761061946902655,
      milderWintersThanAtlasShare: 0.10619469026548672,
      higherElevationThanAtlasShare: 0.7699115044247787,
      largerDiurnalThanAtlasShare: 0.7212389380530974,
      higherResilienceShare: 0.27876106194690264,
      higherGrowabilityShare: 0.048672566371681415,
      higherUniquenessShare: 0.6460176991150443,
      gddAboveShare: 0.04424778761061947,
      frostAboveShare: 0.061946902654867256,
    },
  },
  {
    id: "los-alamos-pajarito-plateau-nm",
    label: "Los Alamos — sky-island plateau, high elevation & diurnal",
    expected: {
      wetterThanAtlasShare: 0.21238938053097345,
      drierThanAtlasShare: 0.7831858407079646,
      coolerSummersThanAtlasShare: 0.4646017699115044,
      milderWintersThanAtlasShare: 0.26991150442477874,
      higherElevationThanAtlasShare: 0.9513274336283186,
      largerDiurnalThanAtlasShare: 0.831858407079646,
      higherResilienceShare: 0.5,
      higherGrowabilityShare: 0.3053097345132743,
      higherUniquenessShare: 0.8141592920353983,
      gddAboveShare: 0.3584070796460177,
      frostAboveShare: 0.18584070796460178,
    },
  },
  {
    id: "victoria-bc",
    label: "Victoria — maritime BC, high resilience & growability",
    expected: {
      wetterThanAtlasShare: 0.4778761061946903,
      drierThanAtlasShare: 0.5176991150442478,
      coolerSummersThanAtlasShare: 0.8893805309734514,
      milderWintersThanAtlasShare: 0.6946902654867256,
      higherElevationThanAtlasShare: 0.2168141592920354,
      largerDiurnalThanAtlasShare: 0.1415929203539823,
      higherResilienceShare: 0.9646017699115044,
      higherGrowabilityShare: 0.8938053097345132,
      higherUniquenessShare: 0.7035398230088495,
      gddAboveShare: 0.17699115044247787,
      frostAboveShare: 0.7345132743362832,
    },
  },
  {
    id: "nelson-bc",
    label: "Nelson — interior BC, strong diurnal, mid growability",
    expected: {
      wetterThanAtlasShare: 0.5265486725663717,
      drierThanAtlasShare: 0.4690265486725664,
      coolerSummersThanAtlasShare: 0.5486725663716814,
      milderWintersThanAtlasShare: 0.4336283185840708,
      higherElevationThanAtlasShare: 0.584070796460177,
      largerDiurnalThanAtlasShare: 0.7477876106194691,
      higherResilienceShare: 0.5,
      higherGrowabilityShare: 0.6061946902654868,
      higherUniquenessShare: 0.21238938053097345,
      gddAboveShare: 0.3185840707964602,
      frostAboveShare: 0.3893805309734513,
    },
  },
  {
    id: "tucson-az",
    label: "Tucson — hot summer, GDD can be null in sub-pool",
    expected: {
      wetterThanAtlasShare: 0.07964601769911504,
      drierThanAtlasShare: 0.915929203539823,
      coolerSummersThanAtlasShare: 0.022123893805309734,
      milderWintersThanAtlasShare: 0.7168141592920354,
      higherElevationThanAtlasShare: 0.6460176991150443,
      largerDiurnalThanAtlasShare: 0.7831858407079646,
      higherResilienceShare: 0.14601769911504425,
      higherGrowabilityShare: 0.4911504424778761,
      higherUniquenessShare: 0.2920353982300885,
      gddAboveShare: 0.8805309734513275,
      frostAboveShare: 0.7212389380530974,
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
      geospatialSignalScore: 44,
      eoObservabilityScore: 70,
      reliefEnergyMPerKm: 1.1,
      hydroSeasonalityRatio: 9.046296,
      terrainExposureIndex: 1.533333,
      analysisConfidence: "high",
      sourceFits: [{"sourceId":"sentinel-2","score":85,"label":"strong"},{"sourceId":"landsat","score":53,"label":"contextual"}],
      spectralSignals: ["Aerosol-aware RGB / turbidity","NDVI / red-edge NDVI","LST anomaly","NDMI","NDSI"],
    },
  },
  {
    id: "tofino-bc",
    expected: {
      geospatialSignalScore: 40,
      eoObservabilityScore: 61,
      reliefEnergyMPerKm: 0.416667,
      hydroSeasonalityRatio: 7.023548,
      terrainExposureIndex: 2.733333,
      analysisConfidence: "high",
      sourceFits: [{"sourceId":"sentinel-2","score":74,"label":"useful"},{"sourceId":"landsat","score":46,"label":"contextual"}],
      spectralSignals: ["Aerosol-aware RGB / turbidity","NDVI / red-edge NDVI","LST anomaly","NDMI"],
    },
  },
  {
    id: "portal-az",
    expected: {
      geospatialSignalScore: 64,
      eoObservabilityScore: 71,
      reliefEnergyMPerKm: 58.4,
      hydroSeasonalityRatio: 19.12766,
      terrainExposureIndex: 3.067538,
      analysisConfidence: "high",
      sourceFits: [{"sourceId":"sentinel-2","score":67,"label":"useful"},{"sourceId":"landsat","score":76,"label":"useful"}],
      spectralSignals: ["NDVI / red-edge NDVI","LST anomaly","NDMI","NBR / dNBR","NDSI"],
    },
  },
  {
    id: "fairbanks-ak",
    expected: {
      geospatialSignalScore: 57,
      eoObservabilityScore: 65,
      reliefEnergyMPerKm: 5.4,
      hydroSeasonalityRatio: 7.208333,
      terrainExposureIndex: 3.546667,
      analysisConfidence: "high",
      sourceFits: [{"sourceId":"sentinel-2","score":54,"label":"contextual"},{"sourceId":"landsat","score":76,"label":"useful"}],
      spectralSignals: ["NDVI / red-edge NDVI","LST anomaly","NBR / dNBR","NDSI"],
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
