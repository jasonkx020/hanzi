/**
 * 二年级下册「词语表」→ static/booktext/renjiaoban/二年级下册-词语表.json
 * 词条来自教材附录附图；第16课后续词条（指点…积雪）并入同一课。
 * 拼音：cnchar（与 gen-grade2-up-ciyu.mjs 相同规则）
 * 运行：node scripts/gen-grade2-down-ciyu.mjs
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

/** @type {['阅读'|'识字', string, string[]][]} */
const raw = [
	[
		'阅读',
		'2',
		['春天', '寻找', '眉毛', '野花', '柳枝', '桃花']
	],
	[
		'阅读',
		'3',
		['鲜花', '先生', '原来', '大叔', '太太', '做客', '正巧', '惊奇', '快活', '美好', '礼物']
	],
	[
		'阅读',
		'4',
		['植树', '碧空如洗', '万里无云', '格外', '引人注目', '休息', '小心', '笔直']
	],
	['阅读', '5', ['雷锋', '叔叔', '昨天', '温暖', '爱心']],
	[
		'阅读',
		'6',
		[
			'好奇',
			'也许',
			'桌子',
			'平时',
			'难道',
			'平常',
			'农民',
			'加工',
			'农具',
			'甜菜',
			'工具',
			'劳动',
			'经过',
			'应该'
		]
	],
	[
		'阅读',
		'7',
		['弱小', '周末', '父母', '吸引', '芬芳', '背包', '雨衣', '为什么', '勇敢']
	],
	[
		'识字',
		'1',
		['神州', '中华', '山川', '长江', '长城', '民族', '情谊']
	],
	[
		'识字',
		'2',
		['传统', '节日', '春节', '花灯', '清明节', '先人', '龙舟', '中秋', '转眼', '团圆']
	],
	[
		'识字',
		'3',
		['故事', '生活', '甲骨文', '样子', '钱币', '钱财', '有关']
	],
	['识字', '4', ['美食', '茄子', '烤鸭', '水煮鱼', '羊肉', '蛋炒饭']],
	[
		'阅读',
		'8',
		['彩色', '铅笔盒', '森林', '雪松', '歌声', '苹果', '精灵', '季节', '流动']
	],
	[
		'阅读',
		'9',
		['出色', '妹妹', '碧绿', '波纹', '恋恋不舍', '柳树', '枝条', '不时']
	],
	[
		'阅读',
		'10',
		['绿色', '一直', '说话', '童话', '阿姨', '发现', '弟弟', '发明', '拼音', '字母', '上升']
	],
	['阅读', '11', ['亡羊补牢', '劝告', '禾苗', '力气', '明白']],
	[
		'阅读',
		'12',
		[
			'杨桃',
			'图画',
			'讲桌',
			'座位',
			'教室',
			'老老实实',
			'时候',
			'哈哈大笑',
			'五角星',
			'画纸',
			'神情'
		]
	],
	[
		'阅读',
		'13',
		['愿意', '飞快', '为难', '伯伯', '立刻', '突然', '吃惊', '认真', '难为情']
	],
	[
		'阅读',
		'15',
		['雷雨', '乌云', '黑沉沉', '闪电', '雷声', '窗户', '清新', '迎面']
	],
	[
		'阅读',
		'16',
		[
			'野外',
			'天然',
			'指南针',
			'帮助',
			'方向',
			'忠实',
			'向导',
			'指点',
			'北极星',
			'永远',
			'黑夜',
			'帮忙',
			'特别',
			'积雪'
		]
	],
	[
		'阅读',
		'17',
		[
			'航天员',
			'宇宙飞船',
			'空间站',
			'活动',
			'主要',
			'方便',
			'直接',
			'浴桶',
			'清理',
			'实在',
			'通常'
		]
	],
	[
		'阅读',
		'18',
		['大象', '耳朵', '扇子', '似的', '慢慢', '遇到', '一定', '每天', '睡觉', '经常', '人家']
	],
	['阅读', '19', ['决定', '商店', '河马', '功夫', '终于', '星期']],
	['阅读', '20', ['青蛙', '野鸭', '泉水', '花丛', '尽情', '游泳']],
	[
		'阅读',
		'21',
		[
			'新奇',
			'目光',
			'到处',
			'仿佛',
			'周游',
			'任何',
			'事情',
			'纺织',
			'怎样',
			'以前',
			'灵巧',
			'色彩',
			'花纹'
		]
	],
	[
		'阅读',
		'22',
		['开始', '光明', '值日', '决心', '最后', '从此', '欢唱', '生机']
	],
	[
		'阅读',
		'23',
		[
			'传说',
			'首领',
			'步行',
			'忽然',
			'启发',
			'搬运',
			'号召',
			'民众',
			'自由',
			'道理',
			'根本',
			'果然',
			'提供',
			'便利'
		]
	],
	[
		'阅读',
		'24',
		[
			'洪水',
			'痛苦',
			'百姓',
			'必须',
			'反而',
			'仍然',
			'治服',
			'继续',
			'采用',
			'奔波',
			'带领',
			'农业',
			'安居乐业'
		]
	]
]

const groups = raw.map(([section, lesson, words]) => ({
	section,
	lesson,
	chars: words.map((hanzi) => ({ hanzi, pinyin: spellWord(hanzi) || null }))
}))

let total = 0
for (const g of groups) total += g.chars.length

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 2,
	semester: '下',
	list_type: '词语表',
	note:
		'按二年级下册教材附录「词语表」附图录入；阅读第16课含跨页词条（指点、北极星…积雪）。阅读第14课在附录中无单独词语条。教材脚注「共240个词」；若印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(2, '下', 'words'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 240)')
