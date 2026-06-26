/**
 * @file rebuild-grade5-up-catalog.mjs
 * @module scripts
 * @description 源文件：rebuild-grade5-up-catalog.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 按 grade5-up-catalog.json（units + children 子目录）重建 grade5-up.json。
 * 课文主文件仍为扁平数组：组课父篇 + 子篇（子篇带 parentTitle）。
 *
 * 运行：node scripts/rebuild-grade5-up-catalog.mjs
 * 建议随后：npm run book:merge-full
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const bookPath = path.join(root, 'static', 'booktext', 'renjiaoban', 'grade5-up.json')
const catalogPath = path.join(root, 'static', 'booktext', 'renjiaoban', 'grade5-up-catalog.json')

const TITLE_ALIASES = new Map([
	['快乐读书吧：从前有座山', ['快乐读书吧']],
	['己亥杂诗', ['已亥杂诗']],
	['习作：即景', ['习作： 即景', '习作：____即景']],
	['习作：“漫画”老师', ['习作:"漫画"老师', '习作："漫画" 老师']]
])

function normTitleKey(t) {
	return String(t || '')
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[＊*]/g, '*')
}

function buildLookup(oldRows) {
	const map = new Map()
	for (const row of oldRows) {
		const key = normTitleKey(row.title)
		if (!map.has(key)) map.set(key, row)
	}
	for (const [canonical, aliases] of TITLE_ALIASES) {
		const canonKey = normTitleKey(canonical)
		let row = map.get(canonKey)
		if (!row) {
			for (const a of aliases) {
				row = map.get(normTitleKey(a))
				if (row) break
			}
		}
		if (!row) continue
		map.set(canonKey, row)
		for (const a of aliases) map.set(normTitleKey(a), row)
	}
	return map
}

/** @param {object} catalogDoc */
function flattenCatalogEntries(catalogDoc) {
	const units = catalogDoc.units
	if (!Array.isArray(units)) {
		throw new Error('grade5-up-catalog.json 需使用 units[]；旧版 entries[] 请先改为嵌套目录')
	}
	const flat = []
	for (const u of units) {
		const unitMeta = {
			unit: u.unit,
			unitName: u.unitName,
			unitTheme: u.unitTheme
		}
		for (const entry of u.entries || []) {
			flat.push({ ...unitMeta, ...entry, _isParent: !!(entry.children && entry.children.length) })
			if (Array.isArray(entry.children)) {
				for (const child of entry.children) {
					flat.push({
						...unitMeta,
						kind: child.kind,
						catalogLessonNo: entry.catalogLessonNo,
						lessonInUnit: entry.lessonInUnit,
						lessonInGroup: child.lessonInGroup,
						parentTitle: entry.title,
						title: child.title,
						bookPage: child.bookPage,
						_isChild: true
					})
				}
			}
		}
	}
	return flat
}

function pickPayload(meta, lookup) {
	const key = normTitleKey(meta.title)
	let src = lookup.get(key)
	if (!src) {
		for (const [canon, aliases] of TITLE_ALIASES) {
			if (normTitleKey(canon) === key) {
				src = lookup.get(normTitleKey(aliases[0]))
				break
			}
		}
	}
	const content = src && src.content ? String(src.content) : ''
	const row = {
		unit: meta.unit,
		unitName: meta.unitName,
		unitTheme: meta.unitTheme,
		kind: meta.kind,
		catalogLessonNo: meta.catalogLessonNo,
		lessonInUnit: meta.lessonInUnit,
		title: meta.title,
		bookPage: meta.bookPage,
		content,
		literacy_chars: [],
		writing_chars: [],
		word_terms: []
	}
	if (meta.parentTitle) row.parentTitle = meta.parentTitle
	if (meta.lessonInGroup != null) row.lessonInGroup = meta.lessonInGroup
	return row
}

function main() {
	const catalogDoc = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
	const flatMeta = flattenCatalogEntries(catalogDoc)

	const oldRows = JSON.parse(fs.readFileSync(bookPath, 'utf8'))
	if (!Array.isArray(oldRows)) throw new Error('invalid grade5-up.json')
	const lookup = buildLookup(oldRows)
	const out = flatMeta.map((meta) => pickPayload(meta, lookup))

	const used = new Set(flatMeta.map((m) => normTitleKey(m.title)))
	const orphans = oldRows.filter((r) => !used.has(normTitleKey(r.title)))
	if (orphans.length) {
		console.warn(
			'[catalog] 未编入目录的旧条目:',
			orphans.map((r) => r.title).join('；')
		)
	}

	const unitCount = catalogDoc.units.length
	const groupCount = catalogDoc.units.reduce(
		(n, u) => n + (u.entries || []).filter((e) => e.children && e.children.length).length,
		0
	)

	fs.writeFileSync(bookPath, `${JSON.stringify(out, null, '\t')}\n`, 'utf8')
	console.log('[catalog] units:', unitCount, '组课:', groupCount)
	console.log('[catalog] wrote', bookPath, 'flat entries:', out.length)
	console.log('[catalog] with content:', out.filter((r) => r.content).length)
}

main()
