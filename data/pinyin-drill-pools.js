/**
 * 拼音闯关题库（与人教版拼音页分类一致）
 */

const INITIAL_SYMBOLS = [
	'b',
	'p',
	'm',
	'f',
	'd',
	't',
	'n',
	'l',
	'g',
	'k',
	'h',
	'j',
	'q',
	'x',
	'zh',
	'ch',
	'sh',
	'r',
	'z',
	'c',
	's',
	'y',
	'w'
]

const VOWEL_SYMBOLS = [
	'a',
	'o',
	'e',
	'i',
	'u',
	'ü',
	'ai',
	'ei',
	'ui',
	'ao',
	'ou',
	'iu',
	'ie',
	'üe',
	'er',
	'an',
	'en',
	'in',
	'un',
	'ün',
	'ang',
	'eng',
	'ing',
	'ong'
]

const WHOLE_SYMBOLS = [
	'zhi',
	'chi',
	'shi',
	'ri',
	'zi',
	'ci',
	'si',
	'yi',
	'wu',
	'yu',
	'ye',
	'yue',
	'yuan',
	'yin',
	'yun',
	'ying'
]

const BLEND_SYMBOLS = ['ba', 'bo', 'ma', 'de', 'du', 'ge', 'hua', 'xue', 'qiu', 'zhan', 'cheng', 'shi']

export const PINYIN_DRILL_CATEGORIES = [
	{ key: 'initial', label: '声母', emoji: '🔤', desc: '听音选出正确的声母' },
	{ key: 'vowel', label: '韵母', emoji: '🎵', desc: '听音选出正确的韵母' },
	{ key: 'whole', label: '整体认读', emoji: '⭐', desc: '听音选出整体认读音节' },
	{ key: 'blend', label: '拼读', emoji: '🧩', desc: '听拼读，选出完整音节（优先当前教材识字表）' },
	{ key: 'mix', label: '综合', emoji: '🌈', desc: '声母、韵母、拼读混合挑战' }
]

const POOLS = {
	initial: INITIAL_SYMBOLS,
	vowel: VOWEL_SYMBOLS,
	whole: WHOLE_SYMBOLS,
	blend: BLEND_SYMBOLS
}

/** 每轮题数 */
export const PINYIN_DRILL_ROUND_SIZE = 5

/** 选择题选项个数 */
export const PINYIN_DRILL_OPTION_COUNT = 3

/**
 * @param {string} categoryKey
 * @returns {string[]}
 */
export function getDrillPool(categoryKey) {
	const key = String(categoryKey || 'mix')
	if (key === 'mix') {
		const merged = [...INITIAL_SYMBOLS, ...VOWEL_SYMBOLS.slice(0, 12), ...BLEND_SYMBOLS]
		return [...new Set(merged)]
	}
	return (POOLS[key] || []).slice()
}

/**
 * @param {string[]} pool
 * @param {number} n
 */
export function pickDrillTargets(pool, n = PINYIN_DRILL_ROUND_SIZE) {
	const arr = (pool || []).filter((s) => s && String(s).trim())
	if (!arr.length) return []
	const shuffled = shuffle(arr)
	const count = Math.min(n, shuffled.length)
	return shuffled.slice(0, count)
}

/**
 * @param {string[]} pool
 * @param {string} target
 * @param {number} optionCount
 * @returns {string[]}
 */
export function buildDrillOptions(pool, target, optionCount = PINYIN_DRILL_OPTION_COUNT) {
	const t = String(target || '').trim()
	const uniq = [...new Set((pool || []).map((s) => String(s).trim()).filter(Boolean))]
	const distractors = shuffle(uniq.filter((s) => s !== t))
	const need = Math.max(1, optionCount - 1)
	const picks = distractors.slice(0, need)
	while (picks.length < need && uniq.length > picks.length + 1) {
		const extra = distractors[picks.length]
		if (extra && !picks.includes(extra)) picks.push(extra)
		else break
	}
	return shuffle([t, ...picks].slice(0, optionCount))
}

/**
 * @param {number} correct
 * @param {number} total
 * @returns {0|1|2|3}
 */
export function starsForDrillScore(correct, total) {
	const t = Math.max(1, total)
	const c = Math.max(0, correct)
	if (c >= t) return 3
	if (c >= t - 1) return 2
	if (c >= Math.ceil(t / 2)) return 1
	return 0
}

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}
