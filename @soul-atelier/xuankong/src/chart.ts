import {
  flyChart,
  mountainByName,
  mountainOf,
  palaceByKey,
  palaceByLuoshu,
  PALACES,
  periodFromYear,
} from "@soul-atelier/core";
import type { FlyDirection, Mountain } from "@soul-atelier/core";
import type { CalendarEngine } from "@soul-atelier/calendar";
import { detectCombinations } from "./combinations.ts";
import type { Chart, Formation, PalaceResult } from "./types.ts";

/**
 * Decide 顺飞/逆飞 for a star entering the center.
 *
 * The relocated number's home trigram supplies a mountain at the same 元 as the
 * source (坐 for the mountain star, 向 for the water star); that mountain's
 * yin-yang gives the direction. The 5 (中宫五黄) has no trigram, so it borrows
 * the yin-yang of the source mountain itself.
 */
function directionFor(centerStar: number, source: Mountain): FlyDirection {
  const yinYang =
    centerStar === 5
      ? source.yinYang
      : mountainOf(palaceByLuoshu(centerStar).key, source.yuan).yinYang;
  return yinYang === "yang" ? "forward" : "reverse";
}

function classify(
  period: number,
  sittingKey: Chart["sitting"]["palace"],
  facingKey: Chart["facing"]["palace"],
  mountain: Record<string, number>,
  water: Record<string, number>,
): Formation {
  const msAtSit = mountain[sittingKey] === period;
  const msAtFace = mountain[facingKey] === period;
  const wsAtSit = water[sittingKey] === period;
  const wsAtFace = water[facingKey] === period;

  if (msAtSit && wsAtFace) return "旺山旺向";
  if (msAtFace && wsAtSit) return "上山下水";
  if (msAtFace && wsAtFace) return "双星到向";
  if (msAtSit && wsAtSit) return "双星到坐";
  throw new Error(`无法判定局: 运${period} ${sittingKey}->${facingKey}`);
}

/** Build the full 飞星盘 from the completion year and the 坐山 (one of the 24 mountains). */
export function buildChart(year: number, sittingName: string): Chart {
  return buildFromPeriod(year, periodFromYear(year), sittingName);
}

/**
 * Build the 飞星盘 from a full completion date, resolving the 运 at the 立春
 * boundary via `engine` (fixes the Jan-1 approximation `buildChart`'s year-only
 * `periodFromYear` carries). The chart's `year` is the 立春-aware solar year, so
 * it stays consistent with the derived 运 near a 运-boundary New Year.
 */
export function buildChartForDate(
  year: number,
  month: number,
  day: number,
  sittingName: string,
  engine: CalendarEngine,
): Chart {
  const solarYear = engine.solarYear(year, month, day);
  return buildFromPeriod(solarYear, periodFromYear(solarYear), sittingName);
}

function buildFromPeriod(year: number, period: number, sittingName: string): Chart {
  const sitting = mountainByName(sittingName);
  const facingPalace = palaceByKey(sitting.palace).opposite;
  const facing = mountainOf(facingPalace, sitting.yuan);

  const periodChart = flyChart(period, "forward");

  const mountainCenter = periodChart[sitting.palace];
  const waterCenter = periodChart[facing.palace];

  const mountainChart = flyChart(mountainCenter, directionFor(mountainCenter, sitting));
  const waterChart = flyChart(waterCenter, directionFor(waterCenter, facing));

  const palaces: readonly PalaceResult[] = PALACES.map((p) => ({
    key: p.key,
    name: p.name,
    direction: p.direction,
    earth: p.luoshu,
    row: p.row,
    col: p.col,
    period: periodChart[p.key],
    mountain: mountainChart[p.key],
    water: waterChart[p.key],
  }));

  const formation = classify(period, sitting.palace, facing.palace, mountainChart, waterChart);

  return {
    year,
    period,
    sitting,
    facing,
    label: `${sitting.name}山${facing.name}向`,
    formation,
    palaces,
    combinations: detectCombinations(period, formation, facing.palace, palaces),
  };
}
