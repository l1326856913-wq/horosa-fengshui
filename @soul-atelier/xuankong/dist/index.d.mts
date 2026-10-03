import { Mountain, PalaceKey } from "@soul-atelier/core";
import { CalendarEngine } from "@soul-atelier/calendar";

//#region src/types.d.ts
type Formation = "旺山旺向" | "上山下水" | "双星到向" | "双星到坐";
interface PalaceStars {
  /** 运盘 / 天盘 */
  readonly period: number;
  /** 山盘 (sitting / mountain star) */
  readonly mountain: number;
  /** 向盘 (facing / water star) */
  readonly water: number;
}
interface PalaceResult extends PalaceStars {
  readonly key: PalaceKey;
  /** Trigram name, e.g. 坎 */
  readonly name: string;
  /** Direction label, e.g. 北 */
  readonly direction: string;
  /** 元旦盘 / 地盘 / 洛书数 (center = 5) */
  readonly earth: number;
  /** Grid layout (compass-fixed, 南 on top): row 0 = top, col 0 = left */
  readonly row: 0 | 1 | 2;
  readonly col: 0 | 1 | 2;
}
type CombinationKind = "auspicious" | "inauspicious";
/** A special 格局 detected in a chart (七星打劫, 三般卦, 合十, 反伏吟, 入囚, ...). */
interface Combination {
  readonly name: string;
  readonly kind: CombinationKind;
  /** Palaces that carry the pattern, if it is localized. */
  readonly palaces?: readonly PalaceKey[];
  readonly note: string;
}
interface Chart {
  readonly year: number;
  /** 运 (1-9) */
  readonly period: number;
  /** 坐山 */
  readonly sitting: Mountain;
  /** 向首 */
  readonly facing: Mountain;
  /** e.g. 子山午向 */
  readonly label: string;
  /** 局: 旺山旺向 / 上山下水 / 双星到向 / 双星到坐 */
  readonly formation: Formation;
  readonly palaces: readonly PalaceResult[];
  /** Special 格局 present in the chart. */
  readonly combinations: readonly Combination[];
}
//#endregion
//#region src/chart.d.ts
/** Build the full 飞星盘 from the completion year and the 坐山 (one of the 24 mountains). */
declare function buildChart(year: number, sittingName: string): Chart;
/**
 * Build the 飞星盘 from a full completion date, resolving the 运 at the 立春
 * boundary via `engine` (fixes the Jan-1 approximation `buildChart`'s year-only
 * `periodFromYear` carries). The chart's `year` is the 立春-aware solar year, so
 * it stays consistent with the derived 运 near a 运-boundary New Year.
 */
declare function buildChartForDate(year: number, month: number, day: number, sittingName: string, engine: CalendarEngine): Chart;
//#endregion
//#region src/combinations.d.ts
/** Detect the special 格局 carried by a built chart. */
declare function detectCombinations(period: number, formation: Formation, facingPalace: PalaceKey, palaces: readonly PalaceResult[]): readonly Combination[];
//#endregion
//#region src/layout.d.ts
/**
 * Lay the nine palaces out as a 3×3 grid with the 坐山 at the bottom-centre and
 * the 向首 at the top-centre (core's `rotatedPalaceGrid` orientation).
 */
declare function displayGrid(chart: Chart): readonly (readonly (PalaceResult | null)[])[];
//#endregion
export { type Chart, type Combination, type CombinationKind, type Formation, type PalaceResult, type PalaceStars, buildChart, buildChartForDate, detectCombinations, displayGrid };