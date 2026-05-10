/**
 * 查字「点汉字 → 播读音」调试日志：写入 console + 调试页环形缓冲（appendDebugLog）。
 * 仅在 speakDictionaryEntryPinyin 会话内输出，避免拼音格子等其它调用刷屏。
 */
import { appendDebugLog } from '@/utils/debug-console-hook.js'

let _sessionDepth = 0

export function beginHanziDictionarySpeakDebug() {
	_sessionDepth++
}

export function endHanziDictionarySpeakDebug() {
	_sessionDepth = Math.max(0, _sessionDepth - 1)
}

export function isHanziDictionarySpeakDebugActive() {
	return _sessionDepth > 0
}

/**
 * @param {string} step 短标签，如 dict.request / resolve.readings / local.play_err
 * @param {object} [detail]
 */
export function logHanziSpeak(step, detail) {
	if (_sessionDepth <= 0) return
	let serialized = ''
	try {
		serialized =
			detail !== undefined && typeof detail === 'object' && detail !== null
				? JSON.stringify(detail)
				: String(detail ?? '')
	} catch (_) {
		serialized = '[unserializable]'
	}
	const head = `[hanzi-speak] ${step}`
	try {
		console.log(head, detail !== undefined ? detail : '')
	} catch (_) {}
	try {
		appendDebugLog('log', head, serialized)
	} catch (_) {}
}
