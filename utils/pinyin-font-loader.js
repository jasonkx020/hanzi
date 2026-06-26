/**
 * @file pinyin-font-loader.js
 * @module utils
 * @description 基础设施工具：pinyin-font-loader.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 拼音展示字体（与 static/styles/pinyin-font.css 中 font-family: pinyin-regular 一致）。
 *
 * H5：依赖全局 @font-face，不调用 loadFontFace。
 * App / 小程序：用 uni.loadFontFace 注册本地 static 字体；失败时仍可由 CSS @font-face 兜底。
 */

import { resolveAppStaticLogicalUrl } from '@/utils/resolve-app-static-url.js'

/** 与 .font-pinyin / @font-face 的 font-family 一致 */
export const PINYIN_FONT_FAMILY = 'pinyin-regular'

/** 与 static/fonts 实际文件名一致；App loadFontFace 优先 TTF */
const PINYIN_FONT_WEB_PATHS = [
	'/static/fonts/pinyin-regular.ttf',
	'/static/fonts/pinyin-regular.woff2'
]

/** @deprecated 使用 PINYIN_FONT_FAMILY */
export const PINYIN_FONT_FAMILY_NAME = PINYIN_FONT_FAMILY

/** @deprecated 使用 PINYIN_FONT_WEB_PATHS[0] */
export const PINYIN_FONT_URL = PINYIN_FONT_WEB_PATHS[0]

/** 与 static/styles/pinyin-font.css、.font-pinyin 一致 */
export const PINYIN_FONT_FAMILY_CSS =
	"'pinyin-regular', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif"

let loadPromise = null
let warnedOnce = false

/**
 * 生成 loadFontFace 的 source 候选。
 * App 端官方推荐 url('/static/...') 或 url('_www/static/...')；勿用 storage 绝对路径（易 NetworkError）。
 * @returns {string[]}
 */
function buildPinyinFontFaceSources() {
	const out = []
	const seen = new Set()

	const push = (s) => {
		const v = String(s || '').trim()
		if (!v || seen.has(v)) return
		seen.add(v)
		out.push(v)
	}

	for (const web of PINYIN_FONT_WEB_PATHS) {
		push(`url("${web}")`)
	}

	// #ifdef APP-PLUS
	for (const web of PINYIN_FONT_WEB_PATHS) {
		const logical = resolveAppStaticLogicalUrl(web)
		if (logical) push(`url("${logical}")`)
	}
	// #endif

	return out
}

/**
 * @param {string} source
 * @returns {Promise<boolean>}
 */
function loadFontFaceOnce(source) {
	return new Promise((resolve) => {
		try {
			uni.loadFontFace({
				family: PINYIN_FONT_FAMILY,
				source,
				global: true,
				success: () => resolve(true),
				fail: (err) => {
					if (!warnedOnce) {
						console.warn('[pinyin-font] loadFontFace fail', source, err?.errMsg || err)
					}
					resolve(false)
				}
			})
		} catch (_) {
			resolve(false)
		}
	})
}

/**
 * App / 小程序：动态注册拼音字体
 * @returns {Promise<boolean>}
 */
export function ensurePinyinFontLoaded() {
	if (loadPromise) return loadPromise

	// #ifdef H5
	loadPromise = Promise.resolve(true)
	return loadPromise
	// #endif

	loadPromise = (async () => {
		if (typeof uni.loadFontFace !== 'function') return false
		const sources = buildPinyinFontFaceSources()
		for (const source of sources) {
			const ok = await loadFontFaceOnce(source)
			if (ok) return true
		}
		if (!warnedOnce) {
			warnedOnce = true
			console.warn(
				'[pinyin-font] loadFontFace 未成功，将使用 CSS @font-face 回退（',
				sources.join(', '),
				'）'
			)
		}
		return false
	})().then((ok) => {
		if (!ok) loadPromise = null
		return ok
	})

	return loadPromise
}

/**
 * 首屏尚无页面栈时 loadFontFace 可能失败，延后重试（供 App.vue onLaunch）
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
			ensurePinyinFontLoaded().then((ok) => {
				if (!ok && attempt + 1 < maxAttempts) {
					loadPromise = null
					setTimeout(() => tryOnce(attempt + 1), intervalMs)
				}
			})
		} catch (e) {
			console.warn('[pinyin-font] schedule load', e)
		}
	}
	setTimeout(() => tryOnce(0), 0)
}
