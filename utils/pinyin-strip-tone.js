/**
 * 去掉拼音音节上的声调：仅用预组合字符映射 + 删除四声组合调号，
 * 不使用 Unicode NFC/NFD，避免出现 ɑ 上叠多个调号等问题。
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
