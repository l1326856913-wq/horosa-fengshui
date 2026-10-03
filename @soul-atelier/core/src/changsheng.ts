import { branchIndex, stemYinYang } from "./ganzhi.ts";
import type { Branch, Stem } from "./ganzhi.ts";

/** 十二长生 stages in cycle order. */
export const LIFE_STAGES = [
  "长生",
  "沐浴",
  "冠带",
  "临官",
  "帝旺",
  "衰",
  "病",
  "死",
  "墓",
  "绝",
  "胎",
  "养",
] as const;

export type LifeStage = (typeof LIFE_STAGES)[number];

/** Branch where each stem's 长生 begins (火土同宫: 戊 follows 丙, 己 follows 丁). */
const CHANGSHENG_START: Record<Stem, Branch> = {
  甲: "亥",
  乙: "午",
  丙: "寅",
  丁: "酉",
  戊: "寅",
  己: "酉",
  庚: "巳",
  辛: "子",
  壬: "申",
  癸: "卯",
};

/** 十二长生: the stem's life stage in a branch. Yang stems count forward, yin stems backward. */
export function lifeStage(stem: Stem, branch: Branch): LifeStage {
  const start = branchIndex(CHANGSHENG_START[stem]);
  const here = branchIndex(branch);
  const offset = stemYinYang(stem) === "yang" ? here - start : start - here;
  return LIFE_STAGES[((offset % 12) + 12) % 12]!;
}
