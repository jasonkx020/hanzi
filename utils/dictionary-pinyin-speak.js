/**
 * 查字页：汉字读音按完整拼音播本地 opus（失败不 TTS），不拆声母介母韵母；不使用 cnchar.voice。
 */
import {
	beginHanziDictionarySpeakDebug,
	endHanziDictionarySpeakDebug,
	logHanziSpeak
} from '@/utils/hanzi-speak-debug-log.js'
import {
	speakHanziViaPinyinBlend,
	PINYIN_BLEND_TIMING
} from '@/utils/hanzi-pinyin-blend-speak.js'

/** 查字默认：整音节播放；一声替补；多音间隔 */
export const DICTIONARY_LOCAL_PINYIN_OPTS = {
	useTone1Fb: true,
	readingGapMs: PINYIN_BLEND_TIMING.readingGapMs,
	blend: false,
	showFailToast: false
}

/**
 * @param {object} opts 见 speakHanziViaPinyinBlend；另支持 opts.gapMs 作为 readingGapMs 别名
 */
export async function speakDictionaryEntryPinyin(opts = {}) {
	beginHanziDictionarySpeakDebug()
	try {
		const h = String(opts.hanzi || '').match(/[\u4e00-\u9fff]/)?.[0]
		if (!h) {
			logHanziSpeak('dict.skip_no_hanzi', { raw: opts.hanzi })
			return false
		}
		logHanziSpeak('dict.request', {
			hanzi: h,
			fallbackPinyin: opts.fallbackPinyin,
			narrator: opts.narrator,
			useTone1Fb: opts.useTone1Fb,
			blend: opts.blend === true ? true : DICTIONARY_LOCAL_PINYIN_OPTS.blend
		})
		const ok = await speakHanziViaPinyinBlend({
			hanzi: h,
			fallbackPinyin: opts.fallbackPinyin,
			narrator: opts.narrator,
			useTone1Fb: opts.useTone1Fb,
			blend: opts.blend === true ? true : DICTIONARY_LOCAL_PINYIN_OPTS.blend,
			readingGapMs: opts.readingGapMs ?? opts.gapMs ?? DICTIONARY_LOCAL_PINYIN_OPTS.readingGapMs,
			betweenParts: opts.betweenParts,
			beforeWhole: opts.beforeWhole,
			showFailToast: opts.showFailToast ?? DICTIONARY_LOCAL_PINYIN_OPTS.showFailToast,
			isCancelled: opts.isCancelled
		})
		logHanziSpeak('dict.done', { hanzi: h, ok })
		return ok
	} finally {
		endHanziDictionarySpeakDebug()
	}
}

export async function speakDictionaryHanziPinyinReadings(hanzi, opts = {}) {
	return speakDictionaryEntryPinyin({ hanzi, ...opts })
}
