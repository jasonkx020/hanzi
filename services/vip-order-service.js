/**
 * 会员订单：创建、确认、权益拉取（对接服务端或本地演示）
 */

import {
	VIP_PAY_API_BASE_URL,
	VIP_PAY_ALLOW_MOCK_FALLBACK,
	VIP_PAY_MODE,
	VIP_PAY_REQUEST_TIMEOUT_MS
} from '@/config/vip-pay-config.js'
import { findVipProduct } from '@/constants/vip-products.js'
import { getVipClientUserId } from '@/utils/vip-client-id.js'
import { getVipExpireAtMs } from '@/utils/vip.js'
import { detectPayChannel, getWxLoginCode } from '@/utils/vip-pay-platform.js'

const STORAGE_PENDING = 'vip_pending_order_v1'

function useApiMode() {
	if (VIP_PAY_MODE === 'mock') return false
	if (VIP_PAY_MODE === 'api') return Boolean(VIP_PAY_API_BASE_URL)
	if (VIP_PAY_MODE === 'auto') return Boolean(VIP_PAY_API_BASE_URL)
	return Boolean(VIP_PAY_API_BASE_URL)
}

function apiUrl(path) {
	const base = String(VIP_PAY_API_BASE_URL || '').replace(/\/$/, '')
	return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function requestJson({ url, method = 'GET', data }) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method,
			data,
			timeout: VIP_PAY_REQUEST_TIMEOUT_MS,
			header: { 'Content-Type': 'application/json' },
			success: (res) => {
				const code = res.statusCode
				if (code >= 200 && code < 300 && res.data) {
					resolve(res.data)
					return
				}
				const msg =
					(res.data && (res.data.message || res.data.msg)) ||
					`http_${code}`
				reject(new Error(String(msg)))
			},
			fail: (err) => reject(err || new Error('network_fail'))
		})
	})
}

function savePendingOrder(order) {
	try {
		uni.setStorageSync(STORAGE_PENDING, order)
	} catch (_) {}
}

export function getPendingVipOrder() {
	try {
		const o = uni.getStorageSync(STORAGE_PENDING)
		return o && o.orderId ? o : null
	} catch (_) {
		return null
	}
}

export function clearPendingVipOrder() {
	try {
		uni.removeStorageSync(STORAGE_PENDING)
	} catch (_) {}
}

function buildMockPayParams(orderId) {
	return {
		timeStamp: String(Math.floor(Date.now() / 1000)),
		nonceStr: orderId.slice(-16),
		package: `prepay_id=mock_${orderId}`,
		signType: 'RSA',
		paySign: 'mock_sign'
	}
}

function createMockOrder(planId, payChannel) {
	const plan = findVipProduct(planId)
	if (!plan) throw new Error('invalid_plan')
	const orderId = `mock_${planId}_${Date.now()}`
	const order = {
		orderId,
		planId,
		payChannel: payChannel || 'mock',
		amountFen: Math.round((plan.priceYuan || 0) * 100),
		mock: true,
		payParams: buildMockPayParams(orderId),
		createdAt: Date.now()
	}
	savePendingOrder(order)
	return order
}

/**
 * @param {string} planId
 * @param {{ payChannel?: string }} [opts]
 */
export async function createVipOrder(planId, opts = {}) {
	const clientUserId = getVipClientUserId()
	let payChannel = opts.payChannel || detectPayChannel()
	if (!useApiMode()) {
		if (!VIP_PAY_ALLOW_MOCK_FALLBACK) {
			throw new Error('pay_api_not_configured')
		}
		payChannel = 'mock'
		return createMockOrder(planId, payChannel)
	}

	const body = {
		planId,
		payChannel,
		clientUserId
	}
	if (payChannel === 'wx_mp') {
		try {
			body.wxLoginCode = await getWxLoginCode()
		} catch (e) {
			throw new Error('wx_login_required')
		}
	}

	const data = await requestJson({
		url: apiUrl('/api/vip/orders'),
		method: 'POST',
		data: body
	})
	if (!data.orderId) throw new Error('invalid_order_response')
	const order = {
		orderId: data.orderId,
		planId: data.planId || planId,
		payChannel: data.payChannel || payChannel,
		amountFen: data.amountFen,
		payParams: data.payParams,
		mock: false,
		createdAt: Date.now()
	}
	savePendingOrder(order)
	return order
}

/**
 * @param {string} orderId
 * @param {string} planId
 */
export async function confirmVipOrder(orderId, planId) {
	const clientUserId = getVipClientUserId()
	if (!useApiMode()) {
		const pending = getPendingVipOrder()
		if (!pending || pending.orderId !== orderId) {
			throw new Error('order_mismatch')
		}
		const plan = findVipProduct(planId)
		const days = plan && plan.durationDays ? plan.durationDays : 0
		const now = Date.now()
		let expireAtMs = now
		if (days > 0) {
			const base = Math.max(now, getVipExpireAtMs())
			expireAtMs = base + days * 86400000
		} else {
			expireAtMs = Math.max(now, getVipExpireAtMs()) || now
		}
		clearPendingVipOrder()
		return {
			orderId,
			status: 'paid',
			expireAtMs,
			mock: true,
			days,
			iap: plan && plan.kind !== 'subscription'
		}
	}

	const data = await requestJson({
		url: apiUrl(`/api/vip/orders/${encodeURIComponent(orderId)}/confirm`),
		method: 'POST',
		data: { planId, clientUserId }
	})
	if (!data.expireAtMs) throw new Error('confirm_no_expire')
	clearPendingVipOrder()
	return {
		orderId: data.orderId || orderId,
		status: data.status || 'paid',
		expireAtMs: data.expireAtMs,
		mock: false
	}
}

/** 从服务端拉取会员到期时间并返回 */
export async function fetchVipEntitlement() {
	if (!useApiMode()) return null
	const clientUserId = getVipClientUserId()
	const data = await requestJson({
		url: apiUrl(
			`/api/vip/entitlement?clientUserId=${encodeURIComponent(clientUserId)}`
		),
		method: 'GET'
	})
	if (!data || !data.expireAtMs) return null
	return {
		active: Boolean(data.active),
		expireAtMs: Number(data.expireAtMs)
	}
}
