import { PALACES } from "./palaces.ts";
import type { FlyDirection, PalaceKey } from "./types.ts";

/** Keep a star number within 1-9 (9-cycle, no zero). */
export function wrap1to9(n: number): number {
  return ((((n - 1) % 9) + 9) % 9) + 1;
}

/**
 * Fly `center` through the nine palaces along the Luo Shu path.
 *
 * A palace with 洛书数 L sits `offset = (L - 5)` steps along the path from the
 * center. 顺飞 (forward) adds the offset, 逆飞 (reverse) subtracts it.
 */
export function flyChart(center: number, direction: FlyDirection): Record<PalaceKey, number> {
  const result = {} as Record<PalaceKey, number>;
  for (const palace of PALACES) {
    const offset = (((palace.luoshu - 5) % 9) + 9) % 9;
    const raw = direction === "forward" ? center + offset : center - offset;
    result[palace.key] = wrap1to9(raw);
  }
  return result;
}
