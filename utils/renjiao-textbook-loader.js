/**
 * @file renjiao-textbook-loader.js
 * @module utils
 * @description 基础设施工具：renjiao-textbook-loader.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { renjiaoTextbookJsonFile } from '@/constants/renjiao-textbook-filenames.js'
import { TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
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
	'word_terms',
	/** 本课字母/音节点读项（一年级汉语拼音课） */
	'pinyin_items'
]

function buildFileName(grade, semester) {
	return renjiaoTextbookJsonFile(grade, semester, 'main')
}

/**
 * 是否走课本同步学 JSON（人教 1～6 / 幼小衔接 grade0），而非 seed 扁平行
 * @param {{ textbook_version_id?: string, grade?: number, semester?: string }} prefs
 */
export function isRenjiaoTextbookSyncPrefs(prefs) {
	if (!prefs || typeof prefs !== 'object') return false
	const tv = prefs.textbook_version_id
	const g = Number(prefs.grade)
	const sem = prefs.semester === '下' ? '下' : '上'
	if (tv === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) {
		return g === 0 && sem === '上'
	}
	if (tv === TEXTBOOK_VERSION_IDS.TONGBIAN_RJ) {
		return Number.isFinite(g) && g >= 1 && g <= 6
	}
	return false
}

/**
 * @param {{ textbook_version_id?: string, grade?: number, semester?: string }} prefs
 * @returns {{ grade: number, semester: string } | null}
 */
export function getRenjiaoTextbookLoaderParams(prefs) {
	if (!isRenjiaoTextbookSyncPrefs(prefs)) return null
	if (prefs.textbook_version_id === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) {
		return { grade: 0, semester: '上' }
	}
	return {
		grade: Number(prefs.grade),
		semester: prefs.semester === '下' ? '下' : '上'
	}
}

/** 将 uni.request / 本地读出的 payload 统一为可 JSON.parse 的字符串或已是数组/对象 */
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

/**
 * 解析课文 JSON：支持旧版数组，以及合并版 / 幼小衔接 `{ book_catalog }` 对象
 * @returns {object|Array|null}
 */
function parseTextbookJsonPayload(payload) {
	if (Array.isArray(payload)) return payload
	if (payload && typeof payload === 'object' && payload.book_catalog) return payload
	const text = normalizeTextbookJsonPayload(payload)
	if (!text) return null
	const trimmed = String(text).trim()
	if (!trimmed || trimmed === '[object Object]') return null
	const parsed = JSON.parse(trimmed)
	if (Array.isArray(parsed)) return parsed
	if (parsed && typeof parsed === 'object' && parsed.book_catalog) return parsed
	return null
}

/** @deprecated 仅兼容旧调用；请用 parseTextbookJsonPayload */
function parseTextbookJsonArray(payload) {
	const parsed = parseTextbookJsonPayload(payload)
	return Array.isArray(parsed) ? parsed : null
}

/**
 * merge / 幼小衔接 book_catalog 的单元键顺序（「第N单元…」）
 * @param {Record<string, unknown>} bookCatalog
 * @returns {string[]}
 */
function getUnitOrder(bookCatalog) {
	if (!bookCatalog || typeof bookCatalog !== 'object' || Array.isArray(bookCatalog)) return []
	return Object.keys(bookCatalog).filter((k) => k.startsWith('第') && k.includes('单元'))
}

/**
 * 单篇 article → 与旧版课次数组同构的行
 */
function articleToFlattenedLesson(a, unitName, unit, unitIndex) {
	if (!a || typeof a !== 'object') return null
	const title = String(a.title != null ? a.title : '')
	const content = String(a.content != null ? a.content : '')
	const subs = Array.isArray(a.sub_articles) ? a.sub_articles : []
	if (!title && !content && !subs.length) return null

	const readChars = Array.isArray(a.literacy_chars)
		? a.literacy_chars
		: Array.isArray(a.read_chars)
			? a.read_chars
			: []
	const writeChars = Array.isArray(a.write_chars)
		? a.write_chars
		: Array.isArray(a.writing_chars)
			? a.writing_chars
			: []
	const wordChars = Array.isArray(a.word_chars)
		? a.word_chars
		: Array.isArray(a.word_terms)
			? a.word_terms
			: []

	const row = {
		title,
		content,
		unit: Number.isFinite(Number(unitIndex)) ? Number(unitIndex) + 1 : null,
		unitName,
		unitTheme: unit && unit.type != null ? String(unit.type) : '',
		kind: a.kind || (a.sort != null ? 'lesson' : a.type),
		catalogLessonNo: a.sort,
		lessonInUnit: a.lesson_in_unit,
		lesson_key: a.lesson_key,
		literacy_chars: readChars,
		writing_chars: writeChars,
		word_terms: wordChars
	}
	if (subs.length) row.sub_articles = subs
	return row
}

/**
 * 合并版课本 / 幼小衔接：从 book_catalog 展平为课文行
 * @param {Record<string, unknown>} book
 * @returns {Array<Record<string, unknown>>}
 */
export function flattenLessonsFromMergedBook(book) {
	if (!book || !book.book_catalog) return []
	const catalog = book.book_catalog
	const rows = []
	/** 幼小衔接等：book_catalog 为「单元名 → { article_list }」 */
	if (!Array.isArray(catalog) && typeof catalog === 'object') {
		const order = getUnitOrder(catalog)
		const keys = order.length ? order : Object.keys(catalog)
		for (let u = 0; u < keys.length; u++) {
			const unitName = keys[u]
			const unit = catalog[unitName]
			if (!unit || !Array.isArray(unit.article_list)) continue
			for (let i = 0; i < unit.article_list.length; i++) {
				const row = articleToFlattenedLesson(unit.article_list[i], unitName, unit, u)
				if (row) rows.push(row)
			}
		}
		return rows
	}
	/** 兼容数组形态单元列表 */
	if (Array.isArray(catalog)) {
		for (let u = 0; u < catalog.length; u++) {
			const unit = catalog[u]
			if (!unit || typeof unit !== 'object') continue
			const unitName = String(unit.unitName || unit.name || `第${u + 1}单元`)
			const articles = Array.isArray(unit.article_list)
				? unit.article_list
				: Array.isArray(unit.lessons)
					? unit.lessons
					: []
			for (let i = 0; i < articles.length; i++) {
				const row = articleToFlattenedLesson(articles[i], unitName, unit, u)
				if (row) rows.push(row)
			}
		}
	}
	return rows
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
 * 读取 static/booktext/renjiaoban 中的统编语文课文 / 幼小衔接课表
 * 支持旧版数组与合并版 `{ book_catalog }`
 */
export async function loadRenjiaoTextbookTexts({ grade, semester }) {
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
		const payload = parseTextbookJsonPayload(text)
		let arr = []
		if (Array.isArray(payload)) {
			arr = payload
		} else if (payload && payload.book_catalog) {
			arr = flattenLessonsFromMergedBook(payload)
		}
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
			.filter((it) => it && (it.title || it.content || renjiaoLessonHasSyncChars(it)))
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
 * 是否含课本同步用的识字表 / 写字表 / 拼音字母项（不含词语表 word_terms）
 * @param {Record<string, unknown>} item loadRenjiaoTextbookTexts 返回的单条
 */
export function renjiaoLessonHasSyncChars(item) {
	if (!item || typeof item !== 'object') return false
	const lit = normalizeCharPairList(item.literacy_chars)
	const wri = normalizeCharPairList(item.writing_chars)
	const py = buildLessonPinyinItemsFromRenjiaoItem(item)
	return lit.length > 0 || wri.length > 0 || py.length > 0
}

/**
 * 只保留有识字、写字或拼音字母项的课文（顺序与 JSON 一致）
 * @param {Array<Record<string, unknown>>} rows
 */
export function filterRenjiaoTextbookSyncLessons(rows) {
	if (!Array.isArray(rows)) return []
	return rows.filter(renjiaoLessonHasSyncChars)
}

/**
 * 本课拼音字母/音节点读列表
 * @param {Record<string, unknown>} item
 * @returns {string[]}
 */
export function buildLessonPinyinItemsFromRenjiaoItem(item) {
	if (!item || typeof item !== 'object') return []
	const raw = item.pinyin_items
	if (!Array.isArray(raw)) return []
	const out = []
	const seen = Object.create(null)
	for (const x of raw) {
		const s = String(x == null ? '' : x).trim()
		if (!s || seen[s]) continue
		seen[s] = 1
		out.push(s)
	}
	return out
}

/**
 * 同步课列表中、当前课次之前各课的拼音项（去重保序）
 * @param {Array<Record<string, unknown>>} syncLessons filterRenjiaoTextbookSyncLessons 结果
 * @param {number} currentIdx 当前课在 syncLessons 中的下标
 * @returns {string[]}
 */
export function collectPriorLessonPinyinSymbols(syncLessons, currentIdx) {
	const idx = Math.floor(Number(currentIdx))
	if (!Array.isArray(syncLessons) || !Number.isFinite(idx) || idx <= 0) return []
	const seen = Object.create(null)
	const out = []
	for (let i = 0; i < idx; i++) {
		const items = buildLessonPinyinItemsFromRenjiaoItem(syncLessons[i])
		for (const s of items) {
			if (!s || seen[s]) continue
			seen[s] = 1
			out.push(s)
		}
	}
	return out
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
