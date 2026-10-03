export type YinYang = "yang" | "yin";

export type FlyDirection = "forward" | "reverse";

/** 三元龙: 0 = 地元, 1 = 天元, 2 = 人元 */
export type Yuan = 0 | 1 | 2;

export type PalaceKey = "kan" | "gen" | "zhen" | "xun" | "li" | "kun" | "dui" | "qian" | "center";

/** One of the 24 mountains (二十四山). */
export interface Mountain {
  /** 山字, e.g. 子 */
  readonly name: string;
  /** Home trigram palace, e.g. kan (坎) */
  readonly palace: PalaceKey;
  /** 三元龙 position within the trigram (地/天/人) */
  readonly yuan: Yuan;
  readonly yinYang: YinYang;
}
