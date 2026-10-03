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
  485, 203, 199, 182, 156, 136, 77, 74, 70, 58, 52, 50, 45, 44, 29, 18, 17, 16, 14, 12, 12, 12, 9,
  8,
];
const PTSB = [
  324.96, 337.23, 342.08, 27.85, 73.14, 171.52, 222.54, 296.72, 243.58, 119.81, 297.17, 21.02,
  247.54, 325.15, 60.93, 155.12, 288.79, 198.04, 199.76, 95.39, 287.11, 320.81, 227.73, 15.45,
];
const PTSC = [
  1934.136, 32964.467, 20.186, 445267.112, 45036.886, 22518.443, 65928.934, 3034.906, 9037.513,
  33718.147, 150.678, 2281.226, 29929.562, 31555.956, 4443.417, 67555.328, 4562.452, 62894.029,
  31436.921, 14577.848, 31931.756, 34777.259, 1222.114, 16859.074,
];

const DEG = (2 * Math.PI) / 360;

/** Vernal-equinox Julian Day for a given year. */
export function vernalEquinox(year: number): number {
  if (year >= 1000 && year <= 8001) {
    const m = (year - 2000) / 1000;
    return (
      2451623.80984 +
      365242.37404 * m +
      0.05169 * m * m -
      0.00411 * m * m * m -
      0.00057 * m * m * m * m
    );
  }
  if (year >= -8000 && year < 1000) {
    const m = year / 1000;
    return (
      1721139.29189 +
      365242.1374 * m +
      0.06134 * m * m +
      0.00111 * m * m * m -
      0.00071 * m * m * m * m
    );
  }
  throw new RangeError(`vernalEquinox: year out of range: ${year}`);
}

/** Perturbation correction (days) from other planets at a given JD. */
function perturbation(jd: number): number {
  const t = (jd - 2451545) / 36525;
  let s = 0;
  for (let k = 0; k <= 23; k++) {
    s += PTSA[k]! * Math.cos(PTSB[k]! * DEG + PTSC[k]! * DEG * t);
  }
  const w = 35999.373 * t - 2.47;
  const l = 1 + 0.0334 * Math.cos(w * DEG) + 0.0007 * Math.cos(2 * w * DEG);
  return (0.00001 * s) / l;
}

/** ΔT (minutes): correction from dynamical to universal time. */
export function deltaT(year: number, month: number): number {
  const y = year + (month - 0.5) / 12;
  let dt: number;
  if (y <= -500) {
    const u = (y - 1820) / 100;
    dt = -20 + 32 * u * u;
  } else if (y < 500) {
    const u = y / 100;
    dt =
      10583.6 -
      1014.41 * u +
      33.78311 * u ** 2 -
      5.952053 * u ** 3 -
      0.1798452 * u ** 4 +
      0.022174192 * u ** 5 +
      0.0090316521 * u ** 6;
  } else if (y < 1600) {
    const u = (y - 1000) / 100;
    dt =
      1574.2 -
      556.01 * u +
      71.23472 * u ** 2 +
      0.319781 * u ** 3 -
      0.8503463 * u ** 4 -
      0.005050998 * u ** 5 +
      0.0083572073 * u ** 6;
  } else if (y < 1700) {
    const t = y - 1600;
    dt = 120 - 0.9808 * t - 0.01532 * t * t + (t * t * t) / 7129;
  } else if (y < 1800) {
    const t = y - 1700;
    dt = 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (y < 1860) {
    const t = y - 1800;
    dt =
      13.72 -
      0.332447 * t +
      0.0068612 * t ** 2 +
      0.0041116 * t ** 3 -
      0.00037436 * t ** 4 +
      0.0000121272 * t ** 5 -
      0.0000001699 * t ** 6 +
      0.000000000875 * t ** 7;
  } else if (y < 1900) {
    const t = y - 1860;
    dt =
      7.62 +
      0.5737 * t -
      0.251754 * t ** 2 +
      0.01680668 * t ** 3 -
      0.0004473624 * t ** 4 +
      t ** 5 / 233174;
  } else if (y < 1920) {
    const t = y - 1900;
    dt = -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (y < 1941) {
    const t = y - 1920;
    dt = 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  } else if (y < 1961) {
    const t = y - 1950;
    dt = 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  } else if (y < 1986) {
    const t = y - 1975;
    dt = 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  } else if (y < 2005) {
    const t = y - 2000;
    dt =
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5;
  } else if (y < 2050) {
    const t = y - 2000;
    dt = 62.92 + 0.32217 * t + 0.005589 * t * t;
  } else if (y < 2150) {
    const u = (y - 1820) / 100;
    dt = -20 + 32 * u * u - 0.5628 * (2150 - y);
  } else {
    const u = (y - 1820) / 100;
    dt = -20 + 32 * u * u;
  }

  if (y < 1955 || y >= 2005) {
    dt = dt - 0.000012932 * (y - 1955) * (y - 1955);
  }
  return dt / 60;
}

/** Fill `jdez[ini..ini+num]` with mean 節氣 JDs for the year. */
function meanJQJD(
  year: number,
  jdve: number,
  ty: number,
  ini: number,
  num: number,
  jdez: Float64Array,
): void {
  const ath = (2 * Math.PI) / 24;
  const tx = (jdve - 2451545) / 365250;
  const e =
    0.0167086342 -
    0.0004203654 * tx -
    0.0000126734 * tx ** 2 +
    0.0000001444 * tx ** 3 -
    0.0000000002 * tx ** 4 +
    0.0000000003 * tx ** 5;
  const tt = year / 1000;
  const vp =
    111.25586939 -
    17.0119934518333 * tt -
    0.044091890166673 * tt ** 2 -
    4.37356166661345e-4 * tt ** 3 +
    8.16716666602386e-6 * tt ** 4;
  const rvp = vp * DEG;

  const peri = new Float64Array(30);
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
    const f1 = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(th / 2));
    const f2 = (e * Math.sqrt(1 - e * e) * Math.sin(th)) / (1 + e * Math.cos(th));
    let f = ((f1 - f2) * ty) / 2 / Math.PI;
    if (flag === 1) f = ty - f;
    if (flag === 2) f = 2 * ty - f;
    peri[i] = f;
  }
  for (let i = ini; i <= ini + num; i++) {
    jdez[i] = jdve + peri[i]! - peri[1]!;
  }
}

/** Fill `jdjq[ini+1..ini+num]` with perturbation- and ΔT-adjusted 節氣 JDs. */
export function getAdjustedJQ(
  year: number,
  ini: number,
  num: number,
  jdjq: Float64Array,
  tzOffsetMinutes: number,
): void {
  const veb = vernalEquinox(year);
  const ty = vernalEquinox(year + 1) - veb;
  const jdez = new Float64Array(30);
  meanJQJD(year, veb, ty, ini, num, jdez);
  const offsetDays = tzOffsetMinutes / 1440;
  for (let i = ini + 1; i <= ini + num; i++) {
    const ptb = perturbation(jdez[i]!);
    const dt = deltaT(year, Math.floor(i / 2) + 3);
    jdjq[i] = jdez[i]! + ptb - dt / 60 / 24 + offsetDays;
  }
}

/**
 * The 24 solar terms starting from 立春 of `year`, indexed 0..23
 * (立春, 雨水, 驚蟄, 春分, …, 大寒), as Julian Days in the input's civil frame.
 * Indices 24..25 carry the following 立春/雨水.
 */
export function pureJQSinceSpring(year: number, tzOffsetMinutes: number): Float64Array {
  const scratch = new Float64Array(30);
  getAdjustedJQ(year - 1, 21, 3, scratch, tzOffsetMinutes);
  const jq = new Float64Array(26);
  jq[0] = scratch[22]!; // 立春
  jq[1] = scratch[23]!; // 雨水
  jq[2] = scratch[24]!; // 驚蟄
  getAdjustedJQ(year, 0, 26, scratch, tzOffsetMinutes);
  for (let i = 2; i <= 24; i++) {
    jq[i + 1] = scratch[i - 1]!;
  }
  return jq;
}
