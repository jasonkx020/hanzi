/**
 * @file gen-youxiaoxianjie-renjiao-json.mjs
 * @module scripts
 * @description 源文件：gen-youxiaoxianjie-renjiao-json.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 生成 static/booktext/renjiaoban/preschool-bridge.json
 * 课标附录4「识字写字教学基本字表」300字，按 cnchar.stroke 笔画数分组（1画一类、2画一类…）
 * 运行：node scripts/gen-youxiaoxianjie-renjiao-json.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renjiaoTextbookJsonFile } from '../constants/renjiao-textbook-filenames.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const cnchar = require('cnchar')
cnchar.use(require('cnchar-poly'))
cnchar.use(require('cnchar-order'))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** 与 scripts/build-db.mjs 中 MOE_BASIC_CHARS_SOURCE 保持一致 */
const MOE_BASIC_CHARS_SOURCE =
	'八把爸白百班办半包饱北贝被本比边别不才草册长厂吵车成吃尺虫出穿船窗床春次从打大但当刀到道的灯地点电东冬动都豆对多儿耳二发反饭方放飞分风干高哥个给更工公共狗瓜关光广国果过孩海好合和河很红后花画话还回会火机几己加家见江交叫姐巾今金进京经九就军开看可课口哭快来老乐里力立脸两亮了林六妈马猫毛没每美妹门们米面民明木目那奶你年鸟牛农女胖跑朋皮片票平七奇起气千前青秋去全然让人日三山上少舌身生声师十什石时市是手书树双谁水说四岁他她台太天田条跳听同头土外玩晚万王网为卫文问我五午西习洗下先现向小校笑些心兴星行学雪牙羊阳样要爷也业叶页一衣医以因阴音用有又鱼羽雨语元月云再在早站找这真正知直只中竹主住桌着子字自走作坐做'

function strokeCount(ch) {
	const n = Number(cnchar.stroke(ch))
	return Number.isFinite(n) && n > 0 ? n : 999
}

/**
 * 单字拼音全部由 cnchar（已加载 cnchar-poly）给出。
 * 多音字为不确定场景时，仍用 cnchar 的 poly 串，取其中第一个读音作为课文 JSON 的默认展示音。
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
	if (raw == null || typeof raw !== 'string') return null
	let s = raw.trim()
	// poly 常见形如 "(Jǐ|Jī)"，不可用整段删括号（会误删全部读音）
	const wrapped = /^\(([^)]+)\)$/.exec(s)
	if (wrapped) {
		const first = wrapped[1].split('|')[0].trim()
		if (first) s = first
	} else if (s.includes('|')) {
		s = s.split('|')[0].trim()
	}
	if (!s) return null
	return s.charAt(0).toLowerCase() + s.slice(1)
}

function main() {
	const chars = [...MOE_BASIC_CHARS_SOURCE]
	if (chars.length !== 300) {
		throw new Error(`expected 300 chars, got ${chars.length}`)
	}
	/** @type {Map<number, string[]>} */
	const byStroke = new Map()
	for (const ch of chars) {
		const s = strokeCount(ch)
		if (!byStroke.has(s)) byStroke.set(s, [])
		byStroke.get(s).push(ch)
	}
	for (const list of byStroke.values()) {
		list.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
	}
	const strokes = [...byStroke.keys()].sort((a, b) => a - b)

	const lessons = strokes.map((stroke, i) => {
		const group = byStroke.get(stroke) || []
		const strokeLabel = stroke === 999 ? '笔画未识别' : `${stroke}画`
		return {
			unit: stroke === 999 ? 99 : stroke,
			unitName: '教育部·识字写字基本字表（300字）',
			unitTheme: '按笔画分类',
			kind: '识字',
			catalogLessonNo: i + 1,
			lessonInUnit: 1,
			title: `${strokeLabel}（${group.length}个字）`,
			content: `\n本组为义务教育语文课程标准附录4「识字、写字教学基本字表」中的字，笔画为${stroke === 999 ? '未识别' : `${stroke}画`}，共${group.length}个。\n`,
			literacy_chars: group.map((hanzi) => ({
				hanzi,
				pinyin: spellForSeed(hanzi)
			})),
			writing_chars: [],
			word_terms: []
		}
	})

	const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(0, '上', 'main'))
	fs.mkdirSync(path.dirname(outPath), { recursive: true })
	fs.writeFileSync(outPath, JSON.stringify(lessons, null, '\t'), 'utf8')
	const totalLiteracy = lessons.reduce((acc, L) => acc + L.literacy_chars.length, 0)
	console.log(`wrote ${outPath} (${lessons.length} lessons, ${totalLiteracy} literacy_chars)`)
}

main()
