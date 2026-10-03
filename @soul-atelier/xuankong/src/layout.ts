import { rotatedPalaceGrid } from "@soul-atelier/core";
import type { Chart, PalaceResult } from "./types.ts";

/**
 * Lay the nine palaces out as a 3×3 grid with the 坐山 at the bottom-centre and
 * the 向首 at the top-centre (core's `rotatedPalaceGrid` orientation).
 */
export function displayGrid(chart: Chart): readonly (readonly (PalaceResult | null)[])[] {
  const byKey = new Map(chart.palaces.map((p) => [p.key, p]));
  return rotatedPalaceGrid(chart.sitting.palace).map((row) =>
    row.map((key) => byKey.get(key) ?? null),
  );
}
