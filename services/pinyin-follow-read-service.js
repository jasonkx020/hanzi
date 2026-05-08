let recorderManager = null
let recording = false
let recordStartedAt = 0
let currentResolve = null
const RECORD_HISTORY_KEY = 'pinyin_follow_read_history_v1'
const MAX_HISTORY = 12

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

function getRecorderManagerSafe() {
	if (recorderManager) return recorderManager
	if (typeof uni === 'undefined' || typeof uni.getRecorderManager !== 'function') return null
	recorderManager = uni.getRecorderManager()
	recorderManager.onStop((res) => {
		const durationMs = Date.now() - recordStartedAt
		recording = false
		const payload = {
			ok: true,
			tempFilePath: res?.tempFilePath || '',
			durationMs: Number(res?.duration || durationMs) || durationMs,
			sampleRate: 16000
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
		if (currentResolve) {
			currentResolve({ ok: false, message: err?.errMsg || '录音失败' })
			currentResolve = null
		}
	})
	return recorderManager
}

export async function requestMicPermission() {
	try {
		await new Promise((resolve, reject) => {
			uni.authorize({
				scope: 'scope.record',
				success: () => resolve(),
				fail: reject
			})
		})
		return { ok: true }
	} catch (_) {
		return { ok: false, message: '麦克风权限未开启' }
	}
}

export function getFollowReadState() {
	return {
		recording
	}
}

export function getFollowReadHistory() {
	return readHistory()
}

export async function startFollowReadRecord() {
	if (recording) return { ok: false, message: '录音进行中' }
	const perm = await requestMicPermission()
	if (!perm.ok) return perm
	const rm = getRecorderManagerSafe()
	if (!rm) return { ok: false, message: '当前环境不支持录音' }
	recording = true
	recordStartedAt = Date.now()
	rm.start({
		duration: 12000,
		sampleRate: 16000,
		numberOfChannels: 1,
		format: 'mp3'
	})
	return { ok: true }
}

export function stopFollowReadRecord() {
	if (!recording) return Promise.resolve({ ok: false, message: '未在录音中' })
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
	const volumeStd = Number(payload?.volumeStd ?? 0.78)
	const matchScore = Number(payload?.matchScore ?? 0.8)
	const base = 70 + (target.charCodeAt(0) % 20)
	const durBonus = Math.min(8, Math.round(durationMs / 1800))
	const srBonus = sampleRate >= 16000 ? 2 : 0
	const stabilityBonus = Math.round(Math.max(0, Math.min(1, volumeStd)) * 4)
	const matchBonus = Math.round(Math.max(0, Math.min(1, matchScore)) * 5)
	const pseudo = Math.max(60, Math.min(99, base + durBonus + srBonus + stabilityBonus + matchBonus))
	return {
		ok: true,
		score: pseudo,
		message: `评分占位：${pseudo} 分`,
		details: {
			volumeStability: Math.round(Math.max(0, Math.min(1, volumeStd)) * 100),
			durationFit: durationMs >= 800 && durationMs <= 7000 ? 'good' : 'retry',
			targetMatch: Math.round(Math.max(0, Math.min(1, matchScore)) * 100)
		},
		debug: {
			target,
			durationMs,
			sampleRate,
			volumeStd,
			matchScore
		}
	}
}
