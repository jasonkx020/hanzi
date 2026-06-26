/**
 * @file resolve-app-static-url.js
 * @module utils
 * @description 基础设施工具：resolve-app-static-url.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * App 端 static 资源路径：避免 plus.io.convertLocalFileSystemURL 对整条路径转换，
 * 在 release 中与 InnerAudio / 运行时二次解析叠加，出现 …/www/data/user/0/…/www/static/… 重复。
 */

let _wwwRootAbs = null

function stripFileScheme(p) {
	return String(p || '').replace(/^file:\/\//i, '')
}

/**
 * 任意输入 → 站点路径 /static/...
 * @param {string} src
 * @returns {string}
 */
export function normalizeStaticWebPath(src) {
	let path = String(src || '').trim()
	if (!path) return ''
	if (path.startsWith('file://')) path = stripFileScheme(path)
	if ((path.match(/apps\/__UNI__/g) || []).length > 1) {
		const i = path.lastIndexOf('/static/')
		if (i >= 0) path = path.slice(i)
	}
	if (/^\/data\//.test(path) || /^\/storage\//.test(path)) {
		const i = path.indexOf('/static/')
		if (i >= 0) path = path.slice(i)
	}
	if (path.startsWith('_www/')) path = '/' + path.slice(5)
	else if (path.startsWith('_www')) path = '/' + path.replace(/^_www\/?/, '')
	if (path.startsWith('static/')) path = '/' + path
	if (!path.startsWith('/static/')) return ''
	return path
}

/**
 * 5+ 逻辑路径（打包资源），供 InnerAudio 等使用；勿再 convertLocalFileSystemURL。
 * @param {string} src 如 /static/pinyin/b.opus
 * @returns {string}
 */
export function resolveAppStaticLogicalUrl(src) {
	const web = normalizeStaticWebPath(src)
	if (!web) return String(src || '')
	// #ifdef APP-PLUS
	return '_www' + web
	// #endif
	// #ifndef APP-PLUS
	return web
	// #endif
}

/**
 * 仅转换 _www 根目录一次，再拼接 static/…（图片等需要绝对路径时用）。
 * @param {string} src
 * @returns {string}
 */
export function resolveAppStaticAbsoluteUrl(src) {
	const web = normalizeStaticWebPath(src)
	if (!web) return String(src || '')
	// #ifdef APP-PLUS
	try {
		if (typeof plus !== 'undefined' && plus.io?.convertLocalFileSystemURL) {
			if (!_wwwRootAbs) {
				let root = plus.io.convertLocalFileSystemURL('_www/')
				root = stripFileScheme(root)
				_wwwRootAbs = root.endsWith('/') ? root : root + '/'
			}
			return _wwwRootAbs + web.replace(/^\//, '')
		}
	} catch (e) {
		console.warn('[resolve-app-static] absolute', src, e)
	}
	return resolveAppStaticLogicalUrl(src)
	// #endif
	// #ifndef APP-PLUS
	return web
	// #endif
}

/**
 * `<image>` 用：云打包 release 下优先站点路径 `/static/…`（与基座行为一致）；
 * 失败时由 buildAppStaticImageSrcCandidates 逐级回退 _www / 绝对路径。
 * @param {string} src
 */
export function resolveAppStaticImageUrl(src) {
	const list = buildAppStaticImageSrcCandidates(src)
	return list[0] || normalizeStaticWebPath(src) || String(src || '')
}

/**
 * 图片 src 候选（顺序：web → _www → file），供 @error 重试。
 * @param {string} src
 * @returns {string[]}
 */
export function buildAppStaticImageSrcCandidates(src) {
	const web = normalizeStaticWebPath(src)
	if (!web) return []
	const out = []
	const push = (s) => {
		const v = String(s || '').trim()
		if (v && out.indexOf(v) < 0) out.push(v)
	}
	push(web)
	// #ifdef APP-PLUS
	push(resolveAppStaticLogicalUrl(web))
	push(resolveAppStaticAbsoluteUrl(web))
	// #endif
	return out
}
