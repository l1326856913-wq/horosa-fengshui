import type { GanZhi } from "@soul-atelier/core";
import { solarToLunar } from "./meeus-lunar.ts";
import { meeusFourPillars, meeusSolarYear } from "./meeus-pillars.ts";
import { pureJQSinceSpring } from "./meeus-solar-terms.ts";
import type { CalendarEngine, FourPillars, LunarDate } from "./types.ts";

export interface MeeusEngine extends CalendarEngine {
  /**
   * 節氣 JDs from 立春 of `year` (indices 0..23 = 立春…大寒; 24..25 carry the
   * following 立春/雨水), in the engine's civil frame.
   */
  solarTerms(year: number): Float64Array;
  /** Lunar date (Chinese numerals). Day-granular; GMT+8-based like the original. */
  solarToLunar(year: number, month: number, day: number): LunarDate;
}

/**
 * Clean-room Meeus engine (perturbation series + ΔT), ported from qimen-modern —
 * the implementation whose output is parity-locked to the legacy qimen oracle.
 *
 * Unlike the tyme engine (fixed CST frame), the civil timezone is an explicit
 * constructor argument: `meeusEngine(480)` reproduces the oracle's baked GMT+8.
 * Conventions: year rolls at 立春, month at each 節, day at 23:00 (子初換日) —
 * measured to agree with the tyme engine everywhere except within ≤2 minutes
 * after a 節 instant, where the engines' term times differ slightly
 * (see CROSS-ENGINE.md and the cross-engine suite).
 */
export function meeusEngine(tzOffsetMinutes: number): MeeusEngine {
  return {
    fourPillars(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
    ): FourPillars {
      return meeusFourPillars(year, month, day, hour, minute, tzOffsetMinutes);
    },
    yearPillar(year: number, month: number, day: number): GanZhi {
      return meeusFourPillars(year, month, day, 12, 0, tzOffsetMinutes).year;
    },
    solarYear(year: number, month: number, day: number): number {
      return meeusSolarYear(year, month, day, 12, 0, tzOffsetMinutes);
    },
    solarTerms(year: number): Float64Array {
      return pureJQSinceSpring(year, tzOffsetMinutes);
    },
    solarToLunar,
  };
}
