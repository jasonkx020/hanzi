import { listWrongOftenCharsForCurriculumPrefs } from '@/utils/user-progress-storage.js'

/** @deprecated 请优先用 buildDailyTrainingQueue；此函数保留为「仅易错汉字」列表 */
export function pickDailyChars(limit = 10) {
	const lim = Math.max(1, Math.min(50, Number(limit) || 10))
	return listWrongOftenCharsForCurriculumPrefs(undefined, lim)
		.map((r) => r.hanzi)
		.filter(Boolean)
}
