/**
 * 构建脚本用：优先系统 PATH 的 ffmpeg，否则 ffmpeg-static 包内二进制。
 */
import { execSync } from 'child_process'
import fs from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export function resolveFfmpegExecutable() {
	try {
		execSync('ffmpeg -version', { stdio: 'ignore' })
		return 'ffmpeg'
	} catch (_) {}

	try {
		const bin = require('ffmpeg-static')
		if (bin && fs.existsSync(bin)) return bin
	} catch (_) {}

	return null
}
