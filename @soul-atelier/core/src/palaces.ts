import type { PalaceKey } from "./types.ts";

/** 四正 (cardinal) or 四隅 (corner); decides 二十四山 yin-yang. */
export type PalaceKind = "cardinal" | "corner";

export interface PalaceDef {
  readonly key: PalaceKey;
  /** Trigram name, e.g. 坎 */
  readonly name: string;
  readonly direction: string;
  /** 洛书数 / 元旦盘数 (center = 5) */
  readonly luoshu: number;
  readonly opposite: PalaceKey;
  readonly kind: PalaceKind;
  /** Mountains by 元: [地元, 天元, 人元]; empty for the center */
  readonly mountains: readonly string[];
  /** Compass bearing in degrees (N = 0, clockwise); null for the center */
  readonly angle: number | null;
  /** Grid layout (compass-fixed, 南 on top): row 0 = top, col 0 = left */
  readonly row: 0 | 1 | 2;
  readonly col: 0 | 1 | 2;
}

export const PALACES: readonly PalaceDef[] = [
  // row 0 (南/top)
  {
    key: "xun",
    name: "巽",
    direction: "东南",
    luoshu: 4,
    opposite: "qian",
    kind: "corner",
    mountains: ["辰", "巽", "巳"],
    angle: 135,
    row: 0,
    col: 0,
  },
  {
    key: "li",
    name: "離",
    direction: "南",
    luoshu: 9,
    opposite: "kan",
    kind: "cardinal",
    mountains: ["丙", "午", "丁"],
    angle: 180,
    row: 0,
    col: 1,
  },
  {
    key: "kun",
    name: "坤",
    direction: "西南",
    luoshu: 2,
    opposite: "gen",
    kind: "corner",
    mountains: ["未", "坤", "申"],
    angle: 225,
    row: 0,
    col: 2,
  },
  // row 1 (middle)
  {
    key: "zhen",
    name: "震",
    direction: "东",
    luoshu: 3,
    opposite: "dui",
    kind: "cardinal",
    mountains: ["甲", "卯", "乙"],
    angle: 90,
    row: 1,
    col: 0,
  },
  {
    key: "center",
    name: "中",
    direction: "中",
    luoshu: 5,
    opposite: "center",
    kind: "cardinal",
    mountains: [],
    angle: null,
    row: 1,
    col: 1,
  },
  {
    key: "dui",
    name: "兌",
    direction: "西",
    luoshu: 7,
    opposite: "zhen",
    kind: "cardinal",
    mountains: ["庚", "酉", "辛"],
    angle: 270,
    row: 1,
    col: 2,
  },
  // row 2 (北/bottom)
  {
    key: "gen",
    name: "艮",
    direction: "东北",
    luoshu: 8,
    opposite: "kun",
    kind: "corner",
    mountains: ["丑", "艮", "寅"],
    angle: 45,
    row: 2,
    col: 0,
  },
  {
    key: "kan",
    name: "坎",
    direction: "北",
    luoshu: 1,
    opposite: "li",
    kind: "cardinal",
    mountains: ["壬", "子", "癸"],
    angle: 0,
    row: 2,
    col: 1,
  },
  {
    key: "qian",
    name: "乾",
    direction: "西北",
    luoshu: 6,
    opposite: "xun",
    kind: "corner",
    mountains: ["戌", "乾", "亥"],
    angle: 315,
    row: 2,
    col: 2,
  },
];

const BY_KEY = new Map<PalaceKey, PalaceDef>(PALACES.map((p) => [p.key, p]));

const BY_LUOSHU = new Map<number, PalaceDef>(PALACES.map((p) => [p.luoshu, p]));

export function palaceByKey(key: PalaceKey): PalaceDef {
  const palace = BY_KEY.get(key);
  if (!palace) throw new Error(`未知宫位: ${key}`);
  return palace;
}

/** Home trigram of a star number (1-9). The center (5) has no trigram. */
export function palaceByLuoshu(luoshu: number): PalaceDef {
  const palace = BY_LUOSHU.get(luoshu);
  if (!palace) throw new Error(`无对应宫位的洛书数: ${luoshu}`);
  return palace;
}

const CELL_FOR_ANGLE = new Map<number, readonly [0 | 1 | 2, 0 | 1 | 2]>(
  PALACES.filter((p) => p.angle !== null).map((p) => [p.angle!, [p.row, p.col]]),
);

/**
 * The nine palace keys as a 3×3 grid rotated so `sitting` lands at the
 * bottom-centre and its opposite at the top-centre. `sitting = "kan"` yields
 * the compass-fixed default (南 on top). The whole compass rotates together,
 * so every palace keeps its geographic neighbours — only orientation changes.
 */
export function rotatedPalaceGrid(sitting: PalaceKey): readonly (readonly PalaceKey[])[] {
  const sittingAngle = palaceByKey(sitting).angle;
  if (sittingAngle === null) throw new Error("中宫不能作坐宫");
  const grid: PalaceKey[][] = [
    ["center", "center", "center"],
    ["center", "center", "center"],
    ["center", "center", "center"],
  ];
  for (const p of PALACES) {
    if (p.angle === null) continue;
    const rotated = (((p.angle - sittingAngle) % 360) + 360) % 360;
    const [row, col] = CELL_FOR_ANGLE.get(rotated)!;
    grid[row]![col] = p.key;
  }
  return grid;
}
