/**
 * @file lesson-pinyin-quiz-plan.js
 * @module utils
 * @description 本课拼音小测出题（听音选字母，含带调题与前序课混入）
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { buildDrillOptions } from '@/data/pinyin-drill-pools.js'
import { applyToneToSyllableStem } from '@/utils/play-pinyin-local-audio.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'

/** 前序混入：约本课题量一半，上限避免后期过长 */
export const PRIOR_PINYIN_MIX_MAX = 8

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

/**
 * 本课 symbols 去重（保序）
 * @param {string[]} symbols
 * @returns {string[]}
 */
export function orderedUniqueSymbols(symbols) {
	const seen = new Set()
	const out = []
	for (const raw of symbols || []) {
		const s = String(raw || '').trim()
		if (!s || seen.has(s)) continue
		seen.add(s)
		out.push(s)
	}
	return out
}

/**
 * 可标调的 bare stem（applyTone 后与无调形不同）
 * @param {string[]} symbols
 * @returns {string[]}
 */
export function buildLessonToneStems(symbols) {
	const seen = new Set()
	const out = []
	for (const raw of symbols || []) {
		const bare = stripPinyinToneMarks(String(raw || '').trim().toLowerCase())
		if (!bare || seen.has(bare)) continue
		const marked = applyToneToSyllableStem(bare, 1)
		if (!marked || marked === bare) continue
		seen.add(bare)
		out.push(bare)
	}
	return out
}

/**
 * @param {string} symbol
 * @param {Record<string, number>} wrongWeightMap bare → count
 */
function wrongWeightForSymbol(symbol, wrongWeightMap) {
	const map = wrongWeightMap || {}
	const raw = String(symbol || '').trim()
	const bare = stripPinyinToneMarks(raw.toLowerCase())
	return Math.max(Number(map[raw]) || 0, Number(map[bare]) || 0)
}

/**
 * 从本课未覆盖的前序符号中抽若干；错题权重高者优先，同权再随机
 * @param {string[]} currentSymbols
 * @param {string[]} priorSymbols
 * @param {{ wrongWeightMap?: Record<string, number> }} [opts]
 * @returns {string[]}
 */
export function pickPriorPinyinMix(currentSymbols, priorSymbols, opts = {}) {
	const current = new Set(orderedUniqueSymbols(currentSymbols))
	const priorOnly = orderedUniqueSymbols(priorSymbols).filter((s) => !current.has(s))
	if (!priorOnly.length) return []
	const baseN = Math.max(1, current.size)
	const want = Math.min(
		PRIOR_PINYIN_MIX_MAX,
		priorOnly.length,
		Math.max(1, Math.ceil(baseN / 2))
	)
	const weightMap = opts.wrongWeightMap || {}
	const ranked = shuffle(priorOnly).sort((a, b) => {
		const dw = wrongWeightForSymbol(b, weightMap) - wrongWeightForSymbol(a, weightMap)
		return dw
	})
	/** 先保证错题尽量进卷，再补足名额 */
	const focus = ranked.filter((s) => wrongWeightForSymbol(s, weightMap) > 0)
	const rest = ranked.filter((s) => wrongWeightForSymbol(s, weightMap) <= 0)
	const picked = []
	for (const s of focus) {
		if (picked.length >= want) break
		picked.push(s)
	}
	for (const s of rest) {
		if (picked.length >= want) break
		picked.push(s)
	}
	return picked
}

/**
 * 干扰项：同 stem 其它调优先，再回退 buildDrillOptions
 * @param {string[]} pool
 * @param {string} target
 * @param {number} [optionCount]
 * @returns {string[]}
 */
export function buildLessonPinyinQuizOptions(pool, target, optionCount = 3) {
	const t = String(target || '').trim()
	const uniq = [...new Set((pool || []).map((s) => String(s).trim()).filter(Boolean))]
	if (!t || uniq.length < 2) return buildDrillOptions(pool, target, optionCount)

	const bare = stripPinyinToneMarks(t.toLowerCase())
	const sameStem = shuffle(
		uniq.filter((s) => s !== t && stripPinyinToneMarks(s.toLowerCase()) === bare)
	)
	const others = shuffle(
		uniq.filter((s) => s !== t && stripPinyinToneMarks(s.toLowerCase()) !== bare)
	)
	const need = Math.max(1, optionCount - 1)
	const picks = [...sameStem, ...others].slice(0, need)
	while (picks.length < need) {
		const extra = uniq.find((s) => s !== t && !picks.includes(s))
		if (!extra) break
		picks.push(extra)
	}
	return shuffle([t, ...picks].slice(0, optionCount))
}

/**
 * @param {string[]} symbols 本课（须全面覆盖）
 * @param {{ priorSymbols?: string[], wrongWeightMap?: Record<string, number> }} [opts]
 * @returns {Array<{ type: 'hear_pick', target: string, toned?: boolean, fromPrior?: boolean }>}
 */
export function buildLessonPinyinQuizPlan(symbols, opts = {}) {
	const base = orderedUniqueSymbols(symbols)
	if (base.length < 2) return []

	const wrongWeightMap = opts.wrongWeightMap || {}
	const priorMix = pickPriorPinyinMix(base, opts.priorSymbols || [], { wrongWeightMap })

	const plan = []
	for (const target of base) {
		plan.push({
			type: 'hear_pick',
			target,
			toned: false,
			fromPrior: false
		})
	}
	for (const target of priorMix) {
		plan.push({
			type: 'hear_pick',
			target,
			toned: false,
			fromPrior: true
		})
	}

	/** 带调题以本课 stem 为主；错题 stem 优先抽调 */
	const stems = buildLessonToneStems(base)
	const rankedStems = shuffle(stems).sort(
		(a, b) => wrongWeightForSymbol(b, wrongWeightMap) - wrongWeightForSymbol(a, wrongWeightMap)
	)
	const toneCap = Math.ceil(base.length / 2)
	const tonedTargets = []
	const usedToneKeys = new Set()
	const occupied = new Set([...base, ...priorMix])

	for (const bare of rankedStems) {
		if (tonedTargets.length >= toneCap) break
		const tones = shuffle([1, 2, 3, 4])
		const pickCount = 1 + Math.floor(Math.random() * 2)
		let added = 0
		for (const tone of tones) {
			if (added >= pickCount || tonedTargets.length >= toneCap) break
			const key = `${bare}|${tone}`
			if (usedToneKeys.has(key)) continue
			const marked = applyToneToSyllableStem(bare, tone)
			if (!marked || marked === bare) continue
			if (occupied.has(marked) || tonedTargets.includes(marked)) continue
			usedToneKeys.add(key)
			tonedTargets.push(marked)
			added++
		}
	}

	for (const target of tonedTargets) {
		plan.push({
			type: 'hear_pick',
			target,
			toned: true,
			fromPrior: false
		})
	}

	return shuffle(plan)
}

/**
 * 选项池 = 本课 ∪ 前序混入候选 ∪ 本卷带调 target
 * @param {string[]} baseSymbols
 * @param {Array<{ target: string }>} plan
 * @param {string[]} [priorSymbols] 全部前序（扩大干扰池，不限于本卷抽中项）
 * @returns {string[]}
 */
export function buildLessonPinyinQuizOptionPool(baseSymbols, plan, priorSymbols = []) {
	const seen = new Set()
	const out = []
	for (const s of [
		...orderedUniqueSymbols(baseSymbols),
		...orderedUniqueSymbols(priorSymbols)
	]) {
		if (seen.has(s)) continue
		seen.add(s)
		out.push(s)
	}
	for (const item of plan || []) {
		const t = String(item && item.target ? item.target : '').trim()
		if (!t || seen.has(t)) continue
		seen.add(t)
		out.push(t)
	}
	return out
}
