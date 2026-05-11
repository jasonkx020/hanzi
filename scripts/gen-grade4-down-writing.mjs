/**
 * 四年级下册写字表 → static/booktext/renjiaoban/四年级下册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade4-down-writing.mjs
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
	剥: 'bō',
	藉: 'jiè',
	卜: 'bǔ',
	率: 'shuài',
	划: 'huá',
	挣: 'zhēng',
	解: 'jiě',
	闷: 'mèn',
	屏: 'bǐng',
	调: 'diào',
	供: 'gōng',
	刹: 'chà',
	臂: 'bei',
	陆: 'lù',
	抹: 'mǒ',
	晃: 'huǎng',
	哩: 'li',
	扒: 'bā',
	弹: 'dàn',
	混: 'hùn',
	禁: 'jìn',
	拆: 'chāi',
	膊: 'bo',
	笼: 'lóng',
	宿: 'sù',
	蜓: 'tíng'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		['杂', '稀', '蜻', '蜓', '蝶', '宿', '徐', '疏', '茅', '檐', '翁', '笼', '赖', '剥']
	],
	[
		'阅读',
		'2',
		['构', '饰', '蹲', '凤', '序', '投', '例', '率', '耸', '踏', '倘', '绘', '谐', '寄', '眠']
	],
	['阅读', '3', ['慰', '藉', '卜', '锐', '滩', '帐', '烁', '蝙', '蝠', '霸', '鹰']],
	[
		'阅读',
		'5',
		[
			'怒',
			'吼',
			'脂',
			'拭',
			'餐',
			'划',
			'晌',
			'辣',
			'渗',
			'挣',
			'番',
			'埋',
			'刷',
			'测',
			'详'
		]
	],
	[
		'阅读',
		'6',
		['笨', '钝', '鸽', '毫', '凌', '末', '描', '隧', '态', '吨', '颅', '膨', '肢', '翼', '辟']
	],
	[
		'阅读',
		'7',
		[
			'纳',
			'拥',
			'箱',
			'臭',
			'蔬',
			'碳',
			'钢',
			'隐',
			'健',
			'康',
			'胞',
			'疾',
			'防',
			'灶',
			'需'
		]
	],
	['阅读', '9', ['繁', '漫', '灭', '藤', '萝', '膝', '涛', '躲']],
	['阅读', '10', ['瓶', '挤', '叉', '挥']],
	[
		'阅读',
		'11',
		['桦', '涂', '茸', '绣', '潇', '穗', '朦', '胧', '寂', '霞', '抹']
	],
	[
		'阅读',
		'13',
		[
			'忧',
			'虑',
			'贪',
			'职',
			'屏',
			'蹭',
			'稿',
			'腔',
			'解',
			'闷',
			'蛇',
			'遭',
			'殃',
			'盆',
			'勃'
		]
	],
	[
		'阅读',
		'14',
		[
			'讨',
			'厌',
			'坝',
			'忠',
			'毒',
			'绩',
			'孵',
			'警',
			'戒',
			'歪',
			'咕',
			'汤',
			'掘',
			'伏',
			'啼'
		]
	],
	[
		'阅读',
		'15',
		[
			'调',
			'促',
			'颇',
			'剧',
			'苟',
			'譬',
			'侍',
			'馆',
			'附',
			'脾',
			'敏',
			'捷',
			'昂',
			'供',
			'添'
		]
	],
	['阅读', '16', ['扩', '范', '努', '刹', '烂', '替', '镶', '紫', '仅']],
	[
		'阅读',
		'17',
		[
			'浙',
			'罗',
			'杜',
			'鹃',
			'窄',
			'郁',
			'肩',
			'臂',
			'移',
			'额',
			'陆',
			'乳',
			'笋',
			'端',
			'源'
		]
	],
	['阅读', '18', ['囊', '萤', '恭', '勤', '博', '贫', '逢']],
	[
		'阅读',
		'19',
		[
			'晋',
			'扭',
			'炕',
			'铅',
			'兵',
			'晃',
			'哩',
			'胳',
			'膊',
			'劫',
			'绸',
			'扒',
			'敌',
			'尸',
			'慌'
		]
	],
	['阅读', '22', ['芙', '蓉', '洛', '壶', '雁']],
	['阅读', '23', ['营', '射', '弹', '荣', '爆', '炸']],
	[
		'阅读',
		'24',
		['伦', '腹', '剖', '窟', '窿', '混', '晰', '维', '秩', '岗', '宰', '措', '遣', '践']
	],
	[
		'阅读',
		'26',
		[
			'介',
			'绍',
			'妖',
			'矩',
			'乖',
			'捧',
			'烫',
			'丫',
			'拽',
			'福',
			'舔',
			'葵',
			'瘦',
			'棒',
			'罢'
		]
	],
	[
		'阅读',
		'27',
		['硕', '允', '砌', '牌', '禁', '惩', '踪', '啸', '私', '颊', '拆']
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
	grade: 4,
	semester: '下',
	list_type: '写字表',
	note:
		'人教版统编四年级下册附录「写字表」按附图书页顺序录入；教材脚注「共250个字」。课次不含 4、8、12、20、21、25、28（该册写字表未列生字）。多音字已按课文常用义标注（剥bō、藉jiè、卜bǔ、率shuài、划huá、挣zhēng、解jiě、闷mèn、屏bǐng、调diào、供gōng、刹chà、臂bei、陆lù、抹mǒ、晃huǎng、哩li、扒bā、弹dàn、混hùn、禁jìn、拆chāi、膊bo、笼lóng、宿sù等）；若印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', '四年级下册-写字表.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 250)')
