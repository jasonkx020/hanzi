/**
 * 从 scripts/seed-curriculum.json 生成 constants/hanzi_curriculum_seed.json（供运行时本地内存加载）
 * 合并教育部《义务教育语文课程标准》附录4「识字、写字教学基本字表」300字（字集与课标一致；展示顺序按笔画数升序）
 * 运行：npm run db:build
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const cnchar = require('cnchar')
cnchar.use(require('cnchar-poly'))
cnchar.use(require('cnchar-order'))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const DEFAULT_TV = '统编(人教版)'
const DEFAULT_GRADE = 1
const DEFAULT_SEMESTER = '上'

/** 教材版本·课标附录4（见 curriculum-schema TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300） */
const TV_MOE_BASIC = '教育部·识字写字基本字表（300字）'
const LIST_MOE_BASIC = '识字写字基本字表'

/**
 * 附录4 三百字（字集；课标正文多为音序排列），来源：义务教育语文课程标准「识字、写字教学基本字表」；
 * 印发通知（含各科课程标准附件）：http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html
 * 构建时用 cnchar.stroke 按笔画数从小到大排序后写入 sort_order。
 */
const MOE_BASIC_CHARS_SOURCE =
	'八把爸白百班办半包饱北贝被本比边别不才草册长厂吵车成吃尺虫出穿船窗床春次从打大但当刀到道的灯地点电东冬动都豆对多儿耳二发反饭方放飞分风干高哥个给更工公共狗瓜关光广国果过孩海好合和河很红后花画话还回会火机几己加家见江交叫姐巾今金进京经九就军开看可课口哭快来老乐里力立脸两亮了林六妈马猫毛没每美妹门们米面民明木目那奶你年鸟牛农女胖跑朋皮片票平七奇起气千前青秋去全然让人日三山上少舌身生声师十什石时市是手书树双谁水说四岁他她台太天田条跳听同头土外玩晚万王网为卫文问我五午西习洗下先现向小校笑些心兴星行学雪牙羊阳样要爷也业叶页一衣医以因阴音用有又鱼羽雨语元月云再在早站找这真正知直只中竹主住桌着子字自走作坐做'

/** @param {string} ch */
function strokeCountForSort(ch) {
	const n = Number(cnchar.stroke(ch))
	return Number.isFinite(n) && n > 0 ? n : 999
}

/** @param {string[]} chars */
function sortMoeCharsByStrokeAsc(chars) {
	return [...chars].sort((a, b) => {
		const d = strokeCountForSort(a) - strokeCountForSort(b)
		if (d !== 0) return d
		return a.localeCompare(b, 'zh-Hans-CN')
	})
}

const MOE_SOURCE_URL =
	'http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html'

function spellForSeed(ch) {
	let p = cnchar.spell(ch, 'tone', 'poly')
	if (!p || typeof p !== 'string') return null
	p = p.replace(/\([^)]*\)/g, '').split('|')[0].trim()
	if (!p) return null
	return p.charAt(0).toLowerCase() + p.slice(1)
}

function buildMoeBasicRows() {
	const chars = sortMoeCharsByStrokeAsc([...MOE_BASIC_CHARS_SOURCE])
	if (chars.length !== 300) {
		throw new Error(`[build-curriculum] MOE basic table expected 300 chars, got ${chars.length}`)
	}
	return chars.map((hanzi, i) => ({
		textbook_version_id: TV_MOE_BASIC,
		grade: 0,
		semester: '上',
		list_type: LIST_MOE_BASIC,
		hanzi,
		pinyin: spellForSeed(hanzi),
		sort_order: i + 1,
		lesson_hint: '义务教育语文课程标准·附录4',
		source_url: MOE_SOURCE_URL
	}))
}

function normalizeGrade(val) {
	const n = Number(val)
	if (Number.isFinite(n) && n >= 0 && n <= 6) return n
	return DEFAULT_GRADE
}

function normalizeRows(raw) {
	return raw.map((r, i) => ({
		id: i + 1,
		textbook_version_id: r.textbook_version_id || DEFAULT_TV,
		grade: normalizeGrade(r.grade),
		semester: r.semester || DEFAULT_SEMESTER,
		list_type: r.list_type,
		hanzi: r.hanzi,
		pinyin: r.pinyin ?? null,
		sort_order: Number(r.sort_order) || 0,
		lesson_hint: r.lesson_hint ?? null,
		source_url: r.source_url ?? null
	}))
}

function main() {
	const seedPath = path.join(__dirname, 'seed-curriculum.json')
	const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
	const moeRows = buildMoeBasicRows()
	const merged = [...raw, ...moeRows]
	const rows = normalizeRows(merged)
	const outPath = path.join(root, 'constants', 'hanzi_curriculum_seed.json')
	fs.mkdirSync(path.dirname(outPath), { recursive: true })
	fs.writeFileSync(outPath, JSON.stringify(rows))
	console.log('[build-curriculum] wrote', outPath, 'rows:', rows.length, '(textbook + MOE300:', raw.length, '+', moeRows.length, ')')
}

main()
