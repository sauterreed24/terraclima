import type { RankingProfile } from "./scoring";

/**
 * Explorer “Rank by” options — **single source of truth** for display order and labels.
 * `ALL_RANKING_PROFILES` is derived from this list so localStorage validation never drifts.
 */
export const RANKING_OPTIONS: { id: RankingProfile; label: string }[] = [
  { id: "hidden-gems", label: "Hidden gems" },
  { id: "most-unique", label: "Most unique" },
  { id: "coolest-summers", label: "Coolest summers" },
  { id: "mildest-winters", label: "Mildest winters" },
  { id: "best-shoulder-seasons", label: "Best shoulder seasons" },
  { id: "driest-air", label: "Driest air" },
  { id: "best-growability", label: "Best growability" },
  { id: "lowest-fire-risk", label: "Lowest fire risk" },
  { id: "climate-resilient", label: "Climate-resilient" },
  { id: "best-four-season", label: "Best four-season" },
  { id: "best-diurnal-sleep", label: "Best diurnal / sleep climate" },
  { id: "strongest-geospatial-signal", label: "Strongest geospatial signal" },
  { id: "mediterranean-like", label: "Mediterranean-like" },
  { id: "wet-forest-refuges", label: "Wet-forest refuges" },
  { id: "monsoon-drama", label: "Monsoon drama" },
];

/** Ids in UI order — use for `localStorage` validation and equality checks. */
export const ALL_RANKING_PROFILES: readonly RankingProfile[] = RANKING_OPTIONS.map(o => o.id);
