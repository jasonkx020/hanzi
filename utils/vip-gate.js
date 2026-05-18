/**
 * 会员 / 配额统一门禁（小程序 + App 共用 uni API）
 */

import { VIP_QUOTA_LIMITS } from '@/constants/vip-quota-limits.js'
import { isVipActive, assertVipFeature, VIP_FEATURE } from '@/utils/vip.js'
import { consumeQuota, getQuotaState, grantQuotaBonus, QUOTA_KEYS } from '@/utils/vip-quota.js'
import { getAdRewardConfig, showRewardedAd, shouldShowAds } from '@/utils/ad-service.js'
import { trackVipEvent } from '@/utils/vip-analytics.js'

export { VIP_FEATURE, QUOTA_KEYS }

export function openVipCenter() {
	uni.navigateTo({ url: '/pages/vip/vip' })
}

/**
 * @param {{ ok?: boolean, title?: string, message?: string, reason?: string }} result
 * @returns {Promise<boolean>} 是否点了「家长开通」
 */
export function showVipBlockedSheet(result = {}) {
	return new Promise((resolve) => {
		uni.showModal({
			title: result.title || '家长专享功能',
			content: result.message || '该能力面向会员家庭开放，请由家长开通后使用。',
			confirmText: '家长开通',
			cancelText: '知道了',
			success: (res) => {
				if (res.confirm) openVipCenter()
				resolve(!!res.confirm)
			},
			fail: () => resolve(false)
		})
	})
}

/**
 * @param {string} feature VIP_FEATURE.*
 * @param {{
 *   quotaKey?: string,
 *   quotaLimit?: number,
 *   consume?: boolean,
 *   consumeAmount?: number,
 *   quotaTitle?: string,
 *   quotaMessage?: string
 * }} [options]
 */
export function gateVipFeature(feature, options = {}) {
	if (isVipActive()) {
		return { ok: true, vip: true, feature }
	}

	const vipOnly = assertVipFeature(feature)
	if (!vipOnly.ok) {
		return {
			...vipOnly,
			reason: 'vip_only',
			vip: false
		}
	}

	const quotaKey = options.quotaKey
	if (quotaKey) {
		const limit =
			Number(options.quotaLimit) > 0
				? Number(options.quotaLimit)
				: Number(VIP_QUOTA_LIMITS[quotaKey]) || 0
		const state = getQuotaState(quotaKey, limit)
		if (!state.ok) {
			return {
				ok: false,
				reason: 'quota',
				feature,
				quotaKey,
				used: state.used,
				limit: state.limit,
				vip: false,
				title: options.quotaTitle || '今日次数已用完',
				message:
					options.quotaMessage ||
					`免费版今日该功能已用完（${state.limit} 次）。开通会员可不限次使用，请家长前往会员中心查看。`
			}
		}
		if (options.consume !== false) {
			consumeQuota(quotaKey, options.consumeAmount || 1, limit)
		}
		return { ok: true, vip: false, feature, quotaKey, quota: true }
	}

	return { ok: true, vip: false, feature }
}

/**
 * 未通过时弹窗引导开通
 * @returns {Promise<{ ok: boolean }>}
 */
export async function gateAndPrompt(feature, options = {}) {
	const g = gateVipFeature(feature, options)
	if (g.ok) return g
	await showVipBlockedSheet(g)
	return g
}

/**
 * 配额用尽时提供「看短视频解锁」；会员专享功能仍仅引导开通
 * @param {string} feature
 * @param {string} [options.adPlacement] AD_PLACEMENTS.*
 */
export async function gateAndPromptWithAd(feature, options = {}) {
	const g = gateVipFeature(feature, options)
	if (g.ok) return g

	if (g.reason === 'vip_only') {
		trackVipEvent('feature_blocked', { feature, reason: 'vip_only' })
		await showVipBlockedSheet(g)
		return g
	}

	if (g.reason === 'quota' && options.adPlacement && shouldShowAds()) {
		const reward = getAdRewardConfig(options.adPlacement)
		if (reward) {
			const unlocked = await offerAdUnlockSheet(g, options.adPlacement, reward)
			if (unlocked) {
				return gateVipFeature(feature, options)
			}
			return g
		}
	}

	trackVipEvent('feature_blocked', { feature, reason: g.reason || 'blocked' })
	await showVipBlockedSheet(g)
	return g
}

/**
 * 仅发放激励奖励（如每日一练页「再练一轮」）
 * @returns {Promise<boolean>}
 */
export async function grantAdQuotaReward(placement) {
	const reward = getAdRewardConfig(placement)
	if (!reward || !shouldShowAds()) return false
	try {
		const r = await showRewardedAd(placement)
		if (r && r.ok) {
			grantQuotaBonus(reward.quotaKey, reward.amount)
			uni.showToast({ title: `已获得${reward.shortLabel}`, icon: 'success' })
			return true
		}
	} catch (e) {
		if (String(e && e.message) !== 'cancel') {
			uni.showToast({ title: '视频未完成', icon: 'none' })
		}
	}
	return false
}

function offerAdUnlockSheet(blockResult, placement, reward) {
	return new Promise((resolve) => {
		uni.showActionSheet({
			itemList: [`看短视频（+${reward.shortLabel}）`, '家长开通会员'],
			success: async (res) => {
				if (res.tapIndex === 0) {
					try {
						const ad = await showRewardedAd(placement)
						if (ad && ad.ok) {
							grantQuotaBonus(reward.quotaKey, reward.amount)
							uni.showToast({ title: '已解锁', icon: 'success' })
							resolve(true)
							return
						}
					} catch (e) {
						if (String(e && e.message) !== 'cancel') {
							uni.showToast({ title: '请稍后再试', icon: 'none' })
						}
					}
					resolve(false)
					return
				}
				if (res.tapIndex === 1) {
					openVipCenter()
				}
				resolve(false)
			},
			fail: () => resolve(false)
		})
	})
}

/**
 * 仅检查配额，不消耗
 */
export function peekQuota(quotaKey, quotaLimit) {
	if (isVipActive()) return { ok: true, vip: true }
	const limit =
		Number(quotaLimit) > 0 ? Number(quotaLimit) : Number(VIP_QUOTA_LIMITS[quotaKey]) || 0
	const state = getQuotaState(quotaKey, limit)
	if (state.ok) return { ok: true, vip: false, ...state }
	return {
		ok: false,
		vip: false,
		reason: 'quota',
		quotaKey,
		...state,
		title: '今日次数已用完',
		message: `免费版今日该功能已用完（${state.limit} 次），请家长开通会员或明日再试。`
	}
}
