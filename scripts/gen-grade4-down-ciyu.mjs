/**
 * 四年级下册「词语表」→ static/booktext/renjiaoban/四年级下册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade4-up-ciyu.mjs）
 * 运行：node scripts/gen-grade4-down-ciyu.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
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
	率领: 'shuài lǐng',
	挣扎: 'zhēng zhá',
	淹没: 'yān mò',
	屏息: 'bǐng xī',
	解闷: 'jiě mèn',
	音调: 'yīn diào',
	供养: 'gōng yǎng',
	刹那: 'chà nà',
	窟窿: 'kū long',
	规矩: 'guī ju',
	调遣: 'diào qiǎn',
	子弹: 'zǐ dàn',
	炮弹: 'pào dàn',
	胳膊: 'gē bo',
	摇晃: 'yáo huàng'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	[
		'阅读',
		'2',
		[
			'屋檐',
			'构成',
			'装饰',
			'顺序',
			'华丽',
			'独特',
			'照例',
			'率领',
			'踏步',
			'倘若',
			'和谐',
			'催眠曲',
			'甜蜜',
			'梦乡'
		]
	],
	[
		'阅读',
		'3',
		[
			'慰藉',
			'扫荡',
			'威力',
			'锐利',
			'河滩',
			'帐子',
			'闪烁',
			'奇幻',
			'蝙蝠',
			'霸气',
			'猫头鹰',
			'复杂'
		]
	],
	[
		'阅读',
		'5',
		[
			'怒吼',
			'松脂',
			'拂拭',
			'灰尘',
			'美餐',
			'晌午',
			'热辣辣',
			'淹没',
			'挣扎',
			'成千上万',
			'冲刷',
			'断绝',
			'推测',
			'详细',
			'情形'
		]
	],
	[
		'阅读',
		'6',
		[
			'恐龙',
			'笨重',
			'迟钝',
			'鸽子',
			'凌空',
			'根据',
			'末期',
			'描绘',
			'隧道',
			'地球',
			'形态',
			'膨大',
			'前肢',
			'具备',
			'开辟',
			'脱离'
		]
	],
	[
		'阅读',
		'7',
		[
			'纳米',
			'无能为力',
			'拥有',
			'冰箱',
			'功能',
			'蔬菜',
			'材料',
			'钢铁',
			'隐形',
			'健康',
			'细胞',
			'疾病',
			'预防',
			'病灶',
			'需要',
			'深刻'
		]
	],
	['阅读', '9', ['繁星', '藤萝', '波涛']],
	[
		'阅读',
		'10',
		['墨绿', '嫩绿', '集中', '交叉', '教练', '指挥', '整齐', '节拍']
	],
	['阅读', '11', ['白桦', '毛茸茸', '潇洒', '朦胧', '寂静', '朝霞']],
	[
		'阅读',
		'13',
		[
			'呼唤',
			'响动',
			'尽职',
			'屏息',
			'稿纸',
			'梅花',
			'解闷',
			'勇猛',
			'满月',
			'淘气'
		]
	],
	[
		'阅读',
		'14',
		[
			'讨厌',
			'理由',
			'心事',
			'反抗',
			'忠厚',
			'毒手',
			'成绩',
			'警戒',
			'预备',
			'汤圆'
		]
	],
	[
		'阅读',
		'15',
		[
			'即将',
			'姿态',
			'高傲',
			'音调',
			'局促',
			'京剧',
			'一丝不苟',
			'譬如',
			'侍候',
			'饭馆',
			'附近',
			'脾气',
			'敏捷',
			'空空如也',
			'昂首',
			'供养'
		]
	],
	[
		'阅读',
		'16',
		['清静', '扩大', '范围', '努力', '刹那', '夺目', '分辨', '灿烂', '不仅']
	],
	[
		'阅读',
		'17',
		[
			'杜鹃',
			'气势',
			'聚集',
			'拥挤',
			'心情',
			'脚跟',
			'移动',
			'昏暗',
			'挤压',
			'额角',
			'登陆',
			'宽广',
			'石钟乳',
			'石笋',
			'观赏'
		]
	],
	[
		'阅读',
		'19',
		[
			'芦花',
			'发愣',
			'铅笔',
			'摇晃',
			'胳膊',
			'劫难',
			'鬼脸',
			'戒指',
			'绸子',
			'敌人',
			'尸首',
			'防备',
			'慌忙'
		]
	],
	[
		'阅读',
		'23',
		[
			'战场',
			'持续',
			'命令',
			'占领',
			'射击',
			'突击',
			'枪弹',
			'愤怒',
			'注视',
			'光荣',
			'艰巨',
			'消息',
			'炮弹',
			'爆炸',
			'烈火',
			'子弹',
			'不料',
			'规定',
			'惊天动地',
			'消灭'
		]
	],
	[
		'阅读',
		'24',
		[
			'行驶',
			'凌晨',
			'窟窿',
			'混乱',
			'维持',
			'秩序',
			'岗位',
			'主宰',
			'调遣',
			'践行'
		]
	],
	[
		'阅读',
		'26',
		['介绍', '声明', '妖怪', '规矩', '劈面', '幸福', '向日葵']
	],
	[
		'阅读',
		'27',
		[
			'柔嫩',
			'丰硕',
			'允许',
			'禁止',
			'踪迹',
			'呼啸',
			'始终',
			'吼叫',
			'自私',
			'举动',
			'脸颊',
			'凶狠',
			'拆除'
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
	semester: '下',
	list_type: '词语表',
	note:
		'按四年级下册教材附录「词语表」附图录入；阅读第23课词条跨页，已按书页顺序合并为一组；第10课「节拍」接前页同一课。课次不含 1、4、8、12、18、20、21、22、25、28（该册词语表未列该课）。本文件逐条全录213个词；教材脚注若与印次有关请以纸书为准。多音词语（率领shuài lǐng、挣扎zhēng zhá、淹没yān mò、屏息bǐng xī、解闷jiě mèn、音调yīn diào、供养gōng yǎng、刹那chà nà、窟窿kū long、规矩guī ju、调遣diào qiǎn等）已按课文常用义标注。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', '四年级下册-词语表.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 213)')
