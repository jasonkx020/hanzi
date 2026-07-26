/**
 * 勋章定义（12 枚）· 解锁条件由 services/medal-service.js 根据快照判定
 * 图片：static/mengmeng/medals/{id}.png（可后续替换 AI 生成资源）
 */

export const MEDAL_LIST = [
	{
		id: 'm01',
		name: '识字新星',
		rule: '累计学会 10 个字',
		theme: '星星与「十」',
		iconEmoji: '⭐',
		fallbackPose: 'happy',
		check: { type: 'learnedTotal', min: 10 }
	},
	{
		id: 'm02',
		name: '百字小将',
		rule: '累计学会 100 个字',
		theme: '书本与萌萌',
		iconEmoji: '📚',
		fallbackPose: 'book',
		check: { type: 'learnedTotal', min: 100 }
	},
	{
		id: 'm03',
		name: '每日坚持',
		rule: '连续 5 天完成每日一练',
		theme: '日历与星星',
		iconEmoji: '📅',
		fallbackPose: 'wave',
		check: { type: 'dailyStreak', min: 5 }
	},
	{
		id: 'm04',
		name: '听读小达人',
		rule: '气球营听音通关 1 次',
		theme: '音符',
		iconEmoji: '🎵',
		fallbackPose: 'happy',
		check: { type: 'gameLevelClear', min: 1 }
	},
	{
		id: 'm05',
		name: '字卡小将',
		rule: '完成 1 站小测验通关',
		theme: '字卡与勾',
		iconEmoji: '✅',
		fallbackPose: 'book',
		check: { type: 'lessonQuizPassed', min: 1 }
	},
	{
		id: 'm06',
		name: '笔顺小画家',
		rule: '描红 / 写字练习 50 次',
		theme: '毛笔与田字格',
		iconEmoji: '✏️',
		fallbackPose: 'trying',
		check: { type: 'strokePractice', min: 50 }
	},
	{
		id: 'm07',
		name: '查字小侦探',
		rule: '查字累计 30 次',
		theme: '放大镜',
		iconEmoji: '🔍',
		fallbackPose: 'curious',
		check: { type: 'dictLookup', min: 30 }
	},
	{
		id: 'm08',
		name: '气球营勇士',
		rule: '气球营通关 10 关',
		theme: '气球',
		iconEmoji: '🎈',
		fallbackPose: 'balloon',
		check: { type: 'gameLevelClear', min: 10 }
	},
	{
		id: 'm09',
		name: '每日坚持 3 天',
		rule: '连续 3 天完成每日一练',
		theme: '日历火焰',
		iconEmoji: '🔥',
		fallbackPose: 'happy',
		check: { type: 'dailyStreak', min: 3 }
	},
	{
		id: 'm10',
		name: '每日坚持 7 天',
		rule: '连续 7 天完成每日一练',
		theme: '金色日历',
		iconEmoji: '📅',
		fallbackPose: 'wave',
		check: { type: 'dailyStreak', min: 7 }
	},
	{
		id: 'm11',
		name: '易错克星',
		rule: '易错字夹全部复习清零 1 次',
		theme: '盾牌',
		iconEmoji: '🛡️',
		fallbackPose: 'trying',
		check: { type: 'wrongClearedOnce' }
	},
	{
		id: 'm12',
		name: '萌萌合伙人',
		rule: '由家长开通会员',
		theme: 'VIP 丝带',
		iconEmoji: '👑',
		fallbackPose: 'happy',
		check: { type: 'vipActive' }
	}
]

/** @param {string} medalId */
export function medalImagePath(medalId) {
	return `/static/mengmeng/medals/${medalId}.png`
}
