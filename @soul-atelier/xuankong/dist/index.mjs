import { PALACES, flyChart, mountainByName, mountainOf, palaceByKey, palaceByLuoshu, periodFromYear, rotatedPalaceGrid, wrap1to9 } from "@soul-atelier/core";
//#region src/combinations.ts
const SANBAN_GROUPS = [
	[
		1,
		4,
		7
	],
	[
		2,
		5,
		8
	],
	[
		3,
		6,
		9
	]
];
/** 父母三般卦 group: the three numbers are exactly 1-4-7, 2-5-8, or 3-6-9. */
function isParentGroup(nums) {
	const sorted = nums.toSorted((a, b) => a - b);
	return SANBAN_GROUPS.some((g) => g[0] === sorted[0] && g[1] === sorted[1] && g[2] === sorted[2]);
}
/** 连珠 (consecutive): three distinct numbers running consecutively around the 1-9 cycle. */
function isConsecutive(nums) {
	const set = new Set(nums);
	if (set.size !== 3) return false;
	return [...set].some((start) => set.has(wrap1to9(start + 1)) && set.has(wrap1to9(start + 2)));
}
function center(byKey) {
	const c = byKey.get("center");
	if (!c) throw new Error("缺少中宫");
	return c;
}
function detectSanban(palaces, byKey, out) {
	const triples = palaces.map((p) => [
		p.period,
		p.mountain,
		p.water
	]);
	if (triples.every(isParentGroup)) {
		out.push({
			name: "父母三般卦",
			kind: "auspicious",
			note: "全局九宫皆成 147/258/369，综合三元旺气，大吉。258 宫位防二黑五黄。"
		});
		return;
	}
	if (triples.every(isConsecutive)) {
		const c = center(byKey);
		const star = c.water === wrap1to9(c.period - 1) ? "向星连珠：运、山、向顺飞相连，主财富、名声、事业。" : c.mountain === wrap1to9(c.period - 1) ? "山星连珠：运、山、向逆飞相连，主健康、人丁、家庭。" : "运、山、向三盘相连，凶位不凶，上山下水亦不忌。";
		out.push({
			name: "连珠三般卦",
			kind: "auspicious",
			note: star
		});
	}
}
function detectHeshi(palaces, out) {
	if (palaces.every((p) => p.mountain + p.period === 10)) out.push({
		name: "山星合十",
		kind: "auspicious",
		note: "全盘山星与运盘合十，主人丁，通关化煞；当旺或刚退运时有力。"
	});
	if (palaces.every((p) => p.water + p.period === 10)) out.push({
		name: "向星合十",
		kind: "auspicious",
		note: "全盘向星与运盘合十，主财禄，通关化煞；当旺或刚退运时有力。"
	});
}
/** 山盘 5 入中顺飞 → every 山星 equals 地盘 (元旦盘) → 全盘伏吟. Blocks 七星打劫. */
function mountainFullFuYin(palaces) {
	return palaces.every((p) => p.mountain === p.earth);
}
function detectFanFuYin(palaces, out) {
	for (const [label, pick] of [["山星", (p) => p.mountain], ["向星", (p) => p.water]]) {
		const harm = label === "山星" ? "健康、人丁、家庭" : "财富、事业、名声";
		if (palaces.every((p) => pick(p) === p.earth)) out.push({
			name: `全盘伏吟（${label}）`,
			kind: "inauspicious",
			note: `${label}与元旦盘全盘相同，主忧虑滞涩、顽疾，影响${harm}。`
		});
		else if (palaces.every((p) => pick(p) + p.earth === 10)) out.push({
			name: `全盘反吟（${label}）`,
			kind: "inauspicious",
			note: `${label}与元旦盘全盘合十，主突发灾祸、破败，影响${harm}。`
		});
		else {
			const fu = palaces.filter((p) => pick(p) === p.earth).map((p) => p.key);
			const fan = palaces.filter((p) => pick(p) + p.earth === 10).map((p) => p.key);
			if (fu.length) out.push({
				name: `单宫伏吟（${label}）`,
				kind: "inauspicious",
				palaces: fu,
				note: `${label}与元旦盘相同；除非外有形煞引动，破坏不大。`
			});
			if (fan.length) out.push({
				name: `单宫反吟（${label}）`,
				kind: "inauspicious",
				palaces: fan,
				note: `${label}与元旦盘合十；除非外有形煞引动，破坏不大。`
			});
		}
	}
}
function detectRuQiu(period, byKey, out) {
	const c = center(byKey);
	if (c.mountain === period) out.push({
		name: "山星入囚",
		kind: "inauspicious",
		note: "当运山星入中宫受囚，主人丁不旺、健康受损；中宫见光、动气可破囚。"
	});
	if (c.water === period) out.push({
		name: "向星入囚",
		kind: "inauspicious",
		note: "当运向星入中宫受囚，主财源受阻、事业不顺；中宫见光、动气可破囚。"
	});
}
const TRUE_TRIAD = [
	"qian",
	"zhen",
	"li"
];
const FALSE_TRIAD = [
	"kan",
	"xun",
	"dui"
];
function detectDaJie(formation, facingPalace, byKey, palaces, out) {
	if (formation !== "双星到向") return;
	const waterOf = (keys) => keys.map((k) => byKey.get(k).water);
	const blocked = mountainFullFuYin(palaces);
	const blockNote = blocked ? "（山星5入中顺飞犯全盘伏吟，打劫不可用）" : "";
	if (TRUE_TRIAD.includes(facingPalace) && isParentGroup(waterOf(TRUE_TRIAD))) out.push({
		name: "七星真打劫",
		kind: blocked ? "inauspicious" : "auspicious",
		palaces: TRUE_TRIAD,
		note: `双星到向，乾·震·离三宫向星连成 147/258/369，劫取未来旺气，力强。布水、开门、通气引动。${blockNote}`
	});
	else if (FALSE_TRIAD.includes(facingPalace) && isParentGroup(waterOf(FALSE_TRIAD))) out.push({
		name: "七星假打劫",
		kind: blocked ? "inauspicious" : "auspicious",
		palaces: FALSE_TRIAD,
		note: `双星到向，坎·巽·兑三宫向星连成 147/258/369；力不及真打劫，仍可引动旺气。${blockNote}`
	});
}
/** Detect the special 格局 carried by a built chart. */
function detectCombinations(period, formation, facingPalace, palaces) {
	const byKey = new Map(palaces.map((p) => [p.key, p]));
	const out = [];
	detectSanban(palaces, byKey, out);
	detectHeshi(palaces, out);
	detectFanFuYin(palaces, out);
	detectRuQiu(period, byKey, out);
	detectDaJie(formation, facingPalace, byKey, palaces, out);
	return out;
}
//#endregion
//#region src/chart.ts
/**
* Decide 顺飞/逆飞 for a star entering the center.
*
* The relocated number's home trigram supplies a mountain at the same 元 as the
* source (坐 for the mountain star, 向 for the water star); that mountain's
* yin-yang gives the direction. The 5 (中宫五黄) has no trigram, so it borrows
* the yin-yang of the source mountain itself.
*/
function directionFor(centerStar, source) {
	return (centerStar === 5 ? source.yinYang : mountainOf(palaceByLuoshu(centerStar).key, source.yuan).yinYang) === "yang" ? "forward" : "reverse";
}
function classify(period, sittingKey, facingKey, mountain, water) {
	const msAtSit = mountain[sittingKey] === period;
	const msAtFace = mountain[facingKey] === period;
	const wsAtSit = water[sittingKey] === period;
	const wsAtFace = water[facingKey] === period;
	if (msAtSit && wsAtFace) return "旺山旺向";
	if (msAtFace && wsAtSit) return "上山下水";
	if (msAtFace && wsAtFace) return "双星到向";
	if (msAtSit && wsAtSit) return "双星到坐";
	throw new Error(`无法判定局: 运${period} ${sittingKey}->${facingKey}`);
}
/** Build the full 飞星盘 from the completion year and the 坐山 (one of the 24 mountains). */
function buildChart(year, sittingName) {
	return buildFromPeriod(year, periodFromYear(year), sittingName);
}
/**
* Build the 飞星盘 from a full completion date, resolving the 运 at the 立春
* boundary via `engine` (fixes the Jan-1 approximation `buildChart`'s year-only
* `periodFromYear` carries). The chart's `year` is the 立春-aware solar year, so
* it stays consistent with the derived 运 near a 运-boundary New Year.
*/
function buildChartForDate(year, month, day, sittingName, engine) {
	const solarYear = engine.solarYear(year, month, day);
	return buildFromPeriod(solarYear, periodFromYear(solarYear), sittingName);
}
function buildFromPeriod(year, period, sittingName) {
	const sitting = mountainByName(sittingName);
	const facingPalace = palaceByKey(sitting.palace).opposite;
	const facing = mountainOf(facingPalace, sitting.yuan);
	const periodChart = flyChart(period, "forward");
	const mountainCenter = periodChart[sitting.palace];
	const waterCenter = periodChart[facing.palace];
	const mountainChart = flyChart(mountainCenter, directionFor(mountainCenter, sitting));
	const waterChart = flyChart(waterCenter, directionFor(waterCenter, facing));
	const palaces = PALACES.map((p) => ({
		key: p.key,
		name: p.name,
		direction: p.direction,
		earth: p.luoshu,
		row: p.row,
		col: p.col,
		period: periodChart[p.key],
		mountain: mountainChart[p.key],
		water: waterChart[p.key]
	}));
	const formation = classify(period, sitting.palace, facing.palace, mountainChart, waterChart);
	return {
		year,
		period,
		sitting,
		facing,
		label: `${sitting.name}山${facing.name}向`,
		formation,
		palaces,
		combinations: detectCombinations(period, formation, facing.palace, palaces)
	};
}
//#endregion
//#region src/layout.ts
/**
* Lay the nine palaces out as a 3×3 grid with the 坐山 at the bottom-centre and
* the 向首 at the top-centre (core's `rotatedPalaceGrid` orientation).
*/
function displayGrid(chart) {
	const byKey = new Map(chart.palaces.map((p) => [p.key, p]));
	return rotatedPalaceGrid(chart.sitting.palace).map((row) => row.map((key) => byKey.get(key) ?? null));
}
//#endregion
export { buildChart, buildChartForDate, detectCombinations, displayGrid };
