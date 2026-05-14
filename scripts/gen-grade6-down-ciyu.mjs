/**
 * 六年级下册「词语表」→ static/booktext/renjiaoban/六年级下册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade6-up-ciyu.mjs）
 * 运行：node scripts/gen-grade6-down-ciyu.mjs
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
	间断: 'jiàn duàn',
	分外: 'fèn wài',
	搅和: 'jiǎo huo',
	不禁: 'bù jīn',
	剥削: 'bō xuē',
	单调: 'dān diào',
	罢了: 'bà le',
	重见天日: 'chóng jiàn tiān rì',
	摆摊儿: 'bǎi tānr',
	赤裸裸: 'chì luǒ luǒ',
	万象更新: 'wàn xiàng gēng xīn',
	死得其所: 'sǐ dé qí suǒ',
	骆驼: 'luò tuo',
	筷子: 'kuài zi',
	含糊: 'hán hu',
	过度: 'guò dù'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		[
			'热情',
			'风筝',
			'万象更新',
			'鞭炮',
			'眨眼',
			'通宵',
			'间断',
			'万不得已',
			'截然',
			'燃放',
			'亲戚',
			'小贩',
			'摆摊儿',
			'彼此',
			'贺年',
			'骆驼',
			'恰好',
			'一律',
			'彩绘',
			'分外'
		]
	],
	[
		'阅读',
		'2',
		[
			'腊八粥',
			'感觉',
			'沸腾',
			'何况',
			'搅和',
			'资格',
			'可靠',
			'罢了',
			'要不然',
			'猜想',
			'肿胀',
			'惊异',
			'总之',
			'染缸',
			'解释',
			'筷子',
			'浪漫',
			'奈何'
		]
	],
	[
		'阅读',
		'5',
		[
			'流落',
			'凄凉',
			'防御',
			'寂寞',
			'宴会',
			'恐惧',
			'倒霉',
			'忧伤',
			'书籍',
			'缺乏',
			'处境',
			'理智',
			'控制',
			'心平气和',
			'抛弃',
			'重见天日',
			'抵抗',
			'侵袭',
			'倾覆',
			'宽慰',
			'深重',
			'困境',
			'焉知非福'
		]
	],
	[
		'阅读',
		'8',
		[
			'确乎',
			'空虚',
			'不禁',
			'挪移',
			'觉察',
			'叹息',
			'徘徊',
			'微风',
			'何曾',
			'游丝',
			'赤裸裸'
		]
	],
	[
		'阅读',
		'9',
		[
			'明媚',
			'时光',
			'拨弄',
			'草丛',
			'画报',
			'翻箱倒柜',
			'念念叨叨',
			'停顿',
			'晃动',
			'耽搁',
			'泡沫',
			'沉郁',
			'漫长',
			'休止',
			'惊惶',
			'亲吻',
			'依偎',
			'挽回',
			'荒凉'
		]
	],
	[
		'阅读',
		'11',
		[
			'埋头',
			'幼稚',
			'含糊',
			'避免',
			'局势',
			'严峻',
			'轻易',
			'尖锐',
			'僻静',
			'魔鬼',
			'苦刑',
			'冷笑',
			'残暴',
			'匪徒',
			'法庭',
			'安定',
			'占据',
			'会意',
			'执行',
			'过度'
		]
	],
	[
		'阅读',
		'12',
		[
			'革命',
			'解放',
			'彻底',
			'利益',
			'意义',
			'剥削',
			'压迫',
			'批评',
			'兴旺',
			'五湖四海',
			'目标',
			'责任',
			'牺牲',
			'死得其所',
			'制度',
			'寄托',
			'哀思'
		]
	],
	[
		'阅读',
		'15',
		[
			'真理',
			'领域',
			'建树',
			'司空见惯',
			'疑问',
			'敏锐',
			'提取',
			'明显',
			'无聊',
			'不可思议',
			'吻合',
			'偶然',
			'文献',
			'证据',
			'系统',
			'整理',
			'见微知著',
			'灵感',
			'机遇'
		]
	],
	[
		'阅读',
		'16',
		[
			'机器',
			'钟楼',
			'洪亮',
			'街心',
			'盲人',
			'坚硬',
			'清脆',
			'单调',
			'请求',
			'加速',
			'齿轮',
			'唯恐',
			'丑恶',
			'证实',
			'蟋蟀'
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
	grade: 6,
	semester: '下',
	list_type: '词语表',
	note:
		'按六年级下册教材附录「词语表」附图录入。课次含 1、2、5、8、9、11、12、15、16（未列第3、4、6、7、10、13、14等课）。本文件逐条全录162个词；若脚注或印次不同请以纸书为准。多音词语（间断jiàn duàn、分外fèn wài、搅和jiǎo huo、罢了bà le、不禁bù jīn、剥削bō xuē、单调dān diào、重见天日chóng jiàn tiān rì、万象更新gēng xīn、死得其所、摆摊儿、赤裸裸、骆驼luò tuo、含糊hán hu等）已按课文常用义标注。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(6, '下', 'words'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 162)')
