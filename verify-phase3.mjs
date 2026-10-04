// 第三阶段专业性修复验收脚本
// 覆盖：流年立春 / 星性出处与标注 / 统一门控 / 城门诀展开
// 用法：先 `node dev-server.mjs` 启动本地服务，再运行本脚本
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.env.HOROSA_BASE || 'http://127.0.0.1:8000';
const ROOT = process.cwd();

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log('  ✅ ' + label + (detail ? '\n       ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + label + (detail ? '\n       ' + detail : '')); }
};
const sec = t => console.log('\n' + '='.repeat(76) + '\n' + t + '\n' + '='.repeat(76));

async function horosa(body) {
  const r = await fetch(BASE + '/api/horosa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ northReference: 'true' }, body)),
  });
  return { status: r.status, json: await r.json() };
}

sec('第三阶段专业性修复验收（第一、二阶段回归同步执行）');

const BASE_BODY = { heading: 180, year: 2015 }; // 九运 子山午向
const BIRTH = { birthYear: 1990, birthMonth: 6, birthDay: 15, gender: 'male' };

// ---------- 1. 流年立春换年 ----------
console.log('\n【第 1 项】紫白流年盘按立春换年');
console.log('-'.repeat(76));

{
  // 2026-01-15 早于 2026 立春（2/4 04:02）→ 年盘应回退到 2025 干支年（二黑）
  const a = await horosa({ ...BASE_BODY, ...BIRTH, flowYear: 2026 });
  const b = await horosa({ ...BASE_BODY, ...BIRTH, flowYear: 2026, flowMonth: 1, flowDay: 15 });
  ok('立春前（2026-01-15）年盘回退到 2025 干支年',
    b.json?.data?.xuankong?.flowStars?.yearPlate?.year === 2025,
    `yearPlate.year = ${b.json?.data?.xuankong?.flowStars?.yearPlate?.year}，`
    + `入中 ${b.json?.data?.xuankong?.flowStars?.yearPlate?.centerStar}（${b.json?.data?.xuankong?.flowStars?.yearPlate?.starName}）`);
  ok('未提供参照月日时不静默改写（保持 2026）',
    a.json?.data?.xuankong?.flowStars?.yearPlate?.year === 2026,
    `yearPlate.year = ${a.json?.data?.xuankong?.flowStars?.yearPlate?.year}`);
  ok('未提供月日时 meta 给出立春边界告警',
    typeof a.json?.meta?.flowYearBoundaryNote === 'string' && a.json.meta.flowYearBoundaryNote.includes('立春'),
    (a.json?.meta?.flowYearBoundaryNote || '').slice(0, 70) + '…');
  ok('修正时 meta.flowYearAdjustedByLichun = true',
    b.json?.meta?.flowYearAdjustedByLichun === true);
  ok('修正时 meta 记录 requestedFlowYear',
    b.json?.meta?.requestedFlowYear === 2026,
    `requestedFlowYear = ${b.json?.meta?.requestedFlowYear}`);
  ok('修正说明含立春精确时刻',
    typeof b.json?.meta?.flowYearBoundaryNote === 'string' && /\d{2}:\d{2}:\d{2}/.test(b.json.meta.flowYearBoundaryNote),
    b.json?.meta?.flowYearBoundaryNote);

  // 立春后不回退
  const c = await horosa({ ...BASE_BODY, ...BIRTH, flowYear: 2026, flowMonth: 6, flowDay: 1 });
  ok('立春后（2026-06-01）不回退',
    c.json?.data?.xuankong?.flowStars?.yearPlate?.year === 2026
    && c.json?.meta?.flowYearAdjustedByLichun === false,
    `yearPlate.year = ${c.json?.data?.xuankong?.flowStars?.yearPlate?.year}`);
  ok('立春前后入中星确实不同（证明修正有效而非巧合）',
    a.json?.data?.xuankong?.flowStars?.yearPlate?.centerStar
    !== b.json?.data?.xuankong?.flowStars?.yearPlate?.centerStar,
    `2026 公历口径=${a.json?.data?.xuankong?.flowStars?.yearPlate?.centerStar}，`
    + `2026-01-15 修正后=${b.json?.data?.xuankong?.flowStars?.yearPlate?.centerStar}`);
}

// ---------- 2. 星性出处与标注 ----------
console.log('\n【第 2 项】星性宜忌表出处与误导性标注');
console.log('-'.repeat(76));
{
  const fs = await import('node:fs');
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const block = html.slice(html.indexOf('const STAR_RULES'), html.indexOf('const STAR_RULES') + 6000);

  // 按 "N: {" 逐条切分（对象为多行格式，不能用单行正则）
  const starKeys = [...block.matchAll(/^\s{12}(\d):\s*\{/gm)].map(m => Number(m[1]));
  ok('STAR_RULES 九条齐全', starKeys.length === 9 && starKeys.join(',') === '1,2,3,4,5,6,7,8,9',
    `解析到 ${starKeys.length} 条：${starKeys.join(',')}`);

  // 逐条取正文
  const bodies = {};
  [...block.matchAll(/^\s{12}(\d):\s*\{/gm)].forEach((m, i, arr) => {
    const start = m.index + m[0].length;
    const end = i + 1 < arr.length ? arr[i + 1].index : block.length;
    bodies[m[1]] = block.slice(start, end);
  });
  const noSource = Object.keys(bodies).filter(k => !/source:/.test(bodies[k]));
  ok('每条星性均有 source 出处', noSource.length === 0,
    noSource.length ? '缺 source：' + noSource.join(',') : '1-9 全部标注');
  const noWuxing = Object.keys(bodies).filter(k => !/wuxing:/.test(bodies[k]));
  ok('每条星性标注五行（便于与引擎 FLYING_STAR_WUXING 交叉核对）', noWuxing.length === 0,
    noWuxing.length ? '缺 wuxing：' + noWuxing.join(',') : '');
  // 依据可为典籍引用，也可为明示的「各家共识」型表述（不得两者皆无）
  const noDeyin = Object.keys(bodies).filter(k => !/《|各家共识/.test(bodies[k]));
  ok('每条依据均引典籍或明示为通行共识', noDeyin.length === 0,
    noDeyin.length ? '依据缺失：' + noDeyin.join(',') : '');
  ok('五黄忌动土标为共识而非伪托典籍（诚实标注）',
    /source:\s*'各家共识/.test(bodies['5'] || ''),
    (bodies['5'] || '').match(/source:[^\n]*/)?.[0]?.slice(0, 60));
  ok('已消除「火克金」方向颠倒', !block.includes('火克金'));
  ok('remindersPanel 不再声称九星宜忌为「引擎输出」',
    !/依据引擎盘面与通行星性口径推导（确定性规则/.test(html));
  ok('remindersPanel 诚实标注为本地口径表且声明流派差异',
    html.includes('通行星性口径归纳表') && html.includes('各家流派存在差异'));
  ok('source 字段在 UI 可见（〔依据〕标记 + 悬停提示）',
    html.includes('star-src') && /title="\$\{escHtml\(String\(r\.source\)\)\}"/.test(html));
  ok('依据标记每星仅显示一次（避免刷屏）', html.includes('srcShown.has(star)'));
  ok('星性文案与引擎字段全部转义（防注入）', (() => {
    // 全量扫描：任何形如 ${p.xxx} / ${r.xxx} / ${c.xxx} / ${d.xxx} 的裸露插入都算缺陷
    const panel = html.slice(html.indexOf('function enginePanel'), html.indexOf('function enginePanel') + 9000)
      + html.slice(html.indexOf('function remindersPanel'), html.indexOf('function remindersPanel') + 3000);
    const bare = [...panel.matchAll(/\$\{[^}]*\.(name|direction|label|tag|yi|buyi|source|shanXiangRelation|yunStarState|status|role|mountain|gongName)\b[^}]*\}/g)]
      .map(m => m[0])
      .filter(s => !s.includes('escHtml'));
    return bare.length === 0;
  })(), '排盘面板与宜忌面板中所有引擎/星性字段均经 escHtml');
  ok('九宫格 palace 字段已转义',
    /escHtml\(String\(p\.name\)\)/.test(html) && /escHtml\(String\(p\.shanXiangRelation/.test(html));
}

// ---------- 3. 统一门控 ----------
console.log('\n【第 3 项】重拍触发接入统一门控');
console.log('-'.repeat(76));
{
  const fs = await import('node:fs');
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  ok('已定义统一门控函数 isFormalReply', /function isFormalReply\(reply\)/.test(html));
  ok('__meta 补齐 formal 标记',
    /formal:\s*!fallbackUsed\s*&&\s*!streamTimedOut\s*&&\s*!!fullReply/.test(html));
  const rawMatches = (html.match(/reply\s*&&\s*reply\.includes\('【重拍'\)/g) || []).length;
  ok('已无未加门控的裸字符串匹配', rawMatches === 0, `剩余裸匹配 ${rawMatches} 处`);
  const guarded = (html.match(/isFormalReply\(reply\)\s*&&\s*reply\.includes\('【重拍'\)/g) || []).length;
  ok('两处重拍触发均已加门控', guarded === 2, `已加门控 ${guarded} 处（首轮 + 补拍轮）`);
  const inlineMeta = (html.match(/__meta\s*\|\|\s*\{\}/g) || []).length;
  ok('记忆写入已统一改用 isFormalReply（不再散写 meta 判定）',
    !/const (aiMeta|retakeMeta) = \(reply && reply\.__meta\)/.test(html),
    `残留散写判定 ${inlineMeta} 处`);
  ok('无 __meta 的旧路径按非正式处理（fail-safe）',
    /return m\.formal === true;/.test(html));
}

// ---------- 4. 城门诀展开 ----------
console.log('\n【第 4 项】城门诀推导过程展开');
console.log('-'.repeat(76));
{
  const fs = await import('node:fs');
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  ok('渲染 candidates 数组', /cg\.candidates/.test(html) || /Array\.isArray\(cg\.candidates\)/.test(html));
  ok('展示运星与飞向', html.includes('运星') && html.includes('flyDirection'));
  ok('展示飞临星', html.includes('arrivalStar'));
  ok('展示判定结论（status）', html.includes('c.status'));
  ok('区分正城门/副城门', html.includes('c.role'));
  ok('无城门时说明「属格局本身如此，非排盘错误」',
    html.includes('非排盘错误'));
  ok('有城门时提示不可舍正位强取城门', html.includes('不可舍正位'));
  ok('已加对应样式', html.includes('.luopan-castle-detail'));
  ok('内容做 escHtml 转义', /escHtml\(String\(c\.(role|gongName|mountain|status)\)\)/.test(html));

  // 实跑确认引擎确实给出可展开的数据
  const r = await horosa({ ...BASE_BODY, ...BIRTH });
  const cg = r.json?.data?.xuankong?.castleGate;
  ok('引擎实际返回 candidates 供前端展开',
    Array.isArray(cg?.candidates) && cg.candidates.length > 0,
    cg?.candidates?.map(c => `${c.role}${c.gongName}(运${c.yunStar}${c.flyDirection}→${c.arrivalStar}) ${c.status}`).join('；'));
}

// ---------- 5. 前两阶段回归 ----------
console.log('\n【回归】第一、二阶段修复仍然有效');
console.log('-'.repeat(76));
{
  const okR = await horosa({ ...BASE_BODY, ...BIRTH, flowYear: 2026, flowMonth: 1, flowDay: 15 });
  ok('运界立春修正仍生效（2024-01-15 建造 → 八运）',
    (await horosa({ heading: 180, year: 2024, houseMonth: 1, houseDay: 15, ...BIRTH }))
      .json?.data?.xuankong?.period?.yun === 8);
  ok('P0-2 请求体 413 守卫仍生效',
    (await (await fetch(BASE + '/api/horosa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heading: 180, year: 2015, pad: 'x'.repeat(5 * 1024 * 1024) }),
    })).status) === 413);
  ok('P0-4 磁北缺 GPS → 400 仍生效',
    (await horosa({ heading: 180, year: 2015, northReference: 'magnetic' })).status === 400);
  ok('命卦口径声明仍在 meta 中',
    typeof okR.json?.meta?.mingGuaMethod?.method === 'string');
  ok('测量不确定性仍在 meta 中', 'measurement' in (okR.json?.meta || {}));
  ok('流年修正未破坏运界修正（两项独立共存）',
    okR.json?.meta?.periodAdjustedByLichun === false
    && okR.json?.meta?.flowYearAdjustedByLichun === true,
    `periodAdjusted=${okR.json?.meta?.periodAdjustedByLichun}, flowYearAdjusted=${okR.json?.meta?.flowYearAdjustedByLichun}`);
}

sec(`验收结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
