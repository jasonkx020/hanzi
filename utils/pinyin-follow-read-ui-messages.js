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
			return '录音无法读取，请靠近麦克风大声再读一次'
		case 'ref_error':
			return '示范音暂时无法加载，请稍后重试'
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

/**
 * Toast 标题：分析类失败用短句，避免过长被截断。
 * @param {{ ok?: boolean, pass?: boolean, score?: number, message?: string, statusHint?: string, details?: { verdict?: string } }} scoreRes
 */
export function followReadToastTitle(scoreRes, target = '') {
	if (scoreRes?.ok && scoreRes?.pass) {
		return `跟读 ${scoreRes.score} 分`
	}
	const verdict = scoreRes?.details?.verdict || ''
	if (verdict === 'analysis_error' || verdict === 'decode_error' || verdict === 'no_speech') {
		return scoreRes?.statusHint || followReadStatusBarHint(verdict, target)
	}
	if (scoreRes?.message) return scoreRes.message
	return followReadStatusBarHint(verdict, target)
}
