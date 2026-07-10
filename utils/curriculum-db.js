/**
 * @file curriculum-db.js
 * @module utils
 * @description 教材生字库：按需加载 seed JSON + 查询结果 memoize
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 统编等版本生字来自 static/curriculum/hanzi_curriculum_seed.json（npm run db:build 同步生成）；
 * 「幼小衔接·课标300基本字」来自 static/booktext/renjiaoban/preschool-bridge.json。
 */

import {
	COL,
	LIST_TYPE,
	LIST_TYPE_PREFERENCE,
	TEXTBOOK_VERSION_IDS
} from '@/constants/curriculum-schema.js'
import { buildCurriculumWhere, getCurriculumPrefs, orderBySortOrderAsc } from '@/utils/curriculum-storage.js'
import { readAppStaticText } from '@/utils/read-app-static-text.js'

const SEED_STATIC_PATH = '/static/curriculum/hanzi_curriculum_seed.json'
const PRESCHOOL_STATIC_PATH = '/static/booktext/renjiaoban/preschool-bridge.json'

const MOE_SOURCE_URL =
	'http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html'

let rows = null
let rowsLoadPromise = null
let moeRowsFromYouxiaoxianjieBook = null
let moeRowsLoadPromise = null
/** @type {Map<string, Array<Record<string, unknown>>>} */
const queryCache = new Map()
let allShiziCache = null

function sortCurriculumRows(out) {
	return [...out].sort((a, b) => {
		const so = (Number(a[COL.sort_order]) || 0) - (Number(b[COL.sort_order]) || 0)
		if (so !== 0) return so
		return (Number(a[COL.id]) || 0) - (Number(b[COL.id]) || 0)
	})
}

async function requestStaticJsonText(webPath) {
	let text = ''
	try {
		if (typeof plus !== 'undefined' && plus.io) {
			text = await readAppStaticText(webPath)
		}
	} catch (_) {}
	if (text) return text
	return new Promise((resolve, reject) => {
		uni.request({
			url: webPath,
			method: 'GET',
			responseType: 'text',
			dataType: 'text',
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					if (typeof res.data === 'string') resolve(res.data)
					else if (Array.isArray(res.data) || (res.data && typeof res.data === 'object')) {
						resolve(JSON.stringify(res.data))
					} else resolve(String(res.data ?? ''))
					return
				}
				reject(new Error(`HTTP ${res.statusCode}`))
			},
			fail: reject
		})
	})
}

async function loadJsonFromStatic(webPath) {
	const text = await requestStaticJsonText(webPath)
	return JSON.parse(String(text || '').trim() || '[]')
}

async function ensureCurriculumRowsLoaded() {
	if (rows) return rows
	if (!rowsLoadPromise) {
		rowsLoadPromise = (async () => {
			try {
				const loaded = await loadJsonFromStatic(SEED_STATIC_PATH)
				return Array.isArray(loaded) ? loaded : []
			} catch (e) {
				console.warn('[curriculum-db] static seed failed, fallback constants import', e)
				const mod = await import('@/constants/hanzi_curriculum_seed.json')
				const fallback = mod.default ?? mod
				return Array.isArray(fallback) ? fallback : []
			}
		})()
	}
	rows = await rowsLoadPromise
	return rows
}

function buildMoeBasicCurriculumRowsFromYouxiaoxianjieBook(lessons) {
	const tv = TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300
	const listType = LIST_TYPE.JIBENZIBIAO
	const list = Array.isArray(lessons) ? lessons : []
	const out = []
	let sortOrder = 0
	for (const L of list) {
		const lit = Array.isArray(L.literacy_chars) ? L.literacy_chars : []
		const hint =
			(typeof L.title === 'string' && L.title.trim()) || `课次 ${L.catalogLessonNo ?? ''}`
		for (const cell of lit) {
			const hanzi = typeof cell?.hanzi === 'string' ? cell.hanzi.trim() : ''
			if (!hanzi) continue
			sortOrder += 1
			out.push({
				id: sortOrder,
				textbook_version_id: tv,
				grade: 0,
				semester: '上',
				list_type: listType,
				hanzi,
				pinyin: cell?.pinyin ?? null,
				sort_order: sortOrder,
				lesson_hint: hint,
				source_url: MOE_SOURCE_URL
			})
		}
	}
	return out
}

async function ensureMoeRowsLoaded() {
	if (moeRowsFromYouxiaoxianjieBook) return moeRowsFromYouxiaoxianjieBook
	if (!moeRowsLoadPromise) {
		moeRowsLoadPromise = (async () => {
			try {
				const lessons = await loadJsonFromStatic(PRESCHOOL_STATIC_PATH)
				return buildMoeBasicCurriculumRowsFromYouxiaoxianjieBook(lessons)
			} catch (e) {
				console.warn('[curriculum-db] preschool-bridge load failed, fallback import', e)
				const mod = await import('../static/booktext/renjiaoban/preschool-bridge.json')
				const fallback = mod.default ?? mod
				return buildMoeBasicCurriculumRowsFromYouxiaoxianjieBook(fallback)
			}
		})()
	}
	moeRowsFromYouxiaoxianjieBook = await moeRowsLoadPromise
	return moeRowsFromYouxiaoxianjieBook
}

function prefsQueryKey(p) {
	return JSON.stringify({
		tv: p.textbook_version_id,
		g: Number(p.grade),
		s: p.semester === '下' ? '下' : '上',
		ltp: p.list_type_preference || LIST_TYPE_PREFERENCE.ALL
	})
}

/** 教材偏好变更时调用：清空查询 memo，保留已加载 seed */
export function invalidateCurriculumDbCache() {
	queryCache.clear()
	allShiziCache = null
}

/** 强制下次重新加载 seed（一般不需要） */
export function invalidateCurriculumSeedCache() {
	rows = null
	rowsLoadPromise = null
	moeRowsFromYouxiaoxianjieBook = null
	moeRowsLoadPromise = null
	invalidateCurriculumDbCache()
}

async function queryCurriculumCharsUncached(prefs) {
	const p = prefs || getCurriculumPrefs()
	const tv = p.textbook_version_id
	const grade = Number(p.grade)
	const sem = p.semester === '下' ? '下' : '上'

	const useYouxiaoxianjie =
		tv === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300 && grade === 0 && sem === '上'

	let out = useYouxiaoxianjie
		? [...(await ensureMoeRowsLoaded())]
		: (await ensureCurriculumRowsLoaded()).filter(
				(r) =>
					r.textbook_version_id === tv &&
					Number(r.grade) === grade &&
					r.semester === sem
			)
	if (p.list_type_preference && p.list_type_preference !== LIST_TYPE_PREFERENCE.ALL) {
		out = out.filter((r) => r.list_type === p.list_type_preference)
	}
	return sortCurriculumRows(out)
}

/**
 * 按当前教材偏好筛选生字行
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function queryCurriculumChars(prefs) {
	const p = prefs || getCurriculumPrefs()
	const key = prefsQueryKey(p)
	if (queryCache.has(key)) return queryCache.get(key)
	const out = await queryCurriculumCharsUncached(p)
	queryCache.set(key, out)
	return out
}

/**
 * 全年级统编「识字表」生字（去重；与当前年级/学期偏好无关）
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function queryAllShiziCurriculumChars() {
	if (allShiziCache) return allShiziCache
	const seedRows = await ensureCurriculumRowsLoaded()
	const seen = new Set()
	const out = []
	for (const r of seedRows) {
		if (r.list_type !== LIST_TYPE.SHIZI) continue
		const h = typeof r.hanzi === 'string' ? r.hanzi.trim() : ''
		if (!h || seen.has(h)) continue
		seen.add(h)
		out.push(r)
	}
	allShiziCache = sortCurriculumRows(out)
	return allShiziCache
}

/** 调试：筛选条件与排序说明（供开发页展示） */
export function debugCurriculumFilter(prefs) {
	const { whereSql, params } = buildCurriculumWhere(prefs)
	return {
		description: `本地生字数据筛选（等价条件：${whereSql}）`,
		params,
		sort: orderBySortOrderAsc().trim()
	}
}
