/**
 * Solar → lunar (農曆) date conversion, ported from qimen-modern's clean-room
 * reimplementation of the legacy `QIMEN_STAR.Solar2Lunar`. Uses true new-moon
 * instants and 中氣 placement to assign lunar months (including leap months).
 *
 * The original is hard-wired to GMT+8 (`+1/3` day), independent of input; the
 * 節氣 base is therefore reused via {@link getAdjustedJQ} at the GMT+8 offset.
 * Lunar dates are day-granular, so timezone is immaterial here.
 */

import { dateToJulianDay2 } from "./meeus-julian.ts";
import { deltaT, getAdjustedJQ } from "./meeus-solar-terms.ts";
import type { LunarDate } from "./types.ts";

const SYNMONTH = 29.530588853;
const GMT8 = 480;
const RAD = Math.PI / 180;

const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const TEN_DIGITS = ["", "十", "二十", "三十"];

/** Julian Day for a date at hour `hr` (allows day 0; no 1582-gap guard needed here). */
function jdays(year: number, month: number, day: number, hr: number): number {
  return dateToJulianDay2(year, month, day) + hr / 24;
}

/** 16 中氣 (solstice-anchored) JDs into `jdzq[0..15]`. */
function getZQsinceWinterSolstice(year: number, jdzq: Float64Array): void {
  const dj = new Float64Array(28);
  getAdjustedJQ(year - 1, 18, 5, dj, GMT8);
  jdzq[0] = dj[19]!;
  jdzq[1] = dj[21]!;
  jdzq[2] = dj[23]!;
  getAdjustedJQ(year, 0, 26, dj, GMT8);
  for (let i = 1; i <= 13; i++) {
    jdzq[i + 2] = dj[2 * i - 1]!;
  }
}

/** Index k of the mean new moon at or before `jd`, counted from 2000-01-06. */
function meanNewMoon(jd: number): number {
  return Math.floor((jd - 2451550.09765) / SYNMONTH);
}

/** True (perturbed) new-moon JD for lunation index k. */
function trueNewMoon(k: number): number {
  const jdt = 2451550.09765 + k * SYNMONTH;
  const t = (jdt - 2451545) / 36525;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const pt = jdt + 0.0001337 * t2 - 0.00000015 * t3 + 0.00000000073 * t4;
  const m = 2.5534 + 29.10535669 * k - 0.0000218 * t2 - 0.00000011 * t3;
  const mprime = 201.5643 + 385.81693528 * k + 0.0107438 * t2 + 0.00001239 * t3 - 0.000000058 * t4;
  const f = 160.7108 + 390.67050274 * k - 0.0016341 * t2 - 0.00000227 * t3 + 0.000000011 * t4;
  const omega = 124.7746 - 1.5637558 * k + 0.0020691 * t2 + 0.00000215 * t3;
  const es = 1 - 0.002516 * t - 0.0000074 * t2;

  let apt1 = -0.4072 * Math.sin(RAD * mprime);
  apt1 += 0.17241 * es * Math.sin(RAD * m);
  apt1 += 0.01608 * Math.sin(RAD * 2 * mprime);
  apt1 += 0.01039 * Math.sin(RAD * 2 * f);
  apt1 += 0.00739 * es * Math.sin(RAD * (mprime - m));
  apt1 -= 0.00514 * es * Math.sin(RAD * (mprime + m));
  apt1 += 0.00208 * es * es * Math.sin(RAD * (2 * m));
  apt1 -= 0.00111 * Math.sin(RAD * (mprime - 2 * f));
  apt1 -= 0.00057 * Math.sin(RAD * (mprime + 2 * f));
  apt1 += 0.00056 * es * Math.sin(RAD * (2 * mprime + m));
  apt1 -= 0.00042 * Math.sin(RAD * 3 * mprime);
  apt1 += 0.00042 * es * Math.sin(RAD * (m + 2 * f));
  apt1 += 0.00038 * es * Math.sin(RAD * (m - 2 * f));
  apt1 -= 0.00024 * es * Math.sin(RAD * (2 * mprime - m));
  apt1 -= 0.00017 * Math.sin(RAD * omega);
  apt1 -= 0.00007 * Math.sin(RAD * (mprime + 2 * m));
  apt1 += 0.00004 * Math.sin(RAD * (2 * mprime - 2 * f));
  apt1 += 0.00004 * Math.sin(RAD * (3 * m));
  apt1 += 0.00003 * Math.sin(RAD * (mprime + m - 2 * f));
  apt1 += 0.00003 * Math.sin(RAD * (2 * mprime + 2 * f));
  apt1 -= 0.00003 * Math.sin(RAD * (mprime + m + 2 * f));
  apt1 += 0.00003 * Math.sin(RAD * (mprime - m + 2 * f));
  apt1 -= 0.00002 * Math.sin(RAD * (mprime - m - 2 * f));
  apt1 -= 0.00002 * Math.sin(RAD * (3 * mprime + m));
  apt1 += 0.00002 * Math.sin(RAD * (4 * mprime));

  let apt2 = 0.000325 * Math.sin(RAD * (299.77 + 0.107408 * k - 0.009173 * t2));
  apt2 += 0.000165 * Math.sin(RAD * (251.88 + 0.016321 * k));
  apt2 += 0.000164 * Math.sin(RAD * (251.83 + 26.651886 * k));
  apt2 += 0.000126 * Math.sin(RAD * (349.42 + 36.412478 * k));
  apt2 += 0.00011 * Math.sin(RAD * (84.66 + 18.206239 * k));
  apt2 += 0.000062 * Math.sin(RAD * (141.74 + 53.303771 * k));
  apt2 += 0.00006 * Math.sin(RAD * (207.14 + 2.453732 * k));
  apt2 += 0.000056 * Math.sin(RAD * (154.84 + 7.30686 * k));
  apt2 += 0.000047 * Math.sin(RAD * (34.52 + 27.261239 * k));
  apt2 += 0.000042 * Math.sin(RAD * (207.19 + 0.121824 * k));
  apt2 += 0.00004 * Math.sin(RAD * (291.34 + 1.844379 * k));
  apt2 += 0.000037 * Math.sin(RAD * (161.72 + 24.198154 * k));
  apt2 += 0.000035 * Math.sin(RAD * (239.56 + 25.513099 * k));
  apt2 += 0.000023 * Math.sin(RAD * (331.55 + 3.592518 * k));

  return pt + apt1 + apt2;
}

/** 16 new-moon JDs from the 冬至 month into `jdnm[0..15]`. */
function getSMsinceWinterSolstice(year: number, jdws: number, jdnm: Float64Array): void {
  const spcjd = jdays(year - 1, 11, 0, 0);
  const kn = meanNewMoon(spcjd);
  const tjd = new Float64Array(20);
  for (let i = 0; i <= 19; i++) {
    tjd[i] = trueNewMoon(kn + i) + 1 / 3 - deltaT(year, i - 1) / 1440;
  }
  let jj = 0;
  for (let j = 0; j <= 18; j++) {
    if (Math.floor(tjd[j]! + 0.5) > Math.floor(jdws + 0.5)) {
      jj = j;
      break;
    }
  }
  for (let k = 0; k <= 15; k++) {
    jdnm[k] = tjd[jj - 1 + k]!;
  }
}

/** Assign lunar month codes (冬月=0, 臘月=1, 正月=2, …; leap months add 0.5). */
function lunarMonthCodes(
  year: number,
  jdzq: Float64Array,
  jdnm: Float64Array,
  mc: Float64Array,
): void {
  getZQsinceWinterSolstice(year, jdzq);
  getSMsinceWinterSolstice(year, jdzq[0]!, jdnm);
  let yz = 0;
  if (Math.floor(jdzq[12]! + 0.5) >= Math.floor(jdnm[13]! + 0.5)) {
    for (let i = 1; i <= 14; i++) {
      const isLeap =
        jdnm[i]! + 0.5 > Math.floor(jdzq[i - 1 - yz]! + 0.5) &&
        Math.floor(jdnm[i + 1]! + 0.5) <= Math.floor(jdzq[i - yz]! + 0.5);
      if (isLeap) {
        mc[i] = i - 0.5;
        yz = 1;
      } else {
        mc[i] = i - yz;
      }
    }
  } else {
    for (let i = 0; i <= 12; i++) mc[i] = i;
    for (let i = 13; i <= 14; i++) {
      const isLeap =
        jdnm[i]! + 0.5 > Math.floor(jdzq[i - 1 - yz]! + 0.5) &&
        Math.floor(jdnm[i + 1]! + 0.5) <= Math.floor(jdzq[i - yz]! + 0.5);
      if (isLeap) {
        mc[i] = i - 0.5;
        yz = 1;
      } else {
        mc[i] = i - yz;
      }
    }
  }
}

function chineseNumber(value: number): string {
  const chars = String(value).split("");
  if (chars.length === 1) {
    return DIGITS[Number.parseInt(chars[0]!, 10)]!;
  }
  let out = TEN_DIGITS[Number.parseInt(chars[0]!, 10)]!;
  const ones = DIGITS[Number.parseInt(chars[1]!, 10)]!;
  if (ones !== "零") out += ones;
  return out;
}

function chineseYear(value: number): string {
  let out = "";
  for (const ch of String(value)) {
    out += DIGITS[Number.parseInt(ch, 10)]!;
  }
  return out;
}

/** Convert a Gregorian date to its lunar year/month/day (Chinese numerals). */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  if (year < -1000 || year > 3000) {
    throw new RangeError(`solarToLunar: year out of supported range: ${year}`);
  }
  const jdzq = new Float64Array(16);
  const jdnm = new Float64Array(16);
  const mc = new Float64Array(15);
  lunarMonthCodes(year, jdzq, jdnm, mc);

  const jdx = jdays(year, month, day, 12);
  let flag = 0;
  if (Math.floor(jdx) < Math.floor(jdnm[0]! + 0.5)) {
    flag = 1;
    lunarMonthCodes(year - 1, jdzq, jdnm, mc);
  }

  let mi = 0;
  for (let i = 0; i <= 14; i++) {
    if (
      Math.floor(jdx) >= Math.floor(jdnm[i]! + 0.5) &&
      Math.floor(jdx) < Math.floor(jdnm[i + 1]! + 0.5)
    ) {
      mi = i;
      break;
    }
  }

  const dz = Math.floor(jdx) - Math.floor(jdnm[mi]! + 0.5) + 1;
  const yi = mc[mi]! < 2 || flag === 1 ? year - 1 : year;
  const mis = (Math.floor(mc[mi]! + 10) % 12) + 1;

  return {
    year: chineseYear(yi),
    month: chineseNumber(mis),
    day: chineseNumber(dz),
  };
}
