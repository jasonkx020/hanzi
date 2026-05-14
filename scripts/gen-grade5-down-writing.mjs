/**
 * 五年级下册写字表 → static/booktext/renjiaoban/五年级下册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade5-down-writing.mjs
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

function spellChar(ch) {
	let p = cnchar.spell(ch, 'tone', 'poly')
	if (!p || typeof p !== 'string') return null
	p = p.trim()
	if (/^\([^)]+\)$/.test(p)) {
		p = p.slice(1, -1).split('|')[0].trim()
	} else {
		p = p.replace(/\([^)]*\)/g, '').split('|')[0].trim()
	}
	if (!p) return null
	return p.charAt(0).toLowerCase() + p.slice(1)
}

/** 课文语境下的读音覆盖（教材写字表） */
const PINYIN_OVERRIDE = {
	擂: 'léi',
	吭: 'kēng',
	晕: 'yūn',
	监: 'jiàn',
	翘: 'qiào',
	哗: 'huá',
	铛: 'dāng',
	畜: 'chù'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	['阅读', '1', ['昼', '耘', '桑', '晓']],
	[
		'阅读',
		'2',
		['蝴', '蝶', '蚱', '嗡', '樱', '榆', '拔', '瞎', '铲', '锄', '割', '拴', '瓢', '逛']
	],
	[
		'阅读',
		'5',
		['妒', '忌', '曹', '督', '委', '鲁', '遮', '漆', '疑', '惑', '寨', '擂', '呐', '插']
	],
	[
		'阅读',
		'6',
		['冈', '饥', '碟', '斤', '俺', '榜', '杖', '申', '兼', '勿', '拖', '悉', '坠', '膛', '截']
	],
	['阅读', '9', ['篝', '仞', '岳', '摩', '遗', '涕', '巫']],
	[
		'阅读',
		'10',
		[
			'彭',
			'拟',
			'谋',
			'瑞',
			'锻',
			'炼',
			'眷',
			'赴',
			'搞',
			'殊',
			'尊',
			'签',
			'踌',
			'躇',
			'革'
		]
	],
	[
		'阅读',
		'11',
		['庆', '诊', '沃', '龄', '匪', '绷', '审', '剂', '施', '吭', '崭', '衷', '晕', '慈', '祥']
	],
	[
		'阅读',
		'13',
		['跤', '搂', '仗', '鞭', '欺', '挠', '扳', '腕', '剃', '腮', '疤', '监', '侄', '喉', '咙']
	],
	[
		'阅读',
		'14',
		['浆', '傅', '袱', '障', '芝', '圣', '犯', '馅', '轰', '堪', '诈', '傻', '捏', '怔']
	],
	['阅读', '15', ['矛', '盾', '誉', '吾']],
	['阅读', '16', ['赢', '拳', '擦', '策', '荐']],
	[
		'阅读',
		'17',
		['艘', '航', '肆', '桅', '撕', '逗', '唬', '钩', '龇', '咧', '舱', '鸥', '瞄']
	],
	[
		'阅读',
		'18',
		['尼', '斯', '艇', '艄', '翘', '垫', '姆', '祷', '雇', '簇', '哗', '码']
	],
	[
		'阅读',
		'19',
		[
			'仪',
			'眺',
			'骏',
			'驰',
			'辽',
			'绵',
			'属',
			'凳',
			'吆',
			'铛',
			'罐',
			'恢',
			'踢',
			'牲',
			'畜'
		]
	],
	['阅读', '21', ['梁', '聪', '诣', '禽']],
	[
		'阅读',
		'22',
		['拇', '搔', '痒', '秽', '轧', '拧', '螺', '纽', '扣', '貌', '仓', '渺', '享', '庸', '憎']
	]
]

const groups = raw.map(([section, lesson, chars]) => ({
	section,
	lesson,
	chars: chars.map((hanzi) => ({
		hanzi,
		pinyin: PINYIN_OVERRIDE[hanzi] ?? spellChar(hanzi)
	}))
}))

let total = 0
for (const g of groups) total += g.chars.length

const uniq = new Set()
for (const g of groups) for (const c of g.chars) uniq.add(c.hanzi)

const missing = []
for (const g of groups) {
	for (const c of g.chars) {
		if (!c.pinyin) missing.push(`${g.lesson}:${c.hanzi}`)
	}
}
if (missing.length) console.warn('[gen] missing pinyin:', missing.join(', '))

const dupHanzi = []
const seen = new Map()
for (const g of groups) {
	for (const c of g.chars) {
		if (seen.has(c.hanzi)) dupHanzi.push(c.hanzi)
		else seen.set(c.hanzi, g.lesson)
	}
}

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 5,
	semester: '下',
	list_type: '写字表',
	note:
		'人教版统编五年级下册附录「写字表」按附图书页顺序录入；教材脚注「共180个字」。本附图逐条全录181条、去重181字（与脚注差1字时请核对纸书印次）。课次含 1、2、5、6、9～11、13～19、21、22（未列第3、4、7、8、12、20、23等课生字）。多音字按课文常用义标注：擂léi、吭kēng、晕yūn、监jiàn、翘qiào、哗huá、铛dāng、畜chù。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(5, '下', 'writing'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log(
	'[gen] wrote',
	outPath,
	'groups',
	groups.length,
	'chars',
	total,
	'unique',
	uniq.size,
	'dupes',
	dupHanzi.length ? dupHanzi.join(',') : '(none)',
	'(footnote 180)'
)
