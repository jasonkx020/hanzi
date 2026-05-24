/**
 * 写字练习：连续 8 字一组。
 *
 * 选字原则（学生视角）：
 * - 已设置教材：以「当前课文写字表 + 正在学的课」为主，穿插 1～2 个练过的易错字；
 *   不从未见过的字里随机，避免挫败感。
 * - 未设置教材：从识字表温和抽样（家长需先设教材才能对齐课堂）。
 */
import { COL_PROGRESS, LIST_TYPE } from '@/constants/curriculum-schema.js'
import { queryCurriculumChars, queryAllShiziCurriculumChars } from '@/utils/curriculum-db.js'
import {
	getCurriculumPrefs,
	hasUserCurriculumPrefsSaved
} from '@/utils/curriculum-storage.js'
import { buildDailyTrainingPlan } from '@/services/daily-training-service.js'
import {
	getUserProgressMap,
	listWrongOftenCharsForCurriculumPrefs,
	makeProgressKey
} from '@/utils/user-progress-storage.js'

export const WRITE_PRACTICE_SESSION_SIZE = 8

const FALLBACK_CHARS = ['大', '小', '天', '口', '手', '人', '山', '水']

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function firstHanzi(text) {
	const m = String(text || '').trim().match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function uniqueHanziList(rows, exclude) {
	const ex = firstHanzi(exclude)
	const seen = new Set()
	const out = []
	for (const r of rows || []) {
		const h = firstHanzi(r && r.hanzi)
		if (!h || seen.has(h) || (ex && h === ex)) continue
		seen.add(h)
		out.push(r)
	}
	return out
}

function buildProgressHelpers(prefs, progressMap) {
	const p = prefs || getCurriculumPrefs()
	const isLearned = (hanzi) => {
		const key = makeProgressKey(p.textbook_version_id, p.grade, p.semester, hanzi)
		return !!(progressMap[key] && Number(progressMap[key][COL_PROGRESS.learned]) === 1)
	}
	const wrongCount = (hanzi) => {
		const key = makeProgressKey(p.textbook_version_id, p.grade, p.semester, hanzi)
		return Number(progressMap[key]?.[COL_PROGRESS.wrong_count]) || 0
	}
	return { isLearned, wrongCount }
}

/**
 * @typedef {{ hanzi: string, pinyin: string|null }} WritePracticeSessionItem
 * @typedef {{ items: WritePracticeSessionItem[], sourceHint: string }} WritePracticeSession
 */

/**
 * @param {{ excludeChar?: string, shuffleSalt?: string|number, pinFirst?: string }} [options]
 * @returns {Promise<WritePracticeSession>}
 */
export async function buildWritePracticeSession(options = {}) {
	const exclude = firstHanzi(options.excludeChar)
	const pinFirst = firstHanzi(options.pinFirst)
	const size = WRITE_PRACTICE_SESSION_SIZE
	const salt = options.shuffleSalt != null ? options.shuffleSalt : Date.now()

	/** @type {Array<{ hanzi: string, pinyin: string|null, tier: number }>} */
	const bucket = []
	const seen = new Set()

	const pushRow = (row, tier) => {
		const h = firstHanzi(row?.hanzi)
		if (!h || seen.has(h) || (exclude && h === exclude)) return
		seen.add(h)
		bucket.push({
			hanzi: h,
			pinyin: row?.pinyin != null ? String(row.pinyin) : null,
			tier
		})
	}

	const pushHanzi = (hanzi, pinyin, tier) => {
		const h = firstHanzi(hanzi)
		if (!h || seen.has(h) || (exclude && h === exclude)) return
		seen.add(h)
		bucket.push({ hanzi: h, pinyin: pinyin || null, tier })
	}

	let sourceHint = '识字表随机（建议在设置里选好教材，字会更贴课堂）'

	if (hasUserCurriculumPrefsSaved()) {
		sourceHint = '课文写字表 · 易错复习 · 学过的字'
		const prefs = getCurriculumPrefs()
		const progressMap = getUserProgressMap()
		const { isLearned, wrongCount } = buildProgressHelpers(prefs, progressMap)
		const rows = await queryCurriculumChars(prefs)
		const rowByHanzi = new Map()
		for (const r of rows) {
			const h = firstHanzi(r.hanzi)
			if (h && !rowByHanzi.has(h)) rowByHanzi.set(h, r)
		}

		let plan = null
		try {
			plan = await buildDailyTrainingPlan(prefs, {
				limits: { write: 5, weak: 3, reviewFromPrev: 2, reviewRefresh: 2 },
				shuffleSalt: salt
			})
		} catch (_) {
			plan = null
		}

		const writeSeg = plan?.segments?.find((s) => s.key === 'write')
		for (const it of writeSeg?.items || []) {
			if (bucket.filter((b) => b.tier === 1).length >= 5) break
			pushHanzi(it.hanzi, it.pinyin, 1)
		}

		for (const wr of listWrongOftenCharsForCurriculumPrefs(prefs, 6)) {
			if (bucket.filter((b) => b.tier === 0).length >= 2) break
			const h = firstHanzi(wr.hanzi)
			const row = rowByHanzi.get(h)
			if (row) pushRow(row, 0)
			else pushHanzi(h, null, 0)
		}

		if (plan?.items?.length) {
			for (const it of plan.items) {
				if (it.reason === 'weak') continue
				if (bucket.length >= size) break
				const h = firstHanzi(it.hanzi)
				if (!h || !isLearned(h)) continue
				const row = rowByHanzi.get(h)
				if (row) pushRow(row, 2)
			}
		}

		const learnedWrite = rows.filter((r) => {
			const h = firstHanzi(r.hanzi)
			return h && isLearned(h) && r.list_type === LIST_TYPE.XIEZI
		})
		learnedWrite.sort(
			(a, b) =>
				wrongCount(firstHanzi(b.hanzi)) - wrongCount(firstHanzi(a.hanzi)) ||
				Math.random() - 0.5
		)
		for (const r of learnedWrite) {
			if (bucket.length >= size) break
			pushRow(r, 2)
		}

		const writeRows = shuffle(
			rows.filter((r) => r.list_type === LIST_TYPE.XIEZI || isLearned(firstHanzi(r.hanzi)))
		)
		for (const r of writeRows) {
			if (bucket.length >= size) break
			pushRow(r, 3)
		}
	} else {
		const rows = await queryAllShiziCurriculumChars()
		for (const r of shuffle(uniqueHanziList(rows, exclude))) {
			if (bucket.length >= size) break
			pushRow(r, 1)
		}
	}

	if (bucket.length < size) {
		for (const h of shuffle(FALLBACK_CHARS)) {
			if (bucket.length >= size) break
			pushHanzi(h, null, 9)
		}
	}

	bucket.sort((a, b) => a.tier - b.tier)
	let ordered = bucket.slice(0, size)
	const writeFirst = ordered.find((x) => x.tier === 1) || ordered[0]
	if (writeFirst) {
		ordered = [writeFirst, ...shuffle(ordered.filter((x) => x.hanzi !== writeFirst.hanzi))]
	} else {
		ordered = shuffle(ordered)
	}

	if (pinFirst) {
		const rest = ordered.filter((x) => x.hanzi !== pinFirst)
		const pinned = ordered.find((x) => x.hanzi === pinFirst)
		ordered = [
			pinned || { hanzi: pinFirst, pinyin: null, tier: 1 },
			...rest
		].slice(0, size)
	}

	return {
		items: ordered.map(({ hanzi, pinyin }) => ({ hanzi, pinyin })),
		sourceHint
	}
}

/**
 * @param {object} [options]
 * @returns {Promise<string[]>}
 */
export async function buildWritePracticeCharPool(options = {}) {
	const session = await buildWritePracticeSession(options)
	return session.items.map((it) => it.hanzi)
}
