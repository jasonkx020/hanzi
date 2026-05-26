/**
 * 拼音格子本地音频（如 static 下的 opus/mp3）。
 * 单例 InnerAudioContext：切换曲目时先 destroy，避免泄漏。
 */
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import { resolveAppStaticLogicalUrl } from '@/utils/resolve-app-static-url.js'
import { safeInnerAudioPlay } from '@/utils/safe-inner-audio-play.js'

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
export function vowelMarkIndex(syll) {
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
 * 标调落在哪个字母（供声调乐园「标调魔法」等）
 * @returns {{ bare: string, index: number, vowelKey: string, displayLetter: string, ruleKey: string }|null}
 */
export function getToneMarkVowelPosition(symbol) {
	const raw = stripPinyinToneMarks(normTone(symbol))
	const pos = vowelMarkIndex(raw)
	if (!pos) return null
	const [index, vowelKey] = pos
	let ruleKey = 'last'
	if (raw.includes('a')) ruleKey = 'a'
	else if (raw.indexOf('o') >= 0 && vowelKey === 'o') ruleKey = 'o'
	else if (raw.indexOf('e') >= 0 && vowelKey === 'e') ruleKey = 'e'
	else if (raw.includes('iu') && vowelKey === 'u') ruleKey = 'iu'
	else if (raw.includes('ui') && vowelKey === 'i') ruleKey = 'ui'
	const displayLetter = vowelKey === '\u00fc' ? 'ü' : vowelKey
	return { bare: raw, index, vowelKey, displayLetter, ruleKey }
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
	const out = raw.slice(0, idx) + marked + raw.slice(idx + 1)
	try {
		return out.normalize('NFC')
	} catch (_) {
		return out
	}
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
	destroyInnerAudioSafe(ap.inner)
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
	destroyInnerAudioSafe(_inner)
	_inner = null
}

function normPinyinFileStem(symbol) {
	let s = String(symbol || '').trim()
	try {
		s = s.normalize('NFC')
	} catch (_) {}
	return s
}

/** 延后 destroy，避免 Android 在 play/stop 竞态时原生崩溃 */
function destroyInnerAudioSafe(inner) {
	if (!inner) return
	try {
		inner.stop()
	} catch (_) {}
	const ref = inner
	setTimeout(() => {
		try {
			ref.destroy()
		} catch (_) {}
	}, 48)
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
		if (typeof opts.isCancelled === 'function' && opts.isCancelled()) return false
		try {
			await playPinyinLocalAudio(src)
			logHanziSpeak('local.play_ok', { symbol, src })
			return true
		} catch (e) {
			if (isPinyinPlayAborted(e)) {
				if (typeof opts.isCancelled === 'function' && opts.isCancelled()) return false
				return false
			}
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
 * 「音调」页：格内为带调 stem，仅播对应本地 opus（失败不 TTS）。
 * opts.asNeutral 为 true 时走无调+一声替补（保留兼容；当前音调表已不展示本音/轻声列）。
 * @param {string} symbol 播放用字符串（带调音节）
 * @param {{ asNeutral?: boolean }} opts
 */
export async function playToneGridCell(symbol, opts = {}) {
	const sym = String(symbol || '').trim()
	if (!sym) return false
	if (typeof opts.isCancelled === 'function' && opts.isCancelled()) return false
	if (opts.asNeutral) {
		return playLocalPinyinNeutralThenTone1(sym, true, { isCancelled: opts.isCancelled })
	}
	const path = getLocalPinyinAudioPath(sym)
	if (!path) {
		logHanziSpeak('tone_grid.no_path', { symbol: sym })
		return false
	}
	try {
		await playPinyinLocalAudio(path)
		return true
	} catch (e) {
		if (isPinyinPlayAborted(e)) return false
		logHanziSpeak('tone_grid.local_fail', { symbol: sym, path })
		return false
	}
}

/**
 * 用户当前看到的拼音串：拆音节后按 `/static/pinyin/{音节}.opus` 查找播放；
 * 带调文件不存在时再试无声调 + 一声替补；仍失败则静默结束（不 TTS）。
 * @param {string} displayPinyin 与界面展示一致（如 pyShow）
 * @param {{ gapMs?: number, narrator?: string }} [opts]
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
		if (typeof isCancelled === 'function' && isCancelled()) return anyOk
		let played = false
		const path = getLocalPinyinAudioPath(sym)
		try {
			await playPinyinLocalAudio(path, { timeoutMs: 3200 })
			played = true
			logHanziSpeak('lesson.display_pinyin.exact_ok', { sym, path })
		} catch (e) {
			if (isPinyinPlayAborted(e)) {
				if (typeof isCancelled === 'function' && isCancelled()) return anyOk
			} else {
			logHanziSpeak('lesson.display_pinyin.exact_fail', {
				sym,
				path,
				err: e && (e.errMsg || e.message || String(e))
			})
			}
		}
		if (!played) {
			if (typeof isCancelled === 'function' && isCancelled()) return anyOk
			played = await playLocalPinyinNeutralThenTone1(sym, true, {
				skipTonedExact: true,
				isCancelled
			})
			if (played) logHanziSpeak('lesson.display_pinyin.fallback_neutral_ok', { sym })
		}
		if (!played) {
			logHanziSpeak('lesson.display_pinyin.all_local_failed', { sym })
		}
		if (played) anyOk = true
		if (i < tokens.length - 1 && gapMs > 0) {
			if (!(await sleepUnlessCancelled(gapMs, isCancelled))) return anyOk
		}
	}
	return anyOk
}

/**
 * App 端：InnerAudioContext 使用 _www/static/... 逻辑路径。
 * 禁止 plus.io.convertLocalFileSystemURL(整条路径)，release 会与运行时二次拼接导致路径重复。
 * @param {string} src
 */
function resolveLocalAudioSrc(src) {
	if (!src || typeof src !== 'string') return src
	return resolveAppStaticLogicalUrl(src)
}

/**
 * @param {string} src 如 /static/pinyin/a.opus
 * @returns {Promise<void>}
 */
function buildLocalAudioSrcCandidates(src) {
	const web = String(src || '').trim()
	if (!web) return []
	const out = []
	const push = (s) => {
		const v = String(s || '').trim()
		if (v && out.indexOf(v) < 0) out.push(v)
	}
	push(resolveLocalAudioSrc(web))
	push(web)
	return out
}

export function playPinyinLocalAudio(src, opts = {}) {
	if (!src) return Promise.reject(new Error('empty src'))
	const candidates = buildLocalAudioSrcCandidates(src)
	if (!candidates.length) return Promise.reject(new Error('empty src'))
	stopLocalPinyinAudio()
	const inner = uni.createInnerAudioContext()
	_inner = inner
	const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 3200
	return new Promise((resolve, reject) => {
		let settled = false
		let timer = null
		const finish = (fn) => {
			if (settled) return
			settled = true
			if (_activePlay && _activePlay.inner === inner) _activePlay = null
			if (timer != null) clearTimeout(timer)
			destroyInnerAudioSafe(inner)
			if (_inner === inner) _inner = null
			fn()
		}
		_activePlay = { inner, reject, timer: null }
		timer = setTimeout(() => finish(() => reject(new Error('play timeout'))), timeoutMs)
		_activePlay.timer = timer
		let urlIdx = 0
		let switchingSrc = false
		const tryPlayAt = (idx) => {
			if (settled || idx >= candidates.length) {
				if (!settled) finish(() => reject(new Error('play error')))
				return
			}
			urlIdx = idx
			inner.src = candidates[idx]
			try {
				safeInnerAudioPlay(inner)
			} catch (e) {
				if (idx + 1 < candidates.length) {
					switchingSrc = true
					setTimeout(() => {
						switchingSrc = false
						tryPlayAt(idx + 1)
					}, 40)
				} else finish(() => reject(e))
			}
		}
		inner.onEnded(() => finish(() => resolve()))
		inner.onError((err) => {
			if (urlIdx + 1 < candidates.length) {
				switchingSrc = true
				setTimeout(() => {
					switchingSrc = false
					tryPlayAt(urlIdx + 1)
				}, 40)
				return
			}
			finish(() => reject(err || new Error('play error')))
		})
		inner.onStop(() => {
			if (!settled && !switchingSrc) finish(() => reject(makePlayAbortedError()))
		})
		tryPlayAt(0)
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
 * @param {{ gapMs?: number, narrator?: string, useTone1Fallback?: boolean }} [opts]
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
				destroyInnerAudioSafe(_inner)
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
					logHanziSpeak('local.chain_all_failed', { sym, urls })
					advance()
					return
				}
				const src = resolveLocalAudioSrc(urls[urlIdx])
				let settled = false
				const done = (ok) => {
					if (settled || aborted) return
					settled = true
					if (ok) {
						anyOk = true
						logHanziSpeak('local.chain_ok', { sym, src })
						advance()
					} else {
						tryUrlAt(urlIdx + 1)
					}
				}
				inner.onEnded(() => done(true))
				inner.onError(() => done(false))
				inner.src = src
				try {
					safeInnerAudioPlay(inner)
				} catch (_) {
					done(false)
				}
			}

			tryUrlAt(0)
		}

		playSymbolAt(0)
	})
}
