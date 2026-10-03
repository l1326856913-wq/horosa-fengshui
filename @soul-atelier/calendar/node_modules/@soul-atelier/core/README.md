# @soul-atelier/core

Primitives for Chinese metaphysics software. Zero dependencies, ESM, strict TypeScript.

- **干支** — stems, branches, 六十甲子 cycle math with impossible-pair rejection
- **五行** — canonical `Element` type, 生/克 cycles, pairwise relations
- **Relations** — 六合 三合 半合 三会 六冲 刑 害 破 暗合, stem 五合/相克, as position-free predicates
- **八卦 / 六十四卦** — trigrams, the King Wen table, hexagram composition, 变爻 flipping
- **洛书** — nine-palace grid, 顺/逆 flying, 三元九运 period math, 二十四山 compass
- **Correspondences** — 藏干, 纳音, 十二长生 (verified against tyme4ts fixtures)

```ts
import {
  ganZhiFromName,
  nayin,
  lifeStage,
  hexagram,
  flipLine,
  branchClash,
} from "@soul-atelier/core";

nayin(ganZhiFromName("甲子")); // "海中金"
lifeStage("甲", "亥"); // "长生"
flipLine(hexagram(1), 1).name; // "姤"
branchClash("子", "午"); // true
```

Part of the [Soul Atelier SDKs](https://github.com/soul-atelier/sdks) monorepo. MIT.
