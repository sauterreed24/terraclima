import type { RankingProfile } from "./scoring";

/** Concise first-viewport explanation for the existing comfort ranking. */
export const MOST_COMFORTABLE_LENS_SUMMARY =
  "Ranked by day-to-day comfort: felt temperature, humidity and sky, how many months are usable outdoors, hazards, and everyday cost and access.";

/** Detailed receipt copy kept beside the ranking label to prevent terminology drift. */
export const MOST_COMFORTABLE_LENS_DESCRIPTION =
  "How a place is likely to feel day to day: felt temperature, humidity and sky, usable months, hazards, and cost and access. Mild averages alone do not win.";

/**
 * Explorer “Rank by” options — **single source of truth** for display order and labels.
 * `ALL_RANKING_PROFILES` is derived from this list so localStorage validation never drifts.
 */
export const RANKING_OPTIONS: { id: RankingProfile; label: string }[] = [
  { id: "best-this-month", label: "Best this month" },
  { id: "most-comfortable", label: "Most comfortable" },
  { id: "best-for-remote-work", label: "Remote-work ready" },
  { id: "best-retirement", label: "Best for retirement" },
  { id: "live-fit", label: "Live-here fit" },
  { id: "hidden-gems", label: "Hidden gems" },
  { id: "most-unique", label: "Most unique" },
  { id: "coolest-summers", label: "Coolest summers" },
  { id: "mildest-winters", label: "Mildest winters" },
  { id: "sunniest-winters", label: "Sunniest winters" },
  { id: "best-shoulder-seasons", label: "Best shoulder seasons" },
  { id: "driest-air", label: "Driest air" },
  { id: "best-growability", label: "Best growability" },
  { id: "lowest-fire-risk", label: "Lowest fire risk" },
  { id: "climate-resilient", label: "Climate-resilient" },
  { id: "best-four-season", label: "Best four-season" },
  { id: "best-diurnal-sleep", label: "Coolest nights for sleep" },
  { id: "strongest-geospatial-signal", label: "Strongest terrain signal" },
  { id: "most-continental", label: "Most continental" },
  { id: "driest-growing-season", label: "Driest growing season" },
  { id: "lowest-evaporative-demand", label: "Lowest evaporative demand" },
  { id: "mediterranean-like", label: "Mediterranean-like" },
  { id: "wet-forest-refuges", label: "Wet-forest refuges" },
  { id: "monsoon-drama", label: "Strongest summer monsoon" },
];

/** Ids in UI order — use for `localStorage` validation and equality checks. */
export const ALL_RANKING_PROFILES: readonly RankingProfile[] = RANKING_OPTIONS.map(o => o.id);
