/**
 * 拼读练习：将单个拼音音节拆成「展示用」与「查音用」两条序列，并给出声母 / 介母 / 韵母。
 *
 * - displaySequence：教材书写（j/q/x 后介音写作 u，如 quān → q, u, ān, quān）
 * - lookupSequence：真实读音查 static/pinyin（介音为 ü，如 quān → q, ü, ān, quān）
 * - i/u/ü 作介母且后为独立韵段时三拼（jia→j+i+a，duan→d+u+an），不把 ia/uan 等强行两拼
 *
 * 每条序列末尾为带调整音节（若输入有声调）；中间片段按整音节标调规则标到对应韵段。
 */

import { isPinyinWholeReadingSyllable } from '@/utils/pinyin-pep-category.js'
import { stripPinyinToneMarks, detectToneNumberFromSyllable } from '@/utils/pinyin-strip-tone.js'
import { applyToneFromFullSyllableToPart } from '@/utils/play-pinyin-local-audio.js'
import { normPinyinLatin, PINYIN_U_UML } from '@/utils/pinyin-jqx-spelling.js'

const U = PINYIN_U_UML

/** @typedef {'whole'|'zero'|'initial-final'|'initial-medial-final'} PinyinBlendType */

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

/** 与 pinyin-blend-parts 一致：两拼时韵母不再拆介音 */
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
	'ie',
	'iu',
	'ian',
	'in',
	'ing',
	'u',
	'ui',
	'un',
	U,
	'ue',
	`${U}e`,
	`${U}an`,
	`${U}n`
])

/**
 * 介母 i/u/ü 后的韵段（与介母不构成「整体韵母」书写，拼读按三拼拆）。
 * 如 jia→j+i+a，duan→d+u+an；不含 iu/ui/ie 等宜两拼的整体。
 */
const MEDIAL_READING_FINAL_TAILS = new Set([
	'a',
	'o',
	'e',
	'ai',
	'ei',
	'ao',
	'ou',
	'an',
	'en',
	'ang',
	'eng',
	'ong',
	'in',
	'ing'
])

/** 剩余部分 R 保持两拼、不拆介母（iu→由下面规则；ie/ue 等） */
const READING_TWO_PIN_REMAINDER = new Set(['iu', 'ui', 'ie', 'ue', `${U}e`, 'er', 'iong'])

function isJqxSingle(initial) {
	return initial.length === 1 && 'jqx'.includes(initial)
}

function isJqxOrY(initial) {
	return isJqxSingle(initial) || initial === 'y'
}

function normalizeLookupFinal(initial, R) {
	let fin = R
	if (fin === 'ue') fin = `${U}e`
	if ((isJqxSingle(initial) || initial === 'y') && fin.startsWith('u')) {
		fin = U + fin.slice(1)
	}
	return fin
}

function isBlendWholeFinal(initial, R) {
	return BLEND_WHOLE_FINALS.has(normalizeLookupFinal(initial, R))
}

function tailHasVowel(tail) {
	return tail ? /[aeiou\u00fc]/.test(tail) : false
}

/**
 * @param {string} part lookup 写法
 * @param {'medial'|'final'|'other'} role
 */
function toDisplaySpelling(part, role) {
	if (!part) return ''
	if (role === 'medial' && part === U) return 'u'
	if (role === 'final' || role === 'other') {
		if (part === `${U}e`) return 'ue'
		if (part === `${U}n`) return 'un'
	}
	return part.replace(/\u00fc/g, 'u')
}

/**
 * @param {string} bare
 * @param {string} initial
 * @param {string} R
 * @returns {{ type: PinyinBlendType, initial: string, medialLookup: string, finalLookup: string }}
 */
function resolveLookupStructure(bare, initial, R) {
	if (!initial) {
		return { type: 'zero', initial: '', medialLookup: '', finalLookup: bare }
	}

	if (isJqxSingle(initial) && R === 'u') {
		return { type: 'initial-final', initial, medialLookup: U, finalLookup: '' }
	}

	if (isJqxSingle(initial) && R === 'un') {
		return { type: 'initial-final', initial, medialLookup: '', finalLookup: `${U}n` }
	}

	if (R === 'ue' || R === `${U}e`) {
		return { type: 'initial-final', initial, medialLookup: '', finalLookup: `${U}e` }
	}

	if (R === 'iu' || R === 'ui') {
		return { type: 'initial-final', initial, medialLookup: '', finalLookup: R }
	}

	/** 介母三拼优先：jia、duan、quan、hua 等（先于 ia/uan 整体两拼） */
	const readingTriple = tryReadingMedialSplit(initial, R)
	if (readingTriple) {
		return {
			type: 'initial-medial-final',
			initial: readingTriple.initial,
			medialLookup: readingTriple.medialLookup,
			finalLookup: readingTriple.finalLookup
		}
	}

	if (isBlendWholeFinal(initial, R)) {
		return {
			type: 'initial-final',
			initial,
			medialLookup: '',
			finalLookup: normalizeLookupFinal(initial, R)
		}
	}

	return { type: 'initial-final', initial, medialLookup: '', finalLookup: R }
}

/**
 * 拼读教学：R 以 i/u/ü 为介母且后为独立韵段时拆三拼（不把 ia、uan 等当作不可拆的整体韵母）。
 */
function tryReadingMedialSplit(initial, R) {
	if (!R || READING_TWO_PIN_REMAINDER.has(R)) return null
	const triple = tryMedialSplit(initial, R)
	if (!triple) return null
	const tail = R.slice(1)
	if (!tail || !MEDIAL_READING_FINAL_TAILS.has(tail)) return null
	return triple
}

function tryMedialSplit(initial, R) {
	if (R.length < 2) return null
	const c0 = R[0]
	const isMedialHead = c0 === 'i' || c0 === 'u' || c0 === U
	if (!isMedialHead) return null
	const tail = R.slice(1)
	if (!tailHasVowel(tail)) return null
	let medialLookup = c0 === U ? U : c0
	if ((isJqxSingle(initial) || initial === 'y') && medialLookup === 'u') {
		medialLookup = U
	}
	return { initial, medialLookup, finalLookup: tail }
}

function tonePart(bare, partBare, toneNum) {
	if (!partBare || toneNum < 1 || toneNum > 4) return partBare
	const toned = applyToneFromFullSyllableToPart(bare, partBare, toneNum)
	return toned || partBare
}

function buildSequences(bare, toneNum, structure, original) {
	const { initial, medialLookup, finalLookup } = structure
	const lookupBare = []
	const displayBare = []

	if (initial) {
		lookupBare.push(initial)
		displayBare.push(initial)
	}
	if (medialLookup) {
		lookupBare.push(medialLookup)
		displayBare.push(toDisplaySpelling(medialLookup, 'medial'))
	}
	if (finalLookup) {
		lookupBare.push(finalLookup)
		displayBare.push(toDisplaySpelling(finalLookup, 'final'))
	}

	const whole = String(original || '').trim() || bare
	const lookupSequence = lookupBare.map((p) => tonePart(bare, p, toneNum))
	const displaySequence = displayBare.map((p) => tonePart(bare, p, toneNum))

	if (lookupBare.length >= 1) {
		lookupSequence.push(whole)
		displaySequence.push(whole)
	} else {
		lookupSequence.push(whole)
		displaySequence.push(whole)
	}

	return { lookupSequence, displaySequence }
}

/**
 * @param {string} syllable 带调或不带调，如 quān、quan、xue
 * @returns {{
 *   displaySequence: string[],
 *   lookupSequence: string[],
 *   initial: string,
 *   medial: string,
 *   medialLookup: string,
 *   final: string,
 *   finalLookup: string,
 *   whole: string,
 *   bare: string,
 *   tone: number,
 *   blendType: PinyinBlendType
 * }}
 */
export function splitPinyinReadingSequences(syllable) {
	const original = String(syllable || '').trim()
	const bare = stripPinyinToneMarks(normPinyinLatin(original))
	const tone = detectToneNumberFromSyllable(original)

	const empty = {
		displaySequence: [],
		lookupSequence: [],
		initial: '',
		medial: '',
		medialLookup: '',
		final: '',
		finalLookup: '',
		whole: original,
		bare,
		tone,
		blendType: /** @type {PinyinBlendType} */ ('zero')
	}

	if (!bare) return empty

	if (isPinyinWholeReadingSyllable(bare)) {
		const seq = [original || bare]
		return {
			...empty,
			displaySequence: seq,
			lookupSequence: seq,
			whole: original || bare,
			blendType: 'whole'
		}
	}

	let initial = ''
	let R = bare
	for (const ini of INITIALS_LONG_FIRST) {
		if (bare.startsWith(ini)) {
			initial = ini
			R = bare.slice(ini.length)
			break
		}
	}

	if (!initial) {
		const seq = [original || bare]
		return {
			...empty,
			displaySequence: seq,
			lookupSequence: seq,
			whole: original || bare,
			blendType: 'zero'
		}
	}

	const structure = resolveLookupStructure(bare, initial, R)
	const { lookupSequence, displaySequence } = buildSequences(bare, tone, structure, original)

	const finalLookup = structure.finalLookup || ''
	const medialLookup = structure.medialLookup || ''
	const finalDisplay = finalLookup ? toDisplaySpelling(finalLookup, 'final') : ''
	const medialDisplay = medialLookup ? toDisplaySpelling(medialLookup, 'medial') : ''

	return {
		displaySequence,
		lookupSequence,
		initial: structure.initial,
		medial: medialDisplay,
		medialLookup,
		final: tonePart(bare, finalDisplay, tone),
		finalLookup: tonePart(bare, finalLookup, tone),
		whole: original || bare,
		bare,
		tone,
		blendType: structure.type
	}
}

const READING_DISPLAY_SEP = ' - '

/**
 * 拼读展示：先拼好完整串再进四线三格（非每段单独一格）。
 * @param {string} syllable
 * @returns {{
 *   displayLine: string,
 *   segments: Array<{ type: 'part'|'sep', text: string, lookupIndex?: number }>,
 *   displaySequence: string[],
 *   lookupSequence: string[],
 *   whole: string,
 *   bare: string,
 *   tone: number,
 *   blendType: PinyinBlendType
 * }}
 */
export function buildPinyinReadingDisplay(syllable) {
	const split = splitPinyinReadingSequences(syllable)
	const parts = split.displaySequence.length
		? split.displaySequence
		: [split.whole || String(syllable || '').trim()].filter(Boolean)

	if (!parts.length) {
		return {
			displayLine: '',
			segments: [],
			...split
		}
	}

	if (parts.length === 1) {
		return {
			displayLine: parts[0],
			segments: [{ type: 'part', text: parts[0], lookupIndex: 0 }],
			...split
		}
	}

	/** @type {Array<{ type: 'part'|'sep', text: string, lookupIndex?: number }>} */
	const segments = []
	parts.forEach((text, i) => {
		if (i > 0) {
			segments.push({ type: 'sep', text: READING_DISPLAY_SEP })
		}
		segments.push({ type: 'part', text, lookupIndex: i })
	})

	return {
		displayLine: segments.map((s) => s.text).join(''),
		segments,
		...split
	}
}
