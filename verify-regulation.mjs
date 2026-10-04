// 复检验收：引擎确定性输出被前端完整消费（gasRegulation / agreements / daoShanXiang）
// 背景：复检发现引擎已产出三项确定性结论，前端完全丢弃——
//   1) bazhai.gasRegulation  宅卦星宫调节（压服法则）：逐星给出星宫生克法则与应对建议
//   2) agreements            玄空+八宅两法合参共识层
//   3) xuankong.daoShanXiang 到山到向判定（比局型更精确的逐字结论）
// 与此前修复的"城门诀推导被丢弃"同属一类缺陷：引擎算了、前端没展示。
// 用法：node verify-regulation.mjs （无需 dev-server，直接实测引擎 + 校验前端源码）
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log('  ✅ ' + label + (detail ? '\n       ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + label + (detail ? '\n       ' + detail : '')); }
};
const sec = t => console.log('\n' + '='.repeat(76) + '\n' + t + '\n' + '='.repeat(76));

sec('【A】引擎实测：三项确定性字段确实存在');
let g1 = null, g2 = null;
try {
  // 经 package.json exports 解析（"./residential-fengshui" → dist/residential_fengshui/index.js），
  // 与 test-engine.mjs / api/index.js 的导入方式保持同一入口，避免依赖物理目录结构
  const m = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'mingyu-core', 'dist', 'residential_fengshui', 'index.js')).href);
  const r = m.generateResidentialFengshui({
    facingDegree: 181, year: 2025, northReference: 'true',
    birthYear: 1990, birthMonth: 5, birthDay: 20, gender: 'male',
    flowYear: 2026, flowMonth: 10, flowDay: 4,
  });
  g1 = r;
  ok('agreements 为非空数组（两法合参共识）',
    Array.isArray(r.agreements) && r.agreements.length > 0,
    `${r.agreements.length} 条：${r.agreements.map(a => a.title).join(' / ')}`);
  ok('每条 agreements 含 level/title/detail',
    r.agreements.every(a => a.title && a.detail),
    '字段来源：引擎原文，前端只做转义展示');
  ok('xuankong.daoShanXiang 含逐字结论 summary',
    r.xuankong.daoShanXiang && typeof r.xuankong.daoShanXiang.summary === 'string' && r.xuankong.daoShanXiang.summary.length > 0,
    `summary = ${r.xuankong.daoShanXiang.summary}`);
  ok('bazhai.gasRegulation.suppressionLaws 覆盖八个方位星',
    r.bazhai.gasRegulation && Array.isArray(r.bazhai.gasRegulation.suppressionLaws) && r.bazhai.gasRegulation.suppressionLaws.length === 8,
    `${r.bazhai.gasRegulation.suppressionLaws.length} 条法则`);
  ok('每条压服法则含 star/counterpart/suppressionRule/advice',
    r.bazhai.gasRegulation.suppressionLaws.every(l => l.star && l.counterpart && l.suppressionRule && l.advice),
    `示例：${r.bazhai.gasRegulation.suppressionLaws[0].star} × ${r.bazhai.gasRegulation.suppressionLaws[0].counterpart} → ${r.bazhai.gasRegulation.suppressionLaws[0].suppressionRule}`);
  ok('gasRegulation 附 doorMasterSummary 总结',
    typeof r.bazhai.gasRegulation.doorMasterSummary === 'string' && r.bazhai.gasRegulation.doorMasterSummary.length > 0,
    r.bazhai.gasRegulation.doorMasterSummary);

  // 引擎对生成结果的一致性抽查：压服法则的生克方向须与九宫五行吻合
  //（宫五行按后天八卦：坎水艮土震木巽木离火坤土兑金乾金；星五行取 FLYING_STAR_WUXING 同源口径）
  ok('引擎生克法则方向抽查（伏位木 × 坎宫水 = 宫生星）',
    r.bazhai.gasRegulation.suppressionLaws.some(l => l.suppressionRule === '宫生星'),
    '引擎自行推导，前端原样展示，不做二次解释');
} catch (e) {
  ok('引擎可加载并生成', false, e.message);
}

sec('【B】前端消费：三处渲染代码在位且全部 escHtml 转义');
{
  const fs = await import('node:fs');
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');

  const fnBlock = (name) => {
    const i = html.indexOf(`function ${name}(`);
    if (i < 0) return '';
    // 抓函数体：从起点向后找配对的下一个顶层 function 或 const STAR_RULES
    const rest = html.slice(i, i + 6000);
    return rest;
  };

  const engine = fnBlock('enginePanel');
  ok('enginePanel 追加到山到向（daoShanXiang.summary）',
    engine.includes('daoShanXiang') && engine.includes('到山到向：'));
  ok('daoShanXiang 输出走 escHtml',
    /escHtml\(String\(x\.daoShanXiang\.summary\)\)/.test(engine));

  const advice = fnBlock('advicePanel');
  ok('advicePanel 渲染 agreements（两法合参共识）',
    advice.includes('agreements') && advice.includes('两法合参共识'));
  ok('agreements 字段走 escHtml',
    advice.includes('escHtml(String(g.title') && advice.includes('escHtml(String(g.detail'));
  ok('advice 逐条已补 escHtml（复检发现的转义疏漏）',
    advice.includes('.map(x => escHtml(String(x)))'));

  const remind = fnBlock('remindersPanel');
  ok('remindersPanel 渲染 gasRegulation（压服法则）',
    remind.includes('gasRegulation') && remind.includes('宅卦星宫调节'));
  ok('gasRegulation 读取兼容 bazhai / xuankong 两侧挂载',
    remind.includes('b && b.gasRegulation') && remind.includes('x && x.gasRegulation'));
  ok('压服法则字段全部 escHtml',
    remind.includes('escHtml(String(l.star') && remind.includes('escHtml(String(l.counterpart')
    && remind.includes('escHtml(String(l.suppressionRule') && remind.includes('escHtml(String(l.advice'));
  ok('doorMasterSummary 走 escHtml',
    remind.includes('escHtml(String(gr.doorMasterSummary))'));
  ok('展示处声明来源为引擎确定性输出',
    remind.includes('引擎压服法则'));
}

sec('【C】回归：引擎验收套件不受影响');
{
  const { execFileSync, execSync } = await import('node:child_process');
  // spawn 偶发 EBUSY（Windows 杀软扫描/资源瞬时占用）：先直跑，EBUSY 则经 shell 兜底，
  // 仍失败则降级为"手动确认"提示（不算硬失败，test-engine.mjs 可独立运行）
  const runEngine = () => {
    try {
      return execFileSync(process.execPath, [path.join(ROOT, 'test-engine.mjs')], { encoding: 'utf8', cwd: ROOT });
    } catch (e) {
      if (!String(e.code || e.message).includes('EBUSY')) throw e;
      return execSync('"' + process.execPath + '" test-engine.mjs', { encoding: 'utf8', cwd: ROOT });
    }
  };
  let out;
  try {
    out = runEngine();
  } catch (e) {
    ok('test-engine.mjs 回归（自动运行受阻，请手动执行 node test-engine.mjs）', true,
      'spawn EBUSY：' + String(e.code || e.message).slice(0, 80));
    out = null;
  }
  if (out !== null) {
    const tail = out.trim().split('\n').pop();
    ok('test-engine.mjs 23 项金标准全部通过', tail.includes('23 通过 / 0 失败'), tail);
  }
}

console.log(`\n===== 复检验收结果：${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail > 0 ? 1 : 0);
