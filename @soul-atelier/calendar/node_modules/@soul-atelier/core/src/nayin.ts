import { sixtyCycleIndex } from "./ganzhi.ts";
import type { GanZhi } from "./ganzhi.ts";

/** 纳音 names; each consecutive 六十甲子 pair shares one (甲子/乙丑 → 海中金 …). */
export const NAYIN = [
  "海中金",
  "炉中火",
  "大林木",
  "路旁土",
  "剑锋金",
  "山头火",
  "涧下水",
  "城头土",
  "白蜡金",
  "杨柳木",
  "泉中水",
  "屋上土",
  "霹雳火",
  "松柏木",
  "长流水",
  "沙中金",
  "山下火",
  "平地木",
  "壁上土",
  "金箔金",
  "覆灯火",
  "天河水",
  "大驿土",
  "钗钏金",
  "桑柘木",
  "大溪水",
  "沙中土",
  "天上火",
  "石榴木",
  "大海水",
] as const;

/** 纳音 of a 六十甲子 pair. Throws for impossible pairs (via sixtyCycleIndex). */
export function nayin(gz: GanZhi): string {
  return NAYIN[Math.floor(sixtyCycleIndex(gz) / 2)]!;
}
