/**
 * 课级学习进度（与字级 USER_CHAR_PROGRESS 分离，见 docs 课次字卡-学习进度与小测设计 §1.4）
 */

import { STORAGE_KEYS } from '@/constants/curriculum-schema.js'

function semesterNorm(s) {
	return s === '下' ? '下' : '上'
}

/**
 * @param {number|null|undefined} rjLessonIdx 人教课次下标
 * @param {string} lessonTitleOrHint 人教为课标题；非人教为 lesson_hint 文案
 * @returns {string} 如 rj:12、hint:识字1
 */
export function buildStoredLessonKey(rjLessonIdx, lessonTitleOrHint) {
	const n = Number(rjLessonIdx)
	if (rjLessonIdx != null && rjLessonIdx !== '' && Number.isFinite(n) && n >= 0) {
		return `rj:${Math.floor(n)}`
	}
	const h = String(lessonTitleOrHint || '')
		.trim()
		.replace(/\|/g, '·')
	return `hint:${h || '_'}`
}

export function makeLessonMapKey(textbookVersionId, grade, semester, lessonKey) {
	const g = Number(grade)
	const gg = Number.isFinite(g) && g >= 0 ? Math.floor(g) : 1
	return `${textbookVersionId}|${gg}|${semesterNorm(semester)}|${lessonKey}`
}

function readMap() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEYS.USER_LESSON_PROGRESS)
		if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw }
	} catch (e) {
		console.warn('[user-lesson-progress-storage] readMap', e)
	}
	return {}
}

function writeMap(map) {
	try {
		uni.setStorageSync(STORAGE_KEYS.USER_LESSON_PROGRESS, map)
	} catch (e) {
		console.warn('[user-lesson-progress-storage] writeMap', e)
	}
}

/**
 * @param {object} dims textbook_version_id, grade, semester
 * @param {string} lessonKey buildStoredLessonKey 返回值
 */
export function getLessonProgressRecord(dims, lessonKey) {
	const tv = dims.textbook_version_id
	const g = Number(dims.grade)
	const sem = semesterNorm(dims.semester)
	const key = makeLessonMapKey(tv, g, sem, lessonKey)
	return readMap()[key] || null
}

export function hasLessonQuizPassed(dims, lessonKey) {
	const rec = getLessonProgressRecord(dims, lessonKey)
	return !!(rec && Number(rec.quiz_passed_at_ms) > 0)
}

/**
 * 小测一轮结束回写（不修改字级 learned / mastered）
 * @param {object} p
 * @param {string} p.lesson_key
 * @param {string} p.textbook_version_id
 * @param {number} p.grade
 * @param {string} p.semester
 * @param {number} p.score
 * @param {number} p.totalQ
 * @param {boolean} p.passed 是否达到通关线（与产品一致：≥ ceil(0.8 * totalQ) 对）
 */
export function recordLessonQuizAttempt(p) {
	const lessonKey = String(p.lesson_key || '').trim()
	if (!lessonKey) return null

	const tv = p.textbook_version_id
	const grade = Number(p.grade)
	const semester = semesterNorm(p.semester)
	const g = Number.isFinite(grade) && grade >= 0 ? Math.floor(grade) : 1

	const score = Math.max(0, Math.floor(Number(p.score) || 0))
	const totalQ = Math.max(0, Math.floor(Number(p.totalQ) || 0))
	const passed = !!p.passed
	const now = Date.now()

	const key = makeLessonMapKey(tv, g, semester, lessonKey)
	const map = readMap()
	const prev = map[key] || {}

	const newRatio = totalQ > 0 ? score / totalQ : 0
	const prevRatio =
		Number(prev.quiz_best_total) > 0 ? Number(prev.quiz_best_score) / Number(prev.quiz_best_total) : -1

	let bestScore = Number(prev.quiz_best_score) || 0
	let bestTotal = Number(prev.quiz_best_total) || 0
	if (totalQ > 0 && newRatio > prevRatio) {
		bestScore = score
		bestTotal = totalQ
	}

	const prevPassAt = Number(prev.quiz_passed_at_ms) || 0
	const next = {
		...prev,
		textbook_version_id: tv,
		grade: g,
		semester,
		lesson_key: lessonKey,
		quiz_last_at_ms: now,
		quiz_last_score: score,
		quiz_last_total: totalQ,
		quiz_best_score: bestScore,
		quiz_best_total: bestTotal,
		quiz_passed_at_ms: passed ? now : prevPassAt
	}
	map[key] = next
	writeMap(map)
	return next
}

/**
 * 列出当前教材（版本 + 年级 + 学期）下的课级进度记录
 * @param {object} dims 须含 textbook_version_id、grade、semester
 * @returns {Array<object>}
 */
export function listLessonProgressForCurriculum(dims) {
	const tv = String(dims?.textbook_version_id || '')
	const g = Number(dims?.grade)
	const gg = Number.isFinite(g) && g >= 0 ? Math.floor(g) : 1
	const sem = semesterNorm(dims?.semester)
	const map = readMap()
	const out = []
	for (const [key, rec] of Object.entries(map)) {
		if (!rec || typeof rec !== 'object') continue
		const parts = key.split('|')
		if (parts.length < 4) continue
		if (parts[0] !== tv) continue
		if (Number(parts[1]) !== gg) continue
		if (semesterNorm(parts[2]) !== sem) continue
		out.push({ ...rec })
	}
	return out
}
