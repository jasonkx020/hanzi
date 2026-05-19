/**
 * 拼音跟读评分调试日志：console + 调试页环形缓冲。
 * 由 config/pinyin-follow-read-config.js 的 FOLLOW_READ_SCORE_DEBUG 开关控制。
 */
import { appendDebugLog } from '@/utils/debug-console-hook.js'
import { FOLLOW_READ_SCORE_DEBUG } from '@/config/pinyin-follow-read-config.js'
import {
	followReadSimilarityPercent,
	followReadStatusWithSimilarity,
	hasFollowReadSimilarity
} from '@/utils/pinyin-follow-read-ui-messages.js'

/**
 * @param {string} step 如 score.request / score.mfcc.compare
 * @param {object} [detail]
 */
export function logFollowReadScore(step, detail) {
	if (!FOLLOW_READ_SCORE_DEBUG) return
	const head = `[pinyin-follow-score] ${step}`
	try {
		console.log(head, detail !== undefined ? detail : '')
	} catch (_) {}
	let serialized = ''
	try {
		serialized =
			detail !== undefined && typeof detail === 'object' && detail !== null
				? JSON.stringify(detail)
				: String(detail ?? '')
	} catch (_) {
		serialized = '[unserializable]'
	}
	try {
		appendDebugLog('log', head, serialized)
	} catch (_) {}
}

/**
 * 打印相似度结果（专用一行，便于过滤 score.similarity）
 * @param {object} scoreRes requestFollowReadScore 返回值
 * @param {string} [target] 目标音节
 * @param {object} [extra] 如 { source: 'pinyin-page' }
 */
export function logFollowReadSimilarity(scoreRes, target = '', extra = {}) {
	if (!FOLLOW_READ_SCORE_DEBUG) return
	const d = scoreRes?.details || {}
	const dbg = scoreRes?.debug || {}
	const pct = followReadSimilarityPercent(scoreRes)
	const detail = {
		target: String(target || dbg.target || '').trim(),
		pass: !!scoreRes?.pass,
		ok: !!scoreRes?.ok,
		score: scoreRes?.score,
		verdict: d.verdict,
		scoring: d.scoring,
		hasSimilarity: hasFollowReadSimilarity(scoreRes),
		similarityPercent: pct,
		targetMatch: d.targetMatch,
		dtwSim: d.dtwSim,
		envSim: d.envSim,
		bandSim: d.bandSim,
		matchScore: dbg.matchScore,
		passThreshold: dbg.passThreshold,
		refFrames: d.refFrames,
		userFrames: d.userFrames,
		uiHint: followReadStatusWithSimilarity(scoreRes, target),
		...extra
	}
	logFollowReadScore('score.similarity', detail)
	try {
		if (detail.hasSimilarity && pct != null) {
			console.log(
				`[pinyin-follow-score] 相似度 ${pct}% · ${detail.pass ? '通过' : '未通过'} · ${detail.target}`
			)
		} else if (detail.skippedReason) {
			console.warn(
				`[pinyin-follow-score] 未比对相似度 · ${detail.skippedReason} · ${detail.target || ''}`
			)
		}
	} catch (_) {}
}

/** DTW 未执行时说明原因（如无声音、解码失败） */
export function logFollowReadCompareSkipped(target, reason, extra = {}) {
	if (!FOLLOW_READ_SCORE_DEBUG) return
	const detail = {
		target: String(target || '').trim(),
		skippedReason: String(reason || 'unknown'),
		compareRan: false,
		...extra
	}
	logFollowReadScore('score.compare_skipped', detail)
	logFollowReadSimilarity(
		{ ok: false, pass: false, details: { verdict: extra.verdict || reason } },
		target,
		{ skippedReason: reason, ...extra }
	)
}

/** 评分结果摘要（避免把整段 MFCC 帧写入日志） */
export function summarizeFollowReadScoreResult(res) {
	if (!res || typeof res !== 'object') return res
	const d = res.details || {}
	const dbg = res.debug || {}
	return {
		ok: !!res.ok,
		pass: !!res.pass,
		score: res.score,
		message: res.message,
		verdict: d.verdict,
		scoring: d.scoring,
		targetMatch: d.targetMatch,
		dtwSim: d.dtwSim,
		envSim: d.envSim,
		bandSim: d.bandSim,
		durationFit: d.durationFit,
		refFrames: d.refFrames,
		userFrames: d.userFrames,
		debug: dbg
	}
}
