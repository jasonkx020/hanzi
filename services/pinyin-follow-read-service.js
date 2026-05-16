import {
	buildFollowReadScoreFromAudio,
	messageForAudioCompare,
	FOLLOW_READ_PASS_SCORE
} from '@/utils/pinyin-follow-read-score.js'
import { comparePcmFingerprints } from '@/utils/pinyin-follow-read-audio-compare.js'
import { extractPcmFingerprint } from '@/utils/pinyin-follow-read-audio-features.js'
import {
	decodeRecordingToMono,
	getReferenceFingerprint
} from '@/utils/pinyin-follow-read-audio-decode.js'
import {
	computeFrameEnergy,
	createFollowReadVadState,
	estimateFollowReadMaxMs,
	tickFollowReadVad
} from '@/utils/pinyin-follow-read-vad.js'
import {
	classifyFollowReadThrowable,
	followReadStatusBarHint,
	followReadUserMessage
} from '@/utils/pinyin-follow-read-ui-messages.js'

const FOLLOW_READ_MIN_VOICED_RATIO = 0.06
const FOLLOW_READ_MIN_EFFECTIVE_MS = 180

function followReadFailResult(verdict, target) {
	const v = String(verdict || 'analysis_error')
	return {
		ok: false,
		score: 0,
		pass: false,
		message: followReadUserMessage(v, target),
		statusHint: followReadStatusBarHint(v, target),
		details: {
			targetMatch: 0,
			verdict: v,
			durationFit: 'retry'
		}
	}
}

let recorderManager = null
let recording = false
let recordStartedAt = 0
let currentResolve = null
let autoStopCallback = null
let vadState = null
let vadFallbackTimer = null
let autoStopInProgress = false
let frameListenerBound = false
/** @type {string} */
let lastRecordFormat = 'mp3'

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

function clearVadTimers() {
	if (vadFallbackTimer != null) {
		clearTimeout(vadFallbackTimer)
		vadFallbackTimer = null
	}
	vadState = null
}

export function cancelFollowReadAutoStop() {
	clearVadTimers()
	autoStopCallback = null
}

function scheduleVadFallback(symbol) {
	if (vadFallbackTimer != null) clearTimeout(vadFallbackTimer)
	const ms = estimateFollowReadMaxMs(symbol)
	vadFallbackTimer = setTimeout(() => {
		triggerFollowReadAutoStop('timeout')
	}, ms)
}

function initFollowReadVad(symbol) {
	clearVadTimers()
	vadState = createFollowReadVadState(symbol)
	scheduleVadFallback(symbol)
}

function onRecorderFrame(frameBuffer) {
	if (!recording || !vadState || autoStopInProgress) return
	const energy = computeFrameEnergy(frameBuffer)
	const elapsed = Date.now() - recordStartedAt
	const verdict = tickFollowReadVad(vadState, energy, elapsed)
	if (verdict === 'silence' || verdict === 'max') {
		triggerFollowReadAutoStop(verdict)
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
		const durationMs = Date.now() - recordStartedAt
		recording = false
		clearVadTimers()
		autoStopCallback = null
		const payload = {
			ok: true,
			tempFilePath: res?.tempFilePath || '',
			durationMs: Number(res?.duration || durationMs) || durationMs,
			sampleRate: 16000,
			recordFormat: lastRecordFormat
		}
		if (payload.tempFilePath) {
			appendHistory({
				tempFilePath: payload.tempFilePath,
				durationMs: payload.durationMs,
				sampleRate: payload.sampleRate,
				createdAt: Date.now()
			})
		}
		if (currentResolve) currentResolve(payload)
		currentResolve = null
	})
	recorderManager.onError((err) => {
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
	autoStopCallback = typeof options.onAutoStop === 'function' ? options.onAutoStop : null

	if (autoStop) {
		initFollowReadVad(symbol)
	} else {
		cancelFollowReadAutoStop()
	}

	recording = true
	autoStopInProgress = false
	recordStartedAt = Date.now()

	const startOpts = {
		duration: 12000,
		sampleRate: 16000,
		numberOfChannels: 1,
		format: 'mp3'
	}
	// #ifdef APP-PLUS
	lastRecordFormat = 'pcm'
	startOpts.format = 'pcm'
	// #endif
	// #ifndef APP-PLUS
	lastRecordFormat = 'mp3'
	// #endif
	if (autoStop) {
		startOpts.frameSize = 4
	}

	rm.start(startOpts)
	return { ok: true }
}

export function stopFollowReadRecord() {
	if (!recording) return Promise.resolve({ ok: false, message: '未在录音中' })
	cancelFollowReadAutoStop()
	const rm = getRecorderManagerSafe()
	if (!rm) return Promise.resolve({ ok: false, message: '当前环境不支持录音' })
	return new Promise((resolve) => {
		currentResolve = resolve
		rm.stop()
	})
}

export async function requestFollowReadScore(payload) {
	const target = String(payload?.symbol || '').trim()
	if (!target) {
		return { ok: false, score: 0, message: '无拼读目标' }
	}
	const durationMs = Number(payload?.durationMs) || 0
	const sampleRate = Number(payload?.sampleRate) || 16000
	const tempFilePath = String(payload?.tempFilePath || '').trim()
	const recordFormat = String(payload?.recordFormat || 'mp3')

	if (!tempFilePath) {
		return followReadFailResult('no_record', target)
	}

	if (durationMs < 400) {
		return followReadFailResult('too_short', target)
	}

	let refFp
	try {
		refFp = await getReferenceFingerprint(target)
	} catch (e) {
		console.warn('[pinyin-follow] ref fingerprint', e)
		return followReadFailResult('ref_error', target)
	}

	let userFp
	try {
		const { samples, sampleRate: userSr } = await decodeRecordingToMono(tempFilePath, recordFormat)
		userFp = extractPcmFingerprint(samples, userSr)
	} catch (e) {
		console.warn('[pinyin-follow] decode recording', e)
		return followReadFailResult('decode_error', target)
	}

	if (
		!userFp?.durationMs ||
		userFp.durationMs < FOLLOW_READ_MIN_EFFECTIVE_MS ||
		(Number(userFp.voicedRatio) || 0) < FOLLOW_READ_MIN_VOICED_RATIO
	) {
		return followReadFailResult('no_speech', target)
	}

	try {
		const cmp = comparePcmFingerprints(refFp, userFp)
		const pass = cmp.matchScore >= FOLLOW_READ_PASS_SCORE
		const score = buildFollowReadScoreFromAudio(cmp, durationMs, sampleRate)
		let message = messageForAudioCompare(target, cmp, pass)
		if (!message) {
			message = pass ? `读对了，${score} 分` : `再试试「${target}」`
		}

		const verdict = pass ? 'match' : 'mismatch'
		return {
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
				bandSim: Math.round((cmp.bandSim || 0) * 100)
			},
			debug: {
				target,
				durationMs,
				sampleRate,
				recordFormat,
				userDurationMs: userFp.durationMs,
				voicedRatio: userFp.voicedRatio
			}
		}
	} catch (e) {
		console.warn('[pinyin-follow] audio score', e)
		return followReadFailResult(classifyFollowReadThrowable(e), target)
	}
}
