/**
 * @file vip-curriculum.js
 * @module utils
 * @description 基础设施工具：vip-curriculum.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 教材进度：免费用户仅可保留已保存的年级/册别，切换需会员。
 */

import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { isVipActive } from '@/utils/vip.js'
import { isGradePermanentlyUnlocked } from '@/utils/vip-entitlements.js'

function normSemester(s) {
	return s === '下' ? '下' : '上'
}

/**
 * @param {import('@/utils/curriculum-storage.js').CurriculumPrefs} draft
 * @param {import('@/utils/curriculum-storage.js').CurriculumPrefs} [baseline]
 */
export function curriculumChangeRequiresVip(draft, baseline = getCurriculumPrefs()) {
	if (!draft || !baseline) return false
	if (isVipActive()) return false
	const tvA = String(draft.textbook_version_id || '')
	const tvB = String(baseline.textbook_version_id || '')
	if (tvA !== tvB) return true
	if (Number(draft.grade) !== Number(baseline.grade)) {
		if (isGradePermanentlyUnlocked(draft.grade, draft.textbook_version_id)) return false
		return true
	}
	if (normSemester(draft.semester) !== normSemester(baseline.semester)) return true
	return false
}
