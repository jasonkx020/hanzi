/** navigateTo 进入查字页时携带的待查汉字（用 storage 传参） */
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
	uni.navigateTo({ url: '/pages/dictionary/index' })
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
