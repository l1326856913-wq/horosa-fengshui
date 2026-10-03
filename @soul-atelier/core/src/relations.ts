import { branchIndex, stemElement, stemIndex, stemYinYang } from "./ganzhi.ts";
import type { Branch, Stem } from "./ganzhi.ts";
import { controls } from "./wuxing.ts";
import type { Element } from "./wuxing.ts";

// All relations here are position-free predicates over stems/branches. How a chart
// applies them (adjacency between pillars, dedupe, labels) is the art package's concern.

// ---- stems ----

/** 化气 of the 五合 pairs, keyed by the earlier stem's index: 甲己→土, 乙庚→金, 丙辛→水, 丁壬→木, 戊癸→火. */
const STEM_COMBINE_ELEMENT: readonly Element[] = ["earth", "metal", "water", "wood", "fire"];

/** 天干五合: stems five apart combine. Returns the 化气 element, or null when the pair doesn't combine. */
export function stemCombine(a: Stem, b: Stem): Element | null {
  const ia = stemIndex(a);
  const ib = stemIndex(b);
  if (Math.abs(ia - ib) !== 5) return null;
  return STEM_COMBINE_ELEMENT[Math.min(ia, ib)]!;
}

/** 天干相克 between same-polarity stems (甲克戊, 庚克甲 …). Directional: does `a` control `b`? */
export function stemControls(a: Stem, b: Stem): boolean {
  return controls(stemElement(a)) === stemElement(b) && stemYinYang(a) === stemYinYang(b);
}

// ---- branch pairs ----

type BranchPair = readonly [Branch, Branch];

function pairSet(pairs: readonly BranchPair[]): Set<string> {
  const set = new Set<string>();
  for (const [a, b] of pairs) {
    set.add(a + b);
    set.add(b + a);
  }
  return set;
}

const SIX_COMBINE: readonly (readonly [Branch, Branch, Element])[] = [
  ["子", "丑", "earth"],
  ["寅", "亥", "wood"],
  ["卯", "戌", "fire"],
  ["辰", "酉", "metal"],
  ["巳", "申", "water"],
  ["午", "未", "fire"],
];

const SIX_COMBINE_ELEMENT = new Map<string, Element>();
for (const [a, b, element] of SIX_COMBINE) {
  SIX_COMBINE_ELEMENT.set(a + b, element);
  SIX_COMBINE_ELEMENT.set(b + a, element);
}

const CLASH = pairSet([
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
]);

const HARM = pairSet([
  ["子", "未"],
  ["丑", "午"],
  ["寅", "巳"],
  ["卯", "辰"],
  ["申", "亥"],
  ["酉", "戌"],
]);

const DESTROY = pairSet([
  ["子", "酉"],
  ["丑", "辰"],
  ["寅", "亥"],
  ["卯", "午"],
  ["巳", "申"],
  ["未", "戌"],
]);

const HIDDEN_COMBINE = pairSet([
  ["寅", "丑"],
  ["卯", "申"],
  ["午", "亥"],
  ["戌", "子"],
  ["巳", "酉"],
]);

// 子卯无礼之刑 plus the component pairs of the two 三刑 trines.
const PUNISH_PAIRS = pairSet([
  ["寅", "巳"],
  ["巳", "申"],
  ["寅", "申"],
  ["丑", "未"],
  ["未", "戌"],
  ["丑", "戌"],
  ["子", "卯"],
]);

/** 六合. Returns the transformed element, or null when the pair doesn't combine. */
export function branchSixCombine(a: Branch, b: Branch): Element | null {
  return SIX_COMBINE_ELEMENT.get(a + b) ?? null;
}

/** 六冲 (子午, 丑未, …): branches six apart oppose. */
export function branchClash(a: Branch, b: Branch): boolean {
  return CLASH.has(a + b);
}

/** 六害. */
export function branchHarm(a: Branch, b: Branch): boolean {
  return HARM.has(a + b);
}

/** 六破. */
export function branchDestroy(a: Branch, b: Branch): boolean {
  return DESTROY.has(a + b);
}

/** 暗合. */
export function branchHiddenCombine(a: Branch, b: Branch): boolean {
  return HIDDEN_COMBINE.has(a + b);
}

/** 相刑 pairs (子卯 and the 寅巳申 / 丑未戌 component pairs). Self-punishment is separate. */
export function branchPunishPair(a: Branch, b: Branch): boolean {
  return PUNISH_PAIRS.has(a + b);
}

/** 自刑 branches: a duplicated 辰/午/酉/亥 punishes itself. */
export const SELF_PUNISH: readonly Branch[] = ["辰", "午", "酉", "亥"];

export function branchSelfPunish(branch: Branch): boolean {
  return SELF_PUNISH.includes(branch);
}

export const PUNISH_TRIPLES: readonly (readonly [Branch, Branch, Branch])[] = [
  ["寅", "巳", "申"],
  ["丑", "未", "戌"],
];

function branchSetKey(xs: readonly Branch[]): string {
  return xs
    .map(branchIndex)
    .toSorted((x, y) => x - y)
    .join(",");
}

function sameSet(a: readonly Branch[], b: readonly Branch[]): boolean {
  return a.length === b.length && branchSetKey(a) === branchSetKey(b);
}

/** 三刑: 寅巳申 or 丑未戌 as a complete set (any order). */
export function branchPunishTriple(a: Branch, b: Branch, c: Branch): boolean {
  return PUNISH_TRIPLES.some((t) => sameSet([a, b, c], t));
}

// ---- branch groups ----

/** 生-旺-墓 trine of a 三合局. */
export interface Trine {
  readonly sheng: Branch;
  readonly wang: Branch;
  readonly mu: Branch;
  readonly element: Element;
}

export const TRINES: readonly Trine[] = [
  { sheng: "申", wang: "子", mu: "辰", element: "water" },
  { sheng: "寅", wang: "午", mu: "戌", element: "fire" },
  { sheng: "巳", wang: "酉", mu: "丑", element: "metal" },
  { sheng: "亥", wang: "卯", mu: "未", element: "wood" },
];

/** The 三合局 a branch belongs to (every branch sits in exactly one trine). */
export function trineOf(branch: Branch): Trine {
  const trine = TRINES.find((t) => t.sheng === branch || t.wang === branch || t.mu === branch);
  if (!trine) throw new Error(`无三合局: ${branch}`);
  return trine;
}

/** 三合: a complete 生旺墓 set (any order). Returns the trine's element, or null. */
export function branchTriple(a: Branch, b: Branch, c: Branch): Element | null {
  const trine = TRINES.find((t) => sameSet([a, b, c], [t.sheng, t.wang, t.mu]));
  return trine ? trine.element : null;
}

/**
 * 半合: two branches of the same trine including its 旺 (中神).
 * 生+墓 pairs (寅戌, 亥未, 申辰, 巳丑) do not half-combine.
 */
export function branchHalfCombine(a: Branch, b: Branch): Element | null {
  if (a === b) return null;
  const trine = trineOf(a);
  const members = [trine.sheng, trine.wang, trine.mu];
  if (!members.includes(b)) return null;
  if (a !== trine.wang && b !== trine.wang) return null;
  return trine.element;
}

/** 三会方局 (寅卯辰木 …) plus the four-branch 辰戌丑未 earth meeting. */
export const MEETINGS: readonly {
  readonly branches: readonly Branch[];
  readonly element: Element;
}[] = [
  { branches: ["寅", "卯", "辰"], element: "wood" },
  { branches: ["巳", "午", "未"], element: "fire" },
  { branches: ["申", "酉", "戌"], element: "metal" },
  { branches: ["亥", "子", "丑"], element: "water" },
  { branches: ["辰", "戌", "丑", "未"], element: "earth" },
];

/** 三会: a complete directional meeting (any order). Returns its element, or null. */
export function branchMeeting(branches: readonly Branch[]): Element | null {
  const meeting = MEETINGS.find((m) => sameSet(branches, m.branches));
  return meeting ? meeting.element : null;
}
