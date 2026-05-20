/**
 * wxz-record onFrame 计数（回调内不打日志，停止录音时汇总一行）。
 */

const sessions = new Map()

function getSession(source) {
	const key = source || 'default'
	if (!sessions.has(key)) {
		sessions.set(key, {
			seq: 0,
			withData: 0,
			empty: 0,
			totalPcmBytes: 0,
			frameMs: 0,
			sampleRate: 0,
			frameBytes: 0
		})
	}
	return sessions.get(key)
}

/** @param {number} frameBytes 传给插件的 config.frameSize @param {number} sampleRate */
export function pcmFrameDurationMs(frameBytes, sampleRate) {
	if (!frameBytes || !sampleRate) return 0
	return (frameBytes / (sampleRate * 2)) * 1000
}

/** Android 单次 onFrame 常见为 frameSize×2 字节（见 wxz-record app-android） */
export function androidReadBytesPerCallback(configFrameBytes) {
	return (Number(configFrameBytes) || 0) * 2
}

/** @param {number} durationMs @param {number} frameBytes @param {number} sampleRate */
export function estimatePcmFrameCount(durationMs, frameBytes, sampleRate) {
	const readBytes = androidReadBytesPerCallback(frameBytes)
	const frameMs = pcmFrameDurationMs(readBytes, sampleRate)
	if (!frameMs) return 0
	return Math.max(1, Math.ceil(durationMs / frameMs))
}

/**
 * @param {string} [source]
 * @param {{ sampleRate?: number, frameBytes?: number }} [opts]
 */
export function resetWxzRecordFrameLog(source, opts = {}) {
	const key = source || 'default'
	const sampleRate = Number(opts.sampleRate) || 0
	const frameBytes = Number(opts.frameBytes) || 0
	const readBytes = androidReadBytesPerCallback(frameBytes)
	const frameMs = pcmFrameDurationMs(readBytes, sampleRate)
	sessions.set(key, {
		seq: 0,
		withData: 0,
		empty: 0,
		totalPcmBytes: 0,
		frameMs,
		sampleRate,
		frameBytes
	})
}

/**
 * @param {*} data onFrame 第一个参数
 * @param {number} [_decibel]
 * @param {string} [source]
 * @returns {boolean} 是否有有效 PCM 字节
 */
export function countWxzRecordOnFrame(data, _decibel, source = 'default') {
	const s = getSession(source)
	s.seq++
	const byteLength = Number(data?.byteLength) || 0
	const hasPcm = byteLength > 0
	if (hasPcm) {
		s.withData++
		s.totalPcmBytes += byteLength
	} else {
		s.empty++
	}
	return hasPcm
}

/** @deprecated 使用 countWxzRecordOnFrame */
export const logWxzRecordOnFrame = countWxzRecordOnFrame

/**
 * 停止录音时打印 onFrame 次数（仅此一处日志）。
 * @param {string} [source]
 * @param {object} [extra]
 */
export function printWxzRecordFrameSummary(source, extra = {}) {
	const s = getSession(source)
	const impliedPcmMs =
		s.sampleRate > 0 ? (s.totalPcmBytes / 2 / s.sampleRate) * 1000 : 0
	const parts = [
		`[wxz-record:onFrame] ${source || 'default'} 结束`,
		`回调${s.seq}次`,
		`有PCM${s.withData}次`,
		s.empty ? `空${s.empty}次` : null,
		`PCM ${s.totalPcmBytes}B`,
		impliedPcmMs ? `~${Math.round(impliedPcmMs)}ms` : null
	].filter(Boolean)
	const tail = extra && Object.keys(extra).length ? extra : null
	if (tail) console.log(parts.join(', '), tail)
	else console.log(parts.join(', '))
}

/** @deprecated 使用 printWxzRecordFrameSummary */
export const logWxzRecordFrameSummary = printWxzRecordFrameSummary
