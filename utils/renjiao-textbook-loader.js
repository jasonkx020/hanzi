/**
 * @file renjiao-textbook-loader.js
 * @module utils
 * @description 基础设施工具：renjiao-textbook-loader.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { renjiaoTextbookJsonFile } from '@/constants/renjiao-textbook-filenames.js'
import { readAppStaticText } from '@/utils/read-app-static-text.js'
import { resolveAppStaticLogicalUrl } from '@/utils/resolve-app-static-url.js'

const STATIC_BOOKTEXT_ROOT = '/static/booktext/renjiaoban/'

/** 课文 JSON 中与目录对应的可选字段（见 static/booktext/renjiaoban/*.json） */
const TEXTBOOK_EXTRA_KEYS = [
	'unit',
	'unitName',
	'unitTheme',
	'kind',
	'catalogLessonNo',
	'lessonInUnit',
	/** 与同册识字表该课组对齐的 { hanzi, pinyin }[] */
	'literacy_chars',
	/** 与同册写字表该课组对齐 */
	'writing_chars',
	/** 与同册词语表该课组对齐（hanzi 可为多字词） */
	'word_terms'
]

function buildFileName(grade, semester) {
	return renjiaoTextbookJsonFile(grade, semester, 'main')
}

function textbookCacheKey(grade, semester) {
	return `${Number(grade)}|${semester === '下' ? '下' : '上'}`
}

/** @type {Map<string, Array<Record<string, unknown>>>} */
const textbookCache = new Map()
/** @type {Map<string, Promise<Array<Record<string, unknown>>>>} */
const textbookInflight = new Map()

/** 切换教材/年级/册别时由 curriculum-storage 调用 */
export function invalidateRenjiaoTextbookCache() {
	textbookCache.clear()
	textbookInflight.clear()
}

/** 将 uni.request / 本地读出的 payload 统一为可 JSON.parse 的字符串或已是数组 */
function normalizeTextbookJsonPayload(data) {
	if (data == null || data === '') return ''
	if (Array.isArray(data)) return data
	if (typeof data === 'object') {
		try {
			return JSON.stringify(data)
		} catch (_) {
			return ''
		}
	}
	return String(data)
}

function parseTextbookJsonArray(payload) {
	if (Array.isArray(payload)) return payload
	const text = normalizeTextbookJsonPayload(payload)
	if (!text) return null
	const trimmed = text.trim()
	if (!trimmed || trimmed === '[object Object]') return null
	return JSON.parse(trimmed)
}

function requestTextByUrl(url) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			responseType: 'text',
			dataType: 'text',
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					if (Array.isArray(res.data)) {
						resolve(res.data)
						return
					}
					resolve(normalizeTextbookJsonPayload(res.data))
					return
				}
				reject(new Error(`HTTP ${res.statusCode}`))
			},
			fail: reject
		})
	})
}

/** App / H5 / 小程序：多路径尝试读取 static 下课文 JSON */
async function requestText(webPath) {
	const url = String(webPath || '').trim()
	if (!url) throw new Error('empty url')

	const attempts = []
	if (url.startsWith('/static/')) {
		if (typeof plus !== 'undefined' && plus.io) {
			attempts.push(() => readAppStaticText(url))
			const logical = resolveAppStaticLogicalUrl(url)
			if (logical && logical !== url) {
				attempts.push(() => requestTextByUrl(logical))
			}
		}
		attempts.push(() => requestTextByUrl(url))
	} else {
		attempts.push(() => requestTextByUrl(url))
	}

	let lastError = null
	for (const run of attempts) {
		try {
			const data = await run()
			if (data !== '' && data != null) return data
		} catch (e) {
			lastError = e
		}
	}
	throw lastError || new Error('textbook json read failed')
}

/**
 * 读取 static/booktext/renjiaoban 中的统编语文课文（带内存缓存）
 */
export async function loadRenjiaoTextbookTexts({ grade, semester }) {
	const key = textbookCacheKey(grade, semester)
	if (textbookCache.has(key)) return textbookCache.get(key)
	if (textbookInflight.has(key)) return textbookInflight.get(key)

	const task = loadRenjiaoTextbookTextsUncached({ grade, semester })
		.then((arr) => {
			textbookCache.set(key, arr)
			textbookInflight.delete(key)
			return arr
		})
		.catch((e) => {
			textbookInflight.delete(key)
			throw e
		})
	textbookInflight.set(key, task)
	return task
}

async function loadRenjiaoTextbookTextsUncached({ grade, semester }) {
	const fileName = buildFileName(grade, semester)
	if (!fileName) return []
	const urlCandidates = [`${STATIC_BOOKTEXT_ROOT}${fileName}`]
	try {
		let text = ''
		let lastError = null
		for (let i = 0; i < urlCandidates.length; i++) {
			try {
				text = await requestText(urlCandidates[i])
				if (text) break
			} catch (e) {
				lastError = e
			}
		}
		if (text === '' || text == null) throw lastError || new Error('empty textbook json')
		const arr = parseTextbookJsonArray(text)
		if (!Array.isArray(arr)) return []
		return arr
			.map((it) => {
				if (!it || typeof it !== 'object') return null
				const row = {
					title: String(it.title != null ? it.title : ''),
					content: String(it.content != null ? it.content : '')
				}
				for (let i = 0; i < TEXTBOOK_EXTRA_KEYS.length; i++) {
					const k = TEXTBOOK_EXTRA_KEYS[i]
					if (Object.prototype.hasOwnProperty.call(it, k)) row[k] = it[k]
				}
				return row
			})
			.filter((it) => it && (it.title || it.content))
	} catch (e) {
		console.warn('[renjiao-textbook-loader] load failed', fileName, e)
		return []
	}
}

function normalizeCharPairList(x) {
	if (!Array.isArray(x)) return []
	return x
}

/**
 * 是否含课本同步用的识字表 / 写字表（不含词语表 word_terms）
 * @param {Record<string, unknown>} item loadRenjiaoTextbookTexts 返回的单条
 */
export function renjiaoLessonHasSyncChars(item) {
	if (!item || typeof item !== 'object') return false
	const lit = normalizeCharPairList(item.literacy_chars)
	const wri = normalizeCharPairList(item.writing_chars)
	return lit.length > 0 || wri.length > 0
}

/**
 * 只保留有识字或写字条目的课文（顺序与 JSON 一致）
 * @param {Array<Record<string, unknown>>} rows
 */
export function filterRenjiaoTextbookSyncLessons(rows) {
	if (!Array.isArray(rows)) return []
	return rows.filter(renjiaoLessonHasSyncChars)
}

/**
 * 仅识字表行（不含写字表），用于「识字已学」等统计
 * @param {Record<string, unknown>} item
 * @returns {Array<{ id: string, hanzi: string, pinyin: string }>}
 */
export function buildLiteracyOnlyCharRowsFromRenjiaoItem(item) {
	if (!item || typeof item !== 'object') return []
	const lit = normalizeCharPairList(item.literacy_chars)
	const out = []
	let i = 0
	for (const e of lit) {
		const hanzi = String(e && e.hanzi != null ? e.hanzi : '').trim()
		if (!hanzi) continue
		out.push({
			id: `rj-lit-${i}`,
			hanzi,
			pinyin: String(e && e.pinyin != null ? e.pinyin : '').trim()
		})
		i++
	}
	return out
}

/**
 * 合并识字表 + 写字表为字卡行（先识字，后写字；与 JSON 顺序一致）
 * @param {Record<string, unknown>} item
 * @returns {Array<{ id: string, hanzi: string, pinyin: string }>}
 */
export function buildLessonCharRowsFromRenjiaoItem(item) {
	if (!item || typeof item !== 'object') return []
	const litPart = buildLiteracyOnlyCharRowsFromRenjiaoItem(item)
	const wri = normalizeCharPairList(item.writing_chars)
	const out = litPart.slice()
	let j = 0
	for (const e of wri) {
		const hanzi = String(e && e.hanzi != null ? e.hanzi : '').trim()
		if (!hanzi) continue
		out.push({
			id: `rj-wri-${j}`,
			hanzi,
			pinyin: String(e && e.pinyin != null ? e.pinyin : '').trim()
		})
		j++
	}
	return out
}
