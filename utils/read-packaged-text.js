/**
 * 读取打包进应用的 static 文本。
 * App：plus.io；小程序：FileSystemManager；其它：uni.request（H5）。
 */
import { getUniFileSystemManager, isAppPlus } from '@/utils/uni-platform.js'
import { readAppStaticText } from '@/utils/read-app-static-text.js'

export function readPackagedText(url) {
	const path = String(url || '')
	if (isAppPlus() || (typeof plus !== 'undefined' && plus.io && path.startsWith('/static/'))) {
		return readAppStaticText(path)
	}
	const fsm = getUniFileSystemManager()
	if (fsm && path.startsWith('/')) {
		return new Promise((resolve, reject) => {
			fsm.readFile({
				filePath: path,
				encoding: 'utf-8',
				success: (res) => resolve(res.data),
				fail: reject
			})
		})
	}
	return new Promise((resolve, reject) => {
		uni.request({
			url: path,
			method: 'GET',
			responseType: 'text',
			dataType: 'text',
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data)
					return
				}
				reject(new Error(`HTTP ${res.statusCode}`))
			},
			fail: reject
		})
	})
}
