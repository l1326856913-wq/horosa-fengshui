/** The five elements in 相生 (generation) order: each element generates the next. */
export const ELEMENTS = ["wood", "fire", "earth", "metal", "water"] as const;

export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_ZH: Record<Element, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const FROM_ZH = new Map<string, Element>(ELEMENTS.map((e) => [ELEMENT_ZH[e], e]));

export function elementFromZh(zh: string): Element {
  const element = FROM_ZH.get(zh);
  if (!element) throw new Error(`未知五行: "${zh}" (expected 木/火/土/金/水)`);
  return element;
}

function at(index: number): Element {
  return ELEMENTS[((index % 5) + 5) % 5]!;
}

/** X such that e 生 X (wood → fire). */
export function generates(e: Element): Element {
  return at(ELEMENTS.indexOf(e) + 1);
}

/** X such that X 生 e (fire ← wood). */
export function generatedBy(e: Element): Element {
  return at(ELEMENTS.indexOf(e) - 1);
}

/** X such that e 克 X (wood → earth). */
export function controls(e: Element): Element {
  return at(ELEMENTS.indexOf(e) + 2);
}

/** X such that X 克 e (earth ← wood). */
export function controlledBy(e: Element): Element {
  return at(ELEMENTS.indexOf(e) - 2);
}

export type ElementRelation = "same" | "generates" | "generatedBy" | "controls" | "controlledBy";

/** How `a` stands to `b`: a 生 b → "generates", a 克 b → "controls", and the passives. */
export function elementRelation(a: Element, b: Element): ElementRelation {
  if (a === b) return "same";
  if (generates(a) === b) return "generates";
  if (controls(a) === b) return "controls";
  if (generates(b) === a) return "generatedBy";
  return "controlledBy";
}
