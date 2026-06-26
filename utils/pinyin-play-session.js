/**
 * @file pinyin-play-session.js
 * @module utils
 * @description 基础设施工具：pinyin-play-session.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 拼音本地播放会话（统一 API）
 *
 * - `PINYIN_PLAY_SCOPES.GLOBAL`：乐园 / 闯关等共用单例音频
 * - 其它 scope：课卡、小测、查字、拼音 Tab 等页面独立世代
 *
 * @example
 * // 页面：mixins/pinyin-play-scope.js 挂载 this._pyPlay
 * await this._pyPlay.run(({ isCancelled }) => playOpusForDisplayPinyin(py, { isCancelled }))
 *
 * 详见 docs/拼音点读-播放会话API.md
 */
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import {
	createPinyinPlayScopeState,
	PINYIN_PLAY_SCOPES
} from '@/utils/pinyin-play-session-scopes.js'

export { PINYIN_PLAY_SCOPES }

/**
 * @param {string} scopeId
 * @returns {{
 *   scope: string,
 *   begin: () => number,
 *   cancel: () => number,
 *   isStale: (gen: number) => boolean,
 *   run: (playFn: (ctx: { gen: number, isCancelled: () => boolean }) => Promise<boolean>, opts?: { when?: () => boolean }) => Promise<boolean>
 * }}
 */
export function createPinyinPlayScope(scopeId = PINYIN_PLAY_SCOPES.GLOBAL) {
	const state = createPinyinPlayScopeState(scopeId)

	return {
		scope: state.scope,
		begin() {
			const gen = state.begin()
			stopLocalPinyinAudio()
			return gen
		},
		cancel() {
			const gen = state.cancel()
			stopLocalPinyinAudio()
			return gen
		},
		isStale: state.isStale,
		async run(playFn, opts = {}) {
			const gen = state.begin()
			stopLocalPinyinAudio()
			const isCancelled = () =>
				state.isStale(gen) || (typeof opts.when === 'function' && opts.when())
			if (isCancelled()) return false
			try {
				const ok = await playFn({ gen, isCancelled })
				return !isCancelled() && !!ok
			} catch (_) {
				return false
			}
		}
	}
}

const _globalScope = createPinyinPlayScope(PINYIN_PLAY_SCOPES.GLOBAL)

/** @deprecated 请使用 createPinyinPlayScope(PINYIN_PLAY_SCOPES.GLOBAL).begin() */
export function bumpPinyinPlayGen() {
	return _globalScope.begin()
}

/** @param {number} gen */
export function isPinyinPlayCancelled(gen) {
	return _globalScope.isStale(gen)
}

export function cancelPinyinPlay() {
	return _globalScope.cancel()
}

export async function runPinyinPlaySession(playFn) {
	return _globalScope.run(playFn)
}
