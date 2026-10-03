import type { YinYang } from "./types.ts";
import type { Element } from "./wuxing.ts";

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export type Stem = (typeof STEMS)[number];

export const BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;
export type Branch = (typeof BRANCHES)[number];

/** A stem-branch pair (one of the 六十甲子 when the polarities match). */
export interface GanZhi {
  readonly stem: Stem;
  readonly branch: Branch;
}

const STEM_ELEMENT: Record<Stem, Element> = {
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};

const BRANCH_ELEMENT: Record<Branch, Element> = {
  子: "water",
  丑: "earth",
  寅: "wood",
  卯: "wood",
  辰: "earth",
  巳: "fire",
  午: "fire",
  未: "earth",
  申: "metal",
  酉: "metal",
  戌: "earth",
  亥: "water",
};

export function stemIndex(stem: Stem): number {
  return STEMS.indexOf(stem);
}

export function branchIndex(branch: Branch): number {
  return BRANCHES.indexOf(branch);
}

export function stemElement(stem: Stem): Element {
  return STEM_ELEMENT[stem];
}

export function branchElement(branch: Branch): Element {
  return BRANCH_ELEMENT[branch];
}

export function stemYinYang(stem: Stem): YinYang {
  return stemIndex(stem) % 2 === 0 ? "yang" : "yin";
}

export function branchYinYang(branch: Branch): YinYang {
  return branchIndex(branch) % 2 === 0 ? "yang" : "yin";
}

/** 六十甲子 in order: 甲子 (0) … 癸亥 (59). */
export const SIXTY_CYCLE: readonly GanZhi[] = Array.from({ length: 60 }, (_, i) => ({
  stem: STEMS[i % 10]!,
  branch: BRANCHES[i % 12]!,
}));

/** GanZhi at a cycle position; any integer wraps into 0-59. */
export function sixtyCycle(index: number): GanZhi {
  return SIXTY_CYCLE[((index % 60) + 60) % 60]!;
}

/**
 * Position (0-59) of a pair in the 六十甲子. Throws for the 60 impossible
 * pairs whose stem and branch polarities differ (e.g. 甲丑).
 */
export function sixtyCycleIndex(gz: GanZhi): number {
  const s = stemIndex(gz.stem);
  const b = branchIndex(gz.branch);
  if ((s - b) % 2 !== 0) throw new Error(`${gz.stem}${gz.branch} 不在六十甲子中 (干支阴阳不配)`);
  return (((s * 6 - b * 5) % 60) + 60) % 60;
}

export function ganZhiName(gz: GanZhi): string {
  return `${gz.stem}${gz.branch}`;
}

/**
 * 旬空 (空亡): the two branches missing from the pair's 旬 — the ten-pair run
 * starting at its 甲 (甲子旬中戌亥空, 甲戌旬中申酉空, …).
 */
export function voidBranches(gz: GanZhi): readonly [Branch, Branch] {
  const index = sixtyCycleIndex(gz);
  const xunBranch = (index - (index % 10)) % 12;
  return [BRANCHES[(xunBranch + 10) % 12]!, BRANCHES[(xunBranch + 11) % 12]!];
}

/** Parse a two-character name like "甲子". Throws on unknown characters or impossible pairs. */
export function ganZhiFromName(name: string): GanZhi {
  const stem = name.charAt(0);
  const branch = name.charAt(1);
  if (
    name.length !== 2 ||
    !(STEMS as readonly string[]).includes(stem) ||
    !(BRANCHES as readonly string[]).includes(branch)
  ) {
    throw new Error(`无效干支: "${name}"`);
  }
  const gz: GanZhi = { stem: stem as Stem, branch: branch as Branch };
  sixtyCycleIndex(gz); // validates the pairing
  return gz;
}
