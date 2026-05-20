/**
 * MFCC 跟读分数与文案
 */
import { MFCC_PASS_SCORE } from './pinyin-mfcc-compare.js'
import { PINYIN_MFCC_MIN_FRAMES_FOR_GATE } from '../constants/pinyin-mfcc-config.js'
import { PINYIN_PCM_SAMPLE_RATE } from '../constants/pinyin-audio-sample-rate.js'

export { MFCC_PASS_SCORE }

export function buildFollowReadScoreFromMfcc(cmp, durationMs, sampleRate) {
	const m = Math.max(0, Math.min(1, Number(cmp?.matchScore) || 0))
	let score
	if (m < MFCC_PASS_SCORE) {
		score = Math.round(32 + m * 30)
	} else {
		score = Math.round(48 + m * 48)
	}
	const sr = Number(sampleRate) || PINYIN_PCM_SAMPLE_RATE
	/** 得分与录音墙钟长短解耦；是否「同一音」由 MFCC DTW 决定 */
	if (sr >= PINYIN_PCM_SAMPLE_RATE) score = Math.min(99, score + 1)
	return Math.max(0, Math.min(99, score))
}

export function messageForMfccCompare(target, cmp, pass) {
	const targetNorm = String(target || '').trim()
	if (!pass) {
		const pct = Math.round((cmp?.matchScore || 0) * 100)
		if ((cmp?.userFrames || 0) < PINYIN_MFCC_MIN_FRAMES_FOR_GATE) {
			return `录音太短、信息不够，请完整读「${targetNorm}」`
		}
		return `和示范音还不太像（相似 ${pct}%），再试试「${targetNorm}」`
	}
	return ''
}
