/**
 * 去掉拼音音节上的声调：仅用预组合字符映射 + 删除四声组合调号，
 * 不使用 Unicode NFC/NFD，避免带调字母与组合调号处理异常。
 * ü 的分音符（U+0308）会保留。
 */

/** 拼音四声对应的组合用调号 */
const COMBINING_TONE_MARKS = /[\u0304\u0301\u030c\u0300]/g

/**
 * 小写预组合带调字母 → 无声调底字（ü 的四个调 → ü）
 * @type {Map<string, string>}
 */
const PRECOMPOSED_TONE_TO_BASE = new Map([
	['\u0101', 'a'],
	['\u00e1', 'a'],
	['\u01ce', 'a'],
	['\u00e0', 'a'],
	['\u0113', 'e'],
	['\u00e9', 'e'],
	['\u011b', 'e'],
	['\u00e8', 'e'],
	['\u012b', 'i'],
	['\u00ed', 'i'],
	['\u01d0', 'i'],
	['\u00ec', 'i'],
	['\u014d', 'o'],
	['\u00f3', 'o'],
	['\u01d2', 'o'],
	['\u00f2', 'o'],
	['\u016b', 'u'],
	['\u00fa', 'u'],
	['\u01d4', 'u'],
	['\u00f9', 'u'],
	['\u01d6', '\u00fc'],
	['\u01d8', '\u00fc'],
	['\u01da', '\u00fc'],
	['\u01dc', '\u00fc']
])

/** 预组合带调字母 → 声调 1–4 */
const TONE_CHAR_TO_NUMBER = {
	'\u0101': 1,
	'\u00e1': 2,
	'\u01ce': 3,
	'\u00e0': 4,
	'\u0113': 1,
	'\u00e9': 2,
	'\u011b': 3,
	'\u00e8': 4,
	'\u012b': 1,
	'\u00ed': 2,
	'\u01d0': 3,
	'\u00ec': 4,
	'\u014d': 1,
	'\u00f3': 2,
	'\u01d2': 3,
	'\u00f2': 4,
	'\u016b': 1,
	'\u00fa': 2,
	'\u01d4': 3,
	'\u00f9': 4,
	'\u01d6': 1,
	'\u01d8': 2,
	'\u01da': 3,
	'\u01dc': 4
}

/**
 * 从带调音节识别声调（1–4）；无声调返回 0。
 * @param {string} syllable
 * @returns {number}
 */
export function detectToneNumberFromSyllable(syllable) {
	const s = String(syllable || '').normalize('NFC')
	for (const ch of s) {
		const n = TONE_CHAR_TO_NUMBER[ch]
		if (n) return n
	}
	return 0
}

/**
 * @param {string} s
 * @returns {string}
 */
export function stripPinyinToneMarks(s) {
	let t = String(s || '').trim().toLowerCase()
	let out = ''
	for (const ch of t) {
		out += PRECOMPOSED_TONE_TO_BASE.get(ch) ?? ch
	}
	for (let i = 0; i < 8; i++) {
		const next = out.replace(COMBINING_TONE_MARKS, '')
		if (next === out) break
		out = next
	}
	return out
}
