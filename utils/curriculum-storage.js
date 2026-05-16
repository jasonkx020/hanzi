/**
 * 本地 curriculum 偏好存储（uni.storage）
 * 字段名与 constants/curriculum-schema.js、生字 seed 字段对齐。
 */

import {
	STORAGE_KEYS,
	DEFAULT_CURRICULUM_PREFS,
	LIST_TYPE_PREFERENCE,
	COL
} from '@/constants/curriculum-schema.js'

function normalizePrefs(raw) {
	const d = DEFAULT_CURRICULUM_PREFS
	const g = Number(raw.grade)
	const base = {
		textbook_version_id:
			typeof raw.textbook_version_id === 'string'
				? raw.textbook_version_id
				: d.textbook_version_id,
		grade: Number.isFinite(g) && g >= 0 && g <= 6 ? g : d.grade,
		semester: raw.semester === '下' ? '下' : '上',
		list_type_preference:
			typeof raw.list_type_preference === 'string'
				? raw.list_type_preference
				: d.list_type_preference
	}
	return base
}

/** 用户是否在设置/首页/课本中保存过教材偏好（无则写字练习等走全表识字） */
export function hasUserCurriculumPrefsSaved() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEYS.CURRICULUM_PREFS)
		return !!(raw && typeof raw === 'object')
	} catch (_) {
		return false
	}
}

/** 读取完整偏好对象 */
export function getCurriculumPrefs() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEYS.CURRICULUM_PREFS)
		if (raw && typeof raw === 'object') return normalizePrefs({ ...DEFAULT_CURRICULUM_PREFS, ...raw })
	} catch (e) {
		console.warn('[curriculum-storage] getCurriculumPrefs', e)
	}
	return { ...DEFAULT_CURRICULUM_PREFS }
}

/** 合并写入偏好 */
export function setCurriculumPrefs(patch) {
	const next = normalizePrefs({ ...getCurriculumPrefs(), ...patch })
	try {
		uni.setStorageSync(STORAGE_KEYS.CURRICULUM_PREFS, next)
	} catch (e) {
		console.warn('[curriculum-storage] setCurriculumPrefs', e)
	}
	return next
}

/** 年级中文数字（1–6） */
const GRADE_CN = ['一', '二', '三', '四', '五', '六']

/** 教材设置等：幼小衔接 … 六年级下册 */
export function listGradeSemesterPickerOptions() {
	const out = [{ label: '幼小衔接（课标300基本字）', grade: 0, semester: '上' }]
	for (let g = 1; g <= 6; g++) {
		out.push({ label: `${GRADE_CN[g]}年级上册`, grade: g, semester: '上' })
		out.push({ label: `${GRADE_CN[g]}年级下册`, grade: g, semester: '下' })
	}
	return out
}

/**
 * 展示用「一年级上册」「二年级下册」等（仅 grade + semester，不含版本）
 * @param {{ grade?: number|string, semester?: string }} prefs 若省略则从本地偏好读取
 */
export function formatGradeSemesterLabel(prefs) {
	const p = prefs || getCurriculumPrefs()
	const g = Number(p.grade)
	if (g === 0) return '幼小衔接（课标300基本字）'
	let gradePart
	if (Number.isFinite(g) && g >= 1 && g <= 6) gradePart = `${GRADE_CN[g - 1]}年级`
	else gradePart = `${p.grade ?? ''}年级`
	const semPart = p.semester === '下' || p.semester === '下册' ? '下册' : '上册'
	return `${gradePart}${semPart}`
}

/** 展示用摘要文案 */
export function formatCurriculumSummary(prefs) {
	const p = prefs || getCurriculumPrefs()
	const lt =
		p.list_type_preference === LIST_TYPE_PREFERENCE.ALL
			? '全部字表'
			: p.list_type_preference
	return `${p.textbook_version_id} · ${formatGradeSemesterLabel(p)} · ${lt}`
}

/**
 * 生成与 hanzi_curriculum 筛选条件对应的片段（便于调试展示）
 * 返回 { whereSql, params }
 */
export function buildCurriculumWhere(prefs) {
	const p = prefs || getCurriculumPrefs()
	const params = [p.textbook_version_id, p.grade, p.semester]
	let whereSql = `${COL.textbook_version_id} = ? AND ${COL.grade} = ? AND ${COL.semester} = ?`
	if (p.list_type_preference && p.list_type_preference !== LIST_TYPE_PREFERENCE.ALL) {
		whereSql += ` AND ${COL.list_type} = ?`
		params.push(p.list_type_preference)
	}
	return { whereSql, params }
}

/** 排序（与 sort_order 一致） */
export function orderBySortOrderAsc() {
	return `ORDER BY ${COL.sort_order} ASC, ${COL.id} ASC`
}
