import { applyToneToSyllableStem } from '@/utils/play-pinyin-local-audio.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import {
	TONE_LAB_SYLLABLE_POOL,
	EAR_QUIZ_TOTAL,
	MATCH_QUIZ_TOTAL,
	BODY_QUIZ_TOTAL,
	WORDS_QUIZ_TOTAL,
	TONE_BODY_GESTURES
} from './constants.js'
import { TONE_WORD_COMIC_SETS } from './words-data.js'

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

/**
 * @param {number} count
 * @param {string[]} [pool]
 */
export function buildEarQuizQuestions(count = EAR_QUIZ_TOTAL, pool = TONE_LAB_SYLLABLE_POOL) {
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 20) {
		guard++
		const raw = pickRandom(pool)
		if (!raw) break
		const bare = stripPinyinToneMarks(String(raw).trim().toLowerCase())
		if (!bare) continue
		const tone = 1 + Math.floor(Math.random() * 4)
		const key = `${bare}|${tone}`
		if (used.has(key)) continue
		used.add(key)
		const play = applyToneToSyllableStem(bare, tone)
		if (!play) continue
		questions.push({
			id: `ear-${questions.length}`,
			bare,
			tone,
			play
		})
	}
	return questions
}

/**
 * @param {number} count
 * @param {string[]} [pool]
 */
export function buildMatchQuizQuestions(count = MATCH_QUIZ_TOTAL, pool = TONE_LAB_SYLLABLE_POOL) {
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 20) {
		guard++
		const raw = pickRandom(pool)
		if (!raw) break
		const bare = stripPinyinToneMarks(String(raw).trim().toLowerCase())
		if (!bare) continue
		if (used.has(bare)) continue
		used.add(bare)
		const tone = 1 + Math.floor(Math.random() * 4)
		const correct = applyToneToSyllableStem(bare, tone)
		if (!correct) continue
		const options = [1, 2, 3, 4].map((t) => ({
			tone: t,
			display: applyToneToSyllableStem(bare, t),
			correct: t === tone
		}))
		questions.push({
			id: `match-${questions.length}`,
			bare,
			tone,
			correct,
			options: shuffle(options)
		})
	}
	return questions
}

/**
 * 关 2：听音选身体动作
 */
export function buildBodyQuizQuestions(count = BODY_QUIZ_TOTAL, pool = TONE_LAB_SYLLABLE_POOL) {
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 20) {
		guard++
		const raw = pickRandom(pool)
		if (!raw) break
		const bare = stripPinyinToneMarks(String(raw).trim().toLowerCase())
		if (!bare) continue
		const tone = 1 + Math.floor(Math.random() * 4)
		const key = `${bare}|${tone}`
		if (used.has(key)) continue
		used.add(key)
		const play = applyToneToSyllableStem(bare, tone)
		if (!play) continue
		const options = TONE_BODY_GESTURES.map((g) => ({
			tone: g.tone,
			emoji: g.emoji,
			gesture: g.gesture,
			correct: g.tone === tone
		}))
		questions.push({
			id: `body-${questions.length}`,
			bare,
			tone,
			play,
			options: shuffle(options)
		})
	}
	return questions
}

/**
 * 关 5：听音选对应汉字（同音节四声词语）
 */
export function buildWordsQuizQuestions(count = WORDS_QUIZ_TOTAL) {
	const sets = TONE_WORD_COMIC_SETS || []
	const questions = []
	let guard = 0
	while (questions.length < count && guard < count * 20) {
		guard++
		const set = pickRandom(sets)
		if (!set?.items?.length) break
		const item = pickRandom(set.items)
		if (!item) continue
		const play = applyToneToSyllableStem(set.bare, item.tone)
		if (!play) continue
		const options = set.items.map((it) => ({
			hanzi: it.hanzi,
			emoji: it.emoji,
			hint: it.hint,
			tone: it.tone,
			correct: it.tone === item.tone
		}))
		questions.push({
			id: `words-${questions.length}`,
			setId: set.id,
			bare: set.bare,
			tone: item.tone,
			play,
			correctHanzi: item.hanzi,
			options: shuffle(options)
		})
	}
	return questions
}
