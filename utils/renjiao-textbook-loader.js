import { renjiaoTextbookJsonFile } from '@/constants/renjiao-textbook-filenames.js'
import { TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
import { readAppStaticText } from '@/utils/read-app-static-text.js'

const STATIC_BOOKTEXT_ROOT = '/static/booktext/renjiaoban/'

/** 课文 JSON 中与目录对应的可选字段（见 static/booktext/renjiaoban/*.json） */
const TEXTBOOK_EXTRA_KEYS = [
	'unit',
	'unitName',
	'unitTheme',
	'kind',
	'catalogLessonNo',
	'lessonInUnit',
	'lesson_key',
	'is_optional_read',
	'sub_articles',
	'write_chars',
	'word_chars',
	/** 与同册识字表该课组对齐的 { hanzi, pinyin }[] */
	'literacy_chars',
	/** @deprecated 旧合并文件字段，优先使用 literacy_chars */
	'read_chars',
	/** 与同册写字表该课组对齐 */
	'writing_chars',
	/** 与同册词语表该课组对齐（hanzi 可为多字词） */
	'word_terms'
]

function buildFileName(grade, semester) {
	return renjiaoTextbookJsonFile(grade, semester, 'main')
}

/** @param {number} grade @param {string} semester */
function buildMainFileNameCandidates(grade, semester) {
	const g = Number(grade)
	const sem = semester === '下' ? 'down' : 'up'
	if (g === 0) return ['preschool-bridge.json']
	if (!Number.isFinite(g) || g < 1 || g > 6) return []
	const primary = renjiaoTextbookJsonFile(grade, semester, 'main')
	const legacy = `grade${g}-${sem}.json`
	if (primary === legacy) return [primary]
	return [primary, legacy]
}

/**
 * 课本同步学是否走 booktext JSON（统编 1～6 册 + 幼小衔接 preschool-bridge）
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

function collectLearnCheckKeysFromCharRows(rows) {
	const set = new Set()
	for (const r of rows || []) {
		const c = String(r && r.hanzi != null ? r.hanzi : '')
			.trim()
			.charAt(0)
		const m = c.match(/[\u4e00-\u9fff]/)
		if (m) set.add(m[0])
	}
	return Array.from(set)
}

/**
 * 课本同步学课次列表（与 textbook.vue 卡片字段一致，顺序同 JSON）
 * @param {Array<Record<string, unknown>>} raw loadRenjiaoTextbookTexts 返回值
 */
export function buildTextbookSyncLessonList(raw) {
	const syncLessons = filterRenjiaoTextbookSyncLessons(raw)
	return syncLessons.map((item, idx) => {
		const charRows = buildLessonCharRowsFromRenjiaoItem(item)
		const litRows = buildLiteracyOnlyCharRowsFromRenjiaoItem(item)
		const learnCheckKeys = collectLearnCheckKeysFromCharRows(litRows)
		return {
			hint: String(item.title || `第${idx + 1}课`),
			count: charRows.length,
			rjIdx: idx,
			learnCheckKeys,
			doneBadgeKind: learnCheckKeys.length ? 'literacy' : '',
			doneBadgeText: ''
		}
	})
}

/** 将 uni.request / 本地读出的 payload 统一为可 JSON.parse 的字符串或已是对象/数组 */
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

function parseTextbookJsonPayload(payload) {
	if (Array.isArray(payload)) return payload
	if (payload && typeof payload === 'object' && payload.book_catalog) return payload
	const text = normalizeTextbookJsonPayload(payload)
	if (!text) return null
	const trimmed = text.trim()
	if (!trimmed || trimmed === '[object Object]') return null
	const parsed = JSON.parse(trimmed)
	return parsed
}

function getUnitOrder(bookCatalog) {
	if (!bookCatalog || typeof bookCatalog !== 'object') return []
	return Object.keys(bookCatalog).filter((k) => k.startsWith('第') && k.includes('单元'))
}

/**
 * 合并版课本：从 book_catalog 展平为课文行（顺序与目录一致）
 * @param {Record<string, unknown>} book
 * @returns {Array<Record<string, unknown>>}
 */
export function flattenLessonsFromMergedBook(book) {
	if (!book || !book.book_catalog) return []
	const rows = []
	for (let u = 0; u < getUnitOrder(book.book_catalog).length; u++) {
		const unitName = getUnitOrder(book.book_catalog)[u]
		const unit = book.book_catalog[unitName]
		if (!unit || !Array.isArray(unit.article_list)) continue
		for (let i = 0; i < unit.article_list.length; i++) {
			const a = unit.article_list[i]
			const row = articleToFlattenedLesson(a, unitName, unit)
			if (row) rows.push(row)
		}
	}
	return rows
}

function articleToFlattenedLesson(a, unitName, unit) {
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
		unitName,
		unitTheme: unit.type,
		kind: a.kind || (a.sort != null ? 'lesson' : a.type),
		catalogLessonNo: a.sort,
		lessonInUnit: a.lesson_in_unit,
		lesson_key: a.lesson_key,
		is_optional_read: a.is_optional_read === true,
		read_chars: readChars,
		write_chars: writeChars,
		word_chars: wordChars,
		literacy_chars: readChars,
		writing_chars: writeChars,
		word_terms: wordChars
	}
	if (subs.length) row.sub_articles = subs
	return row
}

function mapLessonRow(it) {
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
}

function requestText(url) {
	return new Promise((resolve, reject) => {
		if (typeof plus !== 'undefined' && plus.io && typeof url === 'string' && url.startsWith('/static/')) {
			readAppStaticText(url).then(resolve).catch(reject)
			return
		}
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
					if (res.data && typeof res.data === 'object') {
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

/** 进程内缓存：同册教材 JSON 只读一次 */
const textbookPayloadCache = new Map()

function textbookPayloadCacheKey(grade, semester) {
	const g = Number(grade)
	const sem = semester === '下' ? '下' : '上'
	return `${g}-${sem}`
}

async function loadTextbookPayload({ grade, semester }) {
	const cacheKey = textbookPayloadCacheKey(grade, semester)
	if (textbookPayloadCache.has(cacheKey)) {
		return textbookPayloadCache.get(cacheKey)
	}
	const fileNames = buildMainFileNameCandidates(grade, semester)
	if (!fileNames.length) return null
	let text = ''
	let lastError = null
	let loadedName = ''
	for (let f = 0; f < fileNames.length; f++) {
		const url = `${STATIC_BOOKTEXT_ROOT}${fileNames[f]}`
		try {
			text = await requestText(url)
			if (text !== '' && text != null) {
				loadedName = fileNames[f]
				break
			}
		} catch (e) {
			lastError = e
		}
	}
	if (text === '' || text == null) {
		throw lastError || new Error(`empty textbook json (${fileNames.join(', ')})`)
	}
	if (loadedName && loadedName !== fileNames[0]) {
		console.info('[renjiao-textbook-loader] using fallback file', loadedName)
	}
	const payload = parseTextbookJsonPayload(text)
	textbookPayloadCache.set(cacheKey, payload)
	return payload
}

/**
 * 读取合并版课本（含 book_catalog），供侧栏目录按单元加载
 * @returns {Promise<Record<string, unknown>|null>}
 */
export async function loadRenjiaoTextbookCatalog({ grade, semester }) {
	try {
		const payload = await loadTextbookPayload({ grade, semester })
		if (payload && payload.book_catalog) return payload
		return null
	} catch (e) {
		console.warn('[renjiao-textbook-loader] catalog load failed', grade, semester, e)
		return null
	}
}

/**
 * 读取 static/booktext/renjiaoban 中的统编语文课文（支持旧版数组与合并版 book_catalog）
 */
export async function loadRenjiaoTextbookTexts({ grade, semester }) {
	const fileName = buildFileName(grade, semester)
	if (!fileName) return []
	try {
		const payload = await loadTextbookPayload({ grade, semester })
		let arr = []
		if (Array.isArray(payload)) {
			arr = payload
		} else if (payload && payload.book_catalog) {
			arr = flattenLessonsFromMergedBook(payload)
		}
		return arr
			.map(mapLessonRow)
			.filter((it) => it && (it.title || it.content || (it.sub_articles && it.sub_articles.length)))
	} catch (e) {
		console.warn('[renjiao-textbook-loader] load failed', fileName, e)
		return []
	}
}

function normalizeCharPairList(x) {
	if (!Array.isArray(x)) return []
	return x
}

function pickReadChars(item) {
	if (!item || typeof item !== 'object') return []
	return normalizeCharPairList(item.literacy_chars).length
		? normalizeCharPairList(item.literacy_chars)
		: normalizeCharPairList(item.read_chars)
}

function pickWriteChars(item) {
	if (!item || typeof item !== 'object') return []
	return normalizeCharPairList(item.write_chars).length
		? normalizeCharPairList(item.write_chars)
		: normalizeCharPairList(item.writing_chars)
}

/**
 * 是否含课本同步用的识字表 / 写字表（不含词语表 word_terms）
 * @param {Record<string, unknown>} item loadRenjiaoTextbookTexts 返回的单条
 */
export function renjiaoLessonHasSyncChars(item) {
	if (!item || typeof item !== 'object') return false
	const lit = pickReadChars(item)
	const wri = pickWriteChars(item)
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
	const lit = pickReadChars(item)
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
/**
 * 可供「点标题阅读」的课文行（有标题或正文）
 * @param {Array<Record<string, unknown>>} raw
 */
export function filterRenjiaoTextbookReadableTexts(raw) {
	if (!Array.isArray(raw)) return []
	return raw.filter((it) => {
		if (!it || typeof it !== 'object') return false
		const title = String(it.title != null ? it.title : '').trim()
		const content = String(it.content != null ? it.content : '').trim()
		return !!(title || content)
	})
}

export function buildLessonCharRowsFromRenjiaoItem(item) {
	if (!item || typeof item !== 'object') return []
	const litPart = buildLiteracyOnlyCharRowsFromRenjiaoItem(item)
	const wri = pickWriteChars(item)
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
