export type Gender = "male" | "female";

/**
 * One client birth datum — the platform-wide input each art reads its slice of:
 * bazi needs `gender` (大运 direction), qimen 時盤/命盤 need `hour`/`minute`,
 * zeri's 命卦 needs the date only. Consumers fail fast on the fields they
 * require; producers should store the datum whole.
 */
export interface BirthDatum {
  /** Gregorian civil date in the `tzOffsetMinutes` wall clock. */
  readonly year: number;
  readonly month: number;
  readonly day: number;
  /** null = birth time unknown. */
  readonly hour: number | null;
  readonly minute: number | null;
  /** null = unspecified; arts that need it must reject null. */
  readonly gender: Gender | null;
  /** Offset from UTC in minutes (GMT+8 = 480). Explicit, never ambient. */
  readonly tzOffsetMinutes: number;
}
