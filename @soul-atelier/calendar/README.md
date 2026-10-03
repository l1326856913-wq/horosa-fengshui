# @soul-atelier/calendar

Chinese calendar engine layer for the Soul Atelier SDKs. Turns civil dates into typed
[`@soul-atelier/core`](https://www.npmjs.com/package/@soul-atelier/core) `GanZhi` pillars,
with the classical boundaries: the year pillar flips at 立春, the month pillar at each 節.

The `CalendarEngine` interface keeps art packages engine-agnostic; `tymeEngine`
(backed by [tyme4ts](https://github.com/6tail/tyme4ts)) is the default implementation
and adds almanac extras: 建除 duty, lunar labels, 日冲 zodiac, and the 12 时辰 slots.

```ts
import { tymeEngine } from "@soul-atelier/calendar";
import { ganZhiName } from "@soul-atelier/core";

const p = tymeEngine.fourPillars(1990, 1, 1, 12, 0);
[p.year, p.month, p.day, p.hour].map(ganZhiName); // ["己巳", "丙子", "丙寅", "甲午"]

const info = tymeEngine.dayInfo(2026, 7, 12);
info.duty; // "定"
info.lunarLabel; // "五月廿八"
info.hours[0].timeRange; // "23–01" (子时)
```

Pillar output is pinned by golden tests against verified reference charts. Part of the
[Soul Atelier SDKs](https://github.com/soul-atelier/sdks) monorepo. MIT.
