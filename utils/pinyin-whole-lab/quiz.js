/**
 * @file quiz.js
 * @module utils
 * @description 基础设施工具：quiz.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { getAllWholeSymbols, findWholeSection, WHOLE_SECTIONS } from './sections.js'
import {
	WHOLE_EAR_QUIZ_TOTAL,
	WHOLE_TIP_QUIZ_TOTAL,
	WHOLE_GROUP_QUIZ_TOTAL
} from './constants.js'

function pickRandom(arr) {
	const a = arr || []
	if (!a.length) return null
	return a[Math.floor(Math.random() * a.length)]
}

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function normSymbol(s) {
	return String(s || '').trim().toLowerCase()
}

function buildSymbolOptions(correct, pool, count = 4) {
	const opts = new Set([correct])
	const arr = (pool || []).filter((s) => normSymbol(s) !== normSymbol(correct))
	for (const s of shuffle(arr)) {
		if (opts.size >= count) break
		opts.add(s)
	}
	for (const s of shuffle(getAllWholeSymbols())) {
		if (opts.size >= count) break
		opts.add(s)
	}
	return shuffle(
		[...opts].slice(0, count).map((symbol) => ({
			symbol,
			correct: normSymbol(symbol) === normSymbol(correct)
		}))
	)
}

export function buildWholeEarQuestions(count = WHOLE_EAR_QUIZ_TOTAL) {
	const pool = getAllWholeSymbols()
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 24) {
		guard++
		const symbol = pickRandom(pool)
		const key = normSymbol(symbol)
		if (!symbol || used.has(key)) continue
		used.add(key)
		questions.push({
			id: `ear-${questions.length}`,
			symbol,
			play: symbol,
			options: buildSymbolOptions(symbol, pool)
		})
	}
	return questions
}

export function buildWholeTipQuestions(count = WHOLE_TIP_QUIZ_TOTAL) {
	const pool = getAllWholeSymbols()
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 24) {
		guard++
		const symbol = pickRandom(pool)
		const key = normSymbol(symbol)
		if (!symbol || used.has(key)) continue
		const sec = findWholeSection(symbol)
		if (!sec) continue
		used.add(key)
		questions.push({
			id: `tip-${questions.length}`,
			symbol,
			play: symbol,
			section: sec,
			options: buildSymbolOptions(symbol, pool)
		})
	}
	return questions
}

export function buildWholeGroupQuestions(count = WHOLE_GROUP_QUIZ_TOTAL) {
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 30) {
		guard++
		const sec = pickRandom(WHOLE_SECTIONS)
		if (!sec?.symbols?.length) continue
		const symbol = pickRandom(sec.symbols)
		const key = normSymbol(symbol)
		if (!symbol || used.has(key)) continue
		used.add(key)
		questions.push({
			id: `group-${questions.length}`,
			symbol,
			play: symbol,
			section: sec,
			options: shuffle(
				sec.symbols.map((s) => ({
					symbol: s,
					correct: normSymbol(s) === key
				}))
			)
		})
	}
	return questions
}
