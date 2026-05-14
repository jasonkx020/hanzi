/**
 * 三年级上册写字表 → static/booktext/renjiaoban/三年级上册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade3-up-writing.mjs
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
	挑: 'tiāo',
	朝: 'zhāo',
	差: 'chà',
	单: 'dān',
	陆: 'lù',
	血: 'xuè',
	漂: 'piào',
	卷: 'juǎn',
	划: 'huá',
	盛: 'shèng',
	劲: 'jìn',
	抹: 'mǒ',
	欲: 'yù',
	哦: 'ò'
}

/** @type {['阅读'|'语文园地', string, string[]][]} */
const raw = [
	['阅读', '1', ['坡', '球', '招', '呼', '飘', '扬', '读', '热', '闹', '粗', '壮', '洁']],
	['阅读', '2', ['轰', '湿', '润', '笛', '狂', '功', '罚', '互', '碰', '黄', '急']],
	['阅读', '4', ['庭', '相', '未', '寒', '径', '斜', '枫', '霜', '挑', '深', '落']],
	['阅读', '5', ['朗', '晶', '珠', '粘', '印', '案', '展', '列', '规', '则', '凌', '乱']],
	['阅读', '6', ['凉', '杏', '枚', '邮', '票', '爽', '挤', '争', '菊', '频', '勾', '挖', '油']],
	['阅读', '8', ['屋', '板', '准', '备', '等', '暴', '哦', '钻', '爬', '漂', '晒']],
	['语文园地', '语文园地一', ['恒', '圣', '萌', '妥', '轴', '阁', '培', '厘']],
	['阅读', '11', ['葫', '芦', '错', '普', '宫', '肯', '冒', '式', '怜']],
	['阅读', '12', ['旅', '另', '睛', '及', '卷', '救', '命', '尾', '齿', '胃', '管', '刚', '咬']],
	['语文园地', '语文园地二', ['申', '介', '绍', '宗', '旨', '占', '之']],
	[
		'阅读',
		'14',
		['搭', '亲', '祖', '披', '摇', '停', '羽', '翠', '蓝', '静', '悄', '吞', '捕']
	],
	[
		'阅读',
		'15',
		['蒲', '英', '盛', '耍', '使', '劲', '脸', '欠', '朝', '钓', '察', '拢', '喜']
	],
	['阅读', '16', ['景', '优', '淡', '浅', '底', '岩', '鹿', '划', '布', '茂', '密', '厚', '料']],
	['阅读', '17', ['滨', '棕', '帆', '灰', '跟', '渔', '壳', '院', '亚', '透', '除', '踩']],
	['阅读', '18', ['抽', '封', '严', '挡', '坛', '显', '苍', '药', '材', '软', '刮', '挺']],
	['阅读', '20', ['返', '望', '断', '楚', '至', '岸', '孤', '饮', '亦', '欲', '抹', '宜']],
	['阅读', '21', ['妙', '奏', '琴', '柔', '感', '充', '戚', '器', '汇', '鸣', '塘']],
	['阅读', '22', ['虾', '昆', '仅', '序', '荣', '枯', '姿', '态', '刺', '梨', '部', '臭', '秘']],
	['语文园地', '语文园地三', ['螺', '螃', '蟹', '鲤', '鲫', '鲨']],
	['阅读', '23', ['司', '登', '跌', '皆', '弃', '持', '击']],
	['阅读', '24', ['念', '差', '考', '试', '均', '退', '努', '单', '留', '度', '奋']],
	['阅读', '25', ['棒', '伤', '陆', '血', '取', '叠', '匆', '医', '迅', '速', '夺', '秒']],
	['语文园地', '语文园地四', ['睁', '眨', '瞪', '瞅', '怒', '眶', '呆', '睹']]
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
	grade: 3,
	semester: '上',
	list_type: '写字表',
	note:
		'人教版统编三年级上册附录「写字表」按附图书页顺序录入；教材脚注「共250个字」。课次不含 3、7、9、10、13、19（该册写字表未列生字）。语文园地二最后一字纸书为「之」（识字表常见为「乏」，写字表以附图为准）。多音字已按课文常用义标注（挑tiāo、朝zhāo、盛shèng、劲jìn、卷juǎn、差chà、单dān、陆lù、血xuè、漂piào、划huá、抹mǒ、欲yù等）；若印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(3, '上', 'writing'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 250)')
