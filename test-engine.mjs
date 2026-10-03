// 堪舆引擎专业准确性验收套件：以传统通行口径为金标准断言
// 运行：node test-engine.mjs （引擎或依赖升级后必须回归）
import { generateResidentialFengshui } from 'mingyu-core/residential-fengshui';

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { pass++; console.log('✓ ' + name); }
    else { fail++; console.log('✗ ' + name); }
}
const g = generateResidentialFengshui;

// ========= 一、八宅命卦层 =========
const r1 = g({ facingDegree: 181, year: 2025, northReference: 'true', birthYear: 1990, gender: 'male' });
check('八宅：1990男→坎命东四', r1.bazhai.mingGua === '坎' && r1.bazhai.mingGroup === '东四命');
const lucky1 = r1.bazhai.luckyDirections.map(d => d.label).join(',');
check('八宅：坎命四吉位=伏位/天医/生气/延年', ['伏位', '天医', '生气', '延年'].every(x => lucky1.includes(x)));
const r1b = g({ facingDegree: 181, year: 2025, northReference: 'true', birthYear: 1990, birthMonth: 1, birthDay: 15, gender: 'male' });
check('八宅：立春年界（1990-01-15男按1989推→坤）', r1b.bazhai.mingGua === '坤' && r1b.bazhai.birthYearBoundaryNote.includes('1989'));
const r1c = g({ facingDegree: 181, year: 2025, northReference: 'true', birthYear: 1990, birthMonth: 3, birthDay: 5, gender: 'male' });
check('八宅：立春后按当年推→坎', r1c.bazhai.mingGua === '坎');

// ========= 二、玄空飞星层（经典盘金标准） =========
// 九运子山午向下卦：双星到坐，山星全盘反吟
const r2 = g({ facingDegree: 180, year: 2025, northReference: 'true' });
const x2 = r2.xuankong;
check('九运子山午向：坐向与运', x2.sitMountain === '子' && x2.facingMountain === '午' && x2.period.yun === 9);
check('九运子山午向：双星到坐', x2.formation === '双星到坐');
const qian2 = x2.palaces.find(p => p.gong === 1);
check('九运子山午向：坎宫山9向9', qian2.shanStar === 9 && qian2.xiangStar === 9);
check('九运子山午向：山星全盘反吟', x2.combinations.some(c => c.name.includes('全盘反吟')));

// 八运子山午向下卦：双星到向
const r3 = g({ facingDegree: 180, year: 2010, northReference: 'true' });
const x3 = r3.xuankong;
check('八运子山午向：双星到向', x3.period.yun === 8 && x3.formation === '双星到向');
const li3 = x3.palaces.find(p => p.gong === 9);
check('八运子山午向：离宫山8向8', li3.shanStar === 8 && li3.xiangStar === 8);

// 八运乾山巽向：旺山旺向（山星8到坐+向星8到向）
const r4 = g({ facingDegree: 135, year: 2010, northReference: 'true' });
const x4 = r4.xuankong;
check('八运乾山巽向：旺山旺向', x4.sitMountain === '乾' && x4.facingMountain === '巽' && x4.formation === '旺山旺向');
const qian4 = x4.palaces.find(p => p.gong === 6), xun4 = x4.palaces.find(p => p.gong === 4);
check('八运乾山巽向：乾山星8/巽向星8', qian4.shanStar === 8 && xun4.xiangStar === 8);

// 九运坐丙向壬：双星到坐+全盘伏吟（向星）；347.5°真北落在壬山区间
const r5 = g({ facingDegree: 347.5, year: 2025, northReference: 'true' });
const x5 = r5.xuankong;
check('九运丙山壬向：坐向正确', x5.sitMountain === '丙' && x5.facingMountain === '壬');
check('九运丙山壬向：双星到坐+伏吟', x5.formation === '双星到坐' && x5.combinations.some(c => c.name.includes('伏吟')));
// 355°真北属子山区间→坐午向子（二十四山归属校验）
const r5b = g({ facingDegree: 355, year: 2025, northReference: 'true' });
check('二十四山归属：355°真北→坐午向子', r5b.xuankong.sitMountain === '午' && r5b.xuankong.facingMountain === '子');

// ========= 三、流年紫白叠盘 =========
const r6 = g({ facingDegree: 181, year: 2025, northReference: 'true', flowYear: 2026 });
const yp = r6.xuankong.flowStars.yearPlate;
check('流年2026：一白入中', yp.centerStar === 1 && yp.starName === '一白');
check('流年2026：九宫顺飞盘正确', JSON.stringify(yp.plate) === JSON.stringify([6, 7, 8, 9, 1, 2, 3, 4, 5]));

// ========= 四、替卦口径 =========
const r7 = g({ sitMountain: '子', facingMountain: '午', year: 2025, northReference: 'true', guaType: '替卦' });
check('替卦：卦型标记为替卦', r7.xuankong.guaType === '替卦');
check('替卦：子午替卦未成四正局（引擎严谨判定）', r7.xuankong.formation === '替卦未成四正局');

// ========= 五、测量边界与业务校验 =========
const r8 = g({ facingDegree: 180, northReference: 'magnetic', magneticDeclinationDegrees: -7.5, year: 2025 });
check('边界敏感：±3°误差跨分界→列出候选山向', r8.xuankong.measurement.candidateMountains.length >= 1 && r8.xuankong.measurement.warnings.length > 0);
let threw = false;
try { g({ facingDegree: 181, northReference: 'true' }); } catch (e) { threw = true; }
check('业务校验：缺建造年拒绝排玄空盘', threw);
let threw2 = false;
try { g({ facingDegree: 181, northReference: 'magnetic', year: 2025 }); } catch (e) { threw2 = true; }
check('业务校验：磁北缺磁偏角拒绝排盘', threw2);

// ========= 六、磁偏角换算 =========
const r9 = g({ facingDegree: 185, northReference: 'magnetic', magneticDeclinationDegrees: -7.5, year: 2025 });
check('磁偏角：185°磁北-7.5°→坐子向午(177.5°真北)', r9.xuankong.sitMountain === '子' && r9.xuankong.facingMountain === '午');

console.log(`\n===== 验收结果：${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail > 0 ? 1 : 0);
