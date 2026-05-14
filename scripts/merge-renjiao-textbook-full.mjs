/**
 * 将 static/booktext/renjiaoban 下课文主 JSON（grade*-{up|down}.json）
 * 与同册 -literacy.json / -writing.json / -words.json（若存在）合并为「课文 + 识字 + 写字 + 词语」一体结构。
 *
 * 匹配规则（与附录表 `groups[].section` + `groups[].lesson` 对齐）：
 * - section：优先课文条目的 `unitTheme`；入学等无 `unitTheme` 则不挂表；其余缺省按「阅读」。
 * - lesson：优先 `catalogLessonNo`（与教材课次一致，如一年级拼音课）；否则从标题前导阿拉伯数字解析；
 *   「语文园地」：标题含「语文园地一二…」则直接作 lesson；仅为「语文园地」时按册内出现顺序映射为「语文园地一」起。
 *
 * 运行：node scripts/merge-renjiao-textbook-full.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const bookDir = path.join(root, 'static', 'booktext', 'renjiaoban')

const MAIN_BOOK_RE = /^grade([1-6])-(up|down)\.json$/

/** 册内「语文园地」仅标题、无序号时的序数 → lesson 字段 */
const YUAN_DI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八']

function readJsonSafe(p) {
	try {
		const t = fs.readFileSync(p, 'utf8')
		return JSON.parse(t)
	} catch {
		return null
	}
}

function normalizeGroups(doc) {
	if (!doc || !Array.isArray(doc.groups)) return []
	return doc.groups.filter((g) => g && typeof g === 'object')
}

function cloneCharList(chars) {
	if (!Array.isArray(chars)) return []
	return chars.map((c) => ({
		hanzi: c.hanzi != null ? String(c.hanzi) : '',
		pinyin: c.pinyin != null ? String(c.pinyin) : ''
	}))
}

function findChars(groups, section, lessonKey) {
	if (!section || !lessonKey) return []
	const g = groups.find((x) => x.section === section && String(x.lesson) === String(lessonKey))
	return g && Array.isArray(g.chars) ? cloneCharList(g.chars) : []
}

/** 从标题取前导课次数字，如「12* 总也倒不了的老屋」→ 12 */
function leadingLessonNum(title) {
	const t = String(title || '').trim()
	const m = t.match(/^(\d+)\s*[*\u203B\uFF0A]?\s*/)
	return m ? m[1] : null
}

/** 解析「语文园地…」lesson 键 */
function parseYuanDiLesson(title, ordinalState) {
	const t = String(title || '').trim()
	const full = t.match(/语文园地([一二三四五六七八九十百]+)/)
	if (full) return `语文园地${full[1]}`
	if (t === '语文园地' || /^语文园地\s*$/.test(t) || /^语文园地[^一二三四五六七八九十]/.test(t)) {
		ordinalState.n += 1
		const idx = ordinalState.n
		const cn = YUAN_DI[idx] || String(idx)
		return `语文园地${cn}`
	}
	return null
}

function inferSection(item) {
	if (item.unitTheme != null && String(item.unitTheme).trim()) return String(item.unitTheme).trim()
	const kind = String(item.kind || '')
	if (kind === '入学' || kind === '准备') return null
	return '阅读'
}

/**
 * @param {object} item 课文条目
 * @param {{ n: number }} yuanDiOrdinal 本册「裸语文园地」计数
 */
function resolveLessonKey(item, yuanDiOrdinal) {
	const title = String(item.title || '')
	if (item.catalogLessonNo != null && item.catalogLessonNo !== '' && Number.isFinite(Number(item.catalogLessonNo))) {
		return String(Number(item.catalogLessonNo))
	}
	const yd = parseYuanDiLesson(title, yuanDiOrdinal)
	if (yd) return yd
	const num = leadingLessonNum(title)
	return num
}

function mergeOneBook(baseName) {
	const basePath = path.join(bookDir, `${baseName}.json`)
	if (!fs.existsSync(basePath)) {
		console.warn('[merge-full] skip missing', basePath)
		return
	}
	const catalog = readJsonSafe(basePath)
	if (!Array.isArray(catalog)) {
		console.warn('[merge-full] invalid catalog', basePath)
		return
	}

	const shiziPath = path.join(bookDir, `${baseName}-literacy.json`)
	const xieziPath = path.join(bookDir, `${baseName}-writing.json`)
	const ciyuPath = path.join(bookDir, `${baseName}-words.json`)

	const shiziDoc = readJsonSafe(shiziPath)
	const xieziDoc = readJsonSafe(xieziPath)
	const ciyuDoc = readJsonSafe(ciyuPath)

	const groupsShizi = normalizeGroups(shiziDoc)
	const groupsXiezi = normalizeGroups(xieziDoc)
	const groupsCiyu = normalizeGroups(ciyuDoc)

	const yuanDiOrdinal = { n: 0 }
	const out = catalog.map((item) => {
		if (!item || typeof item !== 'object') return item
		const section = inferSection(item)
		const lessonKey = section ? resolveLessonKey(item, yuanDiOrdinal) : null

		const literacy_chars =
			section && lessonKey && groupsShizi.length ? findChars(groupsShizi, section, lessonKey) : []
		const writing_chars =
			section && lessonKey && groupsXiezi.length ? findChars(groupsXiezi, section, lessonKey) : []
		const word_terms =
			section && lessonKey && groupsCiyu.length ? findChars(groupsCiyu, section, lessonKey) : []

		return {
			...item,
			literacy_chars,
			writing_chars,
			word_terms
		}
	})

	fs.writeFileSync(basePath, `${JSON.stringify(out, null, '\t')}\n`, 'utf8')
	console.log('[merge-full] wrote', baseName, 'lessons:', out.length)
}

function main() {
	const names = fs
		.readdirSync(bookDir)
		.filter((f) => MAIN_BOOK_RE.test(f))
		.map((f) => f.replace(/\.json$/, ''))
		.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))

	if (!names.length) {
		console.warn('[merge-full] no main book json under', bookDir)
		return
	}
	for (const name of names) {
		mergeOneBook(name)
	}
	console.log('[merge-full] done', names.length, 'books')
}

main()
