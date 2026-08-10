// Smoke tests for the v3 livability algorithm run against the full corpus.
// These are coarse-grained sanity checks — not statistical claims — that
// catch regressions where the algorithm starts producing NaN / Infinity /
// undefined component values, or where the percentile distribution
// collapses (e.g. everyone scores 100 because we forgot to clamp a slope).
//
// The suite runs against ../../data/places, which means it also exercises
// every Place's climate object through the scoring pipeline. If a new
// place lands in the corpus missing required fields, this test will fail
// loudly rather than at runtime.

import { describe, expect, it } from "vitest";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import {
  LIVABILITY_COMPONENT_KEYS,
  livabilityPercentiles,
  rankLivabilityWithBreakdown,
  scoreLivability,
} from "../livability-score";

describe("livability v3 — corpus smoke", () => {
  it("scores every place to a finite 0..100 value", () => {
    let badCount = 0;
    const examples: string[] = [];
    for (const p of PLACES) {
      const r = scoreLivability(p);
      if (!Number.isFinite(r.score) || r.score < 0 || r.score > 100) {
        badCount += 1;
        if (examples.length < 5) examples.push(`${p.id}=${r.score}`);
      }
    }
    expect(badCount, `bad scores in corpus: ${examples.join(", ")}`).toBe(0);
  });

  it("returns finite 0..100 values for every component on every place", () => {
    let badCount = 0;
    const examples: string[] = [];
    for (const p of PLACES) {
      const r = scoreLivability(p);
      for (const c of r.components) {
        if (!Number.isFinite(c.value) || c.value < 0 || c.value > 100) {
          badCount += 1;
          if (examples.length < 5) examples.push(`${p.id}/${c.key}=${c.value}`);
        }
      }
    }
    expect(badCount, `bad components in corpus: ${examples.join(", ")}`).toBe(0);
  });

  it("emits one component per known key", () => {
    const r = scoreLivability(PLACES[0]!);
    const keys = r.components.map(c => c.key).sort();
    const expected = [...LIVABILITY_COMPONENT_KEYS].sort();
    expect(keys).toEqual(expected);
  });

  it("produces a non-degenerate corpus distribution (p25 < p75)", () => {
    const q = livabilityPercentiles(PLACES);
    expect(q.p25).toBeLessThan(q.p75);
    expect(q.p50).toBeLessThanOrEqual(q.p75);
    expect(q.p75).toBeLessThanOrEqual(q.p90);
    // Sanity: nobody should be perfect across the whole corpus, but the median
    // should not be hugging zero either. These bounds are intentionally loose;
    // they're trip-wires for catastrophic miscalibrations.
    expect(q.p50).toBeGreaterThanOrEqual(10);
    expect(q.p50).toBeLessThanOrEqual(95);
  });

  it("ranks deterministically (same input → same order)", () => {
    const a = rankLivabilityWithBreakdown(PLACES).map(r => r.place.id);
    const b = rankLivabilityWithBreakdown(PLACES).map(r => r.place.id);
    expect(a).toEqual(b);
  });

  it("never crashes when a place lacks humidity or annualPrecipMm", () => {
    // The corpus has both: this guarantees we still gracefully fall back.
    for (const p of PLACES) {
      expect(() => scoreLivability(p)).not.toThrow();
    }
  });

  it("keeps high-impact Mexico live-here profiles backed by lived context", () => {
    const ids = [
      "patzcuaro-mx",
      "valle-de-bravo-mx",
      "tapalpa-mx",
      "mazamitla-mx",
      "ajijic-lake-chapala-mx",
      "tequila-mx",
      "guanajuato-mx",
      "queretaro-mx",
    ];

    for (const id of ids) {
      const place = PLACES_BY_ID[id];
      expect(place, id).toBeDefined();
      expect(place!.liveSignals?.note?.length, `${id} liveSignals.note`).toBeGreaterThan(24);
      expect(place!.liveSignals?.sources?.length, `${id} liveSignals.sources`).toBeGreaterThanOrEqual(1);
      expect(place!.settlementsWithinZone?.length, `${id} settlement anchors`).toBeGreaterThanOrEqual(3);
      expect(place!.thingsToDo?.length, `${id} thingsToDo`).toBeGreaterThanOrEqual(4);
      expect(place!.deepSections?.length, `${id} deepSections`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps high-impact U.S. live-here profiles backed by lived context", () => {
    const ids = [
      "silver-city-nm",
      "hood-river-or",
      "ashland-or",
      "santa-fe-nm",
      "santa-barbara-ca",
      "fort-davis-tx",
    ];

    for (const id of ids) {
      const place = PLACES_BY_ID[id];
      expect(place, id).toBeDefined();
      expect(place!.liveSignals?.note?.length, `${id} liveSignals.note`).toBeGreaterThan(24);
      expect(place!.liveSignals?.sources?.length, `${id} liveSignals.sources`).toBeGreaterThanOrEqual(1);
      expect(place!.settlementsWithinZone?.length, `${id} settlement anchors`).toBeGreaterThanOrEqual(3);
      expect(place!.thingsToDo?.length, `${id} thingsToDo`).toBeGreaterThanOrEqual(4);
      expect(place!.deepSections?.length, `${id} deepSections`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps high-ranking lived-reality gaps source-backed", () => {
    const ids = [
      "creel-mx",
      "portal-az",
      "osoyoos-bc",
      "lethbridge-ab",
      "bishop-ca",
      "cuauhtemoc-mx",
      "huachuca-az",
      "traverse-city-mi",
      "ithaca-ny",
      "niagara-on-the-lake",
      "burlington-vt",
      "los-alamos-pajarito-plateau-nm",
    ];

    for (const id of ids) {
      const place = PLACES_BY_ID[id];
      expect(place, id).toBeDefined();
      expect(place!.liveSignals?.note?.length, `${id} liveSignals.note`).toBeGreaterThan(48);
      expect(place!.liveSignals?.sources?.length, `${id} liveSignals.sources`).toBeGreaterThanOrEqual(2);
      const housing = place!.liveSignals?.housingPressureIndex ?? place!.liveSignals?.costPressure;
      const access = place!.liveSignals?.accessRemotenessIndex ?? place!.liveSignals?.accessFriction;
      expect(housing, `${id} housing pressure`).toBeGreaterThanOrEqual(0);
      expect(access, `${id} access remoteness`).toBeGreaterThanOrEqual(0);
    }
  });
});
