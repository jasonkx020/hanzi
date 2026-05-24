/**
 * 汉字 → 字库拼音 → 仅按 static/pinyin/*.opus 播放（无文件则不播，无 TTS）。
 * 默认不拆声母/介母/韵母；仅 opts.blend===true 时走拼读拆分（如拼音页「拼读练习」）。
 */
import { listSpellReadingsForHanzi, parsePinyinDisplayToReadings } from '@/utils/cnchar-spell-display.js'
import { splitPinyinReadingSequences } from '@/utils/pinyin-reading-split.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { playLocalPinyinNeutralThenTone1, sleep } from '@/utils/play-pinyin-local-audio.js'

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
 * 播放一个音节：仅本地 opus；blend 时先拆段再播整音节。
 * @param {string} tonedSyllable 如 zhāng、ba（可无调）
 * @param {object} [opts]
 * @param {boolean} [opts.useTone1Fb=true]
 * @param {boolean} [opts.blend=false]
 * @param {number} [opts.betweenParts]
 * @param {number} [opts.beforeWhole]
 */
export async function speakBlendedPinyinSyllable(tonedSyllable, opts = {}) {
	const text = String(tonedSyllable || '').trim()
	if (!text) return false

	const useTone1Fb = opts.useTone1Fb !== false
	const blend = opts.blend === true
	const betweenParts = opts.betweenParts != null ? opts.betweenParts : PINYIN_BLEND_TIMING.betweenParts
	const beforeWhole = opts.beforeWhole != null ? opts.beforeWhole : PINYIN_BLEND_TIMING.beforeWhole

	let anyOk = false

	const playOne = async (sym) => {
		logHanziSpeak('syllable.try_local', { symbol: sym, useTone1Fb })
		const played = await playLocalPinyinNeutralThenTone1(sym, useTone1Fb)
		if (played) {
			anyOk = true
			logHanziSpeak('syllable.local_ok', { symbol: sym })
		} else {
			logHanziSpeak('syllable.local_miss', { symbol: sym })
		}
		return played
	}

	if (!blend) {
		await playOne(text)
		return anyOk
	}

	return speakBlendedLookupSteps(text, 0, { betweenParts, beforeWhole, playOne })
}

/**
 * 拼读练习：从 lookup 序列某一格起播到整音节（含末尾整读）。
 * @param {string} tonedSyllable
 * @param {number} [startIndex]
 * @param {object} [opts]
 */
export async function speakBlendedPinyinFromIndex(tonedSyllable, startIndex = 0, opts = {}) {
	const text = String(tonedSyllable || '').trim()
	if (!text) return false
	const useTone1Fb = opts.useTone1Fb !== false
	const betweenParts = opts.betweenParts != null ? opts.betweenParts : PINYIN_BLEND_TIMING.betweenParts

	let anyOk = false
	const playOne = async (sym) => {
		const played = await playLocalPinyinNeutralThenTone1(sym, useTone1Fb)
		if (played) anyOk = true
		return played
	}

	return speakBlendedLookupSteps(text, Math.max(0, Number(startIndex) || 0), {
		betweenParts,
		beforeWhole: 0,
		playOne
	})
}

async function speakBlendedLookupSteps(text, startIndex, ctx) {
	const { lookupSequence } = splitPinyinReadingSequences(text)
	const steps = (lookupSequence.length ? lookupSequence : [text]).slice(startIndex)
	if (!steps.length) return false

	let anyOk = false
	for (let i = 0; i < steps.length; i++) {
		const played = await ctx.playOne(steps[i])
		if (played) anyOk = true
		if (i < steps.length - 1 && ctx.betweenParts > 0) {
			await sleep(ctx.betweenParts)
		}
	}
	return anyOk
}

/**
 * 按字朗读：多音字连续播多个音节，每个音节仅走本地 opus。
 * @param {object} opts
 * @param {string} opts.hanzi
 * @param {string} [opts.fallbackPinyin]
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

	const useTone1Fb = opts.useTone1Fb !== false
	const blend = opts.blend === true
	const readingGapMs =
		opts.readingGapMs != null
			? opts.readingGapMs
			: opts.gapMs != null
				? opts.gapMs
				: PINYIN_BLEND_TIMING.readingGapMs
	const betweenParts = opts.betweenParts != null ? opts.betweenParts : PINYIN_BLEND_TIMING.betweenParts
	const beforeWhole = opts.beforeWhole != null ? opts.beforeWhole : PINYIN_BLEND_TIMING.beforeWhole

	let anyOk = false
	for (let i = 0; i < readings.length; i++) {
		logHanziSpeak('speak.reading_start', { hanzi: h, index: i, total: readings.length, reading: readings[i] })
		const ok = await speakBlendedPinyinSyllable(readings[i], {
			useTone1Fb,
			blend,
			betweenParts,
			beforeWhole
		})
		logHanziSpeak('speak.reading_finish', { hanzi: h, index: i, reading: readings[i], ok })
		if (ok) anyOk = true
		if (i < readings.length - 1) {
			await sleep(readingGapMs)
		}
	}
	logHanziSpeak('speak.all_done', { hanzi: h, anyOk, readingsCount: readings.length })
	return anyOk
}
