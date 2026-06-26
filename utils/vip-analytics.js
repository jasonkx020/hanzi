/**
 * @file vip-analytics.js
 * @module utils
 * @description 基础设施工具：vip-analytics.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 会员/支付埋点（可对接 uni统计 / 自建上报）
 */

export function trackVipEvent(event, payload = {}) {
	try {
		const row = {
			event: String(event || ''),
			ts: Date.now(),
			...payload
		}
		if (typeof __DEV__ !== 'undefined' && __DEV__) {
			console.log('[vip-analytics]', row)
		}
		// 预留：uni.report / 自建 POST
	} catch (_) {}
}
