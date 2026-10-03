// 本地验证脚本：1) 直接调用排盘引擎 2) 模拟 Vercel handler
import { generateResidentialFengshui } from 'mingyu-core/residential-fengshui';

function show(title, input) {
  console.log('\n================ ' + title + ' ================');
  let r;
  try {
    r = generateResidentialFengshui(input);
  } catch (e) {
    console.log('[业务校验异常] ' + e.message);
    return;
  }
  console.log('inputSummary:', JSON.stringify(r.inputSummary, null, 2));
  if (r.bazhai) {
    console.log('八宅命卦:', JSON.stringify({
      mingGua: r.bazhai.mingGua,
      houseGua: r.bazhai.houseGua,
      fourLucky: r.bazhai.fourLucky ?? r.bazhai.luckyDirections ?? '(见prompt)',
    }));
  }
  if (r.xuankong) {
    console.log('玄空:', JSON.stringify({
      status: r.xuankong.status,
      sitting: r.xuankong.sitting ?? r.xuankong.sitMountain,
      facing: r.xuankong.facing ?? r.xuankong.facingMountain,
      period: r.xuankong.period ?? r.xuankong.yun,
      chart: r.xuankong.chart ?? r.xuankong.pan ?? '(见prompt)',
    }));
  }
  console.log('--- prompt 前 1200 字 ---');
  console.log(r.prompt.slice(0, 1200));
  console.log('--- evidencePromptText 前 800 字 ---');
  console.log(r.evidencePromptText.slice(0, 800));
}

// 用例1：坐北朝南 子山午向，九运宅（2025年建成），1990年生男（北京磁偏角约-7.5°西偏）
show('用例1: facingDegree=181(约午向), year=2025, 1990男', {
  facingDegree: 181, year: 2025, northReference: 'magnetic', magneticDeclinationDegrees: -7.5,
  birthYear: 1990, gender: 'male',
});

// 用例2：仅排盘（app 默认行为：无建造年）
show('用例2: 仅坐向无年份（app 默认场景）', { facingDegree: 202, northReference: 'magnetic', magneticDeclinationDegrees: -7.5 });

// 用例3：边界角度 355° → 应为 亥山 or 壬山附近，验证 24 山归属
show('用例3: facingDegree=355', { facingDegree: 355, year: 2025, northReference: 'magnetic', magneticDeclinationDegrees: -7.5 });

// 用例4：地图拉线模式数据本质是真北，应走 true 路径
show('用例4: 地图模式 facingDegree=180 (true north)', { facingDegree: 180, year: 2025, northReference: 'true' });
