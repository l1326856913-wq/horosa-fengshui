/** A single line (爻): 1 = yang (solid), 0 = yin (broken). */
export type LineValue = 0 | 1;

/** Three lines, bottom → top. */
export type TrigramLines = readonly [LineValue, LineValue, LineValue];

export interface Trigram {
  /** 0-7 in 先天 order: 乾兌離震巽坎艮坤. */
  readonly index: number;
  readonly name: string;
  /** 天澤火雷風水山地 */
  readonly nature: string;
  /** ☰-☷ */
  readonly symbol: string;
  readonly lines: TrigramLines;
}

export const TRIGRAMS: readonly Trigram[] = [
  { index: 0, name: "乾", nature: "天", symbol: "☰", lines: [1, 1, 1] },
  { index: 1, name: "兌", nature: "澤", symbol: "☱", lines: [1, 1, 0] },
  { index: 2, name: "離", nature: "火", symbol: "☲", lines: [1, 0, 1] },
  { index: 3, name: "震", nature: "雷", symbol: "☳", lines: [1, 0, 0] },
  { index: 4, name: "巽", nature: "風", symbol: "☴", lines: [0, 1, 1] },
  { index: 5, name: "坎", nature: "水", symbol: "☵", lines: [0, 1, 0] },
  { index: 6, name: "艮", nature: "山", symbol: "☶", lines: [0, 0, 1] },
  { index: 7, name: "坤", nature: "地", symbol: "☷", lines: [0, 0, 0] },
];

const BY_NAME = new Map<string, Trigram>(TRIGRAMS.map((t) => [t.name, t]));

const BY_LINES = new Map<string, Trigram>(TRIGRAMS.map((t) => [t.lines.join(""), t]));

export function trigramByName(name: string): Trigram {
  const trigram = BY_NAME.get(name);
  if (!trigram) throw new Error(`未知卦名: "${name}"`);
  return trigram;
}

export function trigramFromLines(lines: TrigramLines): Trigram {
  return BY_LINES.get(lines.join(""))!;
}

/** KING_WEN[lowerIndex][upperIndex] → hexagram number (1-64, King Wen sequence). */
export const KING_WEN: readonly (readonly number[])[] = [
  [1, 43, 14, 34, 9, 5, 26, 11],
  [10, 58, 38, 54, 61, 60, 41, 19],
  [13, 49, 30, 55, 37, 63, 22, 36],
  [25, 17, 21, 51, 42, 3, 27, 24],
  [44, 28, 50, 32, 57, 48, 18, 46],
  [6, 47, 64, 40, 59, 29, 4, 7],
  [33, 31, 56, 62, 53, 39, 52, 15],
  [12, 45, 35, 16, 20, 8, 23, 2],
];

/** [number, name, pinyin, english] in King Wen order. */
const HEXAGRAM_DATA: readonly (readonly [number, string, string, string])[] = [
  [1, "乾", "qián", "The Creative"],
  [2, "坤", "kūn", "The Receptive"],
  [3, "屯", "zhūn", "Difficulty at the Beginning"],
  [4, "蒙", "méng", "Youthful Folly"],
  [5, "需", "xū", "Waiting"],
  [6, "訟", "sòng", "Conflict"],
  [7, "師", "shī", "The Army"],
  [8, "比", "bǐ", "Holding Together"],
  [9, "小畜", "xiǎo xù", "Small Accumulating"],
  [10, "履", "lǚ", "Treading"],
  [11, "泰", "tài", "Peace"],
  [12, "否", "pǐ", "Standstill"],
  [13, "同人", "tóng rén", "Fellowship"],
  [14, "大有", "dà yǒu", "Great Possession"],
  [15, "謙", "qiān", "Modesty"],
  [16, "豫", "yù", "Enthusiasm"],
  [17, "隨", "suí", "Following"],
  [18, "蠱", "gǔ", "Work on the Decayed"],
  [19, "臨", "lín", "Approach"],
  [20, "觀", "guān", "Contemplation"],
  [21, "噬嗑", "shì kè", "Biting Through"],
  [22, "賁", "bì", "Grace"],
  [23, "剝", "bō", "Splitting Apart"],
  [24, "復", "fù", "Return"],
  [25, "無妄", "wú wàng", "Innocence"],
  [26, "大畜", "dà xù", "Great Accumulating"],
  [27, "頤", "yí", "Nourishment"],
  [28, "大過", "dà guò", "Great Exceeding"],
  [29, "坎", "kǎn", "The Abysmal"],
  [30, "離", "lí", "The Clinging"],
  [31, "咸", "xián", "Influence"],
  [32, "恆", "héng", "Duration"],
  [33, "遯", "dùn", "Retreat"],
  [34, "大壯", "dà zhuàng", "Great Power"],
  [35, "晉", "jìn", "Progress"],
  [36, "明夷", "míng yí", "Darkening of the Light"],
  [37, "家人", "jiā rén", "The Family"],
  [38, "睽", "kuí", "Opposition"],
  [39, "蹇", "jiǎn", "Obstruction"],
  [40, "解", "xiè", "Deliverance"],
  [41, "損", "sǔn", "Decrease"],
  [42, "益", "yì", "Increase"],
  [43, "夬", "guài", "Breakthrough"],
  [44, "姤", "gòu", "Coming to Meet"],
  [45, "萃", "cuì", "Gathering Together"],
  [46, "升", "shēng", "Pushing Upward"],
  [47, "困", "kùn", "Oppression"],
  [48, "井", "jǐng", "The Well"],
  [49, "革", "gé", "Revolution"],
  [50, "鼎", "dǐng", "The Cauldron"],
  [51, "震", "zhèn", "The Arousing"],
  [52, "艮", "gèn", "Keeping Still"],
  [53, "漸", "jiàn", "Development"],
  [54, "歸妹", "guī mèi", "The Marrying Maiden"],
  [55, "豐", "fēng", "Abundance"],
  [56, "旅", "lǚ", "The Wanderer"],
  [57, "巽", "xùn", "The Gentle"],
  [58, "兌", "duì", "The Joyous"],
  [59, "渙", "huàn", "Dispersion"],
  [60, "節", "jié", "Limitation"],
  [61, "中孚", "zhōng fú", "Inner Truth"],
  [62, "小過", "xiǎo guò", "Small Exceeding"],
  [63, "既濟", "jì jì", "After Completion"],
  [64, "未濟", "wèi jì", "Before Completion"],
];

export interface Hexagram {
  /** 1-64, King Wen sequence. */
  readonly number: number;
  readonly name: string;
  readonly pinyin: string;
  readonly english: string;
  readonly lower: Trigram;
  readonly upper: Trigram;
  /** ䷀-䷿ (U+4DC0-U+4DFF). */
  readonly glyph: string;
}

const TRIGRAM_PAIR: readonly (readonly [Trigram, Trigram])[] = (() => {
  const pairs: (readonly [Trigram, Trigram])[] = Array.from({ length: 64 });
  for (let lower = 0; lower < 8; lower++) {
    for (let upper = 0; upper < 8; upper++) {
      pairs[KING_WEN[lower]![upper]! - 1] = [TRIGRAMS[lower]!, TRIGRAMS[upper]!];
    }
  }
  return pairs;
})();

/** All 64 hexagrams; index = number - 1. */
export const HEXAGRAMS: readonly Hexagram[] = HEXAGRAM_DATA.map(
  ([number, name, pinyin, english]) => {
    const [lower, upper] = TRIGRAM_PAIR[number - 1]!;
    return {
      number,
      name,
      pinyin,
      english,
      lower,
      upper,
      glyph: String.fromCodePoint(0x4dbf + number),
    };
  },
);

export function hexagram(number: number): Hexagram {
  const hex = HEXAGRAMS[number - 1];
  if (!hex) throw new Error(`卦序须在 1-64 之间: ${number}`);
  return hex;
}

export function hexagramFromTrigrams(lower: Trigram, upper: Trigram): Hexagram {
  return hexagram(KING_WEN[lower.index]![upper.index]!);
}

/** The six lines, bottom → top (lower trigram then upper). */
export function hexagramLines(hex: Hexagram): readonly LineValue[] {
  return [...hex.lower.lines, ...hex.upper.lines];
}

/** 爻位 names, bottom → top: 初二三四五上. */
export const LINE_NAMES = ["初", "二", "三", "四", "五", "上"] as const;

/** Flip the 变爻 at `position` (1 = bottom … 6 = top), producing the 之卦. */
export function flipLine(hex: Hexagram, position: number): Hexagram {
  if (!Number.isInteger(position) || position < 1 || position > 6) {
    throw new Error(`爻位须在 1-6 之间: ${position}`);
  }
  const flip = (lines: TrigramLines, at: number): TrigramLines => {
    const next = [...lines] as [LineValue, LineValue, LineValue];
    next[at] = next[at] === 1 ? 0 : 1;
    return next;
  };
  const lower = position <= 3 ? trigramFromLines(flip(hex.lower.lines, position - 1)) : hex.lower;
  const upper = position >= 4 ? trigramFromLines(flip(hex.upper.lines, position - 4)) : hex.upper;
  return hexagramFromTrigrams(lower, upper);
}
