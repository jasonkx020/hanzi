/**
 * @file progress.js
 * @module utils
 * @description 基础设施工具：progress.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { STORAGE_KEY_TONE_LAB } from './constants.js'

const DEFAULT = {
	stars: {},
	level1Done: false,
	level2Done: false,
	level3Done: false,
	level4Done: false,
	level5Done: false,
	earBest: 0,
	bodyBest: 0,
	matchBest: 0,
	markBest: 0,
	wordsBest: 0
}

export function loadToneLabProgress() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY_TONE_LAB)
		if (!raw || typeof raw !== 'object') return { ...DEFAULT }
		const merged = {
			...DEFAULT,
			...raw,
			stars: { ...(raw.stars || {}) }
		}
		// P0/P1 兼容：已过关 3/5 时补全前置关
		if (merged.level3Done && !merged.level2Done) merged.level2Done = true
		if (merged.level3Done && !merged.level1Done) merged.level1Done = true
		if (merged.level5Done && !merged.level4Done) merged.level4Done = true
		if (merged.level5Done && !merged.level3Done) merged.level3Done = true
		return merged
	} catch (_) {
		return { ...DEFAULT }
	}
}

export function saveToneLabProgress(patch) {
	const prev = loadToneLabProgress()
	const next = {
		...prev,
		...patch,
		stars: { ...prev.stars, ...(patch.stars || {}) }
	}
	try {
		uni.setStorageSync(STORAGE_KEY_TONE_LAB, next)
	} catch (e) {
		console.warn('[tone-lab] save progress', e)
	}
	return next
}

export function isLevelUnlocked(levelId, progress) {
	const p = progress || loadToneLabProgress()
	if (levelId === 1) return true
	if (levelId === 2) return !!p.level1Done
	if (levelId === 3) return !!p.level2Done
	if (levelId === 4) return !!p.level3Done
	if (levelId === 5) return !!p.level4Done
	return false
}

export function awardLevelStar(levelId, starCount = 1) {
	const p = loadToneLabProgress()
	const key = String(levelId)
	const prev = Number(p.stars[key]) || 0
	const stars = { ...p.stars, [key]: Math.max(prev, Math.min(3, starCount)) }
	const patch = { stars }
	if (levelId === 1) patch.level1Done = true
	if (levelId === 2) patch.level2Done = true
	if (levelId === 3) patch.level3Done = true
	if (levelId === 4) patch.level4Done = true
	if (levelId === 5) patch.level5Done = true
	return saveToneLabProgress(patch)
}
