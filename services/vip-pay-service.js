/**
 * @file vip-pay-service.js
 * @module services
 * @description 领域服务源文件：vip-pay-service.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 会员购买流程编排：家长验证 → 下单 → 调起支付 → 查单 → 写入权益
 */

import { VIP_PAY_REQUIRE_PARENT_GATE } from '@/config/vip-pay-config.js'
import { findVipProduct } from '@/constants/vip-products.js'
import { applyProductEntitlement } from '@/services/vip-entitlement-applier.js'
import {
	createVipOrder,
	confirmVipOrder,
	fetchVipEntitlement,
	getPendingVipOrder
} from '@/services/vip-order-service.js'
import { trackVipEvent } from '@/utils/vip-analytics.js'
import { confirmParentForPayment } from '@/utils/vip-parent-gate.js'
import {
	detectPayChannel,
	invokePlatformPayment,
	payChannelLabel
} from '@/utils/vip-pay-platform.js'
import {
	setVipExpireAtMs,
	rememberOrderRef,
	getVipExpireAtMs,
	isVipActive
} from '@/utils/vip.js'

function planById(planId) {
	return findVipProduct(planId)
}

function applyExpireAtMs(expireAtMs) {
	const t = Number(expireAtMs)
	if (!Number.isFinite(t) || t <= 0) return
	const local = getVipExpireAtMs()
	if (t > local) setVipExpireAtMs(t)
	else setVipExpireAtMs(Math.max(t, local))
}

/**
 * 完整购买流程
 * @param {string} planId
 * @returns {Promise<{ ok: boolean, planId: string, expireAtMs?: number, orderId?: string }>}
 */
/** 购买任意商品（订阅 / 年级 IAP / 复习包） */
export async function purchaseProduct(planId) {
	return purchaseVipPlan(planId)
}

export async function purchaseVipPlan(planId) {
	const plan = planById(planId)
	if (!plan) throw new Error('invalid_plan')

	if (VIP_PAY_REQUIRE_PARENT_GATE) {
		const ok = await confirmParentForPayment()
		if (!ok) throw new Error('cancel')
	}

	const payChannel = detectPayChannel()
	trackVipEvent('vip_pay_start', { plan_id: planId, pay_channel: payChannel })

	let order
	try {
		order = await createVipOrder(planId, { payChannel })
	} catch (e) {
		trackVipEvent('vip_pay_fail', { plan_id: planId, stage: 'create_order' })
		throw e
	}

	const channel = order.payChannel || payChannel
	const label = payChannelLabel(channel)

	if (order.mock) {
		const iapHint =
			plan.kind === 'grade_pack'
				? `永久解锁 ${plan.grade} 年级字库`
				: plan.kind === 'review_pack'
					? '解锁期末复习字包'
					: `约 ${plan.durationDays} 天会员权益`
		const confirmed = await new Promise((resolve, reject) => {
			uni.showModal({
				title: '演示支付',
				content: `将模拟购买「${plan.name}」（¥${plan.priceYuan}，${iapHint}）。配置 apiBaseUrl 后可走真实${label}。`,
				confirmText: '模拟支付成功',
				cancelText: '取消',
				success: (res) => {
					if (res.confirm) resolve(true)
					else reject(new Error('cancel'))
				},
				fail: () => reject(new Error('cancel'))
			})
		})
		if (!confirmed) throw new Error('cancel')
	} else {
		try {
			await invokePlatformPayment(order.payParams, channel)
		} catch (e) {
			if (String(e && e.message) === 'cancel') throw e
			trackVipEvent('vip_pay_fail', { plan_id: planId, stage: 'platform_pay' })
			throw e
		}
	}

	uni.showLoading({ title: '确认订单…', mask: true })
	let result
	try {
		result = await confirmVipOrder(order.orderId, planId)
	} finally {
		uni.hideLoading()
	}

	if (plan.durationDays > 0) {
		applyExpireAtMs(result.expireAtMs)
	}
	applyProductEntitlement(planId, result)
	rememberOrderRef(result.orderId)

	trackVipEvent('vip_pay_success', {
		plan_id: planId,
		order_id: result.orderId,
		mock: Boolean(result.mock)
	})

	return {
		ok: true,
		planId,
		orderId: result.orderId,
		expireAtMs: result.expireAtMs
	}
}

/** App 启动 / 会员页展示时同步云端权益 */
export async function syncVipEntitlementFromServer() {
	try {
		const ent = await fetchVipEntitlement()
		if (!ent || !ent.expireAtMs) return { synced: false }
		applyExpireAtMs(ent.expireAtMs)
		return { synced: true, active: isVipActive(), expireAtMs: ent.expireAtMs }
	} catch (e) {
		if (typeof __DEV__ !== 'undefined' && __DEV__) {
			console.warn('[vip] sync entitlement', e)
		}
		return { synced: false, error: e }
	}
}

/**
 * 恢复未完成订单（支付成功但 confirm 失败时重试）
 */
export async function resumePendingVipPurchaseIfAny() {
	const pending = getPendingVipOrder()
	if (!pending || !pending.orderId || !pending.planId) return null
	try {
		const result = await confirmVipOrder(pending.orderId, pending.planId)
		const plan = planById(pending.planId)
		if (plan && plan.durationDays > 0) {
			applyExpireAtMs(result.expireAtMs)
		}
		applyProductEntitlement(pending.planId, result)
		rememberOrderRef(result.orderId)
		trackVipEvent('vip_pay_success', {
			plan_id: pending.planId,
			order_id: result.orderId,
			resume: true
		})
		return result
	} catch (_) {
		return null
	}
}

/** iOS 恢复购买占位（需接 StoreKit + 服务端 receipt） */
export function restoreVipPurchases() {
	return new Promise((resolve, reject) => {
		uni.showModal({
			title: '恢复购买',
			content:
				'正式上线请在 App Store 配置内购商品，并由服务端校验 receipt 后同步会员。当前版本请使用购买时的同一账号联系客服或重新开通。',
			showCancel: false,
			success: () => resolve({ ok: false, reason: 'not_implemented' }),
			fail: () => reject(new Error('cancel'))
		})
	})
}
