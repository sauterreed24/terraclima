/**
 * Cheap, deterministic place-to-place similarity.
 *
 * Optimized for detail-panel "Places that feel similar" suggestions:
 * - No precomputation. One O(N) pass over the ~133-place corpus.
 * - Pure arithmetic on already-loaded fields. No third-party deps.
 * - Stable tiebreak (by id) so results don't shuffle across renders.
 *
 * Signals, each normalised to [0, 1] and weighted:
 *   - Shared archetypes (Jaccard):           0.38
 *   - Shared drivers    (Jaccard):           0.22
 *   - Jan-low distance  (exp decay, 25°C):   0.12
 *   - Jul-high distance (exp decay, 25°C):   0.12
 *   - Annual precip distance (log-space):    0.10
 *   - Elevation distance (exp decay, 3000m): 0.06
 *
 * Exact weights don't matter much once the top three are clearly separated;
 * what matters is that archetype overlap is the dominant driver so the
 * suggestions *feel* related rather than merely climatically adjacent.
 */

import type { Place } from "../types";
import { meanJanLow, meanJulyHigh } from "./scoring";

export interface SimilarPlace {
  place: Place;
  score: number;
}

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

function annualPrecip(p: Place): number {
  return p.climate.annualPrecipMm ?? p.climate.precipMm.reduce((a, b) => a + b, 0);
}

export function scoreSimilarity(a: Place, b: Place): number {
  const arch = jaccard(a.archetypes, b.archetypes);
  const driv = jaccard(a.drivers, b.drivers);
  const janDiff = Math.abs(meanJanLow(a) - meanJanLow(b));
  const julDiff = Math.abs(meanJulyHigh(a) - meanJulyHigh(b));
  const pa = annualPrecip(a);
  const pb = annualPrecip(b);
  // log-space precip distance (handles desert vs rainforest gracefully)
  const precipDiff = Math.abs(Math.log1p(pa) - Math.log1p(pb));
  const elevDiff = Math.abs(a.elevationM - b.elevationM);

  return (
    0.38 * arch +
    0.22 * driv +
    0.12 * decay(janDiff, 25) +
    0.12 * decay(julDiff, 25) +
    0.10 * decay(precipDiff, 2.5) +
    0.06 * decay(elevDiff, 3000)
  );
}

export function findSimilarPlaces(target: Place, pool: readonly Place[], k = 3): SimilarPlace[] {
  const scored: SimilarPlace[] = [];
  for (const p of pool) {
    if (p.id === target.id) continue;
    scored.push({ place: p, score: scoreSimilarity(target, p) });
  }
  scored.sort((x, y) => (y.score - x.score) || x.place.id.localeCompare(y.place.id));
  return scored.slice(0, k);
}
