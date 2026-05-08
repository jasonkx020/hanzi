import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import {
	DICTIONARY_DETAIL_MAP,
	RADICAL_HINT_MAP,
	STRUCTURE_HINT_MAP,
	fallbackDictionaryDetail
} from '@/data/dictionary-detail.js'
import { getCachedDictionaryDetail, setCachedDictionaryDetail } from '@/utils/dictionary-cache.js'

const STROKE_CACHE = Object.create(null)
const HANZI_WRITER_DATA_BASE = 'https://unpkg.com/hanzi-writer-data@latest'

function inferRadical(hanzi) {
	if (RADICAL_HINT_MAP[hanzi]) return RADICAL_HINT_MAP[hanzi]
	return hanzi || '待补充'
}

function inferStructure(hanzi) {
	if (STRUCTURE_HINT_MAP[hanzi]) return STRUCTURE_HINT_MAP[hanzi]
	return '独体'
}

function buildWords(hanzi, row, allRows) {
	const hit = DICTIONARY_DETAIL_MAP[hanzi]
	if (hit && Array.isArray(hit.words) && hit.words.length) return hit.words
	const sameLesson = allRows
		.filter((r) => String(r.lesson_hint || '') === String(row?.lesson_hint || '') && String(r.hanzi || '') !== hanzi)
		.map((r) => String(r.hanzi || '').trim())
		.filter(Boolean)
	const words = []
	for (let i = 0; i < Math.min(3, sameLesson.length); i++) {
		words.push(`${hanzi}${sameLesson[i]}`)
	}
	if (!words.length) words.push(`${hanzi}字`)
	return words
}

function fetchJson(url) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			success(res) {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data || {})
					return
				}
				reject(new Error(`request failed: ${res.statusCode}`))
			},
			fail(err) {
				reject(err)
			}
		})
	})
}

async function inferStrokeCount(hanzi) {
	if (!hanzi) return '待补充'
	if (STROKE_CACHE[hanzi] !== undefined) return STROKE_CACHE[hanzi]
	const local = DICTIONARY_DETAIL_MAP[hanzi]
	if (local && Number.isFinite(Number(local.strokes))) {
		const n = Number(local.strokes)
		STROKE_CACHE[hanzi] = n
		return n
	}
	try {
		const url = `${HANZI_WRITER_DATA_BASE}/${encodeURIComponent(hanzi)}.json`
		const data = await fetchJson(url)
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
	const target = String(hanzi || '').trim()
	if (!target) return null
	const cached = getCachedDictionaryDetail(target)
	if (cached) {
		return {
			hanzi: target,
			pinyin: cached.pinyin || '',
			lessonHint: hint || cached.lessonHint || '',
			radical: cached.radical,
			structure: cached.structure,
			strokes: cached.strokes,
			words: Array.isArray(cached.words) && cached.words.length ? cached.words : ['组词待补充']
		}
	}
	const rows = await queryCurriculumChars(getCurriculumPrefs())
	const hit = rows.find((r) => String(r.hanzi || '') === target) || null
	const local = DICTIONARY_DETAIL_MAP[target]
	const fallback = fallbackDictionaryDetail()
	const radical = local?.radical || inferRadical(target) || fallback.radical
	const structure = local?.structure || inferStructure(target) || fallback.structure
	const strokes = await inferStrokeCount(target)
	const words = buildWords(target, hit, rows)
	const entry = {
		hanzi: target,
		pinyin: hit?.pinyin || '',
		lessonHint: hint || hit?.lesson_hint || '',
		radical,
		structure,
		strokes,
		words
	}
	setCachedDictionaryDetail(target, entry)
	return entry
}

export async function getDictionaryRelated(hanzi, hint = '') {
	const target = String(hanzi || '').trim()
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
