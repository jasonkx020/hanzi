/**
 * 拼读练习：按拼音规则拆成「声母 → 介母 → 韵母」顺序（用于分步播放）。
 * - 整体认读音节：不拆分，整段播放（与「整体认读」表一致，含 zhi…shi、yue、yun 等）。
 * - 否则：两拼 / 三拼；j/q/x 后写的 ue → 韵母 üe；j/q/x + un → ün（与 lun/gun 等真 un 区分）。
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

/**
 * @param {string} symbol 格子上的拼音，如 hua、xue、qiu
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

	if (R.length >= 2) {
		const c0 = R[0]
		const isMedialHead = c0 === 'i' || c0 === 'u' || c0 === U_UML
		if (isMedialHead) {
			const tail = R.slice(1)
			if (tailHasVowel(tail)) {
				let medial = c0 === U_UML ? 'ü' : c0
				if ((isJqxSingle(initial) || initial === 'y') && medial === 'u') {
					medial = 'ü'
				}
				return [initial, medial, tail]
			}
		}
	}

	return [initial, R]
}

