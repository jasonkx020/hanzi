/**
 * Recorder-UniCore onProcess PCM 计数（回调内不打日志，停止时汇总）
 */
let frameCount = 0
let totalBytes = 0
let lastFrameBytes = 0
let expectedFrameBytes = 0
let logSourceTag = 'default'
let sampleRateTag = 0

export function resetRecorderFrameLog(source, meta = {}) {
	frameCount = 0
	totalBytes = 0
	lastFrameBytes = 0
	logSourceTag = source || 'default'
	expectedFrameBytes = Number(meta.frameBytes) || 0
	sampleRateTag = Number(meta.sampleRate) || 0
}

export function countRecorderOnFrame(chunk, decibel, source) {
	const len = Number(chunk?.byteLength) || 0
	if (len < 2) return false
	frameCount++
	totalBytes += len
	lastFrameBytes = len
	if (source && source !== logSourceTag) logSourceTag = source
	return true
}

export function printRecorderFrameSummary(source, extra = {}) {
	const tag = source || logSourceTag
	const parts = [
		`帧${frameCount}`,
		`${totalBytes}B`,
		expectedFrameBytes ? `预期≈${expectedFrameBytes}B/帧` : '',
		lastFrameBytes ? `末帧${lastFrameBytes}B` : '',
		sampleRateTag ? `${sampleRateTag}Hz` : ''
	].filter(Boolean)
	console.log(
		`[recorder-pcm:onFrame] ${tag} 结束`,
		parts.join(' · '),
		extra.pluginDurationMs != null ? `插件时长${extra.pluginDurationMs}ms` : '',
		extra.pluginDiagnostics || extra.stopFail ? extra : ''
	)
}
