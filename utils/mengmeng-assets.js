/**
 * 萌萌识字 · 品牌美术资源路径（与 static/mengmeng、static/tab 目录一致）
 */
import {
	resolveAppStaticAbsoluteUrl,
	resolveAppStaticLogicalUrl
} from '@/utils/resolve-app-static-url.js'

export const MENG_ASSETS = {
	heroBg: '/static/mengmeng/hero-bg.png',
	pageSoftBg: '/static/mengmeng/bg/page-soft.png',
	logo: '/static/mengmeng/logo.png',
	logoIcon: '/static/mengmeng/logo-icon.png',
	/** 喇叭萌萌 · 听读音按钮 */
	laba: '/static/mengmeng/laba.png',
	appIcon: '/static/mengmeng/app-icon.png',
	reference: '/static/mengmeng/reference/mengmeng-master.png',
	ip: {
		book: '/static/mengmeng/ip/book.png',
		happy: '/static/mengmeng/ip/happy.png',
		curious: '/static/mengmeng/ip/curious.png',
		trying: '/static/mengmeng/ip/trying.png',
		balloon: '/static/mengmeng/ip/balloon.png',
		wave: '/static/mengmeng/ip/wave.png'
	},
	state: {
		empty: '/static/mengmeng/state/empty.png',
		error: '/static/mengmeng/state/error.png',
		loading: '/static/mengmeng/state/loading.png',
		success: '/static/mengmeng/state/success.png'
	},
	entry: {
		daily: '/static/mengmeng/entry/daily.png',
		textbook: '/static/mengmeng/entry/textbook.png',
		strokeLab: '/static/mengmeng/entry/stroke-lab.png',
		game: '/static/mengmeng/entry/game.png'
	},
	tab: {
		home: '/static/tab/home.png',
		homeActive: '/static/tab/home-active.png',
		learn: '/static/tab/learn.png',
		learnActive: '/static/tab/learn-active.png',
		catalog: '/static/tab/catalog.png',
		catalogActive: '/static/tab/catalog-active.png',
		me: '/static/tab/me.png',
		meActive: '/static/tab/me-active.png'
	}
}

/** @param {keyof MENG_ASSETS['ip']} pose */
export function mengIp(pose) {
	return MENG_ASSETS.ip[pose] || MENG_ASSETS.ip.book
}

/**
 * App 端本地图优先用绝对路径（Android 7 等对 /static/ 支持差）
 * @param {string} webPath 如 /static/mengmeng/laba.png
 */
export function resolveMengAssetUrl(webPath) {
	const p = String(webPath || '').trim()
	if (!p) return ''
	const abs = resolveAppStaticAbsoluteUrl(p)
	return abs || p
}

/** 听读音喇叭图：按优先级返回多种 src，供 @error 逐级重试 */
export function buildMengAssetSrcCandidates(webPath) {
	const p = String(webPath || '').trim()
	if (!p) return []
	const out = []
	const abs = resolveAppStaticAbsoluteUrl(p)
	const logical = resolveAppStaticLogicalUrl(p)
	if (abs) out.push(abs)
	if (logical && logical !== abs) out.push(logical)
	if (p.startsWith('/')) out.push(p)
	else out.push('/' + p)
	return [...new Set(out)]
}
