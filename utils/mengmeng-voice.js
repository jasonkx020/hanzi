/**
 * 萌萌语音提示（static/voice/mengmeng/{id}.opus）
 */
import { resolveAppStaticLogicalUrl } from '@/utils/resolve-app-static-url.js'

let _ctx = null
let _gen = 0
let _lastPlayAt = 0
let _lastPlayId = ''
/** 串行播放链，避免多条提示叠在一起 */
let _playChain = Promise.resolve()
let _playing = false
let _idleWaiters = []

function settleMengVoiceIdle() {
	_playing = false
	const list = _idleWaiters.splice(0)
	list.forEach((fn) => {
		try {
			fn()
		} catch (_) {}
	})
}

/** 当前是否有萌萌提示正在播放（含 debounce 尚未开播时不算） */
export function isMengmengVoicePlaying() {
	return _playing
}

/** 等待队列中萌萌提示全部结束（onEnded / onError / stop） */
export function waitForMengmengVoiceIdle() {
	if (!_playing) return Promise.resolve()
	return new Promise((resolve) => _idleWaiters.push(resolve))
}

export const MENG_VOICE = {
	GLOBAL_WELCOME: 'global_welcome',
	HOME_DAILY: 'home_daily',
	HOME_STROKE_LAB: 'home_stroke_lab',
	DAILY_ENTER_PREVIEW: 'daily_enter_preview',
	DAILY_ENTER_REVIEW: 'daily_enter_review',
	DAILY_ENTER_WRITE: 'daily_enter_write',
	DAILY_PINYIN_REPLAY: 'daily_pinyin_replay',
	DAILY_QUIZ_PROMPT: 'daily_quiz_prompt',
	DAILY_QUIZ_CORRECT: 'daily_quiz_correct',
	DAILY_QUIZ_WRONG: 'daily_quiz_wrong',
	DAILY_STROKE_HINT: 'daily_stroke_hint',
	DAILY_STROKE_OK: 'daily_stroke_ok',
	DAILY_STROKE_WRONG: 'daily_stroke_wrong',
	DAILY_COMPLETE: 'daily_complete',
	STROKE_WELCOME: 'stroke_welcome',
	STROKE_MODE_ANIM: 'stroke_mode_anim',
	STROKE_MODE_WRITE: 'stroke_mode_write',
	STROKE_HINT_PLAY: 'stroke_hint_play',
	STROKE_WRITE_OK: 'stroke_write_ok',
	STROKE_WRITE_WRONG: 'stroke_write_wrong',
	STROKE_ALL_DONE: 'stroke_all_done',
	DICT_SEARCH_HINT: 'dict_search_hint',
	DICT_NOT_FOUND: 'dict_not_found',
	PINYIN_FOLLOW_START: 'pinyin_follow_start',
	PINYIN_FOLLOW_GOOD: 'pinyin_follow_good',
	LESSON_START: 'lesson_start',
	LESSON_QUIZ_PASS: 'lesson_quiz_pass',
	ME_WELCOME: 'me_welcome',
	DICTATION_WELCOME: 'dictation_welcome',
	DICTATION_CHAR_ENTER: 'dictation_char_enter',
	DICTATION_CHAR_PASS: 'dictation_char_pass',
	DICTATION_CHAR_RETRY: 'dictation_char_retry',
	DICTATION_STROKE_SHORT: 'dictation_stroke_short',
	DICTATION_DONE_PERFECT: 'dictation_done_perfect',
	DICTATION_DONE_GOOD: 'dictation_done_good',
	DICTATION_DONE_ENCOURAGE: 'dictation_done_encourage',
	DICTATION_UNSUPPORTED: 'dictation_unsupported'
}

/**
 * 已上线语音口播文案（与 static/voice/mengmeng/{id}.opus 对应）
 * 改稿请同步 docs/萌萌语音提示文案.md
 */
export const MENG_VOICE_COPY = {
	[MENG_VOICE.GLOBAL_WELCOME]: '你好呀，我是萌萌！我们一起学汉字吧。',
	[MENG_VOICE.HOME_DAILY]: '每日一练开始啦，只要几分钟哦。',
	[MENG_VOICE.HOME_STROKE_LAB]: '笔顺实验室，写一写就记得更牢。',
	[MENG_VOICE.DAILY_ENTER_PREVIEW]: '预习一个新字，先听一听怎么读。',
	[MENG_VOICE.DAILY_ENTER_REVIEW]: '复习时间，看看这个字你还记不记得。',
	[MENG_VOICE.DAILY_ENTER_WRITE]: '练字啦，按住田字格，一笔一笔写。',
	[MENG_VOICE.DAILY_PINYIN_REPLAY]: '再听一遍。',
	[MENG_VOICE.DAILY_QUIZ_PROMPT]: '哪个读音对呢？点一点试一试。',
	[MENG_VOICE.DAILY_QUIZ_CORRECT]: '太棒了，读对了！',
	[MENG_VOICE.DAILY_QUIZ_WRONG]: '没关系，再想想，萌萌陪你。',
	[MENG_VOICE.DAILY_STROKE_HINT]: '点听提示，萌萌告诉你写哪一笔。',
	[MENG_VOICE.DAILY_STROKE_OK]: '这一笔写对了！',
	[MENG_VOICE.DAILY_STROKE_WRONG]: '笔顺不太对哦，继续加油。',
	[MENG_VOICE.DAILY_COMPLETE]: '哇，这个字写完啦，你真厉害！',
	[MENG_VOICE.STROKE_WELCOME]: '欢迎来到笔顺实验室！',
	[MENG_VOICE.STROKE_MODE_ANIM]: '看萌萌演示，笔顺怎么写。',
	[MENG_VOICE.STROKE_MODE_WRITE]: '轮到你了，在格子里写一写。',
	[MENG_VOICE.STROKE_HINT_PLAY]: '先写这一笔哦。',
	[MENG_VOICE.STROKE_WRITE_OK]: '对啦！',
	[MENG_VOICE.STROKE_WRITE_WRONG]: '再试试，萌萌相信你。',
	[MENG_VOICE.STROKE_ALL_DONE]: '全写对啦，你是小小书法家！',
	[MENG_VOICE.DICT_SEARCH_HINT]: '输入一个汉字，萌萌帮你找出来。',
	[MENG_VOICE.DICT_NOT_FOUND]: '这个字萌萌暂时不会，换一个字试试。',
	[MENG_VOICE.PINYIN_FOLLOW_START]: '听萌萌读，你也跟着读一读。',
	[MENG_VOICE.PINYIN_FOLLOW_GOOD]: '读得真清楚！',
	[MENG_VOICE.LESSON_START]: '本课开始，萌萌陪你一个一个学。',
	[MENG_VOICE.LESSON_QUIZ_PASS]: '小测通过，星星送给你！',
	[MENG_VOICE.ME_WELCOME]: '你好，我是萌萌，一起进步吧。',
	[MENG_VOICE.DICTATION_WELCOME]: '听写开始啦，听一听读音，在格子里按笔顺写。',
	[MENG_VOICE.DICTATION_CHAR_ENTER]: '换一个字啦，听一听，再写一写。',
	[MENG_VOICE.DICTATION_CHAR_PASS]: '这个字笔顺全对，真棒！',
	[MENG_VOICE.DICTATION_CHAR_RETRY]: '笔顺不对哦，再听一遍，重写一遍。',
	[MENG_VOICE.DICTATION_STROKE_SHORT]: '笔画画长一点，再松手。',
	[MENG_VOICE.DICTATION_DONE_PERFECT]: '全写对啦，你是小小书法家！',
	[MENG_VOICE.DICTATION_DONE_GOOD]: '很棒，多练几遍就更熟啦。',
	[MENG_VOICE.DICTATION_DONE_ENCOURAGE]: '没关系，先跟读再来听写也很好。',
	[MENG_VOICE.DICTATION_UNSUPPORTED]: '这个字暂时不能写，我们写下一个。'
}

/** 扩展规划（待录制 opus，见 docs/萌萌语音提示文案.md §二） */
export const MENG_VOICE_PLANNED = {
	HOME_TEXTBOOK: 'home_textbook',
	HOME_GAME: 'home_game',
	HOME_PINYIN: 'home_pinyin',
	DAILY_EMPTY: 'daily_empty',
	LESSON_QUIZ_CORRECT: 'lesson_quiz_correct',
	LESSON_QUIZ_WRONG: 'lesson_quiz_wrong',
	PINYIN_FOLLOW_RETRY: 'pinyin_follow_retry',
	DICT_FOUND: 'dict_found',
	GAME_LOBBY_WELCOME: 'game_lobby_welcome',
	GAME_PICK_CORRECT: 'game_pick_correct',
	GAME_PICK_WRONG: 'game_pick_wrong',
	GAME_ROUND_DONE: 'game_round_done',
	STROKE_STEP_MODE: 'stroke_step_mode'
}

export const MENG_VOICE_COPY_PLANNED = {
	[MENG_VOICE_PLANNED.HOME_TEXTBOOK]: '跟着课本，和萌萌一起学新字。',
	[MENG_VOICE_PLANNED.HOME_GAME]: '萌萌的气球营开张啦，来玩吧！',
	[MENG_VOICE_PLANNED.HOME_PINYIN]: '拼音跟读，大声读出来喔。',
	[MENG_VOICE_PLANNED.DAILY_EMPTY]: '今天没有新字要练啦，去课本里看看吧。',
	[MENG_VOICE_PLANNED.LESSON_QUIZ_CORRECT]: '答对了，真棒！',
	[MENG_VOICE_PLANNED.LESSON_QUIZ_WRONG]: '再想想，萌萌陪你。',
	[MENG_VOICE_PLANNED.PINYIN_FOLLOW_RETRY]: '没听清也没关系，再跟萌萌读一遍。',
	[MENG_VOICE_PLANNED.DICT_FOUND]: '找到啦，一起看看这个字。',
	[MENG_VOICE_PLANNED.GAME_LOBBY_WELCOME]: '听一听、配一对，帮萌萌收集小星星！',
	[MENG_VOICE_PLANNED.GAME_PICK_CORRECT]: '太棒啦，就是这个！',
	[MENG_VOICE_PLANNED.GAME_PICK_WRONG]: '再听一听，再选一次。',
	[MENG_VOICE_PLANNED.GAME_ROUND_DONE]: '这一轮玩完啦，你真棒！',
	[MENG_VOICE_PLANNED.STROKE_STEP_MODE]: '一步一步来，点「下一笔」看萌萌写。'
}

/** @param {string} voiceId MENG_VOICE 值 */
export function getMengmengVoiceCopy(voiceId) {
	return MENG_VOICE_COPY[voiceId] || MENG_VOICE_COPY_PLANNED[voiceId] || ''
}

function destroyCtx() {
	if (!_ctx) return
	try {
		_ctx.stop()
		_ctx.destroy()
	} catch (_) {}
	_ctx = null
}

/**
 * @param {string} id MENG_VOICE 值或文件名（无扩展名）
 * @param {{ debounceMs?: number, minGapMs?: number, allowRepeat?: boolean }} [opts]
 * @returns {Promise<boolean>} 是否开始播放且未被打断（onEnded 为 true，onError 为 false）
 */
function playMengmengVoiceInner(id, opts = {}) {
	const voiceId = String(id || '').trim()
	if (!voiceId) return Promise.resolve(false)

	const debounceMs = opts.debounceMs ?? 0
	const minGapMs = opts.minGapMs ?? 0
	const allowRepeat = opts.allowRepeat !== false
	const now = Date.now()
	if (!allowRepeat && _lastPlayId === voiceId && now - _lastPlayAt < (minGapMs || 800)) {
		return Promise.resolve(false)
	}

	const myGen = ++_gen
	const src = resolveAppStaticLogicalUrl(`/static/voice/mengmeng/${voiceId}.opus`)

	return new Promise((resolve) => {
		const run = () => {
			if (myGen !== _gen) {
				settleMengVoiceIdle()
				resolve(false)
				return
			}
			destroyCtx()
			_playing = true
			const ctx = uni.createInnerAudioContext()
			_ctx = ctx
			let settled = false
			const finish = (ok) => {
				if (settled) return
				settled = true
				if (_ctx === ctx) _ctx = null
				try {
					ctx.destroy()
				} catch (_) {}
				settleMengVoiceIdle()
				resolve(ok)
			}
			ctx.onEnded(() => finish(true))
			ctx.onStop(() => finish(false))
			ctx.onError((err) => {
				console.warn('[mengmeng-voice] play error', voiceId, src, err)
				finish(false)
			})
			_lastPlayAt = Date.now()
			_lastPlayId = voiceId
			try {
				ctx.src = src
				ctx.play()
			} catch (e) {
				console.warn('[mengmeng-voice] play throw', voiceId, e)
				finish(false)
			}
		}
		if (debounceMs > 0) setTimeout(run, debounceMs)
		else run()
	})
}

/**
 * @param {string} id MENG_VOICE 值或文件名（无扩展名）
 * @param {{ debounceMs?: number, minGapMs?: number, allowRepeat?: boolean }} [opts]
 * @returns {Promise<boolean>} 是否开始播放且未被打断（onEnded 为 true，onError 为 false）
 */
export function playMengmengVoice(id, opts = {}) {
	const job = () => playMengmengVoiceInner(id, opts)
	const p = _playChain.then(job, job)
	_playChain = p.catch(() => {})
	return p
}

export function stopMengmengVoice() {
	_gen++
	destroyCtx()
	settleMengVoiceIdle()
}

/**
 * 仅播放成功（onEnded）后写入本地，避免失败仍标记「已播过」。
 * @param {string} id
 * @param {string} [storageKey]
 * @param {{ debounceMs?: number }} [opts]
 * @returns {Promise<boolean>}
 */
export function playMengmengVoiceOnce(id, storageKey, opts = {}) {
	const key = storageKey || `meng_voice_once_${id}`
	try {
		if (uni.getStorageSync(key)) return Promise.resolve(false)
	} catch (_) {}
	return playMengmengVoice(id, opts).then((ok) => {
		if (ok) {
			try {
				uni.setStorageSync(key, Date.now())
			} catch (_) {}
		}
		return ok
	})
}

/** 调试用：清除「只播一次」标记 */
export function clearMengmengVoiceOnce(storageKey) {
	try {
		uni.removeStorageSync(storageKey)
	} catch (_) {}
}

/** @param {'preview'|'review'|'write'|string} segmentKey */
export function voiceIdForDailySegment(segmentKey) {
	if (segmentKey === 'write') return MENG_VOICE.DAILY_ENTER_WRITE
	return MENG_VOICE.DAILY_ENTER_REVIEW
}
