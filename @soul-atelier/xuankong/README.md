# @soul-atelier/xuankong

玄空飞星 (Xuan Kong Flying Star) chart engine, built on [`@soul-atelier/core`](https://www.npmjs.com/package/@soul-atelier/core).

- **`buildChart(year, sitting)`** — full 下卦盘 from a completion year and 坐山: 运盘, 山盘, 向盘, formation (旺山旺向 / 上山下水 / 双星到向 / 双星到坐)
- **格局 detection** — 父母/连珠三般卦, 山星/向星合十, 全盘/单宫伏吟反吟, 入囚, 七星真假打劫 (with the 全盘伏吟 block rule)
- **`displayGrid(chart)`** — 3×3 grid rotated so 坐 sits bottom-centre, 向 top-centre

```ts
import { buildChart, displayGrid } from "@soul-atelier/xuankong";

const chart = buildChart(2008, "子"); // 八运 子山午向
chart.formation; // "双星到向"
chart.combinations.map((c) => c.name); // ["七星真打劫", ...]
```

Charts verified against published reference texts (18 golden tests). Part of the
[Soul Atelier SDKs](https://github.com/soul-atelier/sdks) monorepo. MIT.
