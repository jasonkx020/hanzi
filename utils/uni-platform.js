/**
 * @file uni-platform.js
 * @module utils
 * @description 基础设施工具：uni-platform.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * uni-app 运行环境判断
 */

/** @returns {boolean} 5+ App（Android / iOS） */
export function isAppPlus() {
	try {
		return typeof plus !== 'undefined' && !!plus.runtime
	} catch (_) {
		return false
	}
}

/** @returns {boolean} App 且为 Android */
export function isAndroidAppPlus() {
	if (!isAppPlus()) return false
	try {
		return plus.os?.name === 'Android'
	} catch (_) {
		return false
	}
}

/** @returns {boolean} 微信小程序 */
export function isMpWeixin() {
	try {
		// #ifdef MP-WEIXIN
		return true
		// #endif
	} catch (_) {}
	try {
		const info = typeof uni !== 'undefined' && uni.getSystemInfoSync?.()
		const p = String(info?.uniPlatform || info?.platform || '')
		return p === 'mp-weixin'
	} catch (_) {
		return false
	}
}

/** @returns {object|null} */
export function getUniFileSystemManager() {
	try {
		return typeof uni !== 'undefined' && typeof uni.getFileSystemManager === 'function'
			? uni.getFileSystemManager()
			: null
	} catch (_) {
		return null
	}
}

export function mustUsePlusIoForLocalFiles() {
	return isAppPlus() && !getUniFileSystemManager()
}

export function shouldPreferPlusIoForLocalAudio(filePath = '') {
	if (mustUsePlusIoForLocalFiles()) return true
	if (!isAppPlus()) return false
	const p = String(filePath || '').trim()
	if (/^_doc\//i.test(p) || /^_www\//i.test(p) || /^wxfile:/i.test(p)) return false
	if (/^file:\/\//i.test(p)) return true
	return false
}
