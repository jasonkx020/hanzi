/**
 * @file gen-grade3-up-literacy.mjs
 * @module scripts
 * @description 源文件：gen-grade3-up-literacy.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 三年级上册识字表 → static/booktext/renjiaoban/三年级上册-识字表.json
 * 运行：node scripts/gen-grade3-up-literacy.mjs
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
			['绒', 'róng'],
			['昂', 'áng'],
			['扬', 'yáng'],
			['凤', 'fèng'],
			['墙', 'qiáng'],
			['晃', 'huàng']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		chars: [
			['轰', 'hōng'],
			['湿', 'shī'],
			['荒', 'huāng'],
			['笛', 'dí'],
			['罚', 'fá'],
			['假', 'jià'],
			['臂', 'bì']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		chars: [
			['诵', 'sòng'],
			['例', 'lì'],
			['糊', 'hú'],
			['戒', 'jiè'],
			['厉', 'lì'],
			['详', 'xiáng'],
			['挨', 'ái']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		chars: [
			['庭', 'tíng'],
			['未', 'wèi'],
			['磨', 'mó'],
			['斜', 'xié'],
			['萧', 'xiāo'],
			['挑', 'tiǎo'],
			['促', 'cù']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		chars: [
			['粘', 'zhān'],
			['印', 'yìn'],
			['列', 'liè'],
			['凌', 'líng'],
			['增', 'zēng'],
			['棕', 'zōng']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		chars: [
			['钥', 'yào'],
			['匙', 'shi'],
			['缤', 'bīn'],
			['枚', 'méi'],
			['邮', 'yóu'],
			['爽', 'shuǎng'],
			['橘', 'jú'],
			['频', 'pín'],
			['梨', 'lí'],
			['勾', 'gōu'],
			['喇', 'lǎ'],
			['叭', 'bā']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		chars: [
			['抖', 'dǒu'],
			['振', 'zhèn'],
			['韵', 'yùn'],
			['掠', 'lüè'],
			['吟', 'yín'],
			['辽', 'liáo'],
			['阔', 'kuò']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		chars: [
			['眯', 'mī'],
			['哦', 'ò'],
			['喵', 'miāo'],
			['孵', 'fū'],
			['叽', 'jī'],
			['缝', 'fèng'],
			['偶', 'ǒu'],
			['尔', 'ěr']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		chars: [
			['陶', 'táo'],
			['适', 'shì'],
			['谈', 'tán'],
			['婚', 'hūn'],
			['庆', 'qìng'],
			['典', 'diǎn'],
			['途', 'tú'],
			['括', 'kuò'],
			['史', 'shǐ'],
			['倍', 'bèi'],
			['几', 'jǐ'],
			['持', 'chí'],
			['官', 'guān']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		chars: [
			['陌', 'mò'],
			['吗', 'má'],
			['讨', 'tǎo'],
			['厌', 'yàn'],
			['访', 'fǎng'],
			['记', 'jì'],
			['忍', 'rěn'],
			['委', 'wěi'],
			['屈', 'qū'],
			['中', 'zhòng'],
			['弹', 'dàn'],
			['疯', 'fēng'],
			['局', 'jú'],
			['汪', 'wāng'],
			['搞', 'gǎo']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地一',
		chars: [
			['恒', 'héng'],
			['圣', 'shèng'],
			['萌', 'méng'],
			['妥', 'tuǒ'],
			['轴', 'zhóu'],
			['阁', 'gé'],
			['培', 'péi'],
			['厘', 'lí']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		chars: [
			['普', 'pǔ'],
			['少', 'shào'],
			['矩', 'jǔ'],
			['丫', 'yā'],
			['宫', 'gōng'],
			['掘', 'jué'],
			['希', 'xī'],
			['冲', 'chòng'],
			['联', 'lián'],
			['系', 'xì'],
			['葵', 'kuí'],
			['瘦', 'shòu'],
			['罢', 'bà']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		chars: [
			['答', 'dā'],
			['应', 'yìng'],
			['及', 'jí'],
			['卷', 'juàn'],
			['骨', 'gǔ'],
			['碌', 'lù'],
			['齿', 'chǐ'],
			['嚼', 'jiáo'],
			['吞', 'tūn'],
			['胃', 'wèi'],
			['咽', 'yàn']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		chars: [
			['宣', 'xuān'],
			['处', 'chǔ'],
			['恐', 'kǒng'],
			['诱', 'yòu'],
			['毅', 'yì'],
			['强', 'qiáng'],
			['纪', 'jì'],
			['性', 'xìng'],
			['渣', 'zhā'],
			['犯', 'fàn'],
			['禁', 'jìn'],
			['旧', 'jiù'],
			['聚', 'jù']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地二',
		chars: [
			['申', 'shēn'],
			['介', 'jiè'],
			['绍', 'shào'],
			['宗', 'zōng'],
			['旨', 'zhǐ'],
			['占', 'zhàn'],
			['乏', 'fá']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		chars: [
			['舱', 'cāng'],
			['啦', 'la'],
			['鹦', 'yīng'],
			['鹉', 'wǔ'],
			['衔', 'xián']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		chars: [
			['蒲', 'pú'],
			['英', 'yīng'],
			['耍', 'shuǎ'],
			['茸', 'róng'],
			['欠', 'qiàn'],
			['拢', 'lǒng']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		chars: [
			['饶', 'ráo'],
			['优', 'yōu'],
			['崖', 'yá'],
			['参', 'shēn'],
			['懒', 'lǎn'],
			['划', 'huá'],
			['威', 'wēi'],
			['武', 'wǔ'],
			['插', 'chā'],
			['栖', 'qī'],
			['厚', 'hòu'],
			['粪', 'fèn'],
			['辈', 'bèi']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		chars: [
			['滨', 'bīn'],
			['胳', 'gē'],
			['臂', 'bei'],
			['滩', 'tān'],
			['睬', 'cǎi'],
			['载', 'zài'],
			['缝', 'féng']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		chars: [
			['兴', 'xìng'],
			['融', 'róng'],
			['侧', 'cè'],
			['欣', 'xīn'],
			['封', 'fēng'],
			['浸', 'jìn'],
			['乳', 'rǔ'],
			['梢', 'shāo'],
			['宿', 'sù'],
			['舍', 'shè'],
			['药', 'yào'],
			['眠', 'mián']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		chars: [
			['贸', 'mào'],
			['愧', 'kuì'],
			['仅', 'jǐn'],
			['议', 'yì'],
			['政', 'zhèng'],
			['府', 'fǔ'],
			['赠', 'zèng'],
			['幻', 'huàn'],
			['焰', 'yàn'],
			['澳', 'ào'],
			['扮', 'bàn'],
			['角', 'jué']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		chars: [
			['返', 'fǎn'],
			['苔', 'tái'],
			['亦', 'yì'],
			['抹', 'mǒ'],
			['宜', 'yí']
		]
	},
	{
		section: '阅读',
		lesson: '21',
		chars: [
			['妙', 'miào'],
			['奏', 'zòu'],
			['呢', 'ní'],
			['喃', 'nán'],
			['激', 'jī'],
			['伟', 'wěi'],
			['充', 'chōng'],
			['击', 'jī'],
			['器', 'qì'],
			['汇', 'huì']
		]
	},
	{
		section: '阅读',
		lesson: '22',
		chars: [
			['麻', 'má'],
			['旋', 'xuán'],
			['肃', 'sù'],
			['振', 'zhèn'],
			['贞', 'zhēn'],
			['姿', 'zī'],
			['笋', 'sǔn'],
			['超', 'chāo'],
			['凡', 'fán'],
			['俗', 'sú'],
			['奥', 'ào'],
			['秘', 'mì']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地三',
		chars: [
			['螺', 'luó'],
			['螃', 'páng'],
			['蟹', 'xiè'],
			['鲤', 'lǐ'],
			['鲫', 'jì'],
			['鲨', 'shā']
		]
	},
	{
		section: '阅读',
		lesson: '23',
		chars: [
			['司', 'sī'],
			['皆', 'jiē'],
			['弃', 'qì']
		]
	},
	{
		section: '阅读',
		lesson: '24',
		chars: [
			['裕', 'yù'],
			['差', 'chà'],
			['均', 'jūn'],
			['资', 'zī'],
			['欧', 'ōu'],
			['洲', 'zhōu'],
			['授', 'shòu'],
			['项', 'xiàng'],
			['验', 'yàn'],
			['构', 'gòu'],
			['耐', 'nài'],
			['励', 'lì']
		]
	},
	{
		section: '阅读',
		lesson: '25',
		chars: [
			['棒', 'bàng'],
			['待', 'dāi'],
			['血', 'xuè'],
			['硝', 'xiāo'],
			['危', 'wēi'],
			['险', 'xiǎn'],
			['势', 'shì'],
			['瓦', 'wǎ'],
			['帘', 'lián'],
			['担', 'dān'],
			['迅', 'xùn'],
			['速', 'sù'],
			['夺', 'duó'],
			['秒', 'miǎo']
		]
	},
	{
		section: '阅读',
		lesson: '26',
		chars: [
			['瓷', 'cí'],
			['赵', 'zhào'],
			['抗', 'kàng'],
			['束', 'shù'],
			['缸', 'gāng'],
			['还', 'huán'],
			['顿', 'dùn'],
			['灶', 'zào'],
			['沾', 'zhān'],
			['禁', 'jīn'],
			['锅', 'guō'],
			['侦', 'zhēn']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地四',
		chars: [
			['睁', 'zhēng'],
			['眨', 'zhǎ'],
			['瞪', 'dèng'],
			['瞅', 'chǒu'],
			['怒', 'nù'],
			['眶', 'kuàng'],
			['呆', 'dāi'],
			['睹', 'dǔ']
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
	grade: 3,
	semester: '上',
	list_type: '识字表',
	note:
		'人教版统编三年级上册附录「识字表」按附图书页顺序录入；脚注①说明蓝色字为此前已认读生字，此处作多音字学习且不计入生字总数。蓝色多音字按教材标注读音（假jià、磨mó、挑tiǎo、几jǐ、吗má、中zhòng、弹dàn、答dā、应yìng、处chǔ、啦la、参shēn、臂bei、舍shè、角jué、抹mǒ、呢ní、待dāi、担dān、还huán、禁jīn等）。本书脚注「共250个生字」与本文件逐条全录口径不同；本文件逐条全录277条，去重汉字273个（同一汉字在不同课次多次出现计为多行，如臂、缝、振、禁等）。表中四处语文园地按识字表出现顺序标为语文园地一至四；若需与单元语文园地序号严格对齐请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(3, '上', 'literacy'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'rows', total, 'unique hanzi', uniq.size, '(textbook footnote 250)')
