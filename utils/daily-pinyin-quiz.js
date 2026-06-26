/**
 * @file daily-pinyin-quiz.js
 * @module utils
 * @description 基础设施工具：daily-pinyin-quiz.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 每日一练 · 复习段拼音多选
 */
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import {
	buildPinyinOptions,
	normDisplayPinyin,
	firstHanzi
} from '@/utils/lesson-quiz-plan.js'

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function normalizeComparePinyin(s) {
	return String(s || '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase()
}

/** 从多音字或其它课内字补足干扰项 */
function extraDistractorsFromHanzi(hanzi, correct) {
	const out = []
	try {
		const raw = spellDisplayString(hanzi, 'tone', 'poly', 'array', 'low')
		const list = Array.isArray(raw) ? raw : [String(raw || '').trim()]
		for (const py of list) {
			const n = normDisplayPinyin(py, hanzi)
			if (!n || n === correct || out.includes(n)) continue
			out.push(n)
		}
	} catch (_) {}
	return out
}

function poolFromDailyItems(items) {
	const seen = new Set()
	const pool = []
	for (const it of items || []) {
		const h = firstHanzi(it?.hanzi)
		if (!h || seen.has(h)) continue
		seen.add(h)
		pool.push({
			hanzi: h,
			pinyin: it.pinyin != null ? String(it.pinyin) : ''
		})
	}
	return pool
}

/**
 * 复习：生成 3 个读音选项（1 正 + 2 扰）
 * @param {{ hanzi: string, pinyin?: string }} target
 * @param {Array<{ hanzi: string, pinyin?: string }>} poolItems
 * @returns {{ correct: string, choices: Array<{ id: string, label: string, syllables: string[] }> }}
 */
export function buildDailyReviewPinyinChoices(target, poolItems) {
	const hanzi = firstHanzi(target?.hanzi)
	const correct = normDisplayPinyin(target?.pinyin, hanzi)
	if (!correct || !hanzi) {
		return { correct: '', choices: [] }
	}

	const pool = poolFromDailyItems(poolItems)
	let labels = buildPinyinOptions({ hanzi, pinyin: correct }, pool, spellDisplayString)

	if (labels.length < 3) {
		const used = new Set(labels)
		for (const py of extraDistractorsFromHanzi(hanzi, correct)) {
			if (labels.length >= 3) break
			if (!used.has(py)) {
				labels.push(py)
				used.add(py)
			}
		}
	}
	if (labels.length < 3) {
		const used = new Set([correct, ...labels])
		for (const row of shuffle(pool.filter((r) => r.hanzi !== hanzi))) {
			if (labels.length >= 3) break
			let py = normDisplayPinyin(row.pinyin, row.hanzi)
			if (!py && row.hanzi) {
				py = normDisplayPinyin(spellDisplayString(row.hanzi, 'poly', 'tone', 'low'), row.hanzi)
			}
			if (!py || used.has(py)) continue
			labels.push(py)
			used.add(py)
		}
	}
	if (!labels.includes(correct)) {
		labels = [correct, ...labels.filter((x) => x !== correct)]
	}
	labels = shuffle(labels.slice(0, 3))
	if (!labels.includes(correct)) {
		labels[labels.length - 1] = correct
		labels = shuffle(labels)
	}

	const choices = labels.map((label, i) => {
		const syllables = splitPinyinDisplayTokens(label)
		return {
			id: `py-${i}-${normalizeComparePinyin(label)}`,
			label,
			syllables: syllables.length ? syllables : [label],
			isCorrect: normalizeComparePinyin(label) === normalizeComparePinyin(correct)
		}
	})

	return { correct, choices }
}

export function isSamePinyinChoice(a, b) {
	return normalizeComparePinyin(a) === normalizeComparePinyin(b)
}
