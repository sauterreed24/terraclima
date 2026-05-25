import { describe, expect, it } from "vitest";
import { PLACES, PLACE_ANNUAL_PRECIP } from "../../data/places";
import type { Place } from "../../types";
import {
  getBioclimCardSignal,
  getCorpusCardTeaser,
  getCorpusMapHint,
  getPlaceCorpusRanks,
  type PlaceCorpusRanks,
} from "../atlas-corpus-stats";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh, summerDiurnalC } from "../climate-metrics";
import { makePlace } from "./test-fixtures";

function strictLess(value: number, values: readonly number[]): number {
  return values.filter(v => v < value).length / values.length;
}

function strictGreater(value: number, values: readonly number[]): number {
  return values.filter(v => v > value).length / values.length;
}

function annualPrecip(place: Place): number {
  return PLACE_ANNUAL_PRECIP[place.id] ?? getAnnualPrecipMm(place);
}

function scanOracle(place: Place): PlaceCorpusRanks {
  const annualPrecipMm = PLACES.map(annualPrecip);
  const july = PLACES.map(meanSummerHigh);
  const jan = PLACES.map(meanJanLow);
  const elevationM = PLACES.map(p => p.elevationM);
  const diurnalSummerC = PLACES.map(summerDiurnalC);
  const resilience0_100 = PLACES.map(p => p.scores.resilience);
  const growability0_100 = PLACES.map(p => p.scores.growability);
  const uniqueness0_100 = PLACES.map(p => p.scores.microclimateUniqueness);
  const gdd10 = PLACES.map(p => p.climate.gdd10).filter((v): v is number => v != null);
  const frostFreeDays = PLACES.map(p => p.climate.frostFreeDays).filter((v): v is number => v != null);

  return {
    wetterThanAtlasShare: strictLess(annualPrecip(place), annualPrecipMm),
    drierThanAtlasShare: strictGreater(annualPrecip(place), annualPrecipMm),
    coolerSummersThanAtlasShare: strictGreater(meanSummerHigh(place), july),
    milderWintersThanAtlasShare: strictLess(meanJanLow(place), jan),
    higherElevationThanAtlasShare: strictLess(place.elevationM, elevationM),
    largerDiurnalThanAtlasShare: strictLess(summerDiurnalC(place), diurnalSummerC),
    higherResilienceShare: strictLess(place.scores.resilience, resilience0_100),
    higherGrowabilityShare: strictLess(place.scores.growability, growability0_100),
    higherUniquenessShare: strictLess(place.scores.microclimateUniqueness, uniqueness0_100),
    gddAboveShare: place.climate.gdd10 != null && gdd10.length > 0
      ? strictLess(place.climate.gdd10, gdd10)
      : null,
    frostAboveShare: place.climate.frostFreeDays != null && frostFreeDays.length > 0
      ? strictLess(place.climate.frostFreeDays, frostFreeDays)
      : null,
  };
}

describe("atlas corpus stats", () => {
  it("matches strict scan semantics for percentile ties", () => {
    const base = PLACES[0]!;
    const tiedPlace = makePlace({
      id: "test-tie-place",
      elevationM: base.elevationM,
      climate: { ...base.climate },
      scores: { ...base.scores },
    });
    const expected = scanOracle(tiedPlace);
    const actual = getPlaceCorpusRanks(tiedPlace);

    for (const key of Object.keys(expected) as (keyof PlaceCorpusRanks)[]) {
      const expectedValue = expected[key];
      const actualValue = actual[key];
      if (expectedValue == null) {
        expect(actualValue).toBeNull();
      } else {
        expect(actualValue).toBeCloseTo(expectedValue, 12);
      }
    }
  });

  it("caches rank objects and keeps teaser text stable", () => {
    const place = PLACES[0]!;
    const ranks = getPlaceCorpusRanks(place);
    expect(getPlaceCorpusRanks(place)).toBe(ranks);

    const teaser = getCorpusCardTeaser(place);
    const hint = getCorpusMapHint(place);
    expect(getCorpusCardTeaser(place)).toBe(teaser);
    expect(getCorpusMapHint(place)).toBe(hint);
    expect(teaser).toContain("Vs full atlas:");
    expect(teaser).toContain("bioclim:");
    expect(hint).toContain("Water year wetter than");
  });

  it("builds a compact bioclim card signal from computed indices", () => {
    const signal = getBioclimCardSignal(PLACES.find(p => p.id === "yuma-az") ?? PLACES[0]!);

    expect(signal).not.toBeNull();
    expect(signal!.label).toContain("K ");
    expect(signal!.title).toContain("De Martonne");
    expect(signal!.title).toContain("Conrad K");
  });
});
