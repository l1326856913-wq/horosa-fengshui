import { wrap1to9 } from "@soul-atelier/core";
import type { PalaceKey } from "@soul-atelier/core";
import type { Combination, Formation, PalaceResult } from "./types.ts";

const SANBAN_GROUPS: readonly (readonly [number, number, number])[] = [
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
];

/** 父母三般卦 group: the three numbers are exactly 1-4-7, 2-5-8, or 3-6-9. */
function isParentGroup(nums: readonly number[]): boolean {
  const sorted = nums.toSorted((a, b) => a - b);
  return SANBAN_GROUPS.some((g) => g[0] === sorted[0] && g[1] === sorted[1] && g[2] === sorted[2]);
}

/** 连珠 (consecutive): three distinct numbers running consecutively around the 1-9 cycle. */
function isConsecutive(nums: readonly number[]): boolean {
  const set = new Set(nums);
  if (set.size !== 3) return false;
  return [...set].some((start) => set.has(wrap1to9(start + 1)) && set.has(wrap1to9(start + 2)));
}

type ByKey = Map<PalaceKey, PalaceResult>;

function center(byKey: ByKey): PalaceResult {
  const c = byKey.get("center");
  if (!c) throw new Error("缺少中宫");
  return c;
}

function detectSanban(palaces: readonly PalaceResult[], byKey: ByKey, out: Combination[]): void {
  const triples = palaces.map((p) => [p.period, p.mountain, p.water] as const);

  if (triples.every(isParentGroup)) {
    out.push({
      name: "父母三般卦",
      kind: "auspicious",
      note: "全局九宫皆成 147/258/369，综合三元旺气，大吉。258 宫位防二黑五黄。",
    });
    return; // 父母三般 and 连珠 are mutually exclusive
  }

  if (triples.every(isConsecutive)) {
    const c = center(byKey);
    const star =
      c.water === wrap1to9(c.period - 1)
        ? "向星连珠：运、山、向顺飞相连，主财富、名声、事业。"
        : c.mountain === wrap1to9(c.period - 1)
          ? "山星连珠：运、山、向逆飞相连，主健康、人丁、家庭。"
          : "运、山、向三盘相连，凶位不凶，上山下水亦不忌。";
    out.push({ name: "连珠三般卦", kind: "auspicious", note: star });
  }
}

function detectHeshi(palaces: readonly PalaceResult[], out: Combination[]): void {
  // 夫妻合十: every palace's 山星 (or 向星) plus the 运星 sums to 10.
  if (palaces.every((p) => p.mountain + p.period === 10)) {
    out.push({
      name: "山星合十",
      kind: "auspicious",
      note: "全盘山星与运盘合十，主人丁，通关化煞；当旺或刚退运时有力。",
    });
  }
  if (palaces.every((p) => p.water + p.period === 10)) {
    out.push({
      name: "向星合十",
      kind: "auspicious",
      note: "全盘向星与运盘合十，主财禄，通关化煞；当旺或刚退运时有力。",
    });
  }
}

/** 山盘 5 入中顺飞 → every 山星 equals 地盘 (元旦盘) → 全盘伏吟. Blocks 七星打劫. */
function mountainFullFuYin(palaces: readonly PalaceResult[]): boolean {
  return palaces.every((p) => p.mountain === p.earth);
}

function detectFanFuYin(palaces: readonly PalaceResult[], out: Combination[]): void {
  for (const [label, pick] of [
    ["山星", (p: PalaceResult) => p.mountain],
    ["向星", (p: PalaceResult) => p.water],
  ] as const) {
    const harm = label === "山星" ? "健康、人丁、家庭" : "财富、事业、名声";
    if (palaces.every((p) => pick(p) === p.earth)) {
      out.push({
        name: `全盘伏吟（${label}）`,
        kind: "inauspicious",
        note: `${label}与元旦盘全盘相同，主忧虑滞涩、顽疾，影响${harm}。`,
      });
    } else if (palaces.every((p) => pick(p) + p.earth === 10)) {
      out.push({
        name: `全盘反吟（${label}）`,
        kind: "inauspicious",
        note: `${label}与元旦盘全盘合十，主突发灾祸、破败，影响${harm}。`,
      });
    } else {
      const fu = palaces.filter((p) => pick(p) === p.earth).map((p) => p.key);
      const fan = palaces.filter((p) => pick(p) + p.earth === 10).map((p) => p.key);
      if (fu.length)
        out.push({
          name: `单宫伏吟（${label}）`,
          kind: "inauspicious",
          palaces: fu,
          note: `${label}与元旦盘相同；除非外有形煞引动，破坏不大。`,
        });
      if (fan.length)
        out.push({
          name: `单宫反吟（${label}）`,
          kind: "inauspicious",
          palaces: fan,
          note: `${label}与元旦盘合十；除非外有形煞引动，破坏不大。`,
        });
    }
  }
}

function detectRuQiu(period: number, byKey: ByKey, out: Combination[]): void {
  const c = center(byKey);
  if (c.mountain === period)
    out.push({
      name: "山星入囚",
      kind: "inauspicious",
      note: "当运山星入中宫受囚，主人丁不旺、健康受损；中宫见光、动气可破囚。",
    });
  if (c.water === period)
    out.push({
      name: "向星入囚",
      kind: "inauspicious",
      note: "当运向星入中宫受囚，主财源受阻、事业不顺；中宫见光、动气可破囚。",
    });
}

const TRUE_TRIAD: readonly PalaceKey[] = ["qian", "zhen", "li"]; // 乾震离
const FALSE_TRIAD: readonly PalaceKey[] = ["kan", "xun", "dui"]; // 坎巽兑

function detectDaJie(
  formation: Formation,
  facingPalace: PalaceKey,
  byKey: ByKey,
  palaces: readonly PalaceResult[],
  out: Combination[],
): void {
  if (formation !== "双星到向") return;

  const waterOf = (keys: readonly PalaceKey[]) => keys.map((k) => byKey.get(k)!.water);
  // 山星 5 入中顺飞犯全盘伏吟时，打劫结构虽在却不可用。
  const blocked = mountainFullFuYin(palaces);
  const blockNote = blocked ? "（山星5入中顺飞犯全盘伏吟，打劫不可用）" : "";

  if (TRUE_TRIAD.includes(facingPalace) && isParentGroup(waterOf(TRUE_TRIAD))) {
    out.push({
      name: "七星真打劫",
      kind: blocked ? "inauspicious" : "auspicious",
      palaces: TRUE_TRIAD,
      note: `双星到向，乾·震·离三宫向星连成 147/258/369，劫取未来旺气，力强。布水、开门、通气引动。${blockNote}`,
    });
  } else if (FALSE_TRIAD.includes(facingPalace) && isParentGroup(waterOf(FALSE_TRIAD))) {
    out.push({
      name: "七星假打劫",
      kind: blocked ? "inauspicious" : "auspicious",
      palaces: FALSE_TRIAD,
      note: `双星到向，坎·巽·兑三宫向星连成 147/258/369；力不及真打劫，仍可引动旺气。${blockNote}`,
    });
  }
}

/** Detect the special 格局 carried by a built chart. */
export function detectCombinations(
  period: number,
  formation: Formation,
  facingPalace: PalaceKey,
  palaces: readonly PalaceResult[],
): readonly Combination[] {
  const byKey: ByKey = new Map(palaces.map((p) => [p.key, p]));
  const out: Combination[] = [];

  detectSanban(palaces, byKey, out);
  detectHeshi(palaces, out);
  detectFanFuYin(palaces, out);
  detectRuQiu(period, byKey, out);
  detectDaJie(formation, facingPalace, byKey, palaces, out);
  return out;
}
