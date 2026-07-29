/**
 * 听音选字：从课内字池中挑「形近、读音不同」的干扰项。
 */
import cnchar from '@/utils/cnchar-setup.js'
import { DICTIONARY_DETAIL_MAP } from '@/data/dictionary-detail.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'

function normDisplayPinyin(raw, hanzi) {
	let s = String(raw || '')
		.replace(/\s+/g, ' ')
		.trim()
	if (!s && hanzi) {
		try {
			s = spellDisplayString(hanzi, 'poly', 'tone', 'array', 'low') || ''
		} catch (_) {
			s = ''
		}
	}
	if (Array.isArray(s)) s = s.filter(Boolean).join(' ')
	return s && s !== '-' ? s : ''
}

const META_CACHE = Object.create(null)

/** 常见形近字组（教材易混） */
const VISUAL_NEAR_GROUPS = [
	['人', '入', '八'],
	['土', '士', '王', '玉'],
	['己', '已', '巳'],
	['未', '末'],
	['日', '目', '白', '自'],
	['田', '由', '甲', '申'],
	['鸟', '乌'],
	['干', '千', '于'],
	['木', '本', '术'],
	['大', '太', '天', '夫'],
	['问', '间', '门'],
	['休', '体', '本'],
	['刀', '力'],
	['无', '天'],
	['午', '牛', '生'],
	['毛', '手'],
	['石', '右'],
	['左', '右', '有'],
	['云', '去'],
	['今', '令', '冷'],
	['贝', '见'],
	['风', '凤'],
	['气', '汽'],
	['青', '清', '晴', '情', '请', '精'],
	['晴', '情', '请', '清', '青', '精'],
	['湖', '胡'],
	['泡', '炮'],
	['抱', '包', '饱'],
	['他', '地', '池'],
	['她', '他'],
	['哪', '那'],
	['低', '底'],
	['在', '再'],
	['做', '作'],
	['坐', '座'],
	['棵', '颗'],
	['园', '圆'],
	['带', '戴'],
	['己', '已'],
	['戊', '戌', '戍'],
	['兔', '免'],
	['免', '兔'],
	['乌', '鸟'],
	['折', '拆'],
	['拔', '拨'],
	['渴', '喝'],
	['治', '冶'],
	['盲', '育'],
	['竞', '竟'],
	['崇', '宗'],
	['折', '拆'],
	['拆', '折']
]

const TONE_VOWEL = {
	ā: 'a',
	á: 'a',
	ǎ: 'a',
	à: 'a',
	ē: 'e',
	é: 'e',
	ě: 'e',
	è: 'e',
	ī: 'i',
	í: 'i',
	ǐ: 'i',
	ì: 'i',
	ō: 'o',
	ó: 'o',
	ǒ: 'o',
	ò: 'o',
	ū: 'u',
	ú: 'u',
	ǔ: 'u',
	ù: 'u',
	ǖ: 'v',
	ǘ: 'v',
	ǚ: 'v',
	ǜ: 'v',
	ü: 'v'
}

function barePinyinSyllable(syl) {
	let s = String(syl || '')
		.toLowerCase()
		.trim()
		.replace(/[1-5]$/, '')
	for (const [k, v] of Object.entries(TONE_VOWEL)) {
		s = s.split(k).join(v)
	}
	return s
}

/** 读音不同（去调后也不相同） */
export function readingsDifferent(rowA, rowB, spellFn) {
	const spell = typeof spellFn === 'function' ? spellFn : () => ''
	const pyA =
		normDisplayPinyin(rowA.pinyin, rowA.hanzi) ||
		normDisplayPinyin(spell(rowA.hanzi), rowA.hanzi)
	const pyB =
		normDisplayPinyin(rowB.pinyin, rowB.hanzi) ||
		normDisplayPinyin(spell(rowB.hanzi), rowB.hanzi)
	if (!pyA || !pyB) return true
	if (pyA === pyB) return false
	const partsA = pyA.split(/\s+/).map(barePinyinSyllable).filter(Boolean)
	const partsB = pyB.split(/\s+/).map(barePinyinSyllable).filter(Boolean)
	if (!partsA.length || !partsB.length) return pyA !== pyB
	if (partsA.join('|') === partsB.join('|')) return false
	return true
}

function visualNearBonus(a, b) {
	if (!a || !b || a === b) return 0
	for (const group of VISUAL_NEAR_GROUPS) {
		if (group.includes(a) && group.includes(b)) return 58
	}
	return 0
}

/** 教材形近字组中的同伴（不含自身） */
export function getVisualNearPeers(hanzi) {
	const h = String(hanzi || '').trim().charAt(0)
	if (!h) return []
	const seen = Object.create(null)
	const out = []
	for (const group of VISUAL_NEAR_GROUPS) {
		if (!group.includes(h)) continue
		for (const c of group) {
			const ch = String(c || '').trim().charAt(0)
			if (!ch || ch === h || seen[ch]) continue
			seen[ch] = 1
			out.push(ch)
		}
	}
	return out
}

function cncharRadicalMeta(hanzi) {
	try {
		if (typeof cnchar.radical !== 'function') return null
		const arr = cnchar.radical(hanzi)
		const first = Array.isArray(arr) && arr[0]
		if (!first || !first.radical) return null
		let structure = String(first.struct || '')
			.replace(/结构$/u, '')
			.trim()
		return {
			radical: first.radical,
			structure: structure || null,
			strokeCount:
				typeof first.radicalCount === 'number' && first.radicalCount > 0
					? first.radicalCount
					: null
		}
	} catch (_) {
		return null
	}
}

function cncharStrokeCount(hanzi) {
	try {
		const n = cnchar.stroke(hanzi)
		if (typeof n === 'number' && n > 0 && Number.isFinite(n)) return n
	} catch (_) {}
	return null
}

function cncharStrokeShapes(hanzi) {
	try {
		const rows = cnchar.stroke(hanzi, 'order', 'shape')
		if (Array.isArray(rows) && rows[0] && Array.isArray(rows[0])) {
			return rows[0].join('')
		}
	} catch (_) {}
	return ''
}

function getHanziMeta(hanzi) {
	const h = String(hanzi || '').charAt(0)
	if (!h) return null
	if (META_CACHE[h]) return META_CACHE[h]
	const local = DICTIONARY_DETAIL_MAP[h]
	const rad = cncharRadicalMeta(h)
	const strokeCount = cncharStrokeCount(h) || local?.strokes || null
	const meta = {
		hanzi: h,
		radical: rad?.radical || local?.radical || '',
		structure: rad?.structure || local?.structure || '',
		strokeCount,
		strokeShapes: cncharStrokeShapes(h)
	}
	META_CACHE[h] = meta
	return meta
}

function bigramOverlapRatio(a, b) {
	if (!a || !b) return 0
	if (a.length < 2 || b.length < 2) return a === b ? 1 : 0
	const setB = new Set()
	for (let i = 0; i < b.length - 1; i++) setB.add(b.slice(i, i + 2))
	let match = 0
	for (let i = 0; i < a.length - 1; i++) {
		if (setB.has(a.slice(i, i + 2))) match++
	}
	const denom = Math.max(a.length, b.length) - 1
	return match / Math.max(1, denom)
}

/** 0–100，越高越像 */
export function shapeSimilarityScore(hanziA, hanziB) {
	if (!hanziA || !hanziB || hanziA === hanziB) return 0
	const ma = getHanziMeta(hanziA)
	const mb = getHanziMeta(hanziB)
	if (!ma || !mb) return visualNearBonus(hanziA, hanziB)

	let score = visualNearBonus(hanziA, hanziB)
	if (ma.radical && ma.radical === mb.radical) score += 42
	if (ma.structure && mb.structure && ma.structure === mb.structure) score += 22
	const sa = ma.strokeCount
	const sb = mb.strokeCount
	if (sa && sb) {
		const d = Math.abs(sa - sb)
		if (d === 0) score += 16
		else if (d === 1) score += 11
		else if (d === 2) score += 5
	}
	const shapeSim = bigramOverlapRatio(ma.strokeShapes, mb.strokeShapes)
	score += Math.round(shapeSim * 28)
	return Math.min(100, score)
}

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

/**
 * @param {{ hanzi: string, pinyin?: string }} target
 * @param {Array<{ hanzi: string, pinyin?: string }>} pool
 * @param {number} count
 * @param {Function} [spellFn]
 * @returns {string[]} 干扰项汉字（不含 target）
 */
export function pickShapeConfusableHanzi(target, pool, count, spellFn) {
	const need = Math.max(0, Math.floor(Number(count) || 0))
	if (!need || !target?.hanzi) return []
	const t = target.hanzi
	const candidates = (pool || []).filter(
		(r) => r && r.hanzi && r.hanzi !== t && readingsDifferent(target, r, spellFn)
	)
	if (!candidates.length) return []

	const ranked = candidates
		.map((r) => ({
			row: r,
			score: shapeSimilarityScore(t, r.hanzi)
		}))
		.sort((a, b) => b.score - a.score)

	const picked = []
	const used = new Set()

	const tryPick = (minScore) => {
		const tier = shuffle(
			ranked.filter((x) => x.score >= minScore && !used.has(x.row.hanzi))
		)
		for (const x of tier) {
			if (picked.length >= need) break
			picked.push(x.row.hanzi)
			used.add(x.row.hanzi)
		}
	}

	tryPick(35)
	tryPick(18)
	tryPick(0)

	for (const x of shuffle(ranked)) {
		if (picked.length >= need) break
		if (used.has(x.row.hanzi)) continue
		picked.push(x.row.hanzi)
		used.add(x.row.hanzi)
	}

	return picked.slice(0, need)
}
