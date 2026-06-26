/**
 * @file gen-grade6-up-ciyu.mjs
 * @module scripts
 * @description 源文件：gen-grade6-up-ciyu.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 六年级上册「词语表」→ static/booktext/renjiaoban/六年级上册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade5-up-ciyu.mjs）
 * 运行：node scripts/gen-grade6-up-ciyu.mjs
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
	衣裳: 'yī shang',
	参差: 'cēn cī',
	单薄: 'dān bó',
	模糊: 'mó hu',
	类似: 'lèi sì',
	适当: 'shì dàng',
	提供: 'tí gōng',
	尽量: 'jǐn liàng',
	斗篷: 'dǒu peng',
	高粱: 'gāo liang',
	刺猬: 'cì wei',
	讲究: 'jiǎng jiu',
	供品: 'gòng pǐn',
	瘦削: 'shòu xuē',
	解散: 'jiě sàn',
	抽屉: 'chōu ti',
	澄碧: 'chéng bì',
	钢琴: 'gāng qín',
	热乎乎: 'rè hū hū',
	软绵绵: 'ruǎn mián mián',
	湿淋淋: 'shī lín lín',
	呆头呆脑: 'dāi tóu dāi nǎo'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		[
			'绿毯',
			'线条',
			'柔美',
			'惊叹',
			'回味',
			'目的地',
			'洒脱',
			'玻璃',
			'衣裳',
			'彩虹',
			'马蹄',
			'热乎乎',
			'礼貌',
			'拘束',
			'举杯',
			'感人',
			'会心',
			'微笑'
		]
	],
	[
		'阅读',
		'2',
		[
			'宅院',
			'幽雅',
			'伏案',
			'浑浊',
			'笨拙',
			'眼帘',
			'参差',
			'单薄',
			'文思',
			'梦想',
			'迷蒙',
			'模糊',
			'花蕾',
			'恰如',
			'衣襟',
			'恍然',
			'愁怨',
			'顺心',
			'平淡'
		]
	],
	[
		'阅读',
		'6',
		[
			'日寇',
			'奋战',
			'险要',
			'手榴弹',
			'全神贯注',
			'悬崖',
			'斩钉截铁',
			'热血沸腾',
			'攀登',
			'居高临下',
			'山涧',
			'粉身碎骨',
			'雹子',
			'屹立',
			'眺望',
			'喜悦',
			'壮烈',
			'豪迈',
			'不屈'
		]
	],
	[
		'阅读',
		'7',
		[
			'政府',
			'外宾',
			'汇集',
			'预定',
			'爆发',
			'排山倒海',
			'就位',
			'宣告',
			'雄伟',
			'肃静',
			'语调',
			'完毕',
			'检阅',
			'制服',
			'坦克',
			'一致',
			'距离',
			'高潮',
			'次序'
		]
	],
	[
		'阅读',
		'10',
		[
			'疙瘩',
			'疲倦',
			'呆头呆脑',
			'冰棍',
			'别出心裁',
			'技高一筹',
			'橡皮',
			'跺脚',
			'大步流星',
			'颓然',
			'暴露无遗',
			'沮丧',
			'抽屉',
			'念念有词',
			'忘乎所以',
			'心满意足'
		]
	],
	[
		'阅读',
		'11',
		[
			'发达',
			'理论',
			'类似',
			'猜测',
			'起源',
			'适当',
			'氧气',
			'提供',
			'能源',
			'昼夜',
			'神秘',
			'观测',
			'拍摄',
			'斑点',
			'枯萎',
			'干燥',
			'沙漠',
			'磁场',
			'因素',
			'考察',
			'培养'
		]
	],
	[
		'阅读',
		'13',
		[
			'黎明',
			'咆哮',
			'惊慌',
			'嗓子',
			'跌跌撞撞',
			'拥戴',
			'沙哑',
			'党员',
			'呻吟',
			'废话',
			'吞没',
			'猛然'
		]
	],
	[
		'阅读',
		'14',
		[
			'渔夫',
			'汹涌澎湃',
			'风暴',
			'轰鸣',
			'心惊肉跳',
			'抱怨',
			'倾听',
			'探望',
			'照顾',
			'困难',
			'阴冷',
			'自作自受',
			'湿淋淋',
			'渔网',
			'糟糕',
			'忧虑',
			'后脑勺'
		]
	],
	[
		'阅读',
		'16',
		[
			'活生生',
			'高粱',
			'苔藓',
			'草坪',
			'甘蔗',
			'瀑布',
			'增加',
			'缝隙',
			'软绵绵',
			'谚语',
			'农作物',
			'尽量'
		]
	],
	[
		'阅读',
		'17',
		[
			'斗篷',
			'情况',
			'袖子',
			'瓦蓝',
			'衣柜',
			'预报',
			'喧闹',
			'遮盖',
			'讲座',
			'酱油',
			'逗引',
			'嘴唇'
		]
	],
	[
		'阅读',
		'19',
		[
			'晶莹',
			'摇篮',
			'壮观',
			'和蔼',
			'资源',
			'有限',
			'矿产',
			'无私',
			'慷慨',
			'节制',
			'枯竭',
			'贡献',
			'毁坏',
			'滥用',
			'生态',
			'设想',
			'例如',
			'基地',
			'目睹',
			'子孙'
		]
	],
	[
		'阅读',
		'23',
		[
			'谱写',
			'钢琴',
			'幽静',
			'断断续续',
			'茅屋',
			'失明',
			'纯熟',
			'清幽',
			'琴键',
			'景象',
			'陶醉'
		]
	],
	[
		'阅读',
		'25',
		[
			'一望无际',
			'家景',
			'郑重',
			'供品',
			'祭器',
			'讲究',
			'盼望',
			'厨房',
			'毡帽',
			'项圈',
			'刺猬',
			'伶俐',
			'经历',
			'潮汛'
		]
	],
	[
		'阅读',
		'26',
		[
			'预告',
			'昏沉',
			'错综',
			'澄碧',
			'荡漾',
			'解散',
			'退缩',
			'瘦削',
			'浮动',
			'瞬间',
			'凝视',
			'骤然',
			'凌乱',
			'陡然'
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
	semester: '上',
	list_type: '词语表',
	note:
		'按六年级上册教材附录「词语表」附图录入。课次含 1、2、6、7、10、11、13、14、16、17、19、23、25、26（未列第3～5、8、9、12、15、18、20～22、24 等课）。本文件逐条全录224个词；若脚注或印次不同请以纸书为准。多音词语（衣裳yī shang、参差cēn cī、单薄dān bó、模糊mó hu、类似lèi sì、适当shì dàng、提供tí gōng、尽量jǐn liàng、斗篷dǒu peng、高粱gāo liang、刺猬cì wei、讲究jiǎng jiu、供品gòng pǐn、瘦削shòu xuē、解散jiě sàn、抽屉chōu ti、澄碧chéng bì等）已按课文常用义标注。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(6, '上', 'words'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 224)')
