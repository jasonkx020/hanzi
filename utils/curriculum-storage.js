/**
 * @file curriculum-storage.js
 * @module utils
 * @description 基础设施工具：curriculum-storage.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 本地 curriculum 偏好存储（uni.storage）
 * 字段名与 constants/curriculum-schema.js、生字 seed 字段对齐。
 */

import {
	STORAGE_KEYS,
	DEFAULT_CURRICULUM_PREFS,
	LIST_TYPE_PREFERENCE,
	TEXTBOOK_VERSION_IDS,
	SEMESTER,
	COL
} from '@/constants/curriculum-schema.js'
import { invalidateRenjiaoTextbookCache } from '@/utils/renjiao-textbook-loader.js'
import { invalidateCurriculumDbCache } from '@/utils/curriculum-db.js'

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
	invalidateRenjiaoTextbookCache()
	invalidateCurriculumDbCache()
	return next
}

/** 年级中文数字（1–6） */
const GRADE_CN = ['一', '二', '三', '四', '五', '六']

const PRESCHOOL_OPTION = {
	label: '幼小衔接（课标300基本字）',
	grade: 0,
	semester: SEMESTER.UP
}

/** 展示用教材版本简称 */
export function formatTextbookVersionLabel(versionId) {
	const id = String(versionId || '')
	if (id === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) return '幼小衔接·课标300'
	if (id === TEXTBOOK_VERSION_IDS.TONGBIAN_RJ) return '统编（人教版）'
	return id || '—'
}

/**
 * 教材设置：年级册别下拉项
 * @param {string} [textbookVersionId] 不传则返回统编全套（幼升小 + 一至六上下册）
 */
export function listGradeSemesterPickerOptions(textbookVersionId) {
	if (textbookVersionId === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) {
		return [{ ...PRESCHOOL_OPTION }]
	}
	const out = [{ ...PRESCHOOL_OPTION }]
	for (let g = 1; g <= 6; g++) {
		const cn = GRADE_CN[g - 1]
		if (!cn) continue
		out.push({ label: `${cn}年级上册`, grade: g, semester: SEMESTER.UP })
		out.push({ label: `${cn}年级下册`, grade: g, semester: SEMESTER.DOWN })
	}
	return out
}

/**
 * 首页横向年级芯片：幼升小 + 一至六上下册（短标签「一上」「六下」）
 */
export function listHomeCurriculumTabs() {
	const tabs = [
		{
			key: 'preschool',
			label: '幼升小',
			grade: 0,
			semester: SEMESTER.UP,
			textbook_version_id: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300
		}
	]
	for (let g = 1; g <= 6; g++) {
		const cn = GRADE_CN[g - 1]
		if (!cn) continue
		tabs.push({
			key: `${g}-shang`,
			label: `${cn}上`,
			grade: g,
			semester: SEMESTER.UP,
			textbook_version_id: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
		})
		tabs.push({
			key: `${g}-xia`,
			label: `${cn}下`,
			grade: g,
			semester: SEMESTER.DOWN,
			textbook_version_id: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
		})
	}
	return tabs
}

/**
 * 在 picker 选项中定位 grade + semester；无匹配时回退到首项或同年级任册
 * @param {Array<{ grade: number, semester: string }>} options
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

/** 展示用摘要文案（面向家长，不含内部字段名） */
export function formatCurriculumSummary(prefs) {
	const p = prefs || getCurriculumPrefs()
	return `${formatTextbookVersionLabel(p.textbook_version_id)} · ${formatGradeSemesterLabel(p)} · ${formatListTypePreferenceLabel(p.list_type_preference)}`
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
