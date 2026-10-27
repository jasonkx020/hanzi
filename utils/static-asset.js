/**
 * 平台静态资源 URL。App/H5 走包内 opus；微信小程序走 CDN mp3（见 config/mp-cdn-config.js）。
 */
import { MP_CDN_BASE } from '@/config/mp-cdn-config.js'

function cdnBase() {
	return String(MP_CDN_BASE || '').replace(/\/$/, '')
}

/** @param {string} rel 如 pinyin/a.mp3 */
export function mpCdnUrl(rel) {
	const base = cdnBase()
	const path = String(rel || '').replace(/^\//, '')
	if (!base || !path) return ''
	return `${base}/${path}`
}

export function pinyinRemoteUrl(stem) {
	const s = String(stem || '').trim()
	if (!s) return ''
	return mpCdnUrl(`pinyin/${encodeURIComponent(s)}.mp3`)
}

export function mengVoiceRemoteUrl(id) {
	const s = String(id || '').trim()
	if (!s) return ''
	return mpCdnUrl(`voice/mengmeng/${encodeURIComponent(s)}.mp3`)
}

export function writerCharRemoteUrl(char) {
	const c = String(char || '').trim().charAt(0)
	if (!c) return ''
	return mpCdnUrl(`hanzi-writer-data/${encodeURIComponent(c)}.json`)
}
