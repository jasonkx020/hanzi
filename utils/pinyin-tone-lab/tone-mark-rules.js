import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import {
	applyToneToSyllableStem,
	getToneMarkVowelPosition
} from '@/utils/play-pinyin-local-audio.js'
import { MARK_QUIZ_TOTAL } from './constants.js'

/** 儿童版标调口诀 */
export const TONE_MARK_RULE_CARDS = [
	{
		key: 'aoe',
		emoji: '🅰️',
		title: 'a o e 排队',
		desc: '有 a 标 a，没 a 找 o，再没有就标 e'
	},
	{
		key: 'iuui',
		emoji: '🔀',
		title: 'iu 和 ui 特殊',
		desc: 'iu 标在 u 上；ui 标在 i 上'
	},
	{
		key: 'final',
		emoji: '🎯',
		title: '标在韵母上',
		desc: '调号标在韵母字母上，不标在声母 b d m 上'
	}
]

export const TONE_MARK_RULE_HINTS = {
	a: '有 a 就标在 a 上',
	o: '没有 a，标在 o 上',
	e: '没有 a、o，标在 e 上',
	iu: 'iu 在一起，标在后面的 u',
	ui: 'ui 在一起，标在后面的 i',
	last: '标在这个韵母字母上'
}

/** 覆盖 a/o/e、iu、ui、单韵母、jqx+ü */
export const TONE_MARK_QUIZ_SYLLABLES = [
	'ma',
	'hao',
	'mo',
	'mei',
	'lei',
	'liu',
	'niu',
	'dui',
	'hui',
	'ni',
	'lu',
	'mi',
	'ju',
	'qu',
	'xu',
	'xue',
	'jun',
	'lü'
]

const VOWEL_OPTIONS = ['a', 'o', 'e', 'i', 'u', 'ü']

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function pickRandom(arr) {
	const a = arr || []
	if (!a.length) return null
	return a[Math.floor(Math.random() * a.length)]
}

function lettersInSyllable(bare) {
	const s = stripPinyinToneMarks(String(bare || '').toLowerCase()).replace(/v/g, 'ü')
	const set = new Set()
	for (const ch of s) {
		if ('aoeiuü'.includes(ch)) set.add(ch)
	}
	return [...set]
}

function buildOptionsForQuestion(bare, correctLetter) {
	const inSyl = lettersInSyllable(bare)
	const opts = new Set([correctLetter])
	for (const ch of inSyl) {
		if (opts.size >= 4) break
		opts.add(ch)
	}
	for (const ch of VOWEL_OPTIONS) {
		if (opts.size >= 4) break
		opts.add(ch)
	}
	const list = [...opts].slice(0, 4)
	if (!list.includes(correctLetter)) list[0] = correctLetter
	return shuffle(
		list.map((letter) => ({
			letter,
			correct: letter === correctLetter
		}))
	)
}

/**
 * @param {number} count
 */
export function buildMarkQuizQuestions(count = MARK_QUIZ_TOTAL) {
	const pool = TONE_MARK_QUIZ_SYLLABLES
	const questions = []
	const used = new Set()
	let guard = 0
	while (questions.length < count && guard < count * 24) {
		guard++
		const raw = pickRandom(pool)
		if (!raw) break
		const bare = stripPinyinToneMarks(String(raw).trim().toLowerCase()).replace(/v/g, 'ü')
		if (!bare || used.has(bare)) continue
		const pos = getToneMarkVowelPosition(bare)
		if (!pos) continue
		used.add(bare)
		const tone = 1 + Math.floor(Math.random() * 4)
		const play = applyToneToSyllableStem(bare, tone)
		if (!play) continue
		const correctLetter = pos.displayLetter
		questions.push({
			id: `mark-${questions.length}`,
			bare,
			tone,
			play,
			correctLetter,
			ruleKey: pos.ruleKey,
			ruleHint: TONE_MARK_RULE_HINTS[pos.ruleKey] || TONE_MARK_RULE_HINTS.last,
			markIndex: pos.index,
			options: buildOptionsForQuestion(bare, correctLetter)
		})
	}
	return questions
}
