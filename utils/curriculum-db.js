/**
 * @file curriculum-db.js
 * @module utils
 * @description 基础设施工具：curriculum-db.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 教材生字：统编等版本来自打包内嵌 constants/hanzi_curriculum_seed.json（npm run db:build 生成）；
 * 「幼小衔接·课标300基本字」来自 static/booktext/renjiaoban/preschool-bridge.json，不在 seed 中重复。
 */

import CURRICULUM_ROWS from '@/constants/hanzi_curriculum_seed.json'
import YOU_XIAO_XIANJIE_LESSONS from '../static/booktext/renjiaoban/preschool-bridge.json'
import {
	COL,
	LIST_TYPE,
	LIST_TYPE_PREFERENCE,
	TEXTBOOK_VERSION_IDS
} from '@/constants/curriculum-schema.js'
import { buildCurriculumWhere, getCurriculumPrefs, orderBySortOrderAsc } from '@/utils/curriculum-storage.js'

const rows = Array.isArray(CURRICULUM_ROWS) ? CURRICULUM_ROWS : []

const MOE_SOURCE_URL =
	'http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html'

/**
 * 将幼小衔接课文 JSON 展平为与 hanzi_curriculum_seed 同结构的生字行（仅 MOE 版本 grade=0 使用）
 */
function buildMoeBasicCurriculumRowsFromYouxiaoxianjieBook() {
	const tv = TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300
	const listType = LIST_TYPE.JIBENZIBIAO
	const lessons = Array.isArray(YOU_XIAO_XIANJIE_LESSONS) ? YOU_XIAO_XIANJIE_LESSONS : []
	const out = []
	let sortOrder = 0
	for (const L of lessons) {
		const lit = Array.isArray(L.literacy_chars) ? L.literacy_chars : []
		const hint =
			(typeof L.title === 'string' && L.title.trim()) || `课次 ${L.catalogLessonNo ?? ''}`
		for (const cell of lit) {
			const hanzi = typeof cell?.hanzi === 'string' ? cell.hanzi.trim() : ''
			if (!hanzi) continue
			sortOrder += 1
			out.push({
				id: sortOrder,
				textbook_version_id: tv,
				grade: 0,
				semester: '上',
				list_type: listType,
				hanzi,
				pinyin: cell?.pinyin ?? null,
				sort_order: sortOrder,
				lesson_hint: hint,
				source_url: MOE_SOURCE_URL
			})
		}
	}
	return out
}

const moeRowsFromYouxiaoxianjieBook = buildMoeBasicCurriculumRowsFromYouxiaoxianjieBook()

/**
 * 按当前教材偏好筛选生字行
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function queryCurriculumChars(prefs) {
	const p = prefs || getCurriculumPrefs()
	const tv = p.textbook_version_id
	const grade = Number(p.grade)
	const sem = p.semester === '下' ? '下' : '上'

	const useYouxiaoxianjie =
		tv === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300 && grade === 0 && sem === '上'

	let out = useYouxiaoxianjie
		? [...moeRowsFromYouxiaoxianjieBook]
		: rows.filter(
				(r) =>
					r.textbook_version_id === tv &&
					Number(r.grade) === grade &&
					r.semester === sem
			)
	if (p.list_type_preference && p.list_type_preference !== LIST_TYPE_PREFERENCE.ALL) {
		out = out.filter((r) => r.list_type === p.list_type_preference)
	}
	out = [...out].sort((a, b) => {
		const so = (Number(a[COL.sort_order]) || 0) - (Number(b[COL.sort_order]) || 0)
		if (so !== 0) return so
		return (Number(a[COL.id]) || 0) - (Number(b[COL.id]) || 0)
	})
	return out
}

/**
 * 全年级统编「识字表」生字（去重；与当前年级/学期偏好无关）
 * 用于查字页部首检索、写字练习换字池等。
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function queryAllShiziCurriculumChars() {
	const seen = new Set()
	const out = []
	for (const r of rows) {
		if (r.list_type !== LIST_TYPE.SHIZI) continue
		const h = typeof r.hanzi === 'string' ? r.hanzi.trim() : ''
		if (!h || seen.has(h)) continue
		seen.add(h)
		out.push(r)
	}
	out.sort((a, b) => {
		const so = (Number(a[COL.sort_order]) || 0) - (Number(b[COL.sort_order]) || 0)
		if (so !== 0) return so
		return (Number(a[COL.id]) || 0) - (Number(b[COL.id]) || 0)
	})
	return out
}

/** 调试：筛选条件与排序说明（供开发页展示） */
export function debugCurriculumFilter(prefs) {
	const { whereSql, params } = buildCurriculumWhere(prefs)
	return {
		description: `本地生字数据筛选（等价条件：${whereSql}）`,
		params,
		sort: orderBySortOrderAsc().trim()
	}
}
