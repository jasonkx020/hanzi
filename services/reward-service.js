export function buildEncourageText({ streakDays = 0, remain = 5 } = {}) {
	if (streakDays >= 7) return '太棒啦，继续保持，勋章正在升级中。'
	return `今天再学${remain}个字，就能获得一枚新勋章。`
}
