/**
 * uni-app 运行环境判断（跟读评分用）
 */

/** @returns {boolean} 5+ App（Android / iOS） */
export function isAppPlus() {
	try {
		return typeof plus !== 'undefined' && !!plus.runtime
	} catch (_) {
		return false
	}
}

/** @returns {boolean} App 且为 Android（可用 AudioRecord 帧泵） */
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

/** @returns {object|null} uni 文件系统（App 部分运行时为 undefined） */
export function getUniFileSystemManager() {
	try {
		return typeof uni !== 'undefined' && typeof uni.getFileSystemManager === 'function'
			? uni.getFileSystemManager()
			: null
	} catch (_) {
		return null
	}
}

/** App 且无 getFileSystemManager：读 _doc 录音必须走 plus.io */
export function mustUsePlusIoForLocalFiles() {
	return isAppPlus() && !getUniFileSystemManager()
}

/**
 * App 上本地文件读取策略
 * @param {string} [filePath]
 */
export function shouldPreferPlusIoForLocalAudio(filePath = '') {
	if (mustUsePlusIoForLocalFiles()) return true
	if (!isAppPlus()) return false
	const p = String(filePath || '').trim()
	if (/^_doc\//i.test(p) || /^_www\//i.test(p) || /^wxfile:/i.test(p)) return false
	if (/^file:\/\//i.test(p)) return true
	return false
}
