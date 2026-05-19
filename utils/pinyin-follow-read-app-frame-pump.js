/**
 * App 端 uni.getRecorderManager().onFrameRecorded 官方标注「暂不支持」。
 * 可在 RecorderManager 启动后尝试并行 AudioRecord（部分机型仍读不到，则走 RM 文件评分）。
 */
import { isAppPlus, isAndroidAppPlus } from '@/utils/pinyin-follow-read-platform.js'

/** uni 文档：App 不支持 onFrameRecorded */
export function isUniRecorderFrameCallbackSupported() {
	return !isAppPlus()
}

function normalizeJavaInt(v) {
	if (v == null) return 0
	if (typeof v === 'number' && Number.isFinite(v)) return v | 0
	try {
		if (typeof v.intValue === 'function') return v.intValue() | 0
	} catch (_) {}
	return Number(v) || 0
}

/**
 * @param {object} byteBuf Java byte[]
 * @param {number} n
 */
function javaBytesToArrayBuffer(byteBuf, n) {
	const out = new Uint8Array(n)
	for (let i = 0; i < n; i++) {
		let b = byteBuf[i]
		if (typeof b !== 'number') {
			try {
				b = plus.android.invoke(byteBuf, '[B', i)
			} catch (_) {
				b = 0
			}
		}
		out[i] = (b < 0 ? b + 256 : b) & 0xff
	}
	return out.buffer
}

function readAudioRecordBytes(audioRecord, byteBuf, bufSize) {
	let n = 0
	try {
		n = normalizeJavaInt(audioRecord.read(byteBuf, 0, bufSize))
	} catch (_) {}
	if (n > 0) return n
	try {
		n = normalizeJavaInt(
			plus.android.invoke(audioRecord, 'read', byteBuf, 0, bufSize)
		)
	} catch (_) {}
	return n > 0 ? n : 0
}

/**
 * @param {(frameBuffer: ArrayBuffer) => void} onFrame
 * @param {{ onStats?: (stats: object) => void }} [options]
 * @returns {{ ok: boolean, stop: () => void, reason?: string }}
 */
export function startAppFollowReadFramePump(onFrame, options = {}) {
	if (!isAppPlus() || typeof onFrame !== 'function') {
		return { ok: false, stop() {}, reason: 'not_app' }
	}
	if (!isAndroidAppPlus()) {
		return { ok: false, stop() {}, reason: 'not_android' }
	}
	// #ifdef APP-PLUS
	try {
		const AudioRecord = plus.android.importClass('android.media.AudioRecord')
		const MediaRecorder = plus.android.importClass('android.media.MediaRecorder')
		const AudioFormat = plus.android.importClass('android.media.AudioFormat')

		const SAMPLE_RATE = 16000
		const CHANNEL = AudioFormat.CHANNEL_IN_MONO
		const ENCODING = AudioFormat.ENCODING_PCM_16BIT
		let bufSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL, ENCODING)
		if (!Number.isFinite(bufSize) || bufSize <= 0) bufSize = 4096
		bufSize = Math.max(4096, bufSize)
		const recordBufBytes = bufSize * 2

		const sources = [
			MediaRecorder.AudioSource.MIC,
			MediaRecorder.AudioSource.VOICE_RECOGNITION
		]
		let audioRecord = null
		let usedSource = 0
		for (let si = 0; si < sources.length; si++) {
			const src = sources[si]
			try {
				const ar = new AudioRecord(src, SAMPLE_RATE, CHANNEL, ENCODING, recordBufBytes)
				if (ar.getState() === 1) {
					audioRecord = ar
					usedSource = src
					break
				}
				try {
					ar.release()
				} catch (_) {}
			} catch (_) {}
		}
		if (!audioRecord) {
			return { ok: false, stop() {}, reason: 'audio_record_create_failed' }
		}

		audioRecord.startRecording()
		const recState = audioRecord.getRecordingState()
		const byteBuf = plus.android.newObject('byte[]', bufSize)
		let alive = true
		let totalFrames = 0
		let totalBytes = 0
		let zeroReads = 0

		options.onStats?.({
			event: 'started',
			audioSource: usedSource,
			recordingState: recState,
			bufSize
		})

		const pump = () => {
			if (!alive) return
			try {
				const n = readAudioRecordBytes(audioRecord, byteBuf, bufSize)
				if (n > 0) {
					totalFrames++
					totalBytes += n
					zeroReads = 0
					onFrame(javaBytesToArrayBuffer(byteBuf, n))
					if (totalFrames === 1) {
						options.onStats?.({
							event: 'first_frame',
							bytes: n,
							audioSource: usedSource
						})
					}
				} else {
					zeroReads++
					if (zeroReads === 8 && totalFrames === 0) {
						options.onStats?.({
							event: 'read_zero',
							recordingState: audioRecord.getRecordingState()
						})
					}
				}
			} catch (e) {
				options.onStats?.({ event: 'exception', message: String(e?.message || e) })
			}
		}

		const timer = setInterval(pump, 48)
		setTimeout(pump, 120)

		return {
			ok: true,
			stop() {
				alive = false
				clearInterval(timer)
				options.onStats?.({
					event: 'stop',
					totalFrames,
					totalBytes,
					audioSource: usedSource
				})
				try {
					if (audioRecord.getRecordingState() === 3) {
						audioRecord.stop()
					}
				} catch (_) {}
				try {
					audioRecord.release()
				} catch (_) {}
			}
		}
	} catch (e) {
		return { ok: false, stop() {}, reason: String(e?.message || e) }
	}
	// #endif
	// #ifndef APP-PLUS
	return { ok: false, stop() {}, reason: 'not_app_compile' }
	// #endif
}
