/**
 * Node 构建 MFCC 指纹（与 constants/pinyin-mfcc-config.js 同参）
 */
import Meyda from 'meyda/dist/node/main.js'

export const TARGET_SR = 48000
export const FRAME_SIZE = 2048
export const HOP_SIZE = 512
export const MFCC_COEFFS = 13
export const TRIM_THRESHOLD = 0.014
export const DTW_SCALE = 0.42
export const PASS_SCORE = 0.5

let meydaReady = false

function ensureMeyda() {
	if (meydaReady) return
	Meyda.bufferSize = FRAME_SIZE
	Meyda.sampleRate = TARGET_SR
	meydaReady = true
}

function resampleMono(input, fromRate, toRate) {
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

function trimSilencePcm(samples, sr, threshold = TRIM_THRESHOLD) {
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

function computeVoicedRatio(mono, sr) {
	if (!mono?.length) return 0
	const frame = Math.max(1, Math.floor(sr * 0.02))
	let voiced = 0
	let total = 0
	for (let i = 0; i < mono.length; i += frame) {
		let s = 0
		const lim = Math.min(mono.length, i + frame)
		for (let j = i; j < lim; j++) s += mono[j] * mono[j]
		const r = Math.sqrt(s / (lim - i))
		total++
		if (r >= 0.02) voiced++
	}
	return total ? voiced / total : 0
}

function extractMfccFrame(frame) {
	ensureMeyda()
	if (!frame?.length || frame.length < FRAME_SIZE) return null
	const out = Meyda.extract('mfcc', frame.length === FRAME_SIZE ? frame : frame.subarray(0, FRAME_SIZE))
	if (!out?.length) return null
	return Array.from({ length: MFCC_COEFFS }, (_, i) => Number(out[i]) || 0)
}

export function extractMfccFromInt16(int16, sampleRate = TARGET_SR) {
	const samples = new Float32Array(int16.length)
	for (let i = 0; i < int16.length; i++) samples[i] = int16[i] / 32768
	let mono = resampleMono(samples, sampleRate, TARGET_SR)
	mono = trimSilencePcm(mono, TARGET_SR, TRIM_THRESHOLD)
	const durationMs = mono.length ? (mono.length / TARGET_SR) * 1000 : 0
	const voicedRatio = computeVoicedRatio(mono, TARGET_SR)
	const frames = []
	if (mono.length >= FRAME_SIZE) {
		for (let i = 0; i + FRAME_SIZE <= mono.length; i += HOP_SIZE) {
			const row = extractMfccFrame(mono.subarray(i, i + FRAME_SIZE))
			if (row) frames.push(row)
		}
	}
	return { frames, durationMs, voicedRatio }
}

export function serializeMfccEntry(feature) {
	return {
		durationMs: Math.round(feature.durationMs || 0),
		voicedRatio: +Number(feature.voicedRatio || 0).toFixed(4),
		frames: (feature.frames || []).map((row) => row.map((v) => +Number(v).toFixed(3)))
	}
}

/** 与 constants/pinyin-mfcc-config.js buildPinyinMfccMeta 字段一致 */
export function buildPinyinMfccMeta(extractorLabel = 'meyda') {
	return {
		version: 3,
		opusNativeSampleRate: TARGET_SR,
		sampleRate: TARGET_SR,
		channels: 1,
		bitsPerSample: 16,
		pcmFormat: 's16le',
		frameSize: FRAME_SIZE,
		hopSize: HOP_SIZE,
		mfccCoeffs: MFCC_COEFFS,
		extractor: extractorLabel
	}
}
