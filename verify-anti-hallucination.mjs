// 算法层防幻觉验收 v2 —— 以引擎为唯一裁判
//
// v1 的根本缺陷（本文件的重写理由）：
//   攻击样本由 AI 手写，核对规则也由 AI 手写，等于「自己给自己判卷」。
//   测试 49/49 全绿，但其中至少 3 条规则本身就是 AI 凭玄空记忆编的
//   （_GONG_ALIAS 方位表、guaType/formation 枚举、status 字符串语义），
//   全绿只证明「AI 的规则和 AI 的样本自洽」，不证明防线正确。
//
// v2 的原则：
//   1. 真值一律现取自 mingyu-core 真实输出，测试内不硬编码任何术数结论。
//   2. 攻击样本由「引擎真值机械变换」生成（改一个字即为错），
//      不再由我凭理解杜撰措辞。
//   3. 新增「非对称测试」：故意给核对层喂引擎真值，验证它不得报错——
//      若 AI 说对了却被拦，说明规则本身错了。
//   4. 新增「规则来源审计」：断言核对层不含任何术数硬编码值域。
//
// 运行：node verify-anti-hallucination.mjs（纯逻辑，无需启动服务）
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const jsSource = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)][0][1];

// 装载线上真实函数（不复制粘贴）
function sliceTopLevelDecl(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`未找到函数 ${name}`);
  const after = src.slice(start);
  const m = after.match(/\n {8}(?:async )?function [A-Za-z_$]|\n {8}const [A-Za-z_$][\w$]*\s*=/);
  const end = m ? start + m.index : src.length;
  return src.slice(start, end);
}
const _CN = (() => {
  const m = jsSource.match(/const _CN_DIGIT = \{[^}]*\};/);
  if (!m) throw new Error('未找到 _CN_DIGIT');
  return m[0];
})();

let buildFacts, verify, cnToNum, collectMountainChars;
try {
  const factory = new Function(
    `${_CN}\n`
    + `${sliceTopLevelDecl(jsSource, 'cnToNum')}\n`
    + `${sliceTopLevelDecl(jsSource, 'collectMountainChars')}\n`
    + `${sliceTopLevelDecl(jsSource, 'buildEngineFacts')}\n`
    + `${sliceTopLevelDecl(jsSource, 'verifyAIReply')}\n`
    + `return { buildEngineFacts, verifyAIReply, cnToNum, collectMountainChars };`
  );
  ({ buildEngineFacts: buildFacts, verifyAIReply: verify, cnToNum, collectMountainChars } = factory());
} catch (e) {
  console.error('装载被测代码失败：', e.message);
  process.exit(1);
}

// ── 引擎真实盘面（真值来源，全部现取）────────────────────────────
const RF = pathToFileURL(path.join(ROOT, 'node_modules', 'mingyu-core', 'dist', 'residential_fengshui', 'index.js')).href;
const rf = await import(RF);

function runEngine(deg, year) {
  return rf.generateResidentialFengshui({
    facingDegree: deg, year, northReference: 'true',
    birthYear: 1990, birthMonth: 6, birthDay: 15, gender: 'male', flowYear: 2026,
  });
}
const hData = runEngine(180, 2026);
const facts = buildFacts(hData);
const x = hData.xuankong;
const b = hData.bazhai;

let pass = 0, fail = 0;
const ok = (l, c, d) => { if (c) { pass++; console.log('  ✅ ' + l + (d ? '\n       ' + d : '')); } else { fail++; console.log('  ❌ ' + l + (d ? '\n       ' + d : '')); } };
const sec = t => console.log('\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));

// ── 攻击样本生成器：机械变换引擎真值，不杜撰措辞 ─────────────────
// 思路：取引擎真实结论，替换其中一个「语义单元」为另一个引擎中也出现过的值。
// 生成的句子在结构上与正确句完全同源，唯一差异就是那个被换掉的数字/字。
function corruptDigit(str) {
  const d = cnToNum(String(str).replace(/[^\d一二三四五六七八九]/g, '').slice(0, 1));
  if (d == null) return null;
  return cnToNum === null ? null : ({ 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 })[String(str).replace(/[^\d一二三四五六七八九]/g, '').slice(0, 1)];
}
const CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };
const otherDigit = n => { for (let i = 1; i <= 9; i++) if (i !== Number(n)) return i; return 1; };

sec('【第 1 关】事实表必须忠实反映引擎（真值对照）');
console.log('-'.repeat(78));
{
  ok('坐向取自引擎 inputSummary.orientationText',
    facts.orientationText === hData.inputSummary.orientationText,
    `facts=${facts.orientationText}  engine=${hData.inputSummary.orientationText}`);
  ok('局型取自引擎 xuankong.formation',
    facts.formation === x.formation, `${facts.formation}`);
  ok('卦型取自引擎 xuankong.guaType',
    facts.guaType === x.guaType, `${facts.guaType}`);
  ok('运数取自引擎 period.yun', facts.yunNumber === x.period.yun, `${facts.yunNumber}`);
  ok('命卦取自引擎 bazhai.mingGua', facts.mingGua === b.mingGua, `${facts.mingGua}`);
  ok('城门 hasUsableGate 保留引擎布尔类型',
    facts.hasUsableGate === x.castleGate.hasUsableGate,
    `facts=${facts.hasUsableGate}(${typeof facts.hasUsableGate})  engine=${x.castleGate.hasUsableGate}`);

  const palaceCount = Object.keys(facts.palaceStars).length;
  ok('九宫全部收录', palaceCount === x.palaces.length, `${palaceCount}/${x.palaces.length}`);

  let dirAllMatch = true, starAllMatch = true;
  x.palaces.forEach(pl => {
    const f = facts.palaceStars[String(pl.gong)];
    if (!f) { dirAllMatch = false; return; }
    if (f.direction !== pl.direction) dirAllMatch = false;
    if (Number(f.shan) !== Number(pl.shanStar)) starAllMatch = false;
    if (Number(f.xiang) !== Number(pl.xiangStar)) starAllMatch = false;
    if (Number(f.yun) !== Number(pl.yunStar)) starAllMatch = false;
  });
  ok('每宫 direction 与引擎完全一致（未使用前端映射表）', dirAllMatch);
  ok('每宫 运/山/向 三星与引擎完全一致', starAllMatch);

  // 非对称检验：事实表里不得出现引擎从未给出的值
  const engineStars = new Set();
  x.palaces.forEach(pl => { engineStars.add(pl.yunStar); engineStars.add(pl.shanStar); engineStars.add(pl.xiangStar); });
  const factStars = new Set();
  Object.values(facts.palaceStars).forEach(p => { factStars.add(p.yun); factStars.add(p.shan); factStars.add(p.xiang); });
  const invented = [...factStars].filter(v => !engineStars.has(v));
  ok('事实表未凭空产生引擎之外的星值', invented.length === 0,
    invented.length ? `凭空值：${invented.join(',')}` : '');
}

sec('【第 2 关】攻击样本由引擎真值反向生成并全部被拦截');
console.log('-'.repeat(78));
{
  // 逐宫生成：取引擎真实 (gong, shan, xiang)，把其中一个数字换成别的
  const attacks = [];
  for (const key of Object.keys(facts.palaceStars)) {
    const p = facts.palaceStars[key];
    if (!p.gongChar || !p.direction) continue;
    const badShan = otherDigit(p.shan);
    const badXiang = otherDigit(p.xiang);
    if (String(badShan) !== String(p.shan)) {
      attacks.push({
        name: `${p.gongChar}宫山星篡改`,
        text: `${p.gongChar}宫山星${CN[badShan]}`,
        expectField: `${p.gongChar}宫山星`,
      });
    }
    if (String(badXiang) !== String(p.xiang)) {
      attacks.push({
        name: `${p.direction}向星篡改`,
        text: `${p.direction}向星${CN[badXiang]}`,
        expectField: null,
      });
    }
  }
  let caught = 0, missed = [];
  attacks.forEach(a => {
    const r = verify(a.text, facts);
    if (r.violations.length) caught++; else missed.push(a.name + ' → "' + a.text + '"');
  });
  ok(`九宫飞星篡改全部拦截（${caught}/${attacks.length}）`, missed.length === 0,
    missed.length ? '漏检：' + missed.join('; ') : `样本由引擎真值机械生成，覆盖 ${new Set(attacks.map(a => a.name.split('宫')[0] + '宫')).size} 宫`);

  // 坐向篡改：取引擎真值本身作为错值（它与当前盘必不相同）
  const allOrient = [];
  for (let d = 0; d < 360; d += 15) {
    try { allOrient.push(runEngine(d, 2026).inputSummary.orientationText); } catch (e) { }
  }
  const wrongOrient = allOrient.find(o => o && o !== facts.orientationText);
  const r1 = verify(`此局${wrongOrient}`, facts);
  ok('坐向篡改被拦截', r1.violations.length > 0, `"${wrongOrient}" vs 引擎 "${facts.orientationText}"`);

  // 正确坐向不得被误拦
  const r1b = verify(`此局${facts.orientationText}`, facts);
  ok('正确坐向零误报', r1b.violations.length === 0,
    r1b.violations.length ? JSON.stringify(r1b.violations) : facts.orientationText);

  // 运数篡改
  const badYun = otherDigit(facts.yunNumber);
  const r2 = verify(`此局为${CN[badYun]}运`, facts);
  ok('运数篡改被拦截', r2.violations.length > 0, `${CN[badYun]}运 vs 引擎 ${CN[facts.yunNumber]}运`);

  // 局型篡改：把引擎 formation 换成另一个引擎真实存在的 formation
  const allForms = new Set();
  for (let d = 0; d < 360; d += 5) { try { allForms.add(runEngine(d, 2024).xuankong.formation); } catch (e) { } }
  const badForm = [...allForms].find(v => v && v !== facts.formation);
  const r3 = verify(`此局局型为${badForm}`, facts);
  ok('局型篡改被拦截', r3.violations.length > 0, `"${badForm}" vs 引擎 "${facts.formation}"`);

  // 城门：直接用引擎 hasUsableGate 的反面断言
  const gateName = x.castleGate.candidates[0] && x.castleGate.candidates[0].gongName;
  if (gateName) {
    const claim = facts.hasUsableGate ? '不可用' : '可用';
    const r4 = verify(`${gateName}方为正城门，${claim}`, facts);
    ok('城门可用性与引擎布尔相反时被拦截', r4.violations.length > 0,
      `引擎 hasUsableGate=${facts.hasUsableGate}，AI 称「${claim}」`);
  }

  // 四吉四凶：用引擎 lucky/unlucky 的 direction 交叉断言
  const lucky = b.luckyDirections[0];
  const unlucky = b.unluckyDirections[0];
  if (lucky && unlucky) {
    const r5 = verify(`${lucky.direction}方为凶位。${unlucky.direction}方为吉位。`, facts);
    ok('四吉四凶方位对调被拦截', r5.violations.length >= 2,
      `引擎 ${lucky.direction}=吉(${lucky.label})，${unlucky.direction}=凶(${unlucky.label})`);
  }

  // 命卦 / 宅卦
  const otherGua = ['坎', '艮', '震', '巽', '离', '坤', '乾'].find(g => g !== b.mingGua);
  const r6 = verify(`命卦为${otherGua}`, facts);
  ok('命卦篡改被拦截', r6.violations.length > 0, `${otherGua} vs 引擎 ${b.mingGua}`);

  const r7 = verify(`命宅关系相${b.match === '相合' ? '冲' : '合'}`, facts);
  ok('命宅关系篡改被拦截', r7.violations.length > 0, `引擎 match=${b.match}`);
}

sec('【第 3 关】非对称测试：AI 说对了绝不能被拦（规则自身的正确性）');
console.log('-'.repeat(78));
{
  // 这是 v1 缺失的关键方向。v1 只测「错的是否被抓」，
  // 没测「对的是否被误抓」——而后者才是规则写错的表现。
  // 若某条规则把正确答案判成幻觉，说明该规则是 AI 编的，不是引擎驱动的。
  const truthText = [
    `引擎排盘已在上方面板给出。`,
    `${facts.orientationText}，属${facts.yunNumber}运。`,
    `${facts.formation}。`,
    `命卦${facts.mingGua}。`,
    ...Object.values(facts.palaceStars).map(p =>
      `${p.gongChar}宫山星${CN[p.shan]}，向星${CN[p.xiang]}，运星${CN[p.yun]}，${p.relation}。`),
    ...facts.luckyDirections.map(d => `${d.direction}方为${d.label}，属吉位。`),
  ].join('\n');
  const r = verify(truthText, facts);
  ok('逐宫飞星全量正确表述零误报', r.violations.length === 0,
    r.violations.length ? JSON.stringify(r.violations.slice(0, 3)) : `${Object.keys(facts.palaceStars).length} 宫全对`);

  // 四吉四凶罗列句不应被逐方位误判
  const luckyDirs = facts.luckyDirections.map(d => d.direction);
  const r2 = verify(`四吉位在${luckyDirs.join('、')}。`, facts);
  ok('四吉位罗列句零误报', r2.violations.length === 0,
    r2.violations.length ? JSON.stringify(r2.violations) : luckyDirs.join('、'));

  // 方位名长匹配：东北不应被切成「东」
  const ne = facts.unluckyDirections.find(d => /东北|西北|东南|西南/.test(d.direction));
  if (ne) {
    const r3 = verify(`${ne.direction}方为凶位。`, facts);
    ok(`复合方位「${ne.direction}」零误报`, r3.violations.length === 0,
      r3.violations.length ? JSON.stringify(r3.violations) : ne.label);
  }

  // 卦型：引擎给什么就说什么，必须零误报
  const r4 = verify(`卦型为${facts.guaType}`, facts);
  ok('卦型正确表述零误报', r4.violations.length === 0,
    r4.violations.length ? JSON.stringify(r4.violations) : facts.guaType);

  // 引擎说无城门时，AI 如实说"无合格城门"不应被拦
  if (facts.hasUsableGate === false) {
    const r5 = verify('本盘无合格城门，两旁均未得旺。', facts);
    ok('如实陈述"无城门"零误报', r5.violations.length === 0,
      r5.violations.length ? JSON.stringify(r5.violations) : 'hasUsableGate=false');
  }
}

sec('【第 4 关】规则来源审计：核对层不得含术数硬编码');
console.log('-'.repeat(78));
{
  const vbody = sliceTopLevelDecl(jsSource, 'verifyAIReply');
  const fbody = sliceTopLevelDecl(jsSource, 'buildEngineFacts');

  // 已被 v1 引入、v2 必须移除的三处 AI 自造知识
  ok('已移除 _GONG_ALIAS 九宫方位映射表', !/_GONG_ALIAS\s*=\s*\{/.test(jsSource));
  ok('已移除 _STAR_LABEL 星名表', !/_STAR_LABEL\s*=\s*\{/.test(jsSource));
  // 代码行本身不得再出现枚举赋值；注释中提及历史值（用于说明修正理由）不算违规。
  const codeLines = jsSource.split('\n')
    .map(l => l.replace(/\/\/.*$/, '').trim())
    .filter(Boolean);
  const hasEnumAssign = kw => codeLines.some(l => new RegExp(kw + '\\s*=').test(l));
  const hasLiteralList = lits => codeLines.some(l => lits.every(x => l.includes("'" + x + "'")));

  ok('已移除 guaType 硬编码枚举（正卦/下卦/上卦/全卦）',
    !hasLiteralList(['正卦', '下卦', '上卦', '全卦']));
  ok('已移除 formation 硬编码枚举',
    !hasLiteralList(['旺山旺向', '上山下水', '双星到坐', '双星到向'])
    || !codeLines.some(l => /forms\s*=\s*\[/.test(l)));
  ok('卦型比对改为全等裁决而非枚举比对',
    /matchAgainstEngine\('卦型', f\.guaType/.test(vbody));
  ok('局型比对改为全等裁决而非枚举比对',
    /matchAgainstEngine\('局型', f\.formation/.test(vbody));
  ok('已移除山向生克关系硬编码词表',
    !hasLiteralList(['克出', '克入', '生出', '生入', '比和'])
    || !codeLines.some(l => /relations\s*=\s*\[/.test(l)));

  // 九宫键必须来自引擎 gong 字段
  ok('九宫键取自引擎 pl.gong', /const key = String\(pl\.gong\)/.test(fbody));

  // 捕获组用具名，避免索引错位（曾因此静默漏检）
  ok('九宫核对使用具名捕获组 <alt>/<n>',
    /\?<alt>/.test(vbody) && /\?<n>/.test(vbody));
  ok('山名字符集被包成字符类（否则量词作用于整串）',
    /return body \? '\[' \+ body \+ '\]' : '';/.test(jsSource));

  // 关系词表必须由引擎值去重生成
  ok('生克关系词表由引擎本次输出去重生成',
    /new Set\(\s*Object\.values\(f\.palaceStars\)\s*\.map\(p => p\.relation\)/.test(vbody));

  // 城门必须用引擎布尔字段
  ok('城门判定使用引擎 hasUsableGate 布尔字段',
    /f\.hasUsableGate != null/.test(vbody) && /f\.hasUsableGate \?/.test(vbody));
  ok('城门不再从 status 字符串猜可用性',
    !/\/可用\|合\/\.test\(g\.status\)/.test(vbody));

  // 吉凶真值来自引擎 luck 字段
  ok('四吉四凶真值取自引擎 luck 字段', /luck: '吉'/.test(vbody) && /luck: '凶'/.test(vbody));
  ok('对照表展示引擎给的 label 依据', /t\.label/.test(vbody));
}

sec('【第 5 关】无引擎依据处必须放弃核对（不得用默认值硬比）');
console.log('-'.repeat(78));
{
  const minimal = buildFacts({ xuankong: { period: { yun: 9, yunStar: 9, label: '下元9运' }, palaces: [] } });
  ok('无 palaces 时事实表为空', Object.keys(minimal.palaceStars).length === 0);
  ok('无城堡门数据时 castleGates 为空', minimal.castleGates.length === 0);
  const r = verify('此局山星入囚，东南为可用城门，忌火。', minimal);
  ok('引擎无依据处不产生误报（宁漏检不误拦）', r.violations.length === 0,
    '无基准可比时放行；禁止用前端默认值硬比');

  const noGua = buildFacts({ xuankong: { formation: null, palaces: [] } });
  const r2 = verify('局型为双星到坐。', noGua);
  ok('引擎 formation 为空时不核对局型', r2.violations.length === 0);

  const noGate = buildFacts({ xuankong: { castleGate: { candidates: [] }, palaces: [] } });
  const r3 = verify('正城门在乾方，可用。', noGate);
  ok('hasUsableGate 未知时城门不核对', r3.violations.length === 0);
}

sec('【第 6 关】性能与健壮性');
console.log('-'.repeat(78));
{
  const long = '东南方形煞明显，建议调整。\n'.repeat(200);
  const t0 = Date.now();
  verify(long, facts);
  const dt = Date.now() - t0;
  ok('长文本核对不超时', dt < 2000, `${dt}ms / ${long.length} 字符`);
  ok('无事实表时安全返回', (() => { const r = verify('任意文本', null); return r && Array.isArray(r.violations); })());
  ok('空回复不报错', (() => { try { verify('', facts); return true; } catch (e) { return false; } })());
  ok('非字符串回复不崩溃', (() => { try { verify(null, facts); verify(undefined, facts); return true; } catch (e) { return false; } })());
  ok('事实表缺字段时不误报', buildFacts({}) && verify('坐子向午，局型双星到坐。', buildFacts({})).violations.length === 0);
}

sec('【第 7 关】提示词层算法隔离条款');
console.log('-'.repeat(78));
{
  const si = jsSource.match(/const SYSTEM_INSTRUCTION = `([\s\S]*?)`;/)[1];
  const letters = (si.match(/\n([A-O])\. /g) || []).map(s => s.trim()[0]);
  ok('铁律编号唯一且连续 A→O', letters.join('') === 'ABCDEFGHIJKLMNO', letters.join(''));
  ok('A 条：定位为翻译器而非排盘引擎', /翻译器/.test(si) && /不是第二个排盘引擎/.test(si));
  ok('A 条：禁止复述引擎数字', /禁止复述/.test(si));
  ok('B 条：引擎无结论时不得补造', /无结论即无话可说/.test(si) && /绝不允许补造/.test(si));
  ok('B 条：四类禁区已枚举',
    /不得指定任何城门方位/.test(si) && /不得自行判断吉凶方位/.test(si)
    && /不得推断命卦/.test(si) && /不得谈流年/.test(si));
  ok('C 条：默认正文零术数数字', /数字纪律/.test(si) && /不允许出现任何术数数字/.test(si));
  ok('旧「以引擎排盘要点开篇」指令已移除', !/以"引擎排盘要点"开篇/.test(si));
  ok('数据邻近处有【只读声明】', /const readonlyNote = '【只读声明】/.test(jsSource));
  ok('只读声明位于排盘数据之前',
    jsSource.indexOf('${readonlyNote}') < jsSource.indexOf('${evidencePrompt}'));
  ok('补拍轮有【只读提醒】', /【只读提醒】/.test(jsSource));
  const callAI = sliceTopLevelDecl(jsSource, 'callAIStream');
  ok('核对位于 callAIStream 内（三路径全覆盖）', /verifyAIReply/.test(callAI));
  ok('兜底路径跳过核对', /if \(!fallbackUsed\)/.test(callAI));
}

sec(`验收结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
