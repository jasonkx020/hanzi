/**
 * @file gen-grade1-down-writing.mjs
 * @module scripts
 * @description 源文件：gen-grade1-down-writing.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 一年级下册写字表 → JSON + seed-curriculum.json
 * 运行：node scripts/gen-grade1-down-writing.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renjiaoTextbookJsonFile } from '../constants/renjiao-textbook-filenames.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** @typedef {{ section: string, lesson: string, lesson_hint: string, pairs: [string, string][] }} Group */

/** @type {Group[]} — 书页顺序 */
const GROUPS = [
	{
		section: '识字',
		lesson: '1',
		lesson_hint: '识字1',
		pairs: [
			['春', 'chūn'],
			['冬', 'dōng'],
			['吹', 'chuī'],
			['花', 'huā'],
			['飞', 'fēi'],
			['入', 'rù']
		]
	},
	{
		section: '识字',
		lesson: '2',
		lesson_hint: '识字2',
		pairs: [
			['什', 'shén'],
			['么', 'me'],
			['古', 'gǔ'],
			['胡', 'hú'],
			['双', 'shuāng'],
			['言', 'yán']
		]
	},
	{
		section: '识字',
		lesson: '3',
		lesson_hint: '识字3',
		pairs: [
			['青', 'qīng'],
			['清', 'qīng'],
			['晴', 'qíng'],
			['苗', 'miáo'],
			['请', 'qǐng'],
			['生', 'shēng']
		]
	},
	{
		section: '识字',
		lesson: '4',
		lesson_hint: '识字4',
		pairs: [
			['字', 'zì'],
			['红', 'hóng'],
			['动', 'dòng'],
			['万', 'wàn'],
			['无', 'wú'],
			['明', 'míng']
		]
	},
	{
		section: '识字',
		lesson: '语文园地一',
		lesson_hint: '语文园地一',
		pairs: [
			['文', 'wén'],
			['卡', 'kǎ'],
			['片', 'piàn'],
			['合', 'hé']
		]
	},
	{
		section: '阅读',
		lesson: '1',
		lesson_hint: '阅读1',
		pairs: [
			['共', 'gòng'],
			['产', 'chǎn'],
			['党', 'dǎng'],
			['太', 'tài'],
			['阳', 'yáng'],
			['光', 'guāng']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		lesson_hint: '阅读2',
		pairs: [
			['井', 'jǐng'],
			['主', 'zhǔ'],
			['江', 'jiāng'],
			['住', 'zhù'],
			['方', 'fāng'],
			['后', 'hòu']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		lesson_hint: '阅读3',
		pairs: [
			['告', 'gào'],
			['的', 'de'],
			['会', 'huì'],
			['北', 'běi'],
			['京', 'jīng'],
			['广', 'guǎng']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地二',
		lesson_hint: '语文园地二',
		pairs: [
			['写', 'xiě'],
			['认', 'rèn']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		lesson_hint: '阅读4',
		pairs: [
			['走', 'zǒu'],
			['河', 'hé'],
			['说', 'shuō'],
			['让', 'ràng'],
			['自', 'zì'],
			['己', 'jǐ']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		lesson_hint: '阅读5',
		pairs: [
			['从', 'cóng'],
			['好', 'hǎo'],
			['们', 'men'],
			['叫', 'jiào'],
			['他', 'tā'],
			['回', 'huí']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		lesson_hint: '阅读6',
		pairs: [
			['快', 'kuài'],
			['乐', 'lè'],
			['当', 'dāng'],
			['书', 'shū'],
			['画', 'huà'],
			['毛', 'máo']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地三',
		lesson_hint: '语文园地三',
		pairs: [
			['止', 'zhǐ'],
			['斤', 'jīn'],
			['寸', 'cùn'],
			['丁', 'dīng'],
			['千', 'qiān'],
			['旦', 'dàn']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		lesson_hint: '阅读7',
		pairs: [
			['思', 'sī'],
			['床', 'chuáng'],
			['前', 'qián'],
			['地', 'dì'],
			['故', 'gù'],
			['乡', 'xiāng']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		lesson_hint: '阅读8',
		pairs: [
			['色', 'sè'],
			['把', 'bǎ'],
			['讲', 'jiǎng'],
			['样', 'yàng'],
			['笑', 'xiào'],
			['再', 'zài']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		lesson_hint: '阅读9',
		pairs: [
			['节', 'jié'],
			['米', 'mǐ'],
			['间', 'jiān'],
			['分', 'fēn'],
			['吃', 'chī'],
			['肉', 'ròu']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地四',
		lesson_hint: '语文园地四',
		pairs: [
			['册', 'cè'],
			['支', 'zhī'],
			['电', 'diàn'],
			['衣', 'yī']
		]
	},
	{
		section: '识字',
		lesson: '5',
		lesson_hint: '识字5',
		pairs: [
			['物', 'wù'],
			['造', 'zào'],
			['运', 'yùn'],
			['欢', 'huān'],
			['房', 'fáng'],
			['网', 'wǎng']
		]
	},
	{
		section: '识字',
		lesson: '6',
		lesson_hint: '识字6',
		pairs: [
			['对', 'duì'],
			['今', 'jīn'],
			['雪', 'xuě'],
			['细', 'xì'],
			['夕', 'xī'],
			['语', 'yǔ']
		]
	},
	{
		section: '识字',
		lesson: '7',
		lesson_hint: '识字7',
		pairs: [
			['打', 'dǎ'],
			['皮', 'pí'],
			['跑', 'pǎo'],
			['足', 'zú'],
			['沙', 'shā'],
			['包', 'bāo']
		]
	},
	{
		section: '识字',
		lesson: '8',
		lesson_hint: '识字8',
		pairs: [
			['近', 'jìn'],
			['习', 'xí'],
			['远', 'yuǎn'],
			['学', 'xué'],
			['玉', 'yù'],
			['义', 'yì']
		]
	},
	{
		section: '识字',
		lesson: '语文园地五',
		lesson_hint: '语文园地五',
		pairs: [
			['饱', 'bǎo'],
			['泡', 'pào']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		lesson_hint: '阅读10',
		pairs: [
			['首', 'shǒu'],
			['池', 'chí'],
			['采', 'cǎi'],
			['尖', 'jiān'],
			['角', 'jiǎo'],
			['早', 'zǎo']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		lesson_hint: '阅读11',
		pairs: [
			['眼', 'yǎn'],
			['泪', 'lèi'],
			['它', 'tā'],
			['贝', 'bèi'],
			['气', 'qì'],
			['娃', 'wá']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		lesson_hint: '阅读12',
		pairs: [
			['机', 'jī'],
			['台', 'tái'],
			['唱', 'chàng'],
			['伞', 'sǎn'],
			['朵', 'duǒ'],
			['美', 'měi']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		lesson_hint: '阅读13',
		pairs: [
			['这', 'zhè'],
			['看', 'kàn'],
			['鱼', 'yú'],
			['面', 'miàn'],
			['问', 'wèn'],
			['加', 'jiā']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地六',
		lesson_hint: '语文园地六',
		pairs: [
			['豆', 'dòu'],
			['斗', 'dǒu']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		lesson_hint: '阅读14',
		pairs: [
			['笔', 'bǐ'],
			['知', 'zhī'],
			['道', 'dào'],
			['放', 'fàng'],
			['平', 'píng'],
			['安', 'ān']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		lesson_hint: '阅读15',
		pairs: [
			['元', 'yuán'],
			['灯', 'dēng'],
			['车', 'chē'],
			['站', 'zhàn'],
			['坐', 'zuò'],
			['老', 'lǎo'],
			['师', 'shī']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		lesson_hint: '阅读16',
		pairs: [
			['国', 'guó'],
			['都', 'dōu'],
			['百', 'bǎi'],
			['听', 'tīng'],
			['时', 'shí'],
			['点', 'diǎn'],
			['林', 'lín']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		lesson_hint: '阅读17',
		pairs: [
			['高', 'gāo'],
			['兴', 'xìng'],
			['着', 'zhe'],
			['往', 'wǎng'],
			['瓜', 'guā'],
			['兔', 'tù'],
			['进', 'jìn']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地七',
		lesson_hint: '语文园地七',
		pairs: [
			['巾', 'jīn'],
			['洗', 'xǐ']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		lesson_hint: '阅读18',
		pairs: [
			['她', 'tā'],
			['空', 'kōng'],
			['还', 'hái'],
			['干', 'gàn'],
			['身', 'shēn'],
			['星', 'xīng'],
			['久', 'jiǔ']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		lesson_hint: '阅读19',
		pairs: [
			['吓', 'xià'],
			['为', 'wèi'],
			['怕', 'pà'],
			['家', 'jiā'],
			['象', 'xiàng'],
			['没', 'méi'],
			['到', 'dào']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		lesson_hint: '阅读20',
		pairs: [
			['向', 'xiàng'],
			['边', 'biān'],
			['行', 'xíng'],
			['草', 'cǎo'],
			['赶', 'gǎn'],
			['过', 'guò'],
			['找', 'zhǎo']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地八',
		lesson_hint: '语文园地八',
		pairs: [
			['页', 'yè'],
			['户', 'hù'],
			['交', 'jiāo'],
			['父', 'fù']
		]
	}
]

function main() {
	let total = 0
	for (const g of GROUPS) total += g.pairs.length
	if (total !== 200) console.warn('[gen] expected 200 chars, got', total)

	const groupsJson = GROUPS.map((g) => ({
		section: g.section,
		lesson: g.lesson,
		chars: g.pairs.map(([hanzi, pinyin]) => ({ hanzi, pinyin }))
	}))

	const doc = {
		textbook_version_id: '统编(人教版)',
		grade: 1,
		semester: '下',
		list_type: '写字表',
		note: '人教版统编一年级下册附录「写字表」书页顺序（共200字）；「斤」拼音以规范读音 jīn 收录。',
		total,
		groups: groupsJson
	}

	const outBook = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(1, '下', 'writing'))
	fs.writeFileSync(outBook, JSON.stringify(doc, null, 4) + '\n')
	console.log('[gen] wrote', outBook, 'chars', total)

	const seeds = []
	let sort = 0
	for (const g of GROUPS) {
		for (const [hanzi, pinyin] of g.pairs) {
			sort++
			seeds.push({
				textbook_version_id: '统编(人教版)',
				grade: 1,
				semester: '下',
				list_type: '写字表',
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
				r.list_type === '写字表' &&
				Number(r.grade) === 1 &&
				r.semester === '下'
			)
	)
	const merged = [...filtered, ...seeds]
	fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2) + '\n')
	console.log('[gen] seed rows:', merged.length, '(+' + seeds.length + ' grade1下写字)')
}

main()
