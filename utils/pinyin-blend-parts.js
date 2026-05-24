/**
 * 拼读练习：按汉语拼音拼读规则拆分（用于分步播放）。
 * - 整体认读音节：不拆分（zhi…shi、yi…ying、yuan 等，见 pinyin-pep-category）。
 * - 两拼为主：声母 + 韵母（含介音韵母，如 tián → t + ián，韵母为 ian 整体带调）。
 * - 三拼仅用于教材示例音节（如 hua → h + u + a）；j/q/x 的 üe、ün 等仍按原规则。
 */

import { isPinyinWholeReadingSyllable } from '@/utils/pinyin-pep-category.js'

const U_UML = '\u00fc'

/** 最长优先匹配的声母（不含零声母） */
const INITIALS_LONG_FIRST = [
	'zh',
	'ch',
	'sh',
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
	'r',
	'z',
	'c',
	's',
	'y',
	'w'
]

/**
 * 与《汉语拼音方案》一致的韵母表（含介音韵母 ia/ian/iang、ua/uan 等）。
 * 与剩余部分 R 完全一致时走两拼，不把 i/u/ü 再拆成「介母 + 韵尾」。
 */
const BLEND_WHOLE_FINALS = new Set([
	'a',
	'o',
	'e',
	'er',
	'ai',
	'ei',
	'ao',
	'ou',
	'an',
	'en',
	'ang',
	'eng',
	'ong',
	'i',
	'ia',
	'iao',
	'ie',
	'iu',
	'ian',
	'in',
	'iang',
	'ing',
	'iong',
	'u',
	'ua',
	'uo',
	'uai',
	'ui',
	'uan',
	'un',
	'uang',
	'ueng',
	U_UML,
	'ue',
	`${U_UML}e`,
	`${U_UML}an`,
	`${U_UML}n`
])

/** 拼读页「三拼音节示例」，覆盖两拼（hua 的韵母写作 ua，但教学按 h-u-a 拼读） */
const FORCE_TRIPLE_SYLLABLES = new Set(['hua'])

function normBlend(raw) {
	return String(raw || '')
		.trim()
		.toLowerCase()
		.replace(/v/g, U_UML)
}

function tailHasVowel(tail) {
	if (!tail) return false
	return /[aeiou\u00fc]/.test(tail)
}

function isJqxOrY(initial) {
	return (initial.length === 1 && 'jqx'.includes(initial)) || initial === 'y'
}

/** 仅单字母 j / q / x（不含 zh/ch/sh） */
function isJqxSingle(initial) {
	return initial.length === 1 && 'jqx'.includes(initial)
}

/** 韵母书写归一（j/q/x、y 后 u→ü；ue→üe） */
function normalizeBlendFinalR(initial, R) {
	let fin = R
	if (fin === 'ue') fin = `${U_UML}e`
	if ((isJqxSingle(initial) || initial === 'y') && fin.startsWith('u')) {
		fin = U_UML + fin.slice(1)
	}
	return fin
}

function isBlendWholeFinal(initial, R) {
	return BLEND_WHOLE_FINALS.has(normalizeBlendFinalR(initial, R))
}

function tryTripleMedialSplit(initial, R) {
	if (R.length < 2) return null
	const c0 = R[0]
	const isMedialHead = c0 === 'i' || c0 === 'u' || c0 === U_UML
	if (!isMedialHead) return null
	const tail = R.slice(1)
	if (!tailHasVowel(tail)) return null
	let medial = c0 === U_UML ? 'ü' : c0
	if ((isJqxSingle(initial) || initial === 'y') && medial === 'u') {
		medial = 'ü'
	}
	return [initial, medial, tail]
}

/**
 * @param {string} symbol 格子上的拼音，如 hua、xue、qiu、tian
 * @returns {string[]} 按朗读顺序的片段，用于依次播放 static/pinyin 下对应 opus
 */
export function splitPinyinBlendParts(symbol) {
	const s = normBlend(symbol)
	if (!s) return []

	if (isPinyinWholeReadingSyllable(s)) {
		return [s]
	}

	let initial = ''
	let R = s
	for (const ini of INITIALS_LONG_FIRST) {
		if (s.startsWith(ini)) {
			initial = ini
			R = s.slice(ini.length)
			break
		}
	}

	if (!initial) {
		return [s]
	}

	const jqxY = isJqxOrY(initial)

	if (jqxY && R === 'u') {
		return [initial, 'ü']
	}

	if (!R) {
		return [initial]
	}

	/** 仅 j/q/x：拼音写法 un 实为 ün；zhun/chun/shun/lun 等仍为真 un，不误伤 */
	if (isJqxSingle(initial) && R === 'un') {
		return [initial, `${U_UML}n`]
	}

	/** 写作 ue / üe 时韵母统一为 üe（如 xue → x + üe）；yue 已在整体认读中整读 */
	if (R === 'ue' || R === `${U_UML}e`) {
		return [initial, `${U_UML}e`]
	}

	if (R === 'iu' || R === 'ui') {
		return [initial, R]
	}

	if (isBlendWholeFinal(initial, R)) {
		return [initial, normalizeBlendFinalR(initial, R)]
	}

	if (FORCE_TRIPLE_SYLLABLES.has(s)) {
		const triple = tryTripleMedialSplit(initial, R)
		if (triple) return triple
	}

	return [initial, R]
}
