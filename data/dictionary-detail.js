/**
 * @file dictionary-detail.js
 * @module data
 * @description 领域数据：dictionary-detail.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
export const DICTIONARY_DETAIL_MAP = {
	天: { radical: '大', structure: '上下', strokes: 4, words: ['天空', '天气', '今天'] },
	地: { radical: '土', structure: '左右', strokes: 6, words: ['大地', '地方', '地球'] },
	人: { radical: '人', structure: '独体', strokes: 2, words: ['人民', '人生', '人们'] },
	你: { radical: '亻', structure: '左右', strokes: 7, words: ['你好', '你们', '你家'] },
	我: { radical: '戈', structure: '独体', strokes: 7, words: ['我们', '我的', '自我'] },
	他: { radical: '亻', structure: '左右', strokes: 5, words: ['他们', '他人', '其他'] },
	一: { radical: '一', structure: '独体', strokes: 1, words: ['一个', '一起', '一边'] },
	二: { radical: '二', structure: '独体', strokes: 2, words: ['二月', '二胡', '二楼'] },
	三: { radical: '一', structure: '独体', strokes: 3, words: ['三天', '三人', '三角'] },
	四: { radical: '囗', structure: '全包围', strokes: 5, words: ['四季', '四方', '四个'] },
	五: { radical: '二', structure: '独体', strokes: 4, words: ['五天', '五官', '五月'] },
	上: { radical: '一', structure: '独体', strokes: 3, words: ['上学', '上课', '上面'] },
	下: { radical: '一', structure: '独体', strokes: 3, words: ['下课', '下来', '下面'] },
	口: { radical: '口', structure: '独体', strokes: 3, words: ['口头', '开口', '口水'] },
	耳: { radical: '耳', structure: '独体', strokes: 6, words: ['耳朵', '木耳', '耳机'] },
	目: { radical: '目', structure: '独体', strokes: 5, words: ['目光', '目的', '目录'] },
	手: { radical: '手', structure: '独体', strokes: 4, words: ['手心', '手机', '手工'] },
	足: { radical: '足', structure: '上下', strokes: 7, words: ['足球', '足够', '足迹'] }
	,
	站: { radical: '立', structure: '左右', strokes: 10, words: ['站立', '车站', '站好'] },
	坐: { radical: '土', structure: '上下', strokes: 7, words: ['坐下', '请坐', '坐好'] },
	日: { radical: '日', structure: '独体', strokes: 4, words: ['日出', '日子', '今日'] },
	月: { radical: '月', structure: '独体', strokes: 4, words: ['月亮', '月光', '日月'] },
	山: { radical: '山', structure: '独体', strokes: 3, words: ['高山', '山水', '上山'] },
	石: { radical: '石', structure: '半包围', strokes: 5, words: ['石头', '石子', '宝石'] },
	水: { radical: '水', structure: '独体', strokes: 4, words: ['喝水', '水平', '水果'] },
	火: { radical: '火', structure: '独体', strokes: 4, words: ['火车', '火苗', '着火'] },
	田: { radical: '田', structure: '独体', strokes: 5, words: ['田地', '田里', '田野'] },
	禾: { radical: '禾', structure: '独体', strokes: 5, words: ['禾苗', '禾田', '禾草'] },
	虫: { radical: '虫', structure: '独体', strokes: 6, words: ['虫子', '飞虫', '昆虫'] },
	云: { radical: '二', structure: '上下', strokes: 4, words: ['白云', '云朵', '云彩'] },
	雨: { radical: '雨', structure: '独体', strokes: 8, words: ['下雨', '雨天', '雨衣'] },
	风: { radical: '风', structure: '半包围', strokes: 4, words: ['大风', '风车', '春风'] },
	花: { radical: '艹', structure: '上下', strokes: 7, words: ['红花', '花朵', '开花'] },
	鸟: { radical: '鸟', structure: '独体', strokes: 5, words: ['小鸟', '飞鸟', '鸟儿'] },
	六: { radical: '八', structure: '上下', strokes: 4, words: ['六月', '六个', '六天'] },
	七: { radical: '一', structure: '独体', strokes: 2, words: ['七天', '七月', '七个'] },
	八: { radical: '八', structure: '独体', strokes: 2, words: ['八月', '八个', '八方'] },
	九: { radical: '乙', structure: '独体', strokes: 2, words: ['九月', '九个', '九天'] },
	十: { radical: '十', structure: '独体', strokes: 2, words: ['十个', '十天', '十月'] },
	萌: { radical: '艹', structure: '上下', strokes: 11, words: ['萌芽', '萌发', '卖萌'] },
	松: { radical: '木', structure: '左右', strokes: 8, words: ['松树', '放松', '轻松'] },
	清: { radical: '氵', structure: '左右', strokes: 11, words: ['清水', '清楚', '清明'] },
	吧: { radical: '口', structure: '左右', strokes: 7, words: ['好吧', '来吧', '走吧'] }
}

export const RADICAL_HINT_MAP = {
	你: '亻',
	他: '亻',
	地: '土',
	天: '大',
	我: '戈',
	口: '口',
	耳: '耳',
	目: '目',
	手: '手',
	足: '足'
	,
	站: '立',
	坐: '土',
	日: '日',
	月: '月',
	山: '山',
	石: '石',
	水: '水',
	火: '火',
	田: '田',
	禾: '禾',
	虫: '虫',
	云: '二',
	雨: '雨',
	风: '风',
	花: '艹',
	鸟: '鸟',
	六: '八',
	七: '一',
	八: '八',
	九: '乙',
	十: '十',
	萌: '艹',
	松: '木',
	清: '氵',
	吧: '口'
}

export const STRUCTURE_HINT_MAP = {
	你: '左右',
	他: '左右',
	地: '左右',
	足: '上下',
	四: '全包围',
	站: '左右',
	坐: '上下',
	云: '上下',
	花: '上下'
}

export function fallbackDictionaryDetail() {
	return {
		radical: '待补充',
		structure: '待补充',
		strokes: '待补充',
		words: ['组词待补充']
	}
}
