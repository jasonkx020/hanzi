/**
 * 勋章解锁判定与成长等级计算
 */

import { MEDAL_LIST, medalImagePath } from '@/data/medals.js'
import { GROWTH_LEVELS } from '@/data/growth-levels.js'
import { loadAchievementStats } from '@/utils/achievement-stats-storage.js'
import { listLearnedChars } from '@/utils/user-progress-storage.js'
import { STORAGE_KEYS } from '@/constants/curriculum-schema.js'
import { isVipActive } from '@/utils/vip.js'
import { mengIp } from '@/utils/mengmeng-assets.js'

function countLessonQuizPassedGlobal() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEYS.USER_LESSON_PROGRESS)
		if (!raw || typeof raw !== 'object') return 0
		let n = 0
		for (const rec of Object.values(raw)) {
			if (rec && Number(rec.quiz_passed_at_ms) > 0) n++
		}
		return n
	} catch (_) {
		return 0
	}
}

function calcDailyStreak(dates) {
	const sorted = [...new Set(dates || [])].sort()
	if (!sorted.length) return 0
	const today = getTodayKey()
	let streak = 0
	let cursor = today
	const set = new Set(sorted)
	while (set.has(cursor)) {
		streak++
		cursor = prevDateKey(cursor)
	}
	return streak
}

function getTodayKey() {
	const d = new Date()
	const p = (n) => `${n}`.padStart(2, '0')
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

function prevDateKey(yyyymmdd) {
	const y = Number(yyyymmdd.slice(0, 4))
	const m = Number(yyyymmdd.slice(4, 6)) - 1
	const day = Number(yyyymmdd.slice(6, 8))
	const d = new Date(y, m, day)
	d.setDate(d.getDate() - 1)
	const p = (n) => `${n}`.padStart(2, '0')
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

/**
 * @returns {import('@/services/medal-service.js').AchievementSnapshot}
 */
export function buildAchievementSnapshot() {
	const stats = loadAchievementStats()
	const learnedTotal = listLearnedChars().length
	const lessonQuizPassed = countLessonQuizPassedGlobal()
	const dailyStreak = calcDailyStreak(stats.dailyCompleteDates)

	return {
		learnedTotal,
		lessonQuizPassed,
		dailyStreak,
		pinyinFollowPass: Number(stats.pinyinFollowPass) || 0,
		pinyinPractice: Number(stats.pinyinPractice) || 0,
		pinyinAutoReadChain: Number(stats.pinyinAutoReadChain) || 0,
		dictLookup: Number(stats.dictLookup) || 0,
		gameLevelClear: Number(stats.gameLevelClear) || 0,
		strokePractice: Number(stats.strokePractice) || 0,
		wrongClearedOnce: !!stats.wrongClearedOnce,
		vipActive: isVipActive()
	}
}

function checkMedalUnlocked(medal, snap) {
	const c = medal.check
	if (!c || !c.type) return false
	switch (c.type) {
		case 'learnedTotal':
			return snap.learnedTotal >= (c.min || 0)
		case 'pinyinFollowPass':
			return snap.pinyinFollowPass >= (c.min || 0)
		case 'pinyinAutoReadChain':
			return snap.pinyinAutoReadChain >= (c.min || 0)
		case 'lessonQuizPassed':
			return snap.lessonQuizPassed >= (c.min || 0)
		case 'strokePractice':
			return snap.strokePractice >= (c.min || 0)
		case 'dictLookup':
			return snap.dictLookup >= (c.min || 0)
		case 'gameLevelClear':
			return snap.gameLevelClear >= (c.min || 0)
		case 'dailyStreak':
			return snap.dailyStreak >= (c.min || 0)
		case 'wrongClearedOnce':
			return !!snap.wrongClearedOnce
		case 'vipActive':
			return !!snap.vipActive
		default:
			return false
	}
}

function progressForMedal(medal, snap) {
	const c = medal.check
	if (!c || !c.min) return null
	let current = 0
	switch (c.type) {
		case 'learnedTotal':
			current = snap.learnedTotal
			break
		case 'pinyinFollowPass':
			current = snap.pinyinFollowPass
			break
		case 'pinyinAutoReadChain':
			current = snap.pinyinAutoReadChain
			break
		case 'lessonQuizPassed':
			current = snap.lessonQuizPassed
			break
		case 'strokePractice':
			current = snap.strokePractice
			break
		case 'dictLookup':
			current = snap.dictLookup
			break
		case 'gameLevelClear':
			current = snap.gameLevelClear
			break
		case 'dailyStreak':
			current = snap.dailyStreak
			break
		default:
			return null
	}
	const min = c.min || 1
	return {
		current: Math.min(current, min),
		target: min,
		percent: Math.min(100, Math.round((current / min) * 100))
	}
}

export function listMedalsWithState() {
	const snap = buildAchievementSnapshot()
	return MEDAL_LIST.map((m) => {
		const unlocked = checkMedalUnlocked(m, snap)
		const progress = unlocked ? null : progressForMedal(m, snap)
		return {
			...m,
			unlocked,
			progress,
			image: medalImagePath(m.id),
			fallbackImage: mengIp(m.fallbackPose || 'happy')
		}
	})
}

export function countUnlockedMedals() {
	return listMedalsWithState().filter((m) => m.unlocked).length
}

function levelSatisfied(def, snap) {
	const r = def.require
	if (!r) return true
	if (r.learnedTotal != null && snap.learnedTotal < r.learnedTotal) return false
	if (r.pinyinPractice != null && snap.pinyinPractice < r.pinyinPractice) return false
	if (r.lessonQuizPassed != null && snap.lessonQuizPassed < r.lessonQuizPassed) return false
	if (r.strokePractice != null && snap.strokePractice < r.strokePractice) return false
	if (r.dailyStreak != null && snap.dailyStreak < r.dailyStreak) return false
	return true
}

export function getCurrentGrowthLevel() {
	const snap = buildAchievementSnapshot()
	let current = GROWTH_LEVELS[0]
	for (const def of GROWTH_LEVELS) {
		if (levelSatisfied(def, snap)) current = def
	}
	const next = GROWTH_LEVELS.find((d) => d.level === current.level + 1) || null
	return { current, next, snapshot: snap }
}

export function formatGrowthLevelLabel(levelDef) {
	if (!levelDef) return 'Lv0 萌萌芽'
	return `Lv${levelDef.level} ${levelDef.name}`
}
