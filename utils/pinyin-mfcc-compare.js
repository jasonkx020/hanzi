/**
 * MFCC 帧序列 DTW 相似度
 */
import { PINYIN_MFCC_DTW_SCALE, PINYIN_MFCC_PASS_SCORE } from '../constants/pinyin-mfcc-config.js'

function frameCost(a, b) {
	if (!a?.length || !b?.length) return 1
	const n = Math.min(a.length, b.length)
	let s = 0
	for (let i = 0; i < n; i++) {
		const d = (Number(a[i]) || 0) - (Number(b[i]) || 0)
		s += d * d
	}
	return Math.sqrt(s / n)
}

/**
 * 多维帧 DTW，返回归一化距离 [0, ~1+]
 * @param {number[][]} refFrames
 * @param {number[][]} userFrames
 */
export function dtwDistanceMfccFrames(refFrames, userFrames) {
	const n = refFrames?.length || 0
	const m = userFrames?.length || 0
	if (!n || !m) return 1

	const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1).fill(Infinity))
	dp[0][0] = 0

	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			const cost = frameCost(refFrames[i - 1], userFrames[j - 1])
			dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
		}
	}

	return dp[n][m] / (n + m)
}

function dtwSimilarity(refFrames, userFrames) {
	const dist = dtwDistanceMfccFrames(refFrames, userFrames)
	return Math.max(0, Math.min(1, 1 - dist * PINYIN_MFCC_DTW_SCALE))
}

/**
 * @param {{ frames: number[][], durationMs: number, voicedRatio?: number }} refFeat
 * @param {{ frames: number[][], durationMs: number, voicedRatio?: number }} userFeat
 */
export function compareMfccFeatures(refFeat, userFeat) {
	if (!refFeat?.frames?.length || !userFeat?.frames?.length) {
		return { matchScore: 0, dtwSim: 0, durRatio: 0, refFrames: 0, userFrames: 0 }
	}

	const dtwSim = dtwSimilarity(refFeat.frames, userFeat.frames)
	const refDur = Number(refFeat.durationMs) || 1
	const userDur = Number(userFeat.durationMs) || 0
	const durRatio = userDur <= 0 ? 0 : Math.min(refDur, userDur) / Math.max(refDur, userDur)

	let durFactor = 1
	if (durRatio < 0.35) durFactor = 0.45
	else if (durRatio < 0.55) durFactor = 0.72
	else if (durRatio > 2.2) durFactor = 0.65

	const voiced = Number(userFeat.voicedRatio) || 0
	const voiceFactor = voiced < 0.08 ? 0.35 : voiced < 0.15 ? 0.7 : 1

	const frameFactor =
		userFeat.frames.length < 2
			? 0.5
			: userFeat.frames.length < 4
				? 0.82
				: 1

	const raw = (0.88 * dtwSim + 0.12 * durRatio) * durFactor * voiceFactor * frameFactor
	const matchScore = Math.max(0, Math.min(1, raw))

	return {
		matchScore,
		dtwSim,
		durRatio,
		refFrames: refFeat.frames.length,
		userFrames: userFeat.frames.length
	}
}

export { PINYIN_MFCC_PASS_SCORE as MFCC_PASS_SCORE }
