/**
 * @file curriculum-repository.js
 * @module repositories
 * @description 数据仓储源文件：curriculum-repository.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { getCurriculumPrefs, setCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'

export function getCurrentCurriculum() {
	return getCurriculumPrefs()
}

export function updateCurrentCurriculum(patch) {
	return setCurriculumPrefs(patch)
}

export function getCurriculumSummary() {
	return formatCurriculumSummary(getCurriculumPrefs())
}

export async function listCurriculumChars() {
	return queryCurriculumChars(getCurriculumPrefs())
}
