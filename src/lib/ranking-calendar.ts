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

export const RANKING_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** True for a 0–11 month index. */
export function isMonthIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 11;
}

/**
 * Epoch for a reader-chosen month (0–11): local noon on the 1st of that month
 * in `now`'s year. The ranking only reads `getMonth()`, so the year is
 * irrelevant; passing a Date in the chosen month lets "Best in February" reuse
 * the same climate-processor path as the calendar month.
 */
export function rankingEpochMsForMonth(monthIndex: number, now: Date = new Date()): number {
  return new Date(now.getFullYear(), monthIndex, 1, 12, 0, 0, 0).getTime();
}

/** Parses the `m=1..12` URL param into a 0–11 month index, or null when invalid. */
export function monthIndexFromParam(raw: string | null | undefined): number | null {
  if (!raw || !/^\d{1,2}$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return n >= 1 && n <= 12 ? n - 1 : null;
}
