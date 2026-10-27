/**
 * @file user-pinyin-wrong-storage.js
 * @module utils
 * @description 拼音小测错题计数（按教材维度 + 去调号 stem）
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { getUserPinyinWrongStorageKey } from '@/utils/learning-profile-storage.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'

function semesterNorm(s) {
	return s === '下' ? '下' : '上'
}

/**
 * 统一键：去调号、小写（ü 保留）
 * @param {string} symbol
 * @returns {string}
 */
export function normalizePinyinWrongKey(symbol) {
	return stripPinyinToneMarks(String(symbol || '').trim().toLowerCase())
}

export function makePinyinWrongMapKey(textbookVersionId, grade, semester, symbol) {
	const bare = normalizePinyinWrongKey(symbol)
	const g = Number(grade)
	const gg = Number.isFinite(g) && g >= 0 ? Math.floor(g) : 1
	return `${textbookVersionId}|${gg}|${semesterNorm(semester)}|${bare}`
}

function readMap() {
	try {
		const raw = uni.getStorageSync(getUserPinyinWrongStorageKey())
		if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw }
	} catch (e) {
		console.warn('[user-pinyin-wrong-storage] readMap', e)
	}
	return {}
}

function writeMap(map) {
	try {
		uni.setStorageSync(getUserPinyinWrongStorageKey(), map)
	} catch (e) {
		console.warn('[user-pinyin-wrong-storage] writeMap', e)
	}
}

/**
 * @param {string} symbol 展示形或原形均可
 * @param {number} [delta]
 * @param {object} [dims] textbook_version_id / grade / semester
 */
export function addPinyinWrongCount(symbol, delta, dims) {
	const bare = normalizePinyinWrongKey(symbol)
	if (!bare) return null
	const d = Math.max(1, Math.floor(Number(delta) || 1))
	const prefs = getCurriculumPrefs()
	const tv = dims?.textbook_version_id ?? prefs.textbook_version_id
	const grade = Number(dims?.grade ?? prefs.grade)
	const semester = semesterNorm(dims?.semester ?? prefs.semester)
	const g = Number.isFinite(grade) && grade >= 0 ? Math.floor(grade) : 1
	const key = makePinyinWrongMapKey(tv, g, semester, bare)
	const map = readMap()
	const prev = map[key] || {}
	const wrong = (Number(prev.wrong_count) || 0) + d
	const next = {
		textbook_version_id: tv,
		grade: g,
		semester,
		symbol: bare,
		wrong_count: wrong,
		last_display: String(symbol || '').trim() || bare,
		updated_at_ms: Date.now()
	}
	map[key] = next
	writeMap(map)
	return next
}

/**
 * 当前教材维度下：bare → wrong_count
 * @param {object} [dims]
 * @returns {Record<string, number>}
 */
export function getPinyinWrongWeightMap(dims) {
	const prefs = getCurriculumPrefs()
	const tv = String((dims?.textbook_version_id ?? prefs.textbook_version_id) || '')
	const grade = Number(dims?.grade ?? prefs.grade)
	const g = Number.isFinite(grade) && grade >= 0 ? Math.floor(grade) : 1
	const sem = semesterNorm(dims?.semester ?? prefs.semester)
	const out = Object.create(null)
	for (const rec of Object.values(readMap())) {
		if (!rec || typeof rec !== 'object') continue
		if (String(rec.textbook_version_id || '') !== tv) continue
		if (Number(rec.grade) !== g) continue
		if (semesterNorm(rec.semester) !== sem) continue
		const bare = normalizePinyinWrongKey(rec.symbol)
		if (!bare) continue
		const n = Number(rec.wrong_count) || 0
		if (n <= 0) continue
		out[bare] = Math.max(out[bare] || 0, n)
	}
	return out
}
