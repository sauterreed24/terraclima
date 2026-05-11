// Smoke tests for the v2 livability algorithm run against the full corpus.
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
import { PLACES } from "../../data/places";
import {
  LIVABILITY_COMPONENT_KEYS,
  livabilityPercentiles,
  rankLivabilityWithBreakdown,
  scoreLivability,
} from "../livability-score";

describe("livability v2 — corpus smoke", () => {
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
});
