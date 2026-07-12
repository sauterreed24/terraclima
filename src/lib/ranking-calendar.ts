/**
 * Calendar-month anchor for `best-this-month` / Visit-now ranking.
 *
 * Rank notes and PlaceCard climate-bar highlights both use `Date#getMonth()`,
 * so the epoch is local noon on the 1st — stable for the whole calendar month
 * and timezone-safe relative to `getMonth()`.
 */

/** Local noon on the 1st of `now`'s calendar month, as epoch ms. */
export function rankingMonthEpochMs(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0).getTime();
}

/** 0–11 month index for the ranking epoch (same as `new Date(epoch).getMonth()`). */
export function rankingReferenceMonth(nowEpochMs: number): number {
  return new Date(nowEpochMs).getMonth();
}
