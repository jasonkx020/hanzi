/**
 * App 端读取打包在 static 下的文本（JSON 等）。
 * plus.io 不能解析 /static/...，须用 _www/static/... 或绝对路径。
 */
import {
	resolveAppStaticAbsoluteUrl,
	resolveAppStaticLogicalUrl
} from '@/utils/resolve-app-static-url.js'

function stripFileScheme(p) {
	return String(p || '').replace(/^file:\/\//i, '')
}

/**
 * @param {string} webPath 如 /static/booktext/renjiaoban/grade1-up.json
 * @returns {Promise<string>}
 */
export function readAppStaticText(webPath) {
	const web = String(webPath || '').trim()
	if (!web.startsWith('/static/')) {
		return Promise.reject(new Error('readAppStaticText: need /static/ path'))
	}
	if (typeof plus === 'undefined' || !plus.io) {
		return Promise.reject(new Error('readAppStaticText: not app'))
	}

	const logical = resolveAppStaticLogicalUrl(web)
	const abs = stripFileScheme(resolveAppStaticAbsoluteUrl(web))
	const candidates = []
	if (logical) candidates.push(logical)
	if (abs) {
		candidates.push(abs)
		if (!/^file:\/\//i.test(abs)) candidates.push(`file://${abs}`)
	}
	const uniq = [...new Set(candidates.filter(Boolean))]

	return new Promise((resolve, reject) => {
		let idx = 0
		let lastErr = null

		const fail = (err) => {
			lastErr = err
			if (idx >= uniq.length) {
				reject(lastErr || new Error(`read static failed: ${web}`))
				return
			}
			readViaPlusIo(uniq[idx++])
		}

		const readViaPlusIo = (path) => {
			plus.io.resolveLocalFileSystemURL(
				path,
				(entry) => {
					entry.file(
						(file) => {
							try {
								const reader = new plus.io.FileReader()
								reader.onloadend = (evt) => {
									resolve(String((evt.target && evt.target.result) || ''))
								}
								reader.onerror = () => fail(new Error('FileReader error'))
								reader.readAsText(file, 'utf-8')
							} catch (err) {
								fail(err)
							}
						},
						fail
					)
				},
				fail
			)
		}

		if (!uniq.length) {
			reject(new Error('readAppStaticText: no candidate path'))
			return
		}
		readViaPlusIo(uniq[0])
	})
}
