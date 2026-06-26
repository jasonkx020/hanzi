/**
 * @file vip-client-id.js
 * @module utils
 * @description 基础设施工具：vip-client-id.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 客户端匿名用户 ID（用于订单与权益同步，未登录场景）
 */

const STORAGE_CLIENT_ID = 'vip_client_user_id'

function randomId() {
	const t = Date.now().toString(36)
	const r = Math.random().toString(36).slice(2, 12)
	return `meng_${t}_${r}`
}

export function getVipClientUserId() {
	try {
		let id = uni.getStorageSync(STORAGE_CLIENT_ID)
		if (id && String(id).trim()) return String(id).trim()
		id = randomId()
		uni.setStorageSync(STORAGE_CLIENT_ID, id)
		return id
	} catch (_) {
		return randomId()
	}
}
