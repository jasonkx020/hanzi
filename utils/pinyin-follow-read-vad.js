/**
 * 跟读录音结束检测：根据分片能量判断「已开口 + 持续静音」或超时。
 * 编码帧（mp3/aac）上用字节波动近似音量，各端兼容性好于强依赖 PCM。
 */

const DEFAULTS = {
	minRecordMs: 650,
	silenceMs: 1050,
	maxRecordMs: 9000,
	speechEnergy: 0.052
}

/** 无分片回调时的兜底最长录音时长（与音节长度相关） */
export function estimateFollowReadMaxMs(symbol) {
	const len = [...String(symbol || '').trim()].length
	return Math.min(7000, Math.max(2200, 1000 + len * 420))
}

export function createFollowReadVadState(symbol, opts = {}) {
	const o = { ...DEFAULTS, ...opts }
	return {
		opts: o,
		symbol: String(symbol || '').trim(),
		hasSpeech: false,
		silentSince: 0
	}
}

/** @param {ArrayBuffer} frameBuffer */
export function computeFrameEnergy(frameBuffer) {
	if (!frameBuffer || !frameBuffer.byteLength) return 0
	const u8 = new Uint8Array(frameBuffer)
	let sum = 0
	for (let i = 0; i < u8.length; i++) {
		sum += Math.abs(u8[i] - 128)
	}
	return sum / u8.length / 128
}

/**
 * @returns {'continue'|'silence'|'max'} 是否应结束录音
 */
export function tickFollowReadVad(state, energy, elapsedMs) {
	if (!state) return 'continue'
	const { opts } = state
	const e = Number(energy) || 0
	const t = Number(elapsedMs) || 0

	if (t >= opts.maxRecordMs) return 'max'

	if (e >= opts.speechEnergy) {
		state.hasSpeech = true
		state.silentSince = 0
		return 'continue'
	}

	if (!state.hasSpeech || t < opts.minRecordMs) return 'continue'

	const now = Date.now()
	if (!state.silentSince) {
		state.silentSince = now
		return 'continue'
	}
	if (now - state.silentSince >= opts.silenceMs) return 'silence'
	return 'continue'
}
