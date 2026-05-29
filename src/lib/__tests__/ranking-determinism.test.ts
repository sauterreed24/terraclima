import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { rankLivabilityWithBreakdown } from "../livability-score";
import { assessLiveFit, type LiveFitPresetId } from "../live-fit";
import { buildComfortPrecisionProfile } from "../comfort-precision";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";

const flat = (v: number): Monthly12 => Array(12).fill(v) as unknown as Monthly12;

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
});
