/**
 * 四年级下册识字表 → static/booktext/renjiaoban/四年级下册-识字表.json
 * 运行：node scripts/gen-grade4-down-literacy.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** @type {{ section: string, lesson: string, chars: [string, string][] }[]} */
const groups = [
	{
		section: '阅读',
		lesson: '1',
		chars: [
			['杂', 'zá'],
			['篱', 'lí'],
			['徐', 'xú'],
			['疏', 'shū'],
			['锄', 'chú'],
			['剥', 'bō']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		chars: [
			['构', 'gòu'],
			['冠', 'guān'],
			['序', 'xù'],
			['朴', 'pǔ'],
			['素', 'sù'],
			['率', 'shuài'],
			['倘', 'tǎng'],
			['附', 'fù'],
			['捣', 'dǎo'],
			['绘', 'huì'],
			['谐', 'xié']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		chars: [
			['慰', 'wèi'],
			['藉', 'jiè'],
			['卜', 'bǔ']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		chars: [
			['绮', 'qǐ'],
			['和', 'hè'],
			['谈', 'tán']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		chars: [
			['琥', 'hǔ'],
			['珀', 'pò'],
			['嗡', 'wēng'],
			['脂', 'zhī'],
			['拭', 'shì'],
			['渗', 'shèn'],
			['俯', 'fǔ'],
			['扎', 'zhá'],
			['番', 'fān'],
			['埋', 'mái'],
			['澎', 'péng'],
			['湃', 'pài']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		chars: [
			['钝', 'dùn'],
			['描', 'miáo'],
			['隧', 'suì'],
			['衍', 'yǎn'],
			['吨', 'dūn'],
			['颅', 'lú'],
			['膨', 'péng'],
			['捷', 'jié'],
			['辟', 'pì'],
			['崭', 'zhǎn']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		chars: [
			['乒', 'pīng'],
			['乓', 'pāng'],
			['拥', 'yōng'],
			['菌', 'jūn'],
			['臭', 'chòu'],
			['蔬', 'shū'],
			['碳', 'tàn'],
			['癌', 'ái'],
			['症', 'zhèng'],
			['率', 'lǜ'],
			['疾', 'jí'],
			['灶', 'zào']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		chars: [
			['鹏', 'péng'],
			['揽', 'lǎn'],
			['驱', 'qū'],
			['践', 'jiàn'],
			['着', 'zhuó'],
			['党', 'dǎng'],
			['施', 'shī'],
			['懈', 'xiè'],
			['宛', 'wǎn'],
			['碑', 'bēi']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地一',
		chars: [
			['宾', 'bīn'],
			['吉', 'jí'],
			['咸', 'xián'],
			['兆', 'zhào'],
			['廷', 'tíng'],
			['予', 'yǔ'],
			['肿', 'zhǒng'],
			['阶', 'jiē'],
			['趾', 'zhǐ'],
			['逻', 'luó'],
			['政', 'zhèng'],
			['浏', 'liú']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		chars: [
			['漫', 'màn'],
			['涛', 'tāo']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		chars: [
			['挤', 'jǐ'],
			['叉', 'chā']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		chars: [
			['绣', 'xiù'],
			['潇', 'xiāo'],
			['绽', 'zhàn'],
			['朦', 'méng'],
			['胧', 'lóng'],
			['晖', 'huī'],
			['徜', 'cháng'],
			['徉', 'yáng']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		chars: [
			['炫', 'xuàn'],
			['垢', 'gòu'],
			['怯', 'qiè'],
			['曝', 'pù'],
			['赤', 'chì'],
			['涉', 'shè'],
			['晕', 'yùn']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地二',
		chars: [
			['屈', 'qū'],
			['渊', 'yuān'],
			['孟', 'mèng'],
			['甫', 'fǔ'],
			['韩', 'hán'],
			['愈', 'yù'],
			['禹', 'yǔ'],
			['锡', 'xī'],
			['仲', 'zhòng'],
			['龚', 'gōng']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		chars: [
			['忧', 'yōu'],
			['虑', 'lǜ'],
			['职', 'zhí'],
			['屏', 'bǐng'],
			['蹭', 'cèng'],
			['稿', 'gǎo'],
			['腔', 'qiāng'],
			['殃', 'yāng'],
			['折', 'shé']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		chars: [
			['疙', 'gē'],
			['瘩', 'da'],
			['侮', 'wǔ'],
			['恶', 'wù'],
			['毒', 'dú'],
			['聋', 'lóng'],
			['啄', 'zhuó'],
			['伏', 'fú'],
			['哼', 'hēng'],
			['啼', 'tí'],
			['凄', 'qī']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		chars: [
			['调', 'diào'],
			['伺', 'sì'],
			['嚣', 'xiāo'],
			['吭', 'háng'],
			['吠', 'fèi'],
			['促', 'cù'],
			['颇', 'pō'],
			['奢', 'shē'],
			['侈', 'chǐ'],
			['苟', 'gǒu'],
			['譬', 'pì'],
			['侍', 'shì'],
			['窥', 'kuī'],
			['伺', 'sì']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地三',
		chars: [
			['肝', 'gān'],
			['秆', 'gǎn'],
			['俏', 'qiào'],
			['峭', 'qiào'],
			['哺', 'bǔ'],
			['浦', 'pǔ'],
			['沦', 'lún'],
			['抡', 'lūn'],
			['换', 'huàn'],
			['焕', 'huàn'],
			['俊', 'jùn'],
			['峻', 'jùn']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		chars: [
			['扩', 'kuò'],
			['荷', 'hé'],
			['刹', 'chà'],
			['镶', 'xiāng']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		chars: [
			['浙', 'zhè'],
			['簇', 'cù'],
			['臀', 'tún'],
			['漆', 'qī'],
			['蜿', 'wān'],
			['蜒', 'yán']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		chars: [
			['恭', 'gōng'],
			['勤', 'qín'],
			['焉', 'yān'],
			['卒', 'zú']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		chars: [
			['晋', 'jìn'],
			['絮', 'xù'],
			['扭', 'niǔ'],
			['姥', 'lǎo'],
			['吧', 'ba'],
			['塞', 'sāi'],
			['呜', 'wū'],
			['哇', 'wa'],
			['糠', 'kāng'],
			['栓', 'shuān'],
			['捆', 'kǔn'],
			['绑', 'bǎng'],
			['劫', 'jié'],
			['毙', 'bì'],
			['扒', 'bā'],
			['尸', 'shī']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		chars: [
			['徽', 'huī'],
			['谜', 'mí'],
			['唇', 'chún'],
			['尚', 'shàng'],
			['拌', 'bàn'],
			['倔', 'jué'],
			['强', 'jiàng'],
			['嘱', 'zhǔ'],
			['咐', 'fù'],
			['忍', 'rěn'],
			['沮', 'jǔ'],
			['吭', 'kēng'],
			['仪', 'yí']
		]
	},
	{
		section: '阅读',
		lesson: '21',
		chars: [
			['蹬', 'dēng'],
			['妨', 'fáng'],
			['搓', 'cuō'],
			['葵', 'kuí'],
			['祈', 'qí'],
			['遗', 'yí'],
			['憾', 'hàn'],
			['污', 'wū'],
			['屑', 'xiè']
		]
	},
	{
		section: '阅读',
		lesson: '22',
		chars: [
			['芙', 'fú'],
			['蓉', 'róng'],
			['洛', 'luò'],
			['单', 'chán'],
			['砚', 'yàn'],
			['乾', 'qián'],
			['坤', 'kūn']
		]
	},
	{
		section: '阅读',
		lesson: '23',
		chars: [
			['役', 'yì'],
			['屡', 'lǚ'],
			['摧', 'cuī'],
			['雹', 'báo'],
			['晕', 'yùn'],
			['膛', 'táng']
		]
	},
	{
		section: '阅读',
		lesson: '24',
		chars: [
			['弥', 'mí'],
			['脉', 'mài'],
			['葬', 'zàng'],
			['剖', 'pǒu'],
			['裸', 'luǒ'],
			['泣', 'qì'],
			['汹', 'xiōng'],
			['维', 'wéi'],
			['秩', 'zhì'],
			['酣', 'hān'],
			['械', 'xiè'],
			['岗', 'gǎng'],
			['宰', 'zǎi'],
			['遣', 'qiǎn']
		]
	},
	{
		section: '阅读',
		lesson: '25',
		chars: [
			['泰', 'tài'],
			['杖', 'zhàng'],
			['敞', 'chǎng'],
			['拘', 'jū'],
			['蕴', 'yùn']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地四',
		chars: [
			['蔼', 'ǎi'],
			['慷', 'kāng'],
			['慨', 'kǎi'],
			['贤', 'xián'],
			['威', 'wēi'],
			['惧', 'jù'],
			['彬', 'bīn'],
			['躁', 'zào'],
			['焚', 'fén']
		]
	},
	{
		section: '阅读',
		lesson: '26',
		chars: [
			['妖', 'yāo'],
			['矩', 'jǔ'],
			['乖', 'guāi'],
			['撵', 'niǎn'],
			['丫', 'yā'],
			['拽', 'zhuài'],
			['冲', 'chòng'],
			['瘦', 'shòu']
		]
	},
	{
		section: '阅读',
		lesson: '27',
		chars: [
			['硕', 'shuò'],
			['允', 'yǔn'],
			['砌', 'qì'],
			['覆', 'fù'],
			['啸', 'xiào'],
			['缕', 'lǚ'],
			['搂', 'lǒu'],
			['颊', 'jiá']
		]
	},
	{
		section: '阅读',
		lesson: '28',
		chars: [
			['矢', 'shǐ'],
			['殿', 'diàn'],
			['抚', 'fǔ'],
			['鲸', 'jīng'],
			['恰', 'qià']
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
	semester: '下',
	list_type: '识字表',
	note:
		'人教版统编四年级下册附录「识字表」按附图书页顺序录入；脚注①说明蓝色字为此前已认读生字，此处作多音字学习且不计入生字总数。蓝色多音字按教材标注读音（卜bǔ、和hè、扎zhá、率lǜ/shuài、着zhuó、折shé、恶wù、调diào、荷hé、吧ba、塞sāi、哇wa、强jiàng、单chán、冲chòng等）。本书脚注「共250个生字」与本文件逐条全录口径不同；本文件逐条全录268条，去重汉字264个（同一汉字在不同课次多次出现计为多行，如率、伺、吭、晕）。语文园地一含附图单独一行「浏」。阅读第15课「伺」出现两次，均录入。若印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', '四年级下册-识字表.json')
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
