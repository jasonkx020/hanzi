import { getCurrentGrowthLevel, countUnlockedMedals } from '@/services/medal-service.js'
import { MEDAL_LIST } from '@/data/medals.js'

export function buildEncourageText({ streakDays = 0, remain = 5 } = {}) {
	const { snapshot, next } = getCurrentGrowthLevel()
	const streak = snapshot.dailyStreak || streakDays || 0
	const unlocked = countUnlockedMedals()
	const total = MEDAL_LIST.length

	if (streak >= 7) {
		return `连续打卡 ${streak} 天，已点亮 ${unlocked}/${total} 枚勋章，真棒！`
	}
	if (next?.require?.learnedTotal != null) {
		const need = Math.max(0, next.require.learnedTotal - snapshot.learnedTotal)
		if (need > 0 && need <= 8) {
			return `再学 ${need} 个字，就能升到「${next.name}」啦。`
		}
	}
	if (remain > 0) {
		return `今天再学 ${remain} 个字，就能点亮新勋章（${unlocked}/${total}）。`
	}
	return `已点亮 ${unlocked}/${total} 枚勋章，继续加油！`
}
