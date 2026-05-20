/**
 * App 端实时 PCM 录音封装（uni_modules/wxz-record）。
 * 直接回调 ArrayBuffer + 分贝，供跟读 VAD / MFCC 评分。
 */
import { isAppPlus } from '@/utils/pinyin-follow-read-platform.js'
import {
	PINYIN_RECORD_PCM_SAMPLE_RATE,
	PINYIN_RECORD_WXZ_FRAME_BYTES
} from '@/constants/pinyin-audio-sample-rate.js'
import {
	countWxzRecordOnFrame,
	printWxzRecordFrameSummary,
	resetWxzRecordFrameLog
} from '@/utils/wxz-record-frame-log.js'

// #ifdef APP-PLUS
import { startRecord, stopRecord } from '@/uni_modules/wxz-record'
// #endif

const DEFAULT_SAMPLE_RATE = PINYIN_RECORD_PCM_SAMPLE_RATE
/** 约 40ms/次配置帧；Android 实际 read 约 frameSize×2 字节 */
const DEFAULT_FRAME_SIZE = PINYIN_RECORD_WXZ_FRAME_BYTES

let streamRunning = false
let activeLogSource = 'follow-read'
/** @type {((durationMs: number) => void)|null} */
let pendingStopResolve = null

function mapRecordFail(err) {
	const code = err?.errCode ?? err?.code
	const msg =
		err?.errMsg ||
		err?.message ||
		(code === 9010001 ? '录音权限被拒绝' : '录音失败')
	return { errMsg: String(msg), code: code ?? 9010005 }
}

export function isPcmRealtimeAvailable() {
	// #ifdef APP-PLUS
	try {
		return isAppPlus() && typeof startRecord === 'function'
	} catch (_) {
		return false
	}
	// #endif
	// #ifndef APP-PLUS
	return false
	// #endif
}

/** wxz-record 在 startRecord.fail 中返回 9010001；系统权限仍由业务 requestMicPermission 申请 */
export function getPcmRealtimePermissionStatus() {
	if (!isPcmRealtimeAvailable()) return 'unsupported'
	return 'granted'
}

export function requestPcmRealtimePermission() {
	if (!isPcmRealtimeAvailable()) {
		return Promise.resolve({ ok: false, message: 'wxz-record 未集成' })
	}
	return Promise.resolve({ ok: true })
}

/**
 * @param {object} options
 * @param {number} [options.sampleRate]
 * @param {number} [options.frameSize]
 * @param {(pcmBuffer: ArrayBuffer, meta: { decibel?: number }) => void} options.onFrame
 * @param {() => void} [options.onStart]
 * @param {(err: object) => void} [options.onError]
 * @param {string} [options.logSource]
 * @returns {Promise<void>}
 */
export function startPcmRealtimeCapture(options = {}) {
	// #ifdef APP-PLUS
	if (!isPcmRealtimeAvailable()) {
		return Promise.reject(new Error('wxz-record 不可用，请安装 uni_modules/wxz-record'))
	}
	if (streamRunning) {
		return Promise.reject(new Error('录音流已在运行'))
	}
	const onFrame = options.onFrame
	const sampleRate = options.sampleRate || DEFAULT_SAMPLE_RATE
	const frameSize = options.frameSize || DEFAULT_FRAME_SIZE
	activeLogSource = options.logSource || 'follow-read'
	resetWxzRecordFrameLog(activeLogSource, { sampleRate, frameBytes: frameSize })
	return new Promise((resolve, reject) => {
		startRecord({
			config: {
				sampleRate,
				channels: 1,
				bitsPerSample: 16,
				frameSize
			},
			onFrame: (data, decibel) => {
				if (!countWxzRecordOnFrame(data, decibel, activeLogSource)) return
				onFrame?.(data, { decibel })
			},
			success: () => {
				streamRunning = true
				options.onStart?.()
				resolve()
			},
			fail: (err) => {
				const mapped = mapRecordFail(err)
				options.onError?.(mapped)
				reject(new Error(mapped.errMsg))
			}
		})
	})
	// #endif
	// #ifndef APP-PLUS
	return Promise.reject(new Error('wxz-record 仅支持 App'))
	// #endif
}

/**
 * @returns {Promise<{ durationMs: number }>}
 */
export function stopPcmRealtimeCapture() {
	// #ifdef APP-PLUS
	if (!streamRunning) {
		return Promise.resolve({ durationMs: 0 })
	}
	return new Promise((resolve) => {
		pendingStopResolve = resolve
		stopRecord({
			success: (res) => {
				streamRunning = false
				const durationMs = Number(res?.duration) || 0
				printWxzRecordFrameSummary(activeLogSource, {
					pluginDurationMs: durationMs
				})
				pendingStopResolve = null
				resolve({ durationMs })
			},
			fail: (err) => {
				streamRunning = false
				printWxzRecordFrameSummary(activeLogSource, { stopFail: true, err })
				pendingStopResolve = null
				resolve({ durationMs: 0 })
			}
		})
	})
	// #endif
	// #ifndef APP-PLUS
	return Promise.resolve({ durationMs: 0 })
	// #endif
}

export function isPcmRealtimeStreamRunning() {
	return streamRunning
}
