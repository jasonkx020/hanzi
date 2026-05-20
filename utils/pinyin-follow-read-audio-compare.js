/**
 * 跟读：参考示范音与用户录音的音频特征相似度（DTW + 频带余弦）。
 */

function cosineSimilarity(a, b) {
	if (!a?.length || !b?.length) return 0
	const n = Math.min(a.length, b.length)
	let dot = 0
	for (let i = 0; i < n; i++) dot += a[i] * b[i]
	return Math.max(0, Math.min(1, dot))
}

/** 序列 DTW，返回归一化距离 [0,1]（越小越像） */
function dtwDistance(a, b) {
	const n = a.length
	const m = b.length
	if (!n || !m) return 1
	const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1).fill(Infinity))
	dp[0][0] = 0
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			const cost = Math.abs(a[i - 1] - b[j - 1])
			dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
		}
	}
	return dp[n][m] / (n + m)
}

function dtwSimilarity(a, b) {
	return Math.max(0, 1 - dtwDistance(a, b) * 2.2)
}

/**
 * @param {{ env: Float32Array, bands: Float32Array, durationMs: number, voicedRatio?: number }} refFp
 * @param {{ env: Float32Array, bands: Float32Array, durationMs: number, voicedRatio?: number }} userFp
 * @returns {{ matchScore: number, envSim: number, bandSim: number, durRatio: number }}
 */
export function comparePcmFingerprints(refFp, userFp) {
	if (!refFp || !userFp) {
		return { matchScore: 0, envSim: 0, bandSim: 0, durRatio: 0 }
	}

	const envSim = dtwSimilarity(refFp.env, userFp.env)
	const bandSim = cosineSimilarity(refFp.bands, userFp.bands)
	const refDur = Number(refFp.durationMs) || 1
	const userDur = Number(userFp.durationMs) || 0
	const durRatio = userDur <= 0 ? 0 : Math.min(refDur, userDur) / Math.max(refDur, userDur)

	/** 与 MFCC 路径一致：重视谱形状相似，不按 1s/2s 时长差压分 */
	const voiced = Number(userFp.voicedRatio) || 0
	const voiceFactor = voiced < 0.08 ? 0.35 : voiced < 0.15 ? 0.7 : 1

	const raw = (0.58 * envSim + 0.42 * bandSim) * voiceFactor
	const matchScore = Math.max(0, Math.min(1, raw))

	return { matchScore, envSim, bandSim, durRatio }
}

/** 及格阈值（单音节跟读） */
export const FOLLOW_READ_PASS_SCORE = 0.52
