/**
 * @file ad-config.js
 * @module config
 * @description 配置模块：ad-config.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 广告配置（P2）
 * - 配置微信 adUnitId 后走真实 Banner / 激励视频；留空且 allowMock 时演示
 * - 会员自动不展示（见 shouldShowAds）
 */

/** 总开关（关闭后全站不展示、不弹激励） */
export const AD_ENABLED = true

/** 未配置 unitId 时是否用演示弹窗模拟激励视频 */
export const AD_MOCK_REWARDED_WHEN_NO_UNIT = true

/** 未配置 unitId 时首页是否展示占位 Banner（教育推荐样式） */
export const AD_MOCK_BANNER_WHEN_NO_UNIT = true

/**
 * 微信小程序激励视频广告位（mp-weixin）
 * 在公众平台「流量主」创建后填入
 */
export const AD_REWARDED_UNIT_ID_MP_WEIXIN = ''

/**
 * 微信小程序 Banner 广告位
 */
export const AD_BANNER_UNIT_ID_MP_WEIXIN = ''

/** 演示激励视频「播放」时长（毫秒） */
export const AD_MOCK_REWARDED_DURATION_MS = 1200
