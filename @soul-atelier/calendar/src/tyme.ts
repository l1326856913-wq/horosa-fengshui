import { ganZhiFromName } from "@soul-atelier/core";
import type { GanZhi } from "@soul-atelier/core";
import { ChildLimit, Gender, SolarDay, SolarTime } from "tyme4ts";
import type { CalendarEngine, DayInfo, FortunesData, FourPillars, HourSlot } from "./types.ts";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function hourTimeRange(indexInDay: number): string {
  const start = (23 + indexInDay * 2) % 24;
  const end = (start + 2) % 24;
  return `${pad(start)}–${pad(end)}`;
}

function fourPillars(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): FourPillars {
  const eightChar = SolarTime.fromYmdHms(year, month, day, hour, minute, 0)
    .getSixtyCycleHour()
    .getEightChar();
  return {
    year: ganZhiFromName(eightChar.getYear().getName()),
    month: ganZhiFromName(eightChar.getMonth().getName()),
    day: ganZhiFromName(eightChar.getDay().getName()),
    hour: ganZhiFromName(eightChar.getHour().getName()),
  };
}

function yearPillar(year: number, month: number, day: number): GanZhi {
  return ganZhiFromName(SolarDay.fromYmd(year, month, day).getSixtyCycleDay().getYear().getName());
}

function solarYear(year: number, month: number, day: number): number {
  return SolarDay.fromYmd(year, month, day)
    .getSixtyCycleDay()
    .getSixtyCycleMonth()
    .getSixtyCycleYear()
    .getYear();
}

function dayInfo(year: number, month: number, day: number): DayInfo {
  const solar = SolarDay.fromYmd(year, month, day);
  const cycleDay = solar.getSixtyCycleDay();
  const lunar = solar.getLunarDay();

  const hours: HourSlot[] = cycleDay.getHours().map((hour) => ({
    ganzhi: ganZhiFromName(hour.getSixtyCycle().getName()),
    indexInDay: hour.getIndexInDay(),
    timeRange: hourTimeRange(hour.getIndexInDay()),
  }));

  return {
    year: ganZhiFromName(cycleDay.getYear().getName()),
    month: ganZhiFromName(cycleDay.getMonth().getName()),
    day: ganZhiFromName(cycleDay.getSixtyCycle().getName()),
    duty: cycleDay.getDuty().getName(),
    lunarLabel: `${lunar.getLunarMonth().getName()}${lunar.getName()}`,
    chongAnimal: cycleDay.getSixtyCycle().getEarthBranch().getOpposite().getZodiac().getName(),
    hours,
  };
}

function decadeFortunes(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: "male" | "female",
  count = 8,
): FortunesData {
  const solarTime = SolarTime.fromYmdHms(year, month, day, hour, minute, 0);
  const cl = ChildLimit.fromSolarTime(solarTime, gender === "male" ? Gender.MAN : Gender.WOMAN);
  const first = cl.getStartDecadeFortune();
  const decades = Array.from({ length: count }, (_, i) => {
    const df = first.next(i);
    return {
      ganzhi: ganZhiFromName(df.getSixtyCycle().getName()),
      startAge: df.getStartAge(),
      endAge: df.getEndAge(),
      startYear: df.getStartSixtyCycleYear().getYear(),
    };
  });
  return { forward: cl.isForward(), startAge: first.getStartAge(), decades };
}

/**
 * tyme4ts-backed engine. Civil dates are interpreted in China Standard Time
 * (tyme4ts's frame). `dayInfo` and `decadeFortunes` are engine extras beyond
 * CalendarEngine — 建除/lunar/时辰 almanac data and 起运/大运 come from
 * tyme4ts's models.
 */
export const tymeEngine = {
  fourPillars,
  yearPillar,
  solarYear,
  dayInfo,
  decadeFortunes,
} satisfies CalendarEngine & { dayInfo: typeof dayInfo; decadeFortunes: typeof decadeFortunes };
