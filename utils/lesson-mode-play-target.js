/**
 * 课次模式页（小测 / 听写 / 跟读）统一读音：与课次字卡 `pyShow` 一致，
 * 优先按上页传入的拼音串播本地音节，避免多音字被 TTS 读成非课内读音。
 */
import { speakHanzi } from '@/utils/speak-hanzi.js'
import { playOpusForDisplayPinyin } from '@/utils/play-pinyin-local-audio.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'

export function normLessonPayloadPinyin(raw) {
	return String(raw || '')
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * @param {string} hanzi 单字
 * @param {string} displayPinyin 与字卡一致的展示拼音（来自识字表或 pyShow）
 */
export async function playLessonTargetReading(hanzi, displayPinyin, opts = {}) {
	const h = String(hanzi || '').trim().match(/[\u4e00-\u9fff]/)
	const ch = h ? h[0] : ''
	if (!ch) return
	const cancelled = () =>
		typeof opts.isCancelled === 'function' && opts.isCancelled()
	const py = normLessonPayloadPinyin(displayPinyin)
	if (py && py !== '-') {
		const ok = await playOpusForDisplayPinyin(py, opts)
		logHanziSpeak('lesson_mode.read', { hanzi: ch, py, via: ok ? 'pinyin' : 'hanzi_fallback' })
		if (ok || cancelled()) return
	}
	if (cancelled()) return
	speakHanzi(ch)
}
