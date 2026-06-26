/**
 * @file dictionary-tab-nav.js
 * @module utils
 * @description 基础设施工具：dictionary-tab-nav.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/** switchTab 进入查字页时携带的待查汉字（Tab 路由不支持 query） */
const STORAGE_KEY = 'meng_dict_pending_hanzi'

/**
 * 打开查字 Tab，并预填/自动查询一个汉字
 * @param {string} hanzi
 */
export function openDictionaryTab(hanzi) {
	const ch = String(hanzi || '').trim().charAt(0)
	try {
		if (ch) {
			uni.setStorageSync(STORAGE_KEY, ch)
		} else {
			uni.removeStorageSync(STORAGE_KEY)
		}
	} catch (_) {}
	uni.switchTab({ url: '/pages/dictionary/index' })
}

/**
 * @returns {string} 单字，无则 ''
 */
export function consumeDictionaryPendingHanzi() {
	try {
		const ch = String(uni.getStorageSync(STORAGE_KEY) || '').trim().charAt(0)
		if (ch) {
			uni.removeStorageSync(STORAGE_KEY)
			return ch
		}
	} catch (_) {}
	return ''
}
