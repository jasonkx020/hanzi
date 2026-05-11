/**
 * 四年级上册写字表 → static/booktext/renjiaoban/四年级上册-写字表.json
 * 拼音：cnchar + cnchar-poly（单字）
 * 运行：node scripts/gen-grade4-up-writing.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const cnchar = require('cnchar')
cnchar.use(require('cnchar-poly'))
cnchar.use(require('cnchar-order'))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function spellChar(ch) {
	let p = cnchar.spell(ch, 'tone', 'poly')
	if (!p || typeof p !== 'string') return null
	p = p.trim()
	if (/^\([^)]+\)$/.test(p)) {
		p = p.slice(1, -1).split('|')[0].trim()
	} else {
		p = p.replace(/\([^)]*\)/g, '').split('|')[0].trim()
	}
	if (!p) return null
	return p.charAt(0).toLowerCase() + p.slice(1)
}

/** 课文语境下的读音覆盖（教材写字表） */
const PINYIN_OVERRIDE = {
	据: 'jù',
	渐: 'jiàn',
	曾: 'céng',
	系: 'jì',
	降: 'xiáng',
	著: 'zhù',
	量: 'liàng',
	俩: 'liǎ',
	旋: 'xuán',
	塞: 'sài',
	尝: 'cháng',
	呵: 'hē',
	颤: 'chàn',
	殷: 'yīn',
	否: 'fǒu',
	溃: 'kuì',
	累: 'lèi'
}

/** @type {['阅读', string, string[]][]} */
const raw = [
	['阅读', '1', ['潮', '据', '堤', '阔', '盼', '滚', '顿', '逐', '渐', '堵', '犹', '崩', '震', '霎', '余']],
	[
		'阅读',
		'2',
		['淘', '牵', '鹅', '卵', '坑', '洼', '填', '庄', '稼', '俗', '跃', '葡', '萄', '稻', '熟']
	],
	[
		'阅读',
		'5',
		['豌', '按', '舒', '适', '暗', '恐', '僵', '硬', '枪', '耐', '探', '愉', '曾', '沟', '溢']
	],
	[
		'阅读',
		'6',
		['蚊', '弄', '科', '横', '竖', '绳', '系', '蝇', '证', '复', '研', '究', '达', '驾', '驶']
	],
	[
		'阅读',
		'7',
		['唤', '纪', '技', '改', '程', '超', '亿', '核', '奥', '益', '联', '质', '哲', '任', '善']
	],
	['阅读', '9', ['暮', '吟', '题', '侧', '峰', '庐', '缘', '降', '费', '须', '逊', '输']],
	[
		'阅读',
		'10',
		['虎', '操', '占', '嫩', '顺', '均', '叠', '隙', '茎', '柄', '萎', '瞧', '固']
	],
	[
		'阅读',
		'11',
		['宅', '临', '慎', '选', '择', '址', '良', '穴', '厅', '卧', '专', '即', '较']
	],
	[
		'阅读',
		'12',
		['睁', '翻', '斧', '劈', '缓', '浊', '丈', '撑', '竭', '累', '液', '奔', '茂', '滋']
	],
	['阅读', '13', ['曰', '溺', '返', '衔']],
	[
		'阅读',
		'14',
		['悲', '惨', '兽', '佩', '坚', '违', '抗', '环', '锁', '既', '狠', '著', '愤', '获']
	],
	[
		'阅读',
		'16',
		['嗅', '呆', '奈', '巢', '齿', '躯', '掩', '护', '幼', '搏', '庞', '量', '愣']
	],
	['阅读', '17', ['级', '链', '颤', '攀', '猴', '念', '辩', '呵']],
	[
		'阅读',
		'18',
		[
			'摸',
			'甚',
			'跪',
			'捶',
			'绕',
			'顽',
			'脖',
			'脱',
			'概',
			'惹',
			'昏',
			'握',
			'摔',
			'凭',
			'掐'
		]
	],
	[
		'阅读',
		'19',
		['班', '鼓', '殷', '俩', '练', '套', '裤', '逃', '亏', '挖', '撤', '堂', '砸', '锅']
	],
	[
		'阅读',
		'20',
		['否', '旋', '况', '败', '椅', '尤', '恨', '帅', '预', '溃', '品', '丑', '豪']
	],
	['阅读', '21', ['塞', '秦', '征', '词', '催', '醉', '杰', '亦', '雄', '项']],
	[
		'阅读',
		'22',
		['肃', '默', '晰', '振', '胸', '怀', '赞', '效', '凡', '顾', '训', '斥']
	],
	['阅读', '25', ['戎', '尝', '诸', '竞', '唯']],
	[
		'阅读',
		'26',
		['豹', '派', '娶', '媳', '妇', '淹', '逼', '浮', '旱', '徒', '扔', '饶', '骗', '灌', '溉']
	]
]

const groups = raw.map(([section, lesson, chars]) => ({
	section,
	lesson,
	chars: chars.map((hanzi) => ({
		hanzi,
		pinyin: PINYIN_OVERRIDE[hanzi] ?? spellChar(hanzi)
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
	list_type: '写字表',
	note:
		'人教版统编四年级上册附录「写字表」按附图书页顺序录入；教材脚注「共250个字」。课次不含 3、4、8、15、23、24、27（该册写字表未列生字）。多音字已按课文常用义标注（据jù、渐jiàn、曾céng、系jì、降xiáng、著zhù、量liàng、俩liǎ、旋xuán、塞sài、尝cháng、呵hē、颤chàn、殷yīn、否fǒu、溃kuì、累lèi等）；若印次差异请以纸书核对。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', '四年级上册-写字表.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'chars', total, '(expect 250)')
