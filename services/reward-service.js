import { getCurrentGrowthLevel, countUnlockedMedals } from '@/services/medal-service.js'
import { MEDAL_LIST } from '@/data/medals.js'
import { t } from '@/utils/i18n.js'

export function buildEncourageText({ streakDays = 0, remain = 5 } = {}) {
	const { snapshot, next } = getCurrentGrowthLevel()
	const streak = snapshot.dailyStreak || streakDays || 0
	const unlocked = countUnlockedMedals()
	const total = MEDAL_LIST.length

	if (streak >= 7) {
		return t('home.encourage.streak', { n: streak, u: unlocked, t: total })
	}
	if (next?.require?.learnedTotal != null) {
		const need = Math.max(0, next.require.learnedTotal - snapshot.learnedTotal)
		if (need > 0 && need <= 8) {
			return t('home.encourage.nextLevel', { n: need, name: next.name })
		}
	}
	if (remain > 0) {
		return t('home.encourage.remain', { n: remain, u: unlocked, t: total })
	}
	return t('home.encourage.medals', { u: unlocked, t: total })
}
