/**
 * @file gen-grade5-down-literacy.mjs
 * @module scripts
 * @description 源文件：gen-grade5-down-literacy.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 五年级下册识字表 → static/booktext/renjiaoban/五年级下册-识字表.json
 * 运行：node scripts/gen-grade5-down-literacy.mjs
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
			['昼', 'zhòu'],
			['耘', 'yún'],
			['供', 'gòng'],
			['稚', 'zhì'],
			['漪', 'yī']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		chars: [
			['蚱', 'zhà'],
			['啃', 'kěn'],
			['樱', 'yīng'],
			['蚌', 'bàng'],
			['割', 'gē'],
			['嘟', 'dū'],
			['倭', 'wō'],
			['拴', 'shuān'],
			['啰', 'luo'],
			['逛', 'guàng']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		chars: [
			['徘', 'pái'],
			['徊', 'huái'],
			['渺', 'miǎo'],
			['篝', 'gōu'],
			['萌', 'méng'],
			['澄', 'chéng'],
			['澈', 'chè'],
			['旖', 'yǐ'],
			['旎', 'nǐ'],
			['瑞', 'ruì'],
			['莱', 'lái'],
			['垠', 'yín'],
			['顷', 'qǐng'],
			['峨', 'é'],
			['燕', 'yān'],
			['缀', 'zhuì']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		chars: [
			['腮', 'sāi'],
			['虬', 'qiú'],
			['玷', 'diàn'],
			['郑', 'zhèng'],
			['秉', 'bǐng'],
			['飕', 'sōu'],
			['码', 'mǎ'],
			['撩', 'liáo'],
			['绢', 'juàn'],
			['侨', 'qiáo'],
			['眷', 'juàn']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		chars: [
			['瑜', 'yú'],
			['忌', 'jì'],
			['督', 'dū'],
			['幔', 'màn'],
			['翎', 'líng'],
			['寨', 'zhài'],
			['擂', 'léi'],
			['呐', 'nà'],
			['弩', 'nǔ'],
			['丞', 'chéng']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		chars: [
			['倚', 'yǐ'],
			['箸', 'zhù'],
			['碟', 'dié'],
			['斤', 'jīn'],
			['俺', 'ǎn'],
			['绰', 'chāo'],
			['擒', 'qín'],
			['勿', 'wù'],
			['笠', 'lì'],
			['肋', 'lèi'],
			['踉', 'liàng'],
			['跄', 'qiàng'],
			['呵', 'ā'],
			['胯', 'kuà'],
			['霹', 'pī'],
			['雳', 'lì'],
			['咆', 'páo'],
			['哮', 'xiào'],
			['锤', 'chuí'],
			['泊', 'pō']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		chars: [
			['芝', 'zhī'],
			['遂', 'suì'],
			['迸', 'bèng'],
			['涧', 'jiàn'],
			['獐', 'zhāng'],
			['猕', 'mí'],
			['猿', 'yuán'],
			['耶', 'yé'],
			['挈', 'qiè'],
			['瞑', 'míng'],
			['窍', 'qiào'],
			['碣', 'jié'],
			['楷', 'kǎi'],
			['镌', 'juān'],
			['挠', 'náo'],
			['劣', 'liè'],
			['呵', 'a']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		chars: [
			['屉', 'tì'],
			['嫣', 'yān'],
			['讳', 'huì'],
			['黛', 'dài'],
			['晦', 'huì'],
			['墩', 'dūn'],
			['钗', 'chāi'],
			['雯', 'wén'],
			['袭', 'xí'],
			['垫', 'diàn'],
			['豁', 'huò'],
			['喇', 'lā']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		chars: [
			['仞', 'rèn'],
			['岳', 'yuè'],
			['蓟', 'jì'],
			['涕', 'tì'],
			['裳', 'cháng'],
			['襄', 'xiāng']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		chars: [
			['彭', 'péng'],
			['拟', 'nǐ'],
			['谋', 'móu'],
			['赴', 'fù'],
			['殊', 'shū'],
			['踌', 'chóu'],
			['躇', 'chú'],
			['黯', 'àn'],
			['革', 'gé']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		chars: [
			['沃', 'wò'],
			['匪', 'fěi'],
			['绷', 'bēng'],
			['衷', 'zhōng'],
			['堪', 'kān']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		chars: [
			['筹', 'chóu'],
			['矜', 'jīn'],
			['俘', 'fú'],
			['镯', 'zhuó'],
			['吓', 'hè'],
			['裆', 'dāng'],
			['企', 'qǐ'],
			['彼', 'bǐ'],
			['褂', 'guà'],
			['坞', 'wù']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		chars: [
			['嘎', 'gǎ'],
			['绊', 'bàn'],
			['揪', 'jiū'],
			['扳', 'bān'],
			['腕', 'wàn'],
			['铸', 'zhù'],
			['颧', 'quán'],
			['疤', 'bā'],
			['监', 'jiàn'],
			['侄', 'zhí'],
			['痰', 'tán'],
			['揩', 'kāi']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		chars: [
			['傅', 'fù'],
			['袱', 'fú'],
			['蘸', 'zhàn'],
			['圣', 'shèng'],
			['馅', 'xiàn'],
			['诈', 'zhà'],
			['怔', 'zhèng']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		chars: [
			['吾', 'wú'],
			['弗', 'fú'],
			['夫', 'fú']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		chars: [
			['策', 'cè'],
			['荐', 'jiàn']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		chars: [
			['肆', 'sì'],
			['桅', 'wéi'],
			['撕', 'sī'],
			['唬', 'hǔ'],
			['龇', 'zī'],
			['咧', 'liě'],
			['瞄', 'miáo']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		chars: [
			['尼', 'ní'],
			['艄', 'shāo'],
			['翘', 'qiào'],
			['姆', 'mǔ'],
			['祷', 'dǎo'],
			['雇', 'gù'],
			['哗', 'huá']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		chars: [
			['毡', 'zhān'],
			['犊', 'dú'],
			['眺', 'tiào'],
			['膘', 'biāo'],
			['爵', 'jué'],
			['噜', 'lū'],
			['吆', 'yāo'],
			['哞', 'mōu'],
			['畜', 'chù']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		chars: [
			['译', 'yì'],
			['愧', 'kuì'],
			['熠', 'yì'],
			['遐', 'xiá'],
			['黏', 'nián'],
			['埃', 'āi'],
			['滥', 'làn'],
			['淤', 'yū'],
			['湛', 'zhàn']
		]
	},
	{
		section: '阅读',
		lesson: '21',
		chars: [
			['诣', 'yì'],
			['禽', 'qín']
		]
	},
	{
		section: '阅读',
		lesson: '22',
		chars: [
			['拇', 'mǔ'],
			['弦', 'xián'],
			['揿', 'qìn'],
			['搔', 'sāo'],
			['窈', 'yǎo'],
			['窕', 'tiǎo'],
			['秽', 'huì'],
			['轧', 'yà'],
			['拧', 'nǐng'],
			['纽', 'niǔ'],
			['仓', 'cāng'],
			['庸', 'yōng'],
			['憎', 'zēng']
		]
	},
	{
		section: '阅读',
		lesson: '23',
		chars: [
			['胚', 'pēi'],
			['祸', 'huò'],
			['患', 'huàn'],
			['赋', 'fù'],
			['痴', 'chī'],
			['绞', 'jiǎo'],
			['嘿', 'hēi'],
			['伊', 'yī'],
			['娜', 'nà'],
			['窘', 'jiǒng']
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
	grade: 5,
	semester: '下',
	list_type: '识字表',
	note:
		'人教版统编五年级下册附录「识字表」按附图书页顺序录入（第1～9课、第10～23课）。本文件按附录逐格全录212条，去重汉字211个（「呵」见于第6课ā与第7课a两行）。教材脚注「共200个生字」为不计入此前已认读、本册作多音字教学的蓝色字（共12处）后的数量：供gòng、燕yān、绰chāo、呵ā（第6课）与呵a（第7课）、泊pō、喇lā、裳cháng、吓hè、监jiàn、夫fú、哗huá。印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(5, '下', 'literacy'))
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
	'(textbook footnote 200 excl. 12 blue polyphones)'
)
