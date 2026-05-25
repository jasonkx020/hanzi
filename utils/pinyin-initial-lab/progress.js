import { STORAGE_KEY_INITIAL_LAB } from './constants.js'

const DEFAULT = {
	stars: {},
	level1Done: false,
	level2Done: false,
	level3Done: false,
	earBest: 0,
	mouthBest: 0,
	groupBest: 0
}

export function loadInitialLabProgress() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY_INITIAL_LAB)
		if (!raw || typeof raw !== 'object') return { ...DEFAULT }
		return {
			...DEFAULT,
			...raw,
			stars: { ...(raw.stars || {}) }
		}
	} catch (_) {
		return { ...DEFAULT }
	}
}

export function saveInitialLabProgress(patch) {
	const prev = loadInitialLabProgress()
	const next = {
		...prev,
		...patch,
		stars: { ...prev.stars, ...(patch.stars || {}) }
	}
	try {
		uni.setStorageSync(STORAGE_KEY_INITIAL_LAB, next)
	} catch (e) {
		console.warn('[initial-lab] save progress', e)
	}
	return next
}

export function isInitialLevelUnlocked(levelId, progress) {
	const p = progress || loadInitialLabProgress()
	if (levelId === 1) return true
	if (levelId === 2) return !!p.level1Done
	if (levelId === 3) return !!p.level2Done
	if (levelId === 4) return !!p.level3Done
	return false
}

export function awardInitialLevelStar(levelId, starCount = 1) {
	const p = loadInitialLabProgress()
	const key = String(levelId)
	const prev = Number(p.stars[key]) || 0
	const stars = { ...p.stars, [key]: Math.max(prev, Math.min(3, starCount)) }
	const patch = { stars }
	if (levelId === 1) patch.level1Done = true
	if (levelId === 2) patch.level2Done = true
	if (levelId === 3) patch.level3Done = true
	return saveInitialLabProgress(patch)
}
