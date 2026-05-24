/**
 * 写字练习页音频节奏（3–9 岁）：先停净再播，避免叠音、强音连击。
 *
 * 是否必须等播完再进入下一步？
 * - 必须等：整字读音 → 第一笔引导；笔画名引导 → 开始写；写对鼓励 → 下一笔引导；
 *   写完一字 → 下一字；笔画提示音 → 田字格闪烁高亮；看笔顺提示音 → 笔顺动画。否则听不清、和书写抢声道。
 * - 书写中：introBusy 时不响应触摸，避免边听边写乱序。
 * - 可不阻塞 UI：进页欢迎语（延迟且可被练习引导取消）。
 * - 快速模式（写字练习页）：跳过上述引导音，写完一字仍保留文字/进度反馈。
 */
import { stopMengmengVoice, waitForMengmengVoiceIdle } from '@/utils/mengmeng-voice.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { stopHanziSpeech } from '@/utils/speak-hanzi.js'
import { resetStrokeAudioQueue } from '@/utils/stroke-order-audio.js'

/** @type {Readonly<Record<string, number>>} */
export const WRITE_KID_AUDIO = {
	/** 整字读音结束后，再播第一笔提示前的停顿 */
	AFTER_CHAR_MS: 1100,
	/** 萌萌提示音结束后，再播笔画名前的停顿 */
	AFTER_MENG_MS: 950,
	/** 写对一笔后的鼓励音结束，再播下一笔提示 */
	AFTER_OK_MS: 850,
	/** 写错重试提示音后的停顿 */
	AFTER_WRONG_MS: 700,
	/** 一字写完、进入下一字前的停顿 */
	AFTER_SESSION_CHAR_MS: 1100,
	/** 进页欢迎语延迟（避免与自动字音引导叠音） */
	WELCOME_DELAY_MS: 1600,
	/** 多音节拼音之间的间隔 */
	PINYIN_TOKEN_GAP_MS: 130
}

/** 笔画名引导：只播名称，不播「一笔」序数前缀，更短更清楚 */
export const WRITE_KID_STROKE_GUIDANCE_OPTS = {
	skipOrdinalPrefix: true,
	pauseBeforeStrokeMs: 0,
	gapMs: 120,
	compoundGapMs: 100
}

export function sleepWriteMs(ms) {
	const n = Math.max(0, Number(ms) || 0)
	if (!n) return Promise.resolve()
	return new Promise((resolve) => setTimeout(resolve, n))
}

/**
 * 停止字音 / 笔画音 / TTS，并等待萌萌语音结束。
 * @param {{ stopMeng?: boolean, extraMs?: number }} [opts]
 */
export async function settleWritePracticeAudio(opts = {}) {
	if (opts.stopMeng !== false) {
		stopMengmengVoice()
	}
	resetStrokeAudioQueue()
	stopLocalPinyinAudio()
	stopHanziSpeech()
	await waitForMengmengVoiceIdle().catch(() => {})
	const extra = Math.max(0, Number(opts.extraMs) || 0)
	if (extra > 0) {
		await sleepWriteMs(extra)
	}
}
