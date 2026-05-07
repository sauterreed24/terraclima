/**
 * Cheap, deterministic place-to-place similarity.
 *
 * Optimized for detail-panel "Places that feel similar" suggestions:
 * - One O(N) pass over the ~210-place corpus, results memoised per source.
 * - Pure arithmetic on already-loaded fields. No third-party deps.
 * - Stable tiebreak (by id) so results don't shuffle across renders.
 *
 * Weights are exposed as `SIMILARITY_WEIGHTS` for transparency and tuning.
 * Earlier versions placed 60% on archetype/driver Jaccard; that produced
 * suggestions that shared a label but felt climatically unrelated. The
 * current blend keeps archetype overlap as the largest single signal but
 * gives climate-distance and elevation enough weight to keep the recs
 * physically grounded.
 */

import type { Place } from "../types";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "./climate-metrics";

export interface SimilarPlace {
  place: Place;
  score: number;
}

/** Tunable weights — must sum to 1.0 (verified by tests). */
export const SIMILARITY_WEIGHTS = {
  archetypeJaccard: 0.32,
  driverJaccard: 0.18,
  janLowDistance: 0.14,
  julHighDistance: 0.14,
  annualPrecipDistance: 0.12,
  elevationDistance: 0.10,
} as const;

/** Decay scales — distances at which the gaussian-like falloff hits e^-1. */
const DECAY_SCALES = {
  janLowC: 22,
  julHighC: 22,
  precipLog: 2.0,
  elevationM: 2400,
} as const;

function jaccard<T>(a: readonly T[], b: readonly T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const sa = new Set(a);
  let inter = 0;
  for (const t of b) if (sa.has(t)) inter++;
  const union = sa.size + b.length - inter;
  return union === 0 ? 0 : inter / union;
}

/** Gaussian-like decay → 1 at zero distance, smooth falloff at `scale`. */
function decay(diff: number, scale: number): number {
  return Math.exp(-(diff * diff) / (scale * scale));
}

export function scoreSimilarity(a: Place, b: Place): number {
  const w = SIMILARITY_WEIGHTS;
  const arch = jaccard(a.archetypes, b.archetypes);
  const driv = jaccard(a.drivers, b.drivers);
  const janDiff = Math.abs(meanJanLow(a) - meanJanLow(b));
  const julDiff = Math.abs(meanSummerHigh(a) - meanSummerHigh(b));
  const precipDiff = Math.abs(Math.log1p(getAnnualPrecipMm(a)) - Math.log1p(getAnnualPrecipMm(b)));
  const elevDiff = Math.abs(a.elevationM - b.elevationM);

  return (
    w.archetypeJaccard * arch +
    w.driverJaccard * driv +
    w.janLowDistance * decay(janDiff, DECAY_SCALES.janLowC) +
    w.julHighDistance * decay(julDiff, DECAY_SCALES.julHighC) +
    w.annualPrecipDistance * decay(precipDiff, DECAY_SCALES.precipLog) +
    w.elevationDistance * decay(elevDiff, DECAY_SCALES.elevationM)
  );
}

/**
 * Memoise per-source results so repeat detail opens for the same place
 * don't re-scan the corpus. Cache is a WeakMap keyed by source identity;
 * pool changes invalidate naturally because the source object stays the
 * same but the ranked output is computed once per session.
 */
const SIMILAR_CACHE = new WeakMap<Place, SimilarPlace[]>();

export function findSimilarPlaces(target: Place, pool: readonly Place[], k = 3): SimilarPlace[] {
  const cached = SIMILAR_CACHE.get(target);
  if (cached) return cached.slice(0, k);
  const scored: SimilarPlace[] = [];
  for (const p of pool) {
    if (p.id === target.id) continue;
    scored.push({ place: p, score: scoreSimilarity(target, p) });
  }
  scored.sort((x, y) => (y.score - x.score) || x.place.id.localeCompare(y.place.id));
  // Cache the top-K best plus enough headroom for callers that ask for more.
  SIMILAR_CACHE.set(target, scored.slice(0, Math.max(k, 8)));
  return scored.slice(0, k);
}
