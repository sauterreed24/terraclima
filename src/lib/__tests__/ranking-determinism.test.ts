import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { rankLivabilityWithBreakdown } from "../livability-score";
import { assessLiveFit, type LiveFitPresetId } from "../live-fit";
import { buildComfortPrecisionProfile } from "../comfort-precision";
import { rankPlaces } from "../scoring";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";
import { runScenarioRanking } from "../climate-processor";
import type { ScenarioRankRequest } from "../../types/worker";
import type { ValidatedFilterInput } from "../scoring";

const flat = (v: number): Monthly12 => Array(12).fill(v) as unknown as Monthly12;

const emptyFilters: ValidatedFilterInput = {
  countries: [],
  archetypes: [],
  fitPresets: [],
  search: "",
  maxSummerHighC: null,
  minWinterLowC: null,
  minGrowability: null,
  maxFireRisk: null,
  maxOverallRisk: null,
};

/**
 * Deterministic stability guards. These lock in the invariant the rest of the
 * codebase relies on: ranking output must be a pure function of the *set* of
 * inputs, never of corpus insertion order, Set iteration order, or the engine's
 * sort-stability happening to line up. A regression here silently reshuffles
 * the hero shortlist or a place's surfaced badges between sessions.
 */
describe("ranking determinism", () => {
  describe("rankLivabilityWithBreakdown", () => {
    it("breaks tied scores by name, not by input order", () => {
      // Identical data ⇒ identical livability score ⇒ a genuine tie.
      const zPlace = makePlace({ id: "zzz", name: "Zzz Harbor" });
      const aPlace = makePlace({ id: "aaa", name: "Aaa Harbor" });

      const forward = rankLivabilityWithBreakdown([zPlace, aPlace]);
      const reversed = rankLivabilityWithBreakdown([aPlace, zPlace]);

      expect(forward[0]!.score).toBe(forward[1]!.score); // confirm it really ties
      expect(forward.map(r => r.place.id)).toEqual(["aaa", "zzz"]);
      expect(reversed.map(r => r.place.id)).toEqual(["aaa", "zzz"]);
    });

    it("breaks same-name ties by unique id (real corpus case: two 'Durango' entries)", () => {
      // name.localeCompare returns 0 for identical names, so without the id
      // tiebreaker these would fall back to insertion order.
      const durangoMx = makePlace({ id: "durango-mx", name: "Durango" });
      const durangoCo = makePlace({ id: "durango-co", name: "Durango" });

      const forward = rankLivabilityWithBreakdown([durangoMx, durangoCo]);
      const reversed = rankLivabilityWithBreakdown([durangoCo, durangoMx]);

      expect(forward.map(r => r.place.id)).toEqual(["durango-co", "durango-mx"]);
      expect(reversed.map(r => r.place.id)).toEqual(["durango-co", "durango-mx"]);
    });

    it("is independent of the corpus order it is handed", () => {
      const base = rankLivabilityWithBreakdown(PLACES).map(r => `${r.place.id}:${r.score}`);

      const reversed = rankLivabilityWithBreakdown([...PLACES].reverse()).map(r => `${r.place.id}:${r.score}`);
      const byId = rankLivabilityWithBreakdown(
        [...PLACES].sort((a, b) => a.id.localeCompare(b.id)),
      ).map(r => `${r.place.id}:${r.score}`);

      expect(reversed).toEqual(base);
      expect(byId).toEqual(base);
    });
  });

  describe("assessLiveFit", () => {
    it("ignores fitPresets Set insertion order (cache key + computation)", () => {
      // Distinct place objects with identical data ⇒ separate cache entries, so
      // this exercises the computation path, not just a shared cache hit.
      const p1 = makePlace({ id: "p1", name: "Place One" });
      const p2 = makePlace({ id: "p2", name: "Place Two" });

      const ascending = new Set<LiveFitPresetId>(["cool-summers", "dry-air", "gardenable"]);
      const scrambled = new Set<LiveFitPresetId>(["gardenable", "cool-summers", "dry-air"]);

      const a = assessLiveFit(p1, { fitPresets: ascending });
      const b = assessLiveFit(p2, { fitPresets: scrambled });

      expect(a.score).toBe(b.score);
      expect(a.badges).toEqual(b.badges);
      expect(a.reasons).toEqual(b.reasons);
      expect(a.cautions).toEqual(b.cautions);
    });

    it("surfaces preset badges in canonical (UI list) order", () => {
      const place = makePlace();
      // gardenable is declared after cool-summers, so however the Set is built
      // the "Cool" badge must precede the "Garden" badge.
      const fit = assessLiveFit(place, { fitPresets: new Set<LiveFitPresetId>(["gardenable", "cool-summers"]) });
      const cool = fit.badges.indexOf("Cool");
      const garden = fit.badges.indexOf("Garden");
      expect(cool).toBeGreaterThanOrEqual(0);
      expect(garden).toBeGreaterThanOrEqual(0);
      expect(cool).toBeLessThan(garden);
    });
  });

  describe("buildComfortPrecisionProfile", () => {
    it("resolves tied months to the earliest calendar month", () => {
      // A perfectly flat year makes every month's apparent high identical, so
      // the explicit `a.index - b.index` tiebreaker must pick January.
      const place = makePlace({
        climate: makeClimate({ tempHighC: flat(26), tempLowC: flat(16), humidity: flat(55) }),
      });
      // peak apparent-high and sleep-recovery are flat across the year here, so
      // both ties must resolve to the earliest month (January, index 0).
      const profile = buildComfortPrecisionProfile(place);
      expect(profile.peakMonth.index).toBe(0);
      expect(profile.sleepRecoveryMonth.index).toBe(0);
    });
  });

  describe("rankPlaces", () => {
    it("breaks same-name ties by unique id (real corpus case: two 'Durango' entries)", () => {
      const climate = makeClimate();
      const durangoMx = makePlace({ id: "durango-mx", name: "Durango", climate });
      const durangoCo = makePlace({ id: "durango-co", name: "Durango", climate });

      const forward = rankPlaces("coolest-summers", [durangoMx, durangoCo]);
      const reversed = rankPlaces("coolest-summers", [durangoCo, durangoMx]);

      expect(forward[0]!.score).toBe(forward[1]!.score);
      expect(forward.map(r => r.place.id)).toEqual(["durango-co", "durango-mx"]);
      expect(reversed.map(r => r.place.id)).toEqual(["durango-co", "durango-mx"]);
    });

    it("is independent of direct pool input order", () => {
      const zPlace = makePlace({ id: "zzz", name: "Zzz Harbor" });
      const aPlace = makePlace({ id: "aaa", name: "Aaa Harbor" });

      const forward = rankPlaces("most-comfortable", [zPlace, aPlace]).map(r => r.place.id);
      const reversed = rankPlaces("most-comfortable", [aPlace, zPlace]).map(r => r.place.id);

      expect(reversed).toEqual(forward);
    });
  });

  describe("scenario ranking pipeline (project → filter → rank)", () => {
    it("produces identical ranked rows regardless of input pool order under a future scenario", () => {
      // Exercises the full orchestrator used by both the worker and sync fallback
      // when a climate projection (scn≠now) is active. The projected pool + ranking
      // must remain a pure function of the *set* of places/filters, not iteration order.
      const ids = PLACES.slice(0, 40).map(p => p.id); // representative slice for speed

      const reqBase: Omit<ScenarioRankRequest, "poolIds"> = {
        requestId: 1,
        scenario: "ssp585",
        filters: emptyFilters,
        ranking: "hidden-gems",
        nowEpochMs: Date.UTC(2026, 4, 30), // fixed for determinism
      };

      const forward = runScenarioRanking({ ...reqBase, poolIds: ids });
      const reversed = runScenarioRanking({ ...reqBase, poolIds: [...ids].reverse() });
      const byId = runScenarioRanking({
        ...reqBase,
        poolIds: [...ids].sort((a, b) => a.localeCompare(b)),
      });

      expect(forward.rows.map(r => r.id)).toEqual(reversed.rows.map(r => r.id));
      expect(forward.rows.map(r => r.id)).toEqual(byId.rows.map(r => r.id));
      // Scores must also match exactly (pure projection + deterministic rank).
      expect(forward.rows.map(r => `${r.id}:${r.score}`)).toEqual(reversed.rows.map(r => `${r.id}:${r.score}`));
    });

    it("best-this-month respects nowEpochMs for month-specific notes", () => {
      const jan = runScenarioRanking({
        type: "scenario-rank",
        requestId: 2,
        scenario: "now",
        filters: emptyFilters,
        ranking: "best-this-month",
        poolIds: ["sequim-wa"],
        nowEpochMs: Date.UTC(2026, 0, 15),
      });
      const may = runScenarioRanking({
        type: "scenario-rank",
        requestId: 3,
        scenario: "now",
        filters: emptyFilters,
        ranking: "best-this-month",
        poolIds: ["sequim-wa"],
        nowEpochMs: Date.UTC(2026, 4, 15),
      });

      expect(jan.rows[0]?.note).toMatch(/^Jan:/);
      expect(may.rows[0]?.note).toMatch(/^May:/);
      expect(jan.rows[0]?.note).not.toEqual(may.rows[0]?.note);
    });
  });
});
