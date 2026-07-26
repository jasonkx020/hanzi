/**
 * 本地 curriculum 偏好存储（uni.storage）
 * 字段名与 constants/curriculum-schema.js、生字 seed 字段对齐。
 * 对外固定「萌萌常用字」字池，不再提供年级/教材切换。
 */

import {
	STORAGE_KEYS,
	DEFAULT_CURRICULUM_PREFS,
	LIST_TYPE_PREFERENCE,
	TEXTBOOK_VERSION_IDS,
	SEMESTER,
	COL
} from '@/constants/curriculum-schema.js'

/** 唯一对外开放的字池偏好 */
export const LOCKED_PRESCHOOL_PREFS = {
	textbook_version_id: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300,
	grade: 0,
	semester: SEMESTER.UP,
	list_type_preference: LIST_TYPE_PREFERENCE.ALL
}

function normalizePrefs(raw) {
	const d = DEFAULT_CURRICULUM_PREFS
	const base = {
		textbook_version_id: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300,
		grade: 0,
		semester: SEMESTER.UP,
		list_type_preference:
			typeof raw.list_type_preference === 'string'
				? raw.list_type_preference
				: d.list_type_preference
	}
	return base
}

/** 用户是否在设置/首页中保存过识字偏好 */
export function hasUserCurriculumPrefsSaved() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEYS.CURRICULUM_PREFS)
		return !!(raw && typeof raw === 'object')
	} catch (_) {
		return false
	}
}

/** 读取完整偏好对象（始终锁定为萌萌常用字） */
export function getCurriculumPrefs() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEYS.CURRICULUM_PREFS)
		if (raw && typeof raw === 'object') {
			return normalizePrefs({ ...DEFAULT_CURRICULUM_PREFS, ...raw })
		}
	} catch (e) {
		console.warn('[curriculum-storage] getCurriculumPrefs', e)
	}
	return { ...DEFAULT_CURRICULUM_PREFS }
}

/**
 * 合并写入偏好（年级/版本字段会被强制改回学前字池）
 */
export function setCurriculumPrefs(patch) {
	const merged = { ...getCurriculumPrefs(), ...patch, ...LOCKED_PRESCHOOL_PREFS }
	if (patch && typeof patch.list_type_preference === 'string') {
		merged.list_type_preference = patch.list_type_preference
	}
	const next = normalizePrefs(merged)
	try {
		uni.setStorageSync(STORAGE_KEYS.CURRICULUM_PREFS, next)
	} catch (e) {
		console.warn('[curriculum-storage] setCurriculumPrefs', e)
	}
	return next
}

/** 确保本地已写入学前字池偏好（首次进入萌萌识字时调用） */
export function ensurePreschoolCurriculumPrefs() {
	const cur = getCurriculumPrefs()
	if (
		cur.textbook_version_id === LOCKED_PRESCHOOL_PREFS.textbook_version_id &&
		Number(cur.grade) === LOCKED_PRESCHOOL_PREFS.grade &&
		cur.semester === LOCKED_PRESCHOOL_PREFS.semester &&
		cur.list_type_preference === LOCKED_PRESCHOOL_PREFS.list_type_preference &&
		hasUserCurriculumPrefsSaved()
	) {
		return cur
	}
	return setCurriculumPrefs({ ...LOCKED_PRESCHOOL_PREFS })
}

/** 年级中文数字（1–6，兼容旧数据展示） */
const GRADE_CN = ['一', '二', '三', '四', '五', '六']

const PRESCHOOL_OPTION = {
	label: '萌萌常用字',
	grade: 0,
	semester: SEMESTER.UP
}

/** 展示用版本简称（用户可见） */
export function formatTextbookVersionLabel(versionId) {
	const id = String(versionId || '')
	if (id === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) return '萌萌常用字'
	if (id === TEXTBOOK_VERSION_IDS.TONGBIAN_RJ) return '萌萌识字'
	return '萌萌常用字'
}

/**
 * 识字进度：年级册别选项（仅萌萌常用字一项）
 */
export function listGradeSemesterPickerOptions(_textbookVersionId) {
	return [{ ...PRESCHOOL_OPTION }]
}

/**
 * 首页横向芯片（仅萌萌常用字；UI 已隐藏，保留 API 兼容）
 */
export function listHomeCurriculumTabs() {
	return [
		{
			key: 'preschool',
			label: '萌萌常用字',
			grade: 0,
			semester: SEMESTER.UP,
			textbook_version_id: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300
		}
	]
}

/**
 * 在 picker 选项中定位 grade + semester
 */
export function indexOfGradeSemesterOption(options, grade, semester) {
	const list = Array.isArray(options) ? options : []
	if (!list.length) return 0
	const g = Number(grade)
	const sem = semester === SEMESTER.DOWN || semester === '下' ? SEMESTER.DOWN : SEMESTER.UP
	let i = list.findIndex((o) => Number(o.grade) === g && o.semester === sem)
	if (i >= 0) return i
	i = list.findIndex((o) => Number(o.grade) === g)
	if (i >= 0) return i
	return 0
}

/** 字表偏好展示文案 */
export function formatListTypePreferenceLabel(pref) {
	if (!pref || pref === LIST_TYPE_PREFERENCE.ALL) return '全部字表'
	return String(pref)
}

/**
 * 展示用字池标签（用户可见，去教材化）
 */
export function formatGradeSemesterLabel(prefs) {
	const p = prefs || getCurriculumPrefs()
	const g = Number(p.grade)
	if (g === 0 || p.textbook_version_id === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) {
		return '萌萌常用字'
	}
	let gradePart
	if (Number.isFinite(g) && g >= 1 && g <= 6) gradePart = `${GRADE_CN[g - 1]}年级`
	else gradePart = `${p.grade ?? ''}年级`
	const semPart = p.semester === '下' || p.semester === '下册' ? '下册' : '上册'
	return `${gradePart}${semPart}`
}

/** 展示用摘要文案（面向家长，不含内部字段名） */
export function formatCurriculumSummary(prefs) {
	const p = prefs || getCurriculumPrefs()
	return `萌萌识字 · ${formatGradeSemesterLabel(p)} · ${formatListTypePreferenceLabel(p.list_type_preference)}`
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
