/**
 * @file vip.js
 * @module utils
 * @description 基础设施工具：vip.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 会员状态（本地持久化）。正式上线请与服务端订单结果同步写入 expireAt。
 * 付费入口须面向家长，避免对儿童施加心理压力。
 */

import { clearTodayQuotasForDebug } from '@/utils/vip-quota.js'
import { clearVipEntitlementsForDebug } from '@/utils/vip-entitlements.js'
import { clearLearningProfilesForDebug } from '@/utils/learning-profile-storage.js'
import { purchaseProduct } from '@/services/vip-pay-service.js'

const STORAGE_EXPIRE_MS = 'vip_expire_at_ms'
const STORAGE_ORDER_HINT = 'vip_last_order_id'
const STORAGE_TRIAL_USED = 'vip_trial_once_used'

/** 功能点编码：业务页用 gateVipFeature / assertVipFeature 统一拦截 */
export const VIP_FEATURE = {
	FULL_GRADES: 'full_grades',
	STROKE_UNLIMITED: 'stroke_unlimited',
	DAILY_CHARS_SOFT_CAP: 'daily_chars_soft_cap',
	EXPORT_LIST: 'export_list',
	ADVANCED_REVIEW: 'advanced_review',
	PINYIN_FOLLOW_SCORE: 'pinyin_follow_score',
	PINYIN_AUTO_READ: 'pinyin_auto_read',
	DAILY_UNLIMITED: 'daily_unlimited',
	DRILL_UNLIMITED: 'drill_unlimited',
	GAME_UNLIMITED: 'game_unlimited',
	NO_ADS: 'no_ads',
	FAMILY_REPORT: 'family_report'
}

/** 非会员时受限的功能（其余默认可用或由配额控制） */
const VIP_ONLY_FEATURES = new Set([
	VIP_FEATURE.FULL_GRADES,
	VIP_FEATURE.STROKE_UNLIMITED,
	VIP_FEATURE.EXPORT_LIST,
	VIP_FEATURE.ADVANCED_REVIEW,
	VIP_FEATURE.PINYIN_FOLLOW_SCORE,
	VIP_FEATURE.PINYIN_AUTO_READ,
	VIP_FEATURE.DAILY_UNLIMITED,
	VIP_FEATURE.DRILL_UNLIMITED,
	VIP_FEATURE.GAME_UNLIMITED,
	VIP_FEATURE.FAMILY_REPORT
])

const FREE_DAILY_CHAR_SOFT_LIMIT = 30

export function getVipExpireAtMs() {
	const v = uni.getStorageSync(STORAGE_EXPIRE_MS)
	return typeof v === 'number' ? v : 0
}

export function isVipActive() {
	return getVipExpireAtMs() > Date.now()
}

export function getVipExpireDateText() {
	const t = getVipExpireAtMs()
	if (!t) return ''
	const d = new Date(t)
	const y = d.getFullYear()
	const m = `${d.getMonth() + 1}`.padStart(2, '0')
	const day = `${d.getDate()}`.padStart(2, '0')
	return `${y}-${m}-${day}`
}

/**
 * 激活会员截止时间戳（毫秒）。服务端支付成功后应传入服务端确认的过期时间。
 */
export function setVipExpireAtMs(expireAtMs) {
	uni.setStorageSync(STORAGE_EXPIRE_MS, expireAtMs)
}

/**
 * 从当前权益终点顺延天数（用于调试或优惠券）。
 */
export function extendVipByDays(days) {
	const add = Math.max(0, Number(days) || 0) * 86400000
	const now = Date.now()
	const base = Math.max(now, getVipExpireAtMs())
	setVipExpireAtMs(base + add)
}

export function clearVipForDebug() {
	uni.removeStorageSync(STORAGE_EXPIRE_MS)
	uni.removeStorageSync(STORAGE_ORDER_HINT)
	uni.removeStorageSync(STORAGE_TRIAL_USED)
	clearTodayQuotasForDebug()
	clearVipEntitlementsForDebug()
	clearLearningProfilesForDebug()
}

export function rememberOrderRef(orderId) {
	if (orderId) uni.setStorageSync(STORAGE_ORDER_HINT, String(orderId))
}

/** 非会员是否超出每日 soft 限额（用于字卡练习计数等） */
export function getFreeDailyCharLimit() {
	return FREE_DAILY_CHAR_SOFT_LIMIT
}

export function assertVipFeature(feature) {
	if (!VIP_ONLY_FEATURES.has(feature)) return { ok: true }
	if (isVipActive()) return { ok: true }
	return {
		ok: false,
		title: '家长专享功能',
		message: '该能力面向会员家庭开放，可先开通试用或由家长在设置中查看说明。',
		feature
	}
}

/** 每个设备安装后可领取一次短期体验（演示转化漏斗，上线可按运营策略关闭） */
export function tryClaimInstallTrialIfEligible(days = 7) {
	const used = uni.getStorageSync(STORAGE_TRIAL_USED)
	if (used) return { ok: false, reason: 'used' }
	if (isVipActive()) return { ok: false, reason: 'already_vip' }
	uni.setStorageSync(STORAGE_TRIAL_USED, '1')
	extendVipByDays(days)
	return { ok: true, days }
}

/**
 * 发起会员购买（P1：家长验证 → 下单 → 平台支付 → 服务端/本地确认写 expireAt）
 */
export function requestPurchase(productId) {
	return purchaseProduct(productId)
}
