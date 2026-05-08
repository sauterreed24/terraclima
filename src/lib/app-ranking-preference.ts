/**
 * localStorage persistence for ranking profile selection.
 * Kept separate from UI so defaults and validation stay testable.
 */

import type { RankingProfile } from "./scoring";

export const RANKING_STORAGE_KEY = "terraclima.ranking.v1";

/** Every ranking profile accepted by the scorer — mirrors explorer UI options. */
export const ALL_RANKING_PROFILES: readonly RankingProfile[] = [
  "coolest-summers",
  "mildest-winters",
  "best-shoulder-seasons",
  "driest-air",
  "best-growability",
  "hidden-gems",
  "most-unique",
  "lowest-fire-risk",
  "climate-resilient",
  "best-four-season",
  "best-diurnal-sleep",
  "strongest-geospatial-signal",
  "mediterranean-like",
  "wet-forest-refuges",
  "monsoon-drama",
] as const;

const PROFILE_SET = new Set<string>(ALL_RANKING_PROFILES);

export const DEFAULT_RANKING: RankingProfile = "hidden-gems";

export function loadPersistedRanking(): RankingProfile {
  if (typeof window === "undefined") return DEFAULT_RANKING;
  try {
    const raw = window.localStorage.getItem(RANKING_STORAGE_KEY);
    if (raw && PROFILE_SET.has(raw)) {
      return raw as RankingProfile;
    }
  } catch {
    /* noop */
  }
  return DEFAULT_RANKING;
}

export function persistRankingProfile(profile: RankingProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RANKING_STORAGE_KEY, profile);
  } catch {
    /* noop */
  }
}
