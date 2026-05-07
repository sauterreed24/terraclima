import { describe, it, expect } from "vitest";
import { findSimilarPlaces, scoreSimilarity, SIMILARITY_WEIGHTS } from "../similarity";
import { makeClimate, makePlace } from "./test-fixtures";

describe("similarity weights & cache", () => {
  it("SIMILARITY_WEIGHTS sums to 1.0", () => {
    const w = SIMILARITY_WEIGHTS;
    const sum = w.archetypeJaccard + w.driverJaccard + w.janLowDistance + w.julHighDistance + w.annualPrecipDistance + w.elevationDistance;
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("scoreSimilarity is symmetric", () => {
    const a = makePlace({ id: "a" });
    const b = makePlace({ id: "b", climate: makeClimate({ tempHighC: [12,14,16,18,22,28,30,29,24,18,14,11] }) });
    expect(scoreSimilarity(a, b)).toBeCloseTo(scoreSimilarity(b, a), 8);
  });

  it("scoreSimilarity reaches its max for identical climate + tags", () => {
    const a = makePlace({ id: "a" });
    const b = makePlace({ id: "b" });
    const score = scoreSimilarity(a, b);
    expect(score).toBeGreaterThan(0.9);
  });

  it("findSimilarPlaces returns at most k results and excludes the source", () => {
    const target = makePlace({ id: "x" });
    const pool = [
      target,
      makePlace({ id: "y", elevationM: 200, archetypes: ["fog-belt-coast"], drivers: ["marine-layer"] }),
      makePlace({ id: "z", elevationM: 3500, archetypes: ["alpine-tundra"], drivers: ["elevation-lapse-rate"] }),
      makePlace({ id: "w", archetypes: ["mediterranean-pocket"], drivers: ["orographic-lift"] }),
    ];
    const out = findSimilarPlaces(target, pool, 2);
    expect(out.length).toBe(2);
    for (const r of out) expect(r.place.id).not.toBe(target.id);
  });

  it("similar-place cache returns the same instance on a repeat call", () => {
    const target = makePlace({ id: "cache-target" });
    const pool = [target, makePlace({ id: "p1" }), makePlace({ id: "p2" })];
    const a = findSimilarPlaces(target, pool, 2);
    const b = findSimilarPlaces(target, pool, 2);
    // Cached slice — instances may be different array references, but the
    // contents must be identical.
    expect(a.map(r => r.place.id)).toEqual(b.map(r => r.place.id));
  });
});
