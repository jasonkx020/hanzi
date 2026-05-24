/**
 * hanzi-writer 字形数据：优先读打包在 static 下的 JSON（离线可用），失败再试 CDN。
 * 本地：npm run assets:hanzi-writer
 */
import { readAppStaticText } from '@/utils/read-app-static-text.js'
import {
	resolveAppStaticAbsoluteUrl,
	resolveH5StaticAbsoluteUrl
} from '@/utils/resolve-app-static-url.js'
import { getUniFileSystemManager, isAppPlus } from '@/utils/uni-platform.js'

export const LOCAL_HANZI_WRITER_BASE = '/static/hanzi-writer-data'

/** @type {string[]} */
const CDN_BASES = [
	'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1',
	'https://fastly.jsdelivr.net/npm/hanzi-writer-data@2.0.1'
]

/** @type {string | null} */
let customBase = null

const CHAR_DATA_CACHE = Object.create(null)

export function setHanziWriterDataBase(url) {
	if (typeof url === 'string' && url.trim()) {
		customBase = url.replace(/\/$/, '')
	}
}

/** 本地文件名与磁盘一致，勿 encodeURIComponent */
export function localCharWebPath(char) {
	const c = String(char || '').trim().charAt(0)
	return `${LOCAL_HANZI_WRITER_BASE}/${c}.json`
}

function parseJsonPayload(payload) {
	if (payload && typeof payload === 'object') return payload
	return JSON.parse(String(payload || ''))
}

function requestUniJson(url) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			success(res) {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data)
					return
				}
				reject(new Error(`request failed: ${res.statusCode}`))
			},
			fail(err) {
				reject(err)
			}
		})
	})
}

/**
 * 读取 static 下字形 JSON（App 走 plus.io，小程序走 FileSystemManager，H5 走同源 URL）
 * @param {string} char
 */
async function loadLocalCharData(char) {
	const web = localCharWebPath(char)

	if (isAppPlus()) {
		const abs = resolveAppStaticAbsoluteUrl(web)
		if (abs) {
			try {
				const url = /^file:\/\//i.test(abs) ? abs : `file://${abs}`
				return parseJsonPayload(await requestUniJson(url))
			} catch (_) {}
		}
		const text = await readAppStaticText(web)
		return parseJsonPayload(text)
	}

	const fsm = getUniFileSystemManager()
	if (fsm) {
		return new Promise((resolve, reject) => {
			fsm.readFile({
				filePath: web,
				encoding: 'utf-8',
				success: (res) => {
					try {
						resolve(parseJsonPayload(res.data))
					} catch (e) {
						reject(e)
					}
				},
				fail: reject
			})
		})
	}

	const h5Url = resolveH5StaticAbsoluteUrl(web)
	if (h5Url) {
		return parseJsonPayload(await requestUniJson(h5Url))
	}

	return parseJsonPayload(await requestUniJson(web))
}

function cdnCharUrl(base, char) {
	return `${base.replace(/\/$/, '')}/${encodeURIComponent(char)}.json`
}

/**
 * @param {string} char
 * @param {(url: string) => Promise<object>} [requestJson] 仅用于 CDN 回退；缺省用 uni.request
 */
export async function loadHanziWriterCharData(char, requestJson) {
	const c = String(char || '').trim().charAt(0)
	if (!c) throw new Error('hanzi-writer: empty char')
	if (CHAR_DATA_CACHE[c]) return CHAR_DATA_CACHE[c]

	const networkRequest = typeof requestJson === 'function' ? requestJson : requestUniJson
	/** @type {unknown} */
	let lastErr = null

	// 1. 打包 static（离线）
	try {
		const data = await loadLocalCharData(c)
		CHAR_DATA_CACHE[c] = data
		return data
	} catch (e) {
		lastErr = e
	}

	// 2. 自定义 base（多为 /static/...）
	if (customBase && customBase.startsWith('/static/')) {
		try {
			const web = `${customBase}/${c}.json`
			if (isAppPlus()) {
				const text = await readAppStaticText(web)
				const data = parseJsonPayload(text)
				CHAR_DATA_CACHE[c] = data
				return data
			}
			const data = parseJsonPayload(await networkRequest(web))
			CHAR_DATA_CACHE[c] = data
			return data
		} catch (e) {
			lastErr = e
		}
	} else if (customBase && /^https?:\/\//i.test(customBase)) {
		try {
			const data = await networkRequest(cdnCharUrl(customBase, c))
			CHAR_DATA_CACHE[c] = data
			return data
		} catch (e) {
			lastErr = e
		}
	}

	// 3. CDN
	for (let i = 0; i < CDN_BASES.length; i++) {
		try {
			const data = await networkRequest(cdnCharUrl(CDN_BASES[i], c))
			CHAR_DATA_CACHE[c] = data
			return data
		} catch (e) {
			lastErr = e
		}
	}

	throw lastErr || new Error(`hanzi-writer: load failed for ${c}`)
}

export function peekHanziWriterCharCache(char) {
	return CHAR_DATA_CACHE[String(char || '').trim().charAt(0)] || null
}
