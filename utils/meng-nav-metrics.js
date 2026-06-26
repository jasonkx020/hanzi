/**
 * @file meng-nav-metrics.js
 * @module utils
 * @description 基础设施工具：meng-nav-metrics.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/** 自定义顶栏：状态栏 + 导航内容区高度（px） */
export const MENG_NAV_CONTENT_PX = 44

const FALLBACK_STATUS_BAR_PX = 44

function readPlusStatusBarPx() {
	// #ifdef APP-PLUS
	try {
		if (typeof plus !== 'undefined' && plus.navigator) {
			const h =
				typeof plus.navigator.getStatusbarHeight === 'function'
					? plus.navigator.getStatusbarHeight()
					: plus.navigator.statusBarHeight
			const n = Number(h)
			if (Number.isFinite(n) && n > 0) return Math.round(n)
		}
	} catch (_) {}
	// #endif
	return 0
}

/**
 * 从系统信息解析状态栏/刘海顶部 inset（px），避免返回 0 导致内容顶到状态栏下。
 * @param {number|undefined|null} explicit 页面已缓存的值，>0 时优先
 */
export function resolveStatusBarPx(explicit) {
	const n = Number(explicit)
	if (Number.isFinite(n) && n > 0) return Math.round(n)

	let top = readPlusStatusBarPx()
	try {
		if (typeof uni.getWindowInfo === 'function') {
			const w = uni.getWindowInfo()
			top = Math.max(
				top,
				Number(w.statusBarHeight) || 0,
				Number(w.safeAreaInsets?.top) || 0,
				Number(w.safeArea?.top) || 0
			)
		}
	} catch (_) {}
	try {
		const s = uni.getSystemInfoSync()
		top = Math.max(
			top,
			Number(s.statusBarHeight) || 0,
			Number(s.safeAreaInsets?.top) || 0,
			Number(s.safeArea?.top) || 0
		)
		if (top <= 0) {
			const plat = String(s.platform || s.osName || '').toLowerCase()
			if (plat.includes('ios')) top = 44
			else if (plat.includes('android')) top = 28
		}
	} catch (_) {}

	if (top > 0) return Math.round(top)
	return FALLBACK_STATUS_BAR_PX
}

/**
 * @returns {{ statusBarPx: number, navContentPx: number, navTotalPx: number }}
 */
export function getMengNavMetrics() {
	const statusBarPx = resolveStatusBarPx()
	const navContentPx = MENG_NAV_CONTENT_PX
	return {
		statusBarPx,
		navContentPx,
		navTotalPx: statusBarPx + navContentPx
	}
}

/**
 * @deprecated 请改用 <meng-status-bar-spacer />；保留空对象以免旧页面 :style 报错
 */
export function mengHeroBleedStyle() {
	return {}
}

/** 顶图向下延伸高度（状态栏 + 导航 + 额外渐变区） */
export function mengHeaderBgHeightStyle(statusBarPx, extendPx = 56) {
	const sb = resolveStatusBarPx(statusBarPx)
	const h = sb + MENG_NAV_CONTENT_PX + (Number(extendPx) || 0)
	return { height: `${h}px` }
}

/** 仅预留状态栏（无顶图页、浮动导航）— 优先用 spacer 组件 */
export function mengSafeTopStyle(statusBarPx) {
	const sb = resolveStatusBarPx(statusBarPx)
	return { paddingTop: `${sb}px` }
}

/** App 启动/回前台时刷新全局 CSS 变量（H5）与 globalData */
export function applyMengSafeAreaCssVars() {
	const { statusBarPx } = getMengNavMetrics()
	try {
		const app = getApp()
		if (app) {
			app.globalData = app.globalData || {}
			app.globalData.mengStatusBarPx = statusBarPx
		}
	} catch (_) {}
	// #ifdef H5
	try {
		if (typeof document !== 'undefined' && document.documentElement) {
			document.documentElement.style.setProperty('--meng-status-bar-px', `${statusBarPx}px`)
		}
	} catch (_) {}
	// #endif
}
