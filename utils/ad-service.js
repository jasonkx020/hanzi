/**
 * 激励视频 / Banner 展示（P2）
 * 会员不展示；未配置广告位 ID 时可走演示模式。
 */

import {
	AD_ENABLED,
	AD_MOCK_REWARDED_WHEN_NO_UNIT,
	AD_MOCK_BANNER_WHEN_NO_UNIT,
	AD_REWARDED_UNIT_ID_MP_WEIXIN,
	AD_BANNER_UNIT_ID_MP_WEIXIN,
	AD_MOCK_REWARDED_DURATION_MS
} from '@/config/ad-config.js'
import { AD_REWARD_BY_PLACEMENT } from '@/constants/ad-placements.js'
import { isVipActive } from '@/utils/vip.js'
import { trackVipEvent } from '@/utils/vip-analytics.js'

const _rewardedCache = new Map()

export function shouldShowAds() {
	if (!AD_ENABLED) return false
	return !isVipActive()
}

export function getRewardedAdUnitId() {
	// #ifdef MP-WEIXIN
	const id = String(AD_REWARDED_UNIT_ID_MP_WEIXIN || '').trim()
	if (id) return id
	// #endif
	return ''
}

export function getBannerAdUnitId() {
	// #ifdef MP-WEIXIN
	const id = String(AD_BANNER_UNIT_ID_MP_WEIXIN || '').trim()
	if (id) return id
	// #endif
	return ''
}

export function canUseMockRewardedAd() {
	return AD_MOCK_REWARDED_WHEN_NO_UNIT && !getRewardedAdUnitId()
}

export function canUseMockBanner() {
	return AD_MOCK_BANNER_WHEN_NO_UNIT && !getBannerAdUnitId()
}

export function getAdRewardConfig(placement) {
	return AD_REWARD_BY_PLACEMENT[placement] || null
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
}

function getWxRewardedVideoAd(unitId) {
	if (!unitId) return null
	if (_rewardedCache.has(unitId)) return _rewardedCache.get(unitId)
	let ad = null
	// #ifdef MP-WEIXIN
	try {
		if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) {
			ad = wx.createRewardedVideoAd({ adUnitId: unitId })
			_rewardedCache.set(unitId, ad)
		}
	} catch (e) {
		console.warn('[ad] createRewardedVideoAd', e)
	}
	// #endif
	return ad
}

function showWxRewardedVideoAd(ad) {
	return new Promise((resolve, reject) => {
		if (!ad) {
			reject(new Error('no_ad_instance'))
			return
		}
		const onClose = (res) => {
			ad.offClose(onClose)
			if (res && res.isEnded) resolve({ ok: true })
			else reject(new Error('cancel'))
		}
		ad.onClose(onClose)
		const onError = (err) => {
			ad.offError(onError)
			reject(err || new Error('ad_error'))
		}
		ad.onError(onError)
		ad.show().catch(() => {
			ad.load()
				.then(() => ad.show())
				.catch((e) => {
					ad.offClose(onClose)
					ad.offError(onError)
					reject(e || new Error('ad_show_fail'))
				})
		})
	})
}

function showMockRewardedAd(placement) {
	const reward = getAdRewardConfig(placement)
	const label = reward ? reward.shortLabel : '额外次数'
	return new Promise((resolve, reject) => {
		uni.showModal({
			title: '激励视频（演示）',
			content: `由家长观看完整短视频后，孩子可获得今日${label}。正式上线将接入微信流量主广告。`,
			confirmText: '模拟看完',
			cancelText: '取消',
			success: async (res) => {
				if (!res.confirm) {
					reject(new Error('cancel'))
					return
				}
				uni.showLoading({ title: '播放中…', mask: true })
				await sleep(AD_MOCK_REWARDED_DURATION_MS)
				uni.hideLoading()
				resolve({ ok: true, mock: true })
			},
			fail: () => reject(new Error('cancel'))
		})
	})
}

/**
 * 播放激励视频
 * @param {string} placement AD_PLACEMENTS.*
 * @returns {Promise<{ ok: boolean, mock?: boolean }>}
 */
export async function showRewardedAd(placement) {
	if (!shouldShowAds()) {
		throw new Error('vip_no_ads')
	}
	if (!getAdRewardConfig(placement)) {
		throw new Error('invalid_placement')
	}

	trackVipEvent('ad_reward_start', { placement })

	const unitId = getRewardedAdUnitId()
	if (!unitId) {
		if (!canUseMockRewardedAd()) throw new Error('ad_not_configured')
		const r = await showMockRewardedAd(placement)
		trackVipEvent('ad_reward_complete', { placement, mock: true })
		return r
	}

	try {
		const ad = getWxRewardedVideoAd(unitId)
		await showWxRewardedVideoAd(ad)
		trackVipEvent('ad_reward_complete', { placement, mock: false })
		return { ok: true, mock: false }
	} catch (e) {
		const msg = e && e.message ? String(e.message) : ''
		if (msg === 'cancel') throw e
		if (canUseMockRewardedAd()) {
			const r = await showMockRewardedAd(placement)
			trackVipEvent('ad_reward_complete', { placement, mock: true, fallback: true })
			return r
		}
		throw e
	}
}
