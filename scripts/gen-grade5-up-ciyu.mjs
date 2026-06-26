/**
 * @file gen-grade5-up-ciyu.mjs
 * @module scripts
 * @description 源文件：gen-grade5-up-ciyu.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 五年级上册「词语表」→ static/booktext/renjiaoban/五年级上册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade4-up-ciyu.mjs）
 * 运行：node scripts/gen-grade5-up-ciyu.mjs
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
	播种: 'bō zhòng',
	间隔: 'jiàn gé',
	数落: 'shǔ luo',
	挣钱: 'zhèng qián',
	勉强: 'miǎn qiǎng',
	教训: 'jiào xun',
	席子: 'xí zi',
	不可计数: 'bù kě jì shǔ',
	应接不暇: 'yìng jiē bù xiá',
	烦琐: 'fán suǒ'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		[
			'精巧',
			'配合',
			'身段',
			'适宜',
			'白鹤',
			'生硬',
			'寻常',
			'忘却',
			'镜匣',
			'孤独',
			'悠然',
			'嗜好',
			'黄昏',
			'恩惠',
			'美中不足'
		]
	],
	['阅读', '2', ['播种', '浇水', '吩咐', '榨油', '爱慕', '体面']],
	['阅读', '3', ['桂花', '懂得', '糕饼', '茶叶']],
	[
		'阅读',
		'5',
		[
			'汛期',
			'山洪',
			'爆发',
			'间隔',
			'唯独',
			'懒惰',
			'平稳',
			'难免',
			'保持',
			'平衡',
			'协调',
			'美感',
			'示意',
			'家常',
			'假如',
			'理所当然',
			'联结'
		]
	],
	[
		'阅读',
		'6',
		[
			'无价之宝',
			'召集',
			'大臣',
			'商议',
			'解决',
			'完好无缺',
			'称赞',
			'商量',
			'允诺',
			'典礼',
			'承诺',
			'得罪',
			'胆怯',
			'示弱',
			'拒绝',
			'职位',
			'同心协力'
		]
	],
	[
		'阅读',
		'7',
		[
			'猎豹',
			'冠军',
			'陆地',
			'俯冲',
			'高速公路',
			'搭乘',
			'火箭',
			'发动机',
			'手电筒',
			'赤道',
			'难以置信'
		]
	],
	[
		'阅读',
		'8',
		[
			'侵略',
			'修筑',
			'粉碎',
			'领导',
			'不计其数',
			'打击',
			'坚持',
			'游击',
			'隐蔽',
			'陷坑',
			'拐弯',
			'无穷无尽'
		]
	],
	[
		'阅读',
		'9',
		[
			'猎物',
			'酬谢',
			'珍宝',
			'叮嘱',
			'复活',
			'议论',
			'崩塌',
			'焦急',
			'发誓',
			'千真万确',
			'谎话',
			'迟延',
			'灾难',
			'镇定',
			'后悔',
			'悲痛',
			'震天动地'
		]
	],
	[
		'阅读',
		'10',
		[
			'嫂子',
			'剩饭',
			'床铺',
			'亲密',
			'笑嘻嘻',
			'成家立业',
			'好歹',
			'稀罕',
			'妻子',
			'晚霞',
			'一辈子',
			'结婚',
			'相依为命'
		]
	],
	[
		'阅读',
		'14',
		[
			'毁灭',
			'不可估量',
			'损失',
			'举世闻名',
			'众星拱月',
			'金碧辉煌',
			'殿堂',
			'象征',
			'仿照',
			'诗情画意',
			'建筑',
			'漫游',
			'天南海北',
			'饱览',
			'风景名胜',
			'境界',
			'宏伟',
			'奇珍异宝',
			'博物馆',
			'搬运',
			'销毁',
			'罪证',
			'奉命'
		]
	],
	[
		'阅读',
		'16',
		['寸草不生', '摄氏度', '繁殖', '粮食', '煤炭', '飘浮', '地区', '杀菌', '治疗']
	],
	[
		'阅读',
		'17',
		[
			'松鼠',
			'乖巧',
			'清秀',
			'玲珑',
			'尾巴',
			'歇凉',
			'追逐',
			'警觉',
			'触动',
			'光滑',
			'狭窄',
			'勉强',
			'脱落',
			'梳理'
		]
	],
	[
		'阅读',
		'18',
		[
			'长篇',
			'连续',
			'广播',
			'铁路',
			'辞退',
			'挣钱',
			'压抑',
			'潮湿',
			'忙碌',
			'阴暗',
			'酷暑',
			'炎夏',
			'噪声',
			'瘦弱',
			'脊背',
			'口罩',
			'忍心',
			'机械',
			'数落',
			'权利'
		]
	],
	[
		'阅读',
		'19',
		[
			'渔船',
			'报考',
			'教训',
			'心疼',
			'席子',
			'庙会',
			'彩排',
			'糖果',
			'抽象',
			'启迪',
			'毕业',
			'寄宿',
			'师范',
			'路费',
			'轮换',
			'领略',
			'意境',
			'磨灭',
			'精致'
		]
	],
	[
		'阅读',
		'22',
		[
			'陆续',
			'白茫茫',
			'榕树',
			'纠正',
			'不可计数',
			'照耀',
			'涨潮',
			'树梢',
			'应接不暇',
			'画眉'
		]
	],
	[
		'阅读',
		'25',
		[
			'舅父',
			'津津有味',
			'英雄',
			'无限',
			'一知半解',
			'述说',
			'厌烦',
			'荒唐',
			'辛酸',
			'访问',
			'书刊',
			'烦琐',
			'真情实感',
			'质朴',
			'刊物'
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
	grade: 5,
	semester: '上',
	list_type: '词语表',
	note:
		'按五年级上册教材附录「词语表」附图录入。课次不含 4、11、12、13、15、20、21、23、24、26、27 等（该册词语表未列该课）。本文件逐条全录222个词；教材脚注若与印次有关请以纸书为准。多音词语（播种bō zhòng、间隔jiàn gé、数落shǔ luo、挣钱zhèng qián、勉强miǎn qiǎng、教训jiào xun、席子xí zi、不可计数bù kě jì shǔ、应接不暇yìng jiē bù xiá、烦琐fán suǒ等）已按课文常用义标注。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(5, '上', 'words'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 222)')
