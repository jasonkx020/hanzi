/**
 * 拼音 / 字母读音：仅播放 static/pinyin/{stem}.opus，无对应文件则不播（无 TTS）。
 * 单例 InnerAudioContext：切换曲目时先 destroy，避免泄漏。
 */
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import {
	normalizeStaticWebPath,
	resolveAppStaticAbsoluteUrl,
	resolveAppStaticLogicalUrl
} from '@/utils/resolve-app-static-url.js'
import { isAppPlus } from '@/utils/uni-platform.js'

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

function normTone(syll) {
	return String(syll || '')
		.trim()
		.toLowerCase()
		.replace(/v/g, U_UML)
}

/**
 * 标调位置：a > o > e；iu→u；ui→i；否则最后一个 i/u/ü（与 PinYinSound 转换脚本一致）。
 * @returns {[number, string]|null} [index, vowelKey]
 */
function vowelMarkIndex(syll) {
	const s = normTone(syll)
	if (!s) return null
	for (let i = 0; i < s.length; i++) {
		const c = s[i]
		if (c === 'a') return [i, 'a']
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
 * 无声调音节 → 带指定声调的文件名片段（拉丁 a 用 ā á ǎ à）。
 * 先去掉已有声调再标调；不使用 NFC。
 * @param {number} tone 1–4
 */
export function applyToneToSyllableStem(symbol, tone) {
	if (tone < 1 || tone > 4) return ''
	const raw = stripPinyinToneMarks(normTone(symbol))
	const pos = vowelMarkIndex(raw)
	if (!pos) {
		return raw
	}
	const [idx, v] = pos
	let marked
	if (v === 'a') {
		const reps = TONE_VOWELS.a
		marked = reps ? reps[tone - 1] : 'a'
	} else {
		const reps = TONE_VOWELS[v]
		marked = reps ? reps[tone - 1] : v
	}
	return raw.slice(0, idx) + marked + raw.slice(idx + 1)
}

/**
 * 在完整无声调音节中定位片段（优先后缀匹配，对应韵母/介韵部分）。
 * @param {string} fullBare
 * @param {string} partBare
 * @returns {number}
 */
export function findPartOffsetInBareSyllable(fullBare, partBare) {
	const full = stripPinyinToneMarks(normTone(fullBare))
	const part = stripPinyinToneMarks(normTone(partBare))
	if (!full || !part) return -1
	const idx = full.lastIndexOf(part)
	return idx >= 0 ? idx : -1
}

/**
 * 按完整音节的标调规则，把声调标到拆分出的韵母/尾音节片段上（与整读调号位置一致）。
 * 若该片段不含主元音调位则返回无声调片段。
 * @param {string} fullBare 完整音节无声调，如 zhuang
 * @param {string} partBare 拆分片段，如 ang
 * @param {number} tone 1–4
 * @returns {string}
 */
export function applyToneFromFullSyllableToPart(fullBare, partBare, tone) {
	const toneNum = Number(tone)
	const part = stripPinyinToneMarks(normTone(partBare))
	if (!part) return ''
	if (toneNum < 1 || toneNum > 4) return part

	const full = stripPinyinToneMarks(normTone(fullBare))
	const pos = vowelMarkIndex(full)
	if (!pos || !full) return applyToneToSyllableStem(part, toneNum)

	const [toneIdx, vKey] = pos
	const start = findPartOffsetInBareSyllable(full, part)
	if (start < 0) return applyToneToSyllableStem(part, toneNum)
	if (toneIdx < start || toneIdx >= start + part.length) {
		return part
	}

	const localIdx = toneIdx - start
	const reps = vKey === 'a' ? TONE_VOWELS.a : TONE_VOWELS[vKey]
	const marked = reps ? reps[toneNum - 1] : part[localIdx]
	return part.slice(0, localIdx) + marked + part.slice(localIdx + 1)
}

let _inner = null
/** @type {(() => void)|null} */
let _chainAbort = null
/** @type {{ inner: object, reject: (err: Error) => void, timer: number|null }|null} */
let _activePlay = null

const PLAY_ABORT_MSG = 'play aborted'

export function isPinyinPlayAborted(err) {
	return !!(
		err &&
		(err.code === 'PINYIN_PLAY_ABORTED' || String(err.message || err) === PLAY_ABORT_MSG)
	)
}

function makePlayAbortedError() {
	return Object.assign(new Error(PLAY_ABORT_MSG), { code: 'PINYIN_PLAY_ABORTED' })
}

function abortActivePinyinPlay() {
	if (!_activePlay) return
	const ap = _activePlay
	_activePlay = null
	if (ap.timer != null) clearTimeout(ap.timer)
	try {
		ap.inner.stop()
	} catch (_) {}
	try {
		ap.inner.destroy()
	} catch (_) {}
	if (_inner === ap.inner) _inner = null
	ap.reject(makePlayAbortedError())
}

export function stopLocalPinyinAudio() {
	if (_chainAbort) {
		const abort = _chainAbort
		_chainAbort = null
		abort()
	}
	abortActivePinyinPlay()
	if (!_inner) return
	try {
		_inner.stop()
	} catch (_) {}
	try {
		_inner.destroy()
	} catch (_) {}
	_inner = null
}

function normPinyinFileStem(symbol) {
	return String(symbol || '')
		.trim()
		.normalize('NFC')
}

/** 演示读音：/static/pinyin/{stem}.opus（文件名与界面一致，使用拉丁 a / 带调 a） */
export function getLocalPinyinAudioPath(symbol) {
	const stem = normPinyinFileStem(symbol)
	if (!stem) return ''
	return `/static/pinyin/${stem}.opus`
}

/** 一声版文件名（带调字母），用于整体认读 / 拼读练习在无调 opus 缺失时的替补 */
export function getLocalPinyinTone1AudioPath(symbol) {
	const stem = normPinyinFileStem(applyToneToSyllableStem(symbol, 1))
	if (!stem) return ''
	return `/static/pinyin/${stem}.opus`
}

/** @param {number} ms */
export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 可中断等待（换字 / 取消引导时避免停顿结束后仍开播） */
export async function sleepUnlessCancelled(ms, isCancelled) {
	const total = Math.max(0, Number(ms) || 0)
	const step = 40
	let left = total
	while (left > 0) {
		if (typeof isCancelled === 'function' && isCancelled()) return false
		const chunk = Math.min(step, left)
		await sleep(chunk)
		left -= chunk
	}
	return !(typeof isCancelled === 'function' && isCancelled())
}

/**
 * 先试无调 opus，再试一声（可选）；任一成功返回 true。
 * @param {boolean} useTone1Fallback 整体认读 / 拼读练习等与格子逻辑一致
 */
export async function playLocalPinyinNeutralThenTone1(symbol, useTone1Fallback, opts = {}) {
	const tryUrls = []
	let neutral = ''
	if (!opts.skipTonedExact) {
		neutral = getLocalPinyinAudioPath(symbol) || ''
		if (neutral) tryUrls.push(neutral)
	}
	let tone1 = ''
	if (useTone1Fallback) {
		tone1 = getLocalPinyinTone1AudioPath(symbol) || ''
		if (tone1 && tryUrls.indexOf(tone1) === -1) tryUrls.push(tone1)
	}
	const neutralStem = neutral ? neutral.replace(/^.*\//, '').replace(/\.opus$/i, '') : ''
	const tone1Stem = tone1 ? tone1.replace(/^.*\//, '').replace(/\.opus$/i, '') : ''
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
			if (isPinyinPlayAborted(e)) return false
			const err = e || {}
			logHanziSpeak('local.play_err', {
				symbol,
				src,
				errMsg: err.errMsg || err.message || String(e),
				errCode: err.errCode
			})
		}
	}
	logHanziSpeak('local.all_failed', { symbol, urls: tryUrls })
	return false
}

/**
 * 「音调」页：格内为带调 stem，仅播对应 opus。
 * opts.asNeutral 为 true 时走无调 + 一声替补 opus。
 * @param {string} symbol 播放用字符串（带调音节）
 * @param {{ asNeutral?: boolean }} opts
 */
export async function playToneGridCell(symbol, opts = {}) {
	const sym = String(symbol || '').trim()
	if (!sym) return false
	if (opts.asNeutral) {
		return playLocalPinyinNeutralThenTone1(sym, true)
	}
	const path = getLocalPinyinAudioPath(sym)
	if (!path) return false
	try {
		await playPinyinLocalAudio(path)
		return true
	} catch (e) {
		if (isPinyinPlayAborted(e)) return false
		return false
	}
}

/**
 * 用户当前看到的拼音串：拆音节后按 `/static/pinyin/{音节}.opus` 查找播放；
 * 带调文件不存在时再试无声调 + 一声替补 opus，均无则跳过该段。
 * @param {string} displayPinyin 与界面展示一致（如 pyShow）
 * @param {{ gapMs?: number, timeoutMs?: number, isCancelled?: () => boolean }} [opts]
 * @returns {Promise<boolean>} 是否至少有一段成功播放
 */
export async function playOpusForDisplayPinyin(displayPinyin, opts = {}) {
	const raw = String(displayPinyin || '').trim()
	if (!raw || raw === '-') return false
	let tokens = splitPinyinDisplayTokens(raw)
	if (!tokens.length) tokens = [raw]
	const gapMs = opts.gapMs != null ? opts.gapMs : 100
	const isCancelled = opts.isCancelled
	let anyOk = false
	for (let i = 0; i < tokens.length; i++) {
		if (typeof isCancelled === 'function' && isCancelled()) return anyOk
		const sym = String(tokens[i] || '').trim()
		if (!sym) continue
		let played = false
		const path = getLocalPinyinAudioPath(sym)
		try {
			await playPinyinLocalAudio(path, { timeoutMs: 3200 })
			played = true
			logHanziSpeak('lesson.display_pinyin.exact_ok', { sym, path })
		} catch (e) {
			if (isPinyinPlayAborted(e) && typeof isCancelled === 'function' && isCancelled()) {
				return anyOk
			}
			if (!isPinyinPlayAborted(e)) {
				logHanziSpeak('lesson.display_pinyin.exact_fail', {
					sym,
					path,
					err: e && (e.errMsg || e.message || String(e))
				})
			}
		}
		if (!played) {
			played = await playLocalPinyinNeutralThenTone1(sym, true, { skipTonedExact: true })
			if (played) logHanziSpeak('lesson.display_pinyin.fallback_neutral_ok', { sym })
		}
		if (played) anyOk = true
		if (i < tokens.length - 1 && gapMs > 0) {
			if (!(await sleepUnlessCancelled(gapMs, isCancelled))) return anyOk
		}
	}
	return anyOk
}

function normalizeInnerAudioError(err) {
	if (!err) return new Error('play error')
	if (err instanceof Error) return err
	const msg = err.errMsg || err.message || String(err)
	const e = new Error(msg)
	if (err.errCode != null) e.errCode = err.errCode
	return e
}

/**
 * 按端生成 InnerAudio 可尝试的 src 列表（App 失败时可再试绝对路径）。
 * @param {string} src 如 /static/pinyin/b.opus
 * @returns {string[]}
 */
function resolveLocalAudioSrcCandidates(src) {
	const web = normalizeStaticWebPath(src)
	if (!web) return []
	const out = []
	const push = (u) => {
		const s = String(u || '').trim()
		if (s && out.indexOf(s) === -1) out.push(s)
	}
	push(resolveAppStaticLogicalUrl(web))
	if (isAppPlus()) {
		push(resolveAppStaticAbsoluteUrl(web))
	}
	return out
}

/** @param {string} src */
function resolveLocalAudioSrc(src) {
	const list = resolveLocalAudioSrcCandidates(src)
	return list[0] || src
}

/**
 * @param {string} src 如 /static/pinyin/a.opus
 * @returns {Promise<void>}
 */
export function playPinyinLocalAudio(src, opts = {}) {
	if (!src) return Promise.reject(new Error('empty src'))
	const candidates = resolveLocalAudioSrcCandidates(src)
	if (!candidates.length) return Promise.reject(new Error('empty src'))

	const tryAt = (idx) => {
		if (idx >= candidates.length) {
			return Promise.reject(new Error('play error'))
		}
		return playPinyinLocalAudioOnce(candidates[idx], opts).catch((e) => {
			if (isPinyinPlayAborted(e)) return Promise.reject(e)
			if (idx + 1 < candidates.length) return tryAt(idx + 1)
			return Promise.reject(e)
		})
	}
	return tryAt(0)
}

/**
 * @param {string} resolvedSrc 已解析的 InnerAudio src
 */
function playPinyinLocalAudioOnce(resolvedSrc, opts = {}) {
	stopLocalPinyinAudio()
	const inner = uni.createInnerAudioContext()
	_inner = inner
	try {
		inner.obeyMuteSwitch = false
	} catch (_) {}
	const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 3200
	return new Promise((resolve, reject) => {
		let settled = false
		let started = false
		let timer = null
		let canplayTimer = null
		const finish = (fn) => {
			if (settled) return
			settled = true
			if (_activePlay && _activePlay.inner === inner) _activePlay = null
			if (timer != null) clearTimeout(timer)
			if (canplayTimer != null) clearTimeout(canplayTimer)
			try {
				inner.stop()
			} catch (_) {}
			try {
				inner.destroy()
			} catch (_) {}
			if (_inner === inner) _inner = null
			fn()
		}
		const startPlay = () => {
			if (started || settled) return
			started = true
			try {
				inner.play()
			} catch (e) {
				finish(() => reject(e))
			}
		}
		_activePlay = { inner, reject, timer: null }
		timer = setTimeout(() => finish(() => reject(new Error('play timeout'))), timeoutMs)
		_activePlay.timer = timer
		inner.onCanplay(() => {
			if (canplayTimer != null) clearTimeout(canplayTimer)
			canplayTimer = null
			startPlay()
		})
		inner.onEnded(() => finish(() => resolve()))
		inner.onError((err) => finish(() => reject(normalizeInnerAudioError(err))))
		inner.onStop(() => {
			if (!settled) finish(() => reject(makePlayAbortedError()))
		})
		inner.src = resolvedSrc
		canplayTimer = setTimeout(() => startPlay(), 120)
	})
}

/** @param {string} sym */
function getLocalPinyinTryUrls(sym, useTone1Fallback) {
	const tryUrls = []
	const neutral = getLocalPinyinAudioPath(sym)
	if (neutral) tryUrls.push(neutral)
	if (useTone1Fallback) {
		const tone1 = getLocalPinyinTone1AudioPath(sym)
		if (tone1 && tryUrls.indexOf(tone1) === -1) tryUrls.push(tone1)
	}
	return tryUrls
}

/**
 * 同一 InnerAudioContext 连续播多个音节，避免每段 destroy 造成的长停顿（复合笔画名连读）。
 * @param {string[]} symbols 带调音节列表
 * @param {{ gapMs?: number, useTone1Fallback?: boolean, isCancelled?: () => boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export function playPinyinLocalAudioSequence(symbols, opts = {}) {
	const list = (Array.isArray(symbols) ? symbols : [])
		.map((s) => String(s || '').trim())
		.filter(Boolean)
	if (!list.length) return Promise.resolve(false)

	const gapMs = opts.gapMs != null ? opts.gapMs : 0
	const useTone1Fallback = opts.useTone1Fallback !== false
	const isCancelled = opts.isCancelled
	const forStrokeOrder = opts.forStrokeOrder === true

	stopLocalPinyinAudio()
	const inner = uni.createInnerAudioContext()
	_inner = inner

	let anyOk = false
	let symIndex = 0
	let aborted = false

	return new Promise((resolve) => {
		const finishAll = () => {
			if (aborted) return
			aborted = true
			_chainAbort = null
			stopLocalPinyinAudio()
			resolve(anyOk)
		}

		_chainAbort = () => {
			if (aborted) return
			aborted = true
			_chainAbort = null
			if (_inner) {
				try {
					_inner.stop()
				} catch (_) {}
				try {
					_inner.destroy()
				} catch (_) {}
				_inner = null
			}
			resolve(anyOk)
		}

		const playSymbolAt = (idx) => {
			if (typeof isCancelled === 'function' && isCancelled()) {
				if (_chainAbort) _chainAbort()
				return
			}
			if (aborted || idx >= list.length) {
				finishAll()
				return
			}
			const sym = list[idx]
			const urls = getLocalPinyinTryUrls(sym, useTone1Fallback)

			const advance = () => {
				if (aborted) return
				if (typeof isCancelled === 'function' && isCancelled()) {
					if (_chainAbort) _chainAbort()
					return
				}
				symIndex = idx + 1
				if (symIndex >= list.length) {
					finishAll()
					return
				}
				if (gapMs > 0) {
					setTimeout(() => {
						if (typeof isCancelled === 'function' && isCancelled()) {
							if (_chainAbort) _chainAbort()
							return
						}
						playSymbolAt(symIndex)
					}, gapMs)
				} else {
					playSymbolAt(symIndex)
				}
			}

			const tryUrlAt = (urlIdx) => {
				if (aborted) return
				if (urlIdx >= urls.length) {
					advance()
					return
				}
				const candidates = resolveLocalAudioSrcCandidates(urls[urlIdx])
				if (!candidates.length) {
					tryUrlAt(urlIdx + 1)
					return
				}
				let settled = false
				const done = (ok) => {
					if (settled || aborted) return
					settled = true
					if (ok) {
						anyOk = true
						logHanziSpeak('local.chain_ok', { sym, src: candidates[0] })
						advance()
					} else {
						tryUrlAt(urlIdx + 1)
					}
				}
				const tryCandidateAt = (candIdx) => {
					if (aborted) return
					if (candIdx >= candidates.length) {
						done(false)
						return
					}
					let urlStarted = false
					let canplayTimer = null
					const urlStart = () => {
						if (urlStarted || aborted || settled) return
						urlStarted = true
						try {
							inner.play()
						} catch (_) {
							tryCandidateAt(candIdx + 1)
						}
					}
					inner.onCanplay(() => {
						if (canplayTimer != null) clearTimeout(canplayTimer)
						urlStart()
					})
					let symbolTimer = null
					const symbolTimeoutMs =
						opts.timeoutPerSymbolMs != null
							? opts.timeoutPerSymbolMs
							: forStrokeOrder
								? 5200
								: 0
					const clearSymbolTimer = () => {
						if (symbolTimer != null) {
							clearTimeout(symbolTimer)
							symbolTimer = null
						}
					}
					inner.onEnded(() => {
						clearSymbolTimer()
						done(true)
					})
					inner.onError(() => {
						clearSymbolTimer()
						tryCandidateAt(candIdx + 1)
					})
					inner.src = candidates[candIdx]
					canplayTimer = setTimeout(urlStart, 120)
					if (symbolTimeoutMs > 0) {
						symbolTimer = setTimeout(() => {
							if (!settled && !aborted) {
								clearSymbolTimer()
								done(false)
							}
						}, symbolTimeoutMs)
					}
				}
				tryCandidateAt(0)
			}

			tryUrlAt(0)
		}

		playSymbolAt(0)
	})
}
