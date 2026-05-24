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
 * H5：InnerAudio 需要可请求的绝对 URL（含 base）。
 * @param {string} src
 * @returns {string}
 */
export function resolveH5StaticAbsoluteUrl(src) {
	const web = normalizeStaticWebPath(src)
	if (!web || typeof window === 'undefined' || !window.location?.origin) return ''
	try {
		let base = '/'
		if (typeof __uniConfig !== 'undefined' && __uniConfig.router?.base != null) {
			base = String(__uniConfig.router.base)
		}
		if (!base.startsWith('/')) base = '/' + base
		if (!base.endsWith('/')) base += '/'
		const rel = web.replace(/^\//, '')
		return window.location.origin + base + rel
	} catch (_) {
		return ''
	}
}

/**
 * 5+ 逻辑路径（打包资源），供 InnerAudio 等使用；勿再 convertLocalFileSystemURL。
 * H5 返回绝对 URL；其它非 App 端返回 /static/... 站点路径。
 * @param {string} src 如 /static/pinyin/b.opus
 * @returns {string}
 */
export function resolveAppStaticLogicalUrl(src) {
	const web = normalizeStaticWebPath(src)
	if (!web) return String(src || '')
	try {
		if (typeof plus !== 'undefined' && plus.runtime) {
			return '_www' + web
		}
	} catch (_) {}
	const h5Abs = resolveH5StaticAbsoluteUrl(src)
	if (h5Abs) return h5Abs
	return web
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
