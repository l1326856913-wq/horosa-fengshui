import { GanZhi } from "@soul-atelier/core";

//#region src/types.d.ts
/** 四柱 of a civil instant. */
interface FourPillars {
  readonly year: GanZhi;
  readonly month: GanZhi;
  readonly day: GanZhi;
  readonly hour: GanZhi;
}
/** One 时辰 of a day: its pillar and the civil time range it covers. */
interface HourSlot {
  readonly ganzhi: GanZhi;
  /** 0 (子, starting 23:00 of the previous civil day) … 11 (亥). */
  readonly indexInDay: number;
  /** e.g. "23–01" */
  readonly timeRange: string;
}
/** Pillars and almanac facts of one civil day. */
interface DayInfo {
  readonly year: GanZhi;
  readonly month: GanZhi;
  readonly day: GanZhi;
  /** 建除十二神, e.g. "定". */
  readonly duty: string;
  /** Lunar month + day label, e.g. "五月廿八". */
  readonly lunarLabel: string;
  /** Zodiac clashed by the day branch (通书 日冲), e.g. "蛇". */
  readonly chongAnimal: string;
  /** The 12 时辰 starting from 子时. */
  readonly hours: readonly HourSlot[];
}
/** Lunar (農曆) date rendered in Chinese numerals, e.g. { year: "二零二六", month: "五", day: "廿八" }-style. */
interface LunarDate {
  readonly year: string;
  readonly month: string;
  readonly day: string;
}
/** One 大运 decade. */
interface DecadeFortuneData {
  readonly ganzhi: GanZhi;
  readonly startAge: number;
  readonly endAge: number;
  readonly startYear: number;
}
/** 起运/大运 data derived from the birth instant, gender, and solar-term distances. */
interface FortunesData {
  /** 顺行 (yang-year male / yin-year female) or 逆行. */
  readonly forward: boolean;
  /** 起运 age — the first decade's starting age. */
  readonly startAge: number;
  readonly decades: readonly DecadeFortuneData[];
}
/**
 * A calendar engine turns civil dates/instants into pillars. Boundaries follow
 * the classical conventions: the year pillar flips at 立春, the month pillar at
 * each 節. Engines interpret civil time per their own documented frame (the
 * tyme engine uses China Standard Time, tyme4ts's convention); an explicit
 * timezone/policy parameter arrives with the second (Meeus) engine.
 */
interface CalendarEngine {
  fourPillars(year: number, month: number, day: number, hour: number, minute: number): FourPillars;
  /** 年柱 of a birth/completion date, 立春-aware. */
  yearPillar(year: number, month: number, day: number): GanZhi;
  /**
   * 立春-aware 干支 solar year (歲) as an integer — the Gregorian year the 節氣
   * year rolls into at 立春. A January date returns the previous year; the same
   * boundary that flips `yearPillar`. This is the year the 三元九运 period is
   * keyed to (see `periodFromDate`).
   */
  solarYear(year: number, month: number, day: number): number;
}
//#endregion
//#region src/tyme.d.ts
declare function fourPillars(year: number, month: number, day: number, hour: number, minute: number): FourPillars;
declare function yearPillar(year: number, month: number, day: number): GanZhi;
declare function solarYear(year: number, month: number, day: number): number;
declare function dayInfo(year: number, month: number, day: number): DayInfo;
declare function decadeFortunes(year: number, month: number, day: number, hour: number, minute: number, gender: "male" | "female", count?: number): FortunesData;
/**
 * tyme4ts-backed engine. Civil dates are interpreted in China Standard Time
 * (tyme4ts's frame). `dayInfo` and `decadeFortunes` are engine extras beyond
 * CalendarEngine — 建除/lunar/时辰 almanac data and 起运/大运 come from
 * tyme4ts's models.
 */
declare const tymeEngine: {
  fourPillars: typeof fourPillars;
  yearPillar: typeof yearPillar;
  solarYear: typeof solarYear;
  dayInfo: typeof dayInfo;
  decadeFortunes: typeof decadeFortunes;
};
//#endregion
//#region src/meeus.d.ts
interface MeeusEngine extends CalendarEngine {
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
declare function meeusEngine(tzOffsetMinutes: number): MeeusEngine;
//#endregion
//#region src/period.d.ts
/**
 * 三元九运 of a completion/construction date, resolved at the 立春 boundary via
 * `engine`. The 运 rolls with the 干支 year, so a date in the weeks before 立春
 * of a 运-boundary year (…, 2004, 2024, 2044) still belongs to the prior 运 —
 * the correction core's year-only `periodFromYear` documents but cannot make.
 */
declare function periodFromDate(year: number, month: number, day: number, engine: CalendarEngine): number;
//#endregion
//#region src/meeus-julian.d.ts
/**
 * Julian-day helpers. Ported from the legacy engine's `date_to_julian_day2`
 * and `date_to_julian_time`; valid across the Julian/Gregorian cutover (1582).
 */
/** Convert a civil date (no time component) to a Julian Day Number at 00:00. */
declare function dateToJulianDay2(year: number, month: number, day: number): number;
/** Fraction of a day for a wall-clock time. */
declare function dateToJulianTime(hour: number, minute: number, second: number): number;
//#endregion
//#region src/meeus-solar-terms.d.ts
/**
 * Solar-term (節氣) instants, ported from the legacy `JiQi` class
 * (`VE`/`Perturbation`/`DeltaT`/`MeanJQJD`/`GetAdjustedJQ`/`GetPureJQsinceSpring2`).
 *
 * Uses Meeus' perturbation series off the vernal-equinox JD. The single
 * deliberate departure from astronomy: each instant is shifted into the input's
 * civil frame by `tzOffsetMinutes / 1440` days, so the input wall-clock and the
 * term boundaries share one timezone. The legacy code read this offset from the
 * host machine (`getTimezoneOffset`); here it is an explicit argument, making
 * results deterministic. GMT+8 (480) reproduces the original's baked `+1/3` day.
 */
/** Vernal-equinox Julian Day for a given year. */
declare function vernalEquinox(year: number): number;
/** ΔT (minutes): correction from dynamical to universal time. */
declare function deltaT(year: number, month: number): number;
/** Fill `jdjq[ini+1..ini+num]` with perturbation- and ΔT-adjusted 節氣 JDs. */
declare function getAdjustedJQ(year: number, ini: number, num: number, jdjq: Float64Array, tzOffsetMinutes: number): void;
/**
 * The 24 solar terms starting from 立春 of `year`, indexed 0..23
 * (立春, 雨水, 驚蟄, 春分, …, 大寒), as Julian Days in the input's civil frame.
 * Indices 24..25 carry the following 立春/雨水.
 */
declare function pureJQSinceSpring(year: number, tzOffsetMinutes: number): Float64Array;
//#endregion
//#region src/meeus-lunar.d.ts
/** Convert a Gregorian date to its lunar year/month/day (Chinese numerals). */
declare function solarToLunar(year: number, month: number, day: number): LunarDate;
//#endregion
export { type CalendarEngine, type DayInfo, type DecadeFortuneData, type FortunesData, type FourPillars, type HourSlot, type LunarDate, type MeeusEngine, dateToJulianDay2, dateToJulianTime, deltaT, getAdjustedJQ, meeusEngine, periodFromDate, pureJQSinceSpring, solarToLunar, tymeEngine, vernalEquinox };