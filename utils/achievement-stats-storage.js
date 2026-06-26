/**
 * @file achievement-stats-storage.js
 * @module utils
 * @description 基础设施工具：achievement-stats-storage.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 成就统计（勋章 / 成长等级用），本地持久化
 */

import { getQuotaDateKey } from '@/utils/vip-quota.js'

const STORAGE_KEY = 'achievement_stats_v1'

function defaultStats() {
	return {
		pinyinFollowPass: 0,
		pinyinPractice: 0,
		pinyinAutoReadChain: 0,
		dictLookup: 0,
		gameLevelClear: 0,
		strokePractice: 0,
		dailyCompleteDates: [],
		wrongClearedOnce: false,
		_hadWrongChars: false
	}
}

export function loadAchievementStats() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (!raw || typeof raw !== 'object') return defaultStats()
		const dates = Array.isArray(raw.dailyCompleteDates) ? raw.dailyCompleteDates : []
		return {
			...defaultStats(),
			...raw,
			dailyCompleteDates: dates.filter((d) => typeof d === 'string' && d.length === 8)
		}
	} catch (_) {
		return defaultStats()
	}
}

function saveAchievementStats(stats) {
	try {
		uni.setStorageSync(STORAGE_KEY, stats)
	} catch (_) {}
}

function bump(field, amount = 1) {
	const stats = loadAchievementStats()
	const inc = Math.max(1, Math.floor(Number(amount) || 1))
	stats[field] = Math.max(0, (Number(stats[field]) || 0) + inc)
	saveAchievementStats(stats)
	return stats
}

export function recordPinyinFollowPass() {
	const stats = bump('pinyinFollowPass')
	stats.pinyinPractice = (Number(stats.pinyinPractice) || 0) + 1
	saveAchievementStats(stats)
	return stats
}

export function recordPinyinPractice() {
	return bump('pinyinPractice')
}

export function recordPinyinAutoReadChainComplete() {
	const stats = bump('pinyinAutoReadChain')
	stats.pinyinPractice = (Number(stats.pinyinPractice) || 0) + 1
	saveAchievementStats(stats)
	return stats
}

export function recordDictLookup() {
	return bump('dictLookup')
}

export function recordGameLevelClear(amount = 1) {
	return bump('gameLevelClear', amount)
}

export function recordStrokePractice(amount = 1) {
	return bump('strokePractice', amount)
}

/** 当日完成一整轮每日一练后调用 */
export function recordDailySessionComplete(date = new Date()) {
	const stats = loadAchievementStats()
	const dk = getQuotaDateKey(date)
	const set = new Set(stats.dailyCompleteDates || [])
	set.add(dk)
	stats.dailyCompleteDates = Array.from(set).sort()
	saveAchievementStats(stats)
	return stats
}

/** 更新易错字状态（在 me / wrong-often 等页 onShow 调用） */
export function syncWrongReviewState(wrongCount) {
	const stats = loadAchievementStats()
	const n = Math.max(0, Math.floor(Number(wrongCount) || 0))
	if (n > 0) {
		stats._hadWrongChars = true
	}
	if (stats._hadWrongChars && n === 0) {
		stats.wrongClearedOnce = true
	}
	saveAchievementStats(stats)
	return stats
}

export function clearAchievementStatsForDebug() {
	try {
		uni.removeStorageSync(STORAGE_KEY)
	} catch (_) {}
}
