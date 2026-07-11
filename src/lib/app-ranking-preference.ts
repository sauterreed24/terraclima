/**
 * localStorage persistence for ranking profile selection.
 * Kept separate from UI so defaults and validation stay testable.
 */

import type { RankingProfile } from "./scoring";
import { ALL_RANKING_PROFILES } from "./ranking-options";

export { ALL_RANKING_PROFILES } from "./ranking-options";

export const RANKING_STORAGE_KEY = "terraclima.ranking.v1";

const PROFILE_SET = new Set<string>(ALL_RANKING_PROFILES);

/** Cold-start Explorer ranking — uniqueness discovery, not relocation screening. */
export const DEFAULT_RANKING: RankingProfile = "most-unique";

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
