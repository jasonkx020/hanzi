/**
 * 拼音符号点读（TTS）。
 *
 * 深度说明（为何常「没声音」）：
 * 1) 官方 HTML5+ / uni-app 文档里 plus.speech 主要是「语音识别」startRecognize，并不保证存在
 *    plus.speech.speak；若运行时无此方法，仅靠 App 原生会失败。
 * 2) App 与 H5 实际共用 WebView JS 环境，优先使用 speechSynthesis（Web Speech），与是否勾选
 *    manifest 里的 Speech(语音输入) 模块无关。
 * 3) iOS：首轮 getVoices() 常为空，需监听 voiceschanged 或短时延迟后再 speak。
 * 4) 部分 Android WebView / 桌面浏览器：禁用了 TTS 或需系统已装中文语音包，会 onerror。
 * 5) 微信小程序等：通常无 speechSynthesis，本工具会返回 false。
 */
import { getAudioNarrator, AUDIO_NARRATOR } from './audio-settings.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'

function normalizeForTts(raw) {
	return String(raw || '')
		.replace(/\u0251/g, 'a')
		.replace(/ɑ/g, 'a')
		.trim()
}

function plusSpeechOpts(narrator) {
	return {
		volume: 1,
		pitch: narrator === AUDIO_NARRATOR.FEMALE ? 1.0 : 1.25,
		rate: narrator === AUDIO_NARRATOR.FEMALE ? 1.0 : 1.1
	}
}

/** 个别壳/云打包环境若实现了 speak，可作为兜底（非官方 HTML5+ 必选能力） */
function tryPlusSpeechSpeakIfExists(text, narrator) {
	// #ifdef APP-PLUS
	try {
		if (typeof plus === 'undefined' || !plus.speech || typeof plus.speech.speak !== 'function')
			return false
		const base = plusSpeechOpts(narrator)
		const attrsList = [{ ...base }, { ...base, engine: 'iFly' }, { ...base, engine: 'baidu' }]
		let i = 0
		const tryNext = () => {
			if (i >= attrsList.length) return
			const attrs = attrsList[i++]
			try {
				plus.speech.speak(
					text,
					attrs,
					() => {},
					() => tryNext()
				)
			} catch (_) {
				tryNext()
			}
		}
		tryNext()
		return true
	} catch (e) {
		console.warn('[speak-pinyin] plus.speech.speak', e)
	}
	// #endif
	return false
}

/**
 * 等待 Web Speech 当前队列播完（speechSynthesis 无 speaking/pending）。
 * 用于「同步发起 speak」类兜底，避免多音字下一段过早开始。
 * @param {number} [maxMs=15000]
 */
export async function waitForSpeechSynthesisIdle(maxMs = 15000) {
	try {
		const root =
			typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null
		const synth = root?.speechSynthesis
		if (!synth || typeof synth.speaking !== 'boolean') return
		const t0 = Date.now()
		while ((synth.speaking || synth.pending) && Date.now() - t0 < maxMs) {
			await new Promise((r) => setTimeout(r, 50))
		}
	} catch (_) {}
}

function pickVoiceMatch(voices, langPrefix) {
	if (!voices || !voices.length) return null
	return (
		voices.find((x) => x && x.lang && String(x.lang).toLowerCase().startsWith(langPrefix)) ||
		voices.find((x) => x && x.localService === true) ||
		voices[0] ||
		null
	)
}

function tryWebSpeech(text, narrator) {
	try {
		const root = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null
		if (!root) return false
		const synth = root.speechSynthesis
		const Utter = root.SpeechSynthesisUtterance
		if (!synth || typeof Utter !== 'function' || typeof synth.speak !== 'function') return false

		const utter = () => {
			try {
				synth.cancel()
				const u = new Utter(text)
				u.lang = 'zh-CN'
				u.volume = 1
				u.rate = narrator === AUDIO_NARRATOR.FEMALE ? 0.92 : 1.05
				u.pitch = narrator === AUDIO_NARRATOR.FEMALE ? 1.0 : 1.18
				let voices = []
				try {
					voices = synth.getVoices() || []
				} catch (_) {
					voices = []
				}
				let v = pickVoiceMatch(voices, 'zh')
				if (!v) v = pickVoiceMatch(voices, 'en')
				if (v) u.voice = v

				const latinLike = /^[a-zA-Z.\s\-()|]+$/.test(text)
				if (!v && latinLike) u.lang = 'en-US'

				u.onerror = (ev) =>
					console.warn('[speak-pinyin] utterance error', (ev && ev.error) || ev, text)

				synth.speak(u)
			} catch (inner) {
				console.warn('[speak-pinyin] speak inner', inner)
			}
		}

		let voices = []
		try {
			voices = synth.getVoices() || []
		} catch (_) {}
		if (voices.length > 0) {
			utter()
			return true
		}
		let done = false
		const run = () => {
			if (done) return
			done = true
			utter()
		}
		if (typeof synth.addEventListener === 'function') {
			synth.addEventListener('voiceschanged', run, { once: true })
		}
		setTimeout(run, 450)
		return true
	} catch (_) {
		return false
	}
}

/**
 * 先 Web Speech（App/H5 WebView 通用），再尝试非标准的 plus.speech.speak。
 */
export function speakPinyinSymbol(symbol, narrator) {
	const text = normalizeForTts(symbol)
	if (!text) return false
	const n = narrator != null ? narrator : getAudioNarrator()
	if (tryWebSpeech(text, n)) return true
	if (tryPlusSpeechSpeakIfExists(text, n)) return true
	return false
}

/**
 * 单次拼音朗读；Web Speech 时在 onend 解析；App plus.speech 用成功回调。
 * @returns {Promise<boolean>}
 */
export function speakPinyinSymbolAsync(symbol, narrator) {
	const text = normalizeForTts(symbol)
	if (!text) {
		logHanziSpeak('tts.skip_empty_text', { symbol })
		return Promise.resolve(false)
	}
	const n = narrator != null ? narrator : getAudioNarrator()
	logHanziSpeak('tts.start', { symbol, text, narrator: n })

	return new Promise((resolve) => {
		let settled = false
		const finish = (v) => {
			if (settled) return
			settled = true
			logHanziSpeak('tts.finish', { symbol, text, ok: v })
			resolve(v)
		}

		try {
			const root =
				typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null
			const synth = root?.speechSynthesis
			const Utter = root?.SpeechSynthesisUtterance
			if (synth && typeof Utter === 'function' && typeof synth.speak === 'function') {
				try {
					synth.cancel()
				} catch (_) {}
				const u = new Utter(text)
				u.lang = 'zh-CN'
				u.volume = 1
				u.rate = n === AUDIO_NARRATOR.FEMALE ? 0.92 : 1.05
				u.pitch = n === AUDIO_NARRATOR.FEMALE ? 1.0 : 1.18
				let voices = []
				try {
					voices = synth.getVoices() || []
				} catch (_) {
					voices = []
				}
				let voice = pickVoiceMatch(voices, 'zh')
				if (!voice) voice = pickVoiceMatch(voices, 'en')
				if (voice) u.voice = voice
				const latinLike = /^[a-zA-Z.\s\-()|]+$/.test(text)
				if (!voice && latinLike) u.lang = 'en-US'
				u.onend = () => finish(true)
				u.onerror = () => finish(false)

				let spoke = false
				const run = () => {
					if (spoke || settled) return
					spoke = true
					try {
						synth.speak(u)
					} catch (_) {
						finish(false)
					}
				}
				if ((synth.getVoices() || []).length > 0) {
					run()
				} else {
					const onVc = () => run()
					if (typeof synth.addEventListener === 'function') {
						synth.addEventListener('voiceschanged', onVc, { once: true })
					}
					setTimeout(run, 450)
				}
				return
			}
		} catch (_) {}

		// #ifdef APP-PLUS
		try {
			if (typeof plus !== 'undefined' && plus.speech && typeof plus.speech.speak === 'function') {
				try {
					plus.speech.speak(
						text,
						plusSpeechOpts(n),
						() => finish(true),
						() => finish(false)
					)
				} catch (_) {
					finish(false)
				}
				return
			}
		} catch (_) {}
		// #endif

		void (async () => {
			const ok = speakPinyinSymbol(symbol, n)
			if (!ok) {
				finish(false)
				return
			}
			await waitForSpeechSynthesisIdle()
			finish(true)
		})()
	})
}
