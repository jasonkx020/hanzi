/**
 * 韵母分块（与人教版拼音页、闯关题库一致）
 */
export const VOWEL_SECTIONS = [
	{
		sectionKey: 'mono',
		title: '单韵母',
		kidTitle: '6 个基础音',
		emoji: '🌈',
		kidTip: 'a o e i u ü，嘴巴张开一个一个读',
		symbols: ['a', 'o', 'e', 'i', 'u', 'ü']
	},
	{
		sectionKey: 'diph',
		title: '复韵母',
		kidTitle: '两个字母手拉手',
		emoji: '🎶',
		kidTip: '两个韵母连在一起，滑着读',
		symbols: ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe']
	},
	{
		sectionKey: 'er',
		title: '特殊韵母',
		kidTitle: '卷舌 er',
		emoji: '👂',
		kidTip: '像说「儿」，舌头卷一点',
		symbols: ['er']
	},
	{
		sectionKey: 'nasal_front',
		title: '前鼻韵母',
		kidTitle: '鼻子前面音',
		emoji: '👃',
		kidTip: '声音从鼻子前面出来，像 n 的尾音',
		symbols: ['an', 'en', 'in', 'un', 'ün']
	},
	{
		sectionKey: 'nasal_back',
		title: '后鼻韵母',
		kidTitle: '鼻子后面音',
		emoji: '🗣️',
		kidTip: '声音往鼻腔后面，像 ng 的尾音',
		symbols: ['ang', 'eng', 'ing', 'ong']
	}
]

export function getAllVowelSymbols() {
	return VOWEL_SECTIONS.flatMap((s) => s.symbols)
}

/** @param {string} symbol */
export function findVowelSection(symbol) {
	const s = String(symbol || '').trim().toLowerCase().replace(/v/g, 'ü')
	if (!s) return null
	return VOWEL_SECTIONS.find((sec) => sec.symbols.includes(s)) || null
}
