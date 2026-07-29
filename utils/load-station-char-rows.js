/**
 * 按关卡（rjLesson 下标或 lesson hint）加载同站字行，供查字详情/练习 transfer 使用。
 */
import { LIST_TYPE } from '@/constants/curriculum-schema.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { applySpellCharPatch } from '@/utils/cnchar-setup.js'
import {
	buildLessonCharRowsFromRenjiaoItem,
	filterRenjiaoTextbookSyncLessons,
	getRenjiaoTextbookLoaderParams,
	isRenjiaoTextbookSyncPrefs,
	loadRenjiaoTextbookTexts
} from '@/utils/renjiao-textbook-loader.js'

function normPy(hanzi, pinyin) {
	let s = String(pinyin || '')
		.replace(/\s+/g, ' ')
		.trim()
	if (!s && hanzi) {
		try {
			const c = String(hanzi).trim().charAt(0)
			if (c) s = spellDisplayString(c, 'tone', 'poly', 'low') || ''
		} catch (_) {}
	}
	return applySpellCharPatch(hanzi, s)
}

function dedupeRows(rawRows) {
	const seen = Object.create(null)
	const out = []
	for (const r of rawRows || []) {
		const h = String(r.hanzi || '')
			.trim()
			.charAt(0)
		if (!h || !/[\u4e00-\u9fff]/.test(h) || seen[h]) continue
		seen[h] = 1
		out.push({ hanzi: h, pinyin: normPy(h, r.pinyin) })
	}
	return out
}

/**
 * @param {{ rjLessonIdx?: number|null, lessonHint?: string }} opts
 * @returns {Promise<{ lessonTitle: string, rjLessonIdx: number|null, rows: Array<{ hanzi: string, pinyin: string }> }>}
 */
export async function loadStationCharRows(opts = {}) {
	const prefs = getCurriculumPrefs()
	let rjLessonIdx =
		opts.rjLessonIdx != null && opts.rjLessonIdx !== ''
			? Number(opts.rjLessonIdx)
			: null
	if (!Number.isFinite(rjLessonIdx) || rjLessonIdx < 0) rjLessonIdx = null

	let lessonHint = String(opts.lessonHint || '').trim()

	if (isRenjiaoTextbookSyncPrefs(prefs) && rjLessonIdx != null) {
		const loaderParams = getRenjiaoTextbookLoaderParams(prefs)
		const raw = await loadRenjiaoTextbookTexts(loaderParams)
		const syncLessons = filterRenjiaoTextbookSyncLessons(raw)
		const item = syncLessons[rjLessonIdx]
		if (!item) {
			return { lessonTitle: lessonHint || '字卡', rjLessonIdx, rows: [] }
		}
		const title = String(item.title || lessonHint || '字卡').trim() || '字卡'
		const charRows = buildLessonCharRowsFromRenjiaoItem(item)
		return {
			lessonTitle: title,
			rjLessonIdx,
			rows: dedupeRows(charRows)
		}
	}

	if (!lessonHint) {
		return { lessonTitle: '字卡', rjLessonIdx: null, rows: [] }
	}

	const all = await queryCurriculumChars(prefs)
	const filtered = all.filter((r) => String(r.lesson_hint || '未分站') === lessonHint)
	const preferShizi = filtered.filter((r) => r.list_type === LIST_TYPE.SHIZI)
	const pool = preferShizi.length ? preferShizi : filtered
	return {
		lessonTitle: lessonHint,
		rjLessonIdx: null,
		rows: dedupeRows(pool)
	}
}
