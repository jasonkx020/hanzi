/**
 * 五年级上册识字表 → static/booktext/renjiaoban/五年级上册-识字表.json
 * 运行：node scripts/gen-grade5-up-literacy.mjs
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
			['鹭', 'lù'],
			['嫌', 'xián'],
			['嵌', 'qiàn'],
			['匣', 'xiá'],
			['嗜', 'shì']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		chars: [
			['亩', 'mǔ'],
			['吩', 'fēn'],
			['榨', 'zhà'],
			['榴', 'liú'],
			['矮', 'ǎi']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		chars: [
			['萝', 'luó'],
			['杭', 'háng']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		chars: [
			['蔓', 'màn'],
			['幽', 'yōu'],
			['悉', 'xī'],
			['雏', 'chú'],
			['哟', 'yō'],
			['柜', 'guì'],
			['享', 'xiǎng'],
			['陪', 'péi'],
			['趴', 'pā'],
			['睑', 'jiǎn'],
			['眸', 'móu'],
			['咂', 'zā']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		chars: [
			['汛', 'xùn'],
			['挽', 'wǎn'],
			['间', 'jiàn'],
			['惰', 'duò'],
			['衡', 'héng'],
			['协', 'xié'],
			['绰', 'chuò']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		chars: [
			['璧', 'bì'],
			['臣', 'chén'],
			['强', 'qiǎng'],
			['诺', 'nuò'],
			['划', 'huà'],
			['典', 'diǎn'],
			['罪', 'zuì'],
			['廉', 'lián'],
			['抵', 'dǐ'],
			['御', 'yù'],
			['辞', 'cí'],
			['辱', 'rǔ'],
			['擅', 'shàn'],
			['缶', 'fǒu'],
			['卿', 'qīng'],
			['削', 'xuē'],
			['袍', 'páo']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		chars: [
			['鸵', 'tuó'],
			['赢', 'yíng'],
			['冠', 'guàn']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		chars: [
			['侵', 'qīn'],
			['略', 'lüè'],
			['垒', 'lěi'],
			['任', 'rén'],
			['丘', 'qiū'],
			['搁', 'gē'],
			['陷', 'xiàn'],
			['拐', 'guǎi'],
			['岔', 'chà']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		chars: [
			['酬', 'chóu'],
			['誓', 'shì'],
			['谎', 'huǎng'],
			['牺', 'xī']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		chars: [
			['嫂', 'sǎo'],
			['恳', 'kěn'],
			['筛', 'shāi'],
			['歹', 'dǎi'],
			['罕', 'hǎn'],
			['梭', 'suō'],
			['监', 'jiān'],
			['狱', 'yù'],
			['酿', 'niàng'],
			['瞌', 'kē'],
			['落', 'là'],
			['婚', 'hūn']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		chars: [
			['俭', 'jiǎn'],
			['皇', 'huáng'],
			['偎', 'wēi'],
			['衰', 'shuāi'],
			['珊', 'shān'],
			['瑚', 'hú'],
			['礁', 'jiāo'],
			['筐', 'kuāng'],
			['拗', 'niù']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		chars: [
			['乃', 'nǎi'],
			['熏', 'xūn'],
			['亥', 'hài'],
			['恃', 'shì'],
			['擞', 'sǒu']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		chars: [
			['泻', 'xiè'],
			['鳞', 'lín'],
			['惶', 'huáng'],
			['胎', 'tāi'],
			['履', 'lǚ'],
			['哉', 'zāi']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		chars: [
			['估', 'gū'],
			['煌', 'huáng'],
			['珑', 'lóng'],
			['剔', 'tī'],
			['澜', 'lán'],
			['瑶', 'yáo'],
			['陵', 'líng'],
			['宏', 'hóng'],
			['奉', 'fèng'],
			['烬', 'jìn']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		chars: [
			['瞒', 'mán'],
			['域', 'yù'],
			['艇', 'tǐng'],
			['矛', 'máo'],
			['盾', 'dùn'],
			['筷', 'kuài'],
			['炊', 'chuī'],
			['哼', 'hng'],
			['喉', 'hóu'],
			['咙', 'lóng'],
			['哽', 'gěng'],
			['勺', 'sháo'],
			['搅', 'jiǎo'],
			['舀', 'yǎo']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		chars: [
			['摄', 'shè'],
			['殖', 'zhí'],
			['炭', 'tàn'],
			['疗', 'liáo']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		chars: [
			['驯', 'xùn'],
			['矫', 'jiǎo'],
			['歇', 'xiē'],
			['杈', 'chà'],
			['藓', 'xiǎn'],
			['狭', 'xiá'],
			['勉', 'miǎn'],
			['锥', 'zhuī']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		chars: [
			['魄', 'pò'],
			['抑', 'yì'],
			['颓', 'tuí'],
			['纫', 'rèn'],
			['噪', 'zào'],
			['褐', 'hè'],
			['惫', 'bèi'],
			['耽', 'dān'],
			['兜', 'dōu'],
			['权', 'quán']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		chars: [
			['茧', 'jiǎn'],
			['栈', 'zhàn'],
			['冤', 'yuān'],
			['枉', 'wǎng'],
			['恍', 'huǎng'],
			['惚', 'hū'],
			['跷', 'qiāo'],
			['僻', 'pì'],
			['娓', 'wěi'],
			['迪', 'dí'],
			['嫁', 'jià'],
			['缴', 'jiǎo'],
			['榜', 'bǎng'],
			['兼', 'jiān'],
			['嘲', 'cháo'],
			['枕', 'zhěn']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		chars: [
			['腼', 'miǎn'],
			['腆', 'tiǎn'],
			['誊', 'téng'],
			['励', 'lì'],
			['版', 'bǎn'],
			['祥', 'xiáng'],
			['歧', 'qí'],
			['谨', 'jǐn']
		]
	},
	{
		section: '阅读',
		lesson: '21',
		chars: [
			['榆', 'yú'],
			['畔', 'pàn'],
			['更', 'gēng'],
			['聒', 'guō']
		]
	},
	{
		section: '阅读',
		lesson: '22',
		chars: [
			['桨', 'jiǎng'],
			['桩', 'zhuāng'],
			['暇', 'xiá']
		]
	},
	{
		section: '阅读',
		lesson: '23',
		chars: [
			['悄', 'qiǎo'],
			['累', 'léi'],
			['嫦', 'cháng'],
			['娥', 'é'],
			['嫉', 'jí'],
			['妒', 'dù'],
			['瓷', 'cí']
		]
	},
	{
		section: '阅读',
		lesson: '24',
		chars: [
			['耻', 'chǐ'],
			['识', 'zhì'],
			['寝', 'qǐn'],
			['矣', 'yǐ'],
			['岂', 'qǐ']
		]
	},
	{
		section: '阅读',
		lesson: '25',
		chars: [
			['舅', 'jiù'],
			['宴', 'yàn'],
			['斩', 'zhǎn'],
			['凯', 'kǎi'],
			['葛', 'gě'],
			['述', 'shù'],
			['传', 'zhuàn'],
			['鲁', 'lǔ'],
			['煞', 'shà'],
			['寇', 'kòu'],
			['贾', 'jiǎ'],
			['卷', 'juàn'],
			['刊', 'kān'],
			['琐', 'suǒ'],
			['呻', 'shēn'],
			['某', 'mǒu']
		]
	},
	{
		section: '阅读',
		lesson: '26',
		chars: [
			['喻', 'yù'],
			['差', 'chāi'],
			['瘾', 'yǐn'],
			['奔', 'bèn'],
			['籍', 'jí'],
			['饥', 'jī'],
			['偿', 'cháng'],
			['甸', 'diàn'],
			['悟', 'wù'],
			['馈', 'kuì'],
			['磁', 'cí'],
			['酵', 'jiào'],
			['皎', 'jiǎo'],
			['鉴', 'jiàn'],
			['沥', 'lì']
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
	semester: '上',
	list_type: '识字表',
	note:
		'人教版统编五年级上册附录「识字表」按附图书页顺序录入（第1～11课、第12～26课）。本文件按附录逐格全录216条、去重汉字216个；教材脚注「共200个生字」为不计入此前已认读、本册作多音字教学的蓝色字（共16处）后的数量。蓝色字按教材标注读音：间jiàn、强qiǎng、划huà、削xuē、冠guàn、任rén、落là、拗niù、哼hng、更gēng、悄qiǎo、累léi、识zhì、传zhuàn、卷juàn、差chāi、奔bèn等。印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(5, '上', 'literacy'))
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
	'(textbook footnote 200 excl. blue polyphones)'
)
