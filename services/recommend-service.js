import { getWrongChars } from '@/repositories/learning-repository.js'

export function pickDailyChars(limit = 10) {
	const weakPool = getWrongChars().map((r) => r.hanzi).filter(Boolean)
	return weakPool.slice(0, Math.max(1, Number(limit) || 10))
}
