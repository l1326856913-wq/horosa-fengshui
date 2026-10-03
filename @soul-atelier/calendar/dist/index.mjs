import { BRANCHES, STEMS, ganZhiFromName, periodFromYear } from "@soul-atelier/core";
import { ChildLimit, Gender, SolarDay, SolarTime } from "tyme4ts";
//#region src/tyme.ts
function pad(n) {
	return String(n).padStart(2, "0");
}
function hourTimeRange(indexInDay) {
	const start = (23 + indexInDay * 2) % 24;
	const end = (start + 2) % 24;
	return `${pad(start)}–${pad(end)}`;
}
function fourPillars(year, month, day, hour, minute) {
	const eightChar = SolarTime.fromYmdHms(year, month, day, hour, minute, 0).getSixtyCycleHour().getEightChar();
	return {
		year: ganZhiFromName(eightChar.getYear().getName()),
		month: ganZhiFromName(eightChar.getMonth().getName()),
		day: ganZhiFromName(eightChar.getDay().getName()),
		hour: ganZhiFromName(eightChar.getHour().getName())
	};
}
function yearPillar(year, month, day) {
	return ganZhiFromName(SolarDay.fromYmd(year, month, day).getSixtyCycleDay().getYear().getName());
}
function solarYear(year, month, day) {
	return SolarDay.fromYmd(year, month, day).getSixtyCycleDay().getSixtyCycleMonth().getSixtyCycleYear().getYear();
}
function dayInfo(year, month, day) {
	const solar = SolarDay.fromYmd(year, month, day);
	const cycleDay = solar.getSixtyCycleDay();
	const lunar = solar.getLunarDay();
	const hours = cycleDay.getHours().map((hour) => ({
		ganzhi: ganZhiFromName(hour.getSixtyCycle().getName()),
		indexInDay: hour.getIndexInDay(),
		timeRange: hourTimeRange(hour.getIndexInDay())
	}));
	return {
		year: ganZhiFromName(cycleDay.getYear().getName()),
		month: ganZhiFromName(cycleDay.getMonth().getName()),
		day: ganZhiFromName(cycleDay.getSixtyCycle().getName()),
		duty: cycleDay.getDuty().getName(),
		lunarLabel: `${lunar.getLunarMonth().getName()}${lunar.getName()}`,
		chongAnimal: cycleDay.getSixtyCycle().getEarthBranch().getOpposite().getZodiac().getName(),
		hours
	};
}
function decadeFortunes(year, month, day, hour, minute, gender, count = 8) {
	const solarTime = SolarTime.fromYmdHms(year, month, day, hour, minute, 0);
	const cl = ChildLimit.fromSolarTime(solarTime, gender === "male" ? Gender.MAN : Gender.WOMAN);
	const first = cl.getStartDecadeFortune();
	const decades = Array.from({ length: count }, (_, i) => {
		const df = first.next(i);
		return {
			ganzhi: ganZhiFromName(df.getSixtyCycle().getName()),
			startAge: df.getStartAge(),
			endAge: df.getEndAge(),
			startYear: df.getStartSixtyCycleYear().getYear()
		};
	});
	return {
		forward: cl.isForward(),
		startAge: first.getStartAge(),
		decades
	};
}
/**
* tyme4ts-backed engine. Civil dates are interpreted in China Standard Time
* (tyme4ts's frame). `dayInfo` and `decadeFortunes` are engine extras beyond
* CalendarEngine — 建除/lunar/时辰 almanac data and 起运/大运 come from
* tyme4ts's models.
*/
const tymeEngine = {
	fourPillars,
	yearPillar,
	solarYear,
	dayInfo,
	decadeFortunes
};
//#endregion
//#region src/meeus-julian.ts
/**
* Julian-day helpers. Ported from the legacy engine's `date_to_julian_day2`
* and `date_to_julian_time`; valid across the Julian/Gregorian cutover (1582).
*/
/** Convert a civil date (no time component) to a Julian Day Number at 00:00. */
function dateToJulianDay2(year, month, day) {
	if (year < -4e5 || year > 4e5) throw new RangeError(`dateToJulianDay2: year out of range: ${year}`);
	const yp = year + Math.floor((month - 3) / 10);
	let init;
	let jdy;
	const isGregorian = year > 1582 || year === 1582 && month > 10 || year === 1582 && month === 10 && day >= 15;
	const isJulian = year < 1582 || year === 1582 && month < 10 || year === 1582 && month === 10 && day <= 4;
	if (isGregorian) {
		init = 1721119.5;
		jdy = Math.floor(yp * 365.25) - Math.floor(yp / 100) + Math.floor(yp / 400);
	} else if (isJulian) {
		init = 1721117.5;
		jdy = Math.floor(yp * 365.25);
	} else throw new RangeError(`dateToJulianDay2: nonexistent date ${year}-${month}-${day}`);
	const mp = Math.floor(month + 9) % 12;
	const jdm = mp * 30 + Math.floor((mp + 1) * 34 / 57);
	const jdd = day - 1;
	return jdy + jdm + jdd + init;
}
/** Fraction of a day for a wall-clock time. */
function dateToJulianTime(hour, minute, second) {
	return (hour * 3600 + minute * 60 + second) / 86400;
}
//#endregion
//#region src/meeus-solar-terms.ts
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
const PTSA = [
	485,
	203,
	199,
	182,
	156,
	136,
	77,
	74,
	70,
	58,
	52,
	50,
	45,
	44,
	29,
	18,
	17,
	16,
	14,
	12,
	12,
	12,
	9,
	8
];
const PTSB = [
	324.96,
	337.23,
	342.08,
	27.85,
	73.14,
	171.52,
	222.54,
	296.72,
	243.58,
	119.81,
	297.17,
	21.02,
	247.54,
	325.15,
	60.93,
	155.12,
	288.79,
	198.04,
	199.76,
	95.39,
	287.11,
	320.81,
	227.73,
	15.45
];
const PTSC = [
	1934.136,
	32964.467,
	20.186,
	445267.112,
	45036.886,
	22518.443,
	65928.934,
	3034.906,
	9037.513,
	33718.147,
	150.678,
	2281.226,
	29929.562,
	31555.956,
	4443.417,
	67555.328,
	4562.452,
	62894.029,
	31436.921,
	14577.848,
	31931.756,
	34777.259,
	1222.114,
	16859.074
];
const DEG = 2 * Math.PI / 360;
/** Vernal-equinox Julian Day for a given year. */
function vernalEquinox(year) {
	if (year >= 1e3 && year <= 8001) {
		const m = (year - 2e3) / 1e3;
		return 2451623.80984 + 365242.37404 * m + .05169 * m * m - .00411 * m * m * m - 57e-5 * m * m * m * m;
	}
	if (year >= -8e3 && year < 1e3) {
		const m = year / 1e3;
		return 1721139.29189 + 365242.1374 * m + .06134 * m * m + .00111 * m * m * m - 71e-5 * m * m * m * m;
	}
	throw new RangeError(`vernalEquinox: year out of range: ${year}`);
}
/** Perturbation correction (days) from other planets at a given JD. */
function perturbation(jd) {
	const t = (jd - 2451545) / 36525;
	let s = 0;
	for (let k = 0; k <= 23; k++) s += PTSA[k] * Math.cos(PTSB[k] * DEG + PTSC[k] * DEG * t);
	const w = 35999.373 * t - 2.47;
	const l = 1 + .0334 * Math.cos(w * DEG) + 7e-4 * Math.cos(2 * w * DEG);
	return 1e-5 * s / l;
}
/** ΔT (minutes): correction from dynamical to universal time. */
function deltaT(year, month) {
	const y = year + (month - .5) / 12;
	let dt;
	if (y <= -500) {
		const u = (y - 1820) / 100;
		dt = -20 + 32 * u * u;
	} else if (y < 500) {
		const u = y / 100;
		dt = 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3 - .1798452 * u ** 4 + .022174192 * u ** 5 + .0090316521 * u ** 6;
	} else if (y < 1600) {
		const u = (y - 1e3) / 100;
		dt = 1574.2 - 556.01 * u + 71.23472 * u ** 2 + .319781 * u ** 3 - .8503463 * u ** 4 - .005050998 * u ** 5 + .0083572073 * u ** 6;
	} else if (y < 1700) {
		const t = y - 1600;
		dt = 120 - .9808 * t - .01532 * t * t + t * t * t / 7129;
	} else if (y < 1800) {
		const t = y - 1700;
		dt = 8.83 + .1603 * t - .0059285 * t ** 2 + 13336e-8 * t ** 3 - t ** 4 / 1174e3;
	} else if (y < 1860) {
		const t = y - 1800;
		dt = 13.72 - .332447 * t + .0068612 * t ** 2 + .0041116 * t ** 3 - 37436e-8 * t ** 4 + 121272e-10 * t ** 5 - 1.699e-7 * t ** 6 + 875e-12 * t ** 7;
	} else if (y < 1900) {
		const t = y - 1860;
		dt = 7.62 + .5737 * t - .251754 * t ** 2 + .01680668 * t ** 3 - .0004473624 * t ** 4 + t ** 5 / 233174;
	} else if (y < 1920) {
		const t = y - 1900;
		dt = -2.79 + 1.494119 * t - .0598939 * t ** 2 + .0061966 * t ** 3 - 197e-6 * t ** 4;
	} else if (y < 1941) {
		const t = y - 1920;
		dt = 21.2 + .84493 * t - .0761 * t ** 2 + .0020936 * t ** 3;
	} else if (y < 1961) {
		const t = y - 1950;
		dt = 29.07 + .407 * t - t * t / 233 + t * t * t / 2547;
	} else if (y < 1986) {
		const t = y - 1975;
		dt = 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718;
	} else if (y < 2005) {
		const t = y - 2e3;
		dt = 63.86 + .3345 * t - .060374 * t ** 2 + .0017275 * t ** 3 + 651814e-9 * t ** 4 + 2373599e-11 * t ** 5;
	} else if (y < 2050) {
		const t = y - 2e3;
		dt = 62.92 + .32217 * t + .005589 * t * t;
	} else if (y < 2150) {
		const u = (y - 1820) / 100;
		dt = -20 + 32 * u * u - .5628 * (2150 - y);
	} else {
		const u = (y - 1820) / 100;
		dt = -20 + 32 * u * u;
	}
	if (y < 1955 || y >= 2005) dt = dt - 12932e-9 * (y - 1955) * (y - 1955);
	return dt / 60;
}
/** Fill `jdez[ini..ini+num]` with mean 節氣 JDs for the year. */
function meanJQJD(year, jdve, ty, ini, num, jdez) {
	const ath = 2 * Math.PI / 24;
	const tx = (jdve - 2451545) / 365250;
	const e = .0167086342 - .0004203654 * tx - 126734e-10 * tx ** 2 + 1.444e-7 * tx ** 3 - 2e-10 * tx ** 4 + 3e-10 * tx ** 5;
	const tt = year / 1e3;
	const rvp = (111.25586939 - 17.0119934518333 * tt - .044091890166673 * tt ** 2 - .000437356166661345 * tt ** 3 + 816716666602386e-20 * tt ** 4) * DEG;
	const peri = /* @__PURE__ */ new Float64Array(30);
	for (let i = 1; i <= ini + num; i++) {
		let flag = 0;
		let th = ath * (i - 1) + rvp;
		if (th > Math.PI && th <= 3 * Math.PI) {
			th = 2 * Math.PI - th;
			flag = 1;
		}
		if (th > 3 * Math.PI) {
			th = 4 * Math.PI - th;
			flag = 2;
		}
		let f = (2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(th / 2)) - e * Math.sqrt(1 - e * e) * Math.sin(th) / (1 + e * Math.cos(th))) * ty / 2 / Math.PI;
		if (flag === 1) f = ty - f;
		if (flag === 2) f = 2 * ty - f;
		peri[i] = f;
	}
	for (let i = ini; i <= ini + num; i++) jdez[i] = jdve + peri[i] - peri[1];
}
/** Fill `jdjq[ini+1..ini+num]` with perturbation- and ΔT-adjusted 節氣 JDs. */
function getAdjustedJQ(year, ini, num, jdjq, tzOffsetMinutes) {
	const veb = vernalEquinox(year);
	const ty = vernalEquinox(year + 1) - veb;
	const jdez = /* @__PURE__ */ new Float64Array(30);
	meanJQJD(year, veb, ty, ini, num, jdez);
	const offsetDays = tzOffsetMinutes / 1440;
	for (let i = ini + 1; i <= ini + num; i++) {
		const ptb = perturbation(jdez[i]);
		const dt = deltaT(year, Math.floor(i / 2) + 3);
		jdjq[i] = jdez[i] + ptb - dt / 60 / 24 + offsetDays;
	}
}
/**
* The 24 solar terms starting from 立春 of `year`, indexed 0..23
* (立春, 雨水, 驚蟄, 春分, …, 大寒), as Julian Days in the input's civil frame.
* Indices 24..25 carry the following 立春/雨水.
*/
function pureJQSinceSpring(year, tzOffsetMinutes) {
	const scratch = /* @__PURE__ */ new Float64Array(30);
	getAdjustedJQ(year - 1, 21, 3, scratch, tzOffsetMinutes);
	const jq = /* @__PURE__ */ new Float64Array(26);
	jq[0] = scratch[22];
	jq[1] = scratch[23];
	jq[2] = scratch[24];
	getAdjustedJQ(year, 0, 26, scratch, tzOffsetMinutes);
	for (let i = 2; i <= 24; i++) jq[i + 1] = scratch[i - 1];
	return jq;
}
//#endregion
//#region src/meeus-lunar.ts
/**
* Solar → lunar (農曆) date conversion, ported from qimen-modern's clean-room
* reimplementation of the legacy `QIMEN_STAR.Solar2Lunar`. Uses true new-moon
* instants and 中氣 placement to assign lunar months (including leap months).
*
* The original is hard-wired to GMT+8 (`+1/3` day), independent of input; the
* 節氣 base is therefore reused via {@link getAdjustedJQ} at the GMT+8 offset.
* Lunar dates are day-granular, so timezone is immaterial here.
*/
const SYNMONTH = 29.530588853;
const GMT8 = 480;
const RAD = Math.PI / 180;
const DIGITS = [
	"零",
	"一",
	"二",
	"三",
	"四",
	"五",
	"六",
	"七",
	"八",
	"九"
];
const TEN_DIGITS = [
	"",
	"十",
	"二十",
	"三十"
];
/** Julian Day for a date at hour `hr` (allows day 0; no 1582-gap guard needed here). */
function jdays(year, month, day, hr) {
	return dateToJulianDay2(year, month, day) + hr / 24;
}
/** 16 中氣 (solstice-anchored) JDs into `jdzq[0..15]`. */
function getZQsinceWinterSolstice(year, jdzq) {
	const dj = /* @__PURE__ */ new Float64Array(28);
	getAdjustedJQ(year - 1, 18, 5, dj, GMT8);
	jdzq[0] = dj[19];
	jdzq[1] = dj[21];
	jdzq[2] = dj[23];
	getAdjustedJQ(year, 0, 26, dj, GMT8);
	for (let i = 1; i <= 13; i++) jdzq[i + 2] = dj[2 * i - 1];
}
/** Index k of the mean new moon at or before `jd`, counted from 2000-01-06. */
function meanNewMoon(jd) {
	return Math.floor((jd - 2451550.09765) / SYNMONTH);
}
/** True (perturbed) new-moon JD for lunation index k. */
function trueNewMoon(k) {
	const jdt = 2451550.09765 + k * SYNMONTH;
	const t = (jdt - 2451545) / 36525;
	const t2 = t * t;
	const t3 = t2 * t;
	const t4 = t3 * t;
	const pt = jdt + 1337e-7 * t2 - 15e-8 * t3 + 73e-11 * t4;
	const m = 2.5534 + 29.10535669 * k - 218e-7 * t2 - 11e-8 * t3;
	const mprime = 201.5643 + 385.81693528 * k + .0107438 * t2 + 1239e-8 * t3 - 58e-9 * t4;
	const f = 160.7108 + 390.67050274 * k - .0016341 * t2 - 227e-8 * t3 + 11e-9 * t4;
	const omega = 124.7746 - 1.5637558 * k + .0020691 * t2 + 215e-8 * t3;
	const es = 1 - .002516 * t - 74e-7 * t2;
	let apt1 = -.4072 * Math.sin(RAD * mprime);
	apt1 += .17241 * es * Math.sin(RAD * m);
	apt1 += .01608 * Math.sin(RAD * 2 * mprime);
	apt1 += .01039 * Math.sin(RAD * 2 * f);
	apt1 += .00739 * es * Math.sin(RAD * (mprime - m));
	apt1 -= .00514 * es * Math.sin(RAD * (mprime + m));
	apt1 += .00208 * es * es * Math.sin(RAD * (2 * m));
	apt1 -= .00111 * Math.sin(RAD * (mprime - 2 * f));
	apt1 -= 57e-5 * Math.sin(RAD * (mprime + 2 * f));
	apt1 += 56e-5 * es * Math.sin(RAD * (2 * mprime + m));
	apt1 -= 42e-5 * Math.sin(RAD * 3 * mprime);
	apt1 += 42e-5 * es * Math.sin(RAD * (m + 2 * f));
	apt1 += 38e-5 * es * Math.sin(RAD * (m - 2 * f));
	apt1 -= 24e-5 * es * Math.sin(RAD * (2 * mprime - m));
	apt1 -= 17e-5 * Math.sin(RAD * omega);
	apt1 -= 7e-5 * Math.sin(RAD * (mprime + 2 * m));
	apt1 += 4e-5 * Math.sin(RAD * (2 * mprime - 2 * f));
	apt1 += 4e-5 * Math.sin(RAD * (3 * m));
	apt1 += 3e-5 * Math.sin(RAD * (mprime + m - 2 * f));
	apt1 += 3e-5 * Math.sin(RAD * (2 * mprime + 2 * f));
	apt1 -= 3e-5 * Math.sin(RAD * (mprime + m + 2 * f));
	apt1 += 3e-5 * Math.sin(RAD * (mprime - m + 2 * f));
	apt1 -= 2e-5 * Math.sin(RAD * (mprime - m - 2 * f));
	apt1 -= 2e-5 * Math.sin(RAD * (3 * mprime + m));
	apt1 += 2e-5 * Math.sin(RAD * (4 * mprime));
	let apt2 = 325e-6 * Math.sin(RAD * (299.77 + .107408 * k - .009173 * t2));
	apt2 += 165e-6 * Math.sin(RAD * (251.88 + .016321 * k));
	apt2 += 164e-6 * Math.sin(RAD * (251.83 + 26.651886 * k));
	apt2 += 126e-6 * Math.sin(RAD * (349.42 + 36.412478 * k));
	apt2 += 11e-5 * Math.sin(RAD * (84.66 + 18.206239 * k));
	apt2 += 62e-6 * Math.sin(RAD * (141.74 + 53.303771 * k));
	apt2 += 6e-5 * Math.sin(RAD * (207.14 + 2.453732 * k));
	apt2 += 56e-6 * Math.sin(RAD * (154.84 + 7.30686 * k));
	apt2 += 47e-6 * Math.sin(RAD * (34.52 + 27.261239 * k));
	apt2 += 42e-6 * Math.sin(RAD * (207.19 + .121824 * k));
	apt2 += 4e-5 * Math.sin(RAD * (291.34 + 1.844379 * k));
	apt2 += 37e-6 * Math.sin(RAD * (161.72 + 24.198154 * k));
	apt2 += 35e-6 * Math.sin(RAD * (239.56 + 25.513099 * k));
	apt2 += 23e-6 * Math.sin(RAD * (331.55 + 3.592518 * k));
	return pt + apt1 + apt2;
}
/** 16 new-moon JDs from the 冬至 month into `jdnm[0..15]`. */
function getSMsinceWinterSolstice(year, jdws, jdnm) {
	const kn = meanNewMoon(jdays(year - 1, 11, 0, 0));
	const tjd = /* @__PURE__ */ new Float64Array(20);
	for (let i = 0; i <= 19; i++) tjd[i] = trueNewMoon(kn + i) + 1 / 3 - deltaT(year, i - 1) / 1440;
	let jj = 0;
	for (let j = 0; j <= 18; j++) if (Math.floor(tjd[j] + .5) > Math.floor(jdws + .5)) {
		jj = j;
		break;
	}
	for (let k = 0; k <= 15; k++) jdnm[k] = tjd[jj - 1 + k];
}
/** Assign lunar month codes (冬月=0, 臘月=1, 正月=2, …; leap months add 0.5). */
function lunarMonthCodes(year, jdzq, jdnm, mc) {
	getZQsinceWinterSolstice(year, jdzq);
	getSMsinceWinterSolstice(year, jdzq[0], jdnm);
	let yz = 0;
	if (Math.floor(jdzq[12] + .5) >= Math.floor(jdnm[13] + .5)) for (let i = 1; i <= 14; i++) if (jdnm[i] + .5 > Math.floor(jdzq[i - 1 - yz] + .5) && Math.floor(jdnm[i + 1] + .5) <= Math.floor(jdzq[i - yz] + .5)) {
		mc[i] = i - .5;
		yz = 1;
	} else mc[i] = i - yz;
	else {
		for (let i = 0; i <= 12; i++) mc[i] = i;
		for (let i = 13; i <= 14; i++) if (jdnm[i] + .5 > Math.floor(jdzq[i - 1 - yz] + .5) && Math.floor(jdnm[i + 1] + .5) <= Math.floor(jdzq[i - yz] + .5)) {
			mc[i] = i - .5;
			yz = 1;
		} else mc[i] = i - yz;
	}
}
function chineseNumber(value) {
	const chars = String(value).split("");
	if (chars.length === 1) return DIGITS[Number.parseInt(chars[0], 10)];
	let out = TEN_DIGITS[Number.parseInt(chars[0], 10)];
	const ones = DIGITS[Number.parseInt(chars[1], 10)];
	if (ones !== "零") out += ones;
	return out;
}
function chineseYear(value) {
	let out = "";
	for (const ch of String(value)) out += DIGITS[Number.parseInt(ch, 10)];
	return out;
}
/** Convert a Gregorian date to its lunar year/month/day (Chinese numerals). */
function solarToLunar(year, month, day) {
	if (year < -1e3 || year > 3e3) throw new RangeError(`solarToLunar: year out of supported range: ${year}`);
	const jdzq = /* @__PURE__ */ new Float64Array(16);
	const jdnm = /* @__PURE__ */ new Float64Array(16);
	const mc = /* @__PURE__ */ new Float64Array(15);
	lunarMonthCodes(year, jdzq, jdnm, mc);
	const jdx = jdays(year, month, day, 12);
	let flag = 0;
	if (Math.floor(jdx) < Math.floor(jdnm[0] + .5)) {
		flag = 1;
		lunarMonthCodes(year - 1, jdzq, jdnm, mc);
	}
	let mi = 0;
	for (let i = 0; i <= 14; i++) if (Math.floor(jdx) >= Math.floor(jdnm[i] + .5) && Math.floor(jdx) < Math.floor(jdnm[i + 1] + .5)) {
		mi = i;
		break;
	}
	const dz = Math.floor(jdx) - Math.floor(jdnm[mi] + .5) + 1;
	const yi = mc[mi] < 2 || flag === 1 ? year - 1 : year;
	const mis = Math.floor(mc[mi] + 10) % 12 + 1;
	return {
		year: chineseYear(yi),
		month: chineseNumber(mis),
		day: chineseNumber(dz)
	};
}
//#endregion
//#region src/meeus-pillars.ts
function stemAt(index) {
	return STEMS[(index % 10 + 10) % 10];
}
function branchAt(index) {
	return BRANCHES[(index % 12 + 12) % 12];
}
function ganZhiAt(cycleIndex) {
	return {
		stem: stemAt(cycleIndex),
		branch: branchAt(cycleIndex)
	};
}
/**
* 立春-aware 干支 solar year of an instant: the 節氣 year rolls at 立春, so a
* date before 立春 belongs to the previous year. Same boundary `meeusFourPillars`
* applies to the year pillar (lines below), extracted as an integer.
*/
function meeusSolarYear(year, month, day, hour, minute, tzOffsetMinutes) {
	if (dateToJulianDay2(year, month, day) + dateToJulianTime(hour, minute, 0) < pureJQSinceSpring(year, tzOffsetMinutes)[0]) return year - 1;
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
function meeusFourPillars(year, month, day, hour, minute, tzOffsetMinutes) {
	const jtoday = dateToJulianDay2(year, month, day) + dateToJulianTime(hour, minute, 0);
	let solarYear = year;
	let jq = pureJQSinceSpring(solarYear, tzOffsetMinutes);
	if (jtoday < jq[0]) {
		solarYear -= 1;
		jq = pureJQSinceSpring(solarYear, tzOffsetMinutes);
	}
	const ygz = ((solarYear + 4712 + 24) % 60 + 60) % 60;
	let monthIdx = -1;
	for (let ii = 24; ii > 0; ii--) if (jtoday > jq[ii - 1]) {
		monthIdx = ii;
		break;
	}
	if (monthIdx < 0) monthIdx = 1;
	if (monthIdx % 2 === 0) monthIdx--;
	monthIdx = Math.floor(monthIdx / 2);
	if (monthIdx === 12) monthIdx = 11;
	const monthStemStart = ygz % 10 % 5 * 2 + 2;
	const jda = jtoday + .5;
	const thes = (jda - Math.floor(jda)) * 86400 + 3600;
	const dayjd = Math.floor(jda) + thes / 86400;
	const dgz = (Math.floor(dayjd + 49) % 60 + 60) % 60;
	let hgz = (Math.floor(dayjd * 12 + 48) % 60 + 60) % 60;
	if (Math.ceil(hour / 2) % 12 !== hgz % 12) hgz++;
	return {
		year: ganZhiAt(ygz),
		month: {
			stem: stemAt(monthStemStart + monthIdx),
			branch: branchAt(monthIdx + 2)
		},
		day: ganZhiAt(dgz),
		hour: ganZhiAt(hgz)
	};
}
//#endregion
//#region src/meeus.ts
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
function meeusEngine(tzOffsetMinutes) {
	return {
		fourPillars(year, month, day, hour, minute) {
			return meeusFourPillars(year, month, day, hour, minute, tzOffsetMinutes);
		},
		yearPillar(year, month, day) {
			return meeusFourPillars(year, month, day, 12, 0, tzOffsetMinutes).year;
		},
		solarYear(year, month, day) {
			return meeusSolarYear(year, month, day, 12, 0, tzOffsetMinutes);
		},
		solarTerms(year) {
			return pureJQSinceSpring(year, tzOffsetMinutes);
		},
		solarToLunar
	};
}
//#endregion
//#region src/period.ts
/**
* 三元九运 of a completion/construction date, resolved at the 立春 boundary via
* `engine`. The 运 rolls with the 干支 year, so a date in the weeks before 立春
* of a 运-boundary year (…, 2004, 2024, 2044) still belongs to the prior 运 —
* the correction core's year-only `periodFromYear` documents but cannot make.
*/
function periodFromDate(year, month, day, engine) {
	return periodFromYear(engine.solarYear(year, month, day));
}
//#endregion
export { dateToJulianDay2, dateToJulianTime, deltaT, getAdjustedJQ, meeusEngine, periodFromDate, pureJQSinceSpring, solarToLunar, tymeEngine, vernalEquinox };
