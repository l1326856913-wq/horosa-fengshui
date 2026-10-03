import type { Mountain, PalaceKey } from "@soul-atelier/core";

export type Formation = "旺山旺向" | "上山下水" | "双星到向" | "双星到坐";

export interface PalaceStars {
  /** 运盘 / 天盘 */
  readonly period: number;
  /** 山盘 (sitting / mountain star) */
  readonly mountain: number;
  /** 向盘 (facing / water star) */
  readonly water: number;
}

export interface PalaceResult extends PalaceStars {
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

export type CombinationKind = "auspicious" | "inauspicious";

/** A special 格局 detected in a chart (七星打劫, 三般卦, 合十, 反伏吟, 入囚, ...). */
export interface Combination {
  readonly name: string;
  readonly kind: CombinationKind;
  /** Palaces that carry the pattern, if it is localized. */
  readonly palaces?: readonly PalaceKey[];
  readonly note: string;
}

export interface Chart {
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
