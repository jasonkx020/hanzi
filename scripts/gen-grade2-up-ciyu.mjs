/**
 * @file gen-grade2-up-ciyu.mjs
 * @module scripts
 * @description 源文件：gen-grade2-up-ciyu.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 二年级上册「词语表」→ static/booktext/renjiaoban/二年级上册-词语表.json
 * 词条来自教材附录附图；课次从第17课直接接第19课（古诗二首不占单独词语表课号）。
 * 拼音：cnchar 逐字拼读后用空格连接。
 * 运行：node scripts/gen-grade2-up-ciyu.mjs
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

/** 多字词用 spell(..., 'tone') 得 ShēnZǐ 式连写再拆开；单字仍带 poly */
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

/** @type {['阅读'|'识字'|'语文园地', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		['妈妈', '身子', '他们', '看见', '我们', '哪里', '那边', '雪白', '过去', '孩子', '什么']
	],
	[
		'阅读',
		'2',
		['太阳', '天空', '一起', '冬天', '花朵', '池子', '江河', '海洋', '许多', '田地', '工作', '办法', '你们']
	],
	[
		'阅读',
		'3',
		['如果', '已经', '长大', '告别', '四海为家', '自己', '出发', '动物', '胆子', '肚子', '那里', '知识']
	],
	['识字', '1', ['花园', '飞鸟', '红领巾', '欢笑']],
	['识字', '2', ['杨树', '树叶', '松柏', '化石', '开花']],
	['识字', '3', ['拍手', '世界', '云彩', '丛林', '竹林', '朋友', '保护']],
	['识字', '4', ['四季', '春风', '农事', '月光', '身体', '辛苦', '心里', '大家']],
	[
		'阅读',
		'4',
		['天上', '美丽', '爸爸', '下来', '不用', '高兴', '哥哥', '秋千', '彩云']
	],
	[
		'阅读',
		'5',
		['宝贝', '干活', '回来', '一些', '天气', '欢快', '它们', '告诉', '名字', '出门']
	],
	[
		'阅读',
		'6',
		['星星', '晚上', '无数', '奶奶', '中间', '总是', '爷爷', '北边', '勺子', '转动', '这个', '后来']
	],
	[
		'阅读',
		'8',
		['那些', '山顶', '山头', '云海', '仙人', '前方', '仙女']
	],
	[
		'阅读',
		'9',
		['山区', '群山', '树木', '灯光', '中午', '眼前', '细雨', '风光', '中外']
	],
	[
		'阅读',
		'10',
		[
			'地方',
			'水果',
			'月份',
			'枝叶',
			'五光十色',
			'好客',
			'老乡',
			'有的',
			'城市',
			'空气',
			'水分',
			'这里',
			'味道',
			'有名'
		]
	],
	['阅读', '11', ['坐井观天', '哪儿', '回答', '大话', '不过', '那么', '抬头']],
	[
		'阅读',
		'12',
		[
			'当作',
			'前面',
			'面对面',
			'出去',
			'过冬',
			'知道',
			'赶快',
			'正好',
			'明天',
			'清早',
			'好像',
			'一样',
			'天亮',
			'出来'
		]
	],
	[
		'阅读',
		'13',
		['从前', '以后', '多么', '那个', '叶子', '虫子', '自言自语', '邻居', '奇怪']
	],
	['阅读', '14', ['年代', '更加', '明亮', '星星之火', '中国', '胜利', '道路']],
	[
		'阅读',
		'15',
		['同志', '红军', '敌人', '生产', '常常', '来回', '非常', '战士', '一块儿', '白天']
	],
	[
		'阅读',
		'16',
		['难忘', '火红', '人民', '因为', '总理', '人们', '四面八方', '为了', '人群', '欢乐', '开心']
	],
	[
		'阅读',
		'17',
		['由于', '年轻', '共产党员', '共产党', '现在', '一点儿', '消息']
	],
	[
		'阅读',
		'19',
		[
			'于是',
			'无论',
			'船只',
			'同时',
			'行人',
			'一切',
			'上空',
			'看来',
			'不久',
			'路上',
			'出现',
			'散步',
			'消失'
		]
	],
	[
		'阅读',
		'20',
		['空地', '伙伴', '唱歌', '回家', '一会儿', '着火', '火星', '一边', '连忙', '树林', '水汽', '白云']
	],
	[
		'阅读',
		'21',
		['果子', '木工', '身边', '仔细', '能干', '椅子', '怎么', '自信', '从来', '这么']
	],
	['阅读', '22', ['上面', '快乐', '可是', '难过', '但是', '和好']],
	[
		'阅读',
		'23',
		['眼泪', '水花', '青草', '游戏', '只有', '可爱', '可以', '多少', '咱们', '田野', '大地', '远方']
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
	semester: '上',
	list_type: '词语表',
	note:
		'按二年级上册教材附录「词语表」附图逐条录入（chars.hanzi 可为两字及以上词语）。阅读第7课《妈妈睡了》词条在部分印次中与前后页并排，附图未单独列出；纸书脚注「共239个词」。课次从第17课直接接第19课与教材一致。请以所用教科书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(2, '上', 'words'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total)
