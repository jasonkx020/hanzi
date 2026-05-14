/**
 * 四年级上册「词语表」→ static/booktext/renjiaoban/四年级上册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade3-up-ciyu.mjs）
 * 运行：node scripts/gen-grade4-up-ciyu.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renjiaoTextbookJsonFile } from '../constants/renjiao-textbook-filenames.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const cnchar = require('cnchar')
cnchar.use(require('cnchar-poly'))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function spellWord(w) {
	if (!w || !/[\u4e00-\u9fff]/.test(w)) return null
	const han = [...w].filter((ch) => /[\u4e00-\u9fff]/.test(ch))
	if (han.length >= 2) {
		try {
			let p = cnchar.spell(w, 'tone')
			if (p && typeof p === 'string') {
				p = String(p).trim()
				const spaced = p.replace(/([a-zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ])([A-Z])/g, '$1 $2')
				const out = spaced
					.split(/\s+/)
					.map((s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : ''))
					.filter(Boolean)
					.join(' ')
				if (out) return out
			}
		} catch (_) {}
	}
	try {
		let p = cnchar.spell(w, 'tone', 'poly')
		if (p && typeof p === 'string') {
			p = String(p).replace(/\([^)]*\)/g, '').split('|')[0].trim()
			if (p) return p.charAt(0).toLowerCase() + p.slice(1)
		}
	} catch (_) {}
	return null
}

/** 教材语境下的整词拼音覆盖 */
const PINYIN_OVERRIDE = {
	角色: 'jué sè',
	哄堂大笑: 'hōng táng dà xiào',
	分量: 'fèn liàng',
	指望: 'zhǐ wang',
	恨不得: 'hèn bu dé',
	功夫: 'gōng fu',
	结实: 'jiē shi'
}

/** @type {['阅读'|'语文园地', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		[
			'奇观',
			'农历',
			'据说',
			'宽阔',
			'人山人海',
			'滚动',
			'顿时',
			'逐渐',
			'犹如',
			'齐头并进',
			'山崩地裂',
			'霎时',
			'余波',
			'依旧'
		]
	],
	[
		'阅读',
		'2',
		[
			'柔和',
			'鹅卵石',
			'河床',
			'新鲜',
			'修补',
			'坑坑洼洼',
			'庄稼',
			'风俗',
			'葡萄',
			'满意',
			'水稻',
			'成熟',
			'招待',
			'传说'
		]
	],
	[
		'阅读',
		'5',
		[
			'豌豆',
			'按照',
			'暖洋洋',
			'舒适',
			'黑暗',
			'恐怕',
			'僵硬',
			'丰满',
			'等待',
			'强壮',
			'虚弱',
			'耐心',
			'愉快',
			'兴奋',
			'曾经',
			'水沟',
			'洋溢',
			'感激'
		]
	],
	[
		'阅读',
		'6',
		[
			'蚊子',
			'灵巧',
			'科学家',
			'横七竖八',
			'绳子',
			'苍蝇',
			'证明',
			'反复',
			'研究',
			'雷达',
			'显示',
			'驾驶员'
		]
	],
	[
		'阅读',
		'7',
		[
			'呼风唤雨',
			'世纪',
			'技术',
			'改变',
			'程度',
			'超过',
			'腾云驾雾',
			'幻想',
			'原子核',
			'奥秘',
			'日益',
			'联系',
			'物质',
			'哲学',
			'任何',
			'创造',
			'改善'
		]
	],
	[
		'阅读',
		'10',
		[
			'爬山虎',
			'操场',
			'嫩红',
			'舒服',
			'均匀',
			'重叠',
			'空隙',
			'叶柄',
			'反面',
			'触角',
			'弯曲',
			'细小',
			'痕迹',
			'瞧不起',
			'牢固',
			'休想'
		]
	],
	[
		'阅读',
		'11',
		[
			'住宅',
			'临时',
			'功夫',
			'随遇而安',
			'慎重',
			'选择',
			'住址',
			'优良',
			'洞穴',
			'大厅',
			'卧室',
			'专家',
			'即使',
			'平整',
			'清洁',
			'卫生',
			'疲劳'
		]
	],
	[
		'阅读',
		'12',
		[
			'睁眼',
			'黑乎乎',
			'翻身',
			'斧头',
			'缓缓',
			'上升',
			'下降',
			'精疲力竭',
			'血液',
			'奔流不息',
			'汗毛',
			'茂盛',
			'滋润',
			'雨露'
		]
	],
	[
		'阅读',
		'14',
		[
			'人间',
			'悲惨',
			'情景',
			'危害',
			'猛兽',
			'严厉',
			'敬佩',
			'悄悄',
			'坚定',
			'违抗',
			'狠心',
			'尖利',
			'著名',
			'愤愤不平',
			'获得'
		]
	],
	[
		'阅读',
		'16',
		[
			'打猎',
			'猛烈',
			'无可奈何',
			'拍打',
			'嘴角',
			'分明',
			'牙齿',
			'绝望',
			'尖叫',
			'身躯',
			'掩护',
			'幼儿',
			'搏斗',
			'庞大',
			'安然',
			'强大',
			'力量'
		]
	],
	[
		'阅读',
		'17',
		[
			'假日',
			'云彩',
			'石级',
			'发颤',
			'年纪',
			'奋力',
			'猴子',
			'纪念',
			'辫子',
			'笑呵呵',
			'鼓舞',
			'居然'
		]
	],
	[
		'阅读',
		'18',
		[
			'甚至',
			'顽皮',
			'故意',
			'脖子',
			'扑打',
			'忙乱',
			'大概',
			'助威',
			'昏乱',
			'结实',
			'汉子',
			'可笑',
			'无缘无故',
			'平白'
		]
	],
	[
		'阅读',
		'19',
		[
			'文艺',
			'表演',
			'班级',
			'鼓掌',
			'角色',
			'殷切',
			'期待',
			'排练',
			'危机',
			'通情达理',
			'充分',
			'自信',
			'提示',
			'撤换',
			'紧张',
			'哄堂大笑',
			'砸锅',
			'至今'
		]
	],
	[
		'阅读',
		'20',
		[
			'冰天雪地',
			'否则',
			'旋转',
			'重整旗鼓',
			'况且',
			'得心应手',
			'椅子',
			'尤其',
			'手舞足蹈',
			'恨不得',
			'预料',
			'不动声色',
			'顽强',
			'溃败',
			'自豪'
		]
	],
	[
		'阅读',
		'22',
		[
			'严肃',
			'默默',
			'清晰',
			'抱负',
			'胸怀',
			'赞叹',
			'表情',
			'忘怀',
			'果真',
			'非凡',
			'左顾右盼',
			'指望',
			'训斥',
			'体会',
			'分量',
			'响亮'
		]
	],
	[
		'阅读',
		'26',
		[
			'管理',
			'人烟',
			'媳妇',
			'新娘',
			'眼睁睁',
			'干旱',
			'迎接',
			'徒弟',
			'面如土色',
			'求饶',
			'灌溉',
			'收成'
		]
	]
]

const groups = raw.map(([section, lesson, words]) => ({
	section,
	lesson,
	chars: words.map((hanzi) => ({
		hanzi,
		pinyin: PINYIN_OVERRIDE[hanzi] ?? spellWord(hanzi)
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
	semester: '上',
	list_type: '词语表',
	note:
		'按四年级上册教材附录「词语表」附图录入；阅读第18课词条跨页，已合并为一组。课次不含 3、4、8、9、13、15、21、23、24、25、27（该册词语表未列该课）。本文件逐条全录241个词；教材脚注若与印次有关请以纸书为准。多音词语（角色jué sè、哄堂大笑hōng…、分量fèn liàng、指望zhǐ wang、恨不得hèn bu dé、功夫gōng fu、结实jiē shi等）已按课文常用义标注。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(4, '上', 'words'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 241)')
