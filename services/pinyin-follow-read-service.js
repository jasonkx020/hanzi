import {
	buildFollowReadScoreFromAudio,
	messageForAudioCompare,
	FOLLOW_READ_PASS_SCORE
} from '@/utils/pinyin-follow-read-score.js'
import { comparePcmFingerprints } from '@/utils/pinyin-follow-read-audio-compare.js'
import { extractPcmFingerprint } from '@/utils/pinyin-follow-read-audio-features.js'
import {
	decodeUserRecordingForScore,
	decodeRecordingToMono,
	getReferenceFingerprint,
	getReferenceMfccFeature
} from '@/utils/pinyin-follow-read-audio-decode.js'
import {
	shouldUseMfccScoring,
	USE_MFCC_SCORING,
	PINYIN_FOLLOW_READ_FIXED_MS,
	PINYIN_FOLLOW_READ_USE_FIXED_DURATION,
	PINYIN_FOLLOW_READ_USE_EFFECTIVE_DURATION,
	PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS,
	PINYIN_FOLLOW_READ_MAX_WALL_MS,
	getFollowReadTargetEffectiveMs,
	PINYIN_FOLLOW_READ_PREFER_PCM,
	PINYIN_FOLLOW_READ_STOP_TIMEOUT_MS
} from '@/config/pinyin-follow-read-config.js'
import {
	isAppPlus,
	isAndroidAppPlus,
	mustUsePlusIoForLocalFiles
} from '@/utils/pinyin-follow-read-platform.js'
import {
	logFollowReadScore,
	logFollowReadSimilarity,
	logFollowReadCompareSkipped,
	summarizeFollowReadScoreResult
} from '@/utils/pinyin-follow-read-debug-log.js'
import { extractMfccFromFloat32, extractMfccFromInt16 } from '@/utils/pinyin-mfcc-extract.js'
import { compareMfccFeatures, MFCC_PASS_SCORE } from '@/utils/pinyin-mfcc-compare.js'
import {
	buildFollowReadScoreFromMfcc,
	messageForMfccCompare
} from '@/utils/pinyin-mfcc-score.js'
import {
	PINYIN_MFCC_MIN_EFFECTIVE_MS,
	PINYIN_MFCC_MIN_VOICED_RATIO
} from '@/constants/pinyin-mfcc-config.js'
import {
	createFollowReadVadState,
	estimateFollowReadMaxMs,
	tickFollowReadVad,
	computeFrameEnergy
} from '@/utils/pinyin-follow-read-vad.js'
import {
	createEffectiveAudioState,
	tickEffectiveAudioFrame,
	getEffectiveAudioProgress
} from '@/utils/pinyin-follow-read-effective-audio.js'
import {
	classifyFollowReadThrowable,
	followReadStatusBarHint,
	followReadUserMessage
} from '@/utils/pinyin-follow-read-ui-messages.js'
import {
	isUniRecorderFrameCallbackSupported,
	startAppFollowReadFramePump
} from '@/utils/pinyin-follow-read-app-frame-pump.js'
import {
	passesMfccSpeechGate,
	passesLegacySpeechGate
} from '@/utils/pinyin-follow-read-speech-gate.js'
import { PINYIN_MFCC_MIN_FRAMES_FOR_GATE } from '@/constants/pinyin-mfcc-config.js'

const FOLLOW_READ_MIN_VOICED_RATIO = 0.06
const FOLLOW_READ_MIN_EFFECTIVE_MS = 180

function followReadFailResult(verdict, target, extra = {}) {
	const v = String(verdict || 'analysis_error')
	const res = {
		ok: false,
		score: 0,
		pass: false,
		message: followReadUserMessage(v, target),
		statusHint: followReadStatusBarHint(v, target),
		details: {
			targetMatch: 0,
			verdict: v,
			durationFit: 'retry',
			...(extra.details || {})
		},
		debug: extra.debug
	}
	logFollowReadScore('score.fail', {
		target: String(target || '').trim(),
		verdict: v,
		...extra.log
	})
	return res
}

let recorderManager = null
let recording = false
let recordStartedAt = 0
let currentResolve = null
let autoStopCallback = null
let vadState = null
/** @type {ReturnType<typeof createEffectiveAudioState>|null} */
let effectiveAudioState = null
/** App 无法拉起 AudioRecord 时，用墙钟 2s 兜底（如 iOS） */
let effectiveWallClockFallback = false
let effectiveWallClockStartedAt = 0
let effectiveWallClockTargetMs = 0
let vadFallbackTimer = null
let fixedDurationTimer = null
let autoStopInProgress = false
let frameListenerBound = false
/** @type {(() => void)|null} */
let appFramePumpStop = null
let effectiveWallTickTimer = null
let appPumpProbeTimer = null
let appPumpFrameCount = 0
/** @type {string} */
let lastRecordFormat = 'mp3'

/** 录音测试（按住录、松开停），与跟读共用 RecorderManager */
let recordTestRecording = false
let recordTestStartedAt = 0
/** @type {string} */
let recordTestFormat = 'mp3'
/** @type {((payload: object) => void)|null} */
let recordTestStopResolve = null

/** App 录音帧 PCM 缓存（绕过 readFile 读临时 wav） */
/** @type {ArrayBuffer[]|null} */
let activePcmFrameChunks = null
/** 最近一次 onStop 合并的 PCM（评分兜底） */
let lastScoringPcmBuffer = null

function resolveFollowReadRecordFormat() {
	if (!isAppPlus()) return 'mp3'
	if (!PINYIN_FOLLOW_READ_PREFER_PCM) return 'mp3'
	// 无 uni FS 时用裸 pcm，便于 plus.io 读取与帧回调
	if (mustUsePlusIoForLocalFiles()) return 'pcm'
	return 'wav'
}

function beginPcmFrameCapture() {
	if (!isAppPlus()) {
		activePcmFrameChunks = null
		return
	}
	activePcmFrameChunks = []
}

function appendPcmFrameChunk(frameBuffer) {
	if (!activePcmFrameChunks || !frameBuffer?.byteLength) return
	try {
		activePcmFrameChunks.push(frameBuffer.slice(0))
	} catch (_) {
		activePcmFrameChunks.push(frameBuffer)
	}
}

function endPcmFrameCapture() {
	if (!activePcmFrameChunks?.length) {
		activePcmFrameChunks = null
		return null
	}
	let total = 0
	for (const c of activePcmFrameChunks) total += c.byteLength
	if (total < 1600) {
		activePcmFrameChunks = null
		return null
	}
	const out = new Uint8Array(total)
	let off = 0
	for (const c of activePcmFrameChunks) {
		out.set(new Uint8Array(c), off)
		off += c.byteLength
	}
	activePcmFrameChunks = null
	return out.buffer
}

function attachPcmBufferToStopPayload(payload) {
	const chunksBefore = activePcmFrameChunks?.length || 0
	const buf = endPcmFrameCapture()
	logFollowReadScore('score.record.pcm_capture', {
		chunks: chunksBefore,
		bytes: buf?.byteLength || 0,
		noUniFs: mustUsePlusIoForLocalFiles(),
		pumpFrames: appPumpFrameCount
	})
	if (buf?.byteLength) {
		payload.recordPcmBuffer = buf
		payload.frameCaptureBytes = buf.byteLength
		lastScoringPcmBuffer = buf
	}
	return payload
}

/** 有临时文件或内存 PCM 即视为录音成功 */
function markFollowReadStopOk(payload) {
	const hasFile = !!String(payload?.tempFilePath || '').trim()
	const pcmBytes =
		Number(payload?.frameCaptureBytes) ||
		payload?.recordPcmBuffer?.byteLength ||
		0
	payload.ok = hasFile || pcmBytes >= 1600
	payload.message = payload.ok ? '' : payload.message || '未生成录音文件'
	return payload
}

function stopEffectiveWallTick() {
	if (effectiveWallTickTimer != null) {
		clearInterval(effectiveWallTickTimer)
		effectiveWallTickTimer = null
	}
}

function startEffectiveWallTick() {
	stopEffectiveWallTick()
	effectiveWallTickTimer = setInterval(() => {
		if (!recording) return
		const elapsed = Date.now() - recordStartedAt
		if (effectiveAudioState && elapsed >= effectiveAudioState.opts.maxWallMs) {
			logFollowReadScore('score.record.wall_timeout', {
				effectiveMs: effectiveAudioState.effectiveMs,
				wallMs: elapsed,
				source: 'wall_tick'
			})
			triggerFollowReadAutoStop('timeout')
		}
	}, 250)
}

function clearAppPumpProbe() {
	if (appPumpProbeTimer != null) {
		clearTimeout(appPumpProbeTimer)
		appPumpProbeTimer = null
	}
}

function enableAndroidEffectiveWallAssist(options = {}, reason = 'pump_no_frames') {
	if (effectiveWallClockFallback) return
	const targetMs = getFollowReadTargetEffectiveMs(options)
	effectiveWallClockFallback = true
	effectiveWallClockStartedAt = recordStartedAt
	effectiveWallClockTargetMs = targetMs
	scheduleFixedDurationStop(targetMs)
	logFollowReadScore('score.record.effective_wall_fallback', {
		targetMs,
		reason,
		recorderManager: true
	})
}

function disableAndroidEffectiveWallAssist() {
	if (!effectiveWallClockFallback) return
	effectiveWallClockFallback = false
	effectiveWallClockStartedAt = 0
	effectiveWallClockTargetMs = 0
	clearFixedDurationTimer()
}

function scheduleAppPumpProbe(options = {}) {
	clearAppPumpProbe()
	appPumpFrameCount = 0
	appPumpProbeTimer = setTimeout(() => {
		appPumpProbeTimer = null
		if (!recording) return
		if (appPumpFrameCount > 0) return
		logFollowReadScore('score.record.app_pump_no_frames', { recorderManager: true })
		enableAndroidEffectiveWallAssist(options, 'pump_no_frames')
	}, 900)
}

let appPumpDelayTimer = null

function clearDelayedAndroidPump() {
	if (appPumpDelayTimer != null) {
		clearTimeout(appPumpDelayTimer)
		appPumpDelayTimer = null
	}
}

/** RecorderManager 已占麦后再尝试帧泵（部分机型可读） */
function scheduleDelayedAndroidPump(useEffective, useLegacyVad, options = {}) {
	clearDelayedAndroidPump()
	if (!useEffective && !useLegacyVad) return
	appPumpDelayTimer = setTimeout(() => {
		appPumpDelayTimer = null
		if (!recording) return
		startAndroidParallelFramePump(useEffective, useLegacyVad, options)
	}, 450)
}

const RECORD_HISTORY_KEY = 'pinyin_follow_read_history_v1'
const MAX_HISTORY = 12

const ANDROID_RECORD = 'android.permission.RECORD_AUDIO'

function readHistory() {
	try {
		const raw = uni.getStorageSync(RECORD_HISTORY_KEY)
		if (Array.isArray(raw)) return raw
	} catch (_) {}
	return []
}

function writeHistory(list) {
	try {
		uni.setStorageSync(RECORD_HISTORY_KEY, list)
	} catch (_) {}
}

function appendHistory(item) {
	const list = readHistory()
	list.unshift(item)
	writeHistory(list.slice(0, MAX_HISTORY))
}

function clearFixedDurationTimer() {
	if (fixedDurationTimer != null) {
		clearTimeout(fixedDurationTimer)
		fixedDurationTimer = null
	}
}

function scheduleFixedDurationStop(ms) {
	clearFixedDurationTimer()
	const dur = Math.max(300, Number(ms) || PINYIN_FOLLOW_READ_FIXED_MS)
	fixedDurationTimer = setTimeout(() => {
		fixedDurationTimer = null
		triggerFollowReadAutoStop('fixed_duration')
	}, dur)
}

/** 本次录音计划使用的固定墙钟时长；0 表示走有效发声 / VAD */
export function getFollowReadFixedDurationMs(options = {}) {
	if (PINYIN_FOLLOW_READ_USE_EFFECTIVE_DURATION && options.useEffectiveDuration !== false) {
		return 0
	}
	if (options.useFixedDuration === false || !PINYIN_FOLLOW_READ_USE_FIXED_DURATION) {
		return 0
	}
	const v = Number(options.fixedDurationMs)
	if (Number.isFinite(v) && v > 0) {
		return Math.min(15000, Math.max(300, Math.round(v)))
	}
	return PINYIN_FOLLOW_READ_FIXED_MS
}

export function getFollowReadEffectiveProgress() {
	if (effectiveWallClockFallback) {
		const elapsed = Math.max(0, Date.now() - effectiveWallClockStartedAt)
		const targetMs = effectiveWallClockTargetMs || PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS
		const speechStarted = elapsed >= 80
		const effectiveMs = Math.min(elapsed, targetMs)
		return {
			effectiveMs,
			targetMs,
			progress: speechStarted
				? Math.min(100, (effectiveMs / Math.max(1, targetMs)) * 100)
				: 0,
			speechStarted,
			wallAssist: true
		}
	}
	const real = getEffectiveAudioProgress(effectiveAudioState)
	return { ...real, wallAssist: false }
}

export { getFollowReadTargetEffectiveMs }

function stopAppFramePump() {
	if (appFramePumpStop) {
		try {
			appFramePumpStop()
		} catch (_) {}
		appFramePumpStop = null
	}
}

function clearVadTimers() {
	if (vadFallbackTimer != null) {
		clearTimeout(vadFallbackTimer)
		vadFallbackTimer = null
	}
	clearFixedDurationTimer()
	stopEffectiveWallTick()
	clearAppPumpProbe()
	clearDelayedAndroidPump()
	vadState = null
	effectiveAudioState = null
	effectiveWallClockFallback = false
	effectiveWallClockStartedAt = 0
	effectiveWallClockTargetMs = 0
}

function startAndroidParallelFramePump(useEffective, useLegacyVad, options = {}) {
	if (!isAndroidAppPlus() || (!useEffective && !useLegacyVad)) return
	stopAppFramePump()
	const pump = startAppFollowReadFramePump(
		(buf) => onRecorderFrame(buf),
		{
			onStats: (s) => {
				if (s?.event === 'first_frame') {
					logFollowReadScore('score.record.app_frame_pump_frame', s)
				}
				if (s?.event === 'read_error' || s?.event === 'exception') {
					logFollowReadScore('score.record.app_frame_pump_diag', s)
				}
			}
		}
	)
	if (pump.ok) {
		appFramePumpStop = pump.stop
		logFollowReadScore('score.record.app_frame_pump', {
			ok: true,
			mode: 'parallel_after_rm'
		})
	} else {
		logFollowReadScore('score.record.app_frame_pump', {
			ok: false,
			reason: pump.reason || 'unavailable',
			mode: 'parallel_after_rm'
		})
		if (useEffective) {
			enableAndroidEffectiveWallAssist(options, 'pump_start_failed')
		}
	}
}

function startAppFramePumpIfNeeded(useEffective, useLegacyVad, options = {}) {
	if (!isAppPlus()) return
	if (isAndroidAppPlus()) {
		return
	}
	startAndroidParallelFramePump(useEffective, useLegacyVad, options)
}

export function cancelFollowReadAutoStop() {
	stopAppFramePump()
	clearVadTimers()
	autoStopCallback = null
}

function scheduleWallRecordTimeout(ms) {
	if (vadFallbackTimer != null) clearTimeout(vadFallbackTimer)
	const dur = Math.max(1000, Number(ms) || PINYIN_FOLLOW_READ_MAX_WALL_MS)
	vadFallbackTimer = setTimeout(() => {
		vadFallbackTimer = null
		triggerFollowReadAutoStop('timeout')
	}, dur)
}

function scheduleVadFallback(symbol) {
	scheduleWallRecordTimeout(estimateFollowReadMaxMs(symbol))
}

function initFollowReadVad(symbol) {
	clearVadTimers()
	vadState = createFollowReadVadState(symbol)
	scheduleVadFallback(symbol)
}

function initFollowReadEffectiveCapture(symbol, options = {}) {
	clearVadTimers()
	const targetEffectiveMs = getFollowReadTargetEffectiveMs(options)
	effectiveAudioState = createEffectiveAudioState({
		targetEffectiveMs,
		maxWallMs: PINYIN_FOLLOW_READ_MAX_WALL_MS
	})
	scheduleWallRecordTimeout(PINYIN_FOLLOW_READ_MAX_WALL_MS)
	logFollowReadScore('score.record.effective_mode', {
		symbol: String(symbol || '').trim(),
		targetEffectiveMs,
		maxWallMs: PINYIN_FOLLOW_READ_MAX_WALL_MS
	})
}

function onRecorderFrame(frameBuffer) {
	if (autoStopInProgress || !frameBuffer) return
	const inFollow = recording
	const inTest = recordTestRecording
	if (!inFollow && !inTest) return
	appPumpFrameCount++
	appendPcmFrameChunk(frameBuffer)
	if (!inFollow) return
	if (effectiveWallClockFallback && appPumpFrameCount >= 2) {
		disableAndroidEffectiveWallAssist()
	}

	const elapsed = Date.now() - recordStartedAt
	const pcmLike =
		lastRecordFormat === 'pcm' || lastRecordFormat === 'wav'

	if (effectiveAudioState) {
		const verdict = tickEffectiveAudioFrame(
			effectiveAudioState,
			frameBuffer,
			elapsed,
			pcmLike
		)
		if (verdict === 'target_reached') {
			logFollowReadScore('score.record.effective_done', {
				effectiveMs: effectiveAudioState.effectiveMs,
				targetMs: effectiveAudioState.opts.targetEffectiveMs,
				wallMs: elapsed
			})
			triggerFollowReadAutoStop('effective_target')
			return
		}
		if (verdict === 'max') {
			logFollowReadScore('score.record.wall_timeout', {
				effectiveMs: effectiveAudioState.effectiveMs,
				wallMs: elapsed
			})
			triggerFollowReadAutoStop('timeout')
			return
		}
	}

	if (vadState) {
		const energy = computeFrameEnergy(frameBuffer)
		const verdict = tickFollowReadVad(vadState, energy, elapsed)
		if (verdict === 'silence' || verdict === 'max') {
			triggerFollowReadAutoStop(verdict)
		}
	}
}

async function triggerFollowReadAutoStop(_reason) {
	if (!recording || autoStopInProgress) return
	autoStopInProgress = true
	const cb = autoStopCallback
	autoStopCallback = null
	clearVadTimers()
	try {
		const stopRes = await stopFollowReadRecord()
		if (cb && typeof cb === 'function') cb(stopRes)
	} finally {
		autoStopInProgress = false
	}
}

function bindFrameListenerIfNeeded(rm) {
	if (frameListenerBound || !rm || typeof rm.onFrameRecorded !== 'function') return
	if (!isUniRecorderFrameCallbackSupported()) return
	frameListenerBound = true
	rm.onFrameRecorded((res) => {
		const buf = res?.frameBuffer
		if (buf) onRecorderFrame(buf)
	})
}

function getRecorderManagerSafe() {
	if (recorderManager) return recorderManager
	if (typeof uni === 'undefined' || typeof uni.getRecorderManager !== 'function') return null
	recorderManager = uni.getRecorderManager()
	bindFrameListenerIfNeeded(recorderManager)
	recorderManager.onStop((res) => {
		stopAppFramePump()
		if (recordTestStopResolve) {
			const finish = recordTestStopResolve
			recordTestStopResolve = null
			recordTestRecording = false
			const durationMs = Date.now() - recordTestStartedAt
			const tempFilePath = String(res?.tempFilePath || '').trim()
			const testPayload = {
				ok: !!tempFilePath,
				tempFilePath,
				durationMs: Number(res?.duration || durationMs) || durationMs,
				sampleRate: 16000,
				recordFormat: recordTestFormat,
				message: tempFilePath ? '' : '未生成录音文件'
			}
			markFollowReadStopOk(attachPcmBufferToStopPayload(testPayload))
			finish(testPayload)
			return
		}
		const durationMs = Date.now() - recordStartedAt
		recording = false
		clearVadTimers()
		const tempFilePath = String(res?.tempFilePath || '').trim()
		const payload = {
			ok: !!tempFilePath,
			tempFilePath,
			durationMs: Number(res?.duration || durationMs) || durationMs,
			sampleRate: 16000,
			recordFormat: lastRecordFormat,
			message: tempFilePath ? '' : '未生成录音文件'
		}
		markFollowReadStopOk(attachPcmBufferToStopPayload(payload))
		if (payload.tempFilePath) {
			appendHistory({
				tempFilePath: payload.tempFilePath,
				durationMs: payload.durationMs,
				sampleRate: payload.sampleRate,
				createdAt: Date.now()
			})
		}
		if (currentResolve) {
			currentResolve(payload)
			currentResolve = null
		}
		const cb = autoStopCallback
		autoStopCallback = null
		if (cb) {
			try {
				cb(payload)
			} catch (e) {
				console.warn('[pinyin-follow] onAutoStop', e)
			}
		}
	})
	recorderManager.onError((err) => {
		stopAppFramePump()
		if (recordTestStopResolve) {
			const finish = recordTestStopResolve
			recordTestStopResolve = null
			recordTestRecording = false
			finish({ ok: false, message: err?.errMsg || '录音失败' })
			return
		}
		recording = false
		clearVadTimers()
		autoStopCallback = null
		if (currentResolve) {
			currentResolve({ ok: false, message: err?.errMsg || '录音失败' })
			currentResolve = null
		}
	})
	return recorderManager
}

function getAppMicAuthorizeState() {
	try {
		if (typeof uni.getAppAuthorizeSetting !== 'function') return ''
		const s = uni.getAppAuthorizeSetting()
		return String(s?.microphoneAuthorized || '')
	} catch (_) {
		return ''
	}
}

function promptMicSettingsForParent(resolve) {
	uni.showModal({
		title: '需要麦克风',
		content:
			'跟读需要用到麦克风。请爸爸妈妈在手机的「设置」里，为本应用打开麦克风权限后再试。',
		confirmText: '去设置',
		cancelText: '暂不',
		success: (modal) => {
			if (!modal.confirm) {
				resolve({ ok: false, message: '未开启麦克风，暂时无法跟读' })
				return
			}
			if (typeof uni.openAppAuthorizeSetting === 'function') {
				uni.openAppAuthorizeSetting({})
			} else if (typeof uni.openSetting === 'function') {
				uni.openSetting({})
			}
			resolve({
				ok: false,
				message: '请打开麦克风后，再点一次「开始跟读」'
			})
		}
	})
}

// #ifdef APP-PLUS
function requestMicPermissionApp() {
	return new Promise((resolve) => {
		try {
			if (typeof plus === 'undefined' || !plus.os) {
				resolve({ ok: false, message: '当前环境不支持录音' })
				return
			}
			const micState = getAppMicAuthorizeState()
			if (micState === 'authorized') {
				resolve({ ok: true })
				return
			}
			if (micState === 'denied') {
				promptMicSettingsForParent(resolve)
				return
			}
			if (plus.os.name === 'Android') {
				if (typeof plus.android?.requestPermissions !== 'function') {
					resolve({ ok: false, message: '无法申请麦克风权限' })
					return
				}
				plus.android.requestPermissions(
					[ANDROID_RECORD],
					(result) => {
						const granted = Array.isArray(result?.granted)
							? result.granted.indexOf(ANDROID_RECORD) >= 0
							: false
						if (granted) {
							resolve({ ok: true })
							return
						}
						const alwaysDenied = Array.isArray(result?.deniedAlways)
							? result.deniedAlways.indexOf(ANDROID_RECORD) >= 0
							: false
						if (alwaysDenied) {
							promptMicSettingsForParent(resolve)
							return
						}
						uni.showToast({
							title: '需要麦克风才能跟读，请点「允许」',
							icon: 'none',
							duration: 2800
						})
						resolve({ ok: false, message: '请允许使用麦克风后再跟读' })
					},
					() => {
						resolve({ ok: false, message: '无法申请麦克风权限' })
					}
				)
				return
			}
			resolve({ ok: true })
		} catch (e) {
			console.warn('[pinyin-follow] requestMicPermissionApp', e)
			resolve({ ok: false, message: '无法申请麦克风权限' })
		}
	})
}
// #endif

// #ifdef MP
function requestMicPermissionMp() {
	return new Promise((resolve) => {
		uni.getSetting({
			success: (settingRes) => {
				if (settingRes?.authSetting?.['scope.record']) {
					resolve({ ok: true })
					return
				}
				uni.authorize({
					scope: 'scope.record',
					success: () => resolve({ ok: true }),
					fail: () => {
						uni.getSetting({
							success: (again) => {
								if (again?.authSetting?.['scope.record']) {
									resolve({ ok: true })
									return
								}
								const denied = again?.authSetting?.['scope.record'] === false
								if (denied) {
									promptMicSettingsForParent(resolve)
									return
								}
								uni.showToast({
									title: '需要麦克风才能跟读，请点「允许」',
									icon: 'none',
									duration: 2800
								})
								resolve({ ok: false, message: '请允许使用麦克风后再跟读' })
							},
							fail: () => {
								uni.showToast({
									title: '需要麦克风才能跟读，请点「允许」',
									icon: 'none',
									duration: 2800
								})
								resolve({ ok: false, message: '请允许使用麦克风后再跟读' })
							}
						})
					}
				})
			},
			fail: () => {
				uni.authorize({
					scope: 'scope.record',
					success: () => resolve({ ok: true }),
					fail: () => resolve({ ok: false, message: '请允许使用麦克风后再跟读' })
				})
			}
		})
	})
}
// #endif

export async function requestMicPermission() {
	// #ifdef APP-PLUS
	return requestMicPermissionApp()
	// #endif
	// #ifdef MP
	return requestMicPermissionMp()
	// #endif
	// #ifdef H5
	return { ok: false, message: '浏览器暂不支持跟读录音，请使用手机 App' }
	// #endif
	return { ok: false, message: '当前环境不支持录音' }
}

export function getFollowReadState() {
	return {
		recording
	}
}

export function getFollowReadHistory() {
	return readHistory()
}

/**
 * @param {object} [options]
 * @param {string} [options.symbol] 跟读目标，用于超时估算
 * @param {boolean} [options.autoStop=true] 是否静音/超时自动结束
 * @param {(stopRes: object) => void} [options.onAutoStop] 自动结束时回调（与手动 stop 相同结构）
 */
export async function startFollowReadRecord(options = {}) {
	if (recording) return { ok: false, message: '录音进行中' }
	const perm = await requestMicPermission()
	if (!perm.ok) return perm
	const rm = getRecorderManagerSafe()
	if (!rm) return { ok: false, message: '当前环境不支持录音' }

	const symbol = String(options.symbol || '').trim()
	const autoStop = options.autoStop !== false
	const useEffective =
		autoStop &&
		PINYIN_FOLLOW_READ_USE_EFFECTIVE_DURATION &&
		options.useEffectiveDuration !== false
	const fixedMs = useEffective ? 0 : getFollowReadFixedDurationMs(options)
	const useLegacyVad = autoStop && fixedMs <= 0 && !useEffective
	autoStopCallback = typeof options.onAutoStop === 'function' ? options.onAutoStop : null

	cancelFollowReadAutoStop()
	if (fixedMs > 0) {
		scheduleFixedDurationStop(fixedMs)
	} else if (useEffective) {
		initFollowReadEffectiveCapture(symbol, options)
	} else if (useLegacyVad) {
		initFollowReadVad(symbol)
	}

	recording = true
	autoStopInProgress = false
	recordStartedAt = Date.now()
	beginPcmFrameCapture()

	lastRecordFormat = resolveFollowReadRecordFormat()
	const useWav = lastRecordFormat === 'wav'
	const usePcm = lastRecordFormat === 'pcm'

	const recorderMaxMs = useEffective
		? PINYIN_FOLLOW_READ_MAX_WALL_MS + 3000
		: fixedMs > 0
			? fixedMs
			: 12000

	const startOpts = {
		duration: recorderMaxMs,
		sampleRate: 16000,
		numberOfChannels: 1,
		format: lastRecordFormat
	}
	if (!useWav && !usePcm) {
		startOpts.encodeBitRate = 48000
	}
	if (isAppPlus() || useEffective || useLegacyVad) {
		startOpts.frameSize = 4
	}

	logFollowReadScore('score.record.start', {
		symbol,
		fixedMs,
		useEffective,
		targetEffectiveMs: useEffective ? getFollowReadTargetEffectiveMs(options) : 0,
		maxWallMs: useEffective ? PINYIN_FOLLOW_READ_MAX_WALL_MS : 0,
		format: lastRecordFormat,
		duration: startOpts.duration
	})

	rm.start(startOpts)
	startEffectiveWallTick()
	if (useEffective && isAndroidAppPlus()) {
		scheduleAppPumpProbe(options)
		scheduleDelayedAndroidPump(useEffective, useLegacyVad, options)
	} else {
		startAppFramePumpIfNeeded(useEffective, useLegacyVad, options)
	}
	logFollowReadScore('score.record.rm_started', {
		format: lastRecordFormat,
		useEffective,
		android: isAndroidAppPlus()
	})
	return {
		ok: true,
		fixedDurationMs: fixedMs,
		useEffectiveDuration: useEffective,
		targetEffectiveMs: useEffective ? getFollowReadTargetEffectiveMs(options) : 0,
		maxWallMs: useEffective ? PINYIN_FOLLOW_READ_MAX_WALL_MS : 0,
		recordFormat: lastRecordFormat
	}
}

export function stopFollowReadRecord() {
	if (!recording && !currentResolve) {
		return Promise.resolve({ ok: false, message: '未在录音中' })
	}
	stopAppFramePump()
	clearVadTimers()
	const rm = getRecorderManagerSafe()
	if (!rm) return Promise.resolve({ ok: false, message: '当前环境不支持录音' })
	return new Promise((resolve) => {
		let settled = false
		const finish = (payload) => {
			if (settled) return
			settled = true
			resolve(payload)
		}
		const timeoutMs = PINYIN_FOLLOW_READ_STOP_TIMEOUT_MS
		const timer = setTimeout(() => {
			if (settled) return
			recording = false
			currentResolve = null
			logFollowReadScore('score.record.stop_timeout', { timeoutMs })
			finish({ ok: false, message: '录音停止超时，请重试' })
		}, timeoutMs)
		currentResolve = (payload) => {
			clearTimeout(timer)
			finish(payload)
		}
		try {
			rm.stop()
		} catch (e) {
			clearTimeout(timer)
			recording = false
			currentResolve = null
			finish({ ok: false, message: String(e?.message || e) })
		}
	})
}

async function requestFollowReadScoreMfcc(payload) {
	const target = String(payload?.symbol || '').trim()
	const durationMs = Number(payload?.durationMs) || 0
	const sampleRate = Number(payload?.sampleRate) || 16000
	const tempFilePath = String(payload?.tempFilePath || '').trim()
	const recordFormat = String(payload?.recordFormat || 'mp3')

	logFollowReadScore('score.mfcc.start', {
		target,
		durationMs,
		sampleRate,
		recordFormat,
		tempFilePath: tempFilePath ? '(set)' : ''
	})

	let refFeat
	try {
		refFeat = await getReferenceMfccFeature(target)
		logFollowReadScore('score.mfcc.ref_ok', {
			target,
			refFrames: refFeat?.frames?.length || 0,
			refDurationMs: refFeat?.durationMs,
			refVoicedRatio: refFeat?.voicedRatio
		})
	} catch (e) {
		console.warn('[pinyin-follow] ref mfcc', e)
		logFollowReadCompareSkipped(target, 'ref_mfcc_load_failed', {
			verdict: 'ref_error',
			err: String(e?.message || e)
		})
		return followReadFailResult('ref_error', target, {
			log: { err: String(e?.message || e) }
		})
	}

	let userFeat
	let decoded
	try {
		logFollowReadScore('score.mfcc.user_decode_start', {
			target,
			recordFormat,
			tempFilePath: tempFilePath.slice(0, 80)
		})
		decoded = await decodeUserRecordingForScore(tempFilePath, recordFormat, {
			recordPcmBuffer: payload.recordPcmBuffer,
			recordDurationMs: durationMs
		})
		logFollowReadScore('score.mfcc.user_decode_ok', {
			target,
			userSr: decoded.sampleRate,
			pcmSamples: decoded.int16?.length || decoded.samples?.length || 0,
			decodePath: decoded.decodePath
		})
		try {
			if (decoded.decodePath === 'pcm' && decoded.int16?.length) {
				userFeat = extractMfccFromInt16(decoded.int16, decoded.sampleRate)
			} else {
				userFeat = extractMfccFromFloat32(decoded.samples, decoded.sampleRate)
			}
		} catch (e) {
			logFollowReadScore('score.mfcc.extract_fail', {
				target,
				err: String(e?.message || e)
			})
			throw e
		}
		logFollowReadScore('score.mfcc.user_feat', {
			target,
			userSr: decoded.sampleRate,
			pcmSamples: decoded.int16?.length || decoded.samples?.length || 0,
			userFrames: userFeat?.frames?.length || 0,
			userDurationMs: userFeat?.durationMs,
			userVoicedRatio: userFeat?.voicedRatio
		})
	} catch (e) {
		console.warn('[pinyin-follow] decode recording mfcc', e)
		logFollowReadCompareSkipped(target, 'user_decode_or_mfcc_extract_failed', {
			verdict: 'decode_error',
			err: String(e?.message || e),
			failureStage: e?.failureStage || 'decode_or_mfcc',
			hadFrameCapture: !!(payload.recordPcmBuffer?.byteLength),
			frameCaptureBytes: payload.frameCaptureBytes || 0
		})
		throw e
	}

	const gate = passesMfccSpeechGate(userFeat, decoded, durationMs)
	if (!gate.pass) {
		logFollowReadCompareSkipped(target, 'no_speech_gate', {
			verdict: 'no_speech',
			gateReason: gate.reason,
			userDurationMs: userFeat?.durationMs,
			userVoicedRatio: userFeat?.voicedRatio,
			userFrames: userFeat?.frames?.length || 0,
			rawMs: gate.rawMs,
			pcmSamples: gate.pcmSamples,
			minDurationMs: PINYIN_MFCC_MIN_EFFECTIVE_MS,
			minFrames: PINYIN_MFCC_MIN_FRAMES_FOR_GATE,
			minVoicedRatio: PINYIN_MFCC_MIN_VOICED_RATIO
		})
		return followReadFailResult('no_speech', target, {
			log: {
				stage: 'mfcc_gate',
				gateReason: gate.reason,
				userDurationMs: userFeat?.durationMs,
				userVoicedRatio: userFeat?.voicedRatio,
				userFrames: userFeat?.frames?.length || 0,
				rawMs: gate.rawMs,
				pcmSamples: gate.pcmSamples
			}
		})
	}
	logFollowReadScore('score.mfcc.gate_ok', {
		target,
		gateReason: gate.reason,
		userFrames: userFeat.frames.length,
		userDurationMs: userFeat.durationMs
	})

	try {
		logFollowReadScore('score.mfcc.compare_start', {
			target,
			refFrames: refFeat.frames.length,
			userFrames: userFeat.frames.length
		})
		const cmp = compareMfccFeatures(refFeat, userFeat)
		const pass = cmp.matchScore >= MFCC_PASS_SCORE
		const score = buildFollowReadScoreFromMfcc(cmp, durationMs, sampleRate)
		let message = messageForMfccCompare(target, cmp, pass)
		if (!message) {
			message = pass ? `读对了，${score} 分` : `再试试「${target}」`
		}
		const verdict = pass ? 'match' : 'mismatch'
		logFollowReadScore('score.mfcc.compare', {
			target,
			pass,
			passThreshold: MFCC_PASS_SCORE,
			matchScore: +Number(cmp.matchScore || 0).toFixed(4),
			dtwSim: +Number(cmp.dtwSim || 0).toFixed(4),
			durRatio: +Number(cmp.durRatio || 0).toFixed(4),
			refFrames: cmp.refFrames,
			userFrames: cmp.userFrames,
			score
		})
		const res = {
			ok: true,
			score,
			pass,
			message,
			statusHint: pass ? `跟读 ${score} 分` : followReadStatusBarHint('mismatch', target),
			details: {
				targetMatch: Math.round(cmp.matchScore * 100),
				verdict,
				durationFit: durationMs >= 500 && durationMs <= 7000 ? 'good' : 'retry',
				dtwSim: Math.round((cmp.dtwSim || 0) * 100),
				refFrames: cmp.refFrames,
				userFrames: cmp.userFrames,
				scoring: 'mfcc_dtw_v2'
			},
			debug: {
				target,
				durationMs,
				sampleRate,
				recordFormat,
				userDurationMs: userFeat.durationMs,
				voicedRatio: userFeat.voicedRatio,
				matchScore: cmp.matchScore,
				dtwSim: cmp.dtwSim,
				durRatio: cmp.durRatio,
				passThreshold: MFCC_PASS_SCORE
			}
		}
		logFollowReadScore('score.mfcc.done', summarizeFollowReadScoreResult(res))
		logFollowReadSimilarity(res, target, { path: 'mfcc' })
		return res
	} catch (e) {
		console.warn('[pinyin-follow] mfcc score', e)
		logFollowReadCompareSkipped(target, 'compare_throw', {
			verdict: classifyFollowReadThrowable(e),
			err: String(e?.message || e)
		})
		return followReadFailResult(classifyFollowReadThrowable(e), target, {
			log: { err: String(e?.message || e) }
		})
	}
}

async function requestFollowReadScoreLegacy(payload) {
	const target = String(payload?.symbol || '').trim()
	const durationMs = Number(payload?.durationMs) || 0
	const sampleRate = Number(payload?.sampleRate) || 16000
	const tempFilePath = String(payload?.tempFilePath || '').trim()
	const recordFormat = String(payload?.recordFormat || 'mp3')

	logFollowReadScore('score.legacy.start', {
		target,
		durationMs,
		sampleRate,
		recordFormat
	})

	let refFp
	try {
		refFp = await getReferenceFingerprint(target)
		logFollowReadScore('score.legacy.ref_ok', {
			target,
			refDurationMs: refFp?.durationMs,
			envBins: refFp?.env?.length || 0
		})
	} catch (e) {
		console.warn('[pinyin-follow] ref fingerprint', e)
		return followReadFailResult('ref_error', target, {
			log: { err: String(e?.message || e) }
		})
	}

	let userFp
	try {
		const decoded = await decodeUserRecordingForScore(tempFilePath, recordFormat, {
			recordPcmBuffer: payload.recordPcmBuffer,
			recordDurationMs: durationMs
		})
		const samples =
			decoded.samples ||
			(decoded.int16?.length
				? (() => {
						const f = new Float32Array(decoded.int16.length)
						for (let i = 0; i < decoded.int16.length; i++) f[i] = decoded.int16[i] / 32768
						return f
					})()
				: new Float32Array(0))
		userFp = extractPcmFingerprint(samples, decoded.sampleRate)
		logFollowReadScore('score.legacy.user_feat', {
			target,
			userSr,
			pcmSamples: samples?.length || 0,
			userDurationMs: userFp?.durationMs,
			userVoicedRatio: userFp?.voicedRatio
		})
	} catch (e) {
		console.warn('[pinyin-follow] decode recording', e)
		logFollowReadCompareSkipped(target, 'legacy_user_decode_failed', {
			verdict: 'decode_error',
			err: String(e?.message || e),
			failureStage: e?.failureStage || 'legacy_decode',
			hadFrameCapture: !!(payload.recordPcmBuffer?.byteLength),
			frameCaptureBytes: payload.frameCaptureBytes || 0
		})
		return followReadFailResult('decode_error', target, {
			log: { err: String(e?.message || e) }
		})
	}

	const legacyGate = passesLegacySpeechGate(
		userFp,
		decoded,
		FOLLOW_READ_MIN_EFFECTIVE_MS,
		FOLLOW_READ_MIN_VOICED_RATIO
	)
	if (!legacyGate.pass) {
		logFollowReadCompareSkipped(target, 'legacy_no_speech_gate', {
			verdict: 'no_speech',
			gateReason: legacyGate.reason,
			userDurationMs: userFp?.durationMs,
			userVoicedRatio: userFp?.voicedRatio
		})
		return followReadFailResult('no_speech', target, {
			log: {
				stage: 'legacy_gate',
				gateReason: legacyGate.reason,
				userDurationMs: userFp?.durationMs,
				userVoicedRatio: userFp?.voicedRatio
			}
		})
	}

	const cmp = comparePcmFingerprints(refFp, userFp)
	const pass = cmp.matchScore >= FOLLOW_READ_PASS_SCORE
	const score = buildFollowReadScoreFromAudio(cmp, durationMs, sampleRate)
	let message = messageForAudioCompare(target, cmp, pass)
	if (!message) {
		message = pass ? `读对了，${score} 分` : `再试试「${target}」`
	}
	const verdict = pass ? 'match' : 'mismatch'
	logFollowReadScore('score.legacy.compare', {
		target,
		pass,
		passThreshold: FOLLOW_READ_PASS_SCORE,
		matchScore: +Number(cmp.matchScore || 0).toFixed(4),
		envSim: +Number(cmp.envSim || 0).toFixed(4),
		bandSim: +Number(cmp.bandSim || 0).toFixed(4),
		score
	})
	const res = {
		ok: true,
		score,
		pass,
		message,
		statusHint: pass ? `跟读 ${score} 分` : followReadStatusBarHint('mismatch', target),
		details: {
			targetMatch: Math.round(cmp.matchScore * 100),
			verdict,
			durationFit: durationMs >= 500 && durationMs <= 7000 ? 'good' : 'retry',
			envSim: Math.round((cmp.envSim || 0) * 100),
			bandSim: Math.round((cmp.bandSim || 0) * 100),
			scoring: 'legacy_v1'
		},
		debug: {
			target,
			durationMs,
			sampleRate,
			recordFormat,
			userDurationMs: userFp.durationMs,
			voicedRatio: userFp.voicedRatio,
			matchScore: cmp.matchScore,
			envSim: cmp.envSim,
			bandSim: cmp.bandSim,
			passThreshold: FOLLOW_READ_PASS_SCORE
		}
	}
	logFollowReadScore('score.legacy.done', summarizeFollowReadScoreResult(res))
	logFollowReadSimilarity(res, target, { path: 'legacy' })
	return res
}

export async function requestFollowReadScore(payload) {
	const target = String(payload?.symbol || '').trim()
	if (!target) {
		logFollowReadScore('score.reject', { reason: 'no_target' })
		return { ok: false, score: 0, message: '无拼读目标' }
	}
	const durationMs = Number(payload?.durationMs) || 0
	const tempFilePath = String(payload?.tempFilePath || '').trim()

	let recordPcmBuffer = payload?.recordPcmBuffer
	if (!recordPcmBuffer?.byteLength && lastScoringPcmBuffer?.byteLength) {
		recordPcmBuffer = lastScoringPcmBuffer
		payload.recordPcmBuffer = recordPcmBuffer
		payload.frameCaptureBytes = lastScoringPcmBuffer.byteLength
	}
	const frameCaptureBytes = Number(payload?.frameCaptureBytes) || recordPcmBuffer?.byteLength || 0

	logFollowReadScore('score.request', {
		target,
		durationMs,
		sampleRate: Number(payload?.sampleRate) || 16000,
		recordFormat: String(payload?.recordFormat || 'mp3'),
		useMfcc: shouldUseMfccScoring(),
		useMfccConfig: USE_MFCC_SCORING,
		mfccRuntime: shouldUseMfccScoring(),
		isAppPlus: isAppPlus(),
		noUniFs: mustUsePlusIoForLocalFiles(),
		hasFile: !!tempFilePath,
		frameCaptureBytes
	})

	if (!tempFilePath && !frameCaptureBytes) {
		return followReadFailResult('no_record', target)
	}

	if (durationMs < 400) {
		return followReadFailResult('too_short', target, {
			log: { durationMs, minMs: 400 }
		})
	}

	if (shouldUseMfccScoring()) {
		try {
			return await requestFollowReadScoreMfcc(payload)
		} catch (e) {
			console.warn('[pinyin-follow] mfcc fallback legacy', e)
			logFollowReadScore('score.mfcc.fallback_legacy', {
				target,
				err: String(e?.message || e),
				note: '用户录音解码/MFCC 提取失败，尝试 v1 包络比对'
			})
		}
	} else if (USE_MFCC_SCORING) {
		logFollowReadScore('score.mfcc.skipped_runtime', {
			target,
			note: 'Meyda 在当前端不可用，直接使用 v1'
		})
	}

	return requestFollowReadScoreLegacy(payload)
}

const RECORD_TEST_MAX_MS = 60000
const RECORD_TEST_STOP_TIMEOUT_MS = 8000
const RECORD_TEST_MIN_HOLD_MS = 280

export function getRecordTestState() {
	return {
		recording: recordTestRecording,
		followReadRecording: recording
	}
}

/**
 * 按住开始录音（录音测试页专用，勿与跟读同时进行）
 */
export async function startHoldRecordTest() {
	if (recording) {
		return { ok: false, message: '跟读正在录音，请先结束跟读' }
	}
	if (recordTestRecording) {
		return { ok: false, message: '已在录音中' }
	}
	const perm = await requestMicPermission()
	if (!perm.ok) return perm
	const rm = getRecorderManagerSafe()
	if (!rm) return { ok: false, message: '当前环境不支持录音' }

	recordTestFormat = resolveFollowReadRecordFormat()
	const useWav = recordTestFormat === 'wav'
	const usePcm = recordTestFormat === 'pcm'
	recordTestRecording = true
	recordTestStartedAt = Date.now()
	beginPcmFrameCapture()

	const startOpts = {
		duration: RECORD_TEST_MAX_MS,
		sampleRate: 16000,
		numberOfChannels: 1,
		format: recordTestFormat
	}
	if (!useWav && !usePcm) {
		startOpts.encodeBitRate = 48000
	}
	if (isAppPlus()) {
		startOpts.frameSize = 4
	}

	logFollowReadScore('record_test.start', {
		format: recordTestFormat,
		sampleRate: startOpts.sampleRate
	})

	try {
		rm.start(startOpts)
		if (isAppPlus()) {
			const pump = startAppFollowReadFramePump((buf) => onRecorderFrame(buf))
			if (pump.ok) {
				appFramePumpStop = pump.stop
				logFollowReadScore('record_test.app_frame_pump', { ok: true })
			} else {
				logFollowReadScore('record_test.app_frame_pump', {
					ok: false,
					reason: pump.reason || 'unavailable'
				})
			}
		}
		return { ok: true, recordFormat: recordTestFormat }
	} catch (e) {
		recordTestRecording = false
		stopAppFramePump()
		return { ok: false, message: String(e?.message || e) }
	}
}

/**
 * 松开结束录音（录音测试页）
 * @returns {Promise<{ ok: boolean, tempFilePath?: string, durationMs?: number, recordFormat?: string, message?: string }>}
 */
export function stopHoldRecordTest() {
	if (!recordTestRecording) {
		return Promise.resolve({ ok: false, message: '未在录音中' })
	}
	const rm = getRecorderManagerSafe()
	if (!rm) {
		recordTestRecording = false
		return Promise.resolve({ ok: false, message: '当前环境不支持录音' })
	}
	const heldMs = Date.now() - recordTestStartedAt
	const tooShort = heldMs < RECORD_TEST_MIN_HOLD_MS
	return new Promise((resolve) => {
		let settled = false
		const finish = (payload) => {
			if (settled) return
			settled = true
			logFollowReadScore('record_test.stop', {
				ok: !!payload?.ok,
				durationMs: payload?.durationMs,
				format: payload?.recordFormat || recordTestFormat,
				bytesHint: payload?.tempFilePath ? '(set)' : '',
				tooShort
			})
			resolve(payload)
		}
		const timer = setTimeout(() => {
			recordTestRecording = false
			recordTestStopResolve = null
			finish({ ok: false, message: '录音停止超时，请重试' })
		}, RECORD_TEST_STOP_TIMEOUT_MS)
		recordTestStopResolve = (payload) => {
			clearTimeout(timer)
			recordTestRecording = false
			if (tooShort) {
				finish({
					ok: false,
					message: `请按住至少 ${Math.ceil(RECORD_TEST_MIN_HOLD_MS / 1000)} 秒再松开`
				})
				return
			}
			finish(payload)
		}
		try {
			rm.stop()
		} catch (e) {
			clearTimeout(timer)
			recordTestRecording = false
			recordTestStopResolve = null
			finish({ ok: false, message: String(e?.message || e) })
		}
	})
}

/** 取消测试录音（页面卸载时） */
export function cancelHoldRecordTest() {
	if (!recordTestRecording) return
	recordTestRecording = false
	recordTestStopResolve = null
	stopAppFramePump()
	const rm = getRecorderManagerSafe()
	try {
		rm?.stop()
	} catch (_) {}
}
