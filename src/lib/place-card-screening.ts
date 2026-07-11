/**
 * When PlaceCards should surface livability / live-fit / signature score grids.
 * Discovery rankings stay mechanism-first; screening scores appear once the
 * reader is in an explicit fit or Live Finder path.
 */
import type { RankingProfile } from "./scoring";
import type { LiveFitFilters } from "./live-fit";

/** Rankings that are explicitly about living comfort / fit screening. */
export const PLACE_CARD_SCREENING_RANKINGS = new Set<RankingProfile>([
  "live-fit",
  "most-comfortable",
  "best-for-remote-work",
  "best-retirement",
]);

export function liveFitFiltersActive(filters: LiveFitFilters | null | undefined): boolean {
  if (!filters) return false;
  if ((filters.fitPresets?.size ?? 0) > 0) return true;
  return (
    filters.maxSummerHighC != null
    || filters.minWinterLowC != null
    || filters.minGrowability != null
    || filters.maxFireRisk != null
    || filters.maxOverallRisk != null
  );
}

export function shouldShowPlaceCardScreeningScores(
  ranking: RankingProfile,
  liveFitFilters?: LiveFitFilters | null,
): boolean {
  if (PLACE_CARD_SCREENING_RANKINGS.has(ranking)) return true;
  return liveFitFiltersActive(liveFitFilters);
}
