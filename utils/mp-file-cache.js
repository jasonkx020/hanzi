/**
 * 微信小程序：把 CDN 文件缓存到 USER_DATA_PATH，避免重复下载。
 */
import { isMpWeixin } from '@/utils/uni-platform.js'

function userDataPath() {
	try {
		if (typeof uni !== 'undefined' && uni.env && uni.env.USER_DATA_PATH) {
			return String(uni.env.USER_DATA_PATH)
		}
	} catch (_) {}
	return ''
}

function cachePath(key) {
	const base = userDataPath()
	if (!base) return ''
	const safe = String(key || 'file').replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '_')
	return `${base}/hanzi-cache/${safe}`
}

function fsm() {
	try {
		return uni.getFileSystemManager()
	} catch (_) {
		return null
	}
}

function accessFile(path) {
	const fs = fsm()
	if (!fs) return Promise.reject(new Error('no fsm'))
	return new Promise((resolve, reject) => {
		fs.access({ path, success: () => resolve(path), fail: reject })
	})
}

function mkdirParent(filePath) {
	const fs = fsm()
	if (!fs) return Promise.resolve()
	const dir = String(filePath).replace(/\/[^/]+$/, '')
	return new Promise((resolve) => {
		fs.mkdir({ dirPath: dir, recursive: true, success: resolve, fail: resolve })
	})
}

/**
 * @param {string} url https CDN
 * @param {string} cacheKey 缓存文件名
 * @returns {Promise<string>} 可播放/可读的本地路径；失败则抛错
 */
export async function ensureDownloaded(url, cacheKey) {
	if (!isMpWeixin()) return url
	const remote = String(url || '').trim()
	if (!remote) throw new Error('empty url')
	const dest = cachePath(cacheKey)
	if (!dest) return remote
	try {
		return await accessFile(dest)
	} catch (_) {}
	await mkdirParent(dest)
	const temp = await new Promise((resolve, reject) => {
		uni.downloadFile({
			url: remote,
			success(res) {
				if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
					resolve(res.tempFilePath)
					return
				}
				reject(new Error(`download ${res.statusCode}`))
			},
			fail: reject
		})
	})
	const fs = fsm()
	if (!fs) return temp
	await new Promise((resolve, reject) => {
		fs.saveFile({
			tempFilePath: temp,
			filePath: dest,
			success: () => resolve(dest),
			fail: reject
		})
	})
	return dest
}

/** 读已缓存的文本；没有则 null */
export async function readCachedText(cacheKey) {
	const dest = cachePath(cacheKey)
	const fs = fsm()
	if (!dest || !fs) return null
	try {
		await accessFile(dest)
	} catch (_) {
		return null
	}
	return new Promise((resolve) => {
		fs.readFile({
			filePath: dest,
			encoding: 'utf-8',
			success: (res) => resolve(res.data),
			fail: () => resolve(null)
		})
	})
}

export async function writeCachedText(cacheKey, text) {
	const dest = cachePath(cacheKey)
	const fs = fsm()
	if (!dest || !fs) return false
	await mkdirParent(dest)
	return new Promise((resolve) => {
		fs.writeFile({
			filePath: dest,
			data: String(text ?? ''),
			encoding: 'utf-8',
			success: () => resolve(true),
			fail: () => resolve(false)
		})
	})
}
