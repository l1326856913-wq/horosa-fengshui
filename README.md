# Horosa FengShui AR

实时风水堪舆系统：手机摄像头 + 罗盘 / 卫星地图拉线定向，后端 `mingyu-core` 引擎完成玄空飞星 + 八宅明镜排盘，前端调用多模态大模型结合实景进行堪舆分析。iOS PWA 风格，暗黑金 AR HUD。

## 目录结构（实际）

```
horosa-fengshui/
├── api/
│   └── index.js          # Vercel Serverless：/api/health、/api/horosa（排盘）、/api/map（高德静态图）、/api/ai（大模型流式代理）
├── public/
│   ├── index.html        # iOS PWA 前端：摄像头 AR、EMA 罗盘滤波、Leaflet 卫星图拉线定向、流式对话
│   ├── manifest.json     # PWA 配置
│   └── icon-*.png        # PWA 图标
├── dev-server.mjs        # 本地开发服务器（模拟 Vercel 环境）
├── test-engine.mjs       # mingyu-core 排盘引擎验证脚本
├── package.json
└── vercel.json           # Vercel 部署配置
```

## 运行方式

### 本地运行

```bash
npm install
node dev-server.mjs 8000
# 浏览器访问 http://localhost:8000
```

### Vercel 部署

```bash
npm i -g vercel
vercel        # 预览环境
vercel --prod # 生产环境
```

部署后必须使用 HTTPS 访问（Vercel 默认满足），否则手机无法授予摄像头与罗盘权限。

## 使用前配置（App 内右上角 ⚙️）

| 配置项 | 用途 | 必需性 |
|---|---|---|
| Gemini / DeepSeek / GLM API Key | 实景 AI 分析（密钥仅存本机 localStorage） | 三选一 |
| 高德 Web API Key | 大峦头外局静态地图 | 可选 |
| **住宅建造年或起运年** | 玄空飞星排盘（九运按 2024-2043 起运判定） | **必需** |
| 出生年份 + 性别 | 八宅命卦 | 可选 |

## 关键设计（防止幻觉与误差）

1. **理气与断语分离**：所有坐向、飞星、命卦均由 `mingyu-core` 确定性引擎计算，AI 只做解读，System Instruction 明确禁止 AI 重算或改写排盘数字。
2. **磁偏角自动修正**：手机罗盘输出磁北方位，后端按 GPS 坐标用 WMM（`geomagnetism`）计算当地磁偏角换算真北（北京约 -7.5°，不修正足以错判一整山）。
3. **双定向模式**：卫星地图拉线定向直接得到真北方位角（无需磁偏角）；罗盘模式走磁偏角修正链路。
4. **测量误差显式建模**：罗盘 ±3°、地图 ±1.5°，读数靠近二十四山分界或下卦/兼向边界时，引擎返回候选山向与复测警示而非强行下断。
5. **引擎业务校验**：缺建造年、缺 GPS、度数越界等情况返回可读的 400 提示，不伪造数据。

## 核心接口

- `POST /api/horosa`：`{ heading, northReference: 'magnetic'|'true', lat?, lng?, year(建造年), birthYear?, gender?, uncertainty? }` → 玄空 + 八宅完整排盘与结构化证据提示词
- `POST /api/ai`：`{ provider: 'gemini'|'deepseek'|'glm', apiKey, payload }` → 流式转发大模型 SSE（规避浏览器 CORS）
- `POST /api/map`：`{ lat, lng, gaode_key }` → 高德静态外局图 base64
- `GET /api/health`：健康检查

## 模型说明（2026-10 核实）

- Gemini：`gemini-3.1-pro-preview`
- DeepSeek：`deepseek-chat`（纯文本，自动降级为纯理气盲算）
- 智谱：`glm-5.3-flash`（原生多模态，支持图像输入；`glm-5.3` 旗舰为纯文本，勿用于看图）

## 已知风险与维护清单

**数据层**
- `geomagnetism` 内置 WMM-2025 地磁模型，**有效期至 2029 年 11 月**。过期后库会静默用旧模型外推（每年约漂移 0.1°），届时需升级该依赖或换用官方 WMM 新版。

**部署层**
- `vercel.json` 已设函数 `maxDuration: 300`（Hobby 上限；Pro 可更高）。AI 长回答依赖流式透传，若函数被提前截断，调高此值。
- API 无鉴权无限流，公开部署后任何人都可消耗你的函数配额。商用前建议加 IP 限流（如 Vercel Firewall / Upstash Rate Limit）。
- 高德 Key 建议在高德控制台绑定域名白名单，防止盗用。

**隐私与合规**
- 应会上传 GPS 坐标、罗盘读数、室内照片至所选大模型服务商（用户自己的 Key）。需在产品页明示并取得用户同意；商用前补充隐私政策与免责声明。
- AI 密钥存于浏览器 localStorage，存在 XSS 窃取面；面向公众商用时应改为服务端密钥 + 用户体系。

**测量操作层（准确性的最大变量）**
- 手机罗盘受金属、磁铁、手机壳、车内环境影响极大，测量前务必画"8"字校准并远离干扰源（App 已内置提示）。
- 读数落在二十四山分界或下卦/兼向边界（±4.5°）时，以引擎返回的候选山向警示为准，必须复测。
- 建造年、起运年、入宅年口径不同会导出不同运盘，填写前应确认采用哪一口径。

**免责声明**
本项目的排盘与 AI 分析结果仅供传统环境文化研究与参考，不构成建筑、装修、投资、医疗或其他专业决策依据。

## 开源许可

- 本项目核心排盘引擎 [mingyu-core](https://github.com/Brhiza/mingyu) 采用 **AGPL-3.0** 许可证，因此本项目整体以 **AGPL-3.0-only** 发布（见 `LICENSE` 文件）。
- 依 AGPL-3.0 约定：通过网络提供服务（如 Vercel 部署）也须向用户提供本项目的完整源代码——将本仓库公开即满足该要求。
- **闭源商用需另行获得 mingyu-core 作者的商业授权**，请勿直接用于闭源商业产品。
- 其他依赖：`geomagnetism`（Apache-2.0）；卫星图源为 Esri World Imagery（界面已按要求保留归属署名）；高德静态地图 API 需自行遵守高德开放平台服务条款。
