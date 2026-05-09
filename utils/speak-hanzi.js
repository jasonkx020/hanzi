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

function tryCncharVoice(s) {
	try {
		if (typeof cnchar.voice !== 'function') return false
		const ctl = cnchar.voice(s)
		if (ctl && typeof ctl.start === 'function') {
			ctl.start()
			return true
		}
	} catch (_) {}
	return false
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
