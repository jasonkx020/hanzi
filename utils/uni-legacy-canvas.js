/**
 * uni-app 旧版 canvas API（uni.createCanvasContext）跨端封装。
 * App / 各端小程序 / H5 能力不一致，调用前应先 isLegacyCanvasApiAvailable()。
 */
import { isAppPlus, isMpWeixin } from '@/utils/pinyin-follow-read-platform.js'

/** 当前运行环境是否提供旧版 canvas 绘制 API */
export function isLegacyCanvasApiAvailable() {
	try {
		return typeof uni !== 'undefined' && typeof uni.createCanvasContext === 'function'
	} catch (_) {
		return false
	}
}

/** 供调试页展示的端类型文案 */
export function getUniRuntimeLabel() {
	if (isAppPlus()) return 'App'
	if (isMpWeixin()) return '微信小程序'
	try {
		const s = uni.getSystemInfoSync()
		const p = String(s.uniPlatform || s.platform || '').toLowerCase()
		if (p.includes('h5') || p === 'web') return 'H5'
		if (p.includes('mp')) return '小程序'
	} catch (_) {}
	return '当前端'
}

/**
 * 逻辑窗口宽度（px），优先 uni.getWindowInfo，回退 getSystemInfoSync
 * @returns {number}
 */
export function getUniWindowWidthPx() {
	try {
		if (typeof uni.getWindowInfo === 'function') {
			const w = uni.getWindowInfo()
			const ww = Number(w.windowWidth)
			if (Number.isFinite(ww) && ww > 0) return ww
		}
	} catch (_) {}
	try {
		const s = uni.getSystemInfoSync()
		const ww = Number(s.windowWidth)
		if (Number.isFinite(ww) && ww > 0) return ww
	} catch (_) {}
	return 375
}

/**
 * 按页面左右 padding（rpx）计算 canvas 内容区宽度
 * @param {number} paddingRpx 单侧留白，传总水平留白时需自行除以 2 或传合计值
 * @param {number} [minPx]
 */
export function computeLegacyCanvasWidthPx(paddingRpx = 56, minPx = 260) {
	const windowWidth = getUniWindowWidthPx()
	const pad = Math.floor((paddingRpx / 750) * windowWidth)
	return Math.max(minPx, Math.floor(windowWidth - pad))
}

/**
 * @param {string} canvasId
 * @param {object} componentInstance 宿主组件/页面的 this（子组件内 canvas 必须传子组件实例）
 * @returns {object|null}
 */
export function createLegacyCanvasContext(canvasId, componentInstance) {
	if (!isLegacyCanvasApiAvailable()) return null
	const id = String(canvasId || '').trim()
	if (!id) return null
	try {
		return uni.createCanvasContext(id, componentInstance)
	} catch (_) {
		return null
	}
}

/**
 * 提交旧版 canvas 绘制；部分端 draw 抛错时不阻断业务
 * @param {object|null} ctx
 */
export function flushLegacyCanvasDraw(ctx) {
	if (!ctx || typeof ctx.draw !== 'function') return
	try {
		ctx.draw()
	} catch (_) {
		try {
			ctx.draw(false)
		} catch (__) {}
	}
}

/**
 * 频谱柱颜色（hex/rgb，避免 hsl 在部分小程序 canvas 上不生效）
 * @param {number} index
 * @param {number} total
 * @param {boolean} active 录音中
 */
export function spectrumBarFill(index, total, active) {
	const t = total > 1 ? index / (total - 1) : 0
	const r = Math.round(232 + t * (90 - 232))
	const g = Math.round(120 + t * (143 - 120))
	const b = Math.round(48 + t * (212 - 48))
	if (active) {
		return `rgb(${r},${g},${b})`
	}
	const m = 0.72
	return `rgb(${Math.round(r * m)},${Math.round(g * m)},${Math.round(b * m)})`
}
