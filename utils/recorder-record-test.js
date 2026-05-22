/**
 * 录音测试页 · Recorder-UniCore 专用控制器
 *
 * 页面须：
 * 1. mounted/onShow 调用 notifyRecorderPageShow(this)
 * 2. .vue 末尾 renderjs 模块 recorderModule + UniRenderjsRegister
 * 3. npm install recorder-core
 */
import { RecordApp } from '@/utils/recorder-unicore-init.js'
import {
	RECORDER_DEFAULT_PCM_CONFIG,
	isRecorderPcmAvailable,
	isRecorderPcmSessionActive,
	invokeRecorderStart,
	invokeRecorderStop,
	invokeRecorderCancel,
	getLastRecorderStopDiagnostics,
	formatRecorderDiagnosticLines,
	formatDecibel,
	ensureRecorderReady,
	notifyRecorderPageShow
} from '@/utils/recorder-pcm-client.js'
import {
	PINYIN_RECORD_CAPTURE_MS,
	PINYIN_RECORD_TARGET_PCM_BYTES,
	PINYIN_RECORD_PCM_SAMPLE_RATE
} from '@/constants/pinyin-audio-sample-rate.js'

export const RECORD_TEST_LOG = 'record-test'
export const RECORD_PCM_CONFIG = RECORDER_DEFAULT_PCM_CONFIG
export {
	formatDecibel,
	formatRecorderDiagnosticLines,
	formatRecorderDiagnosticLines as formatRecorderPluginDiagnosticLines,
	isRecorderPcmAvailable as isRecorderRecordTestAvailable,
	isRecorderPcmAvailable as isRecorderPcmTestAvailable,
	getLastRecorderStopDiagnostics as getLastRecorderPluginDiagnostics,
	notifyRecorderPageShow
}

const MIN_HOLD_MS = PINYIN_RECORD_CAPTURE_MS
const MIN_PCM_BYTES = PINYIN_RECORD_TARGET_PCM_BYTES

/** @param {ArrayBuffer[]} chunks */
function mergePcmChunks(chunks) {
	if (!chunks?.length) return null
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

/** PCM s16le mono → WAV */
export function buildWavFromPcmS16le(pcmBuffer, sampleRate = RECORD_PCM_CONFIG.sampleRate) {
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

function saveWavFile(wavBuffer) {
	return new Promise((resolve) => {
		const name = `hanzi-record-test-${Date.now()}.wav`
		// #ifdef APP-PLUS
		if (typeof RecordApp?.UniSaveLocalFile === 'function') {
			RecordApp.UniSaveLocalFile(
				name,
				wavBuffer,
				(savePath) => resolve({ ok: true, path: savePath }),
				(errMsg) => resolve({ ok: false, path: '', message: String(errMsg || 'UniSaveLocalFile 失败') })
			)
			return
		}
		// #endif
		const fs = typeof uni !== 'undefined' && uni.getFileSystemManager?.()
		if (!fs) {
			resolve({ ok: false, path: '', message: '无文件系统 API' })
			return
		}
		const path = `_doc/${name}`
		fs.writeFile({
			filePath: path,
			data: wavBuffer,
			success: () => resolve({ ok: true, path }),
			fail: (e) => resolve({ ok: false, path: '', message: e?.errMsg || '写入 wav 失败' })
		})
	})
}

/**
 * @param {object} pageVm 当前页面 this（vue2/3）
 */
export function createRecordTestController(pageVm) {
	const state = {
		pageVm,
		ready: false,
		readyMessage: '',
		recording: false,
		startedAt: 0,
		chunks: [],
		frameCount: 0,
		totalBytes: 0,
		lastFrameSize: 0,
		currentDecibel: -Infinity,
		maxDecibel: -Infinity,
		minDecibel: Infinity,
		lastPluginDiagnostics: null,
		lastStartResult: null
	}

	function resetCaptureStats() {
		state.chunks = []
		state.frameCount = 0
		state.totalBytes = 0
		state.lastFrameSize = 0
		state.currentDecibel = -Infinity
		state.maxDecibel = -Infinity
		state.minDecibel = Infinity
		state.lastPluginDiagnostics = null
		state.lastStartResult = null
	}

	function getLiveStats() {
		return {
			recording: state.recording,
			frameCount: state.frameCount,
			totalBytes: state.totalBytes,
			lastFrameSize: state.lastFrameSize,
			currentDecibel: state.currentDecibel,
			maxDecibel: state.maxDecibel,
			minDecibel: state.minDecibel,
			elapsedMs: state.recording ? Date.now() - state.startedAt : 0,
			pluginDiagnostics: state.lastPluginDiagnostics,
			ready: state.ready
		}
	}

	function peekPcmBuffer() {
		return mergePcmChunks(state.chunks)
	}

	return {
		isAvailable: () => isRecorderPcmAvailable(),

		/** 进入页面：绑定 WebView + RecordApp 权限（可重复调用） */
		async warmUp() {
			notifyRecorderPageShow(state.pageVm)
			const res = await ensureRecorderReady(state.pageVm)
			state.ready = !!res.ok
			state.readyMessage = res.ok ? '' : res.message || '录音未就绪'
			return res
		},

		getLiveStats,
		peekPcmBuffer,

		/**
		 * @param {(stats: ReturnType<typeof getLiveStats>) => void} [onLiveStats]
		 */
		async startHold(onLiveStats) {
			if (!isRecorderPcmAvailable()) {
				return {
					ok: false,
					message: '请使用 App 真机，并执行 npm install recorder-core，页面需配置 renderjs'
				}
			}
			if (!state.ready) {
				const warm = await this.warmUp()
				if (!warm.ok) return warm
			}
			if (state.recording || isRecorderPcmSessionActive()) {
				return { ok: false, message: '已在录音中' }
			}

			resetCaptureStats()
			state.recording = true
			state.startedAt = Date.now()

			const res = await invokeRecorderStart({
				pageVm: state.pageVm,
				config: RECORD_PCM_CONFIG,
				logSource: RECORD_TEST_LOG,
				onFrame: (chunk, decibel) => {
					state.chunks.push(chunk)
					state.frameCount++
					state.totalBytes += chunk.byteLength
					state.lastFrameSize = chunk.byteLength
					if (decibel !== -Infinity && decibel !== Infinity && !Number.isNaN(decibel)) {
						state.currentDecibel = decibel
						if (decibel > state.maxDecibel) state.maxDecibel = decibel
						if (decibel < state.minDecibel) state.minDecibel = decibel
					}
					onLiveStats?.(getLiveStats())
				}
			})

			if (!res.ok) {
				state.recording = false
				return res
			}

			state.lastStartResult = res.startResult
			return {
				ok: true,
				recordFormat: 'pcm',
				capture: 'recorder-unicore',
				startResult: res.startResult
			}
		},

		async stopHold() {
			if (!state.recording && !isRecorderPcmSessionActive()) {
				return { ok: false, message: '未在录音中' }
			}

			const heldMs = Date.now() - state.startedAt
			const tooShort = heldMs < MIN_HOLD_MS

			const stopRes = await invokeRecorderStop({
				logSource: RECORD_TEST_LOG,
				pageVm: state.pageVm
			})
			state.recording = false
			state.lastPluginDiagnostics =
				stopRes.diagnostics || getLastRecorderStopDiagnostics()
			state.lastStartResult = stopRes.startResult || state.lastStartResult

			const durationMs = Math.max(heldMs, stopRes.durationMs || 0)
			let pcmBuffer = mergePcmChunks(state.chunks)
			if ((!pcmBuffer || pcmBuffer.byteLength < 2) && stopRes.stopArrayBuffer?.byteLength >= 2) {
				pcmBuffer = stopRes.stopArrayBuffer
			}
			const frameCaptureBytes = pcmBuffer?.byteLength || 0

			if (tooShort) {
				resetCaptureStats()
				return {
					ok: false,
					message: `请按住至少 ${Math.ceil(MIN_HOLD_MS / 1000)} 秒再松开`,
					pluginDiagnostics: state.lastPluginDiagnostics,
					durationMs
				}
			}

			if (frameCaptureBytes < MIN_PCM_BYTES) {
				const nativeHint = state.lastPluginDiagnostics?.message
					? `；${state.lastPluginDiagnostics.message}`
					: ''
				resetCaptureStats()
				return {
					ok: false,
					message: `PCM 过少（${frameCaptureBytes} 字节，目标≥${MIN_PCM_BYTES}）${nativeHint}`,
					pluginDiagnostics: state.lastPluginDiagnostics,
					frameCaptureBytes,
					frameCount: state.frameCount,
					durationMs
				}
			}

			const sampleRate =
				Number(state.lastStartResult?.sampleRate) || RECORD_PCM_CONFIG.sampleRate

			let tempFilePath = ''
			let wavWriteMessage = ''
			if (pcmBuffer) {
				const wav = buildWavFromPcmS16le(pcmBuffer, sampleRate)
				const w = await saveWavFile(wav)
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
				frameCount: state.frameCount,
				totalBytes: state.totalBytes,
				currentDecibel: state.currentDecibel,
				maxDecibel: state.maxDecibel,
				minDecibel: state.minDecibel,
				wavWriteMessage,
				capture: 'recorder-unicore',
				pluginDiagnostics: state.lastPluginDiagnostics,
				startResult: state.lastStartResult,
				sampleRate
			}
			resetCaptureStats()
			return result
		},

		cancel() {
			state.recording = false
			invokeRecorderCancel()
			resetCaptureStats()
		}
	}
}

/** @deprecated 兼容旧 import */
export function getRecorderPcmTestLiveStats() {
	return { recording: false, frameCount: 0, totalBytes: 0 }
}

export async function startRecorderPcmTest(onLiveStats) {
	const pages = getCurrentPages()
	const page = pages[pages.length - 1]
	const pageVm = page?.$vm?.$?.proxy ?? page?.$vm ?? page
	const ctrl = createRecordTestController(pageVm)
	await ctrl.warmUp()
	return ctrl.startHold(onLiveStats)
}

export async function stopRecorderPcmTest() {
	const pages = getCurrentPages()
	const page = pages[pages.length - 1]
	const pageVm = page?.$vm?.$?.proxy ?? page?.$vm ?? page
	const ctrl = createRecordTestController(pageVm)
	return ctrl.stopHold()
}

export function cancelRecorderPcmTest() {
	invokeRecorderCancel()
}

export function peekRecorderPcmTestBuffer() {
	return null
}
