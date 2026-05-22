/**
 * 拼音页「声母 + 韵母」字母顺序（与人教版常见教学顺序一致）
 * 用于录音测试 / MFCC 评分下拉，不含整体认读与拼读音节。
 */
export const PINYIN_INITIAL_SYMBOLS = [
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

export const PINYIN_VOWEL_SYMBOLS = [
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

/** @type {string[]} */
export const PINYIN_LETTER_SYMBOLS = [...PINYIN_INITIAL_SYMBOLS, ...PINYIN_VOWEL_SYMBOLS]
