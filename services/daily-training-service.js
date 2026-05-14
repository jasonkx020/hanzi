/**
 * 每日一练：按当前教材生字池选题，同一自然日 + 同一教材偏好下队列稳定（便于家长安排）。
 * 优先纳入当前教材维度下的「易错」字，其余用当日种子打散补齐。
 */

import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { listWrongOftenCharsForCurriculumPrefs } from '@/utils/user-progress-storage.js'

/** @typedef {{ hanzi: string, pinyin: string|null, reason: 'weak'|'review', lesson_hint?: string|null }} DailyTrainingItem */

function localDateKey() {
	const d = new Date()
	const y = d.getFullYear()
	const m = `${d.getMonth() + 1}`.padStart(2, '0')
	const day = `${d.getDate()}`.padStart(2, '0')
	return `${y}-${m}-${day}`
}

/** 简单字符串哈希 → 32 位无符号整数（可复现） */
function hashUint32(str) {
	let h = 2166136261 >>> 0
	const s = String(str)
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}

/**
 * @param {Array<Record<string, unknown>>} rows curriculum 行（须含 hanzi）
 * @param {string} seed
 */
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

/**
 * @param {object} [prefs] 缺省 getCurriculumPrefs()
 * @param {{ limit?: number, shuffleSalt?: string|number }} [options] shuffleSalt 变化时同日内练习顺序可重排（首页不传则稳定）
 * @returns {Promise<{ dateKey: string, seed: string, items: DailyTrainingItem[], poolSize: number }>}
 */
export async function buildDailyTrainingQueue(prefs, options) {
	const p = prefs || getCurriculumPrefs()
	const limit = Math.max(1, Math.min(30, Number(options?.limit) || 10))
	const shuffleSalt = options?.shuffleSalt != null ? String(options.shuffleSalt) : '0'
	const rows = await queryCurriculumChars(p)
	const poolSize = rows.length
	const dateKey = localDateKey()
	const seed = `${dateKey}|${p.textbook_version_id}|${p.grade}|${p.semester}|${shuffleSalt}`

	if (!poolSize) {
		return { dateKey, seed, items: [], poolSize: 0 }
	}

	const byHanzi = new Map()
	for (const r of rows) {
		const h = typeof r.hanzi === 'string' ? r.hanzi.trim() : ''
		if (h && !byHanzi.has(h)) byHanzi.set(h, r)
	}

	const weakRecords = listWrongOftenCharsForCurriculumPrefs(p, 80)
	const chosen = []
	const seen = new Set()

	for (const wr of weakRecords) {
		if (chosen.length >= limit) break
		const h = typeof wr.hanzi === 'string' ? wr.hanzi.trim() : ''
		if (!h || seen.has(h)) continue
		const row = byHanzi.get(h)
		if (!row) continue
		seen.add(h)
		chosen.push({
			hanzi: h,
			pinyin: row.pinyin != null ? String(row.pinyin) : null,
			reason: 'weak',
			lesson_hint: row.lesson_hint != null ? String(row.lesson_hint) : null
		})
	}

	const restPool = sortRowsByDailySeed(
		rows.filter((r) => {
			const h = typeof r.hanzi === 'string' ? r.hanzi.trim() : ''
			return h && !seen.has(h)
		}),
		seed
	)

	for (const row of restPool) {
		if (chosen.length >= limit) break
		const h = typeof row.hanzi === 'string' ? row.hanzi.trim() : ''
		if (!h || seen.has(h)) continue
		seen.add(h)
		chosen.push({
			hanzi: h,
			pinyin: row.pinyin != null ? String(row.pinyin) : null,
			reason: 'review',
			lesson_hint: row.lesson_hint != null ? String(row.lesson_hint) : null
		})
	}

	return { dateKey, seed, items: chosen, poolSize }
}

/**
 * 首页摘要用：不重复拉全量 rows 时可只算易错命中数（轻量）
 * @param {DailyTrainingItem[]} items
 */
export function countWeakInDailyItems(items) {
	return items.filter((i) => i.reason === 'weak').length
}
