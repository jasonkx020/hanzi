/**
 * 拼音页布局：低版本 Android WebView 检测与 scroll 区域高度兜底。
 */

let _legacyLayout = null

/**
 * Android 5+ 且 WebView 较旧时启用 margin 布局回退（与 pinyin-layout-compat.css 配合，需去掉 flex gap）。
 * @returns {boolean}
 */
export function isLegacyAndroidLayout() {
	if (_legacyLayout != null) return _legacyLayout
	try {
		const sys = uni.getSystemInfoSync()
		const platform = String(sys.platform || '').toLowerCase()
		if (platform !== 'android') {
			_legacyLayout = false
			return false
		}
		const api =
			Number(sys.osAndroidAPILevel) ||
			Number(sys.androidSDKVersion) ||
			Number(sys.SDKVersion) ||
			0
		// API 28 及以下系统 WebView 普遍不支持 flex gap
		_legacyLayout = !api || api <= 28
	} catch (_) {
		_legacyLayout = true
	}
	return _legacyLayout
}

/**
 * 拼读练习 scroll-view 高度：旧机用 windowHeight 扣减，避免 100vh/flex 算不出高度。
 * @param {number} dockPx 顶栏+Tab 占用（px）
 * @param {number} footerPx 底栏占用（px）
 * @returns {number}
 */
export function measurePinyinScrollHeightPx(dockPx = 0, footerPx = 0) {
	try {
		const sys = uni.getSystemInfoSync()
		const wh = Number(sys.windowHeight) || Number(sys.screenHeight) || 0
		if (wh <= 0) return 0
		const safe = Number(sys.safeAreaInsets?.bottom) || 0
		const tabBar = 54
		const h = wh - dockPx - footerPx - safe - tabBar
		return Math.max(200, Math.round(h))
	} catch (_) {
		return 0
	}
}
