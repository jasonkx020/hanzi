/**
 * @file gen-grade6-down-writing.mjs
 * @module scripts
 * @description 源文件：gen-grade6-down-writing.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 六年级下册写字表 → static/booktext/renjiaoban/六年级下册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade6-down-writing.mjs
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
	咽: 'yàn',
	匙: 'chí',
	脏: 'zāng',
	藏: 'cáng',
	脉: 'mò',
	侯: 'hóu',
	哼: 'hēng',
	栖: 'qī',
	剔: 'tī'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		['醋', '饺', '摊', '拌', '筝', '眨', '宵', '燃', '戚', '贩', '彼', '贺', '轿', '骆', '驼']
	],
	['阅读', '2', ['腊', '粥', '枣', '咽', '匙', '搅', '肿', '熬', '褐', '缸', '脏', '筷', '陈']],
	['阅读', '3', ['御', '侯', '皎', '章', '泣', '盈', '脉', '栖', '鸦']],
	[
		'阅读',
		'5',
		['惧', '凄', '寞', '宴', '霉', '籍', '聊', '乏', '控', '贷', '剔', '毙', '抵', '袭', '覆']
	],
	['阅读', '8', ['藏', '挪', '徘', '徊', '蒸', '裸']],
	[
		'阅读',
		'9',
		['媚', '砖', '叨', '绊', '绞', '耽', '揉', '绽', '沫', '搓', '惶', '吻', '偎']
	],
	['阅读', '10', ['络', '锤', '凿', '焚']],
	[
		'阅读',
		'11',
		['稚', '避', '峻', '啪', '僻', '瞅', '靴', '魔', '刑', '哼', '绑', '啃', '袍', '押', '执']
	],
	['阅读', '12', ['彻', '迁', '泰', '迫', '批', '标', '牺', '炊', '葬']],
	['阅读', '14', ['援', '俱', '弗', '辩']],
	['阅读', '15', ['域', '惯', '圃', '盐', '溅', '蕊', '搜', '蚯', '蚓', '版', '阶']],
	['阅读', '16', ['吠', '脆', '拦', '恶', '蟋', '蟀']]
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
	semester: '下',
	list_type: '写字表',
	note:
		'人教版统编六年级下册附录「写字表」按附图书页顺序录入；教材脚注「共120个字」。课次含 1～3、5、8～12、14～16（未列第4、6、7、13等课生字）。多音字已按课文常用义标注（咽yàn、匙chí、脏zāng、藏cáng、脉mò、栖qī、剔tī、哼hēng等）；若印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(6, '下', 'writing'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 120)')
