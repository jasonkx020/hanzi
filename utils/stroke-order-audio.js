/**
 * 笔顺动画读音：每笔按 cnchar 笔画名音节整段入队播放；
 * 动画收尾 await getStrokeAudioQueueTail() 再进下一笔（避免与整字读音叠音）。
 */
import cnchar from '@/utils/cnchar-setup.js'
import {
	normalizeStrokeLabel,
	resolveStrokeLabelSyllables,
	formatStrokeLabelDisplay
} from '@/data/stroke-name-pinyin.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import {
	playOpusForDisplayPinyin,
	playPinyinLocalAudioSequence,
	playLocalPinyinNeutralThenTone1,
	sleepUnlessCancelled,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'
import { STROKE_CHAR_PINYIN } from '@/data/stroke-name-pinyin.js'

/** 复合笔画名音节间隔（毫秒） */
const STROKE_COMPOUND_GAP_MS = 72
/** 估算单音节播放时长（用于拉长绘制，避免画完音未播完） */
const STROKE_SYLLABLE_AUDIO_MS = 520
const STROKE_AUDIO_TAIL_MS = 320

/** cnchar-order 笔画名称列表，如 ['横','竖折钩','撇'] */
export function getCncharStrokeNameList(char) {
	const c = String(char || '').trim().charAt(0)
	if (!c) return []
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const rows = cnchar.stroke(c, 'order', 'name')
			if (Array.isArray(rows) && rows[0] && Array.isArray(rows[0])) {
				const list = rows[0]
					.map((s) => normalizeStrokeLabel(String(s || '').trim()))
					.filter(Boolean)
				if (list.length) return list
			}
		} catch (_) {}
	}
	return []
}

/** 开笔顺动画前预热 cnchar 笔画名（减少首笔名为空） */
export function preloadStrokeNamesForChar(char) {
	return getCncharStrokeNameList(char)
}

/**
 * @deprecated 请使用 resolveStrokeLabelSyllables
 */
export function strokeLabelToDisplayPinyin(label) {
	return resolveStrokeLabelSyllables(label).join(' ')
}

/**
 * 按音节顺序播放，每个音节 await 结束后再播下一个（复合笔画不会提前进入下一笔）
 * @param {string[]} syllables 带调拼音，如 ['héng','zhé','gōu']
 * @param {{ narrator?: string, gapMs?: number, compoundGapMs?: number, useTone1Fallback?: boolean }} options
 * @returns {Promise<boolean>} 是否至少一个音节播放成功
 */
export async function playStrokeSyllableSequence(syllables, options = {}) {
	const list = Array.isArray(syllables)
		? syllables.map((s) => String(s || '').trim()).filter(Boolean)
		: []
	if (!list.length) return false
	if (typeof options.isCancelled === 'function' && options.isCancelled()) return false

	const narrator = options.narrator
	const seqOpts = {
		narrator,
		isCancelled: options.isCancelled,
		useTone1Fallback: options.useTone1Fallback
	}
	if (list.length === 1) {
		return playOpusForDisplayPinyin(list[0], { ...seqOpts, gapMs: 0 })
	}

	const compoundGapMs =
		options.compoundGapMs != null
			? options.compoundGapMs
			: options.gapMs != null
				? options.gapMs
				: STROKE_COMPOUND_GAP_MS

	return playPinyinLocalAudioSequence(list, {
		...seqOpts,
		gapMs: compoundGapMs
	})
}

/**
 * 播放单个笔画名称的全部音节（复合名顺序播完才返回）
 * @param {string} label 如「竖折钩」
 * @returns {Promise<boolean>}
 */
export async function playStrokeLabelAudio(label, options = {}) {
	const syllables = resolveStrokeLabelSyllables(label)
	if (!syllables.length) return false
	return playStrokeSyllableSequence(syllables, options)
}

const ORDINAL_DIGIT_PINYIN = [
	'',
	'yī',
	'èr',
	'sān',
	'sì',
	'wǔ',
	'liù',
	'qī',
	'bā',
	'jiǔ'
]

/** 「N 笔」读音节（不含「第」），strokeNo 为 1 起，如 一笔 → yī bǐ */
export function buildOrdinalStrokePrefixSyllables(strokeNo) {
	const n = Math.max(1, Math.floor(Number(strokeNo) || 1))
	if (n < 10) return [ORDINAL_DIGIT_PINYIN[n], 'bǐ']
	if (n === 10) return ['shí', 'bǐ']
	if (n < 20) {
		const ones = n % 10
		return ones === 0
			? ['shí', 'bǐ']
			: ['shí', ORDINAL_DIGIT_PINYIN[ones], 'bǐ']
	}
	const tens = Math.floor(n / 10)
	const ones = n % 10
	const out = []
	if (tens > 1) out.push(ORDINAL_DIGIT_PINYIN[tens])
	out.push('shí')
	if (ones > 0) out.push(ORDINAL_DIGIT_PINYIN[ones])
	out.push('bǐ')
	return out
}

/** 界面文案用数字：一、二、十一… */
export function strokeNoToChinese(num) {
	const n = Math.max(1, Math.floor(Number(num) || 1))
	const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
	if (n < 10) return d[n]
	if (n === 10) return '十'
	if (n < 20) {
		const o = n % 10
		return o === 0 ? '十' : `十${d[o]}`
	}
	const tens = Math.floor(n / 10)
	const ones = n % 10
	const t = tens === 1 ? '十' : `${d[tens]}十`
	return ones === 0 ? t : `${t}${d[ones]}`
}

/** @param {number} strokeIndexZeroBased 0 起 */
export function formatStrokeGuidancePhrase(strokeIndexZeroBased, label) {
	const no = Number(strokeIndexZeroBased) + 1
	const name = formatStrokeLabelDisplay(label)
	return name ? `${strokeNoToChinese(no)}笔，${name}` : `${strokeNoToChinese(no)}笔`
}

/**
 * 完整笔画提示音：先「N 笔」，再笔画名（如 一笔 → 撇；不播「第」）
 * @param {number} strokeIndexZeroBased
 * @param {string} label
 */
export async function playStrokeGuidanceAudio(strokeIndexZeroBased, label, options = {}) {
	const playGen = _strokeGuidancePlayGen
	const aborted = () =>
		playGen !== _strokeGuidancePlayGen ||
		(typeof options.isCancelled === 'function' && options.isCancelled())

	const strokeNo = Number(strokeIndexZeroBased) + 1
	const prefix = options.skipOrdinalPrefix
		? []
		: buildOrdinalStrokePrefixSyllables(strokeNo)
	const strokeSyl = resolveStrokeLabelSyllables(label)
	const narrator = options.narrator
	const gapMs = options.gapMs != null ? options.gapMs : 95
	const pauseMs =
		options.pauseBeforeStrokeMs != null ? options.pauseBeforeStrokeMs : 220
	const seqBase = {
		narrator,
		gapMs,
		isCancelled: aborted,
		useTone1Fallback: options.useTone1Fallback
	}

	if (aborted()) return false

	let ok = false
	if (prefix.length) {
		ok = (await playStrokeSyllableSequence(prefix, seqBase)) || ok
	}
	if (aborted()) return ok
	if (!strokeSyl.length) return ok
	if (!(await sleepUnlessCancelled(pauseMs, aborted))) return ok
	if (aborted()) return ok
	const okStroke = await playStrokeSyllableSequence(strokeSyl, {
		...seqBase,
		gapMs: options.strokeGapMs != null ? options.strokeGapMs : gapMs,
		compoundGapMs: options.compoundGapMs
	})
	return ok || okStroke
}

/**
 * 播放第 strokeIndex 笔的某一音节（与 draw-native 拐点分段对齐）。
 * segmentIndex 0 = 笔起；1+ = 第 N 个拐点后；无拐点时由 onStrokeTrailSegments 补尾。
 * @returns {Promise<boolean>}
 */
export async function playStrokeOrderAudioSegment(strokeIndex, segmentIndex, hanzi, options = {}) {
	const idx = Number(strokeIndex)
	const seg = Number(segmentIndex)
	if (!Number.isFinite(idx) || idx < 0 || !Number.isFinite(seg) || seg < 0) return false
	const char = String(hanzi || '').trim().charAt(0)
	if (!char) return false

	const narrator = options.narrator
	const names = getCncharStrokeNameList(char)
	const label = names[idx]

	if (label) {
		const syllables = resolveStrokeLabelSyllables(label)
		if (seg < syllables.length) {
			return playOpusForDisplayPinyin(syllables[seg], { narrator, gapMs: 0 })
		}
		return false
	}

	if (seg !== 0) return false
	const displayPinyin = String(options.displayPinyin || '').trim()
	if (displayPinyin) {
		let tokens = splitPinyinDisplayTokens(displayPinyin)
		if (!tokens.length) {
			const plain = displayPinyin.replace(/[()（）]/g, '').trim()
			if (plain) tokens = [plain]
		}
		if (tokens.length) {
			const tok = tokens[idx % tokens.length]
			return playStrokeSyllableSequence([tok], { narrator, gapMs: 0 })
		}
	}

	return false
}

/**
 * @deprecated 仅播第一音节；完整复合笔画请用分段 API
 */
export async function playStrokeOrderAudioAt(strokeIndex, hanzi, options = {}) {
	return playStrokeOrderAudioSegment(strokeIndex, 0, hanzi, options)
}

/** 笔画读音串行队列（不阻塞 canvas 动画，仅保证笔与笔之间读音不叠在一起） */
let _audioQueueTail = Promise.resolve()
let _audioQueueGen = 0
/** 写字引导「N 笔 + 笔画名」播放代次（换字时与队列一并作废） */
let _strokeGuidancePlayGen = 0
/** 当前笔已入队的整笔读音 Promise */
let _activeStrokeLabelAudio = { index: -1, gen: 0, promise: null }
/** @type {Map<string, Promise<boolean>>} */
const _strokeAudioPromiseMap = new Map()

function strokeAudioMapKey(gen, strokeIndex) {
	return `${gen}:${Number(strokeIndex)}`
}

function registerStrokeAudioPromise(strokeIndex, gen, promise) {
	_strokeAudioPromiseMap.set(strokeAudioMapKey(gen, strokeIndex), promise)
}

/** 新开一字或停止动画时清空队列 */
export function resetStrokeAudioQueue() {
	_audioQueueGen += 1
	_strokeGuidancePlayGen += 1
	_audioQueueTail = Promise.resolve()
	_activeStrokeLabelAudio = { index: -1, gen: 0, promise: null }
	_strokeAudioPromiseMap.clear()
	stopLocalPinyinAudio()
}

async function playStrokeSyllablesWithRetry(syllables, options = {}) {
	const list = Array.isArray(syllables)
		? syllables.map((s) => String(s || '').trim()).filter(Boolean)
		: []
	if (!list.length) return false

	const seqOpts = {
		narrator: options.narrator,
		gapMs: options.gapMs != null ? options.gapMs : 0,
		compoundGapMs:
			options.compoundGapMs != null ? options.compoundGapMs : STROKE_COMPOUND_GAP_MS,
		isCancelled: options.isCancelled,
		forStrokeOrder: true,
		useTone1Fallback: options.useTone1Fallback !== false
	}

	let ok = await playStrokeSyllableSequence(list, seqOpts)
	if (ok) return true
	if (typeof options.isCancelled === 'function' && options.isCancelled()) return false

	for (let i = 0; i < list.length; i++) {
		if (typeof options.isCancelled === 'function' && options.isCancelled()) return ok
		const syl = list[i]
		const one = await playOpusForDisplayPinyin(syl, {
			narrator: options.narrator,
			gapMs: 0,
			useTone1Fallback: seqOpts.useTone1Fallback
		})
		if (one) {
			ok = true
			continue
		}
		const fb = await playLocalPinyinNeutralThenTone1(syl, true)
		if (fb) ok = true
	}
	return ok
}

/**
 * 估算该笔笔画名连读时长（毫秒），供动画拉齐绘制速度
 */
export function estimateStrokeLabelAudioDurationMs(strokeIndex, hanzi, options = {}) {
	const syllables = resolveStrokePlaybackSyllables(strokeIndex, hanzi, options)
	if (!syllables.length) return 0
	const gaps = Math.max(0, syllables.length - 1) * STROKE_COMPOUND_GAP_MS
	return syllables.length * STROKE_SYLLABLE_AUDIO_MS + gaps + STROKE_AUDIO_TAIL_MS
}

/**
 * 解析某一笔应播的带调音节（笔画名优先，否则整字拼音按笔序号回退）
 * @param {number} strokeIndex
 * @param {string} hanzi
 * @param {{ displayPinyin?: string }} options
 * @returns {string[]}
 */
export function resolveStrokePlaybackSyllables(strokeIndex, hanzi, options = {}) {
	const idx = Number(strokeIndex)
	if (!Number.isFinite(idx) || idx < 0) return []
	const char = String(hanzi || '').trim().charAt(0)
	if (!char) return []

	const names = getCncharStrokeNameList(char)
	const label = names[idx]
	if (label) {
		const fromLabel = resolveStrokeLabelSyllables(label)
		if (fromLabel.length) return fromLabel
		const rawChars = String(label).match(/[\u4e00-\u9fff]/g) || []
		const parts = []
		for (let i = 0; i < rawChars.length; i++) {
			const py = STROKE_CHAR_PINYIN[rawChars[i]]
			if (py) parts.push(py)
		}
		if (parts.length) return parts
	}

	const displayPinyin = String(options.displayPinyin || '').trim()
	if (!displayPinyin) return []

	let tokens = splitPinyinDisplayTokens(displayPinyin)
	if (!tokens.length) {
		const plain = displayPinyin.replace(/[()（）]/g, '').trim()
		if (plain) tokens = [plain]
	}
	if (!tokens.length) return []
	if (tokens.length === 1) return idx === 0 ? [tokens[0]] : []
	return idx < tokens.length ? [tokens[idx]] : []
}

/**
 * 该笔笔画名一次性入队播放（每笔独立 Promise，避免复用已完成的 tail 导致静音）
 * @returns {Promise<boolean>}
 */
export function enqueueStrokeLabelForStroke(strokeIndex, hanzi, options = {}) {
	const idx = Number(strokeIndex)
	const gen = _audioQueueGen
	const syllables = resolveStrokePlaybackSyllables(idx, hanzi, options)

	const job = _audioQueueTail.then(async () => {
		if (gen !== _audioQueueGen) return false
		if (!syllables.length) {
			if (process.env.NODE_ENV !== 'production') {
				const names = getCncharStrokeNameList(String(hanzi || '').trim().charAt(0))
				console.warn(
					'[stroke-audio] no syllables for stroke',
					idx,
					hanzi,
					'label=',
					names[idx] || '(missing)'
				)
			}
			return false
		}
		return playStrokeSyllablesWithRetry(syllables, {
			narrator: options.narrator,
			gapMs: options.gapMs != null ? options.gapMs : 0,
			compoundGapMs:
				options.compoundGapMs != null ? options.compoundGapMs : STROKE_COMPOUND_GAP_MS,
			isCancelled: () => gen !== _audioQueueGen
		})
	})

	const tracked = job.catch(() => false)
	_audioQueueTail = tracked
	_activeStrokeLabelAudio = { index: idx, gen, promise: tracked }
	registerStrokeAudioPromise(idx, gen, tracked)
	return tracked
}

/** 等待指定笔画已入队的整笔读音播完（笔顺动画收尾用） */
export function awaitStrokeLabelAudio(strokeIndex) {
	const idx = Number(strokeIndex)
	const key = strokeAudioMapKey(_audioQueueGen, idx)
	const mapped = _strokeAudioPromiseMap.get(key)
	if (mapped) return mapped
	if (
		_activeStrokeLabelAudio.gen === _audioQueueGen &&
		_activeStrokeLabelAudio.index === idx &&
		_activeStrokeLabelAudio.promise
	) {
		return _activeStrokeLabelAudio.promise
	}
	return Promise.resolve(false)
}

/**
 * 将某一音节加入笔画读音队列（立即返回，不阻塞动画）
 * @returns {Promise<boolean>}
 */
export function enqueueStrokeSegmentAudio(strokeIndex, segmentIndex, hanzi, options = {}) {
	const gen = _audioQueueGen
	const job = _audioQueueTail.then(() => {
		if (gen !== _audioQueueGen) return false
		return playStrokeOrderAudioSegment(strokeIndex, segmentIndex, hanzi, options)
	})
	_audioQueueTail = job.catch(() => false)
	return _audioQueueTail
}

/** 该笔收尾：从 fromSegmentIndex 起依次播放剩余音节 */
export function enqueueStrokeTrailAudio(strokeIndex, fromSegmentIndex, hanzi, options = {}) {
	const char = String(hanzi || '').trim().charAt(0)
	if (!char) return _audioQueueTail
	const idx = Number(strokeIndex)
	const from = Number(fromSegmentIndex)
	if (!Number.isFinite(idx) || idx < 0 || !Number.isFinite(from) || from < 0) {
		return _audioQueueTail
	}
	const names = getCncharStrokeNameList(char)
	const syllables = resolveStrokeLabelSyllables(names[idx] || '')
	if (from >= syllables.length) return _audioQueueTail

	const gen = _audioQueueGen
	let tail = _audioQueueTail
	for (let s = from; s < syllables.length; s++) {
		const seg = s
		tail = tail.then(() => {
			if (gen !== _audioQueueGen) return false
			return playStrokeOrderAudioSegment(idx, seg, char, options)
		})
	}
	_audioQueueTail = tail.catch(() => false)
	return _audioQueueTail
}

/** @deprecated 请用 enqueueStrokeSegmentAudio(strokeIndex, 0, …) */
export function enqueueStrokeOrderAudio(strokeIndex, hanzi, options = {}) {
	return enqueueStrokeSegmentAudio(strokeIndex, 0, hanzi, options)
}

/** 停止当前笔画/拼音播放（页面离开或切换字时调用） */
export function stopStrokeOrderAudio() {
	resetStrokeAudioQueue()
}

/**
 * 当前笔画读音队列尾部（该笔所有 segment / trail 入队后再 await，即可等本笔读完）
 * @returns {Promise<boolean>}
 */
export function getStrokeAudioQueueTail() {
	return _audioQueueTail
}
