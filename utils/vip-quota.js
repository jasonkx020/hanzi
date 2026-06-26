/**
 * @file vip-quota.js
 * @module utils
 * @description 基础设施工具：vip-quota.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 免费版每日配额（本地按自然日计数；会员不扣减）
 * 小程序 / App 均使用 uni.storage，键名带日期后缀。
 */

export const QUOTA_KEYS = {
	DICT_LOOKUP: 'dict_lookup',
	WRITE_CHARS: 'write_chars',
	PINYIN_FOLLOW: 'pinyin_follow',
	DRILL_SHUFFLE: 'drill_shuffle',
	DAILY_SESSION: 'daily_session',
	GAME_SESSION: 'game_session',
	STROKE_REPLAY: 'stroke_replay'
}

const STORAGE_PREFIX = 'vip_quota_'
const STORAGE_BONUS_PREFIX = 'vip_quota_bonus_'

function pad2(n) {
	return `${n}`.padStart(2, '0')
}

/** @returns {string} YYYYMMDD */
export function getQuotaDateKey(date = new Date()) {
	const d = date instanceof Date ? date : new Date()
	return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
}

function storageKey(quotaKey, dateKey = getQuotaDateKey()) {
	return `${STORAGE_PREFIX}${quotaKey}_${dateKey}`
}

function bonusStorageKey(quotaKey, dateKey = getQuotaDateKey()) {
	return `${STORAGE_BONUS_PREFIX}${quotaKey}_${dateKey}`
}

export function getQuotaBonus(quotaKey, dateKey = getQuotaDateKey()) {
	try {
		const v = uni.getStorageSync(bonusStorageKey(quotaKey, dateKey))
		const n = Number(v)
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
	} catch (_) {
		return 0
	}
}

/** 激励视频等奖励：增加当日可用次数（会员无需发放） */
export function grantQuotaBonus(quotaKey, amount = 1) {
	const inc = Math.max(1, Math.floor(Number(amount) || 1))
	const dk = getQuotaDateKey()
	const cur = getQuotaBonus(quotaKey, dk)
	try {
		uni.setStorageSync(bonusStorageKey(quotaKey, dk), cur + inc)
		return cur + inc
	} catch (_) {
		return cur
	}
}

export function getQuotaUsed(quotaKey, dateKey) {
	try {
		const v = uni.getStorageSync(storageKey(quotaKey, dateKey))
		const n = Number(v)
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
	} catch (_) {
		return 0
	}
}

/**
 * @param {string} quotaKey
 * @param {number} limit
 * @returns {{ used: number, limit: number, ok: boolean, remaining: number }}
 */
export function getQuotaState(quotaKey, limit) {
	const lim = Math.max(0, Math.floor(Number(limit) || 0))
	const bonus = getQuotaBonus(quotaKey)
	const effectiveLimit = lim + bonus
	const used = getQuotaUsed(quotaKey)
	const remaining = Math.max(0, effectiveLimit - used)
	return {
		used,
		limit: lim,
		bonus,
		effectiveLimit,
		ok: effectiveLimit > 0 ? used < effectiveLimit : true,
		remaining
	}
}

/**
 * @returns {boolean} 是否成功扣减
 */
export function consumeQuota(quotaKey, amount = 1, limit) {
	const inc = Math.max(1, Math.floor(Number(amount) || 1))
	const state = getQuotaState(quotaKey, limit)
	if (!state.ok) return false
	try {
		uni.setStorageSync(storageKey(quotaKey), state.used + inc)
	} catch (_) {
		return false
	}
	return true
}

export function canUseQuota(quotaKey, limit) {
	return getQuotaState(quotaKey, limit).ok
}

/** 调试：清除当日全部配额计数 */
export function clearTodayQuotasForDebug() {
	const dk = getQuotaDateKey()
	for (const k of Object.values(QUOTA_KEYS)) {
		try {
			uni.removeStorageSync(storageKey(k, dk))
			uni.removeStorageSync(bonusStorageKey(k, dk))
		} catch (_) {}
	}
}
