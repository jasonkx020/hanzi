/**
 * 二年级下册写字表 → static/booktext/renjiaoban/二年级下册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade2-down-writing.mjs
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
	/** 多音格式 "(Lǜ|Lù)"，不能只删括号内容 */
	if (/^\([^)]+\)$/.test(p)) {
		p = p.slice(1, -1).split('|')[0].trim()
	} else {
		p = p.replace(/\([^)]*\)/g, '').split('|')[0].trim()
	}
	if (!p) return null
	return p.charAt(0).toLowerCase() + p.slice(1)
}

/** @type {['阅读'|'识字'|'语文园地', string, string[]][]} */
const raw = [
	['阅读', '1', ['诗', '碧', '妆', '绿', '丝', '剪', '童', '归']],
	['阅读', '2', ['冲', '寻', '眉', '吐', '闻', '柳', '荡', '桃']],
	['阅读', '3', ['鲜', '原', '叔', '通', '巧', '惊', '礼']],
	['阅读', '4', ['邓', '植', '格', '引', '注', '满']],
	['语文园地', '语文园地一', ['剧', '场']],
	['阅读', '5', ['雷', '锋', '昨', '背', '洒', '汗', '温', '暖']],
	['阅读', '6', ['桌', '尝', '买', '具', '甘', '汁', '甜', '菜', '劳', '应']],
	['阅读', '7', ['弱', '周', '末', '母', '吸', '芬', '芳', '递', '勇', '敢']],
	['语文园地', '语文园地二', ['程', '术', '服', '务']],
	['识字', '1', ['神', '州', '华', '各', '族', '情', '谊', '齐']],
	['识字', '2', ['传', '统', '贴', '街', '扫', '龙', '艾', '全', '团', '真']],
	['识字', '3', ['甲', '骨', '觉', '品', '钱', '币', '与', '财']],
	['识字', '4', ['食', '茄', '烤', '鸭', '煮', '鸡', '蛋', '饭']],
	['语文园地', '语文园地三', ['辣', '乎']],
	['阅读', '8', ['梦', '硬', '铅', '盒', '森', '结', '苹', '精', '灵', '流']],
	['阅读', '9', ['匹', '妹', '波', '纹', '恋', '舍', '求', '奔']],
	['阅读', '10', ['旁', '阿', '姨', '弟', '便', '教', '拼', '音']],
	['语文园地', '语文园地四', ['坦', '克']],
	['阅读', '11', ['亡', '补', '牢', '劝', '丢', '助', '坏', '死']],
	['阅读', '12', ['室', '排', '而', '实', '候', '班', '哈', '举']],
	['阅读', '13', ['愿', '意', '麦', '伯', '刻', '突', '然', '掉']],
	['语文园地', '语文园地五', ['商', '厦', '洞', '穴']],
	['阅读', '14', ['窗', '含', '岭', '泊', '吴', '净', '莲', '映']],
	['阅读', '15', ['乌', '黑', '沉', '压', '响', '新', '迎', '扑']],
	['阅读', '16', ['指', '南', '针', '帮', '忠', '导', '永', '夜', '特', '积']],
	['阅读', '17', ['航', '宇', '宙', '或', '浴', '桶']],
	['语文园地', '语文园地六', ['馆', '所']],
	['阅读', '18', ['扇', '慢', '遇', '定', '病', '睡', '根', '痛']],
	['阅读', '19', ['店', '决', '需', '付', '夫', '终', '期']],
	['阅读', '20', ['蛙', '卖', '搬', '倒', '泉', '砍', '破', '泳']],
	['阅读', '21', ['仿', '佛', '并', '任', '何', '纺', '织', '迟']],
	['语文园地', '语文园地七', ['校', '内']],
	['阅读', '22', ['射', '最', '始', '换', '值', '弓', '炎', '此']],
	['阅读', '23', ['忽', '件', '启', '召', '众', '完', '却', '供']],
	[
		'阅读',
		'24',
		['治', '洪', '姓', '带', '必', '须', '仍', '继', '续', '业']
	],
	['语文园地', '语文园地八', ['灿', '烂']]
]

const groups = raw.map(([section, lesson, chars]) => ({
	section,
	lesson,
	chars: chars.map((hanzi) => ({ hanzi, pinyin: spellChar(hanzi) }))
}))

let total = 0
for (const g of groups) total += g.chars.length

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 2,
	semester: '下',
	list_type: '写字表',
	note:
		'人教版统编二年级下册附录「写字表」按附图书页顺序录入；教材脚注「共250个字」。多音字读音以教材为准；若与印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(2, '下', 'writing'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 250)')
