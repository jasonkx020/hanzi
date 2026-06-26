/**
 * @file daily-training-service.js
 * @module services
 * @description 领域服务源文件：daily-training-service.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 每日一练：围绕课文进度 — 复习巩固、写字表练字。
 * 同一自然日 + 教材偏好 + shuffleSalt 下队列可复现。
 */

import { COL_PROGRESS, LIST_TYPE } from '@/constants/curriculum-schema.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import {
	getUserProgressMap,
	listWrongOftenCharsForCurriculumPrefs,
	makeProgressKey
} from '@/utils/user-progress-storage.js'

/** @typedef {'weak'|'review'|'preview'|'write'} DailyReason */
/** @typedef {'review'|'write'} DailySegmentKey */

/**
 * @typedef {object} DailyTrainingItem
 * @property {string} hanzi
 * @property {string|null} pinyin
 * @property {DailyReason} reason
 * @property {DailySegmentKey} segment
 * @property {string|null} [lesson_hint]
 * @property {string|null} [list_type]
 */

/**
 * @typedef {object} DailySegment
 * @property {DailySegmentKey} key
 * @property {string} title
 * @property {string} subtitle
 * @property {DailyTrainingItem[]} items
 */

/**
 * @typedef {object} DailyTrainingPlan
 * @property {string} dateKey
 * @property {string} seed
 * @property {number} poolSize
 * @property {string|null} focusLessonHint 当前进度课（第一课未学完或最后一课）
 * @property {DailySegment[]} segments
 * @property {DailyTrainingItem[]} items 认读流：复习（不含练字列表重复）
 * @property {{ weak: number, review: number, write: number }} stats
 */

const DEFAULT_LIMITS = {
	weak: 3,
	reviewFromPrev: 2,
	reviewRefresh: 2,
	write: 3,
	readTotal: 10
}

function localDateKey() {
	const d = new Date()
	const y = d.getFullYear()
	const m = `${d.getMonth() + 1}`.padStart(2, '0')
	const day = `${d.getDate()}`.padStart(2, '0')
	return `${y}-${m}-${day}`
}

function hashUint32(str) {
	let h = 2166136261 >>> 0
	const s = String(str)
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}

function sortRowsByDailySeed(rows, seed) {
	const base = hashUint32(seed)
	return [...rows].sort((a, b) => {
		const ha = String(a.hanzi || '')
		const hb = String(b.hanzi || '')
		const ka = hashUint32(`${seed}:${ha}`) ^ base
		const kb = hashUint32(`${seed}:${hb}`) ^ base
		if (ka !== kb) return ka - kb
		return ha.localeCompare(hb, 'zh-Hans-CN')
	})
}

function firstHanzi(text) {
	const m = String(text || '').trim().match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function rowToItem(row, reason, segment) {
	const h = firstHanzi(row.hanzi)
	if (!h) return null
	return {
		hanzi: h,
		pinyin: row.pinyin != null ? String(row.pinyin) : null,
		reason,
		segment,
		lesson_hint: row.lesson_hint != null ? String(row.lesson_hint) : null,
		list_type: row.list_type != null ? String(row.list_type) : null
	}
}

/** @param {Array<Record<string, unknown>>} rows */
function groupRowsByLesson(rows) {
	const lessons = []
	const map = new Map()
	const sorted = [...rows].sort(
		(a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
	)
	for (const r of sorted) {
		const hint = String(r.lesson_hint || '未分课次').trim() || '未分课次'
		if (!map.has(hint)) {
			const lesson = { hint, rows: [] }
			map.set(hint, lesson)
			lessons.push(lesson)
		}
		map.get(hint).rows.push(r)
	}
	return lessons
}

function buildProgressHelpers(prefs, progressMap) {
	const isLearned = (hanzi) => {
		const key = makeProgressKey(
			prefs.textbook_version_id,
			prefs.grade,
			prefs.semester,
			hanzi
		)
		const rec = progressMap[key]
		return !!(rec && Number(rec[COL_PROGRESS.learned]) === 1)
	}
	const wrongCount = (hanzi) => {
		const key = makeProgressKey(
			prefs.textbook_version_id,
			prefs.grade,
			prefs.semester,
			hanzi
		)
		return Number(progressMap[key]?.[COL_PROGRESS.wrong_count]) || 0
	}
	return { isLearned, wrongCount }
}

function lessonLearnedRatio(lesson, isLearned) {
	const chars = []
	for (const r of lesson.rows) {
		const h = firstHanzi(r.hanzi)
		if (h && !chars.includes(h)) chars.push(h)
	}
	if (!chars.length) return 1
	const n = chars.filter((h) => isLearned(h)).length
	return n / chars.length
}

function uniqueItemsPush(target, item, seen) {
	if (!item || seen.has(item.hanzi)) return false
	seen.add(item.hanzi)
	target.push(item)
	return true
}

/**
 * @param {object} [prefs]
 * @param {{ shuffleSalt?: string|number, limits?: Partial<typeof DEFAULT_LIMITS> }} [options]
 * @returns {Promise<DailyTrainingPlan>}
 */
export async function buildDailyTrainingPlan(prefs, options = {}) {
	const p = prefs || getCurriculumPrefs()
	const shuffleSalt = options.shuffleSalt != null ? String(options.shuffleSalt) : '0'
	const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) }
	const rows = await queryCurriculumChars(p)
	const poolSize = rows.length
	const dateKey = localDateKey()
	const seed = `${dateKey}|${p.textbook_version_id}|${p.grade}|${p.semester}|${shuffleSalt}`

	const emptyPlan = () => ({
		dateKey,
		seed,
		poolSize: 0,
		focusLessonHint: null,
		segments: [
			{ key: 'review', title: '复习', subtitle: '巩固易错与近期课文', items: [] },
			{ key: 'write', title: '练字', subtitle: '按笔顺写一写', items: [] }
		],
		items: [],
		stats: { weak: 0, review: 0, write: 0 }
	})

	if (!poolSize) return emptyPlan()

	const byHanzi = new Map()
	for (const r of rows) {
		const h = firstHanzi(r.hanzi)
		if (h && !byHanzi.has(h)) byHanzi.set(h, r)
	}

	const progressMap = getUserProgressMap()
	const { isLearned, wrongCount } = buildProgressHelpers(p, progressMap)
	const lessons = groupRowsByLesson(rows)

	let focusIdx = lessons.findIndex((L) => lessonLearnedRatio(L, isLearned) < 1)
	if (focusIdx < 0) focusIdx = Math.max(0, lessons.length - 1)

	const focus = lessons[focusIdx] || null
	const prev = focusIdx > 0 ? lessons[focusIdx - 1] : null

	const focusHint = focus?.hint || null

	const seen = new Set()
	const reviewItems = []
	const writeItems = []

	for (const wr of listWrongOftenCharsForCurriculumPrefs(p, 40)) {
		if (reviewItems.length >= limits.weak) break
		const h = firstHanzi(wr.hanzi)
		const row = byHanzi.get(h)
		if (!row) continue
		uniqueItemsPush(reviewItems, rowToItem(row, 'weak', 'review'), seen)
	}

	if (prev) {
		const prevLearned = sortRowsByDailySeed(
			prev.rows.filter((r) => {
				const h = firstHanzi(r.hanzi)
				return h && isLearned(h) && !seen.has(h)
			}),
			`${seed}:prev`
		)
		for (const r of prevLearned) {
			if (reviewItems.filter((i) => i.segment === 'review' && i.reason !== 'weak').length >=
				limits.reviewFromPrev + limits.reviewRefresh)
				break
			uniqueItemsPush(reviewItems, rowToItem(r, 'review', 'review'), seen)
		}
	}

	if (focus) {
		const refreshPool = sortRowsByDailySeed(
			focus.rows.filter((r) => {
				const h = firstHanzi(r.hanzi)
				return h && isLearned(h) && !seen.has(h)
			}),
			`${seed}:focus-refresh`
		)
		refreshPool.sort((a, b) => wrongCount(firstHanzi(b.hanzi)) - wrongCount(firstHanzi(a.hanzi)))
		let refreshN = 0
		for (const r of refreshPool) {
			if (refreshN >= limits.reviewRefresh) break
			if (uniqueItemsPush(reviewItems, rowToItem(r, 'review', 'review'), seen)) refreshN++
		}
	}

	const writePool = []
	for (const r of rows) {
		if (r.list_type === LIST_TYPE.XIEZI) writePool.push(r)
	}
	const writeSorted = sortRowsByDailySeed(writePool.length ? writePool : rows, `${seed}:write`)
	for (const r of writeSorted) {
		if (writeItems.length >= limits.write) break
		const h = firstHanzi(r.hanzi)
		if (!h) continue
		const inToday = seen.has(h)
		const item = rowToItem(r, 'write', 'write')
		if (!item) continue
		if (!inToday || r.list_type === LIST_TYPE.XIEZI) {
			if (!writeItems.some((w) => w.hanzi === h)) writeItems.push(item)
		}
	}
	if (writeItems.length < limits.write) {
		for (const it of reviewItems) {
			if (writeItems.length >= limits.write) break
			const row = byHanzi.get(it.hanzi)
			if (row?.list_type === LIST_TYPE.XIEZI) {
				const w = rowToItem(row, 'write', 'write')
				if (w && !writeItems.some((x) => x.hanzi === w.hanzi)) writeItems.push(w)
			}
		}
	}

	const readItems = []
	const readCap = limits.readTotal
	for (const it of reviewItems) {
		if (readItems.length >= readCap) break
		readItems.push(it)
	}

	const segments = [
		{
			key: 'review',
			title: '复习',
			subtitle: focusHint ? `巩固 · 学到「${focusHint}」前后` : '巩固易错与已学字',
			items: reviewItems
		},
		{
			key: 'write',
			title: '练字',
			subtitle: '按笔顺写一写（写字表优先）',
			items: writeItems
		}
	]

	return {
		dateKey,
		seed,
		poolSize,
		focusLessonHint: focusHint,
		segments,
		items: readItems,
		stats: {
			weak: reviewItems.filter((i) => i.reason === 'weak').length,
			review: reviewItems.filter((i) => i.reason !== 'weak').length,
			write: writeItems.length
		}
	}
}

/**
 * 兼容旧接口：扁平认读队列（复习）
 */
export async function buildDailyTrainingQueue(prefs, options = {}) {
	const plan = await buildDailyTrainingPlan(prefs, options)
	return {
		dateKey: plan.dateKey,
		seed: plan.seed,
		items: plan.items,
		poolSize: plan.poolSize,
		plan
	}
}

/** @param {DailyTrainingItem[]} items */
export function countWeakInDailyItems(items) {
	return items.filter((i) => i.reason === 'weak').length
}

/** @param {DailyTrainingPlan} plan */
export function formatDailyPlanHomeSummary(plan, learnedCount = 0) {
	if (!plan.poolSize) {
		return { desc: '暂无生字，可切换年级或去课本选课', btnLabel: '去设置' }
	}
	const { stats } = plan
	const parts = []
	if (stats.review + stats.weak > 0) parts.push(`复习 ${stats.review + stats.weak}`)
	if (stats.write > 0) parts.push(`练字 ${stats.write}`)
	const tail = parts.length ? parts.join(' · ') : '今日任务已排好'
	const learnedBit = learnedCount > 0 ? `已学 ${learnedCount} 字 · ` : ''
	return {
		desc: `${learnedBit}${tail}`,
		btnLabel: '开始练习'
	}
}

/** @param {DailyReason} reason */
export function dailyReasonLabel(reason) {
	switch (reason) {
		case 'weak':
			return '易错'
		case 'review':
			return '复习'
		case 'preview':
			return '预习'
		case 'write':
			return '练字'
		default:
			return ''
	}
}
