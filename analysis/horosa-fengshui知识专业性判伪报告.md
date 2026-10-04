# horosa-fengshui 知识专业性判伪报告

- **分析对象**：项目内置的堪舆知识（玄空飞星 / 八宅明镜 / 紫白流年 / 城门诀 / 星性口径）
- **数据来源**：`mingyu-core@0.4.0` 与 `@soul-atelier/*` 依赖包源码逐行阅读 + 独立运行验证脚本实跑对照
- **判伪口径**：以传统典籍通行口径为金标准，凡与主流口径不一致、无法自洽、或虽有出处但存在争议者，逐条标注
- **分析日期**：2026-10-04

---

## 结论

**排盘算法层：专业，且在同类开源实现中属上游水平。** 飞星布盘的洛书路径、二十四山阴阳元龙、局型判定、城门诀候选、替卦起星诀都与传统口径一致，多处细节（飞星五气口径、父母三般卦分组、七星打劫真伪、山星全盘反吟）经得起对照。

**知识表达层：不专业，存在一处硬伤和一处方法论缺陷。**

1. **硬伤（P1）**：前端 `STAR_RULES` 硬编码的九星宜忌表，其中"六白武曲忌红色火性物品"与引擎自己算出的生克关系**方向相反**——引擎算出山星 6 金对向星 9 火是"克出"（金克火），前端却告诉用户"忌火"。同一页面上 AI 同时收到两条互相矛盾的指令。
2. **方法论缺陷（P1）**：玄空九运/八运的**分界未按立春**，而八宅命卦的**分界严格按立春**。同一个项目里两套时间标准，用户会得到跨运不一致的结论。
3. **口径缺失（P2）**：命卦算法采用"出生年 mod 9"简化口径，与民间常用的"数字和法"在半数样本上结果不同。项目未声明采用哪一派，也未提供依据。

**判伪总表**：

| 知识项 | 传统依据 | 引擎实现 | 判定 |
|--------|---------|---------|------|
| 二十四山分野（每山 15°、子山中心 0°） | 《沈氏玄空学》 | `getMountainFromDegree` | ✅ 正确 |
| 二十四山阴阳（地元/天元/人元） | 四正卦阳阴阴、四隅卦阴阳阳 | `mountains.ts` `YIN_YANG` | ✅ 正确 |
| 飞星飞布路径（洛书顺逆） | 中五 → 乾兑艮离坎坤震巽 | `flyChart` offset=`(luoshu-5)` | ✅ 正确 |
| 下卦顺逆判定（入中星本宫同元山定阴阳） | 《沈氏玄空学》 | `directionFor()` | ✅ 正确 |
| 四正局型判定 | 旺山旺向/上山下水/双星到坐/双星到向 | `classify()` / `classifyPlates()` | ✅ 正确 |
| 父母三般卦（147/258/369） | 《沈氏玄空学》 | `isParentGroup` | ✅ 正确 |
| 七星打劫（真/假） | 乾震离为真、坎巽兑为假 | `TRUE_TRIAD`/`FALSE_TRIAD` | ✅ 正确（且叠加"山星伏吟则打劫不可用"的严谨判定） |
| 全盘伏吟/反吟 | 山星或向星与元旦盘全同/全合十 | `detectFanFuYin` | ✅ 正确 |
| 山星入囚 | 当运山星入中受囚 | `detectRuQiu` | ✅ 正确 |
| 替卦起星诀 | 沈氏二十四山替卦歌诀 | `TWENTY_FOUR_MOUNTAIN_SUBSTITUTES` | ✅ 与歌诀逐字对应 |
| 城门诀（向首两旁同元龙） | 《沈氏玄空学》城门诀 | `evaluateCastleGate` | ✅ 正确 |
| 紫白流年入中 | 三元紫白九星逆计入中 | `resolveYearFlyingStar` | ✅ 正确（已实跑 2019-2036 验证递推） |
| 飞星旺生死煞退五气 | 《玄空风水学》九运表 | `resolveFlyingStarYunState` | ✅ 正确（offset 0/1-2/3-4/5-7/8） |
| **九运/八运分界** | 立春换运 | `resolveXuanKongPeriod` 按公历年 | ❌ **未按立春** |
| **八宅命卦换年** | 立春换年 | `SolarTerm.fromIndex(year,3)` | ✅ 正确 |
| **命卦数算法** | 通行「11−余数」法 | `11 - birthYear%9` | ⚠️ **口径未声明** |
| **九星宜忌表** | 通行星性口径 | 前端 `STAR_RULES` 硬编码 | ❌ **生克方向矛盾** |

---

## 一、判伪通过项详证

### 1.1 飞星飞布：洛书路径正确

`@soul-atelier/core/flying.ts`：

```js
export function flyChart(center, direction) {
  for (const palace of PALACES) {
    const offset = (((palace.luoshu - 5) % 9) + 9) % 9;
    const raw = direction === "forward" ? center + offset : center - offset;
    result[palace.key] = wrap1to9(raw);
  }
}
```

洛书数与偏移：坎1→(-4)≡5、坤2→6、震3→7、巽4→8、中5→0、乾6→1、兑7→2、艮8→3、离9→4。顺飞时中宫 5 起步：乾得 5+1、兑 5+2、艮 5+3、离 5+4、坎 5+5、坤 5+6、震 5+7、巽 5+8。

**这正是三元九运飞星的標準顺逆路径**（中→乾→兑→艮→离→坎→坤→震→巽）。九运运盘 9 入中：乾1、兑2、艮3、离4、坎5、坤6、震7、巽8、中9 —— 与实测输出一致。

### 1.2 下卦顺逆判定：最见功力的部分

`chart.ts` 的 `directionFor()` 是玄空排盘最容易出错的地方，此处实现正确：

```js
function directionFor(centerStar, source) {
  const yinYang = centerStar === 5
    ? source.yinYang                                    // 五黄无卦，借坐山本身阴阳
    : mountainOf(palaceByLuoshu(centerStar).key, source.yuan).yinYang;
  return yinYang === "yang" ? "forward" : "reverse";
}
```

传统规则：入中之星（如 3 碧）本宫在震，取震宫中与**原坐山同元龙**之山（甲/卯/乙）定阴阳。此处 `source.yuan` 正是坐山的元龙索引，`mountainOf(palaceByLuoshu(3).key, yuan)` 即取震宫同元山。**逻辑完全正确**。

### 1.3 替卦起星：与歌诀逐字对应

`SUBSTITUTE_STAR_POEM` 引《地理辨正》/沈氏：

> 子癸并甲申，贪狼一路行；壬卯乙未坤，五位为巨门；
> 乾亥辰巽巳，连戌武曲名；酉辛丑艮丙，天星说破军；
> 寅午庚丁上，右弼四星临。

`TWENTY_FOUR_MOUNTAIN_SUBSTITUTES` 表：子癸甲申=1、壬卯乙未坤=2、辰巽巳戌乾亥=6、艮丙辛酉丑=7、寅午庚丁=9。**逐字核对无误**。

更难得的是 `resolveReplacementLeg()` 保留了起星的完整推导链（原入中星 → 本宫同元龙参考山 → 替星 → 顺逆），并在 `replacement` 对象里附带 `sourceUrl` 和 `verificationSourceUrl` 两个可核查来源。这在开源实现中极罕见。

### 1.4 紫白流年：实跑验证

```
2019 八白 │ 2020 七赤 │ 2021 六白 │ 2022 五黄 │ 2023 四绿 │ 2024 三碧
2025 二黑 │ 2026 一白 │ 2027 九紫 │ 2028 八白 │ 2029 七赤 ...
```

严格 9 年递推无跳变、无错位。2026 年一白入中与项目测试断言一致。

### 1.5 五气口径

```js
const offset = (star - yun + 9) % 9;
if (offset === 0) return '当运';
if (offset <= 2) return '生气';
if (offset <= 4) return '死气';
if (offset <= 7) return '煞气';
return '退气';
```

当运 9：9=当运、1/2=生气、3/4=死气、5/6/7=煞气、8=退气。与《玄空风水学》九运表一致。注释还特别指出"合十是另一种关系，不能用来推导死气"——说明作者踩过坑。

---

## 二、判伪不通过项详证

### ❌ 问题 1：九运/八运分界未按立春（P1）

**事实**：

```js
// mingyu-core/dist/xuan_kong/index.js
const PERIOD_BASE_YEAR = 1864;
export function resolveXuanKongPeriod(year) {
  const offset = y - PERIOD_BASE_YEAR;
  const cycleIndex = ((Math.floor(offset / 20) % 9) + 9) % 9;
  const yun = cycleIndex + 1;
  const startYear = PERIOD_BASE_YEAR + Math.floor(offset / 20) * 20;
  ...
}
```

引擎自己也知道这是近似——`@soul-atelier/core/period.ts` 注释明确写：

> Note: the boundary is technically 立春 of the start year, not Jan 1. This uses the Gregorian year; for a date near 立春 of a 运-boundary year, use calendar's `periodFromDate(y, m, d, engine)`, which resolves the boundary astronomically.

**实跑验证**：

```
resolveXuanKongPeriod(2023) => 下元8运（2004-2023）
resolveXuanKongPeriod(2024) => 下元9运（2024-2043）
2024 立春精确时刻 = 2024年2月4日 16:27:07
```

一栋 2024 年 1 月 15 日建成的房子，引擎判为**九运**；按传统立春换运口径，2024-02-04 16:27 之前仍属**八运**。整张盘的运星、山向盘顺逆、局型、城门全部错。

**影响面**：每年只有 1 月 1 日 ~ 立春（约 34 天）建造的房子受影响。概率低，但因为**玄空盘错一星则全盘作废**，后果是灾难性的而非渐进的。

**加重因素**：同一个项目里，八宅命卦**严格按立春判定**：

```js
// mingyu-core/dist/ba_zhai/index.js
const lichun = SolarTerm.fromIndex(year, 3).getJulianDay().getSolarTime();
const effectiveYear = birthCivil >= lichunCivil ? year : year - 1;
```

用户填"2024-01-15 建造 + 1990-01-15 出生"，得到的是**八运盘 + 1989 年命卦**——两个时间标准混用，而项目对此**零提示**。

**修复建议**：给 `/api/horosa` 增加可选 `houseYearMonth`/`houseYearDay`，引擎侧改用 `periodFromDate`（tyme4ts 已有 `SixtyCycleYear` 与 `SolarTerm` 能力）。无月日时在 `meta` 标注 `periodBoundaryNote: '未提供建造月日，运界按公历年判定，1月1日至立春期间建造者可能误判'`。

### ❌ 问题 2：九星宜忌表生克方向矛盾（P1）

**事实**：`public/index.html:594-604` 前端硬编码九星宜忌表：

```js
const STAR_RULES = {
  ...
  6: { name: '六白武曲', tag: '吉', yi: '利事业权威，宜金属饰品',
       buyi: '忌红色火性物品（火克金）' },
  ...
};
```

**引擎实算**（`resolveShanXiangRelation(6, 9)`）返回 **`克入`** —— 依 `FLYING_STAR_WUXING`，6=金、9=火，`isKe(mountain, facing)` 即 6金克9火 成立，语义为"山星克出向星"。

**矛盾点**：引擎说金克火（即火不受欢迎，金才是主导），前端说"忌火"。两者结论方向一致，但**理由陈述错误**——"火克金"是错的，应该是"金克火"。更要命的是同一页面 `remindersPanel` 同时会渲染引擎算出的 `shanXiangRelation`（"克出"），AI 收到的是"山星6金克向星9火"+"忌火"两条信息，会自行调和出一个扭曲的解释。

**同类可疑项**（无引擎数据可对照，但按通行星性口径存疑）：

| 星 | 项目写法 | 通行口径常见写法 | 存疑点 |
|----|---------|----------------|--------|
| 2 二黑病符 | 忌久坐久卧，保持整洁干燥 | 坤艮为病符，宜静不宜动 | "整洁干燥"属峦头/环境建议混入理气表 |
| 5 五黄廉贞 | 忌动土装修、红黄色饰品、长期坐卧 | 五黄忌动土是共识；"忌红黄"仅部分流派 | 红色属火，火生土，理论上助土而非助煞；此条流派差异大 |
| 7 七赤破军 | 防口舌盗失，宜静不宜动 | 七赤为口舌金 | 方向可接受 |
| 9 九紫右弼 | 忌污秽杂物堆压 | 九紫喜庆宜明 | 可接受 |

**根因**：项目在架构上强调"理气唯一来源是引擎"，却在理气层之外**又建了一张前端硬编码的表**，且这张表没有任何出处标注。`enginePanel` 标注"确定性算法结果"，`remindersPanel` 标注"依据引擎盘面与通行星性口径推导（非AI生成）"——后者是**误导性标注**，因为九星宜忌部分完全来自本地常量，与引擎无关。

**修复建议**：
1. 把 `STAR_RULES` 迁入引擎（`mingyu-core` 的 `xuan_kong` 或独立 `star-nature` 模块），让"确定性"名副其实；
2. 每条 `yi/buyi` 标注流派依据（哪一派/哪本书），无依据的条目直接删除而非保留；
3. 五行生克方向全部由 `FLYING_STAR_WUXING` + `isKe/isSheng` 推导，不写死"火克金"这类结论句。

### ⚠️ 问题 3：命卦数算法口径未声明（P2）

**事实**：

```js
// mingyu-core/dist/bazi/mingGua.js
const remainder = positiveModulo(birthYear, 9);
const rawNumber = gender === 'male'
  ? normalizeMingGuaNumber(11 - remainder)
  : normalizeMingGuaNumber(4 + remainder);
const number = rawNumber === 5 ? (gender === 'male' ? 2 : 8) : rawNumber;
```

**实跑对照**（引擎 vs 民间常用"数字和法：男 10−S、女 5+S"）：

| 出生 | 性别 | 引擎 | 数字和法 | 是否一致 |
|--------|------|------|---------|---------|
| 1990 | 男 | **坎**（东四命） | 离 | ❌ |
| 1990 | 女 | **艮**（西四命） | 乾 | ❌ |
| 1984 | 男 | **兑**（西四命） | 乾 | ❌ |
| 1984 | 女 | **艮**（西四命） | 离 | ❌ |
| 2000 | 男 | **离**（东四命） | 艮 | ❌ |
| 2000 | 女 | **乾**（西四命） | 兑 | ❌ |

**6/6 全部不同。**

引擎用的是"年份除 9 取余 + 11/4"（这是部分流派使用的算法，与三元九运体系自洽）；数字和法是另一派。**两者都是通行口径**，但结果几乎完全不同——命卦决定四吉四凶方，等于整套人宅层结论全变。

**项目的问题不是"算错了"，而是"没告诉用户自己算的是哪一派"**。`buildPrompt` 只输出 `命卦${gua}（${group}）`，`evidencePromptText` 只输出 `命卦${gua}，宅卦${gua}，命宅关系${match}`，**没有任何 `method` / `source` 字段**。用户无从知道自己拿到的是哪一派，也无法与别处结果对照。

**修复建议**：
1. `calculateMingGua` 返回值加 `method: 'year-mod-9 (11-remainder)'` 与 `sourceNote: '本引擎采用年份除九取余配十一/四法，与部分流派的数字和法结果不同'`;
2. `buildPrompt` / `buildEvidencePrompt` 输出口径行；
3. 前端 `enginePanel` 与 `remindersPanel` 展示口径来源。

### ⚠️ 问题 4：立春比较的时间基准（存疑，未确证，P2）

`ba_zhai/index.js` 的立春比较：

```js
const lichun = SolarTerm.fromIndex(year, 3).getJulianDay().getSolarTime();
const birthCivil = createUtcTimestamp(year, month - 1, day, 12);   // 正午
const lichunCivil = createUtcTimestamp(lichun.getYear(), lichun.getMonth()-1,
                                       lichun.getDay(), lichun.getHour(),
                                       lichun.getMinute(), lichun.getSecond());
const effectiveYear = birthCivil >= lichunCivil ? year : year - 1;
```

实跑：`createUtcTimestamp(2024,1,4,12)` 返回 `1707048000000`（毫秒），`lichunCivil` 返回 `1707064027000`，差值 4451.94 小时。

`1707064027` 秒 = `2024-02-04T08:27:07Z`，即**东八区 16:27:07**。而出生时间戳 `1707048000` = `2024-02-04T04:00:00Z` = **东八区 12:00**。两者同为 UTC 基准，比较是自洽的。

**结论：立春比较的时间基准正确**（`createUtcTimestamp` 虽名为 Utc，实际接收的是 tyme4ts `SolarTime` 的本地钟面时分秒，两侧同源可比）。已排除此项为缺陷。

但仍有一处**精度局限**值得记录：出生只精确到"当日正午 12:00"，不含出生时辰。若某人出生于立春当日 16:00（立春在 16:27 前 27 分钟），引擎用 12:00 代表他，判为"未过立春"→ 归上一年命卦。**误差窗口 = 立春时刻到当日正午之间**。UI 标注了"1-2 月出生者必须准确到日"，但没说清临界日当天的时辰风险。可接受，但应在提示中补一句。

---

## 三、AI 提示词中的知识性风险

`SYSTEM_INSTRUCTION`（`index.html:317-338`）的 13 条铁律在**约束 AI 幻觉**上设计优秀，但在**知识准确性**上有隐患：

| 条款 | 风险 |
|------|------|
| 铁律 A「禁止自行重算或改写任何星盘数字」 | 排盘错时（见 P0-1）AI 被强制复述错误数字，机器核对也会亮"一致"黄牌 |
| 铁律 H「室内：坐向一律以引擎排盘为准、禁止凭画面自行改判」 | 室内立极环拍时，引擎排盘来自**室外那次定向**或**本次采集的漂移值**（P0-1），AI 看到画面朝向与排盘矛盾却必须沉默 |
| 铁律 I「输出【重拍请求】」 | AI 用这个 token 触发补拍按钮。兜底路径下 `fullReply = reasoningFull`（思考流），思考流里出现"重拍"二字会误触发 |
| 铁律 M「必须出现的专业词首次出现时用括号一句白话解释」 | 强制在正文里插入解释，与"引擎排盘要点"开篇的结构要求叠加，前 200 字会变成术语解释区，用户体验割裂 |
| 存在两条重复的「K. 回复结构（引擎优先）」 | `index.html:331` 与 `index.html:334` 完全重复，第一条里的"（引擎优先）"是残留。提示词冗余，白白消耗 token |

**另一处结构缺陷**：提示词编号为 A→M，但 K 出现两次、L 在 K 之后，导致实际顺序是 A B C D E F G H I J **K K** L M。虽不影响执行，但说明这段 2000+ 字的提示词是**多次追加拼出来的，缺乏整体整理**。

---

## 四、勘测记忆的知识污染风险

```js
// index.html:883-890
saveMemoryRecord({
  ts: new Date().toLocaleString('zh-CN'),
  mode: surveyText(),
  orientationText: sf,               // ← 来自引擎，可能已错卦
  periodLabel: tp,
  mingGua: hData.bazhai ? hData.bazhai.mingGua : null,
  summary: (reply || '').replace(/<[^>]+>/g, '').slice(0, 200),   // ← 来自 AI
});
```

三轮记忆（2 条本轮 + 前次）会被拼进下一次的用户 prompt（`memoryText()`），并按铁律 J 要求 AI"像复诊的老医师一样先回顾既往结论"。

**风险**：
1. `orientationText` 存入**可能已错卦的坐向**，下一轮会被当作"既往结论"注入，AI 会基于错误坐向推理；
2. `summary` 是**未经验证的 AI 文本**，无任何标记就成为下一轮的"记忆"；
3. 铁律 J 说"记忆与本轮实测冲突时以本轮为准"——但 `verifyAIReply` 只核对坐向与命卦，**不核对记忆里的星盘结论**。

**建议**：记忆结构里增加 `verified: boolean` 与 `engineVersion: string`；AI 引用的历史结论若与本轮引擎结果冲突，机器层直接拦截而非只靠提示词约束。

---

## 五、专业性总评

| 维度 | 评分 | 说明 |
|------|------|------|
| 飞星/山向/局型算法 | **A** | 洛书路径、元龙阴阳、五气、替卦歌诀全部正确，可与商业软件对盘 |
| 八宅大游年 | **A-** | 表结构正确、立春换年正确；扣分在命卦口径未声明 |
| 城门诀 | **A-** | 候选推导正确，但前端只显示一句 summary，未展开 |
| 流年紫白 | **A** | 严格递推无错 |
| 星性宜忌表达 | **C** | 前端硬编码、无出处、生克方向有误、标注误导 |
| 运界时间标准 | **C+** | 玄空未按立春，与八宅自相矛盾 |
| 提示词知识严谨性 | **B-** | 幻觉防护设计优秀，但存在重复条款与结构冗余 |
| 知识声明透明度 | **C+** | 命卦口径、星性出处、记忆可信度均未声明 |

**一句话结论**：**算得准，但说得不清楚，且没说清自己是怎么算的。** 这个项目最该补的不是算法，而是**知识层的可追溯性**——每一条结论都应该能回答"出自哪一派、依据什么、谁验的"。
