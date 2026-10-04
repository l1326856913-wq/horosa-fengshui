# horosa-fengshui 架构实现分析

- **分析对象**：`C:/Users/Administrator/Desktop/新建文件夹/horosa-fengshui`（本地仓库，24 次提交，2026-10-03 ~ 10-04）
- **数据来源**：本地路径直读 + git 全量历史 + 依赖包源码逐行阅读 + 独立运行验证脚本
- **未覆盖角度**：无（构建/测试已实际执行：`node test-engine.mjs` 23/23 通过）
- **分析日期**：2026-10-04
- **代码规模**：本体 1,646 行（`public/index.html` 1233 / `api/index.js` 181 / `test-engine.mjs` 81 / `dev-server.mjs` 67 / `gen-icons.mjs` 84）

---

## 结论

**架构是"薄采集层 + 厚引擎层 + 无状态 AI 层"的正确三分，但层与层之间的数据契约存在一处根本性断裂。**

项目的核心资产不在 `horosa-fengshui` 仓库里，而在依赖 `mingyu-core` 中——玄空飞星、八宅大游年、二十四山、城门诀全部由引擎完成，本仓库只负责三件事：**测量**（罗盘/地图/摄像头）、**编排**（八方位采集 + SSE 流式）、**约束**（13 条 System Instruction 铁律 + 幻觉机器核对）。这个分工是清醒的，没有把术数逻辑写进前端。

然而 `lockAndAnalyze()` 在采集序列完成后才读取 `currentHeading` 作为坐向输入，而 `captureSequence()` 会把 `currentHeading` 改写为最后采集的方位角。**采集过程污染了测量基准**，导致排盘坐向系统性错位 30°~45°（约 2~3 个山位）。引擎侧的磁偏角修正、误差建模、边界告警全部建立在这个被污染的输入上，精度再高也无法挽回。

**项目成熟度**：引擎专业度属同类 AR 堪舆产品中的上游水平，但工程完成度是"连续 24 小时高强度迭代"的产物——README 的风险清单写得比多数商业项目诚实（明确承认无鉴权、WMM 有效期、API Key 风险），却遗漏了自身最严重的逻辑缺陷。

---

## 一、分层职责与依赖方向

```
┌─────────────────────────────────────────────────────────────┐
│ ① 采集/交互层  public/index.html (1233行, 单文件)           │
│    · deviceorientation 罗盘 + EMA(α=0.1) 滤波              │
│    · Leaflet + Turf 卫星图拉线定向                          │
│    · 八方位定向采集循环 (captureSequence)                   │
│    · SSE 行缓冲解析 + 300ms 节流渲染                        │
│    · 13 条铁律 SYSTEM_INSTRUCTION                           │
│    · 幻觉机器核对 (verifyAIReply)                           │
│    · 九宫格面板 / 宜忌面板 / 应对建议面板 (渲染)             │
└───────────────┬─────────────────────────────┬───────────────┘
                │ fetch /api/horosa           │ fetch /api/ai
┌───────────────▼──────────────┐  ┌───────────▼───────────────┐
│ ② 代理/校验层  api/index.js  │  │ ③ AI 解读层（外部服务）   │
│  · 磁偏角 WMM 计算 + 缓存    │  │  Gemini 3.1 Pro          │
│  · 排盘入参强校验 (400)      │  │  DeepSeek-chat（纯文本） │
│  · 高德静态图 content-type   │  │  GLM-5.3-Flash（多模态）  │
│  · SSE 原样透传 + 防缓冲头   │  │  ── reasoning_content    │
│    X-Accel-Buffering: no     │  │     独立通道            │
└───────────────┬──────────────┘  └───────────────────────────┘
                │ await import
┌───────────────▼─────────────────────────────────────────────┐
│ ④ 确定性术数引擎  mingyu-core 0.4.0                          │
│  ├ xuan_kong/    飞星盘·局型·组合·城门诀·流年月紫白          │
│  ├ ba_zhai/      立春换年·命卦·大游年·五黄二黑压制           │
│  ├ direction/    二十四山·后天八卦·分界线判定·真北换算       │
│  └ @soul-atelier/xuankong  飞布内核（flyChart 洛书路径）     │
└─────────────────────────────────────────────────────────────┘
```

**依赖方向验证（无循环依赖）**：

| 检查项 | 结果 |
|--------|------|
| 前端 → 后端 | 单向 `fetch`，无反向调用 |
| 后端 → 引擎 | 动态 `await import('mingyu-core/residential-fengshui')`（`api/index.js:126`） |
| 引擎 → 地基 | `@soul-atelier/xuankong` → `@soul-atelier/core`（`chart.ts` 导入 `flyChart/mountainOf/palaceByLuoshu`） |
| 循环依赖 | 未发现。`core` 不反向引用 `xuankong` |
| 测试独立性 | `test-engine.mjs` 直接调引擎，**不经过 api 层**——因此测不到 api 层的契约错误 |

> **代价**：测试套件只覆盖引擎（23 项），完全没有覆盖"采集→排盘"这条链路。P0 缺陷正好落在这个测试盲区里。

---

## 二、层间结合机制：三条声明式契约

项目没有用注册器/插件这类机制，绑定完全靠**三处字符串契约**：

| 契约 | 声明位置 | 消费位置 | 耦合度 |
|------|---------|---------|--------|
| `northReference` 口径串 | 前端 `reqBody.northReference`（`index.html:795`） | 引擎 `resolveDoorNorth` 三值枚举 | 低，但有陷阱（见下） |
| 九宫 `gong` 数字键 | 引擎 `palaces[].gong` (1-9) | 前端 `order=[4,9,2,3,5,7,8,1,6]` 反查（`index.html:570`） | 中，硬编码洛书布局 |
| 山向正则 `_M` | 前端 24 山字符类（`index.html:650`） | `verifyAIReply` 匹配 `坐X向Y` | 中 |

**契约脆弱点**：`order=[4,9,2,3,5,7,8,1,6]` 把洛书布局烧进前端。引擎若改用"随坐山旋转"的 `rotatedPalaceGrid`（`@soul-atelier/core/palaces.ts` 已导出该能力但 `mingyu-core` 未使用），前端九宫格会整体错位且不报错。

---

## 三、一次完整数据流（含断点标注）

```
用户开启权限
  → getUserMedia(后置摄像头) + geolocation + DeviceOrientation.requestPermission
  → 选环境(室外/室内) → 选站位(门外定向/立极环拍/区域复查)
  → 罗盘稳定 1.5s
  → lockAndAnalyze()
      ├ isAnalyzing = true
      ├ captureSequence()                        ← 【断点1：currentHeading 在此被改写】
      │   ├ 按当前朝向顺时针排序 8 方位
      │   ├ 逐个 ±12° 稳定 0.8s → captureFrame() (canvas 720px, JPEG q0.8)
      │   └ 全部完成 → return {frames, missed}
      ├ 读 currentHeading 组 reqBody            ← 【断点2：读到的是最后一个方位角】
      ├ POST /api/horosa
      │   ├ 校验 heading ∈ [0,360]、year 必填
      │   ├ northReference==='magnetic' → 必须有 lat/lng → getDeclination() (WMM)
      │   ├ generateResidentialFengshui()
      │   │   ├ resolveResidentialOrientation → 真北换算 → 二十四山
      │   │   ├ buildBazhai   → 立春换年 → 命卦 → 大游年
      │   │   ├ buildXuanKong → 运盘 → 山向盘 → 局型 → 组合 → 城门诀 → 流年
      │   │   └ buildEvidencePrompt / buildPrompt
      │   └ 返回 { status, meta, data }
      ├ enginePanel(hData) 渲染九宫格
      ├ window.__lastHorosa = {orientationText, mingGua}   ← 供幻觉核对
      ├ [可选] POST /api/map → 高德静态图 base64
      ├ 组装 9 图 + promptText → callAIStream()
      │   ├ Gemini: 转 contents[]，systemInstruction 抽首条
      │   ├ DeepSeek: 剔除全部图片（纯理气盲算）
      │   └ GLM: system 并入首条 user，thinking.type=enabled + reasoning_effort
      │       └ POST /api/ai → 上游 SSE → 行缓冲 → 节流 300ms 渲染
      ├ advicePanel + remindersPanel
      └ saveMemoryRecord(localStorage，保留 2 条)
```

**断点 1/2 的确切代码**：

```js
// index.html:778  —— 采集开始，currentHeading = 基准角
const cap = await captureSequence();
if (!cap) return;
...
// index.html:794  —— 采集已结束，currentHeading = 最后一个采集方位
heading: currentHeading,
```

`captureSequence` 内部（`index.html:732`）按当前朝向排序八方位，用户转完一圈后 `currentHeading` 必然停在排序序列的最后一格。模拟结果：

| 基准锁定 | 采集顺序 | 采集后 currentHeading | 偏差 |
|---------|---------|---------------------|------|
| 0°（子） | 正北→…→西北 | 315°（乾） | **45°** |
| 30°（丑） | 东北→…→正北 | 0°（子） | **30°** |
| 90°（卯） | 正东→…→东北 | 45°（艮） | **45°** |
| 200°（丁） | 西南→…→正南 | 180°（午） | **20°** |
| 275°（酉） | 西北→…→正西 | 270°（酉） | 5° |

偏差随基准角变化，**平均约 28°，最坏 45°**——二十四山每山 15°，这意味着 2~3 个山位的错判，整张飞星盘全盘作废。

---

## 四、校验体系：引擎侧严密，前端侧真空

| 层 | 校验手段 | 评价 |
|----|---------|------|
| 引擎 | `heading` 范围/有限性、`year` 必填、磁北必带磁偏角、磁偏角 ∈[-30,30]、不确定度 ∈[0,45]、坐向必须严格相差 180°、坐山与度数必须一致、替卦必须山向稳定且在兼向区 | **优秀**，错误全部抛为可读中文 |
| 引擎 | 分界线敏感度 → `candidateMountains` 候选并列 + `stability: '山向边界敏感'` | **优秀**，把不确定性显式化而非隐藏 |
| 后端 | `content-length > 8MB` → 413 | **失效**，见问题清单 P0-2 |
| 前端 | 罗盘无有效数据时 `return` 避免误锁 0°（`index.html:688`） | 良好 |
| 前端 | 采集轮数上限 3 轮（`index.html:1125`） | 良好 |
| 联动 | 幻觉机器核对：正则提取 AI 回复中的山向/命卦断言，与引擎结果比对，不一致则亮黄牌 | **优秀设计**，但见 P2-1 的漏检 |

---

## 五、优势与代价（各 ≥2 条，事实与评价分离）

| # | 优势 | 事实依据 | 代价 |
|---|------|---------|------|
| 1 | **引擎优先的架构自觉**：13 条铁律开篇即写"排盘数据是纲领与权威依据，禁止自行重算或改写任何星盘数字"，AI 明确降位为辅助解读 | `index.html:318, 321` | AI 被完全约束为"讲解员"，丧失了对图像的独立判断力；当图像证据与排盘矛盾时（`index.html:323` 铁律 C）只能"分述"，无法指出排盘本身可能错 |
| 2 | **测量不确定性被当作一等公民建模**：不是给一个 ±3° 就完事，而是按拉线长度动态算 `atan(6/dist)`，并在跨二十四山界/中央九度界时列候选盘 + 强制复测 | `index.html:537-543`、`xuan_kong/index.js` 边界敏感度算法 | 精度声明越严谨，用户越难得到"确定答案"，产品感知上"每次都在提醒我不够准" |
| 3 | **磁偏角不硬编码为 0**：明确拒绝"缺 GPS 就按 0 算"，返回 400 并说明北京偏差近 7.5° 足以错判一整山 | `api/index.js:149-155` | 用户在室内/无 GPS 时**完全无法使用罗盘模式**，只能改用地图拉线。这是个硬性场景断点 |
| 4 | **SSE 行缓冲 + 300ms 节流**：解决分包截断与长思考 O(n²) 卡顿 | `index.html:1028-1080` | `aiDiv.innerHTML += ...` 逐段拼接，每 300ms 触发一次整块 innerHTML 解析；单条回复超长时（GLM 65536 tokens）仍会卡 |
| 5 | **思考流不实时展示 + 心跳提示**：10 秒一次"已 N 秒"，正文开始才折叠 | `index.html:1062-1074` | 上游若不支持流式 `reasoning_content`（思考期完全静默），45s 看门狗必杀（见 P1-1） |
| 6 | **evidençe 链设计罕见地严谨**：`analyzeCompassDirection` 把"计算步骤/方位事实/限制事实"三类证据分开记录，每条都带 `limitation` 字段明确"不得把步骤完整度解释为风水吉凶" | `direction/index.js` 全文件 | 这套严谨性在后端 API 层被浪费了——返回给前端的 `data` 里 `evidenceAnalysis` 字段前端**完全没用**，只取了 `prompt` 字符串 |
| 7 | **README 风险清单诚实**：主动列出无鉴权、WMM 2029 过期、API Key 存 localStorage 的 XSS 面、AGPL 传染性 | `README.md` 末章 | 诚实但无用——这四条用户看不到，只有开发者看，而部署者往往就是用户自己 |

---

## 六、被浪费的引擎能力

引擎提供了大量高质量结构化字段，前端只用了极小一部分：

| 引擎字段 | 内容 | 前端使用情况 |
|---------|------|------------|
| `evidenceAnalysis` | 分类证据链（计算步骤/事实/限制） | **未使用** |
| `xuankong.replacement` | 替卦起星明细（参考山、替星、顺逆、来源 URL） | **未使用** |
| `xuankong.plates` | 原始三盘数组 | **未使用** |
| `xuankong.daoShanXiang` | 到山到向结构化判断 | 仅在 prompt 字符串里 |
| `bazhai.directionMeasurement` | 分界线距离、候选宅卦、复测警示 | **未使用**（前端有自己的 `STAR_RULES` 硬编码表替代） |
| `bazhai.gasRegulation` | 五黄二黑压制规则 | **未使用** |
| `castleGate.candidates` | 城门候选明细（正城门/副城门、山、旺星） | 仅用 `summary` 一句 |
| `combinations[].palaces` | 组合所在宫位 | **未使用**（只显示名称列表） |

**后果**：引擎辛辛苦苦算出的"某山向_boundary 有 2 个候选盘"、"某宫存在单宫反吟"这些**降低确定性但提高正确性**的信息，在前端全部丢失。用户看到的是一个斩钉截铁的单一答案，而实际上测量处在边界敏感区。
