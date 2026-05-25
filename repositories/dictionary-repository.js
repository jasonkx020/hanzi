import cnchar from '@/utils/cnchar-setup.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import {
	DICTIONARY_DETAIL_MAP,
	RADICAL_HINT_MAP,
	STRUCTURE_HINT_MAP,
	fallbackDictionaryDetail
} from '@/data/dictionary-detail.js'
import { getCachedDictionaryDetail, setCachedDictionaryDetail } from '@/utils/dictionary-cache.js'
import { formatStrokeLabelDisplay } from '@/data/stroke-name-pinyin.js'
import { loadHanziWriterCharData } from '@/utils/hanzi-writer-data-loader.js'

const STROKE_CACHE = Object.create(null)

/** 拼音文案：折叠空白 trim */
function trimPinyinText(s) {
	if (s == null || s === '') return ''
	return String(s).replace(/\s+/g, ' ').trim()
}

function inferRadicalFallback(hanzi) {
	if (RADICAL_HINT_MAP[hanzi]) return RADICAL_HINT_MAP[hanzi]
	return hanzi || '待补充'
}

/** cnchar-radical：单字部首与结构 */
function cncharRadicalRow(char) {
	try {
		if (typeof cnchar.radical !== 'function') return null
		const arr = cnchar.radical(char)
		const first = Array.isArray(arr) && arr[0]
		if (!first || !first.radical) return null
		let struct = String(first.struct || '').replace(/结构$/u, '').trim()
		return {
			radical: first.radical,
			structure: struct || null,
			radicalCount: first.radicalCount
		}
	} catch (_) {
		return null
	}
}

/** 用于部首筛选（优先 cnchar-radical） */
export function getRadicalLabel(hanzi) {
	const h = String(hanzi || '').trim().charAt(0)
	if (!h) return '—'
	const row = cncharRadicalRow(h)
	if (row && row.radical) return row.radical
	const local = DICTIONARY_DETAIL_MAP[h]
	if (local && local.radical) return local.radical
	return inferRadicalFallback(h)
}

function inferStructureFallback(hanzi) {
	if (STRUCTURE_HINT_MAP[hanzi]) return STRUCTURE_HINT_MAP[hanzi]
	return '独体'
}

function cncharStrokeCount(char) {
	try {
		const n = cnchar.stroke(char)
		if (typeof n === 'number' && n > 0 && Number.isFinite(n)) return n
	} catch (_) {}
	return null
}

/** 笔顺笔画字形（如 一一丿㇏），依赖 cnchar-order */
function cncharStrokeShapes(char) {
	try {
		const rows = cnchar.stroke(char, 'order', 'shape')
		if (Array.isArray(rows) && rows[0] && Array.isArray(rows[0])) {
			return rows[0].join('')
		}
	} catch (_) {}
	return ''
}

/** 笔顺笔画名称（如 横 横 撇 捺）；| 同义只保留一条叫法 */
function cncharStrokeNames(char) {
	try {
		const rows = cnchar.stroke(char, 'order', 'name')
		if (Array.isArray(rows) && rows[0] && Array.isArray(rows[0])) {
			return rows[0]
				.map((s) => formatStrokeLabelDisplay(String(s || '').trim()))
				.filter(Boolean)
				.join(' ')
		}
	} catch (_) {}
	return ''
}

function cncharSpellPoly(char) {
	try {
		return spellDisplayString(char, 'tone', 'poly', 'low') || ''
	} catch (_) {
		return ''
	}
}

function cncharWordsList(char, limit = 18) {
	try {
		if (typeof cnchar.words !== 'function') return []
		const w = cnchar.words(char)
		if (!Array.isArray(w)) return []
		return w.slice(0, limit).map(String).filter(Boolean)
	} catch (_) {
		return []
	}
}

function cncharExplainText(char) {
	try {
		if (typeof cnchar.explain !== 'function') return ''
		const ex = cnchar.explain(char)
		if (Array.isArray(ex)) return ex.filter(Boolean).join('；')
		if (typeof ex === 'string') return ex
	} catch (_) {}
	return ''
}

function cncharTradForm(char) {
	try {
		if (typeof cnchar.convert !== 'function') return ''
		const t = cnchar.convert(char, 'trad')
		const s = t != null ? String(t).trim() : ''
		return s && s !== char ? s : ''
	} catch (_) {
		return ''
	}
}

function mergeWordLists(primary, secondary, limit = 18) {
	const out = []
	const seen = Object.create(null)
	for (const w of primary) {
		const k = String(w || '').trim()
		if (!k || seen[k]) continue
		seen[k] = 1
		out.push(k)
		if (out.length >= limit) return out
	}
	for (const w of secondary) {
		const k = String(w || '').trim()
		if (!k || seen[k]) continue
		seen[k] = 1
		out.push(k)
		if (out.length >= limit) return out
	}
	return out.length ? out : ['暂无组词']
}

function buildWordsFallback(hanzi, row, allRows) {
	const hit = DICTIONARY_DETAIL_MAP[hanzi]
	if (hit && Array.isArray(hit.words) && hit.words.length) return hit.words
	const sameLesson = allRows
		.filter(
			(r) =>
				String(r.lesson_hint || '') === String(row?.lesson_hint || '') &&
				String(r.hanzi || '') !== hanzi
		)
		.map((r) => String(r.hanzi || '').trim())
		.filter(Boolean)
	const words = []
	for (let i = 0; i < Math.min(3, sameLesson.length); i++) {
		words.push(`${hanzi}${sameLesson[i]}`)
	}
	if (!words.length) words.push(`${hanzi}字`)
	return words
}

async function inferStrokeCountNetwork(hanzi) {
	if (!hanzi) return '待补充'
	if (STROKE_CACHE[hanzi] !== undefined) return STROKE_CACHE[hanzi]
	const local = DICTIONARY_DETAIL_MAP[hanzi]
	if (local && Number.isFinite(Number(local.strokes))) {
		const n = Number(local.strokes)
		STROKE_CACHE[hanzi] = n
		return n
	}
	try {
		const data = await loadHanziWriterCharData(hanzi)
		const n = Array.isArray(data?.strokes) ? data.strokes.length : NaN
		if (Number.isFinite(n) && n > 0) {
			STROKE_CACHE[hanzi] = n
			return n
		}
	} catch (_) {}
	STROKE_CACHE[hanzi] = '待补充'
	return STROKE_CACHE[hanzi]
}

export async function getDictionaryEntry(hanzi, hint = '') {
	const target = String(hanzi || '').trim().charAt(0)
	if (!target) return null

	const cached = getCachedDictionaryDetail(target)
	if (cached && cached.source === 'cnchar_v2') {
		const radRowCached = cncharRadicalRow(target)
		return {
			hanzi: target,
			pinyin: trimPinyinText(cached.pinyin || ''),
			lessonHint: hint || cached.lessonHint || '',
			radical:
				radRowCached?.radical ||
				cached.radical ||
				inferRadicalFallback(target) ||
				fallbackDictionaryDetail().radical,
			structure:
				radRowCached?.structure ||
				cached.structure ||
				inferStructureFallback(target) ||
				fallbackDictionaryDetail().structure,
			strokes: cached.strokes,
			words: Array.isArray(cached.words) && cached.words.length ? cached.words : ['暂无组词'],
			explainText: cached.explainText || '',
			strokeShapes: cached.strokeShapes || '',
			strokeNames: cached.strokeNames || '',
			tradForm: cached.tradForm || ''
		}
	}

	const rows = await queryCurriculumChars(getCurriculumPrefs())
	const hit = rows.find((r) => String(r.hanzi || '').trim() === target) || null
	const local = DICTIONARY_DETAIL_MAP[target]
	const fallback = fallbackDictionaryDetail()

	const radRow = cncharRadicalRow(target)
	/** 部首、结构以 cnchar-radical 为准，本地表仅作缺数据时的补充 */
	const radical =
		radRow?.radical || local?.radical || inferRadicalFallback(target) || fallback.radical
	const structure =
		radRow?.structure ||
		local?.structure ||
		inferStructureFallback(target) ||
		fallback.structure

	let strokes = cncharStrokeCount(target)
	if (strokes == null) strokes = await inferStrokeCountNetwork(target)

	const cnWords = cncharWordsList(target, 24)
	const fbWords = buildWordsFallback(target, hit, rows)
	const words = mergeWordLists(cnWords, fbWords, 18)

	const pinyinRaw =
		String(hit?.pinyin || '').trim() || cncharSpellPoly(target) || ''
	const pinyin = trimPinyinText(pinyinRaw)

	const entry = {
		hanzi: target,
		pinyin,
		lessonHint: hint || hit?.lesson_hint || '',
		radical,
		structure,
		strokes,
		words,
		explainText: cncharExplainText(target),
		strokeShapes: cncharStrokeShapes(target),
		strokeNames: cncharStrokeNames(target),
		tradForm: cncharTradForm(target),
		source: 'cnchar_v2'
	}

	setCachedDictionaryDetail(target, entry)
	return entry
}

export async function getDictionaryRelated(hanzi, hint = '') {
	const target = String(hanzi || '').trim().charAt(0)
	const rows = await queryCurriculumChars(getCurriculumPrefs())
	const sameLesson = rows
		.filter((r) => String(r.lesson_hint || '') === String(hint || '') && String(r.hanzi || '') !== target)
		.map((r) => String(r.hanzi || '').trim())
		.filter(Boolean)
		.slice(0, 8)
	const similar = rows
		.map((r) => String(r.hanzi || '').trim())
		.filter((h) => h && h !== target)
		.filter((h) => {
			const pyA = String(rows.find((x) => String(x.hanzi) === target)?.pinyin || '')
			const pyB = String(rows.find((x) => String(x.hanzi) === h)?.pinyin || '')
			return pyA && pyB && pyA[0] === pyB[0]
		})
		.slice(0, 8)
	return { sameLesson, similar }
}
