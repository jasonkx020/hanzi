/**
 * 拼音展示字体（全端统一为 Pinyin Regular）。
 *
 * 说明：static/fonts/nanxiangbangbanglines.ttf 为「南翔棒棒四线三格体」，
 * 面向英文棒棒体字帖（字形内常带四线），不适合与本项目 CSS 四线三格叠用，
 * 且对带调拼音、教材 ɑ 等支持不如 Pinyin Regular。若做英文练字可另开模块。
 */

import { resolveAppStaticAbsoluteUrl } from '@/utils/resolve-app-static-url.js'

export const PINYIN_FONT_FAMILY_NAME = 'Pinyin Regular'
export const PINYIN_FONT_URL = '/static/fonts/Pinyin-Regular.ttf'

function buildPinyinFontFaceSource() {
	// #ifdef APP-PLUS
	try {
		const abs = resolveAppStaticAbsoluteUrl(PINYIN_FONT_URL)
		if (abs) {
			const fileUrl = /^file:\/\//i.test(abs) ? abs : `file://${String(abs).replace(/^\//, '')}`
			return `url("${fileUrl}")`
		}
	} catch (e) {
		console.warn('[pinyin-font] resolve static font path', e)
	}
	// #endif
	return `url("${PINYIN_FONT_URL}")`
}

/** 与 static/styles/pinyin-font.css、.font-pinyin 一致 */
export const PINYIN_FONT_FAMILY_CSS =
	"'Pinyin Regular', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif"

let loadPromise = null

/**
 * App / 小程序：全局 loadFontFace（H5 依赖 @font-face，直接 resolve）
 * @returns {Promise<boolean>}
 */
export function ensurePinyinFontLoaded() {
	if (loadPromise) return loadPromise

	// #ifdef H5
	loadPromise = Promise.resolve(true)
	return loadPromise
	// #endif

	loadPromise = new Promise((resolve) => {
		try {
			if (typeof uni.loadFontFace !== 'function') {
				resolve(false)
				return
			}
			uni.loadFontFace({
				family: PINYIN_FONT_FAMILY_NAME,
				source: buildPinyinFontFaceSource(),
				global: true,
				success: () => resolve(true),
				fail: (e) => {
					console.warn('[pinyin-font] loadFontFace failed', e)
					resolve(false)
				}
			})
		} catch (e) {
			console.warn('[pinyin-font] loadFontFace', e)
			resolve(false)
		}
	})
	return loadPromise
}

/**
 * 首屏尚无页面栈时 uni.loadFontFace 可能失败，延后重试（供 App.vue onLaunch）
 */
export function schedulePinyinFontLoad(maxAttempts = 25, intervalMs = 120) {
	const tryOnce = (attempt) => {
		try {
			if (typeof uni.loadFontFace !== 'function') return
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (!pages.length && attempt < maxAttempts) {
				setTimeout(() => tryOnce(attempt + 1), intervalMs)
				return
			}
			ensurePinyinFontLoaded()
		} catch (e) {
			console.warn('[pinyin-font] schedule load', e)
		}
	}
	setTimeout(() => tryOnce(0), 0)
}
