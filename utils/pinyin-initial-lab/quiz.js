import { getAllInitialSymbols, findInitialSection, INITIAL_SECTIONS } from './sections.js'
import {
	INITIAL_EAR_QUIZ_TOTAL,
	INITIAL_MOUTH_QUIZ_TOTAL,
	INITIAL_GROUP_QUIZ_TOTAL
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

function buildLetterOptions(correct, pool, count = 4) {
	const opts = new Set([correct])
	const arr = (pool || []).filter((s) => s !== correct)
	const shuffled = shuffle(arr)
	for (const s of shuffled) {
		if (opts.size >= count) break
		opts.add(s)
	}
	for (const s of getAllInitialSymbols()) {
		if (opts.size >= count) break
		opts.add(s)
	}
	return shuffle([...opts].slice(0, count).map((symbol) => ({
		symbol,
		correct: symbol === correct
	})))
}

/** 关 1：听音选声母 */
export function buildInitialEarQuestions(count = INITIAL_EAR_QUIZ_TOTAL) {
	const pool = getAllInitialSymbols()
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 24) {
		guard++
		const symbol = pickRandom(pool)
		if (!symbol || used.has(symbol)) continue
		used.add(symbol)
		questions.push({
			id: `ear-${questions.length}`,
			symbol,
			play: symbol,
			options: buildLetterOptions(symbol, pool)
		})
	}
	return questions
}

/** 关 2：口型提示 + 听音选声母 */
export function buildInitialMouthQuestions(count = INITIAL_MOUTH_QUIZ_TOTAL) {
	const pool = getAllInitialSymbols()
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 24) {
		guard++
		const symbol = pickRandom(pool)
		if (!symbol || used.has(symbol)) continue
		const sec = findInitialSection(symbol)
		if (!sec) continue
		used.add(symbol)
		questions.push({
			id: `mouth-${questions.length}`,
			symbol,
			play: symbol,
			section: sec,
			options: buildLetterOptions(symbol, pool)
		})
	}
	return questions
}

/** 关 3：同组辨认（干扰项来自同一发音部位） */
export function buildInitialGroupQuestions(count = INITIAL_GROUP_QUIZ_TOTAL) {
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 30) {
		guard++
		const sec = pickRandom(INITIAL_SECTIONS)
		if (!sec?.symbols?.length) continue
		const symbol = pickRandom(sec.symbols)
		if (!symbol || used.has(symbol)) continue
		used.add(symbol)
		questions.push({
			id: `group-${questions.length}`,
			symbol,
			play: symbol,
			section: sec,
			options: shuffle(
				sec.symbols.map((s) => ({
					symbol: s,
					correct: s === symbol
				}))
			)
		})
	}
	return questions
}
