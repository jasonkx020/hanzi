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
