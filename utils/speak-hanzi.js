/**
 * 汉字点读：优先 cnchar-voice（H5 等环境下的 Web Speech / 内置合成链）；
 * App 端对中文更稳的是 plus.speech；其余降级 Toast。
 */
import cnchar from './cnchar-setup.js'
import { getAudioNarrator, AUDIO_NARRATOR } from './audio-settings.js'

function firstHanziChar(text) {
	const m = String(text || '').match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function tryPlusSpeech(s) {
	// #ifdef APP-PLUS
	try {
		if (typeof plus !== 'undefined' && plus.speech && typeof plus.speech.speak === 'function') {
			const narrator = getAudioNarrator()
			plus.speech.speak(s, {
				engine: 'baidu',
				volume: 1,
				pitch: narrator === AUDIO_NARRATOR.FEMALE ? 1.0 : 1.25,
				rate: narrator === AUDIO_NARRATOR.FEMALE ? 1.0 : 1.1
			})
			return true
		}
	} catch (_) {}
	// #endif
	return false
}

let _lastVoiceCtl = null

function tryCncharVoice(s) {
	try {
		if (typeof cnchar.voice !== 'function') return false
		const ctl = cnchar.voice(s)
		_lastVoiceCtl = ctl
		if (ctl && typeof ctl.start === 'function') {
			ctl.start()
			return true
		}
	} catch (_) {}
	return false
}

/** 停止 TTS / 语音合成（换字、离开页时与本地音频一并停掉） */
export function stopHanziSpeech() {
	try {
		// #ifdef APP-PLUS
		if (typeof plus !== 'undefined' && plus.speech) {
			if (typeof plus.speech.stopSpeaking === 'function') {
				plus.speech.stopSpeaking()
			} else if (typeof plus.speech.stop === 'function') {
				plus.speech.stop()
			}
		}
		// #endif
	} catch (_) {}
	try {
		if (typeof window !== 'undefined' && window.speechSynthesis) {
			window.speechSynthesis.cancel()
		}
	} catch (_) {}
	try {
		const ctl = _lastVoiceCtl
		if (ctl) {
			if (typeof ctl.stop === 'function') ctl.stop()
			else if (typeof ctl.pause === 'function') ctl.pause()
		}
	} catch (_) {}
	_lastVoiceCtl = null
}

/**
 * 朗读字符串中第一个汉字（单字点读）。
 * @param {string} text
 */
export function speakHanzi(text) {
	const s = firstHanziChar(text)
	if (!s) return
	// #ifdef APP-PLUS
	if (tryPlusSpeech(s)) return
	// #endif
	if (tryCncharVoice(s)) return
	uni.showToast({ title: `「${s}」`, icon: 'none' })
}

/**
 * 朗读一段中文课文（整段；过长会截断）。
 * @param {string} text
 */
export function speakChinese(text) {
	let s = String(text || '').trim()
	if (!s) return
	if (s.length > 800) s = `${s.slice(0, 800)}……`
	// #ifdef APP-PLUS
	if (tryPlusSpeech(s)) return
	// #endif
	if (tryCncharVoice(s)) return
	uni.showToast({ title: '暂无法朗读本段', icon: 'none' })
}
