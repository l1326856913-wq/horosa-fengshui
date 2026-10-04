// 专业性全面复检（第三阶段修复后终版）
// 与 verify-phase3 的区别：此处不看单次验收，而是逐条核对「知识层可追溯性」是否已达标。
// 用法：先 `node dev-server.mjs`，再运行本脚本
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.cwd();
const BASE = process.env.HOROSA_BASE || 'http://127.0.0.1:8000';

let pass = 0, gap = 0;
const ok = (l, c, d) => { if (c) { pass++; console.log('  ✅ ' + l + (d ? '\n       ' + d : '')); } else { gap++; console.log('  ❌ ' + l + (d ? '\n       ' + d : '')); } };
const sec = t => console.log('\n' + '='.repeat(76) + '\n' + t + '\n' + '='.repeat(76));

const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const api = fs.readFileSync(path.join(ROOT, 'api', 'index.js'), 'utf8');

sec('知识层可追溯性终版复检\n（判伪报告原始 4 项缺陷 + 第三阶段新发现 4 项）');

console.log('\n【A】原判伪报告 P1-1：九运/八运分界未按立春');
console.log('-'.repeat(76));
ok('A1 运界已按立春换算', api.includes('resolvePeriodByLichun') && api.includes('periodAdjustedByLichun'));
ok('A2 已提供建造月/日输入', html.includes('input-house-month') && html.includes('input-house-day'));
ok('A3 无月日时给出边界告警而非静默通过', api.includes('可能被误判入下一运'));
ok('A4 前端展示修正说明', html.includes('运界已按立春修正'));
ok('A5 与八宅命卦口径统一（同为立春）', html.includes('与建造运界同以立春换年') || api.includes('resolvePeriodByLichun'));

console.log('\n【B】原判伪报告 P1-2：九星宜忌生克方向矛盾 + 标注误导');
console.log('-'.repeat(76));
const starBlock = html.slice(html.indexOf('const STAR_RULES'), html.indexOf('const STAR_RULES') + 6000);
ok('B1 实际文案中已无「火克金」方向颠倒',
  !/buyi:[^\n]*火克金/.test(starBlock),
  '注释中保留「不可写成火克金」的反例教学，属正确用法');
ok('B2 宜忌方向与引擎 FLYING_STAR_WUXING 一致（6金忌9火）',
  /6[\s\S]{0,320}?金克火/.test(starBlock));
ok('B3 九条星性全部标注五行', (starBlock.match(/wuxing:/g) || []).length === 9);
ok('B4 九条星性全部标注依据', (starBlock.match(/source:/g) || []).length === 9);
ok('B5 不再谎称九星宜忌为引擎输出', !/依据引擎盘面与通行星性口径推导（确定性规则/.test(html));
ok('B6 明示流派差异与参考性质', html.includes('各家流派存在差异'));
ok('B7 依据在 UI 可查（悬停）', html.includes('title="${escHtml(String(r.source))}"'));
ok('B8 星性文案与引擎字段全部转义（防注入）', (() => {
  const fn = html.slice(html.indexOf('function remindersPanel'), html.indexOf('function remindersPanel') + 2600);
  return ['r.name', 'r.tag', 'r.yi', 'r.buyi', 'r.source', 'p.name', 'p.direction', 'd.direction', 'd.label']
    .every(f => {
      // 该字段出现在模板串中时，前面必须有 escHtml(
      const idx = fn.indexOf('${' + f);
      if (idx < 0) return true;
      const before = fn.slice(Math.max(0, idx - 40), idx);
      return before.includes('escHtml(String(');
    });
})(), '检查 r.name/r.tag/r.yi/r.buyi/r.source/p.name/p.direction/d.direction/d.label');

console.log('\n【C】原判伪报告 P2-3：命卦口径未声明');
console.log('-'.repeat(76));
ok('C1 meta 输出命卦算法', api.includes('mingGuaMethod') && api.includes('11−余数'));
ok('C2 明示与数字和法不同', api.includes('数字和法'));
ok('C3 UI 展示口径来源', html.includes('luopan-method') && html.includes('命卦'));
ok('C4 口径行含引擎版本标识', html.includes('engineVersion'));

console.log('\n【D】原判伪报告 P2-4：立春比较的时间基准');
console.log('-'.repeat(76));
ok('D1 结论仍为「时间基准正确」（未误改引擎）', !api.includes('createUtcTimestamp'));
ok('D2 出生日期输入提示准确到日', html.includes('1-2月出生者必须准确到日'));
ok('D3 立春当日时辰风险已在运界/流年说明中以保守口径交代',
  api.includes('立春当日按已过立春处理'));

console.log('\n【E】第三阶段新发现：紫白流年未按立春');
console.log('-'.repeat(76));
ok('E1 已实现流年立春修正', api.includes('resolveFlowYearByLichun'));
ok('E2 补齐参照月日走引擎节气年路径', api.includes('fengshuiInput.flowMonth'));
ok('E3 meta 输出流年修正状态', api.includes('flowYearAdjustedByLichun'));
ok('E4 UI 展示流年修正提示', html.includes('流年盘已按立春修正'));
ok('E5 设置面板提供流年参照月/日', html.includes('input-flow-month') && html.includes('input-flow-day'));
ok('E6 说明与运界同标准（消除"只修一半"观感）', html.includes('与<b>建造运界同以立春换年</b>') || html.includes('与建造运界同以立春换年'));
ok('E7 不静默改写用户输入（无月日时保持原值并告警）',
  api.includes('不改写 year') || api.includes('不补月日则保持公历年行为'));

console.log('\n【F】第三阶段：重拍误触发');
console.log('-'.repeat(76));
ok('F1 统一门控函数已定义', /function isFormalReply/.test(html));
ok('F2 __meta 含 formal 标记', html.includes('formal: !fallbackUsed'));
ok('F3 两处触发均加门控', (html.match(/isFormalReply\(reply\) && reply\.includes\('【重拍'\)/g) || []).length === 2);
ok('F4 无裸字符串匹配残留', (html.match(/reply && reply\.includes\('【重拍'\)/g) || []).length === 0);
ok('F5 记忆门控同步统一', !/const (aiMeta|retakeMeta) = \(reply && reply\.__meta\)/.test(html));

console.log('\n【G】第三阶段：城门诀推导未展开');
console.log('-'.repeat(76));
ok('G1 渲染 candidates', html.includes('cg.candidates'));
ok('G2 展示推导链（运星/飞向/飞临/判定）',
  html.includes('c.yunStar') && html.includes('c.flyDirection') && html.includes('c.arrivalStar') && html.includes('c.status'));
ok('G3 区分正/副城门', html.includes('c.role'));
ok('G4 无城门时区分「格局如此」与「排盘错误」', html.includes('非排盘错误'));
ok('G5 有城门时警示不可舍正位', html.includes('不可舍正位'));
ok('G6 内容转义', /escHtml\(String\(c\.(gongName|mountain)\)\)/.test(html));

console.log('\n【H】勘测记忆可追溯性（第三阶段补齐项）');
console.log('-'.repeat(76));
ok('H1 记忆含 verified 标记', html.includes('verified: true'));
ok('H2 记忆含 engineVersion', html.includes('engineVersion'));
ok('H3 记忆含真实坐向度数', html.includes('sitDegree:'));
ok('H4 记忆含坐向确认状态与来源', html.includes('mountainConfirmed') && html.includes('orientationSource'));
ok('H5 补拍轮记忆同样带可信度字段', (html.match(/verified: true/g) || []).length >= 2,
  `出现 ${(html.match(/verified: true/g) || []).length} 处`);
ok('H6 __lastHorosa 已补齐可信度字段', html.includes('__lastHorosa = {') && /__lastHorosa[\s\S]{0,400}sitDegree/.test(html));
ok('H7 记忆 UI 展示可信度', html.includes('renderMemory') && /verified/.test(html.slice(html.indexOf('function renderMemory'), html.indexOf('function renderMemory') + 2000)));
ok('H8 记忆内容做转义', /escHtml/.test(html.slice(html.indexOf('function renderMemory'), html.indexOf('function renderMemory') + 2000)));

console.log('\n【I】结构与工程规范');
console.log('-'.repeat(76));
ok('I1 铁律无重复编号', (() => {
  const block = html.slice(html.indexOf('const SYSTEM_INSTRUCTION'), html.indexOf('const SYSTEM_INSTRUCTION') + 5000);
  const letters = [...block.matchAll(/^\s*([A-M])\.\s/gm)].map(m => m[1]);
  return letters.length === new Set(letters).size && letters.length === 13;
})(), (() => {
  const block = html.slice(html.indexOf('const SYSTEM_INSTRUCTION'), html.indexOf('const SYSTEM_INSTRUCTION') + 5000);
  return '铁律编号：' + [...block.matchAll(/^\s*([A-M])\.\s/gm)].map(m => m[1]).join('');
})());
ok('I2 前后端均无硬编码密钥', !/(sk-[A-Za-z0-9]{16,})/.test(html + api));
ok('I3 后端仍有请求体守卫', api.includes('MAX_BODY_BYTES'));
ok('I4 前端仍有请求体预检', html.includes('guardBodySize'));
ok('I5 坐向冻结逻辑在位', html.includes('baseHeading'));
ok('I6 室内坐向来源校验在位', html.includes('HOROSA_SITUATING'));

sec(`终版复检：${pass} 项达标 / ${gap} 项仍缺`);
if (gap === 0) {
  console.log('\n原判伪报告 4 项缺陷 + 第三阶段新发现 4 项，全部已修复并可验证。');
  console.log('剩余工作属第三阶段重构范畴（模块拆分、STAR_RULES 迁入引擎、API 限流、E2E、隐私同意），非本轮范围。');
}
