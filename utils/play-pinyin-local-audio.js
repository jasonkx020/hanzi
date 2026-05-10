/**
 * 拼音格子本地音频（如 static 下的 opus/mp3）。
 * 单例 InnerAudioContext：切换曲目时先 destroy，避免泄漏。
 */
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { speakPinyinSymbolAsync } from '@/utils/speak-pinyin-symbol.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'

/** 教材 ɑ（LATIN SMALL LETTER ALPHA） */
const U_ALPH = '\u0251'
/** ü */
const U_UML = '\u00fc'
/** 一声–四声：ə 类预组合（ü 用 ü 的四声形式） */
const TONE_VOWELS = {
	a: ['\u0101', '\u00e1', '\u01ce', '\u00e0'],
	o: ['\u014d', '\u00f3', '\u01d2', '\u00f2'],
	e: ['\u0113', '\u00e9', '\u011b', '\u00e8'],
	i: ['\u012b', '\u00ed', '\u01d0', '\u00ec'],
	u: ['\u016b', '\u00fa', '\u01d4', '\u00f9'],
	"\u00fc": ['\u01d6', '\u01d8', '\u01da', '\u01dc']
}
/** ɑ 上一声–四声：仅用组合调号，不做 NFC，避免异常合成 */
const ALPH_WITH_TONE = ['\u0251\u0304', '\u0251\u0301', '\u0251\u030c', '\u0251\u0300']

function normTone(syll) {
	return String(syll || '')
		.trim()
		.toLowerCase()
		.replace(/v/g, U_UML)
}

/**
 * 标调位置：a/ɑ > o > e；iu→u；ui→i；否则最后一个 i/u/ü（与 PinYinSound 转换脚本一致）。
 * @returns {[number, string]|null} [index, vowelKey]
 */
function vowelMarkIndex(syll) {
	const s = normTone(syll)
	if (!s) return null
	for (let i = 0; i < s.length; i++) {
		const c = s[i]
		if (c === 'a' || c === U_ALPH) return [i, 'a']
	}
	const io = s.indexOf('o')
	if (io >= 0) return [io, 'o']
	const ie = s.indexOf('e')
	if (ie >= 0) return [ie, 'e']
	const iui = s.indexOf('iu')
	if (iui >= 0) return [iui + 1, 'u']
	const uii = s.indexOf('ui')
	if (uii >= 0) return [uii + 1, 'i']
	let lastIdx = -1
	let lastKey = ''
	for (let j = 0; j < s.length; j++) {
		const c = s[j]
		if (c === 'i' || c === 'u' || c === U_UML) {
			lastIdx = j
			lastKey = c === U_UML ? '\u00fc' : c
		}
	}
	if (lastIdx >= 0) return [lastIdx, lastKey]
	return null
}

/**
 * 无声调音节 → 带指定声调的文件名片段；与 convert_mp3_to_opus.py 一致：标调处及剩余拉丁 a 均为 ɑ。
 * 先去掉已有声调再标调；不使用 NFC。
 * @param {number} tone 1–4
 */
export function applyToneToSyllableStem(symbol, tone) {
	if (tone < 1 || tone > 4) return ''
	const raw = stripPinyinToneMarks(normTone(symbol))
	const pos = vowelMarkIndex(raw)
	if (!pos) {
		return raw.replace(/a/g, U_ALPH)
	}
	const [idx, v] = pos
	let marked
	if (v === 'a') {
		marked = ALPH_WITH_TONE[tone - 1]
	} else {
		const reps = TONE_VOWELS[v]
		marked = reps ? reps[tone - 1] : v
	}
	let core = raw.slice(0, idx) + marked + raw.slice(idx + 1)
	core = core.replace(/a/g, U_ALPH)
	return core
}

let _inner = null

export function stopLocalPinyinAudio() {
	if (!_inner) return
	try {
		_inner.stop()
	} catch (_) {}
	try {
		_inner.destroy()
	} catch (_) {}
	_inner = null
}


/** 演示读音：/static/pinyin/{stem}.opus */
export function getLocalPinyinAudioPath(symbol) {
	return `/static/pinyin/${symbol}.opus`
}

/** 一声版文件名（带调字母），用于整体认读 / 拼读练习在无调 opus 缺失时的替补 */
export function getLocalPinyinTone1AudioPath(symbol) {
	const stem = applyToneToSyllableStem(symbol, 1)
	if (!stem) return ''
	return `/static/pinyin/${stem}.opus`
}

/** @param {number} ms */
export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 先试无调 opus，再试一声（可选）；任一成功返回 true。
 * @param {boolean} useTone1Fallback 整体认读 / 拼读练习等与格子逻辑一致
 */
export async function playLocalPinyinNeutralThenTone1(symbol, useTone1Fallback) {
	const tryUrls = []
	const neutral = getLocalPinyinAudioPath(symbol)
	if (neutral) tryUrls.push(neutral)
	if (useTone1Fallback) {
		const tone1 = getLocalPinyinTone1AudioPath(symbol)
		if (tone1 && tryUrls.indexOf(tone1) === -1) tryUrls.push(tone1)
	}
	const neutralStem = neutral ? neutral.replace(/^.*\//, '').replace(/\.opus$/i, '') : ''
	const tone1Stem =
		useTone1Fallback && tryUrls[1]
			? tryUrls[1].replace(/^.*\//, '').replace(/\.opus$/i, '')
			: ''
	logHanziSpeak('local.try_urls', {
		symbol,
		useTone1Fallback,
		urls: tryUrls,
		stems: { neutral: neutralStem, tone1: tone1Stem }
	})
	if (!tryUrls.length) {
		logHanziSpeak('local.no_urls', { symbol })
		return false
	}
	for (const src of tryUrls) {
		try {
			await playPinyinLocalAudio(src)
			logHanziSpeak('local.play_ok', { symbol, src })
			return true
		} catch (e) {
			const err = e || {}
			logHanziSpeak('local.play_err', {
				symbol,
				src,
				errMsg: err.errMsg || err.message || String(e),
				errCode: err.errCode
			})
			console.warn('[pinyin] local audio failed', src, e)
		}
	}
	logHanziSpeak('local.all_failed', { symbol, urls: tryUrls })
	return false
}

/**
 * 「音调」页：本音走无调+一声替补；四声格用 applyToneToSyllableStem 的精确文件名，失败再 TTS。
 * @param {string} symbol 播放用字符串（本音为无声调形，四声为带调 stem）
 * @param {{ asNeutral?: boolean, narrator?: string }} opts
 */
export async function playToneGridCell(symbol, opts = {}) {
	const sym = String(symbol || '').trim()
	if (!sym) return false
	const narrator = opts.narrator != null ? opts.narrator : getAudioNarrator()
	if (opts.asNeutral) {
		return playLocalPinyinNeutralThenTone1(sym, true)
	}
	const src = `/static/pinyin/${sym}.opus`
	try {
		await playPinyinLocalAudio(src)
		return true
	} catch (_) {
		const ok = await speakPinyinSymbolAsync(sym, narrator)
		return !!ok
	}
}

/**
 * @param {string} src 如 /static/pinyin/a.opus
 * @returns {Promise<void>}
 */
export function playPinyinLocalAudio(src) {
	if (!src) return Promise.reject(new Error('empty src'))
	stopLocalPinyinAudio()
	const inner = uni.createInnerAudioContext()
	_inner = inner
	inner.src = src
	return new Promise((resolve, reject) => {
		let settled = false
		const finish = (fn) => {
			if (settled) return
			settled = true
			stopLocalPinyinAudio()
			fn()
		}
		inner.onEnded(() => finish(() => resolve()))
		inner.onError((err) => finish(() => reject(err || new Error('play error'))))
		try {
			inner.play()
		} catch (e) {
			finish(() => reject(e))
		}
	})
}
