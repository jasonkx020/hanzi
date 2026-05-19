/**
 * MFCC 跟读分数与文案（复用 v1 分数映射形态）
 */
import { MFCC_PASS_SCORE } from './pinyin-mfcc-compare.js'

export { MFCC_PASS_SCORE }

export function buildFollowReadScoreFromMfcc(cmp, durationMs, sampleRate) {
	const m = Math.max(0, Math.min(1, Number(cmp?.matchScore) || 0))
	let score
	if (m < MFCC_PASS_SCORE) {
		score = Math.round(32 + m * 30)
	} else {
		score = Math.round(48 + m * 48)
	}
	const ms = Number(durationMs) || 0
	const sr = Number(sampleRate) || 16000
	if (ms >= 500 && ms <= 6000) score = Math.min(99, score + 2)
	if (sr >= 16000) score = Math.min(99, score + 1)
	return Math.max(0, Math.min(99, score))
}

export function messageForMfccCompare(target, cmp, pass) {
	const targetNorm = String(target || '').trim()
	if (!pass) {
		const pct = Math.round((cmp?.matchScore || 0) * 100)
		if ((cmp?.durRatio || 0) < 0.35) {
			return `读得太短或没听清，请大声读「${targetNorm}」一遍`
		}
		if ((cmp?.userFrames || 0) < 2) {
			return `发音太短，请完整读「${targetNorm}」`
		}
		return `和示范音还不太像（相似 ${pct}%），再试试「${targetNorm}」`
	}
	return ''
}
