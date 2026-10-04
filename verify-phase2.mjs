// 第二阶段加固复检脚本
// 覆盖：第 8 项立春运界 / 第 9 项命卦口径 / 第 10 项不确定性透出 / P0 回归
const BASE = 'http://127.0.0.1:8000';

let pass = 0, fail = 0;
function check(label, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✅ ${label}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  ❌ ${label}${detail ? '  ' + detail : ''}`); }
}
const post = async (path, body) => {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

(async () => {
  console.log('='.repeat(80));
  console.log('第二阶段加固复检（第一阶段 P0 修复同步回归）');
  console.log('='.repeat(80));

  // ---------- 第 8 项：立春运界 ----------
  console.log('\n【第 8 项】玄空运界按立春换算');
  console.log('-'.repeat(80));

  // 8.1 关键回归：2024-01-15 建造（立春前）应为八运，修复前误判九运
  let r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2024, houseMonth: 1, houseDay: 15 });
  let xk = r.json.data?.xuankong;
  check('2024-01-15 建造 → 八运（修复前误判九运）',
    xk?.period?.yun === 8,
    `→ ${xk?.period?.label}`);
  check('  meta.effectiveHouseYear 已回退到 2023',
    r.json.meta?.effectiveHouseYear === 2023,
    `requested=${r.json.meta?.requestedHouseYear} effective=${r.json.meta?.effectiveHouseYear}`);
  check('  meta.periodAdjustedByLichun = true',
    r.json.meta?.periodAdjustedByLichun === true);
  check('  meta.periodBoundaryNote 含立春时刻',
    /立春/.test(r.json.meta?.periodBoundaryNote || ''),
    (r.json.meta?.periodBoundaryNote || '').slice(0, 70) + '…');

  // 8.2 立春后应归本运
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2024, houseMonth: 3, houseDay: 1 });
  xk = r.json.data?.xuankong;
  check('2024-03-01 建造 → 九运（立春后）', xk?.period?.yun === 9, `→ ${xk?.period?.label}`);
  check('  periodAdjustedByLichun = false（无需修正）', r.json.meta?.periodAdjustedByLichun === false);

  // 8.3 缺月日时必须显式警告，而不是静默按公历年
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2024 });
  check('缺建造月日 → 仍排九运但必须给出边界警示',
    r.json.data?.xuankong?.period?.yun === 9 && /1 月 1 日至立春/.test(r.json.meta?.periodBoundaryNote || ''),
    (r.json.meta?.periodBoundaryNote || '').slice(0, 50) + '…');

  // 8.4 非运界年不应被误改
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2023, houseMonth: 6, houseDay: 1 });
  check('2023-06-01 建造 → 八运且不触发修正',
    r.json.data?.xuankong?.period?.yun === 8 && r.json.meta?.periodAdjustedByLichun === false);

  // 8.5 未来运界年：2044 立春在 2/4 12:44，2044-01-20 早于立春但仍在九运内（九运自 2024 立春起）
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2044, houseMonth: 1, houseDay: 20 });
  check('2044-01-20 建造 → 九运（九运自 2024 立春起算，至 2044 立春未交运）',
    r.json.data?.xuankong?.period?.yun === 9, `→ ${r.json.data?.xuankong?.period?.label}`);
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2044, houseMonth: 2, houseDay: 10 });
  check('2044-02-10 建造（立春后）→ 一运（180 年大循环交运，2044 立春起入一运）',
    r.json.data?.xuankong?.period?.yun === 1 && r.json.meta?.periodAdjustedByLichun === false,
    `→ ${r.json.data?.xuankong?.period?.label}`);

  // ---------- 第 9 项：命卦口径声明 ----------
  console.log('\n【第 9 项】命卦口径声明');
  console.log('-'.repeat(80));
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2024, birthYear: 1990, birthMonth: 6, birthDay: 15, gender: 'male' });
  const mg = r.json.meta?.mingGuaMethod;
  check('meta.mingGuaMethod.method 存在', !!mg?.method, mg?.method || '');
  check('  含「年份除九取余」口径说明', /year-mod-9|年份除九/.test(mg?.method || ''));
  check('  sourceNote 声明与数字和法不同', /数字和法/.test(mg?.sourceNote || ''));
  check('  命卦本身已排出', !!r.json.data?.bazhai?.mingGua, `命卦=${r.json.data?.bazhai?.mingGua}`);

  // ---------- 第 10 项：测量不确定性透出 ----------
  console.log('\n【第 10 项】测量不确定性透出到 meta');
  console.log('-'.repeat(80));
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2024, uncertainty: 3 });
  const m = r.json.meta?.measurement;
  check('meta.measurement 存在', !!m);
  check('  含 sitDegree（真实坐向度数）', m?.sitDegree != null, `sitDegree=${m?.sitDegree}`);
  check('  含 uncertaintyDegrees', m?.uncertaintyDegrees === 3);
  check('  含 stability（分界稳定性）', m?.stability != null, `stability=${m?.stability}`);
  check('  含 nearestBoundaryDistanceDegrees', m?.nearestBoundaryDistanceDegrees != null,
    `距最近山界 ${m?.nearestBoundaryDistanceDegrees}°`);

  // 构造边界敏感场景：读数落在两山分界 ±0.5° 内
  // 午山中心 180°，午/丙分界在 187.5°(丙)/172.5°(午) —— 取 187.4° 应触发敏感
  r = await post('/api/horosa', { heading: 187.4, northReference: 'true', year: 2024, uncertainty: 3 });
  const m2 = r.json.meta?.measurement;
  check('边界敏感读数被引擎标记', String(m2?.stability || '').includes('敏感'),
    `stability=${m2?.stability}, 候选=${JSON.stringify(m2?.candidateMountains)}`);
  check('  candidateMountains 候选山被透出', !!m2?.candidateMountains,
    JSON.stringify(m2?.candidateMountains)?.slice(0, 70));
  // 注：mingyu-core 0.4.0 的 bazhai 未产出 directionMeasurement 字段，
  // 因此 meta.bazhaiMeasurement 为 null。此处断言"不抛错且为 null"，即优雅降级。
  check('  宅卦测量信息优雅降级（引擎未产出该字段时为 null，不报错）',
    r.json.meta?.bazhaiMeasurement === null || typeof r.json.meta?.bazhaiMeasurement === 'object');

  // ---------- P0 回归（第一阶段修复不能被破坏） ----------
  console.log('\n【P0 回归】第一阶段修复仍然有效');
  console.log('-'.repeat(80));

  // P0-2 守卫
  r = await fetch(BASE + '/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(5 * 1024 * 1024) });
  check('P0-2 5MB 请求体被 413 拦截', r.status === 413, `status=${r.status}`);

  // P0-4 缺 GPS：后端返回可读的校验文案；可执行的"改用地图拉线"指引由前端在调用前 throw 给出
  r = await post('/api/horosa', { heading: 185, northReference: 'magnetic', year: 2024 });
  check('P0-4 磁北缺 GPS → 400 且文案说明原因',
    r.status === 400 && /磁偏角/.test(r.json.message || '') && /10°/.test(r.json.message || ''),
    (r.json.message || '').slice(0, 60) + '…');

  // P0-4 磁北 + GPS 正常
  r = await post('/api/horosa', { heading: 185, northReference: 'magnetic', lat: 39.908, lng: 116.397, year: 2024 });
  check('P0-4 磁北 + GPS 正常排盘', r.status === 200 && !!r.json.data?.xuankong,
    `磁偏角=${r.json.meta?.magneticDeclinationDegrees?.toFixed(2)}°`);

  // 缺建造年仍必须拒绝
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true' });
  check('缺建造年仍拒绝排盘（业务校验未被削弱）', r.status === 400 && /建造年/.test(r.json.message || ''));

  // 引擎一致性抽查
  r = await post('/api/horosa', { heading: 177.5, northReference: 'true', year: 2024, houseMonth: 6, houseDay: 1 });
  xk = r.json.data?.xuankong;
  check('九运子山午向：局型判定正确', xk?.formation === '双星到坐', `formation=${xk?.formation}`);

  // ---------- 汇总 ----------
  console.log('\n' + '='.repeat(80));
  console.log(`复检结果：${pass} 通过 / ${fail} 失败`);
  console.log('='.repeat(80));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ 复检异常:', e.message); process.exit(1); });
