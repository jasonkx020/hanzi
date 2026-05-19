/**
 * 跟读调试：播放用户录音、打印文件信息，确认是否录到声音。
 */
import {
	FOLLOW_READ_SCORE_DEBUG,
	FOLLOW_READ_DEBUG_PLAY_RECORDING
} from '@/config/pinyin-follow-read-config.js'
import { logFollowReadScore } from '@/utils/pinyin-follow-read-debug-log.js'
import { isAppPlus, getUniFileSystemManager } from '@/utils/pinyin-follow-read-platform.js'
import { sniffRecordingAudioKind } from '@/utils/pinyin-audio-sniff.js'
import { readFileAsArrayBuffer } from '@/utils/pinyin-follow-read-audio-decode.js'

let debugInnerAudio = null

function stripFileScheme(p) {
	return String(p || '').replace(/^file:\/\//i, '')
}

/** 供 InnerAudio / readFile 尝试的本地路径候选 */
export function resolveRecordingPlaybackCandidates(filePath) {
	const raw = String(filePath || '').trim()
	if (!raw) return []
	const out = []
	const push = (p) => {
		const s = String(p || '').trim()
		if (s && out.indexOf(s) === -1) out.push(s)
	}
	push(raw)
	if (/^file:\/\//i.test(raw)) {
		push(stripFileScheme(raw))
	} else if (/^\//.test(raw) && !/^_doc\//i.test(raw) && !/^_www\//i.test(raw)) {
		push(`file://${raw}`)
	}
	try {
		if (typeof plus !== 'undefined' && plus.io?.convertLocalFileSystemURL) {
			const converted = plus.io.convertLocalFileSystemURL(raw)
			push(converted)
			push(stripFileScheme(converted))
		}
	} catch (_) {}
	return out
}

/**
 * @param {string} filePath
 * @returns {Promise<{ ok: boolean, size?: number, path?: string, err?: string }>}
 */
function statViaPlusIo(filePath) {
	return new Promise((resolve) => {
		if (typeof plus === 'undefined' || !plus.io?.resolveLocalFileSystemURL) {
			resolve({ ok: false, err: 'plus.io unavailable' })
			return
		}
		const raw = String(filePath || '').trim()
		let url = raw
		try {
			if (plus.io.convertLocalFileSystemURL) {
				url = plus.io.convertLocalFileSystemURL(raw)
			}
		} catch (_) {}
		plus.io.resolveLocalFileSystemURL(
			url,
			(entry) => {
				entry.file(
					(file) => {
						resolve({
							ok: true,
							size: Number(file?.size) || 0,
							path: raw.slice(0, 96),
							via: 'plus.io'
						})
					},
					() => resolve({ ok: false, err: 'plus.io entry.file fail' })
				)
			},
			() => resolve({ ok: false, err: 'plus.io resolve fail' })
		)
	})
}

export function statFollowReadRecording(filePath) {
	const paths = resolveRecordingPlaybackCandidates(filePath)
	const fs = getUniFileSystemManager()
	if (!paths.length) {
		return Promise.resolve({ ok: false, err: 'no path' })
	}
	if (!fs) {
		return statViaPlusIo(paths[0])
	}
	return new Promise((resolve) => {
		let i = 0
		const tryNext = () => {
			if (i >= paths.length) {
				resolve({ ok: false, err: 'getFileInfo fail', tried: paths.length })
				return
			}
			const p = paths[i++]
			fs.getFileInfo({
				filePath: p,
				success: (res) => {
					resolve({
						ok: true,
						size: Number(res?.size) || 0,
						path: p.slice(0, 96)
					})
				},
				fail: () => tryNext()
			})
		}
		tryNext()
	})
}

/**
 * 读取录音头若干字节用于日志（不阻塞评分主路径时可单独调用）
 */
export async function sniffFollowReadRecordingFile(filePath) {
	try {
		const buf = await readFileAsArrayBuffer(filePath)
		return {
			bytes: buf?.byteLength || 0,
			sniff: sniffRecordingAudioKind(buf)
		}
	} catch (e) {
		return { bytes: 0, sniff: 'unknown', err: String(e?.message || e) }
	}
}

function destroyDebugInnerAudio() {
	if (!debugInnerAudio) return
	try {
		debugInnerAudio.stop()
	} catch (_) {}
	try {
		debugInnerAudio.destroy()
	} catch (_) {}
	debugInnerAudio = null
}

/**
 * 调试播放用户录音（InnerAudioContext）
 * @param {string} filePath stopRes.tempFilePath
 * @param {{ force?: boolean, delayMs?: number }} [opts]
 */
export function playFollowReadDebugRecording(filePath, opts = {}) {
	const enabled = opts.force || FOLLOW_READ_DEBUG_PLAY_RECORDING || FOLLOW_READ_SCORE_DEBUG
	if (!enabled) return Promise.resolve({ ok: false, skipped: true })

	const paths = resolveRecordingPlaybackCandidates(filePath)
	if (!paths.length) {
		logFollowReadScore('score.debug.play_skip', { reason: 'empty path' })
		return Promise.resolve({ ok: false, message: '无录音路径' })
	}

	const delayMs = Math.max(0, Number(opts.delayMs) || 0)

	return new Promise((resolve) => {
		const run = () => {
			statFollowReadRecording(filePath).then((stat) => {
				logFollowReadScore('score.debug.record_stat', {
					...stat,
					playCandidates: paths.map((p) => p.slice(0, 80))
				})
			})

			destroyDebugInnerAudio()
			let idx = 0
			const tryPlay = () => {
				if (idx >= paths.length) {
					logFollowReadScore('score.debug.play_fail', {
						tried: paths.length,
						path: String(filePath || '').slice(0, 96)
					})
					resolve({ ok: false, message: '无法播放录音' })
					return
				}
				const src = paths[idx++]
				const inner = uni.createInnerAudioContext()
				debugInnerAudio = inner
				inner.autoplay = true
				// #ifdef APP-PLUS
				if (isAppPlus() && /^_doc\//i.test(src)) {
					inner.src = src
				} else if (isAppPlus() && !/^file:\/\//i.test(src) && /^\//.test(src)) {
					inner.src = `file://${src}`
				} else {
					inner.src = src
				}
				// #endif
				// #ifndef APP-PLUS
				inner.src = src
				// #endif

				let settled = false
				const done = (payload) => {
					if (settled) return
					settled = true
					resolve(payload)
				}
				inner.onPlay(() => {
					logFollowReadScore('score.debug.play_start', {
						src: src.slice(0, 96),
						isAppPlus: isAppPlus()
					})
					done({ ok: true, src: src.slice(0, 96) })
				})
				inner.onError((err) => {
					logFollowReadScore('score.debug.play_err', {
						src: src.slice(0, 80),
						err: err?.errMsg || String(err || '')
					})
					destroyDebugInnerAudio()
					tryPlay()
				})
				try {
					inner.play()
				} catch (e) {
					logFollowReadScore('score.debug.play_throw', {
						src: src.slice(0, 80),
						err: String(e?.message || e)
					})
					destroyDebugInnerAudio()
					tryPlay()
				}
			}
			tryPlay()
		}
		if (delayMs > 0) setTimeout(run, delayMs)
		else run()
	})
}

export function stopFollowReadDebugPlayback() {
	destroyDebugInnerAudio()
}

/** 播放任意本地录音文件（录音测试页等，不依赖调试开关） */
export function playRecordingFile(filePath, opts = {}) {
	return playFollowReadDebugRecording(filePath, { force: true, ...opts })
}
