/**
 * @file write-practice-char-pool.js
 * @module utils
 * @description 基础设施工具：write-practice-char-pool.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 写字练习：换字池。已选教材 → 当前课本生字；未选教材 → 全库识字表。
 */
import { queryCurriculumChars, queryAllShiziCurriculumChars } from '@/utils/curriculum-db.js'
import {
	getCurriculumPrefs,
	hasUserCurriculumPrefsSaved
} from '@/utils/curriculum-storage.js'
import { buildDailyTrainingQueue } from '@/services/daily-training-service.js'

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
		out.push(h)
	}
	return out
}

/**
 * @param {{ excludeChar?: string, poolLimit?: number, shuffleSalt?: string|number }} [options]
 * @returns {Promise<string[]>}
 */
export async function buildWritePracticeCharPool(options = {}) {
	const exclude = firstHanzi(options.excludeChar)
	const limit = Math.max(8, Math.min(80, Number(options.poolLimit) || 40))
	const salt = options.shuffleSalt != null ? options.shuffleSalt : Date.now()

	let list = []

	if (hasUserCurriculumPrefsSaved()) {
		const prefs = getCurriculumPrefs()
		try {
			const plan = await buildDailyTrainingQueue(prefs, {
				limit: Math.min(28, limit),
				shuffleSalt: salt
			})
			list = (plan.items || [])
				.map((it) => firstHanzi(it.hanzi || it.char))
				.filter(Boolean)
		} catch (_) {
			list = []
		}
		if (list.length < limit) {
			const rows = await queryCurriculumChars(prefs)
			const more = shuffle(uniqueHanziList(rows, exclude))
			const seen = new Set(list)
			for (const h of more) {
				if (list.length >= limit) break
				if (seen.has(h)) continue
				seen.add(h)
				list.push(h)
			}
		}
	} else {
		const rows = await queryAllShiziCurriculumChars()
		list = shuffle(uniqueHanziList(rows, exclude))
	}

	list = list.filter((h) => !exclude || h !== exclude)

	if (list.length < 5) {
		const extra = shuffle(FALLBACK_CHARS.filter((h) => h !== exclude))
		const seen = new Set(list)
		for (const h of extra) {
			if (seen.has(h)) continue
			list.push(h)
			seen.add(h)
			if (list.length >= 5) break
		}
	}

	return list.slice(0, limit)
}
