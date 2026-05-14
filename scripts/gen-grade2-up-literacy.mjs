/**
 * 二年级上册识字表 → static/booktext/renjiaoban/二年级上册-识字表.json（结构与一年级识字表 JSON 一致）
 * 运行：node scripts/gen-grade2-up-literacy.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renjiaoTextbookJsonFile } from '../constants/renjiao-textbook-filenames.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** @type {{ section: string, lesson: string, chars: { hanzi: string, pinyin: string }[] }[]} */
const groups = [
	{
		section: '阅读',
		lesson: '1',
		chars: [
			['蝌', 'kē'],
			['蚪', 'dǒu'],
			['脑', 'nǎo'],
			['袋', 'dài'],
			['灰', 'huī'],
			['甩', 'shuǎi'],
			['活', 'huó'],
			['腿', 'tuǐ'],
			['教', 'jiāo'],
			['迎', 'yíng'],
			['嘴', 'zuǐ'],
			['龟', 'guī'],
			['披', 'pī'],
			['蹲', 'dūn'],
			['肚', 'dù'],
			['鼓', 'gǔ']
		]
	},
	{
		section: '阅读',
		lesson: '2',
		chars: [
			['汽', 'qì'],
			['越', 'yuè'],
			['温', 'wēn'],
			['滴', 'dī'],
			['奔', 'bēn'],
			['海', 'hǎi'],
			['洋', 'yáng'],
			['发', 'fā'],
			['坏', 'huài'],
			['没', 'mò'],
			['庄', 'zhuāng'],
			['稼', 'jià'],
			['屋', 'wū']
		]
	},
	{
		section: '阅读',
		lesson: '3',
		chars: [
			['植', 'zhí'],
			['如', 'rú'],
			['脚', 'jiǎo'],
			['旅', 'lǚ'],
			['准', 'zhǔn'],
			['备', 'bèi'],
			['送', 'sòng'],
			['纷', 'fēn'],
			['挂', 'guà'],
			['挺', 'tǐng'],
			['钻', 'zuān'],
			['底', 'dǐ'],
			['炸', 'zhà'],
			['离', 'lí'],
			['粗', 'cū'],
			['得', 'dé']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地一',
		chars: [
			['朗', 'lǎng'],
			['雾', 'wù'],
			['暴', 'bào'],
			['雷', 'léi'],
			['阵', 'zhèn'],
			['冻', 'dòng'],
			['夹', 'jiā']
		]
	},
	{
		section: '识字',
		lesson: '1',
		chars: [
			['帆', 'fān'],
			['港', 'gǎng'],
			['湾', 'wān'],
			['塘', 'táng'],
			['稻', 'dào'],
			['行', 'háng'],
			['垂', 'chuí'],
			['园', 'yuán'],
			['溪', 'xī'],
			['丛', 'cóng'],
			['翠', 'cuì'],
			['群', 'qún'],
			['队', 'duì'],
			['铜', 'tóng'],
			['号', 'hào']
		]
	},
	{
		section: '识字',
		lesson: '2',
		chars: [
			['榕', 'róng'],
			['壮', 'zhuàng'],
			['梧', 'wú'],
			['桐', 'tóng'],
			['掌', 'zhǎng'],
			['枫', 'fēng'],
			['松', 'sōng'],
			['柏', 'bǎi'],
			['桦', 'huà'],
			['守', 'shǒu'],
			['银', 'yín'],
			['杏', 'xìng'],
			['杉', 'shān'],
			['化', 'huà'],
			['桂', 'guì']
		]
	},
	{
		section: '识字',
		lesson: '3',
		chars: [
			['世', 'shì'],
			['界', 'jiè'],
			['孔', 'kǒng'],
			['雀', 'què'],
			['锦', 'jǐn'],
			['雄', 'xióng'],
			['鹰', 'yīng'],
			['翔', 'xiáng'],
			['雁', 'yàn'],
			['深', 'shēn'],
			['猛', 'měng'],
			['灵', 'líng'],
			['休', 'xiū'],
			['猫', 'māo']
		]
	},
	{
		section: '识字',
		lesson: '4',
		chars: [
			['季', 'jì'],
			['蝴', 'hú'],
			['蝶', 'dié'],
			['麦', 'mài'],
			['嫩', 'nèn'],
			['肥', 'féi'],
			['农', 'nóng'],
			['勤', 'qín'],
			['归', 'guī'],
			['戴', 'dài'],
			['场', 'cháng'],
			['谷', 'gǔ'],
			['虽', 'suī'],
			['辛', 'xīn'],
			['苦', 'kǔ'],
			['制', 'zhì']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地二',
		chars: [
			['丑', 'chǒu'],
			['恨', 'hèn'],
			['诚', 'chéng'],
			['虚', 'xū'],
			['假', 'jiǎ'],
			['漠', 'mò'],
			['助', 'zhù'],
			['贫', 'pín'],
			['富', 'fù'],
			['饥', 'jī']
		]
	},
	{
		section: '阅读',
		lesson: '4',
		chars: [
			['虹', 'hóng'],
			['浇', 'jiāo'],
			['壶', 'hú'],
			['提', 'tí'],
			['洒', 'sǎ'],
			['挑', 'tiāo'],
			['镜', 'jìng'],
			['拿', 'ná'],
			['系', 'xì'],
			['荡', 'dàng'],
			['裙', 'qún']
		]
	},
	{
		section: '阅读',
		lesson: '5',
		chars: [
			['婆', 'pó'],
			['候', 'hòu'],
			['趣', 'qù'],
			['舅', 'jiù'],
			['或', 'huò'],
			['留', 'liú'],
			['份', 'fèn'],
			['喂', 'wèi'],
			['逃', 'táo'],
			['曲', 'qǔ'],
			['者', 'zhě'],
			['服', 'fú'],
			['扑', 'pū'],
			['鼻', 'bí']
		]
	},
	{
		section: '阅读',
		lesson: '6',
		chars: [
			['珍', 'zhēn'],
			['撇', 'piě'],
			['碧', 'bì'],
			['靠', 'kào'],
			['仰', 'yǎng'],
			['颗', 'kē'],
			['距', 'jù'],
			['变', 'biàn'],
			['祖', 'zǔ'],
			['勺', 'sháo'],
			['绕', 'rào'],
			['转', 'zhuǎn'],
			['楚', 'chǔ'],
			['汉', 'hàn'],
			['刻', 'kè'],
			['研', 'yán']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地三',
		chars: [
			['弹', 'tán'],
			['钢', 'gāng'],
			['琴', 'qín'],
			['捏', 'niē'],
			['泥', 'ní'],
			['围', 'wéi'],
			['滚', 'gǔn'],
			['铁', 'tiě'],
			['环', 'huán'],
			['滑', 'huá'],
			['梯', 'tī']
		]
	},
	{
		section: '阅读',
		lesson: '7',
		chars: [
			['登', 'dēng'],
			['唐', 'táng'],
			['依', 'yī'],
			['尽', 'jìn'],
			['欲', 'yù'],
			['穷', 'qióng'],
			['层', 'céng'],
			['瀑', 'pù'],
			['布', 'bù'],
			['炉', 'lú'],
			['紫', 'zǐ'],
			['烟', 'yān'],
			['遥', 'yáo']
		]
	},
	{
		section: '阅读',
		lesson: '8',
		chars: [
			['闻', 'wén'],
			['景', 'jǐng'],
			['区', 'qū'],
			['省', 'shěng'],
			['秀', 'xiù'],
			['神', 'shén'],
			['仙', 'xiān'],
			['盘', 'pán'],
			['指', 'zhǐ'],
			['巨', 'jù'],
			['伸', 'shēn'],
			['都', 'dū'],
			['著', 'zhù']
		]
	},
	{
		section: '阅读',
		lesson: '9',
		chars: [
			['抢', 'qiǎng'],
			['状', 'zhuàng'],
			['岩', 'yán'],
			['潭', 'tán'],
			['茂', 'mào'],
			['盛', 'shèng'],
			['胜', 'shèng'],
			['央', 'yāng'],
			['岛', 'dǎo'],
			['隐', 'yǐn'],
			['约', 'yuē'],
			['倒', 'dào'],
			['映', 'yìng'],
			['整', 'zhěng'],
			['童', 'tóng'],
			['吸', 'xī']
		]
	},
	{
		section: '阅读',
		lesson: '10·词语',
		chars: [
			['引', 'yǐn'],
			['客', 'kè']
		]
	},
	{
		section: '阅读',
		lesson: '10',
		chars: [
			['葡', 'pú'],
			['萄', 'táo'],
			['沟', 'gōu'],
			['坡', 'pō'],
			['密', 'mì'],
			['枝', 'zhī'],
			['淡', 'dàn'],
			['好', 'hào'],
			['族', 'zú'],
			['够', 'gòu'],
			['收', 'shǒu'],
			['市', 'shì'],
			['干', 'gān']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地四·词语',
		chars: [
			['钉', 'dīng'],
			['分', 'fèn'],
			['颜', 'yán'],
			['味', 'wèi']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地四',
		chars: [
			['订', 'dìng'],
			['效', 'xiào'],
			['丰', 'fēng'],
			['昌', 'chāng'],
			['付', 'fù'],
			['卧', 'wò'],
			['铺', 'pù'],
			['改', 'gǎi'],
			['签', 'qiān'],
			['退', 'tuì'],
			['更', 'gèng']
		]
	},
	{
		section: '阅读',
		lesson: '11·词语',
		chars: [
			['维', 'wéi'],
			['码', 'mǎ']
		]
	},
	{
		section: '阅读',
		lesson: '11',
		chars: [
			['观', 'guān'],
			['沿', 'yán'],
			['渴', 'kě'],
			['话', 'huà'],
			['弄', 'nòng'],
			['错', 'cuò'],
			['际', 'jì'],
			['抬', 'tái'],
			['信', 'xìn']
		]
	},
	{
		section: '阅读',
		lesson: '12',
		chars: [
			['号', 'háo'],
			['当', 'dàng'],
			['鹊', 'què'],
			['寻', 'xún'],
			['枯', 'kū'],
			['却', 'què'],
			['劝', 'quàn'],
			['刮', 'guā'],
			['死', 'sǐ'],
			['将', 'jiāng'],
			['且', 'qiě'],
			['狂', 'kuáng'],
			['冷', 'lěng']
		]
	},
	{
		section: '阅读',
		lesson: '13·词语',
		chars: [
			['重', 'chóng'],
			['复', 'fù'],
			['哀', 'āi'],
			['唤', 'huàn']
		]
	},
	{
		section: '阅读',
		lesson: '13',
		chars: [
			['葫', 'hú'],
			['芦', 'lú'],
			['谢', 'xiè'],
			['已', 'yǐ'],
			['盯', 'dīng'],
			['赛', 'sài'],
			['怪', 'guài'],
			['慢', 'màn']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地五',
		chars: [
			['轿', 'jiào'],
			['教', 'jiào'],
			['摩', 'mó'],
			['托', 'tuō'],
			['防', 'fáng'],
			['渔', 'yú'],
			['货', 'huò'],
			['科', 'kē'],
			['考', 'kǎo'],
			['察', 'chá']
		]
	},
	{
		section: '阅读',
		lesson: '14',
		chars: [
			['楼', 'lóu'],
			['艰', 'jiān'],
			['斗', 'dǒu'],
			['代', 'dài'],
			['临', 'lín'],
			['腊', 'là'],
			['军', 'jūn'],
			['报', 'bào'],
			['章', 'zhāng'],
			['握', 'wò'],
			['凝', 'níng'],
			['觉', 'jué'],
			['油', 'yóu']
		]
	},
	{
		section: '阅读',
		lesson: '15·词语',
		chars: [
			['辉', 'huī'],
			['革', 'gé'],
			['命', 'mìng'],
			['利', 'lì']
		]
	},
	{
		section: '阅读',
		lesson: '15',
		chars: [
			['朱', 'zhū'],
			['德', 'dé'],
			['扁', 'biǎn'],
			['担', 'dān'],
			['同', 'tóng'],
			['志', 'zhì'],
			['伍', 'wǔ'],
			['敌', 'dí'],
			['根', 'gēn'],
			['据', 'jù'],
			['抽', 'chōu'],
			['陡', 'dǒu'],
			['鞋', 'xié']
		]
	},
	{
		section: '阅读',
		lesson: '16',
		chars: [
			['疼', 'téng'],
			['敬', 'jìng'],
			['泼', 'pō'],
			['民', 'mín'],
			['度', 'dù'],
			['特', 'tè'],
			['周', 'zhōu'],
			['恩', 'ēn'],
			['敲', 'qiāo'],
			['铺', 'pù'],
			['龙', 'lóng'],
			['船', 'chuán'],
			['容', 'róng'],
			['踩', 'cǎi'],
			['始', 'shǐ']
		]
	},
	{
		section: '阅读',
		lesson: '17·词语',
		chars: [
			['盛', 'shèng'],
			['碗', 'wǎn'],
			['祝', 'zhù'],
			['寿', 'shòu']
		]
	},
	{
		section: '阅读',
		lesson: '17',
		chars: [
			['刘', 'liú'],
			['兰', 'lán'],
			['派', 'pài'],
			['由', 'yóu'],
			['于', 'yú'],
			['卖', 'mài'],
			['员', 'yuán'],
			['捕', 'bǔ'],
			['买', 'mǎi'],
			['似', 'shì'],
			['踏', 'tà'],
			['烈', 'liè'],
			['荣', 'róng']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地六·词语',
		chars: [
			['岁', 'suì'],
			['题', 'tí']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地六',
		chars: [
			['锋', 'fēng'],
			['蜜', 'mì'],
			['蜂', 'fēng'],
			['峰', 'fēng'],
			['爆', 'bào'],
			['争', 'zhēng'],
			['吵', 'chǎo'],
			['炒', 'chǎo'],
			['慕', 'mù'],
			['墓', 'mù'],
			['暮', 'mù']
		]
	},
	{
		section: '阅读',
		lesson: '18',
		chars: [
			['绝', 'jué'],
			['径', 'jìng'],
			['踪', 'zōng'],
			['灭', 'miè'],
			['舟', 'zhōu'],
			['钓', 'diào'],
			['似', 'sì'],
			['庐', 'lú'],
			['笼', 'lǒng'],
			['盖', 'gài'],
			['苍', 'cāng'],
			['茫', 'máng']
		]
	},
	{
		section: '阅读',
		lesson: '19',
		chars: [
			['论', 'lùn'],
			['岸', 'àn'],
			['暗', 'àn'],
			['街', 'jiē'],
			['梁', 'liáng'],
			['甚', 'shèn'],
			['至', 'zhì'],
			['切', 'qiè'],
			['躲', 'duǒ'],
			['改', 'gǎi'],
			['悠', 'yōu'],
			['闲', 'xián'],
			['散', 'sàn']
		]
	},
	{
		section: '阅读',
		lesson: '20·词语',
		chars: [['失', 'shī']]
	},
	{
		section: '阅读',
		lesson: '20',
		chars: [
			['堆', 'duī'],
			['累', 'lèi'],
			['添', 'tiān'],
			['柴', 'chái'],
			['烧', 'shāo'],
			['旺', 'wàng'],
			['闭', 'bì'],
			['哎', 'āi'],
			['旁', 'páng'],
			['冲', 'chōng'],
			['哇', 'wa'],
			['终', 'zhōng'],
			['浑', 'hún']
		]
	},
	{
		section: '阅读',
		lesson: '语文园地七·词语',
		chars: [
			['淋', 'lín'],
			['晒', 'shài']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地七',
		chars: [
			['漱', 'shù'],
			['饿', 'è'],
			['沼', 'zhǎo'],
			['泽', 'zé'],
			['宁', 'níng'],
			['杠', 'gàng'],
			['杆', 'gǎn'],
			['冻', 'dòng'],
			['库', 'kù'],
			['闸', 'zhá'],
			['糕', 'gāo']
		]
	},
	{
		section: '阅读',
		lesson: '21·词语',
		chars: [['蝗', 'huáng']]
	},
	{
		section: '阅读',
		lesson: '21',
		chars: [
			['称', 'chēng'],
			['赞', 'zàn'],
			['刺', 'cì'],
			['猬', 'wèi'],
			['板', 'bǎn'],
			['凳', 'dèng'],
			['但', 'dàn'],
			['级', 'jí'],
			['傍', 'bàng'],
			['评', 'píng'],
			['泄', 'xiè'],
			['解', 'jiě'],
			['除', 'chú']
		]
	},
	{
		section: '阅读',
		lesson: '22',
		chars: [
			['筝', 'zhēng'],
			['鼠', 'shǔ'],
			['折', 'zhé'],
			['漂', 'piāo'],
			['扎', 'zā'],
			['乘', 'chéng'],
			['抓', 'zhuā'],
			['线', 'xiàn'],
			['莓', 'méi'],
			['俩', 'liǎ'],
			['架', 'jià'],
			['受', 'shòu'],
			['愿', 'yuàn'],
			['朝', 'cháo'],
			['取', 'qǔ']
		]
	},
	{
		section: '阅读',
		lesson: '23',
		chars: [
			['撞', 'zhuàng'],
			['怨', 'yuàn'],
			['软', 'ruǎn'],
			['呜', 'wū'],
			['慈', 'cí'],
			['祥', 'xiáng'],
			['量', 'liàng'],
			['跌', 'diē'],
			['摔', 'shuāi'],
			['擦', 'cā'],
			['咱', 'zán'],
			['推', 'tuī'],
			['驶', 'shǐ'],
			['坚', 'jiān'],
			['硬', 'yìng']
		]
	},
	{
		section: '语文园地',
		lesson: '语文园地八',
		chars: [
			['狼', 'láng'],
			['猩', 'xīng'],
			['鹤', 'hè'],
			['蛇', 'shé'],
			['鸽', 'gē'],
			['蚕', 'cán'],
			['蚯', 'qiū'],
			['蚓', 'yǐn'],
			['骆', 'luò'],
			['驼', 'tuó'],
			['狮', 'shī']
		]
	}
]

// 页脚零散字：疲、劳 —— 置于第21课末（附图描述为底部）
groups.find((g) => g.lesson === '21').chars.push(['疲', 'pí'], ['劳', 'láo'])

for (const g of groups) {
	g.chars = g.chars.map(([hanzi, pinyin]) => ({ hanzi, pinyin }))
}

let total = 0
for (const g of groups) total += g.chars.length

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 2,
	semester: '上',
	list_type: '识字表',
	note:
		'人教版统编二年级上册附录「识字表」按书页顺序录入；蓝色多音字按教材标注读音（教jiāo、没mò、得dé、行háng、场cháng、系xì、曲qǔ、转zhuǎn、都dū、好hào、干gān、铺pù、更gèng、号háo、当dàng、将jiāng、觉jué、盛shèng、似shì/sì、笼lǒng、散sàn、朝cháo、累lèi等）。本书脚注「共460个生字」多为不计蓝字多音专条等口径；本文件逐条全录476条，去重汉字469个，印次差异请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(2, '上', 'literacy'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'groups', groups.length, 'rows', total, '(unique hanzi 469; textbook footnote 460)')
