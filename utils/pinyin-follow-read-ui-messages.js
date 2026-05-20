/**
 * 跟读 UI 文案：模式栏短提示 vs Toast 完整说明。
 * verdict 与 requestFollowReadScore 的 details.verdict 一致。
 */

/** @param {string} verdict */
export function followReadStatusBarHint(verdict, target = '') {
	const t = String(target || '').trim()
	switch (verdict) {
		case 'no_record':
		case 'no_speech':
			return '没听清，请靠近麦克风'
		case 'too_short':
			return '录音太短，请大声读一遍'
		case 'decode_error':
		case 'analysis_error':
			return '无法分析读音，请靠近麦克风'
		case 'ref_error':
			return '示范音加载失败，请重试'
		case 'unsupported_platform':
			return '请使用 App 跟读'
		case 'mfcc_unavailable':
			return '评分引擎不可用'
		case 'mismatch':
		case 'close':
			return t ? `再试试「${t}」` : '再试一次'
		default:
			return '请靠近麦克风再读一次'
	}
}

/** @param {string} verdict */
export function followReadUserMessage(verdict, target = '') {
	const t = String(target || '').trim()
	switch (verdict) {
		case 'no_record':
			return '没有录到声音，请再试一次'
		case 'no_speech':
			return '没有听清你的读音，请靠近麦克风再读一次'
		case 'too_short':
			return '录音太短，请大声读完再停'
		case 'decode_error':
			return '录音无法提取，请再试一次（靠近麦克风、安静环境）'
		case 'ref_error':
			return '示范音暂时无法加载，请稍后重试'
		case 'unsupported_platform':
			return '跟读评分仅支持 App，请安装手机版后使用'
		case 'mfcc_unavailable':
			return '语音分析模块不可用，请重启 App 或更新版本后重试'
		case 'analysis_error':
			return '无法分析读音，请靠近麦克风，并在安静环境再试'
		case 'mismatch':
		case 'close':
			return t ? `再试试「${t}」` : '跟读未通过，请再试一次'
		default:
			return '跟读未通过，请再试一次'
	}
}

/** @param {unknown} err */
export function classifyFollowReadThrowable(err) {
	const msg = String(err?.message || err || '').toLowerCase()
	if (msg.includes('reference') || msg.includes('no symbol') || msg.includes('ref fingerprint')) {
		return 'ref_error'
	}
	if (
		msg.includes('decode') ||
		msg.includes('audiocontext') ||
		msg.includes('readfile') ||
		msg.includes('empty audio') ||
		msg.includes('filesystem') ||
		msg.includes('plus.io')
	) {
		return 'decode_error'
	}
	return 'analysis_error'
}

/** 是否已完成声学比对（有相似度百分比） */
export function hasFollowReadSimilarity(scoreRes) {
	if (!scoreRes?.ok) return false
	const v = scoreRes?.details?.verdict || ''
	return v === 'match' || v === 'mismatch'
}

/** @returns {number|null} 0–100 */
export function followReadSimilarityPercent(scoreRes) {
	if (!hasFollowReadSimilarity(scoreRes)) return null
	const n = Number(scoreRes?.details?.targetMatch)
	return Number.isFinite(n) ? Math.round(n) : null
}

/**
 * 模式栏 / 结果条：分数 + 相似度（通过与不通过均展示）
 * @param {{ ok?: boolean, pass?: boolean, score?: number, message?: string, details?: { verdict?: string, targetMatch?: number, dtwSim?: number } }} scoreRes
 */
export function followReadStatusWithSimilarity(scoreRes, target = '') {
	const t = String(target || '').trim()
	const pct = followReadSimilarityPercent(scoreRes)
	const sim = pct != null ? `相似 ${pct}%` : ''

	if (scoreRes?.ok && scoreRes?.pass) {
		const score = Number(scoreRes.score) || 0
		return sim ? `跟读 ${score} 分 · ${sim}` : `跟读 ${score} 分`
	}

	if (hasFollowReadSimilarity(scoreRes)) {
		const score = Number(scoreRes.score) || 0
		if (sim) {
			return t ? `${sim} · ${score} 分 · 再试「${t}」` : `${sim} · ${score} 分 · 再试一次`
		}
		return t ? `再试试「${t}」` : '再试一次'
	}

	return ''
}

/**
 * Toast 标题：分析类失败用短句；比对完成时带相似度。
 * @param {{ ok?: boolean, pass?: boolean, score?: number, message?: string, statusHint?: string, details?: { verdict?: string, targetMatch?: number } }} scoreRes
 */
export function followReadToastTitle(scoreRes, target = '') {
	if (scoreRes?.ok && scoreRes?.pass) {
		const line = followReadStatusWithSimilarity(scoreRes, target)
		if (line) return line
		return `跟读 ${scoreRes.score} 分`
	}
	if (hasFollowReadSimilarity(scoreRes)) {
		const pct = followReadSimilarityPercent(scoreRes)
		const t = String(target || '').trim()
		if (pct != null) {
			return t ? `相似 ${pct}% · 再试「${t}」` : `相似 ${pct}% · 再试一次`
		}
	}
	const verdict = scoreRes?.details?.verdict || ''
	if (verdict === 'analysis_error' || verdict === 'decode_error' || verdict === 'no_speech') {
		return scoreRes?.statusHint || followReadStatusBarHint(verdict, target)
	}
	if (scoreRes?.message) return scoreRes.message
	return followReadStatusBarHint(verdict, target)
}
