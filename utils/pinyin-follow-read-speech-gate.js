/**
 * 跟读「是否有有效发音」门控（MFCC）
 */
import { PINYIN_PCM_SAMPLE_RATE } from '@/constants/pinyin-audio-sample-rate.js'
import {
	PINYIN_MFCC_MIN_EFFECTIVE_MS,
	PINYIN_MFCC_MIN_VOICED_RATIO,
	PINYIN_MFCC_MIN_FRAMES_FOR_GATE
} from '@/constants/pinyin-mfcc-config.js'

import { PINYIN_RECORD_MIN_PCM_SAMPLES } from '@/constants/pinyin-audio-sample-rate.js'

const MIN_PCM_SAMPLES = PINYIN_RECORD_MIN_PCM_SAMPLES

/**
 * @param {object} userFeat extractMfccFrom* 返回值
 * @param {{ int16?: Int16Array, samples?: Float32Array }} decoded
 * @param {number} [recordDurationMs] 录音器报告的时长
 */
export function passesMfccSpeechGate(userFeat, decoded, recordDurationMs = 0) {
	const frames = userFeat?.frames?.length || 0
	const voiced = Number(userFeat?.voicedRatio) || 0
	const pcmSamples = decoded?.int16?.length || decoded?.samples?.length || 0
	const rawMs = pcmSamples ? (pcmSamples / PINYIN_PCM_SAMPLE_RATE) * 1000 : 0
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
