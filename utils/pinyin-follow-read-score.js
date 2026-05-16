/**
 * 跟读评分：音频特征相似度为主；文本比对仅作备用。
 */
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import {
	comparePcmFingerprints,
	FOLLOW_READ_PASS_SCORE
} from '@/utils/pinyin-follow-read-audio-compare.js'

function normalizeToken(s) {
	let t = stripPinyinToneMarks(String(s || '').trim().toLowerCase())
	t = t.replace(/v/g, 'ü')
	return t
}

/** 从识别结果里抽出可能的拼音片段 */
function extractPinyinTokens(text) {
	const raw = String(text || '').trim()
	if (!raw) return []
	const parts = raw.match(/[a-züɑ]+/gi) || []
	return parts.map(normalizeToken).filter(Boolean)
}

function editSimilarity(a, b) {
	const x = normalizeToken(a)
	const y = normalizeToken(b)
	if (!x && !y) return 1
	if (!x || !y) return 0
	if (x === y) return 1
	const m = x.length
	const n = y.length
	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
	for (let i = 0; i <= m; i++) dp[i][0] = i
	for (let j = 0; j <= n; j++) dp[0][j] = j
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = x[i - 1] === y[j - 1] ? 0 : 1
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
		}
	}
	const dist = dp[m][n]
	return 1 - dist / Math.max(m, n)
}

/**
 * @returns {{ matchScore: number, verdict: string, heardDisplay: string, message: string }}
 */
export function compareFollowReadToTarget(target, recognizedText) {
	const targetNorm = normalizeToken(target)
	const heardRaw = String(recognizedText || '').trim()

	if (!targetNorm) {
		return {
			matchScore: 0,
			verdict: 'no_target',
			heardDisplay: heardRaw,
			message: '无拼读目标'
		}
	}

	if (!heardRaw) {
		return {
			matchScore: 0,
			verdict: 'no_speech',
			heardDisplay: '',
			message: '没有听清你的读音，请靠近麦克风再读一次'
		}
	}

	const tokens = extractPinyinTokens(heardRaw)
	const heardDisplay = tokens.length ? tokens.join(' ') : heardRaw

	if (tokens.includes(targetNorm)) {
		return { matchScore: 1, verdict: 'match', heardDisplay, message: '' }
	}

	const joined = normalizeToken(tokens.join(''))
	if (joined && (joined === targetNorm || joined.includes(targetNorm) || targetNorm.includes(joined))) {
		return { matchScore: 0.92, verdict: 'match', heardDisplay, message: '' }
	}

	const first = tokens[0] || normalizeToken(heardRaw)
	const sim = editSimilarity(first, targetNorm)

	if (sim >= 0.88) {
		return {
			matchScore: sim,
			verdict: 'close',
			heardDisplay: first || heardDisplay,
			message: ''
		}
	}

	return {
		matchScore: sim,
		verdict: 'mismatch',
		heardDisplay: first || heardDisplay,
		message: `听到的是「${first || heardRaw}」，请读「${target}」`
	}
}

/**
 * @param {object} cmp comparePcmFingerprints 结果 + matchScore
 * @param {number} durationMs
 * @param {number} sampleRate
 */
export function buildFollowReadScoreFromAudio(cmp, durationMs, sampleRate) {
	const m = Math.max(0, Math.min(1, Number(cmp?.matchScore) || 0))
	let score
	if (m < FOLLOW_READ_PASS_SCORE) {
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

export function messageForAudioCompare(target, cmp, pass) {
	const targetNorm = String(target || '').trim()
	if (!pass) {
		const pct = Math.round((cmp?.matchScore || 0) * 100)
		if ((cmp?.durRatio || 0) < 0.35) {
			return `读得太短或没听清，请大声读「${targetNorm}」一遍`
		}
		return `和示范音还不太像（相似 ${pct}%），再试试「${targetNorm}」`
	}
	return ''
}

export { FOLLOW_READ_PASS_SCORE }

export function buildFollowReadScore(matchScore, durationMs, sampleRate) {
	const ms = Number(durationMs) || 0
	const sr = Number(sampleRate) || 16000
	const m = Math.max(0, Math.min(1, Number(matchScore) || 0))

	let score
	if (m < 0.55) {
		score = Math.round(35 + m * 25)
	} else {
		score = Math.round(50 + m * 45)
	}

	if (ms >= 500 && ms <= 6000) score = Math.min(99, score + 2)
	if (sr >= 16000) score = Math.min(99, score + 1)

	return Math.max(0, Math.min(99, score))
}
