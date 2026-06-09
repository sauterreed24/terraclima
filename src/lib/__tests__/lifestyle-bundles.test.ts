import { describe, expect, it } from "vitest";
import {
  applyLifestyleBundle,
  isBundleActive,
  lifestyleBundleById,
} from "../lifestyle-bundles";
import { createEmptyFilterState, type FilterState } from "../scoring";

function applyBundle(id: string, previous: FilterState): FilterState {
  const bundle = lifestyleBundleById(id);
  if (!bundle) throw new Error(`Missing bundle ${id}`);
  let next = previous;
  applyLifestyleBundle(bundle, () => {}, updater => {
    next = typeof updater === "function" ? updater(previous) : updater;
  });
  return next;
}

describe("lifestyle-bundles geography scope", () => {
  it("clears region and terrain when applying a global path", () => {
    const previous = createEmptyFilterState();
    previous.countries = new Set(["USA", "Mexico"]);
    previous.archetypes = new Set(["sky-island-refuge"]);

    const next = applyBundle("cool-summer-refuge", previous);

    expect(next.countries).toEqual(new Set());
    expect(next.archetypes).toEqual(new Set());
    expect(next.fitPresets).toEqual(new Set(["cool-summers"]));
    expect(next.maxSummerHighC).toBe(26);
  });

  it("requires empty geography for a global path to read as active", () => {
    const bundle = lifestyleBundleById("cool-summer-refuge");
    expect(bundle).toBeTruthy();

    const exact = createEmptyFilterState();
    exact.fitPresets = new Set(["cool-summers"]);
    exact.maxSummerHighC = 26;
    expect(isBundleActive(bundle!, "coolest-summers", exact)).toBe(true);

    const staleScope = createEmptyFilterState();
    staleScope.fitPresets = new Set(["cool-summers"]);
    staleScope.maxSummerHighC = 26;
    staleScope.countries = new Set(["Mexico"]);
    staleScope.archetypes = new Set(["sky-island-refuge"]);
    expect(isBundleActive(bundle!, "coolest-summers", staleScope)).toBe(false);
  });
});
