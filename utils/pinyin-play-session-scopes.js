/**
 * @file pinyin-play-session-scopes.js
 * @module utils
 * @description 基础设施工具：pinyin-play-session-scopes.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 拼音播放世代计数（纯逻辑，无 uni / 音频依赖，可供 Node 单测）。
 */

export const PINYIN_PLAY_SCOPES = Object.freeze({
	GLOBAL: 'global',
	LESSON_CARD: 'lesson-card',
	LESSON_QUIZ: 'lesson-quiz',
	DICT_RESULT: 'dict-result',
	PINYIN_INDEX: 'pinyin-index',
	GAME_HEAR: 'game-hear'
})

/** @type {Map<string, number>} */
const _scopeGen = new Map()

function nextGen(scopeId) {
	const id = String(scopeId || PINYIN_PLAY_SCOPES.GLOBAL)
	const gen = (_scopeGen.get(id) || 0) + 1
	_scopeGen.set(id, gen)
	return gen
}

function currentGen(scopeId) {
	return _scopeGen.get(String(scopeId || PINYIN_PLAY_SCOPES.GLOBAL)) || 0
}

/**
 * @param {string} scopeId
 */
export function createPinyinPlayScopeState(scopeId = PINYIN_PLAY_SCOPES.GLOBAL) {
	const scope = String(scopeId || PINYIN_PLAY_SCOPES.GLOBAL)
	const isStale = (gen) => gen !== currentGen(scope)
	return {
		scope,
		begin: () => nextGen(scope),
		cancel: () => nextGen(scope),
		isStale
	}
}

/** 测试用：重置所有 scope */
export function resetPinyinPlayScopesForTest() {
	_scopeGen.clear()
}
