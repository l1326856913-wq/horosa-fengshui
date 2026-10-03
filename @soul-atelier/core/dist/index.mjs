//#region src/palaces.ts
const PALACES = [
	{
		key: "xun",
		name: "巽",
		direction: "东南",
		luoshu: 4,
		opposite: "qian",
		kind: "corner",
		mountains: [
			"辰",
			"巽",
			"巳"
		],
		angle: 135,
		row: 0,
		col: 0
	},
	{
		key: "li",
		name: "離",
		direction: "南",
		luoshu: 9,
		opposite: "kan",
		kind: "cardinal",
		mountains: [
			"丙",
			"午",
			"丁"
		],
		angle: 180,
		row: 0,
		col: 1
	},
	{
		key: "kun",
		name: "坤",
		direction: "西南",
		luoshu: 2,
		opposite: "gen",
		kind: "corner",
		mountains: [
			"未",
			"坤",
			"申"
		],
		angle: 225,
		row: 0,
		col: 2
	},
	{
		key: "zhen",
		name: "震",
		direction: "东",
		luoshu: 3,
		opposite: "dui",
		kind: "cardinal",
		mountains: [
			"甲",
			"卯",
			"乙"
		],
		angle: 90,
		row: 1,
		col: 0
	},
	{
		key: "center",
		name: "中",
		direction: "中",
		luoshu: 5,
		opposite: "center",
		kind: "cardinal",
		mountains: [],
		angle: null,
		row: 1,
		col: 1
	},
	{
		key: "dui",
		name: "兌",
		direction: "西",
		luoshu: 7,
		opposite: "zhen",
		kind: "cardinal",
		mountains: [
			"庚",
			"酉",
			"辛"
		],
		angle: 270,
		row: 1,
		col: 2
	},
	{
		key: "gen",
		name: "艮",
		direction: "东北",
		luoshu: 8,
		opposite: "kun",
		kind: "corner",
		mountains: [
			"丑",
			"艮",
			"寅"
		],
		angle: 45,
		row: 2,
		col: 0
	},
	{
		key: "kan",
		name: "坎",
		direction: "北",
		luoshu: 1,
		opposite: "li",
		kind: "cardinal",
		mountains: [
			"壬",
			"子",
			"癸"
		],
		angle: 0,
		row: 2,
		col: 1
	},
	{
		key: "qian",
		name: "乾",
		direction: "西北",
		luoshu: 6,
		opposite: "xun",
		kind: "corner",
		mountains: [
			"戌",
			"乾",
			"亥"
		],
		angle: 315,
		row: 2,
		col: 2
	}
];
const BY_KEY = new Map(PALACES.map((p) => [p.key, p]));
const BY_LUOSHU = new Map(PALACES.map((p) => [p.luoshu, p]));
function palaceByKey(key) {
	const palace = BY_KEY.get(key);
	if (!palace) throw new Error(`未知宫位: ${key}`);
	return palace;
}
/** Home trigram of a star number (1-9). The center (5) has no trigram. */
function palaceByLuoshu(luoshu) {
	const palace = BY_LUOSHU.get(luoshu);
	if (!palace) throw new Error(`无对应宫位的洛书数: ${luoshu}`);
	return palace;
}
const CELL_FOR_ANGLE = new Map(PALACES.filter((p) => p.angle !== null).map((p) => [p.angle, [p.row, p.col]]));
/**
* The nine palace keys as a 3×3 grid rotated so `sitting` lands at the
* bottom-centre and its opposite at the top-centre. `sitting = "kan"` yields
* the compass-fixed default (南 on top). The whole compass rotates together,
* so every palace keeps its geographic neighbours — only orientation changes.
*/
function rotatedPalaceGrid(sitting) {
	const sittingAngle = palaceByKey(sitting).angle;
	if (sittingAngle === null) throw new Error("中宫不能作坐宫");
	const grid = [
		[
			"center",
			"center",
			"center"
		],
		[
			"center",
			"center",
			"center"
		],
		[
			"center",
			"center",
			"center"
		]
	];
	for (const p of PALACES) {
		if (p.angle === null) continue;
		const rotated = ((p.angle - sittingAngle) % 360 + 360) % 360;
		const [row, col] = CELL_FOR_ANGLE.get(rotated);
		grid[row][col] = p.key;
	}
	return grid;
}
//#endregion
//#region src/flying.ts
/** Keep a star number within 1-9 (9-cycle, no zero). */
function wrap1to9(n) {
	return ((n - 1) % 9 + 9) % 9 + 1;
}
/**
* Fly `center` through the nine palaces along the Luo Shu path.
*
* A palace with 洛书数 L sits `offset = (L - 5)` steps along the path from the
* center. 顺飞 (forward) adds the offset, 逆飞 (reverse) subtracts it.
*/
function flyChart(center, direction) {
	const result = {};
	for (const palace of PALACES) {
		const offset = ((palace.luoshu - 5) % 9 + 9) % 9;
		const raw = direction === "forward" ? center + offset : center - offset;
		result[palace.key] = wrap1to9(raw);
	}
	return result;
}
//#endregion
//#region src/period.ts
/**
* 三元九运: each 运 spans 20 years; the 180-year cycle restarts at 一运 in 1864.
*
*   上元  1运 1864-1883   2运 1884-1903   3运 1904-1923
*   中元  4运 1924-1943   5运 1944-1963   6运 1964-1983
*   下元  7运 1984-2003   8运 2004-2023   9运 2024-2043
*
* Note: the boundary is technically 立春 of the start year, not Jan 1. This uses
* the Gregorian year; for a date near 立春 of a 运-boundary year, use calendar's
* `periodFromDate(y, m, d, engine)`, which resolves the boundary astronomically.
*/
const CYCLE_START = 1864;
function periodFromYear(year) {
	return (Math.floor((year - CYCLE_START) / 20) % 9 + 9) % 9 + 1;
}
/** Inclusive Gregorian year range of the 运 containing `year`. */
function periodYearRange(year) {
	const start = CYCLE_START + Math.floor((year - CYCLE_START) / 20) * 20;
	return [start, start + 19];
}
//#endregion
//#region src/mountains.ts
/**
* 二十四山 yin-yang follows the trigram kind:
*   四正卦 (坎離震兌): 地元阳, 天元阴, 人元阴
*   四隅卦 (乾坤艮巽): 地元阴, 天元阳, 人元阳
* yang → 顺飞, yin → 逆飞.
*/
const YIN_YANG = {
	cardinal: [
		"yang",
		"yin",
		"yin"
	],
	corner: [
		"yin",
		"yang",
		"yang"
	]
};
const MOUNTAINS = /* @__PURE__ */ new Map();
for (const palace of PALACES) palace.mountains.forEach((name, index) => {
	const yuan = index;
	MOUNTAINS.set(name, {
		name,
		palace: palace.key,
		yuan,
		yinYang: YIN_YANG[palace.kind][yuan]
	});
});
function mountainByName(name) {
	const mountain = MOUNTAINS.get(name);
	if (!mountain) throw new Error(`未知的山: "${name}". 请输入二十四山之一: ${allMountainNames().join(" ")}`);
	return mountain;
}
/** Mountain at a given 元 position within a palace. */
function mountainOf(key, yuan) {
	const name = palaceByKey(key).mountains[yuan];
	if (!name) throw new Error(`宫位 ${key} 没有 ${yuan} 元龙的山`);
	return mountainByName(name);
}
function allMountainNames() {
	return PALACES.flatMap((p) => p.mountains);
}
//#endregion
//#region src/wuxing.ts
/** The five elements in 相生 (generation) order: each element generates the next. */
const ELEMENTS = [
	"wood",
	"fire",
	"earth",
	"metal",
	"water"
];
const ELEMENT_ZH = {
	wood: "木",
	fire: "火",
	earth: "土",
	metal: "金",
	water: "水"
};
const FROM_ZH = new Map(ELEMENTS.map((e) => [ELEMENT_ZH[e], e]));
function elementFromZh(zh) {
	const element = FROM_ZH.get(zh);
	if (!element) throw new Error(`未知五行: "${zh}" (expected 木/火/土/金/水)`);
	return element;
}
function at(index) {
	return ELEMENTS[(index % 5 + 5) % 5];
}
/** X such that e 生 X (wood → fire). */
function generates(e) {
	return at(ELEMENTS.indexOf(e) + 1);
}
/** X such that X 生 e (fire ← wood). */
function generatedBy(e) {
	return at(ELEMENTS.indexOf(e) - 1);
}
/** X such that e 克 X (wood → earth). */
function controls(e) {
	return at(ELEMENTS.indexOf(e) + 2);
}
/** X such that X 克 e (earth ← wood). */
function controlledBy(e) {
	return at(ELEMENTS.indexOf(e) - 2);
}
/** How `a` stands to `b`: a 生 b → "generates", a 克 b → "controls", and the passives. */
function elementRelation(a, b) {
	if (a === b) return "same";
	if (generates(a) === b) return "generates";
	if (controls(a) === b) return "controls";
	if (generates(b) === a) return "generatedBy";
	return "controlledBy";
}
//#endregion
//#region src/ganzhi.ts
const STEMS = [
	"甲",
	"乙",
	"丙",
	"丁",
	"戊",
	"己",
	"庚",
	"辛",
	"壬",
	"癸"
];
const BRANCHES = [
	"子",
	"丑",
	"寅",
	"卯",
	"辰",
	"巳",
	"午",
	"未",
	"申",
	"酉",
	"戌",
	"亥"
];
const STEM_ELEMENT = {
	甲: "wood",
	乙: "wood",
	丙: "fire",
	丁: "fire",
	戊: "earth",
	己: "earth",
	庚: "metal",
	辛: "metal",
	壬: "water",
	癸: "water"
};
const BRANCH_ELEMENT = {
	子: "water",
	丑: "earth",
	寅: "wood",
	卯: "wood",
	辰: "earth",
	巳: "fire",
	午: "fire",
	未: "earth",
	申: "metal",
	酉: "metal",
	戌: "earth",
	亥: "water"
};
function stemIndex(stem) {
	return STEMS.indexOf(stem);
}
function branchIndex(branch) {
	return BRANCHES.indexOf(branch);
}
function stemElement(stem) {
	return STEM_ELEMENT[stem];
}
function branchElement(branch) {
	return BRANCH_ELEMENT[branch];
}
function stemYinYang(stem) {
	return stemIndex(stem) % 2 === 0 ? "yang" : "yin";
}
function branchYinYang(branch) {
	return branchIndex(branch) % 2 === 0 ? "yang" : "yin";
}
/** 六十甲子 in order: 甲子 (0) … 癸亥 (59). */
const SIXTY_CYCLE = Array.from({ length: 60 }, (_, i) => ({
	stem: STEMS[i % 10],
	branch: BRANCHES[i % 12]
}));
/** GanZhi at a cycle position; any integer wraps into 0-59. */
function sixtyCycle(index) {
	return SIXTY_CYCLE[(index % 60 + 60) % 60];
}
/**
* Position (0-59) of a pair in the 六十甲子. Throws for the 60 impossible
* pairs whose stem and branch polarities differ (e.g. 甲丑).
*/
function sixtyCycleIndex(gz) {
	const s = stemIndex(gz.stem);
	const b = branchIndex(gz.branch);
	if ((s - b) % 2 !== 0) throw new Error(`${gz.stem}${gz.branch} 不在六十甲子中 (干支阴阳不配)`);
	return ((s * 6 - b * 5) % 60 + 60) % 60;
}
function ganZhiName(gz) {
	return `${gz.stem}${gz.branch}`;
}
/**
* 旬空 (空亡): the two branches missing from the pair's 旬 — the ten-pair run
* starting at its 甲 (甲子旬中戌亥空, 甲戌旬中申酉空, …).
*/
function voidBranches(gz) {
	const index = sixtyCycleIndex(gz);
	const xunBranch = (index - index % 10) % 12;
	return [BRANCHES[(xunBranch + 10) % 12], BRANCHES[(xunBranch + 11) % 12]];
}
/** Parse a two-character name like "甲子". Throws on unknown characters or impossible pairs. */
function ganZhiFromName(name) {
	const stem = name.charAt(0);
	const branch = name.charAt(1);
	if (name.length !== 2 || !STEMS.includes(stem) || !BRANCHES.includes(branch)) throw new Error(`无效干支: "${name}"`);
	const gz = {
		stem,
		branch
	};
	sixtyCycleIndex(gz);
	return gz;
}
//#endregion
//#region src/relations.ts
/** 化气 of the 五合 pairs, keyed by the earlier stem's index: 甲己→土, 乙庚→金, 丙辛→水, 丁壬→木, 戊癸→火. */
const STEM_COMBINE_ELEMENT = [
	"earth",
	"metal",
	"water",
	"wood",
	"fire"
];
/** 天干五合: stems five apart combine. Returns the 化气 element, or null when the pair doesn't combine. */
function stemCombine(a, b) {
	const ia = stemIndex(a);
	const ib = stemIndex(b);
	if (Math.abs(ia - ib) !== 5) return null;
	return STEM_COMBINE_ELEMENT[Math.min(ia, ib)];
}
/** 天干相克 between same-polarity stems (甲克戊, 庚克甲 …). Directional: does `a` control `b`? */
function stemControls(a, b) {
	return controls(stemElement(a)) === stemElement(b) && stemYinYang(a) === stemYinYang(b);
}
function pairSet(pairs) {
	const set = /* @__PURE__ */ new Set();
	for (const [a, b] of pairs) {
		set.add(a + b);
		set.add(b + a);
	}
	return set;
}
const SIX_COMBINE = [
	[
		"子",
		"丑",
		"earth"
	],
	[
		"寅",
		"亥",
		"wood"
	],
	[
		"卯",
		"戌",
		"fire"
	],
	[
		"辰",
		"酉",
		"metal"
	],
	[
		"巳",
		"申",
		"water"
	],
	[
		"午",
		"未",
		"fire"
	]
];
const SIX_COMBINE_ELEMENT = /* @__PURE__ */ new Map();
for (const [a, b, element] of SIX_COMBINE) {
	SIX_COMBINE_ELEMENT.set(a + b, element);
	SIX_COMBINE_ELEMENT.set(b + a, element);
}
const CLASH = pairSet([
	["子", "午"],
	["丑", "未"],
	["寅", "申"],
	["卯", "酉"],
	["辰", "戌"],
	["巳", "亥"]
]);
const HARM = pairSet([
	["子", "未"],
	["丑", "午"],
	["寅", "巳"],
	["卯", "辰"],
	["申", "亥"],
	["酉", "戌"]
]);
const DESTROY = pairSet([
	["子", "酉"],
	["丑", "辰"],
	["寅", "亥"],
	["卯", "午"],
	["巳", "申"],
	["未", "戌"]
]);
const HIDDEN_COMBINE = pairSet([
	["寅", "丑"],
	["卯", "申"],
	["午", "亥"],
	["戌", "子"],
	["巳", "酉"]
]);
const PUNISH_PAIRS = pairSet([
	["寅", "巳"],
	["巳", "申"],
	["寅", "申"],
	["丑", "未"],
	["未", "戌"],
	["丑", "戌"],
	["子", "卯"]
]);
/** 六合. Returns the transformed element, or null when the pair doesn't combine. */
function branchSixCombine(a, b) {
	return SIX_COMBINE_ELEMENT.get(a + b) ?? null;
}
/** 六冲 (子午, 丑未, …): branches six apart oppose. */
function branchClash(a, b) {
	return CLASH.has(a + b);
}
/** 六害. */
function branchHarm(a, b) {
	return HARM.has(a + b);
}
/** 六破. */
function branchDestroy(a, b) {
	return DESTROY.has(a + b);
}
/** 暗合. */
function branchHiddenCombine(a, b) {
	return HIDDEN_COMBINE.has(a + b);
}
/** 相刑 pairs (子卯 and the 寅巳申 / 丑未戌 component pairs). Self-punishment is separate. */
function branchPunishPair(a, b) {
	return PUNISH_PAIRS.has(a + b);
}
/** 自刑 branches: a duplicated 辰/午/酉/亥 punishes itself. */
const SELF_PUNISH = [
	"辰",
	"午",
	"酉",
	"亥"
];
function branchSelfPunish(branch) {
	return SELF_PUNISH.includes(branch);
}
const PUNISH_TRIPLES = [[
	"寅",
	"巳",
	"申"
], [
	"丑",
	"未",
	"戌"
]];
function branchSetKey(xs) {
	return xs.map(branchIndex).toSorted((x, y) => x - y).join(",");
}
function sameSet(a, b) {
	return a.length === b.length && branchSetKey(a) === branchSetKey(b);
}
/** 三刑: 寅巳申 or 丑未戌 as a complete set (any order). */
function branchPunishTriple(a, b, c) {
	return PUNISH_TRIPLES.some((t) => sameSet([
		a,
		b,
		c
	], t));
}
const TRINES = [
	{
		sheng: "申",
		wang: "子",
		mu: "辰",
		element: "water"
	},
	{
		sheng: "寅",
		wang: "午",
		mu: "戌",
		element: "fire"
	},
	{
		sheng: "巳",
		wang: "酉",
		mu: "丑",
		element: "metal"
	},
	{
		sheng: "亥",
		wang: "卯",
		mu: "未",
		element: "wood"
	}
];
/** The 三合局 a branch belongs to (every branch sits in exactly one trine). */
function trineOf(branch) {
	const trine = TRINES.find((t) => t.sheng === branch || t.wang === branch || t.mu === branch);
	if (!trine) throw new Error(`无三合局: ${branch}`);
	return trine;
}
/** 三合: a complete 生旺墓 set (any order). Returns the trine's element, or null. */
function branchTriple(a, b, c) {
	const trine = TRINES.find((t) => sameSet([
		a,
		b,
		c
	], [
		t.sheng,
		t.wang,
		t.mu
	]));
	return trine ? trine.element : null;
}
/**
* 半合: two branches of the same trine including its 旺 (中神).
* 生+墓 pairs (寅戌, 亥未, 申辰, 巳丑) do not half-combine.
*/
function branchHalfCombine(a, b) {
	if (a === b) return null;
	const trine = trineOf(a);
	if (![
		trine.sheng,
		trine.wang,
		trine.mu
	].includes(b)) return null;
	if (a !== trine.wang && b !== trine.wang) return null;
	return trine.element;
}
/** 三会方局 (寅卯辰木 …) plus the four-branch 辰戌丑未 earth meeting. */
const MEETINGS = [
	{
		branches: [
			"寅",
			"卯",
			"辰"
		],
		element: "wood"
	},
	{
		branches: [
			"巳",
			"午",
			"未"
		],
		element: "fire"
	},
	{
		branches: [
			"申",
			"酉",
			"戌"
		],
		element: "metal"
	},
	{
		branches: [
			"亥",
			"子",
			"丑"
		],
		element: "water"
	},
	{
		branches: [
			"辰",
			"戌",
			"丑",
			"未"
		],
		element: "earth"
	}
];
/** 三会: a complete directional meeting (any order). Returns its element, or null. */
function branchMeeting(branches) {
	const meeting = MEETINGS.find((m) => sameSet(branches, m.branches));
	return meeting ? meeting.element : null;
}
//#endregion
//#region src/bagua.ts
const TRIGRAMS = [
	{
		index: 0,
		name: "乾",
		nature: "天",
		symbol: "☰",
		lines: [
			1,
			1,
			1
		]
	},
	{
		index: 1,
		name: "兌",
		nature: "澤",
		symbol: "☱",
		lines: [
			1,
			1,
			0
		]
	},
	{
		index: 2,
		name: "離",
		nature: "火",
		symbol: "☲",
		lines: [
			1,
			0,
			1
		]
	},
	{
		index: 3,
		name: "震",
		nature: "雷",
		symbol: "☳",
		lines: [
			1,
			0,
			0
		]
	},
	{
		index: 4,
		name: "巽",
		nature: "風",
		symbol: "☴",
		lines: [
			0,
			1,
			1
		]
	},
	{
		index: 5,
		name: "坎",
		nature: "水",
		symbol: "☵",
		lines: [
			0,
			1,
			0
		]
	},
	{
		index: 6,
		name: "艮",
		nature: "山",
		symbol: "☶",
		lines: [
			0,
			0,
			1
		]
	},
	{
		index: 7,
		name: "坤",
		nature: "地",
		symbol: "☷",
		lines: [
			0,
			0,
			0
		]
	}
];
const BY_NAME = new Map(TRIGRAMS.map((t) => [t.name, t]));
const BY_LINES = new Map(TRIGRAMS.map((t) => [t.lines.join(""), t]));
function trigramByName(name) {
	const trigram = BY_NAME.get(name);
	if (!trigram) throw new Error(`未知卦名: "${name}"`);
	return trigram;
}
function trigramFromLines(lines) {
	return BY_LINES.get(lines.join(""));
}
/** KING_WEN[lowerIndex][upperIndex] → hexagram number (1-64, King Wen sequence). */
const KING_WEN = [
	[
		1,
		43,
		14,
		34,
		9,
		5,
		26,
		11
	],
	[
		10,
		58,
		38,
		54,
		61,
		60,
		41,
		19
	],
	[
		13,
		49,
		30,
		55,
		37,
		63,
		22,
		36
	],
	[
		25,
		17,
		21,
		51,
		42,
		3,
		27,
		24
	],
	[
		44,
		28,
		50,
		32,
		57,
		48,
		18,
		46
	],
	[
		6,
		47,
		64,
		40,
		59,
		29,
		4,
		7
	],
	[
		33,
		31,
		56,
		62,
		53,
		39,
		52,
		15
	],
	[
		12,
		45,
		35,
		16,
		20,
		8,
		23,
		2
	]
];
/** [number, name, pinyin, english] in King Wen order. */
const HEXAGRAM_DATA = [
	[
		1,
		"乾",
		"qián",
		"The Creative"
	],
	[
		2,
		"坤",
		"kūn",
		"The Receptive"
	],
	[
		3,
		"屯",
		"zhūn",
		"Difficulty at the Beginning"
	],
	[
		4,
		"蒙",
		"méng",
		"Youthful Folly"
	],
	[
		5,
		"需",
		"xū",
		"Waiting"
	],
	[
		6,
		"訟",
		"sòng",
		"Conflict"
	],
	[
		7,
		"師",
		"shī",
		"The Army"
	],
	[
		8,
		"比",
		"bǐ",
		"Holding Together"
	],
	[
		9,
		"小畜",
		"xiǎo xù",
		"Small Accumulating"
	],
	[
		10,
		"履",
		"lǚ",
		"Treading"
	],
	[
		11,
		"泰",
		"tài",
		"Peace"
	],
	[
		12,
		"否",
		"pǐ",
		"Standstill"
	],
	[
		13,
		"同人",
		"tóng rén",
		"Fellowship"
	],
	[
		14,
		"大有",
		"dà yǒu",
		"Great Possession"
	],
	[
		15,
		"謙",
		"qiān",
		"Modesty"
	],
	[
		16,
		"豫",
		"yù",
		"Enthusiasm"
	],
	[
		17,
		"隨",
		"suí",
		"Following"
	],
	[
		18,
		"蠱",
		"gǔ",
		"Work on the Decayed"
	],
	[
		19,
		"臨",
		"lín",
		"Approach"
	],
	[
		20,
		"觀",
		"guān",
		"Contemplation"
	],
	[
		21,
		"噬嗑",
		"shì kè",
		"Biting Through"
	],
	[
		22,
		"賁",
		"bì",
		"Grace"
	],
	[
		23,
		"剝",
		"bō",
		"Splitting Apart"
	],
	[
		24,
		"復",
		"fù",
		"Return"
	],
	[
		25,
		"無妄",
		"wú wàng",
		"Innocence"
	],
	[
		26,
		"大畜",
		"dà xù",
		"Great Accumulating"
	],
	[
		27,
		"頤",
		"yí",
		"Nourishment"
	],
	[
		28,
		"大過",
		"dà guò",
		"Great Exceeding"
	],
	[
		29,
		"坎",
		"kǎn",
		"The Abysmal"
	],
	[
		30,
		"離",
		"lí",
		"The Clinging"
	],
	[
		31,
		"咸",
		"xián",
		"Influence"
	],
	[
		32,
		"恆",
		"héng",
		"Duration"
	],
	[
		33,
		"遯",
		"dùn",
		"Retreat"
	],
	[
		34,
		"大壯",
		"dà zhuàng",
		"Great Power"
	],
	[
		35,
		"晉",
		"jìn",
		"Progress"
	],
	[
		36,
		"明夷",
		"míng yí",
		"Darkening of the Light"
	],
	[
		37,
		"家人",
		"jiā rén",
		"The Family"
	],
	[
		38,
		"睽",
		"kuí",
		"Opposition"
	],
	[
		39,
		"蹇",
		"jiǎn",
		"Obstruction"
	],
	[
		40,
		"解",
		"xiè",
		"Deliverance"
	],
	[
		41,
		"損",
		"sǔn",
		"Decrease"
	],
	[
		42,
		"益",
		"yì",
		"Increase"
	],
	[
		43,
		"夬",
		"guài",
		"Breakthrough"
	],
	[
		44,
		"姤",
		"gòu",
		"Coming to Meet"
	],
	[
		45,
		"萃",
		"cuì",
		"Gathering Together"
	],
	[
		46,
		"升",
		"shēng",
		"Pushing Upward"
	],
	[
		47,
		"困",
		"kùn",
		"Oppression"
	],
	[
		48,
		"井",
		"jǐng",
		"The Well"
	],
	[
		49,
		"革",
		"gé",
		"Revolution"
	],
	[
		50,
		"鼎",
		"dǐng",
		"The Cauldron"
	],
	[
		51,
		"震",
		"zhèn",
		"The Arousing"
	],
	[
		52,
		"艮",
		"gèn",
		"Keeping Still"
	],
	[
		53,
		"漸",
		"jiàn",
		"Development"
	],
	[
		54,
		"歸妹",
		"guī mèi",
		"The Marrying Maiden"
	],
	[
		55,
		"豐",
		"fēng",
		"Abundance"
	],
	[
		56,
		"旅",
		"lǚ",
		"The Wanderer"
	],
	[
		57,
		"巽",
		"xùn",
		"The Gentle"
	],
	[
		58,
		"兌",
		"duì",
		"The Joyous"
	],
	[
		59,
		"渙",
		"huàn",
		"Dispersion"
	],
	[
		60,
		"節",
		"jié",
		"Limitation"
	],
	[
		61,
		"中孚",
		"zhōng fú",
		"Inner Truth"
	],
	[
		62,
		"小過",
		"xiǎo guò",
		"Small Exceeding"
	],
	[
		63,
		"既濟",
		"jì jì",
		"After Completion"
	],
	[
		64,
		"未濟",
		"wèi jì",
		"Before Completion"
	]
];
const TRIGRAM_PAIR = (() => {
	const pairs = Array.from({ length: 64 });
	for (let lower = 0; lower < 8; lower++) for (let upper = 0; upper < 8; upper++) pairs[KING_WEN[lower][upper] - 1] = [TRIGRAMS[lower], TRIGRAMS[upper]];
	return pairs;
})();
/** All 64 hexagrams; index = number - 1. */
const HEXAGRAMS = HEXAGRAM_DATA.map(([number, name, pinyin, english]) => {
	const [lower, upper] = TRIGRAM_PAIR[number - 1];
	return {
		number,
		name,
		pinyin,
		english,
		lower,
		upper,
		glyph: String.fromCodePoint(19903 + number)
	};
});
function hexagram(number) {
	const hex = HEXAGRAMS[number - 1];
	if (!hex) throw new Error(`卦序须在 1-64 之间: ${number}`);
	return hex;
}
function hexagramFromTrigrams(lower, upper) {
	return hexagram(KING_WEN[lower.index][upper.index]);
}
/** The six lines, bottom → top (lower trigram then upper). */
function hexagramLines(hex) {
	return [...hex.lower.lines, ...hex.upper.lines];
}
/** 爻位 names, bottom → top: 初二三四五上. */
const LINE_NAMES = [
	"初",
	"二",
	"三",
	"四",
	"五",
	"上"
];
/** Flip the 变爻 at `position` (1 = bottom … 6 = top), producing the 之卦. */
function flipLine(hex, position) {
	if (!Number.isInteger(position) || position < 1 || position > 6) throw new Error(`爻位须在 1-6 之间: ${position}`);
	const flip = (lines, at) => {
		const next = [...lines];
		next[at] = next[at] === 1 ? 0 : 1;
		return next;
	};
	return hexagramFromTrigrams(position <= 3 ? trigramFromLines(flip(hex.lower.lines, position - 1)) : hex.lower, position >= 4 ? trigramFromLines(flip(hex.upper.lines, position - 4)) : hex.upper);
}
//#endregion
//#region src/hidden-stems.ts
/** 地支藏干. Values match tyme4ts, the engine bazi-plotter renders. */
const HIDDEN_STEMS = {
	子: { main: "癸" },
	丑: {
		main: "己",
		middle: "癸",
		residual: "辛"
	},
	寅: {
		main: "甲",
		middle: "丙",
		residual: "戊"
	},
	卯: { main: "乙" },
	辰: {
		main: "戊",
		middle: "乙",
		residual: "癸"
	},
	巳: {
		main: "丙",
		middle: "庚",
		residual: "戊"
	},
	午: {
		main: "丁",
		middle: "己"
	},
	未: {
		main: "己",
		middle: "丁",
		residual: "乙"
	},
	申: {
		main: "庚",
		middle: "壬",
		residual: "戊"
	},
	酉: { main: "辛" },
	戌: {
		main: "戊",
		middle: "辛",
		residual: "丁"
	},
	亥: {
		main: "壬",
		middle: "甲"
	}
};
function hiddenStems(branch) {
	return HIDDEN_STEMS[branch];
}
/** The hidden stems as a list, 本气 first. */
function hiddenStemList(branch) {
	const h = HIDDEN_STEMS[branch];
	return [
		h.main,
		h.middle,
		h.residual
	].filter((s) => s !== void 0);
}
//#endregion
//#region src/nayin.ts
/** 纳音 names; each consecutive 六十甲子 pair shares one (甲子/乙丑 → 海中金 …). */
const NAYIN = [
	"海中金",
	"炉中火",
	"大林木",
	"路旁土",
	"剑锋金",
	"山头火",
	"涧下水",
	"城头土",
	"白蜡金",
	"杨柳木",
	"泉中水",
	"屋上土",
	"霹雳火",
	"松柏木",
	"长流水",
	"沙中金",
	"山下火",
	"平地木",
	"壁上土",
	"金箔金",
	"覆灯火",
	"天河水",
	"大驿土",
	"钗钏金",
	"桑柘木",
	"大溪水",
	"沙中土",
	"天上火",
	"石榴木",
	"大海水"
];
/** 纳音 of a 六十甲子 pair. Throws for impossible pairs (via sixtyCycleIndex). */
function nayin(gz) {
	return NAYIN[Math.floor(sixtyCycleIndex(gz) / 2)];
}
//#endregion
//#region src/changsheng.ts
/** 十二长生 stages in cycle order. */
const LIFE_STAGES = [
	"长生",
	"沐浴",
	"冠带",
	"临官",
	"帝旺",
	"衰",
	"病",
	"死",
	"墓",
	"绝",
	"胎",
	"养"
];
/** Branch where each stem's 长生 begins (火土同宫: 戊 follows 丙, 己 follows 丁). */
const CHANGSHENG_START = {
	甲: "亥",
	乙: "午",
	丙: "寅",
	丁: "酉",
	戊: "寅",
	己: "酉",
	庚: "巳",
	辛: "子",
	壬: "申",
	癸: "卯"
};
/** 十二长生: the stem's life stage in a branch. Yang stems count forward, yin stems backward. */
function lifeStage(stem, branch) {
	const start = branchIndex(CHANGSHENG_START[stem]);
	const here = branchIndex(branch);
	const offset = stemYinYang(stem) === "yang" ? here - start : start - here;
	return LIFE_STAGES[(offset % 12 + 12) % 12];
}
//#endregion
export { BRANCHES, ELEMENTS, ELEMENT_ZH, HEXAGRAMS, HIDDEN_STEMS, KING_WEN, LIFE_STAGES, LINE_NAMES, MEETINGS, NAYIN, PALACES, PUNISH_TRIPLES, SELF_PUNISH, SIXTY_CYCLE, STEMS, TRIGRAMS, TRINES, allMountainNames, branchClash, branchDestroy, branchElement, branchHalfCombine, branchHarm, branchHiddenCombine, branchIndex, branchMeeting, branchPunishPair, branchPunishTriple, branchSelfPunish, branchSixCombine, branchTriple, branchYinYang, controlledBy, controls, elementFromZh, elementRelation, flipLine, flyChart, ganZhiFromName, ganZhiName, generatedBy, generates, hexagram, hexagramFromTrigrams, hexagramLines, hiddenStemList, hiddenStems, lifeStage, mountainByName, mountainOf, nayin, palaceByKey, palaceByLuoshu, periodFromYear, periodYearRange, rotatedPalaceGrid, sixtyCycle, sixtyCycleIndex, stemCombine, stemControls, stemElement, stemIndex, stemYinYang, trigramByName, trigramFromLines, trineOf, voidBranches, wrap1to9 };
