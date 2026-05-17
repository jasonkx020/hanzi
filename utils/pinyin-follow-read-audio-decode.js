/**
 * 读取并解码本地音频为单声道 PCM（Web Audio / 原始 PCM 文件）。
 */
import { resolveAppStaticAbsoluteUrl } from '@/utils/resolve-app-static-url.js'
import {
	extractPcmFingerprint,
	FOLLOW_READ_TARGET_SR,
	resampleMono
} from '@/utils/pinyin-follow-read-audio-features.js'
import {
	getLocalPinyinAudioPath,
	getLocalPinyinTone1AudioPath
} from '@/utils/play-pinyin-local-audio.js'
import prebuiltFingerprints from '@/data/pinyin-audio-fingerprints.json'

const refFingerprintCache = new Map()

function fingerprintFromPrebuilt(stem) {
	const entry = prebuiltFingerprints?.[stem]
	if (!entry?.e?.length) return null
	return {
		env: Float32Array.from(entry.e),
		bands: Float32Array.from(entry.b || []),
		durationMs: Number(entry.d) || 0,
		voicedRatio: 1
	}
}

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

function readUniFsArrayBuffer(fs, path) {
	return new Promise((resolve, reject) => {
		fs.readFile({
			filePath: path,
			success: (res) => {
				const data = res?.data
				if (data instanceof ArrayBuffer) resolve(data)
				else reject(new Error('readFile not arraybuffer'))
			},
			fail: (err) => reject(err || new Error('readFile fail'))
		})
	})
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

function readPlusIoFileAsArrayBuffer(absPath) {
	return new Promise((resolve, reject) => {
		if (typeof plus === 'undefined' || !plus.io?.resolveLocalFileSystemURL) {
			reject(new Error('plus.io unavailable'))
			return
		}
		plus.io.resolveLocalFileSystemURL(
			absPath,
			(entry) => {
				entry.file(
					(file) => {
						const reader = new plus.io.FileReader()
						reader.onloadend = (evt) => {
							try {
								const r = evt?.target?.result
								if (r instanceof ArrayBuffer) {
									resolve(r)
									return
								}
								if (typeof r === 'string' && r.indexOf('base64') >= 0) {
									resolve(dataUrlToArrayBuffer(r))
									return
								}
								reject(new Error('plus.io read not arraybuffer'))
							} catch (e) {
								reject(e)
							}
						}
						reader.onerror = () => reject(new Error('plus.io read error'))
						if (typeof reader.readAsArrayBuffer === 'function') {
							reader.readAsArrayBuffer(file)
						} else {
							reader.readAsDataURL(file)
						}
					},
					(err) => reject(err || new Error('entry.file fail'))
				)
			},
			(err) => reject(err || new Error('resolveLocalFileSystemURL fail'))
		)
	})
}

/**
 * 读取本地文件（录音临时文件、App static 等）
 * App 端无 getFileSystemManager，走 plus.io。
 * @param {string} filePath
 * @returns {Promise<ArrayBuffer>}
 */
export async function readFileAsArrayBuffer(filePath) {
	const paths = expandLocalReadPaths(filePath)
	if (!paths.length) throw new Error('empty path')

	let lastErr = null
	const fs = typeof uni !== 'undefined' ? uni.getFileSystemManager?.() : null
	if (fs) {
		for (const p of paths) {
			try {
				return await readUniFsArrayBuffer(fs, p)
			} catch (e) {
				lastErr = e
			}
		}
	}

	if (typeof plus !== 'undefined' && plus.io?.resolveLocalFileSystemURL) {
		for (const p of paths) {
			try {
				return await readPlusIoFileAsArrayBuffer(p)
			} catch (e) {
				lastErr = e
			}
		}
	}

	throw lastErr || new Error(fs ? 'readFile fail' : 'no filesystem')
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

	const h = String(hint || '').toLowerCase()
	if (h === 'pcm' || h.endsWith('.pcm')) {
		const int16 = new Int16Array(arrayBuffer)
		const samples = new Float32Array(int16.length)
		for (let i = 0; i < int16.length; i++) samples[i] = int16[i] / 32768
		return { samples, sampleRate: FOLLOW_READ_TARGET_SR }
	}

	const ctx = getAudioContext()
	if (!ctx) {
		throw new Error('AudioContext unavailable')
	}
	try {
		const audioBuffer = await new Promise((resolve, reject) => {
			const copy = arrayBuffer.slice(0)
			ctx.decodeAudioData(
				copy,
				(buf) => resolve(buf),
				(err) => reject(err || new Error('decodeAudioData fail'))
			)
		})
		const ch0 = audioBuffer.getChannelData(0)
		const samples = resampleMono(ch0, audioBuffer.sampleRate, FOLLOW_READ_TARGET_SR)
		try {
			ctx.close()
		} catch (_) {}
		return { samples, sampleRate: FOLLOW_READ_TARGET_SR }
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
export async function decodeRecordingToMono(filePath, format = 'mp3') {
	const buf = await readFileAsArrayBuffer(filePath)
	return decodeArrayBufferToMono(buf, format)
}

/**
 * 示范音指纹（带内存缓存）
 * @param {string} symbol
 */
export async function getReferenceFingerprint(symbol) {
	const key = String(symbol || '').trim()
	if (!key) throw new Error('no symbol')
	if (refFingerprintCache.has(key)) return refFingerprintCache.get(key)

	for (const stem of stemsForSymbol(key)) {
		const pre = fingerprintFromPrebuilt(stem)
		if (pre) {
			refFingerprintCache.set(key, pre)
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
			const fp = extractPcmFingerprint(samples, sampleRate)
			refFingerprintCache.set(key, fp)
			return fp
		} catch (e) {
			lastErr = e
			console.warn('[pinyin-follow] ref fingerprint decode', webPath, e)
		}
	}
	throw lastErr || new Error('reference audio unavailable')
}

export function clearReferenceFingerprintCache() {
	refFingerprintCache.clear()
}
