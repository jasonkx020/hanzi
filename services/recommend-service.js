/**
 * @file recommend-service.js
 * @module services
 * @description 领域服务源文件：recommend-service.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { listWrongOftenCharsForCurriculumPrefs } from '@/utils/user-progress-storage.js'

/** @deprecated 请优先用 buildDailyTrainingQueue；此函数保留为「仅易错汉字」列表 */
export function pickDailyChars(limit = 10) {
	const lim = Math.max(1, Math.min(50, Number(limit) || 10))
	return listWrongOftenCharsForCurriculumPrefs(undefined, lim)
		.map((r) => r.hanzi)
		.filter(Boolean)
}
