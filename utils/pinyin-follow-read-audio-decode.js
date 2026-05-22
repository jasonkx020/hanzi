/**
 * 读取并解码本地音频为单声道 PCM（Web Audio / 原始 PCM 文件）。
 */
import { resolveAppStaticAbsoluteUrl } from '@/utils/resolve-app-static-url.js'
import { resampleMono } from '@/utils/pinyin-follow-read-audio-features.js'
import {
	PINYIN_PCM_SAMPLE_RATE,
	PINYIN_RECORD_MIN_PCM_BYTES,
	PINYIN_RECORD_MIN_PCM_SAMPLES
} from '@/constants/pinyin-audio-sample-rate.js'
import {
	getLocalPinyinAudioPath,
	getLocalPinyinTone1AudioPath
} from '@/utils/play-pinyin-local-audio.js'
// #ifdef APP-PLUS
import prebuiltMfccFingerprints from '@/data/pinyin-mfcc-fingerprints.json'
import { deserializeMfccEntry, extractMfccFromFloat32 } from '@/utils/pinyin-mfcc-extract.js'
// #endif
import {
	isAppPlus,
	getUniFileSystemManager,
	mustUsePlusIoForLocalFiles
} from '@/utils/pinyin-follow-read-platform.js'
import {
	arrayBufferToPcmInt16,
	decodePcmLikeToInt16,
	inferRecordingAudioHint,
	isPcmLikeRecording
} from '@/utils/pinyin-pcm-decode.js'
import { sniffRecordingAudioKind } from '@/utils/pinyin-audio-sniff.js'
import { logFollowReadScore } from '@/utils/pinyin-follow-read-debug-log.js'

const DECODE_READ_TIMEOUT_MS = 12000
const PER_PATH_READ_TIMEOUT_MS = 5000
const MAX_READ_PATH_ATTEMPTS = 5
const APP_RECORD_READ_SETTLE_MS = 350
const APP_RECORD_FILE_POLL_MS = 150
const APP_RECORD_FILE_POLL_MAX = 10
const RECORD_READ_RETRY_DELAY_MS = 280
const DECODE_AUDIO_TIMEOUT_MS = 8000

function withTimeout(promise, ms, label) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`${label} timeout (${ms}ms)`))
		}, ms)
		Promise.resolve(promise).then(
			(v) => {
				clearTimeout(timer)
				resolve(v)
			},
			(e) => {
				clearTimeout(timer)
				reject(e)
			}
		)
	})
}

const refMfccCache = new Map()

function stemsForSymbol(symbol) {
	const key = String(symbol || '').trim()
	const list = [key]
	const tone1Path = getLocalPinyinTone1AudioPath(key)
	const neutralPath = getLocalPinyinAudioPath(key)
	if (tone1Path) {
		const stem = tone1Path.replace(/^.*\//, '').replace(/\.opus$/i, '')
		if (stem && list.indexOf(stem) === -1) list.push(stem)
	}
	if (neutralPath) {
		const stem = neutralPath.replace(/^.*\//, '').replace(/\.opus$/i, '')
		if (stem && list.indexOf(stem) === -1) list.unshift(stem)
	}
	return list
}

function getAudioContext() {
	if (typeof window === 'undefined') return null
	const Ctx = window.AudioContext || window.webkitAudioContext
	return Ctx ? new Ctx() : null
}

function stripFileScheme(p) {
	return String(p || '').replace(/^file:\/\//i, '')
}

/** RecorderManager 临时录音（勿用 plus.io，易挂死导致 readRecordingFile timeout） */
function isRecorderTempPath(filePath) {
	const p = String(filePath || '').trim()
	if (!p) return false
	return (
		/^_doc\//i.test(p) ||
		/^wxfile:/i.test(p) ||
		/\/recorder\//i.test(p) ||
		/uniapp_temp/i.test(p)
	)
}

/** 录音临时文件：仅 uni.getFileSystemManager，路径候选尽量少 */
function buildRecorderReadPaths(filePath) {
	const raw = String(filePath || '').trim()
	const out = []
	const push = (p) => {
		const s = String(p || '').trim()
		if (s && out.indexOf(s) === -1) out.push(s)
	}
	push(raw)
	if (/^file:\/\//i.test(raw)) {
		push(stripFileScheme(raw))
	}
	try {
		if (typeof plus !== 'undefined' && plus.io?.convertLocalFileSystemURL && /^_doc\//i.test(raw)) {
			const abs = stripFileScheme(plus.io.convertLocalFileSystemURL(raw))
			if (abs) push(abs)
		}
	} catch (_) {}
	return out.slice(0, 3)
}

function tryReadUniFsSyncBase64(fs, path) {
	if (!fs || typeof fs.readFileSync !== 'function') return null
	try {
		const res = fs.readFileSync({ filePath: path, encoding: 'base64' })
		const data = res && typeof res === 'object' && 'data' in res ? res.data : res
		if (typeof data === 'string' && data.length) {
			return base64ToArrayBuffer(data)
		}
	} catch (_) {}
	return null
}

/**
 * 读取跟读/测试录音临时文件（与 InnerAudio 播放不是同一条路）
 */
async function readRecorderTempAsArrayBuffer(filePath) {
	const fs = getUniFileSystemManager()

	// App 无 getFileSystemManager：仅用 plus.io（可解析 _doc 逻辑路径）
	if (!fs) {
		if (typeof plus === 'undefined' || !plus.io?.resolveLocalFileSystemURL) {
			throw new Error('plus.io unavailable (no getFileSystemManager)')
		}
		return readViaPlusIoAllUrls(filePath)
	}

	const paths = buildRecorderReadPaths(filePath)
	let lastErr = null
	for (const p of paths) {
		try {
			const syncBuf = tryReadUniFsSyncBase64(fs, p)
			if (syncBuf?.byteLength) {
				logFollowReadScore('score.decode.read_ok_sync', {
					path: p.slice(0, 80),
					bytes: syncBuf.byteLength
				})
				return syncBuf
			}
		} catch (e) {
			lastErr = e
		}
		try {
			return await withTimeout(
				readUniFsArrayBuffer(fs, p, { preferBase64: true }),
				PER_PATH_READ_TIMEOUT_MS,
				'uniFsRecorder'
			)
		} catch (e) {
			lastErr = e
			logFollowReadScore('score.decode.read_path_fail', {
				path: p.slice(0, 80),
				err: String(e?.message || e)
			})
		}
	}

	try {
		return await readViaPlusIoAllUrls(filePath)
	} catch (e) {
		lastErr = e
	}
	throw lastErr || new Error('read recorder temp fail')
}

/** 本地路径多种写法（录音 tempFilePath、_doc、file://） */
function expandLocalReadPaths(filePath) {
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
	} else if (/^\//.test(raw)) {
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

function base64ToArrayBuffer(b64) {
	return dataUrlToArrayBuffer(
		b64.includes(',') ? b64 : `data:application/octet-stream;base64,${b64}`
	)
}

function readUniFsArrayBuffer(fs, path, opts = {}) {
	const preferBase64 = opts.preferBase64 === true
	return new Promise((resolve, reject) => {
		const onBase64 = (res) => {
			try {
				resolve(base64ToArrayBuffer(String(res?.data || '')))
			} catch (e) {
				reject(e)
			}
		}
		const onArrayBuffer = (res) => {
			const data = res?.data
			if (data instanceof ArrayBuffer) {
				resolve(data)
				return
			}
			if (typeof data === 'string' && data.length) {
				try {
					resolve(base64ToArrayBuffer(data))
				} catch (e) {
					reject(e)
				}
				return
			}
			reject(new Error('readFile not arraybuffer'))
		}
		if (preferBase64) {
			fs.readFile({
				filePath: path,
				encoding: 'base64',
				success: onBase64,
				fail: (err) => reject(err || new Error('readFile base64 fail'))
			})
			return
		}
		fs.readFile({
			filePath: path,
			success: onArrayBuffer,
			fail: () => {
				fs.readFile({
					filePath: path,
					encoding: 'base64',
					success: onBase64,
					fail: (err) => reject(err || new Error('readFile fail'))
				})
			}
		})
	})
}

/** 多路读取竞速：谁先成功用谁（避免单路 readFile 挂死占满总超时） */
function readFirstOk(readers) {
	if (!readers.length) return Promise.reject(new Error('no readers'))
	return new Promise((resolve, reject) => {
		let pending = readers.length
		let lastErr = null
		readers.forEach((fn) => {
			Promise.resolve()
				.then(fn)
				.then(resolve)
				.catch((e) => {
					lastErr = e
					pending -= 1
					if (pending <= 0) reject(lastErr || new Error('read fail'))
				})
		})
	})
}

async function readOneLocalPath(path) {
	const p = String(path || '').trim()
	if (!p) throw new Error('empty path')
	if (isRecorderTempPath(p)) {
		return readRecorderTempAsArrayBuffer(p)
	}
	if (mustUsePlusIoForLocalFiles()) {
		return readViaPlusIoAllUrls(p)
	}
	const readers = []
	const fs = getUniFileSystemManager()
	const preferBase64 = isAppPlus()

	if (fs) {
		readers.push(() =>
			withTimeout(
				readUniFsArrayBuffer(fs, p, { preferBase64 }),
				PER_PATH_READ_TIMEOUT_MS,
				'uniFs'
			)
		)
	}
	if (typeof plus !== 'undefined' && plus.io?.resolveLocalFileSystemURL) {
		readers.push(() =>
			withTimeout(readPlusIoFileAsArrayBuffer(p), PER_PATH_READ_TIMEOUT_MS, 'plusIo')
		)
	}
	if (!readers.length) throw new Error('no filesystem')
	return readFirstOk(readers)
}

/** H5 录音常返回 blob: / http(s): 临时地址 */
async function readHttpOrBlobAsArrayBuffer(url) {
	const u = String(url || '').trim()
	if (!u || !/^(https?:|blob:)/i.test(u)) {
		throw new Error('not http/blob url')
	}
	if (typeof fetch !== 'function') {
		throw new Error('fetch unavailable')
	}
	const res = await fetch(u)
	if (!res.ok) {
		throw new Error(`fetch ${res.status}`)
	}
	return res.arrayBuffer()
}

function dataUrlToArrayBuffer(dataUrl) {
	const s = String(dataUrl || '')
	const i = s.indexOf(',')
	const b64 = i >= 0 ? s.slice(i + 1) : s
	// #ifdef APP-PLUS
	if (typeof plus !== 'undefined' && plus.base64?.decode) {
		const bin = plus.base64.decode(b64)
		const buf = new ArrayBuffer(bin.length)
		const view = new Uint8Array(buf)
		for (let j = 0; j < bin.length; j++) view[j] = bin.charCodeAt(j) & 0xff
		return buf
	}
	// #endif
	if (typeof atob === 'function') {
		const bin = atob(b64)
		const buf = new ArrayBuffer(bin.length)
		const view = new Uint8Array(buf)
		for (let j = 0; j < bin.length; j++) view[j] = bin.charCodeAt(j) & 0xff
		return buf
	}
	throw new Error('base64 decode unavailable')
}

/** plus.io 可尝试的 URL（含 _doc 逻辑路径与 convert 后的绝对路径） */
function buildPlusIoReadUrls(filePath) {
	const raw = String(filePath || '').trim()
	const out = []
	const push = (u) => {
		const s = String(u || '').trim()
		if (s && out.indexOf(s) === -1) out.push(s)
	}
	push(raw)
	if (/^file:\/\//i.test(raw)) {
		push(stripFileScheme(raw))
	}
	try {
		if (typeof plus !== 'undefined' && plus.io?.convertLocalFileSystemURL) {
			const converted = plus.io.convertLocalFileSystemURL(raw)
			push(converted)
			const stripped = stripFileScheme(converted)
			push(stripped)
			if (stripped && !/^file:\/\//i.test(stripped)) {
				push(`file://${stripped}`)
			}
		}
	} catch (_) {}
	return out
}

function readPlusIoFileAsArrayBuffer(inputPath) {
	return new Promise((resolve, reject) => {
		if (typeof plus === 'undefined' || !plus.io?.resolveLocalFileSystemURL) {
			reject(new Error('plus.io unavailable'))
			return
		}
		const url = String(inputPath || '').trim()
		plus.io.resolveLocalFileSystemURL(
			url,
			(entry) => {
				entry.file(
					(file) => {
						const reader = new plus.io.FileReader()
						reader.onloadend = (evt) => {
							try {
								const r = evt?.target?.result
								if (r instanceof ArrayBuffer && r.byteLength) {
									resolve(r)
									return
								}
								if (typeof r === 'string' && r.length) {
									resolve(dataUrlToArrayBuffer(r))
									return
								}
								reject(new Error('plus.io read empty'))
							} catch (e) {
								reject(e)
							}
						}
						reader.onerror = () => reject(new Error('plus.io read error'))
						// App 上 readAsDataURL 比 readAsArrayBuffer 更稳
						if (typeof reader.readAsDataURL === 'function') {
							reader.readAsDataURL(file)
						} else if (typeof reader.readAsArrayBuffer === 'function') {
							reader.readAsArrayBuffer(file)
						} else {
							reject(new Error('plus.io FileReader unsupported'))
						}
					},
					(err) => reject(err || new Error('entry.file fail'))
				)
			},
			(err) => reject(err || new Error(`resolveLocalFileSystemURL fail: ${url.slice(0, 64)}`))
		)
	})
}

async function statRecorderFileBytes(filePath) {
	if (typeof plus === 'undefined' || !plus.io?.resolveLocalFileSystemURL) return 0
	const raw = String(filePath || '').trim()
	let url = raw
	try {
		if (plus.io.convertLocalFileSystemURL) {
			url = plus.io.convertLocalFileSystemURL(raw)
		}
	} catch (_) {}
	return new Promise((resolve) => {
		plus.io.resolveLocalFileSystemURL(
			url,
			(entry) => {
				entry.file(
					(file) => resolve(Number(file?.size) || 0),
					() => resolve(0)
				)
			},
			() => resolve(0)
		)
	})
}

/** App 录音文件落盘可能晚于 onStop，轮询至体积合理再 readFile */
async function waitRecorderFileFlush(filePath, recordDurationMs = 0) {
	if (!isAppPlus() || !isRecorderTempPath(filePath)) return 0
	const dur = Math.max(0, Number(recordDurationMs) || 0)
	const targetBytes = Math.max(
		4000,
		Math.floor((dur / 1000) * PINYIN_PCM_SAMPLE_RATE * 2 * 0.35)
	)
	let lastSize = 0
	for (let i = 0; i < APP_RECORD_FILE_POLL_MAX; i++) {
		const size = await statRecorderFileBytes(filePath)
		lastSize = size
		if (size >= targetBytes) {
			logFollowReadScore('score.decode.file_ready', {
				bytes: size,
				targetBytes,
				polls: i + 1,
				recordDurationMs: dur
			})
			return size
		}
		await new Promise((r) => setTimeout(r, APP_RECORD_FILE_POLL_MS))
	}
	if (lastSize > 0) {
		logFollowReadScore('score.decode.file_poll_partial', {
			bytes: lastSize,
			targetBytes,
			recordDurationMs: dur
		})
	}
	return lastSize
}

async function readViaPlusIoAllUrls(filePath) {
	const urls = buildPlusIoReadUrls(filePath)
	if (!urls.length) throw new Error('empty path for plus.io')
	let lastErr = null
	for (const url of urls) {
		try {
			const buf = await withTimeout(
				readPlusIoFileAsArrayBuffer(url),
				PER_PATH_READ_TIMEOUT_MS,
				'plusIo'
			)
			logFollowReadScore('score.decode.read_plus_ok', {
				url: url.slice(0, 80),
				bytes: buf?.byteLength || 0
			})
			return buf
		} catch (e) {
			lastErr = e
			logFollowReadScore('score.decode.read_plus_fail', {
				url: url.slice(0, 80),
				err: String(e?.message || e)
			})
		}
	}
	throw lastErr || new Error('plus.io read all urls fail')
}

/**
 * 读取本地文件（录音临时文件、App static 等）
 * App 端无 getFileSystemManager，走 plus.io。
 * @param {string} filePath
 * @returns {Promise<ArrayBuffer>}
 */
export async function readFileAsArrayBuffer(filePath) {
	const raw = String(filePath || '').trim()
	if (!raw) throw new Error('empty path')
	if (isRecorderTempPath(raw)) {
		return readRecorderTempAsArrayBuffer(raw)
	}

	const paths = expandLocalReadPaths(filePath).slice(0, MAX_READ_PATH_ATTEMPTS)
	if (!paths.length) throw new Error('empty path')

	let lastErr = null
	for (const p of paths) {
		if (/^(https?:|blob:)/i.test(p)) {
			try {
				return await withTimeout(
					readHttpOrBlobAsArrayBuffer(p),
					PER_PATH_READ_TIMEOUT_MS,
					'http'
				)
			} catch (e) {
				lastErr = e
			}
			continue
		}
		try {
			return await readOneLocalPath(p)
		} catch (e) {
			lastErr = e
		}
	}

	throw lastErr || new Error('readFile fail')
}

/** App 打包 static 资源读入 */
export async function readAppStaticAsArrayBuffer(webPath) {
	const paths = []
	// #ifdef APP-PLUS
	const abs = resolveAppStaticAbsoluteUrl(webPath)
	const logical = webPath.startsWith('/static/') ? '_www' + webPath : webPath
	paths.push(abs, logical, webPath.replace(/^\//, ''))
	// #endif
	paths.push(webPath)

	let lastErr = null
	for (const p of paths) {
		if (!p) continue
		try {
			return await readFileAsArrayBuffer(p)
		} catch (e) {
			lastErr = e
		}
		// #ifdef APP-PLUS
		try {
			return await readPlusIoFileAsArrayBuffer(p)
		} catch (e2) {
			lastErr = e2
		}
		// #endif
	}
	throw lastErr || new Error('read static fail')
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} [hint] pcm | mp3 | opus
 * @returns {Promise<{ samples: Float32Array, sampleRate: number }>}
 */
export async function decodeArrayBufferToMono(arrayBuffer, hint = '') {
	if (!arrayBuffer?.byteLength) {
		throw new Error('empty audio')
	}

	const h = inferRecordingAudioHint(hint)
	if (h === 'pcm' || h === 'wav') {
		return decodePcmOrWavToMono(arrayBuffer, PINYIN_PCM_SAMPLE_RATE)
	}

	const ctx = getAudioContext()
	if (!ctx) {
		throw new Error('AudioContext unavailable')
	}
	try {
		logFollowReadScore('score.decode.audiocontext_start', {
			bytes: arrayBuffer.byteLength,
			hint: h
		})
		if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
			try {
				await ctx.resume()
			} catch (_) {}
		}
		const audioBuffer = await withTimeout(
			new Promise((resolve, reject) => {
				const copy = arrayBuffer.slice(0)
				ctx.decodeAudioData(
					copy,
					(buf) => resolve(buf),
					(err) => reject(err || new Error('decodeAudioData fail'))
				)
			}),
			DECODE_AUDIO_TIMEOUT_MS,
			'decodeAudioData'
		)
		const ch0 = audioBuffer.getChannelData(0)
		const samples = resampleMono(ch0, audioBuffer.sampleRate, PINYIN_PCM_SAMPLE_RATE)
		try {
			ctx.close()
		} catch (_) {}
		return { samples, sampleRate: PINYIN_PCM_SAMPLE_RATE }
	} catch (e) {
		try {
			ctx.close()
		} catch (_) {}
		throw e
	}
}

/**
 * @param {string} filePath 录音临时路径
 * @param {string} [format] recorder format
 */
/**
 * 跟读评分专用：pcm 直读 Int16 → MFCC，mp3 才走 AudioContext
 * @returns {Promise<{ samples?: Float32Array, int16?: Int16Array, sampleRate: number, decodePath: 'pcm'|'compressed' }>}
 */
const MIN_PCM_SAMPLES_FOR_SCORE = PINYIN_RECORD_MIN_PCM_SAMPLES
const MIN_FRAME_BUFFER_BYTES = PINYIN_RECORD_MIN_PCM_BYTES

/**
 * 将已读入的 ArrayBuffer（或录音帧合并）解析为评分用 PCM
 * @returns {{ int16?: Int16Array, samples?: Float32Array, sampleRate: number, decodePath: string, sniff?: string }}
 */
export function decodePcmBufferForFeature(arrayBuffer, format = 'wav') {
	if (!arrayBuffer?.byteLength) {
		const e = new Error('empty pcm buffer')
		e.failureStage = 'empty_buffer'
		throw e
	}
	const buf = arrayBuffer
	const hint = inferRecordingAudioHint(format, '')
	const sniff = sniffRecordingAudioKind(buf)

	let pcmErr = null
	if (sniff === 'wav' || sniff === 'pcm_raw' || isPcmLikeRecording(format, '')) {
		try {
			const pcmKind = sniff === 'pcm_raw' ? 'pcm_raw' : 'wav'
			const { int16, samples, sampleRate } = decodePcmLikeToInt16(buf, pcmKind, PINYIN_PCM_SAMPLE_RATE)
			if (int16.length >= MIN_PCM_SAMPLES_FOR_SCORE) {
				return { int16, samples, sampleRate, decodePath: 'pcm', sniff: pcmKind }
			}
			pcmErr = new Error(`pcm too few samples: ${int16.length}`)
		} catch (e) {
			pcmErr = e
		}
	}

	if (sniff === 'mp3' || sniff === 'aac' || pcmErr) {
		throw pcmErr || new Error(`unsupported frame buffer sniff: ${sniff}`)
	}

	throw pcmErr || new Error('decode pcm buffer failed')
}

/**
 * 跟读评分：优先录音帧内存 PCM（App），失败再读临时文件
 * @param {string} filePath
 * @param {string} [format]
 * @param {{ recordPcmBuffer?: ArrayBuffer, recordDurationMs?: number }} [options]
 */
export async function decodeUserRecordingForScore(filePath, format = 'pcm', options = {}) {
	const recordDurationMs = Number(options.recordDurationMs) || 0
	const frameBuf = options.recordPcmBuffer

	let frameDecoded = null
	if (frameBuf?.byteLength >= MIN_FRAME_BUFFER_BYTES) {
		try {
			frameDecoded = decodePcmBufferForFeature(frameBuf, format)
			logFollowReadScore('score.decode.frames_ok', {
				bytes: frameBuf.byteLength,
				decodePath: frameDecoded.decodePath,
				samples: frameDecoded.int16?.length || frameDecoded.samples?.length || 0,
				sniff: frameDecoded.sniff
			})
		} catch (e) {
			logFollowReadScore('score.decode.frames_fail', {
				bytes: frameBuf.byteLength,
				err: String(e?.message || e),
				note: '将回退 readFile'
			})
		}
	} else if (frameBuf?.byteLength) {
		logFollowReadScore('score.decode.frames_too_short', {
			bytes: frameBuf.byteLength,
			minBytes: MIN_FRAME_BUFFER_BYTES
		})
	}

	const frameSamples =
		frameDecoded?.int16?.length || frameDecoded?.samples?.length || 0
	if (frameSamples >= MIN_PCM_SAMPLES_FOR_SCORE) {
		logFollowReadScore('score.decode.use_frames_only', {
			frameSamples,
			bytes: frameBuf?.byteLength || 0,
			note: 'Recorder-UniCore PCM 流无临时文件'
		})
		return frameDecoded
	}

	const path = String(filePath || '').trim()
	if (!path) {
		if (frameDecoded) return frameDecoded
		const e = new Error('empty record path')
		e.failureStage = 'empty_path'
		throw e
	}

	let fileDecoded
	try {
		fileDecoded = await decodeRecordingForFeature(path, format, { recordDurationMs })
	} catch (e) {
		if (frameDecoded) {
			logFollowReadScore('score.decode.file_fail_use_frames', {
				err: String(e?.message || e),
				frameSamples
			})
			return frameDecoded
		}
		throw e
	}

	const fileSamples = fileDecoded?.int16?.length || fileDecoded?.samples?.length || 0
	if (frameSamples > fileSamples) {
		logFollowReadScore('score.decode.prefer_frames', {
			frameSamples,
			fileSamples
		})
		return frameDecoded
	}
	if (fileSamples > 0) return fileDecoded
	return frameDecoded
}

export async function decodeRecordingForFeature(filePath, format = 'pcm', options = {}) {
	const pathShort = String(filePath || '').slice(0, 96)
	if (!String(filePath || '').trim()) {
		throw new Error('empty record path')
	}
	const hint = inferRecordingAudioHint(format, filePath)

	logFollowReadScore('score.decode.read_start', {
		format,
		hint,
		tempFilePath: pathShort,
		isAppPlus: isAppPlus()
	})

	const recordDurationMs = Number(options.recordDurationMs) || 0

	if (isAppPlus()) {
		await new Promise((r) => setTimeout(r, APP_RECORD_READ_SETTLE_MS))
		if (recordDurationMs > 0) {
			await waitRecorderFileFlush(filePath, recordDurationMs)
		}
	}

	let buf
	let lastReadErr = null
	for (let attempt = 0; attempt < 2; attempt++) {
		if (attempt > 0) {
			await new Promise((r) => setTimeout(r, RECORD_READ_RETRY_DELAY_MS))
			logFollowReadScore('score.decode.read_retry', {
				attempt,
				tempFilePath: pathShort
			})
		}
		try {
			buf = await withTimeout(
				readFileAsArrayBuffer(filePath),
				DECODE_READ_TIMEOUT_MS,
				'readRecordingFile'
			)
			lastReadErr = null
			break
		} catch (e) {
			lastReadErr = e
		}
	}
	if (lastReadErr) {
		if (!lastReadErr.failureStage) lastReadErr.failureStage = 'read_file'
		logFollowReadScore('score.decode.read_fail', {
			tempFilePath: pathShort,
			err: String(lastReadErr?.message || lastReadErr),
			failureStage: lastReadErr.failureStage,
			note: '评分需 readFile 读入；录音测试仅 InnerAudio 播路径，二者不同'
		})
		throw lastReadErr
	}

	const sniff = sniffRecordingAudioKind(buf)
	logFollowReadScore('score.decode.read_ok', {
		bytes: buf?.byteLength || 0,
		hint,
		sniff
	})

	try {
		const out = decodePcmBufferForFeature(buf, format)
		logFollowReadScore('score.decode.pcm_ok', {
			samples: out.int16?.length || out.samples?.length || 0,
			sampleRate: out.sampleRate,
			sniff: out.sniff,
			decodePath: out.decodePath
		})
		return out
	} catch (pcmErr) {
		logFollowReadScore('score.decode.pcm_try_fail', {
			sniff,
			err: String(pcmErr?.message || pcmErr)
		})
		if (sniff === 'mp3' || sniff === 'aac') {
			try {
				const mono = await decodeArrayBufferToMono(buf, sniff === 'aac' ? 'aac' : 'mp3')
				if (mono.samples?.length >= MIN_PCM_SAMPLES_FOR_SCORE) {
					logFollowReadScore('score.decode.compressed_ok', {
						samples: mono.samples.length,
						sampleRate: mono.sampleRate,
						sniff
					})
					return {
						samples: mono.samples,
						sampleRate: mono.sampleRate,
						decodePath: 'compressed',
						sniff
					}
				}
			} catch (e) {
				logFollowReadScore('score.decode.compressed_fail', {
					sniff,
					err: String(e?.message || e)
				})
				throw pcmErr || e
			}
		}
		const e = pcmErr || new Error('decode recording failed')
		e.failureStage = e.failureStage || 'pcm_parse'
		throw e
	}
}

export async function decodeRecordingToMono(filePath, format = 'mp3') {
	const pathShort = String(filePath || '').slice(0, 96)
	const hint = inferRecordingAudioHint(format, filePath)
	logFollowReadScore('score.decode.read_start', {
		format,
		hint,
		tempFilePath: pathShort,
		isAppPlus: isAppPlus()
	})

	if (isAppPlus()) {
		await new Promise((r) => setTimeout(r, APP_RECORD_READ_SETTLE_MS))
	}

	let buf
	try {
		buf = await withTimeout(
			readFileAsArrayBuffer(filePath),
			DECODE_READ_TIMEOUT_MS,
			'readRecordingFile'
		)
	} catch (e) {
		logFollowReadScore('score.decode.read_fail', {
			tempFilePath: pathShort,
			err: String(e?.message || e)
		})
		throw e
	}
	logFollowReadScore('score.decode.read_ok', {
		bytes: buf?.byteLength || 0,
		hint
	})
	if (hint === 'pcm' || hint === 'wav') {
		const out = decodePcmOrWavToMono(buf, PINYIN_PCM_SAMPLE_RATE)
		logFollowReadScore('score.decode.pcm_ok', {
			samples: out.samples?.length || 0,
			sampleRate: out.sampleRate
		})
		return out
	}
	const out = await decodeArrayBufferToMono(buf, hint)
	logFollowReadScore('score.decode.compressed_ok', {
		samples: out.samples?.length || 0,
		sampleRate: out.sampleRate,
		hint
	})
	return out
}

export function clearReferenceMfccCache() {
	refMfccCache.clear()
}

/**
 * 示范音 MFCC 特征（预提取 JSON → 内存缓存 → 现场解码兜底，仅 App）
 * @param {string} symbol
 */
export async function getReferenceMfccFeature(symbol) {
	const key = String(symbol || '').trim()
	if (!key) throw new Error('no symbol')
	// #ifndef APP-PLUS
	throw new Error('reference mfcc 仅支持 App')
	// #endif
	// #ifdef APP-PLUS
	if (refMfccCache.has(key)) return refMfccCache.get(key)

	for (const stem of stemsForSymbol(key)) {
		const entry = prebuiltMfccFingerprints?.[stem]
		const pre = deserializeMfccEntry(entry)
		if (pre?.frames?.length) {
			refMfccCache.set(key, pre)
			return pre
		}
	}

	const tryPaths = []
	const neutral = getLocalPinyinAudioPath(key)
	const tone1 = getLocalPinyinTone1AudioPath(key)
	if (neutral) tryPaths.push(neutral)
	if (tone1 && tone1 !== neutral) tryPaths.push(tone1)

	let lastErr = null
	for (const webPath of tryPaths) {
		try {
			const buf = await readAppStaticAsArrayBuffer(webPath)
			const { samples, sampleRate } = await decodeArrayBufferToMono(buf, webPath)
			const feat = extractMfccFromFloat32(samples, sampleRate)
			if (feat?.frames?.length) {
				refMfccCache.set(key, feat)
				return feat
			}
		} catch (e) {
			lastErr = e
			console.warn('[pinyin-follow] ref mfcc decode', webPath, e)
		}
	}
	throw lastErr || new Error('reference mfcc unavailable')
	// #endif
}
