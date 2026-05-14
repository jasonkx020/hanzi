/**
 * 三年级下册写字表 → static/booktext/renjiaoban/三年级下册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade3-down-writing.mjs
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
	燕: 'yàn',
	挨: 'āi',
	荷: 'hé',
	纤: 'xiān',
	杆: 'gān',
	待: 'dài',
	折: 'zhé',
	颈: 'jǐng',
	称: 'chèn',
	恶: 'è',
	累: 'lěi',
	乘: 'chéng',
	爪: 'zhǎo',
	系: 'xì',
	弄: 'nòng',
	雀: 'què',
	叨: 'dāo',
	呕: 'ǒu',
	济: 'jì',
	卜: 'bo',
	喝: 'hē',
	担: 'dān'
}

/** @type {['阅读'|'语文园地', string, string[]][]} */
const raw = [
	['阅读', '1', ['融', '燕', '鸳', '鸯', '惠', '崇', '芽', '梅', '泛', '减']],
	['阅读', '2', ['凑', '波', '集', '偶', '尔', '沾', '闲', '纤', '杆']],
	['阅读', '3', ['荷', '紧', '挨', '蓬', '胀', '裂', '势', '微', '记']],
	['语文园地', '语文园地一', ['匕', '忆', '艺', '乙', '冗', '犬', '税', '兑', '执']],
	['阅读', '5', ['守', '株', '待', '宋', '耕', '折', '颈', '释', '其', '复']],
	['阅读', '6', ['装', '驯', '良', '善', '伸', '谦', '虚', '凶', '恶', '狼', '猎', '捡']],
	['阅读', '7', ['渴', '喝', '匀', '称', '致', '束', '配', '甩', '哀', '追', '扯', '叹', '逃']],
	[
		'阅读',
		'9',
		['官', '否', '窃', '私', '汪', '危', '险', '肌', '攻', '免', '费', '异', '达']
	],
	['阅读', '10', ['验', '证', '阻', '约', '括', '检', '查', '迷', '误', '逆', '陌']],
	['阅读', '12', ['旧', '符', '牧', '份', '魂', '借', '酒', '遥', '兄', '逢', '佳', '倍']],
	['阅读', '13', ['伟', '贡', '献', '创', '尤', '存', '累', '改', '价', '促', '社']],
	[
		'阅读',
		'14',
		['赵', '桥', '拱', '济', '设', '计', '史', '坚', '固', '且', '栏', '贵', '历']
	],
	['语文园地', '语文园地二', ['援', '掷', '投', '捞', '拆', '搅', '拓']],
	['阅读', '16', ['萝', '卜', '愁', '浓', '够', '确', '段', '系', '姐']],
	['阅读', '17', ['希', '担', '容', '易', '震', '零', '肠', '麻', '烦']],
	['阅读', '18', ['垂', '染', '碎', '翅', '膀', '拨', '浪', '抖']],
	['阅读', '19', ['皂', '泡', '类', '弄', '溶', '套', '悠', '若', '骄', '傲']],
	['阅读', '20', ['雀', '养', '粉', '惹', '仰', '粒', '遍', '者', '惜']],
	['语文园地', '语文园地三', ['旭', '屿', '舰', '锚', '瞭', '巡']],
	['阅读', '22', ['烧', '盈', '乘', '寿', '彤', '颜', '钟', '武', '镇', '偏']],
	['阅读', '23', ['临', '越', '阅', '昏', '暗', '况', '报', '梢', '隆']],
	['阅读', '24', ['呈', '幻', '李', '夏', '辉', '芒', '建', '柱', '剑']],
	[
		'阅读',
		'25',
		['性', '顾', '夸', '奖', '承', '袖', '衬', '衫', '负', '责', '泄', '恼']
	],
	[
		'阅读',
		'26',
		['漏', '胖', '驴', '爪', '莫', '厉', '害', '闯', '摸', '歪', '胶', '纵']
	],
	['语文园地', '语文园地四', ['咳', '嗽', '唠', '叨', '呕', '讽', '诚', '辩']]
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
	semester: '下',
	list_type: '写字表',
	note:
		'人教版统编三年级下册附录「写字表」按附图书页顺序录入；教材脚注「共250个字」。课次不含 4、8、11、15、21（该册写字表未列生字）。语文园地四末字纸书为「诚」（非识字表「诫」）。多音字已按课文常用义标注（燕yàn、挨āi、荷hé、纤xiān、杆gān、待dài、颈jǐng、称chèn、恶è、累lěi、乘chéng、爪zhǎo、系xì、弄nòng、雀què、叨dāo、呕ǒu、济jì、卜bo、喝hē、担dān等）；若印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(3, '下', 'writing'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 250)')
