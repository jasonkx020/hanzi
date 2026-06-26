/**
 * @file gen-grade6-up-writing.mjs
 * @module scripts
 * @description 源文件：gen-grade6-up-writing.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 六年级上册写字表 → static/booktext/renjiaoban/六年级上册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade6-up-writing.mjs
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
	裳: 'shang',
	薄: 'bó',
	糊: 'hú',
	丧: 'sàng',
	曝: 'pù',
	削: 'xuē',
	澄: 'chéng',
	撒: 'sā',
	缝: 'fèng',
	轴: 'zhóu',
	嚷: 'rǎng',
	瀑: 'pù',
	苔: 'tái',
	唉: 'āi',
	嘛: 'ma'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	['阅读', '1', ['毯', '玻', '璃', '裳', '虹', '蹄', '腐', '稍', '微']],
	[
		'阅读',
		'2',
		['缀', '窥', '幽', '雅', '案', '拙', '帘', '薄', '糊', '蕾', '恰', '襟', '恍', '怨']
	],
	['阅读', '3', ['德', '鹊', '蝉']],
	['阅读', '5', ['律', '崖', '渡', '索']],
	[
		'阅读',
		'6',
		['寇', '副', '榴', '抢', '贯', '棋', '悬', '沸', '涧', '雹', '屹', '悦', '迈', '屈']
	],
	['阅读', '7', ['政', '府', '宾', '盏', '栏', '汇', '宣', '阅', '制', '坦', '距', '隆']],
	[
		'阅读',
		'10',
		['疙', '瘩', '棍', '裁', '筹', '橡', '雕', '跺', '颓', '沮', '丧', '趴', '屉']
	],
	['阅读', '11', ['谜', '尚', '氧', '倾', '揭', '斑', '燥', '漠', '磁', '素', '盗', '培']],
	['阅读', '13', ['黎', '咆', '哮', '嗓', '哑', '揪', '瞪', '呻', '废']],
	[
		'阅读',
		'14',
		['汹', '涌', '澎', '湃', '熄', '掀', '困', '唉', '淋', '嘿', '糟', '嘛', '皱', '勺']
	],
	['阅读', '16', ['棚', '梁', '叭', '苔', '藓', '坪', '蔗', '瀑', '增', '缝', '谚']],
	[
		'阅读',
		'17',
		['袖', '篷', '缩', '疯', '瓦', '柜', '喧', '甩', '嚷', '蒜', '酱', '唇', '蹦']
	],
	['阅读', '18', ['涯', '莺']],
	['阅读', '19', ['莹', '裹', '篮', '蔼', '资', '矿', '慷', '慨', '贡', '滥', '基', '睹']],
	['阅读', '22', ['哉', '巍', '弦', '轴', '锦', '曝', '矣']],
	['阅读', '23', ['谱', '莱', '茵', '盲', '纯', '键', '缕', '陶']],
	['阅读', '25', ['郑', '拜', '租', '厨', '毡', '羞', '撒', '缚', '猬', '伶', '俐', '窜']],
	['阅读', '26', ['搁', '综', '澄', '萍', '漾', '削', '瞬', '凝', '骤', '掷', '陡']]
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

const missing = []
for (const g of groups) {
	for (const c of g.chars) {
		if (!c.pinyin) missing.push(`${g.lesson}:${c.hanzi}`)
	}
}
if (missing.length) console.warn('[gen] missing pinyin:', missing.join(', '))

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 6,
	semester: '上',
	list_type: '写字表',
	note:
		'人教版统编六年级上册附录「写字表」按附图书页顺序录入；教材脚注「共180个字」。课次不含 4、8、9、12、15、20、21、24（该册写字表未列生字）。多音字已按课文常用义标注（裳shang、薄bó、糊hú、丧sàng、曝pù、削xuē、澄chéng、撒sā、缝fèng、轴zhóu、嚷rǎng等）；若印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(6, '上', 'writing'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 180)')
