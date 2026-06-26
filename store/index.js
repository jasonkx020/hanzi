/**
 * @file index.js
 * @module store
 * @description 状态存储源文件：index.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { setAppReady } from '@/store/app-store.js'
import { refreshLearningState } from '@/store/learning-store.js'
import { getCurriculumState } from '@/store/curriculum-store.js'

export function initAppStores() {
	getCurriculumState()
	refreshLearningState()
	setAppReady(true)
}
