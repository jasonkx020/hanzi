/**
 * 四年级上册识字表 → static/booktext/renjiaoban/四年级上册-识字表.json
 * 运行：node scripts/gen-grade4-up-literacy.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renjiaoTextbookJsonFile } from '../constants/renjiao-textbook-filenames.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** @type {{ section: string, lesson: string, chars: [string, string][] }[]} */
const groups = [
	{
		section: '阅读',
		lesson: '1',
		chars: [
			['盐', 'yán'],
			['薄', 'bó'],
			['屹', 'yì'],
			['昂', 'áng'],
			['鼎', 'dǐng'],
			['沸', 'fèi'],
			['贯', 'guàn'],
			['浩', 'hào'],
			['崩', 'bēng'],
			['震', 'zhèn'],
			['霎', 'shà'],
			['余', 'yú'],
			['恢', 'huī']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		chars: [
			['鹅', 'é'],
			['卵', 'luǎn'],
			['俗', 'sú'],
			['跃', 'yuè'],
			['穗', 'suì'],
			['镀', 'dù'],
			['埂', 'gěng'],
			['烁', 'shuò']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		chars: [
			['巢', 'cháo'],
			['苇', 'wěi'],
			['罗', 'luó'],
			['霸', 'bà'],
			['占', 'zhàn']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		chars: [
			['昧', 'mèi'],
			['坠', 'zhuì'],
			['怀', 'huái']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		chars: [
			['豌', 'wān'],
			['僵', 'jiāng'],
			['预', 'yù'],
			['揭', 'jiē'],
			['苔', 'tái'],
			['囚', 'qiú'],
			['框', 'kuàng'],
			['溢', 'yì']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		chars: [
			['蝙', 'biān'],
			['蝠', 'fú'],
			['即', 'jí'],
			['锐', 'ruì'],
			['系', 'jì'],
			['铛', 'dāng'],
			['蝇', 'yíng'],
			['证', 'zhèng'],
			['障', 'zhàng'],
			['碍', 'ài'],
			['荧', 'yíng'],
			['屏', 'píng']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		chars: [
			['唤', 'huàn'],
			['纪', 'jì'],
			['获', 'huò'],
			['赖', 'lài'],
			['潜', 'qián'],
			['亿', 'yì'],
			['索', 'suǒ'],
			['奥', 'ào'],
			['舶', 'bó'],
			['质', 'zhì'],
			['哲', 'zhé']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		chars: [
			['避', 'bì'],
			['撼', 'hàn'],
			['喧', 'xuān'],
			['雀', 'qiǎo'],
			['檐', 'yán']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地一',
		chars: [
			['驻', 'zhù'],
			['钞', 'chāo'],
			['培', 'péi'],
			['赌', 'dǔ'],
			['媒', 'méi'],
			['氛', 'fēn'],
			['账', 'zhàng'],
			['贺', 'hè'],
			['樟', 'zhāng'],
			['杠', 'gàng'],
			['狡', 'jiǎo'],
			['猾', 'huá']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		chars: [
			['暮', 'mù'],
			['瑟', 'sè'],
			['缘', 'yuán'],
			['降', 'xiáng'],
			['骚', 'sāo'],
			['逊', 'xùn'],
			['输', 'shū']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		chars: [
			['均', 'jūn'],
			['柄', 'bǐng'],
			['蜗', 'wō'],
			['曲', 'qū'],
			['萎', 'wěi']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		chars: [
			['宅', 'zhái'],
			['隐', 'yǐn'],
			['毫', 'háo'],
			['慎', 'shèn'],
			['址', 'zhǐ'],
			['良', 'liáng'],
			['掘', 'jué'],
			['搜', 'sōu'],
			['倾', 'qīng'],
			['骤', 'zhòu'],
			['置', 'zhì'],
			['抛', 'pāo']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		chars: [
			['劈', 'pī'],
			['缓', 'huǎn'],
			['浊', 'zhuó'],
			['丈', 'zhàng'],
			['隆', 'lóng'],
			['肢', 'zhī'],
			['躯', 'qū'],
			['液', 'yè']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		chars: [
			['少', 'shǎo'],
			['曰', 'yuē'],
			['溺', 'nì'],
			['返', 'fǎn']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		chars: [
			['斯', 'sī'],
			['惨', 'cǎn'],
			['盗', 'dào'],
			['驰', 'chí'],
			['束', 'shù'],
			['押', 'yā'],
			['锁', 'suǒ'],
			['遭', 'zāo'],
			['恶', 'è'],
			['脏', 'zāng'],
			['愤', 'fèn'],
			['砸', 'zá']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		chars: [
			['洪', 'hóng'],
			['措', 'cuò'],
			['混', 'hùn'],
			['项', 'xiàng'],
			['熄', 'xī'],
			['浆', 'jiāng'],
			['塌', 'tā'],
			['窜', 'cuàn'],
			['颂', 'sòng'],
			['绩', 'jì']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地二',
		chars: [
			['圃', 'pǔ'],
			['卉', 'huì'],
			['蕾', 'lěi'],
			['蕊', 'ruǐ'],
			['玫', 'méi'],
			['茉', 'mò'],
			['莉', 'lì'],
			['牡', 'mǔ'],
			['丹', 'dān'],
			['棠', 'táng']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		chars: [
			['嗅', 'xiù'],
			['奈', 'nài'],
			['拯', 'zhěng'],
			['嘶', 'sī'],
			['哑', 'yǎ'],
			['庞', 'páng']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		chars: [
			['级', 'jí'],
			['链', 'liàn'],
			['攀', 'pān'],
			['相', 'xiāng'],
			['辩', 'biàn'],
			['呵', 'hē']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		chars: [
			['谓', 'wèi'],
			['拳', 'quán'],
			['捶', 'chuí'],
			['顽', 'wán'],
			['吁', 'yù'],
			['襟', 'jīn'],
			['膊', 'bó'],
			['瓶', 'píng'],
			['怖', 'bù'],
			['凭', 'píng'],
			['欺', 'qī'],
			['掐', 'qià']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		chars: [
			['囊', 'náng'],
			['露', 'lòu'],
			['羡', 'xiàn'],
			['角', 'jué'],
			['殷', 'yīn'],
			['豁', 'huā'],
			['撇', 'piě'],
			['啊', 'ā'],
			['霉', 'méi'],
			['亏', 'kuī'],
			['哄', 'hōng'],
			['拙', 'zhuō'],
			['唉', 'āi']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		chars: [
			['钉', 'dìng'],
			['况', 'kuàng'],
			['兵', 'bīng'],
			['败', 'bài'],
			['恨', 'hèn'],
			['帅', 'shuài'],
			['彻', 'chè'],
			['溃', 'kuì'],
			['誉', 'yù'],
			['丑', 'chǒu'],
			['豪', 'háo']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地三',
		chars: [
			['韭', 'jiǔ'],
			['芹', 'qín'],
			['蒜', 'suàn'],
			['椒', 'jiāo'],
			['藕', 'ǒu'],
			['薯', 'shǔ'],
			['芋', 'yù']
		]
	},
	{
		section: '阅读',
		lesson: '21',
		chars: [
			['塞', 'sài'],
			['秦', 'qín'],
			['征', 'zhēng'],
			['将', 'jiāng'],
			['杰', 'jié']
		]
	},
	{
		section: '阅读',
		lesson: '22',
		chars: [
			['崛', 'jué'],
			['范', 'fàn'],
			['魏', 'wèi'],
			['晰', 'xī'],
			['效', 'xiào'],
			['淮', 'huái'],
			['惑', 'huò'],
			['惩', 'chéng'],
			['训', 'xùn'],
			['斥', 'chì'],
			['难', 'nàn']
		]
	},
	{
		section: '阅读',
		lesson: '23',
		chars: [
			['蓄', 'xù'],
			['迫', 'pò'],
			['租', 'zū'],
			['纠', 'jiū'],
			['缠', 'chán'],
			['邀', 'yāo'],
			['港', 'gǎng'],
			['扰', 'rǎo'],
			['拒', 'jù'],
			['签', 'qiān'],
			['订', 'dìng'],
			['宁', 'níng'],
			['要', 'yāo'],
			['妄', 'wàng']
		]
	},
	{
		section: '阅读',
		lesson: '24',
		chars: [
			['延', 'yán'],
			['昔', 'xī'],
			['茅', 'máo'],
			['炕', 'kàng'],
			['旦', 'dàn'],
			['媚', 'mèi']
		]
	},
	{
		section: '阅读',
		lesson: '25',
		chars: [
			['戎', 'róng'],
			['诸', 'zhū'],
			['竞', 'jìng'],
			['唯', 'wéi']
		]
	},
	{
		section: '阅读',
		lesson: '26',
		chars: [
			['豹', 'bào'],
			['娶', 'qǔ'],
			['媳', 'xí'],
			['巫', 'wū'],
			['绅', 'shēn'],
			['旱', 'hàn'],
			['徒', 'tú'],
			['吊', 'diào'],
			['磕', 'kē'],
			['凿', 'záo'],
			['溉', 'gài']
		]
	},
	{
		section: '阅读',
		lesson: '27',
		chars: [
			['拜', 'bài'],
			['侯', 'hóu'],
			['肤', 'fū'],
			['扎', 'zhā'],
			['剂', 'jì'],
			['髓', 'suǐ'],
			['纪', 'jì'],
			['标', 'biāo']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地四',
		chars: [
			['纲', 'gāng'],
			['授', 'shòu'],
			['揍', 'zòu'],
			['键', 'jiàn'],
			['谱', 'pǔ'],
			['锈', 'xiù'],
			['沫', 'mò'],
			['砖', 'zhuān'],
			['矿', 'kuàng'],
			['综', 'zōng'],
			['氧', 'yǎng'],
			['俱', 'jù']
		]
	}
]

for (const g of groups) {
	g.chars = g.chars.map(([hanzi, pinyin]) => ({ hanzi, pinyin }))
}

let total = 0
for (const g of groups) total += g.chars.length

const uniq = new Set()
for (const g of groups) for (const c of g.chars) uniq.add(c.hanzi)

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 4,
	semester: '上',
	list_type: '识字表',
	note:
		'人教版统编四年级上册附录「识字表」按附图书页顺序录入；脚注①说明蓝色字为此前已认读生字，此处作多音字学习且不计入生字总数。蓝色多音字按教材标注读音（薄bó、系jì、雀qiǎo、降xiáng、脏zāng、相xiāng、吁yù、啊ā、哄hōng、唉āi、钉dìng、将jiāng、难nàn、要yāo、扎zhā等）。本书脚注「共250个生字」与本文件逐条全录口径不同；本文件逐条全录271条，去重汉字270个（同一汉字在不同课次多次出现计为多行，如「纪」见于第7课与第27课）。附图页末「俱」并入语文园地四组末；印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(4, '上', 'literacy'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log(
	'[gen] wrote',
	outPath,
	'groups',
	groups.length,
	'rows',
	total,
	'unique hanzi',
	uniq.size,
	'(textbook footnote 250)'
)
