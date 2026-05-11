/**
 * 三年级上册「词语表」→ static/booktext/renjiaoban/三年级上册-词语表.json
 * 拼音：cnchar + cnchar-poly（规则同 gen-grade2-down-ciyu.mjs）
 * 运行：node scripts/gen-grade3-up-ciyu.mjs
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
	朝阳: 'zhāo yáng',
	功课: 'gōng kè',
	答应: 'dā ying',
	知觉: 'zhī jué'
}

/** @type {['阅读'|'语文园地', string, string[]][]} */
const raw = [
	[
		'阅读',
		'1',
		[
			'山坡',
			'学校',
			'飘扬',
			'课文',
			'声音',
			'招引',
			'热闹',
			'古老',
			'粗壮',
			'枝干',
			'洁白'
		]
	],
	[
		'阅读',
		'2',
		['轰响', '阵雨', '湿润', '风笛', '狂欢', '觉得', '功课', '放学', '老师', '急急忙忙']
	],
	[
		'阅读',
		'5',
		[
			'秋风',
			'放晴',
			'明朗',
			'地面',
			'亮晶晶',
			'落叶',
			'图案',
			'闪闪发光',
			'尽头',
			'排列',
			'规则',
			'凌乱',
			'歌唱',
			'迟到'
		]
	],
	[
		'阅读',
		'6',
		[
			'秋天',
			'清凉',
			'炎热',
			'枫树',
			'邮票',
			'凉爽',
			'果树',
			'菊花',
			'仙子',
			'频频',
			'气味',
			'香甜',
			'松果',
			'丰收'
		]
	],
	[
		'阅读',
		'8',
		[
			'门板',
			'准备',
			'旁边',
			'暴风雨',
			'安心',
			'低头',
			'吃力',
			'再见',
			'母鸡',
			'注意',
			'屋子',
			'漂亮',
			'意思',
			'因此'
		]
	],
	[
		'语文园地',
		'语文园地一',
		['恒心', '神圣', '萌发', '妥当', '车轴', '阁楼', '培植', '厘米']
	],
	[
		'阅读',
		'11',
		[
			'声明',
			'神仙',
			'普通',
			'让步',
			'条件',
			'指甲',
			'得到',
			'衣服',
			'所以',
			'要是',
			'同学',
			'可怜',
			'最好',
			'科学'
		]
	],
	[
		'阅读',
		'12',
		[
			'旅行',
			'要好',
			'答应',
			'做梦',
			'来得及',
			'救命',
			'大吃一惊',
			'尾巴',
			'牙齿',
			'肚皮',
			'食物',
			'消化',
			'当然',
			'刚才',
			'知觉',
			'光亮'
		]
	],
	['语文园地', '语文园地二', ['申请', '介绍', '主旨', '占领', '乏力']],
	[
		'阅读',
		'14',
		['母亲', '外祖父', '船夫', '羽毛', '翠绿', '静悄悄', '翠鸟', '捕鱼']
	],
	[
		'阅读',
		'15',
		[
			'草地',
			'蒲公英',
			'盛开',
			'玩耍',
			'一本正经',
			'使劲',
			'钓鱼',
			'观察',
			'合拢',
			'张开',
			'喜爱'
		]
	],
	[
		'阅读',
		'16',
		[
			'风景',
			'优美',
			'物产',
			'交错',
			'岩石',
			'鹿角',
			'成群结队',
			'布满',
			'条纹',
			'周身',
			'皮球',
			'茂密',
			'肥料',
			'祖国',
			'事业',
			'发展'
		]
	],
	[
		'阅读',
		'17',
		[
			'海滨',
			'街道',
			'交界',
			'水平线',
			'机帆船',
			'来来往往',
			'朝阳',
			'渔民',
			'贝壳',
			'汽笛',
			'出海',
			'银光闪闪',
			'庭院',
			'亚热带',
			'散发',
			'打扫',
			'干净'
		]
	],
	[
		'阅读',
		'18',
		[
			'东北',
			'密密层层',
			'严严实实',
			'视线',
			'山谷',
			'起来',
			'照射',
			'各种各样',
			'花坛',
			'显得',
			'苍翠',
			'药材',
			'捕捉',
			'野兔',
			'景色',
			'宝库'
		]
	],
	[
		'阅读',
		'21',
		[
			'大自然',
			'美妙',
			'音乐家',
			'手风琴',
			'歌手',
			'感受',
			'温柔',
			'合奏',
			'充满',
			'威力',
			'乐器',
			'屋顶',
			'河流',
			'轻快',
			'合唱',
			'水塘'
		]
	],
	[
		'阅读',
		'22',
		[
			'昆虫',
			'万物',
			'沉思',
			'搬家',
			'井然有序',
			'精神',
			'植物',
			'千姿百态',
			'鲜美',
			'池塘',
			'秋高气爽',
			'倒映',
			'游玩',
			'画册',
			'无穷',
			'奥秘',
			'无尽'
		]
	],
	['语文园地', '语文园地三', ['田螺', '螃蟹', '鲤鱼', '鲫鱼', '鲨鱼']],
	[
		'阅读',
		'24',
		[
			'生物',
			'从事',
			'成就',
			'学期',
			'考试',
			'再三',
			'同意',
			'难得',
			'值班',
			'努力',
			'留学',
			'国家',
			'落后',
			'地位',
			'环节',
			'难度',
			'刻苦',
			'兴奋'
		]
	],
	[
		'阅读',
		'25',
		[
			'手术台',
			'阵地',
			'战斗',
			'打响',
			'消灭',
			'伤员',
			'陆续',
			'血丝',
			'匆匆',
			'医生',
			'转告',
			'赶忙',
			'迅速',
			'争分夺秒',
			'连续'
		]
	],
	[
		'语文园地',
		'语文园地四',
		['怒目圆睁', '眨眼', '眼眶', '目瞪口呆', '耳闻目睹']
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
	semester: '上',
	list_type: '词语表',
	note:
		'按三年级上册教材附录「词语表」附图录入；教材脚注「共250个词」。课次不含 3、4、7、9、10、13、19、20、23（该册词语表未列该课）。阅读第12课词条跨页，已合并为一组。四处语文园地按书页顺序标为语文园地一至四。多音词语（如朝阳zhāo yáng、答应dā ying）已按课文常用义标注；若印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', '三年级上册-词语表.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'entries', total, '(expect 250)')
