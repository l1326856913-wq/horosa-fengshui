import { BRANCHES, STEMS } from "@soul-atelier/core";
import type { Branch, GanZhi, Stem } from "@soul-atelier/core";
import { dateToJulianDay2, dateToJulianTime } from "./meeus-julian.ts";
import { pureJQSinceSpring } from "./meeus-solar-terms.ts";
import type { FourPillars } from "./types.ts";

function stemAt(index: number): Stem {
  return STEMS[((index % 10) + 10) % 10]!;
}

function branchAt(index: number): Branch {
  return BRANCHES[((index % 12) + 12) % 12]!;
}

function ganZhiAt(cycleIndex: number): GanZhi {
  return { stem: stemAt(cycleIndex), branch: branchAt(cycleIndex) };
}

/**
 * 立春-aware 干支 solar year of an instant: the 節氣 year rolls at 立春, so a
 * date before 立春 belongs to the previous year. Same boundary `meeusFourPillars`
 * applies to the year pillar (lines below), extracted as an integer.
 */
export function meeusSolarYear(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tzOffsetMinutes: number,
): number {
  const jtoday = dateToJulianDay2(year, month, day) + dateToJulianTime(hour, minute, 0);
  if (jtoday < pureJQSinceSpring(year, tzOffsetMinutes)[0]!) return year - 1;
  return year;
}

/**
 * The four pillars for an instant, ported from qimen-modern's clean-room
 * `fourPillars` (itself verified against the legacy oracle's `GetGZ`).
 *
 * Year rolls at 立春, month at each 節 (both resolved astronomically from the
 * 節氣 array). The day pillar applies 子初換日 — the day rolls at 23:00 — and
 * the hour pillar is corrected against the 時辰 of the input hour.
 */
export function meeusFourPillars(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tzOffsetMinutes: number,
): FourPillars {
  const jtoday = dateToJulianDay2(year, month, day) + dateToJulianTime(hour, minute, 0);

  let solarYear = year;
  let jq = pureJQSinceSpring(solarYear, tzOffsetMinutes);
  if (jtoday < jq[0]!) {
    solarYear -= 1;
    jq = pureJQSinceSpring(solarYear, tzOffsetMinutes);
  }

  // 年柱
  const ygz = (((solarYear + 4712 + 24) % 60) + 60) % 60;

  // 月柱 — index of the most recent 節 passed.
  let monthIdx = -1;
  for (let ii = 24; ii > 0; ii--) {
    if (jtoday > jq[ii - 1]!) {
      monthIdx = ii;
      break;
    }
  }
  if (monthIdx < 0) monthIdx = 1;
  if (monthIdx % 2 === 0) monthIdx--;
  monthIdx = Math.floor(monthIdx / 2);
  if (monthIdx === 12) monthIdx = 11;
  const monthStemStart = ((ygz % 10) % 5) * 2 + 2;

  // 日柱 — 子初換日 shift (+1h, half-day frame).
  const jda = jtoday + 0.5;
  const thes = (jda - Math.floor(jda)) * 86400 + 3600;
  const dayjd = Math.floor(jda) + thes / 86400;
  const dgz = ((Math.floor(dayjd + 49) % 60) + 60) % 60;

  // 時柱
  let hgz = ((Math.floor(dayjd * 12 + 48) % 60) + 60) % 60;
  if (Math.ceil(hour / 2) % 12 !== hgz % 12) hgz++;

  return {
    year: ganZhiAt(ygz),
    month: { stem: stemAt(monthStemStart + monthIdx), branch: branchAt(monthIdx + 2) },
    day: ganZhiAt(dgz),
    hour: ganZhiAt(hgz),
  };
}
