# horosa-fengshui 用户问题清单与优化建议

- **分析对象**：`horosa-fengshui` v1.0.0（本地仓库 HEAD `f7ddc6a`）
- **数据来源**：源码逐行审读 + 5 个独立验证脚本实跑 + `node test-engine.mjs` 实跑（23/23 通过）
- **问题总数**：14 项（已全部在本地复现或代码路径确认）
- **分析日期**：2026-10-04

---

## 结论

**这个项目会在第一次真实使用中就给出错误坐向，而用户完全看不出来。**

不是"可能出错"，是**必然出错**：`captureSequence()` 采集八方位时持续改写 `currentHeading`，而 `lockAndAnalyze()` 在采集**结束后**才把它当作坐向发给引擎。偏差随基准角在 20°~45° 之间浮动，二十四山每山 15°，意味着 2~3 个山位的系统性错判。

更糟的是**项目会把这个错误包装得很可信**：九宫格面板用金色高亮渲染，五黄用红色标注，AI 被铁律强制复述这些数字，幻觉机器核对会亮"一致"黄牌。用户在界面、文本、机器校验三处都得不到任何异常信号。

**次严重的问题是请求体超限**：代码自设 8MB 守卫，但 Vercel Serverless 平台硬上限约 4.5MB。三轮补拍累计 base64 后必然触发平台级拒绝，而那时用户已经等了两分钟。

优先级：**先修 P0 的两处（各 3~5 行代码），再做 P1 的加固，最后才是架构重构**。

---

## 问题总表

| # | 级别 | 问题 | 位置 | 触发条件 | 用户可见后果 |
|---|------|------|------|---------|------------|
| 1 | **P0** | 采集污染坐向基准 | `index.html:778→794` | 每次罗盘模式勘测 | **排盘坐向错 2~3 个山位，全盘作废** |
| 2 | **P0** | 请求体守卫阈值失效 | `api/index.js:36` | 2~3 轮补拍后 | 平台级 413，用户看到"分析中断" |
| 3 | **P0** | 室内模式坐向来源错误 | `index.html:764-778` | 选"室内·立极环拍" | 室内拿室外定向数据当坐向，或用随机朝向排盘 |
| 4 | **P0** | 无 GPS 时罗盘模式完全不可用 | `api/index.js:148-155` | 室内/无定位 | 400 报错，**核心功能不可达** |
| 5 | **P1** | 45s 看门狗误杀深度思考 | `index.html:976-977` | GLM 思考期上游静默 | 首次分析直接失败 |
| 6 | **P1** | 思考流被当作正文输出 | `index.html:1096-1102` | GLM 两次重试无正文 | 中英混杂推理流冒充解读 |
| 7 | **P1** | 勘测记忆污染后续推理 | `index.html:883-890` | 跨会话 | 错误坐向被当"既往结论"注入 |
| 8 | **P1** | 九运/八运分界未按立春 | `mingyu-core/xuan_kong/index.js` | 1/1~立春建造 | 整盘运星错（引擎层） |
| 9 | **P1** | 星性宜忌生克方向错误 | `index.html:600` | 排盘含 6/9 星 | AI 收到矛盾指令（引擎层） |
| 10 | **P1** | API 无鉴权无限流 | `api/index.js` 全局 | 公开部署后 | 任何人可消耗你的函数配额 |
| 11 | **P2** | DeepSeek 静默降级为盲算 | `index.html:930-941` | 选 DeepSeek | **无图像**，仅理气，但提示不明显 |
| 12 | **P2** | 单文件 1233 行承载全部逻辑 | `public/index.html` | — | 无法测试、无法复用 |
| 13 | **P2** | 引擎证据链被丢弃 | `hData.evidenceAnalysis` | — | 边界敏感信息丢失，用户看不到"存在候选盘" |
| 14 | **P2** | 提示词 K 条重复、编号乱序 | `index.html:331-334` | — | 浪费 token、结构混乱 |

---

## P0 问题详证

### 【P0-1】采集过程污染坐向基准 —— 本次分析最严重的发现

**证据链**：

```js
// index.html:764-778  lockAndAnalyze()
isAnalyzing = true;
appendLog(`📍 基准锁定 ${currentHeading.toFixed(1)}°。${surveyText()}`);   // ① 记录基准
const cap = await captureSequence();                                        // ② 采集，改变 currentHeading
if (!cap) return;
...
// index.html:793-797  组装请求
const reqBody = {
    heading: currentHeading,        // ③ 读到的已是最后一个采集方位
    northReference: usedMapCalibration ? 'true' : 'magnetic',
    ...
};
```

`captureSequence` 内部（`index.html:732`）按当前朝向对八方位排序，用户依次转完，`currentHeading` 必然停在排序后的最后一格。

**复现验证**（模拟 `captureSequence` 排序逻辑）：

| 基准锁定角 | 对应山 | 采集顺序 | 采集后 heading | 偏差 | 错判山位数 |
|-----------|--------|---------|---------------|------|-----------|
| 0° | 子 | 正北→东北→…→西北 | 315° | **45°** | 3 |
| 30° | 丑 | 东北→正东→…→正北 | 0° | **30°** | 2 |
| 90° | 卯 | 正东→东南→…→东北 | 45° | **45°** | 3 |
| 200° | 丁 | 西南→正西→…→正南 | 180° | **20°** | 1~2 |
| 275° | 酉 | 西北→正北→…→正西 | 270° | 5° | 0 |

**为什么发现不了**：

1. `headingVal` 显示的是实时 heading，采集完会显示最后一个方位角（西北 315°），而 `mountain-name` 早已在 `index.html:842` 被排盘结果覆盖为"×山(排盘)"——用户看到的是"排盘"字样，不会意识到它来自错误输入；
2. 引擎对错误 heading 的处理和正确 heading **完全一样**——只要不落在分界线附近就正常返回，无任何异常；
3. 即使落在分界线附近，引擎返回的 `measurement.warnings` 也**没有传给前端**（`enginePanel` 不读 `hData.measurement`）。

**修复方案**：

```js
async function lockAndAnalyze() {
    // ... apiKey 校验
    isAnalyzing = true;
    logPanel.innerHTML = '';
    analysisRound = 1;
    retakeBtn.style.display = 'none';

    // ★ 修复：在采集前冻结基准角
    const baseHeading = currentHeading;
    const baseMountain = getMountain(baseHeading);
    appendLog(`📍 基准锁定 ${baseHeading.toFixed(1)}°（${baseMountain}山）。${surveyText()}`);

    const cap = await captureSequence();
    if (!cap) return;

    // ★ 修复：采集后恢复基准角，避免残留状态影响显示与后续
    currentHeading = baseHeading;
    smoothedHeading = baseHeading;
    headingVal.innerText = baseHeading.toFixed(1);

    const reqBody = { heading: baseHeading, ... };   // ★ 用 baseHeading
}
```

**同时建议**：`captureSequence` 内部把用户实际停留的最后方位记录为 `lastCaptureHeading`，采集结束后用它**校正** `currentHeading`（因为用户最后确实面向那个方向），再由调用方决定用哪个值——但坐向必须用 `baseHeading`。

**验证方法**：修复后重复上述模拟，`reqBody.heading` 应恒等于基准锁定角。

---

### 【P0-2】请求体守卫阈值高于平台上限

**事实**：

```js
// api/index.js:34-38
// 请求体大小防护：Vercel 函数体上限约 4.5MB，多轮图片历史可能累积超限
const contentLength = Number(req.headers['content-length'] || 0);
if (contentLength > 8 * 1024 * 1024) {
  return res.status(413).json({ error: '请求体过大（>8MB）...' });
}
```

**注释自己说 4.5MB，代码设 8MB**——守卫永远不会被触发，因为请求在到达这段代码之前就被 Vercel 平台层拒绝了。

**累积测算**（`captureFrame` 输出 720px 宽 JPEG q0.8）：

| 轮次 | 累计帧数 | 估算 base64 总量 | 结果 |
|------|---------|----------------|------|
| 第 1 轮 | 8 | ~875 KB | 正常 |
| 第 2 轮（补拍） | 16 | ~1,750 KB | 正常 |
| 第 3 轮（补拍） | 24 | ~2,625 KB | 逼近上限 |
| 4 轮 / 更大图 / 加外局图 | 32+ | >3,500 KB | **可能超限** |

`chatHistory` 会把**所有轮次的 base64 全部保留**（`index.html:1138-1142` 追加 user 消息时携带全部 frames），且每次提问都重发整个历史。

**用户可见后果**：等了两分钟，看到红色"分析中断: ...413"。而项目已设了 3 轮上限，但 3 轮是否超限取决于图片大小，**没有确定性保证**。

**修复方案**：

1. **守卫改到 4MB**（留 500KB 余量给 JSON 包装）：
```js
const MAX_BODY = 4 * 1024 * 1024;
if (contentLength > MAX_BODY) {
  return res.status(413).json({
    error: '请求体过大。请点🔄重新勘测以清空图片历史，或减少补拍轮次。',
  });
}
```
2. **前端图片压缩**：720px → 512px，JPEG 质量 0.8 → 0.65，单帧从 ~110KB 降到 ~45KB；
3. **历史图片裁剪**：只保留最近 2 轮的 base64，更早的替换为文字摘要；
4. **前端预检**：发请求前用 `JSON.stringify(body).length` 估算，超限则本地提示，不浪费 2 分钟等待。

---

### 【P0-3】室内模式的坐向来源

**事实**：站位指引提供三种模式（`index.html:385-390`）：

| 模式 | 环境 | 引导文案 | 实际坐向来源 |
|------|------|---------|------------|
| `orientation` 门外定向 | 室外 | 站在大门正前方 2-3 米，镜头正对大门 | ✅ 合理（镜头朝向≈坐向的反向，即向） |
| `interior` 立极环拍 | 室内 | 站在平面中心点，依次对准八方位 | ❌ **无有效坐向来源** |
| `zone` 区域复查 | 室内 | 靠近待查区域 1-1.5 米 | ❌ 同上，且不应重新排盘 |

**问题**：室内模式的核心动作是"环拍"，用户站位和朝向是任意的。第一次自动锁定时 `currentHeading` 是用户**恰好面朝的方向**（可能是卧室床的方向），这个角度被当作坐向发给引擎 → 排出一个完全无意义的盘。

而铁律 H 明确要求：

> 室内：坐向一律以引擎排盘为准、禁止凭画面自行改判

于是 AI 拿到一个随机坐向的权威排盘，还被禁止质疑。

**修复方案**：

1. **室内模式强制复用已锁定的室外坐向**。流程改为：
   - 室内模式进入时检查 `localStorage.HOROSA_SITUATING` 是否已有经确认的坐向；
   - 没有则提示"请先在室外完成坐向定向"并提供跳转；
2. `zone` 区域复查**不重新排盘**，只把新帧追加到已有 `hData` 的解读中；
3. 短期兜底：室内模式首次进入时，强制 `surveyMode='interior'` 走地图拉线模式（`isMapMode=true`），由用户显式拉线确定真北朝向，不依赖罗盘。

---

### 【P0-4】无 GPS 时罗盘模式完全不可用

**事实**：

```js
// api/index.js:148-155
if (ref === 'magnetic') {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      message: '罗盘测向需要 GPS 坐标以计算当地磁偏角（不可硬编码为 0，否则坐向可偏差近 10°）。'
    });
  }
  fengshuiInput.magneticDeclinationDegrees = getDeclination(lat, lng);
}
```

**拒绝的动机是正确的**（宁可报错也不给错数据），但**没有提供替代路径**。

**用户场景**：室内做八宅/九宫勘察，GPS 在室内可能漂移到几百公里外或直接失败（`index.html:1214` 只 `console.warn("GPS 定位被拒绝")`）。此时：
- `userLat/userLng` 为 `null` → `reqBody` 不含 lat/lng → 后端 400
- 用户看到红色"分析中断: 罗盘测向需要 GPS 坐标"
- **室内勘察这个核心场景 100% 不可达**

**修复方案**：

1. **降级链路**：无 GPS 时，改为提示"改用地图拉线定向"并**自动切换到地图模式**：
```js
if (!userLat || !userLng) {
  appendLog('⚠️ 未获取到 GPS 坐标，无法修正磁偏角。已为你切换到地图拉线定向（直接使用真北，无需磁偏角）。', 'system-log', true);
  document.getElementById('switch-mode-btn').click();  // 切到地图模式
  return;
}
```
2. **扩大定位超时**：`getCurrentPosition` 当前用默认参数（通常 10s 超时且不等待）。改为 `{ enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }`，并 `await` 一个 Promise 让用户在等待时有感知；
3. **精度警示**：GPS 精度 >50m 时提示"定位精度较低，磁偏角计算可能有偏差"；
4. **手动磁偏角兜底**：设置面板增加"手动磁偏角"输入框（带常见城市速查表），作为无 GPS 时的最后手段。

---

## P1 问题详证

### 【P1-1】45s 看门狗误杀深度思考

```js
// index.html:976-977
let watchdog = setTimeout(() => { streamTimedOut = true; abortCtrl.abort(); }, 45000);
const resetWatchdog = () => { clearTimeout(watchdog); watchdog = setTimeout(..., 45000); };
```

看门狗按"无输出时长"重置，设计正确。但前提是**上游在思考期持续流式输出 `reasoning_content`**。若：
- GLM 部署不支持流式 reasoning（部分企业版/代理网关会关闭）；
- 或 `reasoning_effort: 'high'` 下思考阶段本就不吐 token；

则 45s 内无任何字节 → 强制 abort。用户配置了 `max_tokens: 65536` + `reasoning_effort: 'high'`，本身就是超长请求设计，与 45s 冲突。

**修复**：
1. 看门狗分两级：首个字节 60s（首 token 容忍）、之后 30s 无输出才杀；
2. 增加用户可见的"仍在思考（已 Ns）"心跳（现有心跳只在 `reasoning_content` 到达后才启动，**恰恰在最需要提示的时候不显示**）；
3. 允许用户在设置里调高超时（60/120/180s）。

### 【P1-2】思考流被当作正文输出

```js
// index.html:1096-1102
if (provider === 'glm' && reasoningSeen) {
  fullReply = reasoningFull;       // ← 思考流直接当正文
  fallbackUsed = true;
  aiDiv.innerHTML += escHtml(fullReply).replace(/\n/g, '<br>');
  stopThinkingHint('⚠️ 思考完成但未生成正文，已将思考内容作为解读输出（见下方）');
}
```

虽然标注了警告并跳过机器核对，但：
1. `reasoningFull` 是模型内部推理，**通常中英混杂、逻辑跳跃**，与 System Instruction 要求的"位置→现状→影响→建议"结构完全不同；
2. 它会被写进 `chatHistory`（`index.html:1108`），**污染后续所有对话上下文**；
3. `saveMemoryRecord` 会把它的前 200 字存为"勘测记忆摘要"，成为跨会话的"既往结论"；
4. 用户无从判断哪段是"解读"、哪段是"思考"。

**修复**：
1. 兜底输出改为**结构化降级**：不直接吐 `reasoningFull`，而是提示"模型未能生成正式解读，以下为推理过程摘要（仅供参考）"，并把 `reasoningFull` 只存入 `chatHistory` 的 metadata 不进正文；
2. 连续两次失败后，**停止重试**并明确告知用户"请更换模型或稍后重试"，当前逻辑会重试到耗尽；
3. `saveMemoryRecord` 对 `fallbackUsed` 的结果**不写入记忆**。

### 【P1-7】勘测记忆污染

见《知识专业性判伪报告》第四节。补充修复建议：

```js
saveMemoryRecord({
  ts, mode, orientationText, periodLabel, mingGua, summary,
  verified: !fallbackUsed,                    // ★ 新增
  engineVersion: hData.xuankong?.engine?.version ?? 'unknown',
  sitDegree: hData.xuankong?.measurement?.sitDegree ?? null,   // ★ 新增：记录真实度数便于复核
  mountainConfirmed: false,                    // ★ 新增：是否经用户确认
});
```

并在 `memoryText()` 注入时标注可信度：`（第1次，引擎已确认，sitDegree=177.5°）`。

### 【P1-10】API 无鉴权无限流

README 已自行承认。补充具体攻击面：

- `/api/ai` 是**开放代理**——任何人可用你的 Vercel 函数转发任意请求到你配置的三家 API。虽然 API Key 由请求方提供（不花你的钱），但会消耗你的**函数执行时长与出网流量**；
- `/api/map` 会用请求方提供的 `gaode_key` 请求高德——可用于**探测他人 Key**（虽然响应不回显 Key，但可通过错误信息差异判断 Key 是否存在）；
- `/api/horosa` 是纯计算，成本低但可被批量刷。

**修复**：
1. 引入 Vercel Firewall 限流（按 IP 100 次/小时）；
2. `/api/ai` 加同源校验（`Origin` 头必须匹配部署域名），挡掉跨站滥用；
3. 生产环境移除 `/api/health`（无信息量且暴露技术栈）。

---

## P2 问题详证

### 【P2-11】DeepSeek 静默降级

```js
if (chatHistory.length === 2) {
  appendLog('⚠️ 提示：您选择了 DeepSeek，该模型不支持视觉，已自动剔除图片数据进行纯理气盲算。', 'system-log');
}
```

三重问题：
1. `chatHistory.length === 2` 只在**首次**提示，补拍一轮后不再提示；
2. "纯理气盲算"意味着**用户上传的 8 张照片完全没用上**，但用户以为 AI 在看图；
3. 选 DeepSeek 的用户很可能不知道 DeepSeek-chat 无视觉能力。

**修复**：设置面板把模型选项改为带能力标注的卡片（`DeepSeek-chat · 纯文本，不看图`），并在选择时立即提示，不要等到分析阶段。

### 【P2-12】单文件 1233 行

`public/index.html` 里混杂了：CSS 设计系统（200 行）、HTML 结构（200 行）、System Instruction（22 行长字符串）、排盘面板渲染（4 个函数）、罗盘滤波、SSE 解析、AI 重试状态机、勘测记忆、localStorage 存取、8 方位采集状态机。

**至少拆成**：`styles.css` / `prompts.js`（提示词与铁律）/ `compass.js`（罗盘与采集）/ `panels.js`（九宫格/宜忌/建议渲染）/ `ai-stream.js`（SSE 与重试）/ `storage.js`（设置与记忆）/ `main.js`（编排）。

收益：可测试（当前无法为任何函数写单测）、可复用、提示词可被独立审阅（现在 2000+ 字藏在一个 template literal 里）。

### 【P2-13】引擎证据链被丢弃

引擎返回了这些高质量字段，前端全部未使用：

| 字段 | 内容 | 建议用法 |
|------|------|---------|
| `hData.xuankong.measurement` | `stability`、`nearestBoundaryDistanceDegrees`、`candidateMountains`、`warnings` | **在九宫格上方显示"⚠️ 当前读数距分界仅 2.3°，可能为子/癸山，建议复测"** |
| `hData.evidenceAnalysis` | 分类证据链 | 折叠面板"查看排盘依据" |
| `hData.xuankong.replacement` | 替卦起星明细 | 替换下卦时展示推导链 |
| `hData.xuankong.combinations[].palaces` | 组合所在宫位 | 在九宫格对应宫位加角标 |
| `hData.bazhai.directionMeasurement` | 候选宅卦、宅卦稳定性 | 宅卦不稳定时并列展示 |

**当前状态是最危险的**：引擎诚实地说"我有 2 个候选盘"，前端把这句话丢了，用户只看到一个确定答案。

---

## 优化实施路线

### 第一阶段：止血（1~2 天，7 处改动）

| 序 | 改动 | 文件 | 行数 |
|----|------|------|------|
| 1 | 冻结并使用 `baseHeading` | `public/index.html` | ~5 行 |
| 2 | 请求体守卫 8MB → 4MB | `api/index.js` | 1 行 |
| 3 | 采集分辨率 720→512、质量 0.8→0.65 | `public/index.html` | 2 行 |
| 4 | 无 GPS 时自动切地图模式 + 提示 | `public/index.html` | ~8 行 |
| 5 | 删除重复的铁律 K | `public/index.html` | 2 行 |
| 6 | `fallbackUsed` 时不写记忆、不入 history | `public/index.html` | ~4 行 |
| 7 | 修正 `STAR_RULES` 六白生克表述 | `public/index.html` | 1 行 |

### 第二阶段：准确性加固（3~5 天）

| 序 | 改动 | 说明 |
|----|------|------|
| 8 | 引擎加立春运界 | 改用 `periodFromDate`，无月日时输出边界提示 |
| 9 | 命卦口径声明 | 返回值加 `method`/`sourceNote`，前端展示 |
| 10 | 测量不确定性透出 | 九宫格上方显示 `measurement.warnings` 与候选山向 |
| 11 | 两级看门狗 | 首字节 60s / 无输出 30s，且思考期显示心跳 |
| 12 | 室内模式强制室外定向 | 无坐向时引导跳转 |
| 13 | 记忆加 `verified` 标记 | 不可信记忆不注入或标注注入 |
| 14 | 前端请求体预检 | 本地估算，超限立即提示 |

### 第三阶段：架构重构（1~2 周）

| 序 | 改动 | 说明 |
|----|------|------|
| 15 | 拆分 `index.html` 为 ES modules | 7 个模块，见 P2-12 |
| 16 | `STAR_RULES` 迁入引擎 | 让"确定性输出"的标注名副其实，每条标流派依据 |
| 17 | API 限流 + 同源校验 | Vercel Firewall + Origin 检查 |
| 18 | 前端补 E2E 测试 | Playwright 覆盖"采集→排盘"链路（当前测试盲区） |
| 19 | 隐私政策与同意流程 | 首次启动时明示"照片将上传至 X 服务商" |

---

## 验收清单

修复后应能通过以下检查：

- [ ] 罗盘模式连续 10 次勘测，`reqBody.heading` 恒等于基准锁定角
- [ ] 3 轮补拍后请求体 < 4MB，不再出现平台 413
- [ ] 飞行模式（无 GPS）下点击罗盘勘测，能自动切到地图模式并给出可执行指引
- [ ] 室内模式进入时若无坐向，提示先做室外定向而非直接排盘
- [ ] GLM `reasoning_effort: high` + 65536 tokens，思考 60s 不断线
- [ ] 构造 GLM 两次无正文场景，`chatHistory` 中不出现 `reasoning_content`
- [ ] 2024-01-15 建造的房子排为八运（若引擎加立春支持）
- [ ] 读数落在分界线 ±3° 内，界面显示候选山向与复测提示
- [ ] `localStorage.HOROSA_MEMORY` 中每条记录含 `verified` 与 `sitDegree`
- [ ] 全站 grep 不出现重复的"铁律 K"
