/**
 * @file learning-repository.js
 * @module repositories
 * @description 数据仓储源文件：learning-repository.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import {
	addCharWrongCount,
	markCharLearned,
	listLearnedChars,
	listWrongOftenChars
} from '@/utils/user-progress-storage.js'

export function recordCharWrong(hanzi, delta = 1, dims) {
	return addCharWrongCount(hanzi, delta, dims)
}

export function recordCharLearned(hanzi, dims) {
	return markCharLearned(hanzi, dims)
}

export function getLearnedChars() {
	return listLearnedChars()
}

export function getWrongChars() {
	return listWrongOftenChars()
}
