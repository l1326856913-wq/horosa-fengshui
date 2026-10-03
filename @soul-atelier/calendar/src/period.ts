import { periodFromYear } from "@soul-atelier/core";
import type { CalendarEngine } from "./types.ts";

/**
 * 三元九运 of a completion/construction date, resolved at the 立春 boundary via
 * `engine`. The 运 rolls with the 干支 year, so a date in the weeks before 立春
 * of a 运-boundary year (…, 2004, 2024, 2044) still belongs to the prior 运 —
 * the correction core's year-only `periodFromYear` documents but cannot make.
 */
export function periodFromDate(
  year: number,
  month: number,
  day: number,
  engine: CalendarEngine,
): number {
  return periodFromYear(engine.solarYear(year, month, day));
}
