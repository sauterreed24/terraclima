import { describe, expect, it } from "vitest";
import { scoreSimilarity, findSimilarPlaces } from "../similarity";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";

describe("scoreSimilarity", () => {
  it("self-similarity is the maximum (sums to 1.0 for identical inputs)", () => {
    const p = makePlace();
    const s = scoreSimilarity(p, p);
    // Weights sum to 1.0 (0.38 + 0.22 + 0.12 + 0.12 + 0.10 + 0.06)
    expect(s).toBeCloseTo(1, 6);
  });
  it("is symmetric", () => {
    const a = makePlace({ id: "a", elevationM: 100, archetypes: ["mediterranean-pocket"] });
    const b = makePlace({ id: "b", elevationM: 1500, archetypes: ["chinook-corridor"] });
    expect(scoreSimilarity(a, b)).toBeCloseTo(scoreSimilarity(b, a), 10);
  });
  it("two places sharing an archetype score higher than two with disjoint archetypes", () => {
    const a = makePlace({ id: "a", archetypes: ["mediterranean-pocket"] });
    const b = makePlace({ id: "b", archetypes: ["mediterranean-pocket"] });
    const c = makePlace({ id: "c", archetypes: ["sky-island-refuge"] });
    expect(scoreSimilarity(a, b)).toBeGreaterThan(scoreSimilarity(a, c));
  });
  it("identical archetypes/drivers but very different climate still scores below 1", () => {
    const a = makePlace({ id: "a" });
    const b = makePlace({
      id: "b",
      archetypes: a.archetypes,
      drivers: a.drivers,
      climate: makeClimate({
        tempHighC: Array(12).fill(40) as Monthly12,
        tempLowC: Array(12).fill(28) as Monthly12,
        annualPrecipMm: 50,
      }),
    });
    const s = scoreSimilarity(a, b);
    expect(s).toBeLessThan(1);
    expect(s).toBeGreaterThan(0);
  });
});

describe("findSimilarPlaces", () => {
  it("excludes the target itself from the results", () => {
    const target = makePlace({ id: "target" });
    const others = [makePlace({ id: "a" }), makePlace({ id: "target" }), makePlace({ id: "b" })];
    const result = findSimilarPlaces(target, others, 5);
    expect(result.find(r => r.place.id === "target")).toBeUndefined();
  });
  it("returns at most k results, sorted by score descending", () => {
    const target = makePlace({ id: "target", archetypes: ["mediterranean-pocket"] });
    const pool = [
      makePlace({ id: "near", archetypes: ["mediterranean-pocket"] }),
      makePlace({ id: "far", archetypes: ["sky-island-refuge"], drivers: ["lake-effect"] }),
      makePlace({ id: "mid", archetypes: ["mediterranean-pocket", "chinook-corridor"] }),
    ];
    const top2 = findSimilarPlaces(target, pool, 2);
    expect(top2.length).toBe(2);
    expect(top2[0].score).toBeGreaterThanOrEqual(top2[1].score);
  });
  it("breaks ties by id (stable sort guarantee)", () => {
    const target = makePlace({ id: "target" });
    const pool = [
      makePlace({ id: "z", archetypes: target.archetypes, drivers: target.drivers, elevationM: target.elevationM }),
      makePlace({ id: "a", archetypes: target.archetypes, drivers: target.drivers, elevationM: target.elevationM }),
    ];
    const result = findSimilarPlaces(target, pool, 2);
    expect(result[0].place.id).toBe("a"); // a < z
  });
});
