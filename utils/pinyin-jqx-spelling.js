/**
 * j / q / x（及 y）后拼写 u 读 ü：与教材一致。
 * 拆读展示用 üe、ün、ü；整音节文件多为 xuē、juàn 等拉丁 u 写法，查 opus / 标调须对齐。
 */
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'

export const PINYIN_U_UML = '\u00fc'

export function normPinyinLatin(s) {
	return String(s || '')
		.trim()
		.toLowerCase()
		.replace(/v/g, PINYIN_U_UML)
}

export function isJqxSingle(initial) {
	return initial.length === 1 && 'jqx'.includes(initial)
}

export function isJqxOrY(initial) {
	return (initial.length === 1 && 'jqx'.includes(initial)) || initial === 'y'
}

/** 该声母后韵母需按 ü 规则处理（不含 zh/ch/sh 等） */
export function usesJqxUmlautSpelling(initial) {
	return isJqxSingle(initial) || initial === 'y'
}

/**
 * 整音节（如 xue、xuan）与拆分片段（如 üe、ü、ün）在无声调 bare 下对齐，便于标调位置计算。
 * @returns {{ full: string, part: string }}
 */
export function alignBarePartForJqxTone(fullBare, partBare, initial) {
	const full = stripPinyinToneMarks(normPinyinLatin(fullBare))
	let part = stripPinyinToneMarks(normPinyinLatin(partBare))
	if (!usesJqxUmlautSpelling(initial) || !full || !part) {
		return { full, part }
	}

	if (part === `${PINYIN_U_UML}e` || part === 'ue') {
		if (full.endsWith('ue')) return { full, part: 'ue' }
	}

	/** 仅 j/q/x：un 读 ün；zhun、lun 等不在此规则内 */
	if (part === `${PINYIN_U_UML}n` || part === 'un') {
		if (isJqxSingle(initial) && full.endsWith('un')) {
			return { full, part: 'un' }
		}
	}

	if (part === PINYIN_U_UML) {
		const uIdx = full.indexOf('u')
		if (uIdx >= 0) return { full, part: 'u' }
	}

	const partAsU = part.replace(/\u00fc/g, 'u')
	if (partAsU !== part && full.includes(partAsU)) {
		return { full, part: partAsU }
	}

	return { full, part }
}

function pushUnique(arr, item) {
	if (!item) return
	if (arr.indexOf(item) === -1) arr.push(item)
}

/**
 * 查找 static/pinyin/{stem}.opus 时的文件名候选（先精确，再 jqx 等价写法）。
 * @param {string} stem 界面或拆读片段（可带调）
 * @param {{ initial?: string, isBlendPart?: boolean }} [ctx]
 * @returns {string[]}
 */
export function expandPinyinOpusStemCandidates(stem, ctx = {}) {
	const s = String(stem || '').trim().normalize('NFC')
	if (!s) return []

	const out = [s]
	const initial = String(ctx.initial || '')
	const jqx = usesJqxUmlautSpelling(initial)
	const bare = stripPinyinToneMarks(normPinyinLatin(s))

	if (bare === 'ue' || bare === `${PINYIN_U_UML}e`) {
		pushUnique(out, bare === 'ue' ? `${PINYIN_U_UML}e` : 'ue')
	}

	if (jqx && (bare === 'un' || bare === `${PINYIN_U_UML}n`)) {
		pushUnique(out, `${PINYIN_U_UML}n`)
		if (isJqxSingle(initial)) pushUnique(out, 'un')
	}

	if (bare === PINYIN_U_UML) {
		pushUnique(out, 'u')
	}
	if (bare === 'u' && jqx && ctx.isBlendPart) {
		pushUnique(out, PINYIN_U_UML)
	}

	return out
}
