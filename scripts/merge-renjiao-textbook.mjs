/**
 * 以 grade{N}u.json / grade{N}d.json 为目录骨架，合并课文正文 + 识字/写字/词语附录。
 * 附录 groups：section 对应单元 key 中「·」后片段（如「识字」）；lesson 对应目录 sort 或 title（语文园地）。
 *
 * 用法：
 *   node scripts/merge-renjiao-textbook.mjs 4 up          → grade4-up.json（完整 schema）
 *   node scripts/merge-renjiao-textbook.mjs --all-merge    → grade{N}-{up|down}-merge.json（目录原格式）
 *   node scripts/merge-renjiao-textbook.mjs --all          → 各册 grade{N}-{up|down}.json
 *   node scripts/merge-renjiao-textbook.mjs --all-merge --in static/booktext/renjiaoban --out dist/out
 *
 * 目录（默认均为 static/booktext/renjiaoban，相对项目根）：
 *   --in / --input   读取目录、正文、附录 JSON
 *   --out / --output 写入合并结果与 report（可与 --in 不同）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DEFAULT_BOOK_DIR = path.join(ROOT, 'static', 'booktext', 'renjiaoban')

/** @param {string} p */
function resolveDir(p) {
	if (!p || !String(p).trim()) return DEFAULT_BOOK_DIR
	const s = String(p).trim()
	return path.isAbsolute(s) ? path.normalize(s) : path.join(ROOT, s)
}

/**
 * @param {string[]} argv
 * @returns {{ inputDir: string, outputDir: string, args: string[] }}
 */
function parseCliArgs(argv) {
	let inputDir = DEFAULT_BOOK_DIR
	let outputDir = DEFAULT_BOOK_DIR
	/** @type {string[]} */
	const rest = []

	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--in' || a === '--input') {
			const v = argv[++i]
			if (!v) {
				console.error('缺少 --in 路径')
				process.exit(1)
			}
			inputDir = resolveDir(v)
			continue
		}
		if (a === '--out' || a === '--output') {
			const v = argv[++i]
			if (!v) {
				console.error('缺少 --out 路径')
				process.exit(1)
			}
			outputDir = resolveDir(v)
			continue
		}
		const inEq = a.match(/^--(?:in|input)=(.+)$/)
		if (inEq) {
			inputDir = resolveDir(inEq[1])
			continue
		}
		const outEq = a.match(/^--(?:out|output)=(.+)$/)
		if (outEq) {
			outputDir = resolveDir(outEq[1])
			continue
		}
		rest.push(a)
	}

	return { inputDir, outputDir, args: rest }
}

function ensureOutputDir(outputDir) {
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true })
	}
}

const YUANDI_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八']
const GRADE_CN = ['', '一', '二', '三', '四', '五', '六']

/** @type {Record<string, { grade: number, semester: string, catalog: string, text: string, out: string }>} */
const PRESETS = {}

for (let g = 1; g <= 6; g++) {
	const cn = GRADE_CN[g]
	PRESETS[`${g}-up`] = {
		grade: g,
		semester: '上',
		catalog: `grade${g}u.json`,
		text: `${cn}年级上册.json`,
		out: `grade${g}-up.json`
	}
	PRESETS[`${g}-down`] = {
		grade: g,
		semester: '下',
		catalog: `grade${g}d.json`,
		text: `${cn}年级下册.json`,
		out: `grade${g}-down.json`
	}
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

const EMPTY_APPENDIX = { groups: [] }

/**
 * 文件不存在或解析失败时返回 null，合并时对应字段用空值。
 * @param {string} filePath
 * @param {string} label
 * @param {string[]} missingOut
 */
function loadJsonOptional(filePath, label, missingOut) {
	if (!fs.existsSync(filePath)) {
		missingOut.push(label)
		return null
	}
	try {
		return readJson(filePath)
	} catch (e) {
		missingOut.push(`${label}(invalid_json)`)
		return null
	}
}

function defaultCatalogRoot(cfg) {
	return {
		textbook_version_id: '统编(人教版)',
		grade: cfg.grade,
		semester: cfg.semester,
		catalog_note: '',
		book_catalog: {}
	}
}

function writeJson(filePath, data) {
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, 'utf8')
}

function normTitle(raw) {
	return String(raw || '')
		.trim()
		.replace(/\s+/g, '')
		.replace(/^\d+\*?\s+/, '')
		.replace(/\*+$/, '')
}

function parseTitlePrefix(raw) {
	const s = String(raw || '').trim()
	const m = s.match(/^(\d+)\*?\s+(.+)$/)
	if (m) return { lessonNo: m[1], core: normTitle(m[2]) }
	return { lessonNo: null, core: normTitle(s) }
}

function cloneChars(arr) {
	if (!Array.isArray(arr)) return []
	return arr.map((c) => ({
		hanzi: String(c.hanzi != null ? c.hanzi : ''),
		pinyin: String(c.pinyin != null ? c.pinyin : '')
	}))
}

/** 单元名「第一单元·识字」→「识字」 */
function unitSectionTag(unitName) {
	const s = String(unitName || '').trim()
	const dot = s.indexOf('·')
	if (dot >= 0) return s.slice(dot + 1).trim()
	return s
}

/** section 对应 book_catalog 单元 key 后缀、unit.type 或包含关系 */
function unitsForSection(bookCatalog, sectionRaw) {
	const sec = String(sectionRaw || '').trim()
	const order = getUnitOrder(bookCatalog)
	if (!sec) return order
	const byTag = order.filter((u) => unitSectionTag(u) === sec)
	if (byTag.length) return byTag
	const byUnitType = order.filter((u) => String(bookCatalog[u]?.type || '').trim() === sec)
	if (byUnitType.length) return byUnitType
	return order.filter((u) => u === sec || u.includes(sec))
}

function collectYuandiArticles(bookCatalog, units) {
	/** @type {{ unitName: string, article: object }[]} */
	const list = []
	const search = units.length ? units : getUnitOrder(bookCatalog)
	for (const unitName of search) {
		for (const a of bookCatalog[unitName]?.article_list || []) {
			if (a.type === '语文园地') list.push({ unitName, article: a })
		}
	}
	return list
}

function yuandiTitleToIndex(titleN) {
	if (titleN === '语文园地') return 0
	const cn = titleN.match(/^语文园地([一二三四五六七八])$/)
	if (cn) return YUANDI_LABELS.indexOf(cn[1])
	const num = titleN.match(/^语文园地(\d+)$/)
	if (num) return Number(num[1]) - 1
	return -1
}

function parseLessonToken(lessonRaw) {
	const s = String(lessonRaw || '').trim()
	if (!s) return { kind: 'empty' }
	const head = s.split('·')[0].trim()
	if (head.startsWith('语文园地')) return { kind: 'yuandi', title: head }
	const m = head.match(/^(\d+)/)
	if (m) return { kind: 'sort', value: Number(m[1]) }
	return { kind: 'title', value: normTitle(head) }
}

function findArticleBySort(bookCatalog, unitName, sortNum) {
	for (const a of bookCatalog[unitName]?.article_list || []) {
		if (a.type === '语文园地' || a.sort == null) continue
		if (Number(a.sort) === sortNum) return a
	}
	return null
}

function findYuandiInUnits(bookCatalog, titleWant, units) {
	const titleN = normTitle(String(titleWant || '').split('·')[0])
	const search = units.length ? units : getUnitOrder(bookCatalog)
	for (const unitName of search) {
		for (const a of bookCatalog[unitName]?.article_list || []) {
			if (a.type !== '语文园地') continue
			const t = normTitle(a.title || '')
			if (!t) continue
			if (t === titleN) return { unitName, article: a }
			if (
				titleN.startsWith('语文园地') &&
				t.startsWith('语文园地') &&
				(t === titleN || t.includes(titleN) || titleN.includes(t))
			) {
				return { unitName, article: a }
			}
		}
	}
	const all = collectYuandiArticles(bookCatalog, units)
	const idx = yuandiTitleToIndex(titleN)
	if (idx >= 0 && idx < all.length) return all[idx]
	return null
}

/**
 * 用附录 section + lesson 定位目录中的课文/园地。
 * lesson 优先按 sort（全局或单元内），语文园地按 title，多单元同 sort 时按附录顺序推进。
 */
function resolveAppendixTarget(bookCatalog, sectionRaw, lessonRaw, state) {
	const sec = String(sectionRaw || '').trim()
	const tok = parseLessonToken(lessonRaw)
	if (tok.kind === 'empty') return null

	if (tok.kind === 'yuandi') {
		const units =
			sec === '语文园地' ? getUnitOrder(bookCatalog) : unitsForSection(bookCatalog, sec)
		return findYuandiInUnits(bookCatalog, tok.title, units)
	}

	const units = unitsForSection(bookCatalog, sec)

	if (tok.kind === 'sort') {
		const sortNum = tok.value
		const searchUnits = units.length ? units : getUnitOrder(bookCatalog)
		/** @type {{ unitName: string, article: object }[]} */
		const hits = []
		for (const unitName of searchUnits) {
			const a = findArticleBySort(bookCatalog, unitName, sortNum)
			if (a) hits.push({ unitName, article: a })
		}

		if (hits.length === 1) {
			state.sectionPrevSort.set(sec, sortNum)
			return hits[0]
		}

		if (hits.length > 1) {
			const prev = state.sectionPrevSort.get(sec)
			let ui = state.sectionUnitIndex.get(sec) || 0
			if (sortNum === 1 && prev != null && prev > sortNum) ui++
			const picked = hits[Math.min(ui, hits.length - 1)]
			state.sectionUnitIndex.set(sec, ui)
			state.sectionPrevSort.set(sec, sortNum)
			return picked
		}

		state.sectionPrevSort.set(sec, sortNum)
		return null
	}

	if (tok.kind === 'title') {
		for (const unitName of units.length ? units : getUnitOrder(bookCatalog)) {
			for (const a of bookCatalog[unitName]?.article_list || []) {
				if (normTitle(a.title) === tok.value) return { unitName, article: a }
			}
		}
	}

	return null
}

function yuandiIndexKey(unitName, article, bookCatalog) {
	const t = normTitle(article.title || '')
	if (t) return `${unitName}\0yuandi\0${t}`
	const all = collectYuandiArticles(bookCatalog, [])
	const idx = all.findIndex((x) => x.unitName === unitName && x.article === article)
	if (idx >= 0) return `${unitName}\0yuandi\0#${idx}`
	return `${unitName}\0yuandi\0`
}

function articleIndexKey(unitName, article, bookCatalog) {
	if (article.type === '语文园地') {
		return yuandiIndexKey(unitName, article, bookCatalog)
	}
	if (article.sort != null) return `${unitName}\0sort\0${article.sort}`
	if (article.title) return `${unitName}\0title\0${normTitle(article.title)}`
	return `${unitName}\0unknown`
}

function mergeCharField(pack, field, chars) {
	const next = cloneChars(chars)
	if (!next.length) return
	if (!pack[field]?.length) pack[field] = next
	else pack[field] = pack[field].concat(next)
}

function appendixHasSection(...appendixFiles) {
	for (const data of appendixFiles) {
		for (const g of data?.groups || []) {
			if (g.section != null && String(g.section).trim()) return true
		}
	}
	return false
}

function buildAppendixIndexLegacy(writing, literacy, words, useSection = false) {
	const empty = () => ({ write_chars: [], literacy_chars: [], word_chars: [] })
	const map = new Map()

	const ensure = (key) => {
		const k = String(key)
		if (!map.has(k)) map.set(k, empty())
		return map.get(k)
	}

	const groupKey = (g) => {
		if (!useSection) return String(g.lesson)
		const sec = String(g.section || '').trim()
		if (sec === '语文园地') return String(g.lesson)
		if (sec) return `${sec}/${g.lesson}`
		return String(g.lesson)
	}

	const apply = (groups, field) => {
		for (const g of groups || []) {
			ensure(groupKey(g))[field] = cloneChars(g.chars)
		}
	}

	apply(writing.groups, 'write_chars')
	apply(literacy.groups, 'literacy_chars')
	apply(words.groups, 'word_chars')

	return map
}

function buildAppendixIndexBySectionLesson(bookCatalog, writing, literacy, words, report) {
	const empty = () => ({ write_chars: [], literacy_chars: [], word_chars: [] })
	const map = new Map()
	const state = {
		sectionPrevSort: new Map(),
		sectionUnitIndex: new Map()
	}

	const ensure = (key) => {
		if (!map.has(key)) map.set(key, empty())
		return map.get(key)
	}

	const applyGroups = (groups, field) => {
		for (const g of groups || []) {
			const target = resolveAppendixTarget(bookCatalog, g.section, g.lesson, state)
			if (!target) {
				if (!report.unmatched_appendix) report.unmatched_appendix = []
				report.unmatched_appendix.push({
					section: g.section,
					lesson: g.lesson,
					field
				})
				continue
			}
			const key = articleIndexKey(target.unitName, target.article, bookCatalog)
			mergeCharField(ensure(key), field, g.chars)
		}
	}

	applyGroups(writing.groups, 'write_chars')
	applyGroups(literacy.groups, 'literacy_chars')
	applyGroups(words.groups, 'word_chars')

	return map
}

function lookupAppendixPack(appendixMap, unitName, article, bookCatalog) {
	const empty = () => ({ write_chars: [], literacy_chars: [], word_chars: [] })
	const keys = []
	if (article.type === '语文园地') {
		keys.push(yuandiIndexKey(unitName, article, bookCatalog))
		const t = normTitle(article.title || '')
		if (t) keys.push(`${unitName}\0yuandi\0${t}`)
	}
	if (article.sort != null) keys.push(`${unitName}\0sort\0${article.sort}`)
	if (article.title) keys.push(`${unitName}\0title\0${normTitle(article.title)}`)
	for (let i = 0; i < keys.length; i++) {
		if (appendixMap.has(keys[i])) return appendixMap.get(keys[i])
	}
	return empty()
}

function resolveLessonKey(unitName, article, cfg, yuandiCounter) {
	if (article.type === '语文园地') {
		if (cfg.yuandiTitleFromCatalog && article.title) {
			return String(article.title)
		}
		const label = YUANDI_LABELS[yuandiCounter - 1] || String(yuandiCounter)
		return `语文园地${label}`
	}
	if (article.sort == null) return null
	const tag = unitSectionTag(unitName)
	return tag ? `${tag}/${article.sort}` : String(article.sort)
}

const CATALOG_ARTICLE_KEYS = [
	'sort',
	'title',
	'page',
	'mark',
	'sub_title',
	'type',
	'content',
	'sub_articles',
	'write_chars',
	'literacy_chars',
	'word_chars'
]

function stripCatalogArticle(article) {
	const o = {}
	for (let i = 0; i < CATALOG_ARTICLE_KEYS.length; i++) {
		const k = CATALOG_ARTICLE_KEYS[i]
		if (k.endsWith('_chars')) {
			o[k] = Array.isArray(article[k]) ? article[k] : []
			continue
		}
		if (k === 'content') {
			if (article.content) o.content = article.content
			continue
		}
		if (k === 'sub_articles') {
			if (Array.isArray(article.sub_articles) && article.sub_articles.length) {
				o.sub_articles = article.sub_articles
			}
			continue
		}
		if (article[k] !== undefined && article[k] !== null) o[k] = article[k]
	}
	return o
}

function buildCatalogFormatOutput(merged) {
	const out = {
		textbook_version_id: merged.textbook_version_id,
		grade: merged.grade,
		semester: merged.semester,
		catalog_note: merged.catalog_note,
		book_catalog: {}
	}
	if (merged.note) out.note = merged.note

	for (const unitName of getUnitOrder(merged.book_catalog)) {
		const unit = merged.book_catalog[unitName]
		out.book_catalog[unitName] = {
			start_page: unit.start_page,
			type: unit.type,
			article_list: (unit.article_list || []).map((a) => stripCatalogArticle(a))
		}
	}
	if (merged.book_catalog['附录']) {
		out.book_catalog['附录'] = merged.book_catalog['附录']
	}
	return out
}

function getUnitOrder(bookCatalog) {
	return Object.keys(bookCatalog).filter((k) => k.startsWith('第') && k.includes('单元'))
}

function isExampleNode(article) {
	const t = String(article.type || '')
	return t === '例文' || t === '习作例文'
}

function isCompositeLesson(article) {
	if (isExampleNode(article)) return false
	const subs = article.sub_title
	return Array.isArray(subs) && subs.length >= 2
}

function attachCharAliases(article) {
	article.writing_chars = article.write_chars
	article.word_terms = article.word_chars
}

function findTextFromIndex(textByNorm, normKey) {
	if (textByNorm.has(normKey)) return textByNorm.get(normKey)
	for (const [k, v] of textByNorm) {
		if (k.includes(normKey) || normKey.includes(k)) return v
	}
	return null
}

/**
 * @param {object} cfg
 * @param {{ inputDir: string, outputDir: string }} dirs
 */
function mergeOne(cfg, dirs) {
	const semTag = cfg.semester === '上' ? 'up' : 'down'
	const catalogPath = path.join(dirs.inputDir, cfg.catalog)
	const textPath = path.join(dirs.inputDir, cfg.text)
	const writingPath = path.join(dirs.inputDir, `grade${cfg.grade}-${semTag}-writing.json`)
	const literacyPath = path.join(dirs.inputDir, `grade${cfg.grade}-${semTag}-literacy.json`)
	const wordsPath = path.join(dirs.inputDir, `grade${cfg.grade}-${semTag}-words.json`)
	const outPath = path.join(dirs.outputDir, cfg.out)
	const missingFiles = []

	const catalogLoaded = loadJsonOptional(catalogPath, cfg.catalog, missingFiles)
	const catalogRoot = catalogLoaded || defaultCatalogRoot(cfg)

	const textLoaded = loadJsonOptional(textPath, cfg.text, missingFiles)
	const textRows = Array.isArray(textLoaded) ? textLoaded : []

	const writingLoaded = loadJsonOptional(writingPath, path.basename(writingPath), missingFiles)
	const literacyLoaded = loadJsonOptional(literacyPath, path.basename(literacyPath), missingFiles)
	const wordsLoaded = loadJsonOptional(wordsPath, path.basename(wordsPath), missingFiles)

	const bookCatalog = catalogRoot.book_catalog || {}
	const useSectionLesson = appendixHasSection(
		writingLoaded,
		literacyLoaded,
		wordsLoaded
	)

	const hasText = textRows.length > 0

	const textByNorm = new Map()
	for (const row of textRows) {
		textByNorm.set(normTitle(row.title), row)
	}

	let textCursor = 0
	/** @type {Set<number>} */
	const consumedTextIdx = new Set()
	const report = {
		grade: cfg.grade,
		semester: cfg.semester,
		missing_files: missingFiles,
		unmatched_catalog: [],
		unmatched_appendix: [],
		orphan_text: [],
		composite_mismatch: []
	}

	const appendix = useSectionLesson
		? buildAppendixIndexBySectionLesson(
				bookCatalog,
				writingLoaded || EMPTY_APPENDIX,
				literacyLoaded || EMPTY_APPENDIX,
				wordsLoaded || EMPTY_APPENDIX,
				report
			)
		: buildAppendixIndexLegacy(
				writingLoaded || EMPTY_APPENDIX,
				literacyLoaded || EMPTY_APPENDIX,
				wordsLoaded || EMPTY_APPENDIX,
				catalogHasShiziUnit(bookCatalog)
			)

	function markConsumed(row) {
		if (!row) return
		const idx = textRows.indexOf(row)
		if (idx >= 0) consumedTextIdx.add(idx)
	}

	function consumeTextSequential(pred) {
		for (let i = textCursor; i < textRows.length; i++) {
			if (pred(textRows[i])) {
				const row = textRows[i]
				textCursor = i + 1
				markConsumed(row)
				return row
			}
		}
		return null
	}

	function pullContentForNorm(normKey) {
		let row = consumeTextSequential((t) => normTitle(t.title) === normKey)
		if (!row) row = findTextFromIndex(textByNorm, normKey)
		if (row) markConsumed(row)
		return row ? String(row.content || '') : ''
	}

	const catalogFormat = cfg.format === 'catalog'

	const out = {
		textbook_version_id: catalogRoot.textbook_version_id,
		grade: catalogRoot.grade,
		semester: catalogRoot.semester,
		catalog_note: catalogRoot.catalog_note,
		book_catalog: {}
	}

	if (!catalogFormat) {
		out.schema_version = 1
		out.merge_meta = {
			sources: {
				catalog: cfg.catalog,
				text: cfg.text,
				writing: path.basename(writingPath),
				literacy: path.basename(literacyPath),
				words: path.basename(wordsPath)
			},
			missing_files: missingFiles,
			merged_at: new Date().toISOString().slice(0, 10)
		}
	}

	if (catalogRoot.note) out.note = catalogRoot.note

	let yuandiCounter = 0

	for (const unitName of getUnitOrder(catalogRoot.book_catalog)) {
		const unit = catalogRoot.book_catalog[unitName]
		const unitOut = {
			start_page: unit.start_page,
			type: unit.type,
			article_list: []
		}

		let lessonInUnit = 0

		for (const rawArticle of unit.article_list || []) {
			const article = { ...rawArticle }

			if (article.type === '语文园地') {
				yuandiCounter++
				const lessonKey = resolveLessonKey(unitName, article, cfg, yuandiCounter)
				if (!catalogFormat) {
					article.lesson_key = lessonKey
					article.kind = 'yuandi'
				}
				const pack = lookupAppendixPack(appendix, unitName, article, bookCatalog)
				article.write_chars = pack.write_chars
				article.literacy_chars = pack.literacy_chars
				article.word_chars = pack.word_chars
				article.sub_articles = []
				const yuandiNorm = cfg.yuandiTitleFromCatalog && article.title
					? normTitle(article.title)
					: '语文园地'
				const row = consumeTextSequential((t) => normTitle(t.title) === yuandiNorm)
				article.content = row ? String(row.content || '') : ''
				if (hasText && !article.content) {
					report.unmatched_catalog.push({
						unit: unitName,
						title: article.title || '语文园地',
						lesson_key: lessonKey
					})
				}
				if (!catalogFormat) attachCharAliases(article)
				unitOut.article_list.push(article)
				continue
			}

			if (article.sort == null) {
				if (!catalogFormat) {
					article.lesson_key = null
					article.kind = article.type || 'other'
				}
				article.write_chars = []
				article.literacy_chars = []
				article.word_chars = []
				article.sub_articles = []
				const core = normTitle(article.title)
				if (core) {
					article.content = pullContentForNorm(core)
					if (hasText && !article.content && article.title) {
						report.unmatched_catalog.push({ unit: unitName, title: article.title, type: article.type })
					}
				} else {
					article.content = ''
				}
				if (!catalogFormat) attachCharAliases(article)
				unitOut.article_list.push(article)
				continue
			}

			lessonInUnit++
			if (!catalogFormat) {
				article.lesson_in_unit = lessonInUnit
				article.is_optional_read = !!(article.mark && String(article.mark).includes('略读'))
				article.unitName = unitName
			}
			const lessonKey = resolveLessonKey(unitName, article, cfg, yuandiCounter)
			if (!catalogFormat) article.lesson_key = lessonKey

			const pack = lookupAppendixPack(appendix, unitName, article, bookCatalog)
			article.write_chars = pack.write_chars
			article.literacy_chars = pack.literacy_chars
			article.word_chars = pack.word_chars

			if (isCompositeLesson(article)) {
				if (!catalogFormat) article.kind = 'composite'
				article.content = ''
				article.sub_articles = []
				const subs = article.sub_title
				for (let si = 0; si < subs.length; si++) {
					const poemTitle = subs[si]
					const nk = normTitle(poemTitle)
					let row = consumeTextSequential((t) => normTitle(t.title) === nk)
					if (!row) row = findTextFromIndex(textByNorm, nk)
					if (row) markConsumed(row)
					const content = row ? String(row.content || '') : ''
					if (hasText && !content) {
						report.composite_mismatch.push({
							unit: unitName,
							parent: article.title,
							sub: poemTitle,
							sort: article.sort
						})
					}
					article.sub_articles.push({ title: poemTitle, content })
				}
			} else if (isExampleNode(article)) {
				if (!catalogFormat) article.kind = 'example'
				article.content = ''
				article.sub_articles = (article.sub_title || []).map((st) => ({
					title: st,
					content: pullContentForNorm(normTitle(st))
				}))
			} else {
				if (!catalogFormat) article.kind = 'lesson'
				article.sub_articles = []
				const nk = normTitle(article.title)
				let row = consumeTextSequential((t) => normTitle(t.title) === nk)
				if (!row) row = findTextFromIndex(textByNorm, nk)
				if (row) markConsumed(row)
				article.content = row ? String(row.content || '') : ''
				if (hasText && !article.content) {
					report.unmatched_catalog.push({
						unit: unitName,
						title: article.title,
						sort: article.sort
					})
				}
			}

			if (!catalogFormat) attachCharAliases(article)
			unitOut.article_list.push(article)
		}

		out.book_catalog[unitName] = unitOut
	}

	if (catalogRoot.book_catalog['附录']) {
		out.book_catalog['附录'] = catalogRoot.book_catalog['附录']
	}

	const finalOut = catalogFormat ? buildCatalogFormatOutput(out) : out

	if (hasText) {
		for (let i = 0; i < textRows.length; i++) {
			if (consumedTextIdx.has(i)) continue
			const nk = normTitle(textRows[i].title)
			if (!nk || nk === '语文园地') continue
			report.orphan_text.push({ title: textRows[i].title })
		}
	}

	const stem = cfg.out.replace(/\.json$/i, '')
	const reportName = stem.endsWith('-merge') ? `${stem}-report.json` : `${stem}-merge-report.json`
	const reportPath = path.join(dirs.outputDir, reportName)
	writeJson(outPath, finalOut)
	writeJson(reportPath, report)

	const missHint = missingFiles.length ? `  missing=${missingFiles.join(', ')}` : ''
	console.log(`[ok] ${cfg.out}  units=${getUnitOrder(out.book_catalog).length}${missHint}`)
	const unmatchedAppendix = report.unmatched_appendix?.length || 0
	console.log(
		`     unmatched_catalog=${report.unmatched_catalog.length}  unmatched_appendix=${unmatchedAppendix}  orphan_text=${report.orphan_text.length}  composite_mismatch=${report.composite_mismatch.length}`
	)
	console.log(`     report -> ${path.basename(reportPath)}`)

	return { out, report }
}

function catalogHasShiziUnit(bookCatalog) {
	return getUnitOrder(bookCatalog).some((u) => String(u).includes('识字'))
}

function catalogHasNamedYuandi(bookCatalog) {
	for (const unitName of getUnitOrder(bookCatalog)) {
		const list = bookCatalog[unitName]?.article_list || []
		for (let i = 0; i < list.length; i++) {
			const a = list[i]
			if (a.type === '语文园地' && a.title && String(a.title).startsWith('语文园地')) {
				return true
			}
		}
	}
	return false
}

/** @param {number} grade @param {'上'|'下'} semester @param {string} inputDir */
function buildCatalogMergeConfig(grade, semester, inputDir) {
	const down = semester === '下'
	const cn = GRADE_CN[grade]
	const catalogFile = `grade${grade}${down ? 'd' : 'u'}.json`
	const catalogPath = path.join(inputDir, catalogFile)
	let bookCatalog = {}
	if (fs.existsSync(catalogPath)) {
		try {
			bookCatalog = readJson(catalogPath).book_catalog || {}
		} catch (_) {
			bookCatalog = {}
		}
	}
	return {
		grade,
		semester,
		catalog: catalogFile,
		text: `${cn}年级${semester}册.json`,
		out: `grade${grade}-${down ? 'down' : 'up'}-merge.json`,
		format: 'catalog',
		yuandiTitleFromCatalog: catalogHasNamedYuandi(bookCatalog)
	}
}

function allCatalogMergeJobs(inputDir) {
	const jobs = []
	for (let g = 1; g <= 6; g++) {
		jobs.push(buildCatalogMergeConfig(g, '上', inputDir))
		jobs.push(buildCatalogMergeConfig(g, '下', inputDir))
	}
	return jobs
}

function main() {
	const { inputDir, outputDir, args } = parseCliArgs(process.argv.slice(2))
	const dirs = { inputDir, outputDir }
	const jobs = []

	if (args.includes('--all-merge')) {
		jobs.push(...allCatalogMergeJobs(inputDir))
	} else if (args.includes('--all')) {
		for (const key of Object.keys(PRESETS)) jobs.push(PRESETS[key])
	} else if (args[0] === 'grade2-down-merge' || args[0] === 'grade2-merge') {
		jobs.push(buildCatalogMergeConfig(2, '下', inputDir))
	} else if (args.length >= 2 && !args[0].startsWith('-')) {
		const key = `${args[0]}-${args[1] === '下' || args[1] === 'down' ? 'down' : 'up'}`
		if (!PRESETS[key]) {
			console.error('未知册别:', key)
			process.exit(1)
		}
		jobs.push(PRESETS[key])
	} else {
		console.log(`默认输入目录: ${DEFAULT_BOOK_DIR}`)
		console.log(`默认输出目录: ${DEFAULT_BOOK_DIR}`)
		console.log('')
		console.log(
			'用法: node scripts/merge-renjiao-textbook.mjs [选项] <grade> <up|down>  |  --all-merge  |  --all'
		)
		console.log('选项:')
		console.log('  --in, --input <dir>     输入目录（目录/正文/附录 JSON）')
		console.log('  --out, --output <dir>   输出目录（合并结果与 report）')
		console.log('  亦可用 --in=path 或 --out=path')
		process.exit(1)
	}

	ensureOutputDir(outputDir)
	if (inputDir !== DEFAULT_BOOK_DIR || outputDir !== DEFAULT_BOOK_DIR) {
		console.log(`input:  ${inputDir}`)
		console.log(`output: ${outputDir}`)
	}

	let failed = 0
	for (const cfg of jobs) {
		try {
			mergeOne(cfg, dirs)
		} catch (e) {
			failed++
			console.error(`[fail] grade${cfg.grade} ${cfg.semester}:`, e.message)
		}
	}
	process.exit(failed ? 1 : 0)
}

main()
