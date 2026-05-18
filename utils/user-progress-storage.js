/**
 * 用户生字进度本地存储（uni.storage），字段与 curriculum-schema COL_PROGRESS 一致。
 */

import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { getUserCharProgressStorageKey } from '@/utils/learning-profile-storage.js'

function semesterNorm(s) {
	return s === '下' ? '下' : '上'
}

export function makeProgressKey(textbookVersionId, grade, semester, hanzi) {
	return `${textbookVersionId}|${grade}|${semesterNorm(semester)}|${hanzi}`
}

function readMap() {
	try {
		const raw = uni.getStorageSync(getUserCharProgressStorageKey())
		if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw }
	} catch (e) {
		console.warn('[user-progress-storage] readMap', e)
	}
	return {}
}

function writeMap(map) {
	try {
		uni.setStorageSync(getUserCharProgressStorageKey(), map)
	} catch (e) {
		console.warn('[user-progress-storage] writeMap', e)
	}
}

function baseRecord(prefs, hanzi) {
	const p = prefs || getCurriculumPrefs()
	const now = Date.now()
	return {
		[COL_PROGRESS.textbook_version_id]: p.textbook_version_id,
		[COL_PROGRESS.grade]: p.grade,
		[COL_PROGRESS.semester]: semesterNorm(p.semester),
		[COL_PROGRESS.hanzi]: hanzi,
		[COL_PROGRESS.learned]: 0,
		[COL_PROGRESS.mastered]: 0,
		[COL_PROGRESS.wrong_count]: 0,
		[COL_PROGRESS.updated_at_ms]: now
	}
}

/**
 * @param {object} patch 须含 hanzi；教材维度缺省时用当前 curriculum 偏好
 */
export function upsertUserCharProgress(patch) {
	const prefs = getCurriculumPrefs()
	const hanzi = typeof patch[COL_PROGRESS.hanzi] === 'string' ? patch[COL_PROGRESS.hanzi].trim() : ''
	if (!hanzi) return null

	const tv = patch[COL_PROGRESS.textbook_version_id] ?? prefs.textbook_version_id
	const grade = Number(patch[COL_PROGRESS.grade] ?? prefs.grade)
	const semester = semesterNorm(patch[COL_PROGRESS.semester] ?? prefs.semester)
	const key = makeProgressKey(tv, grade, semester, hanzi)
	const map = readMap()
	const prev = map[key] || baseRecord({ ...prefs, textbook_version_id: tv, grade, semester }, hanzi)
	const next = {
		...prev,
		...patch,
		[COL_PROGRESS.textbook_version_id]: tv,
		[COL_PROGRESS.grade]: grade,
		[COL_PROGRESS.semester]: semester,
		[COL_PROGRESS.hanzi]: hanzi,
		[COL_PROGRESS.learned]: Number(patch[COL_PROGRESS.learned] ?? prev[COL_PROGRESS.learned]) ? 1 : 0,
		[COL_PROGRESS.mastered]: Number(patch[COL_PROGRESS.mastered] ?? prev[COL_PROGRESS.mastered]) ? 1 : 0,
		[COL_PROGRESS.wrong_count]: Math.max(
			0,
			Number(patch[COL_PROGRESS.wrong_count] ?? prev[COL_PROGRESS.wrong_count]) || 0
		),
		[COL_PROGRESS.updated_at_ms]: Number(patch[COL_PROGRESS.updated_at_ms]) || Date.now()
	}
	map[key] = next
	writeMap(map)
	return next
}

/** 标记为已学过（进入「我学过的字库」） */
export function markCharLearned(hanzi, dims) {
	return upsertUserCharProgress({
		...dims,
		[COL_PROGRESS.hanzi]: hanzi,
		[COL_PROGRESS.learned]: 1
	})
}

/** 增加错误计数（笔顺/测验等调用） */
export function addCharWrongCount(hanzi, delta, dims) {
	const d = Math.max(1, Number(delta) || 1)
	const prefs = getCurriculumPrefs()
	const tv = dims?.[COL_PROGRESS.textbook_version_id] ?? prefs.textbook_version_id
	const grade = Number(dims?.[COL_PROGRESS.grade] ?? prefs.grade)
	const semester = semesterNorm(dims?.[COL_PROGRESS.semester] ?? prefs.semester)
	const key = makeProgressKey(tv, grade, semester, hanzi)
	const map = readMap()
	const prev = map[key] || baseRecord({ ...prefs, textbook_version_id: tv, grade, semester }, hanzi)
	const wrong = (Number(prev[COL_PROGRESS.wrong_count]) || 0) + d
	return upsertUserCharProgress({
		...dims,
		[COL_PROGRESS.hanzi]: hanzi,
		[COL_PROGRESS.wrong_count]: wrong
	})
}

export function getUserProgressMap() {
	return readMap()
}

export function listLearnedChars() {
	return Object.values(readMap())
		.filter((r) => Number(r[COL_PROGRESS.learned]) === 1)
		.sort((a, b) => (b[COL_PROGRESS.updated_at_ms] || 0) - (a[COL_PROGRESS.updated_at_ms] || 0))
}

/** wrong_count > 0，按错误次数降序 */
export function listWrongOftenChars() {
	return Object.values(readMap())
		.filter((r) => (Number(r[COL_PROGRESS.wrong_count]) || 0) > 0)
		.sort((a, b) => {
			const dw = (Number(b[COL_PROGRESS.wrong_count]) || 0) - (Number(a[COL_PROGRESS.wrong_count]) || 0)
			if (dw !== 0) return dw
			return (b[COL_PROGRESS.updated_at_ms] || 0) - (a[COL_PROGRESS.updated_at_ms] || 0)
		})
}

function recordMatchesCurriculumPrefs(rec, prefs) {
	const p = prefs || getCurriculumPrefs()
	const sem = semesterNorm(p.semester)
	return (
		String(rec[COL_PROGRESS.textbook_version_id] || '') === String(p.textbook_version_id || '') &&
		Number(rec[COL_PROGRESS.grade]) === Number(p.grade) &&
		semesterNorm(rec[COL_PROGRESS.semester]) === sem
	)
}

/** 当前教材维度下「已学」字数（与字卡星星口径一致） */
export function countLearnedCharsForCurriculumPrefs(prefs) {
	const p = prefs || getCurriculumPrefs()
	let n = 0
	for (const rec of Object.values(readMap())) {
		if (!recordMatchesCurriculumPrefs(rec, p)) continue
		if (Number(rec[COL_PROGRESS.learned]) === 1) n++
	}
	return n
}

/** 当前教材维度下有过错题记录的字数 */
export function countWrongTrackedCharsForCurriculumPrefs(prefs) {
	const p = prefs || getCurriculumPrefs()
	let n = 0
	for (const rec of Object.values(readMap())) {
		if (!recordMatchesCurriculumPrefs(rec, p)) continue
		if ((Number(rec[COL_PROGRESS.wrong_count]) || 0) > 0) n++
	}
	return n
}

/**
 * 当前教材维度下常错字列表（wrong_count > 0）
 * @param {object} [prefs] 缺省为 getCurriculumPrefs()
 * @param {number} [limit]
 */
export function listWrongOftenCharsForCurriculumPrefs(prefs, limit = 5) {
	const p = prefs || getCurriculumPrefs()
	const lim = Math.max(1, Math.min(50, Number(limit) || 5))
	return Object.values(readMap())
		.filter((r) => recordMatchesCurriculumPrefs(r, p) && (Number(r[COL_PROGRESS.wrong_count]) || 0) > 0)
		.sort((a, b) => {
			const dw = (Number(b[COL_PROGRESS.wrong_count]) || 0) - (Number(a[COL_PROGRESS.wrong_count]) || 0)
			if (dw !== 0) return dw
			return (b[COL_PROGRESS.updated_at_ms] || 0) - (a[COL_PROGRESS.updated_at_ms] || 0)
		})
		.slice(0, lim)
}
