/**
 * 跟读：累计「有效发声」时长，达到目标后结束（非墙钟定时）。
 */
import { computeFrameEnergy } from '@/utils/pinyin-follow-read-vad.js'
import {
	PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS,
	PINYIN_FOLLOW_READ_MAX_WALL_MS
} from '@/config/pinyin-follow-read-config.js'

const DEFAULTS = {
	targetEffectiveMs: PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS,
	maxWallMs: PINYIN_FOLLOW_READ_MAX_WALL_MS,
	/** Int16 PCM RMS 阈值（约 0.012，儿童轻声） */
	speechEnergy: 0.012,
	sampleRate: 16000,
	/** frameSize 单位 KB，与 RecorderManager 一致 */
	frameSizeKb: 4
}

/**
 * @param {ArrayBuffer} frameBuffer
 * @param {number} sampleRate
 * @param {boolean} [pcmLike]
 */
export function measureFrameSpeech(frameBuffer, sampleRate = 16000, pcmLike = true) {
	if (!frameBuffer?.byteLength) {
		return { energy: 0, durationMs: 0 }
	}
	const byteLen = frameBuffer.byteLength
	let durationMs = 0
	let energy = 0

	if (pcmLike && byteLen >= 2 && byteLen % 2 === 0) {
		const view = new Int16Array(frameBuffer)
		let sum = 0
		for (let i = 0; i < view.length; i++) {
			const s = view[i] / 32768
			sum += s * s
		}
		energy = view.length ? Math.sqrt(sum / view.length) : 0
		durationMs = (view.length / sampleRate) * 1000
	} else {
		energy = computeFrameEnergy(frameBuffer)
		const samples = Math.max(1, Math.floor(byteLen / 2))
		durationMs = (samples / sampleRate) * 1000
	}

	return { energy, durationMs }
}

export function createEffectiveAudioState(opts = {}) {
	const o = { ...DEFAULTS, ...opts }
	return {
		opts: o,
		effectiveMs: 0,
		speechStarted: false
	}
}

/**
 * @returns {'continue'|'target_reached'|'max'}
 */
export function tickEffectiveAudioFrame(state, frameBuffer, wallElapsedMs, pcmLike = true) {
	if (!state) return 'continue'
	const { opts } = state
	const wall = Number(wallElapsedMs) || 0
	if (wall >= opts.maxWallMs) return 'max'

	const { energy, durationMs } = measureFrameSpeech(
		frameBuffer,
		opts.sampleRate,
		pcmLike
	)
	const frameMs =
		durationMs > 0
			? durationMs
			: ((opts.frameSizeKb * 1024) / 2 / opts.sampleRate) * 1000

	if (energy >= opts.speechEnergy && frameMs > 0) {
		if (!state.speechStarted) state.speechStarted = true
		state.effectiveMs += frameMs
		if (state.effectiveMs >= opts.targetEffectiveMs) return 'target_reached'
	}

	return 'continue'
}

export function getEffectiveAudioProgress(state) {
	if (!state) {
		return {
			effectiveMs: 0,
			targetMs: PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS,
			progress: 0,
			speechStarted: false
		}
	}
	const targetMs = state.opts.targetEffectiveMs
	const effectiveMs = state.effectiveMs
	const speechStarted = !!state.speechStarted
	const progress = speechStarted
		? Math.min(100, (effectiveMs / Math.max(1, targetMs)) * 100)
		: 0
	return { effectiveMs, targetMs, progress, speechStarted }
}
