/**
 * 汉字 → cnchar/字库拼音 → 按完整音节查找本地 opus 播放（失败不 TTS）。
 * 默认不拆声母/介母/韵母；仅 opts.blend===true 时走拼读拆分（如拼音页「拼读练习」）。
 * 不使用 cnchar.voice。
 */
import { listSpellReadingsForHanzi, parsePinyinDisplayToReadings } from '@/utils/cnchar-spell-display.js'
import { splitPinyinBlendParts } from '@/utils/pinyin-blend-parts.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { isPinyinBlendTrainingEnabled } from '@/config/feature-flags.js'
import {
	playLocalPinyinNeutralThenTone1,
	sleep,
	sleepUnlessCancelled
} from '@/utils/play-pinyin-local-audio.js'

/** 与拼音页「拼读练习」一致的间隔 */
export const PINYIN_BLEND_TIMING = {
	betweenParts: 28,
	beforeWhole: 120,
	readingGapMs: 300
}

/** 去掉声调符号（实现见 pinyin-strip-tone.js）；供拼读拆分等使用。 */
export { stripPinyinToneMarks }

/** 解析字库/界面拼音串（含多音括号、斜杠分隔）；同 {@link parsePinyinDisplayToReadings}。 */
export function readingsFromDisplayPinyin(pinyinDisplay) {
	return parsePinyinDisplayToReadings(pinyinDisplay)
}

/**
 * 解析单字全部候选读音：优先界面/字库文案（含多音字展开），否则 cnchar。
 */
export function resolveHanziPinyinReadings(hanzi, fallbackPinyinDisplay) {
	const h = String(hanzi || '').match(/[\u4e00-\u9fff]/)?.[0]
	if (!h) {
		logHanziSpeak('resolve.skip_no_hanzi', { hanzi })
		return []
	}
	let list = parsePinyinDisplayToReadings(fallbackPinyinDisplay)
	let source = 'display'
	if (!list.length) {
		list = listSpellReadingsForHanzi(h)
		source = 'cnchar'
	}
	logHanziSpeak('resolve.readings', {
		hanzi: h,
		fallbackPinyinDisplay,
		source,
		count: list.length,
		readings: list
	})
	return list
}

/**
 * 播放一个带调音节：先按无声调形拆分拼读，再播完整带调音节。
 * @param {string} tonedSyllable 如 zhāng、ba（可无调）
 * @param {object} [opts]
 * @param {string} [opts.narrator]
 * @param {boolean} [opts.useTone1Fb=true]
 * @param {boolean} [opts.blend=false] true 时先拆段拼读再播整音节
 * @param {number} [opts.betweenParts]
 * @param {number} [opts.beforeWhole]
 * @param {boolean} [opts.showFailToast=false] 本地音频也失败时是否 Toast
 */
export async function speakBlendedPinyinSyllable(tonedSyllable, opts = {}) {
	const text = String(tonedSyllable || '').trim()
	if (!text) return false

	const narrator = opts.narrator != null ? opts.narrator : getAudioNarrator()
	const useTone1Fb = opts.useTone1Fb !== false
	const blend = isPinyinBlendTrainingEnabled() && opts.blend === true
	const betweenParts = opts.betweenParts != null ? opts.betweenParts : PINYIN_BLEND_TIMING.betweenParts
	const beforeWhole = opts.beforeWhole != null ? opts.beforeWhole : PINYIN_BLEND_TIMING.beforeWhole
	const showFailToast = opts.showFailToast === true

	let anyOk = false

	const playOne = async (sym) => {
		if (typeof opts.isCancelled === 'function' && opts.isCancelled()) return false
		logHanziSpeak('syllable.try_local', { symbol: sym, useTone1Fb, narrator })
		const played = await playLocalPinyinNeutralThenTone1(sym, useTone1Fb, {
			isCancelled: opts.isCancelled
		})
		if (played) {
			anyOk = true
			logHanziSpeak('syllable.local_ok', { symbol: sym })
			return true
		}
		logHanziSpeak('syllable.local_failed', { symbol: sym, narrator })
		if (showFailToast) {
			uni.showToast({ title: '暂无该拼音读音', icon: 'none' })
		}
		return false
	}

	const isCancelled = opts.isCancelled

	if (!blend) {
		await playOne(text)
		return anyOk
	}

	const bare = stripPinyinToneMarks(text)
	const parts = splitPinyinBlendParts(bare)

	if (parts.length >= 2) {
		for (let i = 0; i < parts.length; i++) {
			if (typeof isCancelled === 'function' && isCancelled()) return anyOk
			await playOne(parts[i])
			if (i < parts.length - 1) {
				if (!(await sleepUnlessCancelled(betweenParts, isCancelled))) return anyOk
			}
		}
		if (typeof isCancelled === 'function' && isCancelled()) return anyOk
		if (!(await sleepUnlessCancelled(beforeWhole, isCancelled))) return anyOk
		await playOne(text)
		return anyOk
	}

	await playOne(text)
	return anyOk
}

/**
 * 按字朗读：多音字连续播多个音节，每个音节走拼读流程。
 * @param {object} opts
 * @param {string} opts.hanzi
 * @param {string} [opts.fallbackPinyin]
 * @param {string} [opts.narrator]
 * @param {boolean} [opts.useTone1Fb]
 * @param {boolean} [opts.blend=false]
 * @param {number} [opts.readingGapMs] 多音之间停顿
 * @param {number} [opts.gapMs] 同 readingGapMs（查字页沿用旧字段）
 */
export async function speakHanziViaPinyinBlend(opts = {}) {
	const h = String(opts.hanzi || '').match(/[\u4e00-\u9fff]/)?.[0]
	if (!h) {
		logHanziSpeak('speak.skip_no_hanzi', { optsHanzi: opts.hanzi })
		return false
	}

	const readings = resolveHanziPinyinReadings(h, opts.fallbackPinyin)
	if (!readings.length) {
		logHanziSpeak('speak.no_readings_abort', { hanzi: h, fallbackPinyin: opts.fallbackPinyin })
		return false
	}
	logHanziSpeak('speak.readings_queue', {
		hanzi: h,
		readings,
		readingGapMs:
			opts.readingGapMs != null
				? opts.readingGapMs
				: opts.gapMs != null
					? opts.gapMs
					: PINYIN_BLEND_TIMING.readingGapMs
	})

	const narrator = opts.narrator != null ? opts.narrator : getAudioNarrator()
	const useTone1Fb = opts.useTone1Fb !== false
	const blend = isPinyinBlendTrainingEnabled() && opts.blend === true
	const readingGapMs =
		opts.readingGapMs != null
			? opts.readingGapMs
			: opts.gapMs != null
				? opts.gapMs
				: PINYIN_BLEND_TIMING.readingGapMs
	const betweenParts = opts.betweenParts != null ? opts.betweenParts : PINYIN_BLEND_TIMING.betweenParts
	const beforeWhole = opts.beforeWhole != null ? opts.beforeWhole : PINYIN_BLEND_TIMING.beforeWhole
	const showFailToast = opts.showFailToast === true

	let anyOk = false
	const multi = readings.length > 1
	const isCancelled = opts.isCancelled
	for (let i = 0; i < readings.length; i++) {
		if (typeof isCancelled === 'function' && isCancelled()) return anyOk
		logHanziSpeak('speak.reading_start', { hanzi: h, index: i, total: readings.length, reading: readings[i] })
		const ok = await speakBlendedPinyinSyllable(readings[i], {
			narrator,
			useTone1Fb,
			blend,
			betweenParts,
			beforeWhole,
			showFailToast,
			isCancelled
		})
		logHanziSpeak('speak.reading_finish', { hanzi: h, index: i, reading: readings[i], ok })
		if (ok) anyOk = true
		if (i < readings.length - 1) {
			if (typeof isCancelled === 'function' && isCancelled()) return anyOk
			if (!(await sleepUnlessCancelled(readingGapMs, isCancelled))) return anyOk
		}
	}
	logHanziSpeak('speak.all_done', { hanzi: h, anyOk, readingsCount: readings.length })
	return anyOk
}
