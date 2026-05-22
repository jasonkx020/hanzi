/**
 * App 端实时 PCM 录音（Recorder-UniCore / RecordApp）
 * 供跟读 VAD / MFCC 评分；权限由 requestMicPermission 负责
 */
import {
	isRecorderPcmAvailable,
	isRecorderPcmSessionActive,
	invokeRecorderStart,
	invokeRecorderStop,
	invokeRecorderCancel,
	mapRecorderError,
	RECORDER_DEFAULT_PCM_CONFIG
} from '@/utils/recorder-pcm-client.js'

let streamRunning = false

export function isPcmRealtimeAvailable() {
	return isRecorderPcmAvailable()
}

export function getPcmRealtimePermissionStatus() {
	if (!isPcmRealtimeAvailable()) return 'unsupported'
	return 'granted'
}

export function requestPcmRealtimePermission() {
	if (!isPcmRealtimeAvailable()) {
		return Promise.resolve({ ok: false, message: 'Recorder-UniCore 未集成' })
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
 */
export function startPcmRealtimeCapture(options = {}) {
	if (!isPcmRealtimeAvailable()) {
		return Promise.reject(
			new Error('Recorder-UniCore 不可用，请 npm install recorder-core 并在页面挂载 recorder-unicore-host')
		)
	}
	if (streamRunning || isRecorderPcmSessionActive()) {
		return Promise.reject(new Error('录音流已在运行'))
	}

	const logSource = options.logSource || 'follow-read'

	return invokeRecorderStart({
		config: {
			sampleRate: options.sampleRate || RECORDER_DEFAULT_PCM_CONFIG.sampleRate,
			channels: 1,
			bitsPerSample: 16,
			frameSize: options.frameSize || RECORDER_DEFAULT_PCM_CONFIG.frameSize
		},
		logSource,
		onFrame: (chunk, decibel) => {
			options.onFrame?.(chunk, { decibel })
		}
	}).then((res) => {
		if (!res.ok) {
			const mapped = mapRecorderError({ message: res.message, code: res.code })
			options.onError?.(mapped)
			throw new Error(mapped.message)
		}
		streamRunning = true
		options.onStart?.()
	})
}

/**
 * @returns {Promise<{ durationMs: number, diagnostics?: object|null }>}
 */
export function stopPcmRealtimeCapture() {
	if (!streamRunning && !isRecorderPcmSessionActive()) {
		return Promise.resolve({ durationMs: 0, diagnostics: null })
	}
	return invokeRecorderStop({ logSource: 'follow-read' }).then((res) => {
		streamRunning = false
		return {
			durationMs: res.durationMs,
			diagnostics: res.diagnostics
		}
	})
}

export function isPcmRealtimeStreamRunning() {
	return streamRunning || isRecorderPcmSessionActive()
}

/** 页面隐藏时取消录音 */
export function cancelPcmRealtimeCapture() {
	streamRunning = false
	invokeRecorderCancel()
}
