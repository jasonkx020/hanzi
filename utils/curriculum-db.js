/**
 * 教材生字：打包内嵌 constants/hanzi_curriculum_seed.json（npm run db:build 生成），
 * 运行时内存筛选。
 */

import CURRICULUM_ROWS from '@/constants/hanzi_curriculum_seed.json'
import { COL, LIST_TYPE_PREFERENCE } from '@/constants/curriculum-schema.js'
import { buildCurriculumWhere, getCurriculumPrefs, orderBySortOrderAsc } from '@/utils/curriculum-storage.js'

const rows = Array.isArray(CURRICULUM_ROWS) ? CURRICULUM_ROWS : []

/**
 * 按当前教材偏好筛选生字行
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function queryCurriculumChars(prefs) {
	const p = prefs || getCurriculumPrefs()
	const tv = p.textbook_version_id
	const grade = Number(p.grade)
	const sem = p.semester === '下' ? '下' : '上'
	let out = rows.filter(
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

/** 调试：筛选条件与排序说明（供开发页展示） */
export function debugCurriculumFilter(prefs) {
	const { whereSql, params } = buildCurriculumWhere(prefs)
	return {
		description: `本地生字数据筛选（等价条件：${whereSql}）`,
		params,
		sort: orderBySortOrderAsc().trim()
	}
}
