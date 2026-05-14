import { renjiaoTextbookJsonFile } from '@/constants/renjiao-textbook-filenames.js'

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

/**
 * App 端 uni.request 不接受 file://，static 下 JSON 需走 5+ 本地文件读取。
 * @param {string} url 须为 /static/... 形式
 */
function readStaticTextAppPlus(url) {
	return new Promise((resolve, reject) => {
		if (typeof plus === 'undefined' || !plus.io || typeof url !== 'string' || !url.startsWith('/static/')) {
			reject(new Error('readStaticTextAppPlus: not app or bad url'))
			return
		}
		const fullPath = `_www${url}`
		plus.io.resolveLocalFileSystemURL(
			fullPath,
			(entry) => {
				entry.file(
					(file) => {
						try {
							const reader = new plus.io.FileReader()
							reader.onloadend = (evt) => {
								resolve(String((evt.target && evt.target.result) || ''))
							}
							reader.onerror = () => reject(new Error('FileReader error'))
							reader.readAsText(file, 'utf-8')
						} catch (err) {
							reject(err)
						}
					},
					reject
				)
			},
			reject
		)
	})
}

function requestText(url) {
	return new Promise((resolve, reject) => {
		if (typeof plus !== 'undefined' && plus.io && typeof url === 'string' && url.startsWith('/static/')) {
			readStaticTextAppPlus(url).then(resolve).catch(reject)
			return
		}
		uni.request({
			url,
			method: 'GET',
			responseType: 'text',
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(String(res.data || ''))
					return
				}
				reject(new Error(`HTTP ${res.statusCode}`))
			},
			fail: reject
		})
	})
}

/**
 * 读取 static/booktext/renjiaoban 中的统编语文课文
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
		if (!text) throw lastError || new Error('empty textbook json')
		const arr = JSON.parse(text)
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
