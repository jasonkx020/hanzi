/**
 * 五年级上册写字表 → static/booktext/renjiaoban/五年级上册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade5-up-writing.mjs
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
	嵌: 'qiàn',
	召: 'zhào',
	冠: 'guān',
	圈: 'quān',
	绰: 'chuò',
	碌: 'lù',
	哇: 'wa',
	泊: 'bó',
	涨: 'zhǎng',
	岂: 'qǐ',
	朴: 'pǔ',
	葛: 'gě',
	贾: 'jiǎ',
	衰: 'shuāi',
	挨: 'āi',
	溜: 'liū',
	钉: 'dīng'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	['阅读', '1', ['宜', '鹤', '嫌', '朱', '嵌', '框', '匣', '嗜', '哨', '恩', '韵']],
	['阅读', '2', ['亩', '播', '浇', '吩', '咐', '亭', '榨', '慕', '矮', '谈']],
	['阅读', '3', ['懂', '兰', '箩', '婆', '糕', '饼', '浸', '缠', '茶', '捡']],
	[
		'阅读',
		'5',
		['汛', '洪', '访', '鞋', '挽', '隔', '懒', '惰', '稳', '免', '衡', '协', '绰']
	],
	[
		'阅读',
		'6',
		['召', '臣', '议', '缺', '宫', '献', '诺', '典', '承', '抄', '罪', '怯', '拒', '荆']
	],
	['阅读', '7', ['冠', '俯', '喷', '枚', '箭', '浩', '筒', '束', '赤', '圈', '置']],
	['阅读', '8', ['侵', '略', '筑', '堡', '党', '丘', '妨', '蔽', '陷', '拐']],
	[
		'阅读',
		'9',
		['酬', '珍', '叮', '嘱', '塌', '焦', '誓', '谎', '延', '灾', '悔', '扶']
	],
	[
		'阅读',
		'10',
		['郎', '爹', '嫂', '辆', '歹', '罕', '纱', '妻', '趟', '托', '溜', '婚', '辈', '挨']
	],
	['阅读', '12', ['祭', '乃', '熏', '杭', '亥', '恃', '哀', '拘']],
	['阅读', '13', ['泻', '潜', '试', '胎', '皇', '履', '纵', '疆']],
	[
		'阅读',
		'14',
		[
			'毁',
			'估',
			'损',
			'拱',
			'辉',
			'煌',
			'殿',
			'陵',
			'览',
			'境',
			'宏',
			'唐',
			'闯',
			'销',
			'奉'
		]
	],
	['阅读', '16', ['摄', '氏', '殖', '粮', '炭', '区', '杀', '菌', '疗']],
	[
		'阅读',
		'17',
		['鼠', '秀', '玲', '珑', '帽', '尾', '歇', '窝', '滑', '拾', '狭', '勉', '梳']
	],
	[
		'阅读',
		'18',
		['辞', '抑', '碌', '吊', '酷', '暑', '噪', '脊', '罩', '竟', '哇', '忍', '械', '酸', '权']
	],
	[
		'阅读',
		'19',
		['蚕', '考', '疼', '席', '糖', '屑', '迪', '钉', '陪', '毕', '煮', '枕']
	],
	['阅读', '21', ['孙', '泊', '愁', '寺', '畔']],
	[
		'阅读',
		'22',
		['桨', '榕', '纠', '耀', '桩', '涨', '塔', '梢', '暇', '眉', '抛']
	],
	['阅读', '24', ['耻', '悔', '谓', '诵', '岂']],
	[
		'阅读',
		'25',
		['舅', '津', '斩', '限', '凯', '葛', '述', '贾', '衰', '统', '刊', '琐', '朴', '某']
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

const missing = []
for (const g of groups) {
	for (const c of g.chars) {
		if (!c.pinyin) missing.push(`${g.lesson}:${c.hanzi}`)
	}
}
if (missing.length) console.warn('[gen] missing pinyin:', missing.join(', '))

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 5,
	semester: '上',
	list_type: '写字表',
	note:
		'人教版统编五年级上册附录「写字表」按附图书页顺序录入；教材脚注「共220个字」。课次不含 4、11、15、20、23、26、27（该册写字表未列生字）。多音字已按课文常用义标注（嵌qiàn、召zhào、冠guān、圈quān、绰chuò、碌lù、哇wa、泊bó、涨zhǎng、岂qǐ、朴pǔ、葛gě、贾jiǎ、衰shuāi、挨āi、溜liū、钉dīng等）；若印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(5, '上', 'writing'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 220)')
