/**
 * 人教版（PEP）常见拼音分类着色：用于「拼音」页声母 / 韵母等网格背景与图例。
 * 与设计文案「颜色分类（人教版常见分法）」一致。
 */

const DEFAULT_CAT = {
	key: 'default',
	label: '其他',
	bg: '#f0ebe3',
	bd: '#d8d2c8'
}

/** @typedef {{ key: string, label: string, bg: string, bd: string }} PinyinCat */

/** 声母：发音部位 */
const INITIAL_DEFS = [
	{
		key: 'bilabial',
		label: '双唇音 b p m',
		bg: '#ffe8f2',
		bd: '#e8b8cc',
		symbols: new Set(['b', 'p', 'm'])
	},
	{
		key: 'labiodental',
		label: '唇齿音 f',
		bg: '#fff0e0',
		bd: '#e8cfa8',
		symbols: new Set(['f'])
	},
	{
		key: 'apical',
		label: '舌尖中音 d t n l',
		bg: '#e8f4ff',
		bd: '#b8cce8',
		symbols: new Set(['d', 't', 'n', 'l'])
	},
	{
		key: 'velar',
		label: '舌根音 g k h',
		bg: '#e8fff4',
		bd: '#a8d8c4',
		symbols: new Set(['g', 'k', 'h'])
	},
	{
		key: 'palatal',
		label: '舌面音 j q x',
		bg: '#f0e8ff',
		bd: '#c4b8e8',
		symbols: new Set(['j', 'q', 'x'])
	},
	{
		key: 'retroflex',
		label: '翘舌音 zh ch sh r',
		bg: '#fff8e8',
		bd: '#e8d4a8',
		symbols: new Set(['zh', 'ch', 'sh', 'r'])
	},
	{
		key: 'alveolar',
		label: '平舌音 z c s',
		bg: '#e8fcff',
		bd: '#a8dce8',
		symbols: new Set(['z', 'c', 's'])
	},
	{
		key: 'glide',
		label: '隔音字母 y w',
		bg: '#ede8ff',
		bd: '#c6bee8',
		symbols: new Set(['y', 'w'])
	}
]

/** 韵母结构：单韵母 / 复韵母 / er / 前鼻韵母 / 后鼻韵母 */
const FINAL_SIMPLE = ['ɑ', 'o', 'e', 'i', 'u', 'ü']
const FINAL_COMPOUND = ['ai', 'ei', 'ui', 'ɑo', 'ou', 'iu', 'ie', 'üe']

const FINAL_DEFS = [
	{
		key: 'mono',
		label: '单韵母',
		bg: '#ffe8ea',
		bd: '#e8a8b0',
		symbols: new Set(FINAL_SIMPLE)
	},
	{
		key: 'diph',
		label: '复韵母',
		bg: '#e8f8ff',
		bd: '#a8d0e8',
		symbols: new Set(FINAL_COMPOUND)
	},
	{
		key: 'er',
		label: '特殊韵母 er',
		bg: '#f5ffe8',
		bd: '#c4e8a8',
		symbols: new Set(['er'])
	},
	{
		key: 'nasal_front',
		label: '前鼻韵母 ɑn en in un ün',
		bg: '#fff4e8',
		bd: '#e8c4a0',
		symbols: new Set(['ɑn', 'en', 'in', 'un', 'ün'])
	},
	{
		key: 'nasal_back',
		label: '后鼻韵母 ɑng eng ing ong',
		bg: '#e8ffe8',
		bd: '#98d098',
		symbols: new Set(['ɑng', 'eng', 'ing', 'ong'])
	}
]

/** 整体认读音节常见二分：翘舌一组、其余一组（教材常对比呈现） */
const WHOLE_zhishi = ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si']

const WHOLE_DEFS = [
	{
		key: 'whole_zh_ch',
		label: 'zhi chi shi ri zi ci si',
		bg: '#fff0e8',
		bd: '#e8b898',
		symbols: new Set(WHOLE_zhishi)
	},
	{
		key: 'whole_other',
		label: 'yi wu yu ye yue yuɑn yin yun ying',
		bg: '#e8eeff',
		bd: '#a8b4e8',
		symbols: new Set([
			'yi',
			'wu',
			'yu',
			'ye',
			'yue',
			'yuɑn',
			'yin',
			'yun',
			'ying'
		])
	}
]

/** 拼读练习：区分两拼音节 / 含 üe 或撮口呼 / 三拼音节示例 */
const DRILL_TRI = ['huɑ']
const DRILL_UE_FAMILY = ['xue']

function pickInitial(sym) {
	for (const d of INITIAL_DEFS) {
		if (d.symbols.has(sym)) return d
	}
	return null
}

function pickFinal(sym) {
	for (const d of FINAL_DEFS) {
		if (d.symbols.has(sym)) return d
	}
	return null
}

function pickWhole(sym) {
	for (const d of WHOLE_DEFS) {
		if (d.symbols.has(sym)) return d
	}
	return null
}

/**
 * @param {string} symbol
 * @param {string} tab
 * @returns {PinyinCat}
 */
export function getPinyinSymbolCategory(symbol, tab) {
	const sym = String(symbol || '').trim()
	if (!sym) return { ...DEFAULT_CAT }

	if (tab === '声母') {
		const d = pickInitial(sym)
		if (d)
			return { key: d.key, label: d.label, bg: d.bg, bd: d.bd }
		return { ...DEFAULT_CAT }
	}

	if (tab === '韵母') {
		const d = pickFinal(sym)
		if (d)
			return { key: d.key, label: d.label, bg: d.bg, bd: d.bd }
		return { ...DEFAULT_CAT }
	}

	if (tab === '整体认读') {
		const d = pickWhole(sym)
		if (d)
			return { key: d.key, label: d.label, bg: d.bg, bd: d.bd }
		return { ...DEFAULT_CAT }
	}

	if (tab === '拼读练习') {
		if (DRILL_TRI.includes(sym)) {
			return {
				key: 'drill_triple',
				label: '三拼音节示例',
				bg: '#ffeef8',
				bd: '#e8b0cc'
			}
		}
		if (DRILL_UE_FAMILY.includes(sym)) {
			return {
				key: 'drill_ue',
				label: 'üe / 撮口韵',
				bg: '#e8fff8',
				bd: '#90d8c8'
			}
		}
		return {
			key: 'drill_double',
			label: '两拼音节示例',
			bg: '#f4f2ec',
			bd: '#c8c2b6'
		}
	}

	return { ...DEFAULT_CAT }
}

const TAB_DEF_REGISTRY = {
	声母: INITIAL_DEFS,
	韵母: FINAL_DEFS,
	整体认读: WHOLE_DEFS,
	拼读练习: null
}

/**
 * 当前 Tab 下图例：仅展示本页网格里真实出现过的分类。
 * @param {string} tab
 * @param {string[]} symbols
 * @returns {PinyinCat[]}
 */
export function legendForTab(tab, symbols) {
	const arr = Array.isArray(symbols) ? symbols : []
	const used = new Map()

	for (const s of arr) {
		const cat = getPinyinSymbolCategory(s, tab)
		if (!used.has(cat.key)) {
			used.set(cat.key, { key: cat.key, label: cat.label, bg: cat.bg, bd: cat.bd })
		}
	}

	if (tab === '拼读练习') {
		const order = ['drill_triple', 'drill_ue', 'drill_double', 'default']
		return Array.from(used.values()).sort(
			(a, b) => order.indexOf(a.key) - order.indexOf(b.key)
		)
	}

	const registry = TAB_DEF_REGISTRY[tab]
	if (registry) {
		const orderKeys = registry.map((d) => d.key)
		return Array.from(used.values()).sort(
			(a, b) => orderKeys.indexOf(a.key) - orderKeys.indexOf(b.key)
		)
	}

	return Array.from(used.values())
}
