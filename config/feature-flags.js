/**
 * @file feature-flags.js
 * @module config
 * @description 配置模块：feature-flags.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 功能开关：代码保留，仅控制是否对用户开放。
 * 恢复拼读训练时改为 true 即可。
 */
export const PINYIN_BLEND_TRAINING_ENABLED = false

/** @returns {boolean} */
export function isPinyinBlendTrainingEnabled() {
	return PINYIN_BLEND_TRAINING_ENABLED === true
}
