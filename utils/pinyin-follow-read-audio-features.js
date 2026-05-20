/**
 * 跟读音频工具：重采样、去静音（MFCC 提取共用）
 */
import { PINYIN_PCM_SAMPLE_RATE } from '@/constants/pinyin-audio-sample-rate.js'

/** @param {Float32Array} input @param {number} fromRate @param {number} toRate */
export function resampleMono(input, fromRate, toRate = PINYIN_PCM_SAMPLE_RATE) {
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
export function trimSilencePcm(samples, sr = PINYIN_PCM_SAMPLE_RATE, threshold = 0.014) {
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
