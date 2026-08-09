/**
 * Daymet calendar helpers.
 *
 * Daymet years always have exactly 365 days. Leap days (Feb 29) are included;
 * December 31 is discarded in leap years (yday 365 = Dec 30 in leap years).
 */

export function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Month index 0..11 for a Daymet yday (1..365) in a given year. */
export function daymetYdayToMonthIndex(year: number, yday: number): number {
  if (yday < 1 || yday > 365) {
    throw new Error(`Daymet yday out of range: ${yday}`);
  }
  const leap = isGregorianLeapYear(year);
  // Cumulative days at month ends for non-leap / leap (with Dec 31 dropped in leap).
  // Non-leap: standard. Leap: Feb has 29, and there is no Dec 31 → still 365 days.
  const monthEnds = leap
    ? [31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 365]
    : [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  for (let m = 0; m < 12; m++) {
    if (yday <= monthEnds[m]!) return m;
  }
  throw new Error(`Failed to map yday ${yday}`);
}

/** Days expected in each month for a Daymet year (leap Dec has 30 days). */
export function daymetDaysInMonth(year: number): number[] {
  const leap = isGregorianLeapYear(year);
  return leap
    ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 30]
    : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
}

export function assertExactly365(rows: { year: number; yday: number }[], year: number): void {
  const forYear = rows.filter(r => r.year === year);
  if (forYear.length !== 365) {
    throw new Error(`Year ${year}: expected 365 Daymet rows, got ${forYear.length}`);
  }
  const ydays = new Set(forYear.map(r => r.yday));
  if (ydays.size !== 365) {
    throw new Error(`Year ${year}: duplicate or missing ydays`);
  }
  for (let d = 1; d <= 365; d++) {
    if (!ydays.has(d)) throw new Error(`Year ${year}: missing yday ${d}`);
  }
}
