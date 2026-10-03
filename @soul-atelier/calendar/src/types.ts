import type { GanZhi } from "@soul-atelier/core";

/** 四柱 of a civil instant. */
export interface FourPillars {
  readonly year: GanZhi;
  readonly month: GanZhi;
  readonly day: GanZhi;
  readonly hour: GanZhi;
}

/** One 时辰 of a day: its pillar and the civil time range it covers. */
export interface HourSlot {
  readonly ganzhi: GanZhi;
  /** 0 (子, starting 23:00 of the previous civil day) … 11 (亥). */
  readonly indexInDay: number;
  /** e.g. "23–01" */
  readonly timeRange: string;
}

/** Pillars and almanac facts of one civil day. */
export interface DayInfo {
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
export interface LunarDate {
  readonly year: string;
  readonly month: string;
  readonly day: string;
}

/** One 大运 decade. */
export interface DecadeFortuneData {
  readonly ganzhi: GanZhi;
  readonly startAge: number;
  readonly endAge: number;
  readonly startYear: number;
}

/** 起运/大运 data derived from the birth instant, gender, and solar-term distances. */
export interface FortunesData {
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
export interface CalendarEngine {
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
