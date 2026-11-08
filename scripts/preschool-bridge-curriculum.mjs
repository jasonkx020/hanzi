/**
 * 幼小衔接·课标300基本字 — 主题化课程（每课约 6～10 字）
 */

/** @typedef {{ title: string, content: string, chars: string }} LessonDef */
/** @typedef {{ key: string, type: string, lessons: LessonDef[] }} UnitDef */

export const MOE_BASIC_CHARS_SOURCE =
	'八把爸白百班办半包饱北贝被本比边别不才草册长厂吵车成吃尺虫出穿船窗床春次从打大但当刀到道的灯地点电东冬动都豆对多儿耳二发反饭方放飞分风干高哥个给更工公共狗瓜关光广国果过孩海好合和河很红后花画话还回会火机几己加家见江交叫姐巾今金进京经九就军开看可课口哭快来老乐里力立脸两亮了林六妈马猫毛没每美妹门们米面民明木目那奶你年鸟牛农女胖跑朋皮片票平七奇起气千前青秋去全然让人日三山上少舌身生声师十什石时市是手书树双谁水说四岁他她台太天田条跳听同头土外玩晚万王网为卫文问我五午西习洗下先现向小校笑些心兴星行学雪牙羊阳样要爷也业叶页一衣医以因阴音用有又鱼羽雨语元月云再在早站找这真正知直只中竹主住桌着子字自走作坐做'

/**
 * 主题课定义：按学前优先级 pick 字，每批为一课
 * @type {Array<{ unitKey: string, unitType: string, title: string, content: string, pick: string }>}
 */
const THEMATIC_LESSONS = [
	{
		unitKey: '第一单元·我与家',
		unitType: '人与家庭',
		title: '我认识的人',
		content: '认读身边最常见的人称，指认「你、我、他」和家人。',
		pick: '人你他她儿爸妈'
	},
	{
		unitKey: '第一单元·我与家',
		unitType: '人与家庭',
		title: '温暖的家',
		content: '用这些字介绍家里人，说说「我家有谁」。',
		pick: '奶爷哥妹家好'
	},
	{
		unitKey: '第二单元·我的身体',
		unitType: '身体与动作',
		title: '我的脸',
		content: '指认五官，玩「摸摸我的小鼻子」类游戏。',
		pick: '口耳目舌脸头'
	},
	{
		unitKey: '第二单元·我的身体',
		unitType: '身体与动作',
		title: '我的身体',
		content: '认识身体名称，建立身体图式。',
		pick: '身心手毛发面'
	},
	{
		unitKey: '第二单元·我的身体',
		unitType: '身体与动作',
		title: '动起来（一）',
		content: '走、跑、跳、坐、站等动作字，配合模仿游戏。',
		pick: '走跑跳坐站起'
	},
	{
		unitKey: '第二单元·我的身体',
		unitType: '身体与动作',
		title: '动起来（二）',
		content: '听、说、看与表情，联系幼儿园一日生活。',
		pick: '看听说哭笑声'
	},
	{
		unitKey: '第三单元·数字与多少',
		unitType: '数感与比较',
		title: '数字 1—5',
		content: '数手指、数玩具，建立数与字的对应。',
		pick: '一二三四五'
	},
	{
		unitKey: '第三单元·数字与多少',
		unitType: '数感与比较',
		title: '数字 6—10',
		content: '继续数数，和同伴比一比谁多谁少。',
		pick: '六七八九十'
	},
	{
		unitKey: '第三单元·数字与多少',
		unitType: '数感与比较',
		title: '大与小、多与少',
		content: '比较大小、多少，在生活中找反义词。',
		pick: '大小多少半'
	},
	{
		unitKey: '第三单元·数字与多少',
		unitType: '数感与比较',
		title: '数一数、说一说',
		content: '认识常用数量词，能说「两个、几片」。',
		pick: '百个两几正'
	},
	{
		unitKey: '第四单元·天地自然',
		unitType: '自然观察',
		title: '日月天地',
		content: '看天空、地面，感受自然环境中常见事物。',
		pick: '日月天地土'
	},
	{
		unitKey: '第四单元·天地自然',
		unitType: '自然观察',
		title: '山水风火',
		content: '认识水、山、火、风等自然要素。',
		pick: '山水火风云'
	},
	{
		unitKey: '第四单元·天地自然',
		unitType: '自然观察',
		title: '雨雪雷电',
		content: '观察天气变化，学说简单的天气词。',
		pick: '雨雪电阴阳'
	},
	{
		unitKey: '第四单元·天地自然',
		unitType: '自然观察',
		title: '光亮与方向',
		content: '区分明暗，认识东、西等方向词。',
		pick: '光明亮东西'
	},
	{
		unitKey: '第四单元·天地自然',
		unitType: '自然观察',
		title: '四季与早晚',
		content: '感受春夏秋冬和一天中的早晚。',
		pick: '早晚春秋冬'
	},
	{
		unitKey: '第五单元·动植物',
		unitType: '动植物',
		title: '树木花草',
		content: '户外认植物，说说树干、花朵。',
		pick: '木林花草树'
	},
	{
		unitKey: '第五单元·动植物',
		unitType: '动植物',
		title: '叶竹与瓜果',
		content: '认识叶、竹、瓜、豆等植物相关字。',
		pick: '叶竹果瓜豆'
	},
	{
		unitKey: '第五单元·动植物',
		unitType: '动植物',
		title: '田园与牲畜',
		content: '联系田地、米饭与牛羊。',
		pick: '田米马牛羊'
	},
	{
		unitKey: '第五单元·动植物',
		unitType: '动植物',
		title: '飞禽与水族',
		content: '认鸟类、鱼类和常见小动物。',
		pick: '鸟鱼虫狗猫羽'
	},
	{
		unitKey: '第六单元·上学去',
		unitType: '校园生活',
		title: '去学校',
		content: '认识学校、课、师，建立入园期待。',
		pick: '学学校课师同班'
	},
	{
		unitKey: '第六单元·上学去',
		unitType: '校园生活',
		title: '书本与学习',
		content: '册、文、字、画，联系阅读与涂鸦。',
		pick: '书本册文字画'
	},
	{
		unitKey: '第六单元·上学去',
		unitType: '校园生活',
		title: '动手学本领',
		content: '尺、工、习，联系动手与练习。',
		pick: '尺工习'
	},
	{
		unitKey: '第七单元·吃穿住行',
		unitType: '日常生活',
		title: '吃饭时间',
		content: '餐桌上的字：吃、饭等。',
		pick: '吃饭'
	},
	{
		unitKey: '第七单元·吃穿住行',
		unitType: '日常生活',
		title: '穿衣',
		content: '衣、被、巾与刀、页、业等生活用品字。',
		pick: '衣被巾页业刀'
	},
	{
		unitKey: '第七单元·吃穿住行',
		unitType: '日常生活',
		title: '里与外、上与下',
		content: '空间方位游戏：里外、上下、中。',
		pick: '里外上下中'
	},
	{
		unitKey: '第七单元·吃穿住行',
		unitType: '日常生活',
		title: '前与后、来与去',
		content: '前后、来去、进出等动态方位。',
		pick: '前后来去进出'
	},
	{
		unitKey: '第七单元·吃穿住行',
		unitType: '日常生活',
		title: '出门与回家',
		content: '回、车、门、开，说说出行与回家。',
		pick: '回车门开'
	},
	{
		unitKey: '第七单元·吃穿住行',
		unitType: '日常生活',
		title: '常用句式',
		content: '会、是、要、在、也等口语句式用字。',
		pick: '是会要在也'
	},
	{
		unitKey: '第八单元·常用表达',
		unitType: '常用虚词',
		title: '也都很对',
		content: '也、都、很、对、可、还，用于简单句。',
		pick: '都很对可还'
	},
	{
		unitKey: '第八单元·常用表达',
		unitType: '常用虚词',
		title: '让比与给',
		content: '让、比、给，连接动作与对象。',
		pick: '让比给'
	},
	{
		unitKey: '第八单元·常用表达',
		unitType: '常用虚词',
		title: '把办与包裹',
		content: '把、办、包、贝等常见字。',
		pick: '把办包贝'
	},
	{
		unitKey: '第八单元·常用表达',
		unitType: '常用虚词',
		title: '边别与穿戴',
		content: '边、别、吵、穿、次等字。',
		pick: '边别吵穿次'
	},
	{
		unitKey: '第八单元·常用表达',
		unitType: '常用虚词',
		title: '从但到点',
		content: '从、但、到、的、点等字。',
		pick: '从但到的点'
	},
	{
		unitKey: '第八单元·常用表达',
		unitType: '常用虚词',
		title: '反方与放飞',
		content: '反、方、饭、飞、放、分等字。',
		pick: '反饭方放飞分'
	},
	{
		unitKey: '第九单元·社会与生活',
		unitType: '社会认知',
		title: '风与高低',
		content: '风、干、高、哥、更、公、共等字。',
		pick: '风干高哥更公共'
	},
	{
		unitKey: '第九单元·社会与生活',
		unitType: '社会认知',
		title: '公共与国土',
		content: '广、国、果、过、孩、海等字。',
		pick: '广国果过孩海'
	},
	{
		unitKey: '第九单元·社会与生活',
		unitType: '社会认知',
		title: '过河说话',
		content: '合、和、河、话、机、己等字。',
		pick: '合和河话机己'
	},
	{
		unitKey: '第九单元·社会与生活',
		unitType: '社会认知',
		title: '叫姐与快乐',
		content: '江、交、叫、姐、快、乐等字。',
		pick: '江交叫姐快乐'
	},
	{
		unitKey: '第九单元·社会与生活',
		unitType: '社会认知',
		title: '力立与没每',
		content: '力、立、了、没、每等高频字。',
		pick: '力立了没每'
	},
	{
		unitKey: '第九单元·社会与生活',
		unitType: '社会认知',
		title: '女胖与朋气',
		content: '女、胖、朋、气、千等字。',
		pick: '女胖朋气千'
	}
]

function pickChars(batch, remaining) {
	let g = ''
	for (const ch of batch) {
		if (remaining.has(ch)) {
			g += ch
			remaining.delete(ch)
		}
	}
	return g
}

function buildLessonRows() {
	const remaining = new Set([...MOE_BASIC_CHARS_SOURCE])
	/** @type {Array<{ unitKey: string, unitType: string, title: string, content: string, chars: string }>} */
	const rows = []

	for (const L of THEMATIC_LESSONS) {
		const chars = pickChars(L.pick, remaining)
		if (!chars.length) continue
		rows.push({
			unitKey: L.unitKey,
			unitType: L.unitType,
			title: L.title,
			content: L.content,
			chars
		})
	}

	const rest = [...MOE_BASIC_CHARS_SOURCE].filter((c) => remaining.has(c))
	let sweep = 0
	for (let i = 0; i < rest.length; ) {
		sweep++
		const chunk = rest.slice(i, i + 8).join('')
		rows.push({
			unitKey: '第十单元·综合巩固',
			unitType: '综合巩固',
			title: `综合巩固（${sweep}）`,
			content: '复习已学字卡，混玩认读与配对游戏。',
			chars: chunk
		})
		i += 8
	}
	return rows
}

const LESSON_ROWS = buildLessonRows()

export const PRESCHOOL_LESSON_CHAR_GROUPS = LESSON_ROWS.map((r) => r.chars)

/** @returns {UnitDef[]} */
export function buildPreschoolCurriculum() {
	/** @type {UnitDef[]} */
	const units = []
	/** @type {Map<string, UnitDef>} */
	const byKey = new Map()

	for (const row of LESSON_ROWS) {
		if (!byKey.has(row.unitKey)) {
			const u = { key: row.unitKey, type: row.unitType, lessons: [] }
			byKey.set(row.unitKey, u)
			units.push(u)
		}
		byKey.get(row.unitKey).lessons.push({
			title: row.title,
			content: `\n${row.content}\n`,
			chars: row.chars
		})
	}
	return units
}

export function getPreschoolCurriculum() {
	return buildPreschoolCurriculum()
}
