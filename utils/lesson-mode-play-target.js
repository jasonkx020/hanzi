/**
 * @file lesson-mode-play-target.js
 * @module utils
 * @description 基础设施工具：lesson-mode-play-target.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 课次模式页（小测 / 听写 / 跟读）统一读音：与课次字卡 `pyShow` 一致，
 * 优先按上页传入的拼音串播本地音节，避免多音字被 TTS 读成非课内读音。
 */
import { playOpusForDisplayPinyin } from '@/utils/play-pinyin-local-audio.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { speakHanziViaPinyinBlend } from '@/utils/hanzi-pinyin-blend-speak.js'

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
	if (!ch) return false
	const cancelled = () =>
		typeof opts.isCancelled === 'function' && opts.isCancelled()
	if (cancelled()) return false
	const py = normLessonPayloadPinyin(displayPinyin)
	if (py && py !== '-') {
		const ok = await playOpusForDisplayPinyin(py, opts)
		if (ok) {
			logHanziSpeak('lesson_mode.read', { hanzi: ch, py, via: 'pinyin' })
			return true
		}
		if (cancelled()) return false
	}
	/** 本地音节失败或无拼音时，走整字拼音拼读，避免听写完全无声 */
	const fb = await speakHanziViaPinyinBlend({
		hanzi: ch,
		fallbackPinyin: py && py !== '-' ? py : '',
		blend: false,
		showFailToast: false,
		isCancelled: opts.isCancelled
	})
	logHanziSpeak('lesson_mode.read', {
		hanzi: ch,
		py,
		via: fb ? 'blend_fb' : 'none'
	})
	return !!fb
}
