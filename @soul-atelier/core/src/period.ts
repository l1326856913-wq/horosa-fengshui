/**
 * 三元九运: each 运 spans 20 years; the 180-year cycle restarts at 一运 in 1864.
 *
 *   上元  1运 1864-1883   2运 1884-1903   3运 1904-1923
 *   中元  4运 1924-1943   5运 1944-1963   6运 1964-1983
 *   下元  7运 1984-2003   8运 2004-2023   9运 2024-2043
 *
 * Note: the boundary is technically 立春 of the start year, not Jan 1. This uses
 * the Gregorian year; for a date near 立春 of a 运-boundary year, use calendar's
 * `periodFromDate(y, m, d, engine)`, which resolves the boundary astronomically.
 */
const CYCLE_START = 1864;

export function periodFromYear(year: number): number {
  const offset = Math.floor((year - CYCLE_START) / 20);
  return (((offset % 9) + 9) % 9) + 1;
}

/** Inclusive Gregorian year range of the 运 containing `year`. */
export function periodYearRange(year: number): readonly [number, number] {
  const start = CYCLE_START + Math.floor((year - CYCLE_START) / 20) * 20;
  return [start, start + 19];
}
