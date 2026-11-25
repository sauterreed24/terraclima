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
    expect(teaser).toContain("Against the full atlas:");
    expect(teaser).not.toMatch(/JJA|bioclim:/);
    expect(hint).toContain("Water year wetter than");
  });

  it("builds a compact bioclim card signal from computed indices", () => {
    const signal = getBioclimCardSignal(PLACES.find(p => p.id === "yuma-az") ?? PLACES[0]!);

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("Very dry · moderate seasonal swing");
    expect(signal!.label).not.toMatch(/\bK \d/);
    expect(signal!.title).toMatch(/De Martonne aridity index \d+\.\d/);
    expect(signal!.title).toMatch(/Conrad continentality index \d+\.\d/);
  });

  it("labels the card signal in plain words, never with textbook band names", () => {
    const label = (id: string) => getBioclimCardSignal(PLACES.find(p => p.id === id)!)!.label;
    // Oaxaca City (summer-rain highland) and Boulder used to read "Mediterranean";
    // Real de Catorce (a 2,750 m desert town) used to read "oceanic".
    expect(label("oaxaca-mx")).toBe("Moderately moist · small seasonal swing");
    expect(label("boulder-co")).toBe("Moderately moist · moderate seasonal swing");
    expect(label("real-catorce-mx")).toBe("Fairly dry · small seasonal swing");
    expect(label("mazamitla-mx")).toBe("Moist · small seasonal swing");
    for (const place of PLACES) {
      const signal = getBioclimCardSignal(place);
      if (!signal) continue;
      expect(signal.label, place.id).not.toMatch(/mediterranean|oceanic|continental|humid|arid/i);
      expect(signal.label, place.id).toMatch(
        /^(Very dry|Dry|Fairly dry|Moderately moist|Moist|Very wet|Frozen year) · (very small|small|moderate|large|very large) seasonal swing$/,
      );
    }
  });
});
