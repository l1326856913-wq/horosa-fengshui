import { PALACES, palaceByKey } from "./palaces.ts";
import type { PalaceKind } from "./palaces.ts";
import type { Mountain, PalaceKey, YinYang, Yuan } from "./types.ts";

/**
 * 二十四山 yin-yang follows the trigram kind:
 *   四正卦 (坎離震兌): 地元阳, 天元阴, 人元阴
 *   四隅卦 (乾坤艮巽): 地元阴, 天元阳, 人元阳
 * yang → 顺飞, yin → 逆飞.
 */
const YIN_YANG: Record<PalaceKind, readonly [YinYang, YinYang, YinYang]> = {
  cardinal: ["yang", "yin", "yin"],
  corner: ["yin", "yang", "yang"],
};

const MOUNTAINS = new Map<string, Mountain>();
for (const palace of PALACES) {
  palace.mountains.forEach((name, index) => {
    const yuan = index as Yuan;
    MOUNTAINS.set(name, {
      name,
      palace: palace.key,
      yuan,
      yinYang: YIN_YANG[palace.kind][yuan],
    });
  });
}

export function mountainByName(name: string): Mountain {
  const mountain = MOUNTAINS.get(name);
  if (!mountain) {
    throw new Error(`未知的山: "${name}". 请输入二十四山之一: ${allMountainNames().join(" ")}`);
  }
  return mountain;
}

/** Mountain at a given 元 position within a palace. */
export function mountainOf(key: PalaceKey, yuan: Yuan): Mountain {
  const palace = palaceByKey(key);
  const name = palace.mountains[yuan];
  if (!name) throw new Error(`宫位 ${key} 没有 ${yuan} 元龙的山`);
  return mountainByName(name);
}

export function allMountainNames(): readonly string[] {
  return PALACES.flatMap((p) => p.mountains);
}
