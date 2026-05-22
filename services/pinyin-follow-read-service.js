import { decodeUserRecordingForScore } from '@/utils/pinyin-follow-read-audio-decode.js'
// #ifdef APP-PLUS
import { getReferenceMfccFeature } from '@/utils/pinyin-follow-read-audio-decode.js'
// #endif
import {
	PINYIN_FOLLOW_READ_FIXED_MS,
	PINYIN_FOLLOW_READ_USE_FIXED_DURATION,
	PINYIN_FOLLOW_READ_USE_EFFECTIVE_DURATION,
	PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS,
	PINYIN_FOLLOW_READ_MAX_WALL_MS,
	PINYIN_FOLLOW_READ_WXZ_FIXED_WALL_MS,
	PINYIN_FOLLOW_READ_PCM_CAPTURE_GRACE_MS,
	getFollowReadTargetEffectiveMs,
	PINYIN_FOLLOW_READ_STOP_TIMEOUT_MS
} from '@/config/pinyin-follow-read-config.js'
import {
	isAppPlus,
	isFollowReadScoringSupported,
	mustUsePlusIoForLocalFiles
} from '@/utils/pinyin-follow-read-platform.js'
// #ifdef APP-PLUS
import { isMfccRuntimeAvailable } from '@/utils/pinyin-mfcc-extract.js'
// #endif
import {
	isPcmRealtimeAvailable,
	requestPcmRealtimePermission,
	startPcmRealtimeCapture,
	stopPcmRealtimeCapture
} from '@/utils/pinyin-pcm-realtime.js'
import {
	logFollowReadScore,
	logFollowReadSimilarity,
	logFollowReadCompareSkipped,
	summarizeFollowReadScoreResult
} from '@/utils/pinyin-follow-read-debug-log.js'
// #ifdef APP-PLUS
import { extractMfccFromFloat32, extractMfccFromInt16 } from '@/utils/pinyin-mfcc-extract.js'
import { compareMfccFeatures, MFCC_PASS_SCORE } from '@/utils/pinyin-mfcc-compare.js'
import {
	buildFollowReadScoreFromMfcc,
	messageForMfccCompare
} from '@/utils/pinyin-mfcc-score.js'
import {
	PINYIN_MFCC_MIN_EFFECTIVE_MS,
	PINYIN_MFCC_MIN_VOICED_RATIO,
	PINYIN_MFCC_MIN_FRAMES_FOR_GATE
} from '@/constants/pinyin-mfcc-config.js'
// #endif
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
// #ifdef APP-PLUS
import { passesMfccSpeechGate } from '@/utils/pinyin-follow-read-speech-gate.js'
// #endif
import {
	PINYIN_RECORD_PCM_SAMPLE_RATE,
	PINYIN_RECORD_WXZ_FRAME_BYTES,
	PINYIN_RECORD_PCM_FRAME_SIZE_KB,
	PINYIN_RECORD_MIN_PCM_BYTES,
	PINYIN_RECORD_CAPTURE_MS,
	PINYIN_RECORD_TARGET_PCM_BYTES,
	PINYIN_PCM_BYTES_PER_SAMPLE
} from '@/constants/pinyin-audio-sample-rate.js'

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
/** 停止计时器后仍供进度条展示的最近一次有效发声进度 */
let lastEffectiveProgressSnapshot = null
/** @type {((progress: number, meta?: object) => void)|null} */
let recordProgressListener = null
let recordProgressUseEffective = false
let recordProgressTargetBytes = PINYIN_RECORD_TARGET_PCM_BYTES
let followReadOnFrameCount = 0
let vadFallbackTimer = null
let fixedDurationTimer = null
/** @type {{ minWallMs: number, targetPcmBytes: number, maxWallMs: number }|null} */
let recordCapturePlan = null
let autoStopInProgress = false
let effectiveWallTickTimer = null
/** @type {string} */
let lastRecordFormat = 'pcm'

/** 录音测试（按住录、松开停） */
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

function useAppPcmRealtime() {
	return isAppPlus() && isPcmRealtimeAvailable()
}

function resolveFollowReadRecordFormat() {
	if (useAppPcmRealtime()) return 'pcm'
	return 'mp3'
}

function beginPcmFrameCapture() {
	if (!isAppPlus()) {
		activePcmFrameChunks = null
		return
	}
	activePcmFrameChunks = []
}

/** 16-bit 单声道 PCM 时长（毫秒） */
function pcmS16leMonoDurationMs(byteLength, sampleRate = PINYIN_RECORD_PCM_SAMPLE_RATE) {
	const bytes = Number(byteLength) || 0
	const sr = Number(sampleRate) || PINYIN_RECORD_PCM_SAMPLE_RATE
	if (bytes < 2 || sr <= 0) return 0
	return Math.round((bytes / 2 / sr) * 1000)
}

function pcmS16leBytesForWallMs(ms) {
	const wall = Math.max(0, Number(ms) || 0)
	return Math.floor(
		PINYIN_RECORD_PCM_SAMPLE_RATE * PINYIN_PCM_BYTES_PER_SAMPLE * (wall / 1000)
	)
}

function totalActivePcmBytes() {
	if (!activePcmFrameChunks?.length) return 0
	let total = 0
	for (const c of activePcmFrameChunks) total += c.byteLength
	return total
}

/** 页面注册：onFrame 时更新录制进度条 */
export function setFollowReadRecordProgressListener(listener) {
	recordProgressListener = typeof listener === 'function' ? listener : null
}

function notifyRecordProgressFromPcm() {
	if (!recording || !recordProgressListener) return
	const pcmBytes = totalActivePcmBytes()
	if (recordProgressUseEffective && effectiveAudioState) {
		const snap = getEffectiveAudioProgress(effectiveAudioState)
		lastEffectiveProgressSnapshot = snap
		try {
			recordProgressListener(Number(snap.progress) || 0, {
				pcmBytes,
				frameCount: followReadOnFrameCount,
				effectiveMs: snap.effectiveMs,
				speechStarted: !!snap.speechStarted
			})
		} catch (_) {}
		return
	}
	const target = Math.max(PINYIN_RECORD_MIN_PCM_BYTES, recordProgressTargetBytes)
	const progress = Math.min(100, (pcmBytes / target) * 100)
	try {
		recordProgressListener(progress, {
			pcmBytes,
			frameCount: followReadOnFrameCount,
			speechStarted: true
		})
	} catch (_) {}
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
	if (total < PINYIN_RECORD_MIN_PCM_BYTES) {
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
	const sampleRate = Number(payload?.sampleRate) || PINYIN_RECORD_PCM_SAMPLE_RATE
	const pcmBytes = buf?.byteLength || 0
	const pcmDurationMs = pcmS16leMonoDurationMs(pcmBytes, sampleRate)
	const recorderDurationMs = Number(payload?.durationMs) || 0
	logFollowReadScore('score.record.pcm_capture', {
		chunks: chunksBefore,
		bytes: pcmBytes,
		pcmDurationMs,
		pcmDurationSec: Number((pcmDurationMs / 1000).toFixed(3)),
		sampleRate,
		recorderDurationMs,
		source: useAppPcmRealtime() ? 'recorder-unicore' : 'recorder',
		wxzFrameBytes: useAppPcmRealtime() ? PINYIN_RECORD_WXZ_FRAME_BYTES : null,
		targetPcmBytes: PINYIN_RECORD_TARGET_PCM_BYTES
	})
	if (
		useAppPcmRealtime() &&
		pcmBytes > 0 &&
		(pcmBytes < PINYIN_RECORD_TARGET_PCM_BYTES ||
			pcmDurationMs < PINYIN_RECORD_CAPTURE_MS * 0.9)
	) {
		console.warn('[pinyin-follow] ⚠ 录音 PCM 偏短，MFCC 评分可能不足', {
			chunks: chunksBefore,
			pcmBytes,
			pcmDurationMs,
			recorderDurationMs,
			needBytes: PINYIN_RECORD_TARGET_PCM_BYTES,
			needMs: PINYIN_RECORD_CAPTURE_MS
		})
	}
	if (buf?.byteLength) {
		payload.recordPcmBuffer = buf
		payload.frameCaptureBytes = buf.byteLength
		payload.recordPcmDurationMs = pcmDurationMs
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
	payload.ok = hasFile || pcmBytes >= PINYIN_RECORD_MIN_PCM_BYTES
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
	recordCapturePlan = null
}

function tryCompleteFixedCapture() {
	if (!recording || !recordCapturePlan) return
	const elapsed = Date.now() - recordStartedAt
	const pcmBytes = totalActivePcmBytes()
	const { minWallMs, targetPcmBytes, maxWallMs } = recordCapturePlan

	if (elapsed < minWallMs) {
		if (fixedDurationTimer != null) clearTimeout(fixedDurationTimer)
		fixedDurationTimer = setTimeout(tryCompleteFixedCapture, minWallMs - elapsed)
		return
	}
	if (pcmBytes < targetPcmBytes && elapsed < maxWallMs) {
		if (fixedDurationTimer != null) clearTimeout(fixedDurationTimer)
		fixedDurationTimer = setTimeout(tryCompleteFixedCapture, 50)
		return
	}

	if (fixedDurationTimer != null) {
		clearTimeout(fixedDurationTimer)
		fixedDurationTimer = null
	}
	recordCapturePlan = null
	triggerFollowReadAutoStop('fixed_duration')
}

function scheduleFixedDurationStop(ms) {
	clearFixedDurationTimer()
	const minWallMs = Math.max(
		PINYIN_RECORD_CAPTURE_MS,
		Number(ms) || PINYIN_FOLLOW_READ_WXZ_FIXED_WALL_MS || PINYIN_FOLLOW_READ_FIXED_MS
	)
	const grace = Math.max(500, Number(PINYIN_FOLLOW_READ_PCM_CAPTURE_GRACE_MS) || 2500)
	recordCapturePlan = {
		minWallMs,
		targetPcmBytes: pcmS16leBytesForWallMs(minWallMs),
		maxWallMs: minWallMs + grace
	}
	fixedDurationTimer = setTimeout(tryCompleteFixedCapture, minWallMs)
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
		return Math.min(15000, Math.max(PINYIN_RECORD_CAPTURE_MS, Math.round(v)))
	}
	return PINYIN_FOLLOW_READ_FIXED_MS
}

export function getFollowReadEffectiveProgress() {
	const real = effectiveAudioState
		? getEffectiveAudioProgress(effectiveAudioState)
		: lastEffectiveProgressSnapshot || getEffectiveAudioProgress(null)
	return { ...real, wallAssist: false }
}

export { getFollowReadTargetEffectiveMs }

function clearVadTimers() {
	if (vadFallbackTimer != null) {
		clearTimeout(vadFallbackTimer)
		vadFallbackTimer = null
	}
	clearFixedDurationTimer()
	stopEffectiveWallTick()
	vadState = null
	effectiveAudioState = null
	lastEffectiveProgressSnapshot = null
}

/** 仅取消定时/VAD，不停止录音流（避免与自动结束竞态清空 onAutoStop） */
export function cancelFollowReadAutoStop() {
	clearVadTimers()
}

/** 用户打断连读/切页：不再触发 onAutoStop 评分 */
export function clearFollowReadAutoStopCallback() {
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
		maxWallMs: PINYIN_FOLLOW_READ_MAX_WALL_MS,
		sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
		frameSizeKb: useAppPcmRealtime() ? PINYIN_RECORD_PCM_FRAME_SIZE_KB : 4
	})
	lastEffectiveProgressSnapshot = null
	scheduleWallRecordTimeout(PINYIN_FOLLOW_READ_MAX_WALL_MS)
	logFollowReadScore('score.record.effective_mode', {
		symbol: String(symbol || '').trim(),
		targetEffectiveMs,
		maxWallMs: PINYIN_FOLLOW_READ_MAX_WALL_MS
	})
}

function onRecorderFrame(frameBuffer, frameMeta) {
	if (autoStopInProgress || !frameBuffer) return
	const inFollow = recording
	const inTest = recordTestRecording
	if (!inFollow && !inTest) return
	if (inFollow) followReadOnFrameCount++
	appendPcmFrameChunk(frameBuffer)
	if (!inFollow) return

	const elapsed = Date.now() - recordStartedAt
	const pcmLike = true

	if (effectiveAudioState) {
		const verdict = tickEffectiveAudioFrame(
			effectiveAudioState,
			frameBuffer,
			elapsed,
			pcmLike,
			{ decibel: frameMeta?.decibel }
		)
		lastEffectiveProgressSnapshot = getEffectiveAudioProgress(effectiveAudioState)
		notifyRecordProgressFromPcm()
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
			return
		}
	}

	notifyRecordProgressFromPcm()

	if (recordCapturePlan && !effectiveAudioState && !vadState) {
		tryCompleteFixedCapture()
	}
}

async function triggerFollowReadAutoStop(reason) {
	if (!recording || autoStopInProgress) return
	autoStopInProgress = true
	logFollowReadScore('score.record.auto_stop', { reason: String(reason || '') })
	try {
		await stopFollowReadRecord()
	} finally {
		autoStopInProgress = false
	}
}

function buildStopPayloadFromPcm(durationMs) {
	return markFollowReadStopOk({
		ok: false,
		tempFilePath: '',
		durationMs,
		sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
		recordFormat: 'pcm',
		message: ''
	})
}

function deliverFollowReadStop(marked, { isTest = false } = {}) {
	if (isTest) {
		const finish = recordTestStopResolve
		recordTestStopResolve = null
		recordTestRecording = false
		if (finish) finish(marked)
		return
	}
	recording = false
	if (followReadOnFrameCount > 0) {
		const pcmB = Number(marked?.frameCaptureBytes) || 0
		console.log(
			`[follow-read:onFrame] 跟读结束，业务 onFrame ${followReadOnFrameCount} 次，PCM ${pcmB}B`
		)
	}
	followReadOnFrameCount = 0
	setFollowReadRecordProgressListener(null)
	clearVadTimers()
	if (marked.tempFilePath) {
		appendHistory({
			tempFilePath: marked.tempFilePath,
			durationMs: marked.durationMs,
			sampleRate: marked.sampleRate,
			createdAt: Date.now()
		})
	}
	if (currentResolve) {
		currentResolve(marked)
		currentResolve = null
	}
	const cb = autoStopCallback
	autoStopCallback = null
	if (cb) {
		try {
			logFollowReadScore('score.record.ui_onAutoStop', {
				ok: !!marked?.ok,
				bytes: marked?.frameCaptureBytes || 0
			})
			cb(marked)
		} catch (e) {
			console.warn('[pinyin-follow] onAutoStop', e)
		}
	}
}

function bindMpFrameListenerIfNeeded(rm) {
	if (!rm || typeof rm.onFrameRecorded !== 'function' || useAppPcmRealtime()) return
	rm.onFrameRecorded((res) => {
		const buf = res?.frameBuffer
		if (buf) onRecorderFrame(buf)
	})
}

function getRecorderManagerSafe() {
	if (useAppPcmRealtime()) return null
	if (recorderManager) return recorderManager
	if (typeof uni === 'undefined' || typeof uni.getRecorderManager !== 'function') return null
	recorderManager = uni.getRecorderManager()
	bindMpFrameListenerIfNeeded(recorderManager)
	recorderManager.onStop((res) => {
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
				sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
				recordFormat: recordTestFormat,
				message: tempFilePath ? '' : '未生成录音文件'
			}
			const markedTest = markFollowReadStopOk(attachPcmBufferToStopPayload(testPayload))
			finish(markedTest)
			return
		}
		const durationMs = Date.now() - recordStartedAt
		const tempFilePath = String(res?.tempFilePath || '').trim()
		const marked = markFollowReadStopOk(
			attachPcmBufferToStopPayload({
				ok: !!tempFilePath,
				tempFilePath,
				durationMs: Number(res?.duration || durationMs) || durationMs,
				sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
				recordFormat: lastRecordFormat,
				message: tempFilePath ? '' : '未生成录音文件'
			})
		)
		deliverFollowReadStop(marked, { isTest: false })
	})
	recorderManager.onError((err) => {
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
	if (useAppPcmRealtime()) {
		const android = await requestMicPermissionApp()
		if (!android.ok) return android
		return requestPcmRealtimePermission()
	}
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
	if (isAppPlus() && !isPcmRealtimeAvailable()) {
		return {
			ok: false,
			message: '请安装 recorder-core 与 Recorder-UniCore 后使用跟读录音'
		}
	}

	const symbol = String(options.symbol || '').trim()
	const autoStop = options.autoStop !== false
	const wxzFixedWall =
		useAppPcmRealtime() &&
		autoStop &&
		options.useWxzFixedWall !== false
	const useEffective =
		!wxzFixedWall &&
		autoStop &&
		PINYIN_FOLLOW_READ_USE_EFFECTIVE_DURATION &&
		options.useEffectiveDuration !== false
	const fixedMs = wxzFixedWall
		? Math.max(
				PINYIN_RECORD_CAPTURE_MS,
				Number(PINYIN_FOLLOW_READ_WXZ_FIXED_WALL_MS) || PINYIN_RECORD_CAPTURE_MS
			)
		: useEffective
			? 0
			: getFollowReadFixedDurationMs(options)
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
	followReadOnFrameCount = 0
	autoStopInProgress = false
	recordStartedAt = Date.now()
	beginPcmFrameCapture()
	lastRecordFormat = resolveFollowReadRecordFormat()
	recordProgressUseEffective = useEffective
	recordProgressTargetBytes =
		fixedMs > 0 ? pcmS16leBytesForWallMs(fixedMs) : PINYIN_RECORD_TARGET_PCM_BYTES

	logFollowReadScore('score.record.start', {
		symbol,
		fixedMs,
		useEffective,
		wxzFixedWall,
		targetEffectiveMs: useEffective ? getFollowReadTargetEffectiveMs(options) : 0,
		maxWallMs: useEffective
			? PINYIN_FOLLOW_READ_MAX_WALL_MS
			: recordCapturePlan?.maxWallMs || fixedMs || 0,
		targetPcmBytes: recordCapturePlan?.targetPcmBytes || PINYIN_RECORD_TARGET_PCM_BYTES,
		format: lastRecordFormat,
		capture: useAppPcmRealtime() ? 'recorder-unicore' : 'recorder_manager'
	})

	if (useAppPcmRealtime()) {
		try {
			await startPcmRealtimeCapture({
				sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
				frameSize: PINYIN_RECORD_WXZ_FRAME_BYTES,
				logSource: 'follow-read',
				onFrame: (buf, meta) => onRecorderFrame(buf, meta),
				onError: (err) => {
					logFollowReadScore('score.record.wxz_record_error', {
						err: err?.errMsg || err?.message || String(err),
						code: err?.code
					})
					if (recording) {
						recording = false
						clearVadTimers()
						if (currentResolve) {
							currentResolve({
								ok: false,
								message: err?.errMsg || '录音失败'
							})
							currentResolve = null
						}
					}
				}
			})
		} catch (e) {
			recording = false
			clearVadTimers()
			return { ok: false, message: String(e?.message || e) }
		}
		if (useEffective) startEffectiveWallTick()
		logFollowReadScore('score.record.wxz_record_started', { useEffective, wxzFixedWall, fixedMs })
		return {
			ok: true,
			fixedDurationMs: fixedMs,
			useEffectiveDuration: useEffective,
			wxzFixedWall,
			targetEffectiveMs: useEffective ? getFollowReadTargetEffectiveMs(options) : 0,
			maxWallMs: useEffective
				? PINYIN_FOLLOW_READ_MAX_WALL_MS
				: recordCapturePlan?.maxWallMs || fixedMs || 0,
			targetPcmBytes: recordCapturePlan?.targetPcmBytes || PINYIN_RECORD_TARGET_PCM_BYTES,
			recordFormat: lastRecordFormat
		}
	}

	const rm = getRecorderManagerSafe()
	if (!rm) return { ok: false, message: '当前环境不支持录音' }

	const recorderMaxMs = useEffective
		? PINYIN_FOLLOW_READ_MAX_WALL_MS + 3000
		: fixedMs > 0
			? recordCapturePlan?.maxWallMs || fixedMs
			: 12000

	const startOpts = {
		duration: recorderMaxMs,
		sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
		numberOfChannels: 1,
		format: lastRecordFormat,
		frameSize: 4
	}
	if (lastRecordFormat === 'mp3') {
		startOpts.encodeBitRate = 48000
	}

	rm.start(startOpts)
	startEffectiveWallTick()
	logFollowReadScore('score.record.rm_started', {
		format: lastRecordFormat,
		useEffective
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
	clearVadTimers()

	if (useAppPcmRealtime()) {
		const wallMs = Date.now() - recordStartedAt
		return stopPcmRealtimeCapture().then(({ durationMs: pluginMs }) => {
			const durationMs = Math.max(wallMs, Number(pluginMs) || 0)
			const marked = markFollowReadStopOk(
				attachPcmBufferToStopPayload(buildStopPayloadFromPcm(durationMs))
			)
			deliverFollowReadStop(marked, { isTest: false })
			return marked
		})
	}

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

// #ifdef APP-PLUS
async function requestFollowReadScoreMfcc(payload) {
	const target = String(payload?.symbol || '').trim()
	const durationMs = Number(payload?.durationMs) || 0
	const sampleRate = Number(payload?.sampleRate) || PINYIN_RECORD_PCM_SAMPLE_RATE
	const tempFilePath = String(payload?.tempFilePath || '').trim()
	const recordFormat = String(payload?.recordFormat || 'mp3')

	const frameCaptureBytes =
		Number(payload?.frameCaptureBytes) || payload?.recordPcmBuffer?.byteLength || 0
	const pcmDurationMs =
		Number(payload?.recordPcmDurationMs) ||
		pcmS16leMonoDurationMs(frameCaptureBytes, sampleRate)

	logFollowReadScore('score.mfcc.start', {
		target,
		durationMs,
		sampleRate,
		recordFormat,
		tempFilePath: tempFilePath ? '(set)' : '',
		frameCaptureBytes,
		pcmDurationMs,
		pcmDurationSec: Number((pcmDurationMs / 1000).toFixed(3)),
		scoringAudioMs: pcmDurationMs > 0 ? pcmDurationMs : durationMs
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
// #endif

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
		if (!payload.recordPcmDurationMs) {
			payload.recordPcmDurationMs = pcmS16leMonoDurationMs(
				lastScoringPcmBuffer.byteLength,
				Number(payload?.sampleRate) || PINYIN_RECORD_PCM_SAMPLE_RATE
			)
		}
	}
	const frameCaptureBytes = Number(payload?.frameCaptureBytes) || recordPcmBuffer?.byteLength || 0
	const sampleRate = Number(payload?.sampleRate) || PINYIN_RECORD_PCM_SAMPLE_RATE
	const pcmDurationMs =
		Number(payload?.recordPcmDurationMs) ||
		pcmS16leMonoDurationMs(frameCaptureBytes, sampleRate)

	logFollowReadScore('score.request', {
		target,
		durationMs,
		sampleRate,
		recordFormat: String(payload?.recordFormat || 'mp3'),
		// #ifdef APP-PLUS
		mfccRuntime: isMfccRuntimeAvailable(),
		// #endif
		scoringSupported: isFollowReadScoringSupported(),
		isAppPlus: isAppPlus(),
		noUniFs: mustUsePlusIoForLocalFiles(),
		hasFile: !!tempFilePath,
		frameCaptureBytes,
		pcmDurationMs,
		pcmDurationSec: Number((pcmDurationMs / 1000).toFixed(3)),
		scoringAudioMs: pcmDurationMs > 0 ? pcmDurationMs : durationMs
	})

	if (!tempFilePath && !frameCaptureBytes) {
		return followReadFailResult('no_record', target)
	}

	if (durationMs < 400) {
		return followReadFailResult('too_short', target, {
			log: { durationMs, minMs: 400 }
		})
	}

	if (
		frameCaptureBytes > 0 &&
		pcmDurationMs > 0 &&
		pcmDurationMs < PINYIN_RECORD_CAPTURE_MS * 0.85
	) {
		return followReadFailResult('too_short', target, {
			log: {
				pcmDurationMs,
				frameCaptureBytes,
				needMs: PINYIN_RECORD_CAPTURE_MS
			}
		})
	}

	if (!isFollowReadScoringSupported()) {
		return followReadFailResult('unsupported_platform', target)
	}

	// #ifdef APP-PLUS
	if (!isMfccRuntimeAvailable()) {
		logFollowReadScore('score.mfcc.unavailable', { target })
		return followReadFailResult('mfcc_unavailable', target)
	}

	try {
		return await requestFollowReadScoreMfcc(payload)
	} catch (e) {
		console.warn('[pinyin-follow] mfcc score', e)
		return followReadFailResult(classifyFollowReadThrowable(e), target, {
			log: { err: String(e?.message || e) }
		})
	}
	// #endif
}

const RECORD_TEST_MAX_MS = 60000
const RECORD_TEST_STOP_TIMEOUT_MS = 8000
const RECORD_TEST_MIN_HOLD_MS = PINYIN_RECORD_CAPTURE_MS

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
	if (isAppPlus() && !isPcmRealtimeAvailable()) {
		return { ok: false, message: '请安装 recorder-core 与 Recorder-UniCore' }
	}

	recordTestFormat = resolveFollowReadRecordFormat()
	recordTestRecording = true
	recordTestStartedAt = Date.now()
	beginPcmFrameCapture()

	logFollowReadScore('record_test.start', {
		format: recordTestFormat,
		capture: useAppPcmRealtime() ? 'recorder-unicore' : 'recorder_manager'
	})

	try {
		if (useAppPcmRealtime()) {
			await startPcmRealtimeCapture({
				sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
				frameSize: PINYIN_RECORD_WXZ_FRAME_BYTES,
				logSource: 'record-test',
				onFrame: (buf, meta) => onRecorderFrame(buf, meta),
				onError: (err) => {
					recordTestRecording = false
					if (recordTestStopResolve) {
						recordTestStopResolve({
							ok: false,
							message: err?.errMsg || '录音失败'
						})
						recordTestStopResolve = null
					}
				}
			})
			return { ok: true, recordFormat: recordTestFormat }
		}
		const rm = getRecorderManagerSafe()
		if (!rm) return { ok: false, message: '当前环境不支持录音' }
		const startOpts = {
			duration: RECORD_TEST_MAX_MS,
			sampleRate: PINYIN_RECORD_PCM_SAMPLE_RATE,
			numberOfChannels: 1,
			format: recordTestFormat,
			frameSize: 4
		}
		if (recordTestFormat === 'mp3') {
			startOpts.encodeBitRate = 48000
		}
		rm.start(startOpts)
		return { ok: true, recordFormat: recordTestFormat }
	} catch (e) {
		recordTestRecording = false
		await stopPcmRealtimeCapture().catch(() => {})
		return { ok: false, message: String(e?.message || e) }
	}
}

/**
 * 松开结束录音（录音测试页）
 * @returns {Promise<{ ok: boolean, tempFilePath?: string, durationMs?: number, recordFormat?: string, message?: string }>}
 */
export async function stopHoldRecordTest() {
	if (!recordTestRecording) {
		return { ok: false, message: '未在录音中' }
	}
	const heldMs = Date.now() - recordTestStartedAt
	const tooShort = heldMs < RECORD_TEST_MIN_HOLD_MS

	if (useAppPcmRealtime()) {
		const { durationMs: pluginMs } = await stopPcmRealtimeCapture()
		const durationMs = Math.max(heldMs, Number(pluginMs) || 0)
		const base = buildStopPayloadFromPcm(durationMs)
		recordTestRecording = false
		const marked = markFollowReadStopOk(attachPcmBufferToStopPayload({ ...base }))
		if (tooShort) {
			return {
				ok: false,
				message: `请按住至少 ${Math.ceil(RECORD_TEST_MIN_HOLD_MS / 1000)} 秒再松开`
			}
		}
		logFollowReadScore('record_test.stop', {
			ok: !!marked.ok,
			durationMs: marked.durationMs,
			format: marked.recordFormat,
			frameBytes: marked.frameCaptureBytes || 0
		})
		return marked
	}

	const rm = getRecorderManagerSafe()
	if (!rm) {
		recordTestRecording = false
		return Promise.resolve({ ok: false, message: '当前环境不支持录音' })
	}
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
	void stopPcmRealtimeCapture().catch(() => {})
	activePcmFrameChunks = null
	const rm = getRecorderManagerSafe()
	try {
		rm?.stop()
	} catch (_) {}
}
