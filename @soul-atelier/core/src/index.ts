export { PALACES, palaceByKey, palaceByLuoshu, rotatedPalaceGrid } from "./palaces.ts";
export type { PalaceDef, PalaceKind } from "./palaces.ts";
export { flyChart, wrap1to9 } from "./flying.ts";
export { periodFromYear, periodYearRange } from "./period.ts";
export { allMountainNames, mountainByName, mountainOf } from "./mountains.ts";
export type { FlyDirection, Mountain, PalaceKey, YinYang, Yuan } from "./types.ts";

export {
  ELEMENTS,
  ELEMENT_ZH,
  controlledBy,
  controls,
  elementFromZh,
  elementRelation,
  generatedBy,
  generates,
} from "./wuxing.ts";
export type { Element, ElementRelation } from "./wuxing.ts";

export {
  BRANCHES,
  SIXTY_CYCLE,
  STEMS,
  branchElement,
  branchIndex,
  branchYinYang,
  ganZhiFromName,
  ganZhiName,
  sixtyCycle,
  sixtyCycleIndex,
  stemElement,
  stemIndex,
  stemYinYang,
  voidBranches,
} from "./ganzhi.ts";
export type { Branch, GanZhi, Stem } from "./ganzhi.ts";

export {
  MEETINGS,
  PUNISH_TRIPLES,
  SELF_PUNISH,
  TRINES,
  branchClash,
  branchDestroy,
  branchHalfCombine,
  branchHarm,
  branchHiddenCombine,
  branchMeeting,
  branchPunishPair,
  branchPunishTriple,
  branchSelfPunish,
  branchSixCombine,
  branchTriple,
  stemCombine,
  stemControls,
  trineOf,
} from "./relations.ts";
export type { Trine } from "./relations.ts";

export {
  HEXAGRAMS,
  KING_WEN,
  LINE_NAMES,
  TRIGRAMS,
  flipLine,
  hexagram,
  hexagramFromTrigrams,
  hexagramLines,
  trigramByName,
  trigramFromLines,
} from "./bagua.ts";
export type { Hexagram, LineValue, Trigram, TrigramLines } from "./bagua.ts";

export type { BirthDatum, Gender } from "./birth.ts";

export { HIDDEN_STEMS, hiddenStemList, hiddenStems } from "./hidden-stems.ts";
export type { HiddenStems } from "./hidden-stems.ts";
export { NAYIN, nayin } from "./nayin.ts";
export { LIFE_STAGES, lifeStage } from "./changsheng.ts";
export type { LifeStage } from "./changsheng.ts";
