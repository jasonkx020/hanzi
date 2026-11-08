/**
 * @file play-pinyin-local-audio.js
 * @module utils
 * @description 基础设施工具：play-pinyin-local-audio.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
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
 * 先试「符号原形」opus；仅当音节无调且显式开启时，再试一声替补。
 * 带调音节（á/ǎ 等）禁止回退一声，避免超时误播 ā。
 * @param {boolean} useTone1Fallback 是否允许一声替补（仅对无调 stem 生效）
 */
export async function playLocalPinyinNeutralThenTone1(symbol, useTone1Fallback, opts = {}) {
	const tryUrls = []
	let neutral = ''
	if (!opts.skipTonedExact) {
		neutral = getLocalPinyinAudioPath(symbol) || ''
		if (neutral) tryUrls.push(neutral)
	}
	/** 仅无调才允许一声替补；带调失败应保持静默，不可改播一声 */
	const allowTone1Fb = !!useTone1Fallback && isBareUntonedPinyinStem(symbol)
	let tone1 = ''
	if (allowTone1Fb) {
		tone1 = getLocalPinyinTone1AudioPath(symbol) || ''
		if (tone1 && tryUrls.indexOf(tone1) === -1) tryUrls.push(tone1)
	}
	const neutralStem = neutral ? neutral.replace(/^.*\//, '').replace(/\.opus$/i, '') : ''
	const tone1Stem = tone1 ? tone1.replace(/^.*\//, '').replace(/\.opus$/i, '') : ''
	logHanziSpeak('local.try_urls', {
		symbol,
		useTone1Fallback: allowTone1Fb,
		urls: tryUrls,
		stems: { neutral: neutralStem, tone1: tone1Stem }
	})
	if (!tryUrls.length) {
		logHanziSpeak('local.no_urls', { symbol })
		return false
	}
	for (let i = 0; i < tryUrls.length; i++) {
		const src = tryUrls[i]
		if (typeof opts.isCancelled === 'function' && opts.isCancelled()) return false
		/** 无调→一声：中间档「开播」短超时；开播后由 playPinyinLocalAudio 等到真正结束 */
		const timeoutMs =
			opts.timeoutMs != null
				? opts.timeoutMs
				: i < tryUrls.length - 1
					? 900
					: 4000
		try {
			await playPinyinLocalAudio(src, {
				timeoutMs,
				playTimeoutMs: opts.playTimeoutMs != null ? opts.playTimeoutMs : 10000
			})
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

/** 展示串是否无声调标记（如 zhi / yuan；zhī 则不算） */
function isBareUntonedPinyinStem(sym) {
	const raw = String(sym || '')
		.trim()
		.toLowerCase()
		.replace(/v/g, U_UML)
	if (!raw) return false
	return stripPinyinToneMarks(raw) === raw
}

/**
 * 按展示拼音播本地 opus。
 * - 带调：只播精确文件，失败不降级（避免读错调）。
 * - 无调：精确文件缺失时直接改播一声（如 zhi → zhī），不干等超时。
 * @param {string} displayPinyin 与界面展示一致（如 pyShow）
 * @param {{ gapMs?: number, narrator?: string, isCancelled?: () => boolean }} [opts]
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
		const bare = isBareUntonedPinyinStem(sym)
		const exactPath = getLocalPinyinAudioPath(sym)
		const tone1Path = bare ? getLocalPinyinTone1AudioPath(sym) : ''
		const tryPaths = []
		if (exactPath) tryPaths.push(exactPath)
		if (tone1Path && tone1Path !== exactPath) tryPaths.push(tone1Path)
		if (!tryPaths.length) {
			logHanziSpeak('lesson.display_pinyin.all_local_failed', { sym, reason: 'empty_path' })
			continue
		}
		let played = false
		let aborted = false
		for (let pi = 0; pi < tryPaths.length && !played && !aborted; pi++) {
			const path = tryPaths[pi]
			const isLast = pi === tryPaths.length - 1
			/** 还有一声替补时，精确档仅「开播」短超时；开播后等播完 */
			const timeoutMs = !isLast && bare ? 900 : 4000
			const maxAttempt = isLast ? 2 : 1
			for (let attempt = 0; attempt < maxAttempt && !played && !aborted; attempt++) {
				if (typeof isCancelled === 'function' && isCancelled()) return anyOk
				try {
					await playPinyinLocalAudio(path, { timeoutMs, playTimeoutMs: 10000 })
					played = true
					logHanziSpeak(
						pi === 0 ? 'lesson.display_pinyin.exact_ok' : 'lesson.display_pinyin.tone1_ok',
						{ sym, path, attempt, bare }
					)
				} catch (e) {
					if (isPinyinPlayAborted(e)) {
						aborted = true
						logHanziSpeak('lesson.display_pinyin.exact_aborted', { sym, path, attempt })
						break
					}
					logHanziSpeak('lesson.display_pinyin.exact_fail', {
						sym,
						path,
						attempt,
						bare,
						tone1Fallback: bare && !isLast,
						err: e && (e.errMsg || e.message || String(e))
					})
					if (attempt === 0 && isLast) {
						if (!(await sleepUnlessCancelled(60, isCancelled))) return anyOk
					}
				}
			}
		}
		if (aborted) {
			if (typeof isCancelled === 'function' && isCancelled()) return anyOk
			continue
		}
		if (!played) {
			logHanziSpeak('lesson.display_pinyin.all_local_failed', { sym, paths: tryPaths })
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

export async function playPinyinLocalAudio(src, opts = {}) {
	if (!src) return Promise.reject(new Error('empty src'))
	const candidates = buildLocalAudioSrcCandidates(src)
	if (!candidates.length) return Promise.reject(new Error('empty src'))
	const hadActive = !!_activePlay || !!_inner || !!_chainAbort
	stopLocalPinyinAudio()
	/** 刚停播时稍等再起播，避免 Android stop/destroy 与 play 竞态 */
	const coolMs = opts.postStopDelayMs != null ? opts.postStopDelayMs : hadActive ? 56 : 0
	if (coolMs > 0) await sleep(coolMs)
	const inner = uni.createInnerAudioContext()
	_inner = inner
	/**
	 * timeoutMs：仅「多久内必须开始播」；开播后改用 playTimeoutMs / 按时长续命。
	 * 避免无调→一声的 700ms 短超时在音频已开播时强行打断切下一档。
	 */
	const startTimeoutMs =
		opts.startTimeoutMs != null
			? opts.startTimeoutMs
			: opts.timeoutMs != null
				? opts.timeoutMs
				: 3200
	const playTimeoutMs = opts.playTimeoutMs != null ? opts.playTimeoutMs : 10000
	return new Promise((resolve, reject) => {
		let settled = false
		let timer = null
		let played = false
		let playStartedAt = 0
		const finish = (fn) => {
			if (settled) return
			settled = true
			if (_activePlay && _activePlay.inner === inner) _activePlay = null
			if (timer != null) clearTimeout(timer)
			timer = null
			destroyInnerAudioSafe(inner)
			if (_inner === inner) _inner = null
			fn()
		}
		const armTimer = (ms, reason) => {
			if (settled) return
			if (timer != null) clearTimeout(timer)
			timer = setTimeout(
				() => finish(() => reject(new Error(reason || 'play timeout'))),
				Math.max(200, Number(ms) || 0)
			)
			if (_activePlay && _activePlay.inner === inner) _activePlay.timer = timer
		}
		_activePlay = { inner, reject, timer: null }
		armTimer(startTimeoutMs, 'play start timeout')
		let urlIdx = 0
		let switchingSrc = false
		/** 本次 tryPlay 起始时间（部分端无 onPlay，用此判断误触发 ended） */
		let attemptAt = 0
		const markPlaying = () => {
			if (settled || played) return
			played = true
			playStartedAt = Date.now()
			let durMs = 0
			try {
				const d = Number(inner.duration)
				if (Number.isFinite(d) && d > 0) durMs = Math.ceil(d * 1000)
			} catch (_) {}
			const waitMs =
				durMs > 0 ? Math.min(playTimeoutMs, Math.max(1200, durMs + 900)) : playTimeoutMs
			armTimer(waitMs, 'play timeout')
		}
		const refreshPlayDeadline = () => {
			if (settled || !played) return
			try {
				const d = Number(inner.duration)
				const t = Number(inner.currentTime)
				if (!Number.isFinite(d) || d <= 0) return
				const remainMs = Math.ceil((d - (Number.isFinite(t) ? t : 0)) * 1000) + 900
				if (remainMs > 200) armTimer(Math.min(playTimeoutMs, remainMs), 'play timeout')
			} catch (_) {}
		}
		const tryPlayAt = (idx) => {
			if (settled || idx >= candidates.length) {
				if (!settled) finish(() => reject(new Error('play error')))
				return
			}
			urlIdx = idx
			played = false
			playStartedAt = 0
			attemptAt = Date.now()
			armTimer(startTimeoutMs, 'play start timeout')
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
		inner.onPlay(() => markPlaying())
		inner.onCanplay(() => {
			if (played) refreshPlayDeadline()
		})
		inner.onTimeUpdate(() => {
			if (!played) markPlaying()
			else refreshPlayDeadline()
		})
		inner.onEnded(() => {
			/** 设 src 后极短误触发忽略；部分端无 onPlay，过窗口后仍认 ended */
			const sinceAttempt = attemptAt ? Date.now() - attemptAt : 0
			if (!played) {
				if (sinceAttempt < 160) return
				played = true
				playStartedAt = attemptAt || Date.now()
			}
			if (playStartedAt && Date.now() - playStartedAt < 80) return
			finish(() => resolve())
		})
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
	/** 默认禁止一声/无调降级；显式 true 才替补（笔画连读等少数场景慎用） */
	const useTone1Fallback = opts.useTone1Fallback === true
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
