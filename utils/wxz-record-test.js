/**
 * 录音测试页专用：直接调用 uni_modules/wxz-record，与跟读服务隔离状态。
 */
import { isAppPlus } from '@/utils/pinyin-follow-read-platform.js'
import { requestMicPermission } from '@/services/pinyin-follow-read-service.js'
import {
	countWxzRecordOnFrame,
	printWxzRecordFrameSummary,
	resetWxzRecordFrameLog
} from '@/utils/wxz-record-frame-log.js'
import {
	PINYIN_RECORD_PCM_SAMPLE_RATE,
	PINYIN_RECORD_WXZ_FRAME_BYTES,
	PINYIN_RECORD_CAPTURE_MS,
	PINYIN_RECORD_TARGET_PCM_BYTES
} from '@/constants/pinyin-audio-sample-rate.js'

// #ifdef APP-PLUS
import { startRecord, stopRecord } from '@/uni_modules/wxz-record'
// #endif

const SAMPLE_RATE = PINYIN_RECORD_PCM_SAMPLE_RATE
const FRAME_SIZE = PINYIN_RECORD_WXZ_FRAME_BYTES
const MIN_HOLD_MS = PINYIN_RECORD_CAPTURE_MS
const MIN_PCM_BYTES = PINYIN_RECORD_TARGET_PCM_BYTES

let recording = false
let startedAt = 0
/** @type {ArrayBuffer[]} */
let chunks = []
let frameCount = 0
let totalBytes = 0
let lastFrameSize = 0
let currentDecibel = -Infinity
let maxDecibel = -Infinity
let minDecibel = Infinity

function mapFail(err) {
	const code = err?.errCode ?? err?.code
	const msg =
		err?.errMsg ||
		err?.message ||
		(code === 9010001 ? '录音权限被拒绝' : '录音失败')
	return { ok: false, message: String(msg), code }
}

export function isWxzRecordTestAvailable() {
	// #ifdef APP-PLUS
	try {
		return isAppPlus() && typeof startRecord === 'function'
	} catch (_) {
		return false
	}
	// #endif
	return false
}

export function getWxzRecordTestLiveStats() {
	return {
		recording,
		frameCount,
		totalBytes,
		lastFrameSize,
		currentDecibel,
		maxDecibel,
		minDecibel,
		elapsedMs: recording ? Date.now() - startedAt : 0
	}
}

function resetStats() {
	chunks = []
	frameCount = 0
	totalBytes = 0
	lastFrameSize = 0
	currentDecibel = -Infinity
	maxDecibel = -Infinity
	minDecibel = Infinity
}

function mergeChunks() {
	if (!chunks.length) return null
	let total = 0
	for (const c of chunks) total += c.byteLength
	if (total < 1) return null
	const out = new Uint8Array(total)
	let off = 0
	for (const c of chunks) {
		out.set(new Uint8Array(c), off)
		off += c.byteLength
	}
	return out.buffer
}

/** PCM s16le → WAV（44 字节头 + 数据） */
export function buildWavFromPcmS16le(pcmBuffer, sampleRate = SAMPLE_RATE) {
	const pcm = new Uint8Array(pcmBuffer)
	const dataSize = pcm.byteLength
	const buffer = new ArrayBuffer(44 + dataSize)
	const view = new DataView(buffer)
	const writeStr = (offset, str) => {
		for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
	}
	writeStr(0, 'RIFF')
	view.setUint32(4, 36 + dataSize, true)
	writeStr(8, 'WAVE')
	writeStr(12, 'fmt ')
	view.setUint32(16, 16, true)
	view.setUint16(20, 1, true)
	view.setUint16(22, 1, true)
	view.setUint32(24, sampleRate, true)
	view.setUint32(28, sampleRate * 2, true)
	view.setUint16(32, 2, true)
	view.setUint16(34, 16, true)
	writeStr(36, 'data')
	view.setUint32(40, dataSize, true)
	new Uint8Array(buffer, 44).set(pcm)
	return buffer
}

function writeTempWav(wavBuffer) {
	return new Promise((resolve) => {
		const path = `_doc/hanzi-record-test-${Date.now()}.wav`
		const fs = typeof uni !== 'undefined' && uni.getFileSystemManager?.()
		if (!fs) {
			resolve({ ok: false, path: '', message: '无文件系统 API' })
			return
		}
		fs.writeFile({
			filePath: path,
			data: wavBuffer,
			success: () => resolve({ ok: true, path }),
			fail: (e) =>
				resolve({ ok: false, path: '', message: e?.errMsg || '写入 wav 失败' })
		})
	})
}

/**
 * @param {(stats: ReturnType<typeof getWxzRecordTestLiveStats>) => void} [onLiveStats]
 */
export async function startWxzRecordTest(onLiveStats) {
	if (!isWxzRecordTestAvailable()) {
		return { ok: false, message: '请使用 App 并安装 uni_modules/wxz-record' }
	}
	if (recording) {
		return { ok: false, message: '已在录音中' }
	}
	const perm = await requestMicPermission()
	if (!perm.ok) return perm

	resetStats()
	resetWxzRecordFrameLog('record-test')
	recording = true
	startedAt = Date.now()

	// #ifdef APP-PLUS
	return new Promise((resolve) => {
		startRecord({
			config: {
				sampleRate: SAMPLE_RATE,
				channels: 1,
				bitsPerSample: 16,
				frameSize: FRAME_SIZE
			},
			onFrame: (data, decibel) => {
				const hasPcm = countWxzRecordOnFrame(data, decibel, 'record-test')
				if (!hasPcm) return
				try {
					chunks.push(data.slice(0))
				} catch (_) {
					chunks.push(data)
				}
				frameCount++
				totalBytes += data.byteLength
				lastFrameSize = data.byteLength
				if (decibel !== -Infinity && decibel !== Infinity && !Number.isNaN(decibel)) {
					currentDecibel = decibel
					if (decibel > maxDecibel) maxDecibel = decibel
					if (decibel < minDecibel) minDecibel = decibel
				}
				onLiveStats?.(getWxzRecordTestLiveStats())
			},
			success: () => {
				resolve({ ok: true, recordFormat: 'pcm', capture: 'wxz-record' })
			},
			fail: (err) => {
				recording = false
				resolve(mapFail(err))
			}
		})
	})
	// #endif
	return { ok: false, message: 'wxz-record 仅支持 App' }
}

export async function stopWxzRecordTest() {
	if (!recording) {
		return { ok: false, message: '未在录音中' }
	}
	const heldMs = Date.now() - startedAt
	const tooShort = heldMs < MIN_HOLD_MS

	// #ifdef APP-PLUS
	const pluginDuration = await new Promise((resolve) => {
		stopRecord({
			success: (res) => resolve(Number(res?.duration) || 0),
			fail: () => resolve(0)
		})
	})
	recording = false
	const durationMs = Math.max(heldMs, pluginDuration)
	const pcmBuffer = mergeChunks()
	const frameCaptureBytes = pcmBuffer?.byteLength || 0
	printWxzRecordFrameSummary('record-test', {
		heldMs,
		pluginDuration,
		mergedBytes: frameCaptureBytes,
		chunkCount: chunks.length
	})

	if (tooShort) {
		printWxzRecordFrameSummary('record-test', { reason: 'too_short', heldMs })
		resetStats()
		return {
			ok: false,
			message: `请按住至少 ${Math.ceil(MIN_HOLD_MS / 1000)} 秒再松开`
		}
	}

	if (frameCaptureBytes < MIN_PCM_BYTES) {
		printWxzRecordFrameSummary('record-test', {
			reason: 'pcm_too_small',
			mergedBytes: frameCaptureBytes,
			chunkCount: chunks.length
		})
		resetStats()
		return {
			ok: false,
			message: `录音数据过少（${frameCaptureBytes} 字节），请大声一点或多说一会`
		}
	}

	let tempFilePath = ''
	let wavWriteMessage = ''
	if (pcmBuffer) {
		const wav = buildWavFromPcmS16le(pcmBuffer, SAMPLE_RATE)
		const w = await writeTempWav(wav)
		if (w.ok) tempFilePath = w.path
		else wavWriteMessage = w.message || ''
	}

	const result = {
		ok: true,
		tempFilePath,
		durationMs,
		recordFormat: 'pcm',
		recordPcmBuffer: pcmBuffer,
		frameCaptureBytes,
		frameCount,
		totalBytes,
		currentDecibel,
		maxDecibel,
		minDecibel,
		wavWriteMessage,
		capture: 'wxz-record'
	}
	resetStats()
	return result
	// #endif

	recording = false
	return { ok: false, message: 'wxz-record 仅支持 App' }
}

export function cancelWxzRecordTest() {
	if (!recording) return
	recording = false
	// #ifdef APP-PLUS
	try {
		stopRecord({ success: () => {}, fail: () => {} })
	} catch (_) {}
	// #endif
	resetStats()
}

export function formatDecibel(dB) {
	if (dB === -Infinity || dB === Infinity || Number.isNaN(dB)) return '-∞ dB'
	return `${Number(dB).toFixed(1)} dB`
}
