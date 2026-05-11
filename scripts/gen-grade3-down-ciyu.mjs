/**
 * 三年级下册「词语表」→ static/booktext/renjiaoban/三年级下册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade3-up-ciyu.mjs）
 * 运行：node scripts/gen-grade3-down-ciyu.mjs
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
	乌黑: 'wū hēi',
	便宜: 'pián yi',
	匀称: 'yún chèn',
	闲散: 'xián sǎn',
	瞭望: 'liào wàng',
	沉闷: 'chén mèn',
	红彤彤: 'hóng tóng tóng',
	金灿灿: 'jīn càn càn',
	乱蓬蓬: 'luàn péng péng',
	轰隆隆: 'hōng lōng lōng',
	丁零: 'dīng líng'
}

/** @type {['阅读'|'语文园地', string, string[]][]} */
const raw = [
	[
		'阅读',
		'2',
		[
			'燕子',
			'乌黑',
			'剪刀',
			'活泼',
			'轻风',
			'洒落',
			'赶集',
			'光彩夺目',
			'春光',
			'偶尔',
			'闲散',
			'纤细',
			'电线'
		]
	],
	[
		'阅读',
		'3',
		[
			'荷花',
			'公园',
			'清香',
			'赶紧',
			'荷叶',
			'莲蓬',
			'破裂',
			'姿势',
			'画家',
			'本领',
			'了不起',
			'微风',
			'停止'
		]
	],
	['语文园地', '语文园地一', ['匕首', '乙方', '冗长', '军犬', '兑换', '争执']],
	[
		'阅读',
		'6',
		[
			'友情',
			'认识',
			'忠诚',
			'驯良',
			'善良',
			'温和',
			'答谢',
			'花言巧语',
			'着急',
			'相信',
			'尘土',
			'凶恶',
			'恶狠狠',
			'猎人',
			'收拾'
		]
	],
	[
		'阅读',
		'7',
		[
			'痛快',
			'匀称',
			'精美',
			'别致',
			'眉头',
			'没精打采',
			'机灵',
			'灰心丧气',
			'机会',
			'叹气',
			'逃生'
		]
	],
	[
		'阅读',
		'9',
		[
			'宁静',
			'器官',
			'是否',
			'窃窃私语',
			'危险',
			'方法',
			'肌肉',
			'攻击',
			'利用',
			'后退',
			'免费',
			'差异',
			'清楚',
			'奇异'
		]
	],
	[
		'阅读',
		'10',
		[
			'实验',
			'验证',
			'记号',
			'减少',
			'阻力',
			'大约',
			'包括',
			'检查',
			'至少',
			'迷失',
			'无误',
			'逆风',
			'陌生',
			'景物',
			'能力'
		]
	],
	[
		'阅读',
		'13',
		[
			'文明',
			'伟大',
			'贡献',
			'祖先',
			'创造',
			'材料',
			'尤其',
			'保存',
			'吸收',
			'积累',
			'经验',
			'改进',
			'价格',
			'便宜',
			'满足',
			'促进',
			'社会'
		]
	],
	[
		'阅读',
		'14',
		[
			'闻名',
			'设计',
			'创举',
			'减轻',
			'不但',
			'坚固',
			'而且',
			'美观',
			'体现',
			'才干',
			'宝贵',
			'历史',
			'文化'
		]
	],
	['语文园地', '语文园地二', ['援助', '投掷', '打捞', '拆分', '搅动', '拓展']],
	[
		'阅读',
		'16',
		['胡萝卜', '胡子', '发愁', '浓密', '面包', '完全', '结实', '确定', '足够', '确实']
	],
	[
		'阅读',
		'17',
		[
			'希望',
			'形状',
			'喜欢',
			'担心',
			'容易',
			'丁零',
			'失望',
			'巧克力',
			'香肠',
			'花生',
			'牛奶',
			'互相',
			'想念',
			'饭菜',
			'可能',
			'麻烦',
			'眼睛',
			'秘密'
		]
	],
	[
		'阅读',
		'18',
		['童年', '垂柳', '平静', '翅膀', '戏耍', '葫芦', '松树', '清爽', '泥土', '开放']
	],
	[
		'阅读',
		'19',
		[
			'肥皂泡',
			'种类',
			'其中',
			'溶化',
			'网球',
			'分裂',
			'形式',
			'圆满',
			'夕阳',
			'目送',
			'骄傲'
		]
	],
	[
		'阅读',
		'20',
		[
			'养病',
			'粉红',
			'仰望',
			'或者',
			'严寒',
			'本来',
			'可惜',
			'肯定',
			'微笑',
			'诚实'
		]
	],
	[
		'语文园地',
		'语文园地三',
		['旭日', '岛屿', '海岸', '浪花', '军舰', '铁锚', '瞭望', '巡航']
	],
	[
		'阅读',
		'22',
		[
			'火烧云',
			'笑盈盈',
			'乘凉',
			'高寿',
			'红彤彤',
			'变化',
			'金灿灿',
			'颜色',
			'似乎',
			'威武',
			'镇静',
			'其实',
			'沉静',
			'偏偏',
			'等待',
			'爱好'
		]
	],
	[
		'阅读',
		'23',
		[
			'来临',
			'沉闷',
			'奇形怪状',
			'昏暗',
			'轻微',
			'情况',
			'动静',
			'赶路',
			'抖动',
			'树梢',
			'乱蓬蓬',
			'轰隆隆'
		]
	],
	[
		'阅读',
		'24',
		[
			'奇妙',
			'生命',
			'呈现',
			'变幻',
			'圆润',
			'李子',
			'夏日',
			'感叹',
			'光辉',
			'神奇',
			'光芒',
			'建造',
			'冰柱',
			'锋利',
			'刀剑',
			'融化'
		]
	],
	[
		'阅读',
		'25',
		[
			'性子',
			'顾客',
			'笑话',
			'大方',
			'夸奖',
			'承认',
			'提前',
			'服务',
			'满意',
			'袖子',
			'衬衫',
			'负责',
			'名声',
			'泄气',
			'放心',
			'手艺',
			'感动',
			'恼怒'
		]
	],
	[
		'阅读',
		'26',
		[
			'莫非',
			'厉害',
			'走南闯北',
			'听说',
			'发抖',
			'害怕',
			'松手',
			'骨头',
			'逃命',
			'甘心',
			'逃跑'
		]
	],
	[
		'语文园地',
		'语文园地四',
		['呼吸', '咳嗽', '唠叨', '吆喝', '诉说', '讽刺', '告诫', '辩论']
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
	grade: 3,
	semester: '下',
	list_type: '词语表',
	note:
		'按三年级下册教材附录「词语表」附图录入；教材脚注「共271个词」。课次不含 1、4、5、8、11、12、15、21（该册词语表未列该课）。四处语文园地按书页顺序标为语文园地一至四。多音词语（便宜pián yi、匀称yún chèn、闲散xián sǎn、瞭望liào wàng、沉闷chén mèn等）已按课文常用义标注；若印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', '三年级下册-词语表.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 271)')
