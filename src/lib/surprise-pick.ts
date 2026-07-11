import type { Place } from "../types";
import type { RankingResult } from "./scoring";

/**
 * Weighted discovery pick from the current ranked Explorer pool.
 * Favors microclimate uniqueness (and hidden-gem signal), and prefers
 * places the reader has not opened recently when alternatives exist.
 */
export function pickSurprisePlaceId(
  ranked: readonly RankingResult[],
  recentIds: readonly string[],
  random: () => number = Math.random,
): string | null {
  if (ranked.length === 0) return null;

  const recent = new Set(recentIds);
  const fresh = ranked.filter(row => !recent.has(row.place.id));
  const pool = fresh.length > 0 ? fresh : ranked;

  const weights = pool.map(row => surpriseWeight(row.place));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    const idx = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    return pool[idx]!.place.id;
  }

  let cursor = random() * total;
  for (let i = 0; i < pool.length; i++) {
    cursor -= weights[i]!;
    if (cursor < 0) return pool[i]!.place.id;
  }
  return pool[pool.length - 1]!.place.id;
}

function surpriseWeight(place: Place): number {
  const uniqueness = Math.max(0, place.scores.microclimateUniqueness);
  const gem = Math.max(0, place.scores.hiddenGem);
  // Uniqueness dominates; hidden-gem gives a lighter discovery boost.
  return 8 + uniqueness * 1.35 + gem * 0.35;
}
