/**
 * 跟读「是否有有效发音」门控（MFCC / legacy 共用部分逻辑）
 */
import {
	PINYIN_MFCC_MIN_EFFECTIVE_MS,
	PINYIN_MFCC_MIN_VOICED_RATIO,
	PINYIN_MFCC_MIN_FRAMES_FOR_GATE
} from '@/constants/pinyin-mfcc-config.js'

const TARGET_SR = 16000
const MIN_PCM_SAMPLES = 800

/**
 * @param {object} userFeat extractMfccFrom* 返回值
 * @param {{ int16?: Int16Array, samples?: Float32Array }} decoded
 * @param {number} [recordDurationMs] 录音器报告的时长
 */
export function passesMfccSpeechGate(userFeat, decoded, recordDurationMs = 0) {
	const frames = userFeat?.frames?.length || 0
	const voiced = Number(userFeat?.voicedRatio) || 0
	const pcmSamples = decoded?.int16?.length || decoded?.samples?.length || 0
	const rawMs = pcmSamples ? (pcmSamples / TARGET_SR) * 1000 : 0
	const trimmedMs = Number(userFeat?.durationMs) || 0

	if (frames >= PINYIN_MFCC_MIN_FRAMES_FOR_GATE && voiced >= PINYIN_MFCC_MIN_VOICED_RATIO) {
		return { pass: true, reason: 'mfcc_frames' }
	}
	if (pcmSamples >= MIN_PCM_SAMPLES && rawMs >= PINYIN_MFCC_MIN_EFFECTIVE_MS) {
		return { pass: true, reason: 'pcm_samples' }
	}
	if (
		trimmedMs >= PINYIN_MFCC_MIN_EFFECTIVE_MS &&
		voiced >= PINYIN_MFCC_MIN_VOICED_RATIO &&
		frames >= 1
	) {
		return { pass: true, reason: 'trimmed_duration' }
	}
	if (recordDurationMs >= 600 && pcmSamples >= 400 && frames >= 4) {
		return { pass: true, reason: 'short_file_many_frames' }
	}

	return {
		pass: false,
		reason: 'below_threshold',
		frames,
		voiced,
		rawMs,
		trimmedMs,
		pcmSamples,
		recordDurationMs
	}
}

/**
 * @param {object} userFp 包络指纹
 * @param {{ int16?: Int16Array, samples?: Float32Array }} decoded
 * @param {number} minEffectiveMs
 * @param {number} minVoicedRatio
 */
export function passesLegacySpeechGate(userFp, decoded, minEffectiveMs, minVoicedRatio) {
	const pcmSamples = decoded?.int16?.length || decoded?.samples?.length || 0
	const rawMs = pcmSamples ? (pcmSamples / TARGET_SR) * 1000 : 0
	if (pcmSamples >= MIN_PCM_SAMPLES && rawMs >= minEffectiveMs) {
		return { pass: true, reason: 'pcm_samples' }
	}
	if (
		userFp?.durationMs >= minEffectiveMs &&
		(Number(userFp.voicedRatio) || 0) >= minVoicedRatio
	) {
		return { pass: true, reason: 'fingerprint' }
	}
	return { pass: false, reason: 'below_threshold', rawMs, fpMs: userFp?.durationMs }
}
