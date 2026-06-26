/**
 * @file vip-parent-gate.js
 * @module utils
 * @description 基础设施工具：vip-parent-gate.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 支付前家长简单验证（算术题），降低儿童误触付费概率
 */

export function confirmParentForPayment() {
	return new Promise((resolve) => {
		const a = 3 + Math.floor(Math.random() * 7)
		const b = 2 + Math.floor(Math.random() * 5)
		const sum = a + b
		uni.showModal({
			title: '家长确认',
			content: `即将由家长完成付费。请计算：${a} + ${b} = ?`,
			editable: true,
			placeholderText: '输入得数',
			confirmText: '继续支付',
			cancelText: '取消',
			success: (res) => {
				if (!res.confirm) {
					resolve(false)
					return
				}
				const raw = res.content != null ? String(res.content).trim() : ''
				const ans = Number(raw)
				if (!Number.isFinite(ans) || ans !== sum) {
					uni.showToast({ title: '验证未通过', icon: 'none' })
					resolve(false)
					return
				}
				resolve(true)
			},
			fail: () => resolve(false)
		})
	})
}
