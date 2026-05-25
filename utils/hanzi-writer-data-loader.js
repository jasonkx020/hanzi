/**
 * hanzi-writer-data 多源加载：本地 static 优先，CDN 依次回退。
 */
import { resolveAppStaticLogicalUrl } from '@/utils/resolve-app-static-url.js'
import { readAppStaticText } from '@/utils/read-app-static-text.js'

/** 与 node_modules/hanzi-writer-data 版本对齐 */
const HANZI_WRITER_DATA_VERSION = '2.0.1'

const LOCAL_BASE = '/static/hanzi-writer-data'

/** 远程 CDN（国内镜像靠前） */
const REMOTE_BASES = [
	`https://registry.npmmirror.com/hanzi-writer-data/${HANZI_WRITER_DATA_VERSION}/files`,
	`https://cdn.jsdelivr.net/npm/hanzi-writer-data@${HANZI_WRITER_DATA_VERSION}`,
	`https://fastly.jsdelivr.net/npm/hanzi-writer-data@${HANZI_WRITER_DATA_VERSION}`,
	`https://unpkg.com/hanzi-writer-data@${HANZI_WRITER_DATA_VERSION}`,
	`https://unpkg.com/hanzi-writer-data@latest`,
	`https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest`
]

const CHAR_DATA_CACHE = Object.create(null)
let primaryRemoteBase = null
let extraRemoteBases = []

function normalizeBase(url) {
	return String(url || '').trim().replace(/\/$/, '')
}

function getLoadBases() {
	const list = [LOCAL_BASE]
	if (primaryRemoteBase) list.push(primaryRemoteBase)
	list.push(...extraRemoteBases, ...REMOTE_BASES)
	const seen = new Set()
	return list.filter((b) => {
		const key = normalizeBase(b)
		if (!key || seen.has(key)) return false
		seen.add(key)
		return true
	})
}

function requestJSON(url) {
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

function isValidCharData(data) {
	return data && (Array.isArray(data.strokes) || Array.isArray(data.medians))
}

async function loadFromLocal(char) {
	const webPath = `${LOCAL_BASE}/${char}.json`
	if (typeof plus !== 'undefined' && plus.io) {
		try {
			const text = await readAppStaticText(webPath)
			const data = JSON.parse(text)
			if (isValidCharData(data)) return data
		} catch (_) {}
	}
	const url = resolveAppStaticLogicalUrl(webPath) || webPath
	const data = await requestJSON(url)
	if (!isValidCharData(data)) throw new Error('invalid local char data')
	return data
}

async function loadFromRemote(base, char) {
	const url = `${normalizeBase(base)}/${encodeURIComponent(char)}.json`
	const data = await requestJSON(url)
	if (!isValidCharData(data)) throw new Error('invalid remote char data')
	return data
}

/**
 * @param {string} char 单个汉字
 * @returns {Promise<object>}
 */
export async function loadHanziWriterCharData(char) {
	const c = String(char || '').trim().charAt(0)
	if (!c) throw new Error('empty char')
	if (CHAR_DATA_CACHE[c]) return CHAR_DATA_CACHE[c]

	let lastErr = null
	for (const base of getLoadBases()) {
		try {
			const data =
				base === LOCAL_BASE ? await loadFromLocal(c) : await loadFromRemote(base, c)
			CHAR_DATA_CACHE[c] = data
			return data
		} catch (e) {
			lastErr = e
		}
	}
	throw lastErr || new Error(`hanzi-writer-data load failed: ${c}`)
}

/** 兼容 draw-native.setResourceBase：插入为首个远程源 */
export function setHanziWriterDataPrimaryBase(url) {
	primaryRemoteBase = normalizeBase(url) || null
}

/** 追加自定义远程 base（去重） */
export function addHanziWriterDataBase(url) {
	const b = normalizeBase(url)
	if (b && !extraRemoteBases.includes(b)) extraRemoteBases.push(b)
}

export function getHanziWriterDataBases() {
	return getLoadBases()
}

export function clearHanziWriterCharDataCache(char) {
	if (char) delete CHAR_DATA_CACHE[String(char).charAt(0)]
	else {
		Object.keys(CHAR_DATA_CACHE).forEach((k) => delete CHAR_DATA_CACHE[k])
	}
}
