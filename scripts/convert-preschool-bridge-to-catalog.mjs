/**
 * 将 preschool-bridge.json 从旧版课次数组转为 book_catalog 结构（与 *-merge.json 一致）
 * 运行：node scripts/convert-preschool-bridge-to-catalog.mjs [输入路径]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DEFAULT_IN = path.join(ROOT, 'docs', 'renjiaoban', 'preschool-bridge.json')
const STATIC_OUT = path.join(ROOT, 'static', 'booktext', 'renjiaoban', 'preschool-bridge.json')
const DOCS_OUT = path.join(ROOT, 'docs', 'renjiaoban', 'preschool-bridge.json')

const TV = '教育部·识字写字基本字表（300字）'
const UNIT_KEY = '第一单元'

function cloneChars(arr) {
	if (!Array.isArray(arr)) return []
	return arr.map((c) => ({
		hanzi: String(c?.hanzi != null ? c.hanzi : ''),
		pinyin: String(c?.pinyin != null ? c.pinyin : '')
	}))
}

/** @param {unknown} raw */
export function preschoolBridgeToCatalog(raw) {
	if (raw && typeof raw === 'object' && raw.book_catalog) {
		return raw
	}
	const lessons = Array.isArray(raw) ? raw : []
	const unitTheme =
		(typeof lessons[0]?.unitTheme === 'string' && lessons[0].unitTheme) || '按笔画分类'
	const article_list = lessons.map((L, i) => ({
		sort: Number(L.catalogLessonNo) > 0 ? Number(L.catalogLessonNo) : i + 1,
		title: String(L.title != null ? L.title : ''),
		content: String(L.content != null ? L.content : ''),
		write_chars: cloneChars(L.write_chars || L.writing_chars),
		literacy_chars: cloneChars(L.literacy_chars || L.read_chars),
		word_chars: cloneChars(L.word_chars || L.word_terms)
	}))
	return {
		textbook_version_id: TV,
		grade: 0,
		semester: '上',
		catalog_note:
			'义务教育语文课程标准附录4「识字、写字教学基本字表」300字，按笔画数分组',
		book_catalog: {
			[UNIT_KEY]: {
				start_page: 1,
				type: unitTheme,
				article_list
			}
		}
	}
}

function main() {
	const inPath = path.resolve(ROOT, process.argv[2] || DEFAULT_IN)
	const raw = JSON.parse(fs.readFileSync(inPath, 'utf8'))
	const out = preschoolBridgeToCatalog(raw)
	const text = `${JSON.stringify(out, null, 4)}\n`
	fs.mkdirSync(path.dirname(STATIC_OUT), { recursive: true })
	fs.writeFileSync(STATIC_OUT, text, 'utf8')
	fs.writeFileSync(DOCS_OUT, text, 'utf8')
	const n = out.book_catalog[UNIT_KEY].article_list.length
	const chars = out.book_catalog[UNIT_KEY].article_list.reduce(
		(s, a) => s + (a.literacy_chars?.length || 0),
		0
	)
	console.log(`wrote ${STATIC_OUT}`)
	console.log(`wrote ${DOCS_OUT}`)
	console.log(`articles=${n} literacy_chars=${chars}`)
}

main()
