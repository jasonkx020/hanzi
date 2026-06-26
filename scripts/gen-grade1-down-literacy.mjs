/**
 * @file gen-grade1-down-literacy.mjs
 * @module scripts
 * @description 源文件：gen-grade1-down-literacy.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 生成一年级下册识字表 JSON + 追加 seed-curriculum.json
 * 数据依据教材识字表书页顺序（拼音含多音字读本课标注）
 * 运行：node scripts/gen-grade1-down-literacy.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renjiaoTextbookJsonFile } from '../constants/renjiao-textbook-filenames.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** @typedef {{ section: string, lesson: string, lesson_hint: string, pairs: [string, string][] }} Group */

/** @type {Group[]} */
const GROUPS = [
	{
		section: '识字',
		lesson: '1',
		lesson_hint: '识字1',
		pairs: [
			['霜', 'shuāng'],
			['吹', 'chuī'],
			['落', 'luò'],
			['降', 'jiàng'],
			['飘', 'piāo'],
			['游', 'yóu'],
			['池', 'chí'],
			['入', 'rù']
		]
	},
	{
		section: '识字',
		lesson: '2',
		lesson_hint: '识字2',
		pairs: [
			['氏', 'shì'],
			['什', 'shén'],
			['李', 'lǐ'],
			['张', 'zhāng'],
			['弓', 'gōng'],
			['古', 'gǔ'],
			['胡', 'hú'],
			['吴', 'wú'],
			['言', 'yán'],
			['孙', 'sūn']
		]
	},
	{
		section: '识字',
		lesson: '3',
		lesson_hint: '识字3',
		pairs: [
			['河', 'hé'],
			['晴', 'qíng'],
			['眼', 'yǎn'],
			['睛', 'jīng'],
			['保', 'bǎo'],
			['护', 'hù'],
			['苗', 'miáo'],
			['吃', 'chī'],
			['事', 'shì'],
			['情', 'qíng'],
			['请', 'qǐng'],
			['让', 'ràng']
		]
	},
	{
		section: '识字',
		lesson: '4',
		lesson_hint: '识字4',
		pairs: [
			['猜', 'cāi'],
			['边', 'biān'],
			['凉', 'liáng'],
			['喜', 'xǐ'],
			['欢', 'huān'],
			['时', 'shí'],
			['怕', 'pà'],
			['攻', 'gōng'],
			['令', 'lìng'],
			['感', 'gǎn'],
			['动', 'dòng'],
			['万', 'wàn'],
			['无', 'wú']
		]
	},
	{
		section: '识字',
		lesson: '语文园地一',
		lesson_hint: '语文园地一',
		pairs: [
			['识', 'shí'],
			['组', 'zǔ'],
			['计', 'jì'],
			['算', 'suàn'],
			['减', 'jiǎn'],
			['式', 'shì'],
			['图', 'tú'],
			['形', 'xíng'],
			['卡', 'kǎ'],
			['合', 'hé'],
			['唱', 'chàng'],
			['团', 'tuán']
		]
	},
	{
		section: '阅读',
		lesson: '1',
		lesson_hint: '阅读1',
		pairs: [
			['热', 'rè'],
			['爱', 'ài'],
			['共', 'gòng'],
			['产', 'chǎn'],
			['党', 'dǎng'],
			['太', 'tài'],
			['阳', 'yáng'],
			['光', 'guāng'],
			['怀', 'huái'],
			['抱', 'bào'],
			['幸', 'xìng'],
			['福', 'fú'],
			['成', 'chéng']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		lesson_hint: '阅读2',
		pairs: [
			['井', 'jǐng'],
			['城', 'chéng'],
			['村', 'cūn'],
			['毛', 'máo'],
			['主', 'zhǔ'],
			['席', 'xí'],
			['住', 'zhù'],
			['乡', 'xiāng'],
			['亲', 'qīn'],
			['战', 'zhàn'],
			['士', 'shì'],
			['想', 'xiǎng'],
			['念', 'niàn']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		lesson_hint: '阅读3',
		pairs: [
			['告', 'gào'],
			['诉', 'sù'],
			['走', 'zǒu'],
			['京', 'jīng'],
			['座', 'zuò'],
			['安', 'ān'],
			['广', 'guǎng'],
			['场', 'chǎng'],
			['非', 'fēi'],
			['宽', 'kuān'],
			['丽', 'lì'],
			['洁', 'jié']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地二',
		lesson_hint: '语文园地二',
		pairs: [
			['认', 'rèn'],
			['连', 'lián'],
			['选', 'xuǎn'],
			['圈', 'quān'],
			['涂', 'tú'],
			['填', 'tián'],
			['试', 'shì'],
			['练', 'liàn']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		lesson_hint: '阅读4',
		pairs: [
			['玩', 'wán'],
			['得', 'de'],
			['急', 'jí'],
			['直', 'zhí'],
			['哭', 'kū'],
			['跟', 'gēn'],
			['忽', 'hū'],
			['然', 'rán'],
			['听', 'tīng'],
			['喊', 'hǎn'],
			['快', 'kuài'],
			['已', 'yǐ'],
			['背', 'bèi']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		lesson_hint: '阅读5',
		pairs: [
			['只', 'zhǐ'],
			['很', 'hěn'],
			['孤', 'gū'],
			['单', 'dān'],
			['种', 'zhòng'],
			['每', 'měi'],
			['都', 'dōu'],
			['邻', 'lín'],
			['居', 'jū'],
			['叫', 'jiào'],
			['招', 'zhāo'],
			['呼', 'hū'],
			['乐', 'lè']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		lesson_hint: '阅读6',
		pairs: [
			['怎', 'zěn'],
			['独', 'dú'],
			['跳', 'tiào'],
			['绳', 'shéng'],
			['当', 'dāng'],
			['还', 'hái'],
			['乐', 'yuè'],
			['得', 'děi'],
			['羽', 'yǔ'],
			['球', 'qiú'],
			['劲', 'jìn'],
			['轮', 'lún'],
			['排', 'pái']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地三',
		lesson_hint: '语文园地三',
		pairs: [
			['母', 'mǔ'],
			['页', 'yè'],
			['止', 'zhǐ'],
			['斤', 'jīn'],
			['寸', 'cùn'],
			['丁', 'dīng'],
			['千', 'qiān'],
			['全', 'quán'],
			['旦', 'dàn']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		lesson_hint: '阅读7',
		pairs: [
			['静', 'jìng'],
			['思', 'sī'],
			['床', 'chuáng'],
			['疑', 'yí'],
			['举', 'jǔ'],
			['望', 'wàng'],
			['低', 'dī'],
			['故', 'gù']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		lesson_hint: '阅读8',
		pairs: [
			['胆', 'dǎn'],
			['敢', 'gǎn'],
			['勇', 'yǒng'],
			['讲', 'jiǎng'],
			['窗', 'chuāng'],
			['乱', 'luàn'],
			['拉', 'lā'],
			['样', 'yàng'],
			['笑', 'xiào'],
			['再', 'zài'],
			['睡', 'shuì'],
			['觉', 'jiào']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		lesson_hint: '阅读9',
		pairs: [
			['端', 'duān'],
			['粽', 'zòng'],
			['节', 'jié'],
			['总', 'zǒng'],
			['煮', 'zhǔ'],
			['盼', 'pàn'],
			['米', 'mǐ'],
			['枣', 'zǎo'],
			['甜', 'tián'],
			['分', 'fēn'],
			['鲜', 'xiān'],
			['肉', 'ròu'],
			['了', 'liǎo']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地四',
		lesson_hint: '语文园地四',
		pairs: [
			['册', 'cè'],
			['支', 'zhī'],
			['台', 'tái'],
			['电', 'diàn'],
			['视', 'shì'],
			['部', 'bù'],
			['机', 'jī'],
			['衣', 'yī'],
			['裤', 'kù'],
			['被', 'bèi']
		]
	},
	{
		section: '识字',
		lesson: '5',
		lesson_hint: '识字5',
		pairs: [
			['物', 'wù'],
			['捉', 'zhuō'],
			['迷', 'mí'],
			['藏', 'cáng'],
			['造', 'zào'],
			['蚂', 'mǎ'],
			['蚁', 'yǐ'],
			['运', 'yùn'],
			['食', 'shí'],
			['粮', 'liáng'],
			['房', 'fáng'],
			['结', 'jié'],
			['网', 'wǎng']
		]
	},
	{
		section: '识字',
		lesson: '6',
		lesson_hint: '识字6',
		pairs: [
			['圆', 'yuán'],
			['严', 'yán'],
			['寒', 'hán'],
			['酷', 'kù'],
			['暑', 'shǔ'],
			['暖', 'nuǎn'],
			['晨', 'chén'],
			['细', 'xì'],
			['朝', 'zhāo'],
			['霞', 'xiá'],
			['夕', 'xī'],
			['阳', 'yáng'],
			['香', 'xiāng']
		]
	},
	{
		section: '识字',
		lesson: '7',
		lesson_hint: '识字7',
		pairs: [
			['操', 'cāo'],
			['拔', 'bá'],
			['拍', 'pāi'],
			['跑', 'pǎo'],
			['踢', 'tī'],
			['铃', 'líng'],
			['真', 'zhēn'],
			['闹', 'nào'],
			['丢', 'diū'],
			['沙', 'shā'],
			['身', 'shēn'],
			['体', 'tǐ']
		]
	},
	{
		section: '识字',
		lesson: '8',
		lesson_hint: '识字8',
		pairs: [
			['之', 'zhī'],
			['初', 'chū'],
			['相', 'xiāng'],
			['近', 'jìn'],
			['习', 'xí'],
			['远', 'yuǎn'],
			['教', 'jiào'],
			['道', 'dào'],
			['专', 'zhuān'],
			['幼', 'yòu'],
			['玉', 'yù'],
			['知', 'zhī'],
			['义', 'yì']
		]
	},
	{
		section: '识字',
		lesson: '语文园地五',
		lesson_hint: '语文园地五',
		pairs: [
			['饭', 'fàn'],
			['饱', 'bǎo'],
			['茶', 'chá'],
			['泡', 'pào'],
			['轻', 'qīng'],
			['穿', 'chuān'],
			['袍', 'páo'],
			['鞭', 'biān'],
			['炮', 'pào']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		lesson_hint: '阅读10',
		pairs: [
			['诗', 'shī'],
			['首', 'shǒu'],
			['偷', 'tōu'],
			['浮', 'fú'],
			['萍', 'píng'],
			['泉', 'quán'],
			['惜', 'xī'],
			['照', 'zhào'],
			['柔', 'róu'],
			['荷', 'hé'],
			['露', 'lù'],
			['角', 'jiǎo']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		lesson_hint: '阅读11',
		pairs: [
			['浪', 'làng'],
			['迈', 'mài'],
			['悄', 'qiǎo'],
			['泪', 'lèi'],
			['次', 'cì'],
			['给', 'gěi'],
			['壳', 'ké'],
			['虾', 'xiā'],
			['装', 'zhuāng'],
			['像', 'xiàng'],
			['淘', 'táo'],
			['娃', 'wá']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		lesson_hint: '阅读12',
		pairs: [
			['珠', 'zhū'],
			['摇', 'yáo'],
			['篮', 'lán'],
			['亮', 'liàng'],
			['晶', 'jīng'],
			['停', 'tíng'],
			['坪', 'píng'],
			['展', 'zhǎn'],
			['透', 'tòu'],
			['翅', 'chì'],
			['膀', 'bǎng'],
			['朵', 'duǒ']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		lesson_hint: '阅读13',
		pairs: [
			['要', 'yào'],
			['腰', 'yāo'],
			['阴', 'yīn'],
			['沉', 'chén'],
			['呀', 'ya'],
			['忙', 'máng'],
			['呢', 'ne'],
			['吗', 'ma'],
			['面', 'miàn'],
			['空', 'kòng'],
			['闷', 'mēn'],
			['吧', 'ba'],
			['消', 'xiāo'],
			['息', 'xī']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地六',
		lesson_hint: '语文园地六',
		pairs: [
			['棍', 'gùn'],
			['豆', 'dòu'],
			['汤', 'tāng'],
			['蚊', 'wén'],
			['扇', 'shàn'],
			['椅', 'yǐ'],
			['牵', 'qiān'],
			['织', 'zhī'],
			['斗', 'dǒu']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		lesson_hint: '阅读14',
		pairs: [
			['具', 'jù'],
			['铅', 'qiān'],
			['新', 'xīn'],
			['平', 'píng'],
			['盒', 'hé'],
			['些', 'xiē'],
			['此', 'cǐ'],
			['仔', 'zǐ'],
			['检', 'jiǎn'],
			['查', 'chá'],
			['所', 'suǒ'],
			['伙', 'huǒ'],
			['伴', 'bàn']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		lesson_hint: '阅读15',
		pairs: [
			['钟', 'zhōng'],
			['迟', 'chí'],
			['背', 'bēi'],
			['灯', 'dēng'],
			['等', 'děng'],
			['啊', 'a'],
			['决', 'jué'],
			['定', 'dìng'],
			['已', 'yǐ'],
			['经', 'jīng'],
			['位', 'wèi'],
			['表', 'biǎo']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		lesson_hint: '阅读16',
		pairs: [
			['虎', 'hǔ'],
			['熊', 'xióng'],
			['通', 'tōng'],
			['注', 'zhù'],
			['意', 'yì'],
			['遍', 'biàn'],
			['百', 'bǎi'],
			['为', 'wèi'],
			['因', 'yīn'],
			['舌', 'shé'],
			['礼', 'lǐ'],
			['呀', 'yā'],
			['忘', 'wàng'],
			['第', 'dì']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		lesson_hint: '阅读17',
		pairs: [
			['猴', 'hóu'],
			['块', 'kuài'],
			['结', 'jiē'],
			['兴', 'xìng'],
			['掰', 'bāi'],
			['扛', 'káng'],
			['往', 'wǎng'],
			['棵', 'kē'],
			['满', 'mǎn'],
			['扔', 'rēng'],
			['摘', 'zhāi'],
			['捧', 'pěng'],
			['追', 'zhuī']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地七',
		lesson_hint: '语文园地七',
		pairs: [
			['刷', 'shuā'],
			['梳', 'shū'],
			['巾', 'jīn'],
			['皂', 'zào'],
			['洗', 'xǐ'],
			['澡', 'zǎo'],
			['脸', 'liǎn'],
			['盆', 'pén']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		lesson_hint: '阅读18',
		pairs: [
			['棉', 'mián'],
			['姑', 'gū'],
			['娘', 'niáng'],
			['病', 'bìng'],
			['她', 'tā'],
			['治', 'zhì'],
			['燕', 'yàn'],
			['帮', 'bāng'],
			['害', 'hài'],
			['别', 'bié'],
			['干', 'gàn'],
			['惊', 'jīng'],
			['奇', 'qí']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		lesson_hint: '阅读19',
		pairs: [
			['咕', 'gū'],
			['咚', 'dōng'],
			['熟', 'shú'],
			['掉', 'diào'],
			['湖', 'hú'],
			['吓', 'xià'],
			['啦', 'la'],
			['鹿', 'lù'],
			['象', 'xiàng'],
			['野', 'yě'],
			['拦', 'lán'],
			['哪', 'nǎ'],
			['那', 'nà'],
			['领', 'lǐng']
		]
	},
	{
		section: '阅读',
		lesson: '20',
		lesson_hint: '阅读20',
		pairs: [
			['壁', 'bì'],
			['借', 'jiè'],
			['咬', 'yǎo'],
			['难', 'nán'],
			['哪', 'na'],
			['爬', 'pá'],
			['您', 'nín'],
			['拨', 'bō'],
			['赶', 'gǎn'],
			['摆', 'bǎi'],
			['过', 'guò'],
			['孩', 'hái'],
			['转', 'zhuǎn']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地八',
		lesson_hint: '语文园地八',
		pairs: [
			['吵', 'chǎo'],
			['现', 'xiàn'],
			['顶', 'dǐng'],
			['胖', 'pàng'],
			['票', 'piào'],
			['户', 'hù'],
			['交', 'jiāo'],
			['父', 'fù']
		]
	}
]

function main() {
	let total = 0
	for (const g of GROUPS) total += g.pairs.length
	console.log('[gen] groups:', GROUPS.length, 'chars:', total)

	const groupsJson = GROUPS.map((g) => ({
		section: g.section,
		lesson: g.lesson,
		chars: g.pairs.map(([hanzi, pinyin]) => ({ hanzi, pinyin }))
	}))

	const doc = {
		textbook_version_id: '统编(人教版)',
		grade: 1,
		semester: '下',
		list_type: '识字表',
		note: '人教版统编一年级下册附录「识字表」书页顺序；合计419条（唯一汉字411个）。脚注「410」与逐格合计或有出入。多音字按课内标注。阅读第11课与《浪花》一致；印次为《彩虹》时请按纸书改该组。',
		total,
		groups: groupsJson
	}

	const outBook = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(1, '下', 'literacy'))
	fs.writeFileSync(outBook, JSON.stringify(doc, null, 4) + '\n')
	console.log('[gen] wrote', outBook)

	const seeds = []
	let sort = 0
	for (const g of GROUPS) {
		for (const [hanzi, pinyin] of g.pairs) {
			sort++
			seeds.push({
				textbook_version_id: '统编(人教版)',
				grade: 1,
				semester: '下',
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
				Number(r.grade) === 1 &&
				r.semester === '下'
			)
	)
	const merged = [...filtered, ...seeds]
	fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2) + '\n')
	console.log('[gen] seed-curriculum rows:', merged.length, '(+' + seeds.length + ' grade1下识字)')
}

main()
