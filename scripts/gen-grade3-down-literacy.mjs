/**
 * @file gen-grade3-down-literacy.mjs
 * @module scripts
 * @description 源文件：gen-grade3-down-literacy.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 三年级下册识字表 → static/booktext/renjiaoban/三年级下册-识字表.json
 * 运行：node scripts/gen-grade3-down-literacy.mjs
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
			['鸳', 'yuān'],
			['鸯', 'yāng'],
			['惠', 'huì'],
			['崇', 'chóng'],
			['豚', 'tún'],
			['曾', 'zēng'],
			['梅', 'méi']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		chars: [
			['凑', 'còu'],
			['伶', 'líng'],
			['俐', 'lì'],
			['旷', 'kuàng'],
			['横', 'héng'],
			['翼', 'yì'],
			['漾', 'yàng'],
			['倦', 'juàn'],
			['散', 'sǎn'],
			['纤', 'xiān'],
			['杆', 'gān'],
			['痕', 'hén']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		chars: [
			['挨', 'āi'],
			['蓬', 'péng'],
			['胀', 'zhàng'],
			['裳', 'shang'],
			['翩', 'piān'],
			['蜻', 'qīng'],
			['蜓', 'tíng']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		chars: [
			['录', 'lù'],
			['琢', 'zuó'],
			['敏', 'mǐn'],
			['款', 'kuǎn'],
			['膜', 'mó'],
			['瞎', 'xiā'],
			['益', 'yì'],
			['辆', 'liàng'],
			['蚂', 'mà'],
			['斑', 'bān'],
			['褐', 'hè']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地一',
		chars: [
			['匕', 'bǐ'],
			['忆', 'yì'],
			['艺', 'yì'],
			['乙', 'yǐ'],
			['冗', 'rǒng'],
			['犬', 'quǎn'],
			['税', 'shuì'],
			['兑', 'duì'],
			['执', 'zhí']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		chars: [
			['耕', 'gēng'],
			['释', 'shì'],
			['冀', 'jì']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		chars: [
			['模', 'mú'],
			['驯', 'xùn'],
			['良', 'liáng'],
			['毫', 'háo'],
			['犹', 'yóu'],
			['豫', 'yù'],
			['狡', 'jiǎo'],
			['猾', 'huá'],
			['凶', 'xiōng'],
			['恶', 'è'],
			['相', 'xiāng'],
			['狠', 'hěn'],
			['猎', 'liè']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		chars: [
			['匀', 'yún'],
			['称', 'chèn'],
			['皱', 'zhòu'],
			['配', 'pèi'],
			['撒', 'sā'],
			['扯', 'chě']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		chars: [
			['滔', 'tāo'],
			['贯', 'guàn'],
			['妇', 'fù'],
			['垫', 'diàn'],
			['忧', 'yōu'],
			['虑', 'lǜ'],
			['凭', 'píng'],
			['折', 'zhé'],
			['遵', 'zūn'],
			['循', 'xún'],
			['逸', 'yì'],
			['尊', 'zūn'],
			['衰', 'shuāi']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		chars: [
			['否', 'fǒu'],
			['窃', 'qiè'],
			['私', 'sī'],
			['肌', 'jī'],
			['缩', 'suō'],
			['勉', 'miǎn'],
			['差', 'chā'],
			['藻', 'zǎo'],
			['达', 'dá'],
			['胞', 'bāo'],
			['煤', 'méi'],
			['储', 'chǔ'],
			['属', 'shǔ']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		chars: [
			['证', 'zhèng'],
			['概', 'gài'],
			['阻', 'zǔ'],
			['误', 'wù'],
			['逆', 'nì'],
			['殊', 'shū']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		chars: [
			['隙', 'xì'],
			['稍', 'shāo'],
			['逐', 'zhú'],
			['副', 'fù'],
			['钳', 'qián'],
			['翘', 'qiào'],
			['搏', 'bó'],
			['捡', 'jiǎn'],
			['较', 'jiào'],
			['腹', 'fù'],
			['卵', 'luǎn']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		chars: [
			['牧', 'mù'],
			['魂', 'hún'],
			['酒', 'jiǔ'],
			['兄', 'xiōng'],
			['佳', 'jiā']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		chars: [
			['贡', 'gòng'],
			['尤', 'yóu'],
			['笨', 'bèn'],
			['阅', 'yuè'],
			['存', 'cún'],
			['蔡', 'cài'],
			['伦', 'lún'],
			['累', 'lěi'],
			['切', 'qiē'],
			['便', 'pián'],
			['鲜', 'xiǎn'],
			['社', 'shè']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		chars: [
			['县', 'xiàn'],
			['拱', 'gǒng'],
			['济', 'jì'],
			['匠', 'jiàng'],
			['砌', 'qì'],
			['栏', 'lán'],
			['爪', 'zhǎo'],
			['抵', 'dǐ'],
			['智', 'zhì'],
			['慧', 'huì'],
			['历', 'lì'],
			['遗', 'yí']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		chars: [
			['择', 'zé'],
			['摊', 'tān'],
			['贩', 'fàn'],
			['吏', 'lì'],
			['驴', 'lǘ'],
			['乘', 'shèng'],
			['笼', 'lóng'],
			['拽', 'zhuài'],
			['扰', 'rǎo'],
			['貌', 'mào']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地二',
		chars: [
			['援', 'yuán'],
			['掷', 'zhì'],
			['投', 'tóu'],
			['捞', 'lāo'],
			['拆', 'chāi'],
			['搅', 'jiǎo'],
			['拓', 'tuò']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		chars: [
			['萝', 'luó'],
			['卜', 'bo'],
			['愁', 'chóu'],
			['晾', 'liàng'],
			['尿', 'niào'],
			['肩', 'jiān'],
			['掏', 'tāo']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		chars: [
			['嗓', 'sǎng'],
			['痒', 'yǎng'],
			['椭', 'tuǒ'],
			['菱', 'líng'],
			['鳄', 'è'],
			['震', 'zhèn'],
			['零', 'líng'],
			['肠', 'cháng'],
			['醋', 'cù'],
			['馋', 'chán']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		chars: [
			['墨', 'mò'],
			['染', 'rǎn'],
			['碎', 'suì'],
			['溅', 'jiàn']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		chars: [
			['剩', 'shèng'],
			['和', 'huó'],
			['容', 'róng'],
			['套', 'tào'],
			['若', 'ruò'],
			['悬', 'xuán'],
			['屏', 'píng'],
			['巅', 'diān'],
			['婴', 'yīng']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		chars: [
			['胸', 'xiōng'],
			['脯', 'pú'],
			['婉', 'wǎn'],
			['惹', 'rě']
		]
	},
	{
		section: '阅读',
		lesson: '21',
		chars: [
			['耀', 'yào'],
			['示', 'shì'],
			['歉', 'qiàn'],
			['诺', 'nuò']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地三',
		chars: [
			['旭', 'xù'],
			['屿', 'yǔ'],
			['舰', 'jiàn'],
			['锚', 'máo'],
			['瞭', 'liào'],
			['巡', 'xún']
		]
	},
	{
		section: '阅读',
		lesson: '22',
		chars: [
			['檀', 'tán'],
			['猪', 'zhū'],
			['盈', 'yíng'],
			['彤', 'tóng'],
			['跪', 'guì'],
			['庙', 'miào'],
			['镇', 'zhèn'],
			['揉', 'róu'],
			['偏', 'piān']
		]
	},
	{
		section: '阅读',
		lesson: '23',
		chars: [
			['闷', 'mèn'],
			['蔓', 'màn'],
			['延', 'yán'],
			['昏', 'hūn'],
			['汹', 'xiōng'],
			['况', 'kuàng'],
			['报', 'bào'],
			['隆', 'lóng']
		]
	},
	{
		section: '阅读',
		lesson: '24',
		chars: [
			['呈', 'chéng'],
			['蔚', 'wèi'],
			['雕', 'diāo'],
			['洼', 'wā'],
			['烁', 'shuò'],
			['蜡', 'là'],
			['烛', 'zhú'],
			['芒', 'máng'],
			['略', 'lüè'],
			['劲', 'jìng'],
			['柱', 'zhù'],
			['剑', 'jiàn']
		]
	},
	{
		section: '阅读',
		lesson: '25',
		chars: [
			['缝', 'féng'],
			['箱', 'xiāng'],
			['夸', 'kuā'],
			['奖', 'jiǎng'],
			['承', 'chéng'],
			['夹', 'jiá'],
			['袖', 'xiù'],
			['衬', 'chèn'],
			['衫', 'shān'],
			['负', 'fù'],
			['责', 'zé'],
			['讶', 'yà'],
			['恼', 'nǎo']
		]
	},
	{
		section: '阅读',
		lesson: '26',
		chars: [
			['脊', 'jǐ'],
			['贼', 'zéi'],
			['莫', 'mò'],
			['晕', 'yūn'],
			['颠', 'diān'],
			['歪', 'wāi'],
			['胶', 'jiāo'],
			['旋', 'xuàn'],
			['纵', 'zòng'],
			['嫌', 'xián']
		]
	},
	{
		section: '阅读',
		lesson: '27',
		chars: [
			['核', 'hé'],
			['妻', 'qī'],
			['爹', 'diē'],
			['犁', 'lí'],
			['聪', 'cōng'],
			['旱', 'hàn'],
			['纳', 'nà'],
			['搜', 'sōu'],
			['折', 'zhé'],
			['困', 'kùn'],
			['岂', 'qǐ'],
			['涨', 'zhàng']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地四',
		chars: [
			['咳', 'ké'],
			['嗽', 'sòu'],
			['唠', 'láo'],
			['叨', 'dāo'],
			['吆', 'yāo'],
			['讽', 'fěng'],
			['诫', 'jiè'],
			['辩', 'biàn']
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
	semester: '下',
	list_type: '识字表',
	note:
		'人教版统编三年级下册附录「识字表」按附图书页顺序录入；脚注①说明蓝色字为此前已认读生字，此处作多音字学习且不计入生字总数。蓝色多音字按教材标注读音（曾zēng、散sǎn、杆gān、挨āi、蚂mà、模mú、相xiāng、称chèn、撒sā、差chā、累lěi、切qiē、便pián、鲜xiǎn、爪zhǎo、乘shèng、笼lóng、和huó、闷mèn、劲jìng、缝féng、夹jiá、旋xuàn、涨zhàng等）。本书脚注「共250个生字」与本文件逐条全录口径不同；本文件逐条全录273条，去重汉字272个（同一汉字在不同课次多次出现计为多行，如「折」见于第8课与第27课）。四处语文园地按识字表出现顺序标为语文园地一至四；印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(3, '下', 'literacy'))
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
