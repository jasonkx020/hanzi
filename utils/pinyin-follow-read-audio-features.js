/**
 * 跟读音频特征：从单声道 PCM 提取短时能量轮廓与频带能量（无 ASR）。
 */

export const FOLLOW_READ_TARGET_SR = 16000
export const FOLLOW_READ_ENV_BINS = 32
const BAND_HZ = [200, 350, 500, 800, 1200, 1800, 2600, 3800]

/** @param {Float32Array} input @param {number} fromRate @param {number} toRate */
export function resampleMono(input, fromRate, toRate) {
	if (!input?.length) return new Float32Array(0)
	if (fromRate === toRate) return input
	const ratio = fromRate / toRate
	const outLen = Math.max(1, Math.floor(input.length / ratio))
	const out = new Float32Array(outLen)
	for (let i = 0; i < outLen; i++) {
		const pos = i * ratio
		const idx = Math.floor(pos)
		const frac = pos - idx
		const a = input[idx] ?? 0
		const b = input[idx + 1] ?? a
		out[i] = a + (b - a) * frac
	}
	return out
}

/** @param {Float32Array} samples @param {number} sr @param {number} [threshold] */
export function trimSilencePcm(samples, sr, threshold = 0.014) {
	if (!samples?.length) return samples
	const frame = Math.max(1, Math.floor(sr * 0.02))
	let start = 0
	let end = samples.length
	for (let i = 0; i < samples.length; i += frame) {
		let e = 0
		const lim = Math.min(i + frame, samples.length)
		for (let j = i; j < lim; j++) e += samples[j] * samples[j]
		if (Math.sqrt(e / (lim - i)) >= threshold) {
			start = i
			break
		}
	}
	for (let i = samples.length - frame; i >= 0; i -= frame) {
		let e = 0
		const lim = Math.min(i + frame, samples.length)
		for (let j = i; j < lim; j++) e += samples[j] * samples[j]
		if (Math.sqrt(e / (lim - i)) >= threshold) {
			end = lim
			break
		}
	}
	if (end <= start + frame) return samples.slice(start)
	return samples.slice(start, end)
}

function frameRms(samples, from, to) {
	let s = 0
	const n = to - from
	if (n <= 0) return 0
	for (let i = from; i < to; i++) s += samples[i] * samples[i]
	return Math.sqrt(s / n)
}

/** Goertzel 单频能量 */
function goertzelEnergy(samples, sr, freq) {
	const n = samples.length
	if (n < 8) return 0
	const k = Math.round((n * freq) / sr)
	const w = (2 * Math.PI * k) / n
	const coeff = 2 * Math.cos(w)
	let s0 = 0
	let s1 = 0
	let s2 = 0
	for (let i = 0; i < n; i++) {
		s0 = samples[i] + coeff * s1 - s2
		s2 = s1
		s1 = s0
	}
	const p = s1 * s1 + s2 * s2 - coeff * s1 * s2
	return Math.max(0, p) / n
}

function normalizeVector(v) {
	const arr = Float32Array.from(v)
	let sum = 0
	for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i]
	const norm = Math.sqrt(sum) || 1
	for (let i = 0; i < arr.length; i++) arr[i] /= norm
	return arr
}

/**
 * @param {Float32Array} samples 单声道
 * @param {number} sampleRate
 */
export function extractPcmFingerprint(samples, sampleRate) {
	const sr = sampleRate || FOLLOW_READ_TARGET_SR
	let mono = resampleMono(samples, sr, FOLLOW_READ_TARGET_SR)
	mono = trimSilencePcm(mono, FOLLOW_READ_TARGET_SR)
	const durationMs = mono.length ? (mono.length / FOLLOW_READ_TARGET_SR) * 1000 : 0

	const bins = FOLLOW_READ_ENV_BINS
	const env = new Float32Array(bins)
	if (mono.length >= bins) {
		const seg = Math.floor(mono.length / bins)
		for (let b = 0; b < bins; b++) {
			env[b] = frameRms(mono, b * seg, Math.min(mono.length, (b + 1) * seg))
		}
	}

	const bands = new Float32Array(BAND_HZ.length)
	const bandFrame = Math.min(mono.length, Math.floor(FOLLOW_READ_TARGET_SR * 0.12))
	if (bandFrame >= 64) {
		const mid = Math.floor((mono.length - bandFrame) / 2)
		const slice = mono.slice(mid, mid + bandFrame)
		for (let i = 0; i < BAND_HZ.length; i++) {
			bands[i] = Math.sqrt(goertzelEnergy(slice, FOLLOW_READ_TARGET_SR, BAND_HZ[i]))
		}
	}

	let voicedRatio = 0
	if (mono.length > 0) {
		const frame = Math.floor(FOLLOW_READ_TARGET_SR * 0.02)
		let voiced = 0
		let total = 0
		for (let i = 0; i < mono.length; i += frame) {
			const r = frameRms(mono, i, Math.min(mono.length, i + frame))
			total++
			if (r >= 0.02) voiced++
		}
		voicedRatio = total ? voiced / total : 0
	}

	return {
		env: normalizeVector(env),
		bands: normalizeVector(bands),
		durationMs,
		voicedRatio
	}
}
