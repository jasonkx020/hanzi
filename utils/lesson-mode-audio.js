/**
 * 课次模式（听写 / 小测 / 气球营）音频编排：
 * 萌萌提示音与生字读音串行，避免固定 delay 截断提示或叠播。
 */
import {
	MENG_VOICE,
	playMengmengVoice,
	waitForMengmengVoiceIdle
} from '@/utils/mengmeng-voice.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'

/** 萌萌提示结束后、生字读音开始前的间隔（毫秒） */
export const LESSON_AUDIO_GAP_MS = 320

export function sleepMs(ms) {
	const n = Math.max(0, Number(ms) || 0)
	if (!n) return Promise.resolve()
	return new Promise((resolve) => setTimeout(resolve, n))
}

/**
 * 先播萌萌提示（可选），再播课内生字读音。
 * @param {string} hanzi
 * @param {string} displayPinyin
 * @param {string|null|undefined} voiceId MENG_VOICE 值；空则只播生字
 * @param {{ debounceMs?: number, minGapMs?: number, gapAfterMs?: number }} [voiceOpts]
 */
export async function playLessonHintThenTargetReading(hanzi, displayPinyin, voiceId, voiceOpts = {}) {
	const gap = voiceOpts.gapAfterMs ?? LESSON_AUDIO_GAP_MS
	stopLocalPinyinAudio()
	const id = String(voiceId || '').trim()
	if (id) {
		await playMengmengVoice(id, voiceOpts)
		await sleepMs(gap)
	}
	await playLessonTargetReading(hanzi, displayPinyin)
}

/**
 * 等待当前萌萌提示播完后，再播生字读音（用于重写后自动再听等场景）。
 */
export async function playLessonTargetReadingAfterVoice(hanzi, displayPinyin, gapMs) {
	stopLocalPinyinAudio()
	await waitForMengmengVoiceIdle()
	await sleepMs(gapMs ?? LESSON_AUDIO_GAP_MS)
	await playLessonTargetReading(hanzi, displayPinyin)
}

/**
 * 「再听一遍」类提示 + 生字读音。
 */
export async function playLessonReplayThenTargetReading(
	hanzi,
	displayPinyin,
	voiceId = MENG_VOICE.DAILY_PINYIN_REPLAY,
	voiceOpts = {}
) {
	stopLocalPinyinAudio()
	const gap = voiceOpts.gapAfterMs ?? LESSON_AUDIO_GAP_MS
	const id = String(voiceId || '').trim()
	if (id) {
		await playMengmengVoice(id, { minGapMs: 600, ...voiceOpts })
		await sleepMs(gap)
	}
	await playLessonTargetReading(hanzi, displayPinyin)
}
