/**
 * 拼读练习 / 闯关：从当前教材识字表抽取有效拼音音节（无声调、可播放）。
 */

import { TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
import { queryAllShiziCurriculumChars, queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { applyToneToSyllableStem } from '@/utils/play-pinyin-local-audio.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import {
	buildLessonCharRowsFromRenjiaoItem,
	filterRenjiaoTextbookSyncLessons,
	loadRenjiaoTextbookTexts
} from '@/utils/renjiao-textbook-loader.js'
import { getDrillPool } from '@/data/pinyin-drill-pools.js'

/** 与拼音页原硬编码一致，识字表不足时兜底 */
export const FALLBACK_BLEND_SYLLABLES = [
	'ba',
	'bo',
	'ma',
	'de',
	'du',
	'ge',
	'hua',
	'xue',
	'qiu',
	'zhan',
	'cheng',
	'shi'
]

const SYLLABLE_RE = /^[a-zü]{1,6}$/
const HAS_VOWEL_RE = /[aeiouü]/

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizePracticeSyllable(raw) {
	let s = stripPinyinToneMarks(raw)
	s = s.replace(/u:/g, 'ü').replace(/v/g, 'ü')
	s = s.replace(/[^a-zü]/g, '')
	return s
}

/** 保留教材中的声调，用于四线格展示 */
export function formatPracticeDisplayPinyin(raw) {
	let s = String(raw || '')
		.trim()
		.replace(/[()（）]/g, '')
	s = s.replace(/u:/g, 'ü').replace(/v/g, 'ü')
	return s
}

function displayForBareSyllable(bare) {
	const toned = applyToneToSyllableStem(bare, 1)
	return toned || bare
}

/**
 * @param {string} syllable 已 normalize
 */
export function isValidPracticeSyllable(syllable) {
	if (!syllable || syllable.length > 6) return false
	if (!SYLLABLE_RE.test(syllable)) return false
	if (!HAS_VOWEL_RE.test(syllable)) return false
	return true
}

/**
 * @param {Array<{ hanzi?: string, pinyin?: string|null }>} rows
 * @returns {Array<{ syllable: string, display: string, hanzi: string }>}
 */
export function extractPracticeSyllablesFromRows(rows) {
	const seen = new Set()
	const out = []
	for (const row of rows || []) {
		const hanzi = String(row.hanzi || '').trim()
		const rawPy = row.pinyin
		if (rawPy == null || rawPy === '') continue
		const tokens = splitPinyinDisplayTokens(String(rawPy))
		for (const token of tokens) {
			const syllable = normalizePracticeSyllable(token)
			if (!isValidPracticeSyllable(syllable)) continue
			if (seen.has(syllable)) continue
			seen.add(syllable)
			const displayRaw = formatPracticeDisplayPinyin(token)
			const displayBare = normalizePracticeSyllable(displayRaw)
			const hasToneInSource =
				displayRaw !== displayBare && displayBare === syllable
			const display = hasToneInSource
				? displayRaw
				: displayForBareSyllable(syllable)
			out.push({ syllable, display, hanzi: hanzi.charAt(0) || hanzi })
		}
	}
	return out
}

function shuffleInPlace(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

/**
 * @param {import('@/utils/curriculum-storage.js').CurriculumPrefs} prefs
 */
async function loadRenjiaoCharRows(prefs) {
	const texts = await loadRenjiaoTextbookTexts({
		grade: prefs.grade,
		semester: prefs.semester
	})
	const lessons = filterRenjiaoTextbookSyncLessons(texts)
	const out = []
	for (const item of lessons) {
		for (const r of buildLessonCharRowsFromRenjiaoItem(item)) {
			out.push({
				hanzi: r.hanzi,
				pinyin: r.pinyin || null
			})
		}
	}
	return out
}

function mergeCharRows(primary, extra) {
	const seen = new Set()
	const out = []
	const push = (row) => {
		const h = String(row?.hanzi || '').trim()
		if (!h || seen.has(h)) return
		seen.add(h)
		out.push(row)
	}
	for (const r of primary || []) push(r)
	for (const r of extra || []) push(r)
	return out
}

/**
 * @param {import('@/utils/curriculum-storage.js').CurriculumPrefs} [prefs]
 */
export async function loadCurriculumCharRowsForPinyin(prefs) {
	const p = prefs || getCurriculumPrefs()
	let rows = await queryCurriculumChars(p)
	if (p.textbook_version_id === TEXTBOOK_VERSION_IDS.TONGBIAN_RJ) {
		try {
			const rj = await loadRenjiaoCharRows(p)
			rows = mergeCharRows(rows, rj)
		} catch (e) {
			console.warn('[pinyin-practice-pool] renjiao rows', e)
		}
	}
	if (rows.length < 12) {
		try {
			const all = await queryAllShiziCurriculumChars()
			rows = mergeCharRows(rows, all)
		} catch (e) {
			console.warn('[pinyin-practice-pool] all shizi', e)
		}
	}
	return rows
}

/**
 * 从识字表构建去重音节池
 * @param {{ prefs?: object, minPool?: number }} [options]
 * @returns {Promise<Array<{ syllable: string, hanzi: string }>>}
 */
export async function buildPinyinPracticeSyllablePool(options = {}) {
	const prefs = options.prefs || getCurriculumPrefs()
	const minPool = Number(options.minPool) > 0 ? Number(options.minPool) : 12
	const rows = await loadCurriculumCharRowsForPinyin(prefs)
	let entries = extractPracticeSyllablesFromRows(rows)
	if (entries.length < minPool) {
		const seen = new Set(entries.map((e) => e.syllable))
		for (const s of FALLBACK_BLEND_SYLLABLES) {
			if (seen.has(s)) continue
			seen.add(s)
			entries.push({ syllable: s, display: displayForBareSyllable(s), hanzi: '' })
		}
	}
	return entries
}

/**
 * 随机抽取若干带声调拼音（供四线格展示与播放）
 * @param {number} [count]
 * @param {{ prefs?: object }} [options]
 * @returns {Promise<string[]>}
 */
export async function pickRandomPinyinPracticeSyllables(count = 12, options = {}) {
	const n = Math.max(1, Math.min(48, Number(count) || 12))
	const pool = await buildPinyinPracticeSyllablePool(options)
	if (!pool.length) {
		return FALLBACK_BLEND_SYLLABLES.slice(0, n).map((s) => displayForBareSyllable(s))
	}
	const shuffled = shuffleInPlace([...pool])
	const picked = shuffled.slice(0, Math.min(n, shuffled.length))
	return picked.map((e) => e.display || displayForBareSyllable(e.syllable))
}

/**
 * 拼读练习来源说明（展示在 Tab 内）
 * @param {{ prefs?: object }} [options]
 */
export async function describePinyinPracticeSource(options = {}) {
	const prefs = options.prefs || getCurriculumPrefs()
	const rows = await loadCurriculumCharRowsForPinyin(prefs)
	const entries = extractPracticeSyllablesFromRows(rows)
	const gradeLabel =
		prefs.grade === 0 ? '幼小衔接' : prefs.grade ? `${prefs.grade}年级${prefs.semester || ''}` : '当前教材'
	if (entries.length >= 8) {
		return `随机来自${gradeLabel}识字表（带声调，每行 1 个音节，共 ${entries.length} 个可选）`
	}
	return '随机拼音练习（带声调，教材字库较少时已补充常用音节）'
}

/**
 * 闯关用题库：拼读类优先识字表
 * @param {string} categoryKey initial | vowel | whole | blend | mix
 */
export async function getDrillPoolFromCurriculum(categoryKey) {
	const key = String(categoryKey || 'mix')
	if (key === 'blend') {
		const fromBook = await pickRandomPinyinPracticeSyllables(32)
		return fromBook.length >= 3 ? fromBook : getDrillPool('blend')
	}
	if (key === 'mix') {
		const staticMix = getDrillPool('mix')
		const fromBook = await pickRandomPinyinPracticeSyllables(16)
		return [...new Set([...fromBook, ...staticMix])]
	}
	return getDrillPool(key)
}
