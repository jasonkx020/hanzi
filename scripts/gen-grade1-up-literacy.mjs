/**
 * 一年级上册识字表 → JSON + seed-curriculum.json（替换原一年级上·识字表种子）
 * 运行：node scripts/gen-grade1-up-literacy.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** @typedef {{ section: string, lesson: string, lesson_hint: string, pairs: [string, string][] }} Group */

/** 书页顺序：识字 → 汉语拼音（含10–14课）→ 园地 → 阅读 … */
/** @type {Group[]} */
const GROUPS = [
	{
		section: '识字',
		lesson: '1',
		lesson_hint: '识字1',
		pairs: [
			['天', 'tiān'],
			['地', 'dì'],
			['人', 'rén'],
			['你', 'nǐ'],
			['我', 'wǒ'],
			['他', 'tā']
		]
	},
	{
		section: '识字',
		lesson: '2',
		lesson_hint: '识字2',
		pairs: [
			['一', 'yī'],
			['二', 'èr'],
			['三', 'sān'],
			['四', 'sì'],
			['五', 'wǔ'],
			['上', 'shàng'],
			['下', 'xià']
		]
	},
	{
		section: '识字',
		lesson: '3',
		lesson_hint: '识字3',
		pairs: [
			['口', 'kǒu'],
			['耳', 'ěr'],
			['目', 'mù'],
			['手', 'shǒu'],
			['足', 'zú'],
			['站', 'zhàn'],
			['坐', 'zuò']
		]
	},
	{
		section: '识字',
		lesson: '4',
		lesson_hint: '识字4',
		pairs: [
			['日', 'rì'],
			['月', 'yuè'],
			['山', 'shān'],
			['川', 'chuān'],
			['水', 'shuǐ'],
			['火', 'huǒ'],
			['田', 'tián'],
			['禾', 'hé']
		]
	},
	{
		section: '识字',
		lesson: '语文园地一',
		lesson_hint: '语文园地一',
		pairs: [
			['六', 'liù'],
			['七', 'qī'],
			['八', 'bā'],
			['九', 'jiǔ'],
			['十', 'shí']
		]
	},
	{
		section: '汉语拼音',
		lesson: '3',
		lesson_hint: '拼音3',
		pairs: [
			['爸', 'bà'],
			['妈', 'mā']
		]
	},
	{
		section: '汉语拼音',
		lesson: '4',
		lesson_hint: '拼音4',
		pairs: [
			['大', 'dà'],
			['马', 'mǎ'],
			['路', 'lù'],
			['土', 'tǔ']
		]
	},
	{
		section: '汉语拼音',
		lesson: '语文园地二',
		lesson_hint: '语文园地二',
		pairs: [
			['本', 'běn'],
			['学', 'xué'],
			['校', 'xiào'],
			['班', 'bān'],
			['级', 'jí'],
			['姓', 'xìng'],
			['名', 'míng'],
			['王', 'wáng']
		]
	},
	{
		section: '汉语拼音',
		lesson: '5',
		lesson_hint: '拼音5',
		pairs: [
			['哥', 'gē'],
			['弟', 'dì'],
			['画', 'huà'],
			['花', 'huā']
		]
	},
	{
		section: '汉语拼音',
		lesson: '6',
		lesson_hint: '拼音6',
		pairs: [
			['打', 'dǎ'],
			['棋', 'qí'],
			['积', 'jī'],
			['木', 'mù']
		]
	},
	{
		section: '汉语拼音',
		lesson: '7',
		lesson_hint: '拼音7',
		pairs: [
			['字', 'zì'],
			['词', 'cí'],
			['句', 'jù'],
			['子', 'zǐ']
		]
	},
	{
		section: '汉语拼音',
		lesson: '8',
		lesson_hint: '拼音8',
		pairs: [
			['桌', 'zhuō'],
			['纸', 'zhǐ'],
			['读', 'dú'],
			['书', 'shū']
		]
	},
	{
		section: '汉语拼音',
		lesson: '9',
		lesson_hint: '拼音9',
		pairs: [
			['鱼', 'yú'],
			['鸭', 'yā'],
			['乌', 'wū'],
			['鸦', 'yā']
		]
	},
	{
		section: '汉语拼音',
		lesson: '语文园地三',
		lesson_hint: '语文园地三',
		pairs: [
			['午', 'wǔ'],
			['星', 'xīng'],
			['期', 'qī'],
			['语', 'yǔ'],
			['文', 'wén'],
			['数', 'shù'],
			['写', 'xiě'],
			['会', 'huì']
		]
	},
	{
		section: '汉语拼音',
		lesson: '10',
		lesson_hint: '拼音10',
		pairs: [
			['白', 'bái'],
			['菜', 'cài'],
			['西', 'xī'],
			['瓜', 'guā'],
			['果', 'guǒ']
		]
	},
	{
		section: '汉语拼音',
		lesson: '11',
		lesson_hint: '拼音11',
		pairs: [
			['小', 'xiǎo'],
			['桥', 'qiáo'],
			['流', 'liú'],
			['柳', 'liǔ']
		]
	},
	{
		section: '汉语拼音',
		lesson: '12',
		lesson_hint: '拼音12',
		pairs: [
			['开', 'kāi'],
			['雪', 'xuě'],
			['夜', 'yè'],
			['色', 'sè'],
			['美', 'měi']
		]
	},
	{
		section: '汉语拼音',
		lesson: '13',
		lesson_hint: '拼音13',
		pairs: [
			['蓝', 'lán'],
			['云', 'yún'],
			['草', 'cǎo'],
			['原', 'yuán']
		]
	},
	{
		section: '汉语拼音',
		lesson: '14',
		lesson_hint: '拼音14',
		pairs: [
			['冰', 'bīng'],
			['自', 'zì'],
			['行', 'xíng'],
			['车', 'chē']
		]
	},
	{
		section: '汉语拼音',
		lesson: '语文园地四',
		lesson_hint: '语文园地四',
		pairs: [
			['晚', 'wǎn'],
			['昨', 'zuó'],
			['今', 'jīn'],
			['明', 'míng'],
			['个', 'gè'],
			['这', 'zhè'],
			['去', 'qù'],
			['年', 'nián']
		]
	},
	{
		section: '阅读',
		lesson: '1',
		lesson_hint: '阅读1',
		pairs: [
			['秋', 'qiū'],
			['气', 'qì'],
			['了', 'le'],
			['树', 'shù'],
			['叶', 'yè'],
			['黄', 'huáng'],
			['片', 'piàn'],
			['从', 'cóng'],
			['来', 'lái'],
			['飞', 'fēi']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		lesson_hint: '阅读2',
		pairs: [
			['江', 'jiāng'],
			['南', 'nán'],
			['可', 'kě'],
			['采', 'cǎi'],
			['莲', 'lián'],
			['戏', 'xì'],
			['间', 'jiān'],
			['东', 'dōng'],
			['北', 'běi']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		lesson_hint: '阅读3',
		pairs: [
			['的', 'de'],
			['家', 'jiā'],
			['鸡', 'jī'],
			['竹', 'zhú'],
			['牙', 'yá'],
			['用', 'yòng'],
			['几', 'jǐ'],
			['步', 'bù'],
			['没', 'méi'],
			['参', 'cān'],
			['加', 'jiā']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		lesson_hint: '阅读4',
		pairs: [
			['鸟', 'niǎo'],
			['说', 'shuō'],
			['是', 'shì'],
			['春', 'chūn'],
			['青', 'qīng'],
			['蛙', 'wā'],
			['夏', 'xià'],
			['着', 'zhe'],
			['皮', 'pí'],
			['地', 'de'],
			['就', 'jiù'],
			['冬', 'dōng']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地五',
		lesson_hint: '语文园地五',
		pairs: [
			['男', 'nán'],
			['女', 'nǚ'],
			['关', 'guān'],
			['正', 'zhèng'],
			['反', 'fǎn'],
			['先', 'xiān'],
			['后', 'hòu'],
			['内', 'nèi'],
			['外', 'wài']
		]
	},
	{
		section: '识字',
		lesson: '5',
		lesson_hint: '识字5',
		pairs: [
			['对', 'duì'],
			['歌', 'gē'],
			['雨', 'yǔ'],
			['风', 'fēng'],
			['虫', 'chóng'],
			['清', 'qīng'],
			['绿', 'lǜ'],
			['桃', 'táo'],
			['红', 'hóng']
		]
	},
	{
		section: '识字',
		lesson: '6',
		lesson_hint: '识字6',
		pairs: [
			['力', 'lì'],
			['尖', 'jiān'],
			['尘', 'chén'],
			['众', 'zhòng'],
			['双', 'shuāng'],
			['林', 'lín'],
			['森', 'sēn'],
			['不', 'bù'],
			['条', 'tiáo'],
			['心', 'xīn'],
			['金', 'jīn']
		]
	},
	{
		section: '识字',
		lesson: '7',
		lesson_hint: '识字7',
		pairs: [
			['包', 'bāo'],
			['尺', 'chǐ'],
			['作', 'zuò'],
			['业', 'yè'],
			['笔', 'bǐ'],
			['刀', 'dāo'],
			['宝', 'bǎo'],
			['贝', 'bèi'],
			['少', 'shǎo'],
			['课', 'kè'],
			['早', 'zǎo']
		]
	},
	{
		section: '识字',
		lesson: '8',
		lesson_hint: '识字8',
		pairs: [
			['升', 'shēng'],
			['国', 'guó'],
			['旗', 'qí'],
			['中', 'zhōng'],
			['们', 'men'],
			['声', 'shēng'],
			['起', 'qǐ'],
			['么', 'me'],
			['向', 'xiàng'],
			['立', 'lì']
		]
	},
	{
		section: '识字',
		lesson: '语文园地六',
		lesson_hint: '语文园地六',
		pairs: [
			['老', 'lǎo'],
			['师', 'shī'],
			['工', 'gōng'],
			['厂', 'chǎng'],
			['医', 'yī'],
			['院', 'yuàn'],
			['生', 'shēng'],
			['门', 'mén'],
			['卫', 'wèi']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		lesson_hint: '阅读5',
		pairs: [
			['船', 'chuán'],
			['弯', 'wān'],
			['儿', 'ér'],
			['两', 'liǎng'],
			['头', 'tóu'],
			['在', 'zài'],
			['里', 'lǐ'],
			['看', 'kàn'],
			['见', 'jiàn'],
			['闪', 'shǎn']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		lesson_hint: '阅读6',
		pairs: [
			['影', 'yǐng'],
			['前', 'qián'],
			['常', 'cháng'],
			['黑', 'hēi'],
			['狗', 'gǒu'],
			['左', 'zuǒ'],
			['右', 'yòu'],
			['它', 'tā'],
			['好', 'hǎo'],
			['朋', 'péng'],
			['友', 'yǒu']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		lesson_hint: '阅读7',
		pairs: [
			['件', 'jiàn'],
			['有', 'yǒu'],
			['和', 'hé'],
			['做', 'zuò'],
			['也', 'yě'],
			['办', 'bàn'],
			['到', 'dào'],
			['又', 'yòu'],
			['才', 'cái'],
			['能', 'néng']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地七',
		lesson_hint: '语文园地七',
		pairs: [
			['爷', 'yé'],
			['奶', 'nǎi'],
			['叔', 'shū'],
			['姐', 'jiě'],
			['妹', 'mèi']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		lesson_hint: '阅读8',
		pairs: [
			['比', 'bǐ'],
			['尾', 'wěi'],
			['巴', 'ba'],
			['谁', 'shuí'],
			['长', 'cháng'],
			['短', 'duǎn'],
			['把', 'bǎ'],
			['伞', 'sǎn'],
			['兔', 'tù'],
			['最', 'zuì'],
			['公', 'gōng']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		lesson_hint: '阅读9',
		pairs: [
			['喝', 'hē'],
			['只', 'zhī'],
			['处', 'chù'],
			['找', 'zhǎo'],
			['着', 'zháo'],
			['许', 'xǔ'],
			['石', 'shí'],
			['出', 'chū'],
			['法', 'fǎ'],
			['放', 'fàng'],
			['进', 'jìn'],
			['高', 'gāo']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		lesson_hint: '阅读10',
		pairs: [
			['点', 'diǎn'],
			['数', 'shǔ'],
			['彩', 'cǎi'],
			['半', 'bàn'],
			['空', 'kōng'],
			['问', 'wèn'],
			['回', 'huí'],
			['答', 'dá'],
			['方', 'fāng'],
			['久', 'jiǔ'],
			['更', 'gèng'],
			['长', 'zhǎng']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地八',
		lesson_hint: '语文园地八',
		pairs: [
			['牛', 'niú'],
			['羊', 'yáng'],
			['爪', 'zhuǎ'],
			['元', 'yuán'],
			['拼', 'pīn'],
			['音', 'yīn']
		]
	}
]

function main() {
	let total = 0
	for (const g of GROUPS) total += g.pairs.length

	const groupsJson = GROUPS.map((g) => ({
		section: g.section,
		lesson: g.lesson,
		chars: g.pairs.map(([hanzi, pinyin]) => ({ hanzi, pinyin }))
	}))

	const doc = {
		textbook_version_id: '统编(人教版)',
		grade: 1,
		semester: '上',
		list_type: '识字表',
		note:
			'人教版统编一年级上册附录「识字表」书页顺序；蓝色多音字条目标注本课读音（子zǐ、会huì、地de、着zhe/zháo、数shù/shǔ、长cháng/zhǎng）。教材脚注「共280个生字」多为不计蓝条等口径；本文件按识字表逐格全录。',
		total,
		groups: groupsJson
	}

	const outBook = path.join(root, 'static/booktext/renjiaoban/一年级上册-识字表.json')
	fs.writeFileSync(outBook, JSON.stringify(doc, null, 4) + '\n')
	console.log('[gen] wrote', outBook, 'rows', total)

	const seeds = []
	let sort = 0
	for (const g of GROUPS) {
		for (const [hanzi, pinyin] of g.pairs) {
			sort++
			seeds.push({
				textbook_version_id: '统编(人教版)',
				grade: 1,
				semester: '上',
				list_type: '识字表',
				hanzi,
				pinyin,
				sort_order: sort,
				lesson_hint: g.lesson_hint
			})
		}
	}

	const seedPath = path.join(root, 'scripts/seed-curriculum.json')
	const existing = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
	const filtered = existing.filter(
		(r) =>
			!(
				r.list_type === '识字表' &&
				Number(r.grade || 1) === 1 &&
				(r.semester || '上') === '上'
			)
	)
	const merged = [...filtered, ...seeds]
	fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2) + '\n')
	console.log('[gen] seed rows:', merged.length, '(+' + seeds.length + ' grade1上识字，已移除旧上册识字种子)')
}

main()
