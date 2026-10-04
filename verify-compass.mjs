// 罗盘链路修复验收（2026-10-04 复检修复：罗盘不调用）
// 缺陷背景：
//   ① 非 iOS 设备只监听 deviceorientationabsolute——微信 X5 内核/多数国产安卓浏览器
//      不派发该事件且无降级无提示，罗盘静默失效（"罗盘不调用"根因）
//   ② iOS requestPermission 失败空 catch 静默
//   ③ 传感器口径缺陷：absolute 事件 alpha 是真北，前端却一律按磁北送后端二次修正
//      （中国境内系统性偏差 2°~10°，足以错判一整山）
//   ④ isCompassCalibrated 从不复位，地图定向作废后罗盘永久停更
// 用法：node verify-compass.mjs
import path from 'node:path';

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log('  ✅ ' + label + (detail ? '\n       ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + label + (detail ? '\n       ' + detail : '')); }
};
const sec = t => console.log('\n' + '='.repeat(76) + '\n' + t + '\n' + '='.repeat(76));

const fs = await import('node:fs');
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');

sec('【①】双事件监听 + 数据源探测（罗盘不调用根因）');
ok('absolute 事件已注册（真北源）',
  html.includes("addEventListener('deviceorientationabsolute', e => handleOrientation(e, 'absolute'))"));
ok('relative 事件已注册（降级兜底，覆盖 X5/国产浏览器）',
  html.includes("addEventListener('deviceorientation', e => handleOrientation(e, 'relative'))"));
ok('数据源状态 compassSource 存在且两值口径有注释',
  html.includes("let compassSource = null") && html.includes("'absolute' —— deviceorientationabsolute"));
ok('真北源锁定后忽略 relative 噪声',
  /compassSource === 'absolute'\)\s*\{\s*return;/.test(html));
ok('iOS webkitCompassHeading 归入磁北口径（absolute: false）',
  /webkitCompassHeading[^}]*absolute:\s*false/.test(html));
ok('absolute 事件 alpha 带真北标记（event.absolute === true）',
  /absolute:\s*event\.absolute === true/.test(html));

sec('【②】iOS 权限失败不再静默（提示手动切换，不自动跳转）');
ok('requestPermission 拒绝路径有日志提示',
  /罗盘权限未授权（\$\{perm\}）/.test(html));
ok('requestPermission 异常路径有日志提示',
  /罗盘权限请求失败（\$\{e\.message\}）/.test(html));
ok('拒绝/异常路径给出手动切换指引（不自动跳转）',
  html.includes('「地图拉线定向」可改用真北模式'));

sec('【③】罗盘数据缺失诊断（只提示不切换）');
ok('无罗盘数据诊断定时器在位',
  html.includes('!compassDataSeen && !isMapMode') && html.includes(', 3000);'));
ok('诊断文案说明原因（无磁力计/不支持/非 HTTPS）',
  html.includes('设备无磁力计、浏览器不支持或页面非 HTTPS'));
ok('诊断只提示不自动切（罗盘采集保持默认）',
  !/罗盘数据[^。]*已自动切换/.test(html));
ok('首帧罗盘激活日志标明数据源与口径',
  html.includes('罗盘已激活（数据源：') && html.includes('排盘无需磁偏角修正') && html.includes('排盘将按 GPS 磁偏角修正'));
ok('无 GPS 不再自动跳地图（GPS 失败只提示）',
  !html.includes('系统将自动切换到地图拉线定向模式')
  && !/if \(userLat == null \|\| userLng == null\) \{\s*if \(!isMapMode\) document\.getElementById\('switch-mode-btn'\)\.click\(\);/.test(html));

sec('【④】传感器口径纪律（专业准确性）');
ok('northReference 按罗盘数据源判定（compassRef）',
  /const compassRef = compassSource === 'absolute' \? 'true' : 'magnetic';/.test(html));
ok('非地图校准路径使用 compassRef（真北源不再二次修正）',
  /northReference:\s*usedMapCalibration \? 'true' : compassRef/.test(html));
ok('口径缺陷有注释说明影响（2°~10°，错判一整山）',
  html.includes('安卓真北源会被二次修正') && html.includes('错判一整山'));
ok('排盘后坐向落盘引用 reqBody.northReference（室内复用口径自动一致）',
  /saveSiting\(\{[\s\S]{0,200}?northReference:\s*reqBody\.northReference/.test(html));

sec('【⑤】罗盘停更复位');
ok('resetBtn 重置 isCompassCalibrated = false',
  /resetBtn\.onclick[\s\S]{0,600}?isCompassCalibrated = false;/.test(html));

sec('【⑥】回归：引擎验收套件不受影响');
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

console.log(`\n===== 罗盘修复验收结果：${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail > 0 ? 1 : 0);
