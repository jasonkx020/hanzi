/**
 * @file vip-pay-config.js
 * @module config
 * @description 配置模块：vip-pay-config.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 会员支付配置（P1）
 * - 配置 apiBaseUrl 后走服务端下单/查单；留空则使用本地演示支付（开发与小程未配商户时）
 * - 小程序：createOrder 可传 wxLoginCode，由服务端换 openId 后调微信统一下单
 * - App：payChannel 为 wx_app / alipay_app，payParams 由服务端返回
 */

/** @type {'auto' | 'mock' | 'api'} */
export const VIP_PAY_MODE = 'auto'

/**
 * 服务端根地址，勿以 / 结尾。示例：https://api.example.com
 * 对接接口见 docs/vip-pay-api.md
 */
export const VIP_PAY_API_BASE_URL = ''

export const VIP_PAY_REQUEST_TIMEOUT_MS = 20000

/** 未配置 apiBaseUrl 时是否允许演示支付（上线请设为 false） */
export const VIP_PAY_ALLOW_MOCK_FALLBACK = true

/** App 启动时是否拉取服务端会员到期时间 */
export const VIP_PAY_SYNC_ON_LAUNCH = true

/** 发起支付前是否弹出家长算术验证 */
export const VIP_PAY_REQUIRE_PARENT_GATE = true

/** 微信商户小程序 planId 与后端商品 ID 映射（可与 VIP_PLANS.id 相同） */
export const VIP_PLAN_PRODUCT_IDS = {
	vip_month: 'vip_month',
	vip_quarter: 'vip_quarter',
	vip_year: 'vip_year'
}
