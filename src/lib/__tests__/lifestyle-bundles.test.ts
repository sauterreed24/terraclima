import { describe, expect, it } from "vitest";
import { applyLifestyleBundle, lifestyleBundleById } from "../lifestyle-bundles";
import { createEmptyFilterState, type FilterState, type RankingProfile } from "../scoring";

function applyBundle(bundleId: string, initial: FilterState, initialRanking: RankingProfile = "hidden-gems") {
  const bundle = lifestyleBundleById(bundleId);
  if (!bundle) throw new Error(`missing bundle ${bundleId}`);
  let filters = initial;
  let ranking = initialRanking;
  applyLifestyleBundle(
    bundle,
    next => { ranking = next; },
    updater => { filters = typeof updater === "function" ? updater(filters) : updater; },
  );
  return { filters, ranking };
}

describe("applyLifestyleBundle geography scope", () => {
  it("clears region and terrain filters when switching to a path without geography scope", () => {
    const scoped = applyBundle("mexico-southwest", createEmptyFilterState());
    expect(scoped.filters.countries).toEqual(new Set(["USA", "Mexico"]));
    expect(scoped.filters.archetypes.size).toBe(6);

    const retirement = applyBundle("retirement", scoped.filters, scoped.ranking);

    expect(retirement.ranking).toBe("best-retirement");
    expect(retirement.filters.countries).toEqual(new Set());
    expect(retirement.filters.archetypes).toEqual(new Set());
    expect(retirement.filters.fitPresets).toEqual(new Set(["mild-winters"]));
  });
});
