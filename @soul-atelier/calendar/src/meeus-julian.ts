/**
 * Julian-day helpers. Ported from the legacy engine's `date_to_julian_day2`
 * and `date_to_julian_time`; valid across the Julian/Gregorian cutover (1582).
 */

/** Convert a civil date (no time component) to a Julian Day Number at 00:00. */
export function dateToJulianDay2(year: number, month: number, day: number): number {
  if (year < -400000 || year > 400000) {
    throw new RangeError(`dateToJulianDay2: year out of range: ${year}`);
  }
  const yp = year + Math.floor((month - 3) / 10);

  let init: number;
  let jdy: number;
  const isGregorian =
    year > 1582 || (year === 1582 && month > 10) || (year === 1582 && month === 10 && day >= 15);
  const isJulian =
    year < 1582 || (year === 1582 && month < 10) || (year === 1582 && month === 10 && day <= 4);

  if (isGregorian) {
    init = 1721119.5;
    jdy = Math.floor(yp * 365.25) - Math.floor(yp / 100) + Math.floor(yp / 400);
  } else if (isJulian) {
    init = 1721117.5;
    jdy = Math.floor(yp * 365.25);
  } else {
    // 1582-10-05..14 never existed (Gregorian reform gap).
    throw new RangeError(`dateToJulianDay2: nonexistent date ${year}-${month}-${day}`);
  }

  const mp = Math.floor(month + 9) % 12;
  const jdm = mp * 30 + Math.floor(((mp + 1) * 34) / 57);
  const jdd = day - 1;
  return jdy + jdm + jdd + init;
}

/** Fraction of a day for a wall-clock time. */
export function dateToJulianTime(hour: number, minute: number, second: number): number {
  return (hour * 3600 + minute * 60 + second) / 86400;
}
