/**
 * 生成 static/booktext/renjiaoban/preschool-bridge.json（book_catalog + 主题化小课）
 * 课标附录4「识字写字教学基本字表」300字
 * 运行：node scripts/gen-youxiaoxianjie-renjiao-json.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const PRESCHOOL_BRIDGE_FILE = 'preschool-bridge.json'
import {
	MOE_BASIC_CHARS_SOURCE,
	buildPreschoolCurriculum
} from './preschool-bridge-curriculum.mjs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const cnchar = require('cnchar')
cnchar.use(require('cnchar-poly'))
cnchar.use(require('cnchar-order'))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const TV = '教育部·识字写字基本字表（300字）'

/**
 * 单字拼音全部由 cnchar（已加载 cnchar-poly）给出。
 */
function spellForSeed(ch) {
	let raw
	try {
		raw = cnchar.spell(ch, 'tone', 'poly')
	} catch (_) {
		raw = null
	}
	if (raw == null || typeof raw !== 'string') {
		try {
			raw = cnchar.spell(ch, 'tone')
		} catch (_) {
			raw = null
		}
	}
	if (raw == null || typeof raw !== 'string') return ''
	let s = raw.trim()
	const wrapped = /^\(([^)]+)\)$/.exec(s)
	if (wrapped) {
		const first = wrapped[1].split('|')[0].trim()
		if (first) s = first
	} else if (s.includes('|')) {
		s = s.split('|')[0].trim()
	}
	if (!s) return ''
	return s.charAt(0).toLowerCase() + s.slice(1)
}

/** @param {string} chars */
function charsToLiteracyList(chars) {
	return [...chars].map((hanzi) => ({
		hanzi,
		pinyin: spellForSeed(hanzi)
	}))
}

export function buildPreschoolBridgeBook() {
	const units = buildPreschoolCurriculum()
	/** @type {Record<string, unknown>} */
	const book_catalog = {}
	let sort = 0
	let unitIndex = 0

	for (const unit of units) {
		unitIndex++
		book_catalog[unit.key] = {
			start_page: (unitIndex - 1) * 10 + 1,
			type: unit.type,
			article_list: unit.lessons.map((L) => {
				sort++
				return {
					sort,
					title: L.title,
					content: L.content,
					write_chars: [],
					literacy_chars: charsToLiteracyList(L.chars),
					word_chars: []
				}
			})
		}
	}

	return {
		textbook_version_id: TV,
		grade: 0,
		semester: '上',
		catalog_note:
			'义务教育语文课程标准附录4「识字、写字教学基本字表」300字；按幼小衔接主题划分（人与家、身体、数字、自然、动植物、上学、生活、常用表达等），每课约6～10字。',
		book_catalog
	}
}

function main() {
	const moe = [...MOE_BASIC_CHARS_SOURCE]
	if (moe.length !== 300) {
		throw new Error(`expected 300 chars, got ${moe.length}`)
	}

	const book = buildPreschoolBridgeBook()
	let articles = 0
	let literacy = 0
	for (const key of Object.keys(book.book_catalog)) {
		const list = book.book_catalog[key].article_list || []
		articles += list.length
		for (const a of list) literacy += (a.literacy_chars || []).length
	}
	if (literacy !== 300) {
		throw new Error(`literacy_chars total ${literacy} !== 300`)
	}

	const fileName = PRESCHOOL_BRIDGE_FILE
	const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', fileName)
	const docsPath = path.join(root, 'docs', 'renjiaoban', fileName)
	const text = `${JSON.stringify(book, null, 4)}\n`
	fs.mkdirSync(path.dirname(outPath), { recursive: true })
	fs.writeFileSync(outPath, text, 'utf8')
	fs.mkdirSync(path.dirname(docsPath), { recursive: true })
	fs.writeFileSync(docsPath, text, 'utf8')
	console.log(`wrote ${outPath} (${Object.keys(book.book_catalog).length} units, ${articles} lessons, ${literacy} chars)`)
	console.log(`wrote ${docsPath}`)
}

main()
