/**
 * 成长等级 Lv0～6（与付费解耦，见 docs/会员与变现设计.md §五）
 */

export const GROWTH_LEVELS = [
	{
		level: 0,
		id: 'lv0',
		name: '萌萌芽',
		summary: '欢迎加入萌萌识字',
		cosmetic: '默认头像框'
	},
	{
		level: 1,
		id: 'lv1',
		name: '识字新星',
		summary: '累计学会 10 个字',
		cosmetic: '解锁勋章「识字新星」',
		require: { learnedTotal: 10 }
	},
	{
		level: 2,
		id: 'lv2',
		name: '拼音小侠',
		summary: '拼音练习累计 50 次',
		cosmetic: '拼音页萌萌新姿态',
		require: { pinyinPractice: 50 }
	},
	{
		level: 3,
		id: 'lv3',
		name: '课本同步星',
		summary: '完成 5 课小测通关',
		cosmetic: '绿色头像框',
		require: { lessonQuizPassed: 5 }
	},
	{
		level: 4,
		id: 'lv4',
		name: '笔顺小能手',
		summary: '描红 / 写字练习 100 次',
		cosmetic: '田字格主题',
		require: { strokePractice: 100 }
	},
	{
		level: 5,
		id: 'lv5',
		name: '坚持小达人',
		summary: '连续 7 天完成每日一练',
		cosmetic: '金色勋章框',
		require: { dailyStreak: 7 }
	},
	{
		level: 6,
		id: 'lv6',
		name: '汉字小博士',
		summary: '累计学会 300 个字',
		cosmetic: '限定勋章展示',
		require: { learnedTotal: 300 }
	}
]
