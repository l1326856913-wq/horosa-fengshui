import type { Branch, Stem } from "./ganzhi.ts";

/** 藏干 of one branch: 本气 (main) always present, 中气/余气 where the branch carries them. */
export interface HiddenStems {
  readonly main: Stem;
  readonly middle?: Stem;
  readonly residual?: Stem;
}

/** 地支藏干. Values match tyme4ts, the engine bazi-plotter renders. */
export const HIDDEN_STEMS: Record<Branch, HiddenStems> = {
  子: { main: "癸" },
  丑: { main: "己", middle: "癸", residual: "辛" },
  寅: { main: "甲", middle: "丙", residual: "戊" },
  卯: { main: "乙" },
  辰: { main: "戊", middle: "乙", residual: "癸" },
  巳: { main: "丙", middle: "庚", residual: "戊" },
  午: { main: "丁", middle: "己" },
  未: { main: "己", middle: "丁", residual: "乙" },
  申: { main: "庚", middle: "壬", residual: "戊" },
  酉: { main: "辛" },
  戌: { main: "戊", middle: "辛", residual: "丁" },
  亥: { main: "壬", middle: "甲" },
};

export function hiddenStems(branch: Branch): HiddenStems {
  return HIDDEN_STEMS[branch];
}

/** The hidden stems as a list, 本气 first. */
export function hiddenStemList(branch: Branch): readonly Stem[] {
  const h = HIDDEN_STEMS[branch];
  return [h.main, h.middle, h.residual].filter((s): s is Stem => s !== undefined);
}
