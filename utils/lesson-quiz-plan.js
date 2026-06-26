/**
 * @file lesson-quiz-plan.js
 * @module utils
 * @description 基础设施工具：lesson-quiz-plan.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 本课小测题单：覆盖课内全部生字（听音选字 + 可选看字选音）。
 */
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import {
	pickShapeConfusableHanzi,
	readingsDifferent
} from '@/utils/hanzi-quiz-distractors.js'

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

export function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

/** 保持课次顺序去重 */
export function orderedUniqueRows(rows) {
	const seen = new Set()
	const out = []
	for (const r of rows || []) {
		const h = firstHanzi(r && r.hanzi)
		if (!h || seen.has(h)) continue
		seen.add(h)
		out.push({
			hanzi: h,
			pinyin: r && r.pinyin != null ? String(r.pinyin) : ''
		})
	}
	return out
}

export function normDisplayPinyin(raw, hanzi) {
	let s = String(raw || '')
		.replace(/\s+/g, ' ')
		.trim()
	if (!s && hanzi) {
		try {
			s = spellDisplayString(hanzi, 'poly', 'tone', 'array', 'low') || ''
		} catch (_) {
			s = ''
		}
	}
	if (Array.isArray(s)) s = s.filter(Boolean).join(' ')
	return s && s !== '-' ? s : ''
}

/**
 * @param {Array<{ hanzi: string, pinyin?: string }>} pool
 * @param {{ maxPinyinRound?: number }} [opts]
 * @returns {Array<{ type: 'hear_pick'|'see_py', target: { hanzi: string, pinyin: string } }>}
 */
export function buildLessonQuizPlan(pool, opts = {}) {
	const rows = orderedUniqueRows(pool)
	if (!rows.length) return []
	const maxPy = Number(opts.maxPinyinRound) > 0 ? Number(opts.maxPinyinRound) : 16
	const plan = []
	for (const row of rows) {
		plan.push({ type: 'hear_pick', target: row })
	}
	if (rows.length <= maxPy) {
		const pyRows = rows.filter((r) => normDisplayPinyin(r.pinyin, r.hanzi))
		for (const row of pyRows) {
			plan.push({ type: 'see_py', target: row })
		}
	}
	return shuffle(plan)
}

export function buildHanziOptions(target, pool, spellFn = spellDisplayString) {
	const t = target.hanzi
	const need = pool.length >= 3 ? 2 : 1
	let distractors = pickShapeConfusableHanzi(target, pool, need, spellFn)
	if (distractors.length < need) {
		const used = new Set([t, ...distractors])
		for (const r of shuffle(pool.filter((row) => row.hanzi !== t))) {
			if (distractors.length >= need) break
			if (used.has(r.hanzi)) continue
			if (!readingsDifferent(target, r, spellFn)) continue
			distractors.push(r.hanzi)
			used.add(r.hanzi)
		}
	}
	if (distractors.length < need) {
		const used = new Set([t, ...distractors])
		for (const r of shuffle(pool.filter((row) => row.hanzi !== t))) {
			if (distractors.length >= need) break
			if (used.has(r.hanzi)) continue
			distractors.push(r.hanzi)
			used.add(r.hanzi)
		}
	}
	return shuffle([t, ...distractors.slice(0, need)])
}

export function buildPinyinOptions(target, pool, spellFn) {
	const correct = normDisplayPinyin(target.pinyin, target.hanzi)
	if (!correct) return []
	const spell = typeof spellFn === 'function' ? spellFn : () => ''
	const distractors = []
	for (const r of shuffle(pool.filter((x) => x.hanzi !== target.hanzi))) {
		let py = normDisplayPinyin(r.pinyin, r.hanzi)
		if (!py && r.hanzi) py = normDisplayPinyin(spell(r.hanzi), r.hanzi)
		if (!py || py === correct || distractors.includes(py)) continue
		distractors.push(py)
		if (distractors.length >= 2) break
	}
	if (distractors.length < 2) return []
	return shuffle([correct, ...distractors.slice(0, 2)])
}

export function calcQuizPassNeed(totalQ, ratio = 0.8) {
	const t = Math.max(0, Math.floor(Number(totalQ) || 0))
	if (!t) return 0
	return Math.ceil(ratio * t)
}
