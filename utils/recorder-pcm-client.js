/**
 * Recorder-UniCore · 实时 PCM 桥接（Promise，供跟读 / 录音测试）
 */
import { isAppPlus } from '@/utils/pinyin-follow-read-platform.js'
import {
	PINYIN_RECORD_PCM_SAMPLE_RATE,
	PINYIN_RECORD_PCM_FRAME_BYTES
} from '@/constants/pinyin-audio-sample-rate.js'
import {
	countRecorderOnFrame,
	printRecorderFrameSummary,
	resetRecorderFrameLog
} from '@/utils/recorder-pcm-frame-log.js'
import { Recorder, RecordApp } from '@/utils/recorder-unicore-init.js'

export const RECORDER_DEFAULT_PCM_CONFIG = {
	sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
	channels: 1,
	bitsPerSample: 16,
	frameSize: PINYIN_RECORD_PCM_FRAME_BYTES
}

/** @deprecated 兼容旧名 */
export const WXZ_DEFAULT_PCM_CONFIG = RECORDER_DEFAULT_PCM_CONFIG

let nativeSessionActive = false
let lastStartResult = null
let lastStopDiagnostics = null
/** @type {object|null} */
let boundPageVm = null
let sampleDataChunk = null

export function bindRecorderPage(vm) {
	if (vm) boundPageVm = vm
}

export function getBoundRecorderPage() {
	return boundPageVm
}

/** Vue2/3 页面实例（RecordApp 要求传页面/组件 this） */
function normalizePageVm(vm) {
	if (vm == null) return null
	if (vm.$ != null && vm.$.proxy != null) return vm.$.proxy
	if (vm.proxy != null) return vm.proxy
	return vm
}

function resolvePageVm() {
	if (boundPageVm) return normalizePageVm(boundPageVm)
	try {
		const pages = getCurrentPages()
		const last = pages[pages.length - 1]
		if (last == null) return null
		return normalizePageVm(last.$vm ?? last)
	} catch (_) {
		return null
	}
}

/**
 * 官方顺序：UniPageOnShow → UniWebViewActivate（RequestPermission / Start 前都要 Activate）
 */
function prepareRecorderSession(vm) {
	// #ifdef APP-PLUS
	const page = normalizePageVm(vm) ?? resolvePageVm()
	if (page == null) {
		return {
			ok: false,
			message: '无法获取当前页面实例，请在页面 mounted/onShow 调用 notifyRecorderPageShow(this)'
		}
	}
	try {
		bindRecorderPage(page)
		RecordApp.UniPageOnShow(page)
		RecordApp.UniWebViewActivate(page)
		return { ok: true, page }
	} catch (e) {
		return { ok: false, message: e?.message || String(e) }
	}
	// #endif
	return { ok: false, message: 'Recorder-UniCore 仅支持 App' }
}

export function notifyRecorderPageShow(vm) {
	prepareRecorderSession(vm)
}

/** 页面进入时：Activate + RecordApp 申请麦克风权限 */
export async function ensureRecorderReady(pageVm, maxWaitMs = 4000) {
	const prep = prepareRecorderSession(pageVm)
	if (!prep.ok) return prep
	return requestRecordPermission(maxWaitMs, pageVm)
}

export function isRecorderPcmAvailable() {
	// #ifdef APP-PLUS
	try {
		return isAppPlus() && typeof RecordApp?.Start === 'function'
	} catch (_) {
		return false
	}
	// #endif
	return false
}

/** @deprecated */
export const isWxzRecordAvailable = isRecorderPcmAvailable

export function isRecorderPcmSessionActive() {
	return nativeSessionActive
}

export const isWxzRecordSessionActive = isRecorderPcmSessionActive

export function getLastRecorderStartResult() {
	return lastStartResult
}

export const getLastWxzStartResult = getLastRecorderStartResult

export function getLastRecorderStopDiagnostics() {
	return lastStopDiagnostics
}

export const getLastWxzStopDiagnostics = getLastRecorderStopDiagnostics

export function mapRecorderError(err) {
	const message = err?.message || err?.errMsg || String(err || '录音失败')
	return { ok: false, message, code: 9010005 }
}

export const mapWxzRecordError = mapRecorderError

export function formatRecorderDiagnosticLines(diag) {
	if (!diag) return []
	const lines = []
	if (diag.message) lines.push(`录音：${diag.message}`)
	if (diag.recordingComplete === false) lines.push('录音：PCM 过少或未收到帧')
	const parts = []
	if (diag.frameCount != null) parts.push(`回调${diag.frameCount}次`)
	if (diag.totalPcmBytes != null) parts.push(`${diag.totalPcmBytes}B`)
	if (parts.length && !diag.message) lines.push(`统计：${parts.join(' · ')}`)
	return lines
}

export const formatWxzDiagnosticLines = formatRecorderDiagnosticLines

function mergeRecordConfig(config = {}) {
	return {
		sampleRate: config.sampleRate ?? RECORDER_DEFAULT_PCM_CONFIG.sampleRate,
		channels: config.channels ?? RECORDER_DEFAULT_PCM_CONFIG.channels,
		bitsPerSample: config.bitsPerSample ?? RECORDER_DEFAULT_PCM_CONFIG.bitsPerSample,
		frameSize: config.frameSize ?? RECORDER_DEFAULT_PCM_CONFIG.frameSize
	}
}

function pcmInt16ToArrayBuffer(pcm) {
	if (!pcm || pcm.length < 1) return null
	try {
		if (pcm.buffer instanceof ArrayBuffer) {
			return pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength)
		}
		const copy = new Int16Array(pcm.length)
		copy.set(pcm)
		return copy.buffer
	} catch (_) {
		return null
	}
}

function powerLevelToDecibel(powerLevel) {
	const v = Number(powerLevel)
	if (!Number.isFinite(v) || v <= 0) return -Infinity
	return v
}

const RENDERJS_REGISTER_HINT = 'UniRenderjsRegister'
const WEBVIEW_ACTIVATE_HINT = 'UniWebViewActivate'

function requestRecordPermissionOnce() {
	return new Promise((resolve) => {
		RecordApp.RequestPermission(
			() => resolve({ ok: true }),
			(msg, isUserNotAllow) => {
				resolve({
					ok: false,
					message: isUserNotAllow ? '用户拒绝了录音权限' : msg || '录音权限失败',
					code: 9010001,
					needRenderjs: !isUserNotAllow && String(msg || '').includes(RENDERJS_REGISTER_HINT)
				})
			}
		)
	})
}

/** renderjs 晚于逻辑层 mounted 时，短暂重试 */
async function requestRecordPermission(maxWaitMs = 4000, pageVm) {
	const deadline = Date.now() + maxWaitMs
	let last = null
	while (Date.now() < deadline) {
		const prep = prepareRecorderSession(pageVm)
		if (!prep.ok) return prep
		last = await requestRecordPermissionOnce()
		if (last.ok) return last
		if (!last.needRenderjs) return last
		await new Promise((r) => setTimeout(r, 200))
	}
	return (
		last || {
			ok: false,
			message: 'renderjs 未就绪：请在页面 .vue 末尾添加 recorderModule renderjs 并调用 UniRenderjsRegister',
			code: 9010001
		}
	)
}

/**
 * @param {object} options
 * @param {object} [options.config]
 * @param {(data: ArrayBuffer, decibel: number) => void} options.onFrame
 * @param {string} [options.logSource]
 */
export function invokeRecorderStart(options = {}) {
	if (!isRecorderPcmAvailable()) {
		return Promise.resolve({
			ok: false,
			message: '请使用 App 真机并安装 recorder-core + Recorder-UniCore（见 readme）'
		})
	}
	if (nativeSessionActive) {
		return Promise.resolve({ ok: false, message: '录音会话已在运行' })
	}

	const config = mergeRecordConfig(options.config)
	const logSource = options.logSource || 'recorder-pcm'
	const userOnFrame = options.onFrame
	const targetRate = config.sampleRate

	resetRecorderFrameLog(logSource, {
		sampleRate: targetRate,
		frameBytes: config.frameSize
	})
	sampleDataChunk = null

	// #ifdef APP-PLUS
	return (async () => {
		const pageVm = options.pageVm

		const prep0 = prepareRecorderSession(pageVm)
		if (!prep0.ok) return prep0

		const perm = await requestRecordPermission(4000, pageVm)
		if (!perm.ok) return perm

		/** Start 前必须再次 UniWebViewActivate（与官方 recStart 一致） */
		const prepStart = prepareRecorderSession(pageVm)
		if (!prepStart.ok) return prepStart

		return new Promise((resolve) => {
			let settled = false
			const finish = (payload) => {
				if (settled) return
				settled = true
				if (payload.ok) nativeSessionActive = true
				else nativeSessionActive = false
				resolve(payload)
			}

			const tryStart = (retryOnActivate) => {
			const recSet = {
				type: 'pcm',
				sampleRate: targetRate,
				bitRate: 16,
				onProcess: (buffers, powerLevel, _duration, sampleRate, _newIdx) => {
					try {
						sampleDataChunk = Recorder.SampleData(
							buffers,
							sampleRate,
							targetRate,
							sampleDataChunk
						)
						const pcm = sampleDataChunk?.data
						if (!pcm || pcm.length < 1) return
						const chunk = pcmInt16ToArrayBuffer(pcm)
						if (!chunk || chunk.byteLength < 2) return
						const decibel = powerLevelToDecibel(powerLevel)
						if (!countRecorderOnFrame(chunk, decibel, logSource)) return
						userOnFrame?.(chunk, decibel)
					} catch (e) {
						console.warn(`[recorder-pcm] onProcess (${logSource})`, e)
					}
				}
			}

			RecordApp.Start(
				recSet,
				() => {
					lastStartResult = {
						success: true,
						sampleRate: targetRate,
						channels: config.channels,
						bitsPerSample: config.bitsPerSample
					}
					console.log(`[recorder-pcm] start.success (${logSource})`, lastStartResult)
					finish({ ok: true, startResult: lastStartResult })
				},
				(msg) => {
					const msgStr = String(msg || '')
					if (
						retryOnActivate &&
						msgStr.includes(WEBVIEW_ACTIVATE_HINT)
					) {
						const again = prepareRecorderSession(pageVm)
						if (again.ok) {
							tryStart(false)
							return
						}
					}
					nativeSessionActive = false
					console.warn(`[recorder-pcm] start.fail (${logSource})`, msg)
					finish(mapRecorderError({ message: msgStr }))
				}
			)
			}

			tryStart(true)
		})
	})()
	// #endif

	return Promise.resolve({ ok: false, message: 'Recorder-UniCore 仅支持 App' })
}

export const invokeWxzStartRecord = invokeRecorderStart

/**
 * @param {object} [options]
 * @param {string} [options.logSource]
 */
export function invokeRecorderStop(options = {}) {
	const logSource = options.logSource || 'recorder-pcm'

	if (!nativeSessionActive) {
		return Promise.resolve({
			ok: false,
			durationMs: 0,
			diagnostics: null,
			startResult: lastStartResult,
			message: '未在录音中'
		})
	}

	// #ifdef APP-PLUS
	const pageVm = options.pageVm
	prepareRecorderSession(pageVm)
	return new Promise((resolve) => {
		RecordApp.Stop(
			(arrayBuffer, duration) => {
				nativeSessionActive = false
				sampleDataChunk = null
				const durationMs = Number(duration) || 0
				lastStopDiagnostics = {
					frameCount: null,
					totalPcmBytes: arrayBuffer?.byteLength ?? null,
					recordingComplete: (arrayBuffer?.byteLength || 0) >= 100,
					message: `Recorder-UniCore stop ${durationMs}ms`
				}
				printRecorderFrameSummary(logSource, {
					pluginDurationMs: durationMs,
					pluginDiagnostics: lastStopDiagnostics
				})
				console.log(`[recorder-pcm] stop (${logSource})`, durationMs)
				resolve({
					ok: true,
					durationMs,
					diagnostics: lastStopDiagnostics,
					startResult: lastStartResult,
					stopArrayBuffer: arrayBuffer || null
				})
			},
			(msg) => {
				nativeSessionActive = false
				sampleDataChunk = null
				lastStopDiagnostics = {
					message: String(msg || '停止失败'),
					recordingComplete: false
				}
				printRecorderFrameSummary(logSource, { stopFail: true, err: msg })
				resolve({
					ok: false,
					durationMs: 0,
					diagnostics: lastStopDiagnostics,
					startResult: lastStartResult,
					message: String(msg || '停止失败')
				})
			}
		)
	})
	// #endif

	nativeSessionActive = false
	return Promise.resolve({
		ok: false,
		durationMs: 0,
		diagnostics: null,
		startResult: lastStartResult,
		message: 'Recorder-UniCore 仅支持 App'
	})
}

export const invokeWxzStopRecord = invokeRecorderStop

export function invokeRecorderCancel() {
	if (!nativeSessionActive) return
	nativeSessionActive = false
	sampleDataChunk = null
	// #ifdef APP-PLUS
	try {
		RecordApp.Stop(() => {}, () => {})
	} catch (_) {}
	// #endif
	lastStartResult = null
}

export const invokeWxzCancelRecord = invokeRecorderCancel

export function formatDecibel(dB) {
	if (dB === -Infinity || dB === Infinity || Number.isNaN(dB)) return '-∞ dB'
	return `${Number(dB).toFixed(1)} dB`
}
