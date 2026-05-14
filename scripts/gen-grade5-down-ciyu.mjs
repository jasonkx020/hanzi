/**
 * 五年级下册「词语表」→ static/booktext/renjiaoban/五年级下册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade5-up-ciyu.mjs）
 * 运行：node scripts/gen-grade5-down-ciyu.mjs
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
	蚂蚱: 'mà zha',
	明晃晃: 'míng huǎng huǎng',
	寻思: 'xún si',
	半夜三更: 'bàn yè sān gēng',
	情不自禁: 'qíng bù zì jīn',
	露馅儿: 'lòu xiànr',
	吓唬: 'xià hu',
	龇牙咧嘴: 'zī yá liě zuǐ',
	属于: 'shǔ yú',
	吆喝: 'yāo he',
	牲畜: 'shēng chù',
	附庸: 'fù yōng',
	调度: 'diào dù',
	包袱: 'bāo fu',
	师傅: 'shī fu',
	脚腕子: 'jiǎo wàn zi',
	一针见血: 'yī zhēn jiàn xiě',
	一声不吭: 'yī shēng bù kēng',
	眼巴巴: 'yǎn bā bā',
	操纵: 'cāo zòng',
	笼罩: 'lǒng zhào',
	停泊: 'tíng bó'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	[
		'阅读',
		'2',
		[
			'蝴蝶',
			'蜻蜓',
			'蚂蚱',
			'圆滚滚',
			'明晃晃',
			'樱桃',
			'榆树',
			'瞎闹',
			'锄头',
			'承认',
			'随意'
		]
	],
	[
		'阅读',
		'5',
		[
			'妒忌',
			'委托',
			'照办',
			'预计',
			'紧急',
			'军令状',
			'探听',
			'疑惑',
			'私自',
			'布置',
			'调度',
			'呐喊',
			'神机妙算'
		]
	],
	['阅读', '6', ['半夜三更', '寻思', '耻笑', '胸膛', '武艺']],
	[
		'阅读',
		'10',
		[
			'拟定',
			'参谋',
			'损失',
			'锻炼',
			'情不自禁',
			'慰问',
			'眷恋',
			'奔赴',
			'繁忙',
			'特殊',
			'尊重',
			'签字',
			'下意识',
			'踌躇'
		]
	],
	[
		'阅读',
		'11',
		[
			'诊所',
			'年龄',
			'熟练',
			'审视',
			'一针见血',
			'施行',
			'清醒',
			'颤抖',
			'一声不吭',
			'崭新',
			'由衷',
			'苍白',
			'慈祥',
			'肃然起敬',
			'荣幸'
		]
	],
	[
		'阅读',
		'13',
		[
			'摔跤',
			'手疾眼快',
			'欺负',
			'脚腕子',
			'挺脱',
			'肢体',
			'格局',
			'威严',
			'侄子',
			'喉咙'
		]
	],
	[
		'阅读',
		'14',
		[
			'粉刷',
			'师傅',
			'绝活',
			'派头',
			'包袱',
			'手法',
			'鼓点',
			'衔接',
			'屏障',
			'芝麻',
			'神圣',
			'侵犯',
			'露馅儿',
			'轰然',
			'难堪',
			'发怔'
		]
	],
	[
		'阅读',
		'16',
		[
			'赏识',
			'脚力',
			'胸有成竹',
			'摩拳擦掌',
			'跃跃欲试',
			'兴致勃勃',
			'出谋划策',
			'引荐'
		]
	],
	[
		'阅读',
		'17',
		[
			'航行',
			'风平浪静',
			'取乐',
			'放肆',
			'桅杆',
			'哭笑不得',
			'眼巴巴',
			'吓唬',
			'龇牙咧嘴',
			'船舱',
			'海鸥',
			'瞄准',
			'心惊胆战'
		]
	],
	[
		'阅读',
		'18',
		[
			'纵横',
			'船艄',
			'垫子',
			'操纵',
			'手忙脚乱',
			'保姆',
			'簇拥',
			'沉寂',
			'停泊',
			'码头',
			'笼罩'
		]
	],
	[
		'阅读',
		'19',
		[
			'端庄',
			'仪态',
			'远眺',
			'骏马',
			'遮掩',
			'阻挡',
			'飞驰',
			'辽阔',
			'赞许',
			'属于',
			'板凳',
			'吆喝',
			'铃铛',
			'恢复',
			'沉睡',
			'牲畜',
			'灯塔'
		]
	],
	[
		'阅读',
		'22',
		['拇指', '接触', '纽扣', '相貌', '养尊处优', '渺小', '享乐', '附庸', '团结']
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
	semester: '下',
	list_type: '词语表',
	note:
		'按五年级下册教材附录「词语表」附图录入。课次含 2、5、6、10、11、13、14、16～19、22（未列第1、3、4、7～9、12、15、20、21、23 等课）。本文件逐条全录142个词；教材脚注若与印次有关请以纸书为准。多音词语（蚂蚱mà zha、寻思xún si、半夜三更、调度diào dù、包袱bāo fu、师傅shī fu、露馅儿、吓唬xià hu、吆喝yāo he、属于shǔ yú、牲畜shēng chù、停泊tíng bó、笼罩lǒng zhào、操纵cāo zòng、一针见血xiě等）已按课文常用义标注。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(5, '下', 'words'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 142)')
