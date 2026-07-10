/**
 * @file learning-store.js
 * @module store
 * @description 状态存储源文件：learning-store.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { readProgressLists } from '@/utils/user-progress-storage.js'

const learningState = {
	learnedCount: 0,
	wrongCount: 0
}

export function refreshLearningState() {
	const { learned, wrong } = readProgressLists()
	learningState.learnedCount = learned.length
	learningState.wrongCount = wrong.length
	return learningState
}

export function getLearningState() {
	return learningState
}
