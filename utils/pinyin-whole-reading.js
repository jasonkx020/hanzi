/** 教材「整体认读音节」：拼读不拆分（zhi…si、yi…ying、yuan 等） */

const WHOLE_READING_SYLLABLES = new Set([
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
])

function normWholeReadingLookup(raw) {
	return String(raw || '')
		.trim()
		.toLowerCase()
		.replace(/v/g, '\u00fc')
}

export function isPinyinWholeReadingSyllable(symbol) {
	return WHOLE_READING_SYLLABLES.has(normWholeReadingLookup(symbol))
}
